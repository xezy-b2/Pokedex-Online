// public/script.js (VERSION FINALE - AJOUT DES SPRITES DE BALLS DANS LE PROFIL)

const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const POKEBALL_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'; 

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- NOUVEAU: Map pour lier les clés de BDD aux fragments de sprites ---
const BALL_SPRITE_MAP = {
    'pokeballs': 'poke-ball',
    'greatballs': 'great-ball',
    'ultraballs': 'ultra-ball',
    'masterballs': 'master-ball',
    'safariballs': 'safari-ball',
    'premierballs': 'premier-ball',
    'luxuryballs': 'luxury-ball'
};

// --- GESTION DE L'ÉTAT ET DE L'AFFICHAGE ---

/**
 * Initialise l'application : vérifie l'URL pour un ID après redirection OAuth2
 * ou charge l'état de la session locale.
 */
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

/**
 * Met à jour l'interface utilisateur en fonction de l'état de connexion.
 */
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

/**
 * Déconnecte l'utilisateur.
 */
function logout() {
    currentUserId = null;
    currentUsername = null;
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    updateUIState(false);
    showPage('pokedex');
    document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
    document.getElementById('pokedex-error-container').textContent = '';
}

/**
 * Change la page active (simule la navigation).
 */
function showPage(pageName) {
    // 1. Gère les classes de sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(`${pageName}-page`);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    // 2. Met en évidence le bouton de navigation actif
    document.querySelectorAll('nav button').forEach(button => {
        button.style.backgroundColor = 'var(--card-background)';
    });
    const activeButton = document.getElementById(`nav-${pageName}`);
    if (activeButton) {
        activeButton.style.backgroundColor = 'var(--highlight-color)';
    }
    
    // 3. Charge le contenu si l'utilisateur est connecté
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
        // Redirige vers pokedex si non connecté et tente d'accéder à autre chose
        showPage('pokedex'); 
    }
}


// --- GESTION POKEDEX & PROFIL ---

/**
 * Crée une carte de Pokémon HTML.
 * @param {object} pokemon L'objet Pokémon.
 * @param {number} count Nombre de copies de ce type (Normal ou Shiny).
 * @param {boolean} isCaptured Vrai si au moins un a été capturé.
 * @param {boolean} isShiny Vrai si on affiche la version Shiny.
 */
function createPokedexCard(pokemon, count, isCaptured, isShiny) {
    
    const borderStyle = isCaptured 
        ? (isShiny ? `border: 2px solid var(--shiny-color)` : `border: 2px solid var(--captured-border)`)
        : `border: 2px dashed var(--missing-border)`;
    
    const imageSource = isCaptured 
        ? `${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png`; // Placeholder

    const nameDisplay = isCaptured 
        ? (isShiny ? `✨ ${pokemon.name}` : pokemon.name) 
        : `???`;
        
    const countDisplay = isCaptured && count > 1 ? `<span class="pokemon-count">x${count}</span>` : '';
    
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');

    // Ajout du suffixe (S) pour la carte Shiny
    const idDisplay = isShiny ? `#${pokeId} (S)` : `#${pokeId}`;

    return `
        <div class="pokedex-card" style="${borderStyle}">
            <span class="pokedex-id">${idDisplay}</span>
            <img src="${imageSource}" alt="${pokemon.name || 'Inconnu'}" onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=Err'">
            <span class="pokemon-name">${nameDisplay}</span>
            ${countDisplay}
        </div>
    `;
}

/**
 * Charge les données du Pokédex depuis l'API.
 */
