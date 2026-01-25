// Court and drag & drop functionality

import { state, setDraggedPlayer, setDraggedElement, getPlayerElements, checkForModifications, getCourtRotation, setCourtRotation, getSavedCourtRotation } from './state.js';
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

// Convert displayed coordinates (which may be rotated) back to base (0°) coordinates
// This is used when reading positions from the DOM to compare with saved positions
// displayedX/Y represent the top-left corner of the player container
// We need to convert to the center of the player circle
export function convertDisplayedToBaseCoordinates(displayedX, displayedY) {
    const rotation = getCourtRotation();
    const dims = getCourtDimensions();
    const halfPlayerSize = dims.playerSize / 2;
    
    // Add half player size to get center coordinates
    const centerX = displayedX + halfPlayerSize;
    const centerY = displayedY + halfPlayerSize;
    
    // Reverse transform to get base coordinates
    return reverseTransformCoordinates(centerX, centerY, rotation);
}

// Transform coordinates based on rotation
// This transforms from the base coordinate system (0°) to the rotated coordinate system
export function transformCoordinatesForRotation(x, y, rotation) {
    const baseSize = 600;
    
    switch (rotation) {
        case 0:
            return { x, y };
        case 90:
            // Rotate 90° clockwise: (x, y) -> (600 - y, x)
            return { x: baseSize - y, y: x };
        case 180:
            // Rotate 180°: (x, y) -> (600 - x, 600 - y)
            return { x: baseSize - x, y: baseSize - y };
        case 270:
            // Rotate 270° clockwise (90° counter-clockwise): (x, y) -> (y, 600 - x)
            return { x: y, y: baseSize - x };
        default:
            return { x, y };
    }
}

// Reverse transform - converts from rotated coordinate system back to base (0°)
function reverseTransformCoordinates(x, y, rotation) {
    const baseSize = 600;
    
    switch (rotation) {
        case 0:
            return { x, y };
        case 90:
            // Reverse of 90°: (x, y) -> (y, 600 - x)
            return { x: y, y: baseSize - x };
        case 180:
            // Reverse of 180°: (x, y) -> (600 - x, 600 - y)
            return { x: baseSize - x, y: baseSize - y };
        case 270:
            // Reverse of 270°: (x, y) -> (600 - y, x)
            return { x: baseSize - y, y: x };
        default:
            return { x, y };
    }
}

// Convert mouse coordinates from rendered space to 600x600 coordinate space
// The court is now sized via CSS (max-height: 85vh, aspect-ratio: 1), so we use getBoundingClientRect()
// to get the actual rendered size and convert to the 600x600 coordinate system
// This function returns coordinates in the base (0°) coordinate system
export function convertToCourtCoordinates(clientX, clientY) {
    const rect = dom.court.getBoundingClientRect();
    const dims = getCourtDimensions();
    const rotation = getCourtRotation();
    
    // Get mouse position relative to rendered court
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    // Convert to 600x600 coordinate system (in the rotated view)
    const rotatedX = (relativeX / rect.width) * dims.baseSize;
    const rotatedY = (relativeY / rect.height) * dims.baseSize;
    
    // Reverse transform to get base coordinates
    return reverseTransformCoordinates(rotatedX, rotatedY, rotation);
}

