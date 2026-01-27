const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com';
const POKEAPI_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const BALL_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

let currentUserId = localStorage.getItem('currentUserId');
let currentUsername = localStorage.getItem('currentUsername');

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
    if (target) target.classList.add('active');

    document.querySelectorAll('#main-nav button').forEach(b => b.classList.remove('active'));
    const navBtn = document.getElementById(`nav-${id}`);
    if (navBtn) navBtn.classList.add('active');

    if (id === 'collection') loadCollection();
    if (id === 'profile') loadProfile();
    if (id === 'shop') loadShop();
}

// --- LOGIQUE DAILY (CADEAU) ---

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
            alert(`🎁 ${data.message}\nRécompenses : ${data.rewards}`);
            loadProfile(); 
        } else {
            alert(data.message);
            if (btn) btn.disabled = false;
        }
    } catch (e) {
        console.error("Erreur Daily:", e);
        alert("Erreur lors de la récupération du cadeau.");
    }
}

// --- PROFIL ---

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    if (!container) return;

    try {
        // Changement vers /api/profile/ pour correspondre à tes autres appels
        const res = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        
        // Si le serveur renvoie une erreur (ex: 404), on ne tente pas de lire le JSON
        if (!res.ok) {
            console.error(`Erreur serveur: ${res.status}`);
            container.innerHTML = "<p>Erreur : Impossible de contacter le serveur.</p>";
            return;
        }

        const user = await res.json();

        // 1. Logique du Compagnon
        let compHtml = '<p>Aucun compagnon</p>';
        if (user.companionPokemon) {
            const cp = user.companionPokemon;
            compHtml = `
                <div class="is-companion">
                    <img src="${POKEAPI_URL}${cp.isShiny ? 'shiny/' : ''}${cp.pokedexId}.png" class="poke-sprite" style="width:120px; image-rendering: pixelated;">
                    <p style="color:var(--shiny); font-weight:bold; margin:0;">${cp.isShiny ? '✨ ' : ''}${cp.name}</p>
                    <p style="font-size:0.8em;">Niveau ${cp.level}</p>
                </div>
            `;
        }

        // 2. Logique du bouton Daily
        const cooldownText = getCooldownTime(user.lastDaily);
        const isOff = cooldownText !== null;

        container.innerHTML = `
            <div class="stat-box" style="text-align:center;">
                <h3>Compagnon Actuel</h3>
                ${compHtml}
            </div>

            <div class="stat-box" style="text-align:center;">
                <h2>💰 Portefeuille : ${user.money.toLocaleString()} 💰</h2>
                <button id="dailyBtn" onclick="claimDaily()" class="btn-action" 
                    ${isOff ? 'disabled' : ''} 
                    style="margin-top:15px; padding:12px; width:100%; max-width:250px; font-weight:bold; border-radius:8px; border:none; color:white; cursor:${isOff ? 'not-allowed' : 'pointer'}; background:${isOff ? '#333' : 'var(--highlight)'};">
                    ${isOff ? `⏳ Prochain cadeau dans :<br>${cooldownText}` : '🎁 RÉCUPÉRER MON CADEAU'}
                </button>
            </div>

            <div class="stat-box">
                <h3 style="text-align:center;">🎒 Inventaire des Balls</h3>
                <div class="ball-inventory">
                    <div class="ball-item"><img src="${BALL_URL}poke-ball.png"><br><b>x${user.pokeballs || 0}</b><br><small>Poké Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}great-ball.png"><br><b>x${user.greatballs || 0}</b><br><small>Super Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}ultra-ball.png"><br><b>x${user.ultraballs || 0}</b><br><small>Hyper Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}master-ball.png"><br><b>x${user.masterballs || 0}</b><br><small>Master Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}premier-ball.png"><br><b>x${user.premierballs || 0}</b><br><small>Honor Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}luxury-ball.png"><br><b>x${user.luxuryballs || 0}</b><br><small>Luxe Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}safari-ball.png"><br><b>x${user.safariballs || 0}</b><br><small>Safari ball</small></div>
                    <div class="ball-item">
                        <img src="https://raw.githubusercontent.com/xezy-b2/Pokedex-Online/refs/heads/main/elbaball30retesttt.png" style="filter: hue-rotate(290deg) brightness(1.3);">
                        <br><b>x${user.ellbaballs || 0}</b>
                        <br><small style="font-size:0.8em;">Ellba Ball</small>
                    </div>
                </div>
            </div>
        `;

        if (isOff) setupDailyTimer(user.lastDaily);

    } catch (e) {
        console.error("Erreur Profil:", e);
        container.innerHTML = "Erreur de chargement des données.";
    }
}

