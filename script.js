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

// --- POKEDEX GÉNÉRAL ---
async function loadPokedex() {
    const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
    const data = await res.json();
    const container = document.getElementById('pokedex-grid');
    
    container.innerHTML = data.map(p => `
        <div class="pokedex-card ${p.owned ? 'owned' : 'not-owned'}">
            <span class="pokedex-number">#${p.id}</span>
            <img src="${POKEAPI_URL}${p.id}.png" style="width:100px;">
            <p>${p.name}</p>
        </div>
    `).join('');
}

// --- COLLECTION PERSONNELLE ---
async function loadCollection() {
    const res = await fetch(`${API_BASE_URL}/api/user/${currentUserId}`);
    const user = await res.json();
    
    const normalGrid = document.getElementById('collection-grid');
    const shinyGrid = document.getElementById('shiny-grid');
    const duplicateGrid = document.getElementById('duplicate-grid');

    const uniqueNormals = [];
    const uniqueShinies = [];
    const duplicates = [];
    const seenNormal = new Set();
    const seenShiny = new Set();

    user.pokemons.forEach(p => {
        if (p.isShiny) {
            if (!seenShiny.has(p.pokedexId)) {
                uniqueShinies.push(p);
                seenShiny.add(p.pokedexId);
            } else {
                duplicates.push(p);
            }
        } else {
            if (!seenNormal.has(p.pokedexId)) {
                uniqueNormals.push(p);
                seenNormal.add(p.pokedexId);
            } else {
                duplicates.push(p);
            }
        }
    });

    const renderCard = (p, isDuplicate = false) => `
        <div class="pokedex-card owned ${p.isShiny ? 'shiny-card' : ''}">
            <img src="${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png" style="width:100px;">
            <p><b>${p.name}</b></p>
            <p><small>Niv. ${p.level || 5}</small></p>
            ${isDuplicate ? `<button class="btn-action btn-trade" onclick="wonderTrade('${p._id}', '${p.name.replace(/'/g, "\\'")}')">Échange Miracle</button>` : ''}
        </div>
    `;

    normalGrid.innerHTML = uniqueNormals.map(p => renderCard(p)).join('');
    shinyGrid.innerHTML = uniqueShinies.map(p => renderCard(p)).join('');
    duplicateGrid.innerHTML = duplicates.map(p => renderCard(p, true)).join('');
}

// --- PROFIL & INVENTAIRE ---
async function loadProfile() {
    const res = await fetch(`${API_BASE_URL}/api/user/${currentUserId}`);
    const user = await res.json();
    const container = document.getElementById('profileContainer');

    container.innerHTML = `
        <div class="stat-box">
            <h2 style="margin-top:0; color:var(--shiny);">💰 Fortune : ${user.money.toLocaleString()} P$</h2>
            <div class="ball-inventory">
                <div class="ball-item"><img src="${BALL_URL}pokeball.png"><br><b>x${user.pokeballs || 0}</b><br><small>Poké Ball</small></div>
                <div class="ball-item"><img src="${BALL_URL}great-ball.png"><br><b>x${user.greatballs || 0}</b><br><small>Super Ball</small></div>
                <div class="ball-item"><img src="${BALL_URL}ultra-ball.png"><br><b>x${user.ultraballs || 0}</b><br><small>Hyper Ball</small></div>
                <div class="ball-item"><img src="${BALL_URL}master-ball.png"><br><b>x${user.masterballs || 0}</b><br><small>Master Ball</small></div>
                <div class="ball-item"><img src="${BALL_URL}premier-ball.png"><br><b>x${user.premierballs || 0}</b><br><small>Honor Ball</small></div>
                <div class="ball-item"><img src="${BALL_URL}luxury-ball.png"><br><b>x${user.luxuryballs || 0}</b><br><small>Luxe Ball</small></div>
                <div class="ball-item">
                    <img src="${BALL_URL}luxury-ball.png" style="filter: hue-rotate(150deg) saturate(1.5);">
                    <br><b>x${user.ellbaballs || 0}</b><br><small>Ellba Ball</small>
                </div>
            </div>
        </div>
    `;
}

// --- BOUTIQUE ---
async function loadShop() {
    const container = document.getElementById('shopContainer');
    const res = await fetch(`${API_BASE_URL}/api/shop/items`);
    const items = await res.json();

    container.innerHTML = items.map(item => `
        <div class="pokedex-card">
            <img src="${BALL_URL}${item.key.replace('balls', '-ball')}.png" style="width:50px; margin: 10px auto;">
            <h3 style="margin:5px 0;">${item.name}</h3>
            <p style="color:var(--shiny); font-weight:bold;">${item.price} P$</p>
            <input type="number" id="qty-${item.key}" value="1" min="1" style="width:60px; background:var(--card-bg); color:white; border:1px solid var(--border); padding:5px; border-radius:5px; margin-bottom:10px;">
            <button class="btn-action btn-trade" onclick="buyItem('${item.key}', document.getElementById('qty-${item.key}').value)">Acheter</button>
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
        
        if (!res.ok) return alert("Erreur : " + (data.message || "Achat impossible"));

        if (data.bonus) {
            const modalImg = document.getElementById('modal-img');
            if (data.bonus.key === 'ellbaballs') {
                modalImg.src = `${BALL_URL}luxury-ball.png`;
                modalImg.style.filter = "hue-rotate(150deg) saturate(1.5)";
            } else {
                modalImg.src = `${BALL_URL}${data.bonus.key.replace('balls', '-ball')}.png`;
                modalImg.style.filter = "none";
            }
            document.getElementById('modal-text').innerHTML = `Félicitations ! Bonus reçu : <b>${data.bonus.name}</b> !`;
            document.getElementById('trade-modal').style.display = 'flex';
        } else {
            alert("Achat effectué avec succès !");
        }
        
        loadProfile(); // Mise à jour immédiate des compteurs
    } catch (e) { alert("Erreur de connexion au serveur"); }
}

// --- ÉCHANGE MIRACLE ---
async function wonderTrade(id, name) {
    if(!confirm(`Envoyer ${name} en Échange Miracle ?`)) return;
    const res = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToTrade: id })
    });
    const data = await res.json();
    if(res.ok) {
        const modalImg = document.getElementById('modal-img');
        modalImg.style.filter = "none"; // Reset filtre si on vient d'un bonus Ellba
        modalImg.src = `${POKEAPI_URL}${data.newPokemon.isShiny ? 'shiny/' : ''}${data.newPokemon.pokedexId}.png`;
        document.getElementById('modal-text').innerHTML = `Échange réussi ! Vous avez reçu : <b>${data.newPokemon.name}</b> !`;
        document.getElementById('trade-modal').style.display = 'flex';
        loadCollection();
    }
}

window.onload = initializeApp;
