// public/script.js (VERSION COMPLÈTE)

const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const POKEBALL_IMAGE_BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'; 

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- GESTION DE L'ÉTAT ET DE L'AFFICHAGE ---

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
        showPage('auth'); 
    }
}

function updateUIState(isAuthenticated) {
    document.getElementById('auth-form').style.display = isAuthenticated ? 'none' : 'flex';
    document.getElementById('user-info').style.display = isAuthenticated ? 'flex' : 'none';
    document.getElementById('main-nav').style.display = isAuthenticated ? 'flex' : 'none';

    if (isAuthenticated) {
        document.getElementById('username-display').textContent = currentUsername;
    }
}

function logout() {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    currentUserId = null;
    currentUsername = null;
    updateUIState(false);
    showPage('auth');
    document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${pageId}-page`).classList.add('active');
    
    document.querySelectorAll('#main-nav button').forEach(button => {
        button.classList.remove('active');
    });
    const navButton = document.getElementById(`nav-${pageId}`);
    if (navButton) {
        navButton.classList.add('active');
    }

    // Charger les données spécifiques à la page
    if (pageId === 'pokedex' && currentUserId) {
        loadPokedex();
    } else if (pageId === 'profile' && currentUserId) {
        loadProfile();
    } else if (pageId === 'shop') {
        loadShop();
    }
}


// --- GESTION POKEDEX & PROFIL ---

// NOUVEAU : Crée une carte pour les Pokémon non capturés
function createMissingPokedexCard(pokedexId) {
    const pokeId = pokedexId.toString().padStart(3, '0');
    return `
        <div class="pokedex-card missing-card" style="border: 2px dashed var(--missing-border); background-color: #36363680;">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${POKEAPI_SPRITE_URL}0.png" alt="???" style="filter: grayscale(100%); opacity: 0.5;" onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=?'">
            <span class="pokemon-name" style="color: var(--text-secondary);">???</span>
            <div style="margin-top: 10px; font-size: 0.8em; color: var(--text-secondary);">
                Non capturé
            </div>
            <button class="sell-button" disabled style="margin-top: 10px; background-color: #5a5a5a;">
                Vendre
            </button>
        </div>
    `;
}

/**
 * Crée une carte de Pokémon HTML avec un bouton de vente, les Base Stats et les IVs.
 * (Fonction existante - Modifiée uniquement si nécessaire pour l'intégration des Base Stats/IVs)
 */
function createSellablePokedexCard(pokemon) {
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');
    const nameDisplay = pokemon.isShiny 
        ? `<span class="shiny-text">★ ${pokemon.name}</span>` 
        : pokemon.name;
    const borderStyle = pokemon.isShiny 
        ? `border: 2px solid var(--shiny-color);` 
        : `border: 2px solid var(--captured-border);`;
    const imageSource = `${POKEAPI_SPRITE_URL}${pokemon.isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png`;
    const levelDisplay = `<span style="font-size: 0.9em;">Niv.${pokemon.level || 1}</span>`;

    // Calcul du prix de vente
    const basePrice = 50; 
    const levelBonus = (pokemon.level || 1) * 5; 
    const shinyBonus = pokemon.isShiny ? 200 : 0; 
    const salePrice = basePrice + levelBonus + shinyBonus;

    // --- Affichage des IVs (Valeurs Individuelles) ---
    const ivStatsKeys = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    let ivsBlockHtml = '<div class="ivs-block">';
    let totalIV = 0;
    
    ivStatsKeys.forEach(key => {
        const ivValue = pokemon.ivs ? pokemon.ivs[key] || 0 : 0;
        totalIV += ivValue;
        ivsBlockHtml += `
            <span>${key.split('-').map(s => s.charAt(0).toUpperCase()).join('.')}: 
                <span style="color: ${ivValue === 31 ? 'var(--shiny-color)' : 'var(--text-color)'}">${ivValue}</span>
            </span>
        `;
    });
    
    const ivPercentage = Math.round((totalIV / 186) * 100);
    ivsBlockHtml += `</div>`;
    
    // --- Affichage des Base Stats ---
    let baseStatsHtml = `
        <div style="margin-top: 10px;">
            <p style="font-weight: bold; margin: 5px 0 8px 0;">Base Stats</p>
            <div class="ivs-block">
    `;
    const baseStatsMap = new Map();
    pokemon.baseStats.forEach(stat => baseStatsMap.set(stat.name, stat.base_stat));

    ivStatsKeys.forEach(key => {
        const statValue = baseStatsMap.get(key) || 0;
        baseStatsHtml += `
            <span>${key.split('-').map(s => s.charAt(0).toUpperCase()).join('.')}: ${statValue}</span>
        `;
    });
    baseStatsHtml += `</div></div>`;

    // --- Détails complets (Base Stats + IVs) ---
    const statsDetailsHtml = `
        <details class="stat-details">
            <summary>IVs: ${totalIV}/186 (${ivPercentage}%)</summary>
            ${ivsBlockHtml}
            ${baseStatsHtml}
        </details>
    `;

    return `
        <div class="pokedex-card captured-card" style="${borderStyle}" data-pokedex-id="${pokemon.pokedexId}" data-is-shiny="${pokemon.isShiny ? 'true' : 'false'}">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${imageSource}" alt="${pokemon.name}" onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=Err'">
            <span class="pokemon-name">${nameDisplay}</span>
            ${levelDisplay}
            ${statsDetailsHtml}
            <div style="margin-top: 10px; font-size: 0.9em; color: var(--text-secondary);">
                Prix: ${salePrice.toLocaleString()} 💰
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
 * Charge les données du Pokédex depuis l'API, inclut les cartes manquantes et filtre par génération.
 */
async function loadPokedex() {
    const container = document.getElementById('pokedexContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    const uniqueCountDisplay = document.getElementById('unique-count-display');
    
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

        const { fullPokedex, uniquePokedexCount, allPokedexIds } = data;
        
        // 1. Mise à jour de l'affichage du compte unique (Gen 2 = 251 max)
        uniqueCountDisplay.textContent = `${uniquePokedexCount}`;

        // 2. Préparation des données pour l'affichage
        // Trier les Pokémon capturés par PokedexId
        fullPokedex.sort((a, b) => a.pokedexId - b.pokedexId);
        
        // Créer un Map pour stocker tous les HTML pour une espèce donnée
        // Clé: PokedexId, Valeur: String HTML de toutes les cartes capturées
        const speciesHtmlMap = new Map();
        
        // Stocker la première capture de chaque espèce (pour l'ordre)
        const firstCaptureOfSpecies = new Map();

        fullPokedex.forEach(pokemon => {
            const id = pokemon.pokedexId;
            const html = createSellablePokedexCard(pokemon);
            
            if (!speciesHtmlMap.has(id)) {
                speciesHtmlMap.set(id, '');
                firstCaptureOfSpecies.set(id, pokemon);
            }
            speciesHtmlMap.set(id, speciesHtmlMap.get(id) + html);
        });
        
        // 3. Créer les grilles de génération
        const gen1Grid = document.createElement('div');
        gen1Grid.className = 'pokedex-grid';
        gen1Grid.id = 'pokedex-gen1-grid';
        
        const gen2Grid = document.createElement('div');
        gen2Grid.className = 'pokedex-grid';
        gen2Grid.id = 'pokedex-gen2-grid';
        
        const MAX_ID_GEN_1 = 151;
        
        // 4. Boucler sur TOUS les IDs (001 à 251)
        allPokedexIds.forEach(pokedexId => {
            let targetGrid = pokedexId <= MAX_ID_GEN_1 ? gen1Grid : gen2Grid;
            
            if (speciesHtmlMap.has(pokedexId)) {
                // Si l'espèce a été capturée, ajouter tous les exemplaires HTML
                targetGrid.innerHTML += speciesHtmlMap.get(pokedexId);
            } else {
                // Sinon, ajouter la carte manquante
                targetGrid.innerHTML += createMissingPokedexCard(pokedexId);
            }
        });

        // 5. Affichage final du Pokédex
        container.innerHTML = '';
        
        const gen1Title = document.createElement('h3');
        gen1Title.textContent = '🌟 Première Génération (#001 - #151)';
        gen1Title.style.marginTop = '20px';
        container.appendChild(gen1Title);
        container.appendChild(gen1Grid);
        
        const gen2Title = document.createElement('h3');
        gen2Title.textContent = '⭐️ Deuxième Génération (#152 - #251)';
        gen2Title.style.marginTop = '20px';
        container.appendChild(gen2Title);
        container.appendChild(gen2Grid);
        
        // Afficher "Tout" par défaut
        filterPokedex('all'); 
        
    } catch (error) {
        console.error('Erreur de chargement du Pokédex:', error);
        errorContainer.textContent = 'Erreur de connexion au serveur API.';
        container.innerHTML = '';
    }
}

// NOUVEAU : Fonction de filtrage des générations
function filterPokedex(generation) {
    const gen1Grid = document.getElementById('pokedex-gen1-grid');
    const gen2Grid = document.getElementById('pokedex-gen2-grid');
    
    // Titres de génération
    const gen1Title = document.querySelector('#pokedex-page h3:nth-of-type(1)');
    const gen2Title = document.querySelector('#pokedex-page h3:nth-of-type(2)');
    
    if (!gen1Grid || !gen2Grid) return; 

    // Gestion de l'affichage
    if (generation === 'all') {
        gen1Grid.style.display = 'grid';
        gen2Grid.style.display = 'grid';
        if(gen1Title) gen1Title.style.display = 'block';
        if(gen2Title) gen2Title.style.display = 'block';
    } else if (generation === 'gen1') {
        gen1Grid.style.display = 'grid';
        gen2Grid.style.display = 'none';
        if(gen1Title) gen1Title.style.display = 'block';
        if(gen2Title) gen2Title.style.display = 'none';
    } else if (generation === 'gen2') {
        gen1Grid.style.display = 'none';
        gen2Grid.style.display = 'grid';
        if(gen1Title) gen1Title.style.display = 'none';
        if(gen2Title) gen2Title.style.display = 'block';
    }

    // Gestion du style des boutons de filtre
    document.querySelectorAll('#generation-filter button').forEach(button => {
        button.style.backgroundColor = 'var(--card-background)';
    });
    const activeFilterButton = document.getElementById(`filter-${generation}`);
    if (activeFilterButton) {
        activeFilterButton.style.backgroundColor = 'var(--highlight-color)';
    }
}

// ... (Gardez les fonctions loadProfile, createCompanionCard, createShopCard, loadShop, handleBuy)

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    container.innerHTML = '<h2>Chargement du Profil...</h2>';

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const data = await response.json();

        if (!response.ok) {
            container.innerHTML = `<h2>Erreur de Profil</h2><p>${data.message || 'Impossible de charger le profil.'}</p>`;
            return;
        }

        const { username, money, totalCaptures, uniqueCaptures, companion, items } = data;

        // Mise à jour de l'affichage du nom d'utilisateur dans le header si besoin
        document.getElementById('username-display').textContent = username;

        // Affichage des statistiques principales
        let htmlContent = `
            <h2>Profil de ${username}</h2>
            
            <div id="profile-stats">
                <div>💰 **BotCoins :** ${money.toLocaleString()}</div>
                <div>✨ **Captures Totales :** ${totalCaptures}</div>
                <div>📖 **Pokédex Unique :** ${uniqueCaptures}/251</div>
            </div>
            
            <h3>Inventaire</h3>
            <div class="item-list">
        `;
        
        // Affichage des items
        const itemNames = Object.keys(items);
        if (itemNames.length === 0) {
            htmlContent += '<div>Aucun objet en stock.</div>';
        } else {
            itemNames.forEach(itemName => {
                const count = items[itemName];
                if (count > 0) {
                    htmlContent += `<div>${itemName} : **${count.toLocaleString()}**</div>`;
                }
            });
        }
        
        htmlContent += '</div>';

        // Affichage du Compagnon
        htmlContent += '<h3>Pokémon Compagnon</h3>';
        if (companion) {
            htmlContent += createCompanionCard(companion);
        } else {
            htmlContent += `<div id="companion-card" style="border: 2px dashed var(--missing-border);">
                                <p>Vous n'avez pas de Pokémon Compagnon. Utilisez la commande **!setcompanion [ID]** sur Discord.</p>
                            </div>`;
        }

        container.innerHTML = htmlContent;

    } catch (error) {
        console.error('Erreur de chargement du profil:', error);
        container.innerHTML = '<h2>Erreur de Connexion</h2><p>Impossible de joindre le serveur API.</p>';
    }
}

