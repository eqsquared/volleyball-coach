// Court and drag & drop functionality

import { state, setDraggedPlayer, setDraggedElement, getPlayerElements } from './state.js';
import { dom } from './dom.js';
import { getPlayers } from './state.js';

// Court is always 600x600 base size - CSS transform handles scaling
// No coordinate conversion needed since base size matches coordinate system

// Get court dimensions (always uses 600x600 coordinate system)
function getCourtDimensions() {
    const baseSize = 600; // Court is always 600x600 base size
    const playerSize = 50;
    const netOffset = 4;
    
    // Get scale from data attribute (set by setupCourtScaling)
    const scale = parseFloat(dom.court.dataset.scale || '1');
    
    return {
        baseSize, // Always 600
        playerSize,
        netOffset,
        scale, // CSS transform scale
        maxX: baseSize - playerSize,
        maxY: baseSize - playerSize,
        minY: netOffset
    };
}

// Convert mouse coordinates from rendered space to 600x600 coordinate space
// The court is visually scaled via CSS transform, so we need to account for that
function convertToCourtCoordinates(clientX, clientY) {
    const rect = dom.court.getBoundingClientRect();
    const dims = getCourtDimensions();
    
    // Get mouse position relative to rendered court (which may be scaled)
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // Convert to 600x600 coordinate system
    // Since the court is scaled via transform, the rect dimensions are the scaled size
    // We need to convert back to the original 600x600 coordinate system
    const courtX = (relativeX / rect.width) * dims.baseSize;
    const courtY = (relativeY / rect.height) * dims.baseSize;
    
    return { x: courtX, y: courtY };
}

