// Profile menu and settings module

import * as db from '../db.js';
import { customModal, prompt, confirm, hideModal } from './modal.js';
import { handleLogout, getCurrentUser } from './auth.js';
import { exportToJSON, handleFileImport } from './importExport.js';
import { dom } from './dom.js';

let profileMenuOpen = false;

/**
 * Initialize profile menu
 */
export function initProfile() {
    try {
        const profileButton = document.getElementById('profile-button');
        const profileMenu = document.getElementById('profile-menu');
        const profileSection = document.querySelector('.profile-section');
        const profileName = document.getElementById('profile-name');
        const settingsBtn = document.getElementById('profile-settings');
        const themeBtn = document.getElementById('profile-theme');
        const logoutBtn = document.getElementById('profile-logout');
        
        // Load and display user name (don't await - non-blocking)
        updateProfileName().catch(error => {
            console.error('Error updating profile name:', error);
            // Non-critical error, continue initialization
        });
    
    // Toggle profile menu
    if (profileButton) {
        profileButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleProfileMenu();
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (profileMenuOpen && profileSection && !profileSection.contains(e.target)) {
            closeProfileMenu();
        }
    });
    
    // Settings button
    if (settingsBtn) {
        settingsBtn.addEventListener('click', async () => {
            closeProfileMenu();
            await showSettingsModal();
        });
    }
    
    // Theme toggle button
    const themeToggleBtn = document.getElementById('profile-theme-toggle');
    const themeOptions = document.getElementById('profile-theme-options');
    
    if (themeToggleBtn && themeOptions) {
        themeToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleThemeOptions();
        });
    }
    
    // Theme option buttons
    const themeLightBtn = document.getElementById('profile-theme-light');
    const themeDarkBtn = document.getElementById('profile-theme-dark');
    const themeSystemBtn = document.getElementById('profile-theme-system');
    
    if (themeLightBtn) {
        themeLightBtn.addEventListener('click', async () => {
            await setTheme('light');
            updateThemeSelection();
        });
    }
    
    if (themeDarkBtn) {
        themeDarkBtn.addEventListener('click', async () => {
            await setTheme('dark');
            updateThemeSelection();
        });
    }
    
    if (themeSystemBtn) {
        themeSystemBtn.addEventListener('click', async () => {
            await setTheme('system');
            updateThemeSelection();
        });
    }
    
    // Load saved theme preference on initialization
    loadTheme();
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            closeProfileMenu();
            const confirmed = await confirm('Are you sure you want to log out?', 'Logout');
            if (confirmed) {
                await handleLogout();
            }
        });
    }
    } catch (error) {
        console.error('Error initializing profile:', error);
        // Don't throw - profile initialization is not critical for app functionality
    }
}

/**
 * Toggle profile menu
 */
function toggleProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    const profileSection = document.querySelector('.profile-section');
    
    if (profileMenuOpen) {
        closeProfileMenu();
    } else {
        openProfileMenu();
    }
}

/**
 * Open profile menu
 */
async function openProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    const profileSection = document.querySelector('.profile-section');
    
    if (profileMenu && profileSection) {
        profileMenu.classList.remove('hidden');
        profileSection.classList.add('active');
        profileMenuOpen = true;
        // Update theme selection indicators
        await updateThemeSelection();
    }
}

/**
 * Close profile menu
 */
function closeProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    const profileSection = document.querySelector('.profile-section');
    
    if (profileMenu && profileSection) {
        profileMenu.classList.add('hidden');
        profileSection.classList.remove('active');
        profileMenuOpen = false;
    }
}

/**
 * Update profile name display
 */
async function updateProfileName() {
    const profileName = document.getElementById('profile-name');
    if (!profileName) return;
    
    try {
        const user = getCurrentUser() || await db.fetchCurrentUser();
        if (user) {
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
            profileName.textContent = fullName || 'My Profile';
        } else {
            profileName.textContent = 'My Profile';
        }
    } catch (error) {
        console.error('Error loading user:', error);
        profileName.textContent = 'My Profile';
        // Don't throw - this is a non-critical error
    }
}

/**
 * Show settings modal
 */
