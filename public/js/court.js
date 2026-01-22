// Court and drag & drop functionality

import { state, setDraggedPlayer, setDraggedElement, getPlayerElements } from './state.js';
import { dom } from './dom.js';
import { getPlayers } from './state.js';

// Get the actual base court size (600px for phone, 800px for iPad)
function getCourtBaseSize() {
    if (!dom.court) return 600;
    // Check computed style to see if court is 800px (iPad) or 600px (phone)
    const computedStyle = window.getComputedStyle(dom.court);
    const width = parseInt(computedStyle.width);
    // If width is 800px, we're on iPad; otherwise it's 600px
    return width === 800 ? 800 : 600;
}

// Convert from actual court coordinates (600 or 800) back to 600x600 coordinate system
export function convertFromCourtCoordinates(actualX, actualY) {
    const dims = getCourtDimensions();
    // Convert back from actual court size to 600x600 coordinate system
    return {
        x: actualX / dims.sizeScale,
        y: actualY / dims.sizeScale
    };
}

// Convert from 600x600 coordinate system to actual court coordinates (600 or 800)
export function convertToCourtCoordinatesForRendering(x, y) {
    const dims = getCourtDimensions();
    // Scale coordinates from 600x600 system to actual court size
    return {
        x: x * dims.sizeScale,
        y: y * dims.sizeScale
    };
}

// Get court dimensions (always uses 600x600 coordinate system internally)
function getCourtDimensions() {
    const coordinateBaseSize = 600; // Internal coordinate system is always 600x600
    const actualBaseSize = getCourtBaseSize(); // Actual rendered base size (600 or 800)
    const playerSize = 50;
    const netOffset = 4;
    
    // Get scale from data attribute (set by setupCourtScaling)
    const scale = parseFloat(dom.court.dataset.scale || '1');
    
    // Scale factor to convert from coordinate system to actual court size
    const sizeScale = actualBaseSize / coordinateBaseSize;
    
    return {
        baseSize: coordinateBaseSize, // Always 600 for coordinate calculations
        actualBaseSize, // 600 or 800 for rendering
        playerSize,
        netOffset,
        scale,
        sizeScale, // Factor to scale coordinates (1.0 for phone, 1.333... for iPad)
        maxX: coordinateBaseSize - playerSize,
        maxY: coordinateBaseSize - playerSize,
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
    // Coordinates are in 600x600 system, constrain to that
    x = Math.max(0, Math.min(x, dims.maxX));
    y = Math.max(dims.minY, Math.min(y, dims.maxY));
    
    // Scale coordinates from 600x600 system to actual court size (600 or 800)
    const scaledX = x * dims.sizeScale;
    const scaledY = y * dims.sizeScale;
    
    // Create container for player circle and label
    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-container';
    playerContainer.dataset.playerId = player.id;
    playerContainer.style.left = scaledX + 'px';
    playerContainer.style.top = scaledY + 'px';
    
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
        // Move within court bounds (positions are in original 600x600 coordinate system)
        // Center the player on the drop point
        const constrainedX = Math.max(0, Math.min(x - dims.playerSize / 2, dims.maxX));
        const constrainedY = Math.max(dims.minY, Math.min(y - dims.playerSize / 2, dims.maxY));
        
        // Scale coordinates from 600x600 system to actual court size
        const scaledX = constrainedX * dims.sizeScale;
        const scaledY = constrainedY * dims.sizeScale;
        
        state.draggedElement.style.left = scaledX + 'px';
        state.draggedElement.style.top = scaledY + 'px';
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
