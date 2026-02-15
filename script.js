const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com';
const POKEAPI_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const BALL_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

let currentUserId = localStorage.getItem('currentUserId');
let currentUsername = localStorage.getItem('currentUsername');
let favoritePokes = JSON.parse(localStorage.getItem('favoritePokes')) || [];

let currentPage = 1;
const itemsPerPage = 20; // RÉDUIT de 50 à 20 pour mobile
let cachedPokedexData = null;
let currentGen = 1;
let currentCompanionId = null;

// ========== OPTIMISATION 1 : LAZY LOADING DES IMAGES ==========
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src) {
                img.src = src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        }
    });
}, {
    rootMargin: '50px' // Charge les images 50px avant qu'elles soient visibles
});

function lazyLoadImage(imgElement) {
    imageObserver.observe(imgElement);
}

// ========== OPTIMISATION 2 : DEBOUNCE POUR LIMITER LES APPELS ==========
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== OPTIMISATION 3 : CACHE INTELLIGENT AVEC EXPIRATION ==========
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function setCache(key, data) {
    try {
        const cacheObj = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(key, JSON.stringify(cacheObj));
    } catch (e) {
        console.warn('Cache localStorage plein, nettoyage...');
        // Si le cache est plein, on garde seulement le Pokédex
        const pokedexCache = localStorage.getItem('pokedex_data_cache');
        localStorage.clear();
        if (pokedexCache) localStorage.setItem('pokedex_data_cache', pokedexCache);
        localStorage.setItem('currentUserId', currentUserId);
        localStorage.setItem('currentUsername', currentUsername);
        localStorage.setItem('favoritePokes', JSON.stringify(favoritePokes));
    }
}

function getCache(key) {
    try {
        const cached = localStorage.getItem(key);
        if (!cached) return null;
        
        const cacheObj = JSON.parse(cached);
        const age = Date.now() - cacheObj.timestamp;
        
        if (age > CACHE_DURATION) {
            localStorage.removeItem(key);
            return null;
        }
        
        return cacheObj.data;
    } catch (e) {
        return null;
    }
}

function getPokemonSprite(p) {
    // --- 1. PRIORITÉ : POKÉMON WTF (Vaudou, Magma, etc.) ---
    if (p.isCustom && p.customSprite) {
        return `assets/sprites/custom/${p.customSprite}`;
    }

    // --- 2. LOGIQUE MÉGA (Ta fonction originale) ---
    const isShiny = p.isShiny;
    const isMega = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
    
    if (isMega) {
        let nameLower = p.name.toLowerCase();
        let suffix = "";
        if (nameLower.includes(' x')) suffix = "x";
        if (nameLower.includes(' y')) suffix = "y";
        
        let baseName = nameLower
            .replace(/[éèêë]/g, 'e')
            .replace('méga-', '')
            .replace('mega-', '')
            .replace(' x', '')
            .replace(' y', '')
            .trim();

        const translations = { 
            "florizarre": "venusaur", "dracaufeu": "charizard", "tortank": "blastoise",
            "dardargnan": "beedrill", "roucarnage": "pidgeot", "alakazam": "alakazam",
            "flagadoss": "slowbro", "ectoplasma": "gengar", "kangourex": "kangaskhan",
            "scarabrute": "pinsir", "leviator": "gyarados", "ptera": "aerodactyl",
            "mewtwo": "mewtwo", "pharamp": "ampharos", "steelix": "steelix", "cizayox": "scizor",
            "scarhino": "heracross", "demolosse": "houndoom", "tyranocif": "tyranitar",
            "jungleko": "sceptile", "brasegali": "blaziken", "laggron": "swampert",
            "gardevoir": "gardevoir", "tenefix": "sableye", "mysdibule": "mawhile",
            "galeking": "aggron", "charmina": "medicham", "elecsprint": "manectric",
            "sharpedo": "sharpedo", "camerupt": "camerupt", "altaria": "altaria",
            "branette": "banette", "absol": "absol", "oniglali": "glalie",
            "drattak": "salamence", "metalosse": "metagross", "latias": "latias",
            "latios": "latios", "rayquaza": "rayquaza", "lockpin": "lopunny", 
            "carchacrok": "garchomp", "lucario": "lucario", "blizzaroi": "abomasnow", 
            "gallame": "gallade", "nanmeouie": "audino", "diancie": "diancie"
        };

        const englishName = translations[baseName] || baseName;
        const megaType = suffix ? `mega${suffix}` : `mega`;
        
        // Retourne le GIF animé de Showdown
        return `https://play.pokemonshowdown.com/sprites/ani${isShiny ? '-shiny' : ''}/${englishName}-${megaType}.gif`;
    }

    // --- 3. LOGIQUE CLASSIQUE ---
    return `${POKEAPI_URL}${isShiny ? 'shiny/' : ''}${p.pokedexId}.png`;
}

