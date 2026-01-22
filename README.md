# Volleyball Coach - Position Training App

A web-based volleyball coaching tool designed to help new players visualize court positions and rotations. This interactive application allows coaches to set lineups, position players on the court, save formations, and animate transitions between positions.

## Features

### 🏐 Court Visualization
- **Half-court display**: 30' x 30' square court with birch/tan background
- **Net visualization**: Horizontal net at the top of the court
- **10ft attack line**: Positioned 1/3 down from the net
- **Player markers**: Circular indicators with jersey numbers and player names

### 👥 Lineup Management
- Add players with jersey number and name
- Compact sidebar design for easy lineup management
- Drag and drop players from lineup onto the court
- Delete players from the lineup

### 📍 Position Management
- **Save positions**: Save current court formations with custom names (e.g., "Base", "Serve Receive")
- **Load positions**: Quickly load saved formations
- **Overwrite positions**: Update existing saved positions with current court layout
- **Delete positions**: Remove saved formations
- **Multiple saved positions**: Store unlimited formations for different scenarios

### 🎬 Animation System
- **Position transitions**: Animate players from one saved position to another
- **Start/End selection**: Choose start and end positions from dropdown menus
- **Smooth animations**: 1-second transitions between positions
- **Reset to start**: Refresh button to return to the start position after animation

### 💾 Data Persistence
- **MongoDB database**: All data is automatically saved to MongoDB database
- **Automatic saving**: Every change (add player, save position, etc.) is immediately saved to the database
- **No data loss**: Data persists permanently across all deployments and server restarts
- **Automatic migration**: Seamlessly migrates from legacy XML files on first load
- **Import/Export**: Import and export data in JSON or XML format for backup
- **Server-based**: Requires Node.js server to run (included in npm start)

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (comes with Node.js)
- A modern web browser (Chrome, Edge, Firefox, or Safari)

### Installation & Running

**Important**: This app uses ES6 modules and must be served over HTTP (not opened as a file).

1. **Navigate to the project directory** in your terminal:
   ```bash
   cd volleyball-coach
   ```

