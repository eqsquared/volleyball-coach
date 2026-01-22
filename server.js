// Express server for Volleyball Coach app
// Provides API endpoints to read/write data to MongoDB database

const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 8000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR)); // Serve static files from public directory

// Read data from MongoDB
async function readData() {
    return await db.readData();
}

// Write data to MongoDB
async function writeData(data) {
    return await db.writeData(data);
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
        
        // Remove position from sequences (new format)
        if (data.sequences) {
            data.sequences.forEach(sequence => {
                if (sequence.items) {
                    sequence.items = sequence.items.filter(item => 
                        !(item.type === 'position' && item.id === positionId)
                    );
                }
            });
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
        
        // Remove scenario from sequences (both old and new format)
        if (data.sequences) {
            data.sequences.forEach(sequence => {
                // Old format
                if (sequence.scenarioIds) {
                    sequence.scenarioIds = sequence.scenarioIds.filter(id => id !== scenarioId);
                }
                // New format
                if (sequence.items) {
                    sequence.items = sequence.items.filter(item => 
                        !(item.type === 'scenario' && item.id === scenarioId)
                    );
                }
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
        
        if (!sequence.id || !sequence.name) {
            return res.status(400).json({ error: 'Sequence must have id and name' });
        }
        
        // Support both old format (scenarioIds) and new format (items)
        // If old format, migrate to new format
        if (sequence.scenarioIds && !sequence.items) {
            sequence.items = sequence.scenarioIds.map(id => ({
                type: 'scenario',
                id: id
            }));
            // Keep scenarioIds for backward compatibility during transition
        }
        
        // Ensure items array exists (default to empty)
        if (!sequence.items) {
            sequence.items = [];
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
                database: 'mongodb',
                importDate: new Date().toISOString()
            };
        } else {
            // Old format (v3.0) - will be migrated on next read
            data = {
                players: importedData.players || [],
                savedPositions: importedData.savedPositions || {},
                version: '3.0',
                database: 'mongodb',
                importDate: new Date().toISOString()
            };
        }
        
        await writeData(data);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to import data' });
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await db.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nShutting down gracefully...');
    await db.close();
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        await db.initialize();
        
        app.listen(PORT, () => {
            console.log(`Volleyball Coach server running on http://localhost:${PORT}`);
            console.log(`Database: MongoDB`);
            if (process.env.MONGODB_URI || process.env.MONGO_URI) {
                console.log(`MongoDB URI: ${(process.env.MONGODB_URI || process.env.MONGO_URI).substring(0, 20)}...`);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer().catch(console.error);
