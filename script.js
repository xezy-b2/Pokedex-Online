// public/script.js (FICHIER COMPLET MODIFIÉ)

const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const POKEBALL_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'; 

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- GESTION DE L'ÉTAT ET DE L'AFFICHAGE ---\

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
        showPage('login'); // S'assurer que le login est la page par défaut
    }
}

function updateUIState(isLoggedIn) {
    document.getElementById('login-section').style.display = isLoggedIn ? 'none' : 'block';
    document.getElementById('user-info-bar').style.display = isLoggedIn ? 'flex' : 'none';
    document.getElementById('main-nav').style.display = isLoggedIn ? 'flex' : 'none';
    
    if (isLoggedIn) {
        document.getElementById('display-username').textContent = currentUsername;
        loadPokedex();
        loadProfile(); // Charger les infos du profil en arrière-plan
    }
}

function logout() {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    currentUserId = null;
    currentUsername = null;
    updateUIState(false);
    document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
    showPage('login');
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(page => {
        page.classList.remove('active');
    });
    const pageElement = document.getElementById(`${pageId}-page`);
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Charger les données si nécessaire
    if (pageId === 'pokedex') {
        loadPokedex();
    } else if (pageId === 'profile') {
        loadProfile();
    }
}

// --- CHARGEMENT DES DONNÉES ---

let allUserPokemon = [];
let userMoney = 0;

async function loadPokedex() {
    if (!currentUserId) return;
    
    const container = document.getElementById('pokedexContainer');
    container.innerHTML = '<h2>Chargement de votre collection...</h2><div class="loader"></div>';
    document.getElementById('pokedex-error-container').textContent = '';

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/${currentUserId}`);
        const data = await response.json();

        if (response.ok) {
            allUserPokemon = data.pokemons || [];
            userMoney = data.money || 0;

            document.getElementById('profile-money').textContent = userMoney.toLocaleString();
            
            // Afficher le Pokédex
            if (allUserPokemon.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary);">Votre Pokédex est vide. Capturez des Pokémon sur Discord !</p>';
                return;
            }

            container.innerHTML = allUserPokemon.map(pokemon => createSellablePokedexCard(pokemon)).join('');

        } else {
            document.getElementById('pokedex-error-container').textContent = data.message || `Erreur lors du chargement: Statut ${response.status}.`;
            container.innerHTML = '<p>Échec du chargement.</p>';
        }
    } catch (error) {
        console.error('Erreur lors du chargement du Pokédex:', error);
        document.getElementById('pokedex-error-container').textContent = 'Erreur de connexion au serveur API.';
        container.innerHTML = '<p>Échec du chargement.</p>';
    }
}

async function loadProfile() {
    if (!currentUserId) return;
    
    const container = document.getElementById('profileContainer');
    container.innerHTML = '<h2>Chargement du Profil...</h2><div class="loader"></div>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/${currentUserId}`);
        const data = await response.json();
        
        if (response.ok) {
            const companion = data.pokemons.find(p => data.companionPokemonId && p._id.toString() === data.companionPokemonId.toString());
            const totalPokemon = data.pokemons.length;
            const uniquePokemon = new Set(data.pokemons.map(p => p.pokedexId)).size;
            
            userMoney = data.money || 0;

            const profileHTML = `
                <h2>Profil de ${currentUsername}</h2>
                <div class="profile-stats">
                    <p><strong>Dresseur :</strong> ${currentUsername}</p>
                    <p><strong>Argent (💰) :</strong> <span id="profile-money">${userMoney.toLocaleString()}</span></p>
                    <p><strong>Total Pokémon capturés :</strong> ${totalPokemon}</p>
                    <p><strong>Pokémon uniques :</strong> ${uniquePokemon} / 151</p>
                    ${companion ? `
                        <p><strong>Compagnon :</strong> 
                            <img src="${POKEAPI_SPRITE_URL}${companion.pokedexId}.png" style="width: 32px; height: 32px; vertical-align: middle;">
                            ${companion.isShiny ? '✨' : ''} ${companion.name} (Niv.${companion.level || 1})
                        </p>
                    ` : '<p><strong>Compagnon :</strong> Aucun</p>'}
                </div>
                `;
            
            container.innerHTML = profileHTML;
        } else {
            container.innerHTML = `<p style="color: var(--red-discord);">Erreur de chargement: ${data.message || 'Statut 500'}</p>`;
        }
    } catch (error) {
        console.error('Erreur lors du chargement du Profil:', error);
        container.innerHTML = '<p style="color: var(--red-discord);">Erreur de connexion au serveur API pour le profil.</p>';
    }
}


