const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com';
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

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
    updateUIState(!!currentUserId);
    if (currentUserId) loadPokedex();
}

function updateUIState(isLoggedIn) {
    document.getElementById('logged-in-user').style.display = isLoggedIn ? 'flex' : 'none';
    document.getElementById('logged-out-user').style.display = isLoggedIn ? 'none' : 'flex';
    document.getElementById('main-nav').style.display = isLoggedIn ? 'flex' : 'none';
    if(isLoggedIn) document.getElementById('display-username').textContent = currentUsername;
}

function showPage(pageName) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`${pageName}-page`).classList.add('active');
    document.querySelectorAll('#main-nav button').forEach(b => b.classList.remove('active'));
    document.getElementById(`nav-${pageName}`).classList.add('active');
}

function filterGen(num) {
    document.querySelectorAll('.gen-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`gen-${num}`).classList.add('active');
    document.querySelectorAll('#gen-tabs button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function createCard(p, showButtons = false) {
    const isCaptured = p.isCaptured !== false;
    const isShiny = p.isShiny;
    const pokeId = p.pokedexId.toString().padStart(3, '0');
    
    return `
        <div class="pokedex-card ${!isCaptured ? 'missing-card' : ''}" style="${isShiny ? 'border-color: var(--shiny)' : ''}">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${p.pokedexId}.png">
            <span class="pokemon-name">${isShiny ? '✨ ' : ''}${p.name || '???'}</span>
            <span class="pokemon-level">${isCaptured ? 'Lv.' + (p.level || 5) : '(Non capturé)'}</span>
            ${showButtons ? `<button style="margin-top:10px; width:100%; font-size:0.7em;" onclick="sellPoke('${p._id}')">Relâcher</button>` : ''}
        </div>
    `;
}

async function loadPokedex() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await res.json();
        
        // 1. Stats Banner
        document.getElementById('stats-summary').innerHTML = `
            <div><b>Espèces :</b> ${data.uniquePokedexCount} / ${data.maxPokedexId}</div>
            <div><b>G1 :</b> ${data.fullPokedex.filter(p => p.pokedexId <= 151 && p.isCaptured).length}/151</div>
            <div><b>G2 :</b> ${data.fullPokedex.filter(p => p.pokedexId > 151 && p.pokedexId <= 251 && p.isCaptured).length}/100</div>
        `;

        // 2. Grilles par génération (Onglets)
        const grids = {
            1: document.getElementById('grid-gen-1'),
            2: document.getElementById('grid-gen-2'),
            3: document.getElementById('grid-gen-3')
        };

        Object.keys(grids).forEach(g => grids[g].innerHTML = '');

        data.fullPokedex.forEach(p => {
            let target = 3;
            if (p.pokedexId <= 151) target = 1;
            else if (p.pokedexId <= 251) target = 2;
            grids[target].innerHTML += createCard(p, false);
        });

        // 3. Collection (Ma Collection)
        const collGrid = document.getElementById('collection-grid');
        collGrid.innerHTML = data.capturedPokemonsList.map(p => createCard(p, true)).join('');

    } catch (e) { console.error("Erreur chargement", e); }
}

function logout() {
    localStorage.clear();
    location.reload();
}

document.addEventListener('DOMContentLoaded', initializeApp);
