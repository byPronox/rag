// Este script se inyecta en la página del cliente
(async function() {
    // 1. Leer la configuración base
    const localConfig = window.RAG_CONFIG || {};
    if (!localConfig.apiKey) {
        console.error("RAG Chatbot: apiKey no configurada.");
        return;
    }
    // NUEVO: Validar que exista el companyId
    if (!localConfig.companyId) {
        console.error("RAG Chatbot: companyId no configurado.");
        return;
    }

    // Generar un ID de sesión ÚNICO por carga de página para mantener el historial
    const sessionId = 'web_' + Date.now();

    // 2. URL y Magia Anti-Errores
    let RAG_API_URL = localConfig.apiUrl; 
    if (RAG_API_URL && !RAG_API_URL.startsWith('http')) {
        RAG_API_URL = 'https://' + RAG_API_URL;
    }

    // Valores por defecto
    let color = localConfig.color || "#8b5cf6";
    let welcomeMessage = "Hello! How can I help you find the perfect product today?";
    let iconName = localConfig.icon || "Bot";

    // 3. Diccionario de Íconos SVG (Iguales a Lucide-React)
    const icons = {
        Bot: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`,
        MessageSquare: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        Sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
        Store: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>`,
        User: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        Send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
        Close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`
    };

    // 4. Pedir configuración dinámica (AQUÍ SE INYECTA EL COMPANY_ID PARA EVITAR EL ERROR 422)
    try {
        const configResponse = await fetch(`${RAG_API_URL}/api/v1/chat/config?company_id=${localConfig.companyId}`, {
            method: 'GET',
            headers: { 'x-api-key': localConfig.apiKey }
        });
        if (configResponse.ok) {
            const dbConfig = await configResponse.json();
            if (dbConfig.welcome_message) welcomeMessage = dbConfig.welcome_message;
            if (dbConfig.theme_color) color = dbConfig.theme_color;
            if (dbConfig.chat_icon) iconName = dbConfig.chat_icon;
        } else {
            console.warn("RAG Chatbot: Respuesta no exitosa del servidor al cargar config.");
        }
    } catch (err) {
        console.warn("RAG Chatbot: Usando defaults. Error:", err);
    }

    const selectedSvg = icons[iconName] || icons.Bot;

    // 5. CSS Súper Moderno (Estilo Tailwind + Animaciones)
    const style = document.createElement('style');
    style.innerHTML = `
        #rag-widget-container { position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; }
        
        /* Ventana del Chat */
        #rag-chat-window { display: none; width: 360px; height: 550px; background: #ffffff; border-radius: 16px; box-shadow: 0 12px 28px rgba(0,0,0,0.15); flex-direction: column; overflow: hidden; margin-bottom: 20px; border: 1px solid #e5e7eb; transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s; transform-origin: bottom right; }
        
        /* Header */
        #rag-chat-header { background: ${color}; color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .rag-header-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }
        .rag-header-title svg { width: 20px; height: 20px; }
        #rag-chat-close { background: transparent; border: none; color: white; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; transition: background 0.2s; }
        #rag-chat-close:hover { background: rgba(255,255,255,0.2); }
        #rag-chat-close svg { width: 20px; height: 20px; }

        /* Área de Mensajes */
        #rag-chat-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: #ffffff; scroll-behavior: smooth; }
        
        /* Layout de cada mensaje (Avatar + Burbuja) */
        .rag-msg-row { display: flex; gap: 12px; max-width: 100%; }
        .rag-msg-user-row { flex-direction: row-reverse; }
        
        .rag-avatar { width: 32px; height: 32px; rounded-full; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .rag-avatar svg { width: 16px; height: 16px; }
        
        /* Burbujas */
        .rag-bubble { padding: 10px 14px; font-size: 14px; line-height: 1.5; max-width: 75%; word-wrap: break-word; }
        .rag-bubble-bot { background: #f3f4f6; color: #1f2937; border-radius: 16px 16px 16px 4px; border: 1px solid #e5e7eb; }
        .rag-bubble-user { background: ${color}; color: white; border-radius: 16px 16px 4px 16px; box-shadow: 0 2px 4px ${color}40; }

        /* Input Area */
        #rag-chat-input-container { display: flex; padding: 12px 16px; border-top: 1px solid #e5e7eb; background: #f9fafb; gap: 10px; align-items: center; }
        #rag-chat-input { flex: 1; padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 9999px; outline: none; font-size: 14px; transition: all 0.2s; background: white; }
        #rag-chat-input:focus { border-color: ${color}; box-shadow: 0 0 0 3px ${color}20; }
        #rag-chat-send { background: ${color}; color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; flex-shrink: 0; box-shadow: 0 2px 6px ${color}50; }
        #rag-chat-send:hover { transform: scale(1.05); }
        #rag-chat-send svg { width: 16px; height: 16px; position: relative; left: -1px; }

        /* Botón Flotante (Widget) */
        #rag-widget-btn { width: 60px; height: 60px; background: ${color}; color: white; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 16px ${color}60; display: flex; align-items: center; justify-content: center; float: right; transition: transform 0.2s, box-shadow 0.2s; }
        #rag-widget-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px ${color}80; }
        #rag-widget-btn svg { width: 26px; height: 26px; }

        /* Animación de Pensando (Los 3 puntitos suaves) */
        .rag-typing { display: flex; gap: 4px; padding: 4px 2px; align-items: center; height: 20px; }
        .rag-dot { width: 6px; height: 6px; background-color: #9ca3af; border-radius: 50%; animation: rag-bounce 1.4s infinite ease-in-out both; }
        .rag-dot:nth-child(1) { animation-delay: -0.32s; }
        .rag-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes rag-bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-5px); }
        }
    `;
    document.head.appendChild(style);

    // 6. Construir HTML
    const container = document.createElement('div');
    container.id = 'rag-widget-container';
    container.innerHTML = `
        <div id="rag-chat-window">
            <div id="rag-chat-header">
                <div class="rag-header-title">
                    ${selectedSvg}
                    <span>AI Assistant</span>
                </div>
                <button id="rag-chat-close">${icons.Close}</button>
            </div>
            <div id="rag-chat-messages"></div>
            <div id="rag-chat-input-container">
                <input type="text" id="rag-chat-input" placeholder="Type your message...">
                <button id="rag-chat-send">${icons.Send}</button>
            </div>
        </div>
        <button id="rag-widget-btn">${selectedSvg}</button>
    `;
    document.body.appendChild(container);

    // Elementos del DOM
    const btn = document.getElementById('rag-widget-btn');
    const win = document.getElementById('rag-chat-window');
    const closeBtn = document.getElementById('rag-chat-close');
    const sendBtn = document.getElementById('rag-chat-send');
    const input = document.getElementById('rag-chat-input');
    const messages = document.getElementById('rag-chat-messages');

    // Lógica de apertura/cierre
    let isOpen = false;
    const toggle = () => { 
        isOpen = !isOpen; 
        if (isOpen) {
            win.style.display = 'flex';
            setTimeout(() => { win.style.opacity = '1'; win.style.transform = 'scale(1)'; }, 10);
            btn.style.display = 'none';
        } else {
            win.style.opacity = '0'; 
            win.style.transform = 'scale(0.95)';
            setTimeout(() => { win.style.display = 'none'; }, 300);
            btn.style.display = 'flex';
        }
    };
    btn.onclick = toggle;
    closeBtn.onclick = toggle;

    // 7. Función Constructora de Mensajes (con Avatares)
    const addMessage = (text, isUser) => {
        const row = document.createElement('div');
        row.className = `rag-msg-row ${isUser ? 'rag-msg-user-row' : ''}`;
        
        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'rag-avatar';
        avatar.style.background = color; 
        avatar.innerHTML = isUser ? icons.User : selectedSvg;

        // Burbuja
        const bubble = document.createElement('div');
        bubble.className = `rag-bubble ${isUser ? 'rag-bubble-user' : 'rag-bubble-bot'}`;
        bubble.textContent = text;

        row.appendChild(avatar);
        row.appendChild(bubble);
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
    };

    // Añadir el mensaje de bienvenida al cargar
    addMessage(welcomeMessage, false);

    // 8. Envío de Mensajes y Animación de Espera
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;
        
        addMessage(text, true);
        input.value = '';

        // Inyectar el HTML de "Pensando"
        const typingId = "typing-" + Date.now();
        const typingRow = document.createElement('div');
        typingRow.id = typingId;
        typingRow.className = 'rag-msg-row';
        typingRow.innerHTML = `
            <div class="rag-avatar" style="background: ${color}">${selectedSvg}</div>
            <div class="rag-bubble rag-bubble-bot" style="padding: 12px 16px;">
                <div class="rag-typing">
                    <div class="rag-dot"></div>
                    <div class="rag-dot"></div>
                    <div class="rag-dot"></div>
                </div>
            </div>
        `;
        messages.appendChild(typingRow);
        messages.scrollTop = messages.scrollHeight;

        try {
            // AQUÍ SE INYECTA EL COMPANY_ID PARA QUE EL RAG SEPA EN QUÉ CATÁLOGO BUSCAR
            const response = await fetch(RAG_API_URL + '/api/v1/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': localConfig.apiKey
                },
                body: JSON.stringify({ 
                    message: text, 
                    session_id: sessionId,
                    company_id: localConfig.companyId
                })
            });
            
            const data = await response.json();
            document.getElementById(typingId).remove(); 
            addMessage(data.reply || data.answer || "Sorry, I couldn't understand that.", false);
        } catch (err) {
            document.getElementById(typingId).remove();
            addMessage("Error connecting to the AI server.", false);
            console.error(err);
        }
    };

    sendBtn.onclick = sendMessage;
    input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
})();