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
    startPositionZone: null,
    endPositionZone: null,
    startPositionContent: null,
    endPositionContent: null,
    clearStartPositionBtn: null,
    clearEndPositionBtn: null,
    clearScenarioBtn: null,
    positionDropZones: null,
    sequenceTimeline: null,
    timelineContainer: null,
    sequencePlayBtn: null,
    sequencePrevBtn: null,
    sequenceNextBtn: null,
    
    // State
    currentItemDisplay: null,
    currentItemBadge: null,
    currentItemName: null,
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
    accordions: null,
    
    // Mobile
    mobileMenuBtn: null,
    drawerOverlay: null,
    sidebar: null
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
    dom.startPositionZone = document.getElementById('start-position-zone');
    dom.endPositionZone = document.getElementById('end-position-zone');
    dom.startPositionContent = document.getElementById('start-position-content');
    dom.endPositionContent = document.getElementById('end-position-content');
    dom.clearStartPositionBtn = document.getElementById('clear-start-position');
    dom.clearEndPositionBtn = document.getElementById('clear-end-position');
    dom.clearScenarioBtn = document.getElementById('clear-scenario-btn');
    dom.positionDropZones = document.getElementById('position-drop-zones');
    dom.sequenceTimeline = document.getElementById('sequence-timeline');
    dom.timelineContainer = document.getElementById('timeline-container');
    dom.sequencePlayBtn = document.getElementById('sequence-play-btn');
    dom.sequencePrevBtn = document.getElementById('sequence-prev-btn');
    dom.sequenceNextBtn = document.getElementById('sequence-next-btn');
    
    // State
    dom.currentItemDisplay = document.getElementById('current-item-display');
    dom.currentItemBadge = document.getElementById('current-item-badge');
    dom.currentItemName = document.getElementById('current-item-name');
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
    
    // Mobile
    dom.mobileMenuBtn = document.getElementById('mobile-menu-btn');
    dom.drawerOverlay = document.getElementById('drawer-overlay');
    dom.sidebar = document.getElementById('sidebar');
}
