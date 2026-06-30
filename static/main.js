/**
 * IntelliFlora Editorial Main Logic
 * Manages viewport page routing, localStorage theme selectors, backend dynamic API searches,
 * local favorites collections, swipe carousels, and Chart.js dashboard statistics.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Application runtime caches
    let libraryData = {};
    let activeCameraStream = null;
    let currentInferenceProfile = null;
    
    // Chart.js Instances
    let categoryChart = null;
    let confidenceChart = null;

    // Viewport nodes & page lists
    const navButtons = document.querySelectorAll("[data-target-page]");
    const pageViews = document.querySelectorAll(".page-view");
    const dropZone = document.getElementById("drop-zone");
    const fileInput = document.getElementById("file-input");
    const loadingScreen = document.getElementById("loading-screen");
    const outputScreen = document.getElementById("output-screen");
    
    // Lightbox modal nodes
    const lightboxModal = document.getElementById("lightbox-preview-modal");
    const lightboxImg = document.getElementById("lightbox-image");
    const lightboxCaption = document.getElementById("lightbox-caption");
    const btnLightboxClose = document.getElementById("btn-lightbox-close");

    // Native Camera Snapper
    const btnStartCamera = document.getElementById("btn-start-camera");
    const btnStopCamera = document.getElementById("btn-stop-camera");
    const btnSnap = document.getElementById("btn-snap");
    const videoStream = document.getElementById("video-stream");
    const captureCanvas = document.getElementById("capture-canvas");
    const cameraPlaceholder = document.getElementById("camera-placeholder");
    const cameraControls = document.getElementById("camera-controls");
    const btnFabCameraTrigger = document.getElementById("btn-fab-camera-trigger");

    // ==========================================
    // 1. PAGE ROUTING SYSTEM
    // ==========================================
    function navigateToPage(pageId) {
        // Stop camera stream if active and navigating away from home
        if (pageId !== "home" && activeCameraStream) {
            stopCamera();
        }

        // Switch active nav buttons across sidebar & bottom nav
        navButtons.forEach(btn => {
            if (btn.getAttribute("data-target-page") === pageId) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Toggle active page view class
        pageViews.forEach(view => {
            view.classList.remove("active");
            if (view.id === `page-${pageId}`) {
                view.classList.add("active");
            }
        });

        // Trigger page-specific data updates
        if (pageId === "encyclopedia") {
            fetchEncyclopedia("");
        } else if (pageId === "favorites") {
            renderFavoritesGrid();
        } else if (pageId === "analytics") {
            fetchStats();
        }
    }

    navButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const pageId = btn.getAttribute("data-target-page");
            navigateToPage(pageId);
        });
    });

    // Back to home button trigger
    document.getElementById("btn-back-home").addEventListener("click", () => {
        navigateToPage("home");
        resetIdentifier();
    });

    document.getElementById("btn-result-reset").addEventListener("click", () => {
        navigateToPage("home");
        resetIdentifier();
    });


    // ==========================================
    // 2. THEME CONTROLLER & CACHE
    // ==========================================
    const themeButtons = document.querySelectorAll("[data-theme-val]");
    const cachedTheme = localStorage.getItem("intelliflora_theme") || "botanical";
    
    // Apply cached theme on startup
    document.body.setAttribute("data-theme", cachedTheme);
    themeButtons.forEach(btn => {
        if (btn.getAttribute("data-theme-val") === cachedTheme) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    themeButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const selectedTheme = btn.getAttribute("data-theme-val");
            document.body.setAttribute("data-theme", selectedTheme);
            localStorage.setItem("intelliflora_theme", selectedTheme);
            
            themeButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });


    // ==========================================
    // 3. FAVORITES COLLECTION (localStorage)
    // ==========================================
    function getFavorites() {
        return JSON.parse(localStorage.getItem("intelliflora_favorites") || "[]");
    }

    function saveFavorites(favorites) {
        localStorage.setItem("intelliflora_favorites", JSON.stringify(favorites));
    }

    function isFavorite(flowerName) {
        const key = flowerName.toLowerCase().trim();
        const favs = getFavorites();
        return favs.some(f => f.name.toLowerCase().trim() === key);
    }

    function toggleFavorite(flowerName, botanicalProfile, predictionInfo) {
        const nameKey = flowerName.toLowerCase().trim();
        let favs = getFavorites();
        
        if (isFavorite(flowerName)) {
            favs = favs.filter(f => f.name.toLowerCase().trim() !== nameKey);
            saveFavorites(favs);
            updateFavoriteButtonState(false);
        } else {
            const newFav = {
                name: flowerName,
                scientific_name: botanicalProfile.scientific_name,
                family: botanicalProfile.family,
                origin: botanicalProfile.origin,
                bloom_season: botanicalProfile.bloom_season,
                color: botanicalProfile.color,
                emoji: botanicalProfile.emoji,
                rarity: botanicalProfile.rarity,
                toxicity: botanicalProfile.toxicity,
                care_guide: botanicalProfile.care_guide,
                uses: botanicalProfile.uses,
                fun_facts: botanicalProfile.fun_facts,
                habitat: botanicalProfile.habitat,
                native_region: botanicalProfile.native_region,
                related_species: botanicalProfile.related_species,
                related_images: botanicalProfile.related_images,
                confidence: predictionInfo.confidence,
                savedAt: new Date().toLocaleDateString()
            };
            favs.push(newFav);
            saveFavorites(favs);
            updateFavoriteButtonState(true);
        }
    }

    function updateFavoriteButtonState(favorited) {
        const btn = document.getElementById("btn-result-fav-toggle");
        if (!btn) return;
        
        if (favorited) {
            btn.classList.add("active");
            btn.innerHTML = `<span class="fav-icon">♥</span> Favorited`;
        } else {
            btn.classList.remove("active");
            btn.innerHTML = `<span class="fav-icon">♡</span> Add to Herbarium`;
        }
    }

    function renderFavoritesGrid() {
        const grid = document.getElementById("favorites-grid");
        grid.innerHTML = "";
        
        const favs = getFavorites();
        if (favs.length === 0) {
            grid.innerHTML = `<div class="history-empty" style="grid-column: 1/-1; padding: 4rem 1rem;">Your Herbarium is currently empty. Identify a flower and click "Add to Herbarium" to start your collection!</div>`;
            return;
        }

        favs.forEach(val => {
            const card = document.createElement("div");
            card.className = "flower-library-card";
            card.style.borderTop = `4px solid ${val.color || "#157347"}`;
            
            const toxicity = val.toxicity || "Unknown";
            const toxicClass = (toxicity.toLowerCase().includes("toxic") && !toxicity.toLowerCase().includes("non-toxic")) ? "badge-danger" : "badge-primary";
            
            card.innerHTML = `
                <div class="library-card-header">
                    <h3>${val.name}</h3>
                    <span class="library-card-emoji">${val.emoji || "🌸"}</span>
                </div>
                <div class="library-card-scientific">${val.scientific_name || "Species unknown"}</div>
                <div class="library-card-meta">📁 <strong>Family:</strong> ${val.family || "N/A"}</div>
                <div class="library-card-meta">📅 <strong>Saved On:</strong> ${val.savedAt || "N/A"}</div>
                <div class="library-card-badges">
                    <span class="badge-custom" style="border-color: ${val.color}; color: ${val.color};">${val.rarity || "Common"}</span>
                    <span class="badge-custom ${toxicClass}">${toxicity}</span>
                </div>
                <button class="btn btn-primary" style="margin-top: 1.25rem; font-size: 0.75rem; padding: 0.45rem 1rem; width: 100%;" data-fav-recall="${val.name}">Load Profile Parameters</button>
            `;
            
            card.querySelector("[data-fav-recall]").addEventListener("click", () => {
                // Reconstruct full prediction payload and trigger dashboard render
                const fakeResponse = {
                    prediction: {
                        flower_name: val.name,
                        confidence: val.confidence,
                        top5: [[val.name, val.confidence]],
                        model: "Herbarium Collection Profile",
                        processing_time: 0,
                        is_mock: false
                    },
                    images: {
                        original: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23f4efe6"/><text x="50" y="55" font-size="25" text-anchor="middle">${val.emoji}</text></svg>`,
                        gradcam: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23f4efe6"/><text x="50" y="55" font-size="25" text-anchor="middle">👁️</text></svg>`
                    },
                    botanical: {
                        scientific_name: val.scientific_name,
                        family: val.family,
                        origin: val.origin,
                        bloom_season: val.bloom_season,
                        rarity: val.rarity,
                        toxicity: val.toxicity,
                        uses: val.uses,
                        fun_facts: val.fun_facts,
                        habitat: val.habitat,
                        native_region: val.native_region,
                        care_guide: val.care_guide,
                        color: val.color,
                        emoji: val.emoji,
                        related_species: val.related_species,
                        related_images: val.related_images
                    },
                    session_stats: {
                        total_predictions: getFavorites().length,
                        avg_confidence: 90.0,
                        prediction_history: [],
                        top_flower_predicted: val.name
                    }
                };
                
                renderDashboard(fakeResponse);
            });

            grid.appendChild(card);
        });
    }


    // ==========================================
    // 4. DYNAMIC BACKEND LIBRARY FETCH & SEARCH
    // ==========================================
    function fetchEncyclopedia(query) {
        const grid = document.getElementById("encyclopedia-grid");
        grid.innerHTML = `<div class="history-empty" style="grid-column: 1/-1; padding: 3rem;">Querying database nodes...</div>`;

        fetch(`/api/library?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                libraryData = data;
                renderEncyclopedia(data);
            })
            .catch(err => {
                console.error("Library query failed:", err);
                grid.innerHTML = `<div class="history-empty" style="grid-column: 1/-1; padding: 3rem; color: var(--accent-rose);">Network error querying library cards.</div>`;
            });
    }

    const searchInput = document.getElementById("encyclopedia-search");
    const searchClear = document.getElementById("search-clear");
    
    if (searchInput) {
        // Dynamic search input key listener querying backend dynamically
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.trim();
            
            if (query.length > 0) {
                searchClear.style.display = "block";
            } else {
                searchClear.style.display = "none";
            }
            
            fetchEncyclopedia(query);
        });
    }

    if (searchClear) {
        searchClear.addEventListener("click", () => {
            searchInput.value = "";
            searchClear.style.display = "none";
            fetchEncyclopedia("");
            searchInput.focus();
        });
    }

    function renderEncyclopedia(data) {
        const grid = document.getElementById("encyclopedia-grid");
        grid.innerHTML = "";
        
        const flowers = Object.entries(data);
        if (flowers.length === 0) {
            grid.innerHTML = `<div class="history-empty" style="grid-column: 1/-1; padding: 3rem;">No registered flowers found matching query.</div>`;
            return;
        }

        flowers.forEach(([key, val]) => {
            const card = document.createElement("div");
            card.className = "flower-library-card";
            card.style.borderTop = `4px solid ${val.color || "#157347"}`;
            
            const toxicity = val.toxicity || "Unknown";
            const toxicClass = (toxicity.toLowerCase().includes("toxic") && !toxicity.toLowerCase().includes("non-toxic")) ? "badge-danger" : "badge-primary";
            
            card.innerHTML = `
                <div class="library-card-header">
                    <h3>${key.charAt(0).toUpperCase() + key.slice(1)}</h3>
                    <span class="library-card-emoji">${val.emoji || "🌸"}</span>
                </div>
                <div class="library-card-scientific">${val.scientific_name || "Species unknown"}</div>
                <div class="library-card-meta">📁 <strong>Family:</strong> ${val.family || "N/A"}</div>
                <div class="library-card-meta">📅 <strong>Season:</strong> ${val.bloom_season || "N/A"}</div>
                <div class="library-card-badges">
                    <span class="badge-custom" style="border-color: ${val.color}; color: ${val.color};">${val.rarity || "Common"}</span>
                    <span class="badge-custom ${toxicClass}">${toxicity}</span>
                </div>
            `;
            
            card.addEventListener("click", () => {
                openEncyclopediaDetailPanel(key, val);
            });

            grid.appendChild(card);
        });
    }


    // ==========================================
    // 4b. ENCYCLOPEDIA DETAIL SLIDE-IN PANEL
    // ==========================================
    function openEncyclopediaDetailPanel(key, val) {
        // Remove any existing panel + backdrop first
        const existingPanel = document.getElementById("encyclopedia-detail-panel");
        const existingBackdrop = document.getElementById("enc-panel-backdrop");
        if (existingPanel) existingPanel.remove();
        if (existingBackdrop) existingBackdrop.remove();

        const displayName = key.charAt(0).toUpperCase() + key.slice(1);
        const careGuide = val.care_guide || {};
        const careTips = val.care_tips || [];
        const sunlight   = careGuide.sunlight   || careTips[0] || "Full sun to partial shade";
        const watering   = careGuide.watering   || careTips[1] || "Regular watering";
        const pruning    = careGuide.pruning    || careTips[2] || "Deadhead spent blooms";
        const fertilizer = careGuide.fertilizer || careTips[3] || "Monthly liquid fertilizer";
        const pests      = careGuide.pests      || careTips[4] || "Watch for aphids";
        const diseases   = careGuide.diseases   || "Watch for powdery mildew";

        const toxicity = val.toxicity || "Unknown";
        const toxicStyle = (toxicity.toLowerCase().includes("toxic") && !toxicity.toLowerCase().includes("non-toxic"))
            ? "color: #dc3545;" : "color: var(--accent-primary);";

        const usesHtml  = (val.uses      || []).map(u => `<li style="margin-bottom:0.3rem;">🌿 ${u}</li>`).join("");
        const factsHtml = (val.fun_facts || []).map(f => `<li style="margin-bottom:0.3rem;">ℹ️ ${f}</li>`).join("");
        const relatedHtml = (val.related_flowers || val.related_species || []).slice(0, 4).map(r => {
            const name = typeof r === "string" ? r : (r.name || r);
            return `<span style="display:inline-block; padding: 0.25rem 0.7rem; border-radius: 20px; font-size:0.78rem; border: 1px solid var(--accent-primary); color: var(--accent-primary); margin: 0.2rem;">${name}</span>`;
        }).join("");

        // Backdrop
        const backdrop = document.createElement("div");
        backdrop.id = "enc-panel-backdrop";
        backdrop.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.25); z-index:9998; transition: opacity 0.3s;";
        document.body.appendChild(backdrop);

        // Panel
        const panel = document.createElement("div");
        panel.id = "encyclopedia-detail-panel";
        panel.style.cssText = `
            position: fixed; top: 0; right: -440px; width: 420px; max-width: 95vw;
            height: 100vh; background: var(--bg-card, #fff);
            border-left: 1px solid var(--border-light, #e8e8e4);
            box-shadow: -12px 0 48px rgba(0,0,0,0.14);
            z-index: 9999; overflow-y: auto;
            transition: right 0.38s cubic-bezier(0.4,0,0.2,1);
            padding: 1.75rem 1.5rem 4rem;
            display: flex; flex-direction: column; gap: 1.1rem;
            font-family: var(--font-sans, 'Outfit', sans-serif);
        `;
        panel.innerHTML = `
            <!-- Panel Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <span style="font-size:2.2rem; display:block; margin-bottom:0.4rem;">${val.emoji || "🌸"}</span>
                    <h2 style="font-family: var(--font-serif, 'Lora', serif); font-size: 1.55rem; margin:0 0 0.2rem; color: var(--text-editorial-dark);">${displayName}</h2>
                    <p style="font-style:italic; color:var(--text-editorial-gray); font-size:0.88rem; margin:0;">${val.scientific_name || ""}</p>
                </div>
                <button id="btn-close-enc-panel" aria-label="Close" style="background:none; border: 1px solid var(--border-light, #ddd); border-radius:50%; width:36px; height:36px; cursor:pointer; color:var(--text-editorial-gray); font-size:1.1rem; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition: background 0.2s;">✕</button>
            </div>

            <hr style="border:none; border-top:1px solid var(--border-light, #eee); margin:0;">

            <!-- Quick Stats Grid -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.6rem; font-size:0.83rem;">
                <div style="background:var(--bg-page, #f9f9f7); border-radius:10px; padding:0.65rem 0.8rem;">
                    <span style="display:block; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-editorial-light); margin-bottom:0.2rem;">Family</span>
                    <strong style="color:var(--accent-primary);">${val.family || "N/A"}</strong>
                </div>
                <div style="background:var(--bg-page, #f9f9f7); border-radius:10px; padding:0.65rem 0.8rem;">
                    <span style="display:block; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-editorial-light); margin-bottom:0.2rem;">Origin</span>
                    <strong>${val.origin || "N/A"}</strong>
                </div>
                <div style="background:var(--bg-page, #f9f9f7); border-radius:10px; padding:0.65rem 0.8rem;">
                    <span style="display:block; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-editorial-light); margin-bottom:0.2rem;">Bloom Season</span>
                    <strong>${val.bloom_season || "N/A"}</strong>
                </div>
                <div style="background:var(--bg-page, #f9f9f7); border-radius:10px; padding:0.65rem 0.8rem;">
                    <span style="display:block; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.06em; color:var(--text-editorial-light); margin-bottom:0.2rem;">Toxicity</span>
                    <strong style="${toxicStyle}">${toxicity}</strong>
                </div>
            </div>

            ${val.description ? `
            <p style="font-size:0.9rem; line-height:1.7; color:var(--text-editorial-gray); border-left:3px solid var(--accent-primary); padding-left:0.85rem; margin:0;">
                ${val.description}
            </p>` : ""}

            <!-- Care Guide -->
            <div style="background:var(--bg-page, #f9f9f7); border-radius:12px; padding:1rem 1.1rem;">
                <h4 style="margin:0 0 0.75rem; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.07em; color:var(--text-editorial-light);">🌱 Care Guide</h4>
                <div style="display:flex; flex-direction:column; gap:0.45rem; font-size:0.86rem;">
                    <div>☀️ <strong>Sunlight:</strong> ${sunlight}</div>
                    <div>🚿 <strong>Watering:</strong> ${watering}</div>
                    <div>✂️ <strong>Pruning:</strong> ${pruning}</div>
                    <div>🧪 <strong>Fertilizer:</strong> ${fertilizer}</div>
                    <div>🐛 <strong>Pests:</strong> ${pests}</div>
                    <div>🍂 <strong>Diseases:</strong> ${diseases}</div>
                </div>
            </div>

            ${usesHtml ? `
            <div>
                <h4 style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.07em; color:var(--text-editorial-light); margin-bottom:0.55rem;">🏺 Uses</h4>
                <ul style="list-style:none; padding:0; margin:0; font-size:0.87rem;">${usesHtml}</ul>
            </div>` : ""}

            ${factsHtml ? `
            <div>
                <h4 style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.07em; color:var(--text-editorial-light); margin-bottom:0.55rem;">💡 Fun Facts</h4>
                <ul style="list-style:none; padding:0; margin:0; font-size:0.87rem;">${factsHtml}</ul>
            </div>` : ""}

            ${relatedHtml ? `
            <div>
                <h4 style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.07em; color:var(--text-editorial-light); margin-bottom:0.55rem;">🌺 Related Flowers</h4>
                <div>${relatedHtml}</div>
            </div>` : ""}

            <!-- CTA -->
            <button id="btn-enc-view-result" style="padding:0.8rem 1.5rem; background:var(--accent-primary, #157347); color:#fff; border:none; border-radius:12px; font-size:0.9rem; font-weight:600; cursor:pointer; font-family:var(--font-sans); transition: opacity 0.2s; margin-top:0.5rem;">
                🔍 View Full Botanical Profile
            </button>
        `;

        document.body.appendChild(panel);

        // Animate in
        requestAnimationFrame(() => { panel.style.right = "0"; });

        function closePanel() {
            panel.style.right = "-440px";
            backdrop.style.opacity = "0";
            setTimeout(() => { panel.remove(); backdrop.remove(); }, 380);
        }

        // Close button
        panel.querySelector("#btn-close-enc-panel").addEventListener("click", closePanel);
        backdrop.addEventListener("click", closePanel);

        // Hover glow on close btn
        const closeBtn = panel.querySelector("#btn-close-enc-panel");
        closeBtn.addEventListener("mouseenter", () => closeBtn.style.background = "var(--bg-hover, rgba(0,0,0,0.06))");
        closeBtn.addEventListener("mouseleave", () => closeBtn.style.background = "none");

        // Wire "View Full Botanical Profile" button
        panel.querySelector("#btn-enc-view-result").addEventListener("click", () => {
            closePanel();
            fetch(`/api/flower-details/${encodeURIComponent(key)}`)
                .then(r => r.json())
                .then(data => {
                    if (data.error) { console.error(data.error); return; }
                    renderDashboard(data);
                    navigateToPage("result");
                })
                .catch(err => console.error("Flower detail fetch failed:", err));
        });
    }


    // ==========================================
    // 5. SESSION STATS & CHART.JS ENGINE
    // ==========================================
    function fetchStats() {
        fetch("/api/stats")
            .then(res => res.json())
            .then(data => {
                updateHomeAndSidebarStats(data);
                renderChartJsCanvases(data);
            })
            .catch(err => console.error("Telemetry fetch failed:", err));
    }

    function updateHomeAndSidebarStats(data) {
        // Sidebar Stats
        const scansVal = document.getElementById("stats-scans-val");
        if (scansVal) scansVal.innerText = data.total_predictions;
        const confVal = document.getElementById("stats-conf-val");
        if (confVal) confVal.innerText = `${data.avg_confidence}%`;

        // Home History Lists
        const homeHistory = document.getElementById("home-history-container");
        homeHistory.innerHTML = "";
        
        if (data.prediction_history && data.prediction_history.length > 0) {
            data.prediction_history.slice(0, 5).forEach(item => {
                const badgeColor = item.confidence >= 80 ? "var(--accent-primary)" : "var(--accent-gold)";
                const div = document.createElement("div");
                div.className = "history-card-item";
                div.innerHTML = `
                    <span class="history-card-name">🌸 ${item.flower_name}</span>
                    <span class="history-card-conf" style="color: ${badgeColor}; border-color: ${badgeColor}30; background: ${badgeColor}10;">${item.confidence}%</span>
                `;
                homeHistory.appendChild(div);
            });
        } else {
            homeHistory.innerHTML = `<div class="history-empty">No flower classifications run in this session.</div>`;
        }

        // Telemetry View Stats
        document.getElementById("stats-total-val").innerText = data.total_predictions;
        document.getElementById("stats-avg-val").innerText = `${data.avg_confidence}%`;
        document.getElementById("stats-top-val").innerText = data.top_flower_predicted || "None";
        
        const badge = document.getElementById("engine-status-badge");
        const statusVal = document.getElementById("stats-engine-val");
        
        let usingGemini = false;
        if (data.prediction_history && data.prediction_history.length > 0) {
            usingGemini = data.prediction_history[0].model.includes("Gemini");
        }

        if (usingGemini) {
            badge.innerHTML = `<span class="badge-dot"></span> AI Lens Active`;
            statusVal.innerText = "Gemini Flash API";
            statusVal.style.color = "var(--accent-primary)";
        } else {
            badge.innerHTML = `<span class="badge-dot"></span> Fallback Active`;
            statusVal.innerText = "Fallback Mock Engine";
            statusVal.style.color = "var(--accent-gold)";
        }

        // Populate details table rows
        const tbody = document.getElementById("diag-model-tbody");
        if (tbody) {
            tbody.innerHTML = `
                <tr><td>Model core</td><td>Gemini 3 Flash Vision API</td></tr>
                <tr><td>Local Weights</td><td>MobileNetV2 Transfer Model</td></tr>
                <tr><td>Total Parameters</td><td>3.4M CNN nodes + LLM weights</td></tr>
                <tr><td>Input Tensor Resolution</td><td>224 × 224 × 3 RGB</td></tr>
                <tr><td>Active Detections Cache</td><td>In-memory session buffer</td></tr>
            `;
        }
    }

    function renderChartJsCanvases(data) {
        // Destroy existing instances to prevent hover artifacts
        if (categoryChart) categoryChart.destroy();
        if (confidenceChart) confidenceChart.destroy();

        // 1. Group category scans counts
        const categories = {};
        (data.prediction_history || []).forEach(item => {
            const name = item.flower_name;
            categories[name] = (categories[name] || 0) + 1;
        });

        const pieLabels = Object.keys(categories);
        const pieData = Object.values(categories);

        // Fallbacks if empty
        const defaultLabels = pieLabels.length > 0 ? pieLabels : ["No Scans"];
        const defaultData = pieData.length > 0 ? pieData : [1];
        const defaultColors = pieLabels.length > 0 
            ? ["#157347", "#8b5cf6", "#f43f5e", "#fbbf24", "#0f5132"].slice(0, pieLabels.length)
            : ["#eae6db"];

        const ctxPie = document.getElementById("chart-pie-categories").getContext("2d");
        categoryChart = new Chart(ctxPie, {
            type: "doughnut",
            data: {
                labels: defaultLabels,
                datasets: [{
                    data: defaultData,
                    backgroundColor: defaultColors,
                    borderWidth: 1,
                    borderColor: "var(--bg-card)"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { font: { family: "Outfit" }, color: "var(--text-editorial-dark)" }
                    }
                }
            }
        });

        // 2. Trend Line confidences
        const linePoints = (data.confidence_history || []).slice(-10); // last 10 points
        const lineLabels = linePoints.map((_, i) => `Scan ${i+1}`);
        const defaultLinePoints = linePoints.length > 0 ? linePoints : [0];
        const defaultLineLabels = lineLabels.length > 0 ? lineLabels : ["Awaiting Data"];

        const ctxLine = document.getElementById("chart-line-confidence").getContext("2d");
        confidenceChart = new Chart(ctxLine, {
            type: "line",
            data: {
                labels: defaultLineLabels,
                datasets: [{
                    label: "Confidence Rating (%)",
                    data: defaultLinePoints,
                    borderColor: "var(--accent-primary)",
                    backgroundColor: "var(--accent-primary-light)",
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: "var(--accent-primary)"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: "rgba(0,0,0,0.03)" },
                        ticks: { font: { family: "Outfit" }, color: "var(--text-editorial-gray)" }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { family: "Outfit" }, color: "var(--text-editorial-gray)" }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }


    // ==========================================
    // 6. UPLOAD DRAG & DROP & FLOATING FAB CAMERA
    // ==========================================
    // Start Live Camera
    async function startCamera() {
        try {
            activeCameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" }
            });
        } catch (err) {
            console.warn("Environment camera not found, trying fallback video stream:", err);
            try {
                activeCameraStream = await navigator.mediaDevices.getUserMedia({
                    video: true
                });
            } catch (fallbackErr) {
                console.error("Camera access failed:", fallbackErr);
                alert("Could not access camera. Please upload an image instead.");
                return;
            }
        }
        
        if (activeCameraStream) {
            videoStream.srcObject = activeCameraStream;
            videoStream.style.display = "block";
            cameraPlaceholder.style.display = "none";
            cameraControls.style.display = "flex";
        }
    }

    // Stop Live Camera
    function stopCamera() {
        if (activeCameraStream) {
            activeCameraStream.getTracks().forEach(track => track.stop());
            activeCameraStream = null;
        }
        videoStream.srcObject = null;
        videoStream.style.display = "none";
        cameraPlaceholder.style.display = "flex";
        cameraControls.style.display = "none";
    }

    // Take Snapshot and predict
    function captureSnapshot() {
        if (!activeCameraStream) return;
        
        const width = videoStream.videoWidth || 640;
        const height = videoStream.videoHeight || 480;
        captureCanvas.width = width;
        captureCanvas.height = height;
        
        const ctx = captureCanvas.getContext("2d");
        ctx.drawImage(videoStream, 0, 0, width, height);
        
        const dataUrl = captureCanvas.toDataURL("image/png");
        
        // Stop the camera stream now that we have the photo
        stopCamera();
        
        // Send base64 to backend
        uploadAndRunInference(JSON.stringify({ image: dataUrl }), true);
    }

    // Voice Assistant Initialization
    const voiceBtn = document.getElementById('btn-fab-voice-trigger');
    const voiceSettingsModal = document.getElementById('voice-settings-modal');
    const voiceSettingsClose = document.getElementById('voice-settings-close');
    const voiceEnableToggle = document.getElementById('voice-enable-toggle');
    const voiceSpeedSelect = document.getElementById('voice-speed-select');
    const voiceSelect = document.getElementById('voice-select');

    // Populate voice selection dropdown
    function loadVoices() {
      const voices = speechSynthesis.getVoices();
      voiceSelect.innerHTML = '';
      voices.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = v.name;
        if (v.default) opt.selected = true;
        voiceSelect.appendChild(opt);
      });
    }
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Helper to get selected voice object
    function getSelectedVoice() {
      const selectedName = voiceSelect.value;
      return speechSynthesis.getVoices().find(v => v.name === selectedName) || null;
    }

    // Listening overlay
    function showListeningOverlay() {
      let overlay = document.getElementById('voice-listening-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'voice-listening-overlay';
        overlay.style.position = 'fixed';
        overlay.style.bottom = '80px';
        overlay.style.right = '20px';
        overlay.style.padding = '0.6rem 1rem';
        overlay.style.background = 'rgba(0,0,0,0.7)';
        overlay.style.color = '#fff';
        overlay.style.borderRadius = '12px';
        overlay.style.fontSize = '0.9rem';
        overlay.style.zIndex = '1001';
        overlay.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        overlay.textContent = '🎤 Listening...';
        document.body.appendChild(overlay);
      }
      overlay.style.display = 'block';
    }
    function hideListeningOverlay() {
      const overlay = document.getElementById('voice-listening-overlay');
      if (overlay) overlay.style.display = 'none';
    }

    // Command handling
    function handleVoiceCommand(command) {
      console.log('Voice command:', command);
      if (command.startsWith('search ')) {
        const term = command.replace('search ', '').trim();
        const searchInput = document.getElementById('encyclopedia-search');
        if (searchInput) {
          searchInput.value = term;
          fetchEncyclopedia(term);
          navigateToPage('encyclopedia');
        }
      } else if (command.includes('predict flower')) {
        // Trigger prediction flow – open camera or file upload UI
        navigateToPage('home');
        // Optionally open camera automatically
        if (btnStartCamera) btnStartCamera.click();
      } else if (command.includes('open encyclopedia')) {
        navigateToPage('encyclopedia');
      } else if (command.includes('go to home')) {
        navigateToPage('home');
      } else if (command.includes('open analytics')) {
        navigateToPage('analytics');
      } else if (command.includes('read flower information')) {
        if (currentInferenceProfile) {
          const info = currentInferenceProfile.botanical;
          const pred = currentInferenceProfile.prediction;
          const speech = `Predicted flower is ${pred.flower_name}. Scientific name ${info.scientific_name || 'unknown'}. Family ${info.family || 'unknown'}. Origin ${info.origin || 'unknown'}. Bloom season ${info.bloom_season || 'unknown'}.`;
          const utter = new SpeechSynthesisUtterance(speech);
          const voice = getSelectedVoice();
          if (voice) utter.voice = voice;
          utter.rate = parseFloat(voiceSpeedSelect.value) || 1;
          speechSynthesis.speak(utter);
        } else {
          alert('No prediction data available to read.');
        }
      } else if (command.includes('stop speaking')) {
        speechSynthesis.cancel();
      } else {
        console.warn('Unrecognized voice command:', command);
      }
    }

    // Start voice assistant
    function startVoiceAssistant() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Your browser does not support Speech Recognition.');
        return;
      }
      const recognizer = new SpeechRecognition();
      recognizer.lang = 'en-US';
      recognizer.interimResults = false;
      recognizer.maxAlternatives = 1;
      recognizer.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim().toLowerCase();
        handleVoiceCommand(transcript);
      };
      recognizer.onend = hideListeningOverlay;
      recognizer.onerror = (e) => {
        console.error('Speech recognition error:', e);
        hideListeningOverlay();
      };
      showListeningOverlay();
      recognizer.start();
    }

    // UI event bindings
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        if (voiceEnableToggle && !voiceEnableToggle.checked) {
          alert('Voice Assistant is disabled. Enable it in settings.');
          return;
        }
        startVoiceAssistant();
      });
    }
    if (voiceSettingsClose) {
      voiceSettingsClose.addEventListener('click', () => {
        voiceSettingsModal.style.display = 'none';
      });
    }
    // Assuming there is a button to open settings (you can add one as needed)
    // For demo, double-click on voice button opens settings
    if (voiceBtn) {
      voiceBtn.addEventListener('dblclick', () => {
        voiceSettingsModal.style.display = 'block';
      });
    }

    // Camera event bindings
    if (btnStartCamera) {
        btnStartCamera.addEventListener("click", startCamera);
    }
    if (btnStopCamera) {
        btnStopCamera.addEventListener("click", stopCamera);
    }
    if (btnSnap) {
        btnSnap.addEventListener("click", captureSnapshot);
    }

    if (btnFabCameraTrigger) {
        btnFabCameraTrigger.addEventListener("click", () => {
            // Navigate to Home View page
            navigateToPage("home");
            
            // Scroll down directly to the camera streaming block
            const camBlock = document.getElementById("camera-wrapper");
            camBlock.scrollIntoView({ behavior: "smooth" });
            
            // Trigger starting camera feed
            if (!activeCameraStream && btnStartCamera) {
                btnStartCamera.click();
            }
        });
    }

    // File drag and drop logic
    if (dropZone && fileInput) {
        // Trigger file input click on dropZone click
        dropZone.addEventListener("click", () => {
            fileInput.click();
        });
        
        // File selection change
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append("image", file);
                uploadAndRunInference(formData, false);
            }
        });
        
        // Drag over states
        dropZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropZone.classList.add("drag-over");
        });
        
        dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("drag-over");
        });
        
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("drag-over");
            
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                const formData = new FormData();
                formData.append("image", file);
                uploadAndRunInference(formData, false);
            }
        });
    }


    // ==========================================
    // 7. INFERENCE POST HANDLER & RESPONSE ENGINE
    // ==========================================
    function uploadAndRunInference(payload, isJson) {
        // Toggle elements pointer events
        dropZone.style.pointerEvents = "none";
        if (btnStartCamera) btnStartCamera.disabled = true;
        
        loadingScreen.style.display = "flex";
        outputScreen.style.display = "none";
        
        // Scroll to loading spinner
        loadingScreen.scrollIntoView({ behavior: "smooth" });

        const steps = [
            document.getElementById("step-1"),
            document.getElementById("step-2"),
            document.getElementById("step-3")
        ];
        
        steps.forEach(s => s.className = "step");
        steps[0].classList.add("active");
        
        setTimeout(() => {
            steps[0].className = "step done";
            steps[1].classList.add("active");
        }, 700);

        setTimeout(() => {
            steps[1].className = "step done";
            steps[2].classList.add("active");
        }, 1400);

        const fetchOptions = {
            method: "POST",
            body: payload,
            headers: isJson ? { "Content-Type": "application/json" } : {}
        };

        fetch("/api/predict", fetchOptions)
            .then(res => {
                if (!res.ok) throw new Error(`Server returned code: ${res.status}`);
                return res.json();
            })
            .then(data => {
                setTimeout(() => {
                    // Render Prediction values into Page 2 Result Page
                    renderDashboard(data);
                    
                    // Route directly to Page 2
                    navigateToPage("result");
                    
                    // Enable inputs
                    dropZone.style.pointerEvents = "auto";
                    if (btnStartCamera) btnStartCamera.disabled = false;
                }, 2000);
            })
            .catch(err => {
                console.error("API predict execution failed:", err);
                alert(`Error executing AI classification: ${err.message}`);
                resetIdentifier();
            });
    }

    function resetIdentifier() {
        if (loadingScreen) loadingScreen.style.display = "none";
        if (outputScreen) outputScreen.style.display = "none";
        dropZone.style.pointerEvents = "auto";
        if (btnStartCamera) btnStartCamera.disabled = false;
        if (fileInput) fileInput.value = "";
        currentInferenceProfile = null;
        stopCamera();
    }


    // ==========================================
    // 8. RENDER RESULTS DASHBOARD VIEWS
    // ==========================================
    function renderDashboard(data) {
        const pred = data.prediction;
        const info = data.botanical;
        const color = info.color || "#157347";
        
        currentInferenceProfile = { botanical: info, prediction: pred };

        // 1. Core Card Details
        document.getElementById("res-flower-image").src = data.images.original;
        document.getElementById("res-flower-emoji").innerText = info.emoji || "🌸";
        document.getElementById("res-flower-name").innerText = pred.flower_name;
        document.getElementById("res-scientific-subtitle").innerText = info.scientific_name || "Species unknown";
        
        // 2. Badges
        const toxicity = info.toxicity || "Unknown";
        const rarity = info.rarity || "Common";
        const toxicClass = (toxicity.toLowerCase().includes("toxic") && !toxicity.toLowerCase().includes("non-toxic")) ? "badge-danger" : "";
        
        const badgeRarity = document.getElementById("res-badge-rarity");
        badgeRarity.innerText = `Rarity: ${rarity}`;
        badgeRarity.style.borderColor = color;
        badgeRarity.style.color = color;
        
        const badgeToxicity = document.getElementById("res-badge-toxicity");
        badgeToxicity.innerText = `Toxicity: ${toxicity}`;
        badgeToxicity.className = `badge-custom ${toxicClass}`;
        
        const badgeEngine = document.getElementById("res-badge-engine");
        badgeEngine.innerText = pred.model;

        // 3. Taxonomy Profile
        const taxCommon = document.getElementById("res-tax-common");
        if (taxCommon) taxCommon.innerText = pred.flower_name;
        document.getElementById("res-tax-scientific").innerText = info.scientific_name || "N/A";
        document.getElementById("res-tax-family").innerText = info.family || "N/A";
        document.getElementById("res-tax-origin").innerText = info.origin || "N/A";
        document.getElementById("res-tax-season").innerText = info.bloom_season || "N/A";

        // 4. Slider Map overlays reset
        document.getElementById("res-img-orig").src = data.images.original;
        document.getElementById("res-img-grad").src = data.images.gradcam;
        
        const gradOverlay = document.getElementById("res-img-grad-box");
        const sliderHandle = document.getElementById("slider-handle");
        gradOverlay.style.width = "50%";
        sliderHandle.style.left = "50%";

        const percentage = Math.round(pred.confidence);
        document.getElementById("res-confidence-label").innerText = `${percentage}% Confidence`;

        // Confidence ring animation
        const resPctText = document.getElementById("res-percentage-text");
        if (resPctText) resPctText.innerText = `${percentage}%`;

        const circlePath = document.getElementById("res-circle-path");
        if (circlePath) {
            circlePath.style.stroke = percentage < 50 ? "#dc3545" : percentage < 75 ? "#d97706" : color;
            circlePath.style.strokeDasharray = `${percentage}, 100`;
        }

        // Animate the confidence label colour dynamically
        const confLabel = document.getElementById("res-confidence-label");
        if (confLabel) {
            confLabel.style.color = percentage < 50 ? "#dc3545" : percentage < 75 ? "#d97706" : color;
        }

        // 5. Model explanation
        document.getElementById("res-model-summary").innerText = `The model analyzed spatial patterns, texture layers, and bloom borders. Classified as ${pred.flower_name} using ${pred.model} with ${percentage}% confidence in ${pred.processing_time}ms.`;

        // 6. Favorites State button
        updateFavoriteButtonState(isFavorite(pred.flower_name));
        
        const btnFav = document.getElementById("btn-result-fav-toggle");
        btnFav.onclick = () => {
            toggleFavorite(pred.flower_name, info, pred);
        };

        // 6b. Low Confidence Warning + 'Did you mean?' Suggestions
        const warningBanner = document.getElementById("res-warning-banner");
        const suggestionsBox = document.getElementById("alternative-suggestions-box");
        const suggestionsList = document.getElementById("alternative-suggestions-list");

        const isLowConf = percentage < 50;

        if (warningBanner) {
            warningBanner.style.display = isLowConf ? "block" : "none";
        }

        if (suggestionsBox && suggestionsList) {
            if (isLowConf && pred.top5 && pred.top5.length > 1) {
                suggestionsBox.style.display = "block";
                suggestionsList.innerHTML = "";

                // Show all top-5 except index 0 (the current prediction)
                const alternatives = pred.top5.slice(1).filter(item => item[1] > 1.0);

                if (alternatives.length === 0) {
                    suggestionsList.innerHTML = `<div class="history-empty" style="padding:1rem;">No strong alternatives found.</div>`;
                } else {
                    alternatives.forEach(altItem => {
                        const altName = altItem[0];
                        const altConf = Math.round(altItem[1] * 10) / 10;
                        const div = document.createElement("div");
                        div.className = "similar-row suggestion-selectable";
                        div.style.cssText = "cursor: pointer; transition: background 0.2s;";
                        div.innerHTML = `
                            <div class="similar-meta">
                                <strong>${altName}</strong>
                                <span style="font-size:0.8rem; color: var(--text-editorial-gray);">Alternative Species Match</span>
                            </div>
                            <span class="similar-pct" style="background: var(--accent-gold-light, #fef9e7); color: var(--accent-gold, #d97706); border: 1px solid var(--accent-gold, #d97706)30; padding: 0.25rem 0.65rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">${altConf}%</span>
                        `;
                        div.addEventListener("mouseenter", () => div.style.background = "var(--bg-hover, rgba(0,0,0,0.04))");
                        div.addEventListener("mouseleave", () => div.style.background = "");
                        div.addEventListener("click", () => {
                            // Fetch the full profile for the selected alternative
                            fetch(`/api/flower-details/${encodeURIComponent(altName)}`)
                                .then(r => r.json())
                                .then(altData => {
                                    if (altData.error) { console.error(altData.error); return; }
                                    renderDashboard(altData);
                                })
                                .catch(err => console.error("Alternative fetch failed:", err));
                        });
                        suggestionsList.appendChild(div);
                    });
                }
            } else {
                suggestionsBox.style.display = "none";
            }
        }

        // 7. Top-5 Graph bars
        const chartContainer = document.getElementById("bar-chart-bars");
        if (chartContainer) {
            chartContainer.innerHTML = "";
            pred.top5.forEach(barItem => {
                const name = barItem[0].charAt(0).toUpperCase() + barItem[0].slice(1);
                const conf = Math.round(barItem[1] * 10) / 10;
                
                const barRow = document.createElement("div");
                barRow.className = "bar-row";
                barRow.innerHTML = `
                    <div class="bar-labels">
                        <span class="bar-class-name">${name}</span>
                        <span class="bar-class-value">${conf}%</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: 0%; background: ${color};"></div>
                    </div>
                `;
                chartContainer.appendChild(barRow);
                
                setTimeout(() => {
                    barRow.querySelector(".bar-fill").style.width = `${conf}%`;
                }, 100);
            });
        }

        // 8. Care Guide Coordinates
        const guide = info.care_guide || {};
        document.getElementById("res-care-sun").innerText = guide.sunlight || "N/A";
        document.getElementById("res-care-water").innerText = guide.watering || "N/A";
        document.getElementById("res-care-fert").innerText = guide.fertilizer || "N/A";
        document.getElementById("res-care-prune").innerText = guide.pruning || "N/A";
        document.getElementById("res-care-diseases").innerText = guide.diseases || "N/A";
        document.getElementById("res-care-pests").innerText = guide.pests || "N/A";

        // 9. Botanical Encyclopedia Lists
        const descPara = document.getElementById("res-flower-desc");
        if (descPara) descPara.innerText = info.description || "No description cataloged.";

        const usesList = document.getElementById("res-uses-list");
        usesList.innerHTML = "";
        (info.uses || []).forEach(use => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="checklist-icon">🌿</span> <span>${use}</span>`;
            usesList.appendChild(li);
        });

        const factsList = document.getElementById("res-facts-list");
        factsList.innerHTML = "";
        (info.fun_facts || []).forEach(fact => {
            const li = document.createElement("li");
            li.innerHTML = `<span class="checklist-icon">ℹ️</span> <span>${fact}</span>`;
            factsList.appendChild(li);
        });

        document.getElementById("res-spec-habitat").innerText = info.habitat || "Fields and grasslands";
        document.getElementById("res-spec-native").innerText = info.native_region || "Various zones";

        // 10. Related Images Carousel Layout
        const carousel = document.getElementById("res-carousel-feed");
        carousel.innerHTML = "";
        
        const images = info.related_images || [];
        if (images.length > 0) {
            images.forEach(imgUrl => {
                const card = document.createElement("div");
                card.className = "carousel-item";
                card.innerHTML = `
                    <img src="${imgUrl}" alt="${pred.flower_name} visual similarity">
                    <span class="carousel-item-caption">Visually Similar Specimen</span>
                `;
                
                // Add click tap-to-enlarge lightbox trigger
                card.addEventListener("click", () => {
                    lightboxImg.src = imgUrl;
                    lightboxCaption.innerText = `${pred.flower_name} - Visual Similarity Reference Capture`;
                    lightboxModal.style.display = "flex";
                });
                
                carousel.appendChild(card);
            });
        } else {
            carousel.innerHTML = `<div class="history-empty">No visual similarities cached.</div>`;
        }

        // 11. Similar Related Species List
        const speciesGrid = document.getElementById("res-similar-species-grid");
        speciesGrid.innerHTML = "";
        
        const related = info.related_species || [];
        if (related.length > 0) {
            related.forEach(spec => {
                const div = document.createElement("div");
                div.className = "similar-row";
                div.innerHTML = `
                    <div class="similar-meta">
                        <strong>${spec.name}</strong>
                        <span>${spec.scientific_name}</span>
                    </div>
                    <span class="similar-pct">${spec.similarity}% Match</span>
                `;
                speciesGrid.appendChild(div);
            });
        } else {
            speciesGrid.innerHTML = `<div class="history-empty">No similar species cataloged in fallback logs.</div>`;
        }

        // 12. Local caches sync
        updateHomeAndSidebarStats(data.session_stats);
        
        // Report text trigger
        document.getElementById("btn-result-report").onclick = () => {
            downloadReportTextFile(pred, info);
        };
    }


    // ==========================================
    // 9. LIGHTBOX MODAL EVENT LISTENERS
    // ==========================================
    if (btnLightboxClose) {
        btnLightboxClose.addEventListener("click", () => {
            lightboxModal.style.display = "none";
        });
    }

    if (lightboxModal) {
        lightboxModal.addEventListener("click", (e) => {
            if (e.target === lightboxModal) {
                lightboxModal.style.display = "none";
            }
        });
    }


    // ==========================================
    // 10. INTERACTIVE GRAD-CAM COMPARING SLIDER
    // ==========================================
    const sliderContainer = document.getElementById("saliency-slider-container");
    const sliderHandle = document.getElementById("slider-handle");
    const gradOverlayBox = document.getElementById("res-img-grad-box");
    const gradImg = document.getElementById("res-img-grad");
    
    let isDragging = false;
    
    if (sliderHandle && sliderContainer) {
        sliderHandle.addEventListener("mousedown", (e) => {
            e.preventDefault();
            isDragging = true;
        });
        
        window.addEventListener("mouseup", () => isDragging = false);
        
        window.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            moveSlider(e.clientX);
        });
        
        // Touch supports
        sliderHandle.addEventListener("touchstart", () => isDragging = true);
        window.addEventListener("touchend", () => isDragging = false);
        window.addEventListener("touchmove", (e) => {
            if (!isDragging) return;
            if (e.touches.length > 0) {
                moveSlider(e.touches[0].clientX);
            }
        });
        
        function moveSlider(clientX) {
            const rect = sliderContainer.getBoundingClientRect();
            let offset = clientX - rect.left;
            
            if (offset < 0) offset = 0;
            if (offset > rect.width) offset = rect.width;
            
            const pct = (offset / rect.width) * 100;
            
            gradOverlayBox.style.width = `${pct}%`;
            sliderHandle.style.left = `${pct}%`;
            gradImg.style.width = `${rect.width}px`;
        }
        
        window.addEventListener("resize", () => {
            const rect = sliderContainer.getBoundingClientRect();
            gradImg.style.width = `${rect.width}px`;
        });
    }


    // ==========================================
    // 11. TEXT REPORT COMPILER
    // ==========================================
    function downloadReportTextFile(pred, info) {
        const guide = info.care_guide || {};
        let content = `==================================================
🌸 INTELLIFLORA BOTANICAL ANALYSIS REPORT
==================================================
Generated on: ${new Date().toLocaleString()}
Predicted Species: ${pred.flower_name}
Confidence Rating: ${pred.confidence}%
Neural Network Model: ${pred.model}
Inference Latency: ${pred.processing_time} ms

TAXONOMY & PROPERTIES
--------------------------------------------------
Scientific Name: ${info.scientific_name || 'N/A'}
Botanical Family: ${info.family || 'N/A'}
Bloom Season: ${info.bloom_season || 'N/A'}
Rarity Status: ${info.rarity || 'N/A'}
Toxicity Status: ${info.toxicity || 'N/A'}
Geographic Origin: ${info.origin || 'N/A'}

CULTIVATION & CARE GUIDELINES
--------------------------------------------------
- Sunlight: ${guide.sunlight || 'N/A'}
- Watering: ${guide.watering || 'N/A'}
- Fertilizer: ${guide.fertilizer || 'N/A'}
- Pruning: ${guide.pruning || 'N/A'}
- Common Diseases: ${guide.diseases || 'N/A'}
- Common Pests: ${guide.pests || 'N/A'}

ECONOMIC & MEDICINAL USES
--------------------------------------------------
`;
        (info.uses || []).forEach(use => {
            content += `- ${use}\n`;
        });
        
        content += `\nSCIENTIFIC FUN FACTS\n--------------------------------------------------\n`;
        (info.fun_facts || []).forEach(fact => {
            content += `- ${fact}\n`;
        });
        
        content += `\n==================================================\nInference powered by Google Gemini and IntelliFlora Web UI.`;
        
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `IntelliFlora_Report_${pred.flower_name.toLowerCase().replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
