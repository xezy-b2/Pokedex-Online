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
        showPage('pokedex');
        document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
    }
}

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

function logout() {
    currentUserId = null;
    currentUsername = null;
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    updateUIState(false);
    showPage('pokedex');
    document.getElementById('pokedex-error-container').textContent = '';
}

function showPage(pageName) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    const activeSection = document.getElementById(`${pageName}-page`);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    document.querySelectorAll('nav button').forEach(button => {
        button.style.backgroundColor = 'var(--card-background)';
    });
    const activeButton = document.getElementById(`nav-${pageName}`);
    if (activeButton) {
        activeButton.style.backgroundColor = 'var(--highlight-color)';
    }
    
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
        showPage('pokedex'); 
    }
}


// --- GESTION POKEDEX & PROFIL ---

/**
 * Crée une carte de Pokémon HTML (capturé ou manquant).
 */
function createPokedexCard(pokemon, isSellable = false) { 
    const isCaptured = pokemon.isCaptured !== false; 
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');
    
    // --- LOGIQUE POUR POKÉMON MANQUANT (GRISÉ) ---
    if (!isCaptured) {
        // Pour les manquants, on utilise l'image normale, mais on la grise/assombrit
        const missingImageSource = `${POKEAPI_SPRITE_URL}${pokemon.pokedexId}.png`;
        return `
            <div class="pokedex-card missing-card" style="border: 2px dashed var(--missing-border); opacity: 0.6;">
                <span class="pokedex-id">#${pokeId}</span>
                <img src="${missingImageSource}" alt="Inconnu #${pokeId}" 
                     style="filter: grayscale(100%) brightness(0.1);"
                     onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=?'">
                <span class="pokemon-name" style="color: var(--text-secondary);">Inconnu</span>
                <span style="font-size: 0.9em; color: var(--text-secondary); margin-top: 5px;">(Non Capturé)</span>
            </div>
        `;
    }
    
    // --- LOGIQUE POUR POKÉMON CAPTURÉ ---

    const isShiny = pokemon.isShiny;
    const borderStyle = isShiny ? `border: 2px solid var(--shiny-color)` : `border: 2px solid var(--captured-border)`;
    
    const imageId = pokemon.formId || pokemon.pokedexId;
    const imageSource = `${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${imageId}.png`;
    const nameDisplay = isShiny ? `✨ ${pokemon.name}` : pokemon.name;
    const levelDisplay = pokemon.level ? `<span class="pokemon-level">Lv.${pokemon.level}</span>` : '';
    
    
    // Calcul estimé du prix
    const basePrice = 50; 
    const levelBonus = (pokemon.level || 1) * 5; 
    const shinyBonus = isShiny ? 200 : 0; 
    const salePrice = basePrice + levelBonus + shinyBonus;

    // --- Affichage des IVs (Valeurs Individuelles) ---
    const ivStatsKeys = [
        { key: 'iv_hp', display: 'PV' },
        { key: 'iv_attack', display: 'Attaque' },
        { key: 'iv_defense', display: 'Défense' },
        { key: 'iv_special_attack', display: 'Att. Spé.' },
        { key: 'iv_special_defense', display: 'Déf. Spé.' },
        { key: 'iv_speed', display: 'Vitesse' }
    ];
    
    let ivsBlockHtml = '';
    // Vérifier si le champ IVs est présent dans l'objet 
    if (pokemon.iv_hp !== undefined || pokemon.iv_attack !== undefined) {
        let totalIVs = 0;
        let ivListHtml = '';
        
        ivStatsKeys.forEach(stat => {
            // Utiliser 0 si l'IV n'est pas défini
            const ivValue = pokemon[stat.key] || 0; 
            totalIVs += ivValue;
            // Mettre en surbrillance les IVs parfaits (31) en or
            const valueStyle = ivValue === 31 ? 'color: var(--shiny-color); font-weight: bold;' : '';
            ivListHtml += `<li>${stat.display}: <strong style="${valueStyle}">${ivValue}/31</strong></li>`;
        });
        
        const ivPercentage = ((totalIVs / 186) * 100).toFixed(2);
        
        ivsBlockHtml = `
            <h4 style="margin: 10px 0 5px; color: var(--highlight-color); border-top: 1px dashed var(--header-background); padding-top: 5px;">
                IVs Totaux: ${totalIVs}/186 (<span style="color: var(--shiny-color);">${ivPercentage}%</span>)
            </h4>
            <ul>
                ${ivListHtml}
            </ul>
        `;
    }
    // --- FIN NOUVEAU IVs ---

    // --- Affichage des Base Stats et des IVs combinés dans le Details/Summary ---
    let statsDetailsHtml = '';
    
    if ((pokemon.baseStats && pokemon.baseStats.length > 0) || ivsBlockHtml) {
        
        let baseStatsHtml = '';
        if (pokemon.baseStats && pokemon.baseStats.length > 0) {
            const baseStatsList = pokemon.baseStats.map(stat => {
                // Traduction des noms de stat
                const translatedName = {
                    hp: 'PV',
                    attack: 'Attaque',
                    defense: 'Défense',
                    'special-attack': 'Att. Spé.',
                    'special-defense': 'Déf. Spé.',
                    speed: 'Vitesse'
                }[stat.name] || stat.name;

                return `<li>${translatedName}: <strong>${stat.base_stat}</strong></li>`;
            }).join('');
            
            baseStatsHtml = `
                <h4 style="margin: 10px 0 5px; color: var(--text-color); padding-top: 5px;">Stats de Base (Espèce)</h4>
                <ul>
                    ${baseStatsList}
                </ul>
            `;
        }

        statsDetailsHtml = `
            <details style="text-align: left; margin-top: 10px; border-top: 1px solid var(--header-background); padding-top: 5px;">
                <summary style="font-weight: bold; cursor: pointer; color: var(--text-secondary); list-style: none; display: flex; align-items: center;">
                    <span style="flex-grow: 1;">Détails des Stats</span>
                    <span style="font-size: 0.8em; color: var(--highlight-color);">[+]</span>
                </summary>
                
                ${baseStatsHtml}
                ${ivsBlockHtml}
                
            </details>
        `;
    }
    // --- FIN Base Stats et IVs ---

    // --- LOGIQUE POUR LES BOUTONS (CONDITIONNEL) ---
    let sellAndTradeButtonsHtml = '';
    if (isSellable) {
        
        // Bouton Échange Miracle (Indisponible sur Shiny)
        let wonderTradeButtonHtml = '';
        if (isShiny) {
             wonderTradeButtonHtml = `
                <button class="trade-button" disabled 
                        style="margin-top: 10px; margin-left: 5px; background-color: var(--card-background); color: var(--text-secondary); cursor: not-allowed;">
                    Échange Miracle (Indisponible sur ✨)
                </button>
            `;
        } else {
             wonderTradeButtonHtml = `
                <button class="trade-button" onclick="handleWonderTrade('${pokemon._id}', '${pokemon.name}')" 
                        style="margin-top: 10px; margin-left: 5px; background-color: var(--discord-blue);">
                    Échange Miracle
                </button>
            `;
        }
        
        // Bouton Vendre
        const sellButtonHtml = `
            <button class="sell-button" onclick="handleSell('${pokemon._id}', '${pokemon.name}', ${salePrice})" 
                    style="background-color: var(--pokeball-red);">
                Vendre
            </button>
        `;
        
        sellAndTradeButtonsHtml = `
            <div style="margin-top: 10px; font-size: 0.9em; color: var(--text-secondary);">
                Prix de Vente: ${salePrice} 💰
            </div>
            <div style="display: flex; justify-content: center; margin-top: 10px;">
                ${sellButtonHtml}
                ${wonderTradeButtonHtml}
            </div>
            <div id="action-msg-${pokemon._id}" style="font-size: 0.8em; margin-top: 5px;"></div>
        `;
    }


    return `
        <div class="pokedex-card" style="${borderStyle}">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${imageSource}" alt="${pokemon.name}" onerror="this.onerror=null; this.src='https://placehold.co/96x96/363636/ffffff?text=Err'">
            <span class="pokemon-name">${nameDisplay}</span>
            ${levelDisplay}
            ${statsDetailsHtml} 
            ${sellAndTradeButtonsHtml} 
        </div>
    `;
}

