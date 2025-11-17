// public/script.js (VERSION CORRIGÉE des erreurs de null et ReferenceError)

const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
// NOUVEAU: URL de base pour les sprites d'objets (incluant les Poké Balls) de PokeAPI
const POKEBALL_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'; 

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- DÉFINITION DE LA BOUTIQUE (Doit correspondre à webserver.js) ---
const SHOP_ITEMS = {
    'pokeball': { key: 'pokeballs', name: '🔴 Poké Ball', cost: 100, promo: true, emoji: '🔴', desc: `Coût unitaire: 100 ₽. Promotion: +1 ball spéciale par 10 achetées!` , sprite: 'poke-ball'},
    'greatball': { key: 'greatballs', name: '🔵 Super Ball', cost: 300, promo: false, emoji: '🔵', desc: `Coût unitaire: 300 ₽. Efficacité supérieure à la Poké Ball.` , sprite: 'great-ball'},
    'ultraball': { key: 'ultraballs', name: '🟡 Hyper Ball', cost: 800, promo: false, emoji: '🟡', desc: `Coût unitaire: 800 ₽. Efficacité maximale des balls de base.` , sprite: 'ultra-ball'},
    'masterball': { key: 'masterballs', name: '🟣 Master Ball', cost: 15000, promo: false, emoji: '🟣', desc: `Coût unitaire: 15,000 ₽. Capture 100% garantie. Extrêmement rare.` , sprite: 'master-ball'},
    // Ajouts pour l'inventaire complet
    'safariball': { key: 'safariballs', name: '🟢 Safari Ball', cost: 500, promo: false, emoji: '🟢', desc: `Coût unitaire: 500 ₽. Utilisée lors des Safaris.` , sprite: 'safari-ball'},
    'premierball': { key: 'premierballs', name: '⚪ Premier Ball', cost: 150, promo: false, emoji: '⚪', desc: `Coût unitaire: 150 ₽. Offerte pour l'achat de 10 Poké Balls.` , sprite: 'premier-ball'},
    'luxuryball': { key: 'luxuryballs', name: '⚫ Luxe Ball', cost: 1000, promo: false, emoji: '⚫', desc: `Coût unitaire: 1000 ₽. Augmente l'amitié.` , sprite: 'luxury-ball'},
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

        // Nettoie l'URL sans recharger la page
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
        // Assure que l'état initial est affiché
        const pokedexContainer = document.getElementById('pokedexContainer');
        if (pokedexContainer) {
            pokedexContainer.innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
        }
    }
    // Charge la boutique au démarrage, indépendamment de l'authentification
    loadShop(); 
}

/**
 * Met à jour l'interface utilisateur en fonction de l'état de connexion.
 * @param {boolean} isLoggedIn - Vrai si l'utilisateur est connecté.
 */
function updateUIState(isLoggedIn) {
    const loginBtn = document.getElementById('login-button');
    const authInfo = document.getElementById('auth-info');
    const authUsername = document.getElementById('auth-username');
    const mainNav = document.getElementById('main-nav');
    const usernameDisplay = document.getElementById('username-display');

    // CORRECTION Uncaught TypeError: Cannot read properties of null (reading 'style')
    // On vérifie que TOUS les éléments existent avant de les manipuler
    if (loginBtn && authInfo && authUsername && mainNav && usernameDisplay) {
        if (isLoggedIn) {
            loginBtn.style.display = 'none';
            authInfo.style.display = 'flex';
            mainNav.style.display = 'flex';
            authUsername.textContent = currentUsername;
            usernameDisplay.textContent = `Bienvenue, ${currentUsername} (${currentUserId})!`;
            
        } else {
            loginBtn.style.display = 'block';
            authInfo.style.display = 'none';
            mainNav.style.display = 'none';
            usernameDisplay.textContent = '';
        }
    } else {
        console.error("Élément(s) UI manquant(s). Vérifiez index.html. Impossible de mettre à jour l'état.");
    }
}

