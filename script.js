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
    if(target) target.classList.add('active');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`nav-${id}`);
    if(btn) btn.classList.add('active');

    if(id === 'shop') loadShop();
    if(id === 'profile') loadProfile();
    if(id === 'pokedex' || id === 'collection') loadPokedex();
}

function filterGen(gen) {
    document.querySelectorAll('.gen-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`gen-${gen}`).classList.add('active');
    document.querySelectorAll('#gen-tabs button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

// --- LOGIQUE PRIX & CARTES ---
function calculatePrice(p) {
    const levelBonus = (p.level || 5) * 5;
    const shinyBonus = p.isShiny ? 250 : 0;
    const totalIVs = (p.iv_hp || 0) + (p.iv_attack || 0) + (p.iv_defense || 0) + (p.iv_sp_attack || 0) + (p.iv_sp_defense || 0) + (p.iv_speed || 0);
    const ivBonus = Math.floor(totalIVs / 1.5); 
    return 50 + levelBonus + shinyBonus + ivBonus;
}

function createCard(p, mode = 'pokedex') {
    const isShiny = p.isShiny;
    const isCaptured = p.isCaptured !== false;
    const price = calculatePrice(p);
    const img = `${POKEAPI_URL}${isShiny ? 'shiny/' : ''}${p.pokedexId}.png`;
    
    let html = `
        <div class="pokedex-card ${!isCaptured ? 'missing' : ''} ${isShiny ? 'is-shiny' : ''}">
            <span style="font-size:0.7em; color:var(--text-sec); position:absolute; top:10px; left:10px;">#${p.pokedexId}</span>
            <img src="${img}">
            <span class="pokemon-name" style="font-weight:bold;">${isShiny ? '✨ ' : ''}${p.name || '???'}</span>
            <span style="color:var(--highlight); font-size:0.85em; font-weight:bold;">Lv.${p.level || 5}</span>
    `;

    if (mode === 'collection' && isCaptured) {
        html += `
            <button class="btn-action btn-sell" onclick="sellPoke('${p._id}', '${p.name}', ${price})">Vendre (${price} 💰)</button>
            ${!isShiny ? `<button class="btn-action btn-trade" onclick="wonderTrade('${p._id}', '${p.name}')">Miracle 🎲</button>` : ''}
        `;
    }
    return html + `</div>`;
}

// --- CHARGEMENT DES DONNÉES ---
async function loadPokedex() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await res.json();
        
        // Grilles Encyclopédie
        const grids = { 1: document.getElementById('grid-1'), 2: document.getElementById('grid-2'), 3: document.getElementById('grid-3') };
        [1,2,3].forEach(n => { if(grids[n]) grids[n].innerHTML = ''; });

        data.fullPokedex.forEach(p => {
            const gen = p.pokedexId <= 151 ? 1 : p.pokedexId <= 251 ? 2 : 3;
            if(grids[gen]) grids[gen].innerHTML += createCard(p, 'pokedex');
        });

        // Grilles Collection
        const shinyGrid = document.getElementById('shiny-grid');
        const dupGrid = document.getElementById('duplicate-grid');
        if(shinyGrid) shinyGrid.innerHTML = '';
        if(dupGrid) dupGrid.innerHTML = '';

        const keepers = new Set();
        data.capturedPokemonsList.forEach(p => {
            if (p.isShiny) {
                if(shinyGrid) shinyGrid.innerHTML += createCard(p, 'collection');
            } else {
                if (keepers.has(p.pokedexId)) {
                    if(dupGrid) dupGrid.innerHTML += createCard(p, 'collection');
                } else {
                    keepers.add(p.pokedexId);
                }
            }
        });
    } catch (e) { console.error(e); }
}

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    if(!container) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const user = await res.json();
        
        let compHtml = '<p>Aucun compagnon</p>';
        if(user.companionPokemon) {
            const cp = user.companionPokemon;
            compHtml = `
                <img src="${POKEAPI_URL}${cp.isShiny ? 'shiny/' : ''}${cp.pokedexId}.png" style="width:100px;">
                <p style="color:var(--shiny); font-weight:bold; margin:0;">${cp.isShiny ? '✨ ' : ''}${cp.name}</p>
                <p style="font-size:0.8em;">Niveau ${cp.level}</p>
            `;
        }

        container.innerHTML = `
            <div class="stat-box" style="text-align:center;"><h3>Compagnon</h3>${compHtml}</div>
            <div class="stat-box"><h2>💰 Portefeuille : ${user.money.toLocaleString()} 💰</h2></div>
            <div class="stat-box">
                <h3 style="text-align:center;">🎒 Inventaire des Balls</h3>
                <div class="ball-inventory">
                    <div class="ball-item"><img src="${BALL_URL}poke-ball.png"><br><b>x${user.pokeballs || 0}</b><br><small>Poké</small></div>
                    <div class="ball-item"><img src="${BALL_URL}great-ball.png"><br><b>x${user.greatballs || 0}</b><br><small>Super</small></div>
                    <div class="ball-item"><img src="${BALL_URL}ultra-ball.png"><br><b>x${user.ultraballs || 0}</b><br><small>Hyper</small></div>
                    <div class="ball-item"><img src="${BALL_URL}master-ball.png"><br><b>x${user.masterballs || 0}</b><br><small>Master</small></div>
                    <div class="ball-item"><img src="${BALL_URL}premier-ball.png"><br><b>x${user.premierballs || 0}</b><br><small>Honor</small></div>
                    <div class="ball-item"><img src="${BALL_URL}luxury-ball.png"><br><b>x${user.luxuryballs || 0}</b><br><small>Luxe</small></div>
                    <div class="ball-item"><img src="${BALL_URL}safari-ball.png"><br><b>x${user.safariballs || 0}</b><br><small>Safari</small></div>
                </div>
            </div>
        `;
    } catch (e) { container.innerHTML = "Erreur de chargement du profil."; }
}

