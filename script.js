// public/script.js
const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const POKEBALL_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'; 

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- INITIALISATION ---
function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('discordId');
    const usernameFromUrl = urlParams.get('username');
    
    if (idFromUrl) {
        currentUserId = idFromUrl;
        currentUsername = decodeURIComponent(usernameFromUrl);
        localStorage.setItem('currentUserId', currentUserId);
        localStorage.setItem('currentUsername', currentUsername);
        history.pushState(null, '', window.location.pathname); 
    } 
    
    updateUIState(!!currentUserId);
    showPage('pokedex'); 
}

function updateUIState(isLoggedIn) {
    const loggedInDiv = document.getElementById('logged-in-user');
    const loggedOutDiv = document.getElementById('logged-out-user');
    const nav = document.getElementById('main-nav');
    
    if (isLoggedIn) {
        loggedInDiv.style.display = 'flex';
        loggedOutDiv.style.display = 'none';
        nav.style.display = 'flex';
        document.getElementById('display-username').textContent = currentUsername || 'Dresseur';
    } else {
        loggedInDiv.style.display = 'none';
        loggedOutDiv.style.display = 'flex';
        nav.style.display = 'none';
    }
}

function logout() {
    currentUserId = null;
    currentUsername = null;
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    updateUIState(false);
    showPage('pokedex');
}

function showPage(pageName) {
    document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
    const activeSection = document.getElementById(`${pageName}-page`);
    if (activeSection) activeSection.classList.add('active');

    document.querySelectorAll('nav button').forEach(button => button.classList.remove('active'));
    const activeButton = document.getElementById(`nav-${pageName}`);
    if (activeButton) activeButton.classList.add('active');
    
    if (currentUserId) {
        if (pageName === 'pokedex') loadPokedex();
        else if (pageName === 'profile') loadProfile();
        else if (pageName === 'shop') loadShop();
    }
}

// --- LOGIQUE D'AFFICHAGE DU POKEDEX (CORRIGÉE) ---

function createPokedexCard(pokemon, isSellable = false) { 
    const isCaptured = pokemon.isCaptured !== false; 
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');
    
    if (!isCaptured) {
        return `
            <div class="pokedex-card missing-card" style="opacity: 0.5; border: 2px dashed #5a5a5a;">
                <span class="pokedex-id">#${pokeId}</span>
                <img src="${POKEAPI_SPRITE_URL}${pokemon.pokedexId}.png" style="filter: grayscale(100%) brightness(0.3);">
                <span class="pokemon-name" style="color: #888;">???</span>
            </div>`;
    }

    const isShiny = pokemon.isShiny;
    const nameDisplay = isShiny ? `✨ ${pokemon.name}` : pokemon.name;
    const borderStyle = isShiny ? `border: 2px solid var(--shiny-color)` : `border: 2px solid var(--discord-blue)`;
    
    // Calcul prix
    const salePrice = 50 + (pokemon.level || 1) * 5 + (isShiny ? 200 : 0);

    return `
        <div class="pokedex-card" style="${borderStyle}">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png">
            <span class="pokemon-name">${nameDisplay}</span>
            <span class="pokemon-level">Lv.${pokemon.level || 5}</span>
            
            ${isSellable ? `
                <div style="margin-top: auto; padding-top: 10px;">
                    <div style="font-size: 0.8em; color: #aaa; margin-bottom: 5px;">${salePrice} 💰</div>
                    <div style="display: flex; gap: 5px;">
                        <button class="sell-button" onclick="handleSell('${pokemon._id}', '${pokemon.name}', ${salePrice})">Vendre</button>
                        ${!isShiny ? `<button onclick="handleWonderTrade('${pokemon._id}', '${pokemon.name}')" style="background: var(--discord-blue); font-size: 0.7em; padding: 5px;">Miracle</button>` : ''}
                    </div>
                    <div id="action-msg-${pokemon._id}" style="font-size: 0.7em; margin-top: 5px;"></div>
                </div>
            ` : ''}
        </div>`;
}

