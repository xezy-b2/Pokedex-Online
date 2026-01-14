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
        renderTeam();
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

// --- LOGIQUE FAVORIS ET EQUIPE ---
function toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('fav_pokes') || '[]');
    if (favs.includes(id)) {
        favs = favs.filter(i => i !== id);
    } else {
        favs.push(id);
    }
    localStorage.setItem('fav_pokes', JSON.stringify(favs));
    loadPokedex();
}

function toggleTeam(p) {
    let team = JSON.parse(localStorage.getItem('user_team') || '[]');
    const exists = team.findIndex(item => item._id === p._id);

    if (exists > -1) {
        team.splice(exists, 1);
    } else {
        if (team.length >= 6) return alert("Équipe complète !");
        team.push(p);
    }
    localStorage.setItem('user_team', JSON.stringify(team));
    renderTeam();
    loadPokedex();
}

function renderTeam() {
    const container = document.getElementById('team-slots');
    const typeList = document.getElementById('type-list');
    const team = JSON.parse(localStorage.getItem('user_team') || '[]');
    
    container.innerHTML = '';
    const typesFound = new Set();

    for(let i=0; i<6; i++) {
        const p = team[i];
        if (p) {
            container.innerHTML += `<div class="team-slot" onclick="removeFromTeam('${p._id}')">
                <img src="${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png">
            </div>`;
            // Note: Comme ton webserver ne renvoie pas encore les types, on se basera sur l'API plus tard 
            // ou on peut extraire les types si tu les as dans ton objet p.
        } else {
            container.innerHTML += `<div class="team-slot">?</div>`;
        }
    }
    typeList.innerText = team.length > 0 ? "Analyse en cours..." : "Aucun";
}

function removeFromTeam(id) {
    let team = JSON.parse(localStorage.getItem('user_team') || '[]');
    team = team.filter(p => p._id !== id);
    localStorage.setItem('user_team', JSON.stringify(team));
    renderTeam();
    loadPokedex();
}

// --- RENDU DES CARTES ---
function createCard(p, mode = 'pokedex') {
    const isShiny = p.isShiny;
    const isCaptured = p.isCaptured !== false;
    const price = calculatePrice(p);
    const favs = JSON.parse(localStorage.getItem('fav_pokes') || '[]');
    const isFav = favs.includes(p.pokedexId);
    const team = JSON.parse(localStorage.getItem('user_team') || '[]');
    const inTeam = team.some(item => item._id === p._id);

    const img = `${POKEAPI_URL}${isShiny ? 'shiny/' : ''}${p.pokedexId}.png`;
    const ballKey = p.capturedWith || 'pokeball';
    const ballImgUrl = `${BALL_URL}${ballKey.replace('ball', '-ball')}.png`;
    
    let html = `
        <div class="pokedex-card ${!isCaptured ? 'missing' : ''} ${isShiny ? 'is-shiny' : ''}">
            <span style="font-size:0.7em; color:var(--text-sec); position:absolute; top:10px; left:10px;">#${p.pokedexId}</span>
            ${isCaptured ? `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(${p.pokedexId})">❤️</button>` : ''}
            <img src="${img}">
            <span class="pokemon-name" style="font-weight:bold;">${isShiny ? '✨ ' : ''}${p.name || '???'}</span>
            <div style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 5px;">
                <span style="color:var(--highlight); font-size:0.85em; font-weight:bold;">Lv.${p.level || 5}</span>
                ${isCaptured ? `<img src="${ballImgUrl}" style="width:20px; height:20px;" title="${ballKey}">` : ''}
            </div>
    `;

    if (mode === 'collection' && isCaptured) {
        html += `
            <button class="btn-action" style="background:${inTeam ? 'var(--highlight)' : 'var(--card-bg)'}" 
                onclick='toggleTeam(${JSON.stringify(p)})'>${inTeam ? 'En Équipe' : '+ Équipe'}</button>
            <button class="btn-action btn-sell" onclick="sellPoke('${p._id}', '${p.name}', ${price})">Vendre</button>
            ${!isShiny ? `<button class="btn-action btn-trade" onclick="wonderTrade('${p._id}', '${p.name}')">Miracle</button>` : ''}
        `;
    }
    return html + `</div>`;
}

function calculatePrice(p) {
    const totalIVs = (p.iv_hp || 0) + (p.iv_attack || 0) + (p.iv_defense || 0) + (p.iv_special_attack || 0) + (p.iv_special_defense || 0) + (p.iv_speed || 0);
    return 50 + (p.level * 5) + (p.isShiny ? 250 : 0) + Math.floor(totalIVs / 1.5);
}

// --- CHARGEMENT DONNEES ---
async function loadPokedex() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await res.json();
        const favs = JSON.parse(localStorage.getItem('fav_pokes') || '[]');
        
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const totals = { 1: 151, 2: 100, 3: 135, 4: 107, 5: 156, 6: 72 };
        
        for(let i=1; i<=6; i++) {
            const grid = document.getElementById(`grid-${i}`);
            if(grid) grid.innerHTML = '';
        }

        data.fullPokedex.forEach(p => {
            let gen = 1;
            if (p.pokedexId <= 151) gen = 1;
            else if (p.pokedexId <= 251) gen = 2;
            else if (p.pokedexId <= 386) gen = 3;
            else if (p.pokedexId <= 493) gen = 4;
            else if (p.pokedexId <= 649) gen = 5;
            else gen = 6;

            if (p.isCaptured) counts[gen]++;
            const grid = document.getElementById(`grid-${gen}`);
            if (grid) grid.innerHTML += createCard(p, 'pokedex');
        });

        // Update Gen Tabs
        const names = ['Kanto', 'Johto', 'Hoenn', 'Sinnoh', 'Unys', 'Kalos'];
        document.querySelectorAll('#gen-tabs button').forEach((btn, i) => {
            btn.innerHTML = `Gen ${i+1} (${names[i]})<br><small>${counts[i+1]}/${totals[i+1]}</small>`;
        });

        // Collection Grids
        const shinyGrid = document.getElementById('shiny-grid');
        const dupGrid = document.getElementById('duplicate-grid');
        if(shinyGrid) shinyGrid.innerHTML = '';
        if(dupGrid) dupGrid.innerHTML = '';

        const keepers = new Set();
        data.capturedPokemonsList.forEach(p => {
            // Un Pokémon est affiché dans le haut si Shiny OU s'il est mis en favori
            if (p.isShiny || favs.includes(p.pokedexId)) {
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

async function sellAllDuplicates() {
    if(!confirm("Vendre TOUS les doublons non-favoris et non-shiny ?")) return;
    const res = await fetch(`${API_BASE_URL}/api/sell/duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
    });
    if(res.ok) { alert("Vente réussie !"); loadPokedex(); }
}

