// Profile menu and settings module

import * as db from '../db.js';
import { customModal, prompt, confirm } from './modal.js';
import { handleLogout, getCurrentUser } from './auth.js';
import { exportToJSON, handleFileImport } from './importExport.js';
import { dom } from './dom.js';

let profileMenuOpen = false;

/**
 * Initialize profile menu
 */
export function initProfile() {
    const profileButton = document.getElementById('profile-button');
    const profileMenu = document.getElementById('profile-menu');
    const profileSection = document.querySelector('.profile-section');
    const profileName = document.getElementById('profile-name');
    const settingsBtn = document.getElementById('profile-settings');
    const themeBtn = document.getElementById('profile-theme');
    const logoutBtn = document.getElementById('profile-logout');
    
    // Load and display user name
    updateProfileName();
    
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
    
    // Theme button (placeholder)
    if (themeBtn) {
        themeBtn.addEventListener('click', async () => {
            closeProfileMenu();
            // Placeholder for theme functionality
            const { alert: showAlert } = await import('./modal.js');
            await showAlert('Theme settings coming soon!', 'Theme');
        });
    }
    
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
function openProfileMenu() {
    const profileMenu = document.getElementById('profile-menu');
    const profileSection = document.querySelector('.profile-section');
    
    if (profileMenu && profileSection) {
        profileMenu.classList.remove('hidden');
        profileSection.classList.add('active');
        profileMenuOpen = true;
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
            const fullName = `${user.firstName} ${user.lastName}`.trim();
            profileName.textContent = fullName || 'My Profile';
        } else {
            profileName.textContent = 'My Profile';
        }
    } catch (error) {
        console.error('Error loading user:', error);
        profileName.textContent = 'My Profile';
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
        
        await customModal('Settings', bodyHtml, footerHtml);
        
        // Set up event listeners for the settings modal
        setupSettingsListeners(user);
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
            await handleSaveSettings(user, errorEl);
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
            lastName
        };
        
        if (newPassword && currentPassword) {
            updates.currentPassword = currentPassword;
            updates.newPassword = newPassword;
        }
        
        // Call API to update user (we'll need to add this endpoint)
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
            
            const response = await fetch(`${apiBase}/api/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update profile');
            }
            
            const updatedUser = await response.json();
            // Refresh user data
            await db.fetchCurrentUser();
            updateProfileName();
            
            // Refresh user data
            await db.fetchCurrentUser();
            updateProfileName();
            
            // Close modal
            const { hideModal } = await import('./modal.js');
            hideModal();
            
            const { alert: showAlert } = await import('./modal.js');
            await showAlert('Settings saved successfully!', 'Success');
        } else {
            // Native mode - just update local display
            updateProfileName();
            const { hideModal } = await import('./modal.js');
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

