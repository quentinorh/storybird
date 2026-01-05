// Bouton retour en haut
(function() {
    const btnScrollTop = document.getElementById('btn-scroll-top');
    if (!btnScrollTop) return;
    
    // Seuil d'apparition : quand le header n'est plus visible
    // On utilise la hauteur du header comme référence
    const getScrollThreshold = () => {
        const header = document.querySelector('header');
        if (header) {
            return header.offsetTop + header.offsetHeight;
        }
        return 300; // Valeur par défaut
    };
    
    // Gestion du scroll
    let ticking = false;
    
    const updateButtonVisibility = () => {
        const threshold = getScrollThreshold();
        const shouldShow = window.scrollY > threshold;
        
        if (shouldShow) {
            btnScrollTop.classList.add('visible');
        } else {
            btnScrollTop.classList.remove('visible');
        }
        
        ticking = false;
    };
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateButtonVisibility);
            ticking = true;
        }
    }, { passive: true });
    
    // Scroll vers le haut au clic
    btnScrollTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Vérifier l'état initial
    updateButtonVisibility();
})();


