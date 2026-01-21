// Scenarios management module

import * as db from '../db.js';
import { state, getScenarios, setScenarios, getPositions, setSelectedStartPosition, setSelectedEndPosition, getSelectedStartPosition, getSelectedEndPosition, setCurrentLoadedItem, setIsModified } from './state.js';
import { dom } from './dom.js';
import { renderScenariosList, updateDropZoneDisplay, updateCurrentItemDisplay, updateModifiedIndicator } from './ui.js';
import { loadPosition } from './positions.js';
import { playAnimation } from './animation.js';
import { alert, confirm, prompt } from './modal.js';

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
        await alert('Error creating scenario: ' + error.message);
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
export function loadScenario(scenarioId) {
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
    
    // Load start position on court
    loadPosition(scenario.startPositionId);
    
    // Update state
    setCurrentLoadedItem({ type: 'scenario', id: scenario.id, name: scenario.name });
    setIsModified(false);
    updateCurrentItemDisplay();
    updateModifiedIndicator(false);
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
    
    // Load start position first, then animate
    loadPosition(scenario.startPositionId);
    
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
        endPositionId: endPos.id
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
    
    const currentScenario = state.currentLoadedItem && state.currentLoadedItem.type === 'scenario' ?
        getScenarios().find(s => s.id === state.currentLoadedItem.id) : null;
    const currentName = currentScenario ? currentScenario.name + ' (Copy)' : 'New Scenario';
    
    const name = await prompt('Enter scenario name:', currentName);
    if (!name || !name.trim()) {
        return;
    }
    
    // Check for duplicate name
    const existing = getScenarios().find(s => s.name === name.trim());
    if (existing) {
        await alert('A scenario with this name already exists');
        return;
    }
    
    const scenario = {
        id: generateId(),
        name: name.trim(),
        startPositionId: startPos.id,
        endPositionId: endPos.id
    };
    
    try {
        await db.saveScenario(scenario);
        state.scenarios.push(scenario);
        setScenarios([...state.scenarios]);
        
        // Update state to the new scenario
        setCurrentLoadedItem({ type: 'scenario', id: scenario.id, name: scenario.name });
        setIsModified(false);
        
        renderScenariosList();
        updateCurrentItemDisplay();
        updateModifiedIndicator(false);
    } catch (error) {
        console.error('Error saving scenario:', error);
        await alert('Error saving scenario: ' + error.message);
    }
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
export function clearScenario() {
    setSelectedStartPosition(null);
    setSelectedEndPosition(null);
    updateDropZoneDisplay();
    
    setCurrentLoadedItem(null);
    setIsModified(false);
    updateCurrentItemDisplay();
    updateModifiedIndicator(false);
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
