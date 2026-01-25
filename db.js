// MongoDB database module for Volleyball Coach app
// Provides database operations for players, positions, rotations, scenarios, and sequences
// Now supports user accounts with user-scoped data

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'volleyball-coach';
const COLLECTION_NAME = 'data';
const USERS_COLLECTION = 'users';
const CREDENTIALS_COLLECTION = 'userCredentials';

let client = null;
let db = null;

// Connect to MongoDB
async function connect() {
    if (db) {
        return db;
    }

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
    }

    try {
        // Connection options for better reliability
        const options = {
            serverSelectionTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 45000, // 45 seconds
            connectTimeoutMS: 10000, // 10 seconds
            retryWrites: true,
            retryReads: true,
        };

        client = new MongoClient(MONGODB_URI, options);
        await client.connect();
        
        // Test the connection
        await client.db('admin').command({ ping: 1 });
        
        db = client.db(DB_NAME);
        console.log(`Connected to MongoDB: ${DB_NAME}`);
        
        // Ensure indexes exist
        const dataCollection = db.collection(COLLECTION_NAME);
        await dataCollection.createIndex({ _id: 1 });
        await dataCollection.createIndex({ userId: 1 }); // Index for user-scoped queries
        
        // User collection indexes
        const usersCollection = db.collection(USERS_COLLECTION);
        await usersCollection.createIndex({ email: 1 }, { unique: true });
        await usersCollection.createIndex({ _id: 1 });
        
        // Credentials collection indexes
        const credentialsCollection = db.collection(CREDENTIALS_COLLECTION);
        await credentialsCollection.createIndex({ userId: 1 }, { unique: true });
        
        return db;
    } catch (error) {
        // Provide helpful error messages
        if (error.message && error.message.includes('ECONNRESET')) {
            console.error('❌ MongoDB Connection Error: Network access denied');
            console.error('   This usually means your server IP is not whitelisted in MongoDB Atlas.');
            console.error('   Solution: Go to MongoDB Atlas → Network Access → Add IP Address');
            console.error('   For production, you can allow all IPs: 0.0.0.0/0');
        } else if (error.message && error.message.includes('authentication failed')) {
            console.error('❌ MongoDB Authentication Error: Invalid username or password');
            console.error('   Check your MONGODB_URI connection string credentials.');
        } else if (error.message && error.message.includes('ENOTFOUND')) {
            console.error('❌ MongoDB Connection Error: Cannot resolve hostname');
            console.error('   Check your MONGODB_URI connection string is correct.');
        }
        console.error('Full error:', error.message);
        throw error;
    }
}

// Get the data document for a specific user
async function getDataDocument(userId) {
    if (!userId) {
        throw new Error('UserId is required');
    }
    
    const database = await connect();
    const collection = database.collection(COLLECTION_NAME);
    
    let doc = await collection.findOne({ userId: userId });
    
    if (!doc) {
        // Initialize with empty data for this user
        const initialData = {
            userId: userId,
            players: [],
            positions: [],
            rotations: [],
            scenarios: [],
            sequences: [],
            version: '4.0',
            database: 'mongodb',
            createdAt: new Date().toISOString()
        };
        await collection.insertOne(initialData);
        return initialData;
    }
    
    // Remove _id from the returned data (we don't want to expose it)
    const { _id, ...data } = doc;
    return data;
}

// Save the data document for a specific user
async function saveDataDocument(userId, data) {
    if (!userId) {
        throw new Error('UserId is required');
    }
    
    const database = await connect();
    const collection = database.collection(COLLECTION_NAME);
    
    const document = {
        userId: userId,
        ...data,
        database: 'mongodb',
        lastUpdated: new Date().toISOString()
    };
    
    await collection.replaceOne({ userId: userId }, document, { upsert: true });
    return true;
}

// Read all data for a user
async function readData(userId) {
    try {
        return await getDataDocument(userId);
    } catch (error) {
        console.error('Error reading data from MongoDB:', error);
        throw error;
    }
}

