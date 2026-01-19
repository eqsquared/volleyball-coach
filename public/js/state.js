// Application state management

export const state = {
    players: [],
    savedPositions: {},
    playerElements: new Map(), // Map player ID to DOM element
    draggedPlayer: null,
    draggedElement: null,
    isAnimating: false,
    lastStartPosition: null,
    dbInitialized: false
};

// State getters
export function getPlayers() {
    return state.players;
}

export function getSavedPositions() {
    return state.savedPositions;
}

export function getPlayerElements() {
    return state.playerElements;
}

// State setters
export function setPlayers(newPlayers) {
    state.players = newPlayers;
}

export function setSavedPositions(positions) {
    state.savedPositions = positions;
}

export function setDbInitialized(value) {
    state.dbInitialized = value;
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
