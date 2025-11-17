// public/script.js (VERSION FINALE POUR DÉPLOIEMENT GITHUB PAGES - AVEC SHINY SÉPARÉS)

// --- URL DE L'API PUBLIQUE ---
const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const POKEBALL_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'; 

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- FONCTIONS DE BASE (Maintien de la logique de navigation et d'état) ---

function updateUIState(loggedIn) {
    const loginBtn = document.getElementById('login-btn');
    const loggedInDiv = document.getElementById('logged-in-user');
    const usernameDisplay = document.getElementById('username-display');
    const mainNav = document.getElementById('main-nav');
    
    if (loggedIn && currentUsername) {
        loginBtn.style.display = 'none';
        loggedInDiv.style.display = 'block';
        document.getElementById('display-username').textContent = currentUsername;
        usernameDisplay.textContent = `Connecté en tant que: ${currentUsername} (ID: ${currentUserId})`;
        mainNav.style.display = 'flex'; 
    } else {
        loginBtn.style.display = 'block';
        loggedInDiv.style.display = 'none';
        usernameDisplay.textContent = '';
        mainNav.style.display = 'none'; 
        currentUserId = null;
        currentUsername = null;
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${pageId}-page`).classList.add('active');

    document.querySelectorAll('#main-nav button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`nav-${pageId}`).classList.add('active');

    if (currentUserId) {
        if (pageId === 'pokedex') {
            loadPokedex();
        } else if (pageId === 'profile') {
            loadProfile();
        } else if (pageId === 'shop') {
            loadShop(); 
        }
    } else {
         if (pageId === 'pokedex') {
            document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
        } else if (pageId === 'profile') {
            document.getElementById('profileContainer').innerHTML = '<h2>Veuillez vous connecter.</h2>';
        } else if (pageId === 'shop') {
             document.getElementById('shopContainer').innerHTML = '<p>Connectez-vous pour voir la boutique en ligne.</p>';
        }
    }
}

function logout() {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    updateUIState(false);
    showPage('pokedex'); 
}

// --- GESTION DE LA REDIRECTION OAUTH ET DE L'ÉTAT ---

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

// --- FONCTIONS POKEDEX/CARTE (MISE À JOUR IMPORTANTE) ---

/**
 * Crée la carte d'un Pokémon pour le Pokédex.
 * @param {object} pokemon - L'objet Pokémon (peut être un mock pour les manquants).
 * @param {number} count - Nombre d'instances de ce type (Normal ou Shiny).
 * @param {boolean} isCaptured - Vrai si au moins un a été capturé.
 * @param {boolean} isShiny - Vrai si on affiche la carte Shiny.
 */
function createPokedexCard(pokemon, count, isCaptured, isShiny) {
    
    // Le style de la carte est basé sur si le Pokémon est capturé ET si c'est un Shiny
    const borderStyle = isCaptured 
        ? (isShiny ? `border: 2px solid var(--shiny-color)` : `border: 2px solid var(--captured-border)`)
        : `border: 2px dashed var(--missing-border)`;
    
    // L'image est sélectionnée en fonction de l'état (normal, shiny ou inconnu)
    const imageSource = isCaptured 
        ? `${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png`; 

    const nameDisplay = isCaptured 
        ? (isShiny ? `✨ ${pokemon.name}` : pokemon.name) 
        : `???`;
        
    // Affiche le compte total des copies capturées (Shiny ou Normal) si > 1
    const countDisplay = isCaptured && count > 1 ? `<span class="pokemon-count">x${count}</span>` : '';
    
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');

    // Ajout du suffixe (S) pour la carte Shiny
    const idDisplay = isShiny ? `#${pokeId} (S)` : `#${pokeId}`;

    return `
        <div class="pokedex-card" style="${borderStyle}">
            <span class="pokedex-id">${idDisplay}</span>
            <img src="${imageSource}" 
                 alt="${pokemon.name || 'Inconnu'}" 
                 onerror="this.onerror=null; this.src='https://placehold.co/100x100/363636/ffffff?text=IMG'">
            <span class="pokemon-name">${nameDisplay}</span>
            ${countDisplay}
            </div>
    `;
}

async function loadPokedex() {
    const container = document.getElementById('pokedexContainer');
    container.innerHTML = '<h2>Chargement du Pokédex...</h2><div class="spinner"></div>';
    document.getElementById('pokedex-error-container').innerHTML = ''; 

    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        
        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) { /* non-JSON */ }
            throw new Error(errorData.message || `Erreur: Statut ${response.status}`);
        }
        
        const data = await response.json();
        const fullPokedex = data.pokemons; 

        // Map pour stocker les données séparées pour le Pokédex (Normal et Shiny)
        // Key: `${id}_normal` ou `${id}_shiny`
        const pokedexMap = new Map();
        
        let uniqueCaptures = new Set(); // Pour le total unique (un seul par ID, peu importe l'état)

        fullPokedex.forEach(p => {
            const id = p.pokedexId;
            const isShiny = p.isShiny || false; // Assure que isShiny est bien un booléen
            const key = `${id}_${isShiny ? 'shiny' : 'normal'}`; 
            
            // Compte la capture unique pour le total général
            uniqueCaptures.add(id);

            if (!pokedexMap.has(key)) {
                // Première capture de ce type (Normal ou Shiny)
                pokedexMap.set(key, {
                    ...p,
                    count: 1,
                    isCaptured: true,
                    isShiny: isShiny, // Ajout de la propriété isShiny pour la carte
                    name: p.name || `N°${id}` // Assure qu'on a un nom
                });
            } else {
                // Incrémente le compte
                pokedexMap.get(key).count++;
            }
        });

        const maxId = 151; // Le maximum actuel du Pokédex
        let pokedexGridHtml = '<div class="pokedex-grid">';
        
        // Itération sur l'ensemble du Pokédex pour afficher les cartes
        for (let i = 1; i <= maxId; i++) { 
            const normalKey = `${i}_normal`;
            const shinyKey = `${i}_shiny`;
            
            const pokemonNormal = pokedexMap.get(normalKey);
            const pokemonShiny = pokedexMap.get(shinyKey);
            
            // 1. Affiche la carte NORMALE
            if (pokemonNormal) {
                // Capturé (Normal)
                pokedexGridHtml += createPokedexCard(pokemonNormal, pokemonNormal.count, true, false);
            } else {
                // Manquant (Normal) - On affiche la carte manquante pour maintenir la numérotation
                pokedexGridHtml += createPokedexCard({ pokedexId: i, name: `N°${i}` }, 0, false, false);
            }
            
            // 2. Affiche la carte SHINY (seulement si capturée)
            if (pokemonShiny) {
                // Capturé (Shiny) - On l'affiche juste après la normale
                pokedexGridHtml += createPokedexCard(pokemonShiny, pokemonShiny.count, true, true);
            } 
            // NOTE: On n'affiche PAS de carte "Shiny manquant" (s'il n'est pas capturé), 
            // pour ne pas surcharger la grille. Seuls les capturés sont montrés.
        }
        
        pokedexGridHtml += '</div>';
        
        // Mise à jour du titre du Pokédex
        let html = `
            <h2>Mon Pokédex</h2>
            <p>Total espèces uniques capturées : <strong>${uniqueCaptures.size}</strong> / ${maxId}</p>
            <p class="pokedex-note">Les cartes encadrées en <span class="badge" style="background-color: var(--shiny-color); color: var(--background);">OR</span> sont des versions Shiny.</p>
        `;

        container.innerHTML = html + pokedexGridHtml;

    } catch (error) {
        console.error('Erreur lors du chargement du Pokédex:', error);
        document.getElementById('pokedex-error-container').innerHTML = `<div class="error-message">❌ Erreur de connexion à l'API (${API_BASE_URL}). Détails: ${error.message}</div>`;
        container.innerHTML = '<p>Impossible de charger les données. Vérifiez l\'état de votre API.</p>';
    }
} // Fin de loadPokedex