/**
 * Change la page affichée et active le bouton de navigation correspondant.
 * @param {string} pageId - L'ID de la page à afficher ('pokedex', 'profile', 'shop').
 */
function showPage(pageId) {
    // Masque toutes les sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });

    // Désactive tous les boutons de navigation
    document.querySelectorAll('#main-nav button').forEach(button => {
        button.classList.remove('active');
    });

    // Affiche la page demandée
    const activePage = document.getElementById(`${pageId}-page`);
    if (activePage) {
        activePage.classList.add('active');
    }

    // Active le bouton correspondant
    const activeNavButton = document.getElementById(`nav-${pageId}`);
    if (activeNavButton) {
        activeNavButton.classList.add('active');
    }

    // Déclenche le chargement des données spécifiques
    if (currentUserId) {
        switch (pageId) {
            case 'pokedex':
                loadPokedex();
                break;
            case 'profile':
                loadProfile();
                break;
            case 'shop':
                // loadShop() est appelé dans initializeApp, mais peut être forcé ici si besoin
                break;
        }
    }
}


// --- GESTION DE L'AUTHENTIFICATION (CORRECTION ReferenceError) ---

/**
 * Redirige vers l'URL d'authentification Discord.
 */
function loginWithDiscord() {
    window.location.href = `${API_BASE_URL}/auth/discord`;
}

/**
 * Déconnecte l'utilisateur en effaçant le localStorage et en mettant à jour l'UI.
 */
function logout() {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    currentUserId = null;
    currentUsername = null;
    updateUIState(false);
    showPage('pokedex');
}


// --- FONCTIONS DE CHARGEMENT DE DONNÉES ---

/**
 * Charge les données du Pokédex de l'utilisateur.
 */
async function loadPokedex() {
    if (!currentUserId) return;

    const container = document.getElementById('pokedexContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = '<p>Chargement du Pokédex en cours...</p>';
    errorContainer.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await response.json();

        if (response.ok && data.pokedex) {
            renderPokedex(data.pokedex);
        } else {
            errorContainer.innerHTML = `<p style="color: var(--red-discord);">Erreur: ${data.message || 'Impossible de charger le Pokédex.'}</p>`;
            container.innerHTML = '<p>Veuillez réessayer ou vérifier votre connexion.</p>';
        }

    } catch (error) {
        console.error('Erreur chargement Pokédex:', error);
        errorContainer.innerHTML = `<p style="color: var(--red-discord);">Erreur de connexion au serveur API.</p>`;
        container.innerHTML = '<p>Le serveur est peut-être hors ligne.</p>';
    }
}

/**
 * Génère le HTML pour une carte de Pokémon.
 */
function createPokemonCard(pokemon, isCaptured, count) {
    // Simuler le niveau si non présent dans les données (pour l'exemple)
    if (isCaptured && !pokemon.level) {
        pokemon.level = Math.floor(Math.random() * 99) + 1;
    }
    
    const isShiny = pokemon.isShiny || pokemon.isShinyFirstCapture;
    const borderStyle = isCaptured 
        ? (isShiny ? `border: 2px solid var(--shiny-color)` : `border: 2px solid var(--captured-border)`)
        : `border: 2px dashed var(--missing-border)`;
    
    const imageSource = isCaptured 
        ? `${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png`; // Placeholder '???'

    const nameDisplay = isCaptured 
        ? (isShiny ? `✨ ${pokemon.name}` : pokemon.name) 
        : `???`;
        
    const countDisplay = isCaptured && count > 1 ? `<span class="pokemon-count">x${count}</span>` : '';
    const levelDisplay = isCaptured && pokemon.level ? `<span class="pokemon-level">Lv.${pokemon.level}</span>` : '';
    
    // Assure l'affichage d'un ID, même pour les non-capturés (basé sur l'ID de la DB)
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');

    return `
        <div class="pokedex-card" style="${borderStyle}">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${imageSource}" alt="${pokemon.name || 'Inconnu'}" onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=%3F'">
            <span class="pokemon-name">${nameDisplay}</span>
            ${countDisplay}
            ${levelDisplay}
        </div>
    `;
}

