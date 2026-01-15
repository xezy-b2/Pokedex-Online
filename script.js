// script.js - Version Complète Corrigée

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

    if (id === 'pokedex') loadPokedex();
    if (id === 'profile') loadProfile();
    if (id === 'shop') loadShop();
}

// --- LOGIQUE DU PROFIL (CORRIGÉE POUR ELLBABALLS) ---
async function loadProfile() {
    if (!currentUserId) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const user = await res.json();

        const container = document.getElementById('profileContainer');
        
        // Configuration des balls à afficher
        const ballsConfig = [
            { key: 'pokeballs', name: 'Poké Ball', img: 'poke-ball.png' },
            { key: 'greatballs', name: 'Super Ball', img: 'great-ball.png' },
            { key: 'ultraballs', name: 'Hyper Ball', img: 'ultra-ball.png' },
            { key: 'masterballs', name: 'Master Ball', img: 'master-ball.png' },
            { key: 'safariballs', name: 'Safari Ball', img: 'safari-ball.png' },
            { key: 'premierballs', name: 'Honor Ball', img: 'premier-ball.png' },
            { key: 'luxuryballs', name: 'Luxe Ball', img: 'luxury-ball.png' },
            { key: 'ellbaballs', name: 'Ellba Ball', img: 'ultra-ball.png' } // Correction ici
        ];

        let ballsHtml = ballsConfig.map(b => `
            <div class="ball-stat">
                <img src="${BALL_URL}${b.img}" alt="${b.name}">
                <span>${user[b.key] || 0}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="profile-card">
                <div class="profile-header">
                    <img src="https://ui-avatars.com/api/?name=${user.username}&background=random" class="avatar">
                    <div class="info">
                        <h2>${user.username}</h2>
                        <p class="money">Argent: <span>${user.money.toLocaleString()} 💰</span></p>
                    </div>
                </div>

                <div class="inventory-section">
                    <h3>Sac de Balls</h3>
                    <div class="balls-grid">${ballsHtml}</div>
                </div>

                <div class="companion-section">
                    <h3>Compagnon Actuel</h3>
                    <div id="companion-slot">
                        ${user.companionPokemon ? `
                            <div class="pokemon-card ${user.companionPokemon.isShiny ? 'shiny-effect' : ''}">
                                <img src="${POKEAPI_URL}${user.companionPokemon.isShiny ? 'shiny/' : ''}${user.companionPokemon.pokedexId}.png">
                                <p>LVL ${user.companionPokemon.level} ${user.companionPokemon.name}</p>
                            </div>
                        ` : '<p>Aucun compagnon sélectionné</p>'}
                    </div>
                </div>
            </div>
        `;
    } catch (e) { console.error("Erreur profil:", e); }
}

// --- LOGIQUE DU POKEDEX ---
async function loadPokedex() {
    if (!currentUserId) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await res.json();

        const mainGrid = document.getElementById('pokedex-grid');
        const shinyGrid = document.getElementById('shiny-grid');
        const duplicateGrid = document.getElementById('duplicate-grid');

        mainGrid.innerHTML = '';
        shinyGrid.innerHTML = '';
        duplicateGrid.innerHTML = '';

        // Affichage Pokedex Classique
        data.fullPokedex.forEach(p => {
            const card = document.createElement('div');
            card.className = `pokemon-card ${p.isCaptured ? 'captured' : 'missing'}`;
            card.innerHTML = `
                <img src="${POKEAPI_URL}${p.pokedexId}.png" style="${p.isCaptured ? '' : 'filter: brightness(0) invert(1); opacity: 0.2;'}">
                <p>#${p.pokedexId} ${p.name}</p>
            `;
            mainGrid.appendChild(card);
        });

        // Affichage Shiny & Doublons
        data.capturedPokemonsList.forEach(p => {
            const card = createActionCard(p);
            if (p.isShiny) {
                shinyGrid.appendChild(card.cloneNode(true));
            } else {
                duplicateGrid.appendChild(card);
            }
        });

    } catch (e) { console.error("Erreur pokedex:", e); }
}

function createActionCard(p) {
    const div = document.createElement('div');
    div.className = `pokemon-card ${p.isShiny ? 'shiny-effect' : ''}`;
    div.innerHTML = `
        <img src="${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png">
        <p>LVL ${p.level} ${p.name}</p>
        <div class="card-actions">
            <button onclick="setCompanion('${p._id}')" title="Compagnon">⭐</button>
            <button onclick="wonderTrade('${p._id}', '${p.name}')" title="Échange Miracle">🔄</button>
            <button onclick="sellPokemon('${p._id}', '${p.name}')" title="Vendre">💰</button>
        </div>
    `;
    return div;
}

// --- ACTIONS UNITAIRES ---
async function setCompanion(id) {
    const res = await fetch(`${API_BASE_URL}/api/companion/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonId: id })
    });
    if (res.ok) alert("Nouveau compagnon défini !");
}

async function sellPokemon(id, name) {
    if (!confirm(`Vendre ${name} ?`)) return;
    const res = await fetch(`${API_BASE_URL}/api/sell/pokemon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToSell: id })
    });
    if (res.ok) loadPokedex();
}

async function wonderTrade(id, name) {
    if (!confirm(`Envoyer ${name} en Échange Miracle ?`)) return;
    const res = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToTrade: id })
    });
    const data = await res.json();
    if (res.ok) {
        document.getElementById('modal-img').src = `${POKEAPI_URL}${data.newPokemon.isShiny ? 'shiny/' : ''}${data.newPokemon.pokedexId}.png`;
        document.getElementById('modal-text').innerHTML = `Vous avez reçu : <b>${data.newPokemon.name}</b> !`;
        document.getElementById('trade-modal').style.display = 'flex';
        loadPokedex();
    }
}

// --- BOUTIQUE ---
async function loadShop() {
    const container = document.getElementById('shopContainer');
    try {
        const res = await fetch(`${API_BASE_URL}/api/shop`);
        const items = await res.json();

        container.innerHTML = Object.entries(items).map(([key, item]) => `
            <div class="shop-card">
                <img src="${BALL_URL}${getBallImg(key)}">
                <h3>${item.name}</h3>
                <p>${item.cost} 💰</p>
                <div class="buy-group">
                    <input type="number" id="qty-${key}" value="1" min="1" max="99">
                    <button onclick="buyItem('${key}', document.getElementById('qty-${key}').value)">Acheter</button>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error("Erreur shop:", e); }
}

function getBallImg(key) {
    const mapping = {
        'pokeball': 'poke-ball.png', 'greatball': 'great-ball.png',
        'ultraball': 'ultra-ball.png', 'masterball': 'master-ball.png',
        'safariball': 'safari-ball.png', 'premierball': 'premier-ball.png',
        'luxuryball': 'luxury-ball.png'
    };
    return mapping[key] || 'poke-ball.png';
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
        
        if (!res.ok) {
            alert("Erreur : " + (data.message || "Achat impossible"));
        } else {
            alert(data.message);
            loadProfile(); // Recharge l'argent et le sac de balls
        }
    } catch (e) {
        console.error("Erreur achat:", e);
    }
}

async function sellDuplicates() {
    if(!confirm("Vendre tous vos doublons non-chromatiques ?")) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/sell/duplicates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
        });
        const data = await res.json();
        alert(data.message);
        loadPokedex();
    } catch (e) { console.error(e); }
}

// --- INIT ---
window.onload = initializeApp;
