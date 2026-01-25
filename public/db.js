// Hybrid Database Manager for Volleyball Coach
// Supports both API-based storage (web) and local storage (native)
// Now includes user authentication support

import { getApiBase, isNative } from './js/environment.js';

// Storage keys
const STORAGE_KEY = 'volleyball-coach-data';
const AUTH_TOKEN_KEY = 'volleyball-coach-auth-token';
const USER_KEY = 'volleyball-coach-user';
const VIEW_ONLY_MODE_KEY = 'volleyball-coach-view-only';
const VIEW_ONLY_TEAM_CODE_KEY = 'volleyball-coach-view-only-code';
const VIEW_ONLY_EXPIRATION_KEY = 'volleyball-coach-view-only-expiration';

// Get API base URL (lazy evaluation - null in native mode)
function getApiBaseUrl() {
    return getApiBase();
}

// ==================== Local Storage Helpers ====================

/**
 * Get all data from local storage
 */
async function getLocalData() {
    try {
        // Try to use Capacitor Preferences (works in both web and native)
        try {
            const { Preferences } = await import('@capacitor/preferences');
            const dataStr = await Preferences.get({ key: STORAGE_KEY });
            if (dataStr.value) {
                return JSON.parse(dataStr.value);
            }
        } catch (capError) {
            // Capacitor not available or Preferences failed, use localStorage
            const dataStr = localStorage.getItem(STORAGE_KEY);
            if (dataStr) {
                return JSON.parse(dataStr);
            }
        }
        // Return default empty structure
        return {
            players: [],
            positions: [],
            rotations: [],
            scenarios: [],
            sequences: [],
            savedPositions: {},
            version: '4.0',
            database: 'local'
        };
    } catch (error) {
        console.error('Error reading local data:', error);
        return {
            players: [],
            positions: [],
            rotations: [],
            scenarios: [],
            sequences: [],
            savedPositions: {},
            version: '4.0',
            database: 'local'
        };
    }
}

/**
 * Save all data to local storage
 */
async function saveLocalData(data) {
    try {
        const dataStr = JSON.stringify(data);
        // Try to use Capacitor Preferences (works in both web and native)
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.set({ key: STORAGE_KEY, value: dataStr });
        } catch (capError) {
            // Capacitor not available or Preferences failed, use localStorage
            localStorage.setItem(STORAGE_KEY, dataStr);
        }
        return true;
    } catch (error) {
        console.error('Error saving local data:', error);
        throw error;
    }
}

// ==================== Authentication Helpers ====================

/**
 * Get auth token from storage
 */
async function getAuthToken() {
    try {
        const { Preferences } = await import('@capacitor/preferences');
        const result = await Preferences.get({ key: AUTH_TOKEN_KEY });
        return result.value || null;
    } catch (capError) {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    }
}

/**
 * Save auth token to storage
 */
async function setAuthToken(token) {
    try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key: AUTH_TOKEN_KEY, value: token });
    } catch (capError) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
}

/**
 * Remove auth token from storage
 */
async function clearAuthToken() {
    try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: AUTH_TOKEN_KEY });
        await Preferences.remove({ key: USER_KEY });
    } catch (capError) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
}

/**
 * Get current user from storage
 */
async function getCurrentUser() {
    try {
        const { Preferences } = await import('@capacitor/preferences');
        const result = await Preferences.get({ key: USER_KEY });
        return result.value ? JSON.parse(result.value) : null;
    } catch (capError) {
        const userStr = localStorage.getItem(USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    }
}

/**
 * Save current user to storage
 */
async function setCurrentUser(user) {
    try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) });
    } catch (capError) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
}

// ==================== API Helpers ====================

/**
 * Make an API request with authentication
 */
async function apiRequest(endpoint, options = {}) {
    const apiBase = getApiBaseUrl();
    const url = `${apiBase}${endpoint}`;
    
    // Get auth token and add to headers if available
    const token = await getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // Handle authentication errors
    if (response.status === 401) {
        await clearAuthToken();
        // Dispatch event for UI to handle login redirect
        window.dispatchEvent(new CustomEvent('auth-required'));
        throw new Error('Authentication required. Please log in.');
    }
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }
    
    return await response.json();
}

// ==================== Authentication API ====================

/**
 * Register a new user
 */
