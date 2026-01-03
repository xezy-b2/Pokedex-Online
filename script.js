// public/script.js (VERSION COMPLÈTE AVEC MODALE D'ÉCHANGE)

const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const POKEBALL_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'; 

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- GESTION DES FENÊTRES MODALES ---

function openTradeModal(data, oldPokemonName) {
    const modal = document.getElementById('trade-modal');
    if (!modal) return;

    const newPoke = data.newPokemon;
    const isShiny = newPoke.isShiny;
    
    // Remplissage des infos du Pokémon donné
    document.getElementById('modal-given-name').textContent = oldPokemonName;
    
    // Remplissage des infos du Pokémon reçu
    const spriteUrl = `${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${newPoke.pokedexId}.png`;
    document.getElementById('modal-received-img').src = spriteUrl;
    document.getElementById('modal-received-name').textContent = (isShiny ? '✨ ' : '') + newPoke.name;
    document.getElementById('modal-received-lv').textContent = `Niveau ${newPoke.level || 5}`;
    
    // Calcul et affichage des IVs
    const totalIVs = (newPoke.iv_hp || 0) + (newPoke.iv_attack || 0) + (newPoke.iv_defense || 0) + 
                     (newPoke.iv_special_attack || 0) + (newPoke.iv_special_defense || 0) + (newPoke.iv_speed || 0);
    const ivPercentage = ((totalIVs / 186) * 100).toFixed(1);
    
    document.getElementById('modal-received-stats').innerHTML = `
        <strong style="color: var(--shiny-color);">Potentiel : ${ivPercentage}%</strong><br>
        <span style="font-size: 0.85em; color: var(--text-secondary);">
            PV: ${newPoke.iv_hp} | ATK: ${newPoke.iv_attack} | DEF: ${newPoke.iv_defense} | VIT: ${newPoke.iv_speed}
        </span>
    `;

    modal.style.display = 'flex';
}

function closeTradeModal() {
    const modal = document.getElementById('trade-modal');
    if (modal) modal.style.display = 'none';
}

// --- GESTION DE L'ÉTAT ET DE L'AFFICHAGE ---

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
        updateUIState(true);
        showPage('pokedex'); 
        
    } 
    else if (currentUserId) {
        updateUIState(true);
        showPage('pokedex'); 
    }
    else {
        updateUIState(false);
        showPage('pokedex');
        document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
    }
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
    document.getElementById('pokedex-error-container').textContent = '';
}

function showPage(pageName) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(`${pageName}-page`);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    document.querySelectorAll('nav button').forEach(button => {
        button.style.backgroundColor = 'var(--card-background)';
    });
    const activeButton = document.getElementById(`nav-${pageName}`);
    if (activeButton) {
        activeButton.style.backgroundColor = 'var(--highlight-color)';
    }
    
    if (currentUserId) {
        switch (pageName) {
            case 'pokedex':
                loadPokedex();
                break;
            case 'profile':
                loadProfile();
                break;
            case 'shop':
                loadShop();
                break;
        }
    } else if (pageName !== 'pokedex') {
        showPage('pokedex'); 
    }
}


// --- GESTION POKEDEX & PROFIL ---

