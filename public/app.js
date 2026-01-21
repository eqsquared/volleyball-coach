// Main application entry point
// Orchestrates initialization and event handling

import * as db from './db.js';
import { initDOM, dom } from './js/dom.js';
import { alert } from './js/modal.js';
import { 
    state, 
    setPlayers, 
    setSavedPositions, 
    setPositions, 
    setScenarios, 
    setSequences, 
    setDbInitialized,
    setEditMode, 
    setIsModified, 
    setCurrentLoadedItem, 
    checkForModifications,
    getSavedLoadedItem
} from './js/state.js';
import { addPlayer } from './js/players.js';
import { savePosition, savePositionAs, createNewPosition } from './js/positions.js';
import { playAnimation, resetToStartPosition } from './js/animation.js';
import { initCourtListeners } from './js/court.js';
import { 
    renderLineup, 
    renderPositionsList, 
    renderScenariosList, 
    renderSequencesList,
    updateCurrentItemDisplay,
    updateModifiedIndicator,
    initDropZones,
    updateDropZoneDisplay,
    initFilters
} from './js/ui.js';
import { initAccordions, openAccordion, getSavedActiveAccordion } from './js/accordion.js';
import { updateScenarioSelects } from './js/scenarios.js';
import { createSequence } from './js/sequences.js';
import { 
    migrateFromLegacyStorage, 
    exportToJSON, 
    exportToXML, 
    handleFileImport 
} from './js/importExport.js';

