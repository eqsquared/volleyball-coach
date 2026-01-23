// Main application entry point
// Orchestrates initialization and event handling

import * as db from './db.js';
import { initCapacitor } from './js/capacitor-init.js';
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

// Helper function to check if we're on a phone (matches CSS media query: max-width: 767px and orientation: portrait)
function isPhoneView() {
    return window.innerWidth <= 767 && window.innerHeight > window.innerWidth;
}

// Initialize application
async function init() {
    try {
        // Initialize Capacitor (if available)
        await initCapacitor();
        
        // Initialize DOM references
        initDOM();
        
        // Initialize API connection (or local storage in native mode)
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
        
        // Initialize court drag and drop
        initCourtListeners();
        
        // Set up dynamic viewport dimension tracking (handles browser UI changes)
        setupViewportDimensions();
        
        // Set up court font-size scaling
        setupCourtFontScaling();
        
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
        const { updateScenarioButtonsVisibility, updateMobileUI } = await import('./js/ui.js');
        updateScenarioButtonsVisibility();
        updateMobileUI();
        
        // Update mobile UI on window resize
        window.addEventListener('resize', () => {
            updateMobileUI();
        });
        
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


// Set up dynamic viewport dimension tracking - handles browser UI changes (e.g., Safari tabs)
function setupViewportDimensions() {
    function updateViewportDimensions() {
        const root = document.documentElement;
        
        // Get actual viewport dimensions
        const vh = window.innerHeight;
        const vw = window.innerWidth;
        
        // Calculate available height (accounting for browser UI)
        // Use the actual innerHeight which accounts for browser chrome
        const availableHeight = vh;
        
        // Update CSS custom properties
        root.style.setProperty('--viewport-height', `${vh}px`);
        root.style.setProperty('--viewport-width', `${vw}px`);
        root.style.setProperty('--available-height', `${availableHeight}px`);
        
        // Also support dvh (dynamic viewport height) where available
        // This is a newer CSS feature that handles this automatically
        if (CSS.supports('height', '100dvh')) {
            root.style.setProperty('--viewport-height', '100dvh');
            root.style.setProperty('--available-height', '100dvh');
        }
    }
    
    // Initial update
    updateViewportDimensions();
    
    // Update on resize with debouncing
    let resizeTimeout;
    const handleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateViewportDimensions, 50);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
        // Delay slightly to allow orientation change to complete
        setTimeout(updateViewportDimensions, 100);
    });
    
    // Use Visual Viewport API if available (better for mobile browsers)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleResize);
        window.visualViewport.addEventListener('scroll', handleResize);
    }
}

// Set up court font-size scaling - updates CSS variable based on actual court size
function setupCourtFontScaling() {
    if (!dom.court) return;
    
    function updateCourtFontSize() {
        const rect = dom.court.getBoundingClientRect();
        const courtWidth = rect.width;
        // Base: 16px at 600px court width
        // Scale proportionally: fontSize = (courtWidth / 600) * 16
        const fontSize = Math.max(10, Math.min(16, (courtWidth / 600) * 16));
        dom.court.style.setProperty('--court-font-size', fontSize + 'px');
    }
    
    // Initial update
    updateCourtFontSize();
    
    // Update on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(updateCourtFontSize, 100);
    });
    
    // Use ResizeObserver to watch for court size changes
    const resizeObserver = new ResizeObserver(() => {
        updateCourtFontSize();
    });
    resizeObserver.observe(dom.court);
}

// Set up modification tracking
function setupModificationTracking() {
    // Track player movements on court
    if (dom.court) {
        // Mouse events for desktop (skip on phones - read-only mode)
        dom.court.addEventListener('mousemove', () => {
            // Skip modification checks on phones - they're read-only
            if (isPhoneView()) return;
            
            if (state.currentLoadedItem && state.currentLoadedItem.type === 'position') {
                checkForModifications();
                updateModifiedIndicator(state.isModified);
            }
        });
        
        // Also check on mouseup (after drag) (skip on phones)
        dom.court.addEventListener('mouseup', () => {
            // Skip modification checks on phones - they're read-only
            if (isPhoneView()) return;
            
            if (state.currentLoadedItem && state.currentLoadedItem.type === 'position') {
                setTimeout(() => {
                    checkForModifications();
                    updateModifiedIndicator(state.isModified);
                }, 100);
            }
        });
        
        // Touch events for mobile devices
        // Check after touch drag ends (skip on phones - read-only mode)
        dom.court.addEventListener('touchend', async (e) => {
            // Skip modification checks on phones - they're read-only
            if (isPhoneView()) return;
            
            if (state.currentLoadedItem && state.currentLoadedItem.type === 'position') {
                // Use setTimeout to ensure DOM has updated after touch drag
                setTimeout(async () => {
                    await checkForModifications();
                    updateModifiedIndicator(state.isModified);
                }, 100);
            }
        }, { passive: true });
        
        // Also check on touchmove to catch movements during drag
        // This helps detect modifications even if touchend doesn't fire (skip on phones)
        let touchMoveTimeout;
        dom.court.addEventListener('touchmove', () => {
            // Skip modification checks on phones - they're read-only
            if (isPhoneView()) return;
            
            if (state.currentLoadedItem && state.currentLoadedItem.type === 'position') {
                // Debounce to avoid excessive checks
                clearTimeout(touchMoveTimeout);
                touchMoveTimeout = setTimeout(async () => {
                    await checkForModifications();
                    updateModifiedIndicator(state.isModified);
                }, 200);
            }
        }, { passive: true });
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

// Initialize drag-drop-touch polyfill for mobile devices
// This makes HTML5 drag and drop work on touch devices
if (typeof DragDropTouch !== 'undefined') {
    // Polyfill is loaded and will automatically handle touch events
    console.log('Drag-drop-touch polyfill loaded');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