// --- INITIALISATION ---
function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('discordId')) {
        currentUserId = urlParams.get('discordId');
        currentUsername = decodeURIComponent(urlParams.get('username'));
        localStorage.setItem('currentUserId', currentUserId);
        localStorage.setItem('currentUsername', currentUsername);
        history.pushState(null, '', window.location.pathname);
    }
    if (currentUserId) {
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('logged-in-user').style.display = 'flex';
        document.getElementById('logged-out-user').style.display = 'none';
        document.getElementById('display-username').textContent = currentUsername;
        loadPokedex();
    }
}

// --- NAVIGATION ---
function showPage(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`${id}-page`);
    if(target) target.classList.add('active');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`nav-${id}`);
    if(btn) btn.classList.add('active');

    if(id === 'shop') loadShop();
    if(id === 'profile') loadProfile();
    if(id === 'pokedex' || id === 'collection' || id === 'home') loadPokedex();
    if(id === 'gallery') loadGallery();
}

function filterGen(gen) {
    currentGen = gen;
    currentPage = 1;
    document.querySelectorAll('.gen-content').forEach(c => c.classList.remove('active'));
    const targetGen = document.getElementById(`gen-${gen}`);
    if(targetGen) targetGen.classList.add('active');
    
    document.querySelectorAll('#gen-tabs button').forEach(b => b.classList.remove('active'));
    if(event && event.target) {
        const btn = event.target.closest('button');
        if(btn) btn.classList.add('active');
    }
    renderPokedexGrid();
}

