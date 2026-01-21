// Reusable search and tags filter module

// Tag color assignment - tracks which color each tag gets
const tagColorMap = new Map();
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
                onFilterChange();
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
