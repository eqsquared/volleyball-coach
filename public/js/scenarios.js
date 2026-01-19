// Scenarios management module

import * as db from '../db.js';
import { state, getScenarios, setScenarios, getPositions } from './state.js';
import { dom } from './dom.js';
import { renderScenariosList } from './ui.js';
import { loadPosition } from './positions.js';
import { playAnimation } from './animation.js';

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
        alert('Please enter a scenario name');
        return;
    }
    
    if (!startPositionId || !endPositionId) {
        alert('Please select both start and end positions');
        return;
    }
    
    if (startPositionId === endPositionId) {
        alert('Start and end positions must be different');
        return;
    }
    
    // Check for duplicate name
    const existing = getScenarios().find(s => s.name === name);
    if (existing) {
        alert('A scenario with this name already exists');
        return;
    }
    
    const scenario = {
        id: generateId(),
        name: name,
        startPositionId: startPositionId,
        endPositionId: endPositionId
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
        alert('Error creating scenario: ' + error.message);
    }
}

// Update scenario
export async function updateScenario(scenarioId, name, startPositionId, endPositionId) {
    const scenario = getScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;
    
    const updated = {
        ...scenario,
        name: name || scenario.name,
        startPositionId: startPositionId || scenario.startPositionId,
        endPositionId: endPositionId || scenario.endPositionId
    };
    
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
        alert('Error updating scenario: ' + error.message);
    }
}

// Delete scenario
export async function deleteScenario(scenarioId) {
    const scenario = getScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;
    
    if (!confirm(`Delete scenario "${scenario.name}"?`)) {
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
    } catch (error) {
        console.error('Error deleting scenario:', error);
        alert('Error deleting scenario: ' + error.message);
    }
}

// Load scenario (loads start position)
export function loadScenario(scenarioId) {
    const scenario = getScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;
    
    loadPosition(scenario.startPositionId);
    
    // Update state
    import('./state.js').then((stateModule) => {
        stateModule.setCurrentLoadedItem({ type: 'scenario', id: scenario.id, name: scenario.name });
        stateModule.setIsModified(false);
    });
}

// Play scenario (animates from start to end)
export function playScenario(scenarioId) {
    const scenario = getScenarios().find(s => s.id === scenarioId);
    if (!scenario) return;
    
    // Set selects and play
    dom.scenarioStartSelect.value = scenario.startPositionId;
    dom.scenarioEndSelect.value = scenario.endPositionId;
    
    // Use the existing animation system
    const startPos = getPositions().find(p => p.id === scenario.startPositionId);
    const endPos = getPositions().find(p => p.id === scenario.endPositionId);
    
    if (!startPos || !endPos) {
        alert('Position not found');
        return;
    }
    
    // Load start position first, then animate
    loadPosition(scenario.startPositionId);
    
    setTimeout(() => {
        // Create temporary position objects for animation
        const tempSavedPositions = {};
        tempSavedPositions[startPos.name] = startPos.playerPositions || [];
        tempSavedPositions[endPos.name] = endPos.playerPositions || [];
        
        // Temporarily set saved positions for animation
        const originalSavedPositions = state.savedPositions;
        state.savedPositions = tempSavedPositions;
        
        // Update selects
        const originalStartSelect = dom.startPositionSelect;
        const originalEndSelect = dom.endPositionSelect;
        
        // Play animation
        playAnimation();
        
        // Restore after a delay
        setTimeout(() => {
            state.savedPositions = originalSavedPositions;
        }, 2000);
    }, 100);
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
