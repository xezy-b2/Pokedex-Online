const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com';
const POKEAPI_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const BALL_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

let currentUserId = localStorage.getItem('currentUserId');
let currentUsername = localStorage.getItem('currentUsername');
let favoritePokes = JSON.parse(localStorage.getItem('favoritePokes')) || []; // AJOUTÉ : Stockage des favoris

let currentPage = 1;
const itemsPerPage = 50; 
let cachedPokedexData = null;
let currentGen = 1;
let currentCompanionId = null;

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

    // Mise à jour immédiate du localStorage
    localStorage.setItem('favoritePokes', JSON.stringify(favoritePokes));
    
    // Sauvegarde persistante en base de données
    if (currentUserId) {
        try {
            await fetch(`${API_BASE_URL}/api/profile/update-favorites`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    userId: currentUserId, 
                    favorites: favoritePokes 
                })
            });
        } catch (e) {
            console.error("Erreur de sauvegarde distante:", e);
        }
    }
    
    // Rafraîchir l'affichage
    loadPokedex();
    if (typeof updateHomeStats === 'function') updateHomeStats();
}

// --- RENDU DES CARTES ---
function createCard(p, mode = 'pokedex') {
    const isCaptured = p.isCaptured !== false;
    const isCompanion = p.isCompanion === true;
    const isMega = p.isMega === true;
    const isFav = favoritePokes.includes(p._id); // AJOUTÉ
    const price = calculatePrice(p);
    
    const img = getPokemonSprite(p);
    const ballKey = p.capturedWith || 'pokeball';
    const ballFileName = ballKey.replace('ball', '-ball') + '.png';
    const ballImgUrl = `${BALL_URL}${ballFileName}`;
    
    let html = `
        <div class="pokedex-card ${!isCaptured ? 'missing' : ''} ${p.isShiny ? 'is-shiny' : ''} ${isMega ? 'is-mega' : ''} ${isCompanion ? 'is-companion' : ''}">
            ${isCaptured ? `<button class="companion-btn ${isCompanion ? 'active' : ''}" onclick="setCompanion('${p._id}')" title="Définir comme compagnon">❤️</button>` : ''}
            ${isCaptured ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav('${p._id}')" title="Équipe Favorite" style="position: absolute; top: 8px; right: 35px; background: none; border: none; font-size: 1.2em; cursor: pointer; z-index: 5; filter: ${isFav ? 'grayscale(0)' : 'grayscale(1) opacity(0.3)'};">⭐</button>` : ''}
            <span style="font-size:0.7em; color:var(--text-sec); position:absolute; top:10px; right:10px;">#${p.pokedexId}</span>
            ${isMega ? `<span style="position:absolute; top:10px; left:10px; background:#ff00ff; color:white; font-size:0.6em; padding:2px 5px; border-radius:4px; font-weight:bold; z-index:10;">MÉGA</span>` : ''}
            <img src="${img}" class="poke-sprite" loading="lazy" onerror="this.onerror=null; this.src='${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png';" style="${isMega ? 'width:100px; height:100px; object-fit:contain;' : ''}">
            <span class="pokemon-name" style="font-weight:bold;">${p.isShiny ? '✨ ' : ''}${p.name || '???'}</span>
            <div style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 5px;">
                <span style="color:var(--highlight); font-size:0.85em; font-weight:bold;">Lv.${p.level || 5}</span>
                ${isCaptured ? `<img src="${ballImgUrl}" style="width:20px; height:20px; margin:0;" title="${ballKey}">` : ''}
            </div>
    `;

    if (mode === 'collection' && isCaptured) {
        html += `
            <button class="btn-action btn-sell" onclick="sellPoke('${p._id}', '${p.name}', ${price})">Vendre (${price} 💰)</button>
            ${!p.isShiny && !isMega ? `<button class="btn-action btn-trade" onclick="wonderTrade('${p._id}', '${p.name}')">Miracle 🎲</button>` : ''}
        `;
    }
    return html + `</div>`;
}

// --- CHARGEMENT DES DONNÉES (VERSION OPTIMISÉE AVEC CACHE) ---
async function loadPokedex() {
    const CACHE_KEY = 'pokedex_data_cache';
    const CACHE_DURATION = 30 * 60 * 1000; // Cache de 30 minutes pour les données Pokédex

    try {
        // 1. Récupération du Profil (Toujours en direct pour avoir l'argent et le compagnon à jour)
        const profRes = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const userProfile = await profRes.json();

        if (userProfile.favorites) {
            favoritePokes = userProfile.favorites;
            localStorage.setItem('favoritePokes', JSON.stringify(favoritePokes));
        }
        
        const comp = userProfile.companionPokemon;
        currentCompanionId = comp ? comp._id : null;

        // Mise à jour header compagnon
        const compImg = document.getElementById('companion-img');
        const compName = document.getElementById('companion-name');
        if (comp && compImg) {
            compImg.src = getPokemonSprite(comp); 
            compImg.style.display = 'block';
            if (compName) compName.innerText = comp.name.toUpperCase();
        } else if (compImg) {
            compImg.style.display = 'none';
        }

        // 2. Logique de Cache pour le Pokédex Complet
        const cached = localStorage.getItem(CACHE_KEY);
        let data;

        if (cached) {
            const parsed = JSON.parse(cached);
            const isExpired = (Date.now() - parsed.timestamp) > CACHE_DURATION;
            if (!isExpired) {
                console.log("🚀 Utilisation du cache pour le Pokédex");
                data = parsed.data;
            }
        }

        if (!data) {
            console.log("🌐 Appel API pour le Pokédex...");
            const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
            data = await res.json();
            
            // Sauvegarde dans le cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        }

        cachedPokedexData = data;
        const list = cachedPokedexData.capturedPokemonsList; 
        
        // --- MISE À JOUR DES STATS ACCUEIL ---
        const totalVus = cachedPokedexData.fullPokedex.length;
        const totalCaptures = cachedPokedexData.fullPokedex.filter(p => p.isCaptured).length;
        const totalShinies = list.filter(p => p.isShiny).length;

        if(document.getElementById('stat-seen')) document.getElementById('stat-seen').innerText = totalVus;
        if(document.getElementById('stat-caught')) document.getElementById('stat-caught').innerText = totalCaptures;
        if(document.getElementById('stat-shiny')) document.getElementById('stat-shiny').innerText = totalShinies;

        // --- ÉQUIPE FAVORITE (5 SLOTS) ---
        const featuredContainer = document.getElementById('featured-pokemon');
        if(featuredContainer) {
            featuredContainer.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const favId = favoritePokes[i];
                const favData = list.find(p => p._id === favId);
                if (favData) {
                    featuredContainer.innerHTML += createCard(favData, 'pokedex');
                } else {
                    featuredContainer.innerHTML += `<div class="empty-slot" onclick="showPage('collection')" style="border: 2px dashed var(--border); border-radius: 15px; height: 180px; display: flex; align-items: center; justify-content: center; font-size: 2.5em; color: var(--border); background: rgba(255,255,255,0.02); cursor: pointer;">+</div>`;
                }
            }
        }

        // Calcul des totaux pour les onglets Pokédex
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const totals = { 1: 151, 2: 100, 3: 135, 4: 107, 5: 156, 6: 72 };
        const genNames = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unys', 6: 'Kalos' };
        
        cachedPokedexData.fullPokedex.forEach(p => {
            let gen = (p.pokedexId <= 151) ? 1 : (p.pokedexId <= 251) ? 2 : (p.pokedexId <= 386) ? 3 : (p.pokedexId <= 493) ? 4 : (p.pokedexId <= 649) ? 5 : 6;
            if (p.isCaptured) counts[gen]++;
        });

        document.querySelectorAll('#gen-tabs button').forEach((btn, i) => {
            const g = i + 1;
            btn.innerHTML = `Gen ${g} (${genNames[g]}) <br><small>${counts[g]}/${totals[g]}</small>`;
        });

        renderPokedexGrid();

        // Remplissage Collection (Shiny, Méga, Doublons)
        const sGrid = document.getElementById('shiny-grid');
        const mGrid = document.getElementById('mega-grid'); 
        const dGrid = document.getElementById('duplicate-grid');
        if(sGrid) sGrid.innerHTML = ''; if(mGrid) mGrid.innerHTML = ''; if(dGrid) dGrid.innerHTML = '';

        const keepers = new Set();
        list.forEach(p => {
            p.isCompanion = (p._id === currentCompanionId);
            const isFav = favoritePokes.includes(p._id); 
            
            if (p.isMega === true) {
                if(mGrid) mGrid.innerHTML += createCard(p, 'collection');
            } else if (p.isShiny || isFav) {
                if(sGrid) sGrid.innerHTML += createCard(p, 'collection');
            } else {
                if (keepers.has(p.pokedexId)) {
                    if(dGrid) dGrid.innerHTML += createCard(p, 'collection');
                } else {
                    keepers.add(p.pokedexId);
                }
            }
        });
    } catch (e) { console.error("Erreur loadPokedex :", e); }
}
async function setCompanion(pokemonId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/companion/set`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, pokemonId: pokemonId })
        });
        if(res.ok) 
        {
            localStorage.removeItem('pokedex_data_cache');
            loadPokedex();
            if(document.getElementById('profile-page')?.classList.contains('active')) loadProfile();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (e) { console.error("Erreur setCompanion:", e); }
}

