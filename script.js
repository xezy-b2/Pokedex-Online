// public/script.js (VERSION COMPLÈTE)

const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

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


// --- GESTION POKEDEX & PROFIL (PEU DE CHANGEMENTS) ---

/**
 * Crée une carte de Pokémon HTML.
 */
function createPokedexCard(pokemon, count, isCaptured) {
    const isShiny = pokemon.isShiny || pokemon.isShinyFirstCapture;
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
    const levelDisplay = isCaptured && pokemon.level ? `<span class="pokemon-level">Lv.${pokemon.level}</span>` : '';
    
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');

    return `
        <div class="pokedex-card" style="${borderStyle}">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${imageSource}" alt="${pokemon.name || 'Inconnu'}" onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=Err'">
            <span class="pokemon-name">${nameDisplay}</span>
            ${countDisplay}
            ${levelDisplay}
        </div>
    `;
}

/**
 * Charge les données du Pokédex depuis l'API.
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

        const { fullPokedex, uniquePokedexCount } = data; // DESTRUCTURATION CORRIGÉE

        const html = `<p style="font-size: 1.1em; font-weight: bold;">Espèces capturées : ${uniquePokedexCount}/151</p>`;
        
        const pokedexMap = new Map();
        fullPokedex.forEach(p => {
            const id = p.pokedexId;
            
            if (!pokedexMap.has(id)) {
                pokedexMap.set(id, {
                    ...p,
                    count: 1,
                    isShinyFirstCapture: p.isShiny, 
                    isCaptured: true
                });
            } else {
                pokedexMap.get(id).count++;
                if (p.isShiny && !pokedexMap.get(id).isShinyFirstCapture) {
                    pokedexMap.get(id).isShinyFirstCapture = true;
                }
            }
        });

        const maxId = 151; 
        let pokedexGridHtml = '<div class="pokedex-grid">';
        
        for (let i = 1; i <= maxId; i++) { 
            const pokemonData = pokedexMap.get(i);
            
            if (pokemonData) {
                pokedexGridHtml += createPokedexCard(pokemonData, pokemonData.count, true);
            } else {
                // Fait appel à une fausse structure pour les cartes non capturées
                pokedexGridHtml += createPokedexCard({ pokedexId: i, name: `N°${i}` }, 0, false);
            }
        }
        
        pokedexGridHtml += '</div>';
        container.innerHTML = html + pokedexGridHtml;

    } catch (error) {
        console.error('Erreur de chargement du Pokédex:', error);
        errorContainer.textContent = 'Erreur de connexion au serveur API.';
        container.innerHTML = '';
    }
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
        
        // Affichage des statistiques de capture
        const statsHtml = `
            <div class="profile-stat-card">
                <h3>Statistiques de Capture</h3>
                <p><strong>Total de captures :</strong> ${user.stats.totalCaptures.toLocaleString()}</p>
                <p><strong>Espèces uniques :</strong> ${user.stats.uniqueCaptures}/151</p>
                <p><strong>BotCoins :</strong> <span style="color: gold;">${user.money.toLocaleString()} 💰</span></p>
            </div>
        `;

        // Affichage des Poké Balls
        const ballsHtml = `
            <div class="profile-stat-card">
                <h3>Inventaire de Poké Balls</h3>
                <div class="profile-balls-grid">
                    ${Object.entries(user).filter(([key]) => key.endsWith('balls')).map(([key, count]) => `
                        <div>
                            <span class="ball-count">${(count || 0).toLocaleString()}</span>
                            <span class="ball-name">${key.replace('balls', '').replace('poké', 'poké ')} Balls</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        container.innerHTML = `<h2>Profil de ${user.username} (ID: ${user.userId})</h2>` + statsHtml + ballsHtml;

    } catch (error) {
        console.error('Erreur de chargement du Profil:', error);
        errorContainer.textContent = 'Erreur de connexion au serveur API.';
        container.innerHTML = '';
    }
}


// --- GESTION DE LA BOUTIQUE (SHOP) ---

/**
 * Génère le HTML pour une carte d'article de la boutique.
 * @param {string} itemKey Clé de l'article (ex: 'pokeball').
 * @param {object} item Objet d'article avec les détails (name, cost, desc, promo, emoji).
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
                <span class="shop-emoji">${item.emoji}</span>
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

// --- INITIALISATION (S'EXÉCUTE AU CHARGEMENT) ---
window.onload = initializeApp;
