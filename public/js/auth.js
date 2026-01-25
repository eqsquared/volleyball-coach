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
 * Switch between login and register tabs
 */
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.auth-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    if (tabName === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
    
    // Clear errors
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');
    loginError.textContent = '';
    registerError.textContent = '';
    loginError.style.display = 'none';
    registerError.style.display = 'none';
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