/**
 * Charge les données du Pokédex depuis l'API, gère la séparation par Génération et l'affichage des manquants.
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

const { fullPokedex, capturedPokemonsList, uniquePokedexCount, maxPokedexId, maxGen1Id, maxGen2Id } = data; 
        
        let html = '';
        
        // --- 1. SECTION POKÉDEX OFFICIEL (UNIQUE + MANQUANTS, SANS BOUTON VENTE) ---
        
html += `
    <h2>Pokédex Officiel (Unique)</h2>
    <p style="font-size: 1.1em; font-weight: bold;">Espèces uniques capturées : ${uniquePokedexCount}/${maxPokedexId}</p>
    <p style="font-size: 0.9em; color: var(--text-secondary);">
        Affiche les espèces capturées et celles manquantes (grisées) jusqu'à la Gen 3 (1-${maxPokedexId}).
    </p>
`;
        
// Filtrage précis par génération
const gen1Unique = fullPokedex.filter(p => p.pokedexId <= maxGen1Id);
const gen2Unique = fullPokedex.filter(p => p.pokedexId > maxGen1Id && p.pokedexId <= maxGen2Id);
const gen3Unique = fullPokedex.filter(p => p.pokedexId > maxGen2Id && p.pokedexId <= maxPokedexId);

        const generateUniqueGrid = (title, pokemonList) => {
            const capturedCount = pokemonList.filter(p => p.isCaptured).length;
            return `
                <h3 style="margin-top: 30px; border-bottom: 2px solid var(--highlight-color); padding-bottom: 5px;">
                    ${title} (${capturedCount}/${pokemonList.length})
                </h3>
                <div class="pokedex-grid">
                    ${pokemonList.map(p => createPokedexCard(p, false)).join('')} </div>
            `;
        };

        if (gen1Unique.length > 0) {
            html += generateUniqueGrid('Génération 1 (Kanto)', gen1Unique);
        }
        
        if (gen2Unique.length > 0) {
            html += generateUniqueGrid('Génération 2 (Johto)', gen2Unique);
        }

        if (gen3Unique.length > 0) 
        {
            html += generateUniqueGrid('Génération 3 (Advanced Generation)', gen3Unique);
        }

        // --- 2. SECTION MA COLLECTION (DOUBLONS & SHINIES, AVEC BOUTON VENTE) ---
        
        // 2.1. Séparer Shinies et Non-Shinies
        const shinies = capturedPokemonsList.filter(p => p.isShiny);
        const nonShinies = capturedPokemonsList.filter(p => !p.isShiny);
        
        // 2.2. Identifier les doublons parmi les Non-Shinies
        // Trier pour identifier la 'meilleure' instance (niveau le plus haut) à garder
        const nonShiniesSortedForDuplicationCheck = [...nonShinies].sort((a, b) => {
            // 1. Tri par ID pour grouper
            if (a.pokedexId !== b.pokedexId) return a.pokedexId - b.pokedexId;
            // 2. Tri par Niveau (descendant: le plus haut est gardé)
            return b.level - a.level;
        });

        const nonShinyKeepers = new Map(); // Stocke l'unique instance (meilleur niveau) pour chaque ID
        const actualDuplicates = [];

        nonShiniesSortedForDuplicationCheck.forEach(p => {
            if (!nonShinyKeepers.has(p.pokedexId)) {
                // Premier rencontré (le meilleur) -> c'est celui que l'on garde.
                nonShinyKeepers.set(p.pokedexId, p); 
            } else {
                // Déjà un "keeper" pour cet ID -> c'est un doublon
                actualDuplicates.push(p);
            }
        });

        
        // 2.3. Affichage de la Collection
        
        html += `
            <h2 style="margin-top: 40px;">Ma Collection Complète (${capturedPokemonsList.length} Pokémon)</h2>
            <p style="font-size: 0.9em; color: var(--text-secondary);">
                Affiche TOUS vos Pokémon <span style="font-weight: bold;">doublons</span> et <span style="color: var(--shiny-color); font-weight: bold;">chromatiques</span> pour la vente ou l'échange miracle. L'unique instance non-chromatique (celle de niveau le plus haut) de chaque espèce n'est pas affichée ici.
            </p>
        `;
        
        // Sous-section Shinies
        if (shinies.length > 0) {
            html += `
                <h3 style="margin-top: 30px; border-bottom: 2px solid var(--shiny-color); padding-bottom: 5px; color: var(--shiny-color);">
                    ✨ Mes Pokémon Chromatiques (Shinies) (${shinies.length})
                </h3>
                <div class="pokedex-grid">
                    ${shinies.map(p => createPokedexCard(p, true)).join('')} 
                </div>
            `;
        }

        // Sous-section Doublons (Anciennement "Mes Pokémon Normaux")
        if (actualDuplicates.length > 0) {
            html += `
                <h3 style="margin-top: 30px; border-bottom: 2px solid var(--captured-border); padding-bottom: 5px;">
                    Mes Pokémon Doublons (Non-Chromatiques) (${actualDuplicates.length})
                </h3>
                <div style="margin-bottom: 20px;">
                    <button onclick="handleSellAllDuplicates(${actualDuplicates.length})" style="background-color: var(--pokeball-red); font-weight: bold;">
                        Vendre TOUS les ${actualDuplicates.length} Doublons (sauf compagnon)
                    </button>
                    <div id="sell-all-duplicates-msg" style="font-size: 0.8em; margin-top: 5px;"></div>
                </div>
                <div class="pokedex-grid">
                    ${actualDuplicates.map(p => createPokedexCard(p, true)).join('')} 
                </div>
            `;
        }
        
        if (shinies.length === 0 && actualDuplicates.length === 0) {
            html += `<p style="margin-top: 20px; color: var(--text-secondary);">Vous n'avez aucun Pokémon en double ou chromatique à vendre/échanger !</p>`;
        }

        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur de chargement du Pokédex:', error);
        errorContainer.textContent = 'Erreur de connexion au serveur API.';
        container.innerHTML = '';
    }
}

/**
 * Crée la carte HTML du Pokémon Compagnon.
 */