function createPokedexCard(pokemon, isSellable = false) { 
    const isCaptured = pokemon.isCaptured !== false; 
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');
    
    if (!isCaptured) {
        const missingImageSource = `${POKEAPI_SPRITE_URL}${pokemon.pokedexId}.png`;
        return `
            <div class="pokedex-card missing-card" style="border: 2px dashed var(--missing-border); opacity: 0.6;">
                <span class="pokedex-id">#${pokeId}</span>
                <img src="${missingImageSource}" alt="Inconnu #${pokeId}" 
                     style="filter: grayscale(100%) brightness(0.1);"
                     onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=?'">
                <span class="pokemon-name" style="color: var(--text-secondary);">Inconnu</span>
                <span style="font-size: 0.9em; color: var(--text-secondary); margin-top: 5px;">(Non Capturé)</span>
            </div>
        `;
    }
    
    const isShiny = pokemon.isShiny;
    const borderStyle = isShiny ? `border: 2px solid var(--shiny-color)` : `border: 2px solid var(--captured-border)`;
    
    const imageId = pokemon.formId || pokemon.pokedexId;
    const imageSource = `${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${imageId}.png`;
    const nameDisplay = isShiny ? `✨ ${pokemon.name}` : pokemon.name;
    const levelDisplay = pokemon.level ? `<span class="pokemon-level">Lv.${pokemon.level}</span>` : '';
    
    const basePrice = 50; 
    const levelBonus = (pokemon.level || 1) * 5; 
    const shinyBonus = isShiny ? 200 : 0; 
    const salePrice = basePrice + levelBonus + shinyBonus;

    const ivStatsKeys = [
        { key: 'iv_hp', display: 'PV' },
        { key: 'iv_attack', display: 'Attaque' },
        { key: 'iv_defense', display: 'Défense' },
        { key: 'iv_special_attack', display: 'Att. Spé.' },
        { key: 'iv_special_defense', display: 'Déf. Spé.' },
        { key: 'iv_speed', display: 'Vitesse' }
    ];
    
    let ivsBlockHtml = '';
    if (pokemon.iv_hp !== undefined || pokemon.iv_attack !== undefined) {
        let totalIVs = 0;
        let ivListHtml = '';
        
        ivStatsKeys.forEach(stat => {
            const ivValue = pokemon[stat.key] || 0; 
            totalIVs += ivValue;
            const valueStyle = ivValue === 31 ? 'color: var(--shiny-color); font-weight: bold;' : '';
            ivListHtml += `<li>${stat.display}: <strong style="${valueStyle}">${ivValue}/31</strong></li>`;
        });
        
        const ivPercentage = ((totalIVs / 186) * 100).toFixed(2);
        
        ivsBlockHtml = `
            <h4 style="margin: 10px 0 5px; color: var(--highlight-color); border-top: 1px dashed var(--header-background); padding-top: 5px;">
                IVs Totaux: ${totalIVs}/186 (<span style="color: var(--shiny-color);">${ivPercentage}%</span>)
            </h4>
            <ul>${ivListHtml}</ul>
        `;
    }

    let statsDetailsHtml = '';
    if ((pokemon.baseStats && pokemon.baseStats.length > 0) || ivsBlockHtml) {
        let baseStatsHtml = '';
        if (pokemon.baseStats && pokemon.baseStats.length > 0) {
            const baseStatsList = pokemon.baseStats.map(stat => {
                const translatedName = {
                    hp: 'PV', attack: 'Attaque', defense: 'Défense',
                    'special-attack': 'Att. Spé.', 'special-defense': 'Déf. Spé.', speed: 'Vitesse'
                }[stat.name] || stat.name;
                return `<li>${translatedName}: <strong>${stat.base_stat}</strong></li>`;
            }).join('');
            
            baseStatsHtml = `<h4 style="margin: 10px 0 5px; color: var(--text-color); padding-top: 5px;">Stats de Base</h4><ul>${baseStatsList}</ul>`;
        }

        statsDetailsHtml = `
            <details style="text-align: left; margin-top: 10px; border-top: 1px solid var(--header-background); padding-top: 5px;">
                <summary style="font-weight: bold; cursor: pointer; color: var(--text-secondary); list-style: none; display: flex; align-items: center;">
                    <span style="flex-grow: 1;">Détails des Stats</span>
                    <span style="font-size: 0.8em; color: var(--highlight-color);">[+]</span>
                </summary>
                ${baseStatsHtml}
                ${ivsBlockHtml}
            </details>
        `;
    }

    let sellAndTradeButtonsHtml = '';
    if (isSellable) {
        let wonderTradeButtonHtml = isShiny ? 
            `<button class="trade-button" disabled style="margin-top: 10px; margin-left: 5px; background-color: var(--card-background); color: var(--text-secondary); cursor: not-allowed;">Échange Miracle (Indisponible sur ✨)</button>` :
            `<button class="trade-button" onclick="handleWonderTrade('${pokemon._id}', '${pokemon.name}')" style="margin-top: 10px; margin-left: 5px; background-color: var(--discord-blue);">Échange Miracle</button>`;
        
        sellAndTradeButtonsHtml = `
            <div style="margin-top: 10px; font-size: 0.9em; color: var(--text-secondary);">Prix: ${salePrice} 💰</div>
            <div style="display: flex; justify-content: center; margin-top: 10px;">
                <button class="sell-button" onclick="handleSell('${pokemon._id}', '${pokemon.name}', ${salePrice})" style="background-color: var(--pokeball-red);">Vendre</button>
                ${wonderTradeButtonHtml}
            </div>
            <div id="action-msg-${pokemon._id}" style="font-size: 0.8em; margin-top: 5px;"></div>
        `;
    }

    return `<div class="pokedex-card" style="${borderStyle}"><span class="pokedex-id">#${pokeId}</span><img src="${imageSource}" alt="${pokemon.name}"><span class="pokemon-name">${nameDisplay}</span>${levelDisplay}${statsDetailsHtml}${sellAndTradeButtonsHtml}</div>`;
}

