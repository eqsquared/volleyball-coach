// Express server for Volleyball Coach app
// Provides API endpoints to read/write data to data.json file

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR)); // Serve static files from public directory

// Initialize data.json if it doesn't exist
async function ensureDataFile() {
    try {
        await fs.access(DATA_FILE);
        // Check if migration is needed
        await migrateDataIfNeeded();
    } catch (error) {
        // File doesn't exist, create it with empty data
        const initialData = {
            players: [],
            positions: [],
            rotations: [],
            scenarios: [],
            sequences: [],
            version: '4.0',
            database: 'file-based'
        };
        await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
        console.log('Created initial data.json file');
    }
}

// Migrate from old format (v3.0) to new format (v4.0)
async function migrateDataIfNeeded() {
    try {
        const data = await readData();
        
        // Check if already migrated (has positions array)
        if (data.positions && Array.isArray(data.positions)) {
            return; // Already migrated
        }
        
        // Check if old format exists (has savedPositions object)
        if (data.savedPositions && typeof data.savedPositions === 'object' && !Array.isArray(data.savedPositions)) {
            console.log('Migrating data from v3.0 to v4.0...');
            
            // Convert savedPositions object to positions array
            const positions = [];
            const positionNameToId = new Map();
            
            Object.keys(data.savedPositions).forEach((positionName, index) => {
                // Use index to ensure unique IDs even if Date.now() is the same
                const positionId = `pos_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
                positionNameToId.set(positionName, positionId);
                
                positions.push({
                    id: positionId,
                    name: positionName,
                    rotationIds: [],
                    playerPositions: data.savedPositions[positionName] || []
                });
            });
            
            // Create default rotations based on position names that start with "Rotation"
            const rotations = [];
            const rotationMap = new Map();
            
            positions.forEach(position => {
                // Extract rotation name from position name (e.g., "Rotation 1" from "Rotation 1: Serve Receive")
                const rotationMatch = position.name.match(/^(Rotation \d+)/);
                if (rotationMatch) {
                    const rotationName = rotationMatch[1];
                    
                    if (!rotationMap.has(rotationName)) {
                        const rotationId = `rot_${Date.now()}_${rotations.length}_${Math.random().toString(36).substr(2, 9)}`;
                        rotations.push({
                            id: rotationId,
                            name: rotationName,
                            positionIds: []
                        });
                        rotationMap.set(rotationName, rotationId);
                    }
                    
                    const rotationId = rotationMap.get(rotationName);
                    const rotation = rotations.find(r => r.id === rotationId);
                    if (rotation) {
                        rotation.positionIds.push(position.id);
                        position.rotationIds.push(rotationId);
                    }
                }
            });
            
            // Update data structure
            data.positions = positions;
            data.rotations = rotations;
            data.scenarios = [];
            data.sequences = [];
            data.version = '4.0';
            
            // Keep savedPositions for backward compatibility during transition
            // (will be removed in future version)
            
            await writeData(data);
            console.log(`Migration complete: ${positions.length} positions, ${rotations.length} rotations`);
        }
    } catch (error) {
        console.error('Error during migration:', error);
        // Don't throw - allow app to continue
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
        
        // Remove player from all positions
        if (data.positions) {
            data.positions.forEach(position => {
                position.playerPositions = position.playerPositions.filter(
                    pos => pos.playerId !== playerId
                );
            });
        }
        
        // Also handle legacy savedPositions format (for backward compatibility)
        if (data.savedPositions && typeof data.savedPositions === 'object') {
            Object.keys(data.savedPositions).forEach(posName => {
                if (data.savedPositions[posName]) {
                    data.savedPositions[posName] = data.savedPositions[posName].filter(
                        pos => pos.playerId !== playerId
                    );
                }
            });
        }
        
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
        res.json(data.positions || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read positions' });
    }
});

// POST /api/positions - Create or update a position
app.post('/api/positions', async (req, res) => {
    try {
        const data = await readData();
        const position = req.body;
        
        if (!position.id || !position.name) {
            return res.status(400).json({ error: 'Position must have id and name' });
        }
        
        if (!data.positions) {
            data.positions = [];
        }
        
        const index = data.positions.findIndex(p => p.id === position.id);
        if (index >= 0) {
            data.positions[index] = position;
        } else {
            data.positions.push(position);
        }
        
        await writeData(data);
        res.json(position);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save position' });
    }
});

// DELETE /api/positions/:id - Delete a position
app.delete('/api/positions/:id', async (req, res) => {
    try {
        const data = await readData();
        const positionId = req.params.id;
        
        // Remove position from rotations
        if (data.rotations) {
            data.rotations.forEach(rotation => {
                rotation.positionIds = rotation.positionIds.filter(id => id !== positionId);
            });
        }
        
        // Remove position from scenarios
        if (data.scenarios) {
            data.scenarios = data.scenarios.filter(scenario => 
                scenario.startPositionId !== positionId && scenario.endPositionId !== positionId
            );
        }
        
        // Remove position
        if (data.positions) {
            data.positions = data.positions.filter(p => p.id !== positionId);
        }
        
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete position' });
    }
});

// GET /api/rotations - Get all rotations
app.get('/api/rotations', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.rotations || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read rotations' });
    }
});

// POST /api/rotations - Create or update a rotation
app.post('/api/rotations', async (req, res) => {
    try {
        const data = await readData();
        const rotation = req.body;
        
        if (!rotation.id || !rotation.name) {
            return res.status(400).json({ error: 'Rotation must have id and name' });
        }
        
        if (!data.rotations) {
            data.rotations = [];
        }
        
        const index = data.rotations.findIndex(r => r.id === rotation.id);
        if (index >= 0) {
            data.rotations[index] = rotation;
        } else {
            data.rotations.push(rotation);
        }
        
        await writeData(data);
        res.json(rotation);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save rotation' });
    }
});

// DELETE /api/rotations/:id - Delete a rotation
app.delete('/api/rotations/:id', async (req, res) => {
    try {
        const data = await readData();
        const rotationId = req.params.id;
        
        // Remove rotation from positions
        if (data.positions) {
            data.positions.forEach(position => {
                position.rotationIds = position.rotationIds.filter(id => id !== rotationId);
            });
        }
        
        // Remove rotation
        if (data.rotations) {
            data.rotations = data.rotations.filter(r => r.id !== rotationId);
        }
        
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete rotation' });
    }
});

// GET /api/scenarios - Get all scenarios
app.get('/api/scenarios', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.scenarios || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read scenarios' });
    }
});

// POST /api/scenarios - Create or update a scenario
app.post('/api/scenarios', async (req, res) => {
    try {
        const data = await readData();
        const scenario = req.body;
        
        if (!scenario.id || !scenario.name || !scenario.startPositionId || !scenario.endPositionId) {
            return res.status(400).json({ error: 'Scenario must have id, name, startPositionId, and endPositionId' });
        }
        
        if (!data.scenarios) {
            data.scenarios = [];
        }
        
        const index = data.scenarios.findIndex(s => s.id === scenario.id);
        if (index >= 0) {
            data.scenarios[index] = scenario;
        } else {
            data.scenarios.push(scenario);
        }
        
        await writeData(data);
        res.json(scenario);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save scenario' });
    }
});

// DELETE /api/scenarios/:id - Delete a scenario
app.delete('/api/scenarios/:id', async (req, res) => {
    try {
        const data = await readData();
        const scenarioId = req.params.id;
        
        // Remove scenario from sequences
        if (data.sequences) {
            data.sequences.forEach(sequence => {
                sequence.scenarioIds = sequence.scenarioIds.filter(id => id !== scenarioId);
            });
        }
        
        // Remove scenario
        if (data.scenarios) {
            data.scenarios = data.scenarios.filter(s => s.id !== scenarioId);
        }
        
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete scenario' });
    }
});

// GET /api/sequences - Get all sequences
app.get('/api/sequences', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.sequences || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read sequences' });
    }
});

// POST /api/sequences - Create or update a sequence
app.post('/api/sequences', async (req, res) => {
    try {
        const data = await readData();
        const sequence = req.body;
        
        if (!sequence.id || !sequence.name || !Array.isArray(sequence.scenarioIds)) {
            return res.status(400).json({ error: 'Sequence must have id, name, and scenarioIds array' });
        }
        
        if (!data.sequences) {
            data.sequences = [];
        }
        
        const index = data.sequences.findIndex(s => s.id === sequence.id);
        if (index >= 0) {
            data.sequences[index] = sequence;
        } else {
            data.sequences.push(sequence);
        }
        
        await writeData(data);
        res.json(sequence);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save sequence' });
    }
});

// DELETE /api/sequences/:id - Delete a sequence
app.delete('/api/sequences/:id', async (req, res) => {
    try {
        const data = await readData();
        const sequenceId = req.params.id;
        
        if (data.sequences) {
            data.sequences = data.sequences.filter(s => s.id !== sequenceId);
        }
        
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete sequence' });
    }
});

// POST /api/import - Import data (replaces all data)
app.post('/api/import', async (req, res) => {
    try {
        const importedData = req.body;
        
        // Validate structure - support both old and new formats
        if (!importedData.players) {
            return res.status(400).json({ error: 'Invalid data format: players required' });
        }
        
        let data;
        
        // Check if it's new format (v4.0)
        if (importedData.positions && Array.isArray(importedData.positions)) {
            data = {
                players: importedData.players || [],
                positions: importedData.positions || [],
                rotations: importedData.rotations || [],
                scenarios: importedData.scenarios || [],
                sequences: importedData.sequences || [],
                version: '4.0',
                database: 'file-based',
                importDate: new Date().toISOString()
            };
        } else {
            // Old format (v3.0) - will be migrated on next read
            data = {
                players: importedData.players || [],
                savedPositions: importedData.savedPositions || {},
                version: '3.0',
                database: 'file-based',
                importDate: new Date().toISOString()
            };
        }
        
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
