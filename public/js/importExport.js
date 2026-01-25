// Import/Export module

import * as db from '../db.js';
import { state, setPlayers, setSavedPositions, setPositions, setScenarios, setSequences, setDbInitialized } from './state.js';
import { dom } from './dom.js';
import { alert } from './modal.js';
import { 
    renderLineup, 
    renderPositionsList, 
    renderScenariosList, 
    renderSequencesList,
    updateSavedPositionsList 
} from './ui.js';
import { updateScenarioSelects } from './scenarios.js';

// Migration function - converts XML data to file-based storage
export async function migrateFromLegacyStorage() {
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
            setPlayers(legacyData.players || []);
            setSavedPositions(legacyData.savedPositions || {});
            
            // Try to load new format if available
            try {
                const positions = await db.getAllPositionsNew();
                const scenarios = await db.getAllScenarios();
                const sequences = await db.getAllSequences();
                
                setPositions(positions);
                setScenarios(scenarios);
                setSequences(sequences);
            } catch (error) {
                console.log('New format data not available during migration');
            }
            
            renderLineup();
            renderPositionsList();
            renderScenariosList();
            renderSequencesList();
            updateSavedPositionsList();
            updateScenarioSelects();
            
            if (dom.fileStatus) {
                dom.fileStatus.textContent = '✓ Legacy data migrated to file-based storage.';
                dom.fileStatus.style.color = '#27ae60';
            }
            
            console.log('Migration successful!');
            return true;
        } catch (error) {
            console.error('Error during migration:', error);
            if (dom.fileStatus) {
                dom.fileStatus.textContent = 'Error migrating data. Starting fresh.';
                dom.fileStatus.style.color = '#e74c3c';
            }
        }
    }
    
    return false;
}

// Persistence functions (for export/import)
let dataFileHandle = null;

export async function selectDataFile() {
    if (!window.showOpenFilePicker) {
        await alert('File System Access API is not supported in this browser. Please use Chrome or Edge.');
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
        if (state.dbInitialized) {
            await db.importData(data);
        }
        
        // Reload data from server
        setPlayers(await db.getAllPlayers());
        setSavedPositions(await db.getAllPositions());
        
        // Load new format
        try {
            setPositions(await db.getAllPositionsNew());
            setScenarios(await db.getAllScenarios());
            setSequences(await db.getAllSequences());
        } catch (error) {
            console.log('New format data not available');
        }
        
        renderLineup();
        renderPositionsList();
        renderScenariosList();
        renderSequencesList();
        updateSavedPositionsList();
        updateScenarioSelects();
        
        // Update status
        const fileName = file.name;
        dom.fileStatus.textContent = `✓ File imported: ${fileName}. Data saved to data.json.`;
        dom.fileStatus.style.color = '#27ae60';
    } catch (error) {
        if (error.name !== 'AbortError') {
            await alert('Error selecting file: ' + error.message);
            console.error('Error:', error);
        }
    }
}

export async function exportToJSON() {
    // Get latest data from file-based storage
    if (state.dbInitialized) {
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
            await alert('Error exporting data: ' + error.message);
        }
    }
    
    // Fallback to current state
    const data = {
        players: state.players,
        savedPositions: state.savedPositions,
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


export async function handleFileImport(event) {
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
            if (state.dbInitialized) {
                await db.importData(data);
            }
            
            // Reload data from server
            setPlayers(await db.getAllPlayers());
            setSavedPositions(await db.getAllPositions());
            
            // Load new format
            try {
                setPositions(await db.getAllPositionsNew());
                setScenarios(await db.getAllScenarios());
                setSequences(await db.getAllSequences());
            } catch (error) {
                console.log('New format data not available');
            }
            
            renderLineup();
            renderPositionsList();
            renderScenariosList();
            renderSequencesList();
            updateSavedPositionsList();
            updateScenarioSelects();
            
            await alert('Data imported successfully! Saved to data.json file.');
        } catch (error) {
            await alert('Error importing file: ' + error.message);
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
