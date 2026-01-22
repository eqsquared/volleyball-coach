# Migration Guide: File-Based to MongoDB

This guide helps you migrate from file-based storage (`data/data.json`) to MongoDB.

## Quick Migration Steps

### Option 1: Automatic Migration (Recommended)

If you have existing data in `data/data.json`, the app will automatically migrate it on first startup:

1. **Export your current data** (as a backup):
   - Open your app
   - Click "Export JSON" to download a backup
   - Save this file safely

2. **Set up MongoDB Atlas** (see DEPLOYMENT.md for detailed instructions)
   - Create a free MongoDB Atlas cluster
   - Get your connection string
   - Set `MONGODB_URI` environment variable

3. **Deploy with MongoDB**:
   - The app will automatically create the database structure
   - If you have a local `data/data.json` file, you can import it using the app's import feature

### Option 2: Manual Migration Script

If you want to migrate data manually, you can use this script:

```javascript
// migrate-to-mongodb.js
const fs = require('fs');
const { MongoClient } = require('mongodb');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

async function migrate() {
    if (!MONGODB_URI) {
        console.error('MONGODB_URI environment variable is required');
        process.exit(1);
    }

    // Read existing data file
    let fileData;
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        fileData = JSON.parse(fileContent);
        console.log('✓ Read data from data.json');
    } catch (error) {
        console.error('Error reading data.json:', error);
        process.exit(1);
    }

    // Connect to MongoDB
    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        console.log('✓ Connected to MongoDB');

        const db = client.db('volleyball-coach');
        const collection = db.collection('data');

        // Prepare data for MongoDB
        const mongoData = {
            _id: 'main',
            ...fileData,
            database: 'mongodb',
            migratedAt: new Date().toISOString()
        };

        // Insert or replace
        await collection.replaceOne({ _id: 'main' }, mongoData, { upsert: true });
        console.log('✓ Data migrated to MongoDB successfully!');

    } catch (error) {
        console.error('Error migrating to MongoDB:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

migrate();
```

**To run the migration script:**
```bash
# Set your MongoDB URI
export MONGODB_URI="your-mongodb-connection-string"

# Run the migration
node migrate-to-mongodb.js
```

### Option 3: Import via App UI

1. **Export your data** from the old file-based version:
   - Open your app (if still running with file-based storage)
   - Click "Export JSON"
   - Save the file

2. **Deploy with MongoDB**:
   - Set up MongoDB Atlas
   - Deploy your app with `MONGODB_URI` set

3. **Import the data**:
   - Open your new MongoDB-backed app
   - Click "Import File"
   - Select the JSON file you exported
   - Data will be imported into MongoDB

## What Changed?

- **Storage**: From `data/data.json` file → MongoDB database
- **Persistence**: Data now persists across all deployments and rebuilds
- **API**: No changes - all API endpoints work the same
- **Frontend**: No changes needed - works exactly the same

## Benefits

✅ **Data persists across deployments** - No more data loss on Railway rebuilds  
✅ **Scalable** - Easy to scale and backup  
✅ **Reliable** - Database is independent of server restarts  
✅ **Free tier available** - MongoDB Atlas M0 is free forever  

## Troubleshooting

### "MONGODB_URI not set" error
- Make sure you've set the `MONGODB_URI` environment variable
- Check your hosting platform's environment variables section
- Verify the connection string is correct

### "Cannot connect to MongoDB" error
- Check MongoDB Atlas cluster is running (not paused)
- Verify network access allows your IP (or 0.0.0.0/0 for production)
- Check database user credentials are correct
- Ensure connection string includes the database name

### Data not appearing after migration
- Check MongoDB Atlas to verify data was inserted
- Use MongoDB Compass or Atlas UI to view your database
- Verify the collection name is `data` and document `_id` is `main`
