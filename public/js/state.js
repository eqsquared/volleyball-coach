// Application state management

const STORAGE_KEY_LOADED_ITEM = 'volleyball-coach-loaded-item';
const STORAGE_KEY_COURT_ROTATION = 'volleyball-coach-court-rotation';

// Save loaded item to localStorage
function saveLoadedItem(item) {
    try {
        if (item) {
            localStorage.setItem(STORAGE_KEY_LOADED_ITEM, JSON.stringify(item));
        } else {
            localStorage.removeItem(STORAGE_KEY_LOADED_ITEM);
        }
    } catch (error) {
        console.warn('Failed to save loaded item to localStorage:', error);
    }
}

// Get saved loaded item from localStorage
export function getSavedLoadedItem() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_LOADED_ITEM);
        if (saved) {
            return JSON.parse(saved);
        }
        return null;
    } catch (error) {
        console.warn('Failed to read loaded item from localStorage:', error);
        return null;
    }
}

export const state = {
    players: [],
    positions: [], // Array of position objects { id, name, tags[], playerPositions[] }
    rotations: [], // Deprecated - kept for backward compatibility only
    scenarios: [], // Array of scenario objects { id, name, startPositionId, endPositionId }
    sequences: [], // Array of sequence objects { id, name, scenarioIds[] }
    savedPositions: {}, // Legacy format for backward compatibility
    playerElements: new Map(), // Map player ID to DOM element
    draggedPlayer: null,
    draggedElement: null,
    isAnimating: false,
    lastStartPosition: null,
    dbInitialized: false,
    // New state tracking
    currentLoadedItem: null, // { type: 'position'|'scenario'|'sequence', id: string, name: string }
    isModified: false, // Tracks if current item has been edited
    editMode: 'none', // 'none'|'position'|'scenario'|'sequence'
    currentSequence: null, // { sequenceId: string, currentScenarioIndex: number }
    selectedStartPosition: null, // { id: string, name: string, ... }
    selectedEndPosition: null, // { id: string, name: string, ... }
    draggedPosition: null, // Position being dragged
    draggedScenario: null, // Scenario being dragged
    courtRotation: (() => {
        // Initialize from saved preference if available
        try {
            const saved = localStorage.getItem(STORAGE_KEY_COURT_ROTATION);
            if (saved !== null) {
                const rotation = parseInt(saved, 10);
                if ([0, 90, 180, 270].includes(rotation)) {
                    return rotation;
                }
            }
        } catch (error) {
            console.warn('Failed to read court rotation from localStorage:', error);
        }
        return 0; // Default to 0
    })(), // Court rotation in degrees: 0, 90, 180, or 270
};

// State getters
export function getPlayers() {
    return state.players;
}

export function getSavedPositions() {
    return state.savedPositions;
}

export function getPositions() {
    return state.positions;
}

export function getRotations() {
    return state.rotations;
}

export function getScenarios() {
    return state.scenarios;
}

export function getSequences() {
    return state.sequences;
}

export function getPlayerElements() {
    return state.playerElements;
}

export function getCurrentLoadedItem() {
    return state.currentLoadedItem;
}

export function getIsModified() {
    return state.isModified;
}

export function getEditMode() {
    return state.editMode;
}

export function getCurrentSequence() {
    return state.currentSequence;
}

// State setters
export function setPlayers(newPlayers) {
    state.players = newPlayers;
}

export function setSavedPositions(positions) {
    state.savedPositions = positions;
}

export function setPositions(positions) {
    state.positions = positions;
}

export function setRotations(rotations) {
    state.rotations = rotations;
}

export function setScenarios(scenarios) {
    state.scenarios = scenarios;
}

export function setSequences(sequences) {
    state.sequences = sequences;
}

export function setDbInitialized(value) {
    state.dbInitialized = value;
}

export function setCurrentLoadedItem(item) {
    state.currentLoadedItem = item;
    // Persist to localStorage
    saveLoadedItem(item);
}

export function setIsModified(value) {
    // Prevent setting modifications on phones for positions - they're read-only
    // Helper function to check if we're on a phone (matches CSS media query: max-width: 767px and orientation: portrait)
    const isPhoneView = () => window.innerWidth <= 767 && window.innerHeight > window.innerWidth;
    if (isPhoneView() && value === true && state.currentLoadedItem && state.currentLoadedItem.type === 'position') {
        // Don't set modified state to true on phones for positions
        return;
    }
    state.isModified = value;
}