async function loadPokedex() {
    const container = document.getElementById('pokedexContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = '<p>Chargement du Pokédex...</p>';
    errorContainer.textContent = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await response.json();

        if (!response.ok) {
            errorContainer.textContent = `Erreur: ${data.message || 'Impossible de charger le Pokédex.'}`;
            return;
        }

        const { fullPokedex, capturedPokemonsList, uniquePokedexCount, maxPokedexId, maxGen1Id, maxGen2Id } = data; 
        let html = `<h2>Pokédex Officiel (Unique)</h2><p>Espèces : ${uniquePokedexCount}/${maxPokedexId}</p>`;
        
        const gen1Unique = fullPokedex.filter(p => p.pokedexId <= maxGen1Id);
        const gen2Unique = fullPokedex.filter(p => p.pokedexId > maxGen1Id && p.pokedexId <= maxGen2Id);
        const gen3Unique = fullPokedex.filter(p => p.pokedexId > maxGen2Id && p.pokedexId <= maxPokedexId);

        const generateGrid = (title, list) => `<h3>${title}</h3><div class="pokedex-grid">${list.map(p => createPokedexCard(p, false)).join('')}</div>`;

        if (gen1Unique.length > 0) html += generateGrid('Génération 1', gen1Unique);
        if (gen2Unique.length > 0) html += generateGrid('Génération 2', gen2Unique);
        if (gen3Unique.length > 0) html += generateGrid('Génération 3', gen3Unique);

        const shinies = capturedPokemonsList.filter(p => p.isShiny);
        const duplicates = capturedPokemonsList.filter(p => !p.isShiny).sort((a,b) => b.level - a.level);
        const keepers = new Set();
        const actualDuplicates = duplicates.filter(p => {
            if (keepers.has(p.pokedexId)) return true;
            keepers.add(p.pokedexId);
            return false;
        });

        html += `<h2 style="margin-top:40px;">Ma Collection (${capturedPokemonsList.length})</h2>`;
        if (shinies.length > 0) html += `<h3>✨ Chromatiques</h3><div class="pokedex-grid">${shinies.map(p => createPokedexCard(p, true)).join('')}</div>`;
        if (actualDuplicates.length > 0) {
            html += `<h3>Doublons</h3><button onclick="handleSellAllDuplicates(${actualDuplicates.length})" style="background-color: var(--pokeball-red);">Vendre Doublons</button><div id="sell-all-duplicates-msg"></div><div class="pokedex-grid">${actualDuplicates.map(p => createPokedexCard(p, true)).join('')}</div>`;
        }

        container.innerHTML = html;
    } catch (error) {
        errorContainer.textContent = 'Erreur de connexion API.';
    }
}

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const user = await response.json();
        if (!response.ok) return;

        container.innerHTML = `<h2>Profil de ${user.username}</h2>` + createCompanionCard(user.companionPokemon) + 
            `<div class="profile-stat-card"><h3>Stats</h3><p>💰 ${user.money.toLocaleString()} BotCoins</p><p>🐾 ${user.stats.totalCaptures} Captures</p></div>`;
    } catch (e) { console.error(e); }
}

