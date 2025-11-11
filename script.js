// public/script.js

// NOUVELLE URL DE BASE (pour accéder aux sprites, y compris shiny)
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
// Note: On utilise les sprites classiques car l'official-artwork n'a pas de version shiny pour tous.


/**
 * Génère le HTML pour une carte de Pokédex (espèce unique).
 * On utilise les données de la première capture de cette espèce pour déterminer l'URL de l'image.
 * @param {Object} uniquePokemonData - L'objet Pokémon regroupé pour cette espèce (contient .pokedexId et .isShinyFirstCapture).
 * @param {number} count - Nombre total de cette espèce capturée.
 * @param {boolean} isCaptured - Vrai si l'utilisateur a capturé au moins un spécimen.
 */
function createPokedexCard(uniquePokemonData, count, isCaptured) {
    const isShiny = uniquePokemonData.isShinyFirstCapture || false; // Détermine si on doit afficher le sprite shiny
    const pokedexId = uniquePokemonData.pokedexId;
    const name = uniquePokemonData.name;
    
    // Construction de l'URL du sprite (ajoute 'shiny/' si c'est la première capture est shiny)
    let imageUrl = POKEAPI_SPRITE_URL;
    if (isShiny) {
        imageUrl += 'shiny/';
    }
    imageUrl += `${pokedexId}.png`;
    
    // Si non capturé, l'image est un placeholder ou la version normale en gris
    const finalImageUrl = isCaptured ? imageUrl : `${POKEAPI_SPRITE_URL}${pokedexId}.png`;
    
    // Applique le filtre de gris si l'espèce n'a jamais été capturée
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
        const response = await fetch(`/api/pokedex/${userId}`); 
        const data = await response.json();

        if (!response.ok) {
            container.innerHTML = `<p style="color: var(--red-discord);">${data.message || 'Impossible de charger les données.'}</p>`;
            return;
        }

        const fullPokedex = data.fullPokedex;
        
        let html = `<h2>Pokédex de ${data.username}</h2>`;
        html += `<p>Espèces Uniques Capturées: **${data.uniquePokedexCount}** / 151</p>`;
        
        // 1. Regrouper les Pokémons par ID
        const pokedexMap = new Map();
        fullPokedex.forEach(p => {
            const id = p.pokedexId;
            
            if (!pokedexMap.has(id)) {
                // Première capture de cette espèce
                pokedexMap.set(id, {
                    ...p,
                    count: 1,
                    // Marque si la première capture est shiny (pour l'affichage sur la carte)
                    isShinyFirstCapture: p.isShiny, 
                    isCaptured: true
                });
            } else {
                pokedexMap.get(id).count++;
                // Met à jour la marque si une nouvelle capture est shiny et que la carte ne l'est pas encore.
                if (p.isShiny && !pokedexMap.get(id).isShinyFirstCapture) {
                    pokedexMap.get(id).isShinyFirstCapture = true;
                }
            }
        });

        const maxId = 151; 
        let pokedexGridHtml = '<div class="pokedex-grid">';
        
        for (let i = 1; i <= maxId; i++) { // Boucle de 1 à 151 pour un Pokédex complet
            
            const pokemonData = pokedexMap.get(i);
            
            if (pokemonData) {
                // Espèce capturée (avec ou sans shiny si trouvé)
                pokedexGridHtml += createPokedexCard(pokemonData, pokemonData.count, true);
            } else {
                // Espèce manquante (on utilise un nom générique)
                // C'est un point faible : on n'a pas les noms des 151 Pokémons sans faire une requête API supplémentaire
                pokedexGridHtml += createPokedexCard({ pokedexId: i, name: `N°${i}` }, 0, false);
            }
        }
        
        pokedexGridHtml += '</div>';

        container.innerHTML = html + pokedexGridHtml;

    } catch (error) {
        console.error('Erreur lors de la récupération du Pokédex:', error);
        container.innerHTML = '<p style="color: var(--red-discord);">Une erreur s\'est produite lors de la communication avec le serveur (API). Vérifiez la console pour plus de détails.</p>';
    }
}