export async function register(firstName, lastName, email, password, role) {
    const apiBase = getApiBaseUrl();
    if (!apiBase) {
        throw new Error('Registration is only available in web mode');
    }
    
    const response = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firstName, lastName, email, password, role })
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(error.error || 'Registration failed');
    }
    
    const data = await response.json();
    await setAuthToken(data.token);
    await setCurrentUser(data.user);
    return data;
}

/**
 * Login user
 */
export async function login(email, password) {
    const apiBase = getApiBaseUrl();
    if (!apiBase) {
        throw new Error('Login is only available in web mode');
    }
    
    const response = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(error.error || 'Login failed');
    }
    
    const data = await response.json();
    await setAuthToken(data.token);
    await setCurrentUser(data.user);
    return data;
}

/**
 * Logout user
 */
export async function logout() {
    await clearAuthToken();
    await clearViewOnlyMode();
}

/**
 * Get current user
 */
export async function getCurrentUserInfo() {
    return await getCurrentUser();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
    const token = await getAuthToken();
    return !!token;
}

/**
 * Get current user info from server (validates token)
 */
export async function fetchCurrentUser() {
    const apiBase = getApiBaseUrl();
    if (!apiBase) {
        return await getCurrentUser();
    }
    
    try {
        const user = await apiRequest('/auth/me');
        // Ensure teamCode and playerViewEnabled fields exist (for backward compatibility)
        if (user) {
            user.teamCode = user.teamCode || null;
            user.playerViewEnabled = user.playerViewEnabled || false;
        }
        await setCurrentUser(user);
        return user;
    } catch (error) {
        console.error('Error fetching current user:', error);
        await clearAuthToken();
        return null;
    }
}

// ==================== Public API ====================

/**
 * Initialize database
 */
export async function initDB() {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        // Web mode: Check if server is available and user is authenticated
        try {
            // Try to validate current token if we have one
            const token = await getAuthToken();
            if (token) {
                await fetchCurrentUser();
            }
            // Don't require auth for init - let the app handle login flow
            return true;
        } catch (error) {
            console.error('Error connecting to server:', error);
            // Don't throw - allow app to continue in case user needs to login
            return true;
        }
    } else {
        // Native mode: Local storage is always available
        return true;
    }
}

/**
 * Get all data
 */
async function getAllData() {
    // If in view-only mode, always use local data (stored from team code)
    try {
        const viewOnly = await isViewOnlyMode();
        if (viewOnly) {
            return await getLocalData();
        }
    } catch (error) {
        // If checking view-only mode fails, continue with normal flow
        console.warn('Error checking view-only mode:', error);
    }
    
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/data');
    } else {
        return await getLocalData();
    }
}

// ==================== Players ====================

export async function getAllPlayers() {
    // If in view-only mode, always use local data
    try {
        const viewOnly = await isViewOnlyMode();
        if (viewOnly) {
            const data = await getLocalData();
            return data.players || [];
        }
    } catch (error) {
        console.warn('Error checking view-only mode:', error);
    }
    
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/players');
    } else {
        const data = await getLocalData();
        return data.players || [];
    }
}

export async function savePlayer(player) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/players', {
            method: 'POST',
            body: JSON.stringify(player)
        });
    } else {
        const data = await getLocalData();
        if (!data.players) data.players = [];
        
        // Check for duplicate jersey numbers
        const existingPlayer = data.players.find(p => p.jersey === player.jersey && p.id !== player.id);
        if (existingPlayer) {
            throw new Error('A player with this jersey number already exists');
        }
        
        // Update or add player
        const index = data.players.findIndex(p => p.id === player.id);
        if (index >= 0) {
            data.players[index] = player;
        } else {
            data.players.push(player);
        }
        
        await saveLocalData(data);
        return player;
    }
}

export async function deletePlayer(playerId) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest(`/players/${playerId}`, { method: 'DELETE' });
    } else {
        const data = await getLocalData();
        data.players = data.players.filter(p => p.id !== playerId);
        
        // Remove player from all positions
        if (data.positions) {
            data.positions.forEach(position => {
                position.playerPositions = position.playerPositions.filter(
                    pos => pos.playerId !== playerId
                );
            });
        }
        
        // Remove from legacy savedPositions
        if (data.savedPositions && typeof data.savedPositions === 'object') {
            Object.keys(data.savedPositions).forEach(posName => {
                if (data.savedPositions[posName]) {
                    data.savedPositions[posName] = data.savedPositions[posName].filter(
                        pos => pos.playerId !== playerId
                    );
                }
            });
        }
        
        await saveLocalData(data);
        return { success: true };
    }
}

