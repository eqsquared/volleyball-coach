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
- **XML database**: All data saved to `data.xml` file in the project directory
- **File System Access API**: Direct file saving (Chrome/Edge)
- **LocalStorage backup**: Automatic backup to browser storage
- **Import/Export**: Import and export data in JSON or XML format
- **Auto-save**: Automatic saving on all data changes

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Edge, Firefox, or Safari)
- For direct file saving: Chrome or Edge (File System Access API support)

### Installation

1. Clone or download this repository
2. Open `index.html` in your web browser
3. For best experience with file saving, use Chrome or Edge

### First Time Setup

1. **Select data.xml file** (optional but recommended):
   - Click "Select data.xml File" button in the lineup panel
   - Choose the `data.xml` file in your project directory
   - This enables direct file saving (no downloads)

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
├── data.xml            # XML database (auto-generated/updated)
└── README.md           # This file
```

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

#### Direct File Saving
- Click "Select data.xml File" to choose your project's `data.xml`
- All saves will go directly to that file (no downloads)
- Works best in Chrome or Edge browsers

## Technical Details

### Technologies
- **HTML5**: Structure and semantic markup
- **CSS3**: Styling, layout, and animations
- **Vanilla JavaScript**: No frameworks or dependencies
- **File System Access API**: Direct file system access (Chrome/Edge)
- **LocalStorage API**: Browser-based data persistence

### Browser Compatibility
- **Chrome/Edge**: Full support including File System Access API
- **Firefox/Safari**: Full functionality, but file saving downloads files instead of direct save
- **Mobile browsers**: Functional but optimized for desktop use

### Data Format

The `data.xml` file structure:
```xml
<volleyballCoachData>
  <players>
    <player>
      <id>...</id>
      <jersey>...</jersey>
      <name>...</name>
    </player>
  </players>
  <savedPositions>
    <position name="...">
      <playerPosition>
        <playerId>...</playerId>
        <jersey>...</jersey>
        <name>...</name>
        <x>...</x>
        <y>...</y>
      </playerPosition>
    </position>
  </savedPositions>
</volleyballCoachData>
```

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
