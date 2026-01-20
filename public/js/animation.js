// Animation module

import { state, setIsAnimating, setLastStartPosition, getPlayerElements, getSavedPositions, getPlayers } from './state.js';
import { dom } from './dom.js';
import { loadPosition } from './positions.js';
import { placePlayerOnCourt } from './court.js';
import { alert } from './modal.js';

// Play animation
export async function playAnimation() {
    const startPos = dom.startPositionSelect?.value;
    const endPos = dom.endPositionSelect?.value;
    
    if (!startPos || !endPos) {
        await alert('Please select both start and end positions');
        return;
    }
    
    if (state.isAnimating) {
        await alert('Animation already in progress');
        return;
    }
    
    const startPositions = getSavedPositions()[startPos];
    const endPositions = getSavedPositions()[endPos];
    
    if (!startPositions || !endPositions) {
        await alert('Invalid positions');
        return;
    }
    
    // Store the start position for refresh
    setLastStartPosition(startPos);
    
    // Load start position first
    loadPosition(startPos);
    
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
            
            // Set end position
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
    // Show refresh button after animation completes
    if (state.lastStartPosition) {
        dom.refreshPositionBtn.style.display = 'inline-flex';
        // Re-initialize icons when button is shown
        if (window.lucide) {
            lucide.createIcons({
                attrs: {
                    width: 16,
                    height: 16
                }
            });
        }
    }
}

export async function resetToStartPosition() {
    if (!state.lastStartPosition) return;
    
    if (state.isAnimating) {
        await alert('Animation already in progress');
        return;
    }
    
    const startPositions = getSavedPositions()[state.lastStartPosition];
    if (!startPositions) return;
    
    // Get current positions of players on court
    const currentPositions = [];
    getPlayerElements().forEach((element, playerId) => {
        const player = getPlayers().find(p => p.id === playerId);
        if (player) {
            currentPositions.push({
                playerId: playerId,
                x: parseInt(element.style.left) || 0,
                y: parseInt(element.style.top) || 0
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
        // No players on court, just load the position
        loadPosition(state.lastStartPosition);
        finishAnimation();
        dom.refreshPositionBtn.style.display = 'none';
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
                dom.refreshPositionBtn.style.display = 'none';
            }
            return;
        }
        
        const playerElement = getPlayerElements().get(currentPos.playerId);
        if (!playerElement) {
            animationsComplete++;
            if (animationsComplete === totalAnimations) {
                finishAnimation();
                dom.refreshPositionBtn.style.display = 'none';
            }
            return;
        }
        
        // Check if position actually changed
        if (currentPos.x === startPos.x && currentPos.y === startPos.y) {
            animationsComplete++;
            if (animationsComplete === totalAnimations) {
                finishAnimation();
                dom.refreshPositionBtn.style.display = 'none';
            }
            return;
        }
        
        playerElement.classList.add('animating');
        
        // Set start position
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
                dom.refreshPositionBtn.style.display = 'none';
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
