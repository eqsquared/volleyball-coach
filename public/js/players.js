// Player management module

import * as db from '../db.js';
import { state, setPlayers, getPlayers, getPlayerElements, setDbInitialized } from './state.js';
import { dom } from './dom.js';
import { renderLineup, updateSavedPositionsList } from './ui.js';
import { alert } from './modal.js';

// Add player to lineup
export async function addPlayer() {
    const jersey = dom.jerseyInput.value.trim();
    const name = dom.nameInput.value.trim();
    
    if (!jersey || !name) {
        await alert('Please enter both jersey number and name');
        return;
    }
    
    // Check for duplicate jersey numbers
    if (getPlayers().some(p => p.jersey === jersey)) {
        await alert('A player with this jersey number already exists');
        return;
    }
    
    const player = {
        id: Date.now().toString(),
        jersey: jersey,
        name: name
    };
    
    state.players.push(player);
    
    // Save to file-based storage
    if (state.dbInitialized) {
        try {
            await db.savePlayer(player);
        } catch (error) {
            console.error('Error saving player:', error);
            await alert('Error saving player: ' + error.message);
        }
    }
    
    renderLineup();
    
    // Clear inputs
    dom.jerseyInput.value = '';
    dom.nameInput.value = '';
    dom.jerseyInput.focus();
}

// Delete player
export async function deletePlayer(playerId) {
    setPlayers(getPlayers().filter(p => p.id !== playerId));
    
    // Remove from file-based storage
    if (state.dbInitialized) {
        try {
            await db.deletePlayer(playerId);
        } catch (error) {
            console.error('Error deleting player:', error);
            await alert('Error deleting player: ' + error.message);
        }
    }
    
    // Remove player from court if present
    const playerElement = getPlayerElements().get(playerId);
    if (playerElement) {
        playerElement.remove();
        getPlayerElements().delete(playerId);
    }
    
    // Remove from all saved positions
    Object.keys(state.savedPositions).forEach(posName => {
        state.savedPositions[posName] = state.savedPositions[posName].filter(
            p => p.playerId !== playerId
        );
    });
    
    // Update positions in file-based storage
    if (state.dbInitialized) {
        for (const [posName, positions] of Object.entries(state.savedPositions)) {
            try {
                await db.savePosition(posName, positions);
            } catch (error) {
                console.error('Error updating position:', error);
            }
        }
    }
    
    renderLineup();
    updateSavedPositionsList();
}
