/**
 * SPORTBAR 23 Y 12 - BOT CON PREGUNTA ABIERTA DE MESA
 * Pregunta: "¿Alguna mesa en específico?" + Validación de fecha
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
            { id: 'barra', name: '🍻 Barra', minConsumption: 0, minPeople: 1, maxPeople: 2, keywords: ['barra', 'bar'] },
            { id: 'billar', name: '🎱 Billar', minConsumption: 0, minPeople: 2, maxPeople: 4, keywords: ['billar', 'pool', 'mesa de billar', 'jugar'] }
        ],
        
        availableTimes: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
        
        welcomeMessage: '🏈 ¡Hola! Soy --SportBot🏈🤖--, tu asistente de reservas.\n\n¿En qué te puedo ayudar hoy? Podés decirme primero, ¿Cómo te llamas?'
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
            table: 'Sin preferencia',
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
    // PROCESADOR DE LENGUAJE BÁSICO
    // ============================================
    const LanguageProcessor = {
        extractPeople: function(text) {
            const match = text.match(/(\d+)/);
            return match ? parseInt(match[1]) : null;
        },
        
        extractZone: function(text) {
            text = text.toLowerCase();
            if (text.includes('vip')) return CONFIG.zones[0];
            if (text.includes('interior') || text.includes('adentro')) return CONFIG.zones[1];
            if (text.includes('exterior') || text.includes('afuera') || text.includes('terraza')) return CONFIG.zones[2];
            if (text.includes('barra') || text.includes('bar')) return CONFIG.zones[3];
            if (text.includes('billar') || text.includes('pool')) return CONFIG.zones[4];
            return null;
        },
        
        extractTime: function(text) {
            const match = text.match(/(\d{1,2})[:.]?(\d{2})?\s*(?:hs?)?/i);
            if (match) {
                let hour = parseInt(match[1]);
                if (hour >= 0 && hour <= 23) {
                    return `${hour.toString().padStart(2, '0')}:00`;
                }
            }
            return null;
        }
    };

    // ============================================
    // FUNCIONES PRINCIPALES
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
        switch (BotState.currentStep) {
            case 0: // NOMBRE
                if (input.length >= 2) {
                    BotState.bookingData.name = input;
                    saveToLocalStorage('sportbar_user_name', input);
                    addBotMessage(`Hola ${input} 👋`);
                    BotState.currentStep = 1;
                    showZoneSelection();
                } else {
                    addBotMessage('¿Cómo te llamás?');
                }
                break;
                
            case 1: // ZONA - se maneja con botones
                break;
                
            case 2: // PERSONAS
                let zone = BotState.bookingData.zone;
                let people = parseInt(input);
                
                if (isNaN(people) || people < zone.minPeople || people > zone.maxPeople) {
                    addBotMessage(`Válido: ${zone.minPeople}-${zone.maxPeople} personas`);
                    return;
                }
                
                BotState.bookingData.people = people;
                BotState.currentStep = 3;
                showDatePicker();
                break;
                
            case 3: // FECHA - se maneja con date picker
                // Si el usuario escribió algo, le recordamos que use el calendario
                addBotMessage('📅 Por favor, seleccioná la fecha en el calendario.');
                showDatePicker(); // Mostrar el calendario nuevamente
                break;
                
            case 4: // HORA
                let time = input;
                if (!CONFIG.availableTimes.includes(time)) {
                    addBotMessage('Elegí un horario de la lista:');
                    showTimeSelection();
                    return;
                }
                BotState.bookingData.time = time;
                BotState.currentStep = 5;
                askForTablePreference(); // ✅ PREGUNTA "¿ALGUNA MESA EN ESPECÍFICO?"
                break;
                
            case 5: // MESA (pregunta abierta)
                // Guardamos lo que el usuario escribió (puede ser "cerca de la barra", "mesa 33", etc.)
                BotState.bookingData.table = input || 'Sin preferencia';
                BotState.currentStep = 6;
                showOffersQuestion();
                break;
                
            case 6: // OFERTAS
                BotState.bookingData.offers = input.toLowerCase().includes('sí') || input.toLowerCase().includes('si');
                BotState.currentStep = 7;
                showBookingSummary();
                break;
        }
    }

    // ============================================
    // SELECCIÓN DE ZONA (BOTONES)
    // ============================================
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
            BotState.currentStep = 2;
            addBotMessage(`👥 ¿Para cuántas personas? (${BotState.bookingData.zone.minPeople}-${BotState.bookingData.zone.maxPeople})`);
        }, 500);
    };

    // ============================================
    // SELECCIÓN DE FECHA CON CALENDARIO
    // ============================================
    function showDatePicker() {
        const today = new Date().toISOString().split('T')[0];
        const html = `
            <p>📅 Seleccioná la fecha en el calendario:</p>
            <div class="date-picker-container">
                <input type="date" id="datePicker" min="${today}" value="${today}">
            </div>
            <button class="option-btn" onclick="window.confirmDate()">Confirmar fecha</button>
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
            BotState.currentStep = 4;
            showTimeSelection();
        }, 500);
    };

    // ============================================
    // SELECCIÓN DE HORA (BOTONES)
    // ============================================
    function showTimeSelection() {
        let html = '<p>⏰ Elegí una hora:</p><div class="options-container">';
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
            BotState.currentStep = 5;
            askForTablePreference(); // ✅ PREGUNTA POR LA MESA
        }, 500);
    };

    // ============================================
    // PREGUNTA ABIERTA DE MESA (¡NUEVO!)
    // ============================================
    function askForTablePreference() {
        const zone = BotState.bookingData.zone;
        let message = '🪑 ¿Alguna mesa en específico? Podés pedir ubicación, número, o decir "no" si no tenés preferencia.';
        
        if (zone && zone.id === 'billar') {
            message = '🎱 ¿Alguna mesa de billar en específico? (Billar 1, Billar 2, o "no")';
        }
        
        addBotMessage(message);
        // El usuario va a ESCRIBIR su preferencia
    }

    // ============================================
    // PREGUNTA DE OFERTAS
    // ============================================
    function showOffersQuestion() {
        const html = `
            <p>📢 ¿Querés recibir ofertas y promociones por WhatsApp?</p>
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
            BotState.currentStep = 7;
            showBookingSummary();
        }, 500);
    };

    // ============================================
    // RESUMEN DE RESERVA
    // ============================================
    function showBookingSummary() {
        const d = BotState.bookingData;
        const z = d.zone;
        
        const html = `
            <div class="message bot-message">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    <p>✅ ¡Reserva lista!</p>
                    <div class="booking-summary">
                        <div><strong>👤 ${d.name}</strong></div>
                        <div>📍 ${z.name} ${z.minConsumption > 0 ? '($'+z.minConsumption+')' : ''}</div>
                        <div>👥 ${d.people} personas</div>
                        <div>📅 ${d.date} - ${d.time}</div>
                        <div>🪑 Preferencia: ${d.table}</div>
                        <div>📢 Ofertas: ${d.offers ? '✅ Sí' : '❌ No'}</div>
                    </div>
                    <p style="margin: 10px 0;">📲 Enviá este mensaje para confirmar:</p>
                    <a href="https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(generateMessage())}" 
                       target="_blank" class="option-btn" style="background:#25D366;color:white;width:100%;">
                        <i class="fab fa-whatsapp"></i> ENVIAR RESERVA
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
🪑 *Preferencia de mesa:* ${d.table}

📢 *Ofertas:* ${d.offers ? '✅ Sí' : '❌ No'}

✅ *Estado:* Pendiente de confirmación`;
    }

    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
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
            zone: null, people: '', date: '', time: '', table: 'Sin preferencia', offers: null
        };
        DOM.messagesArea.innerHTML = '';
        addBotMessage(CONFIG.welcomeMessage);
    }

    // ============================================
    // INICIAR BOT
    // ============================================
    init();

})();
