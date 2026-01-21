// UI rendering and updates

import { state, getPlayers, getSavedPositions, getPlayerElements, getPositions, getScenarios, getSequences, getCurrentLoadedItem, setDraggedPlayer } from './state.js';

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
import { loadScenario, playScenario, deleteScenario } from './scenarios.js';
import { loadSequence, playNextScenario, deleteSequence } from './sequences.js';

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

// Get all unique tags from positions
function getAllTags() {
    const allTags = new Set();
    getPositions().forEach(position => {
        (position.tags || []).forEach(tag => {
            if (tag.trim()) {
                allTags.add(tag.trim());
            }
        });
    });
    return Array.from(allTags).sort();
}

// Filter positions based on search and selected tags
function filterPositions(positions) {
    let filtered = positions;
    
    // Filter by search term (name only)
    if (dom.positionSearchInput) {
        const searchTerm = (dom.positionSearchInput.value || '').toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(position => {
                return position.name.toLowerCase().includes(searchTerm);
            });
        }
    }
    
    // Filter by selected tags (position must have ALL selected tags)
    if (selectedTags.size > 0) {
        filtered = filtered.filter(position => {
            const positionTags = new Set((position.tags || []).map(t => t.trim().toLowerCase()));
            return Array.from(selectedTags).every(selectedTag => 
                positionTags.has(selectedTag.toLowerCase())
            );
        });
    }
    
    return filtered;
}

// Render selected tags
function renderSelectedTags() {
    if (!dom.selectedTagsContainer) return;
    
    dom.selectedTagsContainer.innerHTML = '';
    
    if (selectedTags.size === 0) {
        dom.selectedTagsContainer.style.display = 'none';
        return;
    }
    
    dom.selectedTagsContainer.style.display = 'flex';
    
    Array.from(selectedTags).forEach(tag => {
        const tagColor = getTagColor(tag);
        const tagChip = document.createElement('div');
        tagChip.className = 'selected-tag-chip';
        tagChip.style.background = tagColor.bg;
        tagChip.style.color = tagColor.text;
        tagChip.style.borderColor = tagColor.border;
        tagChip.innerHTML = `
            <span>${escapeHtml(tag)}</span>
            <button class="remove-tag-btn" data-tag="${escapeHtml(tag)}" title="Remove filter">
                <i data-lucide="x"></i>
            </button>
        `;
        
        const removeBtn = tagChip.querySelector('.remove-tag-btn');
        removeBtn.style.color = tagColor.text;
        removeBtn.addEventListener('click', () => {
            selectedTags.delete(tag);
            renderSelectedTags();
            renderPositionsList();
        });
        
        dom.selectedTagsContainer.appendChild(tagChip);
    });
    
    // Initialize icons after all tags are added
    initializeIcons(dom.selectedTagsContainer);
}

// Export function to show tag filter dropdown
export function showTagFilterDropdown() {
    // Remove existing dropdown
    const existing = document.querySelector('.tag-filter-dropdown');
    if (existing) {
        existing.remove();
        return;
    }
    
    const allTags = getAllTags();
    if (allTags.length === 0) {
        return;
    }
    
    const dropdown = document.createElement('div');
    dropdown.className = 'tag-filter-dropdown';
    
    const tagsList = document.createElement('div');
    tagsList.className = 'tag-filter-list';
    
    allTags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-filter-item';
        if (selectedTags.has(tag)) {
            tagItem.classList.add('selected');
        }
        
        tagItem.innerHTML = `
            <input type="checkbox" id="tag-${escapeHtml(tag)}" ${selectedTags.has(tag) ? 'checked' : ''}>
            <label for="tag-${escapeHtml(tag)}">${escapeHtml(tag)}</label>
        `;
        
        tagItem.addEventListener('click', (e) => {
            e.stopPropagation();
            const checkbox = tagItem.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            
            if (checkbox.checked) {
                selectedTags.add(tag);
                tagItem.classList.add('selected');
            } else {
                selectedTags.delete(tag);
                tagItem.classList.remove('selected');
            }
            
            renderSelectedTags();
            renderPositionsList();
        });
        
        tagsList.appendChild(tagItem);
    });
    
    dropdown.appendChild(tagsList);
    
    // Position dropdown
    const rect = dom.tagFilterBtn.getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = (rect.bottom + 4) + 'px';
    
    document.body.appendChild(dropdown);
    
    // Close on outside click
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!dropdown.contains(e.target) && e.target !== dom.tagFilterBtn) {
                dropdown.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 0);
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
                <div style="flex: 1;">
                    <div class="item-card-name">${positionName} <span style="font-size: 10px; color: #6c757d;">(Legacy)</span></div>
                </div>
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
    const filteredPositions = filterPositions(allPositions);
    
    // Render new format positions
    filteredPositions.forEach(position => {
        const item = document.createElement('div');
        item.className = 'item-card';
        if (getCurrentLoadedItem()?.type === 'position' && getCurrentLoadedItem()?.id === position.id) {
            item.classList.add('active');
        }
        
        const playerCount = position.playerPositions?.length || 0;
        const tags = position.tags || [];
        const tagsDisplay = tags.length > 0 
            ? tags.map(tag => {
                const tagColor = getTagColor(tag);
                return `<span class="tag-badge" style="background: ${tagColor.bg}; color: ${tagColor.text}; border-color: ${tagColor.border};">${escapeHtml(tag)}</span>`;
            }).join('')
            : '<span style="font-size: 10px; color: #999;">No tags</span>';
        
        item.innerHTML = `
            <div style="flex: 1;">
                <div class="item-card-name">${position.name}</div>
                <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">
                    ${tagsDisplay}
                </div>
            </div>
            <div class="item-card-actions">
                <button class="btn-load" title="Load position"><i data-lucide="folder-open"></i></button>
                <button class="btn-edit" title="Edit position"><i data-lucide="edit"></i></button>
                <button class="btn-delete" title="Delete position"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        const loadBtn = item.querySelector('.btn-load');
        const editBtn = item.querySelector('.btn-edit');
        const deleteBtn = item.querySelector('.btn-delete');
        
        loadBtn.addEventListener('click', () => loadPosition(position.id));
        editBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await editPosition(position.id);
        });
        deleteBtn.addEventListener('click', () => deletePositionNew(position.id));
        
        dom.positionsList.appendChild(item);
    });
    
    // Initialize all icons in the positions list after all items are added
    initializeIcons(dom.positionsList);
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
        
        dom.sequencesList.appendChild(item);
    });
    
    // Initialize all icons in the sequences list after all items are added
    initializeIcons(dom.sequencesList);
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
