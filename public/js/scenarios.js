// Scenarios management module

import * as db from '../db.js';
import { state, getScenarios, setScenarios, getPositions, setSelectedStartPosition, setSelectedEndPosition, getSelectedStartPosition, getSelectedEndPosition, setCurrentLoadedItem, setIsModified, getPlayerElements } from './state.js';
import { dom } from './dom.js';
import { renderScenariosList, updateDropZoneDisplay, updateCurrentItemDisplay, updateModifiedIndicator } from './ui.js';
import { loadPosition } from './positions.js';
import { playAnimation } from './animation.js';
import { alert, confirm, prompt } from './modal.js';

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Get all unique tags from scenarios
function getAllScenarioTags() {
    const allTags = new Set();
    getScenarios().forEach(scenario => {
        (scenario.tags || []).forEach(tag => {
            if (tag.trim()) {
                allTags.add(tag.trim());
            }
        });
    });
    // Also get tags from positions
    getPositions().forEach(position => {
        (position.tags || []).forEach(tag => {
            if (tag.trim()) {
                allTags.add(tag.trim());
            }
        });
    });
    return Array.from(allTags).sort();
}

// Generate unique ID
function generateId() {
    return `scen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create scenario
export async function createScenario() {
    const name = dom.scenarioNameInput.value.trim();
    const startPositionId = dom.scenarioStartSelect.value;
    const endPositionId = dom.scenarioEndSelect.value;
    
    if (!name) {
        await alert('Please enter a scenario name');
        return;
    }
    
    if (!startPositionId || !endPositionId) {
        await alert('Please select both start and end positions');
        return;
    }
    
    if (startPositionId === endPositionId) {
        await alert('Start and end positions must be different');
        return;
    }
    
    // Check for duplicate name
    const existing = getScenarios().find(s => s.name === name);
    if (existing) {
        await alert('A scenario with this name already exists');
        return;
    }
    
    const scenario = {
        id: generateId(),
        name: name,
        startPositionId: startPositionId,
        endPositionId: endPositionId,
        tags: []
    };
    
    try {
        await db.saveScenario(scenario);
        state.scenarios.push(scenario);
        setScenarios([...state.scenarios]);
        
        dom.scenarioNameInput.value = '';
        dom.scenarioStartSelect.value = '';
        dom.scenarioEndSelect.value = '';
        
        renderScenariosList();
        updateScenarioSelects();
    } catch (error) {
        console.error('Error creating scenario:', error);
        await alert('Error creating scenario: ' + error.message);
    }
}

// Update scenario
export async function updateScenario(scenarioId, updates) {
    const scenario = getScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const updated = {
        ...scenario,
        ...updates
    };
    
    // Ensure tags array exists
    if (!updated.tags) {
        updated.tags = [];
    }
    
    try {
        await db.saveScenario(updated);
        const index = state.scenarios.findIndex(s => s.id === scenarioId);
        if (index >= 0) {
            state.scenarios[index] = updated;
            setScenarios([...state.scenarios]);
            renderScenariosList();
            updateScenarioSelects();
        }
    } catch (error) {
        console.error('Error updating scenario:', error);
        await alert('Error updating scenario: ' + error.message);
    }
}

// Delete scenario
export async function deleteScenario(scenarioId) {
    const scenario = getScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const confirmed = await confirm(`Delete scenario "${scenario.name}"?`);
    if (!confirmed) {
        return;
    }
    
    try {
        await db.deleteScenario(scenarioId);
        state.scenarios = state.scenarios.filter(s => s.id !== scenarioId);
        setScenarios([...state.scenarios]);
        
        // Remove from sequences
        state.sequences.forEach(sequence => {
            sequence.scenarioIds = sequence.scenarioIds.filter(id => id !== scenarioId);
        });
        
        renderScenariosList();
        
        // Clear loaded item if it was this scenario
        if (state.currentLoadedItem && state.currentLoadedItem.id === scenarioId) {
            const { setCurrentLoadedItem, setIsModified } = await import('./state.js');
            setCurrentLoadedItem(null);
            setIsModified(false);
        }
    } catch (error) {
        console.error('Error deleting scenario:', error);
        await alert('Error deleting scenario: ' + error.message);
    }
}

// Load scenario (loads start position and populates drop zones)
export async function loadScenario(scenarioId) {
    const scenario = getScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;
    
    // Get position objects
    const startPos = getPositions().find(p => p.id === scenario.startPositionId);
    const endPos = getPositions().find(p => p.id === scenario.endPositionId);
    
    if (!startPos || !endPos) {
        alert('Position not found');
        return;
    }
    
    // Populate drop zones
    setSelectedStartPosition(startPos);
    setSelectedEndPosition(endPos);
    updateDropZoneDisplay();
    
    // Update state first (before loading position)
    setCurrentLoadedItem({ type: 'scenario', id: scenario.id, name: scenario.name });
    
    // Load start position on court (don't update loaded item - keep scenario as loaded)
    loadPosition(scenario.startPositionId, false);
    setIsModified(false);
    updateCurrentItemDisplay();
    updateModifiedIndicator(false);
    
    // Show all scenario buttons
    const { updateScenarioButtonsVisibility } = await import('./ui.js');
    updateScenarioButtonsVisibility();
    
    // Re-render scenarios list to show active state
    renderScenariosList();
}

// Play scenario (animates from start to end)
export async function playScenario(scenarioId) {
    const scenario = getScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;
    
    // Get position objects
    const startPos = getPositions().find(p => p.id === scenario.startPositionId);
    const endPos = getPositions().find(p => p.id === scenario.endPositionId);
    
    if (!startPos || !endPos) {
        await alert('Position not found');
        return;
    }
    
    // Set the drop zones with the scenario positions
    setSelectedStartPosition(startPos);
    setSelectedEndPosition(endPos);
    updateDropZoneDisplay();
    
    // Set as loaded item (so it shows as active/green)
    setCurrentLoadedItem({ type: 'scenario', id: scenario.id, name: scenario.name });
    setIsModified(false);
    updateCurrentItemDisplay();
    updateModifiedIndicator(false);
    
    // Re-render scenarios list to show active state
    renderScenariosList();
    
    // Load start position first, then animate (don't update loaded item - keep scenario as loaded)
    loadPosition(scenario.startPositionId, false);
    
    // Show all scenario buttons
    const { updateScenarioButtonsVisibility } = await import('./ui.js');
    updateScenarioButtonsVisibility();
    
    // Play animation after a short delay
    setTimeout(() => {
        playAnimation();
    }, 100);
} 

// Save current scenario (updates existing scenario)
export async function saveScenario() {
    if (!state.currentLoadedItem || state.currentLoadedItem.type !== 'scenario') {
        return;
    }
    
    // If it's a new scenario (no ID), open the modal to create it
    if (!state.currentLoadedItem.id) {
        await createScenarioFromModal();
        return;
    }
    
    const scenario = getScenarios().find(s => s.id === state.currentLoadedItem.id);
    if (!scenario) {
        await alert('Scenario not found');
        return;
    }
    
    const startPos = getSelectedStartPosition();
    const endPos = getSelectedEndPosition();
    
    if (!startPos || !endPos) {
        await alert('Please select both start and end positions');
        return;
    }
    
    if (startPos.id === endPos.id) {
        await alert('Start and end positions must be different');
        return;
    }
    
    const updated = {
        ...scenario,
        startPositionId: startPos.id,
        endPositionId: endPos.id,
        tags: scenario.tags || [] // Preserve existing tags
    };
    
    try {
        await db.saveScenario(updated);
        const index = state.scenarios.findIndex(s => s.id === scenario.id);
        if (index >= 0) {
            state.scenarios[index] = updated;
            setScenarios([...state.scenarios]);
        }
        
        setIsModified(false);
        renderScenariosList();
        updateCurrentItemDisplay();
        updateModifiedIndicator(false);
    } catch (error) {
        console.error('Error saving scenario:', error);
        await alert('Error saving scenario: ' + error.message);
    }
}

// Save scenario as new
export async function saveScenarioAs() {
    const startPos = getSelectedStartPosition();
    const endPos = getSelectedEndPosition();
    
    if (!startPos || !endPos) {
        await alert('Please select both start and end positions');
        return;
    }
    
    if (startPos.id === endPos.id) {
        await alert('Start and end positions must be different');
        return;
    }
    
    // For new scenarios, use the modal. For existing scenarios, also use modal but with copy name
    await createScenarioFromModal(true);
}

// Check if scenario has been modified
export function checkScenarioModifications() {
    if (!state.currentLoadedItem || state.currentLoadedItem.type !== 'scenario') {
        return;
    }
    
    const scenario = getScenarios().find(s => s.id === state.currentLoadedItem.id);
    if (!scenario) return;
    
    const startPos = getSelectedStartPosition();
    const endPos = getSelectedEndPosition();
    
    if (!startPos || !endPos) {
        setIsModified(false);
        return;
    }
    
    // Check if positions have changed
    const isModified = scenario.startPositionId !== startPos.id || scenario.endPositionId !== endPos.id;
    setIsModified(isModified);
}

// Clear scenario (clears drop zones and loaded item)
export async function clearScenario() {
    setSelectedStartPosition(null);
    setSelectedEndPosition(null);
    updateDropZoneDisplay();
    
    // Clear players from court
    getPlayerElements().forEach((element) => {
        element.remove();
    });
    getPlayerElements().clear();
    
    setCurrentLoadedItem(null);
    setIsModified(false);
    updateCurrentItemDisplay();
    updateModifiedIndicator(false);
    
    // Hide all scenario buttons
    const { updateScenarioButtonsVisibility } = await import('./ui.js');
    updateScenarioButtonsVisibility();
    
    // Re-render scenarios list to remove active state
    renderScenariosList();
}

// Create scenario from modal (for new scenarios or save as)
export async function createScenarioFromModal(isSaveAs = false) {
    const startPos = getSelectedStartPosition();
    const endPos = getSelectedEndPosition();
    
    if (!startPos || !endPos) {
        await alert('Please select both start and end positions');
        return;
    }
    
    if (startPos.id === endPos.id) {
        await alert('Start and end positions must be different');
        return;
    }
    
    // Determine default name and tags
    let defaultName = '';
    let currentTags = new Set();
    
    if (isSaveAs && state.currentLoadedItem && state.currentLoadedItem.type === 'scenario' && state.currentLoadedItem.id) {
        // Save As on existing scenario - preserve name (with Copy) and tags
        const currentScenario = getScenarios().find(s => s.id === state.currentLoadedItem.id);
        if (currentScenario) {
            defaultName = currentScenario.name + ' (Copy)';
            // Preserve tags from original scenario
            currentTags = new Set((currentScenario.tags || []).map(t => t.trim()).filter(Boolean));
        } else {
            defaultName = 'New Scenario';
        }
    } else {
        // New scenario or Save As on unsaved scenario
        defaultName = state.currentLoadedItem && state.currentLoadedItem.name ? 
            state.currentLoadedItem.name : `New Scenario (${startPos.name} → ${endPos.name})`;
    }
    
    const nameInputId = 'create-scenario-name-' + Date.now();
    const tagsInputId = 'create-scenario-tags-' + Date.now();
    const tagsContainerId = 'create-scenario-tags-container-' + Date.now();
    const allTags = getAllScenarioTags();
    
    // Build tag selector HTML with pre-selected tags
    const tagsSelectorHtml = allTags.length > 0 ? `
        <div class="tag-selector-container">
            <div class="tag-selector-header">Select from existing tags:</div>
            <div class="tag-selector-buttons" id="${tagsContainerId}">
                ${allTags.map(tag => `
                    <button type="button" class="tag-selector-btn ${currentTags.has(tag) ? 'selected' : ''}" data-tag="${escapeHtml(tag)}">
                        ${escapeHtml(tag)}
                    </button>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    const bodyHtml = `
        <div class="modal-form-container">
            <div class="modal-form-group">
                <label for="${nameInputId}" class="modal-label">Scenario Name</label>
                <input type="text" id="${nameInputId}" class="modal-input modal-input-full" value="${escapeHtml(defaultName)}">
            </div>
            <div class="modal-form-group">
                <label for="${tagsInputId}" class="modal-label">Tags</label>
                <input type="text" id="${tagsInputId}" class="modal-input modal-input-full" value="${Array.from(currentTags).join(', ')}" placeholder="Type tags (comma-separated) or select below">
                ${tagsSelectorHtml}
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
            console.error('Modal elements not found');
            resolve(false);
            return;
        }
        
        titleEl.textContent = isSaveAs ? 'Save Scenario As' : 'Save Scenario';
        bodyEl.innerHTML = bodyHtml;
        footerEl.innerHTML = footerHtml;
        
        // Remove hidden class and show modal
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        const nameInput = document.getElementById(nameInputId);
        const tagsInput = document.getElementById(tagsInputId);
        const tagsContainer = document.getElementById(tagsContainerId);
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');
        
        // Track selected tags in modal (start with current tags)
        let selectedTagsInModal = new Set(currentTags);
        
        // Handle tag selector buttons
        if (tagsContainer) {
            tagsContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.tag-selector-btn');
                if (btn) {
                    const tag = btn.dataset.tag;
                    if (selectedTagsInModal.has(tag)) {
                        selectedTagsInModal.delete(tag);
                        btn.classList.remove('selected');
                    } else {
                        selectedTagsInModal.add(tag);
                        btn.classList.add('selected');
                    }
                    
                    // Update input field
                    if (tagsInput) {
                        const allTags = Array.from(selectedTagsInModal);
                        tagsInput.value = allTags.join(', ');
                    }
                }
            });
        }
        
        // Focus name input
        setTimeout(() => {
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);
        
        // Handle Enter key in inputs
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
                const newTagsStr = tagsInput ? tagsInput.value.trim() : '';
                
                if (!newName) {
                    await alert('Scenario name cannot be empty');
                    return;
                }
                
                // Check for duplicate name
                const existing = getScenarios().find(s => s.name === newName);
                if (existing) {
                    await alert('A scenario with this name already exists');
                    return;
                }
                
                // Parse tags - combine selected tags from buttons and any typed tags
                const typedTags = newTagsStr
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
                
                // Merge selected tags and typed tags
                const allSelectedTags = new Set([...selectedTagsInModal, ...typedTags]);
                const newTags = Array.from(allSelectedTags);
                
                const scenario = {
                    id: generateId(),
                    name: newName,
                    startPositionId: startPos.id,
                    endPositionId: endPos.id,
                    tags: newTags
                };
                
                try {
                    await db.saveScenario(scenario);
                    state.scenarios.push(scenario);
                    setScenarios([...state.scenarios]);
                    
                    // Update state to the new scenario
                    setCurrentLoadedItem({ type: 'scenario', id: scenario.id, name: scenario.name });
                    setIsModified(false);
                    
                    overlay.classList.add('hidden');
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                    
                    renderScenariosList();
                    updateCurrentItemDisplay();
                    updateModifiedIndicator(false);
                    updateScenarioSelects();
                    
                    resolve(true);
                } catch (error) {
                    console.error('Error saving scenario:', error);
                    await alert('Error saving scenario: ' + error.message);
                }
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

// Edit scenario (name and tags)
export async function editScenario(scenarioId) {
    const scenario = getScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const nameInputId = 'edit-scenario-name-' + Date.now();
    const tagsInputId = 'edit-scenario-tags-' + Date.now();
    const tagsContainerId = 'edit-scenario-tags-container-' + Date.now();
    const currentTags = new Set((scenario.tags || []).map(t => t.trim()).filter(Boolean));
    const allTags = getAllScenarioTags();
    
    // Build tag selector HTML
    const tagsSelectorHtml = allTags.length > 0 ? `
        <div class="tag-selector-container">
            <div class="tag-selector-header">Select from existing tags:</div>
            <div class="tag-selector-buttons" id="${tagsContainerId}">
                ${allTags.map(tag => `
                    <button type="button" class="tag-selector-btn ${currentTags.has(tag) ? 'selected' : ''}" data-tag="${escapeHtml(tag)}">
                        ${escapeHtml(tag)}
                    </button>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    const bodyHtml = `
        <div class="modal-form-container">
            <div class="modal-form-group">
                <label for="${nameInputId}" class="modal-label">Scenario Name</label>
                <input type="text" id="${nameInputId}" class="modal-input modal-input-full" value="${escapeHtml(scenario.name)}">
            </div>
            <div class="modal-form-group">
                <label for="${tagsInputId}" class="modal-label">Tags</label>
                <input type="text" id="${tagsInputId}" class="modal-input modal-input-full" value="${Array.from(currentTags).join(', ')}" placeholder="Type tags (comma-separated) or select below">
                ${tagsSelectorHtml}
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
        
        titleEl.textContent = 'Edit Scenario';
        bodyEl.innerHTML = bodyHtml;
        footerEl.innerHTML = footerHtml;
        
        // Remove hidden class and show modal
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        const nameInput = document.getElementById(nameInputId);
        const tagsInput = document.getElementById(tagsInputId);
        const tagsContainer = document.getElementById(tagsContainerId);
        const cancelBtn = document.getElementById('modal-cancel');
        const confirmBtn = document.getElementById('modal-confirm');
        
        // Track selected tags in modal
        let selectedTagsInModal = new Set(currentTags);
        
        // Handle tag selector buttons
        if (tagsContainer) {
            tagsContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.tag-selector-btn');
                if (btn) {
                    const tag = btn.dataset.tag;
                    if (selectedTagsInModal.has(tag)) {
                        selectedTagsInModal.delete(tag);
                        btn.classList.remove('selected');
                    } else {
                        selectedTagsInModal.add(tag);
                        btn.classList.add('selected');
                    }
                    
                    // Update input field
                    if (tagsInput) {
                        const allTags = Array.from(selectedTagsInModal);
                        tagsInput.value = allTags.join(', ');
                    }
                }
            });
        }
        
        // Focus name input
        setTimeout(() => {
            if (nameInput) {
                nameInput.focus();
                nameInput.select();
            }
        }, 100);
        
        // Handle Enter key in inputs
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
                const newTagsStr = tagsInput ? tagsInput.value.trim() : '';
                
                if (!newName) {
                    await alert('Scenario name cannot be empty');
                    return;
                }
                
                // Parse tags - combine selected tags from buttons and any typed tags
                const typedTags = newTagsStr
                    .split(',')
                    .map(tag => tag.trim())
                    .filter(tag => tag.length > 0);
                
                // Merge selected tags and typed tags
                const allSelectedTags = new Set([...selectedTagsInModal, ...typedTags]);
                const newTags = Array.from(allSelectedTags);
                
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                
                await updateScenario(scenarioId, { 
                    name: newName,
                    tags: newTags
                });
                
                // Update current loaded item name if it's this scenario
                if (state.currentLoadedItem && state.currentLoadedItem.id === scenarioId) {
                    setCurrentLoadedItem({ ...state.currentLoadedItem, name: newName });
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

// Update scenario selects
export function updateScenarioSelects() {
    const positions = getPositions();
    
    [dom.scenarioStartSelect, dom.scenarioEndSelect].forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select position...</option>';
        
        positions.forEach(position => {
            const option = document.createElement('option');
            option.value = position.id;
            option.textContent = position.name;
            select.appendChild(option);
        });
        
        if (positions.find(p => p.id === currentValue)) {
            select.value = currentValue;
        }
    });
}
