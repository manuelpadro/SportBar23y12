/**
 * SPORTBAR 23 y 12 - Script optimizado
 * Funcionalidades principales para mostrar menú y contacto
 */

(function() {
    'use strict';
    
    // Estado de la aplicación
    const AppState = {
        currentModalImage: null,
        currentModalTitle: null,
        isModalOpen: false
    };
    
    // Inicialización
    function init() {
        console.log('🏈 SPORTBAR 23 y 12 - Inicializando...');
        
        // Cargar funcionalidades críticas
        loadCoreFeatures();
        
        // Configurar cuando el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupFeatures);
        } else {
            setupFeatures();
        }
        
        // Configurar cuando la página cargue completamente
        window.addEventListener('load', () => {
            console.log('✅ Página cargada completamente');
            initLazyLoading();
            setupAnimations();
        });
    }
    
    // Cargar funcionalidades principales
    function loadCoreFeatures() {
        setupSmoothScroll();
        setupImageModal();
        setupContactButtons();
        setupAccessibility();
    }
    
    // Configurar todas las características
    function setupFeatures() {
        setupMenuButtons();
        setupMapButton();
        setupHoverEffects();
        setupScrollIndicator();
        setupSoccerBallAnimation();
    }
    
    // Configurar scroll suave
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                if (href === '#' || href === '#!') return;
                
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    scrollToElement(target);
                }
            });
        });
    }
    
    // Función de scroll suave
    function scrollToElement(element) {
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = Math.min(800, Math.abs(distance) * 0.5);
        let startTime = null;
        
        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = easeInOutCubic(timeElapsed, startPosition, distance, duration);
            
            window.scrollTo(0, run);
            
            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            }
        }
        
        requestAnimationFrame(animation);
    }
    
    // Función de easing cúbica
    function easeInOutCubic(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t * t + b;
        t -= 2;
        return c / 2 * (t * t * t + 2) + b;
    }
    
    // Configurar modal de imágenes
    function setupImageModal() {
        const modal = document.getElementById('imageModal');
        const closeBtn = document.getElementById('closeModal');
        const viewButtons = document.querySelectorAll('.view-image-btn');
        
        if (!modal) return;
        
        // Abrir modal al hacer clic en botones de ver imagen
        viewButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const imageSrc = this.getAttribute('data-image');
                const imageTitle = this.getAttribute('data-title');
                
                openImageModal(imageSrc, imageTitle);
            });
        });
        
        // Cerrar modal
        if (closeBtn) {
            closeBtn.addEventListener('click', closeImageModal);
        }
        
        // Cerrar modal al hacer clic fuera
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeImageModal();
            }
        });
        
        // Cerrar modal con tecla Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && AppState.isModalOpen) {
                closeImageModal();
            }
        });
    }
    
    // Abrir modal de imagen
    function openImageModal(imageSrc, title) {
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        
        if (!modal || !modalImage || !modalTitle) return;
        
        // Mostrar estado de carga
        modalImage.style.opacity = '0.5';
        modalImage.src = '';
        
        // Configurar imagen
        const img = new Image();
        img.onload = function() {
            modalImage.src = imageSrc;
            modalImage.alt = title;
            modalImage.style.opacity = '1';
            modalTitle.textContent = title;
            modal.classList.add('active');
            AppState.isModalOpen = true;
            document.body.style.overflow = 'hidden';
            
            // Anunciar para accesibilidad
            announce(`Imagen ${title} abierta. Use las flechas para navegar o Escape para cerrar.`);
        };
        
        img.onerror = function() {
            showNotification('Error al cargar la imagen', 'error');
            modalImage.style.opacity = '1';
        };
        
        img.src = imageSrc;
    }
    
    // Cerrar modal de imagen
    function closeImageModal() {
        const modal = document.getElementById('imageModal');
        
        if (modal) {
            modal.classList.remove('active');
            AppState.isModalOpen = false;
            document.body.style.overflow = 'auto';
            
            // Anunciar para accesibilidad
            announce('Modal de imagen cerrado.');
        }
    }
    
    // Configurar botones de contacto
    function setupContactButtons() {
        // Botón de mapa
        const mapBtn = document.getElementById('btnMapa');
        if (mapBtn) {
            mapBtn.addEventListener('click', function() {
                showNotification('🔍 Opción de mapa no disponible temporalmente. Visítanos en 23 y 12, Vedado, La Habana.', 'info');
            });
        }
        
        // Botón de teléfono
        const phoneBtn = document.querySelector('.phone-btn');
        if (phoneBtn) {
            phoneBtn.addEventListener('click', function(e) {
                // Analytics si está configurado
                if (typeof gtag !== 'undefined') {
                    gtag('event', 'phone_click', {
                        'event_category': 'engagement',
                        'event_label': 'phone_call'
                    });
                }
                
                // Mostrar confirmación en dispositivos móviles
                if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                    if (!confirm('¿Deseas llamar al +53 5887 3126?')) {
                        e.preventDefault();
                    }
                }
            });
        }
    }
    
    // Configurar botones del menú
    function setupMenuButtons() {
        // Todos los botones que no son enlaces
        document.querySelectorAll('.btn:not([href]), .btn[href="#"]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                if (!this.hasAttribute('href') || this.getAttribute('href') === '#') {
                    e.preventDefault();
                    
                    const buttonText = this.textContent.trim();
                    const buttonType = this.classList.contains('primary') ? 'primary' : 
                                     this.classList.contains('secondary') ? 'secondary' : 'default';
                    
                    // Manejar diferentes tipos de botones
                    switch(buttonText) {
                        case 'Ver Menú Completo':
                            scrollToElement(document.getElementById('menu'));
                            announce('Navegando a la sección de menú');
                            break;
                        case 'Llámanos Ahora':
                            // Ya manejado por el enlace tel:
                            break;
                        default:
                            showNotification(`Función "${buttonText}" activada`, 'info');
                    }
                }
            });
        });
    }
    
    // Configurar botón de mapa
    function setupMapButton() {
        const mapButtons = document.querySelectorAll('#btnMapa, .btn[href*="maps.google"]');
        
        mapButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                if (this.id === 'btnMapa' || !this.hasAttribute('href')) {
                    e.preventDefault();
                    showNotification('📍 Opción de mapa no disponible. Nuestra dirección: 23 y 12, Vedado, La Habana, Cuba.', 'info');
                }
            });
        });
    }
    
    // Configurar efectos hover
    function setupHoverEffects() {
        // Usar event delegation para mejor rendimiento
        document.addEventListener('mouseover', function(e) {
            const target = e.target;
            
            // Añadir clase hover a elementos específicos
            if (target.matches('.feature, .gallery-item, .highlight-item, .tag, .location-feature')) {
                target.classList.add('hover');
            }
        });
        
        document.addEventListener('mouseout', function(e) {
            const target = e.target;
            
            // Remover clase hover
            if (target.matches('.feature, .gallery-item, .highlight-item, .tag, .location-feature')) {
                target.classList.remove('hover');
            }
        });
    }
    
    // Configurar scroll indicator
    function setupScrollIndicator() {
        const scrollIndicator = document.querySelector('.scroll-indicator');
        if (!scrollIndicator) return;
        
        let lastScrollY = window.scrollY;
        let ticking = false;
        
        window.addEventListener('scroll', function() {
            lastScrollY = window.scrollY;
            
            if (!ticking) {
                window.requestAnimationFrame(function() {
                    // Ocultar/mostrar indicator
                    if (lastScrollY > 100) {
                        scrollIndicator.style.opacity = '0';
                        scrollIndicator.style.pointerEvents = 'none';
                    } else {
                        scrollIndicator.style.opacity = '1';
                        scrollIndicator.style.pointerEvents = 'auto';
                    }
                    
                    ticking = false;
                });
                
                ticking = true;
            }
        }, { passive: true });
    }
    
    // Configurar animación de pelota de fútbol
    function setupSoccerBallAnimation() {
        const soccerBall = document.querySelector('.soccer-ball .ball');
        if (!soccerBall) return;
        
        // Verificar preferencias de reducción de movimiento
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mediaQuery.matches) return;
        
        let rotation = 0;
        let animationId;
        
        function animate() {
            rotation += 0.3;
            soccerBall.style.transform = `rotate(${rotation}deg)`;
            animationId = requestAnimationFrame(animate);
        }
        
        // Iniciar animación
        animate();
        
        // Pausar animación cuando no es visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (!animationId) {
                        animate();
                    }
                } else {
                    if (animationId) {
                        cancelAnimationFrame(animationId);
                        animationId = null;
                    }
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(soccerBall);
    }
    
    // Configurar accesibilidad
    function setupAccessibility() {
        // Mejorar navegación por teclado
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                document.documentElement.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', function() {
            document.documentElement.classList.remove('keyboard-navigation');
        });
        
        // Configurar región viva para anuncios
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
        
        // Función para anunciar mensajes
        window.announce = function(message) {
            liveRegion.textContent = message;
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        };
    }
    
    // Inicializar lazy loading
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const lazyImages = document.querySelectorAll('img[loading="lazy"]');
            
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src || img.src;
                        img.classList.add('loaded');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }
    
    // Configurar animaciones
    function setupAnimations() {
        // Animar elementos de checklist
        const checkItems = document.querySelectorAll('.check-item');
        checkItems.forEach((item, index) => {
            item.style.setProperty('--delay', `${index * 0.1}s`);
            item.classList.add('animate-in');
        });
        
        // Configurar observador de intersección
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '50px'
            });
            
            // Observar elementos para animar
            document.querySelectorAll('.feature, .gallery-item, .highlight-item, .info-item').forEach(el => {
                observer.observe(el);
            });
        }
    }
    
    // Mostrar notificación
    function showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        
        // Icono según tipo
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        // Estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#2a9d8f' : 
                        type === 'error' ? '#e63946' : 
                        type === 'warning' ? '#f4a261' : '#3a86ff'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 400px;
        `;
        
        // Añadir al documento
        document.body.appendChild(notification);
        
        // Remover después de 4 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
        
        // Anunciar para accesibilidad
        announce(message);
    }
    
    // Añadir estilos CSS para animaciones de notificación
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .check-item.animate-in {
            animation: fadeInLeft 0.5s ease var(--delay, 0s) both;
        }
        
        @keyframes fadeInLeft {
            from {
                opacity: 0;
                transform: translateX(-20px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        
        .animate-in {
            animation: fadeInUp 0.6s ease both;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Inicializar aplicación
    init();
    
    // Exportar funciones para debugging
    window.SportBarApp = {
        openImageModal,
        closeImageModal,
        showNotification,
        scrollToElement
    };
    
})();