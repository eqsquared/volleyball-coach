// Main application entry point
// Orchestrates initialization and event handling

import * as db from './db.js';
import { initDOM, dom } from './js/dom.js';
import { state, setPlayers, setSavedPositions, setDbInitialized } from './js/state.js';
import { addPlayer } from './js/players.js';
import { savePosition, loadPosition } from './js/positions.js';
import { playAnimation, resetToStartPosition } from './js/animation.js';
import { initCourtListeners } from './js/court.js';
import { renderLineup, updateSavedPositionsList, updatePositionSelects } from './js/ui.js';
import { 
    migrateFromLegacyStorage, 
    selectDataFile, 
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
            setSavedPositions(await db.getAllPositions());
            console.log('Data loaded from file-based storage');
            
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
        
        // Set up event listeners
        setupEventListeners();
        
        // Initialize court drag and drop
        initCourtListeners();
        
        // Initial render
        renderLineup();
        updateSavedPositionsList();
        updatePositionSelects();
        
        // Initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Error initializing database. Please refresh the page.');
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Player management
    dom.addPlayerBtn.addEventListener('click', addPlayer);
    
    // Position management
    dom.savePositionBtn.addEventListener('click', savePosition);
    
    // Animation
    dom.playAnimationBtn.addEventListener('click', playAnimation);
    dom.refreshPositionBtn.addEventListener('click', resetToStartPosition);
    
    // Import/Export
    dom.selectFileBtn.addEventListener('click', selectDataFile);
    dom.exportJsonBtn.addEventListener('click', exportToJSON);
    dom.exportXmlBtn.addEventListener('click', exportToXML);
    dom.importBtn.addEventListener('click', () => dom.importFileInput.click());
    dom.importFileInput.addEventListener('change', handleFileImport);
    
    // Auto-load positions when selected
    dom.startPositionSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadPosition(e.target.value);
        }
    });
    
    dom.endPositionSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadPosition(e.target.value);
        }
    });
    
    // Allow Enter key to add player
    dom.jerseyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
    dom.nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addPlayer();
    });
    
    // Allow Enter key to save position
    dom.positionNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') savePosition();
    });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