/**
 * Affiche le Pokédex complet (capturés et manquants).
 * @param {Array<Object>} captured - Liste des Pokémon capturés de l'utilisateur.
 */
function renderPokedex(captured) {
    const container = document.getElementById('pokedexContainer');
    let htmlContent = '';
    
    // Simuler l'affichage de 151 Pokémon pour un Pokédex complet
    for (let id = 1; id <= 151; id++) {
        // Chercher si le Pokémon est capturé
        const foundPokemon = captured.find(p => p.pokedexId === id);
        
        if (foundPokemon) {
            // Afficher le Pokémon capturé
            htmlContent += createPokemonCard(foundPokemon, true, foundPokemon.count);
        } else {
            // Afficher le Pokémon manquant
            const missingPokemon = { pokedexId: id, name: '???' };
            htmlContent += createPokemonCard(missingPokemon, false, 0);
        }
    }
    
    container.innerHTML = `<div class="pokedex-list">${htmlContent}</div>`;
}

/**
 * Charge et affiche le profil de l'utilisateur (argent et inventaire).
 */
async function loadProfile() {
    if (!currentUserId) return;

    const container = document.getElementById('profileContainer');
    container.innerHTML = '<h2>Chargement du Profil...</h2>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const data = await response.json();

        if (response.ok && data.user) {
            renderProfile(data.user);
        } else {
            container.innerHTML = `<p style="color: var(--red-discord);">Erreur: ${data.message || 'Impossible de charger le profil.'}</p>`;
        }

    } catch (error) {
        console.error('Erreur chargement profil:', error);
        container.innerHTML = `<p style="color: var(--red-discord);">Erreur de connexion au serveur API.</p>`;
    }
}

/**
 * Génère le HTML pour la page de profil.
 * @param {Object} user - Les données de l'utilisateur.
 */
function renderProfile(user) {
    const container = document.getElementById('profileContainer');
    
    // --- 1. Statistiques principales ---
    const statsHtml = `
        <div class="profile-stat-card">
            <h3>Statistiques du Dresseur</h3>
            <div class="profile-stat">
                <strong>BotCoins:</strong> <span style="color: var(--shiny-color); font-weight: bold;">${user.money.toLocaleString()} ₽</span>
            </div>
            <div class="profile-stat">
                <strong>Pokémon capturés:</strong> ${user.pokedex.length}
            </div>
            <div class="profile-stat">
                <strong>Shiny capturés:</strong> ${user.pokedex.filter(p => p.isShiny || p.isShinyFirstCapture).length}
            </div>
            <div class="profile-stat">
                <strong>ID Dresseur:</strong> ${user.discordId}
            </div>
        </div>
    `;

    // --- 2. Inventaire de Poké Balls ---
    let ballsHtml = '';
    
    // Liste des balls à afficher
    const ballKeys = ['pokeballs', 'greatballs', 'ultraballs', 'masterballs', 'safariballs', 'premierballs', 'luxuryballs'];
    
    ballKeys.forEach(key => {
        const count = user[key] || 0;
        const itemConfig = Object.values(SHOP_ITEMS).find(item => item.key === key);
        
        if (itemConfig) {
            ballsHtml += `
                <div class="ball-item">
                    <img src="${POKEBALL_IMAGE_BASE_URL}${itemConfig.sprite}.png" alt="${itemConfig.name}" class="ball-sprite">
                    <div class="ball-name">${itemConfig.name.split(' ')[1]}</div>
                    <div class="ball-count">${count.toLocaleString()}</div>
                </div>
            `;
        }
    });

    const inventoryHtml = `
        <div class="profile-stat-card">
            <h3>Inventaire de Poké Balls</h3>
            <div class="profile-balls-grid">
                ${ballsHtml}
            </div>
        </div>
    `;

    container.innerHTML = statsHtml + inventoryHtml;
}

