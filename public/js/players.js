// Player management module

import * as db from '../db.js';
import { state, setPlayers, getPlayers, getPlayerElements, setDbInitialized } from './state.js';
import { dom } from './dom.js';
import { renderLineup, updateSavedPositionsList } from './ui.js';
import { alert, confirm } from './modal.js';

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

// Edit player
export async function editPlayer(playerId) {
    const player = getPlayers().find(p => p.id === playerId);
    if (!player) return;
    
    const jerseyInputId = 'edit-player-jersey-' + Date.now();
    const nameInputId = 'edit-player-name-' + Date.now();
    
    const bodyHtml = `
        <div class="modal-form-container">
            <div class="modal-form-group">
                <label for="${jerseyInputId}" class="modal-label">Jersey Number</label>
                <input type="number" id="${jerseyInputId}" class="modal-input modal-input-full" value="${escapeHtml(player.jersey)}" min="1" max="99">
            </div>
            <div class="modal-form-group">
                <label for="${nameInputId}" class="modal-label">Player Name</label>
                <input type="text" id="${nameInputId}" class="modal-input modal-input-full" value="${escapeHtml(player.name)}">
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
        
        titleEl.textContent = 'Edit Player';
        bodyEl.innerHTML = bodyHtml;
        footerEl.innerHTML = footerHtml;
        
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        const jerseyInput = document.getElementById(jerseyInputId);
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
        
        // Handle Enter key in inputs
        [jerseyInput, nameInput].forEach(input => {
            if (input) {
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (confirmBtn) confirmBtn.click();
                    }
                });
            }
        });
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                resolve(false);
            });
        }
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                const newJersey = jerseyInput ? jerseyInput.value.trim() : '';
                const newName = nameInput ? nameInput.value.trim() : '';
                
                if (!newJersey || !newName) {
                    await alert('Please enter both jersey number and name');
                    return;
                }
                
                // Check for duplicate jersey number (excluding current player)
                const existingWithJersey = getPlayers().find(p => p.jersey === newJersey && p.id !== playerId);
                if (existingWithJersey) {
                    await alert('A player with this jersey number already exists');
                    return;
                }
                
                // Update player
                const updated = {
                    ...player,
                    jersey: newJersey,
                    name: newName
                };
                
                try {
                    await db.savePlayer(updated);
                    
                    const index = state.players.findIndex(p => p.id === playerId);
                    if (index >= 0) {
                        state.players[index] = updated;
                        setPlayers([...state.players]);
                    }
                    
                    // Update player element on court if present
                    const playerElement = getPlayerElements().get(playerId);
                    if (playerElement) {
                        // Update jersey in the circle
                        const playerCircle = playerElement.querySelector('.player-on-court');
                        if (playerCircle) {
                            playerCircle.textContent = newJersey;
                        }
                        // Update name in the label
                        const playerLabel = playerElement.querySelector('.player-label');
                        if (playerLabel) {
                            playerLabel.textContent = newName;
                        }
                    }
                    
                    renderLineup();
                    
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                    resolve(true);
                } catch (error) {
                    console.error('Error updating player:', error);
                    await alert('Error updating player: ' + error.message);
                }
            });
        }
        
        // Close on Escape or overlay click
        const closeHandler = (e) => {
            if (e.key === 'Escape' || (e.target === overlay && e.type === 'click')) {
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
