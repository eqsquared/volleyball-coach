// UI rendering and updates

import { state, getPlayers, getSavedPositions, getPlayerElements, getPositions, getScenarios, getSequences, getCurrentLoadedItem, setDraggedPlayer, setDraggedPosition, setDraggedScenario, setSelectedStartPosition, setSelectedEndPosition, getSelectedStartPosition, getSelectedEndPosition, setCurrentLoadedItem, setIsModified } from './state.js';

// Tag filter state
let selectedTags = new Set();
// Tag color assignment - tracks which color each tag gets
let tagColorMap = new Map();
// Color palette for tags (cycling through these colors)
const TAG_COLORS = [
    { bg: '#e3f2fd', text: '#1976d2', border: '#bbdefb' }, // Blue
    { bg: '#f3e5f5', text: '#7b1fa2', border: '#e1bee7' }, // Purple
    { bg: '#e8f5e9', text: '#388e3c', border: '#c8e6c9' }, // Green
    { bg: '#fff3e0', text: '#f57c00', border: '#ffe0b2' }, // Orange
    { bg: '#fce4ec', text: '#c2185b', border: '#f8bbd0' }, // Pink
    { bg: '#e0f2f1', text: '#00796b', border: '#b2dfdb' }, // Teal
    { bg: '#fff9c4', text: '#f9a825', border: '#fff59d' }, // Yellow
    { bg: '#e1f5fe', text: '#0277bd', border: '#b3e5fc' }, // Light Blue
];

// Get or assign a color for a tag based on selection order
function getTagColor(tag) {
    if (!tagColorMap.has(tag)) {
        // Assign next color in cycle
        const colorIndex = tagColorMap.size % TAG_COLORS.length;
        tagColorMap.set(tag, TAG_COLORS[colorIndex]);
    }
    return tagColorMap.get(tag);
}

import { dom } from './dom.js';
import { deletePlayer } from './players.js';
import { loadPosition, deletePosition as deletePositionNew, editPosition } from './positions.js';
import { loadScenario, playScenario, deleteScenario, editScenario } from './scenarios.js';
import { loadSequence, deleteSequence } from './sequences.js';
import { createSearchAndTagsFilter } from './searchAndTags.js';

