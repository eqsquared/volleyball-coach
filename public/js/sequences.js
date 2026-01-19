// Sequences management module

import * as db from '../db.js';
import { state, getSequences, setSequences, getScenarios, setCurrentSequence } from './state.js';
import { dom } from './dom.js';
import { renderSequencesList } from './ui.js';
import { playScenario } from './scenarios.js';

// Generate unique ID
function generateId() {
    return `seq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create sequence
export async function createSequence() {
    const name = dom.sequenceNameInput.value.trim();
    
    if (!name) {
        alert('Please enter a sequence name');
        return;
    }
    
    // Check for duplicate name
    const existing = getSequences().find(s => s.name === name);
    if (existing) {
        alert('A sequence with this name already exists');
        return;
    }
    
    const sequence = {
        id: generateId(),
        name: name,
        scenarioIds: []
    };
    
    try {
        await db.saveSequence(sequence);
        state.sequences.push(sequence);
        setSequences([...state.sequences]);
        
        dom.sequenceNameInput.value = '';
        renderSequencesList();
    } catch (error) {
        console.error('Error creating sequence:', error);
        alert('Error creating sequence: ' + error.message);
    }
}

// Update sequence
export async function updateSequence(sequenceId, name, scenarioIds) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    const updated = {
        ...sequence,
        name: name || sequence.name,
        scenarioIds: scenarioIds !== undefined ? scenarioIds : sequence.scenarioIds
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
        alert('Error updating sequence: ' + error.message);
    }
}

// Delete sequence
export async function deleteSequence(sequenceId) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    if (!confirm(`Delete sequence "${sequence.name}"?`)) {
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
    } catch (error) {
        console.error('Error deleting sequence:', error);
        alert('Error deleting sequence: ' + error.message);
    }
}

// Load sequence (loads first scenario's start position)
export function loadSequence(sequenceId) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence || sequence.scenarioIds.length === 0) {
        alert('This sequence has no scenarios');
        return;
    }
    
    // Load first scenario
    const firstScenarioId = sequence.scenarioIds[0];
    const scenario = getScenarios().find(s => s.id === firstScenarioId);
    if (scenario) {
        playScenario(scenario.id);
    }
    
    // Set current sequence
    setCurrentSequence({
        sequenceId: sequenceId,
        currentScenarioIndex: 0
    });
    
    // Update UI
    updateSequenceProgress();
    dom.nextScenarioBtn.style.display = 'inline-flex';
    dom.sequenceProgress.style.display = 'block';
}

// Play next scenario in sequence
export function playNextScenario() {
    if (!state.currentSequence) return;
    
    const sequence = getSequences().find(s => s.id === state.currentSequence.sequenceId);
    if (!sequence) return;
    
    const nextIndex = state.currentSequence.currentScenarioIndex + 1;
    
    if (nextIndex >= sequence.scenarioIds.length) {
        // Sequence complete
        alert('Sequence complete!');
        setCurrentSequence(null);
        dom.nextScenarioBtn.style.display = 'none';
        dom.sequenceProgress.style.display = 'none';
        return;
    }
    
    const nextScenarioId = sequence.scenarioIds[nextIndex];
    const scenario = getScenarios().find(s => s.id === nextScenarioId);
    
    if (scenario) {
        playScenario(scenario.id);
        
        // Update current sequence
        setCurrentSequence({
            sequenceId: sequence.id,
            currentScenarioIndex: nextIndex
        });
        
        updateSequenceProgress();
    }
}

// Update sequence progress display
export function updateSequenceProgress() {
    if (!state.currentSequence) return;
    
    const sequence = getSequences().find(s => s.id === state.currentSequence.sequenceId);
    if (!sequence) return;
    
    const current = state.currentSequence.currentScenarioIndex + 1;
    const total = sequence.scenarioIds.length;
    
    if (dom.sequenceProgressText) {
        dom.sequenceProgressText.textContent = `Scenario ${current} of ${total}`;
    }
    
    // Hide next button if on last scenario
    if (current >= total) {
        dom.nextScenarioBtn.style.display = 'none';
    } else {
        dom.nextScenarioBtn.style.display = 'inline-flex';
    }
}

// Add scenario to sequence
export function addScenarioToSequence(sequenceId, scenarioId) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    if (sequence.scenarioIds.includes(scenarioId)) {
        alert('Scenario already in sequence');
        return;
    }
    
    sequence.scenarioIds.push(scenarioId);
    updateSequence(sequenceId, null, sequence.scenarioIds);
}

// Remove scenario from sequence
export function removeScenarioFromSequence(sequenceId, scenarioId) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    sequence.scenarioIds = sequence.scenarioIds.filter(id => id !== scenarioId);
    updateSequence(sequenceId, null, sequence.scenarioIds);
}

// Reorder scenarios in sequence
export function reorderScenariosInSequence(sequenceId, fromIndex, toIndex) {
    const sequence = getSequences().find(s => s.id === sequenceId);
    if (!sequence) return;
    
    const scenarioIds = [...sequence.scenarioIds];
    const [moved] = scenarioIds.splice(fromIndex, 1);
    scenarioIds.splice(toIndex, 0, moved);
    
    updateSequence(sequenceId, null, scenarioIds);
}
