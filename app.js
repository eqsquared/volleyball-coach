// Import API-based database module
import * as db from './db.js';

// State management
let players = [];
let savedPositions = {};
let playerElements = new Map(); // Map player ID to DOM element
let draggedPlayer = null;
let draggedElement = null;
let isAnimating = false;
let lastStartPosition = null;
let dbInitialized = false;

// DOM elements
const lineupList = document.getElementById('lineup-list');
const court = document.getElementById('court');
const jerseyInput = document.getElementById('jersey-number');
const nameInput = document.getElementById('player-name');
const addPlayerBtn = document.getElementById('add-player-btn');
const positionNameInput = document.getElementById('position-name');
const savePositionBtn = document.getElementById('save-position-btn');
const startPositionSelect = document.getElementById('start-position');
const endPositionSelect = document.getElementById('end-position');
const playAnimationBtn = document.getElementById('play-animation-btn');
const refreshPositionBtn = document.getElementById('refresh-position-btn');
const savedPositionsList = document.getElementById('saved-positions-list');
const selectFileBtn = document.getElementById('select-file-btn');
const exportJsonBtn = document.getElementById('export-json-btn');
const exportXmlBtn = document.getElementById('export-xml-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file');
const fileStatus = document.getElementById('file-status');

// Initialize
async function init() {
    try {
        // Initialize API connection
        await db.initDB();
        dbInitialized = true;
        
        // Try to load from file-based storage
        const hasDBData = await db.hasData();
        
        if (hasDBData) {
            // Load from file-based storage
            players = await db.getAllPlayers();
            savedPositions = await db.getAllPositions();
            console.log('Data loaded from file-based storage');
            
            if (fileStatus) {
                fileStatus.textContent = '✓ Data loaded from data.json file.';
                fileStatus.style.color = '#27ae60';
            }
        } else {
            // No file data, try to migrate from XML
            console.log('No file data found, attempting migration...');
            const migrated = await migrateFromLegacyStorage();
            
            if (!migrated) {
                // No legacy data either, start fresh
                if (fileStatus) {
                    fileStatus.textContent = 'Starting with empty database. Add players to begin.';
                    fileStatus.style.color = '#3498db';
                }
            }
        }
        
        // Update file status
        if (fileStatus && !fileStatus.textContent.includes('✓')) {
            fileStatus.textContent = '✓ Data is automatically saved to data.json file.';
            fileStatus.style.color = '#27ae60';
        }
        
        addPlayerBtn.addEventListener('click', addPlayer);
        savePositionBtn.addEventListener('click', savePosition);
        playAnimationBtn.addEventListener('click', playAnimation);
        refreshPositionBtn.addEventListener('click', resetToStartPosition);
        selectFileBtn.addEventListener('click', selectDataFile);
        exportJsonBtn.addEventListener('click', exportToJSON);
        exportXmlBtn.addEventListener('click', exportToXML);
        importBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', handleFileImport);
        
        // Auto-load positions when selected
        startPositionSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                loadPosition(e.target.value);
            }
        });
        
        endPositionSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                loadPosition(e.target.value);
            }
        });
        
        // Allow Enter key to add player
        jerseyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addPlayer();
        });
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addPlayer();
        });
        
        // Allow Enter key to save position
        positionNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') savePosition();
        });
        
        renderLineup();
        updateSavedPositionsList();
        updatePositionSelects();
        
        // Initialize Lucide icons
        if (window.lucide) {
            lucide.createIcons();
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Error initializing database. Please refresh the page.');
    }
}

