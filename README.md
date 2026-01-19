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
- **IndexedDB database**: Robust local database storage with better performance and capacity
- **Automatic migration**: Seamlessly migrates from legacy XML/localStorage on first load
- **File System Access API**: Optional direct file saving for backup (Chrome/Edge)
- **Import/Export**: Import and export data in JSON or XML format
- **Auto-save**: Automatic saving to IndexedDB on all data changes
- **No server required**: Fully client-side, works offline

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Edge, Firefox, or Safari)
- For direct file saving: Chrome or Edge (File System Access API support)

### Installation & Running

**Important**: This app uses ES6 modules and must be served over HTTP (not opened as a file).

1. **Navigate to the project directory** in your terminal:
   ```bash
   cd volleyball-coach
   ```

2. **Start a local web server** using one of these methods:

   **Option 1: Python 3** (recommended)
   ```bash
   python3 -m http.server 8000
   ```
   Then open: http://localhost:8000

   **Option 2: Python 2**
   ```bash
   python -m http.server 8000
   ```
   Then open: http://localhost:8000

   **Option 3: Node.js** (if you have http-server installed)
   ```bash
   npx http-server
   ```
   Or install globally: `npm install -g http-server` then run `http-server`

   **Option 4: PHP** (if installed)
   ```bash
   php -S localhost:8000
   ```

3. **Open in your browser**: Navigate to `http://localhost:8000` (or the port your server uses)

4. **For best experience**: Use Chrome or Edge for full File System Access API support

### First Time Setup

1. **Automatic data migration** (if upgrading):
   - If you have existing `data.xml` or localStorage data, it will automatically migrate to IndexedDB on first load
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
├── index.html          # Main HTML structure
├── styles.css          # All styling and layout
├── app.js              # Application logic and functionality
├── db.js               # IndexedDB database module
├── data.xml            # Legacy XML file (optional, for import/export)
└── README.md           # This file
```

**Note**: Data is now stored in IndexedDB (browser database), not in `data.xml`. The XML file is only used for import/export functionality.

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

#### Direct File Saving (Optional)
- Click "Select data.xml File" to choose a file for backup
- Data is primarily stored in IndexedDB, but you can export/import XML files
- Works best in Chrome or Edge browsers

## Technical Details

### Technologies
- **HTML5**: Structure and semantic markup
- **CSS3**: Styling, layout, and animations
- **Vanilla JavaScript (ES6 Modules)**: No frameworks or dependencies
- **IndexedDB**: Robust local database storage (replaces XML/localStorage)
- **File System Access API**: Optional direct file system access (Chrome/Edge)

### Browser Compatibility
- **Chrome/Edge**: Full support including File System Access API
- **Firefox/Safari**: Full functionality, but file saving downloads files instead of direct save
- **Mobile browsers**: Functional but optimized for desktop use

### Data Storage Architecture

**Primary Storage: IndexedDB**
- All data is stored in the browser's IndexedDB database
- Provides better performance, larger capacity, and more robust storage
- Data persists across browser sessions
- No file system access required

**Export/Import Formats:**

The exported JSON/XML structure:
```json
{
  "players": [
    {
      "id": "...",
      "jersey": "...",
      "name": "..."
    }
  ],
  "savedPositions": {
    "positionName": [
      {
        "playerId": "...",
        "jersey": "...",
        "name": "...",
        "x": 0,
        "y": 0
      }
    ]
  },
  "exportDate": "...",
  "version": "2.0",
  "database": "IndexedDB"
}
```

**Migration:**
- On first load, the app automatically migrates data from `data.xml` or localStorage to IndexedDB
- Your existing data is preserved and upgraded seamlessly

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
4. **Save frequently**: Positions auto-save, but use descriptive names
5. **Export backups**: Regularly export your data as JSON/XML for backup

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