// --- FONCTIONS PROFIL ---

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    container.innerHTML = '<h2>Chargement du Profil...</h2><div class="spinner"></div>';
    document.getElementById('profile-error-container').innerHTML = ''; 

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        
        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) { /* non-JSON */ }
            throw new Error(errorData.message || `Erreur: Statut ${response.status}`);
        }
        
        const user = await response.json();

        container.innerHTML = `
            <div class="profile-summary">
                <div class="profile-card">
                    <h3>Statistiques du Dresseur</h3>
                    <p><strong>ID Discord :</strong> ${user.userId}</p>
                    <p><strong>Nom d'utilisateur :</strong> ${user.username}</p>
                    <p><strong>BotCoins :</strong> <span class="money-amount">${(user.money || 0).toLocaleString()} ₽</span></p>
                </div>

                <div class="profile-card">
                    <h3>Statistiques Pokédex</h3>
                    <p><strong>Captures Uniques :</strong> ${user.stats.uniqueCaptures} / 151</p>
                    <p><strong>Total Capturés :</strong> ${user.stats.totalCaptures}</p>
                    <p><strong>Pokémons Shiny :</strong> (Non implémenté dans l'API)</p>
                </div>
            </div>

            <h3>Inventaire Poké Balls</h3>
            <div class="inventory-grid">
                <div class="inventory-item">
                    <img src="${POKEBALL_IMAGE_BASE_URL}poke-ball.png" alt="Poké Ball">
                    Poké Balls: <strong>${(user.pokeballs || 0).toLocaleString()}</strong>
                </div>
                <div class="inventory-item">
                    <img src="${POKEBALL_IMAGE_BASE_URL}great-ball.png" alt="Super Ball">
                    Super Balls: <strong>${(user.greatballs || 0).toLocaleString()}</strong>
                </div>
                <div class="inventory-item">
                    <img src="${POKEBALL_IMAGE_BASE_URL}ultra-ball.png" alt="Hyper Ball">
                    Hyper Balls: <strong>${(user.ultraballs || 0).toLocaleString()}</strong>
                </div>
                <div class="inventory-item">
                    <img src="${POKEBALL_IMAGE_BASE_URL}master-ball.png" alt="Master Ball">
                    Master Balls: <strong>${(user.masterballs || 0).toLocaleString()}</strong>
                </div>
                <div class="inventory-item">
                    <img src="${POKEBALL_IMAGE_BASE_URL}safari-ball.png" alt="Safari Ball">
                    Safari Balls: <strong>${(user.safariballs || 0).toLocaleString()}</strong>
                </div>
                <div class="inventory-item">
                    <img src="${POKEBALL_IMAGE_BASE_URL}premier-ball.png" alt="Honor Ball">
                    Honor Balls: <strong>${(user.premierballs || 0).toLocaleString()}</strong>
                </div>
                <div class="inventory-item">
                    <img src="${POKEBALL_IMAGE_BASE_URL}luxury-ball.png" alt="Luxe Ball">
                    Luxe Balls: <strong>${(user.luxuryballs || 0).toLocaleString()}</strong>
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Erreur lors du chargement du Profil:', error);
        document.getElementById('profile-error-container').innerHTML = `<div class="error-message">❌ Erreur de connexion à l'API. Détails: ${error.message}</div>`;
        container.innerHTML = '<p>Impossible de charger les données du profil.</p>';
    }
} // Fin de loadProfile