// Helper function to initialize Lucide icons for a container
// This ensures icons are always initialized after DOM updates
function initializeIcons(container) {
    if (!window.lucide || !container) return;
    
    // Use double requestAnimationFrame to ensure DOM is fully updated and rendered
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            try {
                if (container instanceof Element) {
                    // Use root option to target the specific container
                    // This ensures we only initialize icons within this container
                    lucide.createIcons({
                        root: container
                    });
                }
            } catch (error) {
                console.warn('Error initializing icons:', error);
                // Fallback: try without root (scans entire document)
                try {
                    lucide.createIcons();
                } catch (e) {
                    console.warn('Fallback icon initialization failed:', e);
                }
            }
        });
    });
}

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
            <div class="player-actions">
                <button class="edit-player-btn" title="Edit player"><i data-lucide="edit"></i></button>
                <button class="delete-player-btn" title="Delete player">×</button>
            </div>
        `;
        
        // Add edit button event listener
        const editBtn = item.querySelector('.edit-player-btn');
        editBtn.addEventListener('click', async () => {
            const { editPlayer } = await import('./players.js');
            await editPlayer(player.id);
        });
        
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
    
    // Initialize all icons in the lineup after all items are added
    initializeIcons(dom.lineupList);
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
            lucide.createIcons({
                attrs: {
                    width: 14,
                    height: 14
                }
            });
        }
        
        dom.savedPositionsList.appendChild(item);
    });
}

// Create filter instances
let positionFilter = null;
let scenarioFilter = null;

// Initialize filters
export function initFilters() {
    // Position filter
    positionFilter = createSearchAndTagsFilter({
        searchInputId: 'position-search-input',
        tagFilterBtnId: 'tag-filter-btn',
        selectedTagsContainerId: 'selected-tags-container',
        getAllItems: () => getPositions(),
        getItemTags: (position) => position.tags || [],
        getItemName: (position) => position.name,
        onFilterChange: () => renderPositionsList()
    });
    positionFilter.init();
    
    // Scenario filter
    scenarioFilter = createSearchAndTagsFilter({
        searchInputId: 'scenario-search-input',
        tagFilterBtnId: 'scenario-tag-filter-btn',
        selectedTagsContainerId: 'selected-scenario-tags-container',
        getAllItems: () => getScenarios(),
        getItemTags: (scenario) => scenario.tags || [],
        getItemName: (scenario) => scenario.name,
        onFilterChange: () => renderScenariosList()
    });
    scenarioFilter.init();
}

// Legacy function for backward compatibility
export function showTagFilterDropdown() {
    if (positionFilter) {
        positionFilter.showTagFilterDropdown();
    }
}

// Render selected tags (legacy - now handled by filter)
function renderSelectedTags() {
    if (positionFilter) {
        positionFilter.renderSelectedTags();
    }
}

// Helper to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render positions list
export function renderPositionsList() {
    if (!dom.positionsList) return;
    
    // Update selected tags display
    renderSelectedTags();
    
    dom.positionsList.innerHTML = '';
    
    const allPositions = getPositions();
    const savedPositions = getSavedPositions();
    
    // If no new format positions but legacy positions exist, show legacy positions
    if (allPositions.length === 0 && savedPositions && Object.keys(savedPositions).length > 0) {
        // Render legacy positions
        Object.keys(savedPositions).forEach(positionName => {
            const item = document.createElement('div');
            item.className = 'item-card';
            item.style.opacity = '0.7'; // Indicate legacy format
            
            const count = savedPositions[positionName].length || 0;
            item.innerHTML = `
                <div class="item-card-name">${positionName} <span class="legacy-indicator">(Legacy)</span></div>
                <div class="item-card-actions">
                    <button class="btn-load" title="Load position"><i data-lucide="folder-open"></i></button>
                </div>
            `;
            
            const loadBtn = item.querySelector('.btn-load');
            if (loadBtn) {
                loadBtn.addEventListener('click', () => loadPosition(positionName));
            }
            
            dom.positionsList.appendChild(item);
        });
        
        // Initialize all icons in the positions list after all legacy items are added
        initializeIcons(dom.positionsList);
        return;
    }
    
    // Filter positions
    const filteredPositions = positionFilter ? positionFilter.filterItems(allPositions) : allPositions;
    
    // Render new format positions
    filteredPositions.forEach(position => {
        const item = document.createElement('div');
        item.className = 'item-card draggable';
        item.draggable = true;
        item.dataset.positionId = position.id;
        if (getCurrentLoadedItem()?.type === 'position' && getCurrentLoadedItem()?.id === position.id) {
            item.classList.add('active');
        }
        
        const playerCount = position.playerPositions?.length || 0;
        const tags = position.tags || [];
        const tagsDisplay = tags.length > 0 
            ? tags.map(tag => {
                const tagColor = getTagColor(tag);
                return `<span class="tag-badge tag-badge-dynamic" style="background: ${tagColor.bg}; color: ${tagColor.text}; border-color: ${tagColor.border};">${escapeHtml(tag)}</span>`;
            }).join('')
            : '<span class="tag-badge-no-tags">No tags</span>';
        
        item.innerHTML = `
            <div class="item-card-name">${position.name}</div>
            <div class="item-card-tags-container">
                ${tagsDisplay}
            </div>
            <div class="item-card-actions">
                <button class="btn-edit" title="Edit position"><i data-lucide="edit"></i></button>
                <button class="btn-delete" title="Delete position"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        const editBtn = item.querySelector('.btn-edit');
        const deleteBtn = item.querySelector('.btn-delete');
        
        // Track if we're dragging to distinguish from clicks
        let isDragging = false;
        let mouseDownTime = 0;
        let mouseDownX = 0;
        let mouseDownY = 0;
        
        // Make item clickable to load (but not when dragging)
        item.addEventListener('click', (e) => {
            // Don't load if clicking on buttons
            if (e.target.closest('.item-card-actions')) {
                return;
            }
            // Don't load if we just dragged (check if mouse moved significantly)
            if (isDragging) {
                return;
            }
            // Check if mouse moved significantly (more than 5px) - if so, it was a drag
            const timeDiff = Date.now() - mouseDownTime;
            if (timeDiff > 200) { // If mousedown was more than 200ms ago, likely a drag
                return;
            }
            loadPosition(position.id);
        });
        
        // Prevent drag when clicking buttons
        [editBtn, deleteBtn].forEach(btn => {
            btn.addEventListener('mousedown', (e) => {
                e.stopPropagation();
            });
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
        
        editBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            // Load the position first, then open edit modal
            loadPosition(position.id);
            await editPosition(position.id);
        });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePositionNew(position.id);
        });
        
        // Track mouse down for click detection
        item.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.item-card-actions')) {
                mouseDownTime = Date.now();
                mouseDownX = e.clientX;
                mouseDownY = e.clientY;
            }
        });
        
        // Drag handlers
        item.addEventListener('dragstart', (e) => {
            isDragging = true;
            setDraggedPosition(position);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', position.id);
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            setDraggedPosition(null);
            // Reset dragging flag after a short delay to prevent click from firing
            setTimeout(() => {
                isDragging = false;
            }, 100);
        });
        
        dom.positionsList.appendChild(item);
    });
    
    // Initialize all icons in the positions list after all items are added
    initializeIcons(dom.positionsList);
}