async function loadPokedex() {
    const container = document.getElementById('pokedexContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = '<h2>Chargement du Pokédex...</h2><div class="spinner"></div>';
    errorContainer.textContent = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await response.json();

        if (!response.ok) {
            errorContainer.textContent = `❌ Erreur: ${data.message || 'Impossible de charger les données du Pokédex.'}`;
            container.innerHTML = `<p>Veuillez vérifier votre connexion et votre ID Discord.</p>`;
            return;
        }

        const { fullPokedex } = data; 

        // Map pour stocker les données séparées pour le Pokédex (Normal et Shiny)
        const pokedexMap = new Map();
        let uniqueCaptures = new Set(); 

        fullPokedex.forEach(p => {
            const id = p.pokedexId;
            const isShiny = p.isShiny || false;
            const key = `${id}_${isShiny ? 'shiny' : 'normal'}`; 
            
            uniqueCaptures.add(id);

            if (!pokedexMap.has(key)) {
                pokedexMap.set(key, {
                    ...p,
                    count: 1,
                    isCaptured: true,
                    isShiny: isShiny, 
                    name: p.name || `N°${id}`
                });
            } else {
                pokedexMap.get(key).count++;
            }
        });

        const maxId = 151; 
        let pokedexGridHtml = '<div class="pokedex-grid">';
        
        for (let i = 1; i <= maxId; i++) { 
            const normalKey = `${i}_normal`;
            const shinyKey = `${i}_shiny`;
            
            const pokemonNormal = pokedexMap.get(normalKey);
            const pokemonShiny = pokedexMap.get(shinyKey);
            
            // 1. Affiche la carte NORMALE
            if (pokemonNormal) {
                pokedexGridHtml += createPokedexCard(pokemonNormal, pokemonNormal.count, true, false);
            } else {
                // Manquant (Normal)
                pokedexGridHtml += createPokedexCard({ pokedexId: i, name: `N°${i}` }, 0, false, false);
            }
            
            // 2. Affiche la carte SHINY (seulement si capturée)
            if (pokemonShiny) {
                pokedexGridHtml += createPokedexCard(pokemonShiny, pokemonShiny.count, true, true);
            } 
        }
        
        pokedexGridHtml += '</div>';
        
        let html = `
            <h2>Mon Pokédex</h2>
            <p>Total espèces uniques capturées : <strong>${uniqueCaptures.size}</strong> / ${maxId}</p>
            <p class="pokedex-note">Les cartes encadrées en <span class="badge" style="background-color: var(--shiny-color); color: var(--background); padding: 2px 5px; border-radius: 4px;">OR</span> sont des versions Shiny (affichées séparément).</p>
        `;

        container.innerHTML = html + pokedexGridHtml;

    } catch (error) {
        console.error('Erreur de chargement du Pokédex:', error);
        errorContainer.textContent = 'Erreur de connexion au serveur API.';
        container.innerHTML = '';
    }
} 


/**
 * Crée la carte HTML du Pokémon Compagnon.
 * @param {object|null} pokemon Objet Pokémon ou null.
 */
function createCompanionCard(pokemon) {
    if (!pokemon) {
        return `
            <div class="profile-stat-card" style="text-align: center; border: 2px dashed var(--missing-border);">
                <h3 style="color: var(--text-secondary);">Pokémon Compagnon</h3>
                <p style="margin: 0; color: var(--text-secondary);">Vous n'avez pas de Pokémon compagnon défini !</p>
                <p style="margin: 5px 0 0; font-size: 0.8em; color: var(--text-secondary);">Utilisez la commande **!setcompanion** sur Discord.</p>
            </div>
        `;
    }
    
    const isShiny = pokemon.isShiny;
    const imageSource = `${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png`;
    const nameDisplay = isShiny ? `✨ ${pokemon.name}` : pokemon.name; 
    const borderColor = isShiny ? 'var(--shiny-color)' : 'var(--captured-border)';
    
    return `
        <div class="profile-stat-card" style="border: 2px solid ${borderColor}; text-align: center;">
            <h3 style="color: ${borderColor};">Pokémon Compagnon</h3>
            <div style="display: flex; flex-direction: column; align-items: center;">
                <img src="${imageSource}" alt="${pokemon.name}" style="width: 128px; height: 128px; image-rendering: pixelated; margin: 10px 0; border: 3px solid ${borderColor}; border-radius: 50%; background-color: var(--card-background);">
                <span style="font-size: 1.8em; font-weight: bold; color: ${isShiny ? 'var(--shiny-color)' : 'var(--text-color)'}; margin-top: 5px;">${nameDisplay}</span>
                <span style="font-size: 1.2em; color: var(--text-secondary);">Niv. ${pokemon.level || 5} | #$${pokemon.pokedexId.toString().padStart(3, '0')}</span>
            </div>
        </div>
    `;
}