// --- FONCTIONS BOUTIQUE ---

function loadShop() {
    const shopItems = {
        'pokeball': { key: 'pokeballs', name: 'Poké Ball', cost: 100, promo: true, emoji: '🔴', img: 'poke-ball.png', desc: `Coût unitaire: 100 ₽. Promotion: 1 ball spéciale gratuite par 10 achetées!` },
        'greatball': { key: 'greatballs', name: 'Super Ball', cost: 300, promo: false, emoji: '🔵', img: 'great-ball.png', desc: `Coût: 300 ₽. (1.5x Taux de capture)` },
        'ultraball': { key: 'ultraballs', name: 'Hyper Ball', cost: 800, promo: false, emoji: '⚫', img: 'ultra-ball.png', desc: `Coût: 800 ₽. (2x Taux de capture)` },
        'masterball': { key: 'masterballs', name: 'Master Ball', cost: 15000, promo: false, emoji: '✨', img: 'master-ball.png', desc: `Coût: 15,000 ₽. (Capture garantie)` },
        'safariball': { key: 'safariballs', name: 'Safari Ball', cost: 500, promo: false, emoji: '🟢', img: 'safari-ball.png', desc: `Coût: 500 ₽. (Utilisation limitée à la Zone Safari)` },
        'premierball': { key: 'premierballs', name: 'Honor Ball', cost: 150, promo: false, emoji: '⚪', img: 'premier-ball.png', desc: `Coût: 150 ₽. (Pour le style !)` },
        'luxuryball': { key: 'luxuryballs', name: 'Luxe Ball', cost: 1000, promo: false, emoji: '💎', img: 'luxury-ball.png', desc: `Coût: 1,000 ₽. (Augmente le bonheur)` },
    };

    const container = document.getElementById('shopContainer');
    let html = '<div class="shop-grid">';

    for (const key in shopItems) {
        const item = shopItems[key];
        
        const buyInterface = currentUserId ? 
            `<div class="buy-controls">
                <input type="number" id="qty-${key}" min="1" value="1" placeholder="Qté" class="quantity-input">
                <button onclick="buyItem('${key}')" class="buy-btn">Acheter</button>
            </div>` : `<p>Connectez-vous pour acheter.</p>`;
            
        const promoBadge = item.promo ? '<span class="promo-badge">PROMO</span>' : '';

        html += `
            <div class="shop-card">
                ${promoBadge}
                <img src="${POKEBALL_IMAGE_BASE_URL}${item.img}" alt="${item.name}" class="ball-image">
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
                <div class="shop-price">Prix: <strong>${item.cost.toLocaleString()} ₽</strong></div>
                ${buyInterface}
            </div>
        `;
    }

    html += '</div>';
    html += '<div id="shop-message" class="shop-message"></div>'; 
    container.innerHTML = html;
} // Fin de loadShop

async function buyItem(itemKey) {
    if (!currentUserId) {
        document.getElementById('shop-message').textContent = 'Veuillez vous connecter pour effectuer un achat.';
        return;
    }

    const qtyInput = document.getElementById(`qty-${itemKey}`);
    const qty = parseInt(qtyInput.value);
    const messageContainer = document.getElementById('shop-message');

    if (isNaN(qty) || qty < 1) {
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Veuillez entrer une quantité valide (minimum 1).';
        return;
    }

    messageContainer.style.color = 'var(--text-color)';
    messageContainer.textContent = 'Transaction en cours...';

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
            messageContainer.style.color = 'var(--highlight-color)'; 
            messageContainer.textContent = data.message;
            
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile(); 
            }

        } else {
            messageContainer.style.color = 'var(--red-discord)'; 
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
        }

    } catch (error) {
        console.error('Erreur lors de l\'achat:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
    }
} // Fin de buyItem

// --- INITIALISATION ---
window.onload = initializeApp;
```eof
