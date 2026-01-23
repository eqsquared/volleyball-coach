// Court and drag & drop functionality

import { state, setDraggedPlayer, setDraggedElement, getPlayerElements, checkForModifications } from './state.js';
import { dom } from './dom.js';

// Helper function to check if we're on a phone (matches CSS media query: max-width: 767px and orientation: portrait)
function isPhoneView() {
    return window.innerWidth <= 767 && window.innerHeight > window.innerWidth;
}

// Court coordinate system is 600x600, but positions are stored as percentages
// to scale proportionally when the court size changes

// Get court dimensions (always uses 600x600 coordinate system)
function getCourtDimensions() {
    const baseSize = 600; // Court coordinate system is always 600x600
    const playerSize = 50;
    const netOffset = 4;
    
    return {
        baseSize, // Always 600
        playerSize,
        netOffset,
        maxX: baseSize - playerSize,
        maxY: baseSize - playerSize,
        minY: netOffset
    };
}

// Convert 600x600 coordinate to percentage for CSS positioning
export function coordinateToPercent(value) {
    return (value / 600) * 100;
}

// Convert percentage back to 600x600 coordinate (for reading positions)
export function percentToCoordinate(percentValue) {
    // Handle both percentage strings ("50%") and numeric values
    if (typeof percentValue === 'string') {
        const percent = parseFloat(percentValue.replace('%', ''));
        return (percent / 100) * 600;
    }
    // If it's already a number, assume it's already in coordinate space
    return percentValue;
}

// Convert mouse coordinates from rendered space to 600x600 coordinate space
// The court is now sized via CSS (max-height: 85vh, aspect-ratio: 1), so we use getBoundingClientRect()
// to get the actual rendered size and convert to the 600x600 coordinate system
export function convertToCourtCoordinates(clientX, clientY) {
    const rect = dom.court.getBoundingClientRect();
    const dims = getCourtDimensions();
    
    // Get mouse position relative to rendered court
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // Convert to 600x600 coordinate system
    // getBoundingClientRect() gives us the actual rendered size, so we convert proportionally
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
    // Coordinates are in 600x600 system, converted to percentages for scaling
    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-container';
    playerContainer.dataset.playerId = player.id;
    // Use percentages so positions scale with court size
    playerContainer.style.left = coordinateToPercent(x) + '%';
    playerContainer.style.top = coordinateToPercent(y) + '%';
    
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
    
    // Only enable dragging if NOT on a phone (phones are read-only)
    if (!isPhoneView()) {
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
        
        // Add touch drag support for mobile (tablets/iPads) - attach to both circle and container
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
    } else {
        // On phones, disable dragging - read-only mode
        playerElement.draggable = false;
    }
    
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
    // Skip on phones - read-only mode
    if (isPhoneView()) return;
    
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
    // Skip on phones - read-only mode
    if (isPhoneView()) return;
    
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
        
        // Use percentages so positions scale with court size
        state.draggedElement.style.left = coordinateToPercent(constrainedX) + '%';
        state.draggedElement.style.top = coordinateToPercent(constrainedY) + '%';
    }
    
    state.draggedElement.classList.remove('removing');
    setDraggedElement(null);
    
    // Check for modifications after player is moved (for both mouse and touch drag)
    // Use setTimeout to ensure DOM has updated
    setTimeout(async () => {
        if (state.currentLoadedItem && state.currentLoadedItem.type === 'position') {
            await checkForModifications();
            // Import updateModifiedIndicator dynamically to avoid circular dependency
            const { updateModifiedIndicator } = await import('./ui.js');
            updateModifiedIndicator(state.isModified);
        }
    }, 50);
}

// Initialize court event listeners
export function initCourtListeners() {
    // Court drag and drop
    dom.court.addEventListener('dragover', (e) => {
        // Skip on phones - read-only mode
        if (isPhoneView()) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    dom.court.addEventListener('drop', (e) => {
        // Skip on phones - read-only mode
        if (isPhoneView()) return;
        
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
        // Skip on phones - read-only mode
        if (isPhoneView()) return;
        
        if (state.draggedElement && !dom.court.contains(e.target)) {
            e.preventDefault();
            if (!state.draggedElement.classList.contains('removing')) {
                state.draggedElement.classList.add('removing');
            }
        }
    });

    document.addEventListener('drop', (e) => {
        // Skip on phones - read-only mode
        if (isPhoneView()) return;
        
        if (state.draggedElement && !dom.court.contains(e.target)) {
            e.preventDefault();
            
            const playerId = state.draggedElement.dataset.playerId;
            removePlayerFromCourt(playerId);
            
            state.draggedElement.classList.remove('removing');
            setDraggedElement(null);
        }
    });
}
