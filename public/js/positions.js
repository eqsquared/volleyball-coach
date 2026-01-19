// Position management module (v4.0 - new structure)

import * as db from '../db.js';
import { 
    state, 
    getPositions, 
    getPlayerElements, 
    getPlayers, 
    setPositions,
    setCurrentLoadedItem,
    setIsModified,
    checkForModifications
} from './state.js';
import { dom } from './dom.js';
import { placePlayerOnCourt } from './court.js';
import { renderPositionsList } from './ui.js';

// Generate unique ID
function generateId() {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Save current position
export async function savePosition() {
    const positionName = dom.positionNameInput.value.trim();
    
    if (!positionName) {
        alert('Please enter a position name');
        return;
    }
    
    // Get selected rotation IDs
    const selectedRotations = Array.from(dom.positionRotationSelect.selectedOptions)
        .map(opt => opt.value)
        .filter(id => id);
    
    // Collect current player positions
    const playerPositions = [];
    getPlayerElements().forEach((element, playerId) => {
        const player = getPlayers().find(p => p.id === playerId);
        if (player) {
            playerPositions.push({
                playerId: playerId,
                jersey: player.jersey,
                name: player.name,
                x: parseInt(element.style.left) || 0,
                y: parseInt(element.style.top) || 0
            });
        }
    });
    
    // Check if position with this name already exists
    const existing = getPositions().find(p => p.name === positionName);
    
    let position;
    if (existing && state.currentLoadedItem && state.currentLoadedItem.id === existing.id) {
        // Update existing position
        position = {
            ...existing,
            playerPositions: playerPositions,
            rotationIds: selectedRotations
        };
    } else if (existing) {
        // Name conflict
        if (!confirm(`Position "${positionName}" already exists. Overwrite?`)) {
            return;
        }
        position = {
            ...existing,
            playerPositions: playerPositions,
            rotationIds: selectedRotations
        };
    } else {
        // Create new position
        position = {
            id: generateId(),
            name: positionName,
            rotationIds: selectedRotations,
            playerPositions: playerPositions
        };
    }
    
    try {
        await db.savePositionNew(position);
        
        const index = state.positions.findIndex(p => p.id === position.id);
        if (index >= 0) {
            state.positions[index] = position;
        } else {
            state.positions.push(position);
        }
        setPositions([...state.positions]);
        
        // Update state
        setCurrentLoadedItem({ type: 'position', id: position.id, name: position.name });
        setIsModified(false);
        
        dom.positionNameInput.value = '';
        dom.positionRotationSelect.selectedIndex = 0;
        
        renderPositionsList();
        // Update rotation select if available
        import('./rotations.js').then(module => {
            module.updatePositionRotationSelect();
        });
    } catch (error) {
        console.error('Error saving position:', error);
        alert('Error saving position: ' + error.message);
    }
}

// Load position by ID
export function loadPosition(positionId) {
    const position = getPositions().find(p => p.id === positionId);
    if (!position) {
        // Try legacy format
        const legacyPos = state.savedPositions[positionId];
        if (legacyPos) {
            loadLegacyPosition(positionId, legacyPos);
            return;
        }
        return;
    }
    
    // Clear current positions
    getPlayerElements().forEach((element) => {
        element.remove();
    });
    getPlayerElements().clear();
    
    // Place players in saved positions
    (position.playerPositions || []).forEach(pos => {
        const player = getPlayers().find(p => p.id === pos.playerId);
        if (player) {
            placePlayerOnCourt(player, pos.x, pos.y);
        }
    });
    
    // Update state
    setCurrentLoadedItem({ type: 'position', id: position.id, name: position.name });
    setIsModified(false);
    
    // Check for modifications when players move
    setTimeout(() => {
        checkForModifications();
    }, 100);
}

// Load legacy position (for backward compatibility)
function loadLegacyPosition(positionName, positions) {
    // Clear current positions
    getPlayerElements().forEach((element) => {
        element.remove();
    });
    getPlayerElements().clear();
    
    // Place players in saved positions
    positions.forEach(pos => {
        const player = getPlayers().find(p => p.id === pos.playerId);
        if (player) {
            placePlayerOnCourt(player, pos.x, pos.y);
        }
    });
    
    setCurrentLoadedItem({ type: 'position', id: positionName, name: positionName });
    setIsModified(false);
}

// Update position
export async function updatePosition(positionId, name, rotationIds, playerPositions) {
    const position = getPositions().find(p => p.id === positionId);
    if (!position) return;
    
    const updated = {
        ...position,
        name: name || position.name,
        rotationIds: rotationIds !== undefined ? rotationIds : position.rotationIds,
        playerPositions: playerPositions !== undefined ? playerPositions : position.playerPositions
    };
    
    try {
        await db.savePositionNew(updated);
        const index = state.positions.findIndex(p => p.id === positionId);
        if (index >= 0) {
            state.positions[index] = updated;
            setPositions([...state.positions]);
            renderPositionsList();
            // Update rotation select if available
            if (typeof updatePositionRotationSelect === 'function') {
                import('./rotations.js').then(module => {
                    module.updatePositionRotationSelect();
                });
            }
        }
    } catch (error) {
        console.error('Error updating position:', error);
        alert('Error updating position: ' + error.message);
    }
}

// Delete position
export async function deletePosition(positionId) {
    const position = getPositions().find(p => p.id === positionId);
    if (!position) return;
    
    if (!confirm(`Delete position "${position.name}"?`)) {
        return;
    }
    
    try {
        await db.deletePositionNew(positionId);
        state.positions = state.positions.filter(p => p.id !== positionId);
        setPositions([...state.positions]);
        
        renderPositionsList();
        // Update rotation select if available
        import('./rotations.js').then(module => {
            module.updatePositionRotationSelect();
        });
        
        // Clear loaded item if it was this position
        if (state.currentLoadedItem && state.currentLoadedItem.id === positionId) {
            setCurrentLoadedItem(null);
            setIsModified(false);
        }
    } catch (error) {
        console.error('Error deleting position:', error);
        alert('Error deleting position: ' + error.message);
    }
}

// Save current position as new (used by save-as functionality)
export async function savePositionAs() {
    const currentName = dom.positionNameInput.value.trim() || 
                       (state.currentLoadedItem ? state.currentLoadedItem.name + ' (Copy)' : 'New Position');
    
    dom.positionNameInput.value = currentName;
    await savePosition();
}
