// DOM element references

export const dom = {
    // Court
    court: null,
    
    // Players
    lineupList: null,
    jerseyInput: null,
    nameInput: null,
    addPlayerBtn: null,
    
    // Positions
    positionSearchInput: null,
    tagFilterBtn: null,
    selectedTagsContainer: null,
    newPositionBtn: null,
    positionsList: null,
    
    // Scenarios
    scenarioNameInput: null,
    scenarioStartSelect: null,
    scenarioEndSelect: null,
    createScenarioBtn: null,
    scenariosList: null,
    
    // Sequences
    sequenceNameInput: null,
    createSequenceBtn: null,
    sequencesList: null,
    
    // Animation
    playAnimationBtn: null,
    nextScenarioBtn: null,
    refreshPositionBtn: null,
    sequenceProgress: null,
    sequenceProgressText: null,
    
    // State
    currentItemDisplay: null,
    currentItemValue: null,
    modifiedIndicator: null,
    saveBtn: null,
    saveAsBtn: null,
    discardBtn: null,
    
    // Edit Modes
    modeButtons: null,
    
    // Data Management
    exportJsonBtn: null,
    exportXmlBtn: null,
    importBtn: null,
    importFileInput: null,
    fileStatus: null,
    
    // Accordions
    accordions: null
};

// Initialize DOM references
export function initDOM() {
    // Court
    dom.court = document.getElementById('court');
    
    // Players
    dom.lineupList = document.getElementById('lineup-list');
    dom.jerseyInput = document.getElementById('jersey-number');
    dom.nameInput = document.getElementById('player-name');
    dom.addPlayerBtn = document.getElementById('add-player-btn');
    
    // Positions
    dom.positionSearchInput = document.getElementById('position-search-input');
    dom.tagFilterBtn = document.getElementById('tag-filter-btn');
    dom.selectedTagsContainer = document.getElementById('selected-tags-container');
    dom.newPositionBtn = document.getElementById('new-position-btn');
    dom.positionsList = document.getElementById('positions-list');
    
    // Scenarios
    dom.scenarioNameInput = document.getElementById('scenario-name-input');
    dom.scenarioStartSelect = document.getElementById('scenario-start-select');
    dom.scenarioEndSelect = document.getElementById('scenario-end-select');
    dom.createScenarioBtn = document.getElementById('create-scenario-btn');
    dom.scenariosList = document.getElementById('scenarios-list');
    
    // Sequences
    dom.sequenceNameInput = document.getElementById('sequence-name-input');
    dom.createSequenceBtn = document.getElementById('create-sequence-btn');
    dom.sequencesList = document.getElementById('sequences-list');
    
    // Animation
    dom.playAnimationBtn = document.getElementById('play-animation-btn');
    dom.nextScenarioBtn = document.getElementById('next-scenario-btn');
    dom.refreshPositionBtn = document.getElementById('refresh-position-btn');
    dom.sequenceProgress = document.getElementById('sequence-progress');
    dom.sequenceProgressText = document.getElementById('sequence-progress-text');
    
    // State
    dom.currentItemDisplay = document.getElementById('current-item-display');
    dom.currentItemValue = document.getElementById('current-item-value');
    dom.modifiedIndicator = document.getElementById('modified-indicator');
    dom.saveBtn = document.getElementById('save-btn');
    dom.saveAsBtn = document.getElementById('save-as-btn');
    dom.discardBtn = document.getElementById('discard-btn');
    
    // Edit Modes
    dom.modeButtons = document.querySelectorAll('.mode-btn');
    
    // Data Management
    dom.exportJsonBtn = document.getElementById('export-json-btn');
    dom.exportXmlBtn = document.getElementById('export-xml-btn');
    dom.importBtn = document.getElementById('import-btn');
    dom.importFileInput = document.getElementById('import-file');
    dom.fileStatus = document.getElementById('file-status');
    
    // Accordions
    dom.accordions = document.querySelectorAll('.accordion');
}
