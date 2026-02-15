/**
 * SPORTBAR 23 Y 12 - SCRIPT PRINCIPAL
 * Con modal para imágenes y funcionalidades generales
 */

(function() {
    'use strict';

    // ============================================
    // MODAL PARA IMÁGENES DEL MENÚ
    // ============================================
    function setupImageModal() {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        const closeBtn = document.getElementById('closeImageModal');
        const viewButtons = document.querySelectorAll('.view-image-btn');
        
        if (!modal || !modalImage || !closeBtn) return;
        
        // Abrir modal al hacer clic en "Ver completo"
        viewButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const imgSrc = this.getAttribute('data-img');
                openModal(imgSrc);
            });
        });
        
        // También abrir al hacer clic en la imagen (para móviles)
        const menuImages = document.querySelectorAll('.menu-image');
        menuImages.forEach(img => {
            img.addEventListener('click', function() {
                const imgSrc = this.getAttribute('data-img') || this.src;
                openModal(imgSrc);
            });
        });
        
        // Cerrar modal
        closeBtn.addEventListener('click', closeModal);
        
        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });
        
        // Cerrar al hacer clic fuera de la imagen
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        function openModal(src) {
            modalImage.src = src;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
        
        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }

    // ============================================
    // SCROLL SUAVE
    // ============================================
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href === '#') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // ============================================
    // BOTONES FLOTANTES
    // ============================================
    function setupFloatButtons() {
        const floatButtons = document.querySelectorAll('.float-button');
        floatButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href && href !== '#') {
                    e.preventDefault();
                    window.open(href, '_blank');
                }
            });
        });
    }

    // ============================================
    // ANIMACIÓN DE PELOTA
    // ============================================
    function setupSoccerBall() {
        const ball = document.querySelector('.soccer-ball .ball');
        if (!ball) return;
        
        let rotation = 0;
        function animate() {
            rotation += 0.2;
            ball.style.transform = `rotate(${rotation}deg)`;
            requestAnimationFrame(animate);
        }
        animate();
    }

    // ============================================
    // VERIFICAR QUE LA IMAGEN HERO EXISTE
    // ============================================
    function checkHeroImage() {
        const hero = document.querySelector('.hero');
        if (hero) {
            // Forzar recarga del fondo si es necesario
            const bgImage = getComputedStyle(hero).backgroundImage;
            if (bgImage === 'none' || !bgImage.includes('hero.jpg')) {
                hero.style.backgroundImage = 'linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.9)), url("imagenes/hero.jpg")';
            }
        }
    }

    // ============================================
    // INICIALIZAR TODO
    // ============================================
    function init() {
        console.log('🏈 SPORTBAR 23 y 12 - Inicializando...');
        setupImageModal();
        setupSmoothScroll();
        setupFloatButtons();
        setupSoccerBall();
        checkHeroImage();
    }

    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