// ==================== Positions ====================

export async function getAllPositions() {
    // If in view-only mode, always use local data
    try {
        const viewOnly = await isViewOnlyMode();
        if (viewOnly) {
            const data = await getLocalData();
            return data.positions || [];
        }
    } catch (error) {
        console.warn('Error checking view-only mode:', error);
    }
    
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/positions');
    } else {
        const data = await getLocalData();
        return data.positions || [];
    }
}

export async function getAllPositionsNew() {
    return getAllPositions();
}

export async function savePosition(positionName, positions) {
    // Legacy format support
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/positions', {
            method: 'POST',
            body: JSON.stringify({
                positionName: positionName,
                positions: positions
            })
        });
    } else {
        const data = await getLocalData();
        if (!data.savedPositions) data.savedPositions = {};
        data.savedPositions[positionName] = positions;
        await saveLocalData(data);
        return { positionName, positions };
    }
}

export async function savePositionNew(position) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/positions', {
            method: 'POST',
            body: JSON.stringify(position)
        });
    } else {
        const data = await getLocalData();
        if (!data.positions) data.positions = [];
        
        const index = data.positions.findIndex(p => p.id === position.id);
        if (index >= 0) {
            data.positions[index] = position;
        } else {
            data.positions.push(position);
        }
        
        await saveLocalData(data);
        return position;
    }
}

export async function deletePosition(positionName) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        const encodedName = encodeURIComponent(positionName);
        return await apiRequest(`/positions/${encodedName}`, { method: 'DELETE' });
    } else {
        const data = await getLocalData();
        if (data.savedPositions) {
            delete data.savedPositions[positionName];
        }
        await saveLocalData(data);
        return { success: true };
    }
}

export async function deletePositionNew(positionId) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest(`/positions/${positionId}`, { method: 'DELETE' });
    } else {
        const data = await getLocalData();
        
        // Remove position from rotations
        if (data.rotations) {
            data.rotations.forEach(rotation => {
                rotation.positionIds = rotation.positionIds.filter(id => id !== positionId);
            });
        }
        
        // Remove position from scenarios
        if (data.scenarios) {
            data.scenarios = data.scenarios.filter(scenario => 
                scenario.startPositionId !== positionId && scenario.endPositionId !== positionId
            );
        }
        
        // Remove position from sequences
        if (data.sequences) {
            data.sequences.forEach(sequence => {
                if (sequence.items) {
                    sequence.items = sequence.items.filter(item => 
                        !(item.type === 'position' && item.id === positionId)
                    );
                }
            });
        }
        
        // Remove position
        if (data.positions) {
            data.positions = data.positions.filter(p => p.id !== positionId);
        }
        
        await saveLocalData(data);
        return { success: true };
    }
}

// ==================== Rotations ====================

export async function getAllRotations() {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/rotations');
    } else {
        const data = await getLocalData();
        return data.rotations || [];
    }
}

export async function saveRotation(rotation) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/rotations', {
            method: 'POST',
            body: JSON.stringify(rotation)
        });
    } else {
        const data = await getLocalData();
        if (!data.rotations) data.rotations = [];
        
        const index = data.rotations.findIndex(r => r.id === rotation.id);
        if (index >= 0) {
            data.rotations[index] = rotation;
        } else {
            data.rotations.push(rotation);
        }
        
        await saveLocalData(data);
        return rotation;
    }
}

export async function deleteRotation(rotationId) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest(`/rotations/${rotationId}`, { method: 'DELETE' });
    } else {
        const data = await getLocalData();
        
        // Remove rotation from positions
        if (data.positions) {
            data.positions.forEach(position => {
                position.rotationIds = position.rotationIds.filter(id => id !== rotationId);
            });
        }
        
        // Remove rotation
        if (data.rotations) {
            data.rotations = data.rotations.filter(r => r.id !== rotationId);
        }
        
        await saveLocalData(data);
        return { success: true };
    }
}

// ==================== Scenarios ====================

