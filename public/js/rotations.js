// Rotations management module

import * as db from '../db.js';
import { state, getRotations, setRotations, getPositions } from './state.js';
import { dom } from './dom.js';
import { renderRotationsList } from './ui.js';

// Generate unique ID
function generateId() {
    return `rot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create rotation
export async function createRotation() {
    const name = dom.rotationNameInput.value.trim();
    
    if (!name) {
        alert('Please enter a rotation name');
        return;
    }
    
    // Check for duplicate name
    const existing = getRotations().find(r => r.name === name);
    if (existing) {
        alert('A rotation with this name already exists');
        return;
    }
    
    const rotation = {
        id: generateId(),
        name: name,
        positionIds: []
    };
    
    try {
        await db.saveRotation(rotation);
        state.rotations.push(rotation);
        setRotations([...state.rotations]);
        
        dom.rotationNameInput.value = '';
        renderRotationsList();
        
        // Update position rotation select
        updatePositionRotationSelect();
    } catch (error) {
        console.error('Error creating rotation:', error);
        alert('Error creating rotation: ' + error.message);
    }
}

// Update rotation
export async function updateRotation(rotationId, name, positionIds) {
    const rotation = getRotations().find(r => r.id === rotationId);
    if (!rotation) return;
    
    const updated = {
        ...rotation,
        name: name || rotation.name,
        positionIds: positionIds || rotation.positionIds
    };
    
    try {
        await db.saveRotation(updated);
        const index = state.rotations.findIndex(r => r.id === rotationId);
        if (index >= 0) {
            state.rotations[index] = updated;
            setRotations([...state.rotations]);
            renderRotationsList();
            updatePositionRotationSelect();
        }
    } catch (error) {
        console.error('Error updating rotation:', error);
        alert('Error updating rotation: ' + error.message);
    }
}

// Delete rotation
export async function deleteRotation(rotationId) {
    if (!confirm('Delete this rotation? Positions will not be deleted, only the rotation grouping.')) {
        return;
    }
    
    try {
        await db.deleteRotation(rotationId);
        state.rotations = state.rotations.filter(r => r.id !== rotationId);
        setRotations([...state.rotations]);
        
        // Remove rotation from positions
        state.positions.forEach(position => {
            position.rotationIds = position.rotationIds.filter(id => id !== rotationId);
        });
        
        renderRotationsList();
        updatePositionRotationSelect();
    } catch (error) {
        console.error('Error deleting rotation:', error);
        alert('Error deleting rotation: ' + error.message);
    }
}

// Load rotation (shows all positions in the rotation)
export async function loadRotation(rotationId) {
    const rotation = getRotations().find(r => r.id === rotationId);
    if (!rotation || rotation.positionIds.length === 0) {
        alert('This rotation has no positions');
        return;
    }
    
    // Load the first position in the rotation
    const firstPositionId = rotation.positionIds[0];
    const { loadPosition } = await import('./positions.js');
    loadPosition(firstPositionId);
}

// Update position rotation select dropdown
export function updatePositionRotationSelect() {
    if (!dom.positionRotationSelect) return;
    
    const currentValues = Array.from(dom.positionRotationSelect.selectedOptions).map(opt => opt.value);
    dom.positionRotationSelect.innerHTML = '<option value="">Select rotations...</option>';
    
    getRotations().forEach(rotation => {
        const option = document.createElement('option');
        option.value = rotation.id;
        option.textContent = rotation.name;
        if (currentValues.includes(rotation.id)) {
            option.selected = true;
        }
        dom.positionRotationSelect.appendChild(option);
    });
}
