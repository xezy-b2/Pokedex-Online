// public/script.js (VERSION COMPLÈTE)

const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

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

function updateUIState(isLoggedIn) {
    const loginLink = document.getElementById('discord-login-link');
    const loggedInUserDiv = document.getElementById('logged-in-user');
    const mainNav = document.getElementById('main-nav');
    const usernameDisplay = document.getElementById('username-display');
    
    if (isLoggedIn) {
        loginLink.style.display = 'none';
        loggedInUserDiv.style.display = 'flex';
        mainNav.style.display = 'flex';
        document.getElementById('display-username').textContent = currentUsername;
        usernameDisplay.innerHTML = `Dresseur Actuel : **${currentUsername}**`;
    } else {
        loginLink.style.display = 'block';
        loggedInUserDiv.style.display = 'none';
        mainNav.style.display = 'none';
        usernameDisplay.innerHTML = '';
    }
}

function logout() {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    currentUserId = null;
    currentUsername = null;
    
    updateUIState(false);
    showPage('pokedex'); 
    document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
}

function showPage(pageName) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    document.querySelectorAll('nav button').forEach(button => {
        button.classList.remove('active');
    });
    const navButton = document.getElementById(`nav-${pageName}`);
    if (navButton) navButton.classList.add('active');

    if (currentUserId) {
        if (pageName === 'pokedex') {
            loadPokedex(currentUserId);
        } else if (pageName === 'profile') {
            loadProfile(currentUserId);
        }
    }
    
    if (pageName === 'shop') {
        loadShop(); 
    }
}

// --- FONCTIONS DE CHARGEMENT DE DONNÉES ---

async function loadPokedex(userId) {
    const container = document.getElementById('pokedexContainer');
    container.innerHTML = 'Chargement du Pokédex...';
    const errorContainer = document.getElementById('pokedex-error-container');
    errorContainer.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${userId}`);
        const fullPokedex = await response.json();

        if (!response.ok) {
            errorContainer.innerHTML = `<p style="color: var(--red-discord);">Erreur: ${fullPokedex.message || 'Impossible de charger les données.'}</p>`;
            container.innerHTML = '';
            return;
        }

        // --- Logique d'affichage Pokédex (Aggrégation) ---
        const totalCaptured = fullPokedex.length;
        const uniqueCaptured = new Set(fullPokedex.map(p => p.pokedexId)).size;
        
        let html = `
            <h3 style="margin-top: 0;">Statistiques de capture</h3>
            <p>Total capturé : ${totalCaptured} Pokémon | Unique capturé : ${uniqueCaptured} / 151</p>`;
        
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
                // Pokémon manquant (affichage du placeholder)
                pokedexGridHtml += createPokedexCard({ pokedexId: i, name: `N°${i}` }, 0, false);
            }
        }
        
        pokedexGridHtml += '</div>';
        container.innerHTML = html + pokedexGridHtml;

    } catch (error) {
        console.error('Erreur lors de la récupération du Pokédex:', error);
        errorContainer.innerHTML = '<p style="color: var(--red-discord);">Erreur Réseau : Problème de connexion avec l\'API.</p>';
        container.innerHTML = '';
    }
}

async function loadProfile(userId) {
    const container = document.getElementById('profileContainer');
    container.innerHTML = 'Chargement du Profil...';
    const errorContainer = document.getElementById('pokedex-error-container');
    errorContainer.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`);
        const profileData = await response.json();

        if (!response.ok) {
            errorContainer.innerHTML = `<p style="color: var(--red-discord);">Erreur: ${profileData.message || 'Impossible de charger le profil.'}</p>`;
            container.innerHTML = '';
            return;
        }

        let ballList = ``;
        // Boucle sur toutes les clés de balles dans les données du profil
        for (const [key, value] of Object.entries(profileData)) {
            if (key.endsWith('balls')) {
                const ballName = key.charAt(0).toUpperCase() + key.slice(1).replace('balls', ' Balls');
                ballList += `<li>${ballName} : <strong>${value}</strong></li>`;
            }
        }
        
        const profileHtml = `
            <div class="pokedex-card" style="display: flex; flex-direction: column; align-items: center; border: 2px solid var(--highlight-color);">
                <h2 style="margin-top: 0;">${profileData.username}</h2>
                <p>ID Discord : ${profileData.userId}</p>
                <div style="text-align: left; width: 100%; padding: 10px;">
                    <h3>Économie</h3>
                    <p>BotCoins : <strong>${profileData.money.toLocaleString()} ₽</strong></p>
                    
                    <h3>Inventaire de Balls</h3>
                    <ul style="list-style-type: none; padding: 0;">
                        ${ballList}
                    </ul>
                    
                    <h3>Statistiques</h3>
                    <p>Total Captures : <strong>${profileData.stats.totalCaptures}</strong></p>
                    <p>Captures Uniques : <strong>${profileData.stats.uniqueCaptures} / 151</strong></p>
                </div>
            </div>
        `;
        
        container.innerHTML = profileHtml;

    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        errorContainer.innerHTML = '<p style="color: var(--red-discord);">Erreur Réseau : Problème de connexion avec l\'API.</p>';
        container.innerHTML = '';
    }
}