// Write all data for a user
async function writeData(userId, data) {
    try {
        await saveDataDocument(userId, data);
        return true;
    } catch (error) {
        console.error('Error writing data to MongoDB:', error);
        throw error;
    }
}

// ==================== User Management ====================

/**
 * Create a new user
 * @param {object} userData - User data: { firstName, lastName, email, role }
 * @returns {Promise<object>} - Created user (without password)
 */
async function createUser(userData) {
    const database = await connect();
    const usersCollection = database.collection(USERS_COLLECTION);
    
    const { firstName, lastName, email, role } = userData;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !role) {
        throw new Error('All fields (firstName, lastName, email, role) are required');
    }
    
    // Validate role
    const validRoles = ['coach', 'assistant coach', 'player'];
    if (!validRoles.includes(role.toLowerCase())) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        throw new Error('User with this email already exists');
    }
    
    const user = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        role: role.toLowerCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    const result = await usersCollection.insertOne(user);
    const { _id, ...userWithoutId } = user;
    return {
        id: result.insertedId.toString(),
        ...userWithoutId
    };
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<object|null>} - User object or null
 */
async function getUserByEmail(email) {
    const database = await connect();
    const usersCollection = database.collection(USERS_COLLECTION);
    
    const user = await usersCollection.findOne({ email: email.toLowerCase() });
    if (!user) return null;
    
    const { _id, ...userWithoutId } = user;
    return {
        id: _id.toString(),
        ...userWithoutId
    };
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} - User object or null
 */
async function getUserById(userId) {
    const database = await connect();
    const usersCollection = database.collection(USERS_COLLECTION);
    
    try {
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) return null;
        
        const { _id, ...userWithoutId } = user;
        return {
            id: _id.toString(),
            ...userWithoutId
        };
    } catch (error) {
        if (error.message && error.message.includes('ObjectId')) {
            return null;
        }
        throw error;
    }
}

/**
 * Save user credentials (hashed password)
 * @param {string} userId - User ID
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>}
 */
async function saveUserCredentials(userId, hashedPassword) {
    const database = await connect();
    const credentialsCollection = database.collection(CREDENTIALS_COLLECTION);
    
    await credentialsCollection.replaceOne(
        { userId: userId },
        {
            userId: userId,
            passwordHash: hashedPassword,
            updatedAt: new Date().toISOString()
        },
        { upsert: true }
    );
    
    return true;
}

/**
 * Get user credentials by user ID
 * @param {string} userId - User ID
 * @returns {Promise<object|null>} - Credentials object with passwordHash or null
 */
async function getUserCredentials(userId) {
    const database = await connect();
    const credentialsCollection = database.collection(CREDENTIALS_COLLECTION);
    
    return await credentialsCollection.findOne({ userId: userId });
}

/**
 * Generate a random team code
 * @returns {string} - Random 6-character alphanumeric code
 */
function generateTeamCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters (0, O, I, 1)
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Get user by team code
 * @param {string} teamCode - Team code
 * @returns {Promise<object|null>} - User object or null
 */
async function getUserByTeamCode(teamCode) {
    const database = await connect();
    const usersCollection = database.collection(USERS_COLLECTION);
    
    const user = await usersCollection.findOne({ teamCode: teamCode.toUpperCase() });
    if (!user) return null;
    
    const { _id, ...userWithoutId } = user;
    return {
        id: _id.toString(),
        ...userWithoutId
    };
}

/**
 * Update user's team code
 * @param {string} userId - User ID
 * @param {boolean} enabled - Whether player view is enabled
 * @returns {Promise<string|null>} - Team code if enabled, null if disabled
 */