async function showSettingsModal() {
    try {
        const user = getCurrentUser() || await db.fetchCurrentUser();
        if (!user) {
            await alert('Unable to load user information.', 'Error');
            return;
        }
        
        const bodyHtml = `
            <div class="settings-content">
                <div class="settings-section">
                    <h4 class="settings-section-title">Profile Information</h4>
                    <div class="form-group">
                        <label for="settings-first-name">First Name</label>
                        <input type="text" id="settings-first-name" class="modal-input" value="${escapeHtml(user.firstName || '')}" placeholder="First Name">
                    </div>
                    <div class="form-group">
                        <label for="settings-last-name">Last Name</label>
                        <input type="text" id="settings-last-name" class="modal-input" value="${escapeHtml(user.lastName || '')}" placeholder="Last Name">
                    </div>
                    <div class="form-group">
                        <label for="settings-email">Email</label>
                        <input type="email" id="settings-email" class="modal-input" value="${escapeHtml(user.email || '')}" placeholder="Email" disabled>
                        <small class="form-help">Email cannot be changed</small>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4 class="settings-section-title">Change Password</h4>
                    <div class="form-group">
                        <label for="settings-current-password">Current Password</label>
                        <input type="password" id="settings-current-password" class="modal-input" placeholder="Current Password">
                    </div>
                    <div class="form-group">
                        <label for="settings-new-password">New Password</label>
                        <input type="password" id="settings-new-password" class="modal-input" placeholder="New Password" minlength="6">
                        <small class="form-help">Must be at least 6 characters</small>
                    </div>
                    <div class="form-group">
                        <label for="settings-confirm-password">Confirm New Password</label>
                        <input type="password" id="settings-confirm-password" class="modal-input" placeholder="Confirm New Password">
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4 class="settings-section-title">Player View</h4>
                    <div class="form-group">
                        <label class="toggle-label">
                            <input type="checkbox" id="settings-player-view-enabled" ${(user.playerViewEnabled === true) ? 'checked' : ''}>
                            <span>Enable Player View</span>
                        </label>
                        <small class="form-help">Allow players to view your team data using a team code</small>
                    </div>
                    <div class="form-group" id="team-code-section" style="${(user.playerViewEnabled === true) ? '' : 'display: none;'}">
                        <label for="team-code-display">Team Code</label>
                        <div class="team-code-display-wrapper">
                            <input type="text" id="team-code-display" class="modal-input team-code-input" value="${escapeHtml(user.teamCode || '')}" readonly>
                            <button type="button" class="copy-code-btn" id="copy-team-code-btn" title="Copy to clipboard">
                                <i data-lucide="copy"></i>
                            </button>
                        </div>
                        <small class="form-help">Share this code with players to give them read-only access</small>
                        <div class="team-code-url-wrapper" style="margin-top: 10px;">
                            <label for="team-code-url">Share URL</label>
                            <div class="team-code-display-wrapper">
                                <input type="text" id="team-code-url" class="modal-input team-code-input" value="${user.teamCode ? window.location.origin + window.location.pathname + '?code=' + escapeHtml(user.teamCode) : ''}" readonly>
                                <button type="button" class="copy-code-btn" id="copy-url-btn" title="Copy to clipboard">
                                    <i data-lucide="copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4 class="settings-section-title">Data Management</h4>
                    <div class="data-buttons">
                        <button class="modal-btn modal-btn-secondary" id="settings-export-btn">Export Data</button>
                        <button class="modal-btn modal-btn-secondary" id="settings-import-btn">Import File</button>
                        <input type="file" id="settings-import-file" accept=".json,.xml" class="hidden">
                    </div>
                    <p class="data-info" id="settings-file-status"></p>
                </div>
                
                <div class="settings-error" id="settings-error"></div>
            </div>
        `;
        
        const footerHtml = `
            <button class="modal-btn modal-btn-secondary" id="settings-cancel-btn">Cancel</button>
            <button class="modal-btn modal-btn-primary" id="settings-save-btn">Save Changes</button>
        `;
        
        // Show modal and set up listeners immediately (don't await - modal Promise resolves on close)
        customModal('Settings', bodyHtml, footerHtml);
        
        // Set up event listeners immediately after modal is shown
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            setupSettingsListeners(user);
        }, 100);
    } catch (error) {
        console.error('Error showing settings modal:', error);
        await alert('Unable to load settings. Please try again.', 'Error');
    }
}

/**
 * Set up event listeners for settings modal
 */
