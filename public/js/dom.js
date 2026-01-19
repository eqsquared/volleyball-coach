// DOM element references

export const dom = {
    lineupList: null,
    court: null,
    jerseyInput: null,
    nameInput: null,
    addPlayerBtn: null,
    positionNameInput: null,
    savePositionBtn: null,
    startPositionSelect: null,
    endPositionSelect: null,
    playAnimationBtn: null,
    refreshPositionBtn: null,
    savedPositionsList: null,
    selectFileBtn: null,
    exportJsonBtn: null,
    exportXmlBtn: null,
    importBtn: null,
    importFileInput: null,
    fileStatus: null
};

// Initialize DOM references
export function initDOM() {
    dom.lineupList = document.getElementById('lineup-list');
    dom.court = document.getElementById('court');
    dom.jerseyInput = document.getElementById('jersey-number');
    dom.nameInput = document.getElementById('player-name');
    dom.addPlayerBtn = document.getElementById('add-player-btn');
    dom.positionNameInput = document.getElementById('position-name');
    dom.savePositionBtn = document.getElementById('save-position-btn');
    dom.startPositionSelect = document.getElementById('start-position');
    dom.endPositionSelect = document.getElementById('end-position');
    dom.playAnimationBtn = document.getElementById('play-animation-btn');
    dom.refreshPositionBtn = document.getElementById('refresh-position-btn');
    dom.savedPositionsList = document.getElementById('saved-positions-list');
    dom.selectFileBtn = document.getElementById('select-file-btn');
    dom.exportJsonBtn = document.getElementById('export-json-btn');
    dom.exportXmlBtn = document.getElementById('export-xml-btn');
    dom.importBtn = document.getElementById('import-btn');
    dom.importFileInput = document.getElementById('import-file');
    dom.fileStatus = document.getElementById('file-status');
}