async function updateUserTeamCode(userId, enabled) {
    const database = await connect();
    const usersCollection = database.collection(USERS_COLLECTION);
    
    if (enabled) {
        // Check if user already has a team code - preserve it if it exists
        const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (existingUser && existingUser.teamCode && existingUser.teamCode.length > 0) {
            // User already has a code, just ensure playerViewEnabled is true
            await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $set: { 
                        playerViewEnabled: true,
                        updatedAt: new Date().toISOString()
                    }
                }
            );
            return existingUser.teamCode;
        }
        
        // Generate a new team code only if one doesn't exist
        let teamCode;
        let attempts = 0;
        do {
            teamCode = generateTeamCode();
            const existing = await usersCollection.findOne({ teamCode: teamCode });
            if (!existing) break;
            attempts++;
            if (attempts > 10) {
                throw new Error('Failed to generate unique team code');
            }
        } while (true);
        
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { 
                $set: { 
                    teamCode: teamCode,
                    playerViewEnabled: true,
                    updatedAt: new Date().toISOString()
                }
            }
        );
        
        return teamCode;
    } else {
        // Disable player view
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { 
                $set: { 
                    playerViewEnabled: false,
                    updatedAt: new Date().toISOString()
                },
                $unset: { teamCode: '' }
            }
        );
        
        return null;
    }
}

// Migrate from old format (v3.0) to new format (v4.0) - Legacy support
// Note: This is for migrating old single-document data to user-scoped data
// In production, you'd want to assign old data to a default user or migrate it properly
async function migrateDataIfNeeded() {
    try {
        const database = await connect();
        const collection = database.collection(COLLECTION_NAME);
        
        // Check for old format (single document with _id: 'main')
        const oldDoc = await collection.findOne({ _id: 'main' });
        
        if (oldDoc) {
            console.log('Found legacy data format. Note: Legacy data will need to be migrated to a user account.');
            console.log('To migrate, create a user account and import the data manually, or implement a migration script.');
            // We don't auto-migrate here to avoid data loss - admin should handle this
        }
        
        // Check for any user data that needs format migration
        const userDocs = await collection.find({ userId: { $exists: true } }).toArray();
        
        for (const doc of userDocs) {
            // Check if already migrated (has positions array)
            if (doc.positions && Array.isArray(doc.positions)) {
                continue; // Already migrated
            }
            
            // Check if old format exists (has savedPositions object)
            if (doc.savedPositions && typeof doc.savedPositions === 'object' && !Array.isArray(doc.savedPositions)) {
                console.log(`Migrating data for user ${doc.userId} from v3.0 to v4.0...`);
                
                // Convert savedPositions object to positions array
                const positions = [];
                const positionNameToId = new Map();
                
                Object.keys(doc.savedPositions).forEach((positionName, index) => {
                    const positionId = `pos_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
                    positionNameToId.set(positionName, positionId);
                    
                    positions.push({
                        id: positionId,
                        name: positionName,
                        rotationIds: [],
                        playerPositions: doc.savedPositions[positionName] || []
                    });
                });
                
                // Create default rotations based on position names that start with "Rotation"
                const rotations = [];
                const rotationMap = new Map();
                
                positions.forEach(position => {
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
                const updatedData = {
                    ...doc,
                    positions: positions,
                    rotations: rotations,
                    scenarios: doc.scenarios || [],
                    sequences: doc.sequences || [],
                    version: '4.0',
                    lastUpdated: new Date().toISOString()
                };
                
                await collection.replaceOne({ userId: doc.userId }, updatedData);
                console.log(`Migration complete for user ${doc.userId}: ${positions.length} positions, ${rotations.length} rotations`);
            }
        }
    } catch (error) {
        console.error('Error during migration:', error);
        // Don't throw - allow app to continue
    }
}

// Initialize database connection and run migrations
async function initialize() {
    try {
        await connect();
        await migrateDataIfNeeded();
        console.log('Database initialized');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Close database connection
async function close() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('MongoDB connection closed');
    }
}

module.exports = {
    connect,
    readData,
    writeData,
    initialize,
    close,
    migrateDataIfNeeded,
    // User management
    createUser,
    getUserByEmail,
    getUserById,
    saveUserCredentials,
    getUserCredentials,
    // Team code management
    getUserByTeamCode,
    updateUserTeamCode
};