// Initialize application
async function init() {
    try {
        // Initialize DOM references
        initDOM();
        
        // Initialize API connection
        await db.initDB();
        setDbInitialized(true);
        
        // Try to load from file-based storage
        const hasDBData = await db.hasData();
        
        if (hasDBData) {
            // Load from file-based storage
            setPlayers(await db.getAllPlayers());
            
            // Try to load new format first, fall back to old format
            try {
                const positions = await db.getAllPositionsNew();
                const scenarios = await db.getAllScenarios();
                const sequences = await db.getAllSequences();
                
                // Also load old format for backward compatibility
                const savedPositions = await db.getAllPositions();
                setSavedPositions(savedPositions);
                
                setPositions(positions);
                setScenarios(scenarios);
                setSequences(sequences);
            } catch (error) {
                // Fall back to old format
                console.error('Error loading new format:', error);
                const savedPositions = await db.getAllPositions();
                setSavedPositions(savedPositions);
            }
            
            if (dom.fileStatus) {
                dom.fileStatus.textContent = '✓ Data loaded from data.json file.';
                dom.fileStatus.style.color = '#27ae60';
            }
        } else {
            // No file data, try to migrate from XML
            console.log('No file data found, attempting migration...');
            const migrated = await migrateFromLegacyStorage();
            
            if (!migrated) {
                // No legacy data either, start fresh
                if (dom.fileStatus) {
                    dom.fileStatus.textContent = 'Starting with empty database. Add players to begin.';
                    dom.fileStatus.style.color = '#3498db';
                }
            }
        }
        
        // Update file status
        if (dom.fileStatus && !dom.fileStatus.textContent.includes('✓')) {
            dom.fileStatus.textContent = '✓ Data is automatically saved to data.json file.';
            dom.fileStatus.style.color = '#27ae60';
        }
        
        // Initialize accordions
        initAccordions();
        
        // Restore last open accordion or default to Players
        const savedAccordion = getSavedActiveAccordion();
        if (savedAccordion) {
            openAccordion(savedAccordion);
        } else {
            openAccordion('players');
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Set up mobile drawer
        setupMobileDrawer();
        
        // Set up court scaling for mobile
        setupCourtScaling();
        
        // Initialize court drag and drop
        initCourtListeners();
        
        // Initialize filters
        initFilters();
        
        // Initialize drop zones
        initDropZones();
        
        // Initial render
        renderLineup();
        renderPositionsList();
        renderScenariosList();
        renderSequencesList();
        updateScenarioSelects();
        updateCurrentItemDisplay();
        updateDropZoneDisplay();
        
        // Initialize scenario buttons visibility (all hidden by default)
        const { updateScenarioButtonsVisibility } = await import('./js/ui.js');
        updateScenarioButtonsVisibility();
        
        // Restore last loaded item if it exists
        const savedItem = getSavedLoadedItem();
        if (savedItem) {
            // Verify the item still exists before loading
            let itemExists = false;
            if (savedItem.type === 'position') {
                itemExists = state.positions.some(p => p.id === savedItem.id);
                if (itemExists) {
                    const { loadPosition } = await import('./js/positions.js');
                    loadPosition(savedItem.id);
                }
            } else if (savedItem.type === 'scenario') {
                itemExists = state.scenarios.some(s => s.id === savedItem.id);
                if (itemExists) {
                    const { loadScenario } = await import('./js/scenarios.js');
                    loadScenario(savedItem.id);
                }
            } else if (savedItem.type === 'sequence') {
                itemExists = state.sequences.some(s => s.id === savedItem.id);
                if (itemExists) {
                    const { loadSequence } = await import('./js/sequences.js');
                    await loadSequence(savedItem.id);
                }
            }
            
            // If item no longer exists, clear the saved state
            if (!itemExists) {
                setCurrentLoadedItem(null);
            }
        }
        
        // Initialize Lucide icons with smaller default size
        if (window.lucide) {
            lucide.createIcons({
                attrs: {
                    width: 16,
                    height: 16
                }
            });
            
            // Re-initialize icons after a short delay to ensure mobile menu icon is created
            setTimeout(() => {
                lucide.createIcons();
            }, 100);
        }
        
        // Set up modification tracking
        setupModificationTracking();
    } catch (error) {
        console.error('Error initializing app:', error);
        await alert('Error initializing database. Please refresh the page.');
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Player management
    if (dom.addPlayerBtn) {
        dom.addPlayerBtn.addEventListener('click', addPlayer);
    }
    if (dom.jerseyInput) {
        dom.jerseyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addPlayer();
        });
    }
    if (dom.nameInput) {
        dom.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addPlayer();
        });
    }
    
    // Positions
    if (dom.newPositionBtn) {
        dom.newPositionBtn.addEventListener('click', createNewPosition);
    }
    
    // Search and tag filters are now handled by the filter module (initFilters)
    
    // Scenarios - creation is now done via drop zones
    
    // Sequences
    if (dom.createSequenceBtn) {
        dom.createSequenceBtn.addEventListener('click', createSequence);
    }
    
    // Animation
    if (dom.playAnimationBtn) {
        dom.playAnimationBtn.addEventListener('click', () => playAnimation());
    }
    // nextScenarioBtn is now only used for sequences, handled below
    if (dom.refreshPositionBtn) {
        dom.refreshPositionBtn.addEventListener('click', () => resetToStartPosition());
    }
    
    // Sequence buttons
    if (dom.sequencePlayBtn) {
        dom.sequencePlayBtn.addEventListener('click', async () => {
            const { startSequencePlayback } = await import('./js/sequences.js');
            await startSequencePlayback();
        });
    }
    if (dom.sequenceNextBtn) {
        dom.sequenceNextBtn.addEventListener('click', async () => {
            const { playNextPosition } = await import('./js/sequences.js');
            await playNextPosition();
        });
    }
    if (dom.sequencePrevBtn) {
        dom.sequencePrevBtn.addEventListener('click', async () => {
            const { playPreviousPosition } = await import('./js/sequences.js');
            await playPreviousPosition();
        });
    }
    
    // State management buttons
    if (dom.saveBtn) {
        dom.saveBtn.addEventListener('click', handleSave);
    }
    if (dom.saveAsBtn) {
        dom.saveAsBtn.addEventListener('click', handleSaveAs);
    }
    if (dom.discardBtn) {
        dom.discardBtn.addEventListener('click', handleDiscard);
    }
    
    // Edit mode buttons removed - no longer needed
    
    // Import/Export
    if (dom.exportJsonBtn) {
        dom.exportJsonBtn.addEventListener('click', exportToJSON);
    }
    if (dom.exportXmlBtn) {
        dom.exportXmlBtn.addEventListener('click', exportToXML);
    }
    if (dom.importBtn) {
        dom.importBtn.addEventListener('click', () => dom.importFileInput.click());
    }
    if (dom.importFileInput) {
        dom.importFileInput.addEventListener('change', handleFileImport);
    }
}

