// Accordion functionality

export function initAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    
    accordions.forEach(accordion => {
        const header = accordion.querySelector('.accordion-header');
        if (header) {
            header.addEventListener('click', () => {
                const isActive = accordion.classList.contains('active');
                
                // Close all accordions
                accordions.forEach(acc => {
                    acc.classList.remove('active');
                });
                
                // If it wasn't active, open it
                if (!isActive) {
                    accordion.classList.add('active');
                }
            });
        }
    });
}

export function openAccordion(name) {
    const accordion = document.querySelector(`[data-accordion="${name}"]`);
    if (accordion) {
        accordion.classList.add('active');
    }
}

export function closeAccordion(name) {
    const accordion = document.querySelector(`[data-accordion="${name}"]`);
    if (accordion) {
        accordion.classList.remove('active');
    }
}
