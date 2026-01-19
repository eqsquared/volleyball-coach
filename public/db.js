// API-based Database Manager for Volleyball Coach
// Provides file-based storage via backend API

const API_BASE = '/api';

// Initialize database (no-op for API-based storage)
export async function initDB() {
    // Check if server is available
    try {
        const response = await fetch(`${API_BASE}/data`);
        if (!response.ok) {
            throw new Error('Server not available');
        }
        return true;
    } catch (error) {
        console.error('Error connecting to server:', error);
        throw new Error('Cannot connect to server. Please make sure the server is running.');
    }
}

// Get all players
export async function getAllPlayers() {
    try {
        const response = await fetch(`${API_BASE}/players`);
        if (!response.ok) {
            throw new Error('Failed to fetch players');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching players:', error);
        throw error;
    }
}

// Add or update player
export async function savePlayer(player) {
    try {
        const response = await fetch(`${API_BASE}/players`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(player)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to save player');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving player:', error);
        throw error;
    }
}

// Delete player
export async function deletePlayer(playerId) {
    try {
        const response = await fetch(`${API_BASE}/players/${playerId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete player');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error deleting player:', error);
        throw error;
    }
}

// Get all saved positions
export async function getAllPositions() {
    try {
        const response = await fetch(`${API_BASE}/positions`);
        if (!response.ok) {
            throw new Error('Failed to fetch positions');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching positions:', error);
        throw error;
    }
}

// Save position
export async function savePosition(positionName, positions) {
    try {
        const response = await fetch(`${API_BASE}/positions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                positionName: positionName,
                positions: positions
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save position');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error saving position:', error);
        throw error;
    }
}

// Delete position
export async function deletePosition(positionName) {
    try {
        const encodedName = encodeURIComponent(positionName);
        const response = await fetch(`${API_BASE}/positions/${encodedName}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete position');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error deleting position:', error);
        throw error;
    }
}

// Export all data for backup
export async function exportAllData() {
    try {
        const response = await fetch(`${API_BASE}/data`);
        if (!response.ok) {
            throw new Error('Failed to export data');
        }
        const data = await response.json();
        return {
            ...data,
            exportDate: new Date().toISOString(),
            version: '3.0',
            database: 'file-based'
        };
    } catch (error) {
        console.error('Error exporting data:', error);
        throw error;
    }
}

// Import data (for migration/restore)
export async function importData(data) {
    try {
        const response = await fetch(`${API_BASE}/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to import data');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error importing data:', error);
        throw error;
    }
}

// Check if database has data
export async function hasData() {
    try {
        const data = await exportAllData();
        return (data.players?.length > 0 || Object.keys(data.savedPositions || {}).length > 0);
    } catch (error) {
        console.error('Error checking data:', error);
        return false;
    }
}