async function loadShop() {
    const container = document.getElementById('shopContainer');
    if(!container) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/shop`);
        const items = await res.json();
        
        // On utilise ici les mêmes noms de fichiers que dans votre section profil
        const icons = { 
            'pokeball': 'poke-ball.png',
            'superball': 'great-ball.png',
            'hyperball': 'ultra-ball.png',
            'masterball': 'master-ball.png',
            'honorball': 'premier-ball.png',
            'luxeball': 'luxury-ball.png',
            'safariball': 'safari-ball.png'
        };
        
        let html = '';
        for (const [key, item] of Object.entries(items)) {
            // Utilisation de BALL_URL définie en haut de votre script
            const fileName = icons[key] || 'poke-ball.png';
            
            html += `
                <div class="pokedex-card">
                    <img src="${BALL_URL}${fileName}" style="width:50px; height:50px; margin: 10px auto; display: block;">
                    <h3 style="font-size:1em; margin: 5px 0;">${item.name}</h3>
                    <p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${item.cost.toLocaleString()} 💰</p>
                    <input type="number" id="qty-${key}" value="1" min="1" style="width:60px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center; padding: 5px;">
                    <button onclick="buyItem('${key}', document.getElementById('qty-${key}').value)" class="btn-action btn-trade" style="width:100%">Acheter</button>
                </div>`;
        }
        container.innerHTML = html;
    } catch (e) { 
        console.error("Erreur shop:", e);
        container.innerHTML = "Erreur lors du chargement de la boutique."; 
    }
}
// --- ACTIONS ---
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
        document.getElementById('modal-img').src = `${POKEAPI_URL}${data.newPokemon.isShiny ? 'shiny/' : ''}${data.newPokemon.pokedexId}.png`;
        document.getElementById('modal-text').innerHTML = `Vous avez reçu : <b>${data.newPokemon.name}</b> !`;
        document.getElementById('trade-modal').style.display = 'flex';
        loadPokedex();
    }
}

async function buyItem(key, qty) {
    const res = await fetch(`${API_BASE_URL}/api/shop/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, itemKey: key, quantity: parseInt(qty) })
    });
    const data = await res.json();
    alert(data.message);
    if(res.ok) loadShop();
}

function logout() { localStorage.clear(); location.reload(); }
document.addEventListener('DOMContentLoaded', initializeApp);