function changePage(step) {
    currentPage += step;
    renderPokedexGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== OPTIMISATION 4 : RENDER OPTIMISÉ AVEC LAZY LOADING ==========
function renderPokedexGrid() {
    if (!cachedPokedexData) return;

    const genPokes = cachedPokedexData.fullPokedex.filter(p => {
        if (currentGen === 1) return p.pokedexId <= 151;
        if (currentGen === 2) return p.pokedexId > 151 && p.pokedexId <= 251;
        if (currentGen === 3) return p.pokedexId > 251 && p.pokedexId <= 386;
        if (currentGen === 4) return p.pokedexId > 386 && p.pokedexId <= 493;
        if (currentGen === 5) return p.pokedexId > 493 && p.pokedexId <= 649;
        if (currentGen === 6) return p.pokedexId > 649 && p.pokedexId <= 721;
        return false;
    });

    const totalPages = Math.ceil(genPokes.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pokesToShow = genPokes.slice(start, end);

    const grid = document.getElementById(`grid-${currentGen}`);
    if (grid) {
        grid.innerHTML = '';
        pokesToShow.forEach(p => {
            if (p.isCaptured) p.isCompanion = (p._id === currentCompanionId);
            grid.innerHTML += createCard(p, 'pokedex');
        });
        
        // LAZY LOAD toutes les images après le render
        requestAnimationFrame(() => {
            grid.querySelectorAll('img[data-src]').forEach(img => lazyLoadImage(img));
        });
    }

    const pageInfo = document.getElementById('page-info');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    
    if (pageInfo) pageInfo.innerText = `Page ${currentPage} / ${totalPages}`;
    if (btnPrev) btnPrev.disabled = (currentPage === 1);
    if (btnNext) btnNext.disabled = (currentPage === totalPages || totalPages === 0);
}

// --- LOGIQUE PRIX ---
function calculatePrice(p) {
    const levelBonus = (p.level || 5) * 5;
    const shinyBonus = p.isShiny ? 250 : 0;
    const totalIVs = (p.iv_hp || 0) + (p.iv_attack || 0) + (p.iv_defense || 0) + (p.iv_sp_attack || 0) + (p.iv_sp_defense || 0) + (p.iv_speed || 0);
    const ivBonus = Math.floor(totalIVs / 1.5); 
    return 50 + levelBonus + shinyBonus + ivBonus;
}

// --- AJOUTÉ : GESTION DES FAVORIS ---
async function toggleFav(id) {
    const idx = favoritePokes.indexOf(id);
    if (idx > -1) {
        favoritePokes.splice(idx, 1);
    } else {
        if (favoritePokes.length >= 5) {
            alert("Ton équipe est déjà complète (5 Pokémon max) !");
            return;
        }
        favoritePokes.push(id);
    }

    localStorage.setItem('favoritePokes', JSON.stringify(favoritePokes));
    
    if (currentUserId) {
        try {
            await fetch(`${API_BASE_URL}/api/profile/update-favorites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, favorites: favoritePokes })
            });
        } catch (e) { console.error("Erreur sauvegarde favoris:", e); }
    }

    // OPTIMISATION : On ne reload que si on est sur la page profil/galerie
    const activePage = document.querySelector('.page-section.active');
    if (activePage && (activePage.id === 'profile-page' || activePage.id === 'gallery-page')) {
        loadProfile();
    }
    
    // Mise à jour visuelle immédiate sans reload
    const card = document.querySelector(`[data-pokemon-id="${id}"]`);
    if (card) {
        const heart = card.querySelector('.companion-btn');
        if (heart) {
            heart.textContent = favoritePokes.includes(id) ? '⭐' : '☆';
            heart.classList.toggle('active', favoritePokes.includes(id));
        }
    }
}

// ========== OPTIMISATION 5 : CRÉATION DE CARTES AVEC LAZY LOADING ==========
function createCard(p, context) {
    const spriteUrl = getPokemonSprite(p);
    const price = calculatePrice(p);
    const isFavorite = favoritePokes.includes(p._id);
    
    // LAZY LOADING : on met l'URL dans data-src au lieu de src
    const imgTag = p.isCaptured 
        ? `<img class="poke-sprite" data-src="${spriteUrl}" alt="${p.name}" loading="lazy" style="background: #f0f0f0;">` 
        : `<img class="poke-sprite" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999' font-size='40'%3E?%3C/text%3E%3C/svg%3E" alt="???" loading="lazy">`;

    let classes = 'pokedex-card';
    if (p.isShiny) classes += ' is-shiny';
    if (p.isMega) classes += ' is-mega';
    if (!p.isCaptured) classes += ' missing';

    let actions = '';
    if (context === 'pokedex') {
        actions = p.isCaptured ? `
            <button class="companion-btn ${isFavorite ? 'active' : ''}" onclick="toggleFav('${p._id}')" title="Favoris">${isFavorite ? '⭐' : '☆'}</button>
        ` : '';
    } else if (context === 'collection' && !p.isCompanion) {
        actions = `
            <button class="btn-action btn-sell" onclick="sellPoke('${p._id}','${p.name}',${price})">Vendre ${price} 💰</button>
            <button class="btn-action btn-trade" onclick="wonderTrade('${p._id}','${p.name}')">Échange Miracle</button>
        `;
    }

    return `
    <div class="${classes}" data-pokemon-id="${p._id}">
        ${actions}
        ${imgTag}
        <p style="margin:5px 0; font-weight:bold; color:var(--text-primary);">${p.name}</p>
        ${p.isCaptured ? `
            <small style="color:var(--text-secondary);">Niv. ${p.level || '?'}</small>
            ${p.isShiny ? '<div style="color:var(--shiny); font-size:0.9em;">✨ Chromatique</div>' : ''}
            ${p.isMega ? '<div style="color:#ff00ff; font-size:0.9em;">🔥 MÉGA</div>' : ''}
            ${p.isCustom ? '<div style="color:#00ffff; font-size:0.9em; text-shadow: 0 0 5px rgba(0,255,255,0.5);">🌀 WTF</div>' : ''}
        ` : ''}
    </div>`;
}

// ========== OPTIMISATION 6 : LOAD POKEDEX AVEC CACHE INTELLIGENT ==========
async function loadPokedex() {
    // Vérifier le cache d'abord
    const cached = getCache('pokedex_data_cache');
    if (cached) {
        cachedPokedexData = cached;
        currentCompanionId = cached.companion?._id || null;
        renderPokedexGrid();
        displayFeatured();
        displayCollections();
        updateCompanionDisplay();
        return;
    }

    // Si pas de cache, charger depuis l'API avec loading indicator
    const grids = document.querySelectorAll('.pokedex-grid');
    grids.forEach(g => g.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">Chargement... 🔄</p>');

    try {
        const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await res.json();
        
        cachedPokedexData = data;
        currentCompanionId = data.companion?._id || null;
        
        // Sauvegarder dans le cache
        setCache('pokedex_data_cache', data);
        
        renderPokedexGrid();
        displayFeatured();
        displayCollections();
        updateCompanionDisplay();
    } catch (e) {
        console.error('Erreur chargement Pokédex:', e);
        grids.forEach(g => g.innerHTML = '<p style="color:var(--red-poke);">Erreur de chargement</p>');
    }
}

function updateCompanionDisplay() {
    if (!cachedPokedexData?.companion) {
        document.getElementById('companion-display').style.display = 'none';
        return;
    }
    const c = cachedPokedexData.companion;
    document.getElementById('companion-img').src = getPokemonSprite(c);
    document.getElementById('companion-img').style.display = 'block';
    document.getElementById('companion-name').textContent = c.name;
    document.getElementById('companion-display').style.display = 'flex';
}

function displayFeatured() {
    if (!cachedPokedexData) return;
    const grid = document.getElementById('featured-pokemon');
    if (!grid) return;

    const statSeen = document.getElementById('stat-seen');
    const statCaught = document.getElementById('stat-caught');
    const statShiny = document.getElementById('stat-shiny');

    if (statSeen) statSeen.textContent = cachedPokedexData.stats.seen;
    if (statCaught) statCaught.textContent = cachedPokedexData.stats.captured;
    if (statShiny) statShiny.textContent = cachedPokedexData.stats.shiny;

    const captured = cachedPokedexData.fullPokedex.filter(p => p.isCaptured);
    if (captured.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-secondary);">Aucun Pokémon capturé</p>';
        return;
    }

    const featured = captured.sort(() => 0.5 - Math.random()).slice(0, 6);
    grid.innerHTML = '';
    featured.forEach(p => {
        grid.innerHTML += createCard(p, 'featured');
    });
    
    // Lazy load
    requestAnimationFrame(() => {
        grid.querySelectorAll('img[data-src]').forEach(img => lazyLoadImage(img));
    });
}

function displayCollections() {
    if (!cachedPokedexData) return;

    const shinyPokes = cachedPokedexData.fullPokedex.filter(p => p.isCaptured && p.isShiny);
    const megaPokes = cachedPokedexData.fullPokedex.filter(p => p.isCaptured && p.isMega);
    const wtfPokes = cachedPokedexData.fullPokedex.filter(p => p.isCaptured && p.isCustom);
    
    const captured = cachedPokedexData.fullPokedex.filter(p => p.isCaptured);
    const idCounts = {};
    captured.forEach(p => {
        const key = `${p.pokedexId}-${p.isShiny ? 'shiny' : 'normal'}`;
        idCounts[key] = (idCounts[key] || 0) + 1;
    });
    const duplicates = captured.filter(p => {
        const key = `${p.pokedexId}-${p.isShiny ? 'shiny' : 'normal'}`;
        return idCounts[key] > 1 && !p.isCompanion && !favoritePokes.includes(p._id);
    });

    function renderCollection(pokes, gridId) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        if (pokes.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-secondary); text-align:center;">Aucun Pokémon de ce type</p>';
            return;
        }
        grid.innerHTML = '';
        pokes.forEach(p => {
            grid.innerHTML += createCard(p, 'collection');
        });
        // Lazy load
        requestAnimationFrame(() => {
            grid.querySelectorAll('img[data-src]').forEach(img => lazyLoadImage(img));
        });
    }

    renderCollection(shinyPokes, 'shiny-grid');
    renderCollection(megaPokes, 'mega-grid');
    renderCollection(wtfPokes, 'wtf-grid');
    renderCollection(duplicates, 'duplicate-grid');
}

// ========== OPTIMISATION 7 : LOAD PROFILE AVEC CACHE ==========
async function loadProfile() {
    const container = document.getElementById('profileContainer');
    if (!container) return;

    // Essayer le cache d'abord
    let data = getCache(`profile_${currentUserId}`);
    
    if (!data) {
        container.innerHTML = '<p style="text-align:center;">Chargement... 🔄</p>';
        try {
            const res = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
            data = await res.json();
            setCache(`profile_${currentUserId}`, data);
        } catch (e) {
            container.innerHTML = '<p style="color:var(--red-poke);">Erreur chargement profil</p>';
            return;
        }
    }

    const balls = data.user.pokeballs || 0;
    const greatballs = data.user.greatballs || 0;
    const ultraballs = data.user.ultraballs || 0;
    const masterballs = data.user.masterballs || 0;
    const safariballs = data.user.safariballs || 0;
    const premierballs = data.user.premierballs || 0;
    const luxuryballs = data.user.luxuryballs || 0;
    const ellbaballs = data.user.ellbaballs || 0;

    const evoHtml = data.evolutionCheck ? `
        <div style="margin-top:20px; padding:15px; background:var(--header-bg); border-radius:15px; border:1px solid var(--highlight);">
            <p style="color:var(--highlight); font-weight:bold;">🎉 Ton compagnon peut évoluer en ${data.evolutionCheck.nextName} !</p>
            <button class="cta-button" onclick="evolveCompanion(${data.evolutionCheck.nextId}, '${data.evolutionCheck.nextName}')">Faire évoluer 🚀</button>
        </div>
    ` : '';

    const teamHtml = favoritePokes.length > 0 ? `
        <h3 style="margin-top:30px; color:var(--highlight);">⭐ Mon Équipe Favorite</h3>
        <div class="pokedex-grid">${
            data.user.pokemons.filter(p => favoritePokes.includes(p._id)).map(p => createCard(p, 'team')).join('')
        }</div>
    ` : '<p style="margin-top:20px; color:var(--text-sec);">Ajoute des Pokémon à ton équipe favorite depuis l\'encyclopédie !</p>';

    container.innerHTML = `
        <div class="stat-box">
            <h2 style="color:var(--highlight); margin-top:0;">👤 Profil de ${data.user.username}</h2>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:15px; margin-top:20px;">
                <div style="background:var(--card-bg); padding:15px; border-radius:15px; text-align:center;">
                    <h4 style="margin:0; color:var(--text-sec);">💰 Argent</h4>
                    <p style="font-size:1.5em; font-weight:bold; color:var(--shiny); margin:10px 0 0;">${data.user.money || 0}</p>
                </div>
                <div style="background:var(--card-bg); padding:15px; border-radius:15px; text-align:center;">
                    <h4 style="margin:0; color:var(--text-sec);">👀 Vus</h4>
                    <p style="font-size:1.5em; font-weight:bold; color:var(--highlight); margin:10px 0 0;">${data.stats.seen}</p>
                </div>
                <div style="background:var(--card-bg); padding:15px; border-radius:15px; text-align:center;">
                    <h4 style="margin:0; color:var(--text-sec);">⚡ Capturés</h4>
                    <p style="font-size:1.5em; font-weight:bold; color:var(--highlight); margin:10px 0 0;">${data.stats.captured}</p>
                </div>
                <div style="background:var(--card-bg); padding:15px; border-radius:15px; text-align:center;">
                    <h4 style="margin:0; color:var(--text-sec);">✨ Shinies</h4>
                    <p style="font-size:1.5em; font-weight:bold; color:var(--shiny); margin:10px 0 0;">${data.stats.shiny}</p>
                </div>
            </div>
            ${evoHtml}
            ${teamHtml}
            <h3 style="margin-top:30px; color:var(--text-sec);">📦 Inventaire de Balls</h3>
            <div class="ball-inventory">
                <div class="ball-item"><img src="${BALL_URL}poke-ball.png"><p>Poké Ball<br><b>${balls}</b></p></div>
                <div class="ball-item"><img src="${BALL_URL}great-ball.png"><p>Super Ball<br><b>${greatballs}</b></p></div>
                <div class="ball-item"><img src="${BALL_URL}ultra-ball.png"><p>Hyper Ball<br><b>${ultraballs}</b></p></div>
                <div class="ball-item"><img src="${BALL_URL}master-ball.png"><p>Master Ball<br><b>${masterballs}</b></p></div>
                <div class="ball-item"><img src="${BALL_URL}safari-ball.png"><p>Safari Ball<br><b>${safariballs}</b></p></div>
                <div class="ball-item"><img src="${BALL_URL}premier-ball.png"><p>Honor Ball<br><b>${premierballs}</b></p></div>
                <div class="ball-item"><img src="${BALL_URL}luxury-ball.png"><p>Luxe Ball<br><b>${luxuryballs}</b></p></div>
            </div>
        </div>
    `;
    
    // Lazy load team images
    requestAnimationFrame(() => {
        container.querySelectorAll('img[data-src]').forEach(img => lazyLoadImage(img));
    });
}

async function evolveCompanion(nextId, nextName) {
    const res = await fetch(`${API_BASE_URL}/api/evolve-companion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, newId: nextId, newName: nextName })
    });
    if (res.ok) {
        localStorage.removeItem('pokedex_data_cache');
        localStorage.removeItem(`profile_${currentUserId}`);
        loadPokedex();
        loadProfile();
    }
}

async function loadShop() {
    const container = document.getElementById('shopContainer');
    if (!container) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/user/${currentUserId}`);
        const data = await res.json();
        document.getElementById('shop-money').textContent = (data.money || 0).toLocaleString();

        const items = await fetch(`${API_BASE_URL}/api/shop/items`).then(r => r.json());
        const shopHtml = items.map(item => `
            <div class="pokedex-card" style="padding:20px;">
                <img src="${BALL_URL}${item.imageFragment}" style="width:60px; height:60px; margin:10px auto;">
                <h4 style="margin:10px 0 5px; color:var(--highlight);">${item.name}</h4>
                <p style="font-size:0.85em; color:var(--text-sec); margin:5px 0;">${item.desc}</p>
                <input type="number" id="qty-${item.key}" min="1" value="1" style="width:60px; padding:5px; margin:10px 0; border-radius:8px; border:1px solid var(--border); background:var(--background); color:var(--text-main); text-align:center;">
                <button class="cta-button" onclick="buyItem('${item.key}', document.getElementById('qty-${item.key}').value)" style="padding:8px 15px; font-size:0.9em;">Acheter</button>
            </div>
        `).join('');
        container.innerHTML = shopHtml;
    } catch (e) { container.innerHTML = "<p>Erreur boutique.</p>"; }
}

async function sellPoke(id, name, price) {
    if(!confirm(`Vendre ${name} pour ${price} 💰 ?`)) return;
    const res = await fetch(`${API_BASE_URL}/api/sell/pokemon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToSell: id })
    });
    if(res.ok) {
        localStorage.removeItem('pokedex_data_cache');
        localStorage.removeItem(`profile_${currentUserId}`);
        loadPokedex();
    }
}

async function wonderTrade(id, name) {
    if(!confirm(`Envoyer ${name} en Échange Miracle ?`)) return;
    const res = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToTrade: id })
    });
    const data = await res.json();
    
    if(res.ok) {
        const pk = data.newPokemon;
        document.getElementById('modal-img').src = getPokemonSprite(pk);
        
        let displayName = pk.name;
        if(pk.isMega) {
            displayName = `<span style="color: #e67e22;">🔥 ${pk.name} 🔥</span>`;
        }

        document.getElementById('modal-text').innerHTML = `Vous avez reçu : <b>${displayName}</b> !`;
        document.getElementById('trade-modal').style.display = 'flex';
        
        localStorage.removeItem('pokedex_data_cache');
        localStorage.removeItem(`profile_${currentUserId}`);
        loadPokedex();
    }
}

async function buyItem(key, qty) {
    const quantity = parseInt(qty);
    if (isNaN(quantity) || quantity <= 0) return alert("Quantité invalide");
    try {
        const res = await fetch(`${API_BASE_URL}/api/shop/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, itemKey: key, quantity: quantity })
        });
        const data = await res.json();
        if (!res.ok) alert("Erreur : " + (data.message || "Achat impossible"));
        else { 
            alert(data.message);
            localStorage.removeItem(`profile_${currentUserId}`);
            loadShop();
            loadProfile();
        }
    } catch (e) { console.error(e); }
}

