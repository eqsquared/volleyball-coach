// Accordion functionality

const STORAGE_KEY = 'volleyball-coach-active-accordion';

// Save active accordion to localStorage
function saveActiveAccordion(name) {
    try {
        localStorage.setItem(STORAGE_KEY, name);
    } catch (error) {
        console.warn('Failed to save active accordion to localStorage:', error);
    }
}

// Get saved active accordion from localStorage
export function getSavedActiveAccordion() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        console.warn('Failed to read active accordion from localStorage:', error);
        return null;
    }
}

export function initAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    
    accordions.forEach(accordion => {
        const header = accordion.querySelector('.accordion-header');
        if (header) {
            header.addEventListener('click', () => {
                const isActive = accordion.classList.contains('active');
                const accordionName = accordion.getAttribute('data-accordion');
                
                // Close all accordions
                accordions.forEach(acc => {
                    acc.classList.remove('active');
                });
                
                // If it wasn't active, open it
                if (!isActive) {
                    accordion.classList.add('active');
                    // Save to localStorage
                    if (accordionName) {
                        saveActiveAccordion(accordionName);
                    }
                } else {
                    // If it was active and we're closing it, clear the saved state
                    saveActiveAccordion('');
                }
            });
        }
    });
}

export function openAccordion(name) {
    const accordions = document.querySelectorAll('.accordion');
    
    // Close all accordions first
    accordions.forEach(acc => {
        acc.classList.remove('active');
    });
    
    // Open the specified accordion
    const accordion = document.querySelector(`[data-accordion="${name}"]`);
    if (accordion) {
        accordion.classList.add('active');
        // Save to localStorage
        saveActiveAccordion(name);
    }
}

export function closeAccordion(name) {
    const accordion = document.querySelector(`[data-accordion="${name}"]`);
    if (accordion) {
        accordion.classList.remove('active');
        // If this was the active one, clear saved state
        const savedName = getSavedActiveAccordion();
        if (savedName === name) {
            saveActiveAccordion('');
        }
    }
}