async function loadProfile() {
    const container = document.getElementById('profileContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = '<h2>Chargement du Profil...</h2>';
    errorContainer.textContent = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const user = await response.json();
        
        if (!response.ok) {
            errorContainer.textContent = user.message || `Erreur: Impossible de charger le profil (Statut ${response.status}).`;
            container.innerHTML = '';
            return;
        }

        const maxPokedexId = user.maxPokedexId || 251; // Fallback 
        
        const companionHtml = createCompanionCard(user.companionPokemon);

        const statsHtml = `
            <div class="profile-stats-grid">
                <div class="profile-stat-card">
                    <h3>Statistiques</h3>
                    <div style="display: flex; justify-content: space-around; gap: 20px;">
                        <div style="border: 2px solid var(--highlight-color); border-radius: 8px; padding: 15px; text-align: center;">
                            <span style="font-size: 2.5em;">💰</span>
                            <p style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: var(--shiny-color);">${user.money.toLocaleString()}</p>
                            <p style="margin: 0; color: var(--text-secondary);">BotCoins</p>
                        </div>
                         <div style="border: 2px solid var(--pokeball-red); border-radius: 8px; padding: 15px; text-align: center;">
                            <span style="font-size: 2.5em;">🐾</span>
                            <p style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: var(--pokeball-red);">${user.stats.totalCaptures}</p>
                            <p style="margin: 0; color: var(--text-secondary);">Pokémon Capturés</p>
                        </div>
                        <div style="border: 2px solid var(--captured-border); border-radius: 8px; padding: 15px; text-align: center;">
                            <span style="font-size: 2.5em;">📚</span>
                            <p style="margin: 5px 0 0; font-size: 1.5em; font-weight: bold; color: var(--captured-border);">${user.stats.uniqueCaptures}/${maxPokedexId}</p>
                            <p style="margin: 0; color: var(--text-secondary);">Espèces Uniques</p>
                        </div>
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

// --- GESTION DE LA BOUTIQUE (SHOP) et VENTE (SELL) ---

function createShopCard(itemKey, item) {
    const hasPromo = item.promo;
    const inputStep = itemKey === 'pokeball' ? '1' : '10';

    const quantityInput = `
        <div style="margin: 15px 0; display: flex; gap: 10px; justify-content: center;">
            <input type="number" id="qty-${itemKey}" min="1" value="1" step="${inputStep}" style="width: 80px; text-align: center; background-color: var(--header-background); color: var(--text-color);">
            <button onclick="handleBuy('${itemKey}', document.getElementById('qty-${itemKey}').value)">Acheter</button>
        </div>
    `;

    return `
        <div class="shop-card">
            <div class="shop-card-header">
                <img src="${POKEBALL_IMAGE_BASE_URL}${item.imageFragment}" alt="${item.name}" class="shop-image" onerror="this.onerror=null; this.style.display='none'; this.parentElement.style.justifyContent='center';">
                ${item.name}
            </div>
            ${hasPromo ? '<span class="promo-badge">PROMO</span>' : ''}
            <p class="shop-desc">${item.desc}</p>
            <p class="shop-cost">Coût: <strong>${item.cost.toLocaleString()} 💰</strong></p>
            ${quantityInput}
            <div id="msg-${itemKey}" style="font-size: 0.9em; margin-top: 5px;"></div>
        </div>
    `;
}

async function loadShop() {
    const container = document.getElementById('shopContainer');
    const errorContainer = document.getElementById('pokedex-error-container');
    container.innerHTML = '<p>Chargement de la Boutique...</p>';
    errorContainer.textContent = '';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shop`);
        const items = await response.json();
        
        if (!response.ok) {
            errorContainer.textContent = items.message || `Erreur: Impossible de charger la boutique (Statut ${response.status}).`;
            container.innerHTML = '';
            return;
        }

        const html = `
            <div class="shop-grid">
                ${Object.keys(items).map(key => createShopCard(key, items[key])).join('')}
            </div>
        `;
        container.innerHTML = html;

    } catch (error) {
        console.error('Erreur de chargement de la boutique:', error);
        errorContainer.textContent = 'Erreur de connexion au serveur API.';
        container.innerHTML = '';
    }
}

