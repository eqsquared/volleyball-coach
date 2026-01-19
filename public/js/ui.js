// UI rendering and updates

import { state, getPlayers, getSavedPositions, getPlayerElements, setDraggedPlayer } from './state.js';
import { dom } from './dom.js';
import { deletePlayer } from './players.js';
import { loadPosition, saveOverPosition, deletePosition } from './positions.js';

// Render lineup
export function renderLineup() {
    dom.lineupList.innerHTML = '';
    
    getPlayers().forEach(player => {
        const item = document.createElement('div');
        item.className = 'player-lineup-item';
        item.draggable = true;
        item.dataset.playerId = player.id;
        
        item.innerHTML = `
            <div class="player-jersey">${player.jersey}</div>
            <div class="player-name">${player.name}</div>
            <button class="delete-player-btn">×</button>
        `;
        
        // Add delete button event listener
        const deleteBtn = item.querySelector('.delete-player-btn');
        deleteBtn.addEventListener('click', () => deletePlayer(player.id));
        
        // Drag start
        item.addEventListener('dragstart', (e) => {
            setDraggedPlayer(player);
            e.dataTransfer.effectAllowed = 'copy';
        });
        
        dom.lineupList.appendChild(item);
    });
}

// Update saved positions list
export function updateSavedPositionsList() {
    dom.savedPositionsList.innerHTML = '';
    
    Object.keys(getSavedPositions()).forEach(posName => {
        const item = document.createElement('div');
        item.className = 'saved-position-item';
        
        const count = getSavedPositions()[posName].length;
        item.innerHTML = `
            <span>${posName} (${count} players)</span>
            <div class="saved-position-actions">
                <button class="save-overwrite-btn" title="Save over this position"><i data-lucide="save"></i></button>
                <button class="load-position-btn" title="Load position"><i data-lucide="folder-open"></i></button>
                <button class="delete-position-btn" title="Delete position"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        // Add event listeners for buttons
        const saveOverBtn = item.querySelector('.save-overwrite-btn');
        const loadBtn = item.querySelector('.load-position-btn');
        const deleteBtn = item.querySelector('.delete-position-btn');
        
        saveOverBtn.addEventListener('click', () => saveOverPosition(posName));
        loadBtn.addEventListener('click', () => loadPosition(posName));
        deleteBtn.addEventListener('click', () => deletePosition(posName));
        
        // Initialize Lucide icons for these buttons
        if (window.lucide) {
            lucide.createIcons();
        }
        
        dom.savedPositionsList.appendChild(item);
    });
}

// Update position selects
export function updatePositionSelects() {
    const options = Object.keys(getSavedPositions());
    
    [dom.startPositionSelect, dom.endPositionSelect].forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select...</option>';
        
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
        
        if (options.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}