// --- AUTRES FONCTIONS (MAGASIN, POKEDEX, etc.) ---

async function loadPokedex() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/user/${currentUserId}`);
        const user = await res.json();
        for(let g=1; g<=6; g++) {
            renderGrid(document.getElementById(`grid-${g}`), g, user);
        }
    } catch(e) { console.error(e); }
}

function renderGrid(container, gen, user) {
    if(!container) return;
    container.innerHTML = '';
    const bounds = { 1:[1,151], 2:[152,251], 3:[252,386], 4:[387,493], 5:[494,649], 6:[650,721] };
    const [start, end] = bounds[gen];

    for(let i=start; i<=end; i++) {
        const hasIt = user.pokemons.some(p => p.pokedexId === i);
        const card = document.createElement('div');
        card.className = `pokedex-card ${hasIt ? '' : 'missing'}`;
        card.innerHTML = `<img src="${POKEAPI_URL}${i}.png" class="poke-sprite"><p>#${i}</p>`;
        container.appendChild(card);
    }
}

async function loadCollection() {
    const res = await fetch(`${API_BASE_URL}/api/user/${currentUserId}`);
    const user = await res.json();
    
    const shinyGrid = document.getElementById('shiny-grid');
    const dupGrid = document.getElementById('duplicate-grid');
    shinyGrid.innerHTML = ''; dupGrid.innerHTML = '';

    const sorted = [...user.pokemons].sort((a,b) => b.level - a.level);
    const seen = {};

    sorted.forEach(p => {
        const isComp = user.companionPokemon && user.companionPokemon._id === p._id;
        const card = document.createElement('div');
        card.className = `pokedex-card ${p.isShiny ? 'is-shiny' : ''} ${isComp ? 'is-companion' : ''}`;
        
        card.innerHTML = `
            <button class="companion-btn ${isComp ? 'active' : ''}" onclick="setCompanion('${p._id}')">❤</button>
            <img src="${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png" class="poke-sprite">
            <p><b>${p.name}</b></p>
            <p>Niv. ${p.level}</p>
            <button class="btn-action btn-trade" onclick="wonderTrade('${p._id}', '${p.name}')">Échange Miracle</button>
        `;

        if(p.isShiny || p.isFavorite) shinyGrid.appendChild(card);
        else {
            if(seen[p.pokedexId]) dupGrid.appendChild(card);
            else { seen[p.pokedexId] = true; shinyGrid.appendChild(card); }
        }
    });
}

async function setCompanion(id) {
    await fetch(`${API_BASE_URL}/api/companion/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonId: id })
    });
    loadCollection();
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
        document.getElementById('modal-img').src = `${POKEAPI_URL}${data.newPokemon.isShiny ? 'shiny/' : ''}${data.newPokemon.pokedexId}.png`;
        document.getElementById('modal-text').innerHTML = `Vous avez reçu : <b>${data.newPokemon.name}</b> !`;
        document.getElementById('trade-modal').style.display = 'flex';
        loadCollection();
    }
}

async function loadShop() {
    const items = [
        { key: 'pokeballs', name: 'Poké Ball', price: 200, img: 'poke-ball.png' },
        { key: 'greatballs', name: 'Super Ball', price: 600, img: 'great-ball.png' },
        { key: 'ultraballs', name: 'Hyper Ball', price: 1200, img: 'ultra-ball.png' }
    ];
    const container = document.getElementById('shopContainer');
    container.innerHTML = items.map(it => `
        <div class="pokedex-card">
            <img src="${BALL_URL}${it.img}" style="width:50px;">
            <h3>${it.name}</h3>
            <p>${it.price} 💰</p>
            <input type="number" id="qty-${it.key}" value="1" min="1" style="width:50px; margin-bottom:10px; background:#161b22; color:white; border:1px solid #30363d; border-radius:5px; text-align:center;">
            <button class="btn-action btn-trade" onclick="buyItem('${it.key}', document.getElementById('qty-${it.key}').value)">Acheter</button>
        </div>
    `).join('');
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
            alert(`Achat réussi : ${quantity} ${key} !`);
            loadShop();
        }
    } catch (e) { console.error(e); }
}

function filterGen(g) {
    document.querySelectorAll('.gen-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`gen-${g}`).classList.add('active');
    document.querySelectorAll('.gen-nav button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function logout() {
    localStorage.clear();
    window.location.reload();
}

window.onload = initializeApp;

