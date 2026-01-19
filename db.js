// IndexedDB Database Manager for Volleyball Coach
// Provides robust local database storage with better performance and capacity

const DB_NAME = 'VolleyballCoachDB';
const DB_VERSION = 1;
const STORE_PLAYERS = 'players';
const STORE_POSITIONS = 'positions';

let db = null;

// Initialize database
export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create players store
            if (!db.objectStoreNames.contains(STORE_PLAYERS)) {
                const playersStore = db.createObjectStore(STORE_PLAYERS, { keyPath: 'id' });
                playersStore.createIndex('jersey', 'jersey', { unique: true });
            }
            
            // Create positions store
            if (!db.objectStoreNames.contains(STORE_POSITIONS)) {
                const positionsStore = db.createObjectStore(STORE_POSITIONS, { keyPath: 'name' });
            }
        };
    });
}

// Get all players
export async function getAllPlayers() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PLAYERS], 'readonly');
        const store = transaction.objectStore(STORE_PLAYERS);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

// Add or update player
export async function savePlayer(player) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PLAYERS], 'readwrite');
        const store = transaction.objectStore(STORE_PLAYERS);
        const request = store.put(player);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// Delete player
export async function deletePlayer(playerId) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_PLAYERS], 'readwrite');
        const store = transaction.objectStore(STORE_PLAYERS);
        const request = store.delete(playerId);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// Get all saved positions
export async function getAllPositions() {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_POSITIONS], 'readonly');
        const store = transaction.objectStore(STORE_POSITIONS);
        const request = store.getAll();
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const positions = request.result || [];
            // Convert array to object format
            const positionsObj = {};
            positions.forEach(pos => {
                positionsObj[pos.name] = pos.positions;
            });
            resolve(positionsObj);
        };
    });
}

// Save position
export async function savePosition(positionName, positions) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_POSITIONS], 'readwrite');
        const store = transaction.objectStore(STORE_POSITIONS);
        const request = store.put({
            name: positionName,
            positions: positions,
            updatedAt: new Date().toISOString()
        });
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// Delete position
export async function deletePosition(positionName) {
    if (!db) await initDB();
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_POSITIONS], 'readwrite');
        const store = transaction.objectStore(STORE_POSITIONS);
        const request = store.delete(positionName);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

// Export all data for backup
export async function exportAllData() {
    const players = await getAllPlayers();
    const positions = await getAllPositions();
    
    return {
        players,
        savedPositions: positions,
        exportDate: new Date().toISOString(),
        version: '2.0',
        database: 'IndexedDB'
    };
}

// Import data (for migration/restore)
export async function importData(data) {
    if (!db) await initDB();
    
    const transaction = db.transaction([STORE_PLAYERS, STORE_POSITIONS], 'readwrite');
    const playersStore = transaction.objectStore(STORE_PLAYERS);
    const positionsStore = transaction.objectStore(STORE_POSITIONS);
    
    // Clear existing data
    await Promise.all([
        new Promise((resolve) => {
            const clearPlayers = playersStore.clear();
            clearPlayers.onsuccess = () => resolve();
        }),
        new Promise((resolve) => {
            const clearPositions = positionsStore.clear();
            clearPositions.onsuccess = () => resolve();
        })
    ]);
    
    // Import players
    if (data.players) {
        for (const player of data.players) {
            await savePlayer(player);
        }
    }
    
    // Import positions
    if (data.savedPositions) {
        for (const [name, positions] of Object.entries(data.savedPositions)) {
            await savePosition(name, positions);
        }
    }
}

// Check if database has data
export async function hasData() {
    const players = await getAllPlayers();
    const positions = await getAllPositions();
    return players.length > 0 || Object.keys(positions).length > 0;
}
