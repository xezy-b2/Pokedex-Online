// public/script.js (Mise à jour pour l'appel depuis GitHub Pages)

// NOUVELLE URL DE BASE (pour accéder aux sprites, y compris shiny)
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
        // CORRECTION MAJEURE : Appel direct à localhost:3000
        const response = await fetch(`http://localhost:3000/api/pokedex/${userId}`); 
        const data = await response.json();

        if (!response.ok) {
            // Utilisation de la variable CSS pour l'erreur
            container.innerHTML = `<p style="color: var(--red-discord);">Erreur: ${data.message || 'Impossible de charger les données.'}</p>`;
            return;
        }

        const fullPokedex = data.fullPokedex;
        
        let html = `<h2>Pokédex de ${data.username}</h2>`;
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
        container.innerHTML = '<p style="color: var(--red-discord);">Une erreur s\'est produite lors de la communication avec le serveur (API). Vérifiez que `node webserver.js` est lancé !</p>';
    }
}