function createCompanionCard(pokemon) {
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');
    const nameDisplay = pokemon.isShiny 
        ? `<span class="shiny-text">★ ${pokemon.name}</span>` 
        : pokemon.name;
    const imageSource = `${POKEAPI_SPRITE_URL}${pokemon.isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png`;
    
    // IVs
    const ivStatsKeys = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
    let ivsBlockHtml = '<div class="ivs-block">';
    let totalIV = 0;
    
    ivStatsKeys.forEach(key => {
        const ivValue = pokemon.ivs ? pokemon.ivs[key] || 0 : 0;
        totalIV += ivValue;
        ivsBlockHtml += `
            <span>${key.split('-').map(s => s.charAt(0).toUpperCase()).join('.')}: 
                <span style="color: ${ivValue === 31 ? 'var(--shiny-color)' : 'var(--text-color)'}">${ivValue}</span>
            </span>
        `;
    });
    const ivPercentage = Math.round((totalIV / 186) * 100);
    ivsBlockHtml += '</div>';

    // Base Stats
    let baseStatsHtml = '<div class="ivs-block">';
    const baseStatsMap = new Map();
    pokemon.baseStats.forEach(stat => baseStatsMap.set(stat.name, stat.base_stat));
    ivStatsKeys.forEach(key => {
        const statValue = baseStatsMap.get(key) || 0;
        baseStatsHtml += `
            <span>${key.split('-').map(s => s.charAt(0).toUpperCase()).join('.')}: ${statValue}</span>
        `;
    });
    baseStatsHtml += '</div>';

    return `
        <div id="companion-card" class="pokedex-card" style="border: 3px solid var(--discord-blue);">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${imageSource}" alt="${pokemon.name}" style="border: 2px solid var(--discord-blue);">
            <span class="pokemon-name" style="font-size: 1.2em;">${nameDisplay}</span>
            <span style="font-size: 1em; font-weight: bold;">Niveau : ${pokemon.level || 1}</span>
            
            <details class="stat-details" open>
                <summary>Statistiques de Base</summary>
                ${baseStatsHtml}
            </details>
            
            <details class="stat-details" open>
                <summary>IVs: ${totalIV}/186 (${ivPercentage}%)</summary>
                ${ivsBlockHtml}
            </details>
            
            <p style="margin-top: 15px; font-style: italic; color: var(--text-secondary);">
                Votre compagnon ne peut pas être vendu.
            </p>
        </div>
    `;
}