2. **Set up MongoDB** (required):
   - Create a free MongoDB Atlas account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Create a cluster (M0 Free tier works great)
   - Get your connection string (see [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup)
   - Set environment variable: `export MONGODB_URI="your-connection-string"`

3. **Install dependencies and start the server**:
   ```bash
   npm install
   npm start
   ```
   This will:
   - Start the Express server on http://localhost:8000 (or the port specified by `PORT` environment variable)
   - Connect to MongoDB and initialize the database
   - Serve the application and handle all data persistence
   - All changes are automatically saved to MongoDB

4. **Open your browser**:
   - Navigate to http://localhost:8000
   - The app will load and automatically save all changes to MongoDB

### Deployment

For instructions on deploying this application to production, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

The app is ready to deploy to platforms like:
- Railway (recommended - great MongoDB integration)
- Render
- Heroku
- DigitalOcean App Platform
- Self-hosted VPS

**Note**: All platforms require MongoDB Atlas (free tier available). See [DEPLOYMENT.md](DEPLOYMENT.md) for setup instructions.

### First Time Setup

1. **Automatic data migration** (if upgrading):
   - If you have existing `data.xml` file in the `public/` directory, it will automatically migrate to MongoDB on first load
   - If you have existing `data/data.json` file, you can import it using the app's import feature
   - No action required - your data is preserved!

2. **Add players**:
   - Enter jersey number and player name
   - Click "Add Player" or press Enter
   - Players appear in the lineup sidebar

3. **Position players on court**:
   - Drag players from the lineup onto the court
   - Reposition by dragging players on the court
   - Players show jersey number and name

4. **Save positions**:
   - Arrange players on the court
   - Enter a position name (e.g., "Base", "Serve Receive")
   - Click "Save Position"

5. **Animate transitions**:
   - Select a "Start Position" from the dropdown
   - Select an "End Position" from the dropdown
   - Click "Play Animation" to see the transition
   - Use "Reset to Start" to return to the start position

## File Structure

```
volleyball-coach/
├── public/             # Frontend files (served as static files)
│   ├── index.html      # Main HTML structure
│   ├── styles.css      # All styling and layout
│   ├── app.js          # Application logic and functionality
│   ├── db.js           # API-based database module
│   └── data.xml        # Legacy XML file (optional, for migration)
├── data/               # Legacy data storage (optional, for migration)
│   └── data.json       # Legacy data file (optional)
├── server.js           # Express server with MongoDB integration
├── db.js               # MongoDB database module
├── package.json        # Node.js dependencies and scripts
├── .gitignore         # Git ignore rules
├── DEPLOYMENT.md       # Deployment guide with MongoDB setup
├── MIGRATION.md        # Migration guide from file-based to MongoDB
└── README.md           # This file
```

**Note**: Data is automatically saved to MongoDB database. All changes are persisted immediately - no need to export! Data persists across all deployments and server restarts.

## Usage Guide

### Adding Players
1. Enter jersey number (1-99)
2. Enter player name
3. Click "Add Player" or press Enter
4. Player appears in the lineup sidebar

### Positioning Players
- **From lineup to court**: Drag a player from the sidebar onto the court
- **Repositioning**: Drag players already on the court to new positions
- Players are constrained to the court boundaries (below net, above bottom line)

### Saving Positions
1. Arrange players on the court in the desired formation
2. Enter a descriptive name in the "Position name" field
3. Click "Save Position"
4. The position appears in the "Saved Positions" list

### Overwriting Positions
1. Load or create the position you want to update
2. Move players to new positions
3. Click the 💾 (save) icon next to the position name in the saved positions list
4. Confirm to overwrite

### Animating Position Changes
1. Select a "Start Position" from the dropdown
2. Select an "End Position" from the dropdown
3. Click "Play Animation"
4. Watch players smoothly transition to their new positions
5. Click "Reset to Start" to return to the start position

### Data Management

#### Export Data
- **Export JSON**: Downloads a JSON file with all players and positions
- **Export XML**: Downloads an XML file with all players and positions

#### Import Data
- Click "Import File"
- Select a JSON or XML file
- Data will be loaded and merged with existing data

#### Data Storage
- All data is automatically saved to MongoDB database
- No manual saving required - every change is persisted immediately
- Data persists across all deployments and server restarts
- You can still export/import JSON or XML files for backup purposes

## Technical Details

### Technologies
- **HTML5**: Structure and semantic markup
- **CSS3**: Styling, layout, and animations
- **Vanilla JavaScript (ES6 Modules)**: Frontend application logic
- **Node.js/Express**: Backend server with REST API
- **MongoDB**: Database for persistent data storage

### Browser Compatibility
- **All modern browsers**: Chrome, Edge, Firefox, Safari all fully supported
- **Mobile browsers**: Functional but optimized for desktop use

### Data Storage Architecture

**Primary Storage: MongoDB Database**
- All data is automatically saved to MongoDB database
- Every change (add player, save position, delete, etc.) is immediately persisted
- Data persists permanently across all deployments, server restarts, and rebuilds
- No risk of data loss - everything is saved automatically
- Scalable and reliable database storage

**Data Structure:**

The MongoDB document structure:
```json
{
  "players": [
    {
      "id": "...",
      "jersey": "...",
      "name": "..."
    }
  ],
  "positions": [
    {
      "id": "...",
      "name": "...",
      "playerPositions": [...]
    }
  ],
  "rotations": [...],
  "scenarios": [...],
  "sequences": [...],
  "version": "4.0",
  "database": "mongodb"
}
```

**Migration:**
- On first load, the app automatically migrates data from `public/data.xml` to MongoDB
- If you have existing `data/data.json`, you can import it using the app's import feature
- Your existing data is preserved and upgraded seamlessly
- See [MIGRATION.md](MIGRATION.md) for detailed migration instructions

## Features in Detail

### Court Layout
- **Dimensions**: 600px × 600px (representing 30' × 30')
- **Net**: Horizontal line at the top (4px height)
- **10ft Line**: Positioned at 200px from top (1/3 of court height)
- **Background**: Birch/tan color (#e8dcc6)

### Player Visualization
- **Circle**: 50px diameter with jersey number
- **Label**: Player name displayed horizontally next to circle
- **Format**: `#jersey name` (e.g., "#5 Sarah")
- **Colors**: Blue circle with white border, dark text label

### Animation
- **Duration**: 1 second per transition
- **Easing**: Smooth ease-in-out
- **Synchronization**: All players animate simultaneously
- **Reset**: One-click return to start position

## Tips for Coaches

1. **Create base formations first**: Save your standard starting positions
2. **Name positions descriptively**: Use clear names like "Base", "Serve Receive", "Rotation 1"
3. **Use animation to show transitions**: Help players understand where they should move
4. **Data is auto-saved**: All changes are automatically saved to `data/data.json` - no need to export!
5. **Backup regularly**: While data is auto-saved, you can still export JSON/XML files for additional backup

## Future Enhancements

Potential features for future development:
- [ ] Full court view (both sides)
- [ ] Rotation tracking
- [ ] Player statistics
- [ ] Multiple lineups
- [ ] Print/export court diagrams
- [ ] Touch support for tablets

## License

This project is open source and available for educational and coaching purposes.

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to fork this project and submit pull requests.

## Support

For issues or questions, please open an issue in the repository or contact the project maintainer.

---

**Made for volleyball coaches and players** 🏐
