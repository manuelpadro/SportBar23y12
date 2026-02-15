/**
 * SPORTBAR 23 Y 12 - BOT INTELIGENTE
 * Versión final - Optimizado para móvil
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURACIÓN
    // ============================================
    const CONFIG = {
        whatsappNumber: '5358873126',
        
        zones: [
            { id: 'vip', name: '🥇 VIP', minConsumption: 3000, minPeople: 4, maxPeople: 8, keywords: ['vip', 'exclusivo', 'privado'] },
            { id: 'interior', name: '🪑 Estándar Interior', minConsumption: 0, minPeople: 2, maxPeople: 6, keywords: ['interior', 'adentro', 'dentro'] },
            { id: 'exterior', name: '🌳 Estándar Exterior', minConsumption: 0, minPeople: 2, maxPeople: 8, keywords: ['exterior', 'afuera', 'terraza'] },
            { id: 'barra', name: '🍻 Barra', minConsumption: 0, minPeople: 1, maxPeople: 2, keywords: ['barra', 'bar'] }
            { id: 'billar', name: '🎱 Billar', minComsumption: 0, minPeople: 2, maxPeople:4, keywords: ['billar', 'pool', 'mesa de billar', 'jugar']    
        ],
        
        availableTimes: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
        
        welcomeMessage: '🏈🤖 ¡Hola! Soy **SportBot**, tu asistente de reservas.\n\n¿En qué te puedo ayudar hoy? Podés decirme, por ejemplo: "4 personas en VIP mañana 20:00" o "2 personas para billar"\n\nPero primero, ¿cómo te llamás?
    };

    // ============================================
    // ESTADO DEL BOT
    // ============================================
    const BotState = {
        currentStep: 0,
        bookingData: {
            name: '',
            zone: null,
            people: '',
            date: '',
            time: '',
            table: 'cualquiera',
            offers: null
        },
        isWaitingResponse: false,
        initialized: false
    };

    // ============================================
    // ELEMENTOS DOM
    // ============================================
    const DOM = {
        messagesArea: document.getElementById('messagesArea'),
        userInput: document.getElementById('userInput'),
        sendButton: document.getElementById('sendButton'),
        resetButton: document.getElementById('resetBot'),
        typingIndicator: document.getElementById('typingIndicator'),
        chatContainer: document.getElementById('chatContainer')
    };

    // ============================================
    // PROCESADOR DE LENGUAJE
    // ============================================
    const LanguageProcessor = {
        extractPeople: function(text) {
            const patterns = [
                /(\d+)\s*(personas?|gente|pax)/i,
                /(para|somos)\s*(\d+)/i
            ];
            for (let pattern of patterns) {
                const match = text.match(pattern);
                if (match) {
                    const num = parseInt(match[1] || match[2]);
                    if (!isNaN(num) && num > 0 && num <= 12) return num;
                }
            }
            return null;
        },
        
        extractZone: function(text) {
            text = text.toLowerCase();
            for (let zone of CONFIG.zones) {
                for (let keyword of zone.keywords) {
                    if (text.includes(keyword)) return zone;
                }
            }
            return null;
        },
        
        extractDate: function(text) {
            text = text.toLowerCase();
            const today = new Date();
            
            if (text.includes('hoy')) return new Date(today);
            if (text.includes('mañana')) {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow;
            }
            
            const datePattern = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
            const match = text.match(datePattern);
            if (match) {
                let day = parseInt(match[1]);
                let month = parseInt(match[2]) - 1;
                let year = match[3] ? parseInt(match[3]) : today.getFullYear();
                if (year < 100) year += 2000;
                return new Date(year, month, day);
            }
            return null;
        },
        
        extractTime: function(text) {
            const timePattern = /(\d{1,2})[:.](\d{2})\s*(?:hs?)?/i;
            const match = text.match(timePattern);
            if (match) {
                let hour = parseInt(match[1]);
                let minute = parseInt(match[2]);
                return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            }
            
            const hourPattern = /(?:a\s*las)?\s*(\d{1,2})\s*(?:hs?|horas?)?\b(?![:.]\d)/i;
            const hourMatch = text.match(hourPattern);
            if (hourMatch) {
                let hour = parseInt(hourMatch[1]);
                if (hour >= 0 && hour <= 23) return `${hour.toString().padStart(2, '0')}:00`;
            }
            return null;
        },
        
        extractTable: function(text) {
            const match = text.match(/mesa\s*(\d+)/i);
            return match ? match[1] : null;
        }
    };

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    function init() {
        if (BotState.initialized) return;
        BotState.initialized = true;
        
        loadSavedData();
        setupEventListeners();
        focusInput();
        addBotMessage(CONFIG.welcomeMessage);
    }

    function setupEventListeners() {
        DOM.sendButton.addEventListener('click', sendMessage);
        DOM.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        DOM.resetButton.addEventListener('click', resetConversation);
    }

    function sendMessage() {
        const input = DOM.userInput.value.trim();
        if (!input || BotState.isWaitingResponse) return;
        
        addUserMessage(input);
        DOM.userInput.value = '';
        
        BotState.isWaitingResponse = true;
        showTypingIndicator();
        
        setTimeout(() => {
            processResponse(input);
            hideTypingIndicator();
            BotState.isWaitingResponse = false;
            focusInput();
        }, 800);
    }

    function processResponse(input) {
        const extracted = LanguageProcessor;
        
        switch (BotState.currentStep) {
            case 0:
                if (input.length >= 2) {
                    BotState.bookingData.name = input;
                    saveToLocalStorage('sportbar_user_name', input);
                    addBotMessage(`Hola ${input} 👋`);
                    BotState.currentStep++;
                    
                    let zone = extracted.extractZone(input);
                    if (zone) {
                        BotState.bookingData.zone = zone;
                        addBotMessage(`Zona: ${zone.name}`);
                        BotState.currentStep = 2;
                        
                        let people = extracted.extractPeople(input);
                        if (people) {
                            BotState.bookingData.people = people;
                            BotState.currentStep = 3;
                            
                            let date = extracted.extractDate(input);
                            if (date) {
                                BotState.bookingData.date = formatDate(date);
                                BotState.currentStep = 4;
                                
                                let time = extracted.extractTime(input);
                                if (time && CONFIG.availableTimes.includes(time)) {
                                    BotState.bookingData.time = time;
                                    BotState.currentStep = 5;
                                    showTableOptions();
                                    return;
                                }
                            }
                        }
                    }
                    showZoneSelection();
                } else {
                    addBotMessage('¿Cómo te llamás?');
                }
                break;
                
            case 1:
                showZoneSelection();
                break;
                
            case 2:
                let zone = extracted.extractZone(input);
                if (!zone) {
                    addBotMessage('Elegí una zona de las opciones:');
                    showZoneSelection();
                    return;
                }
                BotState.bookingData.zone = zone;
                addBotMessage(`Elegiste ${zone.name}`);
                BotState.currentStep = 3;
                addBotMessage(`¿Para cuántas personas? (${zone.minPeople}-${zone.maxPeople})`);
                break;
                
            case 3:
                let people = extracted.extractPeople(input) || parseInt(input);
                let zone2 = BotState.bookingData.zone;
                
                if (isNaN(people) || people < zone2.minPeople || people > zone2.maxPeople) {
                    addBotMessage(`Válido: ${zone2.minPeople}-${zone2.maxPeople} personas`);
                    return;
                }
                
                BotState.bookingData.people = people;
                BotState.currentStep = 4;
                showDatePicker();
                break;
                
            case 4:
                break;
                
            case 5:
                let time = extracted.extractTime(input) || input;
                if (!CONFIG.availableTimes.includes(time)) {
                    addBotMessage('Elegí un horario:');
                    showTimeSelection();
                    return;
                }
                BotState.bookingData.time = time;
                BotState.currentStep = 6;
                showTableOptions();
                break;
                
            case 6:
                BotState.bookingData.table = extracted.extractTable(input) || input || 'cualquiera';
                BotState.currentStep = 7;
                showOffersQuestion();
                break;
                
            case 7:
                BotState.bookingData.offers = input.toLowerCase().includes('sí') || input.toLowerCase().includes('si');
                BotState.currentStep = 8;
                showBookingSummary();
                break;
        }
    }

    function showZoneSelection() {
    let html = '<p>📍 Elegí una zona:</p><div class="options-container">';
    
    CONFIG.zones.forEach(z => {
        html += `<button class="option-btn" onclick="window.selectZone('${z.id}')">${z.name}</button>`;
    });
    
    html += '</div>';
    DOM.messagesArea.appendChild(createBotMessage(html));
    scrollToBottom();
}

    window.selectZone = function(id) {
        BotState.bookingData.zone = CONFIG.zones.find(z => z.id === id);
        addUserMessage(BotState.bookingData.zone.name);
        setTimeout(() => {
            addBotMessage(`Elegiste ${BotState.bookingData.zone.name}`);
            BotState.currentStep = 3;
            addBotMessage(`👥 Personas? (${BotState.bookingData.zone.minPeople}-${BotState.bookingData.zone.maxPeople})`);
        }, 500);
    };

    function showDatePicker() {
        const today = new Date().toISOString().split('T')[0];
        const html = `
            <p>📅 Fecha:</p>
            <div class="date-picker-container">
                <input type="date" id="datePicker" min="${today}" value="${today}">
            </div>
            <button class="option-btn" onclick="window.confirmDate()">Confirmar</button>
        `;
        DOM.messagesArea.appendChild(createBotMessage(html));
        scrollToBottom();
    }

    window.confirmDate = function() {
        const input = document.getElementById('datePicker');
        if (!input || !input.value) return;
        
        const [y, m, d] = input.value.split('-');
        const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        BotState.bookingData.date = `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
        
        addUserMessage(BotState.bookingData.date);
        setTimeout(() => {
            BotState.currentStep = 5;
            showTimeSelection();
        }, 500);
    };

    function showTimeSelection() {
        let html = '<p>⏰ Hora:</p><div class="options-container">';
        CONFIG.availableTimes.forEach(t => {
            html += `<button class="option-btn" onclick="window.selectTime('${t}')">${t}</button>`;
        });
        html += '</div>';
        DOM.messagesArea.appendChild(createBotMessage(html));
        scrollToBottom();
    }

    window.selectTime = function(time) {
        BotState.bookingData.time = time;
        addUserMessage(time);
        setTimeout(() => {
            BotState.currentStep = 6;
            showTableOptions();
        }, 500);
    };

    function showTableOptions() {
    const zone = BotState.bookingData.zone;
    let html = '<p>🪑 Elegí una opción:</p><div class="options-container">';
    
    if (zone && zone.id === 'billar') {
        html += `
            <button class="option-btn" onclick="window.selectTable('Billar 1')">🎱 Mesa Billar 1</button>
            <button class="option-btn" onclick="window.selectTable('Billar 2')">🎱 Mesa Billar 2</button>
            <button class="option-btn" onclick="window.selectTable('Cualquiera con disponibilidad')">Cualquiera</button>
        `;
    } else {
        // Para otras zonas, mostrar opciones generales
        html += `
            <button class="option-btn" onclick="window.selectTable('31')">Mesa 31</button>
            <button class="option-btn" onclick="window.selectTable('33')">Mesa 33</button>
            <button class="option-btn" onclick="window.selectTable('Cualquiera')">Cualquiera</button>
        `;
    }
    
    html += '</div>';
    DOM.messagesArea.appendChild(createBotMessage(html));
    scrollToBottom();
}

    window.selectTable = function(table) {
        BotState.bookingData.table = table;
        addUserMessage(`Mesa ${table}`);
        setTimeout(() => {
            BotState.currentStep = 7;
            showOffersQuestion();
        }, 500);
    };

    function showOffersQuestion() {
        const html = `
            <p>📢 ¿Ofertas por WhatsApp?</p>
            <div class="options-container">
                <button class="option-btn" onclick="window.selectOffers(true)">✅ Sí</button>
                <button class="option-btn" onclick="window.selectOffers(false)">❌ No</button>
            </div>
        `;
        DOM.messagesArea.appendChild(createBotMessage(html));
        scrollToBottom();
    }

    window.selectOffers = function(accept) {
        BotState.bookingData.offers = accept;
        addUserMessage(accept ? 'Sí' : 'No');
        setTimeout(() => {
            BotState.currentStep = 8;
            showBookingSummary();
        }, 500);
    };

    function showBookingSummary() {
        const d = BotState.bookingData;
        const z = d.zone;
        
        const msg = `✅ *RESERVA*
👤 ${d.name}
📍 ${z.name} ${z.minConsumption > 0 ? '💰 $'+z.minConsumption : ''}
👥 ${d.people} pers
📅 ${d.date} ${d.time}
🪑 Mesa ${d.table}
📢 ${d.offers ? 'Acepta ofertas' : 'No ofertas'}

📲 Enviar a WhatsApp:`;
        
        const html = `
            <div class="message bot-message">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    <p>✅ ¡Listo!</p>
                    <div class="booking-summary">
                        <div>👤 ${d.name}</div>
                        <div>📍 ${z.name} ${z.minConsumption > 0 ? '($'+z.minConsumption+')' : ''}</div>
                        <div>👥 ${d.people}</div>
                        <div>📅 ${d.date} ${d.time}</div>
                        <div>🪑 Mesa ${d.table}</div>
                        <div>📢 ${d.offers ? 'Sí' : 'No'}</div>
                    </div>
                    <a href="https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(generateMessage())}" 
                       target="_blank" class="option-btn" style="background:#25D366;color:white;width:100%;">
                        <i class="fab fa-whatsapp"></i> Enviar reserva
                    </a>
                </div>
            </div>
        `;
        DOM.messagesArea.insertAdjacentHTML('beforeend', html);
        scrollToBottom();
    }

function generateMessage() {
    const d = BotState.bookingData;
    const z = d.zone;
    
    let consumoTexto = '';
    if (z.minConsumption > 0) {
        consumoTexto = `💰 Consumo mínimo: $${z.minConsumption}`;
    }
    
    let zonaTexto = z.name;
    if (z.id === 'billar') {
        zonaTexto = '🎱 Billar';
    }
    
    return `🍻 *NUEVA RESERVA - SPORTBAR 23 Y 12*
    
👤 *Cliente:* ${d.name}
📍 *Zona:* ${zonaTexto}
${consumoTexto}
👥 *Personas:* ${d.people}
📅 *Fecha:* ${d.date}
⏰ *Hora:* ${d.time}
🪑 *Mesa:* ${d.table}

📢 *Ofertas:* ${d.offers ? '✅ Sí' : '❌ No'}

✅ *Estado:* Pendiente de confirmación`;
}

    function formatDate(date) {
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function createBotMessage(html) {
        const div = document.createElement('div');
        div.className = 'message bot-message';
        div.innerHTML = `<div class="message-avatar"><i class="fas fa-robot"></i></div><div class="message-content">${html}</div>`;
        return div;
    }

    function addBotMessage(text) {
        DOM.messagesArea.appendChild(createBotMessage(`<p>${text}</p>`));
        scrollToBottom();
    }

    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message user-message';
        div.innerHTML = `<div class="message-avatar"><i class="fas fa-user"></i></div><div class="message-content"><p>${text}</p></div>`;
        DOM.messagesArea.appendChild(div);
        scrollToBottom();
    }

    function showTypingIndicator() { DOM.typingIndicator.classList.add('active'); scrollToBottom(); }
    function hideTypingIndicator() { DOM.typingIndicator.classList.remove('active'); }
    function scrollToBottom() { DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight; }
    function focusInput() { DOM.userInput.focus(); }

    function loadSavedData() {
        try {
            const saved = localStorage.getItem('sportbar_user_name');
            if (saved) BotState.bookingData.name = saved;
        } catch (e) {}
    }

    function saveToLocalStorage(key, val) {
        try { localStorage.setItem(key, val); } catch (e) {}
    }

    function resetConversation() {
        BotState.currentStep = 0;
        BotState.bookingData = {
            name: localStorage.getItem('sportbar_user_name') || '',
            zone: null, people: '', date: '', time: '', table: 'cualquiera', offers: null
        };
        DOM.messagesArea.innerHTML = '';
        addBotMessage(CONFIG.welcomeMessage);
    }

    init();

})();


// ============================================
// MEJORAS PARA MÓVIL
// ============================================

// 1. Prevenir que el teclado oculte el input
function setupMobileKeyboard() {
    const input = document.getElementById('userInput');
    const chatContainer = document.getElementById('chatContainer');
    
    if (!input || !chatContainer) return;
    
    // Enfocar input sin hacer scroll brusco
    input.addEventListener('focus', function() {
        setTimeout(() => {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 300);
    });
    
    // Ajustar cuando el teclado aparece/desaparece
    if ('visualViewport' in window) {
        window.visualViewport.addEventListener('resize', function() {
            // En móvil, el teclado cambia el tamaño del viewport
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 100);
        });
    }
}

// 2. Hacer los botones más táctiles
function setupTouchButtons() {
    const buttons = document.querySelectorAll('.option-btn, .send-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('touchstart', function(e) {
            // Feedback táctil inmediato
            this.style.transform = 'scale(0.98)';
        });
        
        btn.addEventListener('touchend', function(e) {
            this.style.transform = 'scale(1)';
        });
        
        btn.addEventListener('touchcancel', function(e) {
            this.style.transform = 'scale(1)';
        });
    });
}

// 3. Mejorar el date picker en móvil
function setupMobileDatePicker() {
    // Forzar que el date picker se vea bien
    const dateInput = document.getElementById('datePicker');
    if (dateInput) {
        dateInput.addEventListener('click', function(e) {
            // En móvil, abrir el date picker nativo
            this.showPicker();
        });
    }
}

// 4. Scroll suave automático
function setupSmoothScroll() {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return;
    
    // Usar MutationObserver para detectar nuevos mensajes
    const observer = new MutationObserver(() => {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    });
    
    observer.observe(chatContainer, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

// Llamar a todas las mejoras
function setupMobileOptimizations() {
    setupMobileKeyboard();
    setupTouchButtons();
    setupMobileDatePicker();
    setupSmoothScroll();
}

// Agregar al init
const originalInit = init;
init = function() {
    originalInit();
    setupMobileOptimizations();
};
