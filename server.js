// Express server for Volleyball Coach app
// Provides API endpoints to read/write data to data.json file

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files

// Initialize data.json if it doesn't exist
async function ensureDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch (error) {
        // File doesn't exist, create it with empty data
        const initialData = {
            players: [],
            savedPositions: {},
            version: '3.0',
            database: 'file-based'
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('Created initial data.json file');
    }
}

// Read data from file
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data file:', error);
        throw error;
    }
}

// Write data to file
async function writeData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data file:', error);
        throw error;
    }
}

// API Routes

// GET /api/data - Get all data
app.get('/api/data', async (req, res) => {
    try {
        const data = await readData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// GET /api/players - Get all players
app.get('/api/players', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.players || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read players' });
    }
});

// POST /api/players - Add or update a player
app.post('/api/players', async (req, res) => {
    try {
        const data = await readData();
        const player = req.body;
        
        if (!player.id || !player.jersey || !player.name) {
            return res.status(400).json({ error: 'Player must have id, jersey, and name' });
        }
        
        // Check for duplicate jersey numbers (excluding current player)
        const existingPlayer = data.players.find(p => p.jersey === player.jersey && p.id !== player.id);
        if (existingPlayer) {
            return res.status(400).json({ error: 'A player with this jersey number already exists' });
        }
        
        // Update or add player
        const index = data.players.findIndex(p => p.id === player.id);
        if (index >= 0) {
            data.players[index] = player;
        } else {
            data.players.push(player);
        }
        
        await writeData(data);
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save player' });
    }
});

// DELETE /api/players/:id - Delete a player
app.delete('/api/players/:id', async (req, res) => {
    try {
        const data = await readData();
        const playerId = req.params.id;
        
        data.players = data.players.filter(p => p.id !== playerId);
        
        // Remove player from all saved positions
        Object.keys(data.savedPositions || {}).forEach(posName => {
            if (data.savedPositions[posName]) {
                data.savedPositions[posName] = data.savedPositions[posName].filter(
                    pos => pos.playerId !== playerId
                );
            }
        });
        
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete player' });
    }
});

// GET /api/positions - Get all positions
app.get('/api/positions', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.savedPositions || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to read positions' });
    }
});

// POST /api/positions - Save a position
app.post('/api/positions', async (req, res) => {
    try {
        const data = await readData();
        const { positionName, positions } = req.body;
        
        if (!positionName) {
            return res.status(400).json({ error: 'Position name is required' });
        }
        
        if (!data.savedPositions) {
            data.savedPositions = {};
        }
        
        data.savedPositions[positionName] = positions || [];
        
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save position' });
    }
});

// DELETE /api/positions/:name - Delete a position
app.delete('/api/positions/:name', async (req, res) => {
    try {
        const data = await readData();
        const positionName = decodeURIComponent(req.params.name);
        
        if (data.savedPositions && data.savedPositions[positionName]) {
            delete data.savedPositions[positionName];
            await writeData(data);
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete position' });
    }
});

// POST /api/import - Import data (replaces all data)
app.post('/api/import', async (req, res) => {
    try {
        const importedData = req.body;
        
        // Validate structure
        if (!importedData.players || !importedData.savedPositions) {
            return res.status(400).json({ error: 'Invalid data format' });
        }
        
        const data = {
            players: importedData.players || [],
            savedPositions: importedData.savedPositions || {},
            version: '3.0',
            database: 'file-based',
            importDate: new Date().toISOString()
        };
        
        await writeData(data);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// Start server
async function startServer() {
    await ensureDataFile();
    
    app.listen(PORT, () => {
        console.log(`Volleyball Coach server running on http://localhost:${PORT}`);
        console.log(`Data file: ${DATA_FILE}`);
    });
}

startServer().catch(console.error);