// Place player on court
export function placePlayerOnCourt(player, x, y) {
    // Remove existing player element if present
    const existingElement = getPlayerElements().get(player.id);
    if (existingElement) {
        existingElement.remove();
    }
    
    const dims = getCourtDimensions();
    
    // Constrain position to court bounds (accounting for player size)
    x = Math.max(0, Math.min(x, dims.maxX));
    y = Math.max(dims.minY, Math.min(y, dims.maxY));
    
    // Create container for player circle and label
    // Coordinates are in 600x600 system, which matches the base court size
    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-container';
    playerContainer.dataset.playerId = player.id;
    playerContainer.style.left = x + 'px';
    playerContainer.style.top = y + 'px';
    
    // Create player circle
    const playerElement = document.createElement('div');
    playerElement.className = 'player-on-court';
    playerElement.textContent = player.jersey;
    
    // Create player label with just the name (jersey is already in the circle)
    const playerLabel = document.createElement('div');
    playerLabel.className = 'player-label';
    playerLabel.textContent = player.name;
    
    // Add circle and label to container
    playerContainer.appendChild(playerElement);
    playerContainer.appendChild(playerLabel);
    
    // Make draggable on court (drag from the circle)
    playerElement.draggable = true;
    playerElement.addEventListener('dragstart', (e) => {
        setDraggedElement(playerContainer);
        playerContainer.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    
    playerElement.addEventListener('dragend', () => {
        playerContainer.classList.remove('dragging');
        setDraggedElement(null);
    });
    
    // Add touch drag support for mobile - attach to both circle and container
    // This ensures touch works even if user touches the label
    setTimeout(() => {
        import('./touchDrag.js').then(({ initTouchDrag }) => {
            // Initialize on the player circle (main drag handle)
            initTouchDrag(playerElement, {
                dragType: 'element',
                dragData: playerContainer,
                onDragStart: () => {
                    setDraggedElement(playerContainer);
                    playerContainer.classList.add('dragging');
                },
                onDragEnd: () => {
                    playerContainer.classList.remove('dragging');
                    // State will be cleared by touchDrag handler
                }
            });
            
            // Also initialize on the container in case touch hits the label
            initTouchDrag(playerContainer, {
                dragType: 'element',
                dragData: playerContainer,
                onDragStart: () => {
                    setDraggedElement(playerContainer);
                    playerContainer.classList.add('dragging');
                },
                onDragEnd: () => {
                    playerContainer.classList.remove('dragging');
                    // State will be cleared by touchDrag handler
                }
            });
        });
    }, 0);
    
    getPlayerElements().set(player.id, playerContainer);
    dom.court.appendChild(playerContainer);
}

// Remove player from court (but keep in lineup)
export function removePlayerFromCourt(playerId) {
    const playerElement = getPlayerElements().get(playerId);
    if (playerElement) {
        playerElement.remove();
        getPlayerElements().delete(playerId);
    }
}

// Handle dragging within court
export function handleCourtDragOver(e) {
    if (state.draggedElement) {
        e.preventDefault();
        
        const { x, y } = convertToCourtCoordinates(e.clientX, e.clientY);
        const dims = getCourtDimensions();
        
        // Check if within court bounds (in original 600x600 coordinate system)
        const isWithinBounds = x >= 0 && x <= dims.baseSize && y >= dims.minY && y <= dims.baseSize;
        
        if (isWithinBounds) {
            e.dataTransfer.dropEffect = 'move';
            state.draggedElement.classList.remove('removing');
        } else {
            // Outside court - show remove indicator
            e.dataTransfer.dropEffect = 'none';
            state.draggedElement.classList.add('removing');
        }
    }
}

export function handleCourtDrop(e) {
    if (!state.draggedElement) return;
    
    e.preventDefault();
    
    const { x, y } = convertToCourtCoordinates(e.clientX, e.clientY);
    const dims = getCourtDimensions();
    
    // Check if drop is outside court bounds (in original 600x600 coordinate system)
    const isOutsideBounds = x < 0 || x > dims.baseSize || y < dims.minY || y > dims.baseSize;
    
    if (isOutsideBounds) {
        // Remove player from court
        const playerId = state.draggedElement.dataset.playerId;
        removePlayerFromCourt(playerId);
    } else {
        // Move within court bounds - coordinates are in 600x600 system
        // Center the player on the drop point
        const constrainedX = Math.max(0, Math.min(x - dims.playerSize / 2, dims.maxX));
        const constrainedY = Math.max(dims.minY, Math.min(y - dims.playerSize / 2, dims.maxY));
        
        state.draggedElement.style.left = constrainedX + 'px';
        state.draggedElement.style.top = constrainedY + 'px';
    }
    
    state.draggedElement.classList.remove('removing');
    setDraggedElement(null);
}

// Initialize court event listeners
export function initCourtListeners() {
    // Court drag and drop
    dom.court.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    dom.court.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (!state.draggedPlayer) return;
        
        const { x, y } = convertToCourtCoordinates(e.clientX, e.clientY);
        const dims = getCourtDimensions();
        
        // Constrain to court bounds and center player on drop point
        const constrainedX = Math.max(0, Math.min(x - dims.playerSize / 2, dims.maxX));
        const constrainedY = Math.max(dims.minY, Math.min(y - dims.playerSize / 2, dims.maxY));
        
        placePlayerOnCourt(state.draggedPlayer, constrainedX, constrainedY);
        setDraggedPlayer(null);
    });
    
    // Allow dragging within court
    dom.court.addEventListener('dragover', handleCourtDragOver);
    dom.court.addEventListener('drop', handleCourtDrop);
    
    // Handle drops outside the court (on document)
    document.addEventListener('dragover', (e) => {
        if (state.draggedElement && !dom.court.contains(e.target)) {
            e.preventDefault();
            if (!state.draggedElement.classList.contains('removing')) {
                state.draggedElement.classList.add('removing');
            }
        }
    });

    document.addEventListener('drop', (e) => {
        if (state.draggedElement && !dom.court.contains(e.target)) {
            e.preventDefault();
            
            const playerId = state.draggedElement.dataset.playerId;
            removePlayerFromCourt(playerId);
            
            state.draggedElement.classList.remove('removing');
            setDraggedElement(null);
        }
    });
}
