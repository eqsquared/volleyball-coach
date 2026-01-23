// Environment detection utility
// Determines if we're running in Capacitor (native) or web mode

let _isNative = null;
let _isWeb = null;

/**
 * Check if we're running in a Capacitor native app
 */
export function isNative() {
    if (_isNative !== null) return _isNative;
    
    // Check for Capacitor platform
    _isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform());
    return _isNative;
}

/**
 * Check if we're running in a web browser
 */
export function isWeb() {
    if (_isWeb !== null) return _isWeb;
    
    _isWeb = !isNative();
    return _isWeb;
}

/**
 * Get the current platform (ios, android, web)
 */
export function getPlatform() {
    if (isNative()) {
        return window.Capacitor?.getPlatform() || 'native';
    }
    return 'web';
}

/**
 * Get the API base URL
 * In web mode, uses relative paths (works with Express server)
 * In native mode, could use a remote server URL or return null to use local storage
 */
export function getApiBase() {
    if (isNative()) {
        // In native mode, you can either:
        // 1. Return null to use local storage (recommended for offline-first)
        // 2. Return a remote server URL if you want to sync with a server
        // For now, we'll use local storage in native mode
        return null;
    }
    // In web mode, use relative API paths
    return '/api';
}
