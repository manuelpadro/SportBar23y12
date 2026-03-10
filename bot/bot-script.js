/**
 * SPORTBAR 23 Y 12 - BOT COMPLETO (SIN TELÉFONO)
 * Versión: 4.1 - Sin solicitud de número de teléfono
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURACIÓN
    // ============================================
    const CONFIG = {
        whatsappNumber: '5358873126',
        merchantCode: 'SPORTBAR2312', // Tu código de comercio Transfermóvil
        depositAmount: 500, // Señal en CUP
        
        zones: [
            { id: 'vip', name: '🥇 VIP', minConsumption: 3000, minPeople: 4, maxPeople: 8, emoji: '🥇' },
            { id: 'interior', name: '🪑 Interior', minConsumption: 0, minPeople: 2, maxPeople: 6, emoji: '🪑' },
            { id: 'exterior', name: '🌳 Exterior', minConsumption: 0, minPeople: 2, maxPeople: 8, emoji: '🌳' },
            { id: 'barra', name: '🍻 Barra', minConsumption: 0, minPeople: 1, maxPeople: 2, emoji: '🍻' },
            { id: 'billar', name: '🎱 Billar', minConsumption: 0, minPeople: 2, maxPeople: 4, emoji: '🎱' }
        ],
        
        availableTimes: [
            '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
            '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', 
            '19:00', '20:00', '21:00', '22:00', '23:00'
        ]
    };

    // ============================================
    // SISTEMA ANTI-SPAM
    // ============================================
    const AntiSpam = {
        attempts: {
            totalReservas: 0,
            ultimaReserva: null,
            intentosPorMinuto: [],
            bloqueadoHasta: null,
            mensajesRapidos: []
        },
        
        limits: {
            maxReservasPorHora: 3,
            maxReservasPorDia: 5,
            tiempoEntreReservas: 30000,
            maxIntentosFallidos: 5,
            tiempoBloqueo: 900000
        },
        
        init: function() {
            try {
                const saved = localStorage.getItem('sportbar_antispam');
                if (saved) {
                    const data = JSON.parse(saved);
                    if (data.bloqueadoHasta && new Date(data.bloqueadoHasta) < new Date()) {
                        data.bloqueadoHasta = null;
                        data.intentosPorMinuto = [];
                    }
                    this.attempts = data;
                }
            } catch (e) {}
            
            setInterval(() => this.cleanOldAttempts(), 60000);
        },
        
        cleanOldAttempts: function() {
            const ahora = Date.now();
            this.attempts.intentosPorMinuto = this.attempts.intentosPorMinuto.filter(
                timestamp => ahora - timestamp < 3600000
            );
            this.save();
        },
        
        registerMessage: function() {
            const ahora = Date.now();
            this.attempts.mensajesRapidos.push(ahora);
            
            if (this.attempts.mensajesRapidos.length > 10) {
                this.attempts.mensajesRapidos.shift();
            }
            
            if (this.attempts.mensajesRapidos.length >= 3) {
                const ultimos = this.attempts.mensajesRapidos.slice(-3);
                const velocidad = ultimos[2] - ultimos[0];
                
                if (velocidad < 2000) {
                    this.registerFailedAttempt('velocidad');
                    return false;
                }
            }
            
            this.save();
            return true;
        },
        
        canMakeReservation: function() {
            const ahora = Date.now();
            
            if (this.attempts.bloqueadoHasta) {
                const bloqueadoHasta = new Date(this.attempts.bloqueadoHasta);
                if (bloqueadoHasta > new Date()) {
                    const minutosRestantes = Math.ceil((bloqueadoHasta - new Date()) / 60000);
                    return {
                        allowed: false,
                        reason: 'bloqueado',
                        message: I18n.t('spam_blocked', minutosRestantes)
                    };
                } else {
                    this.attempts.bloqueadoHasta = null;
                }
            }
            
            if (this.attempts.ultimaReserva) {
                const tiempoDesdeUltima = ahora - this.attempts.ultimaReserva;
                if (tiempoDesdeUltima < this.limits.tiempoEntreReservas) {
                    const segundosRestantes = Math.ceil((this.limits.tiempoEntreReservas - tiempoDesdeUltima) / 1000);
                    return {
                        allowed: false,
                        reason: 'muy_seguido',
                        message: I18n.t('spam_wait', segundosRestantes)
                    };
                }
            }
            
            const reservasUltimaHora = this.attempts.intentosPorMinuto.length;
            if (reservasUltimaHora >= this.limits.maxReservasPorHora) {
                return {
                    allowed: false,
                    reason: 'limite_hora',
                    message: I18n.t('spam_hour', this.limits.maxReservasPorHora)
                };
            }
            
            const reservasHoy = this.getTodayReservations();
            if (reservasHoy >= this.limits.maxReservasPorDia) {
                return {
                    allowed: false,
                    reason: 'limite_dia',
                    message: I18n.t('spam_day', this.limits.maxReservasPorDia)
                };
            }
            
            return { allowed: true };
        },
        
        registerReservation: function() {
            const ahora = Date.now();
            this.attempts.totalReservas++;
            this.attempts.ultimaReserva = ahora;
            this.attempts.intentosPorMinuto.push(ahora);
            this.save();
            this.saveDailyReservation();
        },
        
        registerFailedAttempt: function(reason = 'general') {
            const failedAttempts = parseInt(localStorage.getItem('sportbar_failed_attempts') || '0') + 1;
            localStorage.setItem('sportbar_failed_attempts', failedAttempts);
            
            if (failedAttempts >= this.limits.maxIntentosFallidos) {
                this.blockUser();
            }
        },
        
        blockUser: function() {
            const bloqueoHasta = new Date(Date.now() + this.limits.tiempoBloqueo);
            this.attempts.bloqueadoHasta = bloqueoHasta.toISOString();
            this.save();
            localStorage.setItem('sportbar_failed_attempts', '0');
        },
        
        getTodayReservations: function() {
            try {
                const hoy = new Date().toDateString();
                const reservas = JSON.parse(localStorage.getItem('sportbar_reservas_diarias') || '{}');
                return reservas[hoy] || 0;
            } catch (e) {
                return 0;
            }
        },
        
        saveDailyReservation: function() {
            try {
                const hoy = new Date().toDateString();
                const reservas = JSON.parse(localStorage.getItem('sportbar_reservas_diarias') || '{}');
                reservas[hoy] = (reservas[hoy] || 0) + 1;
                localStorage.setItem('sportbar_reservas_diarias', JSON.stringify(reservas));
            } catch (e) {}
        },
        
        save: function() {
            try {
                localStorage.setItem('sportbar_antispam', JSON.stringify(this.attempts));
            } catch (e) {}
        },
        
        reset: function() {
            this.attempts = {
                totalReservas: 0,
                ultimaReserva: null,
                intentosPorMinuto: [],
                bloqueadoHasta: null,
                mensajesRapidos: []
            };
            localStorage.removeItem('sportbar_antispam');
            localStorage.removeItem('sportbar_failed_attempts');
        }
    };

    // ============================================
    // VERIFICACIÓN HUMANA
    // ============================================
    const HumanVerification = {
        questions: [
            { question: '¿Cuánto es 3 + 4?', answer: '7' },
            { question: '¿Cuántas letras tiene la palabra "MESA"?', answer: '4' },
            { question: 'Escribí el número SIETE', answer: '7' },
            { question: '¿Cuánto es 12 - 5?', answer: '7' }
        ],
        
        showVerification: function(callback) {
            const randomIndex = Math.floor(Math.random() * this.questions.length);
            const q = this.questions[randomIndex];
            
            sessionStorage.setItem('expected_answer', q.answer);
            window.verificationCallback = callback;
            
            const html = `
                <div style="background:rgba(244,162,97,0.1);border-radius:10px;padding:1rem;margin:0.5rem 0;">
                    <p style="color:var(--accent);margin-bottom:0.5rem;">${I18n.t('spam_verify_question')}</p>
                    <p style="font-size:1.2rem;margin-bottom:1rem;"><strong>${q.question}</strong></p>
                    <input type="text" id="verificationAnswer" placeholder="${I18n.t('spam_verify_placeholder')}" 
                           style="width:100%;padding:0.8rem;background:var(--dark);border:1px solid var(--accent);border-radius:8px;color:white;margin-bottom:0.5rem;">
                    <button onclick="window.checkVerification()" 
                            style="width:100%;padding:0.8rem;background:var(--accent);color:var(--dark);border:none;border-radius:8px;font-weight:600;cursor:pointer;">
                        ${I18n.t('spam_verify_button')}
                    </button>
                </div>
            `;
            
            addBotMessage(html, true);
        }
    };

    // ============================================
    // VALIDACIONES
    // ============================================
    const Validators = {
        name: function(text) {
            if (!text || text.trim().length < 2) {
                return { valid: false, message: I18n.t('error_name_length') };
            }
            if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(text)) {
                return { valid: false, message: I18n.t('error_name_chars') };
            }
            return { valid: true, value: text.trim() };
        },
        
        people: function(text, zone) {
            const num = parseInt(text);
            if (isNaN(num)) {
                return { valid: false, message: I18n.t('error_people_nan') };
            }
            if (num < zone.minPeople) {
                return { 
                    valid: false, 
                    message: I18n.t('error_people_min', zone.minPeople, zone.minPeople > 1 ? 's' : '')
                };
            }
            if (num > zone.maxPeople) {
                return { 
                    valid: false, 
                    message: I18n.t('error_people_max', zone.maxPeople, zone.maxPeople > 1 ? 's' : '')
                };
            }
            return { valid: true, value: num };
        },
        
        date: function(dateStr) {
            if (!dateStr) {
                return { valid: false, message: I18n.t('error_date_none') };
            }
            
            const selectedDate = new Date(dateStr);
            const today = new Date();
            
            today.setHours(0, 0, 0, 0);
            selectedDate.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                return { valid: false, message: I18n.t('error_date') };
            }
            
            return { valid: true, value: dateStr };
        }
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
        errorCount: 0,
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
        chatContainer: document.getElementById('chatContainer'),
        inputHint: document.getElementById('inputHint')
    };

    // ============================================
    // FUNCIONES DE PAGO
    // ============================================
    function generateTransfermovilQR(amount, concept) {
        const qrData = `transfermovil.etecsa.cu/pagar?c=${CONFIG.merchantCode}&m=${amount}&d=${encodeURIComponent(concept)}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    }

    // ============================================
    // FUNCIONES PRINCIPALES
    // ============================================
    async function init() {
        if (BotState.initialized) return;
        
        await I18n.init();
        
        if (DOM.messagesArea) {
            DOM.messagesArea.innerHTML = '';
        }
        
        AntiSpam.init();
        
        BotState.initialized = true;
        loadSavedData();
        setupEventListeners();
        focusInput();
        addBotMessage(I18n.t('welcome'));
        
        if (DOM.inputHint) {
            DOM.inputHint.innerHTML = `<i class="fas fa-robot"></i> ${I18n.t('input_hint')}`;
        }
    }

    function setupEventListeners() {
        DOM.sendButton.addEventListener('click', sendMessage);
        DOM.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        DOM.resetButton.addEventListener('click', resetConversation);
        
        DOM.userInput.addEventListener('input', () => {
            DOM.sendButton.disabled = !DOM.userInput.value.trim();
        });
        
        document.getElementById('langEs')?.addEventListener('click', () => {
            I18n.setLocale('es');
        });
        
        document.getElementById('langEn')?.addEventListener('click', () => {
            I18n.setLocale('en');
        });
        
        window.addEventListener('languageChanged', () => {
            if (DOM.inputHint) {
                DOM.inputHint.innerHTML = `<i class="fas fa-robot"></i> ${I18n.t('input_hint')}`;
            }
        });
    }

    function sendMessage() {
        const input = DOM.userInput.value.trim();
        if (!input || BotState.isWaitingResponse) return;
        
        if (!AntiSpam.registerMessage()) {
            addBotMessage(I18n.t('error_fast_typing'));
            return;
        }
        
        addUserMessage(input);
        DOM.userInput.value = '';
        DOM.sendButton.disabled = true;
        
        processUserInput(input);
    }

    function processUserInput(input) {
        BotState.isWaitingResponse = true;
        showTypingIndicator();
        
        setTimeout(() => {
            hideTypingIndicator();
            
            switch (BotState.currentStep) {
                case 0:
                    handleNameInput(input);
                    break;
                case 2:
                    handlePeopleInput(input);
                    break;
                case 5:
                    handleTableInput(input);
                    break;
                default:
                    addBotMessage(I18n.t('error_understanding'));
                    BotState.errorCount++;
                    
                    if (BotState.errorCount > 2) {
                        addBotMessage(I18n.t('error_help'));
                    }
            }
            
            BotState.isWaitingResponse = false;
            focusInput();
            
        }, 800);
    }

    function handleNameInput(input) {
        const validation = Validators.name(input);
        
        if (!validation.valid) {
            addBotMessage(validation.message + ' 😅');
            AntiSpam.registerFailedAttempt('nombre_invalido');
            return;
        }
        
        BotState.bookingData.name = validation.value;
        BotState.errorCount = 0;
        localStorage.setItem('sportbar_user_name', validation.value);
        
        addBotMessage(I18n.t('hello', validation.value));
        setTimeout(() => {
            BotState.currentStep = 1;
            showZoneSelection();
        }, 600);
    }

    function showZoneSelection() {
        let html = `<p>${I18n.t('ask_zone')}</p><div class="options-container">`;
        CONFIG.zones.forEach(z => {
            html += `<button class="option-btn" onclick="window.selectZone('${z.id}')">${z.emoji} ${z.name}</button>`;
        });
        html += '</div>';
        addBotMessage(html, true);
    }

    function handlePeopleInput(input) {
        const zone = BotState.bookingData.zone;
        if (!zone) {
            BotState.currentStep = 1;
            showZoneSelection();
            return;
        }
        
        const validation = Validators.people(input, zone);
        
        if (!validation.valid) {
            addBotMessage(validation.message + ' 😅');
            AntiSpam.registerFailedAttempt('personas_invalidas');
            return;
        }
        
        BotState.bookingData.people = validation.value;
        BotState.errorCount = 0;
        BotState.currentStep = 3;
        showDatePicker();
    }

    function showDatePicker() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayFormatted = `${year}-${month}-${day}`;
        
        const html = `
            <p>${I18n.t('ask_date')}</p>
            <div class="date-picker-container">
                <input type="date" id="datePicker" min="${todayFormatted}" value="${todayFormatted}">
            </div>
            <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                <button class="option-btn" onclick="window.confirmDate()">
                    <i class="fas fa-check"></i> ${I18n.t('confirm_date')}
                </button>
            </div>
            <p style="font-size:0.8rem; color:var(--gray); margin-top:0.5rem;">
                <i class="fas fa-info-circle"></i> ${I18n.t('date_info')}
            </p>
        `;
        addBotMessage(html, true);
    }

    function showTimeSelection() {
        let html = `<p>${I18n.t('ask_time')}</p><div class="options-container">`;
        CONFIG.availableTimes.forEach(t => {
            html += `<button class="option-btn" onclick="window.selectTime('${t}')">${t}</button>`;
        });
        html += '</div>';
        addBotMessage(html, true);
    }

    function askForTablePreference() {
        const zone = BotState.bookingData.zone;
        let mensaje = '';
        
        if (zone.id === 'billar') {
            mensaje = I18n.t('ask_table_billar');
        } else if (zone.id === 'vip') {
            mensaje = I18n.t('ask_table_vip');
        } else {
            mensaje = I18n.t('ask_table_general');
        }
        
        addBotMessage(mensaje);
    }

    function handleTableInput(input) {
        BotState.bookingData.table = input.trim() || 'Sin preferencia';
        BotState.currentStep = 6;
        setTimeout(() => showOffersQuestion(), 500);
    }

    function showOffersQuestion() {
        const html = `
            <p>${I18n.t('ask_offers')}</p>
            <div class="options-container">
                <button class="option-btn" onclick="window.selectOffers(true)">
                    <i class="fas fa-check-circle"></i> ${I18n.t('yes')}
                </button>
                <button class="option-btn" onclick="window.selectOffers(false)">
                    <i class="fas fa-times-circle"></i> ${I18n.t('no')}
                </button>
            </div>
        `;
        addBotMessage(html, true);
    }

    function checkSpamAndShowSummary() {
        const spamCheck = AntiSpam.canMakeReservation();
        
        if (!spamCheck.allowed) {
            addBotMessage(spamCheck.message);
            
            if (spamCheck.reason === 'limite_hora' || spamCheck.reason === 'limite_dia') {
                addBotMessage(I18n.t('spam_verify'));
                HumanVerification.showVerification(() => {
                    setTimeout(() => showBookingSummary(), 500);
                });
            }
            return;
        }
        
        showBookingSummary();
    }

    function showBookingSummary() {
        AntiSpam.registerReservation();
        saveBookingLocally();
        
        const d = BotState.bookingData;
        const z = d.zone;
        const reservasHoy = AntiSpam.getTodayReservations();
        
        const qrUrl = generateTransfermovilQR(
            CONFIG.depositAmount, 
            `Señal reserva ${d.name} ${d.date}`
        );
        
        const html = `
            <div class="booking-summary">
                <h4 style="color:var(--accent);margin-bottom:1rem;">${I18n.t('summary_title')}</h4>
                
                <div class="summary-item"><i class="fas fa-user"></i> <span>${I18n.t('summary_name', d.name)}</span></div>
                <div class="summary-item"><i class="fas fa-map-marker-alt"></i> <span>${I18n.t('summary_zone', z.name, z.minConsumption > 0 ? '(consumo $' + z.minConsumption + ')' : '')}</span></div>
                <div class="summary-item"><i class="fas fa-users"></i> <span>${I18n.t('summary_people', d.people, d.people > 1 ? 's' : '')}</span></div>
                <div class="summary-item"><i class="fas fa-calendar"></i> <span>${I18n.t('summary_datetime', d.date, d.time)}</span></div>
                <div class="summary-item"><i class="fas fa-chair"></i> <span>${I18n.t('summary_table', d.table)}</span></div>
                <div class="summary-item"><i class="fas fa-gift"></i> <span>${I18n.t('summary_offers', d.offers ? '✅ ' + I18n.t('yes') : '❌ ' + I18n.t('no'))}</span></div>
                
                <div style="margin-top:1.5rem; border-top:1px solid rgba(255,255,255,0.1); padding-top:1.5rem;">
                    <h4 style="color:var(--accent); margin-bottom:1rem;">${I18n.t('payment_title')}</h4>
                    <p style="color:var(--gray); margin-bottom:0.5rem;">${I18n.t('payment_info', CONFIG.depositAmount)}</p>
                    
                    <div class="payment-qr-container">
                        <img src="${qrUrl}" alt="QR Transfermóvil">
                    </div>
                    
                    <p style="font-size:0.85rem; color:var(--gray); margin-bottom:1rem;">
                        <i class="fas fa-info-circle"></i> ${I18n.t('payment_qr_instruction')}
                    </p>
                    
                    <div style="display:flex; gap:0.5rem;">
                        <button onclick="window.checkPayment()" class="option-btn" style="flex:1;">
                            <i class="fas fa-check-circle"></i> ${I18n.t('payment_already')}
                        </button>
                        <button onclick="window.payLater()" class="option-btn" style="flex:1; background:transparent;">
                            ${I18n.t('payment_later')}
                        </button>
                    </div>
                </div>
                
                <div style="margin-top:1.5rem;">
                    <p style="color:var(--gray);margin-bottom:1rem;">${I18n.t('summary_send_whatsapp')}</p>
                    
                    <a href="https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(generateWhatsAppMessage())}" 
                       target="_blank" 
                       class="option-btn" 
                       style="background:#25D366;color:white;width:100%;justify-content:center;padding:1rem;text-decoration:none;display:inline-block;">
                        <i class="fab fa-whatsapp"></i> ${I18n.t('send_whatsapp')}
                    </a>
                    
                    <button onclick="window.resetConversation()" 
                            class="option-btn" 
                            style="background:transparent;color:var(--gray);border:1px solid var(--gray);width:100%;margin-top:0.5rem;cursor:pointer;">
                        <i class="fas fa-redo"></i> ${I18n.t('new_reservation')}
                    </button>
                </div>
                
                <div style="margin-top:1rem;font-size:0.85rem;color:var(--gray);text-align:center;">
                    <i class="fas fa-shield-alt"></i> ${I18n.t('reservations_today', reservasHoy, AntiSpam.limits.maxReservasPorDia)}
                </div>
            </div>
        `;
        
        addBotMessage(html, true);
        addBotMessage(I18n.t('thank_you'));
    }

    function generateWhatsAppMessage() {
        const d = BotState.bookingData;
        const z = d.zone;
        
        let mensaje = `🍻 *NUEVA RESERVA - SPORTBAR 23 Y 12*\n\n`;
        mensaje += `👤 *Cliente:* ${d.name}\n`;
        mensaje += `📍 *Zona:* ${z.name}\n`;
        if (z.minConsumption > 0) mensaje += `💰 *Consumo mínimo:* $${z.minConsumption}\n`;
        mensaje += `👥 *Personas:* ${d.people}\n`;
        mensaje += `📅 *Fecha:* ${d.date}\n`;
        mensaje += `⏰ *Hora:* ${d.time}\n`;
        mensaje += `🪑 *Mesa:* ${d.table}\n\n`;
        mensaje += `📢 *Ofertas:* ${d.offers ? '✅ Sí' : '❌ No'}\n\n`;
        mensaje += `💰 *Señal:* ${d.paid ? '✅ Pagada' : '⏳ Pendiente'}\n\n`;
        mensaje += `✅ *Estado:* Pendiente de confirmación`;
        
        return mensaje;
    }

    function saveBookingLocally() {
        try {
            const reservas = JSON.parse(localStorage.getItem('sportbar_reservas') || '[]');
            reservas.push({
                ...BotState.bookingData,
                fechaReserva: new Date().toISOString(),
                paid: false
            });
            localStorage.setItem('sportbar_reservas', JSON.stringify(reservas));
        } catch (e) {}
    }

    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
    function addBotMessage(content, isHTML = false) {
        const div = document.createElement('div');
        div.className = 'message bot-message';
        
        let html = '<div class="message-avatar"><i class="fas fa-robot"></i></div>';
        html += '<div class="message-content">';
        html += isHTML ? content : `<p>${content}</p>`;
        html += '</div>';
        
        div.innerHTML = html;
        DOM.messagesArea.appendChild(div);
        scrollToBottom();
    }

    function addUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message user-message';
        div.innerHTML = `
            <div class="message-avatar"><i class="fas fa-user"></i></div>
            <div class="message-content"><p>${escapeHTML(text)}</p></div>
        `;
        DOM.messagesArea.appendChild(div);
        scrollToBottom();
    }

    function escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    function loadSavedData() {
        try {
            const saved = localStorage.getItem('sportbar_user_name');
            if (saved) BotState.bookingData.name = saved;
        } catch (e) {}
    }

    // ============================================
    // FUNCIONES GLOBALES
    // ============================================
    window.selectZone = function(zoneId) {
        if (BotState.isWaitingResponse) return;
        const zone = CONFIG.zones.find(z => z.id === zoneId);
        BotState.bookingData.zone = zone;
        addUserMessage(zone.name);
        BotState.currentStep = 2;
        setTimeout(() => addBotMessage(I18n.t('ask_people', zone.minPeople, zone.maxPeople)), 500);
    };

    window.confirmDate = function() {
        if (BotState.isWaitingResponse) return;
        
        const input = document.getElementById('datePicker');
        if (!input || !input.value) {
            addBotMessage(I18n.t('error_date_none'));
            return;
        }
        
        const validation = Validators.date(input.value);
        
        if (!validation.valid) {
            addBotMessage(validation.message + ' 😅');
            AntiSpam.registerFailedAttempt('fecha_invalida');
            return;
        }
        
        const [y, m, d] = input.value.split('-');
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const fechaFormateada = `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
        
        BotState.bookingData.date = fechaFormateada;
        addUserMessage(fechaFormateada);
        BotState.currentStep = 4;
        setTimeout(() => showTimeSelection(), 500);
    };

    window.selectTime = function(time) {
        if (BotState.isWaitingResponse) return;
        BotState.bookingData.time = time;
        addUserMessage(time);
        BotState.currentStep = 5;
        setTimeout(() => askForTablePreference(), 500);
    };

    window.selectOffers = function(accept) {
        if (BotState.isWaitingResponse) return;
        BotState.bookingData.offers = accept;
        addUserMessage(accept ? I18n.t('yes') : I18n.t('no'));
        BotState.currentStep = 6;
        setTimeout(() => checkSpamAndShowSummary(), 500);
    };

    window.checkVerification = function() {
        const input = document.getElementById('verificationAnswer');
        if (!input) return;
        
        const expected = sessionStorage.getItem('expected_answer');
        const userAnswer = input.value.trim();
        
        if (userAnswer === expected) {
            sessionStorage.removeItem('expected_answer');
            if (window.verificationCallback) {
                window.verificationCallback();
                window.verificationCallback = null;
            }
            const verificationMsg = document.querySelector('.bot-message:last-child');
            if (verificationMsg) verificationMsg.remove();
        } else {
            addBotMessage(I18n.t('spam_verify_wrong'));
            AntiSpam.registerFailedAttempt('verificacion_fallida');
        }
    };

    window.checkPayment = function() {
        addBotMessage('✅ ¡Gracias por tu pago! Tu reserva está confirmada.');
        BotState.bookingData.paid = true;
        
        const reservas = JSON.parse(localStorage.getItem('sportbar_reservas') || '[]');
        if (reservas.length > 0) {
            reservas[reservas.length - 1].paid = true;
            localStorage.setItem('sportbar_reservas', JSON.stringify(reservas));
        }
    };

    window.payLater = function() {
        addBotMessage('✅ Podés pagar la señal cuando llegues al SportBar. ¡Te esperamos!');
    };

    window.resetConversation = function() {
        BotState.currentStep = 0;
        BotState.bookingData = {
            name: localStorage.getItem('sportbar_user_name') || '',
            zone: null,
            people: '',
            date: '',
            time: '',
            table: 'Sin preferencia',
            offers: null,
            paid: false
        };
        BotState.errorCount = 0;
        DOM.messagesArea.innerHTML = '';
        addBotMessage(I18n.t('welcome'));
    };

    // ============================================
    // INICIAR BOT
    // ============================================
    init();

})();
