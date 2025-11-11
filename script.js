// public/script.js

// L'URL PUBLIQUE DE L'API RENDER
const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

let currentUserId = localStorage.getItem('currentUserId'); // Persistance via localStorage
let currentUsername = localStorage.getItem('currentUsername');

// --- GESTION DE LA REDIRECTION OAUTH ET DE L'ÉTAT ---

/**
 * Initialise l'application : vérifie l'URL pour un ID après redirection OAuth2
 * ou charge l'état de la session locale.
 */
function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('discordId');
    const usernameFromUrl = urlParams.get('username');
    
    // 1. Cas: Redirection OAuth (ID dans l'URL)
    if (idFromUrl) {
        currentUserId = idFromUrl;
        currentUsername = decodeURIComponent(usernameFromUrl);
        
        // Sauvegarde l'état localement
        localStorage.setItem('currentUserId', currentUserId);
        localStorage.setItem('currentUsername', currentUsername);

        // Nettoie l'URL et affiche le Pokédex
        history.pushState(null, '', window.location.pathname); 
        updateUIState(true);
        showPage('pokedex'); 
        
    } 
    // 2. Cas: Session locale existante
    else if (currentUserId) {
        updateUIState(true);
        // On affiche le Pokédex par défaut, mais les données seront chargées si l'utilisateur clique sur la nav
        showPage('pokedex'); 
    }
    // 3. Cas: Non connecté
    else {
        updateUIState(false);
        showPage('pokedex');
        document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
    }
}

/**
 * Met à jour les éléments visibles (bouton de connexion vs barre de nav).
 */
function updateUIState(isLoggedIn) {
    const loginButton = document.getElementById('discord-login-link');
    const loggedInUserDiv = document.getElementById('logged-in-user');
    const mainNav = document.getElementById('main-nav');
    const usernameDisplay = document.getElementById('username-display');
    
    if (isLoggedIn) {
        loginButton.style.display = 'none';
        loggedInUserDiv.style.display = 'flex';
        mainNav.style.display = 'flex';
        document.getElementById('display-username').textContent = currentUsername;
        usernameDisplay.innerHTML = `Dresseur Actuel : **${currentUsername}**`;
    } else {
        loginButton.style.display = 'block';
        loggedInUserDiv.style.display = 'none';
        mainNav.style.display = 'none';
        usernameDisplay.innerHTML = '';
    }
}

/**
 * Gère la déconnexion.
 */
function logout() {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    currentUserId = null;
    currentUsername = null;
    
    updateUIState(false);
    showPage('pokedex'); // Retourne à la page d'accueil par défaut
    document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
}


// --- FONCTIONS DE NAVIGATION (SIMPLIFIÉES) ---

/**
 * Change la page active (simule la navigation).
 */
function showPage(pageName) {
    // 1. Gère les classes de sections
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    // 2. Gère la classe 'active' sur les boutons de navigation
    document.querySelectorAll('nav button').forEach(button => {
        button.classList.remove('active');
    });
    const navButton = document.getElementById(`nav-${pageName}`);
    if (navButton) navButton.classList.add('active');

    // 3. Charge les données de la page (UNIQUEMENT si connecté)
    if (currentUserId) {
        if (pageName === 'pokedex') {
            loadPokedex(currentUserId);
        } else if (pageName === 'profile') {
            loadProfile(currentUserId);
        }
    }
    
    // Le shop n'a pas besoin de l'ID utilisateur au chargement
    if (pageName === 'shop') {
        loadShop(); 
    }
}


// --- FONCTION DE CHARGEMENT DE PROFIL ---

/**
 * Charge et affiche le profil de l'utilisateur.
 */
async function loadProfile(userId) {
    const container = document.getElementById('profileContainer');
    container.innerHTML = '<h2>Chargement du Profil...</h2>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`); 
        const data = await response.json();

        if (!response.ok) {
            container.innerHTML = `<p style="color: var(--red-discord);">Erreur Profil: ${data.message || 'Impossible de charger les données.'}</p>`;
            return;
        }
        
        // Liste des balls pour un affichage dynamique
        const balls = [
            { name: 'Poké', count: data.pokeballs, emoji: '🔴' },
            { name: 'Super', count: data.greatballs, emoji: '🔵' },
            { name: 'Hyper', count: data.ultraballs, emoji: '⚫' },
            { name: 'Master', count: data.masterballs, emoji: '🟣' },
            { name: 'Safari', count: data.safariballs, emoji: '🟢' },
            { name: 'Honor', count: data.premierballs, emoji: '⚪' },
            { name: 'Luxe', count: data.luxuryballs, emoji: '⚫' }
        ];

        // Génération du HTML du profil
        const profileHtml = `
            <h2>Statistiques de Dresseur</h2>
            <div id="profile-content">
                <div class="profile-stat">
                    <span class="stat-label">Nom d'utilisateur</span>
                    <span class="stat-value">${data.username}</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-label">Argent 💰</span>
                    <span class="stat-value">${data.money.toLocaleString()} ₽</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-label">Compagnon Actuel</span>
                    <span class="stat-value">${data.companionPokemonId ? `(ID: ${data.companionPokemonId})` : 'Aucun'}</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-label">Captures Totales</span>
                    <span class="stat-value">${data.stats.totalCaptures}</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-label">Espèces Uniques</span>
                    <span class="stat-value">${data.stats.uniqueCaptures} / 151</span>
                </div>
                <div class="profile-stat">
                    <span class="stat-label">Poké Balls en Stock</span>
                    <div class="balls-row">
                        ${balls.filter(b => b.count > 0).map(b => `<span class="ball-count">${b.emoji} ${b.name}: x${b.count}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = profileHtml;

    } catch (error) {
        console.error('Erreur lors de la récupération du Profil:', error);
        container.innerHTML = '<p style="color: var(--red-discord);">Erreur Réseau : Problème de connexion avec l\'API.</p>';
    }
}