/**
 * Charge et affiche les articles de la boutique.
 */
function loadShop() {
    const container = document.getElementById('shopContainer');
    // Le contenu de la boutique est statique côté client ici, il utilise SHOP_ITEMS
    renderShopItems(container);
}

/**
 * Génère et injecte le HTML des articles de la boutique.
 * @param {HTMLElement} container - Le conteneur où injecter les cartes.
 */
function renderShopItems(container) {
    let shopHtml = '';
    
    Object.entries(SHOP_ITEMS).forEach(([key, item]) => {
        const promoClass = item.promo ? 'shop-item-promo' : '';
        const promoBadge = item.promo ? `<span class="promo-badge">PROMO</span>` : '';
        
        // La quantité par défaut est 10 pour le calcul initial
        const defaultQty = 10;
        const defaultCost = item.cost * defaultQty;

        shopHtml += `
            <div class="shop-item ${promoClass}" data-item-key="${key}">
                ${promoBadge}
                <div class="shop-item-header">
                    <img src="${POKEBALL_IMAGE_BASE_URL}${item.sprite}.png" alt="${item.name.split(' ')[1]}">
                    <h3>${item.name}</h3>
                </div>
                
                <div class="shop-desc">${item.desc}</div>
                
                <span class="shop-cost">${item.cost.toLocaleString()} ₽ / unité</span>

                <div class="shop-buy-area">
                    <input type="number" id="qty-${key}" value="${defaultQty}" min="1" max="999" onchange="updateTotalCost('${key}', ${item.cost})">
                    <button class="buy-button" onclick="buyItem('${key}')">
                        Acheter <span id="total-cost-${key}">(${defaultCost.toLocaleString()} ₽)</span>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = shopHtml;
}

/**
 * Met à jour le coût total affiché pour l'achat d'un article.
 * @param {string} itemKey - Clé de l'article.
 * @param {number} unitCost - Coût unitaire de l'article.
 */
function updateTotalCost(itemKey, unitCost) {
    const quantityInput = document.getElementById(`qty-${itemKey}`);
    const totalCostSpan = document.getElementById(`total-cost-${itemKey}`);
    
    const qty = parseInt(quantityInput.value) || 1;
    let qtySafe = Math.max(1, Math.min(999, qty)); // Limite entre 1 et 999
    quantityInput.value = qtySafe; // Mettre à jour la valeur affichée

    const totalCost = qtySafe * unitCost;
    
    if (totalCostSpan) {
        totalCostSpan.textContent = `(${totalCost.toLocaleString()} ₽)`;
    }
}

/**
 * Gère l'achat d'un article via l'API.
 * @param {string} itemKey - Clé de l'article à acheter.
 */
async function buyItem(itemKey) {
    if (!currentUserId) {
        document.getElementById('shopMessage').textContent = "Veuillez vous connecter avant d'effectuer un achat.";
        document.getElementById('shopMessage').style.color = 'var(--red-discord)';
        return;
    }
    
    const quantityInput = document.getElementById(`qty-${itemKey}`);
    const qty = parseInt(quantityInput.value) || 1;
    
    if (qty <= 0) {
        document.getElementById('shopMessage').textContent = "La quantité doit être supérieure à zéro.";
        document.getElementById('shopMessage').style.color = 'var(--red-discord)';
        return;
    }
    
    const messageContainer = document.getElementById('shopMessage');
    messageContainer.textContent = 'Achat en cours...';
    messageContainer.style.color = 'var(--text-secondary)';

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
            
            // Recharge le profil si la page est ouverte pour voir les nouveaux BotCoins et Balls
            if (document.getElementById('profile-page').classList.contains('active')) {
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


// --- INITIALISATION (S'EXÉCUTE AU CHARGEMENT DE LA PAGE) ---
window.onload = initializeApp;
```eof
