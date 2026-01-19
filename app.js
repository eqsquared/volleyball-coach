// State management
let players = [];
let savedPositions = {};
let playerElements = new Map(); // Map player ID to DOM element
let draggedPlayer = null;
let draggedElement = null;
let isAnimating = false;
let lastStartPosition = null;

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
    // Load saved data (always try data.xml first, then localStorage)
    await loadFromXML();
    
    // Update file status for saving (separate from loading)
    const savedFileName = localStorage.getItem('dataFileName');
    if (savedFileName && fileStatus && !fileStatus.textContent.includes('✓')) {
        fileStatus.textContent += ` Click "Select data.xml File" to enable direct saving.`;
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
    saveToXML();
}

// Add player to lineup
function addPlayer() {
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
    renderLineup();
    saveToXML();
    
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
            <button class="delete-player-btn" onclick="deletePlayer('${player.id}')">×</button>
        `;
        
        // Drag start
        item.addEventListener('dragstart', (e) => {
            draggedPlayer = player;
            e.dataTransfer.effectAllowed = 'copy';
        });
        
        lineupList.appendChild(item);
    });
}

// Delete player
function deletePlayer(playerId) {
    players = players.filter(p => p.id !== playerId);
    
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
        e.dataTransfer.dropEffect = 'move';
    }
}

function handleCourtDrop(e) {
    if (!draggedElement) return;
    
    e.preventDefault();
    
    const rect = court.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain to court bounds
    // Net is at top (y=0), bottom is out of bounds (y=600)
    const constrainedY = Math.max(4, Math.min(y - 25, 550)); // Below net (4px) to above bottom (550px)
    const constrainedX = Math.max(0, Math.min(x - 25, 550));
    
    draggedElement.style.left = constrainedX + 'px';
    draggedElement.style.top = constrainedY + 'px';
    
    draggedElement = null;
}

// Save current position
function savePosition() {
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
    
    updateSavedPositionsList();
    updatePositionSelects();
    saveToXML();
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
                <button class="save-overwrite-btn" onclick="saveOverPosition('${posName}')" title="Save over this position">💾</button>
                <button class="load-position-btn" onclick="loadPosition('${posName}')">Load</button>
                <button class="delete-position-btn" onclick="deletePosition('${posName}')">Delete</button>
            </div>
        `;
        
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
function saveOverPosition(positionName) {
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
    updateSavedPositionsList();
    updatePositionSelects();
    saveToXML();
}

// Delete position
function deletePosition(positionName) {
    if (confirm(`Delete position "${positionName}"?`)) {
        delete savedPositions[positionName];
        updateSavedPositionsList();
        updatePositionSelects();
        saveToXML();
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
    // Show refresh button after animation completes
    if (lastStartPosition) {
        refreshPositionBtn.style.display = 'inline-block';
    }
}

function resetToStartPosition() {
    if (lastStartPosition) {
        loadPosition(lastStartPosition);
        refreshPositionBtn.style.display = 'none';
    }
}

// Persistence functions
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
        
        if (data.players) {
            players = data.players;
            renderLineup();
        }
        
        if (data.savedPositions) {
            savedPositions = data.savedPositions;
            updateSavedPositionsList();
            updatePositionSelects();
        }
        
        // Save file name to localStorage for reference
        const fileName = file.name;
        localStorage.setItem('dataFileName', fileName);
        
        // Update status
        fileStatus.textContent = `✓ File selected: ${fileName}. All saves go directly to this file.`;
        fileStatus.style.color = '#27ae60';
        
        // Save current data to the file
        saveToXML();
    } catch (error) {
        if (error.name !== 'AbortError') {
            alert('Error selecting file: ' + error.message);
            console.error('Error:', error);
        }
    }
}

async function saveToXML() {
    const xml = generateXML();
    
    // Always save to localStorage as backup
    saveToLocalStorage();
    
    // Only save to file if file handle is set
    if (dataFileHandle) {
        try {
            const writable = await dataFileHandle.createWritable();
            await writable.write(xml);
            await writable.close();
            console.log('Data saved to data.xml');
            return;
        } catch (error) {
            console.error('Error saving to file:', error);
            // File handle might be invalid, clear it
            dataFileHandle = null;
            if (fileStatus) {
                fileStatus.textContent = 'File handle lost. Please select data.xml file again.';
                fileStatus.style.color = '#e74c3c';
            }
        }
    }
    
    // If no file handle, just save to localStorage
    // User needs to select the file first
    console.log('No file selected. Data saved to localStorage. Click "Select data.xml File" to enable file saving.');
}

function saveToLocalStorage() {
    const data = {
        players: players,
        savedPositions: savedPositions,
        version: '1.0'
    };
    localStorage.setItem('volleyballCoachData', JSON.stringify(data));
}

async function loadFromXML() {
    // Always try to load from data.xml file first
    try {
        const response = await fetch('data.xml');
        if (response.ok) {
            const xmlText = await response.text();
            const data = parseXML(xmlText);
            
            // Always use data from XML if it exists, even if empty
            if (data.players) {
                players = data.players;
            }
            if (data.savedPositions) {
                savedPositions = data.savedPositions;
            }
            
            // Render the loaded data
            renderLineup();
            updateSavedPositionsList();
            updatePositionSelects();
            
            console.log('Data loaded from data.xml');
            
            // Update status
            if (fileStatus) {
                fileStatus.textContent = '✓ Data loaded from data.xml. Click "Select data.xml File" to enable direct file saving.';
                fileStatus.style.color = '#27ae60';
            }
            
            return true;
        } else {
            console.log('data.xml not found or not accessible, trying localStorage');
        }
    } catch (error) {
        console.log('Could not load from data.xml (may need local server), trying localStorage:', error);
    }
    
    // Fallback to localStorage only if data.xml is not available
    const loaded = loadFromLocalStorage();
    if (loaded && fileStatus) {
        fileStatus.textContent = 'Data loaded from localStorage. data.xml not accessible (may need local server).';
        fileStatus.style.color = '#f39c12';
    }
    return loaded;
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('volleyballCoachData');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.players) {
                players = data.players;
            }
            if (data.savedPositions) {
                savedPositions = data.savedPositions;
            }
            
            // Render the loaded data
            renderLineup();
            updateSavedPositionsList();
            updatePositionSelects();
            
            console.log('Data loaded from localStorage');
            return true;
        } catch (e) {
            console.error('Error loading saved data:', e);
        }
    }
    return false;
}

function generateXML() {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<volleyballCoachData>\n';
    xml += `  <exportDate>${new Date().toISOString()}</exportDate>\n`;
    xml += `  <version>1.0</version>\n`;
    
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

function exportToJSON() {
    const data = {
        players: players,
        savedPositions: savedPositions,
        exportDate: new Date().toISOString(),
        version: '1.0'
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

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            let data;
            
            if (file.name.endsWith('.xml')) {
                data = parseXML(content);
            } else {
                data = JSON.parse(content);
            }
            
            if (data.players) {
                players = data.players;
                renderLineup();
            }
            
            if (data.savedPositions) {
                savedPositions = data.savedPositions;
                updateSavedPositionsList();
                updatePositionSelects();
            }
            
            saveToXML();
            alert('Data imported successfully!');
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