// Set up mobile drawer functionality
function setupMobileDrawer() {
    if (!dom.mobileMenuBtn || !dom.drawerOverlay || !dom.sidebar) return;
    
    // Toggle drawer when menu button is clicked
    dom.mobileMenuBtn.addEventListener('click', () => {
        dom.sidebar.classList.toggle('open');
        dom.drawerOverlay.classList.toggle('active');
        // Prevent body scroll when drawer is open
        if (dom.sidebar.classList.contains('open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });
    
    // Close drawer when overlay is clicked
    dom.drawerOverlay.addEventListener('click', () => {
        dom.sidebar.classList.remove('open');
        dom.drawerOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
    
    // Close drawer on window resize if it becomes desktop size
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            dom.sidebar.classList.remove('open');
            dom.drawerOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// Set up court scaling - responsive to both width and height
function setupCourtScaling() {
    if (!dom.court) return;
    
    function scaleCourt() {
        const container = dom.court.closest('.court-container');
        if (!container) return;
        
        // Get available space (accounting for padding)
        const padding = 20; // 10px on each side
        const availableWidth = container.clientWidth - padding;
        const availableHeight = container.clientHeight - padding;
        
        // Calculate scale based on both width and height constraints
        // Use the smaller scale to ensure court fits in both dimensions
        const scaleX = availableWidth / 600;
        const scaleY = availableHeight / 600;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 100%
        
        // Apply scaling
        dom.court.style.transform = `scale(${scale})`;
        dom.court.style.transformOrigin = 'center center';
        
        // Store scale in a data attribute for JavaScript calculations
        dom.court.dataset.scale = scale;
        
        // Store actual dimensions (scaled) for JavaScript
        dom.court.dataset.scaledWidth = (600 * scale).toString();
        dom.court.dataset.scaledHeight = (600 * scale).toString();
    }
    
    // Initial scale (with a small delay to ensure DOM is ready)
    setTimeout(scaleCourt, 50);
    
    // Scale on resize (with debouncing for performance)
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(scaleCourt, 100);
    });
    
    // Also scale when drawer opens/closes (in case it affects layout)
    if (dom.sidebar) {
        const observer = new MutationObserver(() => {
            setTimeout(scaleCourt, 100);
        });
        observer.observe(dom.sidebar, { attributes: true, attributeFilter: ['class'] });
    }
    
    // Scale when accordions open/close (affects available height)
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(accordion => {
        const observer = new MutationObserver(() => {
            setTimeout(scaleCourt, 100);
        });
        observer.observe(accordion, { attributes: true, attributeFilter: ['class'] });
    });
}

// Set up modification tracking
function setupModificationTracking() {
    // Track player movements on court
    if (dom.court) {
        dom.court.addEventListener('mousemove', () => {
            if (state.currentLoadedItem && state.currentLoadedItem.type === 'position') {
                checkForModifications();
                updateModifiedIndicator(state.isModified);
            }
        });
        
        // Also check on mouseup (after drag)
        dom.court.addEventListener('mouseup', () => {
            if (state.currentLoadedItem && state.currentLoadedItem.type === 'position') {
                setTimeout(() => {
                    checkForModifications();
                    updateModifiedIndicator(state.isModified);
                }, 100);
            }
        });
    }
    
    // Track scenario modifications when drop zones change
    // This is handled in checkAndUpdateScenarioState in ui.js
}

// Switch edit mode (kept for internal state management, but UI removed)
function switchEditMode(mode) {
    setEditMode(mode);
    // Mode switching UI removed - accordions are now always visible
}

// Handle save
async function handleSave() {
    if (!state.currentLoadedItem) return;
    
    if (state.currentLoadedItem.type === 'position') {
        await savePosition();
        setIsModified(false);
        updateModifiedIndicator(false);
        updateCurrentItemDisplay();
    } else if (state.currentLoadedItem.type === 'scenario') {
        const { saveScenario } = await import('./js/scenarios.js');
        await saveScenario();
    }
}

// Handle save as
async function handleSaveAs() {
    if (!state.currentLoadedItem) return;
    
    if (state.currentLoadedItem.type === 'position') {
        await savePositionAs();
        setIsModified(false);
        updateModifiedIndicator(false);
        updateCurrentItemDisplay();
    } else if (state.currentLoadedItem.type === 'scenario') {
        const { saveScenarioAs } = await import('./js/scenarios.js');
        await saveScenarioAs();
    }
}

// Handle discard
async function handleDiscard() {
    if (!state.currentLoadedItem) return;
    
    if (state.currentLoadedItem.type === 'position') {
        // Reload the position
        const { loadPosition } = await import('./js/positions.js');
        loadPosition(state.currentLoadedItem.id);
        setIsModified(false);
        updateModifiedIndicator(false);
    } else if (state.currentLoadedItem.type === 'scenario') {
        // Reload the scenario
        const { loadScenario } = await import('./js/scenarios.js');
        if (state.currentLoadedItem.id) {
            loadScenario(state.currentLoadedItem.id);
        } else {
            // New unsaved scenario - just clear it
            const { clearScenario } = await import('./js/scenarios.js');
            await clearScenario();
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