async function getEvolutionData(pokedexId) {
    try {
        const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokedexId}/`);
        const speciesData = await speciesRes.json();
        const evoRes = await fetch(speciesData.evolution_chain.url);
        const evoData = await evoRes.json();
        let current = evoData.chain;
        while (current && current.species.name !== speciesData.name) {
            if (current.evolves_to.length > 0) current = current.evolves_to[0];
            else break;
        }
        if (current && current.evolves_to.length > 0) {
            const nextEvo = current.evolves_to[0];
            const details = nextEvo.evolution_details[0];
            if (details && details.trigger.name === "level-up" && details.min_level) {
                return { minLevel: details.min_level, nextId: nextEvo.species.url.split('/').filter(Boolean).pop(), nextName: nextEvo.species.name.charAt(0).toUpperCase() + nextEvo.species.name.slice(1) };
            }
        }
        return null; 
    } catch (e) { return null; }
}

async function postToGallery() {
    const message = document.getElementById('gallery-message').value;
    if (!message) return alert("Écris un petit message avant de publier !");
    if (favoritePokes.length === 0) return alert("Tu dois avoir au moins un Pokémon dans ton équipe favorite !");

    try {
        const res = await fetch(`${API_BASE_URL}/api/gallery/post`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                username: currentUsername,
                message: message,
                teamIds: favoritePokes
            })
        });
        if (res.ok) {
            document.getElementById('gallery-message').value = '';
            loadGallery();
        }
    } catch (e) { console.error("Erreur publication galerie:", e); }
}

// ========== OPTIMISATION 8 : GALLERY AVEC LAZY LOADING ==========
async function loadGallery() {
    const container = document.getElementById('gallery-container');
    const MY_ADMIN_ID = "1238112721984028706";

    try {
        const res = await fetch(`${API_BASE_URL}/api/gallery`);
        const posts = await res.json();
        
        container.innerHTML = posts.map(post => {
            const hasLiked = post.likes.includes(currentUserId);
            const deleteBtn = (currentUserId === MY_ADMIN_ID) 
                ? `<button onclick="deletePost('${post._id}')" style="background:none; border:none; color:var(--red-poke); cursor:pointer;">🗑️ Supprimer</button>` 
                : "";

            const teamImagesHtml = post.teamData.map(p => {
                const sprite = getPokemonSprite(p);
                return `<img data-src="${sprite}" title="${p.name}" style="width: 50px; background:#f0f0f0;" loading="lazy">`;
            }).join('');

            return `
            <div class="gallery-post" id="post-${post._id}">
                <div class="gallery-header">
                    <strong style="color: var(--discord);">${post.username}</strong>
                    <div>
                        ${deleteBtn}
                        <span style="font-size: 0.8em; color: var(--text-sec); margin-left:10px;">${new Date(post.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <p class="gallery-message">"${post.message}"</p>
                <div class="gallery-team">
                    ${teamImagesHtml}
                </div>
                <div style="margin-top:15px; border-top: 1px solid var(--border); padding-top:10px;">
                    <button onclick="likePost('${post._id}')" style="background:none; border:none; color:${hasLiked ? 'var(--red-poke)' : 'white'}; cursor:pointer; font-size:1.2em;">
                        ${hasLiked ? '❤️' : '🤍'} ${post.likes.length}
                    </button>
                </div>
            </div>`;
        }).join('');
        
        // Lazy load gallery images
        requestAnimationFrame(() => {
            container.querySelectorAll('img[data-src]').forEach(img => lazyLoadImage(img));
        });
    } catch (e) { console.error(e); }
}

// Fonctions d'action
async function likePost(postId) {
    await fetch(`${API_BASE_URL}/api/gallery/like`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ postId, userId: currentUserId })
    });
    loadGallery();
}

async function deletePost(postId) {
    if(!confirm("Supprimer cette publication ?")) return;
    const MY_ADMIN_ID = "1238112721984028706";

    await fetch(`${API_BASE_URL}/api/gallery/post/${postId}`, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ adminId: MY_ADMIN_ID })
    });
    loadGallery();
}

function refreshPokedexCache() {
    localStorage.removeItem('pokedex_data_cache');
    localStorage.removeItem(`profile_${currentUserId}`);
    loadPokedex();
    console.log("🔄 Cache vidé et données actualisées !");
}

function invalidatePokedexCache() {
    localStorage.removeItem('pokedex_data_cache');
    localStorage.removeItem(`profile_${currentUserId}`);
    loadPokedex();
}

function logout() { 
    localStorage.clear();
    location.reload();
}

document.addEventListener('DOMContentLoaded', initializeApp);