function createShopCard(item, price, image) {
    return `
        <div class="shop-card">
            <img src="${POKEBALL_IMAGE_BASE_URL}${image}.png" alt="${item}" style="width: 60px; height: 60px;">
            <span class="pokemon-name">${item}</span>
            <span class="price">${price.toLocaleString()} 💰</span>
            <input type="number" id="qty-${item.replace(/\s/g, '')}" value="1" min="1" max="999" style="width: 60px; margin: 10px auto; padding: 5px; text-align: center; background-color: var(--background); color: var(--text-color); border: 1px solid var(--highlight-color); border-radius: 4px;">
            <button class="buy-button" onclick="handleBuy('${item}', ${price})">Acheter</button>
            <div id="buy-msg-${item.replace(/\s/g, '')}" style="font-size: 0.8em; margin-top: 5px;"></div>
        </div>
    `;
}

async function loadShop() {
    const container = document.getElementById('shopContainer');
    container.innerHTML = ''; 

    // Données de la boutique (en dur dans le frontend pour la simplicité de l'affichage)
    const shopItems = [
        { name: 'Poké Ball', price: 100, image: 'poke-ball' },
        { name: 'Great Ball', price: 250, image: 'great-ball' },
        { name: 'Ultra Ball', price: 500, image: 'ultra-ball' }
    ];

    shopItems.forEach(item => {
        container.innerHTML += createShopCard(item.name, item.price, item.image);
    });
}

