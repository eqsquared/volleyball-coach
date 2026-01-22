// Animation module

import { state, setIsAnimating, setLastStartPosition, getPlayerElements, getSavedPositions, getPlayers, getSelectedStartPosition, getSelectedEndPosition, getPositions } from './state.js';
import { dom } from './dom.js';
import { loadPosition } from './positions.js';
import { placePlayerOnCourt } from './court.js';
import { alert } from './modal.js';

// Play animation
export async function playAnimation() {
    const startPosObj = getSelectedStartPosition();
    const endPosObj = getSelectedEndPosition();
    
    if (!startPosObj || !endPosObj) {
        await alert('Please select both start and end positions by dragging them to the drop zones');
        return;
    }
    
    if (state.isAnimating) {
        await alert('Animation already in progress');
        return;
    }
    
    // Get position data
    const startPos = getPositions().find(p => p.id === startPosObj.id);
    const endPos = getPositions().find(p => p.id === endPosObj.id);
    
    if (!startPos || !endPos) {
        await alert('Position not found');
        return;
    }
    
    const startPositions = startPos.playerPositions || [];
    const endPositions = endPos.playerPositions || [];
    
    if (!startPositions || !endPositions) {
        await alert('Invalid positions');
        return;
    }
    
    // Store the start position ID for refresh
    setLastStartPosition(startPos.id);
    
    // Load start position first (don't update loaded item if scenario/sequence is loaded)
    const shouldUpdateLoadedItem = !state.currentLoadedItem || state.currentLoadedItem.type === 'position';
    loadPosition(startPos.id, shouldUpdateLoadedItem);
    
    // Wait a bit then animate
    setTimeout(() => {
        setIsAnimating(true);
        dom.playAnimationBtn.disabled = true;
        
        // Create a map of playerId to end position
        const endPosMap = new Map();
        endPositions.forEach(pos => {
            endPosMap.set(pos.playerId, { x: pos.x, y: pos.y });
        });
        
        // Animate each player
        let animationsComplete = 0;
        const totalAnimations = startPositions.length;
        
        startPositions.forEach(startPos => {
            const endPos = endPosMap.get(startPos.playerId);
            if (!endPos) {
                animationsComplete++;
                if (animationsComplete === totalAnimations) {
                    finishAnimation();
                }
                return;
            }
            
            const playerElement = getPlayerElements().get(startPos.playerId);
            if (!playerElement) {
                animationsComplete++;
                if (animationsComplete === totalAnimations) {
                    finishAnimation();
                }
                return;
            }
            
            playerElement.classList.add('animating');
            
            // Set end position (coordinates are in 600x600 system)
            setTimeout(() => {
                playerElement.style.left = endPos.x + 'px';
                playerElement.style.top = endPos.y + 'px';
            }, 10);
            
            // Remove animating class after animation completes
            setTimeout(() => {
                playerElement.classList.remove('animating');
                animationsComplete++;
                
                if (animationsComplete === totalAnimations) {
                    finishAnimation();
                }
            }, 1010); // 1s animation + 10ms buffer
        });
        
        // Handle case where no animations needed
        if (totalAnimations === 0) {
            finishAnimation();
        }
    }, 100);
}

function finishAnimation() {
    setIsAnimating(false);
    dom.playAnimationBtn.disabled = false;
    if (dom.refreshPositionBtn) {
        dom.refreshPositionBtn.disabled = false;
    }
}

