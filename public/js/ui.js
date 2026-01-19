// UI rendering and updates

import { state, getPlayers, getSavedPositions, getPlayerElements, getPositions, getRotations, getScenarios, getSequences, getCurrentLoadedItem, setDraggedPlayer } from './state.js';
import { dom } from './dom.js';
import { deletePlayer } from './players.js';
import { loadPosition, deletePosition as deletePositionNew } from './positions.js';
import { loadRotation, deleteRotation } from './rotations.js';
import { loadScenario, playScenario, deleteScenario } from './scenarios.js';
import { loadSequence, playNextScenario, deleteSequence } from './sequences.js';

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

// Update saved positions list (legacy support)
export function updateSavedPositionsList() {
    if (!dom.savedPositionsList) return; // Element doesn't exist in new structure
    
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
        
        // Legacy position support - load works, save/delete are disabled for legacy format
        if (saveOverBtn) {
            saveOverBtn.style.display = 'none'; // Hide save button for legacy positions
        }
        if (loadBtn) {
            loadBtn.addEventListener('click', () => loadPosition(posName));
        }
        if (deleteBtn) {
            deleteBtn.style.display = 'none'; // Hide delete button for legacy positions
        }
        
        // Initialize Lucide icons for these buttons
        if (window.lucide) {
            lucide.createIcons();
        }
        
        dom.savedPositionsList.appendChild(item);
    });
}

// Render rotations list
export function renderRotationsList() {
    if (!dom.rotationsList) return;
    
    dom.rotationsList.innerHTML = '';
    
    getRotations().forEach(rotation => {
        const item = document.createElement('div');
        item.className = 'item-card';
        if (getCurrentLoadedItem()?.type === 'rotation' && getCurrentLoadedItem()?.id === rotation.id) {
            item.classList.add('active');
        }
        
        const positionCount = rotation.positionIds?.length || 0;
        item.innerHTML = `
            <span class="item-card-name">${rotation.name} (${positionCount} positions)</span>
            <div class="item-card-actions">
                <button class="btn-load" title="Load rotation"><i data-lucide="folder-open"></i></button>
                <button class="btn-delete" title="Delete rotation"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        const loadBtn = item.querySelector('.btn-load');
        const deleteBtn = item.querySelector('.btn-delete');
        
        loadBtn.addEventListener('click', () => loadRotation(rotation.id));
        deleteBtn.addEventListener('click', () => deleteRotation(rotation.id));
        
        if (window.lucide) {
            lucide.createIcons();
        }
        
        dom.rotationsList.appendChild(item);
    });
}

// Render positions list
export function renderPositionsList() {
    if (!dom.positionsList) return;
    
    dom.positionsList.innerHTML = '';
    
    const positions = getPositions();
    const savedPositions = getSavedPositions();
    
    // If no new format positions but legacy positions exist, show legacy positions
    if (positions.length === 0 && savedPositions && Object.keys(savedPositions).length > 0) {
        // Render legacy positions
        Object.keys(savedPositions).forEach(positionName => {
            const item = document.createElement('div');
            item.className = 'item-card';
            item.style.opacity = '0.7'; // Indicate legacy format
            
            const count = savedPositions[positionName].length || 0;
            item.innerHTML = `
                <div style="flex: 1;">
                    <div class="item-card-name">${positionName} <span style="font-size: 10px; color: #6c757d;">(Legacy)</span></div>
                    <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">
                        ${count} players • Will be migrated on next save
                    </div>
                </div>
                <div class="item-card-actions">
                    <button class="btn-load" title="Load position"><i data-lucide="folder-open"></i></button>
                </div>
            `;
            
            const loadBtn = item.querySelector('.btn-load');
            if (loadBtn) {
                loadBtn.addEventListener('click', () => loadPosition(positionName));
            }
            
            if (window.lucide) {
                lucide.createIcons();
            }
            
            dom.positionsList.appendChild(item);
        });
        return;
    }
    
    // Render new format positions
    positions.forEach(position => {
        const item = document.createElement('div');
        item.className = 'item-card';
        if (getCurrentLoadedItem()?.type === 'position' && getCurrentLoadedItem()?.id === position.id) {
            item.classList.add('active');
        }
        
        const playerCount = position.playerPositions?.length || 0;
        const rotationNames = position.rotationIds?.map(rotId => {
            const rot = getRotations().find(r => r.id === rotId);
            return rot ? rot.name : '';
        }).filter(Boolean).join(', ') || 'None';
        
        item.innerHTML = `
            <div style="flex: 1;">
                <div class="item-card-name">${position.name}</div>
                <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">
                    ${playerCount} players • ${rotationNames}
                </div>
            </div>
            <div class="item-card-actions">
                <button class="btn-load" title="Load position"><i data-lucide="folder-open"></i></button>
                <button class="btn-delete" title="Delete position"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        const loadBtn = item.querySelector('.btn-load');
        const deleteBtn = item.querySelector('.btn-delete');
        
        loadBtn.addEventListener('click', () => loadPosition(position.id));
        deleteBtn.addEventListener('click', () => deletePositionNew(position.id));
        
        if (window.lucide) {
            lucide.createIcons();
        }
        
        dom.positionsList.appendChild(item);
    });
}