// --- GESTION DE L'AFFICHAGE DES CARTES ET DES ACTIONS ---

/**
 * Calcule la somme des IVs.
 */
function calculateIVSum(ivs) {
    if (!ivs) return 0;
    return Object.values(ivs).reduce((sum, iv) => sum + iv, 0);
}

/**
 * Crée le HTML pour une carte Pokémon vendable.
 */
function createSellablePokedexCard(pokemon) {
    const pokeId = pokemon.pokedexId;
    const isShiny = pokemon.isShiny;
    const nameDisplay = isShiny ? `✨ ${pokemon.name}` : pokemon.name;
    const imageSource = `${POKEAPI_SPRITE_URL}versions/generation-v/black-white/animated/${pokeId}.gif`;
    const levelDisplay = `<span class="pokemon-level">Niv.${pokemon.level || 1}</span>`;

    // Calcul du prix de vente
    const basePrice = 50; 
    const levelBonus = (pokemon.level || 1) * 5; 
    const shinyBonus = isShiny ? 200 : 0; 
    const salePrice = basePrice + levelBonus + shinyBonus;

    // IVs et Stats
    const ivSum = calculateIVSum(pokemon.ivs);
    const ivPercentage = Math.round((ivSum / 186) * 100); // 186 est le max (6 * 31)

    // Couleurs de bordure
    const borderStyle = isShiny ? `border: 3px solid var(--shiny-color);` : `border: 3px solid var(--captured-border);`;
    
    const statsDetailsHtml = `
        <details class="stats-details">
            <summary>Stats & IVs</summary>
            <div class="stats-content">
                <p><strong>IVs Total :</strong> ${ivSum} / 186 (${ivPercentage}%)</p>
                <p><strong>PV :</strong> ${pokemon.ivs?.hp || 0}</p>
                <p><strong>Attaque :</strong> ${pokemon.ivs?.attack || 0}</p>
                <p><strong>Défense :</strong> ${pokemon.ivs?.defense || 0}</p>
                <p><strong>Att. Spé. :</strong> ${pokemon.ivs?.['special-attack'] || 0}</p>
                <p><strong>Déf. Spé. :</strong> ${pokemon.ivs?.['special-defense'] || 0}</p>
                <p><strong>Vitesse :</strong> ${pokemon.ivs?.speed || 0}</p>
                ${pokemon.baseStats ? `
                    <div style="margin-top: 8px; border-top: 1px dotted var(--text-secondary); padding-top: 5px;">
                        <strong>Base Stats:</strong>
                        ${pokemon.baseStats.map(stat => `<p style="margin: 2px 0;">${stat.name}: ${stat.base_stat}</p>`).join('')}
                    </div>
                ` : ''}
            </div>
        </details>
    `;

    return `
        <div class="pokedex-card" style="${borderStyle}">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${imageSource}" alt="${pokemon.name}" onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=Err'">
            <span class="pokemon-name">${nameDisplay}</span>
            ${levelDisplay}
            ${statsDetailsHtml} 
            
            <div style="margin-top: 10px; font-size: 0.9em; color: var(--text-secondary);">
                Prix de vente: ${salePrice} 💰
            </div>
            <div style="margin-top: 5px; font-size: 0.9em; color: var(--text-secondary); border-top: 1px dashed var(--header-background); padding-top: 5px;">
                Échange Miracle: 50 💰
            </div>
            
            <button class="sell-button" onclick="handleSell('${pokemon._id}', '${pokemon.name}', ${salePrice})" 
                    style="margin-top: 10px; background-color: var(--pokeball-red);">
                Vendre
            </button>
            <button class="trade-button" onclick="handleWonderTrade('${pokemon._id}', '${pokemon.name}')" 
                    style="margin-top: 5px; background-color: var(--highlight-color);">
                Échange Miracle
            </button>

            <div id="sell-msg-${pokemon._id}" style="font-size: 0.8em; margin-top: 5px;"></div>
        </div>
    `;
}