/**
 * Charge les données du Profil depuis l'API.
 */
async function loadProfile() {
    const container = document.getElementById('profileContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = '<h2>Chargement du Profil...</h2>';
    errorContainer.textContent = '';

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const data = await response.json();

        if (!response.ok) {
            errorContainer.textContent = `Erreur: ${data.message || 'Impossible de charger les données du Profil.'}`;
            container.innerHTML = '';
            return;
        }

        const user = data;
        
        const companionHtml = createCompanionCard(user.companionPokemon);
        
        const statsHtml = `
            <div class="profile-stat-card">
                <h3>Statistiques Clés</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    
                    <div style="background-color: #FFD7001A; border: 2px solid #FFD700; border-radius: 8px; padding: 15px; text-align: center;">
                        <span style="font-size: 2.5em;">💰</span>
                        <p id="profile-money" style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: #FFD700;">${user.money.toLocaleString()}</p>
                        <p style="margin: 0; color: var(--text-secondary);">BotCoins</p>
                    </div>

                    <div style="background-color: #4CAF501A; border: 2px solid #4CAF50; border-radius: 8px; padding: 15px; text-align: center;">
                        <span style="font-size: 2.5em;">⭐</span>
                        <p style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: var(--highlight-color);">${user.stats.totalCaptures.toLocaleString()}</p>
                        <p style="margin: 0; color: var(--text-secondary);">Captures Totales</p>
                    </div>

                    <div style="background-color: #007bff1A; border: 2px solid #007bff; border-radius: 8px; padding: 15px; text-align: center;">
                        <span style="font-size: 2.5em;">📚</span>
                        <p style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: var(--captured-border);">${user.stats.uniqueCaptures}/151</p>
                        <p style="margin: 0; color: var(--text-secondary);">Espèces Uniques</p>
                    </div>
                </div>
            </div>
        `;

        const ballsHtml = `
            <div class="profile-stat-card">
                <h3>Inventaire de Poké Balls</h3>
                <div class="profile-balls-grid">
                    ${Object.entries(user).filter(([key]) => key.endsWith('balls')).map(([key, count]) => {
                        let displayName = key.replace('balls', ' Ball');
                        if (key === 'pokeballs') displayName = 'Poké Ball'; 
                        
                        if (key.includes('luxury')) displayName = 'Luxury Ball';
                        else if (key.includes('premier')) displayName = 'Premier Ball';
                        else if (key.includes('safari')) displayName = 'Safari Ball';

                        // Récupération du fragment de sprite ou fallback
                        const spriteFragment = BALL_SPRITE_MAP[key] || 'mystery-berry'; // 'mystery-berry' est un fallback PokeAPI
                        const spriteUrl = `${POKEBALL_IMAGE_BASE_URL}${spriteFragment}.png`;

                        return `
                            <div class="ball-item">
                                <img src="${spriteUrl}" alt="${displayName}" class="ball-sprite" onerror="this.onerror=null; this.style.display='none';">
                                <span class="ball-count">${(count || 0).toLocaleString()}</span>
                                <span class="ball-name">${displayName}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;

        container.innerHTML = `<h2>Profil de ${user.username}</h2>` + companionHtml + statsHtml + ballsHtml;

    } catch (error) {
        console.error('Erreur de chargement du Profil:', error);
        errorContainer.textContent = 'Erreur de connexion au serveur API.';
        container.innerHTML = '';
    }
} 


// --- GESTION DE LA BOUTIQUE (SHOP) ---

