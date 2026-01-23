// Capacitor initialization
// This file initializes Capacitor when running in native mode

let capacitorInitialized = false;

export async function initCapacitor() {
    if (capacitorInitialized) return;
    
    try {
        // Dynamically import Capacitor only if we're in a native environment
        // or if Capacitor is available
        if (window.Capacitor || (typeof window !== 'undefined' && window.Capacitor)) {
            // Capacitor is already loaded (native mode)
            capacitorInitialized = true;
            return;
        }
        
        // In web mode, try to load Capacitor if available
        // This allows testing Capacitor APIs in browser (with limitations)
        if (typeof window !== 'undefined') {
            try {
                // Try to import from node_modules (if bundled)
                const { Capacitor } = await import('@capacitor/core');
                window.Capacitor = Capacitor;
                capacitorInitialized = true;
            } catch (e) {
                // Capacitor not available - we're in pure web mode
                // This is fine, the app will use API mode
                console.log('Capacitor not available - running in web mode');
            }
        }
    } catch (error) {
        console.warn('Failed to initialize Capacitor:', error);
        // Continue without Capacitor - app will use web mode
    }
}

// Auto-initialize if in native environment
if (typeof window !== 'undefined' && window.Capacitor) {
    initCapacitor();
}
