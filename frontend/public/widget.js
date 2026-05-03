// Este script se inyecta en la página del cliente
(async function() {
    // 1. Leer la configuración base que el cliente pegó en su HTML
    const localConfig = window.RAG_CONFIG || {};
    if (!localConfig.apiKey) {
        console.error("RAG Chatbot: apiKey no configurada.");
        return;
    }

    let RAG_API_URL = localConfig.apiUrl;
    if (RAG_API_URL && !RAG_API_URL.startsWith('http')) {
        RAG_API_URL = 'https://' + RAG_API_URL;
    }

    // Valores por defecto (se usarán si el servidor tarda o falla)
    let color = localConfig.color || "#8b5cf6";
    let welcomeMessage = "Hello! How can I help you find the perfect product today?";
    let iconName = localConfig.icon || "Bot";

    // 3. MAGIA DINÁMICA: Pedimos la configuración real a la base de datos
    try {
        const configResponse = await fetch(RAG_API_URL + '/api/v1/chat/config', {
            method: 'GET',
            headers: { 'x-api-key': localConfig.apiKey }
        });
        
        if (configResponse.ok) {
            const dbConfig = await configResponse.json();
            // Sobrescribimos los valores locales con los reales de la base de datos
            if (dbConfig.welcome_message) welcomeMessage = dbConfig.welcome_message;
            if (dbConfig.theme_color) color = dbConfig.theme_color;
            if (dbConfig.chat_icon) iconName = dbConfig.chat_icon;
        }
    } catch (err) {
        console.warn("RAG Chatbot: No se pudo cargar la config dinámica, usando defaults.", err);
    }

    // 4. Inyectar CSS directamente desde JS (ahora usa el color de la BD)
    const style = document.createElement('style');
    style.innerHTML = `
        #rag-widget-container { position: fixed; bottom: 20px; right: 20px; z-index: 99999; font-family: ui-sans-serif, system-ui, sans-serif; }
        #rag-chat-window { display: none; width: 350px; height: 500px; background: white; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); flex-direction: column; overflow: hidden; margin-bottom: 20px; border: 1px solid #e5e7eb; transition: all 0.3s ease; }
        #rag-chat-header { background: ${color}; color: white; padding: 16px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
        #rag-chat-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #f9fafb; }
        .rag-msg { max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; }
        .rag-msg-user { align-self: flex-end; background: ${color}; color: white; border-bottom-right-radius: 4px; }
        .rag-msg-bot { align-self: flex-start; background: #ffffff; color: #1f2937; border-bottom-left-radius: 4px; border: 1px solid #e5e7eb; }
        #rag-chat-input-container { display: flex; padding: 12px; border-top: 1px solid #e5e7eb; background: white; gap: 8px; }
        #rag-chat-input { flex: 1; padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 9999px; outline: none; font-size: 14px; transition: border-color 0.2s; }
        #rag-chat-input:focus { border-color: ${color}; }
        #rag-chat-send { background: ${color}; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        #rag-widget-btn { width: 60px; height: 60px; background: ${color}; color: white; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 24px; display: flex; align-items: center; justify-content: center; float: right; transition: transform 0.2s; }
        #rag-widget-btn:hover { transform: scale(1.05); }
    `;
    document.head.appendChild(style);

    // 5. Crear el HTML del Widget (ahora inyecta welcomeMessage de la BD)
    const container = document.createElement('div');
    container.id = 'rag-widget-container';
    container.innerHTML = `
        <div id="rag-chat-window">
            <div id="rag-chat-header">
                <span style="display: flex; align-items: center; gap: 8px;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                    AI Assistant
                </span>
                <button id="rag-chat-close" style="background:none;border:none;color:white;cursor:pointer;font-size:20px;padding:0;">&times;</button>
            </div>
            <div id="rag-chat-messages">
                <div class="rag-msg rag-msg-bot">${welcomeMessage}</div>
            </div>
            <div id="rag-chat-input-container">
                <input type="text" id="rag-chat-input" placeholder="Type your message...">
                <button id="rag-chat-send">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
            </div>
        </div>
        <button id="rag-widget-btn">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
        </button>
    `;
    document.body.appendChild(container);

    // 6. Lógica de Interacción
    const btn = document.getElementById('rag-widget-btn');
    const win = document.getElementById('rag-chat-window');
    const closeBtn = document.getElementById('rag-chat-close');
    const sendBtn = document.getElementById('rag-chat-send');
    const input = document.getElementById('rag-chat-input');
    const messages = document.getElementById('rag-chat-messages');

    let isOpen = false;
    const toggle = () => { 
        isOpen = !isOpen; 
        win.style.display = isOpen ? 'flex' : 'none'; 
        btn.style.display = isOpen ? 'none' : 'flex';
    };
    btn.onclick = toggle;
    closeBtn.onclick = toggle;

    const addMessage = (text, isUser) => {
        const div = document.createElement('div');
        div.className = `rag-msg ${isUser ? 'rag-msg-user' : 'rag-msg-bot'}`;
        div.textContent = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    };

    // 7. Llamada al Microservicio 3 para enviar mensajes
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text) return;
        
        addMessage(text, true);
        input.value = '';

        const typingId = "typing-" + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.id = typingId;
        typingDiv.className = 'rag-msg rag-msg-bot';
        typingDiv.innerHTML = '<i>Thinking...</i>';
        messages.appendChild(typingDiv);
        messages.scrollTop = messages.scrollHeight;

        try {
            const response = await fetch(RAG_API_URL + '/api/v1/chat/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': localConfig.apiKey
                },
                body: JSON.stringify({ message: text, session_id: 'web_' + Date.now() })
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