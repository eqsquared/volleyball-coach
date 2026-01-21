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
import { renderPositionsList, updateCurrentItemDisplay } from './ui.js';
import { alert, confirm, prompt } from './modal.js';
import { animateToPosition } from './animation.js';

// Generate unique ID
function generateId() {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create new position (opens modal)
export async function createNewPosition() {
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
    
    const nameInputId = 'new-position-name-' + Date.now();
    const tagsInputId = 'new-position-tags-' + Date.now();
    const tagsContainerId = 'new-position-tags-container-' + Date.now();
    const allTags = getAllTagsForModal();
    
    // Build tag selector HTML
    const tagsSelectorHtml = allTags.length > 0 ? `
        <div class="tag-selector-container">
            <div class="tag-selector-header">Select from existing tags:</div>
            <div class="tag-selector-buttons" id="${tagsContainerId}">
                ${allTags.map(tag => `
                    <button type="button" class="tag-selector-btn" data-tag="${escapeHtml(tag)}">
                        ${escapeHtml(tag)}
                    </button>
                `).join('')}
            </div>
        </div>
    ` : '';
    
    const bodyHtml = `
        <div class="modal-form-container">
            <div class="modal-form-group">
                <label for="${nameInputId}" class="modal-label">Position Name</label>
                <input type="text" id="${nameInputId}" class="modal-input modal-input-full" placeholder="Enter position name">
            </div>
            <div class="modal-form-group">
                <label for="${tagsInputId}" class="modal-label">Tags</label>
                <input type="text" id="${tagsInputId}" class="modal-input modal-input-full" placeholder="Type tags (comma-separated) or select below">
                ${tagsSelectorHtml}
            </div>
        </div>
    `;
    
    const footerHtml = `
        <button class="modal-btn modal-btn-secondary" id="modal-cancel">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="modal-confirm">Create</button>
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
        
        titleEl.textContent = 'New Position';
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
        let selectedTagsInModal = new Set();
        
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
            }
        }, 100);
        
        // Handle Enter key in name input
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
                    await alert('Position name cannot be empty');
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
                
                // Create new position (duplicate names allowed, distinguished by tags)
                const position = {
                    id: generateId(),
                    name: newName,
                    tags: newTags,
                    playerPositions: playerPositions
                };
                
                try {
                    await db.savePositionNew(position);
                    
                    state.positions.push(position);
                    setPositions([...state.positions]);
                    
                    // Update state
                    setCurrentLoadedItem({ type: 'position', id: position.id, name: position.name });
                    setIsModified(false);
                    
                    renderPositionsList();
                    
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                    resolve(true);
                } catch (error) {
                    console.error('Error saving position:', error);
                    await alert('Error saving position: ' + error.message);
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

// Save current position (updates existing position without modal, or opens modal for new)
export async function savePosition() {
    if (!state.currentLoadedItem || state.currentLoadedItem.type !== 'position') {
        return;
    }
    
    // If it's a new position (no ID), open the modal to create it
    if (!state.currentLoadedItem.id) {
        await createPositionFromModal();
        return;
    }
    
    const position = getPositions().find(p => p.id === state.currentLoadedItem.id);
    if (!position) {
        await alert('Position not found');
        return;
    }
    
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
    
    // Update position with current player positions
    const updated = {
        ...position,
        playerPositions: playerPositions
    };
    
    try {
        await db.savePositionNew(updated);
        
        const index = state.positions.findIndex(p => p.id === position.id);
        if (index >= 0) {
            state.positions[index] = updated;
            setPositions([...state.positions]);
        }
        
        setIsModified(false);
        renderPositionsList();
    } catch (error) {
        console.error('Error saving position:', error);
        await alert('Error saving position: ' + error.message);
    }
}

// Load position by ID
export async function loadPosition(positionId, updateLoadedItem = true, skipAnimation = false) {
    const position = getPositions().find(p => p.id === positionId);
    if (!position) {
        // Try legacy format
        const legacyPos = state.savedPositions[positionId];
        if (legacyPos) {
            loadLegacyPosition(positionId, legacyPos, updateLoadedItem);
            return;
        }
        return;
    }
    
    // Check if there are players on the court - if so, animate instead of instant placement
    // Skip animation if explicitly requested (e.g., when loading start position before scenario animation)
    const hasPlayersOnCourt = getPlayerElements().size > 0;
    
    if (hasPlayersOnCourt && !state.isAnimating && !skipAnimation) {
        // Use animation to transition from current state to new position
        await animateToPosition(positionId, updateLoadedItem);
        
        // Check for modifications when players move (after animation)
        setTimeout(() => {
            checkForModifications();
        }, 1100); // Wait for animation to complete
        return;
    }
    
    // No players on court or animation in progress - instant placement
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
    
    // Update state only if requested (don't override scenario/sequence when loading position for them)
    if (updateLoadedItem) {
        setCurrentLoadedItem({ type: 'position', id: position.id, name: position.name });
        setIsModified(false);
        
        // Show drop zones, hide timeline (async import)
        import('./ui.js').then(({ showDropZones, updateScenarioButtonsVisibility }) => {
            showDropZones();
            updateScenarioButtonsVisibility();
        });
        
        // Re-render positions list to update active state
        renderPositionsList();
        
        // Update current item display
        updateCurrentItemDisplay();
    }
    
    // Check for modifications when players move
    setTimeout(() => {
        checkForModifications();
    }, 100);
}

// Load legacy position (for backward compatibility)
function loadLegacyPosition(positionName, positions, updateLoadedItem = true) {
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
    
    // Update state only if requested
    if (updateLoadedItem) {
        setCurrentLoadedItem({ type: 'position', id: positionName, name: positionName });
        setIsModified(false);
    }
}

// Update position
export async function updatePosition(positionId, updates) {
    const position = getPositions().find(p => p.id === positionId);
    if (!position) return;
    
    const updated = {
        ...position,
        ...updates
    };
    
    // Ensure tags array exists
    if (!updated.tags) {
        updated.tags = [];
    }
    
    try {
        await db.savePositionNew(updated);
        const index = state.positions.findIndex(p => p.id === positionId);
        if (index >= 0) {
            state.positions[index] = updated;
            setPositions([...state.positions]);
            renderPositionsList();
        }
    } catch (error) {
        console.error('Error updating position:', error);
        await alert('Error updating position: ' + error.message);
    }
}

// Get all unique tags from positions
function getAllTagsForModal() {
    const allTags = new Set();
    getPositions().forEach(position => {
        (position.tags || []).forEach(tag => {
            if (tag.trim()) {
                allTags.add(tag.trim());
            }
        });
    });
    return Array.from(allTags).sort();
}

// Edit position (name and tags)
export async function editPosition(positionId) {
    const position = getPositions().find(p => p.id === positionId);
    if (!position) return;
    
    const nameInputId = 'edit-position-name-' + Date.now();
    const tagsInputId = 'edit-position-tags-' + Date.now();
    const tagsContainerId = 'edit-position-tags-container-' + Date.now();
    const currentTags = new Set((position.tags || []).map(t => t.trim()).filter(Boolean));
    const allTags = getAllTagsForModal();
    
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
                <label for="${nameInputId}" class="modal-label">Position Name</label>
                <input type="text" id="${nameInputId}" class="modal-input modal-input-full" value="${escapeHtml(position.name)}">
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
        
        titleEl.textContent = 'Edit Position';
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
                    await alert('Position name cannot be empty');
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
                
                await updatePosition(positionId, { 
                    name: newName,
                    tags: newTags
                });
                
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

// Delete position
export async function deletePosition(positionId) {
    const position = getPositions().find(p => p.id === positionId);
    if (!position) return;
    
    const confirmed = await confirm(`Delete position "${position.name}"?`);
    if (!confirmed) {
        return;
    }
    
    try {
        await db.deletePositionNew(positionId);
        state.positions = state.positions.filter(p => p.id !== positionId);
        setPositions([...state.positions]);
        
        renderPositionsList();
        
        // Clear loaded item if it was this position
        if (state.currentLoadedItem && state.currentLoadedItem.id === positionId) {
            setCurrentLoadedItem(null);
            setIsModified(false);
        }
    } catch (error) {
        console.error('Error deleting position:', error);
        await alert('Error deleting position: ' + error.message);
    }
}

// Create position from modal (for new positions or save as)
export async function createPositionFromModal(isSaveAs = false) {
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
    
    // Determine default name and tags
    let defaultName = '';
    let currentTags = new Set();
    
    if (isSaveAs && state.currentLoadedItem && state.currentLoadedItem.type === 'position' && state.currentLoadedItem.id) {
        // Save As on existing position - preserve name (with Copy) and tags
        const currentPosition = getPositions().find(p => p.id === state.currentLoadedItem.id);
        if (currentPosition) {
            defaultName = currentPosition.name + ' (Copy)';
            // Preserve tags from original position
            currentTags = new Set((currentPosition.tags || []).map(t => t.trim()).filter(Boolean));
        } else {
            defaultName = 'New Position';
        }
    } else {
        // New position or Save As on unsaved position
        defaultName = state.currentLoadedItem && state.currentLoadedItem.name ? 
            state.currentLoadedItem.name : 'New Position';
    }
    
    const nameInputId = 'create-position-name-' + Date.now();
    const tagsInputId = 'create-position-tags-' + Date.now();
    const tagsContainerId = 'create-position-tags-container-' + Date.now();
    const allTags = getAllTagsForModal();
    
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
                <label for="${nameInputId}" class="modal-label">Position Name</label>
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
        
        titleEl.textContent = isSaveAs ? 'Save Position As' : 'Save Position';
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
                    await alert('Position name cannot be empty');
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
                
                const position = {
                    id: generateId(),
                    name: newName,
                    tags: newTags,
                    playerPositions: playerPositions
                };
                
                try {
                    await db.savePositionNew(position);
                    
                    state.positions.push(position);
                    setPositions([...state.positions]);
                    
                    // Update state to the new position
                    setCurrentLoadedItem({ type: 'position', id: position.id, name: position.name });
                    setIsModified(false);
                    
                    overlay.classList.add('hidden');
                    overlay.style.display = 'none';
                    document.body.style.overflow = '';
                    
                    renderPositionsList();
                    updateCurrentItemDisplay();
                    
                    resolve(true);
                } catch (error) {
                    console.error('Error saving position:', error);
                    await alert('Error saving position: ' + error.message);
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

// Save current position as new (always opens modal with tag selector)
export async function savePositionAs() {
    await createPositionFromModal(true);
}
