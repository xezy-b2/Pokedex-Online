// public/script.js (VERSION COMPLÈTE)

const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
// NOUVEAU: URL de base pour les sprites d'objets (incluant les Poké Balls) de PokeAPI
const POKEBALL_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'; 

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- GESTION DE L'ÉTAT ET DE L'AFFICHAGE (AUCUN CHANGEMENT ICI) ---

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
 * Crée une carte de Pokémon HTML avec un bouton de vente.
 * (NOUVELLE FONCTION pour l'affichage vendable dans la page Pokédex)
 */
function createSellablePokedexCard(pokemon) {
    // Vérification de l'existence de l'ID MongoDB
    if (!pokemon._id) {
        console.warn('Pokémon sans _id trouvé, impossible de le vendre:', pokemon);
        return ''; 
    }
    
    const isShiny = pokemon.isShiny;
    const borderStyle = isShiny ? `border: 2px solid var(--shiny-color)` : `border: 2px solid var(--captured-border)`;
    
    const imageSource = `${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png`;
    const nameDisplay = isShiny ? `✨ ${pokemon.name}` : pokemon.name;
    const levelDisplay = pokemon.level ? `<span class="pokemon-level">Lv.${pokemon.level}</span>` : '';
    
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');
    
    // Calcul estimé du prix pour l'affichage (doit correspondre à la logique serveur)
    const basePrice = 50; 
    const levelBonus = (pokemon.level || 1) * 5; 
    const shinyBonus = isShiny ? 200 : 0; 
    const salePrice = basePrice + levelBonus + shinyBonus;

    return `
        <div class="pokedex-card" style="${borderStyle}">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${imageSource}" alt="${pokemon.name}" onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=Err'">
            <span class="pokemon-name">${nameDisplay}</span>
            ${levelDisplay}
            <div style="margin-top: 10px; font-size: 0.9em; color: var(--text-secondary);">
                Prix: ${salePrice} 💰
            </div>
            <button class="sell-button" onclick="handleSell('${pokemon._id}', '${pokemon.name}', ${salePrice})" 
                    style="margin-top: 10px; background-color: var(--pokeball-red);">
                Vendre
            </button>
            <div id="sell-msg-${pokemon._id}" style="font-size: 0.8em; margin-top: 5px;"></div>
        </div>
    `;
}

/**
 * Charge les données du Pokédex depuis l'API.
 * (MODIFIÉ: Affiche désormais le 'fullPokedex' pour permettre la vente des doubles.)
 */
async function loadPokedex() {
    const container = document.getElementById('pokedexContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = '<p>Chargement du Pokédex...</p>';
    errorContainer.textContent = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await response.json();

        if (!response.ok) {
            errorContainer.textContent = `Erreur: ${data.message || 'Impossible de charger les données du Pokédex.'}`;
            container.innerHTML = `<p>Veuillez vérifier votre connexion et votre ID Discord.</p>`;
            return;
        }

        const { fullPokedex, uniquePokedexCount } = data; 
        
        // Trie par ID Pokédex
        fullPokedex.sort((a, b) => a.pokedexId - b.pokedexId);


        const html = `
            <p style="font-size: 1.1em; font-weight: bold;">Espèces uniques capturées : ${uniquePokedexCount}/151</p>
            <p style="font-size: 0.9em; color: var(--text-secondary);">Liste complète de vos captures (doubles inclus). Cliquez sur "Vendre" pour obtenir des BotCoins.</p>
        `;
        
        const pokedexGridHtml = fullPokedex.map(p => createSellablePokedexCard(p)).join('');

        container.innerHTML = html + `<div class="pokedex-grid">${pokedexGridHtml}</div>`;

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
                <span style="font-size: 1.2em; color: var(--text-secondary);">Niv. ${pokemon.level || 5} | #${pokemon.pokedexId.toString().padStart(3, '0')}</span>
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
        
        // --- NOUVEAUTÉ : Carte Compagnon ---
        const companionHtml = createCompanionCard(user.companionPokemon);
        
        // --- Statistiques Clés (Pas de changement dans cette partie) ---
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

        // Affichage des Poké Balls (Légèrement ajusté pour mieux présenter les noms)
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


                        return `
                            <div>
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


// --- GESTION DE LA BOUTIQUE (SHOP) et VENTE (SELL) ---

/**
 * Génère le HTML pour une carte d'article de la boutique.
 * @param {string} itemKey Clé de l'article (ex: 'pokeball').
 * @param {object} item Objet d'article avec les détails (name, cost, desc, promo, imageFragment).
 */
function createShopCard(itemKey, item) {
    const hasPromo = item.promo; 
    
    // Ajout d'un pas de 10 pour les balls plus chères, ou 1 pour les pokéballs
    const inputStep = itemKey === 'pokeball' ? '1' : '10'; 

    // Le bloc de saisie pour la quantité est appliqué à TOUTES les balls
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
        
        container.innerHTML = shopGridHtml;
        
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
        // Devrait être impossible si l'UI est bien gérée, mais par sécurité
        document.getElementById('pokedex-error-container').textContent = "Veuillez vous connecter avant d'acheter.";
        return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
        document.getElementById(`msg-${itemKey}`).textContent = "Quantité invalide.";
        return;
    }

    const messageContainer = document.getElementById(`msg-${itemKey}`);
    messageContainer.style.color = 'var(--shiny-color)'; // Jaune pour chargement
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
            messageContainer.style.color = 'var(--highlight-color)'; // Vert pour succès
            messageContainer.textContent = data.message;
            
            // Mise à jour du profil si on est dessus
            if (document.getElementById('profile-page').classList.contains('active')) {
                 // Recharge le profil pour voir les nouveaux BotCoins et Balls
                loadProfile(); 
            }

        } else {
            // Erreur d'achat (solde insuffisant, etc.)
            messageContainer.style.color = 'var(--red-discord)'; // Rouge pour erreur
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
        }

    } catch (error) {
        console.error('Erreur lors de l\'achat:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
    }
}

/**
 * Gère la vente d'un Pokémon via l'API.
 * @param {string} pokemonId L'ID interne du Pokémon dans la BDD.
 * @param {string} pokemonName Le nom du Pokémon (pour l'affichage).
 * @param {number} estimatedPrice Le prix de vente estimé.
 */
async function handleSell(pokemonId, pokemonName, estimatedPrice) {
    if (!currentUserId) {
        document.getElementById('pokedex-error-container').textContent = "Veuillez vous connecter avant de vendre.";
        return;
    }

    const messageContainer = document.getElementById(`sell-msg-${pokemonId}`);
    messageContainer.style.color = 'var(--shiny-color)'; // Jaune pour chargement
    messageContainer.textContent = `Vente de ${pokemonName} pour ${estimatedPrice} 💰 en cours...`;
    
    // Désactiver tous les boutons de vente pour éviter les doubles clics
    document.querySelectorAll('.sell-button').forEach(btn => btn.disabled = true);


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
            // Vente réussie
            messageContainer.style.color = 'var(--highlight-color)'; // Vert pour succès
            messageContainer.textContent = data.message;
            
            // Recharger le Pokédex pour supprimer la carte vendue
            await loadPokedex(); 
            
            // Mise à jour du profil si on est dessus (pour l'argent)
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile(); 
            }

        } else {
            // Erreur de vente
            messageContainer.style.color = 'var(--red-discord)'; // Rouge pour erreur
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
            // Réactiver les boutons sur erreur
            document.querySelectorAll('.sell-button').forEach(btn => btn.disabled = false);
        }

    } catch (error) {
        console.error('Erreur lors de la vente:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
        document.querySelectorAll('.sell-button').forEach(btn => btn.disabled = false);
    }
}


// --- INITIALISATION (S'EXÉCUTE AU CHARGEMENT) ---
window.onload = initializeApp;
