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

function calculatePrice(p) {
    const levelBonus = (p.level || 5) * 5;
    const shinyBonus = p.isShiny ? 250 : 0;
    const totalIVs = (p.iv_hp || 0) + (p.iv_attack || 0) + (p.iv_defense || 0) + (p.iv_sp_attack || 0) + (p.iv_sp_defense || 0) + (p.iv_speed || 0);
    const ivBonus = Math.floor(totalIVs / 1.5); 
    return 50 + levelBonus + shinyBonus + ivBonus;
}

// --- RENDU DES CARTES POKEMON (MODIFIÉ) ---
function createCard(p, mode = 'pokedex') {
    const isShiny = p.isShiny;
    const isCaptured = p.isCaptured !== false;
    const isCompanion = p.isCompanion === true; // Nouveau
    const price = calculatePrice(p);
    const img = `${POKEAPI_URL}${isShiny ? 'shiny/' : ''}${p.pokedexId}.png`;
    
    const ballKey = p.capturedWith || 'pokeball';
    const ballFileName = ballKey.replace('ball', '-ball') + '.png';
    const ballImgUrl = `${BALL_URL}${ballFileName}`;
    
    let html = `
        <div class="pokedex-card ${!isCaptured ? 'missing' : ''} ${isShiny ? 'is-shiny' : ''}">
            ${isCaptured ? `<button class="companion-btn ${isCompanion ? 'active' : ''}" onclick="setCompanion('${p._id}')" title="Définir comme compagnon">❤️</button>` : ''}
            <span style="font-size:0.7em; color:var(--text-sec); position:absolute; top:10px; right:10px;">#${p.pokedexId}</span>
            <img src="${img}">
            <span class="pokemon-name" style="font-weight:bold;">${isShiny ? '✨ ' : ''}${p.name || '???'}</span>
            
            <div style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 5px;">
                <span style="color:var(--highlight); font-size:0.85em; font-weight:bold;">Lv.${p.level || 5}</span>
                ${isCaptured ? `<img src="${ballImgUrl}" style="width:20px; height:20px; margin:0;" title="${ballKey}">` : ''}
            </div>
    `;

    if (mode === 'collection' && isCaptured) {
        html += `
            <button class="btn-action btn-sell" onclick="sellPoke('${p._id}', '${p.name}', ${price})">Vendre (${price} 💰)</button>
            ${!isShiny ? `<button class="btn-action btn-trade" onclick="wonderTrade('${p._id}', '${p.name}')">Miracle 🎲</button>` : ''}
        `;
    }
    return html + `</div>`;
}

