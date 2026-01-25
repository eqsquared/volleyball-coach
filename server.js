// Express server for Volleyball Coach app
// Provides API endpoints to read/write data to MongoDB database
// Now supports user authentication and user-scoped data

// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');
const auth = require('./auth');
const { authenticate } = require('./middleware');

const app = express();
const PORT = process.env.PORT || 8000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR)); // Serve static files from public directory

// Read data from MongoDB for a user
async function readData(userId) {
    return await db.readData(userId);
}

// Write data to MongoDB for a user
async function writeData(userId, data) {
    return await db.writeData(userId, data);
}

// ==================== Authentication Routes ====================

// Health check endpoint (for debugging)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// POST /api/auth/register - Register a new user
app.post('/api/auth/register', async (req, res) => {
    console.log('Registration endpoint hit');
    try {
        const { firstName, lastName, email, password, role } = req.body;
        
        // Validate required fields
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ 
                error: 'All fields are required: firstName, lastName, email, password, role' 
            });
        }
        
        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ 
                error: 'Password must be at least 6 characters long' 
            });
        }
        
        // Create user
        const user = await db.createUser({ firstName, lastName, email, role });
        
        // Hash and save password
        const hashedPassword = await auth.hashPassword(password);
        await db.saveUserCredentials(user.id, hashedPassword);
        
        // Generate token
        const token = auth.generateToken(user.id, user.email);
        
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        if (error.message.includes('Invalid role')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// POST /api/auth/login - Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                error: 'Email and password are required' 
            });
        }
        
        // Get user by email
        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Get credentials
        const credentials = await db.getUserCredentials(user.id);
        if (!credentials) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Verify password
        const passwordMatch = await auth.comparePassword(password, credentials.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Generate token
        const token = auth.generateToken(user.id, user.email);
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// GET /api/auth/me - Get current user info (requires authentication)
app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
        const user = await db.getUserById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            teamCode: user.teamCode || null,
            playerViewEnabled: user.playerViewEnabled || false
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// PUT /api/auth/profile - Update user profile (requires authentication)
app.put('/api/auth/profile', authenticate, async (req, res) => {
    try {
        const { firstName, lastName, currentPassword, newPassword, playerViewEnabled } = req.body;
        const userId = req.user.userId;
        
        // Get current user
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update name if provided
        if (firstName !== undefined || lastName !== undefined) {
            const updates = {};
            if (firstName !== undefined) updates.firstName = firstName;
            if (lastName !== undefined) updates.lastName = lastName;
            updates.updatedAt = new Date().toISOString();
            
            // Update user in database
            const database = await db.connect();
            const { ObjectId } = require('mongodb');
            const usersCollection = database.collection('users');
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { $set: updates }
            );
        }
        
        // Update password if provided
        if (newPassword && currentPassword) {
            // Verify current password
            const credentials = await db.getUserCredentials(userId);
            if (!credentials || !credentials.passwordHash) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            
            const isValid = await auth.comparePassword(currentPassword, credentials.passwordHash);
            if (!isValid) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }
            
            // Hash and save new password
            const hashedPassword = await auth.hashPassword(newPassword);
            await db.saveUserCredentials(userId, hashedPassword);
        }
        
        // Update team code if player view enabled/disabled
        // Only generate a new code if enabling for the first time (user doesn't already have one)
        let teamCode = null;
        if (playerViewEnabled !== undefined) {
            try {
                // Check if user already has player view enabled and a team code
                const currentUser = await db.getUserById(userId);
                const alreadyEnabled = currentUser.playerViewEnabled === true;
                const hasExistingCode = currentUser.teamCode && currentUser.teamCode.length > 0;
                
                // Only update if the state is actually changing
                if (playerViewEnabled !== alreadyEnabled) {
                    teamCode = await db.updateUserTeamCode(userId, playerViewEnabled);
                } else if (playerViewEnabled && hasExistingCode) {
                    // Player view is already enabled and user has a code - keep the existing code
                    teamCode = currentUser.teamCode;
                }
            } catch (error) {
                console.error('Error updating team code:', error);
                return res.status(500).json({ error: 'Failed to update team code: ' + error.message });
            }
        }
        
        // Return updated user
        const updatedUser = await db.getUserById(userId);
        res.json({
            id: updatedUser.id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            role: updatedUser.role,
            teamCode: updatedUser.teamCode || null,
            playerViewEnabled: updatedUser.playerViewEnabled || false
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// GET /api/view/:teamCode - Get user data by team code (read-only, no authentication required)
app.get('/api/view/:teamCode', async (req, res) => {
    try {
        const teamCode = req.params.teamCode.toUpperCase();
        
        // Get user by team code
        const user = await db.getUserByTeamCode(teamCode);
        if (!user) {
            return res.status(404).json({ error: 'Invalid team code' });
        }
        
        // Check if player view is enabled (handle missing field for existing users)
        if (!user.playerViewEnabled && user.playerViewEnabled !== true) {
            return res.status(403).json({ error: 'Player view is not enabled for this team' });
        }
        
        // Get user's data (read-only)
        const data = await readData(user.id);
        
        // Return data with user info (but no sensitive data)
        res.json({
            teamName: `${user.firstName} ${user.lastName}`,
            data: data
        });
    } catch (error) {
        console.error('Get view data error:', error);
        res.status(500).json({ error: 'Failed to get view data' });
    }
});

// API Routes (all require authentication)

// GET /api/data - Get all data (requires authentication)
app.get('/api/data', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read data' });
    }
});

// GET /api/players - Get all players (requires authentication)
app.get('/api/players', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
        res.json(data.players || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read players' });
    }
});

// POST /api/players - Add or update a player (requires authentication)
app.post('/api/players', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
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
        
        await writeData(req.user.userId, data);
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save player' });
    }
});

