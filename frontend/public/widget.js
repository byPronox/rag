// Este script se inyecta en la página del cliente
(async function() {
    // 0. Evitar doble carga si el snippet se pegó dos veces
    if (window.__RAG_CHAT_WIDGET_LOADED__) return;
    window.__RAG_CHAT_WIDGET_LOADED__ = true;

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

    // 2. URL y Magia Anti-Errores
    let RAG_API_URL = localConfig.apiUrl;
    if (RAG_API_URL && !RAG_API_URL.startsWith('http')) {
        RAG_API_URL = 'https://' + RAG_API_URL;
    }

    // Sesión y conversación por compañía: sobreviven al navegar entre páginas de la tienda (misma pestaña)
    const STORAGE_SESSION = 'rag_chat_session_' + localConfig.companyId;
    const STORAGE_MESSAGES = 'rag_chat_messages_' + localConfig.companyId;
    const storage = {
        get(key) { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
        set(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* sin persistencia */ } }
    };
    let sessionId = storage.get(STORAGE_SESSION);
    if (!sessionId) {
        sessionId = 'web_' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random().toString(36).slice(2));
        storage.set(STORAGE_SESSION, sessionId);
    }
    const history = storage.get(STORAGE_MESSAGES) || [];

    // Textos de las tarjetas según el idioma de la tienda
    const lang = (document.documentElement.lang || navigator.language || 'en').toLowerCase();
    const labels = lang.startsWith('es')
        ? { viewProduct: 'Ver producto', back: 'Volver', inStock: 'Disponible', outOfStock: 'Agotado',
            error: 'No pude conectarme con el asistente. Intenta de nuevo en un momento.' }
        : { viewProduct: 'View product', back: 'Back', inStock: 'In stock', outOfStock: 'Out of stock',
            error: "I couldn't reach the assistant. Please try again in a moment." };

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
        Close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
        ChevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
        ArrowLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
        External: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
        Bag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
    };

    // 4. Pedir configuración dinámica (AQUÍ SE INYECTA EL COMPANY_ID PARA EVITAR EL ERROR 422)
    try {
        const configResponse = await fetch(`${RAG_API_URL}/api/v1/chat/config?company_id=${encodeURIComponent(localConfig.companyId)}`, {
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

    // El color termina dentro del CSS: solo se aceptan colores hex
    if (!/^#[0-9a-fA-F]{3,8}$/.test(color)) color = "#8b5cf6";
    const selectedSvg = icons[iconName] || icons.Bot;

    // 5. CSS Súper Moderno (Estilo Tailwind + Animaciones)
    const style = document.createElement('style');
    style.innerHTML = `
        #rag-widget-container { position: fixed; bottom: 24px; right: 24px; z-index: 999999; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; }
        #rag-widget-container * { box-sizing: border-box; }

        /* Ventana del Chat */
        #rag-chat-window { position: relative; display: none; width: 360px; height: 550px; background: #ffffff; border-radius: 16px; box-shadow: 0 12px 28px rgba(0,0,0,0.15); flex-direction: column; overflow: hidden; margin-bottom: 20px; border: 1px solid #e5e7eb; transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s; transform-origin: bottom right; }

        /* Header */
        #rag-chat-header { background: ${color}; color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .rag-header-title { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 15px; }
        .rag-header-title svg { width: 20px; height: 20px; }
        #rag-chat-close, .rag-detail-close { background: transparent; border: none; color: white; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; transition: background 0.2s; }
        #rag-chat-close:hover, .rag-detail-close:hover { background: rgba(255,255,255,0.2); }
        #rag-chat-close svg, .rag-detail-close svg { width: 20px; height: 20px; }

        /* Área de Mensajes */
        #rag-chat-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: #ffffff; scroll-behavior: smooth; }

        /* Layout de cada mensaje (Avatar + Burbuja) */
        .rag-msg-row { display: flex; gap: 12px; max-width: 100%; }
        .rag-msg-user-row { flex-direction: row-reverse; }

        .rag-avatar { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: white; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .rag-avatar svg { width: 16px; height: 16px; }

        /* Burbujas */
        .rag-bubble { padding: 10px 14px; font-size: 14px; line-height: 1.5; max-width: 75%; word-wrap: break-word; white-space: pre-line; }
        .rag-bubble-bot { background: #f3f4f6; color: #1f2937; border-radius: 16px 16px 16px 4px; border: 1px solid #e5e7eb; }
        .rag-bubble-user { background: ${color}; color: white; border-radius: 16px 16px 4px 16px; box-shadow: 0 2px 4px ${color}40; }
        .rag-bubble-wide { flex: 1; min-width: 0; max-width: none; }

        /* Lista compacta de productos dentro de la burbuja */
        .rag-products { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; white-space: normal; }
        .rag-product { display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px; border-radius: 12px; border: 1px solid #e5e7eb; background: #ffffff; cursor: pointer; text-align: left; font-family: inherit; transition: background 0.15s, border-color 0.15s; }
        .rag-product:hover { background: #f9fafb; border-color: ${color}60; }
        .rag-product:hover .rag-product-chevron { transform: translateX(2px); }
        .rag-product-thumb { width: 40px; height: 40px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; color: #9ca3af; }
        .rag-product-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .rag-product-thumb svg { width: 20px; height: 20px; opacity: 0.6; }
        .rag-product-info { flex: 1; min-width: 0; }
        .rag-product-name { margin: 0; font-size: 12px; font-weight: 500; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .rag-product-meta { display: flex; align-items: center; gap: 6px; }
        .rag-product-price { font-size: 12px; font-weight: 600; color: ${color}; }
        .rag-badge-out { font-size: 10px; padding: 0 6px; border-radius: 4px; background: #e5e7eb; color: #6b7280; }
        .rag-product-chevron { width: 16px; height: 16px; color: #9ca3af; flex-shrink: 0; transition: transform 0.15s; }

        /* Vista de detalle (ocupa todo el chat) */
        .rag-detail { position: absolute; inset: 0; z-index: 5; background: #ffffff; display: flex; flex-direction: column; animation: rag-zoom-in 0.2s ease-out; }
        @keyframes rag-zoom-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .rag-detail-header { background: ${color}; color: white; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
        .rag-detail-back { display: flex; align-items: center; gap: 6px; background: transparent; border: none; color: white; cursor: pointer; font-size: 14px; font-weight: 500; font-family: inherit; padding: 4px 8px; margin-left: -8px; border-radius: 6px; transition: background 0.2s; }
        .rag-detail-back:hover { background: rgba(255,255,255,0.2); }
        .rag-detail-back svg { width: 16px; height: 16px; }
        .rag-detail-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
        .rag-detail-image { width: 100%; height: 220px; border-radius: 12px; background: #f9fafb; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; overflow: hidden; color: #9ca3af; flex-shrink: 0; }
        .rag-detail-image img { width: 100%; height: 100%; object-fit: contain; }
        .rag-detail-image svg { width: 48px; height: 48px; opacity: 0.5; }
        .rag-detail-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
        .rag-detail-title { margin: 0; font-size: 16px; font-weight: 600; color: #111827; line-height: 1.35; }
        .rag-detail-cat { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 4px; background: #f3f4f6; color: #6b7280; flex-shrink: 0; }
        .rag-detail-price-row { display: flex; justify-content: space-between; align-items: center; }
        .rag-detail-price { font-size: 18px; font-weight: 700; color: ${color}; }
        .rag-detail-stock { font-size: 12px; font-weight: 500; color: #059669; }
        .rag-detail-stock.out { color: #6b7280; }
        .rag-detail-desc { margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563; white-space: pre-line; }
        .rag-detail-footer { padding: 12px 16px; border-top: 1px solid #e5e7eb; background: #f9fafb; }
        .rag-detail-cta { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 40px; border-radius: 9999px; background: ${color}; color: white; font-size: 14px; font-weight: 500; text-decoration: none; box-shadow: 0 2px 6px ${color}50; transition: transform 0.2s; }
        .rag-detail-cta:hover { transform: scale(1.02); }
        .rag-detail-cta svg { width: 16px; height: 16px; }
        .rag-detail-cta.disabled { opacity: 0.5; pointer-events: none; }

        /* Input Area */
        #rag-chat-input-container { display: flex; padding: 12px 16px; border-top: 1px solid #e5e7eb; background: #f9fafb; gap: 10px; align-items: center; }
        #rag-chat-input { flex: 1; padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 9999px; outline: none; font-size: 14px; transition: all 0.2s; background: white; }
        #rag-chat-input:focus { border-color: ${color}; box-shadow: 0 0 0 3px ${color}20; }
        #rag-chat-send { background: ${color}; color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s, opacity 0.2s; flex-shrink: 0; box-shadow: 0 2px 6px ${color}50; }
        #rag-chat-send:hover { transform: scale(1.05); }
        #rag-chat-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
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

        /* Celulares: el chat ocupa la pantalla */
        @media (max-width: 480px) {
            #rag-widget-container { bottom: 16px; right: 16px; }
            #rag-chat-window { position: fixed; inset: 0; width: 100%; height: 100%; border-radius: 0; margin: 0; }
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
                <button id="rag-chat-close" aria-label="Close chat">${icons.Close}</button>
            </div>
            <div id="rag-chat-messages"></div>
            <div id="rag-chat-input-container">
                <input type="text" id="rag-chat-input" placeholder="Type your message..." maxlength="1000">
                <button id="rag-chat-send" aria-label="Send">${icons.Send}</button>
            </div>
        </div>
        <button id="rag-widget-btn" aria-label="Open chat">${selectedSvg}</button>
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
            input.focus();
        } else {
            closeDetail();
            win.style.opacity = '0';
            win.style.transform = 'scale(0.95)';
            setTimeout(() => { win.style.display = 'none'; }, 300);
            btn.style.display = 'flex';
        }
    };
    btn.onclick = toggle;
    closeBtn.onclick = toggle;

    // Utilidades de productos
    const el = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = text;
        return node;
    };

    const formatPrice = (price, currency) => {
        const value = Number(price) || 0;
        try {
            if (currency) {
                return new Intl.NumberFormat(undefined, {
                    style: 'currency', currency: currency, maximumFractionDigits: currency === 'COP' ? 0 : 2
                }).format(value);
            }
        } catch (e) { /* moneda desconocida */ }
        return (value.toFixed(2) + ' ' + (currency || '')).trim();
    };

    const safeUrl = (url) => (typeof url === 'string' && /^https?:\/\//i.test(url)) ? url : null;

    // Imagen con respaldo: si no carga, se muestra un ícono de bolsa
    const imageBox = (className, src, alt) => {
        const box = el('div', className);
        const url = safeUrl(src);
        if (url) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = alt || '';
            img.loading = 'lazy';
            img.onerror = () => { box.innerHTML = icons.Bag; };
            box.appendChild(img);
        } else {
            box.innerHTML = icons.Bag;
        }
        return box;
    };

    // 7. Vista de detalle: ocupa todo el chat con zoom, botón "Ver producto" y "Volver"
    let detailView = null;
    function closeDetail() {
        if (detailView) { detailView.remove(); detailView = null; }
    }

    function openDetail(product) {
        closeDetail();
        detailView = el('div', 'rag-detail');

        const header = el('div', 'rag-detail-header');
        const back = el('button', 'rag-detail-back');
        back.innerHTML = icons.ArrowLeft;
        back.appendChild(document.createTextNode(labels.back));
        back.onclick = closeDetail;
        const close = el('button', 'rag-detail-close');
        close.setAttribute('aria-label', labels.back);
        close.innerHTML = icons.Close;
        close.onclick = closeDetail;
        header.append(back, close);

        const body = el('div', 'rag-detail-body');
        body.appendChild(imageBox('rag-detail-image', product.image_url || product.image_128_url, product.name));
        const titleRow = el('div', 'rag-detail-title-row');
        titleRow.appendChild(el('h3', 'rag-detail-title', product.name));
        if (product.category) titleRow.appendChild(el('span', 'rag-detail-cat', product.category));
        const priceRow = el('div', 'rag-detail-price-row');
        priceRow.appendChild(el('span', 'rag-detail-price', formatPrice(product.price, product.currency)));
        priceRow.appendChild(el('span', 'rag-detail-stock' + (product.in_stock ? '' : ' out'),
            (product.in_stock ? '✓ ' + labels.inStock : labels.outOfStock)));
        body.append(titleRow, priceRow);
        if (product.description) body.appendChild(el('p', 'rag-detail-desc', product.description));

        const footer = el('div', 'rag-detail-footer');
        const cta = el('a', 'rag-detail-cta');
        cta.appendChild(document.createTextNode(labels.viewProduct + ' '));
        cta.insertAdjacentHTML('beforeend', icons.External);
        const url = safeUrl(product.url);
        if (url) {
            cta.href = url;
            cta.target = '_blank';
            cta.rel = 'noopener noreferrer';
        } else {
            cta.classList.add('disabled');
        }
        footer.appendChild(cta);

        detailView.append(header, body, footer);
        win.appendChild(detailView);
    }

    // Lista compacta de productos (miniatura, nombre, precio, "Agotado")
    function productList(products) {
        const list = el('div', 'rag-products');
        products.forEach(product => {
            const item = el('button', 'rag-product');
            item.type = 'button';
            item.appendChild(imageBox('rag-product-thumb', product.image_128_url || product.image_url, product.name));
            const info = el('div', 'rag-product-info');
            info.appendChild(el('p', 'rag-product-name', product.name));
            const meta = el('div', 'rag-product-meta');
            meta.appendChild(el('span', 'rag-product-price', formatPrice(product.price, product.currency)));
            if (!product.in_stock) meta.appendChild(el('span', 'rag-badge-out', labels.outOfStock));
            info.appendChild(meta);
            const chevron = el('span', 'rag-product-chevron');
            chevron.innerHTML = icons.ChevronRight;
            item.append(info, chevron);
            item.onclick = () => openDetail(product);
            list.appendChild(item);
        });
        return list;
    }

    // 8. Función Constructora de Mensajes (con Avatares). Bot: texto, tarjetas y texto final.
    const addMessage = (msg, persist = true) => {
        const isUser = msg.role === 'user';
        const products = (!isUser && Array.isArray(msg.products)) ? msg.products : [];
        const row = document.createElement('div');
        row.className = `rag-msg-row ${isUser ? 'rag-msg-user-row' : ''}`;

        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'rag-avatar';
        avatar.style.background = color;
        avatar.innerHTML = isUser ? icons.User : selectedSvg;

        // Burbuja
        const bubble = document.createElement('div');
        bubble.className = `rag-bubble ${isUser ? 'rag-bubble-user' : 'rag-bubble-bot'}${products.length ? ' rag-bubble-wide' : ''}`;
        if (msg.text) bubble.appendChild(document.createTextNode(msg.text));
        if (products.length) {
            bubble.appendChild(productList(products));
            if (msg.after) bubble.appendChild(document.createTextNode(msg.after));
        }

        row.appendChild(avatar);
        row.appendChild(bubble);
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;

        if (persist) {
            history.push(msg);
            storage.set(STORAGE_MESSAGES, history.slice(-40));
        }
    };

    // Mensaje de bienvenida o conversación previa de esta pestaña
    if (history.length) {
        history.forEach(m => addMessage(m, false));
    } else {
        addMessage({ role: 'bot', text: welcomeMessage }, false);
    }

    // 9. Envío de Mensajes y Animación de Espera
    let isSending = false;
    const sendMessage = async () => {
        const text = input.value.trim();
        if (!text || isSending) return;
        isSending = true;
        sendBtn.disabled = true;

        addMessage({ role: 'user', text: text });
        input.value = '';

        // Inyectar el HTML de "Pensando"
        const typingRow = document.createElement('div');
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
            if (!response.ok) throw new Error('HTTP ' + response.status);

            const data = await response.json();
            typingRow.remove();
            const products = Array.isArray(data.products_referenced) ? data.products_referenced : [];
            // Con tarjetas se usa el texto separado; sin tarjetas, el texto completo de siempre
            const before = products.length ? (data.reply_before ?? data.reply) : (data.reply || data.answer);
            addMessage({
                role: 'bot',
                text: before || labels.error,
                products: products,
                after: products.length ? (data.reply_after || '') : ''
            });
        } catch (err) {
            typingRow.remove();
            addMessage({ role: 'bot', text: labels.error }, false);
            console.error("RAG Chatbot:", err);
        } finally {
            isSending = false;
            sendBtn.disabled = false;
            input.focus();
        }
    };

    sendBtn.onclick = sendMessage;
    input.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) { detailView ? closeDetail() : toggle(); }
    });
})();
