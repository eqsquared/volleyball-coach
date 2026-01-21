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
import { createSequence, playNextScenario } from './js/sequences.js';
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
                
                // If new format is empty but old format has data, trigger migration
                if (positions.length === 0 && savedPositions && Object.keys(savedPositions).length > 0) {
                    console.log('New format empty but legacy data exists. Migration may be needed. Triggering migration...');
                    // The migration should have run on server start, but let's check
                    // For now, we'll show legacy positions in the UI
                    console.log('Showing legacy positions until migration completes');
                }
                
                setPositions(positions);
                setScenarios(scenarios);
                setSequences(sequences);
                
                console.log(`Data loaded: ${positions.length} positions, ${scenarios.length} scenarios, ${sequences.length} sequences`);
                console.log(`Legacy positions: ${Object.keys(savedPositions || {}).length}`);
            } catch (error) {
                // Fall back to old format
                console.error('Error loading new format:', error);
                const savedPositions = await db.getAllPositions();
                setSavedPositions(savedPositions);
                console.log('Data loaded from file-based storage (v3.0, will migrate on next server restart)');
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
    if (dom.nextScenarioBtn) {
        dom.nextScenarioBtn.addEventListener('click', playNextScenario);
    }
    if (dom.refreshPositionBtn) {
        dom.refreshPositionBtn.addEventListener('click', () => resetToStartPosition());
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

// Set up court scaling for mobile
function setupCourtScaling() {
    if (!dom.court) return;
    
    function scaleCourt() {
        if (window.innerWidth <= 768) {
            const container = dom.court.closest('.court-container');
            if (!container) return;
            
            // Get available width (accounting for padding: 10px on each side = 20px total)
            const containerWidth = container.clientWidth - 20;
            const scale = Math.min(containerWidth / 600, 1);
            
            dom.court.style.transform = `scale(${scale})`;
            dom.court.style.transformOrigin = 'center center';
            
            // Adjust container height to match scaled court height
            const scaledHeight = 600 * scale;
            container.style.height = `${scaledHeight}px`;
        } else {
            dom.court.style.transform = '';
            dom.court.style.transformOrigin = '';
            const container = dom.court.closest('.court-container');
            if (container) {
                container.style.height = '';
            }
        }
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
            clearScenario();
        }
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