/**
 * Gère la vente d'un Pokémon.
 */
async function handleSell(pokemonId, pokemonName, salePrice) {
    if (!currentUserId) {
        document.getElementById('pokedex-error-container').textContent = "Veuillez vous connecter avant de vendre.";
        return;
    }

    if (!confirm(`Confirmez-vous la vente de ${pokemonName} pour ${salePrice} 💰 ?`)) {
        return;
    }

    const messageContainer = document.getElementById(`sell-msg-${pokemonId}`);
    messageContainer.style.color = 'var(--shiny-color)'; 
    messageContainer.textContent = `Vente de ${pokemonName} en cours...`;
    
    // Désactiver tous les boutons de vente/échange pour éviter les doubles clics
    document.querySelectorAll('.sell-button, .trade-button').forEach(btn => btn.disabled = true);


    try {
        const response = await fetch(`${API_BASE_URL}/api/sell/pokemon`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                pokemonIdToSell: pokemonId
            })
        });

        const data = await response.json();

        if (response.ok) {
            messageContainer.style.color = 'var(--highlight-color)'; 
            messageContainer.textContent = data.message;
            
            // Recharger le Pokédex pour mettre à jour la liste et l'argent
            await loadPokedex(); 
            
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile(); 
            }

        } else {
            messageContainer.style.color = 'var(--red-discord)'; 
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
            // Réactiver les boutons seulement en cas d'erreur
            document.querySelectorAll('.sell-button, .trade-button').forEach(btn => btn.disabled = false);
        }

    } catch (error) {
        console.error('Erreur lors de la vente:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
        document.querySelectorAll('.sell-button, .trade-button').forEach(btn => btn.disabled = false);
    }
}

/**
 * Gère l'échange miracle d'un Pokémon. (NOUVELLE FONCTION)
 */
async function handleWonderTrade(pokemonId, pokemonName) {
    if (!currentUserId) {
        document.getElementById('pokedex-error-container').textContent = "Veuillez vous connecter avant d'effectuer un échange.";
        return;
    }

    const TRADE_COST = 50; // Doit correspondre à la valeur dans webserver.js

    if (!confirm(`Confirmez-vous l'échange miracle de ${pokemonName} pour ${TRADE_COST} 💰 ? Vous recevrez un Pokémon aléatoire.`)) {
        return;
    }

    const messageContainer = document.getElementById(`sell-msg-${pokemonId}`);
    messageContainer.style.color = 'var(--shiny-color)'; 
    messageContainer.textContent = `Échange miracle de ${pokemonName} en cours...`;
    
    // Désactiver tous les boutons de vente/échange pour éviter les doubles clics
    document.querySelectorAll('.sell-button, .trade-button').forEach(btn => btn.disabled = true);


    try {
        const response = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                pokemonIdToTrade: pokemonId
            })
        });

        const data = await response.json();

        if (response.ok) {
            messageContainer.style.color = 'var(--highlight-color)'; 
            messageContainer.textContent = data.message;
            
            // Recharger le Pokédex pour afficher le nouveau Pokémon et mettre à jour la liste
            await loadPokedex(); 
            
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile(); 
            }

        } else {
            messageContainer.style.color = 'var(--red-discord)'; 
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
            // Réactiver les boutons seulement en cas d'erreur
            document.querySelectorAll('.sell-button, .trade-button').forEach(btn => btn.disabled = false);
        }

    } catch (error) {
        console.error('Erreur lors de l\'échange miracle:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
        document.querySelectorAll('.sell-button, .trade-button').forEach(btn => btn.disabled = false);
    }
}


// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', initializeApp);