export async function getAllScenarios() {
    // If in view-only mode, always use local data
    try {
        const viewOnly = await isViewOnlyMode();
        if (viewOnly) {
            const data = await getLocalData();
            return data.scenarios || [];
        }
    } catch (error) {
        console.warn('Error checking view-only mode:', error);
    }
    
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/scenarios');
    } else {
        const data = await getLocalData();
        return data.scenarios || [];
    }
}

export async function saveScenario(scenario) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/scenarios', {
            method: 'POST',
            body: JSON.stringify(scenario)
        });
    } else {
        const data = await getLocalData();
        if (!data.scenarios) data.scenarios = [];
        
        const index = data.scenarios.findIndex(s => s.id === scenario.id);
        if (index >= 0) {
            data.scenarios[index] = scenario;
        } else {
            data.scenarios.push(scenario);
        }
        
        await saveLocalData(data);
        return scenario;
    }
}

export async function deleteScenario(scenarioId) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest(`/scenarios/${scenarioId}`, { method: 'DELETE' });
    } else {
        const data = await getLocalData();
        
        // Remove scenario from sequences
        if (data.sequences) {
            data.sequences.forEach(sequence => {
                if (sequence.scenarioIds) {
                    sequence.scenarioIds = sequence.scenarioIds.filter(id => id !== scenarioId);
                }
                if (sequence.items) {
                    sequence.items = sequence.items.filter(item => 
                        !(item.type === 'scenario' && item.id === scenarioId)
                    );
                }
            });
        }
        
        // Remove scenario
        if (data.scenarios) {
            data.scenarios = data.scenarios.filter(s => s.id !== scenarioId);
        }
        
        await saveLocalData(data);
        return { success: true };
    }
}

// ==================== Sequences ====================

export async function getAllSequences() {
    // If in view-only mode, always use local data
    try {
        const viewOnly = await isViewOnlyMode();
        if (viewOnly) {
            const data = await getLocalData();
            return data.sequences || [];
        }
    } catch (error) {
        console.warn('Error checking view-only mode:', error);
    }
    
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/sequences');
    } else {
        const data = await getLocalData();
        return data.sequences || [];
    }
}

export async function saveSequence(sequence) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/sequences', {
            method: 'POST',
            body: JSON.stringify(sequence)
        });
    } else {
        const data = await getLocalData();
        if (!data.sequences) data.sequences = [];
        
        // Support both old format (scenarioIds) and new format (items)
        if (sequence.scenarioIds && !sequence.items) {
            sequence.items = sequence.scenarioIds.map(id => ({
                type: 'scenario',
                id: id
            }));
        }
        
        if (!sequence.items) {
            sequence.items = [];
        }
        
        const index = data.sequences.findIndex(s => s.id === sequence.id);
        if (index >= 0) {
            data.sequences[index] = sequence;
        } else {
            data.sequences.push(sequence);
        }
        
        await saveLocalData(data);
        return sequence;
    }
}

export async function deleteSequence(sequenceId) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest(`/sequences/${sequenceId}`, { method: 'DELETE' });
    } else {
        const data = await getLocalData();
        if (data.sequences) {
            data.sequences = data.sequences.filter(s => s.id !== sequenceId);
        }
        await saveLocalData(data);
        return { success: true };
    }
}

// ==================== Import/Export ====================

export async function exportAllData() {
    const data = await getAllData();
    const apiBase = getApiBaseUrl();
    return {
        ...data,
        exportDate: new Date().toISOString(),
        version: data.version || '4.0',
        database: apiBase ? 'mongodb' : 'local'
    };
}

export async function importData(importedData) {
    const apiBase = getApiBaseUrl();
    if (apiBase) {
        return await apiRequest('/import', {
            method: 'POST',
            body: JSON.stringify(importedData)
        });
    } else {
        // Validate structure
        if (!importedData.players) {
            throw new Error('Invalid data format: players required');
        }
        
        let data;
        
        // Check if it's new format (v4.0)
        if (importedData.positions && Array.isArray(importedData.positions)) {
            data = {
                players: importedData.players || [],
                positions: importedData.positions || [],
                rotations: importedData.rotations || [],
                scenarios: importedData.scenarios || [],
                sequences: importedData.sequences || [],
                version: '4.0',
                database: 'local',
                importDate: new Date().toISOString()
            };
        } else {
            // Old format (v3.0)
            data = {
                players: importedData.players || [],
                savedPositions: importedData.savedPositions || {},
                version: '3.0',
                database: 'local',
                importDate: new Date().toISOString()
            };
        }
        
        await saveLocalData(data);
        return { success: true, data };
    }
}

