// Authentication UI module
// Handles login/register UI and user session management

import * as db from '../db.js';

let authModal = null;
let currentUser = null;
 
/**
 * Initialize authentication UI
 * @returns {Promise<boolean>} - true if authenticated (or native mode), false if needs authentication
 */
export async function initAuth() {
    authModal = document.getElementById('auth-modal-overlay');
    
    // Check if we're in view-only mode first - don't show auth modal in view-only mode
    const isViewOnly = await db.isViewOnlyMode();
    if (isViewOnly) {
        // Hide auth modal if it's showing
        hideAuthModal();
        ensureAuthListeners();
        return true; // View-only mode doesn't need authentication
    }
    
    // Check if we're in web mode (need auth) or native mode (local storage)
    const { getApiBase } = await import('./environment.js');
    const apiBase = getApiBase();
    
    if (apiBase) {
        // Web mode requires authentication
        const isAuth = await db.isAuthenticated();
        if (isAuth) {
            try {
                currentUser = await db.fetchCurrentUser();
                if (!currentUser) {
                    // Token is invalid, show login
                    showAuthModal();
                    ensureAuthListeners();
                    return false;
                } else {
                    updateUserDisplay();
                    ensureAuthListeners();
                    return true; // Authenticated
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                showAuthModal();
                ensureAuthListeners();
                return false;
            }
        } else {
            // Not authenticated, show login
            showAuthModal();
            ensureAuthListeners();
            return false;
        }
    } else {
        // Native mode - no authentication required (uses local storage)
        updateUserDisplay();
        ensureAuthListeners();
        return true; // Native mode doesn't need auth
    }
}

/**
 * Setup event listeners for auth UI
 */
function setupAuthListeners() {
    // Tab switching
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm && !loginForm.hasAttribute('data-listener-set')) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleLogin();
        });
        loginForm.setAttribute('data-listener-set', 'true');
    }
    
    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm && !registerForm.hasAttribute('data-listener-set')) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleRegister();
        });
        registerForm.setAttribute('data-listener-set', 'true');
    }
    
    // Set up team code listeners
    setupTeamCodeListeners();
}

/**
 * Set up team code input and submit button listeners
 */
function setupTeamCodeListeners() {
    const teamCodeInput = document.getElementById('team-code-input');
    const teamCodeSubmitBtn = document.getElementById('team-code-submit-btn');
    
    if (teamCodeInput && teamCodeSubmitBtn) {
        // Check if listeners are already set up
        if (!teamCodeInput.hasAttribute('data-listener-set')) {
            // Auto-uppercase team code input
            teamCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
            
            // Submit on Enter key
            teamCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    teamCodeSubmitBtn.click();
                }
            });
            
            teamCodeInput.setAttribute('data-listener-set', 'true');
        }
        
        // Submit button (check if listener is already set)
        if (!teamCodeSubmitBtn.hasAttribute('data-listener-set')) {
            teamCodeSubmitBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await handleTeamCodeLogin();
            });
            teamCodeSubmitBtn.setAttribute('data-listener-set', 'true');
        }
    }
}

// Setup auth event listeners and auth-required handler (only once)
let authListenersSetup = false;
export function ensureAuthListeners() {
    if (!authListenersSetup) {
        setupAuthListeners();
        
        // Listen for auth-required events
        window.addEventListener('auth-required', () => {
            showAuthModal();
        });
        
        authListenersSetup = true;
    }
}

/**
 * Switch between login, register, and team code tabs
 */
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const teamCodeForm = document.getElementById('team-code-form');
    
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Hide all forms
    loginForm.classList.add('hidden');
    registerForm.classList.add('hidden');
    if (teamCodeForm) teamCodeForm.classList.add('hidden');
    
    // Show the selected form
    if (tabName === 'login') {
        loginForm.classList.remove('hidden');
    } else if (tabName === 'register') {
        registerForm.classList.remove('hidden');
    } else if (tabName === 'team-code' && teamCodeForm) {
        teamCodeForm.classList.remove('hidden');
        // Ensure team code listeners are set up when switching to this tab
        setupTeamCodeListeners();
    }
    
    // Clear errors
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    const teamCodeError = document.getElementById('team-code-error');
    if (loginError) {
        loginError.textContent = '';
        loginError.style.display = 'none';
    }
    if (registerError) {
        registerError.textContent = '';
        registerError.style.display = 'none';
    }
    if (teamCodeError) {
        teamCodeError.textContent = '';
        teamCodeError.style.display = 'none';
    }
}