async function handleBuy(itemKey, qty) {
    const quantity = parseInt(qty);
    if (!currentUserId || isNaN(quantity) || quantity < 1) {
        document.getElementById(`msg-${itemKey}`).textContent = "Quantité invalide.";
        return;
    }

    const messageContainer = document.getElementById(`msg-${itemKey}`);
    messageContainer.style.color = 'var(--shiny-color)';
    messageContainer.textContent = `Achat de ${quantity} ${itemKey.replace('ball', ' Ball')} en cours...`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, itemKey: itemKey, quantity: quantity })
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
}


async function handleSell(pokemonId, pokemonName, estimatedPrice) {
    if (!currentUserId) {
        document.getElementById('pokedex-error-container').textContent = "Veuillez vous connecter avant de vendre.";
        return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir vendre votre ${pokemonName} pour ${estimatedPrice} 💰 ?`)) {
        return;
    }

    // Utilisation de l'ID de message générique
    const messageContainer = document.getElementById(`action-msg-${pokemonId}`);
    // Cibler le div parent des boutons pour les désactiver/réactiver
    const buttonDiv = messageContainer.previousElementSibling; 
    
    // Désactiver les boutons
    buttonDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);

    messageContainer.style.color = 'var(--shiny-color)';
    messageContainer.textContent = `Vente de ${pokemonName} pour ${estimatedPrice} 💰 en cours...`;


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
            
            // Recharger le Pokédex pour rafraîchir la liste de collection après la vente
            await loadPokedex(); 
            
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile(); 
            }

        } else {
            messageContainer.style.color = 'var(--red-discord)'; 
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
            // Réactiver les boutons
            buttonDiv.querySelectorAll('button').forEach(btn => btn.disabled = false);
        }

    } catch (error) {
        console.error('Erreur lors de la vente:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
        // Réactiver les boutons
        buttonDiv.querySelectorAll('button').forEach(btn => btn.disabled = false);
    }
}

// --- GESTION ÉCHANGE MIRACLE (MIS À JOUR POUR UN AFFICHAGE CLAIR) ---
// Fonction pour fermer le modal
function closeTradeModal() {
    document.getElementById('trade-modal').style.display = 'none';
}

// Fonction pour gérer l'échange miracle
async function handleWonderTrade(pokemonId, pokemonName) {
    if (!confirm(`Voulez-vous envoyer ${pokemonName} en échange miracle ?`)) return;

    const messageContainer = document.getElementById(`action-msg-${pokemonId}`);
    try {
        const response = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, pokemonId: pokemonId })
        });

        const data = await response.json();

        if (response.ok) {
            // 1. Afficher le modal avec le nouveau Pokémon
            showTradeResult(data.newPokemon);
            
            // 2. Rafraîchir le Pokédex en arrière-plan
            loadPokedex();
        } else {
            alert(data.message || "Erreur lors de l'échange.");
        }
    } catch (error) {
        console.error("Erreur d'échange:", error);
    }
}

// Fonction pour injecter le Pokémon reçu dans le modal
function showTradeResult(pokemon) {
    const container = document.getElementById('received-pokemon-card');
    
    // On réutilise votre fonction de création de carte existante
    // Mais on force l'affichage sans boutons de vente
    container.innerHTML = createPokedexCard(pokemon, false);
    
    // Affichage du modal
    document.getElementById('trade-modal').style.display = 'flex';
}

/**
 * Gère la vente de tous les doublons non-chromatiques via l'API.
 */
async function handleSellAllDuplicates(count) {
    if (!currentUserId) {
        document.getElementById('pokedex-error-container').textContent = "Veuillez vous connecter avant de vendre.";
        return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir vendre vos ${count} doublons (non-chromatiques) ? L'unique instance non-chromatique de plus haut niveau de chaque espèce sera conservée.`)) {
        return;
    }
    
    const messageContainer = document.getElementById('sell-all-duplicates-msg');
    const button = messageContainer.previousElementSibling;
    
    button.disabled = true;
    messageContainer.style.color = 'var(--shiny-color)';
    messageContainer.textContent = `Vente de ${count} Pokémon en cours...`;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/sell/duplicates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
        });

        const data = await response.json();

        if (response.ok) {
            messageContainer.style.color = 'var(--highlight-color)'; 
            messageContainer.textContent = data.message;
            
            // Recharger les données après la vente
            await loadPokedex(); 
            // Mettre à jour l'argent si on est sur la page profil
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile(); 
            }

        } else {
            messageContainer.style.color = 'var(--red-discord)'; 
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
            button.disabled = false;
        }

    } catch (error) {
        console.error('Erreur lors de la vente en masse:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
        button.disabled = false;
    }
}


// --- ÉVÉNEMENTS ---

// S'assurer que le script s'exécute après le chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    
    // Ajout des listeners pour la navigation
    document.getElementById('nav-pokedex').addEventListener('click', () => showPage('pokedex'));
    document.getElementById('nav-profile').addEventListener('click', () => showPage('profile'));
    document.getElementById('nav-shop').addEventListener('click', () => showPage('shop'));
});





