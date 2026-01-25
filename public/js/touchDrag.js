// Touch drag and drop support for mobile devices
// This module adds touch event handlers that simulate HTML5 drag and drop

import { state, setDraggedPosition, setDraggedPlayer, setDraggedScenario, setDraggedElement } from './state.js';
import { dom } from './dom.js';

let touchDragState = {
    isDragging: false,
    dragElement: null,
    dragPreview: null, // Visual preview element that follows touch
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    dragType: null, // 'position', 'player', 'scenario', 'sequence', 'element'
    dragData: null,
    touchIdentifier: null
};

// Threshold for detecting a drag vs a tap (in pixels)
const DRAG_THRESHOLD = 10;

// Delay before allowing drag to start (in milliseconds)
// This allows users to scroll before drag starts
const DRAG_START_DELAY = 300;

// Long press delay for vertical reordering (in milliseconds)
const LONG_PRESS_DELAY = 1500;

// Threshold for determining if drag is primarily horizontal or vertical
const DIRECTION_THRESHOLD = 20;

/**
 * Initialize touch drag support for an element
 * @param {HTMLElement} element - The draggable element
 * @param {Object} options - Configuration options
 * @param {Function} onDragStart - Callback when drag starts
 * @param {Function} onDragEnd - Callback when drag ends
 */