// --- CHARGEMENT POKEDEX (MODIFIÉ) ---
async function loadPokedex() {
    try {
        // 1. On récupère d'abord le compagnon actuel via le profil
        const profileRes = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const profileData = await profileRes.json();
        const currentCompanionId = profileData.companionPokemon ? profileData.companionPokemon._id : null;

        const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await res.json();
        
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const totals = { 1: 151, 2: 100, 3: 135, 4: 107, 5: 156, 6: 72 };
        const genNames = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unys', 6: 'Kalos' };
        
        const grids = {};
        for(let i = 1; i <= 6; i++) {
            grids[i] = document.getElementById(`grid-${i}`);
            if(grids[i]) grids[i].innerHTML = '';
        }

        data.fullPokedex.forEach(p => {
            let gen = 1;
            if (p.pokedexId <= 151) gen = 1;
            else if (p.pokedexId <= 251) gen = 2;
            else if (p.pokedexId <= 386) gen = 3;
            else if (p.pokedexId <= 493) gen = 4;
            else if (p.pokedexId <= 649) gen = 5;
            else gen = 6;

            if (p.isCaptured) {
                counts[gen]++;
                // On marque si c'est le compagnon
                p.isCompanion = (p._id === currentCompanionId);
            }
            if (grids[gen]) grids[gen].innerHTML += createCard(p, 'pokedex');
        });

        // Mise à jour des boutons
        const buttons = document.querySelectorAll('#gen-tabs button');
        buttons.forEach((btn, index) => {
            const genNum = index + 1;
            btn.innerHTML = `Gen ${genNum} (${genNames[genNum]}) <br><small>${counts[genNum]}/${totals[genNum]}</small>`;
        });

        const shinyGrid = document.getElementById('shiny-grid');
        const dupGrid = document.getElementById('duplicate-grid');
        if(shinyGrid) shinyGrid.innerHTML = '';
        if(dupGrid) dupGrid.innerHTML = '';

        const keepers = new Set();
        data.capturedPokemonsList.forEach(p => {
            p.isCompanion = (p._id === currentCompanionId);
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
    } catch (e) { console.error("Erreur Pokedex:", e); }
}

// --- DÉFINIR LE COMPAGNON (NOUVEAU) ---
async function setCompanion(pokemonId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/companion/set`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, pokemonId: pokemonId })
        });
        
        if (res.ok) {
            loadPokedex(); // Refresh pour voir le coeur s'animer
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile();
            }
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (e) { console.error("Erreur setCompanion:", e); }
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
                    <div class="ball-item"><img src="${BALL_URL}poke-ball.png"><br><b>x${user.pokeballs || 0}</b><br><small>Poké Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}great-ball.png"><br><b>x${user.greatballs || 0}</b><br><small>Super Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}ultra-ball.png"><br><b>x${user.ultraballs || 0}</b><br><small>Hyper Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}master-ball.png"><br><b>x${user.masterballs || 0}</b><br><small>Master Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}premier-ball.png"><br><b>x${user.premierballs || 0}</b><br><small>Honor Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}luxury-ball.png"><br><b>x${user.luxuryballs || 0}</b><br><small>Luxe Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}safari-ball.png"><br><b>x${user.safariballs || 0}</b><br><small>Safari Ball</small></div>
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
        const data = await res.json();
        const items = Array.isArray(data) ? 
            data.reduce((acc, item) => ({...acc, [item.id || item.key]: item}), {}) : data;

        const getPrice = (keys) => {
            for (let key of keys) {
                if (items[key] && items[key].cost) return items[key].cost.toLocaleString();
            }
            return "0";
        };

        const imgStyle = "width:35px; height:35px; object-fit:contain; display:block; margin: 10px auto;";

        container.innerHTML = `
            <div class="pokedex-card">
                <img src="${BALL_URL}poke-ball.png" style="${imgStyle}">
                <h3 style="font-size:1em; margin: 5px 0;">Poké Ball</h3>
                <p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice(['pokeball'])} 💰</p>
                <input type="number" id="qty-pokeball" value="1" min="1" style="width:50px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center;">
                <button onclick="buyItem('pokeball', document.getElementById('qty-pokeball').value)" class="btn-action btn-trade" style="width:100%">Acheter</button>
            </div>
            <div class="pokedex-card">
                <img src="${BALL_URL}great-ball.png" style="${imgStyle}">
                <h3 style="font-size:1em; margin: 5px 0;">Super Ball</h3>
                <p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice(['superball', 'greatball'])} 💰</p>
                <input type="number" id="qty-superball" value="1" min="1" style="width:50px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center;">
                <button onclick="buyItem('greatball', document.getElementById('qty-superball').value)" class="btn-action btn-trade" style="width:100%">Acheter</button>
            </div>
            <div class="pokedex-card">
                <img src="${BALL_URL}ultra-ball.png" style="${imgStyle}">
                <h3 style="font-size:1em; margin: 5px 0;">Hyper Ball</h3>
                <p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice(['hyperball', 'ultraball'])} 💰</p>
                <input type="number" id="qty-hyperball" value="1" min="1" style="width:50px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center;">
                <button onclick="buyItem('ultraball', document.getElementById('qty-hyperball').value)" class="btn-action btn-trade" style="width:100%">Acheter</button>
            </div>
            <div class="pokedex-card">
                <img src="${BALL_URL}master-ball.png" style="${imgStyle}">
                <h3 style="font-size:1em; margin: 5px 0;">Master Ball</h3>
                <p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice(['masterball'])} 💰</p>
                <input type="number" id="qty-masterball" value="1" min="1" style="width:50px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center;">
                <button onclick="buyItem('masterball', document.getElementById('qty-masterball').value)" class="btn-action btn-trade" style="width:100%">Acheter</button>
            </div>
            <div class="pokedex-card">
                <img src="${BALL_URL}safari-ball.png" style="${imgStyle}">
                <h3 style="font-size:1em; margin: 5px 0;">Safari Ball</h3>
                <p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice(['safariball'])} 💰</p>
                <input type="number" id="qty-safariball" value="1" min="1" style="width:50px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center;">
                <button onclick="buyItem('safariball', document.getElementById('qty-safariball').value)" class="btn-action btn-trade" style="width:100%">Acheter</button>
            </div>
            <div class="pokedex-card">
                <img src="${BALL_URL}premier-ball.png" style="${imgStyle}">
                <h3 style="font-size:1em; margin: 5px 0;">Honor Ball</h3>
                <p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice(['honorball', 'premierball'])} 💰</p>
                <input type="number" id="qty-honorball" value="1" min="1" style="width:50px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center;">
                <button onclick="buyItem('premierball', document.getElementById('qty-honorball').value)" class="btn-action btn-trade" style="width:100%">Acheter</button>
            </div>
            <div class="pokedex-card">
                <img src="${BALL_URL}luxury-ball.png" style="${imgStyle}">
                <h3 style="font-size:1em; margin: 5px 0;">Luxe Ball</h3>
                <p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice(['luxeball', 'luxuryball'])} 💰</p>
                <input type="number" id="qty-luxeball" value="1" min="1" style="width:50px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center;">
                <button onclick="buyItem('luxuryball', document.getElementById('qty-luxeball').value)" class="btn-action btn-trade" style="width:100%">Acheter</button>
            </div>
        `;
    } catch (e) { 
        console.error(e);
        container.innerHTML = "Erreur de chargement de la boutique."; 
    }
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
        document.getElementById('modal-img').src = `${POKEAPI_URL}${data.newPokemon.isShiny ? 'shiny/' : ''}${data.newPokemon.pokedexId}.png`;
        document.getElementById('modal-text').innerHTML = `Vous avez reçu : <b>${data.newPokemon.name}</b> !`;
        document.getElementById('trade-modal').style.display = 'flex';
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
            loadShop();
            loadProfile();
        }
    } catch (e) { console.error("Erreur achat:", e); }
}

function logout() { localStorage.clear(); location.reload(); }
document.addEventListener('DOMContentLoaded', initializeApp);