// --- BOUTIQUE ET PROFIL (Identiques à ta version stable) ---
async function loadProfile() {
    const container = document.getElementById('profileContainer');
    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const user = await res.json();
        
        let compHtml = '<p>Aucun compagnon</p>';
        if(user.companionPokemon) {
            const cp = user.companionPokemon;
            compHtml = `
                <img src="${POKEAPI_URL}${cp.isShiny ? 'shiny/' : ''}${cp.pokedexId}.png" style="width:100px;">
                <p style="color:var(--shiny); font-weight:bold; margin:0;">${cp.name}</p>
            `;
        }

        container.innerHTML = `
            <div class="stat-box" style="text-align:center;"><h3>Compagnon</h3>${compHtml}</div>
            <div class="stat-box"><h2>💰 Portefeuille : ${user.money.toLocaleString()} 💰</h2></div>
            <div class="stat-box">
                <h3 style="text-align:center;">🎒 Inventaire</h3>
                <div class="ball-inventory">
                    <div class="ball-item"><img src="${BALL_URL}poke-ball.png"><br><b>x${user.pokeballs || 0}</b></div>
                    <div class="ball-item"><img src="${BALL_URL}great-ball.png"><br><b>x${user.greatballs || 0}</b></div>
                    <div class="ball-item"><img src="${BALL_URL}ultra-ball.png"><br><b>x${user.ultraballs || 0}</b></div>
                    <div class="ball-item"><img src="${BALL_URL}master-ball.png"><br><b>x${user.masterballs || 0}</b></div>
                </div>
            </div>
        `;
    } catch (e) { console.error(e); }
}

async function loadShop() {
    const container = document.getElementById('shopContainer');
    try {
        const res = await fetch(`${API_BASE_URL}/api/shop`);
        const data = await res.json();
        container.innerHTML = '';
        Object.entries(data).forEach(([key, item]) => {
            container.innerHTML += `
                <div class="pokedex-card">
                    <img src="${BALL_URL}${item.imageFragment}" style="width:35px; margin:auto;">
                    <h3 style="font-size:1em;">${item.name}</h3>
                    <p style="color:var(--shiny)">${item.cost} 💰</p>
                    <button onclick="buyItem('${key}', 1)" class="btn-action btn-trade">Acheter</button>
                </div>`;
        });
    } catch (e) { console.error(e); }
}

async function buyItem(key, qty) {
    const res = await fetch(`${API_BASE_URL}/api/shop/buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, itemKey: key, quantity: qty })
    });
    const data = await res.json();
    alert(data.message);
    loadShop();
}

async function sellPoke(id, name, price) {
    if(!confirm(`Vendre ${name} ?`)) return;
    await fetch(`${API_BASE_URL}/api/sell/pokemon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToSell: id })
    });
    loadPokedex();
}

async function wonderTrade(id, name) {
    const res = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToTrade: id })
    });
    const data = await res.json();
    if(res.ok) {
        document.getElementById('modal-img').src = `${POKEAPI_URL}${data.newPokemon.isShiny ? 'shiny/' : ''}${data.newPokemon.pokedexId}.png`;
        document.getElementById('modal-text').innerHTML = `Reçu : <b>${data.newPokemon.name}</b> !`;
        document.getElementById('trade-modal').style.display = 'flex';
        loadPokedex();
    }
}

function logout() { localStorage.clear(); location.reload(); }
document.addEventListener('DOMContentLoaded', initializeApp);