// --- DAILY & PROFIL & BOUTIQUE ---
function getCooldownTime(lastDailyDate) {
    if (!lastDailyDate) return null;
    const GIFT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const now = new Date();
    const lastDaily = new Date(lastDailyDate);
    const timeLeft = GIFT_COOLDOWN_MS - (now - lastDaily);
    if (timeLeft <= 0) return null;
    const hours = Math.floor(timeLeft / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

async function claimDaily() {
    const btn = document.getElementById('dailyBtn');
    if (btn) btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/daily/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
        });
        const data = await res.json();
        if (data.success) {
            alert(`🎁 ${data.message}\n${data.rewards}`);
            loadProfile(); 
        } else { alert(data.message); if(btn) btn.disabled = false; }
    } catch (e) { alert("Erreur."); if(btn) btn.disabled = false; }
}

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    if(!container) return;
    try {
        const resProfile = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const user = await resProfile.json();
        const resPokedex = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const pokedexData = await resPokedex.json();
        const userPokes = pokedexData.capturedPokemonsList || [];

        const cp = user.companionPokemon;
        if (cp) {
            const evo = await getEvolutionData(cp.pokedexId);
            if (evo && cp.level >= evo.minLevel) {
                const evolveRes = await fetch(`${API_BASE_URL}/api/evolve-companion`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUserId, newId: parseInt(evo.nextId), newName: evo.nextName })
                });
                if (evolveRes.ok) {
                    alert(`✨ QUOI ?! Ton compagnon évolue en ${evo.nextName} ! ✨`);
                    return loadProfile();
                }
            }
        }

        const uniqueIds = new Set(userPokes.map(p => p.pokedexId));
        const totalUnique = uniqueIds.size;
        const totalShiny = userPokes.filter(p => p.isShiny).length;
        const totalMega = userPokes.filter(p => p.isMega).length;

        const badges = [
            { name: "Scout", desc: "50 Pokémon", unlocked: totalUnique >= 50, icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/1.png" },
            { name: "Collectionneur", desc: "150 Pokémon", unlocked: totalUnique >= 150, icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/3.png" },
            { name: "Maître Pokédex", desc: "400 Pokémon", unlocked: totalUnique >= 400, icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/8.png" },
            { name: "Shiny Hunter", desc: "5 Shinies", unlocked: totalShiny >= 5, icon: "https://www.pokepedia.fr/images/archive/7/74/20190629205645%21Badge_Prisme_Kanto_LGPE.png" },
            { name: "Vive la richesse", desc: "25 000 💰", unlocked: user.money >= 25000, icon: "https://www.pokepedia.fr/images/archive/1/10/20210522214103%21Badge_Marais_Kanto_LGPE.png" },
            { name: "Maître Méga", desc: "1 Méga", unlocked: totalMega >= 1, icon: "https://www.pokepedia.fr/images/archive/3/33/20190629203512%21Badge_Volcan_Kanto_LGPE.png" }
        ];

        let badgesHtml = `<div class="stat-box" style="text-align:center;"><h3 style="color:var(--highlight); margin-bottom:10px;">🏆 Badges d'Exploits</h3><div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; padding:10px; background:rgba(0,0,0,0.2); border-radius:10px;">${badges.map(b => `<img src="${b.icon}" title="${b.name}: ${b.desc}" style="width:45px; height:45px; object-fit:contain; transition: transform 0.2s; ${b.unlocked ? 'filter: drop-shadow(0 0 8px gold); opacity: 1;' : 'filter: grayscale(1) opacity(0.2);'}" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">`).join('')}</div></div>`;

        let compHtml = '<p>Aucun compagnon</p>';
        if(user.companionPokemon) {
            const cp = user.companionPokemon;
            compHtml = `<div class="is-companion"><img src="${getPokemonSprite(cp)}" class="poke-sprite" onerror="this.onerror=null; this.src='${POKEAPI_URL}${cp.isShiny ? 'shiny/' : ''}${cp.pokedexId}.png';" style="width:120px; filter: drop-shadow(0 0 10px rgba(163, 51, 200, 0.5));"><p style="color:var(--shiny); font-weight:bold; margin:0;">${cp.isShiny ? '✨ ' : ''}${cp.name}</p><p style="font-size:0.8em;">Niveau ${cp.level}</p></div>`;
        }

        const cooldownText = getCooldownTime(user.lastDaily);
        const isOff = cooldownText !== null;

        container.innerHTML = `${badgesHtml}<div class="stat-box" style="text-align:center;"><h3>Compagnon Actuel</h3>${compHtml}</div><div class="stat-box" style="text-align:center;"><h2>💰 Portefeuille : ${user.money.toLocaleString()} 💰</h2><button id="dailyBtn" onclick="claimDaily()" class="btn-action" ${isOff ? 'disabled' : ''} style="margin-top:15px; padding:12px; width:100%; max-width:250px; font-weight:bold; border-radius:8px; border:none; color:white; cursor:${isOff ? 'not-allowed' : 'pointer'}; background:${isOff ? '#333' : 'var(--highlight)'};">${isOff ? `⏳ Prochain cadeau dans :<br>${cooldownText}` : '🎁 RÉCUPÉRER MON CADEAU'}</button></div><div class="stat-box"><h3 style="text-align:center;">🎒 Inventaire des Balls</h3><div class="ball-inventory"><div class="ball-item"><img src="${BALL_URL}poke-ball.png"><br><b>x${user.pokeballs || 0}</b><br><small>Poké Ball</small></div><div class="ball-item"><img src="${BALL_URL}great-ball.png"><br><b>x${user.greatballs || 0}</b><br><small>Super Ball</small></div><div class="ball-item"><img src="${BALL_URL}ultra-ball.png"><br><b>x${user.ultraballs || 0}</b><br><small>Hyper Ball</small></div><div class="ball-item"><img src="${BALL_URL}master-ball.png"><br><b>x${user.masterballs || 0}</b><br><small>Master Ball</small></div><div class="ball-item"><img src="${BALL_URL}premier-ball.png"><br><b>x${user.premierballs || 0}</b><br><small>Honor Ball</small></div><div class="ball-item"><img src="${BALL_URL}luxury-ball.png"><br><b>x${user.luxuryballs || 0}</b><br><small>Luxe Ball</small></div><div class="ball-item"><img src="${BALL_URL}safari-ball.png"><br><b>x${user.safariballs || 0}</b><br><small>Safari ball</small></div><div class="ball-item"><img src="https://raw.githubusercontent.com/xezy-b2/Pokedex-Online/refs/heads/main/elbaball30retesttt.png" style="filter: hue-rotate(290deg) brightness(1.3); width:35px;"><br><b>x${user.ellbaballs || 0}</b><br><small style="font-size:0.8em;">Ellba Ball</small></div></div></div>`;

        if (isOff) {
            const timer = setInterval(() => {
                const updatedTime = getCooldownTime(user.lastDaily);
                const dailyBtn = document.getElementById('dailyBtn');
                if (!updatedTime || !dailyBtn) { if(dailyBtn) { dailyBtn.disabled = false; dailyBtn.style.background = 'var(--highlight)'; dailyBtn.innerHTML = '🎁 RÉCUPÉRER MON CADEAU'; } clearInterval(timer); } 
                else { dailyBtn.innerHTML = `⏳ Prochain cadeau dans :<br>${updatedTime}`; }
            }, 1000);
        }
    } catch (e) { console.error(e); container.innerHTML = "Erreur profil."; }
}

async function loadShop() {
    const container = document.getElementById('shopContainer');
    const shopMoneySpan = document.getElementById('shop-money');
    if(!container) return;
    try {
        const profRes = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const user = await profRes.json();
        if (shopMoneySpan) shopMoneySpan.innerText = user.money.toLocaleString();
        const res = await fetch(`${API_BASE_URL}/api/shop`);
        const data = await res.json();
        const items = Array.isArray(data) ? data.reduce((acc, item) => ({...acc, [item.id || item.key]: item}), {}) : data;
        const getPrice = (keys) => { for (let key of keys) { if (items[key]?.cost) return items[key].cost.toLocaleString(); } return "0"; };
        const imgStyle = "width:35px; height:35px; object-fit:contain; display:block; margin: 10px auto;";
        const itemKeys = ['pokeball', 'greatball', 'ultraball', 'masterball', 'safariball', 'premierball', 'luxuryball'];
        const itemNames = ['Poké Ball', 'Super Ball', 'Hyper Ball', 'Master Ball', 'Safari Ball', 'Honor Ball', 'Luxe Ball'];
        let shopHtml = '';
        itemKeys.forEach((key, i) => {
            const ballImg = key.replace('ball', '-ball') + '.png';
            shopHtml += `<div class="pokedex-card"><img src="${BALL_URL}${ballImg}" style="${imgStyle}"><h3 style="font-size:1em; margin: 5px 0;">${itemNames[i]}</h3><p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice([key])} 💰</p><input type="number" id="qty-${key}" value="1" min="1" style="width:50px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center;"><button onclick="buyItem('${key}', document.getElementById('qty-${key}').value)" class="btn-action btn-trade" style="width:100%">Acheter</button></div>`;
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
    if(res.ok) loadPokedex();
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
        
        // On utilise ta fonction getPokemonSprite(pk) pour avoir le GIF Showdown ou le sprite correct
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
                teamIds: favoritePokes // Utilise tes favoris
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
    const MY_ADMIN_ID = "1238112721984028706"; // METS LE MÊME ID ICI

    try {
        const res = await fetch(`${API_BASE_URL}/api/gallery`);
        const posts = await res.json();
        
        container.innerHTML = posts.map(post => {
            const hasLiked = post.likes.includes(currentUserId);
            // On n'affiche le bouton supprimer que si c'est TON ID
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
                    ${post.teamData.map(p => `<img src="${getPokemonSprite(p)}" title="${p.name}" style="width: 50px;">`).join('')}
                </div>
                <div style="margin-top:15px; border-top: 1px solid var(--border); padding-top:10px;">
                    <button onclick="likePost('${post._id}')" style="background:none; border:none; color:${hasLiked ? 'var(--red-poke)' : 'white'}; cursor:pointer; font-size:1.2em;">
                        ${hasLiked ? '❤️' : '🤍'} ${post.likes.length}
                    </button>
                </div>
            </div>`;
        }).join('');
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
    const MY_ADMIN_ID = "1238112721984028706"; // TOUJOURS LE MÊME ID

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

// À ajouter dans script.js
function invalidatePokedexCache() {
    localStorage.removeItem('pokedex_data_cache');
    loadPokedex(); // Recharge proprement les données depuis le serveur
}

function logout() { localStorage.clear(); location.reload(); }
document.addEventListener('DOMContentLoaded', initializeApp);