function setupSettingsListeners(user) {
    const cancelBtn = document.getElementById('settings-cancel-btn');
    const saveBtn = document.getElementById('settings-save-btn');
    const exportBtn = document.getElementById('settings-export-btn');
    const importBtn = document.getElementById('settings-import-btn');
    const importFileInput = document.getElementById('settings-import-file');
    const errorEl = document.getElementById('settings-error');
    
    // Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
            const { hideModal } = await import('./modal.js');
            hideModal();
        });
    }
    
    // Save button
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            try {
                await handleSaveSettings(user, errorEl);
            } catch (error) {
                console.error('Error in save button handler:', error);
                if (errorEl) {
                    errorEl.textContent = error.message || 'Failed to save settings. Please try again.';
                    errorEl.style.display = 'block';
                }
            }
        });
    }
    
    // Export button
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            try {
                await exportToJSON();
                if (errorEl) {
                    errorEl.textContent = '';
                    errorEl.style.display = 'none';
                }
                const fileStatus = document.getElementById('settings-file-status');
                if (fileStatus) {
                    fileStatus.textContent = '✓ Data exported successfully.';
                    fileStatus.style.color = '#27ae60';
                }
            } catch (error) {
                if (errorEl) {
                    errorEl.textContent = 'Error exporting data: ' + error.message;
                    errorEl.style.display = 'block';
                }
            }
        });
    }
    
    // Import button
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            if (importFileInput) {
                importFileInput.click();
            }
        });
    }
    
    // Import file input
    if (importFileInput) {
        importFileInput.addEventListener('change', async (e) => {
            try {
                await handleFileImport(e);
                if (errorEl) {
                    errorEl.textContent = '';
                    errorEl.style.display = 'none';
                }
                const fileStatus = document.getElementById('settings-file-status');
                if (fileStatus) {
                    fileStatus.textContent = '✓ Data imported successfully.';
                    fileStatus.style.color = '#27ae60';
                }
            } catch (error) {
                if (errorEl) {
                    errorEl.textContent = 'Error importing data: ' + error.message;
                    errorEl.style.display = 'block';
                }
            }
        });
    }
    
    // Player view toggle
    const playerViewToggle = document.getElementById('settings-player-view-enabled');
    const teamCodeSection = document.getElementById('team-code-section');
    
    if (playerViewToggle && teamCodeSection) {
        playerViewToggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            teamCodeSection.style.display = isChecked ? 'block' : 'none';
            
            // If enabling player view but no team code yet, show a message
            if (isChecked && !document.getElementById('team-code-display')?.value) {
                // Team code will be generated when saved
                const teamCodeInput = document.getElementById('team-code-display');
                if (teamCodeInput) {
                    teamCodeInput.value = 'Will be generated when saved...';
                }
            } else if (!isChecked) {
                // Clear team code display when disabling
                const teamCodeInput = document.getElementById('team-code-display');
                const urlInput = document.getElementById('team-code-url');
                if (teamCodeInput) {
                    teamCodeInput.value = '';
                }
                if (urlInput) {
                    urlInput.value = '';
                }
            }
        });
    }
    
    // Copy team code button
    const copyTeamCodeBtn = document.getElementById('copy-team-code-btn');
    if (copyTeamCodeBtn) {
        copyTeamCodeBtn.addEventListener('click', async () => {
            const teamCodeInput = document.getElementById('team-code-display');
            if (teamCodeInput && teamCodeInput.value) {
                try {
                    await navigator.clipboard.writeText(teamCodeInput.value);
                    const { alert: showAlert } = await import('./modal.js');
                    await showAlert('Team code copied to clipboard!', 'Copied');
                } catch (error) {
                    console.error('Failed to copy:', error);
                }
            }
        });
    }
    
    // Copy URL button
    const copyUrlBtn = document.getElementById('copy-url-btn');
    if (copyUrlBtn) {
        copyUrlBtn.addEventListener('click', async () => {
            const urlInput = document.getElementById('team-code-url');
            if (urlInput && urlInput.value) {
                try {
                    await navigator.clipboard.writeText(urlInput.value);
                    const { alert: showAlert } = await import('./modal.js');
                    await showAlert('URL copied to clipboard!', 'Copied');
                } catch (error) {
                    console.error('Failed to copy:', error);
                }
            }
        });
    }
    
    // Initialize Lucide icons for copy buttons
    if (window.lucide) {
        setTimeout(() => {
            window.lucide.createIcons();
        }, 100);
    }
}

