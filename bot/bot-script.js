/**
 * SPORTBAR 23 Y 12 - BOT INTELIGENTE
 * Versión 4.0 - Con procesamiento de lenguaje natural
 * Reconoce lo que escribe el usuario y extrae la información
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
            { id: 'exterior', name: '🌳 Estándar Exterior', minConsumption: 0, minPeople: 2, maxPeople: 8, keywords: ['exterior', 'afuera', 'terraza', 'jardín'] },
            { id: 'barra', name: '🍻 Barra', minConsumption: 0, minPeople: 1, maxPeople: 2, keywords: ['barra', 'bar'] }
        ],
        
        availableTimes: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
        
        welcomeMessage: '🏈 ¡Hola! Soy SportBot, tu asistente virtual de SPORTBAR 23 y 12.\n\nPodés escribirme de forma natural, por ejemplo:\n"Quiero reservar para 4 personas en VIP hoy a las 20:00"\n\n¿Cómo te llamás?'
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
        initialized: false,
        extractedInfo: {}
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
    // PROCESADOR DE LENGUAJE NATURAL
    // ============================================
    const LanguageProcessor = {
        // Extraer número de personas del texto
        extractPeople: function(text) {
            const patterns = [
                /(\d+)\s*(personas?|gente|comensales?|pax)/i,
                /(para|somos?|vamos)\s*(\d+)/i,
                /(\d+)\s*(pax?)/i
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
        
        // Extraer zona del texto
        extractZone: function(text) {
            text = text.toLowerCase();
            
            for (let zone of CONFIG.zones) {
                for (let keyword of zone.keywords) {
                    if (text.includes(keyword)) {
                        return zone;
                    }
                }
            }
            
            // Si menciona algún número de mesa conocido
            const mesaMatch = text.match(/mesa\s*(\d+)/i);
            if (mesaMatch) {
                const mesaNum = parseInt(mesaMatch[1]);
                // Asignar zona por número de mesa (personalizable)
                if (mesaNum >= 1 && mesaNum <= 10) return CONFIG.zones.find(z => z.id === 'vip');
                if (mesaNum >= 11 && mesaNum <= 30) return CONFIG.zones.find(z => z.id === 'interior');
                if (mesaNum >= 31 && mesaNum <= 50) return CONFIG.zones.find(z => z.id === 'exterior');
            }
            
            return null;
        },
        
        // Extraer fecha del texto
        extractDate: function(text) {
            text = text.toLowerCase();
            const today = new Date();
            
            // Palabras clave
            if (text.includes('hoy')) return new Date(today);
            if (text.includes('mañana')) {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow;
            }
            if (text.includes('pasado')) {
                const afterTomorrow = new Date(today);
                afterTomorrow.setDate(afterTomorrow.getDate() + 2);
                return afterTomorrow;
            }
            
            // Formato DD/MM o DD/MM/YYYY
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
        
        // Extraer hora del texto
        extractTime: function(text) {
            // Formato HH:MM
            const timePattern = /(\d{1,2})[:.](\d{2})\s*(?:hs?)?/i;
            const match = text.match(timePattern);
            if (match) {
                let hour = parseInt(match[1]);
                let minute = parseInt(match[2]);
                if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                }
            }
            
            // Formato HH (solo hora)
            const hourPattern = /(?:a\s*las|)\s*(\d{1,2})\s*(?:hs?|horas?)?\b(?![:.]\d)/i;
            const hourMatch = text.match(hourPattern);
            if (hourMatch) {
                let hour = parseInt(hourMatch[1]);
                if (hour >= 0 && hour <= 23) {
                    return `${hour.toString().padStart(2, '0')}:00`;
                }
            }
            
            return null;
        },
        
        // Extraer preferencia de mesa
        extractTable: function(text) {
            const match = text.match(/mesa\s*(\d+)/i);
            return match ? match[1] : 'cualquiera';
        },
        
        // Extraer nombre (si no lo tenemos)
        extractName: function(text) {
            // Si el texto es muy corto, probablemente es el nombre
            if (text.length < 20 && !text.includes(' ') && isNaN(text)) {
                return text;
            }
            return null;
        },
        
        // Procesar todo el texto y extraer información
        processText: function(text) {
            return {
                people: this.extractPeople(text),
                zone: this.extractZone(text),
                date: this.extractDate(text),
                time: this.extractTime(text),
                table: this.extractTable(text),
                name: this.extractName(text)
            };
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

    // ============================================
    // EVENT LISTENERS
    // ============================================
    function setupEventListeners() {
        DOM.sendButton.addEventListener('click', sendMessage);
        DOM.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        DOM.resetButton.addEventListener('click', resetConversation);
    }

    // ============================================
    // ENVIAR MENSAJE
    // ============================================
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

    // ============================================
    // PROCESAR RESPUESTA CON NLP
    // ============================================
    function processResponse(input) {
        // Extraer información del texto
        const extracted = LanguageProcessor.processText(input);
        
        switch (BotState.currentStep) {
            case 0: // NOMBRE
                if (extracted.name) {
                    BotState.bookingData.name = extracted.name;
                } else if (input.length >= 2) {
                    BotState.bookingData.name = input;
                } else {
                    addBotMessage('Por favor, decime tu nombre para continuar.');
                    return;
                }
                
                saveToLocalStorage('sportbar_user_name', BotState.bookingData.name);
                addBotMessage(`Mucho gusto, ${BotState.bookingData.name} 👋`);
                BotState.currentStep++;
                
                // Si ya extrajo zona, avanzar
                if (extracted.zone) {
                    BotState.bookingData.zone = extracted.zone;
                    addBotMessage(`Veo que querés zona ${extracted.zone.name}.`);
                    if (extracted.people) {
                        BotState.bookingData.people = extracted.people;
                        BotState.currentStep = 2;
                        if (extracted.date) {
                            BotState.bookingData.date = formatDate(extracted.date);
                            BotState.currentStep = 3;
                            if (extracted.time) {
                                BotState.bookingData.time = extracted.time;
                                BotState.currentStep = 4;
                                showTableOptions();
                                return;
                            }
                        }
                    }
                }
                
                // Si no, preguntar lo que falta
                showZoneSelection();
                break;
                
            case 1: // ZONA
                let zone = extracted.zone;
                if (!zone) {
                    // Intentar match con el texto
                    const text = input.toLowerCase();
                    for (let z of CONFIG.zones) {
                        if (text.includes(z.id) || text.includes(z.name.toLowerCase())) {
                            zone = z;
                            break;
                        }
                    }
                }
                
                if (!zone) {
                    addBotMessage('Por favor, elegí una zona de las opciones disponibles.');
                    showZoneSelection();
                    return;
                }
                
                BotState.bookingData.zone = zone;
                addBotMessage(`Elegiste ${zone.name}. ${zone.minConsumption > 0 ? '💰 Consumo mínimo $' + zone.minConsumption : '✅ Sin consumo mínimo'}`);
                
                // Si ya tenemos personas, avanzar
                if (extracted.people) {
                    if (extracted.people >= zone.minPeople && extracted.people <= zone.maxPeople) {
                        BotState.bookingData.people = extracted.people;
                        BotState.currentStep = 2;
                        if (extracted.date) {
                            BotState.bookingData.date = formatDate(extracted.date);
                            BotState.currentStep = 3;
                            if (extracted.time) {
                                BotState.bookingData.time = extracted.time;
                                BotState.currentStep = 4;
                                showTableOptions();
                                return;
                            }
                        }
                    } else {
                        addBotMessage(`Para zona ${zone.name} la capacidad es de ${zone.minPeople} a ${zone.maxPeople} personas.`);
                    }
                }
                
                BotState.currentStep = 2;
                addBotMessage(`¿Para cuántas personas? (mínimo ${zone.minPeople}, máximo ${zone.maxPeople})`);
                break;
                
            case 2: // PERSONAS
                let people = extracted.people || parseInt(input);
                
                if (isNaN(people) || people < BotState.bookingData.zone.minPeople || people > BotState.bookingData.zone.maxPeople) {
                    addBotMessage(`Por favor, ingresá un número entre ${BotState.bookingData.zone.minPeople} y ${BotState.bookingData.zone.maxPeople} personas.`);
                    return;
                }
                
                BotState.bookingData.people = people;
                BotState.currentStep = 3;
                
                // Si ya tenemos fecha, avanzar
                if (extracted.date) {
                    BotState.bookingData.date = formatDate(extracted.date);
                    BotState.currentStep = 4;
                    if (extracted.time) {
                        BotState.bookingData.time = extracted.time;
                        BotState.currentStep = 5;
                        showTableOptions();
                        return;
                    }
                }
                
                showDatePicker();
                break;
                
            case 3: // FECHA
                // La fecha se maneja con el date picker
                break;
                
            case 4: // HORA
                let time = extracted.time || input;
                
                if (!CONFIG.availableTimes.includes(time)) {
                    addBotMessage('Por favor, seleccioná un horario de la lista.');
                    showTimeSelection();
                    return;
                }
                
                BotState.bookingData.time = time;
                BotState.currentStep = 5;
                showTableOptions();
                break;
                
            case 5: // MESA
                BotState.bookingData.table = extracted.table || input || 'cualquiera';
                BotState.currentStep = 6;
                showOffersQuestion();
                break;
                
            case 6: // OFERTAS
                const offers = input.toLowerCase();
                BotState.bookingData.offers = offers.includes('sí') || offers.includes('si') || offers.includes('ok') || offers.includes('dale') || offers.includes('quiero');
                BotState.currentStep = 7;
                showBookingSummary();
                break;
        }
    }

    // ============================================
    // MOSTRAR ZONAS
    // ============================================
    function showZoneSelection() {
        let buttonsHtml = '';
        CONFIG.zones.forEach(zone => {
            buttonsHtml += `<button class="option-btn" onclick="window.selectZone('${zone.id}')">
                ${zone.name}
            </button>`;
        });

        const messageDiv = createBotMessage(`
            <p><strong>📍 ¿En qué zona querés reservar?</strong></p>
            <div class="options-container">${buttonsHtml}</div>
        `);
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    window.selectZone = function(zoneId) {
        const zone = CONFIG.zones.find(z => z.id === zoneId);
        BotState.bookingData.zone = zone;
        
        addUserMessage(zone.name);
        
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            addBotMessage(`Elegiste ${zone.name}.`);
            addBotMessage(`¿Para cuántas personas? (mínimo ${zone.minPeople}, máximo ${zone.maxPeople})`);
            BotState.currentStep = 2;
        }, 800);
    };

    // ============================================
    // SELECTOR DE FECHA
    // ============================================
    function showDatePicker() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        const messageDiv = createBotMessage(`
            <p><strong>📅 ¿Qué día querés venir?</strong></p>
            <div class="date-picker-container">
                <input type="date" id="datePicker" min="${todayStr}" value="${todayStr}">
            </div>
            <div class="options-container">
                <button class="option-btn" onclick="window.confirmDate()">
                    <i class="fas fa-check"></i> Confirmar fecha
                </button>
            </div>
        `);
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    window.confirmDate = function() {
        const dateInput = document.getElementById('datePicker');
        if (!dateInput || !dateInput.value) {
            addBotMessage('Por favor, seleccioná una fecha.');
            return;
        }
        
        const [year, month, day] = dateInput.value.split('-');
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const formattedDate = `${parseInt(day)} de ${meses[parseInt(month)-1]} de ${year}`;
        
        BotState.bookingData.date = formattedDate;
        addUserMessage(formattedDate);
        
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            addBotMessage(`✅ ${formattedDate}`);
            showTimeSelection();
        }, 800);
    };

    // ============================================
    // SELECCIÓN DE HORA
    // ============================================
    function showTimeSelection() {
        let buttonsHtml = '';
        CONFIG.availableTimes.forEach(time => {
            buttonsHtml += `<button class="option-btn" onclick="window.selectTime('${time}')">${time}</button>`;
        });

        const messageDiv = createBotMessage(`
            <p><strong>⏰ ¿A qué hora?</strong></p>
            <div class="options-container">${buttonsHtml}</div>
        `);
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    window.selectTime = function(time) {
        BotState.bookingData.time = time;
        addUserMessage(time);
        
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            addBotMessage(`¿Tenés alguna mesa preferida? (Si no, decí "cualquiera")`);
            BotState.currentStep = 5;
        }, 800);
    };

    // ============================================
    // OPCIONES DE MESA
    // ============================================
    function showTableOptions() {
        const suggestions = ['31', '33', '27', '45', 'cualquiera'];
        let buttonsHtml = '';
        suggestions.forEach(table => {
            buttonsHtml += `<button class="option-btn" onclick="window.selectTable('${table}')">
                <i class="fas fa-chair"></i> Mesa ${table}
            </button>`;
        });

        const messageDiv = createBotMessage(`
            <p><strong>🪑 Mesa preferida</strong></p>
            <div class="options-container">${buttonsHtml}</div>
        `);
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    window.selectTable = function(table) {
        BotState.bookingData.table = table;
        addUserMessage(`Mesa ${table}`);
        
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            BotState.currentStep = 6;
            showOffersQuestion();
        }, 800);
    };

    // ============================================
    // PREGUNTA DE OFERTAS
    // ============================================
    function showOffersQuestion() {
        const messageDiv = createBotMessage(`
            <p><strong>📢 ¿Querés recibir ofertas y promociones por WhatsApp?</strong></p>
            <p style="font-size: 0.9rem; color: #adb5bd;">Te avisamos cuando hay partidos importantes</p>
            <div class="options-container">
                <button class="option-btn" onclick="window.selectOffers(true)" style="background: #25D366; color: white; border: none;">
                    <i class="fas fa-check"></i> Sí
                </button>
                <button class="option-btn" onclick="window.selectOffers(false)">
                    <i class="fas fa-times"></i> No
                </button>
            </div>
        `);
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    window.selectOffers = function(accept) {
        BotState.bookingData.offers = accept;
        addUserMessage(accept ? 'Sí, quiero recibir ofertas' : 'No, gracias');
        
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            BotState.currentStep = 7;
            showBookingSummary();
        }, 800);
    };

    // ============================================
    // RESUMEN DE RESERVA
    // ============================================
    function showBookingSummary() {
        const data = BotState.bookingData;
        const zone = data.zone;
        
        const summaryHtml = `
            <div class="message bot-message">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    <p><strong style="color: #f4a261;">✅ ¡RESERVA LISTA!</strong></p>
                    
                    <div class="booking-summary">
                        <div class="summary-item"><i class="fas fa-user"></i> <span><strong>${data.name}</strong></span></div>
                        <div class="summary-item"><i class="fas fa-map-marker-alt"></i> <span>${zone.name}</span></div>
                        <div class="summary-item"><i class="fas fa-users"></i> <span>${data.people} personas</span></div>
                        <div class="summary-item"><i class="fas fa-calendar"></i> <span>${data.date}</span></div>
                        <div class="summary-item"><i class="fas fa-clock"></i> <span>${data.time}</span></div>
                        <div class="summary-item"><i class="fas fa-chair"></i> <span>Mesa: <strong>${data.table}</strong></span></div>
                    </div>
                    
                    <div class="options-container">
                        <a href="https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(generateWhatsAppMessage())}" 
                           target="_blank" 
                           class="option-btn" 
                           style="background: #25D366; color: white; border: none; width: 100%; justify-content: center; padding: 1rem;">
                            <i class="fab fa-whatsapp"></i> ENVIAR RESERVA
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        DOM.messagesArea.insertAdjacentHTML('beforeend', summaryHtml);
        scrollToBottom();
        saveBookingToHistory();
    }

    // ============================================
    // GENERAR MENSAJE DE WHATSAPP
    // ============================================
    function generateWhatsAppMessage() {
        const data = BotState.bookingData;
        const zone = data.zone;
        
        return `🍻 *NUEVA RESERVA - SPORTBAR 23 Y 12*
        
👤 *Cliente:* ${data.name}
👥 *Personas:* ${data.people}
📍 *Zona:* ${zone.name}
💰 ${zone.minConsumption > 0 ? 'Consumo mínimo: $' + zone.minConsumption : 'Sin consumo mínimo'}

📅 *Fecha:* ${data.date}
⏰ *Hora:* ${data.time}
🪑 *Mesa preferida:* ${data.table}

📢 *Ofertas:* ${data.offers ? '✅ Aceptó' : '❌ No aceptó'}

✅ *Estado:* Pendiente de confirmación`;
    }

    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
    function formatDate(date) {
        if (!date) return '';
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
    }

    function createBotMessage(html) {
        const div = document.createElement('div');
        div.className = 'message bot-message';
        div.innerHTML = `
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">${html}</div>
        `;
        return div;
    }

    function addBotMessage(text) {
        const div = createBotMessage(`<p>${text.replace(/\n/g, '<br>')}</p>`);
        DOM.messagesArea.appendChild(div);
        scrollToBottom();
    }

    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message user-message';
        div.innerHTML = `
            <div class="message-avatar"><i class="fas fa-user"></i></div>
            <div class="message-content"><p>${text}</p></div>
        `;
        DOM.messagesArea.appendChild(div);
        scrollToBottom();
    }

    function showTypingIndicator() { DOM.typingIndicator.classList.add('active'); scrollToBottom(); }
    function hideTypingIndicator() { DOM.typingIndicator.classList.remove('active'); }
    function scrollToBottom() { DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight; }
    function focusInput() { DOM.userInput.focus(); }

    function saveBookingToHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('sportbar_booking_history') || '[]');
            history.push({...BotState.bookingData, timestamp: new Date().toISOString()});
            if (history.length > 20) history.shift();
            localStorage.setItem('sportbar_booking_history', JSON.stringify(history));
        } catch (e) {}
    }

    function loadSavedData() {
        try {
            const savedName = localStorage.getItem('sportbar_user_name');
            if (savedName) BotState.bookingData.name = savedName;
        } catch (e) {}
    }

    function saveToLocalStorage(key, value) {
        try { localStorage.setItem(key, value); } catch (e) {}
    }

    function resetConversation() {
        BotState.currentStep = 0;
        BotState.bookingData = {
            name: localStorage.getItem('sportbar_user_name') || '',
            zone: null,
            people: '',
            date: '',
            time: '',
            table: 'cualquiera',
            offers: null
        };
        DOM.messagesArea.innerHTML = '';
        addBotMessage(CONFIG.welcomeMessage);
    }

    // ============================================
    // INICIAR
    // ============================================
    init();

})();