export async function resetToStartPosition() {
    if (!state.lastStartPosition) return;
    
    if (state.isAnimating) {
        await alert('Animation already in progress');
        return;
    }
    
    // Try to get from new format first
    const startPos = getPositions().find(p => p.id === state.lastStartPosition);
    let startPositions = null;
    
    if (startPos) {
        startPositions = startPos.playerPositions || [];
    } else {
        // Fall back to legacy format
        startPositions = getSavedPositions()[state.lastStartPosition];
    }
    
    if (!startPositions) return;
    
    // Get current positions of players on court
    const currentPositions = [];
    getPlayerElements().forEach((element, playerId) => {
        const player = getPlayers().find(p => p.id === playerId);
        if (player) {
            // Coordinates are already in 600x600 system
            const x = parseInt(element.style.left) || 0;
            const y = parseInt(element.style.top) || 0;
            currentPositions.push({
                playerId: playerId,
                x: x,
                y: y
            });
        }
    });
    
    // Create a map of playerId to start position
    const startPosMap = new Map();
    startPositions.forEach(pos => {
        startPosMap.set(pos.playerId, { x: pos.x, y: pos.y });
    });
    
    setIsAnimating(true);
    dom.playAnimationBtn.disabled = true;
    dom.refreshPositionBtn.disabled = true;
    
    // Animate each player back to start position
    let animationsComplete = 0;
    const totalAnimations = currentPositions.length;
    
    if (totalAnimations === 0) {
        // No players on court, just load the position (don't update loaded item if scenario/sequence is loaded)
        const shouldUpdateLoadedItem = !state.currentLoadedItem || state.currentLoadedItem.type === 'position';
        loadPosition(state.lastStartPosition, shouldUpdateLoadedItem);
        finishAnimation();
        return;
    }
    
    currentPositions.forEach(currentPos => {
        const startPos = startPosMap.get(currentPos.playerId);
        if (!startPos) {
            // Player not in start position, remove them
            const playerElement = getPlayerElements().get(currentPos.playerId);
            if (playerElement) {
                playerElement.remove();
                getPlayerElements().delete(currentPos.playerId);
            }
            animationsComplete++;
            if (animationsComplete === totalAnimations) {
                finishAnimation();
            }
            return;
        }
        
        const playerElement = getPlayerElements().get(currentPos.playerId);
        if (!playerElement) {
            animationsComplete++;
            if (animationsComplete === totalAnimations) {
                finishAnimation();
            }
            return;
        }
        
        // Check if position actually changed
        if (currentPos.x === startPos.x && currentPos.y === startPos.y) {
            animationsComplete++;
            if (animationsComplete === totalAnimations) {
                finishAnimation();
            }
            return;
        }
        
        playerElement.classList.add('animating');
        
        // Set start position (coordinates are in 600x600 system)
        setTimeout(() => {
            playerElement.style.left = startPos.x + 'px';
            playerElement.style.top = startPos.y + 'px';
        }, 10);
        
        // Remove animating class after animation completes
        setTimeout(() => {
            playerElement.classList.remove('animating');
            animationsComplete++;
            
            if (animationsComplete === totalAnimations) {
                finishAnimation();
            }
        }, 1010); // 1s animation + 10ms buffer
    });
    
    // Also add any players that are in start position but not on court
    startPositions.forEach(startPos => {
        if (!getPlayerElements().has(startPos.playerId)) {
            const player = getPlayers().find(p => p.id === startPos.playerId);
            if (player) {
                placePlayerOnCourt(player, startPos.x, startPos.y);
            }
        }
    });
}