// Render scenarios list
export function renderScenariosList() {
    if (!dom.scenariosList) return;
    
    dom.scenariosList.innerHTML = '';
    
    const allScenarios = getScenarios();
    const filteredScenarios = scenarioFilter ? scenarioFilter.filterItems(allScenarios) : allScenarios;
    
    filteredScenarios.forEach(scenario => {
        const item = document.createElement('div');
        item.className = 'item-card draggable';
        item.draggable = true;
        item.dataset.scenarioId = scenario.id;
        if (getCurrentLoadedItem()?.type === 'scenario' && getCurrentLoadedItem()?.id === scenario.id) {
            item.classList.add('active');
        }
        
        const startPos = getPositions().find(p => p.id === scenario.startPositionId);
        const endPos = getPositions().find(p => p.id === scenario.endPositionId);
        
        const isActive = getCurrentLoadedItem()?.type === 'scenario' && getCurrentLoadedItem()?.id === scenario.id;
        const playBtnClass = isActive ? 'btn-load' : 'btn-play';
        
        const tags = scenario.tags || [];
        const tagsDisplay = tags.length > 0 
            ? tags.map(tag => {
                const tagColor = getTagColor(tag);
                return `<span class="tag-badge tag-badge-dynamic" style="background: ${tagColor.bg}; color: ${tagColor.text}; border-color: ${tagColor.border};">${escapeHtml(tag)}</span>`;
            }).join('')
            : '';
        
        item.innerHTML = `
            <div class="item-card-name">${scenario.name}</div>
            <div class="item-card-metadata">
                ${startPos?.name || 'Unknown'} → ${endPos?.name || 'Unknown'}
            </div>
            ${tagsDisplay ? `<div class="item-card-tags-container">${tagsDisplay}</div>` : ''}
            <div class="item-card-actions">
                <button class="${playBtnClass} ${isActive ? 'btn-play-active' : 'btn-play-inactive'}" title="Play scenario"><i data-lucide="play"></i></button>
                <button class="btn-edit" title="Edit scenario"><i data-lucide="edit"></i></button>
                <button class="btn-delete" title="Delete scenario"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        const playBtn = item.querySelectorAll('button[title="Play scenario"]')[0];
        const editBtn = item.querySelector('.btn-edit');
        const deleteBtn = item.querySelector('.btn-delete');
        
        // Track if we're dragging to distinguish from clicks
        let isDragging = false;
        let mouseDownTime = 0;
        let mouseDownX = 0;
        let mouseDownY = 0;
        
        // Make item clickable to load (but not when dragging)
        item.addEventListener('click', (e) => {
            // Don't load if clicking on buttons
            if (e.target.closest('.item-card-actions')) {
                return;
            }
            // Don't load if we just dragged
            if (isDragging) {
                return;
            }
            // Check if mouse moved significantly (more than 5px) - if so, it was a drag
            const timeDiff = Date.now() - mouseDownTime;
            if (timeDiff > 200) { // If mousedown was more than 200ms ago, likely a drag
                return;
            }
            loadScenario(scenario.id);
        });
        
        // Track mouse down for click detection
        item.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.item-card-actions')) {
                mouseDownTime = Date.now();
                mouseDownX = e.clientX;
                mouseDownY = e.clientY;
            }
        });
        
        // Drag handlers
        item.addEventListener('dragstart', (e) => {
            isDragging = true;
            setDraggedScenario(scenario);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', scenario.id);
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            setDraggedScenario(null);
            // Reset dragging flag after a short delay to prevent click from firing
            setTimeout(() => {
                isDragging = false;
            }, 100);
        });
        
        // Prevent drag when clicking buttons
        [playBtn, editBtn, deleteBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        });
        
        playBtn.addEventListener('click', () => playScenario(scenario.id));
        editBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            // Load the scenario first, then open edit modal
            await loadScenario(scenario.id);
            await editScenario(scenario.id);
        });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteScenario(scenario.id);
        });
        
        dom.scenariosList.appendChild(item);
    });
    
    // Initialize all icons in the scenarios list after all items are added
    initializeIcons(dom.scenariosList);
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
            <div class="item-card-name">${sequence.name}</div>
            <div class="item-card-metadata">
                ${scenarioCount} scenarios
            </div>
            <div class="item-card-actions">
                <button class="btn-load btn-play-sequence" title="Play sequence"><i data-lucide="play"></i></button>
                <button class="btn-edit" title="Edit sequence"><i data-lucide="edit"></i></button>
                <button class="btn-delete" title="Delete sequence"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        const playBtn = item.querySelector('.btn-play-sequence');
        const editBtn = item.querySelector('.btn-edit');
        const deleteBtn = item.querySelector('.btn-delete');
        
        // Make item clickable to load (but not when clicking on buttons)
        item.addEventListener('click', (e) => {
            // Don't load if clicking on buttons
            if (e.target.closest('.item-card-actions')) {
                return;
            }
            loadSequence(sequence.id);
        });
        
        // Prevent drag when clicking buttons
        [playBtn, editBtn, deleteBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                });
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            }
        });
        
        playBtn.addEventListener('click', () => loadSequence(sequence.id));
        editBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            // Load the sequence first, then open edit modal
            await loadSequence(sequence.id);
            const { editSequence } = await import('./sequences.js');
            await editSequence(sequence.id);
        });
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSequence(sequence.id);
        });
        
        dom.sequencesList.appendChild(item);
    });
    
    // Initialize all icons in the sequences list after all items are added
    initializeIcons(dom.sequencesList);
}

// Update current item display
export function updateCurrentItemDisplay() {
    const item = getCurrentLoadedItem();
    if (dom.currentItemDisplay && dom.currentItemBadge && dom.currentItemName) {
        if (item) {
            // Show the current item display
            dom.currentItemDisplay.classList.remove('hidden');
            
            // Set badge with icon and type
            const typeLabels = {
                'position': { label: 'Position', icon: 'map-pin' },
                'scenario': { label: 'Scenario', icon: 'film' },
                'sequence': { label: 'Sequence', icon: 'list-ordered' }
            };
            
            const typeInfo = typeLabels[item.type] || { label: item.type, icon: 'file' };
            dom.currentItemBadge.className = `item-badge ${item.type}`;
            dom.currentItemBadge.innerHTML = `<i data-lucide="${typeInfo.icon}"></i> ${typeInfo.label}`;
            
            // Set name
            dom.currentItemName.textContent = item.name;
            
            // Initialize icon
            if (window.lucide) {
                lucide.createIcons({ container: dom.currentItemBadge });
            }
        } else {
            // Hide the current item display
            dom.currentItemDisplay.classList.add('hidden');
        }
    }
}

// Update scenario buttons visibility (all or nothing - show/hide entire container with fade)
export function updateScenarioButtonsVisibility() {
    const hasScenario = state.currentLoadedItem && state.currentLoadedItem.type === 'scenario';
    const hasSequence = state.currentLoadedItem && state.currentLoadedItem.type === 'sequence';
    const buttonsContainer = document.querySelector('.animation-buttons');
    
    if (buttonsContainer) {
        if (hasScenario || hasSequence) {
            buttonsContainer.classList.remove('hidden');
        } else {
            buttonsContainer.classList.add('hidden');
        }
    }
    
    // Show/hide appropriate buttons based on type
    if (hasSequence) {
        // Hide scenario-specific buttons
        if (dom.playAnimationBtn) dom.playAnimationBtn.classList.add('hidden');
        if (dom.refreshPositionBtn) dom.refreshPositionBtn.classList.add('hidden');
        if (dom.clearScenarioBtn) dom.clearScenarioBtn.classList.add('hidden');
        // Sequence buttons are handled by updateSequenceButtons
    } else if (hasScenario) {
        // Show scenario buttons, hide sequence buttons
        if (dom.playAnimationBtn) dom.playAnimationBtn.classList.remove('hidden');
        if (dom.refreshPositionBtn) dom.refreshPositionBtn.classList.remove('hidden');
        if (dom.clearScenarioBtn) dom.clearScenarioBtn.classList.remove('hidden');
        if (dom.sequencePlayBtn) dom.sequencePlayBtn.classList.add('hidden');
        if (dom.sequencePrevBtn) dom.sequencePrevBtn.classList.add('hidden');
        if (dom.sequenceNextBtn) dom.sequenceNextBtn.classList.add('hidden');
    }
}

// Update modified indicator
export function updateModifiedIndicator(isModified) {
    if (dom.modifiedIndicator) {
        const badge = dom.modifiedIndicator.querySelector('.badge');
        if (isModified) {
            dom.modifiedIndicator.classList.remove('hidden');
            dom.modifiedIndicator.classList.add('show-flex');
            
            // Update badge text based on whether it's a new item or just modified
            if (badge) {
                const currentItem = getCurrentLoadedItem();
                if (currentItem && !currentItem.id) {
                    badge.textContent = 'Not Saved';
                } else {
                    badge.textContent = 'Modified';
                }
            }
        } else {
            dom.modifiedIndicator.classList.add('hidden');
            dom.modifiedIndicator.classList.remove('show-flex');
        }
    }
}

// Update drop zone display
export function updateDropZoneDisplay() {
    const startPos = getSelectedStartPosition();
    const endPos = getSelectedEndPosition();
    
    // Update start position zone
    if (dom.startPositionContent && dom.startPositionZone && dom.clearStartPositionBtn) {
        if (startPos) {
            const tags = startPos.tags || [];
            const tagsDisplay = tags.length > 0 
                ? tags.map(tag => {
                    const tagColor = getTagColor(tag);
                    return `<span class="tag-badge tag-badge-dynamic tag-badge-small" style="background: ${tagColor.bg}; color: ${tagColor.text}; border-color: ${tagColor.border};">${escapeHtml(tag)}</span>`;
                }).join('')
                : '';
            
            dom.startPositionContent.innerHTML = `
                <div class="drop-zone-position">
                    <div class="drop-zone-position-name">${escapeHtml(startPos.name)}</div>
                    ${tagsDisplay ? `<div class="drop-zone-position-tags">${tagsDisplay}</div>` : ''}
                </div>
            `;
            dom.startPositionZone.classList.add('has-content');
            dom.clearStartPositionBtn.classList.remove('hidden');
            dom.clearStartPositionBtn.classList.add('show-flex');
        } else {
            dom.startPositionContent.innerHTML = '<span class="drop-zone-placeholder">Drag position here</span>';
            dom.startPositionZone.classList.remove('has-content');
            dom.clearStartPositionBtn.classList.add('hidden');
            dom.clearStartPositionBtn.classList.remove('show-flex');
        }
    }
    
    // Update end position zone
    if (dom.endPositionContent && dom.endPositionZone && dom.clearEndPositionBtn) {
        if (endPos) {
            const tags = endPos.tags || [];
            const tagsDisplay = tags.length > 0 
                ? tags.map(tag => {
                    const tagColor = getTagColor(tag);
                    return `<span class="tag-badge tag-badge-dynamic tag-badge-small" style="background: ${tagColor.bg}; color: ${tagColor.text}; border-color: ${tagColor.border};">${escapeHtml(tag)}</span>`;
                }).join('')
                : '';
            
            dom.endPositionContent.innerHTML = `
                <div class="drop-zone-position">
                    <div class="drop-zone-position-name">${escapeHtml(endPos.name)}</div>
                    ${tagsDisplay ? `<div class="drop-zone-position-tags">${tagsDisplay}</div>` : ''}
                </div>
            `;
            dom.endPositionZone.classList.add('has-content');
            dom.clearEndPositionBtn.classList.remove('hidden');
            dom.clearEndPositionBtn.classList.add('show-flex');
        } else {
            dom.endPositionContent.innerHTML = '<span class="drop-zone-placeholder">Drag position here</span>';
            dom.endPositionZone.classList.remove('has-content');
            dom.clearEndPositionBtn.classList.add('hidden');
            dom.clearEndPositionBtn.classList.remove('show-flex');
        }
    }
    
    // Initialize icons for clear buttons
    if (window.lucide && (startPos || endPos)) {
        initializeIcons(dom.startPositionZone);
        initializeIcons(dom.endPositionZone);
        if (dom.clearScenarioBtn) {
            initializeIcons(dom.clearScenarioBtn);
        }
    }
}

// Initialize drop zone handlers
export function initDropZones() {
    if (!dom.startPositionZone || !dom.endPositionZone) return;
    
    // Start position zone handlers
    dom.startPositionZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.draggedPosition) {
            dom.startPositionZone.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'copy';
        }
    });
    
    dom.startPositionZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only remove if we're actually leaving the zone
        if (!dom.startPositionZone.contains(e.relatedTarget)) {
            dom.startPositionZone.classList.remove('drag-over');
        }
    });
    
    dom.startPositionZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.startPositionZone.classList.remove('drag-over');
        
        if (state.draggedPosition) {
            setSelectedStartPosition(state.draggedPosition);
            updateDropZoneDisplay();
            checkAndUpdateScenarioState();
        }
    });
    
    // End position zone handlers
    dom.endPositionZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (state.draggedPosition) {
            dom.endPositionZone.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'copy';
        }
    });
    
    dom.endPositionZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only remove if we're actually leaving the zone
        if (!dom.endPositionZone.contains(e.relatedTarget)) {
            dom.endPositionZone.classList.remove('drag-over');
        }
    });
    
    dom.endPositionZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dom.endPositionZone.classList.remove('drag-over');
        
        if (state.draggedPosition) {
            setSelectedEndPosition(state.draggedPosition);
            updateDropZoneDisplay();
            checkAndUpdateScenarioState();
        }
    });
    
    // Clear buttons
    if (dom.clearStartPositionBtn) {
        dom.clearStartPositionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedStartPosition(null);
            updateDropZoneDisplay();
            checkAndUpdateScenarioState();
        });
    }
    
    if (dom.clearEndPositionBtn) {
        dom.clearEndPositionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedEndPosition(null);
            updateDropZoneDisplay();
            checkAndUpdateScenarioState();
        });
    }
    
    // Clear scenario button
    if (dom.clearScenarioBtn) {
        dom.clearScenarioBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const { clearScenario } = await import('./scenarios.js');
            await clearScenario();
        });
    }
}

// Check and update scenario state when drop zones change
async function checkAndUpdateScenarioState() {
    const startPos = getSelectedStartPosition();
    const endPos = getSelectedEndPosition();
    
    // If both positions are selected, create/update scenario state
    if (startPos && endPos && startPos.id !== endPos.id) {
        // Check if we have a loaded scenario
        if (state.currentLoadedItem && state.currentLoadedItem.type === 'scenario') {
            // Update existing scenario - check for modifications
            const { checkScenarioModifications } = await import('./scenarios.js');
            checkScenarioModifications();
            updateModifiedIndicator(state.isModified);
        } else {
            // Create new scenario state (not saved yet)
            const scenarioName = `New Scenario (${startPos.name} → ${endPos.name})`;
            setCurrentLoadedItem({ type: 'scenario', id: null, name: scenarioName });
            setIsModified(true);
            updateCurrentItemDisplay();
            updateModifiedIndicator(true);
            
            // Show all scenario buttons
            updateScenarioButtonsVisibility();
        }
    } else if (!startPos || !endPos) {
        // If either position is missing, clear scenario state if it was scenario-related
        if (state.currentLoadedItem && state.currentLoadedItem.type === 'scenario') {
            setCurrentLoadedItem(null);
            setIsModified(false);
            updateCurrentItemDisplay();
            updateModifiedIndicator(false);
            
            // Hide all scenario buttons
            updateScenarioButtonsVisibility();
        }
    }
}

// Render sequence timeline (replaces start/end drop zones)
export function renderSequenceTimeline(sequence) {
    if (!dom.timelineContainer) return;
    
    // Show timeline, hide drop zones
    showTimeline();
    
    if (!sequence) {
        dom.timelineContainer.innerHTML = '<div class="timeline-placeholder">No sequence loaded</div>';
        return;
    }
    
    // Migrate old format if needed
    if (sequence.scenarioIds && !sequence.items) {
        sequence.items = sequence.scenarioIds.map(id => ({
            type: 'scenario',
            id: id
        }));
    }
    
    const items = sequence.items || [];
    
    if (items.length === 0) {
        dom.timelineContainer.innerHTML = '<div class="timeline-placeholder">Drag positions or scenarios here to build your sequence</div>';
        // Still set up drop zone even when empty
        setupTimelineDropZone(sequence);
        return;
    }
    
    dom.timelineContainer.innerHTML = '';
    
    items.forEach((item, index) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.draggable = true;
        timelineItem.dataset.itemIndex = index;
        timelineItem.dataset.itemType = item.type;
        timelineItem.dataset.itemId = item.id;
        
        if (item.type === 'position') {
            const position = getPositions().find(p => p.id === item.id);
            if (position) {
                timelineItem.innerHTML = `
                    <div class="timeline-position-header">
                        <div class="timeline-position-icon"><i data-lucide="map-pin"></i></div>
                        <div class="timeline-position-label">Position</div>
                    </div>
                    <div class="timeline-item-bottom">
                        <div class="timeline-item-content">
                            <div class="timeline-item-name">${escapeHtml(position.name)}</div>
                        </div>
                    </div>
                    <button class="timeline-item-remove" title="Remove"><i data-lucide="x"></i></button>
                `;
            }
        } else if (item.type === 'scenario') {
            const scenario = getScenarios().find(s => s.id === item.id);
            if (scenario) {
                const startPos = getPositions().find(p => p.id === scenario.startPositionId);
                const endPos = getPositions().find(p => p.id === scenario.endPositionId);
                
                timelineItem.classList.add('timeline-item-scenario');
                timelineItem.innerHTML = `
                    <div class="timeline-scenario-header">
                        <div class="timeline-scenario-icon"><i data-lucide="film"></i></div>
                        <div class="timeline-scenario-name">${escapeHtml(scenario.name)}</div>
                    </div>
                    <div class="timeline-scenario-positions">
                        <div class="timeline-scenario-position timeline-scenario-start">
                            <div class="timeline-item-content">
                                <div class="timeline-item-name">${escapeHtml(startPos?.name || '?')}</div>
                            </div>
                        </div>
                        <div class="timeline-scenario-position timeline-scenario-end">
                            <div class="timeline-item-content">
                                <div class="timeline-item-name">${escapeHtml(endPos?.name || '?')}</div>
                            </div>
                        </div>
                    </div>
                    <button class="timeline-item-remove" title="Remove"><i data-lucide="x"></i></button>
                `;
            }
        }
        
        // Remove button
        const removeBtn = timelineItem.querySelector('.timeline-item-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const { removeItemFromSequence } = await import('./sequences.js');
                await removeItemFromSequence(sequence.id, index);
            });
        }
        
        // Drag handlers for reordering
        timelineItem.addEventListener('dragstart', (e) => {
            timelineItem.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index.toString());
        });
        
        timelineItem.addEventListener('dragend', () => {
            timelineItem.classList.remove('dragging');
        });
        
        // Drop handlers for reordering (only when dragging timeline items)
        timelineItem.addEventListener('dragover', (e) => {
            // Only handle if we're reordering (have a numeric index in dataTransfer)
            const dragData = e.dataTransfer.getData('text/plain');
            const draggingIndex = parseInt(dragData);
            
            // Only handle reordering, not when dragging positions/scenarios from lists
            if (!isNaN(draggingIndex) && draggingIndex !== index) {
                e.preventDefault();
                e.stopPropagation();
                timelineItem.classList.add('drag-over');
                e.dataTransfer.dropEffect = 'move';
            }
        });
        
        timelineItem.addEventListener('dragleave', () => {
            timelineItem.classList.remove('drag-over');
        });
        
        timelineItem.addEventListener('drop', async (e) => {
            const dragData = e.dataTransfer.getData('text/plain');
            const draggingIndex = parseInt(dragData);
            
            // Only handle reordering
            if (!isNaN(draggingIndex) && draggingIndex !== index) {
                e.preventDefault();
                e.stopPropagation();
                timelineItem.classList.remove('drag-over');
                
                const { reorderItemsInSequence } = await import('./sequences.js');
                await reorderItemsInSequence(sequence.id, draggingIndex, index);
            }
        });
        
        dom.timelineContainer.appendChild(timelineItem);
    });
    
    // Initialize icons
    initializeIcons(dom.timelineContainer);
    
    // Set up drop zone for timeline
    setupTimelineDropZone(sequence);
}

// Set up timeline as drop zone for positions and scenarios
function setupTimelineDropZone(sequence) {
    if (!dom.timelineContainer) return;
    
    // Remove existing listeners by cloning (but preserve the structure)
    const newContainer = dom.timelineContainer.cloneNode(true);
    dom.timelineContainer.parentNode.replaceChild(newContainer, dom.timelineContainer);
    dom.timelineContainer = newContainer;
    
    // Make sure placeholder doesn't block drops
    const placeholder = dom.timelineContainer.querySelector('.timeline-placeholder');
    if (placeholder) {
        placeholder.style.pointerEvents = 'none';
    }
    
    // Add drop zone handlers - these should work even when dragging over items
    dom.timelineContainer.addEventListener('dragover', (e) => {
        // Only handle if we're dragging a position or scenario (not reordering timeline items)
        // Check if we're dragging from outside (position/scenario) vs inside (reordering)
        const isDraggingFromOutside = state.draggedPosition || state.draggedScenario;
        
        if (isDraggingFromOutside) {
            e.preventDefault();
            e.stopPropagation();
            dom.timelineContainer.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'copy';
        }
    }, true); // Use capture phase to catch before item handlers
    
    dom.timelineContainer.addEventListener('dragleave', (e) => {
        // Only handle if we're actually leaving the container
        if (!dom.timelineContainer.contains(e.relatedTarget)) {
            dom.timelineContainer.classList.remove('drag-over');
        }
    });
    
    dom.timelineContainer.addEventListener('drop', async (e) => {
        // Only handle if we're dropping a position or scenario (not reordering)
        // Check the dataTransfer to see if it's a reorder (numeric) or new item
        const dragData = e.dataTransfer.getData('text/plain');
        const isReordering = dragData && !isNaN(parseInt(dragData));
        
        // Only process if we have a dragged position/scenario and it's not a reorder
        if (!isReordering && (state.draggedPosition || state.draggedScenario)) {
            e.preventDefault();
            e.stopPropagation();
            dom.timelineContainer.classList.remove('drag-over');
            
            if (state.draggedPosition) {
                const { addItemToSequence } = await import('./sequences.js');
                await addItemToSequence(sequence.id, 'position', state.draggedPosition.id);
                setDraggedPosition(null);
            } else if (state.draggedScenario) {
                const { addItemToSequence } = await import('./sequences.js');
                await addItemToSequence(sequence.id, 'scenario', state.draggedScenario.id);
                setDraggedScenario(null);
            }
        }
    }, true); // Use capture phase
}

// Update sequence timeline to show active position during playback
export async function updateSequenceTimelineActive(sequence, activePositionIndex) {
    if (!dom.timelineContainer) return;
    
    // Flatten sequence to get position indices (using the function from sequences.js)
    // We'll calculate it here since we can't easily export it
    const flattened = [];
    if (sequence.items) {
        sequence.items.forEach((item, itemIndex) => {
            if (item.type === 'position') {
                flattened.push({ type: 'position', id: item.id, itemIndex: itemIndex });
            } else if (item.type === 'scenario') {
                const scenario = getScenarios().find(s => s.id === item.id);
                if (scenario) {
                    flattened.push({ 
                        type: 'scenario-start', 
                        id: scenario.startPositionId, 
                        scenarioId: scenario.id,
                        itemIndex: itemIndex
                    });
                    flattened.push({ 
                        type: 'scenario-end', 
                        id: scenario.endPositionId, 
                        scenarioId: scenario.id,
                        itemIndex: itemIndex
                    });
                }
            }
        });
    }
    
    // Remove all active classes
    dom.timelineContainer.querySelectorAll('.timeline-item').forEach(item => {
        item.classList.remove('active', 'active-start', 'active-end');
    });
    dom.timelineContainer.querySelectorAll('.timeline-scenario-position').forEach(card => {
        card.classList.remove('active-start', 'active-end');
    });
    
    // Find and highlight active item
    if (activePositionIndex >= 0 && activePositionIndex < flattened.length) {
        const activePos = flattened[activePositionIndex];
        const itemIndex = activePos.itemIndex;
        const timelineItem = dom.timelineContainer.querySelector(`[data-item-index="${itemIndex}"]`);
        if (timelineItem) {
            // If it's a scenario, highlight the specific position card
            if (activePos.type === 'scenario-start') {
                timelineItem.classList.add('active-start');
                const startCard = timelineItem.querySelector('.timeline-scenario-start');
                if (startCard) {
                    startCard.classList.add('active-start');
                }
            } else if (activePos.type === 'scenario-end') {
                timelineItem.classList.add('active-end');
                const endCard = timelineItem.querySelector('.timeline-scenario-end');
                if (endCard) {
                    endCard.classList.add('active-end');
                }
            } else {
                // Regular position
                timelineItem.classList.add('active');
            }
        }
    }
}

// Update sequence buttons (edit mode vs play mode)
export function updateSequenceButtons(mode) {
    if (!dom.sequencePlayBtn || !dom.sequencePrevBtn || !dom.sequenceNextBtn) return;
    
    if (mode === 'edit') {
        // Hide play buttons, show edit mode (no special buttons needed)
        dom.sequencePlayBtn.classList.remove('hidden'); // Show play button to start
        dom.sequencePrevBtn.classList.add('hidden');
        dom.sequenceNextBtn.classList.add('hidden');
        if (dom.sequenceProgress) {
            dom.sequenceProgress.classList.add('hidden');
        }
    } else if (mode === 'play') {
        // Show play buttons
        dom.sequencePlayBtn.classList.add('hidden'); // Hide play, show prev/next
        dom.sequencePrevBtn.classList.remove('hidden');
        dom.sequenceNextBtn.classList.remove('hidden');
        if (dom.sequenceProgress) {
            dom.sequenceProgress.classList.remove('hidden');
        }
    }
}

// Show drop zones, hide timeline
export function showDropZones() {
    if (dom.positionDropZones) {
        dom.positionDropZones.classList.remove('hidden');
    }
    if (dom.sequenceTimeline) {
        dom.sequenceTimeline.classList.add('hidden');
    }
}

// Show timeline, hide drop zones
export function showTimeline() {
    if (dom.positionDropZones) {
        dom.positionDropZones.classList.add('hidden');
    }
    if (dom.sequenceTimeline) {
        dom.sequenceTimeline.classList.remove('hidden');
    }
}
