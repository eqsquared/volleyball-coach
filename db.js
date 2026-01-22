// MongoDB database module for Volleyball Coach app
// Provides database operations for players, positions, rotations, scenarios, and sequences

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME || 'volleyball-coach';
const COLLECTION_NAME = 'data';

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
        const collection = db.collection(COLLECTION_NAME);
        await collection.createIndex({ _id: 1 });
        
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

// Get the data document (single document storage)
async function getDataDocument() {
    const database = await connect();
    const collection = database.collection(COLLECTION_NAME);
    
    let doc = await collection.findOne({ _id: 'main' });
    
    if (!doc) {
        // Initialize with empty data
        const initialData = {
            _id: 'main',
            players: [],
            positions: [],
            rotations: [],
            scenarios: [],
            sequences: [],
            version: '4.0',
            database: 'mongodb'
        };
        await collection.insertOne(initialData);
        return initialData;
    }
    
    // Remove _id from the returned data (we don't want to expose it)
    const { _id, ...data } = doc;
    return data;
}

// Save the data document
async function saveDataDocument(data) {
    const database = await connect();
    const collection = database.collection(COLLECTION_NAME);
    
    const document = {
        _id: 'main',
        ...data,
        database: 'mongodb',
        lastUpdated: new Date().toISOString()
    };
    
    await collection.replaceOne({ _id: 'main' }, document, { upsert: true });
    return true;
}

// Read all data
async function readData() {
    try {
        return await getDataDocument();
    } catch (error) {
        console.error('Error reading data from MongoDB:', error);
        throw error;
    }
}

// Write all data
async function writeData(data) {
    try {
        await saveDataDocument(data);
        return true;
    } catch (error) {
        console.error('Error writing data to MongoDB:', error);
        throw error;
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
            data.scenarios = data.scenarios || [];
            data.sequences = data.sequences || [];
            data.version = '4.0';
            
            await writeData(data);
            console.log(`Migration complete: ${positions.length} positions, ${rotations.length} rotations`);
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
    migrateDataIfNeeded
};
