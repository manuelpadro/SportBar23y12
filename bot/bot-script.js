/**
 * SPORTBAR 23 Y 12 - BOT DE RESERVAS
 * Versión 3.0 - CORREGIDA - Sin mensaje duplicado
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURACIÓN - EDITÁ SOLO ESTA PARTE
    // ============================================
    const CONFIG = {
        // 📱 TU NÚMERO DE WHATSAPP - CAMBIALO ACÁ
        whatsappNumber: '5358873126',
        
        // 🏆 ZONAS DEL BAR
        zones: [
            { 
                id: 'vip', 
                name: '🥇 VIP', 
                minConsumption: 3000,  // Consumo mínimo en pesos
                minPeople: 4, 
                maxPeople: 8,
                description: 'Consumo mínimo $3000'
            },
            { 
                id: 'interior', 
                name: '🪑 Estándar Interior', 
                minConsumption: 0, 
                minPeople: 2, 
                maxPeople: 6,
                description: 'Sin consumo mínimo'// agregarle un consnum
            },
            { 
                id: 'exterior', 
                name: '🌳 Estándar Exterior', 
                minConsumption: 0, 
                minPeople: 2, 
                maxPeople: 8,
                description: 'Sin consumo mínimo'
            },
            { 
                id: 'barra', 
                name: '🍻 Barra', 
                minConsumption: 0, 
                minPeople: 1, 
                maxPeople: 2,
                description: 'Sin consumo mínimo'//agregarle consumo minimo 
            }
        ],
        
        // ⏰ Horarios disponibles
        availableTimes: ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
        
        // 👋 Mensaje de bienvenida (SOLO UNO)
        welcomeMessage: '🏈 ¡Hola! Soy SportBot, tu asistente virtual de SPORTBAR 23 y 12.\n\nTe voy a ayudar a reservar tu mesa. ¿Cómo te llamás?'
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
    // INICIALIZACIÓN - SOLO UNA VEZ
    // ============================================
    function init() {
        // ✅ EVITAR DOBLE INICIALIZACIÓN
        if (BotState.initialized) return;
        BotState.initialized = true;
        
        console.log('🤖 SportBot iniciado correctamente');
        
        loadSavedData();
        setupEventListeners();
        focusInput();
        
        // ✅ SOLO UN MENSAJE DE BIENVENIDA
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
    // PROCESAR RESPUESTAS
    // ============================================
    function processResponse(input) {
        switch (BotState.currentStep) {
            case 0: // NOMBRE
                if (input.length < 2) {
                    addBotMessage('Por favor, ingresá tu nombre completo.');
                    return;
                }
                BotState.bookingData.name = input;
                saveToLocalStorage('sportbar_user_name', input);
                addBotMessage(`Mucho gusto, ${input} 👋`);
                BotState.currentStep++;
                showZoneSelection();
                break;
                
            case 2: // CANTIDAD DE PERSONAS
                const people = parseInt(input);
                const zone = BotState.bookingData.zone;
                
                if (isNaN(people) || people < zone.minPeople || people > zone.maxPeople) {
                    addBotMessage(`Para zona ${zone.name} la capacidad es de ${zone.minPeople} a ${zone.maxPeople} personas. ¿Cuántas van a ser?`);
                    return;
                }
                
                BotState.bookingData.people = people;
                
                if (zone.minConsumption > 0) {
                    addBotMessage(`✅ Perfecto. Recordá que la zona ${zone.name} tiene un consumo mínimo de $${zone.minConsumption} por mesa.`);
                }
                
                BotState.currentStep++;
                showDatePicker();
                break;
                
            case 4: // HORA
                if (!CONFIG.availableTimes.includes(input)) {
                    addBotMessage(`Por favor, seleccioná un horario de la lista.`);
                    return;
                }
                BotState.bookingData.time = input;
                BotState.currentStep++;
                showTableOptions();
                break;
                
            case 5: // MESA
                BotState.bookingData.table = input;
                BotState.currentStep++;
                showOffersQuestion();
                break;
                
            case 6: // OFERTAS
                const offers = input.toLowerCase();
                if (offers.includes('sí') || offers.includes('si') || offers.includes('ok') || offers.includes('dale') || offers.includes('quiero')) {
                    BotState.bookingData.offers = true;
                } else {
                    BotState.bookingData.offers = false;
                }
                BotState.currentStep++;
                showBookingSummary();
                break;
        }
    }

    // ============================================
    // 1. SELECCIÓN DE ZONA
    // ============================================
    function showZoneSelection() {
        let buttonsHtml = '';
        CONFIG.zones.forEach(zone => {
            buttonsHtml += `<button class="option-btn" onclick="window.selectZone('${zone.id}')">
                ${zone.name} <br><small style="font-size: 0.8rem;">${zone.description}</small>
            </button>`;
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = `
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <p><strong>📍 ¿En qué zona querés reservar?</strong></p>
                <div class="options-container">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    // Zona selection global
    window.selectZone = function(zoneId) {
        const zone = CONFIG.zones.find(z => z.id === zoneId);
        BotState.bookingData.zone = zone;
        
        addUserMessage(zone.name);
        
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            addBotMessage(`Elegiste ${zone.name}. ${zone.description}`);
            addBotMessage(`👥 ¿Para cuántas personas? (mínimo ${zone.minPeople}, máximo ${zone.maxPeople})`);
            BotState.currentStep = 2;
        }, 800);
    };

// ============================================
// 2. SELECTOR DE FECHA - CORREGIDO
// ============================================
function showDatePicker() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    messageDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <p><strong>📅 ¿Qué día querés venir?</strong></p>
            <p style="font-size: 0.9rem; color: #adb5bd; margin-bottom: 1rem;">
                Seleccioná la fecha en el calendario
            </p>
            <div class="date-picker-container">
                <input type="date" id="datePicker" min="${todayStr}" value="${todayStr}">
            </div>
            <div class="options-container" style="margin-top: 1rem;">
                <button class="option-btn" onclick="window.confirmDate()">
                    <i class="fas fa-check"></i> Confirmar fecha
                </button>
            </div>
        </div>
    `;
    
    DOM.messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

// ✅ VERSIÓN CORREGIDA - SIN PROBLEMA DE ZONA HORARIA
window.confirmDate = function() {
    const dateInput = document.getElementById('datePicker');
    if (!dateInput || !dateInput.value) {
        addBotMessage('Por favor, seleccioná una fecha.');
        return;
    }
    
    // Extraemos año, mes, día directamente del input
    const [year, month, day] = dateInput.value.split('-');
    
    // Array de meses en español
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    
    // Formateamos sin usar el objeto Date para evitar problemas de zona horaria
    const diaNumero = parseInt(day, 10);
    const mesNombre = meses[parseInt(month, 10) - 1];
    const anioNumero = parseInt(year, 10);
    
    const formattedDate = `${diaNumero} de ${mesNombre} de ${anioNumero}`;
    
    // Guardamos la fecha
    BotState.bookingData.date = formattedDate;
    
    // Mostramos al usuario
    addUserMessage(formattedDate);
    
    showTypingIndicator();
    setTimeout(() => {
        hideTypingIndicator();
        addBotMessage(`✅ ${formattedDate}`);
        showTimeSelection();
    }, 800);
};

    // ============================================
    // 3. SELECCIÓN DE HORA
    // ============================================
    function showTimeSelection() {
        let buttonsHtml = '';
        CONFIG.availableTimes.forEach(time => {
            buttonsHtml += `<button class="option-btn" onclick="window.selectTime('${time}')">${time}</button>`;
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = `
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <p><strong>⏰ ¿A qué hora?</strong></p>
                <div class="options-container">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    // Seleccionar hora global
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
    // 4. SELECCIÓN DE MESA
    // ============================================
    function showTableOptions() {
        const suggestions = ['31', '33', '27', '45', 'cualquiera'];
        let buttonsHtml = '';
        suggestions.forEach(table => {
            buttonsHtml += `<button class="option-btn" onclick="window.selectTable('${table}')">
                <i class="fas fa-chair"></i> Mesa ${table}
            </button>`;
        });

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = `
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <p><strong>🪑 Mesa preferida</strong></p>
                <div class="options-container">
                    ${buttonsHtml}
                </div>
            </div>
        `;
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    // Seleccionar mesa global
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
    // 5. PREGUNTA DE OFERTAS
    // ============================================
    function showOffersQuestion() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.innerHTML = `
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <p><strong>📢 ¿Querés recibir ofertas y promociones por WhatsApp?</strong></p>
                <p style="font-size: 0.9rem; color: #adb5bd;">
                    Te avisamos cuando hay partidos importantes, promociones especiales y eventos.
                </p>
                <div class="options-container">
                    <button class="option-btn" onclick="window.selectOffers(true)" style="background: #25D366; color: white; border: none;">
                        <i class="fas fa-check"></i> Sí, quiero recibir
                    </button>
                    <button class="option-btn" onclick="window.selectOffers(false)">
                        <i class="fas fa-times"></i> No, gracias
                    </button>
                </div>
            </div>
        `;
        
        DOM.messagesArea.appendChild(messageDiv);
        scrollToBottom();
    }

    // Seleccionar ofertas global
    window.selectOffers = function(accept) {
        BotState.bookingData.offers = accept;
        addUserMessage(accept ? 'Sí, quiero recibir ofertas 📢' : 'No, gracias');
        
        showTypingIndicator();
        setTimeout(() => {
            hideTypingIndicator();
            BotState.currentStep = 7;
            showBookingSummary();
        }, 800);
    };

    // ============================================
    // 6. RESUMEN Y ENVÍO A WHATSAPP
    // ============================================
    function showBookingSummary() {
        const data = BotState.bookingData;
        const zone = data.zone;
        
        const consumptionText = zone.minConsumption > 0 
            ? `💰 Consumo mínimo: $${zone.minConsumption}` 
            : '✅ Sin consumo mínimo';
        
        const offersText = data.offers 
            ? '✅ Aceptó recibir ofertas' 
            : '❌ No aceptó ofertas';
        
        const summaryHtml = `
            <div class="message bot-message">
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="message-content">
                    <p><strong style="color: #f4a261;">✅ ¡RESERVA LISTA!</strong></p>
                    
                    <div class="booking-summary">
                        <div class="summary-item">
                            <i class="fas fa-user"></i>
                            <span><strong>${data.name}</strong></span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${zone.name}</span><br>
                            <small style="color: #f4a261;">${consumptionText}</small>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-users"></i>
                            <span>${data.people} personas</span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-calendar"></i>
                            <span>${data.date}</span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-clock"></i>
                            <span>${data.time}</span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-chair"></i>
                            <span>Mesa preferida: <strong>${data.table}</strong></span>
                        </div>
                        <div class="summary-item">
                            <i class="fas fa-bell"></i>
                            <span>${offersText}</span>
                        </div>
                    </div>
                    
                    <p style="margin-top: 1rem;">📱 Hacé clic en el botón de abajo para ENVIAR LA RESERVA a nuestro WhatsApp.</p>
                    
                    <div class="options-container">
                        <a href="https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(generateWhatsAppMessage())}" 
                           target="_blank" 
                           class="option-btn" 
                           style="background: #25D366; color: white; border: none; width: 100%; justify-content: center; padding: 1rem;">
                            <i class="fab fa-whatsapp"></i> ENVIAR RESERVA AHORA
                        </a>
                    </div>
                    
                    <p style="margin-top: 1rem; font-size: 0.8rem; color: #adb5bd;">
                        <i class="fas fa-clock"></i> Te confirmamos disponibilidad en minutos
                    </p>
                </div>
            </div>
        `;
        
        DOM.messagesArea.insertAdjacentHTML('beforeend', summaryHtml);
        scrollToBottom();
        saveBookingToHistory();
    }

    // ============================================
    // 7. GENERAR MENSAJE DE WHATSAPP
    // ============================================
    function generateWhatsAppMessage() {
        const data = BotState.bookingData;
        const zone = data.zone;
        const fecha = new Date().toLocaleDateString('es-ES');
        const hora = new Date().toLocaleTimeString('es-ES');
        
        const consumo = zone.minConsumption > 0 
            ? `💰 Consumo mínimo: $${zone.minConsumption}` 
            : '✅ Sin consumo mínimo';
        
        const ofertas = data.offers 
            ? '✅ Aceptó recibir promociones' 
            : '❌ No aceptó ofertas';
        
        return `🍻 *NUEVA RESERVA - SPORTBAR 23 Y 12*
        
👤 *Cliente:* ${data.name}
👥 *Personas:* ${data.people}
📍 *Zona:* ${zone.name}
${consumo}

📅 *Fecha:* ${data.date}
⏰ *Hora:* ${data.time}
🪑 *Mesa preferida:* ${data.table}

📱 *Contacto:* +53 ${CONFIG.whatsappNumber}
📢 *Ofertas:* ${ofertas}

───────────────
📆 *Reserva generada:* ${fecha} - ${hora}
✅ *Estado:* Pendiente de confirmación
───────────────

⚡ *Respondé este mensaje para confirmar disponibilidad.*`;
    }

    // ============================================
    // LOCAL STORAGE
    // ============================================
    function saveBookingToHistory() {
        try {
            const history = JSON.parse(localStorage.getItem('sportbar_booking_history') || '[]');
            history.push({
                ...BotState.bookingData,
                timestamp: new Date().toISOString()
            });
            if (history.length > 20) history.shift();
            localStorage.setItem('sportbar_booking_history', JSON.stringify(history));
            localStorage.setItem('sportbar_last_booking', JSON.stringify(BotState.bookingData));
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

    // ============================================
    // REINICIAR CONVERSACIÓN
    // ============================================
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
        BotState.isWaitingResponse = false;
        
        DOM.messagesArea.innerHTML = '';
        addBotMessage(CONFIG.welcomeMessage);
    }

    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
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

    // ============================================
    // ✅ INICIAR - SOLO UNA VEZ, SIN EVENTOS
    // ============================================
    init();

})();
