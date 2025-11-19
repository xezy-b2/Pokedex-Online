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

    // 3. Exécute la fonction de chargement spécifique à la page
    if (currentUserId) {
        if (pageName === 'pokedex') {
            loadPokedex();
        } else if (pageName === 'profile') {
            loadProfile();
        } else if (pageName === 'shop') {
            loadShop();
        }
    }
}


// --- FONCTIONS UTILITAIRES DE LA COLLECTION (MODIFIÉES) ---


/**
 * Fonction utilitaire pour calculer le IV total
 */
function calculateTotalIV(ivs) {
    if (!ivs) return 0;
    const total = ivs.hp + ivs.attack + ivs.defense + ivs.spAttack + ivs.spDefense + ivs.speed;
    // 31 * 6 = 186. Calcule le pourcentage des IVs totaux.
    return Math.round((total / 186) * 100);
}

/**
 * Récupère l'URL du sprite (normal ou shiny) depuis la PokeAPI,
 * en tenant compte des formes spéciales (Mega, Alola, etc.).
 * * 🔥 NOUVELLE VERSION POUR SUPPORTER LES FORMES SPÉCIALES
 */
function getPokemonSpriteUrl(pokedexId, isShiny, form) {
    // L'URL de base est POKEAPI_SPRITE_URL
    let suffix = '';

    // LOGIQUE POUR LES FORMES SPÉCIALES
    if (form) {
        // Normalise le nom de la forme (ex: "Mega Charizard X" -> "megacharizardx")
        const standardizedForm = form.toLowerCase().replace(/\s/g, '');
        
        // Mappage des formes à leurs suffixes API (doit correspondre à la convention utilisée dans givepokemon.js)
        if (standardizedForm === 'megacharizardx') {
            suffix = '-mega-x';
        } else if (standardizedForm === 'megacharizardy') {
            suffix = '-mega-y';
        } else if (standardizedForm.includes('alolan')) {
            suffix = '-alola';
        }
        // Pour les sprites Shiny des formes spéciales, la structure est: /shiny/ID-suffixe.png
    }

    // Construction du chemin final: ID (ou ID-suffixe)
    let path = pokedexId + suffix;

    if (isShiny) {
        return `${POKEAPI_SPRITE_URL}shiny/${path}.png`;
    }
    return `${POKEAPI_SPRITE_URL}${path}.png`;
}

// --- FONCTIONS DE CHARGEMENT DE PAGES ---

/**
 * Charge le Pokédex complet (liste de tous les Pokémon capturés/manquants)
 */
