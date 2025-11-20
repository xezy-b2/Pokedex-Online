// webserver.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const axios = require('axios'); 
const User = require('./models/User.js'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// --- 0. CONSTANTES ET CACHE POUR POKEAPI ---
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/pokemon/';
const statsCache = {}; // Cache simple pour éviter les appels API redondants

// NOUVEAU : CONSTANTES POUR LES GÉNÉRATIONS
const MAX_POKEDEX_ID_GEN_2 = 251; // Pokémon #001 (Bulbizarre) à #251 (Célébi)

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
        return [];
    }
}

// 1. Connexion à la base de données MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connecté à MongoDB'))
    .catch(err => console.error('Erreur de connexion à MongoDB:', err));

// 2. Middleware
app.use(cors()); 
app.use(express.json()); 
app.use(express.static('public')); // Pour servir les fichiers statiques (index.html, script.js, style.css)

// 3. Route de base
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// 4. Route d'authentification (simulée)
app.post('/api/auth', async (req, res) => {
    const { userId, username } = req.body;

    if (!userId || !username) {
        return res.status(400).json({ message: "ID Discord et Nom d'utilisateur requis." });
    }

    try {
        // Recherche ou création de l'utilisateur
        let user = await User.findOne({ userId: userId });
        if (!user) {
            user = new User({ userId, username, money: 500, pokemons: [], items: {} });
            await user.save();
        }

        // On s'assure que le username est à jour
        if (user.username !== username) {
            user.username = username;
            await user.save();
        }

        res.json({ message: "Authentification réussie.", userId: user.userId, username: user.username });
    } catch (error) {
        console.error('Erreur API Authentification:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Route 5.1: Pokédex (MODIFIÉ pour inclure la liste complète des IDs)
app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('pokemons');

        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }

        const fullPokedex = user.pokemons || [];
        
        // 1. Récupérer les stats de base pour tous les IDs de Pokémon uniques dans la collection
        const uniquePokedexIds = [...new Set(fullPokedex.map(p => p.pokedexId))];
        const statsPromises = uniquePokedexIds.map(id => fetchPokemonBaseStats(id));
        const statsResults = await Promise.all(statsPromises);

        const statsMap = new Map();
        uniquePokedexIds.forEach((id, index) => {
            statsMap.set(id, statsResults[index]);
        });

        // 2. Enrichir chaque Pokémon avec ses Base Stats
        const enrichedPokedex = fullPokedex.map(pokemon => ({
            ...pokemon.toObject(),
            baseStats: statsMap.get(pokemon.pokedexId) || []
        }));

        // 3. NOUVEAU : Créer la liste de tous les IDs de Pokémon jusqu'à la Gen 2
        const allGen2PokedexIds = Array.from({ length: MAX_POKEDEX_ID_GEN_2 }, (_, i) => i + 1);
        
        // 4. Envoi de l'objet STRUCTURÉ
        res.json({
            fullPokedex: enrichedPokedex, 
            uniquePokedexCount: uniquePokedexIds.length,
            allPokedexIds: allGen2PokedexIds, // NOUVEAU
        });

    } catch (error) {
        console.error('Erreur API Pokédex:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Route 5.2: Profil
app.get('/api/profile/:userId', async (req, res) => {
    // ... (Logique de la route de Profil - NON MODIFIÉE)
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('username money pokemons items companionPokemonId');

        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }
        
        let companion = null;
        if (user.companionPokemonId) {
            const companionPokemon = user.pokemons.find(p => p._id.toString() === user.companionPokemonId.toString());
            if (companionPokemon) {
                 const baseStats = await fetchPokemonBaseStats(companionPokemon.pokedexId);
                 companion = {
                    ...companionPokemon.toObject(),
                    baseStats: baseStats || []
                 };
            }
        }

        res.json({
            username: user.username,
            money: user.money,
            totalCaptures: user.pokemons.length,
            uniqueCaptures: new Set(user.pokemons.map(p => p.pokedexId)).size,
            companion: companion,
            items: user.items || {}
        });

    } catch (error) {
        console.error('Erreur API Profil:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Route 6: Vente d'un Pokémon
app.post('/api/sell/pokemon', async (req, res) => {
    // ... (Logique de la route de Vente - NON MODIFIÉE)
    const { userId, pokemonIdToSell } = req.body;

    if (!userId || !pokemonIdToSell) {
        return res.status(400).json({ success: false, message: "ID utilisateur et ID Pokémon requis." });
    }

    try {
        const user = await User.findOne({ userId: userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }

        const pokemonIndex = user.pokemons.findIndex(p => p._id.toString() === pokemonIdToSell);

        if (pokemonIndex === -1) {
            return res.status(404).json({ success: false, message: "Pokémon non trouvé dans votre collection." });
        }

        const pokemonToSell = user.pokemons[pokemonIndex];
        
        const basePrice = 50; 
        const levelBonus = (pokemonToSell.level || 1) * 5; 
        const shinyBonus = pokemonToSell.isShiny ? 200 : 0; 
        
        const salePrice = basePrice + levelBonus + shinyBonus;

        if (user.companionPokemonId && user.companionPokemonId.toString() === pokemonIdToSell) {
             return res.status(403).json({ success: false, message: `Vous ne pouvez pas vendre votre Compagnon (${pokemonToSell.name}). Retirez-le avec !removecompanion d'abord.` });
        }

        user.money += salePrice;
        user.pokemons.splice(pokemonIndex, 1); 

        await user.save();
        
        res.json({ 
            success: true, 
            message: `Vente réussie : ${pokemonToSell.name} (Niv.${pokemonToSell.level || 1}) vendu pour ${salePrice.toLocaleString()} 💰!`,
            newMoney: user.money
        });

    } catch (error) {
        console.error('Erreur API Vente Pokémon:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});


// Route 7: Boutique (Achats)
app.post('/api/shop/buy', async (req, res) => {
    // ... (Logique de la route d'Achat - NON MODIFIÉE)
    const { userId, item, quantity } = req.body;
    
    if (!userId || !item || !quantity || quantity <= 0) {
        return res.status(400).json({ success: false, message: "Données d'achat invalides." });
    }

    const shopItems = {
        'Poké Ball': { price: 100 },
        'Great Ball': { price: 250 },
        'Ultra Ball': { price: 500 }
    };

    const itemData = shopItems[item];
    if (!itemData) {
        return res.status(404).json({ success: false, message: "Objet non disponible à la vente." });
    }

    try {
        const user = await User.findOne({ userId: userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }
        
        const totalCost = itemData.price * quantity;

        if (user.money < totalCost) {
            return res.status(403).json({ success: false, message: "Fonds insuffisants." });
        }

        user.money -= totalCost;
        user.items[item] = (user.items[item] || 0) + quantity;

        await user.save();
        
        res.json({ 
            success: true, 
            message: `${quantity} ${item}(s) acheté(s) pour ${totalCost.toLocaleString()} 💰.`,
            newMoney: user.money
        });

    } catch (error) {
        console.error('Erreur API Achat:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});

// Route 8: Définir le Compagnon
app.post('/api/companion/set', async (req, res) => {
    // ... (Logique de la route de Compagnon - NON MODIFIÉE)
    const { userId, pokemonId } = req.body;

    if (!userId || !pokemonId) {
        return res.status(400).json({ success: false, message: "ID utilisateur et ID Pokémon requis." });
    }

    try {
        const user = await User.findOne({ userId: userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }

        const pokemon = user.pokemons.find(p => p._id.toString() === pokemonId);

        if (!pokemon) {
            return res.status(404).json({ success: false, message: "Pokémon non trouvé dans votre collection." });
        }

        user.companionPokemonId = pokemon._id;
        await user.save();

        res.json({ 
            success: true, 
            message: `${pokemon.name} est maintenant votre Pokémon Compagnon !`,
            companionId: pokemon._id
        });

    } catch (error) {
        console.error('Erreur API Set Compagnon:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});


// 9. Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