/**
 * Crée la carte HTML du Pokémon Compagnon.
 * @param {string} itemKey Clé de l'article (ex: 'pokeball').
 * @param {object} item Objet d'article avec les détails (name, cost, desc, promo, imageFragment).
 */
function createShopCard(itemKey, item) {
    const hasPromo = item.promo; 
    
    // Ajout d'un pas de 10 pour les balls plus chères, ou 1 pour les pokéballs
    const inputStep = itemKey === 'pokeball' ? '1' : '10'; 

    const quantityInput = `
        <div style="margin: 15px 0; display: flex; gap: 10px; justify-content: center;">
            <input type="number" id="qty-${itemKey}" min="1" value="1" step="${inputStep}"
                   style="width: 80px; text-align: center; background-color: var(--header-background); color: var(--text-color);">
            <button onclick="handleBuy('${itemKey}', document.getElementById('qty-${itemKey}').value)">Acheter</button>
        </div>
    `;

    return `
        <div class="shop-card">
            <div class="shop-card-header">
                <img src="${POKEBALL_IMAGE_BASE_URL}${item.imageFragment}" alt="${item.name}" class="shop-image" 
                     onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML = '<span class=\\'shop-emoji\\'>?</span>' + this.parentElement.innerHTML;">
                <span>${item.name}</span>
            </div>
            ${hasPromo ? `<span class="shop-promo">PROMOTION !</span>` : ''}
            <div class="shop-cost">${item.cost.toLocaleString()} 💰 <span>(unité)</span></div>
            <p class="shop-desc">${item.desc}</p>
            ${quantityInput}
            <div id="msg-${itemKey}" style="color: var(--shiny-color); margin-top: 10px; font-size: 0.9em;"></div>
        </div>
    `;
} 

/**
 * Charge les articles de la boutique depuis l'API et les affiche.
 */
async function loadShop() {
    const container = document.getElementById('shopContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = '<p>Chargement de la boutique...</p>';
    errorContainer.textContent = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shop`);
        const items = await response.json();

        if (!response.ok) {
            errorContainer.textContent = `Erreur: Impossible de charger la boutique.`;
            container.innerHTML = '';
            return;
        }

        let shopGridHtml = '';
        for (const [key, item] of Object.entries(items)) {
            shopGridHtml += createShopCard(key, item);
        }
        
        container.innerHTML = `<div class="shop-grid">${shopGridHtml}</div>`;
        
    } catch (error) {
        console.error('Erreur de chargement de la boutique:', error);
        errorContainer.textContent = 'Erreur de connexion au serveur API pour la boutique.';
        container.innerHTML = '';
    }
} 

/**
 * Gère l'achat d'un article via l'API.
 * @param {string} itemKey Clé de l'article.
 * @param {string|number} quantity Quantité à acheter.
 */
async function handleBuy(itemKey, quantity) {
    if (!currentUserId) {
        document.getElementById('pokedex-error-container').textContent = "Veuillez vous connecter avant d'acheter.";
        return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
        document.getElementById(`msg-${itemKey}`).textContent = "Quantité invalide.";
        return;
    }

    const messageContainer = document.getElementById(`msg-${itemKey}`);
    messageContainer.style.color = 'var(--shiny-color)'; 
    messageContainer.textContent = `Achat de ${qty} ${itemKey.replace('ball', ' Ball')} en cours...`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                itemKey: itemKey,
                quantity: qty
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Achat réussi
            messageContainer.style.color = 'var(--highlight-color)'; 
            messageContainer.textContent = data.message;
            
            // Mise à jour du profil si on est dessus
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile(); 
            }

        } else {
            // Erreur d'achat (solde insuffisant, etc.)
            messageContainer.style.color = 'var(--red-discord)'; 
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
        }

    } catch (error) {
        console.error('Erreur lors de l\'achat:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
    }
} 

// --- INITIALISATION (S'EXÉCUTE AU CHARGEMENT) ---
window.onload = initializeApp;
