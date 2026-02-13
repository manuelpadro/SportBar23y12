/**
 * SPORTBAR 23 Y 12 - BOT DE RESERVAS
 * Versión 2.0 - Conversacional, sin base de datos
 */

(function() {
    'use strict';

    // ===== CONFIGURACIÓN =====
    const CONFIG = {
        whatsappNumber: '5358873126',
        welcomeMessage: '🏈 ¡Hola! Soy SportBot, tu asistente virtual de SPORTBAR 23 y 12.\n\nVoy a ayudarte a reservar tu mesa en 5 pasos rápidos. ¿Cómo te llamas?',
        steps: [
            { id: 'name', question: '¿Cómo te llamás?', validator: (input) => input.trim().length >= 2 },
            { id: 'people', question: '¿Para cuántas personas?', validator: (input) => /^[1-9][0-9]?$|^10$/.test(input.trim()), errorMsg: 'Por favor, ingresá un número válido (1-10)' },
            { id: 'date', question: '¿Qué día querés venir? (ej: 25/12 o mañana)', validator: (input) => input.trim().length >= 3 },
            { id: 'time', question: '¿A qué hora? (ej: 20:00)', validator: (input) => /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(input.trim()) || input.toLowerCase().includes(':' ), errorMsg: 'Por favor, ingresá una hora válida (ej: 20:00)' },
            { id: 'table', question: '¿Tenés alguna mesa preferida? (Si no, decí "cualquiera")', validator: (input) => true, optional: true }
        ]
    };

    // ===== ESTADO DEL BOT =====
    const BotState = {
        currentStep: 0,
        bookingData: {
            name: '',
            people: '',
            date: '',
            time: '',
            table: 'cualquiera',
            timestamp: new Date().toLocaleString('es-ES')
        },
        isWaitingResponse: false,
        history: []
    };

    // ===== ELEMENTOS DOM =====
    const DOM = {
        messagesArea: document.getElementById('messagesArea'),
        userInput: document.getElementById('userInput'),
        sendButton: document.getElementById('sendButton'),
        resetButton: document.getElementById('resetBot'),
        typingIndicator: document.getElementById('typingIndicator'),
        chatContainer: document.getElementById('chatContainer')
    };

    // ===== INICIALIZACIÓN =====
    function init() {
        loadSavedData();
        setupEventListeners();
        focusInput();
        
        // Si no hay historial, mostrar mensaje de bienvenida
        if (BotState.history.length === 0) {
            addBotMessage(CONFIG.welcomeMessage);
        }
    }

    // ===== EVENT LISTENERS =====
    function setupEventListeners() {
        // Enviar mensaje
        DOM.sendButton.addEventListener('click', sendMessage);
        DOM.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Reset bot
        DOM.resetButton.addEventListener('click', resetConversation);
        
        // Focus input al cargar
        DOM.userInput.addEventListener('blur', () => {
            setTimeout(focusInput, 10);
        });
    }

    // ===== ENVIAR MENSAJE =====
    function sendMessage() {
        const input = DOM.userInput.value.trim();
        if (!input || BotState.isWaitingResponse) return;
        
        // Mostrar mensaje del usuario
        addUserMessage(input);
        DOM.userInput.value = '';
        
        // Procesar respuesta
        BotState.isWaitingResponse = true;
        showTypingIndicator();
        
        setTimeout(() => {
            processResponse(input);
            hideTypingIndicator();
            BotState.isWaitingResponse = false;
            focusInput();
        }, 800);
    }

    // ===== PROCESAR RESPUESTA =====
    function processResponse(input) {
        const step = CONFIG.steps[BotState.currentStep];
        
        // Validar respuesta
        if (step && !step.validator(input) && !step.optional) {
            addBotMessage(step.errorMsg || 'Por favor, ingresá un valor válido.');
            return;
        }
        
        // Guardar respuesta
        switch (BotState.currentStep) {
            case 0: // Nombre
                BotState.bookingData.name = input;
                saveToLocalStorage('sportbar_user_name', input);
                addBotMessage(`Mucho gusto, ${input} 👋`);
                break;
            case 1: // Personas
                BotState.bookingData.people = input;
                break;
            case 2: // Fecha
                BotState.bookingData.date = input;
                break;
            case 3: // Hora
                BotState.bookingData.time = input;
                break;
            case 4: // Mesa
                BotState.bookingData.table = input;
                break;
        }
        
        // Avanzar al siguiente paso o finalizar
        BotState.currentStep++;
        
        if (BotState.currentStep < CONFIG.steps.length) {
            // Preguntar siguiente
            addBotMessage(CONFIG.steps[BotState.currentStep].question);
            
            // Si es el paso de mesa, sugerir opciones
            if (BotState.currentStep === 4) {
                setTimeout(() => {
                    addTableOptions();
                }, 500);
            }
        } else {
            // Reserva completa
            showBookingSummary();
        }
    }

    // ===== OPCIONES DE MESA =====
    function addTableOptions() {
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options-container';
        
        const tables = ['31', '33', '27', '45', 'cualquiera'];
        tables.forEach(table => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerHTML = `<i class="fas fa-chair"></i> Mesa ${table}`;
            btn.onclick = () => {
                addUserMessage(`Mesa ${table}`);
                BotState.bookingData.table = table;
                
                showTypingIndicator();
                setTimeout(() => {
                    hideTypingIndicator();
                    BotState.currentStep++;
                    showBookingSummary();
                }, 800);
            };
            optionsDiv.appendChild(btn);
        });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = `
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content"></div>
        `;
        messageDiv.querySelector('.message-content').appendChild(optionsDiv);
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    // ===== MOSTRAR RESUMEN DE RESERVA =====
    function showBookingSummary() {
        const data = BotState.bookingData;
        
        const summaryHtml = `
            <div class="message bot-message">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    <p><strong>✅ ¡Todo listo, ${data.name}!</strong></p>
                    <p>Confirmá los datos de tu reserva:</p>
                    
                    <div class="booking-summary">
                        <div class="summary-item">
                            <i class="fas fa-user"></i>
                            <span>Nombre: <strong>${data.name}</strong></span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-users"></i>
                            <span>Personas: <strong>${data.people}</strong></span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-calendar"></i>
                            <span>Fecha: <strong>${data.date}</strong></span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-clock"></i>
                            <span>Hora: <strong>${data.time}</strong></span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-chair"></i>
                            <span>Mesa preferida: <strong>${data.table}</strong></span>
                        </div>
                    </div>
                    
                    <p>📱 Hacé clic en el botón de abajo para enviar la reserva a nuestro WhatsApp.</p>
                    
                    <div class="options-container">
                        <a href="https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(generateWhatsAppMessage())}" 
                           target="_blank" 
                           class="option-btn" 
                           style="background: #25D366; color: white; border: none; width: 100%; justify-content: center;">
                            <i class="fab fa-whatsapp"></i> ENVIAR RESERVA POR WHATSAPP
                        </a>
                    </div>
                    
                    <p style="margin-top: 1rem; font-size: 0.85rem; color: #adb5bd;">
                        <i class="fas fa-clock"></i> Recibirás confirmación en minutos
                    </p>
                </div>
            </div>
        `;
        
        DOM.messagesArea.insertAdjacentHTML('beforeend', summaryHtml);
        scrollToBottom();
        
        // Guardar en localStorage
        saveBookingToHistory();
    }

    // ===== GENERAR MENSAJE DE WHATSAPP =====
    function generateWhatsAppMessage() {
        const data = BotState.bookingData;
        const fecha = new Date().toLocaleDateString('es-ES');
        
        return `🍻 *NUEVA RESERVA - SPORTBAR 23 Y 12*
        
👤 *Nombre:* ${data.name}
👥 *Personas:* ${data.people}
📅 *Fecha:* ${data.date}
⏰ *Hora:* ${data.time}
📍 *Mesa preferida:* ${data.table}

📆 *Reserva generada:* ${fecha}
✅ *Confirmar disponibilidad*`;
    }

    // ===== GUARDAR EN HISTORIAL =====
    function saveBookingToHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('sportbar_booking_history') || '[]');
            history.push({
                ...BotState.bookingData,
                completed: true,
                timestamp: new Date().toISOString()
            });
            
            // Mantener solo últimas 10 reservas
            if (history.length > 10) history.shift();
            
            localStorage.setItem('sportbar_booking_history', JSON.stringify(history));
            localStorage.setItem('sportbar_last_booking', JSON.stringify(BotState.bookingData));
        } catch (e) {
            console.log('Error guardando historial');
        }
    }

    // ===== CARGAR DATOS GUARDADOS =====
    function loadSavedData() {
        try {
            const savedName = localStorage.getItem('sportbar_user_name');
            if (savedName) {
                BotState.bookingData.name = savedName;
            }
            
            const lastBooking = localStorage.getItem('sportbar_last_booking');
            if (lastBooking) {
                const data = JSON.parse(lastBooking);
                // No cargar automáticamente, solo para referencia
            }
        } catch (e) {
            console.log('Error cargando datos');
        }
    }

    // ===== GUARDAR EN LOCALSTORAGE =====
    function saveToLocalStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.log('Error guardando en localStorage');
        }
    }

    // ===== REINICIAR CONVERSACIÓN =====
    function resetConversation() {
        BotState.currentStep = 0;
        BotState.bookingData = {
            name: localStorage.getItem('sportbar_user_name') || '',
            people: '',
            date: '',
            time: '',
            table: 'cualquiera',
            timestamp: new Date().toLocaleString('es-ES')
        };
        BotState.isWaitingResponse = false;
        
        // Limpiar mensajes
        DOM.messagesArea.innerHTML = '';
        
        // Mensaje de bienvenida
        addBotMessage(CONFIG.welcomeMessage);
        
        // Si hay nombre guardado, sugerirlo
        if (BotState.bookingData.name) {
            setTimeout(() => {
                addBotMessage(`¿Eres ${BotState.bookingData.name}? (Si es así, escribí "sí" o tu nombre si es otro)`);
            }, 1000);
        }
    }

    // ===== FUNCIONES AUXILIARES =====
    function addBotMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = `
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <p>${text.replace(/\n/g, '<br>')}</p>
            </div>
        `;
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.innerHTML = `
            <div class="message-avatar"><i class="fas fa-user"></i></div>
            <div class="message-content">
                <p>${text}</p>
            </div>
        `;
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        DOM.typingIndicator.classList.add('active');
        scrollToBottom();
    }

    function hideTypingIndicator() {
        DOM.typingIndicator.classList.remove('active');
    }

    function scrollToBottom() {
        DOM.chatContainer.scrollTop = DOM.chatContainer.scrollHeight;
    }

    function focusInput() {
        DOM.userInput.focus();
    }

    // ===== INICIAR =====
    init();

})();