export async function hasData() {
    try {
        // If in view-only mode, check local data directly
        const viewOnly = await isViewOnlyMode();
        if (viewOnly) {
            const data = await getLocalData();
            return (data.players?.length > 0 || 
                   (data.positions && data.positions.length > 0) ||
                   Object.keys(data.savedPositions || {}).length > 0);
        }
        
        const data = await exportAllData();
        return (data.players?.length > 0 || 
                (data.positions && data.positions.length > 0) ||
                Object.keys(data.savedPositions || {}).length > 0);
    } catch (error) {
        console.error('Error checking data:', error);
        return false;
    }
}

// ==================== View-Only Mode ====================

/**
 * Set view-only mode with team code and data
 */
export async function setViewOnlyMode(teamCode, viewData) {
    try {
        const dataToStore = viewData.data || viewData;
        
        // Set expiration to 24 hours from now
        const expirationTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours in milliseconds
        
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.set({ key: VIEW_ONLY_MODE_KEY, value: 'true' });
        await Preferences.set({ key: VIEW_ONLY_TEAM_CODE_KEY, value: teamCode });
        await Preferences.set({ key: VIEW_ONLY_EXPIRATION_KEY, value: expirationTime.toString() });
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(dataToStore) });
    } catch (capError) {
        const dataToStore = viewData.data || viewData;
        // Set expiration to 24 hours from now
        const expirationTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours in milliseconds
        localStorage.setItem(VIEW_ONLY_MODE_KEY, 'true');
        localStorage.setItem(VIEW_ONLY_TEAM_CODE_KEY, teamCode);
        localStorage.setItem(VIEW_ONLY_EXPIRATION_KEY, expirationTime.toString());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    }
}

/**
 * Check if in view-only mode (and not expired)
 */
export async function isViewOnlyMode() {
    try {
        const { Preferences } = await import('@capacitor/preferences');
        const result = await Preferences.get({ key: VIEW_ONLY_MODE_KEY });
        if (result.value !== 'true') {
            return false;
        }
        
        // Check expiration
        const expirationResult = await Preferences.get({ key: VIEW_ONLY_EXPIRATION_KEY });
        if (expirationResult.value) {
            const expirationTime = parseInt(expirationResult.value, 10);
            if (Date.now() > expirationTime) {
                // Expired - clear view-only mode
                await clearViewOnlyMode();
                return false;
            }
        }
        
        return true;
    } catch (capError) {
        const isViewOnly = localStorage.getItem(VIEW_ONLY_MODE_KEY) === 'true';
        if (!isViewOnly) {
            return false;
        }
        
        // Check expiration
        const expirationTimeStr = localStorage.getItem(VIEW_ONLY_EXPIRATION_KEY);
        if (expirationTimeStr) {
            const expirationTime = parseInt(expirationTimeStr, 10);
            if (Date.now() > expirationTime) {
                // Expired - clear view-only mode
                await clearViewOnlyMode();
                return false;
            }
        }
        
        return true;
    }
}

/**
 * Get view-only team code
 */
export async function getViewOnlyTeamCode() {
    try {
        const { Preferences } = await import('@capacitor/preferences');
        const result = await Preferences.get({ key: VIEW_ONLY_TEAM_CODE_KEY });
        return result.value || null;
    } catch (capError) {
        return localStorage.getItem(VIEW_ONLY_TEAM_CODE_KEY);
    }
}

/**
 * Clear view-only mode
 */
export async function clearViewOnlyMode() {
    try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: VIEW_ONLY_MODE_KEY });
        await Preferences.remove({ key: VIEW_ONLY_TEAM_CODE_KEY });
        await Preferences.remove({ key: VIEW_ONLY_EXPIRATION_KEY });
    } catch (capError) {
        localStorage.removeItem(VIEW_ONLY_MODE_KEY);
        localStorage.removeItem(VIEW_ONLY_TEAM_CODE_KEY);
        localStorage.removeItem(VIEW_ONLY_EXPIRATION_KEY);
    }
    // Also clear the view-only data from storage
    try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: STORAGE_KEY });
    } catch (capError) {
        localStorage.removeItem(STORAGE_KEY);
    }
}
