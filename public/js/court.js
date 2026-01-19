// Court and drag & drop functionality

import { state, setDraggedPlayer, setDraggedElement, getPlayerElements } from './state.js';
import { dom } from './dom.js';
import { getPlayers } from './state.js';

// Place player on court
export function placePlayerOnCourt(player, x, y) {
    // Remove existing player element if present
    const existingElement = getPlayerElements().get(player.id);
    if (existingElement) {
        existingElement.remove();
    }
    
    // Constrain position to court bounds (accounting for player size)
    x = Math.max(0, Math.min(x, 550)); // 600px - 50px (player width)
    y = Math.max(4, Math.min(y, 550)); // Below net (4px) to above bottom (550px accounting for 50px player height)
    
    // Create container for player circle and label
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
        
        const rect = dom.court.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if within court bounds
        const isWithinBounds = x >= 0 && x <= 600 && y >= 4 && y <= 600;
        
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
    
    const rect = dom.court.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if drop is outside court bounds
    const isOutsideBounds = x < 0 || x > 600 || y < 4 || y > 600;
    
    if (isOutsideBounds) {
        // Remove player from court
        const playerId = state.draggedElement.dataset.playerId;
        removePlayerFromCourt(playerId);
    } else {
        // Move within court bounds
        const constrainedY = Math.max(4, Math.min(y - 25, 550)); // Below net (4px) to above bottom (550px)
        const constrainedX = Math.max(0, Math.min(x - 25, 550));
        
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
        
        const rect = dom.court.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Constrain to court bounds
        const constrainedY = Math.max(4, Math.min(y, 550));
        
        placePlayerOnCourt(state.draggedPlayer, x - 25, constrainedY - 25);
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