export function setEditMode(mode) {
    state.editMode = mode;
}

export function setCurrentSequence(sequence) {
    state.currentSequence = sequence;
}

export function setDraggedPlayer(player) {
    state.draggedPlayer = player;
}

export function setDraggedElement(element) {
    state.draggedElement = element;
}

export function setIsAnimating(value) {
    state.isAnimating = value;
}

export function setLastStartPosition(position) {
    state.lastStartPosition = position;
}

export function setSelectedStartPosition(position) {
    state.selectedStartPosition = position;
}

export function setSelectedEndPosition(position) {
    state.selectedEndPosition = position;
}

export function setDraggedPosition(position) {
    state.draggedPosition = position;
}

export function setDraggedScenario(scenario) {
    state.draggedScenario = scenario;
}

export function getDraggedScenario() {
    return state.draggedScenario;
}

export function getSelectedStartPosition() {
    return state.selectedStartPosition;
}

export function getSelectedEndPosition() {
    return state.selectedEndPosition;
}

export function getCourtRotation() {
    return state.courtRotation;
}

export function setCourtRotation(rotation) {
    state.courtRotation = rotation;
    // Persist to localStorage
    try {
        localStorage.setItem(STORAGE_KEY_COURT_ROTATION, rotation.toString());
    } catch (error) {
        console.warn('Failed to save court rotation to localStorage:', error);
    }
}

// Get saved court rotation from localStorage
export function getSavedCourtRotation() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_COURT_ROTATION);
        if (saved !== null) {
            const rotation = parseInt(saved, 10);
            // Validate rotation is one of the valid values
            if ([0, 90, 180, 270].includes(rotation)) {
                return rotation;
            }
        }
        return 0; // Default to 0 if not found or invalid
    } catch (error) {
        console.warn('Failed to read court rotation from localStorage:', error);
        return 0;
    }
}

// Helper to detect if court positions have changed
export async function checkForModifications() {
    // Skip modification checks on phones - they're read-only
    // Helper function to check if we're on a phone (matches CSS media query: max-width: 767px and orientation: portrait)
    const isPhoneView = () => window.innerWidth <= 767 && window.innerHeight > window.innerWidth;
    if (isPhoneView()) {
        return;
    }
    
    if (!state.currentLoadedItem || state.currentLoadedItem.type !== 'position') {
        return;
    }
    
    const currentPosition = state.positions.find(p => p.id === state.currentLoadedItem.id);
    if (!currentPosition) return;
    
    // Get current player positions on court
    const currentCourtPositions = [];
    // Import conversion function - use dynamic import to avoid circular dependency
    const { percentToCoordinate, convertDisplayedToBaseCoordinates } = await import('./court.js');
    state.playerElements.forEach((element, playerId) => {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
            // Convert from percentage back to 600x600 coordinate system (displayed coordinates)
            const displayedX = percentToCoordinate(element.style.left) || 0;
            const displayedY = percentToCoordinate(element.style.top) || 0;
            // Convert displayed coordinates back to base (0°) coordinates for comparison
            const baseCoords = convertDisplayedToBaseCoordinates(displayedX, displayedY);
            currentCourtPositions.push({
                playerId: playerId,
                jersey: player.jersey,
                name: player.name,
                x: baseCoords.x,
                y: baseCoords.y
            });
        }
    });
    
    // Compare with saved position
    const savedPositions = currentPosition.playerPositions || [];
    
    // Check if counts match
    if (currentCourtPositions.length !== savedPositions.length) {
        state.isModified = true;
        return;
    }
    
    // Check if positions match
    const savedPosMap = new Map();
    savedPositions.forEach(pos => {
        savedPosMap.set(pos.playerId, { x: pos.x, y: pos.y });
    });
    
    for (const currentPos of currentCourtPositions) {
        const savedPos = savedPosMap.get(currentPos.playerId);
        if (!savedPos || savedPos.x !== currentPos.x || savedPos.y !== currentPos.y) {
            state.isModified = true;
            return;
        }
    }
    
    state.isModified = false;
}
