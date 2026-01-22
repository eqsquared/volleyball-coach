// Utility functions for handling touch and click events on mobile devices
// Prevents double-firing and ensures proper event handling

/**
 * Add a unified click/tap event listener that works on both desktop and mobile
 * Prevents double-firing by handling both click and touchend events
 * @param {HTMLElement} element - The element to attach the listener to
 * @param {Function} handler - The event handler function
 * @param {Object} options - Optional event listener options
 */
export function addTapListener(element, handler, options = {}) {
    let touchHandled = false;
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    const TAP_THRESHOLD = 10; // pixels
    const TAP_TIME_THRESHOLD = 300; // milliseconds
    
    // Handle touch start
    const touchStartHandler = (e) => {
        touchHandled = false;
        touchStartTime = Date.now();
        if (e.touches && e.touches.length > 0) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    };
    
    // Handle touch end (tap)
    const touchEndHandler = (e) => {
        if (touchHandled) return;
        
        const touchTime = Date.now() - touchStartTime;
        let moved = false;
        
        if (e.changedTouches && e.changedTouches.length > 0) {
            const deltaX = Math.abs(e.changedTouches[0].clientX - touchStartX);
            const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartY);
            moved = deltaX > TAP_THRESHOLD || deltaY > TAP_THRESHOLD;
        }
        
        // Only fire if it was a quick tap (not a drag)
        if (!moved && touchTime < TAP_TIME_THRESHOLD) {
            touchHandled = true;
            e.preventDefault();
            handler(e);
        }
    };
    
    // Handle click (for desktop and as fallback)
    const clickHandler = (e) => {
        // Only fire if touch wasn't already handled
        if (!touchHandled) {
            handler(e);
        }
        touchHandled = false; // Reset for next interaction
    };
    
    element.addEventListener('touchstart', touchStartHandler, { passive: true });
    element.addEventListener('touchend', touchEndHandler, { passive: false });
    element.addEventListener('click', clickHandler, options);
    
    // Return cleanup function
    return () => {
        element.removeEventListener('touchstart', touchStartHandler);
        element.removeEventListener('touchend', touchEndHandler);
        element.removeEventListener('click', clickHandler);
    };
}

/**
 * Check if the current device supports touch events
 * @returns {boolean}
 */
export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