// DELETE /api/players/:id - Delete a player (requires authentication)
app.delete('/api/players/:id', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
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
        
        await writeData(req.user.userId, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete player' });
    }
});

// GET /api/positions - Get all positions (requires authentication)
app.get('/api/positions', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
        res.json(data.positions || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read positions' });
    }
});

// POST /api/positions - Create or update a position (requires authentication)
app.post('/api/positions', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
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
        
        await writeData(req.user.userId, data);
        res.json(position);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save position' });
    }
});

// DELETE /api/positions/:id - Delete a position (requires authentication)
app.delete('/api/positions/:id', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
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
        
        await writeData(req.user.userId, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete position' });
    }
});

// GET /api/rotations - Get all rotations (requires authentication)
app.get('/api/rotations', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
        res.json(data.rotations || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read rotations' });
    }
});

// POST /api/rotations - Create or update a rotation (requires authentication)
app.post('/api/rotations', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
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
        
        await writeData(req.user.userId, data);
        res.json(rotation);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save rotation' });
    }
});

// DELETE /api/rotations/:id - Delete a rotation (requires authentication)
app.delete('/api/rotations/:id', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
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
        
        await writeData(req.user.userId, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete rotation' });
    }
});

// GET /api/scenarios - Get all scenarios (requires authentication)
app.get('/api/scenarios', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
        res.json(data.scenarios || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read scenarios' });
    }
});

// POST /api/scenarios - Create or update a scenario (requires authentication)
app.post('/api/scenarios', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
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
        
        await writeData(req.user.userId, data);
        res.json(scenario);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save scenario' });
    }
});

// DELETE /api/scenarios/:id - Delete a scenario (requires authentication)
app.delete('/api/scenarios/:id', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
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
        
        await writeData(req.user.userId, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete scenario' });
    }
});

// GET /api/sequences - Get all sequences (requires authentication)
app.get('/api/sequences', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
        res.json(data.sequences || []);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read sequences' });
    }
});

// POST /api/sequences - Create or update a sequence (requires authentication)
app.post('/api/sequences', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
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
        
        await writeData(req.user.userId, data);
        res.json(sequence);
    } catch (error) {
        res.status(500).json({ error: 'Failed to save sequence' });
    }
});

// DELETE /api/sequences/:id - Delete a sequence (requires authentication)
app.delete('/api/sequences/:id', authenticate, async (req, res) => {
    try {
        const data = await readData(req.user.userId);
        const sequenceId = req.params.id;
        
        if (data.sequences) {
            data.sequences = data.sequences.filter(s => s.id !== sequenceId);
        }
        
        await writeData(req.user.userId, data);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete sequence' });
    }
});

// POST /api/import - Import data (replaces all data) (requires authentication)
app.post('/api/import', authenticate, async (req, res) => {
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
        
        await writeData(req.user.userId, data);
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