function createCompanionCard(pokemon) {
    if (!pokemon) return `<div class="profile-stat-card"><h3>Compagnon</h3><p>Aucun compagnon défini.</p></div>`;
    const imageSource = `${POKEAPI_SPRITE_URL}${pokemon.isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png`;
    return `<div class="profile-stat-card" style="border: 2px solid ${pokemon.isShiny ? 'var(--shiny-color)' : 'var(--captured-border)'};"><h3>Compagnon</h3><img src="${imageSource}" style="width:100px;"><p>${pokemon.name} Niv.${pokemon.level}</p></div>`;
}

async function loadShop() {
    const container = document.getElementById('shopContainer');
    try {
        const response = await fetch(`${API_BASE_URL}/api/shop`);
        const items = await response.json();
        container.innerHTML = `<div class="shop-grid">${Object.keys(items).map(k => createShopCard(k, items[k])).join('')}</div>`;
    } catch (e) { console.error(e); }
}

function createShopCard(key, item) {
    return `<div class="shop-card"><h4>${item.name}</h4><img src="${POKEBALL_IMAGE_BASE_URL}${item.imageFragment}" style="width:50px;"><p>${item.cost} 💰</p><input type="number" id="qty-${key}" value="1" min="1" style="width:50px;"><button onclick="handleBuy('${key}', document.getElementById('qty-${key}').value)">Acheter</button><div id="msg-${key}"></div></div>`;
}

async function handleBuy(itemKey, qty) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, itemKey, quantity: parseInt(qty) })
        });
        const data = await response.json();
        document.getElementById(`msg-${itemKey}`).textContent = data.message;
        if (response.ok) loadProfile();
    } catch (e) { console.error(e); }
}

async function handleSell(pokemonId, pokemonName, price) {
    if (!confirm(`Vendre ${pokemonName} pour ${price} 💰 ?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/sell/pokemon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, pokemonIdToSell: pokemonId })
        });
        if (response.ok) { loadPokedex(); loadProfile(); }
    } catch (e) { console.error(e); }
}

// --- LOGIQUE ÉCHANGE MIRACLE AVEC POP-UP (MODALE) ---
async function handleWonderTrade(pokemonIdToTrade, pokemonName) {
    if (!currentUserId) return;
    if (!confirm(`Échanger ${pokemonName} ? (Action définitive)`)) return;
    
    const messageContainer = document.getElementById(`action-msg-${pokemonIdToTrade}`);
    messageContainer.textContent = "Échange en cours...";

    try {
        const response = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, pokemonIdToTrade })
        });

        const data = await response.json();

        if (response.ok) {
            // Affichage de la modale avec les détails
            openTradeModal(data, pokemonName);
            // Rafraîchir le pokedex
            await loadPokedex(); 
        } else {
            messageContainer.style.color = 'var(--red-discord)'; 
            messageContainer.textContent = data.message || "Erreur lors de l'échange.";
        }
    } catch (error) {
        messageContainer.textContent = "Erreur de connexion.";
    }
}

async function handleSellAllDuplicates(count) {
    if (!confirm(`Vendre les ${count} doublons ?`)) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/sell/duplicates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
        });
        if (response.ok) { loadPokedex(); loadProfile(); }
    } catch (e) { console.error(e); }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    document.getElementById('nav-pokedex').addEventListener('click', () => showPage('pokedex'));
    document.getElementById('nav-profile').addEventListener('click', () => showPage('profile'));
    document.getElementById('nav-shop').addEventListener('click', () => showPage('shop'));
});