/**
 * Show authentication modal
 */
function showAuthModal() {
    if (authModal) {
        authModal.classList.remove('hidden');
        // Hide app content
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.add('auth-required');
        }
        // Reset to login tab
        switchTab('login');
    }
}

/**
 * Hide authentication modal
 */
function hideAuthModal() {
    if (authModal) {
        authModal.classList.add('hidden');
        // Show app content
        const appContainer = document.querySelector('.app-container');
        if (appContainer) {
            appContainer.classList.remove('auth-required');
        }
    }
}

/**
 * Handle login
 */
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    // Clear error
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    
    try {
        const result = await db.login(email, password);
        currentUser = result.user;
        updateUserDisplay();
        hideAuthModal();
        
        // Initialize the app now that we're authenticated
        // Dispatch event to trigger app initialization
        window.dispatchEvent(new CustomEvent('auth-success'));
        
        // Reload the page to refresh data and initialize app properly
        window.location.reload();
    } catch (error) {
        errorEl.textContent = error.message || 'Login failed. Please try again.';
        errorEl.style.display = 'block';
    }
}

/**
 * Handle registration
 */
async function handleRegister() {
    const firstName = document.getElementById('register-first-name').value;
    const lastName = document.getElementById('register-last-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    const errorEl = document.getElementById('register-error');
    
    // Clear error
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    
    if (!firstName || !lastName || !email || !password || !role) {
        errorEl.textContent = 'All fields are required';
        errorEl.style.display = 'block';
        return;
    }
    
    try {
        const result = await db.register(firstName, lastName, email, password, role);
        currentUser = result.user;
        updateUserDisplay();
        hideAuthModal();
        
        // Initialize the app now that we're authenticated
        // Dispatch event to trigger app initialization
        window.dispatchEvent(new CustomEvent('auth-success'));
        
        // Reload the page to refresh data and initialize app properly
        window.location.reload();
    } catch (error) {
        errorEl.textContent = error.message || 'Registration failed. Please try again.';
        errorEl.style.display = 'block';
    }
}

/**
 * Handle team code login (view-only mode)
 */
async function handleTeamCodeLogin() {
    const teamCodeInput = document.getElementById('team-code-input');
    if (!teamCodeInput) {
        return;
    }
    
    const teamCode = teamCodeInput.value.trim().toUpperCase();
    const errorEl = document.getElementById('team-code-error');
    
    // Clear error
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
    
    if (!teamCode || teamCode.length !== 6) {
        if (errorEl) {
            errorEl.textContent = 'Please enter a valid 6-character team code.';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    try {
        const { getApiBase } = await import('./environment.js');
        const apiBase = getApiBase();
        
        if (!apiBase) {
            errorEl.textContent = 'Team code view is only available in web mode.';
            errorEl.style.display = 'block';
            return;
        }
        
        // Fetch team data using team code
        // apiBase already includes /api, so just append /view/
        const endpoint = `${apiBase}/view/${teamCode}`;
        const response = await fetch(endpoint);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Invalid team code' }));
            throw new Error(error.error || 'Invalid team code');
        }
        
        const viewData = await response.json();
        
        // Store view-only mode data
        await db.setViewOnlyMode(teamCode, viewData);
        
        // Hide auth modal
        hideAuthModal();
        
        // Dispatch event to trigger app initialization in view-only mode
        window.dispatchEvent(new CustomEvent('auth-success'));
        
        // Reload the page with the team code in the URL so it persists
        window.location.href = window.location.pathname + '?code=' + teamCode;
    } catch (error) {
        console.error('Error in handleTeamCodeLogin:', error);
        if (errorEl) {
            errorEl.textContent = error.message || 'Failed to load team data. Please check your team code.';
            errorEl.style.display = 'block';
        }
    }
}

/**
 * Handle logout
 */
export async function handleLogout() {
    await db.logout();
    currentUser = null;
    updateUserDisplay();
    showAuthModal();
}

/**
 * Update user display (add user info to header if needed)
 */
function updateUserDisplay() {
    // You can add user info display here if needed
    // For now, we'll just hide the auth modal if user is logged in
    if (currentUser) {
        hideAuthModal();
    }
}

/**
 * Get current user
 */
export function getCurrentUser() {
    return currentUser;
}