// Animate from current court state to target position (for sequences)
export async function animateToPosition(targetPositionId, updateLoadedItem = false) {
    if (state.isAnimating) {
        return; // Animation already in progress
    }
    
    // Get target position
    const targetPosition = getPositions().find(p => p.id === targetPositionId);
    if (!targetPosition) {
        // Try legacy format
        const legacyPos = getSavedPositions()[targetPositionId];
        if (legacyPos) {
            // For legacy positions, just load without animation
            loadPosition(targetPositionId, updateLoadedItem);
            return;
        }
        return;
    }
    
    const targetPositions = targetPosition.playerPositions || [];
    
    // Get current positions of players on court
    const currentPositions = [];
    getPlayerElements().forEach((element, playerId) => {
        const player = getPlayers().find(p => p.id === playerId);
        if (player) {
            // Coordinates are already in 600x600 system
            const x = parseInt(element.style.left) || 0;
            const y = parseInt(element.style.top) || 0;
            currentPositions.push({
                playerId: playerId,
                x: x,
                y: y
            });
        }
    });
    
    // Create a map of playerId to target position
    const targetPosMap = new Map();
    targetPositions.forEach(pos => {
        targetPosMap.set(pos.playerId, { x: pos.x, y: pos.y });
    });
    
    setIsAnimating(true);
    
    // Track operations that need to complete
    let operationsComplete = 0;
    let totalOperations = 0;
    
    // Count total operations needed
    const playersToAnimate = new Set();
    const playersToRemove = new Set();
    const playersToAdd = new Set();
    
    // Identify players that need to move
    currentPositions.forEach(currentPos => {
        const targetPos = targetPosMap.get(currentPos.playerId);
        
        if (!targetPos) {
            // Player not in target position, remove them
            playersToRemove.add(currentPos.playerId);
            totalOperations++;
        } else if (currentPos.x !== targetPos.x || currentPos.y !== targetPos.y) {
            // Player needs to move
            playersToAnimate.add(currentPos.playerId);
            totalOperations++;
        }
        // If player is already in correct position, no operation needed
    });
    
    // Identify players that need to be added
    targetPositions.forEach(targetPos => {
        if (!getPlayerElements().has(targetPos.playerId)) {
            playersToAdd.add(targetPos.playerId);
            totalOperations++;
        }
    });
    
    // If no operations needed, finish immediately
    if (totalOperations === 0) {
        finishSequenceAnimation(updateLoadedItem, targetPosition);
        return;
    }
    
    // Remove players not in target position
    playersToRemove.forEach(playerId => {
        const playerElement = getPlayerElements().get(playerId);
        if (playerElement) {
            playerElement.remove();
            getPlayerElements().delete(playerId);
        }
        operationsComplete++;
        if (operationsComplete === totalOperations) {
            finishSequenceAnimation(updateLoadedItem, targetPosition);
        }
    });
    
    // Add players that are in target position but not on court
    playersToAdd.forEach(playerId => {
        const targetPos = targetPosMap.get(playerId);
        if (targetPos) {
            const player = getPlayers().find(p => p.id === playerId);
            if (player) {
                placePlayerOnCourt(player, targetPos.x, targetPos.y);
            }
        }
        operationsComplete++;
        if (operationsComplete === totalOperations) {
            finishSequenceAnimation(updateLoadedItem, targetPosition);
        }
    });
    
    // Animate players that need to move
    playersToAnimate.forEach(playerId => {
        const currentPos = currentPositions.find(p => p.playerId === playerId);
        const targetPos = targetPosMap.get(playerId);
        
        if (!currentPos || !targetPos) {
            operationsComplete++;
            if (operationsComplete === totalOperations) {
                finishSequenceAnimation(updateLoadedItem, targetPosition);
            }
            return;
        }
        
        const playerElement = getPlayerElements().get(playerId);
        if (!playerElement) {
            operationsComplete++;
            if (operationsComplete === totalOperations) {
                finishSequenceAnimation(updateLoadedItem, targetPosition);
            }
            return;
        }
        
        playerElement.classList.add('animating');
        
        // Set target position (coordinates are in 600x600 system)
        setTimeout(() => {
            playerElement.style.left = targetPos.x + 'px';
            playerElement.style.top = targetPos.y + 'px';
        }, 10);
        
        // Remove animating class after animation completes
        setTimeout(() => {
            playerElement.classList.remove('animating');
            operationsComplete++;
            
            if (operationsComplete === totalOperations) {
                finishSequenceAnimation(updateLoadedItem, targetPosition);
            }
        }, 1010); // 1s animation + 10ms buffer
    });
}

async function finishSequenceAnimation(updateLoadedItem, targetPosition) {
    setIsAnimating(false);
    
    // Update state only if requested
    if (updateLoadedItem) {
        const { setCurrentLoadedItem, setIsModified } = await import('./state.js');
        setCurrentLoadedItem({ type: 'position', id: targetPosition.id, name: targetPosition.name });
        setIsModified(false);
        
        // Show drop zones, hide timeline (async import)
        const { showDropZones, updateScenarioButtonsVisibility, renderPositionsList, updateCurrentItemDisplay } = await import('./ui.js');
        showDropZones();
        updateScenarioButtonsVisibility();
        renderPositionsList();
        updateCurrentItemDisplay();
    }
}