async function loadPokedex() {
    const container = document.getElementById('pokedexContainer');
    container.innerHTML = '<p>Chargement du Pokédex...</p>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);

        const { fullPokedex, capturedPokemonsList, uniquePokedexCount, maxPokedexId, maxGen1Id, maxGen2Id } = data;
        
        // 1. Header Global
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; background: rgba(0,0,0,0.2); padding: 20px; border-radius: 15px;">
                <div>
                    <h2 style="margin:0; border:none;">Pokédex Officiel</h2>
                    <p style="margin:5px 0 0; color: var(--text-secondary);">Collection unique des générations 1 à 3</p>
                </div>
                <div style="text-align:right;">
                    <span style="font-size: 2em; font-weight: 800; color: var(--highlight-color);">${uniquePokedexCount}</span>
                    <span style="color: var(--text-secondary);"> / ${maxPokedexId}</span>
                </div>
            </div>`;

        // 2. Sections de Générations
        const sections = [
            { title: 'Génération 1 (Kanto)', filter: p => p.pokedexId <= maxGen1Id },
            { title: 'Génération 2 (Johto)', filter: p => p.pokedexId > maxGen1Id && p.pokedexId <= maxGen2Id },
            { title: 'Génération 3 (Hoenn)', filter: p => p.pokedexId > maxGen2Id && p.pokedexId <= maxPokedexId }
        ];

        sections.forEach(sec => {
            const list = fullPokedex.filter(sec.filter);
            if (list.length > 0) {
                const captured = list.filter(p => p.isCaptured).length;
                html += `
                    <div class="gen-section" style="margin-bottom: 40px;">
                        <h3 style="border-bottom: 2px solid var(--highlight-color); padding-bottom: 10px; margin-bottom: 20px;">
                            ${sec.title} <span style="font-size: 0.7em; color: var(--text-secondary); float: right;">${captured} / ${list.length}</span>
                        </h3>
                        <div class="pokedex-grid">
                            ${list.map(p => createPokedexCard(p, false)).join('')}
                        </div>
                    </div>`;
            }
        });

        // 3. Section Doublons & Shinies
        const shinies = capturedPokemonsList.filter(p => p.isShiny);
        const duplicates = capturedPokemonsList.filter(p => !p.isShiny).sort((a,b) => b.level - a.level);
        
        // On garde le meilleur de chaque espèce pour ne pas l'afficher en doublon
        const keepers = new Set();
        const actualDuplicates = duplicates.filter(p => {
            if (keepers.has(p.pokedexId)) return true;
            keepers.add(p.pokedexId);
            return false;
        });

        html += `<h2 style="margin-top: 60px; border-bottom: 2px solid var(--shiny-color); padding-bottom: 10px;">Ma Collection (Vente & Échanges)</h2>`;

        if (shinies.length > 0) {
            html += `
                <div class="gen-section" style="margin-top: 20px;">
                    <h3 style="color: var(--shiny-color);">✨ Pokémon Chromatiques</h3>
                    <div class="pokedex-grid">${shinies.map(p => createPokedexCard(p, true)).join('')}</div>
                </div>`;
        }

        if (actualDuplicates.length > 0) {
            html += `
                <div class="gen-section" style="margin-top: 40px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h3 style="margin:0;">Doublons</h3>
                        <button onclick="handleSellAllDuplicates(${actualDuplicates.length})" style="background: var(--pokeball-red);">Tout vendre (${actualDuplicates.length})</button>
                    </div>
                    <div class="pokedex-grid">${actualDuplicates.map(p => createPokedexCard(p, true)).join('')}</div>
                </div>`;
        }

        container.innerHTML = html;
    } catch (e) {
        container.innerHTML = `<p style="color: var(--red-discord);">Erreur : ${e.message}</p>`;
    }
}

// --- AUTRES FONCTIONS (PROFIL, SHOP, MODAL) ---

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const user = await res.json();
        
        container.innerHTML = `
            <h2>Profil de ${user.username}</h2>
            <div class="profile-stat-card" style="text-align:center;">
                <h3>Compagnon</h3>
                ${user.companionPokemon ? `
                    <img src="${POKEAPI_SPRITE_URL}${user.companionPokemon.isShiny ? 'shiny/' : ''}${user.companionPokemon.pokedexId}.png" style="width:100px;">
                    <p><strong>${user.companionPokemon.name}</strong> (Lv.${user.companionPokemon.level})</p>
                ` : '<p>Aucun compagnon défini.</p>'}
            </div>
            <div class="profile-stat-card">
                <h3>Ressources</h3>
                <p>💰 BotCoins : <strong>${user.money.toLocaleString()}</strong></p>
                <div class="profile-balls-grid">
                    <div><span class="ball-count">${user.pokeballs || 0}</span><span class="ball-name">Poké Balls</span></div>
                    <div><span class="ball-count">${user.superballs || 0}</span><span class="ball-name">Super Balls</span></div>
                    <div><span class="ball-count">${user.hyperballs || 0}</span><span class="ball-name">Hyper Balls</span></div>
                </div>
            </div>`;
    } catch (e) { container.innerHTML = "<p>Erreur profil.</p>"; }
}

async function handleSell(pokemonId, name, price) {
    if (!confirm(`Vendre ${name} pour ${price} 💰 ?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/sell/pokemon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, pokemonIdToSell: pokemonId })
        });
        if (res.ok) loadPokedex();
        else alert("Erreur lors de la vente.");
    } catch (e) { console.error(e); }
}

async function handleWonderTrade(pokemonId, name) {
    if (!confirm(`Envoyer ${name} en échange miracle ?`)) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, pokemonIdToTrade: pokemonId })
        });
        const data = await res.json();
        if (res.ok) {
            alert(`Échange réussi ! Vous avez reçu ${data.newPokemon.name}.`);
            loadPokedex();
        }
    } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', initializeApp);