// Add player to lineup
async function addPlayer() {
    const jersey = jerseyInput.value.trim();
    const name = nameInput.value.trim();
    
    if (!jersey || !name) {
        alert('Please enter both jersey number and name');
        return;
    }
    
    // Check for duplicate jersey numbers
    if (players.some(p => p.jersey === jersey)) {
        alert('A player with this jersey number already exists');
        return;
    }
    
    const player = {
        id: Date.now().toString(),
        jersey: jersey,
        name: name
    };
    
    players.push(player);
    
    // Save to file-based storage
    if (dbInitialized) {
        try {
            await db.savePlayer(player);
        } catch (error) {
            console.error('Error saving player:', error);
            alert('Error saving player: ' + error.message);
        }
    }
    
    renderLineup();
    
    // Clear inputs
    jerseyInput.value = '';
    nameInput.value = '';
    jerseyInput.focus();
}

// Render lineup
function renderLineup() {
    lineupList.innerHTML = '';
    
    players.forEach(player => {
        const item = document.createElement('div');
        item.className = 'player-lineup-item';
        item.draggable = true;
        item.dataset.playerId = player.id;
        
        item.innerHTML = `
            <div class="player-jersey">${player.jersey}</div>
            <div class="player-name">${player.name}</div>
            <button class="delete-player-btn">×</button>
        `;
        
        // Add delete button event listener
        const deleteBtn = item.querySelector('.delete-player-btn');
        deleteBtn.addEventListener('click', () => deletePlayer(player.id));
        
        // Drag start
        item.addEventListener('dragstart', (e) => {
            draggedPlayer = player;
            e.dataTransfer.effectAllowed = 'copy';
        });
        
        lineupList.appendChild(item);
    });
}

// Delete player
async function deletePlayer(playerId) {
    players = players.filter(p => p.id !== playerId);
    
    // Remove from file-based storage
    if (dbInitialized) {
        try {
            await db.deletePlayer(playerId);
        } catch (error) {
            console.error('Error deleting player:', error);
            alert('Error deleting player: ' + error.message);
        }
    }
    
    // Remove player from court if present
    const playerElement = playerElements.get(playerId);
    if (playerElement) {
        playerElement.remove();
        playerElements.delete(playerId);
    }
    
    // Remove from all saved positions
    Object.keys(savedPositions).forEach(posName => {
        savedPositions[posName] = savedPositions[posName].filter(p => p.playerId !== playerId);
    });
    
    // Update positions in file-based storage
    if (dbInitialized) {
        for (const [posName, positions] of Object.entries(savedPositions)) {
            try {
                await db.savePosition(posName, positions);
            } catch (error) {
                console.error('Error updating position:', error);
            }
        }
    }
    
    renderLineup();
    updateSavedPositionsList();
}

// Court drag and drop
court.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

court.addEventListener('drop', (e) => {
    e.preventDefault();
    
    if (!draggedPlayer) return;
    
    const rect = court.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain to court bounds
    // Net is at top (y=0), bottom is out of bounds (y=600)
    // Players must be below net and above bottom, accounting for player size (50px)
    const constrainedY = Math.max(4, Math.min(y, 550)); // Below net (4px) to above bottom (550px)
    
    placePlayerOnCourt(draggedPlayer, x - 25, constrainedY - 25);
    draggedPlayer = null;
});