// Render scenarios list
export function renderScenariosList() {
    if (!dom.scenariosList) return;
    
    dom.scenariosList.innerHTML = '';
    
    getScenarios().forEach(scenario => {
        const item = document.createElement('div');
        item.className = 'item-card';
        if (getCurrentLoadedItem()?.type === 'scenario' && getCurrentLoadedItem()?.id === scenario.id) {
            item.classList.add('active');
        }
        
        const startPos = getPositions().find(p => p.id === scenario.startPositionId);
        const endPos = getPositions().find(p => p.id === scenario.endPositionId);
        
        item.innerHTML = `
            <div style="flex: 1;">
                <div class="item-card-name">${scenario.name}</div>
                <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">
                    ${startPos?.name || 'Unknown'} → ${endPos?.name || 'Unknown'}
                </div>
            </div>
            <div class="item-card-actions">
                <button class="btn-load" title="Load scenario"><i data-lucide="folder-open"></i></button>
                <button class="btn-load" title="Play scenario" style="background: #9b59b6;"><i data-lucide="play"></i></button>
                <button class="btn-delete" title="Delete scenario"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        const loadBtn = item.querySelectorAll('.btn-load')[0];
        const playBtn = item.querySelectorAll('.btn-load')[1];
        const deleteBtn = item.querySelector('.btn-delete');
        
        loadBtn.addEventListener('click', () => loadScenario(scenario.id));
        playBtn.addEventListener('click', () => playScenario(scenario.id));
        deleteBtn.addEventListener('click', () => deleteScenario(scenario.id));
        
        if (window.lucide) {
            lucide.createIcons();
        }
        
        dom.scenariosList.appendChild(item);
    });
}

// Render sequences list
export function renderSequencesList() {
    if (!dom.sequencesList) return;
    
    dom.sequencesList.innerHTML = '';
    
    getSequences().forEach(sequence => {
        const item = document.createElement('div');
        item.className = 'item-card';
        
        const scenarioCount = sequence.scenarioIds?.length || 0;
        
        item.innerHTML = `
            <div style="flex: 1;">
                <div class="item-card-name">${sequence.name}</div>
                <div style="font-size: 11px; color: #6c757d; margin-top: 2px;">
                    ${scenarioCount} scenarios
                </div>
            </div>
            <div class="item-card-actions">
                <button class="btn-load" title="Load sequence"><i data-lucide="folder-open"></i></button>
                <button class="btn-load" title="Play sequence" style="background: #9b59b6;"><i data-lucide="play"></i></button>
                <button class="btn-delete" title="Delete sequence"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        const loadBtn = item.querySelectorAll('.btn-load')[0];
        const playBtn = item.querySelectorAll('.btn-load')[1];
        const deleteBtn = item.querySelector('.btn-delete');
        
        loadBtn.addEventListener('click', () => loadSequence(sequence.id));
        playBtn.addEventListener('click', () => loadSequence(sequence.id));
        deleteBtn.addEventListener('click', () => deleteSequence(sequence.id));
        
        if (window.lucide) {
            lucide.createIcons();
        }
        
        dom.sequencesList.appendChild(item);
    });
}

// Update current item display
export function updateCurrentItemDisplay() {
    const item = getCurrentLoadedItem();
    if (dom.currentItemValue) {
        if (item) {
            dom.currentItemValue.textContent = `${item.type}: ${item.name}`;
        } else {
            dom.currentItemValue.textContent = 'None';
        }
    }
}

// Update modified indicator
export function updateModifiedIndicator(isModified) {
    if (dom.modifiedIndicator) {
        dom.modifiedIndicator.style.display = isModified ? 'flex' : 'none';
    }
}
