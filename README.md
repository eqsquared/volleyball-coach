# VolleyBoard - Volleyball Position Training App

A web-based volleyball coaching tool designed to help new players visualize court positions and rotations. This interactive application allows coaches to set lineups, position players on the court, save formations, create scenarios and sequences, and animate transitions between positions. Players can view team formations using a read-only team code.

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
- **Tags for organization**: Add tags to positions for easy filtering and organization
- **Search and filter**: Search positions by name and filter by tags

### 🎬 Scenarios
- **Create scenarios**: Save start and end positions together as a scenario (e.g., "Serve Receive to Attack")
- **Visual drop zones**: See both start and end positions displayed below the court
- **Play scenarios**: Animate the transition from start to end position with one click
- **Edit scenarios**: Update start/end positions or save as a new scenario
- **Tags for organization**: Add tags to scenarios for easy filtering and organization
- **Search and filter**: Search scenarios by name and filter by tags

### 📋 Sequences
- **Create sequences**: Build sequences by combining positions and scenarios in any order
- **Timeline interface**: Drag and drop positions and scenarios onto the sequence timeline
- **Play sequences**: Step through a sequence position by position with Next/Previous controls
- **Progress tracking**: See which position in the sequence is currently active
- **Flexible composition**: Mix individual positions and scenarios in any combination
- **Edit sequences**: Add, remove, or reorder items in the sequence timeline

### 🏷️ Tags & Organization
- **Tag system**: Add custom tags to positions and scenarios for organization
- **Tag filtering**: Filter positions and scenarios by one or more tags
- **Tag colors**: Visual color coding for easy tag identification
- **Search functionality**: Search positions and scenarios by name
- **Combined filtering**: Use both search and tag filters together

### 👀 Read-Only Player View
- **Team codes**: Coaches can generate a 6-character team code to share with players
- **Player access**: Players enter the team code to view team formations in read-only mode
- **Share URL**: Coaches can share a direct URL with the team code embedded
- **View-only mode**: Players can view positions, scenarios, and sequences but cannot edit
- **Settings control**: Coaches enable/disable player view in settings

### 🎬 Animation System
- **Position transitions**: Animate players from one saved position to another
- **Scenario animations**: Play scenarios to animate from start to end position
- **Sequence playback**: Step through sequences position by position
- **Smooth animations**: 1-second transitions between positions
- **Reset to start**: Refresh button to return to the start position after animation

### 💾 Data Persistence
- **MongoDB database**: All data is automatically saved to MongoDB database
- **Automatic saving**: Every change (add player, save position, create scenario, etc.) is immediately saved to the database
- **No data loss**: Data persists permanently across all deployments and server restarts
- **Automatic migration**: Seamlessly migrates from legacy XML files on first load
- **Import/Export**: Import and export data in JSON or XML format for backup
- **Server-based**: Requires Node.js server to run (included in npm start)
- **User accounts**: Each coach has their own account with isolated data storage

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

5. **Create scenarios**:
   - Drag a position to the "Start Position" drop zone
   - Drag another position to the "End Position" drop zone
   - Click "Save Scenario" to create a new scenario
   - Click "Play" to animate from start to end position

6. **Create sequences**:
   - Click "Create Sequence" and enter a name
   - Drag positions and scenarios onto the sequence timeline
   - Click "Play" to step through the sequence
   - Use "Next" and "Previous" buttons to navigate

7. **Use tags for organization**:
   - When creating or editing positions/scenarios, add tags (comma-separated)
   - Use the tag filter button to filter by tags
   - Combine search and tag filters for precise filtering

8. **Share with players** (coaches only):
   - Go to Settings → Enable Player View
   - Copy your team code or share URL
   - Players can enter the code to view formations in read-only mode

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
2. Click "+ New Position" or edit an existing position
3. Enter a descriptive name and optional tags (comma-separated)
4. Click "Save Position"
5. The position appears in the "Positions" list

### Editing Positions
1. Click the edit icon (✏️) next to a position name
2. Modify the position name or tags
3. To update player positions: load the position, move players, then click "Save"
4. Click "Save As" to create a copy with a new name

### Creating Scenarios
1. Load or create a start position on the court
2. Drag the position to the "Start Position" drop zone (or select from dropdown)
3. Load or create an end position
4. Drag the end position to the "End Position" drop zone (or select from dropdown)
5. Click "Save Scenario" and enter a name and optional tags
6. The scenario appears in the "Scenarios" list

