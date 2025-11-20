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
const MAX_POKEDEX_ID_GEN_1 = 151; // Ajouté pour référence
const MAX_POKEDEX_ID_GEN_2 = 251; 

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

// 2. Middleware (CORRECTION CORS)
app.use(cors({
    origin: '*', // CORRECTION: Permet explicitement toutes les origines pour éviter le blocage par le navigateur
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
})); 
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

// Route 5.1: Pokédex (CORRECTION 500)
app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        // CORRECTION 500: Ajout de .lean() pour récupérer des objets JS simples et éviter les erreurs de Mongoose lors du spread
        const user = await User.findOne({ userId: userId }).select('pokemons').lean(); 

        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }

        // fullPokedex est maintenant un tableau d'objets JS simples
        const fullPokedex = user.pokemons || [];
        
        // 1. Récupérer les stats de base pour tous les IDs de Pokémon uniques dans la collection
        const uniquePokedexIds = [...new Set(fullPokedex.map(p => p.pokedexId))];
        const statsPromises = uniquePokedexIds.map(id => fetchPokemonBaseStats(id));
        const statsResults = await Promise.all(statsPromises);

        const statsMap = new Map();
        uniquePokedexIds.forEach((id, index) => {
            statsMap.set(id, statsResults[index]);
        });

        // 2. Enrichir chaque Pokémon avec ses Base Stats (pas besoin de .toObject() grâce à .lean())
        const enrichedPokedex = fullPokedex.map(pokemon => ({
            ...pokemon, 
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
    try {
        // CORRECTION 500: Ajout de .lean() également ici pour la même raison
        const userId = req.params.params.userId;
        const user = await User.findOne({ userId: userId }).select('username money pokemons items companionPokemonId').lean(); 

        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }
        
        let companion = null;
        if (user.companionPokemonId) {
            // fullPokedex est maintenant une collection d'objets simples
            const companionPokemon = user.pokemons.find(p => p._id.toString() === user.companionPokemonId.toString());
            if (companionPokemon) {
                 const baseStats = await fetchPokemonBaseStats(companionPokemon.pokedexId);
                 companion = {
                    ...companionPokemon, // Pas besoin de .toObject()
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
    // ... (Gardez le reste du code non modifié)
});

// Route 7: Boutique (Achats)
app.post('/api/shop/buy', async (req, res) => {
    // ... (Gardez le reste du code non modifié)
});

// Route 8: Définir le Compagnon
app.post('/api/companion/set', async (req, res) => {
    // ... (Gardez le reste du code non modifié)
});


// 9. Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
