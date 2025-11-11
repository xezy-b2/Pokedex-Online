// public/script.js

// L'URL PUBLIQUE DE L'API RENDER (CORRIGÉ !)
const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

let currentUserId = null; // Variable globale pour stocker l'ID Discord actuel

// --- FONCTIONS DE NAVIGATION ---

/**
 * Vérifie l'ID et lance la navigation vers une page spécifique.
 */
function checkUserIdAndNavigate(pageName) {
    const userId = document.getElementById('discordIdInput').value.trim();
    const errorContainer = document.getElementById('pokedex-error-container');
    
    if (!userId) {
        errorContainer.innerHTML = '<p style="color: red;">Veuillez entrer un ID Discord valide.</p>';
        return;
    }
    
    currentUserId = userId; // Stocke l'ID
    document.getElementById('main-nav').style.display = 'flex'; // Affiche la navigation
    document.getElementById('username-display').innerHTML = `Utilisateur: ${currentUserId}`; // Affichage initial
    errorContainer.innerHTML = '';
    
    showPage(pageName);
}

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
    document.getElementById(`nav-${pageName}`).classList.add('active');

    // 3. Charge les données de la page
    if (!currentUserId) return; 
    
    if (pageName === 'pokedex') {
        loadPokedex(currentUserId);
    } else if (pageName === 'profile') {
        loadProfile(currentUserId);
    }
}

// --- FONCTION DE CHARGEMENT DE PROFIL (AVEC TOUS LES DÉTAILS) ---

/**
 * Charge et affiche le profil de l'utilisateur.
 */
async function loadProfile(userId) {
    const container = document.getElementById('profileContainer');
    const usernameDisplay = document.getElementById('username-display');
    container.innerHTML = '<h2>Chargement du Profil...</h2>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${userId}`); 
        const data = await response.json();

        if (!response.ok) {
            usernameDisplay.innerHTML = `Utilisateur: ${currentUserId}`;
            container.innerHTML = `<p style="color: var(--red-discord);">Erreur Profil: ${data.message || 'Impossible de charger les données.'}</p>`;
            return;
        }
        
        usernameDisplay.innerHTML = `Dresseur : **${data.username}**`;
        
        // Liste des balls pour un affichage dynamique
        const balls = [
            { name: 'Poké', count: data.pokeballs },
            { name: 'Super', count: data.greatballs },
            { name: 'Hyper', count: data.ultraballs },
            { name: 'Master', count: data.masterballs },
            { name: 'Safari', count: data.safariballs },
            { name: 'Premier', count: data.premierballs },
            { name: 'Luxe', count: data.luxuryballs }
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
                        ${balls.filter(b => b.count > 0).map(b => `<span class="ball-count">${b.name}: x${b.count}</span>`).join('')}
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


// --- FONCTION POKÉDEX (LOGIQUE DE GRILLE) ---

/**
 * Génère le HTML pour une carte de Pokédex (espèce unique).
 */
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

/**
 * Charge et affiche le Pokédex de l'utilisateur.
 */
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
