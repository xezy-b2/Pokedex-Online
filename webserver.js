// webserver.js (FICHIER COMPLET MODIFIÉ)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const axios = require('axios'); 
const User = require('./models/User.js'); // Assurez-vous que ce chemin est correct

const app = express();
const PORT = process.env.PORT || 3000; 

// --- 0. CONFIGURATION ET MIDDLEWARES ---
app.use(cors());
app.use(express.json()); // pour parser les requêtes JSON

// --- 0. CONSTANTES ET CACHE POUR POKEAPI ---
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/pokemon/';
const MAX_POKEDEX_ID = 151; // Utiliser la limite que vous souhaitez (ex: 1025 pour tous les Pokémon existants)
const statsCache = {}; // Cache simple pour éviter les appels API redondants

async function fetchPokemonBaseStats(pokedexId) {
    if (statsCache[pokedexId]) {
        return statsCache[pokedexId];
    }
    
    try {
        const response = await axios.get(`${POKEAPI_BASE_URL}${pokedexId}`);
        const data = response.data;
        
        // Ne garder que le nom et la base_stat (PV, Attaque, Défense, etc.)
        const baseStats = data.stats.map(statEntry => ({
            name: statEntry.stat.name,
            base_stat: statEntry.base_stat
        }));
        
        // Mettre en cache le résultat
        statsCache[pokedexId] = baseStats;
        return baseStats;
    } catch (error) {
        console.error(`Erreur de récupération des stats pour Pokedex ID ${pokedexId}:`, error.message);
        return []; // Retourne un tableau vide en cas d'erreur
    }
}

/**
 * Génère un Pokémon aléatoire avec des statistiques de base.
 */
async function generateRandomPokemon() {
    const pokedexId = Math.floor(Math.random() * MAX_POKEDEX_ID) + 1; // ID de 1 à MAX
    const level = Math.floor(Math.random() * 99) + 1; // Niveau de 1 à 100
    // Une chance sur 100 pour la démonstration (ajustez selon votre taux)
    const SHINY_RATE = 1 / 100; 
    const isShiny = Math.random() < SHINY_RATE; 

    // 1. Récupérer le nom (nécessite une requête)
    const pokeDataResponse = await axios.get(`${POKEAPI_BASE_URL}${pokedexId}`);
    const pokemonName = pokeDataResponse.data.name;

    // 2. Générer les IVs aléatoires (de 0 à 31)
    const generateIV = () => Math.floor(Math.random() * 32);
    
    const newPokemon = {
        pokedexId: pokedexId,
        name: pokemonName.charAt(0).toUpperCase() + pokemonName.slice(1), // Capitalize
        level: level,
        isShiny: isShiny,
        ivs: {
            hp: generateIV(),
            attack: generateIV(),
            defense: generateIV(),
            'special-attack': generateIV(),
            'special-defense': generateIV(),
            speed: generateIV(),
        },
        // Ajoutez ici tout autre champ que votre schéma `pokemons` requiert (ex: nature, moves)
    };

    return newPokemon;
}


// --- 1. CONNEXION MONGODB ---
// Remplacez par votre URI de connexion
const DB_URI = process.env.DB_URI || 'mongodb://localhost:27017/pokedex-discord'; 

mongoose.connect(DB_URI)
    .then(() => console.log('Connecté à MongoDB'))
    .catch(err => console.error('Erreur de connexion MongoDB:', err));


// --- 2. ROUTES API ---