async function handleBuy(item, price) {
    const cleanItemName = item.replace(/\s/g, '');
    const quantityInput = document.getElementById(`qty-${cleanItemName}`);
    const messageContainer = document.getElementById(`buy-msg-${cleanItemName}`);
    const buyButton = document.querySelector(`#shopContainer .shop-card:has(#qty-${cleanItemName}) .buy-button`);

    const quantity = parseInt(quantityInput.value);

    if (isNaN(quantity) || quantity < 1) {
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Quantité invalide.';
        return;
    }
    
    messageContainer.textContent = 'Achat en cours...';
    buyButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, item, quantity })
        });

        const data = await response.json();

        if (response.ok) {
            messageContainer.style.color = 'var(--highlight-color)'; 
            messageContainer.textContent = data.message;
            // Recharger le profil pour mettre à jour l'argent et l'inventaire si la page est active
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
    } finally {
        buyButton.disabled = false;
        setTimeout(() => messageContainer.textContent = '', 5000);
    }
}

async function handleSell(pokemonId, pokemonName, price) {
    const messageContainer = document.getElementById(`sell-msg-${pokemonId}`);
    messageContainer.textContent = 'Vente en cours...';
    
    // Désactiver tous les boutons de vente pour éviter le double-clic
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
            messageContainer.style.color = 'var(--highlight-color)'; 
            messageContainer.textContent = data.message;
            
            await loadPokedex(); 
            
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile(); 
            }

        } else {
            messageContainer.style.color = 'var(--red-discord)'; 
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
            // Réactiver les boutons si la vente échoue
            document.querySelectorAll('.sell-button').forEach(btn => btn.disabled = false);
        }

    } catch (error) {
        console.error('Erreur lors de la vente:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
        document.querySelectorAll('.sell-button').forEach(btn => btn.disabled = false);
    }
}


// --- INITIALISATION ---

document.getElementById('auth-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const discordId = document.getElementById('discord-id').value;
    const discordUsername = document.getElementById('discord-username').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: discordId, username: discordUsername })
        });

        const data = await response.json();

        if (response.ok) {
            currentUserId = data.userId;
            currentUsername = data.username;
            localStorage.setItem('currentUserId', currentUserId);
            localStorage.setItem('currentUsername', currentUsername);
            updateUIState(true);
            showPage('pokedex');
        } else {
            alert(`Erreur de Connexion: ${data.message}`);
        }
    } catch (error) {
        console.error('Erreur de connexion:', error);
        alert('Erreur de connexion au serveur API.');
    }
});

window.onload = initializeApp;
