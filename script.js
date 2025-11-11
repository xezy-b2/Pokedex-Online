// public/script.js

// L'URL PUBLIQUE DE L'API RENDER (CORRIGÉ !)
const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 

// URL pour les sprites Pokémon
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';


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
 * Charge et affiche le Pokédex de l'utilisateur en appelant l'API.
 */
async function loadPokedex() {
    const userId = document.getElementById('discordIdInput').value.trim();
    const container = document.getElementById('pokedexContainer');
    container.innerHTML = 'Chargement...';

    if (!userId) {
        container.innerHTML = '<p style="color: red;">Veuillez entrer un ID Discord valide.</p>';
        return;
    }
    
    try {
        // APPEL FINAL UTILISANT L'URL PUBLIQUE DE RENDER
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${userId}`); 
        
        if (!response.ok) {
            try {
                const data = await response.json();
                container.innerHTML = `<p style="color: var(--red-discord);">Erreur API: ${data.message || 'Impossible de lire les données JSON.'}</p>`;
            } catch (jsonError) {
                container.innerHTML = '<p style="color: var(--red-discord);">Erreur de connexion : Le serveur API a répondu avec un statut non-OK ou est inaccessible. Vérifiez la console.</p>';
                console.error('Erreur API non-JSON ou statut non-OK:', response);
            }
            return;
        }

        const data = await response.json();
        const fullPokedex = data.fullPokedex;
        
        let html = `<h2>Pokédex de ${data.username}</h2>`;
        html += `<p>Espèces Uniques Capturées: **${data.uniquePokedexCount}** / 151</p>`;
        
        // --- LOGIQUE DE GRILLE ---
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