// --- FONCTION DE CHARGEMENT DE BOUTIQUE ---

async function loadShop() {
    const container = document.getElementById('shopContainer');
    container.innerHTML = 'Chargement de la boutique...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shop`); 
        const items = await response.json();

        if (!response.ok) {
            container.innerHTML = '<p style="color: var(--red-discord);">Erreur: Impossible de charger les articles de la boutique.</p>';
            return;
        }

        let shopHtml = '';
        for (const [key, item] of Object.entries(items)) {
            // Détermine la couleur de bordure basée sur le coût
            const isExpensive = item.cost >= 1000;
            const borderStyle = `border: 2px solid ${isExpensive ? 'var(--shiny-color)' : 'var(--captured-border)'}`;
            
            // L'URL de l'image de l'objet doit utiliser 'item'
            const itemImageKey = key.replace('ball', 'ball'); 
            
            shopHtml += `
                <div class="pokedex-card shop-item" style="${borderStyle}">
                    <img src="${POKEAPI_SPRITE_URL}/item/${itemImageKey}.png" alt="${item.name}" style="height: 64px; max-height: 64px;">
                    <div class="card-info" style="flex-direction: column; align-items: flex-start;">
                        <span class="pokemon-name">${item.name}</span>
                        <span class="pokedex-id">${item.cost.toLocaleString()} ₽</span>
                        <p style="font-size: 0.8em; color: var(--text-secondary); margin-top: 5px;">${item.desc}</p>
                        <button 
                            style="margin-top: 10px; width: 100%;" 
                            onclick="alert('Veuillez utiliser la commande !pokeshop ${key} [quantité] sur Discord pour acheter.')"
                        >
                            Acheter sur Discord
                        </button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = shopHtml;

    } catch (error) {
        console.error('Erreur lors de la récupération de la boutique:', error);
        container.innerHTML = '<p style="color: var(--red-discord);">Erreur Réseau : Problème de connexion avec l\'API.</p>';
    }
}

// --- FONCTION POKÉDEX (LOGIQUE DE GRILLE) ---

function createPokedexCard(uniquePokemonData, count, isCaptured) {
    const isShiny = uniquePokemonData.isShinyFirstCapture || false;
    const pokedexId = uniquePokemonData.pokedexId;
    const name = uniquePokemonData.name;
    
    let imageUrl = POKEAPI_SPRITE_URL;
    if (isShiny) {
        imageUrl += 'shiny/';
    }
    imageUrl += `${pokedexId}.png`;
    
    const finalImageUrl = isCaptured ? imageUrl : `${POKEAPI_SPRITE_URL}${pokedexId}.png`;
    const grayscaleStyle = isCaptured ? '' : 'style="filter: grayscale(100%); opacity: 0.5;"';
    
    const shinyMark = isShiny ? '✨' : '';

    return `
        <div class="pokedex-card" data-pokedex-id="${pokedexId}" ${isCaptured ? 'captured' : 'missing'}>
            <img src="${finalImageUrl}" alt="${name}" ${grayscaleStyle}>
            <div class="card-info">
                <span class="pokedex-id">#${String(pokedexId).padStart(3, '0')}</span>
                <span class="pokemon-name">${name.toUpperCase()} ${shinyMark}</span>
                ${isCaptured ? `<span class="capture-count">x${count}</span>` : ''}
            </div>
        </div>
    `;
}

async function loadPokedex(userId) {
    const container = document.getElementById('pokedexContainer');
    container.innerHTML = 'Chargement du Pokédex...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${userId}`); 
        
        if (!response.ok) {
            try {
                const data = await response.json();
                container.innerHTML = `<p style="color: var(--red-discord);">Erreur API: ${data.message || 'Impossible de lire les données JSON.'}</p>`;
            } catch (jsonError) {
                container.innerHTML = '<p style="color: var(--red-discord);">Erreur de connexion : Le serveur API est inaccessible. Vérifiez la console.</p>';
            }
            return;
        }

        const data = await response.json();
        const fullPokedex = data.fullPokedex;
        
        let html = `<h2>Mon Pokédex</h2>`;
        html += `<p>Espèces Uniques Capturées: **${data.uniquePokedexCount}** / 151</p>`;
        
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
                pokedexGridHtml += createPokedexCard({ pokedexId: i, name: `N°${i}` }, 0, false);
            }
        }
        
        pokedexGridHtml += '</div>';
        container.innerHTML = html + pokedexGridHtml;

    } catch (error) {
        console.error('Erreur lors de la récupération du Pokédex:', error);
        container.innerHTML = '<p style="color: var(--red-discord);">Erreur Réseau : Impossible d\'établir la connexion avec l\'API Render.</p>';
    }
}