async function loadPokedex() {
    const container = document.getElementById('pokedexContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = 'Chargement du Pokédex...';
    errorContainer.textContent = '';

    if (!currentUserId) {
        container.innerHTML = '<p>Connectez-vous pour voir votre Pokédex.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await response.json();

        if (!response.ok) {
            errorContainer.textContent = data.message || `Erreur API: ${response.status}`;
            container.innerHTML = '';
            return;
        }

        displayPokedex(data);
    } catch (error) {
        console.error("Erreur de chargement du Pokédex:", error);
        errorContainer.textContent = "Erreur de connexion au serveur API.";
        container.innerHTML = '';
    }
}

/**
 * Affiche la liste complète du Pokédex
 */
function displayPokedex(data) {
    const container = document.getElementById('pokedexContainer');
    container.innerHTML = ''; // Nettoyer l'affichage précédent

    const totalCaught = data.pokedex.filter(p => p.isCaptured).length;
    const totalMons = data.pokedex.length;
    const completionRate = ((totalCaught / totalMons) * 100).toFixed(1);

    const summary = document.createElement('div');
    summary.className = 'pokedex-summary';
    summary.innerHTML = `
        <p><strong>${data.username}</strong> - Total Capturés: ${totalCaught}/${totalMons} (${completionRate}%)</p>
    `;
    container.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'pokedex-grid';

    data.pokedex.forEach(pokemon => {
        // Le Pokémon de la liste Pokédex est soit le premier capturé, soit un objet générique si non capturé.
        const isCaptured = pokemon.isCaptured;
        // La propriété 'isShiny' est soit celle du premier capturé, soit 'isShinyFirstCapture' pour la carte pokédex.
        const isShiny = pokemon.isShiny || pokemon.isShinyFirstCapture; 
        
        // 🔥 PASSAGE DE LA FORME
        const form = pokemon.form; 
        const spriteUrl = getPokemonSpriteUrl(pokemon.pokedexId, isShiny, form);

        const borderStyle = isCaptured ? (isShiny ? `border: 2px solid var(--shiny-color)` : `border: 2px solid var(--captured-border)`) : `border: 2px dashed var(--missing-border)`;

        const imageSource = isCaptured ? spriteUrl : `${POKEAPI_SPRITE_URL}0.png`; // Placeholder pour non-capturé

        const nameDisplay = isCaptured ? (isShiny ? `✨ ${pokemon.name}` : pokemon.name) : `???`;
        const formDisplay = isCaptured && form ? `(${form})` : '';

        const count = pokemon.count || 0;
        const countDisplay = isCaptured && count > 1 ? `<span class="pokemon-count">x${count}</span>` : '';
        const levelDisplay = isCaptured && pokemon.level ? `<span class="pokemon-level">Lv.${pokemon.level}</span>` : '';

        const pokeCard = document.createElement('div');
        pokeCard.className = 'pokedex-card';
        pokeCard.style.cssText = borderStyle;

        pokeCard.innerHTML = `
            <img src="${imageSource}" alt="${pokemon.name || '?'}" class="pokedex-sprite">
            <span class="pokedex-id">#${pokemon.pokedexId}</span>
            <div class="pokedex-details">
                <span class="pokedex-name">${nameDisplay} ${formDisplay}</span>
                ${countDisplay}
            </div>
            ${levelDisplay}
        `;
        grid.appendChild(pokeCard);
    });

    container.appendChild(grid);
}

/**
 * Charge le profil (argent, balls, compagnon)
 */
async function loadProfile() {
    const container = document.getElementById('profileContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = '<h2>Chargement du Profil...</h2>';
    errorContainer.textContent = '';

    if (!currentUserId) {
        container.innerHTML = '<p>Connectez-vous pour voir votre profil.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const data = await response.json();

        if (!response.ok) {
            errorContainer.textContent = data.message || `Erreur API: ${response.status}`;
            container.innerHTML = '';
            return;
        }

        displayProfile(data);
    } catch (error) {
        console.error("Erreur de chargement du profil:", error);
        errorContainer.textContent = "Erreur de connexion au serveur API.";
        container.innerHTML = '';
    }
}


/**
 * Affiche le profil de l'utilisateur.
 */
function displayProfile(user) {
    const container = document.getElementById('profileContainer');
    
    // 1. STATS et MONNAIE
    let moneyCard = `
        <div class="profile-stat-card money-card">
            <h3>💰 Solde</h3>
            <p class="money-amount">${user.money.toLocaleString()} BotCoins</p>
        </div>
    `;

    // 2. COMPAGNON (Buddy)
    let companionCard;
    if (user.companionPokemon) {
        const pokemon = user.companionPokemon;
        const totalIV = calculateTotalIV(pokemon.ivs);
        const isShiny = pokemon.isShiny;
        
        // 🔥 PASSAGE DE LA FORME
        const spriteUrl = getPokemonSpriteUrl(pokemon.pokedexId, isShiny, pokemon.form);
        
        const nameDisplay = isShiny ? `✨ ${pokemon.name}` : pokemon.name;
        const formDisplay = pokemon.form ? ` (${pokemon.form})` : '';
        const borderColor = isShiny ? 'var(--shiny-color)' : 'var(--captured-border)';

        companionCard = `
            <div class="profile-stat-card buddy-card" style="border: 2px solid ${borderColor};">
                <h3>Pokémon Compagnon</h3>
                <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                    <img src="${spriteUrl}" alt="${pokemon.name}" class="pokemon-sprite buddy-sprite">
                    <div>
                        <h4>${nameDisplay.toUpperCase()} ${formDisplay}</h4>
                        <p><strong>Niveau:</strong> ${pokemon.level}</p>
                        <p><strong>IV Total:</strong> ${totalIV}%</p>
                    </div>
                </div>
            </div>
        `;
    } else {
        companionCard = `
            <div class="profile-stat-card buddy-card" style="border: 2px dashed var(--missing-border);">
                <h3>Pokémon Compagnon</h3>
                <p style="margin: 0; color: var(--text-secondary);">Vous n'avez pas de Pokémon compagnon défini !</p>
                <p style="margin: 5px 0 0; font-size: 0.8em; color: var(--text-secondary);">Utilisez la commande **!setcompanion** sur Discord.</p>
            </div>
        `;
    }

    // 3. BALLS (Poké Balls)
    let ballsCard = `
        <div class="profile-stat-card balls-card">
            <h3>Inventaire Poké Balls</h3>
            <div class="profile-balls-grid">
                ${Object.entries(user).filter(([key]) => key.endsWith('balls')).map(([key, count]) => {
                    let displayName = key.replace('balls', ' Ball');
                    let imageName = '';
                    if (key === 'pokeballs') { displayName = 'Poké Ball'; imageName = 'poke-ball.png'; }
                    else if (key === 'greatballs') { displayName = 'Super Ball'; imageName = 'great-ball.png'; }
                    else if (key === 'ultraballs') { displayName = 'Hyper Ball'; imageName = 'ultra-ball.png'; }
                    else if (key === 'masterballs') { displayName = 'Master Ball'; imageName = 'master-ball.png'; }
                    else if (key === 'safariballs') { displayName = 'Safari Ball'; imageName = 'safari-ball.png'; }
                    else if (key === 'premierballs') { displayName = 'Faiblo Ball'; imageName = 'premier-ball.png'; }
                    else if (key === 'luxuryballs') { displayName = 'Luxe Ball'; imageName = 'luxury-ball.png'; }

                    return `
                        <div>
                            <img src="${POKEBALL_IMAGE_BASE_URL}${imageName}" alt="${displayName}" class="ball-sprite">
                            <span class="ball-count">${(count || 0).toLocaleString()}</span>
                            <span class="ball-name">${displayName}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    // 4. AFFICHAGE FINAL
    container.innerHTML = `
        <h2>Profil de ${user.username}</h2>
        <div class="profile-grid">
            ${moneyCard}
            ${companionCard}
            ${ballsCard}
        </div>
    `;
}

/**
 * Charge les articles de la boutique.
 */
async function loadShop() {
    const container = document.getElementById('shopContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = 'Chargement de la Boutique...';
    errorContainer.textContent = '';

    if (!currentUserId) {
        container.innerHTML = '<p>Connectez-vous pour accéder à la boutique.</p>';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/${currentUserId}`);
        const data = await response.json();

        if (!response.ok) {
            errorContainer.textContent = data.message || `Erreur API: ${response.status}`;
            container.innerHTML = '';
            return;
        }

        displayShop(data.items, data.money);

    } catch (error) {
        console.error("Erreur de chargement de la boutique:", error);
        errorContainer.textContent = "Erreur de connexion au serveur API.";
        container.innerHTML = '';
    }
}

/**
 * Affiche la boutique dans le DOM.
 */
function displayShop(items, currentMoney) {
    const container = document.getElementById('shopContainer');
    const messageContainer = document.getElementById('shop-message-container');
    container.innerHTML = '';
    messageContainer.textContent = ''; // Nettoyer les messages précédents

    const moneyDisplay = document.createElement('p');
    moneyDisplay.className = 'shop-money-display';
    moneyDisplay.innerHTML = `Votre solde : <strong class="money-amount">${currentMoney.toLocaleString()} BotCoins</strong>`;
    container.appendChild(moneyDisplay);

    const itemsGrid = document.createElement('div');
    itemsGrid.className = 'shop-grid-items';

    Object.entries(items).forEach(([key, item]) => {
        const itemCard = document.createElement('div');
        itemCard.className = 'shop-item-card';

        // L'imageFragment est le nom du fichier image (ex: "poke-ball.png")
        const imageUrl = `${POKEBALL_IMAGE_BASE_URL}${item.imageFragment}`; 

        itemCard.innerHTML = `
            <img src="${imageUrl}" alt="${item.name}" class="ball-sprite shop-sprite">
            <h3>${item.name}</h3>
            <p class="item-description">${item.desc}</p>
            <p class="item-price">Coût : ${item.cost.toLocaleString()} BotCoins</p>
            <button onclick="handlePurchase('${key}')">Acheter</button>
        `;
        itemsGrid.appendChild(itemCard);
    });

    container.appendChild(itemsGrid);
}


/**
 * Gère le clic sur le bouton d'achat.
 * * Si c'est une Poké Ball simple (promo), ouvre un menu de quantité.
 * Sinon, procède à l'achat unitaire.
 */
function handlePurchase(itemKey) {
    const messageContainer = document.getElementById('shop-message-container');
    messageContainer.textContent = '';

    // Définir les quantités disponibles pour la Poké Ball promo
    if (itemKey === 'pokeball') {
        const quantityContainer = document.getElementById('shop-quantity-selection');
        quantityContainer.innerHTML = `
            <p>Combien de Poké Balls voulez-vous acheter ?</p>
            <button onclick="processWebPurchase('pokeball', 1)">x1 (100 ₽)</button>
            <button onclick="processWebPurchase('pokeball', 10)">x10 (1,000 ₽)</button>
            <button onclick="processWebPurchase('pokeball', 50)">x50 (5,000 ₽)</button>
            <button onclick="processWebPurchase('pokeball', 100)">x100 (10,000 ₽) + Bonus !</button>
            <button onclick="document.getElementById('shop-quantity-selection').innerHTML = '';" style="background-color: var(--red-discord);">Annuler</button>
        `;
    } else {
        // Pour toutes les autres balls, achat unitaire direct
        processWebPurchase(itemKey, 1);
    }
}

/**
 * Lance l'achat via l'API Web.
 */
async function processWebPurchase(itemKey, qty) {
    const messageContainer = document.getElementById('shop-message-container');
    
    if (!currentUserId) {
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur: Veuillez vous connecter pour effectuer un achat.';
        return;
    }
    
    // Fermer le menu de quantité si ouvert
    const quantityContainer = document.getElementById('shop-quantity-selection');
    quantityContainer.innerHTML = ''; 

    messageContainer.style.color = 'var(--text-secondary)';
    messageContainer.textContent = `Achat de ${qty} ${itemKey} en cours...`;

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
            
            // Recharge la boutique et le profil pour voir les mises à jour
            loadShop(); 
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
document.addEventListener('DOMContentLoaded', initializeApp);