// Route 2.1: Récupération des données utilisateur et de la liste des Pokémon
app.get('/api/user/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
        
        // Récupérer les stats de base pour tous les Pokémon
        const pokemonsWithStats = await Promise.all(user.pokemons.map(async p => {
            // Utiliser le .toObject() si le pokémon est un sous-document Mongoose
            const pokeObj = p.toObject ? p.toObject() : p; 
            const baseStats = await fetchPokemonBaseStats(p.pokedexId);
            return { ...pokeObj, baseStats };
        }));

        res.json({
            ...user.toObject(),
            pokemons: pokemonsWithStats,
        });

    } catch (error) {
        console.error('Erreur API user:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Route 2.2: Vente d'un Pokémon
app.post('/api/sell/pokemon', async (req, res) => {
    const { userId, pokemonIdToSell } = req.body; 

    if (!userId || !pokemonIdToSell) {
        return res.status(400).json({ success: false, message: "Données manquantes (userId ou pokemonIdToSell)." });
    }

    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }
        
        const pokemonIndex = user.pokemons.findIndex(p => p._id.toString() === pokemonIdToSell);

        if (pokemonIndex === -1) {
            return res.status(404).json({ success: false, message: "Pokémon non trouvé dans votre collection." });
        }

        const pokemonToSell = user.pokemons[pokemonIndex];
        
        // Logique de calcul du prix
        const basePrice = 50; 
        const levelBonus = (pokemonToSell.level || 1) * 5; 
        const shinyBonus = pokemonToSell.isShiny ? 200 : 0; 
        
        const salePrice = basePrice + levelBonus + shinyBonus;

        if (user.companionPokemonId && user.companionPokemonId.toString() === pokemonIdToSell) {
             return res.status(403).json({ success: false, message: `Vous ne pouvez pas vendre votre Compagnon (${pokemonToSell.name}). Retirez-le avec !removecompanion d'abord.` });
        }

        // 1. Ajouter l'argent
        user.money += salePrice;
        
        // 2. Retirer le Pokémon
        user.pokemons.splice(pokemonIndex, 1); 

        await user.save();
        
        res.json({ 
            success: true, 
            message: `Vente réussie : ${pokemonToSell.name} (Niv.${pokemonToSell.level || 1}) vendu pour ${salePrice.toLocaleString()} 💰!`,
            newMoney: user.money
        });

    } catch (error) {
        console.error('Erreur API Vente Pokémon:', error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur lors de la vente." });
    }
});

// --- Route 2.3: Échange Miracle (POST) ---
app.post('/api/trade/wonder', async (req, res) => {
    const { userId, pokemonIdToTrade } = req.body; 

    if (!userId || !pokemonIdToTrade) {
        return res.status(400).json({ success: false, message: "Données manquantes (userId ou pokemonIdToTrade)." });
    }
    
    // Coût de l'échange (doit correspondre au frontend)
    const TRADE_COST = 50; 

    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }

        // 1. Vérification de l'argent
        if (user.money < TRADE_COST) {
             return res.status(403).json({ success: false, message: `L'échange miracle coûte ${TRADE_COST} 💰. Vous n'avez que ${user.money} 💰.` });
        }
        
        // 2. Trouver et vérifier le Pokémon à échanger
        const pokemonIndex = user.pokemons.findIndex(p => p._id.toString() === pokemonIdToTrade);

        if (pokemonIndex === -1) {
            return res.status(404).json({ success: false, message: "Pokémon non trouvé dans votre collection." });
        }

        const pokemonToTrade = user.pokemons[pokemonIndex];

        if (user.companionPokemonId && user.companionPokemonId.toString() === pokemonIdToTrade) {
             return res.status(403).json({ success: false, message: `Vous ne pouvez pas échanger votre Compagnon (${pokemonToTrade.name}).` });
        }

        // 3. Déduire la taxe et retirer le Pokémon
        user.money -= TRADE_COST;
        user.pokemons.splice(pokemonIndex, 1);
        
        // 4. Générer le nouveau Pokémon aléatoire
        const receivedPokemon = await generateRandomPokemon();
        
        // 5. Ajouter le nouveau Pokémon à la collection de l'utilisateur
        user.pokemons.push(receivedPokemon);

        await user.save();
        
        const newPokemonName = receivedPokemon.isShiny ? `✨ ${receivedPokemon.name}` : receivedPokemon.name;
        
        res.json({ 
            success: true, 
            message: `Échange miracle réussi ! Vous avez reçu ${newPokemonName} (Niv.${receivedPokemon.level || 1}) en échange de ${pokemonToTrade.name}.`,
            newMoney: user.money
        });

    } catch (error) {
        console.error('Erreur API Échange Miracle (Simplifié):', error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur lors de l'échange." });
    }
});


// --- 3. DÉMARRAGE DU SERVEUR ---
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