export function initTouchDrag(element, options = {}) {
    if (!element) return;
    
    const {
        onDragStart,
        onDragEnd,
        dragType = 'position',
        dragData = null,
        threshold = DRAG_THRESHOLD
    } = options;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let hasMoved = false;
    let touchIdentifier = null;
    let dragDirection = null; // 'horizontal', 'vertical', or null
    let isInSidebar = false; // Track if element is in a sidebar list
    let scrollableParent = null; // Track scrollable parent container
    
    const handleTouchStart = (e) => {
        // Only handle single touch
        if (e.touches.length !== 1) return;
        
        // Don't start drag if clicking on buttons (but allow player circles, containers, and timeline items)
        const isPlayerCircle = element.classList.contains('player-on-court');
        const isPlayerContainer = element.classList.contains('player-container');
        const isTimelineItem = element.classList.contains('timeline-item');
        const isRemoveButton = e.target.closest('.timeline-item-remove');
        
        if (!isPlayerCircle && !isPlayerContainer && !isTimelineItem) {
            if (e.target.closest('.item-card-actions') || 
                e.target.closest('button') ||
                e.target.closest('.player-actions')) {
                return;
            }
        }
        
        // Don't start drag if clicking remove button on timeline items
        if (isRemoveButton) {
            return;
        }
        
        // For player containers, only start drag if touching the circle or container itself
        if (isPlayerContainer && !isPlayerCircle) {
            // Allow drag if touching the container or circle, but not if touching something else
            const touchedElement = e.target;
            if (!touchedElement.closest('.player-on-court') && 
                !touchedElement.classList.contains('player-container') &&
                !touchedElement.classList.contains('player-label')) {
                return;
            }
        }
        
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        hasMoved = false;
        dragDirection = null;
        touchIdentifier = touch.identifier;
        
        // Check if element is in a sidebar list (positions, scenarios, sequences)
        const sidebarList = element.closest('#positions-list, #scenarios-list, #sequences-list, .sidebar-content');
        isInSidebar = !!sidebarList;
        if (isInSidebar) {
            // Find the scrollable parent (usually .sidebar-content)
            scrollableParent = element.closest('.sidebar-content') || sidebarList;
        } else {
            scrollableParent = null;
        }
        
        // Store element reference
        element.dataset.touchDragReady = 'true';
    };
    
    const handleTouchMove = (e) => {
        if (!element.dataset.touchDragReady) return;
        
        // Find the touch we're tracking
        const touch = Array.from(e.touches).find(t => t.identifier === touchIdentifier);
        if (!touch) return;
        
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        
        // Determine drag direction early (if not already determined)
        // Also re-evaluate if direction changes significantly
        if (!dragDirection && (deltaX > DIRECTION_THRESHOLD || deltaY > DIRECTION_THRESHOLD)) {
            // Determine primary direction
            if (deltaX > deltaY * 1.5) {
                dragDirection = 'horizontal';
            } else if (deltaY > deltaX * 1.5) {
                dragDirection = 'vertical';
            } else {
                // Ambiguous - use larger movement
                dragDirection = deltaX > deltaY ? 'horizontal' : 'vertical';
            }
        } else if (dragDirection === 'vertical' && deltaX > deltaY * 1.5 && deltaX > DIRECTION_THRESHOLD * 2) {
            // User started vertical but switched to horizontal - switch to horizontal drag
            dragDirection = 'horizontal';
            // If we were waiting for long press, start drag immediately
            if (!touchDragState.isDragging && isInSidebar) {
                if (scrollableParent) {
                    scrollableParent.style.overflow = 'hidden';
                    scrollableParent.style.touchAction = 'none';
                }
                e.preventDefault();
                startTouchDrag(element, touch, dragType, dragData, onDragStart);
            }
        }
        
        // Check if we've moved enough to be a drag
        if (deltaX > threshold || deltaY > threshold) {
            hasMoved = true;
            
            const timeSinceStart = Date.now() - touchStartTime;
            
            // For sidebar items, use direction-aware drag logic
            if (isInSidebar && !touchDragState.isDragging) {
                if (dragDirection === 'horizontal') {
                    // Horizontal drag (dragging out of sidebar) - start immediately
                    // Prevent scrolling when dragging horizontally
                    if (scrollableParent) {
                        scrollableParent.style.overflow = 'hidden';
                        scrollableParent.style.touchAction = 'none';
                    }
                    e.preventDefault();
                    startTouchDrag(element, touch, dragType, dragData, onDragStart);
                } else if (dragDirection === 'vertical') {
                    // Vertical drag (reordering) - require long press
                    if (timeSinceStart >= LONG_PRESS_DELAY) {
                        // Prevent scrolling during reorder drag
                        if (scrollableParent) {
                            scrollableParent.style.overflow = 'hidden';
                            scrollableParent.style.touchAction = 'none';
                        }
                        e.preventDefault();
                        startTouchDrag(element, touch, dragType, dragData, onDragStart);
                    } else {
                        // Not long press yet - allow scrolling
                        // Don't prevent default, allow normal scroll
                    }
                } else {
                    // Direction not yet determined - wait a bit more
                    // If moved significantly, assume horizontal (dragging out)
                    if (deltaX > threshold * 2) {
                        dragDirection = 'horizontal';
                        if (scrollableParent) {
                            scrollableParent.style.overflow = 'hidden';
                            scrollableParent.style.touchAction = 'none';
                        }
                        e.preventDefault();
                        startTouchDrag(element, touch, dragType, dragData, onDragStart);
                    }
                }
            } else if (!touchDragState.isDragging) {
                // Not in sidebar - use original logic with delay
                if (timeSinceStart >= DRAG_START_DELAY) {
                    e.preventDefault();
                    startTouchDrag(element, touch, dragType, dragData, onDragStart);
                }
            } else if (touchDragState.isDragging) {
                // Already dragging - update position
                e.preventDefault();
                updateTouchDrag(touch);
            }
        }
    };
    
    const handleTouchEnd = (e) => {
        if (!element.dataset.touchDragReady) return;
        
        // Find the touch we're tracking
        const touch = e.changedTouches ? 
            Array.from(e.changedTouches).find(t => t.identifier === touchIdentifier) : null;
        
        if (touchDragState.isDragging && touchDragState.dragElement === element) {
            // We're actively dragging - handle the drag end
            e.preventDefault();
            endTouchDrag(touch, onDragEnd);
        } else if (!hasMoved) {
            // This was just a tap, not a drag - completely ignore it
            // Let tap/click handlers handle it instead
            // Clean up immediately and don't interfere
            delete element.dataset.touchDragReady;
            touchIdentifier = null;
            hasMoved = false;
            dragDirection = null;
            isInSidebar = false;
            scrollableParent = null;
            // Don't prevent default, don't stop propagation - let other handlers work
            return;
        }
        
        // Restore scrolling on scrollable parent
        if (scrollableParent) {
            scrollableParent.style.overflow = '';
            scrollableParent.style.touchAction = '';
        }
        
        // Clean up
        delete element.dataset.touchDragReady;
        touchIdentifier = null;
        hasMoved = false;
        dragDirection = null;
        isInSidebar = false;
        scrollableParent = null;
    };
    
    const handleTouchCancel = () => {
        if (touchDragState.isDragging && touchDragState.dragElement === element) {
            endTouchDrag(null, onDragEnd);
        }
        
        // Restore scrolling on scrollable parent
        if (scrollableParent) {
            scrollableParent.style.overflow = '';
            scrollableParent.style.touchAction = '';
        }
        
        delete element.dataset.touchDragReady;
        touchIdentifier = null;
        hasMoved = false;
        dragDirection = null;
        isInSidebar = false;
        scrollableParent = null;
    };
    
    // Add event listeners
    // Use capture phase for touchstart to set up early, but don't interfere with taps
    element.addEventListener('touchstart', handleTouchStart, { passive: true, capture: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false, capture: false });
    // Use capture: false and don't prevent default for taps - let tap handlers work
    element.addEventListener('touchend', handleTouchEnd, { passive: false, capture: false });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true, capture: false });
}

