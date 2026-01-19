// Accordion functionality

export function initAccordions() {
    const accordions = document.querySelectorAll('.accordion');
    
    accordions.forEach(accordion => {
        const header = accordion.querySelector('.accordion-header');
        if (header) {
            header.addEventListener('click', () => {
                accordion.classList.toggle('active');
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