### Playing Scenarios
1. Click on a scenario in the list to load it
2. The start position loads on the court, and both positions show in drop zones
3. Click "Play" to animate from start to end position
4. Click "Reset" to return to the start position
5. Click "Clear" to remove the scenario from the drop zones

### Creating Sequences
1. Click "Create Sequence" and enter a name
2. The sequence timeline appears below the court
3. Drag positions and scenarios from the sidebar onto the timeline
4. Reorder items by dragging them within the timeline
5. Remove items by clicking the X button on timeline items

### Playing Sequences
1. Load a sequence to enter edit mode
2. Click "Play" to start playback from the first position
3. Use "Next" to advance to the next position/scenario
4. Use "Prev" to go back to the previous position/scenario
5. The progress indicator shows current position (e.g., "Position 1 of 5")
6. Click "Play" again to restart from the beginning

### Using Tags
1. When creating or editing positions/scenarios, add tags in the tags field (comma-separated)
2. Click the tag filter button (🏷️) to open the tag filter dropdown
3. Select one or more tags to filter the list
4. Selected tags appear as badges above the list
5. Click a tag badge to remove that filter
6. Use the search box to search by name while filtering by tags

### Team Code & Player View

#### For Coaches: Enabling Player View
1. Click on your profile in the sidebar footer
2. Select "Settings"
3. Enable "Enable Player View" toggle
4. Your unique 6-character team code will be generated
5. Copy the team code or share URL to give to players
6. Players can use this code to view your team formations in read-only mode

#### For Players: Viewing Team Data
1. On the login screen, click the "Team Code" tab
2. Enter the 6-character team code provided by your coach
3. Click "View Team" to access read-only view
4. You can view positions, scenarios, and sequences but cannot edit
5. The view expires after a period of inactivity for security

### Data Management

#### Export Data
- **Export JSON**: Downloads a JSON file with all players, positions, scenarios, and sequences
- **Export XML**: Downloads an XML file with all data
- Access via Settings → Export Data

#### Import Data
- Go to Settings → Import File
- Select a JSON or XML file
- Data will be loaded and merged with existing data
- Note: This will add to your existing data, not replace it

#### Data Storage
- All data is automatically saved to MongoDB database
- No manual saving required - every change is persisted immediately
- Data persists across all deployments and server restarts
- Each user account has isolated data storage
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
      "playerPositions": [...],
      "tags": [...]
    }
  ],
  "rotations": [...],
  "scenarios": [
    {
      "id": "...",
      "name": "...",
      "startPositionId": "...",
      "endPositionId": "...",
      "tags": [...]
    }
  ],
  "sequences": [
    {
      "id": "...",
      "name": "...",
      "items": [
        { "type": "position", "id": "..." },
        { "type": "scenario", "id": "..." }
      ]
    }
  ],
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

1. **Create base formations first**: Save your standard starting positions with descriptive names
2. **Use tags for organization**: Tag positions and scenarios by rotation, play type, or situation (e.g., "rotation-1", "serve-receive", "attack")
3. **Build scenarios for common transitions**: Create scenarios for transitions you practice frequently (e.g., "Serve Receive to Attack")
4. **Create sequences for drills**: Build sequences that combine multiple positions and scenarios for complete practice drills
5. **Share with players**: Enable player view and share your team code so players can review formations at home
6. **Name descriptively**: Use clear names like "Base", "Serve Receive", "Rotation 1" for easy identification
7. **Use search and filters**: When you have many positions/scenarios, use search and tag filters to find what you need quickly
8. **Data is auto-saved**: All changes are automatically saved to MongoDB - no need to export!
9. **Backup regularly**: While data is auto-saved, you can still export JSON/XML files for additional backup

## Future Enhancements

Potential features for future development:
- [ ] Full court view (both sides)
- [ ] Rotation tracking
- [ ] Player statistics
- [ ] Multiple lineups
- [ ] Print/export court diagrams
- [ ] Enhanced touch support for tablets
- [ ] Team collaboration features

## License

This project is open source and available for educational and coaching purposes.

## Contributing

Contributions, issues, and feature requests are welcome! Feel free to fork this project and submit pull requests.

## Support

For issues or questions, please open an issue in the repository or contact the project maintainer.

---

**VolleyBoard - Made for volleyball coaches and players** 🏐