/**
 * Start a touch drag operation
 */
function startTouchDrag(element, touch, dragType, dragData, onDragStart) {
    touchDragState.isDragging = true;
    touchDragState.dragElement = element;
    touchDragState.startX = touch.clientX;
    touchDragState.startY = touch.clientY;
    touchDragState.currentX = touch.clientX;
    touchDragState.currentY = touch.clientY;
    touchDragState.dragType = dragType;
    touchDragState.dragData = dragData;
    touchDragState.touchIdentifier = touch.identifier;
    
    // Prevent body scroll when dragging
    const originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    touchDragState.originalBodyOverflow = originalBodyOverflow;
    
    // Add visual feedback to original element
    element.classList.add('dragging');
    
    // Create visual drag preview
    createDragPreview(element, touch);
    
    // Set state based on drag type
    if (dragType === 'position' && dragData) {
        setDraggedPosition(dragData);
    } else if (dragType === 'player' && dragData) {
        setDraggedPlayer(dragData);
    } else if (dragType === 'scenario' && dragData) {
        setDraggedScenario(dragData);
    } else if (dragType === 'element' && dragData) {
        setDraggedElement(dragData);
    }
    
    // Call custom drag start handler
    if (onDragStart) {
        onDragStart({
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: element
        });
    }
    
    // Update all drop zones
    updateDropZonesForTouch();
    
    // Add global touch move listener to update preview position
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
}

/**
 * Create a visual drag preview element
 */
function createDragPreview(element, touch) {
    // Clone the element for preview
    const preview = element.cloneNode(true);
    preview.classList.add('touch-drag-preview');
    preview.style.position = 'fixed';
    preview.style.pointerEvents = 'none';
    preview.style.zIndex = '10000';
    preview.style.opacity = '0.8';
    preview.style.transform = 'scale(1.1)';
    preview.style.transition = 'none';
    
    // Get element's bounding rect
    const rect = element.getBoundingClientRect();
    
    // Calculate offset from touch point to element center
    // This keeps the preview centered on the touch point
    const offsetX = rect.width / 2;
    const offsetY = rect.height / 2;
    
    // Position preview at touch point (centered)
    preview.style.left = (touch.clientX - offsetX) + 'px';
    preview.style.top = (touch.clientY - offsetY) + 'px';
    preview.style.width = rect.width + 'px';
    preview.style.height = rect.height + 'px';
    
    // Add to document
    document.body.appendChild(preview);
    touchDragState.dragPreview = preview;
    touchDragState.previewOffsetX = offsetX;
    touchDragState.previewOffsetY = offsetY;
}

/**
 * Handle global touch move to update drag preview
 */