async function loadShop() {
    const container = document.getElementById('shopContainer');
    container.innerHTML = 'Chargement de la boutique...';
    const errorContainer = document.getElementById('pokedex-error-container');
    errorContainer.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shop`); 
        const items = await response.json();

        if (!response.ok) {
            errorContainer.innerHTML = '<p style="color: var(--red-discord);">Erreur: Impossible de charger les articles de la boutique.</p>';
            container.innerHTML = '';
            return;
        }

        let shopHtml = '';
        for (const [key, item] of Object.entries(items)) {
            const isExpensive = item.cost >= 1000;
            const borderStyle = `border: 2px solid ${isExpensive ? 'var(--shiny-color)' : 'var(--captured-border)'}`;
            
            const itemImageKey = key; 
            
            shopHtml += `
                <div class="pokedex-card shop-item" style="${borderStyle}">
                    <img src="${POKEAPI_SPRITE_URL}item/${itemImageKey}.png" alt="${item.name}" style="height: 64px; max-height: 64px;">
                    <div class="card-info" style="flex-direction: column; align-items: flex-start;">
                        <span class="pokemon-name">${item.name}</span>
                        <span class="pokedex-id">${item.cost.toLocaleString()} ₽</span>
                        <p style="font-size: 0.8em; color: var(--text-secondary); margin-top: 5px;">${item.desc.replace(/BotCoins/g, '₽')}</p>
                        <button 
                            style="margin-top: 10px; width: 100%;" 
                            onclick="buyItemWeb('${key}', '${item.name}', 1)"
                        >
                            Acheter via le site
                        </button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = shopHtml;

    } catch (error) {
        console.error('Erreur lors de la récupération de la boutique:', error);
        errorContainer.innerHTML = '<p style="color: var(--red-discord);">Erreur Réseau : Problème de connexion avec l\'API.</p>';
        container.innerHTML = '';
    }
}

/**
 * Fonction pour acheter un article via l'API web.
 */
async function buyItemWeb(itemKey, itemName, defaultQuantity = 1) {
    if (!currentUserId) {
        alert("Veuillez vous connecter avec Discord d'abord.");
        return;
    }
    
    const quantityInput = prompt(`Combien de ${itemName} voulez-vous acheter ? (Min: 1)`, defaultQuantity);
    
    if (quantityInput === null) return; 
    
    const quantity = parseInt(quantityInput);

    if (isNaN(quantity) || quantity < 1) {
        alert("Achat annulé ou quantité non valide.");
        return;
    }

    const errorContainer = document.getElementById('pokedex-error-container');
    errorContainer.innerHTML = `<p style="color: var(--highlight-color);">Achat de ${quantity} ${itemName} en cours... (Vérifiez votre solde)</p>`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUserId,
                itemKey: itemKey,
                quantity: quantity
            })
        });

        const data = await response.json();
        
        if (data.success) {
            alert(`✅ ${data.message} | Argent restant : ${data.newMoney.toLocaleString()} ₽`);
            errorContainer.innerHTML = `<p style="color: var(--highlight-color);">${data.message}</p>`;
            // Mise à jour du profil et du stock après l'achat réussi
            loadProfile(currentUserId); 
        } else {
            alert(`❌ Échec de l'achat : ${data.message}`);
            errorContainer.innerHTML = `<p style="color: var(--red-discord);">${data.message}</p>`;
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'achat web:', error);
        errorContainer.innerHTML = '<p style="color: var(--red-discord);">Erreur Réseau lors de l\'achat. L\'API est-elle en ligne ?</p>';
    }
}


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
            <img src="${imageSource}" alt="${pokemon.name || 'Inconnu'}">
            <span class="pokemon-name">${nameDisplay}</span>
            ${countDisplay}
            ${levelDisplay}
        </div>
    `;
}

// Assurez-vous d'appeler l'initialisation au chargement de la page si vous ne le faites pas via l'attribut body:
// window.onload = initializeApp; // Si vous n'utilisez pas <body onload="initializeApp()">