// Place player on court
// x and y are in the base (0°) coordinate system and represent the CENTER of the player circle
export function placePlayerOnCourt(player, x, y) {
    // Remove existing player element if present
    const existingElement = getPlayerElements().get(player.id);
    if (existingElement) {
        existingElement.remove();
    }
    
    const dims = getCourtDimensions();
    const rotation = getCourtRotation();
    
    // Ensure court's visual rotation matches state (important when loading positions)
    if (dom.court) {
        const currentDataRotation = dom.court.getAttribute('data-rotation');
        if (currentDataRotation !== rotation.toString()) {
            dom.court.setAttribute('data-rotation', rotation.toString());
        }
    }
    
    // Constrain position to court bounds (accounting for player size)
    // x and y represent center, so we need to ensure the circle stays within bounds
    const halfPlayerSize = dims.playerSize / 2;
    x = Math.max(halfPlayerSize, Math.min(x, dims.baseSize - halfPlayerSize));
    y = Math.max(dims.minY + halfPlayerSize, Math.min(y, dims.baseSize - halfPlayerSize));
    
    // Transform coordinates for current rotation
    const transformed = transformCoordinatesForRotation(x, y, rotation);
    
    // Create container for player circle and label
    // Coordinates are in 600x600 system, converted to percentages for scaling
    // CSS left/top positions the top-left corner, so we offset by half the player size
    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-container';
    playerContainer.dataset.playerId = player.id;
    // Use percentages so positions scale with court size
    // Offset by half player size to center the circle
    const offsetX = transformed.x - halfPlayerSize;
    const offsetY = transformed.y - halfPlayerSize;
    playerContainer.style.left = coordinateToPercent(offsetX) + '%';
    playerContainer.style.top = coordinateToPercent(offsetY) + '%';
    
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
        const halfPlayerSize = dims.playerSize / 2;
        
        // Check if within court bounds (x and y represent center of player circle)
        const isWithinBounds = x >= halfPlayerSize && x <= dims.baseSize - halfPlayerSize && 
                               y >= dims.minY + halfPlayerSize && y <= dims.baseSize - halfPlayerSize;
        
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
    const halfPlayerSize = dims.playerSize / 2;
    
    // Check if drop is outside court bounds (x and y represent center of player circle)
    const isOutsideBounds = x < halfPlayerSize || x > dims.baseSize - halfPlayerSize || 
                           y < dims.minY + halfPlayerSize || y > dims.baseSize - halfPlayerSize;
    
    if (isOutsideBounds) {
        // Remove player from court
        const playerId = state.draggedElement.dataset.playerId;
        removePlayerFromCourt(playerId);
    } else {
        // Move within court bounds - coordinates are in base (0°) coordinate system
        // x and y represent the center of the player circle
        const halfPlayerSize = dims.playerSize / 2;
        const constrainedX = Math.max(halfPlayerSize, Math.min(x, dims.baseSize - halfPlayerSize));
        const constrainedY = Math.max(dims.minY + halfPlayerSize, Math.min(y, dims.baseSize - halfPlayerSize));
        
        // Transform coordinates for current rotation
        const rotation = getCourtRotation();
        const transformed = transformCoordinatesForRotation(constrainedX, constrainedY, rotation);
        
        // CSS left/top positions the top-left corner, so offset by half player size
        const offsetX = transformed.x - halfPlayerSize;
        const offsetY = transformed.y - halfPlayerSize;
        
        // Use percentages so positions scale with court size
        state.draggedElement.style.left = coordinateToPercent(offsetX) + '%';
        state.draggedElement.style.top = coordinateToPercent(offsetY) + '%';
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

// Ensure court's visual rotation matches the state rotation
// This is important when loading positions to ensure they're placed correctly
export function syncCourtRotation() {
    if (dom.court) {
        const currentRotation = getCourtRotation();
        const currentDataRotation = dom.court.getAttribute('data-rotation');
        if (currentDataRotation !== currentRotation.toString()) {
            dom.court.setAttribute('data-rotation', currentRotation.toString());
        }
    }
}

// Rotate the court 90 degrees
export function rotateCourt() {
    const currentRotation = getCourtRotation();
    const newRotation = (currentRotation + 90) % 360;
    
    // Fade out the court (transition is already set in CSS)
    dom.court.style.opacity = '0';
    
    // After fade out, update rotation and transform positions
    setTimeout(() => {
        // Update rotation state
        setCourtRotation(newRotation);
        
        // Update court data attribute for CSS
        dom.court.setAttribute('data-rotation', newRotation.toString());
        
        // Transform all player positions
        const dims = getCourtDimensions();
        const halfPlayerSize = dims.playerSize / 2;
        
        getPlayerElements().forEach((element, playerId) => {
            // Get current displayed position (top-left corner in rotated coordinates)
            const currentX = percentToCoordinate(element.style.left);
            const currentY = percentToCoordinate(element.style.top);
            
            // Add half player size to get center coordinates
            const centerX = currentX + halfPlayerSize;
            const centerY = currentY + halfPlayerSize;
            
            // Reverse transform to get base coordinates (center)
            const baseCoords = reverseTransformCoordinates(centerX, centerY, currentRotation);
            
            // Transform to new rotation (center)
            const newCenterCoords = transformCoordinatesForRotation(baseCoords.x, baseCoords.y, newRotation);
            
            // Convert back to top-left corner for CSS positioning
            const newX = newCenterCoords.x - halfPlayerSize;
            const newY = newCenterCoords.y - halfPlayerSize;
            
            // Update position
            element.style.left = coordinateToPercent(newX) + '%';
            element.style.top = coordinateToPercent(newY) + '%';
        });
        
        // Fade back in
        requestAnimationFrame(() => {
            dom.court.style.opacity = '1';
        });
    }, 200);
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
        
        // Constrain to court bounds - x and y represent the center of the player circle
        // x and y are already in base (0°) coordinate system from convertToCourtCoordinates
        const halfPlayerSize = dims.playerSize / 2;
        const constrainedX = Math.max(halfPlayerSize, Math.min(x, dims.baseSize - halfPlayerSize));
        const constrainedY = Math.max(dims.minY + halfPlayerSize, Math.min(y, dims.baseSize - halfPlayerSize));
        
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
    
    // Rotation button
    const rotateBtn = document.getElementById('court-rotate-btn');
    if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
            rotateCourt();
        });
    }
    
    // Initialize court rotation attribute (state is already initialized from localStorage)
    dom.court.setAttribute('data-rotation', getCourtRotation().toString());
}