function handleGlobalTouchMove(e) {
    if (!touchDragState.isDragging || !touchDragState.dragPreview) return;
    
    // Find the touch we're tracking
    const touch = Array.from(e.touches).find(t => t.identifier === touchDragState.touchIdentifier);
    if (!touch) return;
    
    e.preventDefault();
    
    // Update preview position
    touchDragState.currentX = touch.clientX;
    touchDragState.currentY = touch.clientY;
    
    touchDragState.dragPreview.style.left = (touch.clientX - touchDragState.previewOffsetX) + 'px';
    touchDragState.dragPreview.style.top = (touch.clientY - touchDragState.previewOffsetY) + 'px';
    
    // Update drag feedback
    updateTouchDrag(touch);
}

/**
 * Update drag position during touch move
 */
function updateTouchDrag(touch) {
    if (!touch) return;
    
    touchDragState.currentX = touch.clientX;
    touchDragState.currentY = touch.clientY;
    
    // Update preview position if it exists
    if (touchDragState.dragPreview) {
        touchDragState.dragPreview.style.left = (touch.clientX - touchDragState.previewOffsetX) + 'px';
        touchDragState.dragPreview.style.top = (touch.clientY - touchDragState.previewOffsetY) + 'px';
    }
    
    // Find element under touch point (but ignore the preview)
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    if (elementBelow && !elementBelow.classList.contains('touch-drag-preview')) {
        // Check if we're over a drop zone
        const dropZone = elementBelow.closest('.drop-zone');
        if (dropZone) {
            // Add drag-over class
            document.querySelectorAll('.drop-zone').forEach(zone => {
                zone.classList.remove('drag-over');
            });
            dropZone.classList.add('drag-over');
        } else {
            // Remove drag-over from all zones
            document.querySelectorAll('.drop-zone').forEach(zone => {
                zone.classList.remove('drag-over');
            });
        }
        
        // Check if we're over a reorder target (including timeline items)
        const reorderTarget = elementBelow.closest('.item-card, .player-lineup-item, .timeline-item');
        const timelineContainer = elementBelow.closest('.timeline-container');
        
        if (reorderTarget && reorderTarget !== touchDragState.dragElement) {
            // Handle reordering visual feedback
            handleReorderFeedback(reorderTarget, touch);
            
            // For timeline items, trigger dragover to show insert indicators
            if (reorderTarget.classList.contains('timeline-item')) {
                const dragOverEvent = new CustomEvent('dragover', { 
                    bubbles: true, 
                    cancelable: true,
                    detail: { touch: true }
                });
                Object.defineProperty(dragOverEvent, 'clientX', { value: touch.clientX, writable: false });
                Object.defineProperty(dragOverEvent, 'clientY', { value: touch.clientY, writable: false });
                const mockDataTransfer = {
                    effectAllowed: 'move',
                    dropEffect: 'move'
                };
                Object.defineProperty(dragOverEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
                reorderTarget.dispatchEvent(dragOverEvent);
            }
        } else if (timelineContainer && !reorderTarget) {
            // Not over a timeline item, but over the timeline container
            // Check if we're past the last item and trigger container dragover
            const dragOverEvent = new CustomEvent('dragover', { 
                bubbles: true, 
                cancelable: true,
                detail: { touch: true }
            });
            Object.defineProperty(dragOverEvent, 'clientX', { value: touch.clientX, writable: false });
            Object.defineProperty(dragOverEvent, 'clientY', { value: touch.clientY, writable: false });
            const mockDataTransfer = {
                effectAllowed: touchDragState.dragType === 'timeline-item' ? 'move' : 'copy',
                dropEffect: touchDragState.dragType === 'timeline-item' ? 'move' : 'copy'
            };
            Object.defineProperty(dragOverEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
            Object.defineProperty(dragOverEvent, 'target', { value: timelineContainer, writable: false });
            timelineContainer.dispatchEvent(dragOverEvent);
        }
        
        // Check if dragging player element on court
        if (touchDragState.dragType === 'element' && state.draggedElement) {
            const court = elementBelow.closest('#court');
            if (court) {
                state.draggedElement.classList.remove('removing');
                // Trigger dragover event for court to update position
                const dragOverEvent = new CustomEvent('dragover', { 
                    bubbles: true, 
                    cancelable: true,
                    detail: { touch: true }
                });
                Object.defineProperty(dragOverEvent, 'clientX', { value: touch.clientX, writable: false });
                Object.defineProperty(dragOverEvent, 'clientY', { value: touch.clientY, writable: false });
                const mockDataTransfer = {
                    effectAllowed: 'move',
                    dropEffect: 'move'
                };
                Object.defineProperty(dragOverEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
                court.dispatchEvent(dragOverEvent);
            } else if (!court && !dom.court.contains(elementBelow)) {
                if (!state.draggedElement.classList.contains('removing')) {
                    state.draggedElement.classList.add('removing');
                }
            }
        }
    }
}

/**
 * End touch drag operation
 */
function endTouchDrag(touch, onDragEnd) {
    if (!touchDragState.isDragging) return;
    
    // Remove global touch move listener
    document.removeEventListener('touchmove', handleGlobalTouchMove);
    
    // Restore body scroll
    if (touchDragState.originalBodyOverflow !== undefined) {
        document.body.style.overflow = touchDragState.originalBodyOverflow;
        delete touchDragState.originalBodyOverflow;
    } else {
        document.body.style.overflow = '';
    }
    
    // Save drag type before resetting
    const dragType = touchDragState.dragType;
    
    let dropTarget = null;
    if (touch) {
        // Use the last known position if touch is not available
        dropTarget = document.elementFromPoint(touchDragState.currentX, touchDragState.currentY);
    }
    
    // Handle drop BEFORE clearing state (so state.draggedPosition etc. are still available)
    if (dropTarget && touch) {
        handleTouchDrop(dropTarget, touch);
    }
    
    // Remove visual preview
    if (touchDragState.dragPreview) {
        touchDragState.dragPreview.remove();
        touchDragState.dragPreview = null;
    }
    
    // Remove visual feedback from original element
    if (touchDragState.dragElement) {
        touchDragState.dragElement.classList.remove('dragging');
    }
    
    // Clear all drag-over classes
    document.querySelectorAll('.drop-zone').forEach(zone => {
        zone.classList.remove('drag-over');
    });
    document.querySelectorAll('.item-card, .player-lineup-item, .timeline-item').forEach(item => {
        item.classList.remove('drag-over', 'drag-insert-before', 'drag-insert-after');
    });
    
    // Call custom drag end handler
    if (onDragEnd) {
        onDragEnd({
            clientX: touch ? touch.clientX : touchDragState.currentX,
            clientY: touch ? touch.clientY : touchDragState.currentY,
            target: dropTarget
        });
    }
    
    // Clear dragged state
    if (dragType === 'position') {
        setDraggedPosition(null);
    } else if (dragType === 'player') {
        setDraggedPlayer(null);
    } else if (dragType === 'scenario') {
        setDraggedScenario(null);
    } else if (dragType === 'element') {
        setDraggedElement(null);
    }
    
    // Reset state
    touchDragState.isDragging = false;
    touchDragState.dragElement = null;
    touchDragState.dragType = null;
    touchDragState.dragData = null;
    touchDragState.touchIdentifier = null;
    
    // Clear drop zone feedback
    setTimeout(() => {
        document.querySelectorAll('.drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }, 100);
}

/**
 * Handle dropping on a target element
 */
function handleTouchDrop(target, touch) {
    if (!touch) return;
    
    const dragType = touchDragState.dragType;
    
    // Check if dropping on a drop zone
    const dropZone = target.closest('.drop-zone');
    if (dropZone) {
        if (dragType === 'position' && state.draggedPosition) {
            // Create a synthetic drop event that will trigger existing handlers
            const dropEvent = new CustomEvent('drop', { 
                bubbles: true, 
                cancelable: true,
                detail: { touch: true }
            });
            // Add clientX/Y as properties so existing handlers can access them
            Object.defineProperty(dropEvent, 'clientX', { value: touch.clientX, writable: false });
            Object.defineProperty(dropEvent, 'clientY', { value: touch.clientY, writable: false });
            // Create a mock dataTransfer object
            const mockDataTransfer = {
                effectAllowed: 'copy',
                dropEffect: 'copy',
                getData: () => state.draggedPosition?.id || ''
            };
            Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
            dropZone.dispatchEvent(dropEvent);
            return;
        }
    }
    
    // Check timeline-specific drops first (before general reorder targets)
    const timelineItem = target.closest('.timeline-item');
    const timelineContainer = target.closest('.timeline-container');
    
    // Check if dropping on timeline item for reordering (dragging timeline item to another timeline item)
    if (timelineItem && dragType === 'timeline-item') {
        // Create a synthetic drop event for timeline reordering
        const dropEvent = new CustomEvent('drop', { 
            bubbles: true, 
            cancelable: true,
            detail: { touch: true }
        });
        Object.defineProperty(dropEvent, 'clientX', { value: touch.clientX, writable: false });
        Object.defineProperty(dropEvent, 'clientY', { value: touch.clientY, writable: false });
        
        // Create JSON data for timeline item
        const dragData = JSON.stringify({ 
            type: touchDragState.dragData?.type || '', 
            id: touchDragState.dragData?.id || '' 
        });
        
        const mockDataTransfer = {
            effectAllowed: 'move',
            dropEffect: 'move',
            getData: () => dragData
        };
        Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
        timelineItem.dispatchEvent(dropEvent);
        return;
    }
    
    // Check if dropping on timeline (container or item) for adding new items
    if ((timelineItem || timelineContainer) && (dragType === 'position' || dragType === 'scenario')) {
        if (timelineItem) {
            // Dropping on a timeline item - add at that position
            const dropEvent = new CustomEvent('drop', { 
                bubbles: true, 
                cancelable: true,
                detail: { touch: true }
            });
            Object.defineProperty(dropEvent, 'clientX', { value: touch.clientX, writable: false });
            Object.defineProperty(dropEvent, 'clientY', { value: touch.clientY, writable: false });
            
            // Create mock dataTransfer that indicates it's NOT a reorder (just an ID, not JSON)
            const mockDataTransfer = {
                effectAllowed: 'copy',
                dropEffect: 'copy',
                getData: () => {
                    if (dragType === 'position') return state.draggedPosition?.id || '';
                    if (dragType === 'scenario') return state.draggedScenario?.id || '';
                    return '';
                }
            };
            Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
            timelineItem.dispatchEvent(dropEvent);
            return;
        } else if (timelineContainer) {
            // Dropping on empty timeline container - append to end
            const dropEvent = new CustomEvent('drop', { 
                bubbles: true, 
                cancelable: true,
                detail: { touch: true }
            });
            Object.defineProperty(dropEvent, 'clientX', { value: touch.clientX, writable: false });
            Object.defineProperty(dropEvent, 'clientY', { value: touch.clientY, writable: false });
            
            // Create mock dataTransfer that indicates it's NOT a reorder
            const mockDataTransfer = {
                effectAllowed: 'copy',
                dropEffect: 'copy',
                getData: () => {
                    if (dragType === 'position') return state.draggedPosition?.id || '';
                    if (dragType === 'scenario') return state.draggedScenario?.id || '';
                    return '';
                }
            };
            Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
            Object.defineProperty(dropEvent, 'target', { value: timelineContainer, writable: false });
            timelineContainer.dispatchEvent(dropEvent);
            return;
        }
    }
    
    // Check if dropping on other reorder targets (positions, players, etc. - not timeline)
    const reorderTarget = target.closest('.item-card, .player-lineup-item');
    if (reorderTarget && reorderTarget !== touchDragState.dragElement) {
        // Create a synthetic drop event for reordering
        const dropEvent = new CustomEvent('drop', { 
            bubbles: true, 
            cancelable: true,
            detail: { touch: true }
        });
        Object.defineProperty(dropEvent, 'clientX', { value: touch.clientX, writable: false });
        Object.defineProperty(dropEvent, 'clientY', { value: touch.clientY, writable: false });
        
        // Create appropriate data for the drop event
        let dragData = '';
        if (dragType === 'position') {
            dragData = state.draggedPosition?.id || '';
        } else if (dragType === 'player') {
            dragData = `reorder-player-${touchDragState.dragData?.index || 0}`;
        }
        
        const mockDataTransfer = {
            effectAllowed: 'move',
            dropEffect: 'move',
            getData: () => dragData
        };
        Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
        reorderTarget.dispatchEvent(dropEvent);
        return;
    }
    
    // Check if dropping on court (for players from lineup)
    const court = target.closest('#court');
    if (court && dragType === 'player' && state.draggedPlayer) {
        const dropEvent = new CustomEvent('drop', { 
            bubbles: true, 
            cancelable: true,
            detail: { touch: true }
        });
        Object.defineProperty(dropEvent, 'clientX', { value: touch.clientX, writable: false });
        Object.defineProperty(dropEvent, 'clientY', { value: touch.clientY, writable: false });
        const mockDataTransfer = {
            effectAllowed: 'copy',
            dropEffect: 'copy',
            getData: () => state.draggedPlayer?.id || ''
        };
        Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
        court.dispatchEvent(dropEvent);
        return;
    }
    
    // Check if dragging player element on court (moving within court or removing)
    if (dragType === 'element' && state.draggedElement) {
        const court = target.closest('#court');
        
        if (court) {
            // Dropping on court - dispatch drop event to trigger handleCourtDrop
            const dropEvent = new CustomEvent('drop', { 
                bubbles: true, 
                cancelable: true,
                detail: { touch: true }
            });
            Object.defineProperty(dropEvent, 'clientX', { value: touch.clientX, writable: false });
            Object.defineProperty(dropEvent, 'clientY', { value: touch.clientY, writable: false });
            const mockDataTransfer = {
                effectAllowed: 'move',
                dropEffect: 'move'
            };
            Object.defineProperty(dropEvent, 'dataTransfer', { value: mockDataTransfer, writable: false });
            court.dispatchEvent(dropEvent);
            return;
        } else {
            // Dropping outside court - remove player
            const dropEvent = new CustomEvent('drop', { 
                bubbles: true, 
                cancelable: true,
                detail: { touch: true }
            });
            Object.defineProperty(dropEvent, 'clientX', { value: touch.clientX, writable: false });
            Object.defineProperty(dropEvent, 'clientY', { value: touch.clientY, writable: false });
            Object.defineProperty(dropEvent, 'target', { value: document.body, writable: false });
            document.dispatchEvent(dropEvent);
            return;
        }
    }
}

/**
 * Update drop zones to respond to touch drag
 */
function updateDropZonesForTouch() {
    // Add touch event listeners to drop zones if not already added
    document.querySelectorAll('.drop-zone').forEach(zone => {
        if (!zone.dataset.touchDropInitialized) {
            zone.addEventListener('touchmove', (e) => {
                if (touchDragState.isDragging) {
                    e.preventDefault();
                    const touch = e.touches[0];
                    updateTouchDrag(touch);
                }
            }, { passive: false });
            
            zone.addEventListener('touchend', (e) => {
                if (touchDragState.isDragging && touchDragState.dragType === 'position') {
                    const touch = e.changedTouches[0];
                    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                    if (elementBelow && zone.contains(elementBelow)) {
                        e.preventDefault();
                        handleTouchDrop(zone, touch);
                    }
                }
            }, { passive: false });
            
            zone.dataset.touchDropInitialized = 'true';
        }
    });
}

/**
 * Handle reordering visual feedback
 */
function handleReorderFeedback(target, touch) {
    // For timeline items, use horizontal midpoint (left/right)
    if (target.classList.contains('timeline-item')) {
        const rect = target.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        
        // Clear all feedback in timeline
        const timelineContainer = target.closest('.timeline-container');
        if (timelineContainer) {
            timelineContainer.querySelectorAll('.timeline-item').forEach(item => {
                item.classList.remove('drag-over', 'drag-insert-before', 'drag-insert-after');
            });
        }
        
        if (touch.clientX < midpoint) {
            target.classList.add('drag-insert-before');
        } else {
            target.classList.add('drag-insert-after');
        }
    } else {
        // For other items, use vertical midpoint (top/bottom)
        const rect = target.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        
        // Clear all feedback
        target.parentElement?.querySelectorAll('.item-card, .player-lineup-item').forEach(item => {
            item.classList.remove('drag-over', 'drag-insert-before', 'drag-insert-after');
        });
        
        if (touch.clientY < midpoint) {
            target.classList.add('drag-insert-before');
        } else {
            target.classList.add('drag-insert-after');
        }
    }
}

/**
 * Check if device supports touch
 */
export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