/**
 * Handle saving settings
 */
async function handleSaveSettings(user, errorEl) {
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }
    
    const firstName = document.getElementById('settings-first-name')?.value.trim();
    const lastName = document.getElementById('settings-last-name')?.value.trim();
    const currentPassword = document.getElementById('settings-current-password')?.value;
    const newPassword = document.getElementById('settings-new-password')?.value;
    const confirmPassword = document.getElementById('settings-confirm-password')?.value;
    const playerViewEnabled = document.getElementById('settings-player-view-enabled')?.checked || false;
    
    // Validate name fields
    if (!firstName || !lastName) {
        if (errorEl) {
            errorEl.textContent = 'First name and last name are required.';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    // Validate password if provided
    if (newPassword || currentPassword || confirmPassword) {
        if (!currentPassword) {
            if (errorEl) {
                errorEl.textContent = 'Current password is required to change password.';
                errorEl.style.display = 'block';
            }
            return;
        }
        
        if (newPassword.length < 6) {
            if (errorEl) {
                errorEl.textContent = 'New password must be at least 6 characters.';
                errorEl.style.display = 'block';
            }
            return;
        }
        
        if (newPassword !== confirmPassword) {
            if (errorEl) {
                errorEl.textContent = 'New passwords do not match.';
                errorEl.style.display = 'block';
            }
            return;
        }
    }
    
    try {
        // Update user profile
        const updates = {
            firstName,
            lastName,
            playerViewEnabled
        };
        
        if (newPassword && currentPassword) {
            updates.currentPassword = currentPassword;
            updates.newPassword = newPassword;
        }
        
        // Call API to update user
        const { getApiBase } = await import('./environment.js');
        const apiBase = getApiBase();
        
        if (apiBase) {
            // Web mode - call API
            // Get token from storage (same way db.js does it)
            let token = null;
            try {
                const { Preferences } = await import('@capacitor/preferences');
                const result = await Preferences.get({ key: 'volleyball-coach-auth-token' });
                token = result.value || null;
            } catch (capError) {
                token = localStorage.getItem('volleyball-coach-auth-token');
            }
            
            if (!token) {
                throw new Error('Not authenticated. Please log in again.');
            }
            
            // apiBase already includes /api, so just append /auth/profile
            const endpoint = `${apiBase}/auth/profile`;
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to update profile' }));
                throw new Error(errorData.error || `Failed to update profile (${response.status})`);
            }
            
            const updatedUser = await response.json();
            // Refresh user data
            await db.fetchCurrentUser();
            updateProfileName();
            
            // Update team code display if player view was enabled
            if (updatedUser.teamCode) {
                const teamCodeInput = document.getElementById('team-code-display');
                const urlInput = document.getElementById('team-code-url');
                if (teamCodeInput) {
                    teamCodeInput.value = updatedUser.teamCode;
                }
                if (urlInput) {
                    urlInput.value = window.location.origin + window.location.pathname + '?code=' + updatedUser.teamCode;
                }
                // Make sure team code section is visible if it was just enabled
                const teamCodeSection = document.getElementById('team-code-section');
                if (teamCodeSection) {
                    teamCodeSection.style.display = 'block';
                }
            } else if (!updatedUser.playerViewEnabled) {
                // If player view was disabled, hide the section
                const teamCodeSection = document.getElementById('team-code-section');
                if (teamCodeSection) {
                    teamCodeSection.style.display = 'none';
                }
            }
            
            // Close modal
            hideModal();
            
            const { alert: showAlert } = await import('./modal.js');
            await showAlert('Settings saved successfully!', 'Success');
        } else {
            // Native mode - just update local display
            updateProfileName();
            hideModal();
            const { alert: showAlert } = await import('./modal.js');
            await showAlert('Settings saved successfully!', 'Success');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        if (errorEl) {
            errorEl.textContent = error.message || 'Failed to save settings. Please try again.';
            errorEl.style.display = 'block';
        }
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Toggle theme options visibility
 */
function toggleThemeOptions() {
    const themeOptions = document.getElementById('profile-theme-options');
    const themeToggleBtn = document.getElementById('profile-theme-toggle');
    
    if (themeOptions && themeToggleBtn) {
        const isHidden = themeOptions.classList.contains('hidden');
        
        if (isHidden) {
            themeOptions.classList.remove('hidden');
            themeToggleBtn.classList.add('active');
            // Initialize Lucide icons when menu opens
            if (window.lucide) {
                window.lucide.createIcons();
            }
        } else {
            themeOptions.classList.add('hidden');
            themeToggleBtn.classList.remove('active');
        }
    }
}

/**
 * Update theme selection visual indicators
 */
async function updateThemeSelection() {
    // Icons differentiate the options, no special styling needed
    // This function is kept for potential future use
}

/**
 * Get current theme preference
 */
async function getCurrentTheme() {
    try {
        // Try Capacitor Preferences first
        try {
            const { Preferences } = await import('@capacitor/preferences');
            const result = await Preferences.get({ key: 'volleyball-coach-theme' });
            if (result.value && ['light', 'dark', 'system'].includes(result.value)) {
                return result.value;
            }
        } catch (capError) {
            // Fallback to localStorage
            const stored = localStorage.getItem('volleyball-coach-theme');
            if (stored && ['light', 'dark', 'system'].includes(stored)) {
                return stored;
            }
        }
    } catch (e) {
        // Storage not available
    }
    return 'system'; // Default to system
}

/**
 * Set theme preference
 */
async function setTheme(theme) {
    if (!['light', 'dark', 'system'].includes(theme)) {
        theme = 'system';
    }
    
    // Save to storage
    try {
        // Try Capacitor Preferences first
        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.set({ key: 'volleyball-coach-theme', value: theme });
        } catch (capError) {
            // Fallback to localStorage
            localStorage.setItem('volleyball-coach-theme', theme);
        }
    } catch (e) {
        console.error('Error saving theme preference:', e);
    }
    
    // Apply theme
    applyTheme(theme);
}

/**
 * Apply theme to the document
 */
function applyTheme(theme) {
    const html = document.documentElement;
    
    if (theme === 'system') {
        // Remove data-theme attribute to use system preference via media query
        html.removeAttribute('data-theme');
    } else {
        // Set explicit theme
        html.setAttribute('data-theme', theme);
    }
    
    // Clear tag color cache and re-render tags when theme changes
    clearTagColorCache();
    reRenderTags();
}

/**
 * Clear tag color cache to force re-assignment with new theme colors
 */
function clearTagColorCache() {
    // Tag color maps are module-scoped, so we can't directly clear them
    // But getTagColor will use the new theme automatically when called
    // The themeKey approach ensures old theme colors don't interfere
}

/**
 * Re-render all tag displays when theme changes
 */
async function reRenderTags() {
    try {
        const ui = await import('./ui.js');
        
        // Re-render positions list (contains tags)
        if (ui.renderPositionsList) {
            ui.renderPositionsList();
        }
        
        // Re-render scenarios list (contains tags)
        if (ui.renderScenariosList) {
            ui.renderScenariosList();
        }
        
        // Re-render drop zones (contain tags)
        if (ui.updateDropZoneDisplay) {
            ui.updateDropZoneDisplay();
        }
        
        // Re-render mobile positions list (contains tags)
        if (ui.renderMobilePositionsList) {
            ui.renderMobilePositionsList();
        }
    } catch (e) {
        console.warn('Could not re-render tags:', e);
    }
    
    // Re-render selected tags in filters by triggering filter change
    // This will cause the filters to re-render their selected tags
    const positionSearchInput = document.getElementById('position-search-input');
    const scenarioSearchInput = document.getElementById('scenario-search-input');
    
    if (positionSearchInput) {
        positionSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (scenarioSearchInput) {
        scenarioSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * Load saved theme preference
 */
async function loadTheme() {
    const theme = await getCurrentTheme();
    applyTheme(theme);
    updateThemeSelection();
    
    // Listen for system theme changes when using system preference
    if (theme === 'system' || !theme) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Handle initial load
        if (mediaQuery.matches) {
            // System prefers dark, but we'll let CSS handle it via media query
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Listen for changes
        mediaQuery.addEventListener('change', async (e) => {
            const currentTheme = await getCurrentTheme();
            if (currentTheme === 'system') {
                // Theme will update automatically via CSS media query
                // Just ensure data-theme is not set
                document.documentElement.removeAttribute('data-theme');
            }
        });
    }
}
