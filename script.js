const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com';
const POKEAPI_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const BALL_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

let currentUserId = localStorage.getItem('currentUserId');
let currentUsername = localStorage.getItem('currentUsername');

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

function showPage(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.getElementById(`${id}-page`).classList.add('active');
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(`nav-${id}`).classList.add('active');
    if(id === 'shop') loadShop();
    if(id === 'profile') loadProfile();
}

function filterGen(gen) {
    document.querySelectorAll('.gen-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`gen-${gen}`).classList.add('active');
    document.querySelectorAll('#gen-tabs button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

// Rendu des cartes
function createCard(p, mode = 'pokedex') {
    const isShiny = p.isShiny;
    const isCaptured = p.isCaptured !== false;
    const img = `${POKEAPI_URL}${isShiny ? 'shiny/' : ''}${p.pokedexId}.png`;
    
    let html = `
        <div class="pokedex-card ${!isCaptured ? 'missing' : ''} ${isShiny ? 'is-shiny' : ''}">
            <span style="font-size:0.7em; color:var(--text-sec)">#${p.pokedexId}</span>
            <img src="${img}">
            <span class="pokemon-name">${isShiny ? '✨ ' : ''}${p.name || '???'}</span>
            <span style="color:var(--highlight); font-size:0.8em;">Lv.${p.level || 5}</span>
    `;

    if (mode === 'collection' && isCaptured) {
        html += `
            <button class="btn-action btn-sell" onclick="sellPoke('${p._id}')">Vendre (50💰)</button>
            ${!isShiny ? `<button class="btn-action btn-trade" onclick="wonderTrade('${p._id}', '${p.name}')">Miracle 🎲</button>` : ''}
        `;
    }
    return html + `</div>`;
}

async function loadPokedex() {
    const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
    const data = await res.json();
    
    // Remplir les Générations
    const grids = { 1: document.getElementById('grid-1'), 2: document.getElementById('grid-2'), 3: document.getElementById('grid-3') };
    Object.values(grids).forEach(g => g.innerHTML = '');
    
    data.fullPokedex.forEach(p => {
        const gen = p.pokedexId <= 151 ? 1 : p.pokedexId <= 251 ? 2 : 3;
        grids[gen].innerHTML += createCard(p, 'pokedex');
    });

    // Remplir Ma Collection (Shinies et Doublons)
    const shinyGrid = document.getElementById('shiny-grid');
    const dupGrid = document.getElementById('duplicate-grid');
    shinyGrid.innerHTML = ''; dupGrid.innerHTML = '';

    const keepers = new Set();
    data.capturedPokemonsList.forEach(p => {
        if (p.isShiny) {
            shinyGrid.innerHTML += createCard(p, 'collection');
        } else {
            if (keepers.has(p.pokedexId)) {
                dupGrid.innerHTML += createCard(p, 'collection');
            } else {
                keepers.add(p.pokedexId);
            }
        }
    });
}

async function loadProfile() {
    const res = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
    const user = await res.json();
    document.getElementById('profileContainer').innerHTML = `
        <div class="stat-box">
            <h2>💰 Portefeuille : ${user.money.toLocaleString()} BotCoins</h2>
        </div>
        <div class="stat-box">
            <h3>🎒 Inventaire de Balls</h3>
            <div style="display:flex; gap:20px; justify-content:center;">
                <div class="item"><img src="${BALL_URL}poke-ball.png"><br>x${user.pokeballs}</div>
                <div class="item"><img src="${BALL_URL}great-ball.png"><br>x${user.superballs}</div>
                <div class="item"><img src="${BALL_URL}ultra-ball.png"><br>x${user.hyperballs}</div>
            </div>
        </div>
    `;
}

async function loadShop() {
    const res = await fetch(`${API_BASE_URL}/api/shop`);
    const items = await res.json();
    let html = '';
    for (const [key, item] of Object.entries(items)) {
        html += `
            <div class="pokedex-card">
                <img src="${BALL_URL}${key === 'pokeball' ? 'poke-ball' : key === 'superball' ? 'great-ball' : 'ultra-ball'}.png">
                <h3>${item.name}</h3>
                <p style="color:var(--shiny)">${item.cost} 💰</p>
                <button onclick="buyItem('${key}')" class="btn-action btn-trade" style="width:100%">Acheter</button>
            </div>`;
    }
    document.getElementById('shopContainer').innerHTML = html;
}

async function wonderTrade(id, name) {
    if(!confirm(`Envoyer ${name} dans l'échange miracle ?`)) return;
    const res = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToTrade: id })
    });
    const data = await res.json();
    if(res.ok) {
        const modal = document.getElementById('trade-modal');
        document.getElementById('modal-img').src = `${POKEAPI_URL}${data.newPokemon.isShiny ? 'shiny/' : ''}${data.newPokemon.pokedexId}.png`;
        document.getElementById('modal-text').innerHTML = `Vous avez reçu <b>${data.newPokemon.name}</b> !`;
        modal.style.display = 'flex';
        loadPokedex();
    }
}

function logout() { localStorage.clear(); location.reload(); }
document.addEventListener('DOMContentLoaded', initializeApp);
