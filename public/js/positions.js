// Position management module

import * as db from '../db.js';
import { state, getSavedPositions, getPlayerElements, getPlayers, setSavedPositions } from './state.js';
import { dom } from './dom.js';
import { placePlayerOnCourt } from './court.js';
import { updateSavedPositionsList, updatePositionSelects } from './ui.js';

// Save current position
export async function savePosition() {
    const positionName = dom.positionNameInput.value.trim();
    
    if (!positionName) {
        alert('Please enter a position name');
        return;
    }
    
    // Collect current player positions
    const positions = [];
    getPlayerElements().forEach((element, playerId) => {
        const player = getPlayers().find(p => p.id === playerId);
        if (player) {
            positions.push({
                playerId: playerId,
                jersey: player.jersey,
                name: player.name,
                x: parseInt(element.style.left),
                y: parseInt(element.style.top)
            });
        }
    });
    
    state.savedPositions[positionName] = positions;
    dom.positionNameInput.value = '';
    
    // Save to file-based storage
    if (state.dbInitialized) {
        try {
            await db.savePosition(positionName, positions);
        } catch (error) {
            console.error('Error saving position:', error);
            alert('Error saving position: ' + error.message);
        }
    }
    
    updateSavedPositionsList();
    updatePositionSelects();
}

// Load position
export function loadPosition(positionName) {
    const positions = getSavedPositions()[positionName];
    if (!positions) return;
    
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
}

// Save over existing position
export async function saveOverPosition(positionName) {
    if (!confirm(`Overwrite position "${positionName}" with current court positions?`)) {
        return;
    }
    
    // Collect current player positions
    const positions = [];
    getPlayerElements().forEach((element, playerId) => {
        const player = getPlayers().find(p => p.id === playerId);
        if (player) {
            positions.push({
                playerId: playerId,
                jersey: player.jersey,
                name: player.name,
                x: parseInt(element.style.left),
                y: parseInt(element.style.top)
            });
        }
    });
    
    state.savedPositions[positionName] = positions;
    
    // Save to file-based storage
    if (state.dbInitialized) {
        try {
            await db.savePosition(positionName, positions);
        } catch (error) {
            console.error('Error saving position:', error);
            alert('Error saving position: ' + error.message);
        }
    }
    
    updateSavedPositionsList();
    updatePositionSelects();
}

// Delete position
export async function deletePosition(positionName) {
    if (confirm(`Delete position "${positionName}"?`)) {
        delete state.savedPositions[positionName];
        
        // Delete from file-based storage
        if (state.dbInitialized) {
            try {
                await db.deletePosition(positionName);
            } catch (error) {
                console.error('Error deleting position:', error);
                alert('Error deleting position: ' + error.message);
            }
        }
        
        updateSavedPositionsList();
        updatePositionSelects();
    }
}
