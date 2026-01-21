// Sequences management module

import * as db from '../db.js';
import { state, getSequences, setSequences, getScenarios, setCurrentSequence } from './state.js';
import { dom } from './dom.js';
import { renderSequencesList } from './ui.js';
import { playScenario } from './scenarios.js';
import { alert, confirm } from './modal.js';
import { animateToPosition } from './animation.js';

// Generate unique ID
function generateId() {
    return `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create sequence
export async function createSequence() {
    const name = dom.sequenceNameInput.value.trim();
    
    if (!name) {
        await alert('Please enter a sequence name');
        return;
    }
    
    // Check for duplicate name
    const existing = getSequences().find(s => s.name === name);
    if (existing) {
        await alert('A sequence with this name already exists');
        return;
    }
    
    const sequence = {
        id: generateId(),
        name: name,
        items: [] // Array of { type: 'position'|'scenario', id: string }
    };
    
    try {
        await db.saveSequence(sequence);
        state.sequences.push(sequence);
        setSequences([...state.sequences]);
        
        dom.sequenceNameInput.value = '';
        renderSequencesList();
    } catch (error) {
        console.error('Error creating sequence:', error);
        await alert('Error creating sequence: ' + error.message);
    }
}

// Update sequence
export async function updateSequence(sequenceId, name, items) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
    }
    
    const updated = {
        ...sequence,
        name: name || sequence.name,
        items: items !== undefined ? items : (sequence.items || [])
    };
    
    try {
        await db.saveSequence(updated);
        const index = state.sequences.findIndex(s => s.id === sequenceId);
        if (index >= 0) {
            state.sequences[index] = updated;
            setSequences([...state.sequences]);
            renderSequencesList();
        }
    } catch (error) {
        console.error('Error updating sequence:', error);
        await alert('Error updating sequence: ' + error.message);
    }
}

// Delete sequence
export async function deleteSequence(sequenceId) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    const confirmed = await confirm(`Delete sequence "${sequence.name}"?`);
    if (!confirmed) {
        return;
    }
    
    try {
        await db.deleteSequence(sequenceId);
        state.sequences = state.sequences.filter(s => s.id !== sequenceId);
        setSequences([...state.sequences]);
        
        renderSequencesList();
        
        // Clear current sequence if it was this one
        if (state.currentSequence && state.currentSequence.sequenceId === sequenceId) {
            setCurrentSequence(null);
        }
        
        // Clear loaded item if it was this sequence
        if (state.currentLoadedItem && state.currentLoadedItem.id === sequenceId) {
            const { setCurrentLoadedItem, setIsModified } = await import('./state.js');
            setCurrentLoadedItem(null);
            setIsModified(false);
        }
    } catch (error) {
        console.error('Error deleting sequence:', error);
        await alert('Error deleting sequence: ' + error.message);
    }
}

// Load sequence (enters edit mode with timeline)
export async function loadSequence(sequenceId) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) {
        await alert('Sequence not found');
        return;
    }
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
        // Save migrated format
        await updateSequence(sequenceId, null, sequence.items);
    }
    
    // Set current sequence
    setCurrentSequence({
        sequenceId: sequenceId,
        currentPositionIndex: -1 // -1 means not playing, in edit mode
    });
    
    // Update state to track loaded sequence
    const { setCurrentLoadedItem, setIsModified } = await import('./state.js');
    setCurrentLoadedItem({ type: 'sequence', id: sequence.id, name: sequence.name });
    setIsModified(false);
    
    // Update UI - show timeline instead of start/end drop zones
    const { renderSequenceTimeline, updateSequenceButtons, updateScenarioButtonsVisibility } = await import('./ui.js');
    renderSequenceTimeline(sequence);
    updateSequenceButtons('edit');
    updateScenarioButtonsVisibility();
    
    // Update current item display
    const { updateCurrentItemDisplay } = await import('./ui.js');
    updateCurrentItemDisplay();
    
    // Load first position if available
    if (sequence.items && sequence.items.length > 0) {
        const firstItem = sequence.items[0];
        if (firstItem.type === 'position') {
            const { loadPosition } = await import('./positions.js');
            loadPosition(firstItem.id, false);
        } else if (firstItem.type === 'scenario') {
            const scenario = getScenarios().find(s => s.id === firstItem.id);
            if (scenario) {
                const { loadPosition } = await import('./positions.js');
                loadPosition(scenario.startPositionId, false);
            }
        }
    }
}

// Flatten sequence items to positions (scenarios become two positions)
function flattenSequenceToPositions(sequence) {
    const positions = [];
    
    if (!sequence.items) return positions;
    
    sequence.items.forEach((item, itemIndex) => {
        if (item.type === 'position') {
            positions.push({ type: 'position', id: item.id, itemIndex: itemIndex });
        } else if (item.type === 'scenario') {
            const scenario = getScenarios().find(s => s.id === item.id);
            if (scenario) {
                // Add start position
                positions.push({ 
                    type: 'scenario-start', 
                    id: scenario.startPositionId, 
                    scenarioId: scenario.id,
                    itemIndex: itemIndex
                });
                // Add end position
                positions.push({ 
                    type: 'scenario-end', 
                    id: scenario.endPositionId, 
                    scenarioId: scenario.id,
                    itemIndex: itemIndex
                });
            }
        }
    });
    
    return positions;
}

// Play next position in sequence
export async function playNextPosition() {
    if (!state.currentSequence) return;
    
    const sequence = getSequences().find(s => s.id === state.currentSequence.sequenceId);
    if (!sequence) return;
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
    }
    
    const flattened = flattenSequenceToPositions(sequence);
    const currentIndex = state.currentSequence.currentPositionIndex;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= flattened.length) {
        // Sequence complete
        await alert('Sequence complete!');
        setCurrentSequence({
            sequenceId: sequence.id,
            currentPositionIndex: -1 // Back to edit mode
        });
        const { updateSequenceButtons, renderSequenceTimeline } = await import('./ui.js');
        updateSequenceButtons('edit');
        renderSequenceTimeline(sequence);
        return;
    }
    
    const nextPosition = flattened[nextIndex];
    const { getPositions } = await import('./state.js');
    const positionsList = getPositions();
    
    const position = positionsList.find(p => p.id === nextPosition.id);
    if (position) {
        // Animate to next position
        await animateToPosition(position.id, false);
        
        // Update current sequence
        setCurrentSequence({
            sequenceId: sequence.id,
            currentPositionIndex: nextIndex
        });
        
        updateSequenceProgress();
        const { updateSequenceTimelineActive } = await import('./ui.js');
        updateSequenceTimelineActive(sequence, nextIndex);
    }
}

// Play previous position in sequence
export async function playPreviousPosition() {
    if (!state.currentSequence) return;
    
    const sequence = getSequences().find(s => s.id === state.currentSequence.sequenceId);
    if (!sequence) return;
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
    }
    
    const flattened = flattenSequenceToPositions(sequence);
    const currentIndex = state.currentSequence.currentPositionIndex;
    
    if (currentIndex <= 0) {
        // Already at start
        return;
    }
    
    const prevIndex = currentIndex - 1;
    const prevPosition = flattened[prevIndex];
    const { getPositions } = await import('./state.js');
    const positionsList = getPositions();
    
    const position = positionsList.find(p => p.id === prevPosition.id);
    if (position) {
        // Animate to previous position
        await animateToPosition(position.id, false);
        
        // Update current sequence
        setCurrentSequence({
            sequenceId: sequence.id,
            currentPositionIndex: prevIndex
        });
        
        updateSequenceProgress();
        const { updateSequenceTimelineActive } = await import('./ui.js');
        updateSequenceTimelineActive(sequence, prevIndex);
    }
}

// Start playing sequence from beginning
export async function startSequencePlayback() {
    if (!state.currentSequence) return;
    
    const sequence = getSequences().find(s => s.id === state.currentSequence.sequenceId);
    if (!sequence) return;
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
    }
    
    const flattened = flattenSequenceToPositions(sequence);
    if (flattened.length === 0) {
        await alert('Sequence is empty');
        return;
    }
    
    // Start from first position
    setCurrentSequence({
        sequenceId: sequence.id,
        currentPositionIndex: 0
    });
    
    const { updateSequenceButtons } = await import('./ui.js');
    updateSequenceButtons('play');
    
    // Load first position
    const firstPosition = flattened[0];
    const { getPositions } = await import('./state.js');
    const positionsList = getPositions();
    const position = positionsList.find(p => p.id === firstPosition.id);
    if (position) {
        // For the first position, just load it (no animation from nothing)
        const { loadPosition } = await import('./positions.js');
        loadPosition(position.id, false);
        updateSequenceProgress();
        const { updateSequenceTimelineActive } = await import('./ui.js');
        updateSequenceTimelineActive(sequence, 0);
    }
}

// Update sequence progress display
export function updateSequenceProgress() {
    if (!state.currentSequence || state.currentSequence.currentPositionIndex < 0) return;
    
    const sequence = getSequences().find(s => s.id === state.currentSequence.sequenceId);
    if (!sequence) return;
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
    }
    
    const flattened = flattenSequenceToPositions(sequence);
    const current = state.currentSequence.currentPositionIndex + 1;
    const total = flattened.length;
    
    if (dom.sequenceProgressText) {
        dom.sequenceProgressText.textContent = `Position ${current} of ${total}`;
    }
}

// Add item (position or scenario) to sequence
export async function addItemToSequence(sequenceId, itemType, itemId, insertIndex = null) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
    }
    
    if (!sequence.items) {
        sequence.items = [];
    }
    
    // Check if already in sequence
    const exists = sequence.items.some(item => item.type === itemType && item.id === itemId);
    if (exists) {
        await alert(`${itemType === 'position' ? 'Position' : 'Scenario'} already in sequence`);
        return;
    }
    
    const newItem = { type: itemType, id: itemId };
    
    // Insert at specific index if provided, otherwise append
    if (insertIndex !== null && insertIndex >= 0 && insertIndex <= sequence.items.length) {
        sequence.items.splice(insertIndex, 0, newItem);
    } else {
        sequence.items.push(newItem);
    }
    
    await updateSequence(sequenceId, null, sequence.items);
    
    // Update timeline if sequence is loaded - get fresh sequence from state after update
    if (state.currentLoadedItem && state.currentLoadedItem.id === sequenceId) {
        const { renderSequenceTimeline } = await import('./ui.js');
        // Get the updated sequence from state after updateSequence has modified it
        const updatedSequence = getSequences().find(s => s.id === sequenceId);
        if (updatedSequence) {
            renderSequenceTimeline(updatedSequence);
        }
    }
}

// Remove item from sequence
export async function removeItemFromSequence(sequenceId, itemIndex) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
    }
    
    if (!sequence.items || itemIndex < 0 || itemIndex >= sequence.items.length) return;
    
    sequence.items.splice(itemIndex, 1);
    await updateSequence(sequenceId, null, sequence.items);
    
    // Update timeline if sequence is loaded - get fresh sequence from state after update
    if (state.currentLoadedItem && state.currentLoadedItem.id === sequenceId) {
        const { renderSequenceTimeline } = await import('./ui.js');
        // Get the updated sequence from state after updateSequence has modified it
        const updatedSequence = getSequences().find(s => s.id === sequenceId);
        if (updatedSequence) {
            renderSequenceTimeline(updatedSequence);
        }
    }
}

// Reorder items in sequence
export async function reorderItemsInSequence(sequenceId, fromIndex, toIndex) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
    }
    
    if (!sequence.items) return;
    
    const items = [...sequence.items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    
    await updateSequence(sequenceId, null, items);
    
    // Update timeline if sequence is loaded - get fresh sequence from state after update
    if (state.currentLoadedItem && state.currentLoadedItem.id === sequenceId) {
        const { renderSequenceTimeline } = await import('./ui.js');
        // Get the updated sequence from state after updateSequence has modified it
        const updatedSequence = getSequences().find(s => s.id === sequenceId);
        if (updatedSequence) {
            renderSequenceTimeline(updatedSequence);
        }
    }
}

// Edit sequence (name only)
export async function editSequence(sequenceId) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    const nameInputId = 'edit-sequence-name-' + Date.now();
    
    const bodyHtml = `
        <div class="modal-form-container">
            <div class="modal-form-group">
                <label for="${nameInputId}" class="modal-label">Sequence Name</label>
                <input type="text" id="${nameInputId}" class="modal-input modal-input-full" value="${escapeHtml(sequence.name)}">
            </div>
        </div>
    `;
    
    const footerHtml = `
        <button class="modal-btn modal-btn-secondary" id="modal-cancel">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="modal-confirm">Save</button>
    `;
    
    return new Promise(async (resolve) => {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        const footerEl = document.getElementById('modal-footer');
        
        if (!overlay || !titleEl || !bodyEl || !footerEl) {
            resolve(false);
            return;
        }
        
        titleEl.textContent = 'Edit Sequence';
        bodyEl.innerHTML = bodyHtml;
        footerEl.innerHTML = footerHtml;
        
        // Remove hidden class and show modal
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        const nameInput = document.getElementById(nameInputId);
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');
        
        // Focus name input
        setTimeout(() => {
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);
        
        // Handle Enter key in input
        if (nameInput) {
            nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (confirmBtn) confirmBtn.click();
                }
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                resolve(false);
            });
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const newName = nameInput ? nameInput.value.trim() : '';
                
                if (!newName) {
                    await alert('Sequence name cannot be empty');
                    return;
                }
                
                // Check for duplicate name (excluding current sequence)
                const existing = getSequences().find(s => s.name === newName && s.id !== sequenceId);
                if (existing) {
                    await alert('A sequence with this name already exists');
                    return;
                }
                
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                
                await updateSequence(sequenceId, newName, null);
                
                // Update current loaded item name if it's this sequence
                const { setCurrentLoadedItem } = await import('./state.js');
                if (state.currentLoadedItem && state.currentLoadedItem.id === sequenceId) {
                    setCurrentLoadedItem({ ...state.currentLoadedItem, name: newName });
                    const { updateCurrentItemDisplay } = await import('./ui.js');
                    updateCurrentItemDisplay();
                }
                
                resolve(true);
            });
        }
        
        // Close on Escape or overlay click
        const closeHandler = (e) => {
            if (e.key === 'Escape' || (e.target === overlay && e.type === 'click')) {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                resolve(false);
                document.removeEventListener('keydown', closeHandler);
                overlay.removeEventListener('click', closeHandler);
            }
        };
        
        document.addEventListener('keydown', closeHandler);
        overlay.addEventListener('click', closeHandler);
    });
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
