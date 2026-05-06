// ==========================================
// RAG SAAS - SEMANTIC SEARCH WIDGET
// ==========================================

(async function() {
    // 1. Leer la configuración base
    const localConfig = window.RAG_SEARCH_CONFIG || {};
    
    if (!localConfig.apiKey || !localConfig.companyId) {
        console.error("RAG Semantic Search: apiKey o companyId no configurados.");
        return;
    }

    // 2. URL y Configuración de Estilo
    let RAG_API_URL = localConfig.apiUrl || "https://microservice-3-production.up.railway.app"; 
    if (RAG_API_URL && !RAG_API_URL.startsWith('http')) {
        RAG_API_URL = 'https://' + RAG_API_URL;
    }

    const color = localConfig.color || "#8b5cf6";

    // 3. Diccionario de Íconos SVG
    const icons = {
        Search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
        Sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
        ImagePlace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`,
        ArrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
        Spinner: `<svg class="rag-search-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`
    };

    // 4. Inyectar CSS
    const style = document.createElement('style');
    style.innerHTML = `
        .rag-search-wrapper { position: relative; width: 100%; max-width: 600px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif; box-sizing: border-box; }
        .rag-search-wrapper * { box-sizing: border-box; }
        
        /* Input Box */
        .rag-search-box { display: flex; align-items: center; background: #f3f4f6; border-radius: 9999px; padding: 0 16px; height: 44px; border: 1px solid transparent; transition: all 0.2s ease; cursor: text; }
        .rag-search-box.focused { border-color: ${color}; box-shadow: 0 0 0 3px ${color}20; background: #ffffff; }
        
        .rag-search-icon { width: 18px; height: 18px; color: #6b7280; flex-shrink: 0; }
        .rag-search-spin { animation: rag-spin 1s linear infinite; }
        @keyframes rag-spin { 100% { transform: rotate(360deg); } }
        
        .rag-search-input { border: none; background: transparent; flex: 1; outline: none; font-size: 15px; margin-left: 10px; color: #111827; width: 100%; }
        .rag-search-input::placeholder { color: #9ca3af; }

        /* Dropdown */
        .rag-search-dropdown { position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 999999; overflow: hidden; display: none; opacity: 0; transform: translateY(-10px); transition: opacity 0.2s, transform 0.2s; }
        .rag-search-dropdown.open { display: flex; flex-direction: column; opacity: 1; transform: translateY(0); }
        
        /* Header del Dropdown */
        .rag-dropdown-header { padding: 8px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 6px; }
        .rag-dropdown-header svg { width: 14px; height: 14px; color: ${color}; }
        .rag-dropdown-header span { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }

        /* Lista de Resultados */
        .rag-results-container { max-height: 360px; overflow-y: auto; padding: 8px; }
        .rag-results-container::-webkit-scrollbar { width: 6px; }
        .rag-results-container::-webkit-scrollbar-thumb { background-color: #d1d5db; border-radius: 4px; }
        
        .rag-result-item { display: flex; gap: 12px; padding: 8px; border-radius: 8px; cursor: pointer; text-decoration: none; color: inherit; transition: background 0.15s; }
        .rag-result-item:hover { background: #f3f4f6; }
        .rag-result-item:hover .rag-item-title { color: ${color}; }
        
        /* Imagen del producto */
        .rag-item-img-box { width: 48px; height: 48px; background: #f3f4f6; border-radius: 6px; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; color: #9ca3af; }
        .rag-item-img-box img { width: 100%; height: 100%; object-fit: cover; }
        .rag-item-img-box svg { width: 24px; height: 24px; opacity: 0.5; }

        /* Detalles del producto */
        .rag-item-details { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
        .rag-item-title { font-size: 14px; font-weight: 500; color: #111827; margin: 0 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.15s; }
        .rag-item-meta { display: flex; align-items: center; gap: 8px; }
        .rag-item-price { font-size: 13px; color: #4b5563; font-weight: 500; }
        .rag-item-cat { font-size: 10px; color: #6b7280; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }

        /* Estados Vacíos / Carga */
        .rag-state-msg { padding: 32px 16px; text-align: center; color: #6b7280; font-size: 14px; }
        
        /* Footer */
        .rag-dropdown-footer { padding: 12px; border-top: 1px solid #e5e7eb; background: #f9fafb; text-align: center; }
        .rag-dropdown-footer a { font-size: 12px; font-weight: 500; color: ${color}; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; transition: opacity 0.2s; }
        .rag-dropdown-footer a:hover { opacity: 0.8; text-decoration: underline; }
        .rag-dropdown-footer svg { width: 14px; height: 14px; }
    `;
    document.head.appendChild(style);

    // 5. Encontrar el contenedor destino (definido en el embed code de la web del cliente)
    const targetContainer = document.getElementById('rag-search-bar-container');
    if (!targetContainer) {
        console.error("RAG Semantic Search: No se encontró el div id='rag-search-bar-container' en el DOM.");
        return;
    }

    // 6. Construir Estructura HTML
    targetContainer.innerHTML = `
        <div class="rag-search-wrapper" id="rag-search-wrapper">
            <div class="rag-search-box" id="rag-search-box">
                <div class="rag-search-icon" id="rag-icon-search">${icons.Search}</div>
                <div class="rag-search-icon" id="rag-icon-spin" style="display: none;">${icons.Spinner}</div>
                <input type="text" class="rag-search-input" id="rag-search-input" placeholder="Search semantically (e.g. 'headphones for running')..." autocomplete="off" />
            </div>
            
            <div class="rag-search-dropdown" id="rag-search-dropdown">
                <div class="rag-dropdown-header">
                    ${icons.Sparkles}
                    <span>Semantic Results</span>
                </div>
                <div class="rag-results-container" id="rag-results-container">
                    <!-- Resultados se inyectan aquí -->
                </div>
                <div class="rag-dropdown-footer">
                    <a href="#" id="rag-view-all">View all results ${icons.ArrowRight}</a>
                </div>
            </div>
        </div>
    `;

    // 7. Lógica y Eventos
    const wrapper = document.getElementById('rag-search-wrapper');
    const searchBox = document.getElementById('rag-search-box');
    const input = document.getElementById('rag-search-input');
    const dropdown = document.getElementById('rag-search-dropdown');
    const resultsContainer = document.getElementById('rag-results-container');
    const iconSearch = document.getElementById('rag-icon-search');
    const iconSpin = document.getElementById('rag-icon-spin');

    // Manejo de foco (Click dentro y fuera)
    input.addEventListener('focus', () => {
        searchBox.classList.add('focused');
        if (input.value.trim().length > 0) {
            dropdown.classList.add('open');
        }
    });

    document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
            searchBox.classList.remove('focused');
            dropdown.classList.remove('open');
        }
    });

    // 8. Lógica de Búsqueda (Con Anti-Spam / Debounce)
    let typingTimer;

    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        clearTimeout(typingTimer);
        
        if (query.length === 0) {
            dropdown.classList.remove('open');
            return;
        }

        // Mostrar UI de "Cargando"
        dropdown.classList.add('open');
        iconSearch.style.display = 'none';
        iconSpin.style.display = 'block';
        resultsContainer.innerHTML = `<div class="rag-state-msg">Analyzing semantics...</div>`;

        // Esperar 400ms después de que el usuario deje de teclear
        typingTimer = setTimeout(() => {
            performSemanticSearch(query);
        }, 400);
    });

    // 9. Conexión con el Microservicio 3
    async function performSemanticSearch(query) {
        try {
            const response = await fetch(`${RAG_API_URL}/api/v1/search/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': localConfig.apiKey
                },
                body: JSON.stringify({ 
                    query: query, 
                    company_id: localConfig.companyId 
                })
            });

            if (!response.ok) throw new Error("Error de red");

            const data = await response.json();
            renderResults(data.results || []);

        } catch (error) {
            console.error("RAG Search Error:", error);
            resultsContainer.innerHTML = `<div class="rag-state-msg">Error retrieving results. Please try again.</div>`;
        } finally {
            iconSpin.style.display = 'none';
            iconSearch.style.display = 'block';
        }
    }

    // 10. Renderizado de Resultados en el Dropdown (CORREGIDO)
    function renderResults(results) {
        if (results.length === 0) {
            resultsContainer.innerHTML = `<div class="rag-state-msg">No semantic matches found. Try another phrase.</div>`;
            return;
        }

        let html = '';
        results.forEach(item => {
            const imgHtml = item.image_url 
                ? `<div style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
                       <div style="position:absolute; width:24px; height:24px; opacity:0.5;">${icons.ImagePlace}</div>
                       <img src="${item.image_url}" alt="${item.name}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:10; background:white;" onerror="this.style.display='none'" />
                   </div>` 
                : icons.ImagePlace;

            html += `
                <div class="rag-result-item" onclick="console.log('Clicked product ID: ${item.variant_id}')">
                    <div class="rag-item-img-box">
                        ${imgHtml}
                    </div>
                    <div class="rag-item-details">
                        <p class="rag-item-title">${item.name}</p>
                        <div class="rag-item-meta">
                            <span class="rag-item-price">$${item.price.toFixed(2)}</span>
                            ${item.category ? `<span class="rag-item-cat">${item.category}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        resultsContainer.innerHTML = html;
    }
})();