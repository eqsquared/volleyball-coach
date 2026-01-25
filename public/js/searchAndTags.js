// Reusable search and tags filter module

// Tag color assignment - tracks which color index (0-7) each tag gets
const tagColorMap = new Map();

// Get color index for a tag (consistent across themes)
function getTagColorIndex(tag) {
    // Calculate color index based on tag name hash to ensure consistency
    // This ensures the same tag always gets the same color index regardless of theme
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        const char = tag.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 8; // 8 color options
}

// Get or assign a color index for a tag based on selection order
// Returns the color index (0-7) instead of color object
function getTagColor(tag) {
    if (!tagColorMap.has(tag)) {
        const colorIndex = getTagColorIndex(tag);
        tagColorMap.set(tag, colorIndex);
    }
    return tagColorMap.get(tag);
}

// Helper to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize Lucide icons for a container
function initializeIcons(container) {
    if (!window.lucide || !container) return;
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            try {
                if (container instanceof Element) {
                    lucide.createIcons({
                        root: container
                    });
                }
            } catch (error) {
                console.warn('Error initializing icons:', error);
                try {
                    lucide.createIcons();
                } catch (e) {
                    console.warn('Fallback icon initialization failed:', e);
                }
            }
        });
    });
}

// Create a search and tags filter instance
export function createSearchAndTagsFilter(config) {
    const {
        searchInputId,
        tagFilterBtnId,
        selectedTagsContainerId,
        getAllItems,
        getItemTags,
        getItemName,
        onFilterChange
    } = config;
    
    let selectedTags = new Set();
    
    // Get all unique tags from items
    function getAllTags() {
        const allTags = new Set();
        getAllItems().forEach(item => {
            const tags = getItemTags(item);
            tags.forEach(tag => {
                if (tag.trim()) {
                    allTags.add(tag.trim());
                }
            });
        });
        return Array.from(allTags).sort();
    }
    
    // Filter items based on search and selected tags
    function filterItems(items) {
        let filtered = items;
        
        // Filter by search term (name only)
        const searchInput = document.getElementById(searchInputId);
        if (searchInput) {
            const searchTerm = (searchInput.value || '').toLowerCase();
            if (searchTerm) {
                filtered = filtered.filter(item => {
                    const name = getItemName(item);
                    return name.toLowerCase().includes(searchTerm);
                });
            }
        }
        
        // Filter by selected tags (item must have ALL selected tags)
        if (selectedTags.size > 0) {
            filtered = filtered.filter(item => {
                const itemTags = new Set(getItemTags(item).map(t => t.trim().toLowerCase()));
                return Array.from(selectedTags).every(selectedTag => 
                    itemTags.has(selectedTag.toLowerCase())
                );
            });
        }
        
        return filtered;
    }
    
    // Render selected tags
    function renderSelectedTags() {
        const container = document.getElementById(selectedTagsContainerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (selectedTags.size === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'flex';
        
        Array.from(selectedTags).forEach(tag => {
            const colorIndex = getTagColor(tag);
            const tagChip = document.createElement('div');
            tagChip.className = `selected-tag-chip tag-color-${colorIndex}`;
            tagChip.innerHTML = `
                <span>${escapeHtml(tag)}</span>
                <button class="remove-tag-btn" data-tag="${escapeHtml(tag)}" title="Remove filter">
                    <i data-lucide="x"></i>
                </button>
            `;
            
            const removeBtn = tagChip.querySelector('.remove-tag-btn');
            removeBtn.addEventListener('click', () => {
                selectedTags.delete(tag);
                renderSelectedTags();
                onFilterChange();
            });
            
            container.appendChild(tagChip);
        });
        
        // Initialize icons after all tags are added
        initializeIcons(container);
    }
    
    // Show tag filter dropdown
    function showTagFilterDropdown() {
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
        
        const tagFilterBtn = document.getElementById(tagFilterBtnId);
        if (!tagFilterBtn) return;
        
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
                <input type="checkbox" id="tag-${escapeHtml(tag)}-${searchInputId}" ${selectedTags.has(tag) ? 'checked' : ''}>
                <label for="tag-${escapeHtml(tag)}-${searchInputId}">${escapeHtml(tag)}</label>
            `;
            
            // Get checkbox and label after they're created
            const checkbox = tagItem.querySelector('input[type="checkbox"]');
            const label = tagItem.querySelector('label');
            
            // Function to update state based on checkbox checked status
            const updateState = () => {
                if (checkbox.checked) {
                    selectedTags.add(tag);
                    tagItem.classList.add('selected');
                } else {
                    selectedTags.delete(tag);
                    tagItem.classList.remove('selected');
                }
                renderSelectedTags();
                onFilterChange();
            };
            
            // Handle checkbox change event (fires for both checkbox clicks and label clicks)
            checkbox.addEventListener('change', (e) => {
                e.stopPropagation();
                updateState();
            });
            
            // Handle clicks on the item container
            tagItem.addEventListener('click', (e) => {
                // If clicking on checkbox or label, let their natural behavior handle it
                // The label's 'for' attribute will automatically toggle the checkbox
                // and trigger the change event
                if (e.target === checkbox || e.target === label || label.contains(e.target)) {
                    // Don't prevent default - let label's natural behavior work
                    return;
                }
                // If clicking elsewhere on the item, toggle the checkbox manually
                e.stopPropagation();
                checkbox.checked = !checkbox.checked;
                updateState();
            });
            
            tagsList.appendChild(tagItem);
        });
        
        dropdown.appendChild(tagsList);
        
        // Position dropdown
        const rect = tagFilterBtn.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        dropdown.style.top = (rect.bottom + 4) + 'px';
        
        document.body.appendChild(dropdown);
        
        // Close on outside click
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!dropdown.contains(e.target) && e.target !== tagFilterBtn) {
                    dropdown.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 0);
    }
    
    // Initialize event listeners
    function init() {
        const searchInput = document.getElementById(searchInputId);
        const tagFilterBtn = document.getElementById(tagFilterBtnId);
        
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                onFilterChange();
            });
        }
        
        if (tagFilterBtn) {
            tagFilterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                showTagFilterDropdown();
            });
        }
    }
    
    // Public API
    return {
        filterItems,
        renderSelectedTags,
        showTagFilterDropdown,
        init,
        getSelectedTags: () => selectedTags,
        clearTags: () => {
            selectedTags.clear();
            renderSelectedTags();
            onFilterChange();
        }
    };
}
