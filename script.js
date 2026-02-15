const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com';
const POKEAPI_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const BALL_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

let currentUserId = localStorage.getItem('currentUserId');
let currentUsername = localStorage.getItem('currentUsername');
let favoritePokes = JSON.parse(localStorage.getItem('favoritePokes')) || [];

let currentPage = 1;
const itemsPerPage = 50; 
let cachedPokedexData = null;
let currentGen = 1;
let currentCompanionId = null;

// OPTIMISATION: Intersection Observer pour lazy loading des images
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        }
    });
}, {
    rootMargin: '50px' // Commence à charger 50px avant que l'image soit visible
});

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
        
        // OPTIMISATION: Observer les images après insertion
        grid.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
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
    
    try {
        await fetch(`${API_BASE_URL}/api/user/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, favorites: favoritePokes })
        });
    } catch (e) { console.error(e); }

    loadPokedex();
}

// --- CHARGEMENT PRINCIPAL ---
async function loadPokedex() {
    try {
        const cached = localStorage.getItem('pokedex_data_cache');
        if (cached) {
            cachedPokedexData = JSON.parse(cached);
            renderAll();
            return;
        }
        
        const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await res.json();
        
        cachedPokedexData = data;
        localStorage.setItem('pokedex_data_cache', JSON.stringify(data));
        
        renderAll();
    } catch (e) {
        console.error("Erreur chargement Pokédex:", e);
    }
}

function renderAll() {
    if (!cachedPokedexData) return;

    currentCompanionId = cachedPokedexData.companionId;
    favoritePokes = cachedPokedexData.favorites || [];
    localStorage.setItem('favoritePokes', JSON.stringify(favoritePokes));

    const companionPoke = cachedPokedexData.caughtPokemons.find(p => p._id === currentCompanionId);
    if (companionPoke) {
        const img = document.getElementById('companion-img');
        img.src = getPokemonSprite(companionPoke);
        img.style.display = 'inline-block';
        // OPTIMISATION: Ajout du loading lazy
        img.setAttribute('loading', 'lazy');
        document.getElementById('companion-name').textContent = companionPoke.name;
    }

    renderPokedexGrid();
    renderCollectionGrid();
    renderHomeStats();
}

function renderCollectionGrid() {
    if (!cachedPokedexData) return;
    
    const shinyPokes = cachedPokedexData.caughtPokemons.filter(p => p.isShiny && !p.isMega && !p.isCustom);
    const megaPokes = cachedPokedexData.caughtPokemons.filter(p => p.isMega);
    const wtfPokes = cachedPokedexData.caughtPokemons.filter(p => p.isCustom);
    const duplicatePokes = cachedPokedexData.caughtPokemons.filter(p => !p.isShiny && !p.isMega && !p.isCustom);

    const shinyGrid = document.getElementById('shiny-grid');
    const megaGrid = document.getElementById('mega-grid');
    const wtfGrid = document.getElementById('wtf-grid');
    const duplicateGrid = document.getElementById('duplicate-grid');

    if (shinyGrid) {
        shinyGrid.innerHTML = shinyPokes.length > 0 
            ? shinyPokes.map(p => {
                p.isCompanion = (p._id === currentCompanionId);
                return createCard(p, 'collection');
            }).join('') 
            : '<p style="color: var(--text-secondary);">Aucun Pokémon chromatique capturé.</p>';
        // OPTIMISATION: Observer les images
        shinyGrid.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    }

    if (megaGrid) {
        megaGrid.innerHTML = megaPokes.length > 0 
            ? megaPokes.map(p => {
                p.isCompanion = (p._id === currentCompanionId);
                return createCard(p, 'collection');
            }).join('') 
            : '<p style="color: var(--text-secondary);">Aucune forme Méga capturée.</p>';
        megaGrid.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    }

    if (wtfGrid) {
        wtfGrid.innerHTML = wtfPokes.length > 0 
            ? wtfPokes.map(p => {
                p.isCompanion = (p._id === currentCompanionId);
                return createCard(p, 'collection');
            }).join('') 
            : '<p style="color: var(--text-secondary);">Aucune édition spéciale capturée.</p>';
        wtfGrid.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    }

    if (duplicateGrid) {
        duplicateGrid.innerHTML = duplicatePokes.length > 0 
            ? duplicatePokes.map(p => {
                p.isCompanion = (p._id === currentCompanionId);
                return createCard(p, 'collection');
            }).join('') 
            : '<p style="color: var(--text-secondary);">Aucun autre Pokémon capturé.</p>';
        duplicateGrid.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    }
}

function renderHomeStats() {
    if (!cachedPokedexData) return;
    
    const seenCount = cachedPokedexData.fullPokedex.filter(p => p.isCaptured).length;
    const caughtCount = cachedPokedexData.caughtPokemons.length;
    const shinyCount = cachedPokedexData.caughtPokemons.filter(p => p.isShiny).length;

    document.getElementById('stat-seen').textContent = seenCount;
    document.getElementById('stat-caught').textContent = caughtCount;
    document.getElementById('stat-shiny').textContent = shinyCount;

    const featured = cachedPokedexData.caughtPokemons.slice(0, 6);
    const featuredDiv = document.getElementById('featured-pokemon');
    if (featuredDiv && featured.length > 0) {
        featuredDiv.innerHTML = featured.map(p => {
            p.isCompanion = (p._id === currentCompanionId);
            return createCard(p, 'featured');
        }).join('');
        // OPTIMISATION: Observer les images
        featuredDiv.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    }
}

// OPTIMISATION: Fonction createCard modifiée pour lazy loading
function createCard(p, context) {
    const isFavorite = favoritePokes.includes(p._id);
    const spriteUrl = getPokemonSprite(p);
    const price = calculatePrice(p);
    
    let badges = '';
    if (p.isShiny) badges += '<span class="badge-shiny">✨ Shiny</span>';
    if (p.isMega) badges += '<span class="badge-mega">🔥 MÉGA</span>';
    if (p.isCompanion) badges += '<span class="badge-companion">💖 Compagnon</span>';
    
    let actions = '';
    if (context === 'collection') {
        actions = `
            <button onclick="toggleFav('${p._id}')" class="btn-action" style="background: ${isFavorite ? 'linear-gradient(135deg, #f4d06f 0%, #e8b4b8 100%)' : 'linear-gradient(135deg, var(--accent-nature) 0%, rgba(168, 197, 160, 0.8) 100%)'};">
                ${isFavorite ? '⭐ Favori' : '☆ Favori'}
            </button>
            <button onclick="setCompanion('${p._id}', '${p.name}')" class="btn-action">💖 Compagnon</button>
            <button onclick="wonderTrade('${p._id}', '${p.name}')" class="btn-action btn-trade">🎲 Échanger</button>
            <button onclick="sellPoke('${p._id}', '${p.name}', ${price})" class="btn-action btn-sell">💰 ${price}</button>
        `;
    }
    
    // OPTIMISATION CRITIQUE: data-src au lieu de src pour lazy loading
    return `
        <div class="pokedex-card">
            <img data-src="${spriteUrl}" alt="${p.name}" loading="lazy" style="background: linear-gradient(135deg, rgba(52, 40, 32, 0.3), rgba(42, 31, 26, 0.4));">
            <h3>${p.name}</h3>
            <p style="color: var(--text-secondary);">#${p.pokedexId}</p>
            ${badges ? `<div style="margin-top: 8px;">${badges}</div>` : ''}
            ${p.level ? `<p style="font-size: 0.85em; color: var(--accent-nature);">Niveau ${p.level}</p>` : ''}
            ${actions ? `<div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 5px; justify-content: center;">${actions}</div>` : ''}
        </div>
    `;
}

async function setCompanion(id, name) {
    if (!confirm(`Définir ${name} comme compagnon ?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/user/companion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, companionId: id })
        });
        if (res.ok) {
            localStorage.removeItem('pokedex_data_cache');
            loadPokedex();
        }
    } catch (e) { console.error(e); }
}

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    try {
        const res = await fetch(`${API_BASE_URL}/api/user/profile/${currentUserId}`);
        const profile = await res.json();
        
        let evolutionsHtml = '';
        if (profile.availableEvolutions && profile.availableEvolutions.length > 0) {
            evolutionsHtml = `
                <div class="stat-box">
                    <h3>🌟 Évolutions disponibles</h3>
                    <div class="pokedex-grid">
                        ${profile.availableEvolutions.map(evo => `
                            <div class="pokedex-card">
                                <img data-src="${getPokemonSprite(evo.pokemon)}" alt="${evo.pokemon.name}" loading="lazy">
                                <h3>${evo.pokemon.name}</h3>
                                <p>Niveau ${evo.pokemon.level} / ${evo.requiredLevel}</p>
                                <button onclick="evolvePokemon('${evo.pokemon._id}')" class="btn-action">⚡ Faire évoluer</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="stat-box">
                <h2 style="color: var(--accent-warm); font-family: 'Caveat', cursive; font-size: 2.5em;">👤 ${currentUsername}</h2>
                <p style="font-size: 1.2em; margin: 15px 0;">💰 Argent : <strong>${profile.money || 0}</strong></p>
                <p style="font-size: 1.1em; color: var(--text-secondary);">
                    📦 Inventaire : 
                    ${profile.pokeballs || 0} Pokéballs | 
                    ${profile.superballs || 0} Superballs | 
                    ${profile.hyperballs || 0} Hyperballs
                </p>
            </div>
            ${evolutionsHtml}
        `;
        
        // OPTIMISATION: Observer les images du profil
        container.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    } catch (e) { 
        container.innerHTML = "<p>Erreur chargement profil.</p>"; 
    }
}

async function evolvePokemon(pokemonId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/pokemon/evolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, pokemonId })
        });
        const data = await res.json();
        if (res.ok) {
            alert(data.message);
            localStorage.removeItem('pokedex_data_cache');
            loadPokedex();
            loadProfile();
        } else {
            alert("Erreur : " + (data.message || "Évolution impossible"));
        }
    } catch (e) { console.error(e); }
}

async function loadShop() {
    const container = document.getElementById('shopContainer');
    try {
        const res = await fetch(`${API_BASE_URL}/api/user/profile/${currentUserId}`);
        const profile = await res.json();
        
        document.getElementById('shop-money').textContent = profile.money || 0;

        const items = ['pokeball', 'superball', 'hyperball'];
        const itemNames = ['Poké Ball', 'Super Ball', 'Hyper Ball'];
        const getPrice = key => key === 'pokeball' ? 50 : key === 'superball' ? 150 : 300;
        const ballImg = key => key === 'pokeball' ? 'poke-ball.png' : key === 'superball' ? 'great-ball.png' : 'ultra-ball.png';
        const imgStyle = 'width: 80px; height: 80px; object-fit: contain; image-rendering: pixelated; margin-bottom: 10px;';

        let shopHtml = '';
        items.forEach((key, i) => {
            shopHtml += `<div class="pokedex-card"><img src="${BALL_URL}${ballImg(key)}" style="${imgStyle}" loading="lazy"><h3 style="font-size:1em; margin: 5px 0;">${itemNames[i]}</h3><p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice(key)} 💰</p><input type="number" id="qty-${key}" value="1" min="1" style="width:120px; padding:12px 15px; background:rgba(26, 20, 16, 0.6); color:var(--text-primary); border:2px solid rgba(255, 154, 108, 0.3); border-radius:15px; margin:15px auto 10px; text-align:center; font-size:1.1em; font-weight:600; display:block; position:relative; z-index:10; font-family: 'Quicksand', sans-serif;"><button onclick="buyItem('${key}', document.getElementById('qty-${key}').value)" class="btn-action btn-trade" style="width:100%">Acheter</button></div>`;
        });
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
        else { alert(data.message); loadShop(); loadProfile(); }
    } catch (e) { console.error(e); }
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
                    ${post.teamData.map(p => `<img data-src="${getPokemonSprite(p)}" title="${p.name}" style="width: 50px;" loading="lazy">`).join('')}
                </div>
                <div style="margin-top:15px; border-top: 1px solid var(--border); padding-top:10px;">
                    <button onclick="likePost('${post._id}')" style="background:none; border:none; color:${hasLiked ? 'var(--red-poke)' : 'white'}; cursor:pointer; font-size:1.2em;">
                        ${hasLiked ? '❤️' : '🤍'} ${post.likes.length}
                    </button>
                </div>
            </div>`;
        }).join('');
        
        // OPTIMISATION: Observer les images de la galerie
        container.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
    } catch (e) { console.error(e); }
}

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
    loadPokedex();
    console.log("🔄 Cache vidé et données actualisées !");
}

function invalidatePokedexCache() {
    localStorage.removeItem('pokedex_data_cache');
    loadPokedex();
}

function logout() { 
    localStorage.clear(); 
    location.reload(); 
}

document.addEventListener('DOMContentLoaded', initializeApp);