// Place player on court
function placePlayerOnCourt(player, x, y) {
    // Remove existing player element if present
    const existingElement = playerElements.get(player.id);
    if (existingElement) {
        existingElement.remove();
    }
    
    // Constrain position to court bounds (accounting for player size)
    x = Math.max(0, Math.min(x, 550)); // 600px - 50px (player width)
    y = Math.max(4, Math.min(y, 550)); // Below net (4px) to above bottom (550px accounting for 50px player height)
    
    // Create container for player circle and label
    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-container';
    playerContainer.dataset.playerId = player.id;
    playerContainer.style.left = x + 'px';
    playerContainer.style.top = y + 'px';
    
    // Create player circle
    const playerElement = document.createElement('div');
    playerElement.className = 'player-on-court';
    playerElement.textContent = player.jersey;
    
    // Create player label with just the name (jersey is already in the circle)
    const playerLabel = document.createElement('div');
    playerLabel.className = 'player-label';
    playerLabel.textContent = player.name;
    
    // Add circle and label to container
    playerContainer.appendChild(playerElement);
    playerContainer.appendChild(playerLabel);
    
    // Make draggable on court (drag from the circle)
    playerElement.draggable = true;
    playerElement.addEventListener('dragstart', (e) => {
        draggedElement = playerContainer;
        playerContainer.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    
    playerElement.addEventListener('dragend', () => {
        playerContainer.classList.remove('dragging');
        draggedElement = null;
    });
    
    // Allow dragging within court
    court.addEventListener('dragover', handleCourtDragOver);
    court.addEventListener('drop', handleCourtDrop);
    
    playerElements.set(player.id, playerContainer);
    court.appendChild(playerContainer);
}

// Handle dragging within court
function handleCourtDragOver(e) {
    if (draggedElement) {
        e.preventDefault();
        
        const rect = court.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Check if within court bounds
        const isWithinBounds = x >= 0 && x <= 600 && y >= 4 && y <= 600;
        
        if (isWithinBounds) {
            e.dataTransfer.dropEffect = 'move';
            draggedElement.classList.remove('removing');
        } else {
            // Outside court - show remove indicator
            e.dataTransfer.dropEffect = 'none';
            draggedElement.classList.add('removing');
        }
    }
}

function handleCourtDrop(e) {
    if (!draggedElement) return;
    
    e.preventDefault();
    
    const rect = court.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if drop is outside court bounds
    const isOutsideBounds = x < 0 || x > 600 || y < 4 || y > 600;
    
    if (isOutsideBounds) {
        // Remove player from court
        const playerId = draggedElement.dataset.playerId;
        removePlayerFromCourt(playerId);
    } else {
        // Move within court bounds
        const constrainedY = Math.max(4, Math.min(y - 25, 550)); // Below net (4px) to above bottom (550px)
        const constrainedX = Math.max(0, Math.min(x - 25, 550));
        
        draggedElement.style.left = constrainedX + 'px';
        draggedElement.style.top = constrainedY + 'px';
    }
    
    draggedElement.classList.remove('removing');
    draggedElement = null;
}

// Remove player from court (but keep in lineup)
function removePlayerFromCourt(playerId) {
    const playerElement = playerElements.get(playerId);
    if (playerElement) {
        playerElement.remove();
        playerElements.delete(playerId);
    }
}

// Handle drops outside the court (on document)
document.addEventListener('dragover', (e) => {
    if (draggedElement && !court.contains(e.target)) {
        e.preventDefault();
        // Show remove indicator when dragging outside court area
        if (!draggedElement.classList.contains('removing')) {
            draggedElement.classList.add('removing');
        }
    }
});

document.addEventListener('drop', (e) => {
    if (draggedElement && !court.contains(e.target)) {
        e.preventDefault();
        
        // Remove player from court if dropped outside
        const playerId = draggedElement.dataset.playerId;
        removePlayerFromCourt(playerId);
        
        draggedElement.classList.remove('removing');
        draggedElement = null;
    }
});

// Save current position
async function savePosition() {
    const positionName = positionNameInput.value.trim();
    
    if (!positionName) {
        alert('Please enter a position name');
        return;
    }
    
    // Collect current player positions
    const positions = [];
    playerElements.forEach((element, playerId) => {
        const player = players.find(p => p.id === playerId);
        if (player) {
            positions.push({
                playerId: playerId,
                jersey: player.jersey,
                name: player.name,
                x: parseInt(element.style.left),
                y: parseInt(element.style.top)
            });
        }
    });
    
    savedPositions[positionName] = positions;
    positionNameInput.value = '';
    
    // Save to file-based storage
    if (dbInitialized) {
        try {
            await db.savePosition(positionName, positions);
        } catch (error) {
            console.error('Error saving position:', error);
            alert('Error saving position: ' + error.message);
        }
    }
    
    updateSavedPositionsList();
    updatePositionSelects();
}

// Update saved positions list
function updateSavedPositionsList() {
    savedPositionsList.innerHTML = '';
    
    Object.keys(savedPositions).forEach(posName => {
        const item = document.createElement('div');
        item.className = 'saved-position-item';
        
        const count = savedPositions[posName].length;
        item.innerHTML = `
            <span>${posName} (${count} players)</span>
            <div class="saved-position-actions">
                <button class="save-overwrite-btn" title="Save over this position"><i data-lucide="save"></i></button>
                <button class="load-position-btn" title="Load position"><i data-lucide="folder-open"></i></button>
                <button class="delete-position-btn" title="Delete position"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        
        // Add event listeners for buttons
        const saveOverBtn = item.querySelector('.save-overwrite-btn');
        const loadBtn = item.querySelector('.load-position-btn');
        const deleteBtn = item.querySelector('.delete-position-btn');
        
        saveOverBtn.addEventListener('click', () => saveOverPosition(posName));
        loadBtn.addEventListener('click', () => loadPosition(posName));
        deleteBtn.addEventListener('click', () => deletePosition(posName));
        
        // Initialize Lucide icons for these buttons
        if (window.lucide) {
            lucide.createIcons();
        }
        
        savedPositionsList.appendChild(item);
    });
}

// Update position selects
function updatePositionSelects() {
    const options = Object.keys(savedPositions);
    
    [startPositionSelect, endPositionSelect].forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select...</option>';
        
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            select.appendChild(opt);
        });
        
        if (options.includes(currentValue)) {
            select.value = currentValue;
        }
    });
}

// Load position
function loadPosition(positionName) {
    const positions = savedPositions[positionName];
    if (!positions) return;
    
    // Clear current positions
    playerElements.forEach((element) => {
        element.remove();
    });
    playerElements.clear();
    
    // Place players in saved positions
    positions.forEach(pos => {
        const player = players.find(p => p.id === pos.playerId);
        if (player) {
            placePlayerOnCourt(player, pos.x, pos.y);
        }
    });
}

// Save over existing position
async function saveOverPosition(positionName) {
    if (!confirm(`Overwrite position "${positionName}" with current court positions?`)) {
        return;
    }
    
    // Collect current player positions
    const positions = [];
    playerElements.forEach((element, playerId) => {
        const player = players.find(p => p.id === playerId);
        if (player) {
            positions.push({
                playerId: playerId,
                jersey: player.jersey,
                name: player.name,
                x: parseInt(element.style.left),
                y: parseInt(element.style.top)
            });
        }
    });
    
    savedPositions[positionName] = positions;
    
    // Save to file-based storage
    if (dbInitialized) {
        try {
            await db.savePosition(positionName, positions);
        } catch (error) {
            console.error('Error saving position:', error);
            alert('Error saving position: ' + error.message);
        }
    }
    
    updateSavedPositionsList();
    updatePositionSelects();
}

// Delete position
async function deletePosition(positionName) {
    if (confirm(`Delete position "${positionName}"?`)) {
        delete savedPositions[positionName];
        
        // Delete from file-based storage
        if (dbInitialized) {
            try {
                await db.deletePosition(positionName);
            } catch (error) {
                console.error('Error deleting position:', error);
                alert('Error deleting position: ' + error.message);
            }
        }
        
        updateSavedPositionsList();
        updatePositionSelects();
    }
}

// Play animation
function playAnimation() {
    const startPos = startPositionSelect.value;
    const endPos = endPositionSelect.value;
    
    if (!startPos || !endPos) {
        alert('Please select both start and end positions');
        return;
    }
    
    if (isAnimating) {
        alert('Animation already in progress');
        return;
    }
    
    const startPositions = savedPositions[startPos];
    const endPositions = savedPositions[endPos];
    
    if (!startPositions || !endPositions) {
        alert('Invalid positions');
        return;
    }
    
    // Store the start position for refresh
    lastStartPosition = startPos;
    
    // Load start position first
    loadPosition(startPos);
    
    // Wait a bit then animate
    setTimeout(() => {
        isAnimating = true;
        playAnimationBtn.disabled = true;
        
        // Create a map of playerId to end position
        const endPosMap = new Map();
        endPositions.forEach(pos => {
            endPosMap.set(pos.playerId, { x: pos.x, y: pos.y });
        });
        
        // Animate each player
        let animationsComplete = 0;
        const totalAnimations = startPositions.length;
        
        startPositions.forEach(startPos => {
            const endPos = endPosMap.get(startPos.playerId);
            if (!endPos) {
                animationsComplete++;
                if (animationsComplete === totalAnimations) {
                    finishAnimation();
                }
                return;
            }
            
            const playerElement = playerElements.get(startPos.playerId);
            if (!playerElement) {
                animationsComplete++;
                if (animationsComplete === totalAnimations) {
                    finishAnimation();
                }
                return;
            }
            
            playerElement.classList.add('animating');
            
            // Set end position
            setTimeout(() => {
                playerElement.style.left = endPos.x + 'px';
                playerElement.style.top = endPos.y + 'px';
            }, 10);
            
            // Remove animating class after animation completes
            setTimeout(() => {
                playerElement.classList.remove('animating');
                animationsComplete++;
                
                if (animationsComplete === totalAnimations) {
                    finishAnimation();
                }
            }, 1010); // 1s animation + 10ms buffer
        });
        
        // Handle case where no animations needed
        if (totalAnimations === 0) {
            finishAnimation();
        }
    }, 100);
}

function finishAnimation() {
    isAnimating = false;
    playAnimationBtn.disabled = false;
    if (refreshPositionBtn) {
        refreshPositionBtn.disabled = false;
    }
    // Show refresh button after animation completes
    if (lastStartPosition) {
        refreshPositionBtn.style.display = 'inline-flex';
        // Re-initialize icons when button is shown
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}

function resetToStartPosition() {
    if (!lastStartPosition) return;
    
    if (isAnimating) {
        alert('Animation already in progress');
        return;
    }
    
    const startPositions = savedPositions[lastStartPosition];
    if (!startPositions) return;
    
    // Get current positions of players on court
    const currentPositions = [];
    playerElements.forEach((element, playerId) => {
        const player = players.find(p => p.id === playerId);
        if (player) {
            currentPositions.push({
                playerId: playerId,
                x: parseInt(element.style.left) || 0,
                y: parseInt(element.style.top) || 0
            });
        }
    });
    
    // Create a map of playerId to start position
    const startPosMap = new Map();
    startPositions.forEach(pos => {
        startPosMap.set(pos.playerId, { x: pos.x, y: pos.y });
    });
    
    isAnimating = true;
    playAnimationBtn.disabled = true;
    refreshPositionBtn.disabled = true;
    
    // Animate each player back to start position
    let animationsComplete = 0;
    const totalAnimations = currentPositions.length;
    
    if (totalAnimations === 0) {
        // No players on court, just load the position
        loadPosition(lastStartPosition);
        finishAnimation();
        refreshPositionBtn.style.display = 'none';
        return;
    }
    
    currentPositions.forEach(currentPos => {
        const startPos = startPosMap.get(currentPos.playerId);
        if (!startPos) {
            // Player not in start position, remove them
            const playerElement = playerElements.get(currentPos.playerId);
            if (playerElement) {
                playerElement.remove();
                playerElements.delete(currentPos.playerId);
            }
            animationsComplete++;
            if (animationsComplete === totalAnimations) {
                finishAnimation();
                refreshPositionBtn.style.display = 'none';
            }
            return;
        }
        
        const playerElement = playerElements.get(currentPos.playerId);
        if (!playerElement) {
            animationsComplete++;
            if (animationsComplete === totalAnimations) {
                finishAnimation();
                refreshPositionBtn.style.display = 'none';
            }
            return;
        }
        
        // Check if position actually changed
        if (currentPos.x === startPos.x && currentPos.y === startPos.y) {
            animationsComplete++;
            if (animationsComplete === totalAnimations) {
                finishAnimation();
                refreshPositionBtn.style.display = 'none';
            }
            return;
        }
        
        playerElement.classList.add('animating');
        
        // Set start position
        setTimeout(() => {
            playerElement.style.left = startPos.x + 'px';
            playerElement.style.top = startPos.y + 'px';
        }, 10);
        
        // Remove animating class after animation completes
        setTimeout(() => {
            playerElement.classList.remove('animating');
            animationsComplete++;
            
            if (animationsComplete === totalAnimations) {
                finishAnimation();
                refreshPositionBtn.style.display = 'none';
            }
        }, 1010); // 1s animation + 10ms buffer
    });
    
    // Also add any players that are in start position but not on court
    startPositions.forEach(startPos => {
        if (!playerElements.has(startPos.playerId)) {
            const player = players.find(p => p.id === startPos.playerId);
            if (player) {
                placePlayerOnCourt(player, startPos.x, startPos.y);
            }
        }
    });
}

// Migration function - converts XML data to file-based storage
async function migrateFromLegacyStorage() {
    let legacyData = null;
    
    // Try to load from data.xml first
    try {
        const response = await fetch('data.xml');
        if (response.ok) {
            const xmlText = await response.text();
            legacyData = parseXML(xmlText);
            console.log('Found data.xml, migrating to file-based storage...');
        }
    } catch (error) {
        console.log('data.xml not accessible, skipping migration...');
    }
    
    if (legacyData && (legacyData.players?.length > 0 || Object.keys(legacyData.savedPositions || {}).length > 0)) {
        // Import legacy data into file-based storage
        try {
            await db.importData(legacyData);
            
            // Load into app state
            players = legacyData.players || [];
            savedPositions = legacyData.savedPositions || {};
            
            renderLineup();
            updateSavedPositionsList();
            updatePositionSelects();
            
            if (fileStatus) {
                fileStatus.textContent = '✓ Legacy data migrated to file-based storage.';
                fileStatus.style.color = '#27ae60';
            }
            
            console.log('Migration successful!');
            return true;
        } catch (error) {
            console.error('Error during migration:', error);
            if (fileStatus) {
                fileStatus.textContent = 'Error migrating data. Starting fresh.';
                fileStatus.style.color = '#e74c3c';
            }
        }
    }
    
    return false;
}

// Persistence functions (for export/import)
let dataFileHandle = null;

async function selectDataFile() {
    if (!window.showOpenFilePicker) {
        alert('File System Access API is not supported in this browser. Please use Chrome or Edge.');
        return;
    }
    
    try {
        [dataFileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'XML files',
                accept: { 'application/xml': ['.xml'] }
            }],
            suggestedName: 'data.xml'
        });
        
            // Load the file after selecting
        const file = await dataFileHandle.getFile();
        const text = await file.text();
        const data = parseXML(text);
        
        // Import into file-based storage
        if (dbInitialized) {
            await db.importData(data);
        }
        
        // Reload data from server
        players = await db.getAllPlayers();
        savedPositions = await db.getAllPositions();
        
        renderLineup();
        updateSavedPositionsList();
        updatePositionSelects();
        
        // Update status
        const fileName = file.name;
        fileStatus.textContent = `✓ File imported: ${fileName}. Data saved to data.json.`;
        fileStatus.style.color = '#27ae60';
    } catch (error) {
        if (error.name !== 'AbortError') {
            alert('Error selecting file: ' + error.message);
            console.error('Error:', error);
        }
    }
}

function generateXML() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<volleyballCoachData>\n';
    xml += `  <exportDate>${new Date().toISOString()}</exportDate>\n`;
    xml += `  <version>3.0</version>\n`;
    xml += `  <database>file-based</database>\n`;
    
    xml += '  <players>\n';
    players.forEach(player => {
        xml += '    <player>\n';
        xml += `      <id>${escapeXml(player.id)}</id>\n`;
        xml += `      <jersey>${escapeXml(player.jersey)}</jersey>\n`;
        xml += `      <name>${escapeXml(player.name)}</name>\n`;
        xml += '    </player>\n';
    });
    xml += '  </players>\n';
    
    xml += '  <savedPositions>\n';
    Object.keys(savedPositions).forEach(posName => {
        xml += `    <position name="${escapeXml(posName)}">\n`;
        savedPositions[posName].forEach(pos => {
            xml += '      <playerPosition>\n';
            xml += `        <playerId>${escapeXml(pos.playerId)}</playerId>\n`;
            xml += `        <jersey>${escapeXml(pos.jersey)}</jersey>\n`;
            xml += `        <name>${escapeXml(pos.name)}</name>\n`;
            xml += `        <x>${pos.x}</x>\n`;
            xml += `        <y>${pos.y}</y>\n`;
            xml += '      </playerPosition>\n';
        });
        xml += '    </position>\n';
    });
    xml += '  </savedPositions>\n';
    
    xml += '</volleyballCoachData>';
    return xml;
}

async function exportToJSON() {
    // Get latest data from file-based storage
    if (dbInitialized) {
        try {
            const data = await db.exportAllData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `volleyball-coach-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        } catch (error) {
            console.error('Error exporting from file storage:', error);
            alert('Error exporting data: ' + error.message);
        }
    }
    
    // Fallback to current state
    const data = {
        players: players,
        savedPositions: savedPositions,
        exportDate: new Date().toISOString(),
        version: '3.0',
        database: 'file-based'
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volleyball-coach-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportToXML() {
    // Export XML as download (separate from auto-save)
    const xml = generateXML();
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volleyball-coach-data-${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function escapeXml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const content = e.target.result;
            let data;
            
            if (file.name.endsWith('.xml')) {
                data = parseXML(content);
            } else {
                data = JSON.parse(content);
            }
            
            // Import into file-based storage
            if (dbInitialized) {
                await db.importData(data);
            }
            
            // Reload data from server
            players = await db.getAllPlayers();
            savedPositions = await db.getAllPositions();
            
            renderLineup();
            updateSavedPositionsList();
            updatePositionSelects();
            
            alert('Data imported successfully! Saved to data.json file.');
        } catch (error) {
            alert('Error importing file: ' + error.message);
            console.error('Import error:', error);
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function parseXML(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
    
    const data = {
        players: [],
        savedPositions: {}
    };
    
    // Parse players
    const playerNodes = xmlDoc.getElementsByTagName('player');
    for (let i = 0; i < playerNodes.length; i++) {
        const player = {
            id: getTextContent(playerNodes[i], 'id'),
            jersey: getTextContent(playerNodes[i], 'jersey'),
            name: getTextContent(playerNodes[i], 'name')
        };
        data.players.push(player);
    }
    
    // Parse saved positions
    const positionNodes = xmlDoc.getElementsByTagName('position');
    for (let i = 0; i < positionNodes.length; i++) {
        const posName = positionNodes[i].getAttribute('name');
        const positions = [];
        
        const playerPosNodes = positionNodes[i].getElementsByTagName('playerPosition');
        for (let j = 0; j < playerPosNodes.length; j++) {
            const pos = {
                playerId: getTextContent(playerPosNodes[j], 'playerId'),
                jersey: getTextContent(playerPosNodes[j], 'jersey'),
                name: getTextContent(playerPosNodes[j], 'name'),
                x: parseInt(getTextContent(playerPosNodes[j], 'x')),
                y: parseInt(getTextContent(playerPosNodes[j], 'y'))
            };
            positions.push(pos);
        }
        
        data.savedPositions[posName] = positions;
    }
    
    return data;
}

function getTextContent(parent, tagName) {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent : '';
}

// Initialize app
init();
