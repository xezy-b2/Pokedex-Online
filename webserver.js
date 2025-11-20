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

// NOUVEAU: CONSTANTES POUR LES GÉNÉRATIONS
const MAX_POKEDEX_ID_GEN_1 = 151; 
const MAX_POKEDEX_ID_GEN_2 = 251; // Limite pour la Génération 2

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
// --- FIN POKEAPI ---

// --- 1. DÉFINITION DE LA BOUTIQUE (POUR L'API) ---
const POKEBALL_COST = 100;
const GREATBALL_COST = 300;
const ULTRABALL_COST = 800;
const MASTERBALL_COST = 15000; 
const SAFARIBALL_COST = 500;
const PREMIERBALL_COST = 150;
const LUXURYBALL_COST = 1000;

const SHOP_ITEMS = {
    'pokeball': { key: 'pokeballs', name: 'Poké Ball', cost: POKEBALL_COST, promo: true, imageFragment: 'poke-ball.png', desc: `Coût unitaire: ${POKEBALL_COST} BotCoins. Promotion: +1 ball spéciale par 10 achetées!` },
    'greatball': { key: 'greatballs', name: 'Super Ball', cost: GREATBALL_COST, promo: false, imageFragment: 'great-ball.png', desc: `Coût: ${GREATBALL_COST} BotCoins. (1.5x Taux de capture)` },
    'ultraball': { key: 'ultraballs', name: 'Hyper Ball', cost: ULTRABALL_COST, promo: false, imageFragment: 'ultra-ball.png', desc: `Coût: ${ULTRABALL_COST} BotCoins. (2.0x Taux de capture)` },
    'masterball': { key: 'masterballs', name: 'Master Ball', cost: MASTERBALL_COST, promo: false, imageFragment: 'master-ball.png', desc: `Coût: ${MASTERBALL_COST} BotCoins. (Capture Assurée!)` },
    'safariball': { key: 'safariballs', name: 'Safari Ball', cost: SAFARIBALL_COST, promo: false, imageFragment: 'safari-ball.png', desc: `Coût: ${SAFARIBALL_COST} BotCoins.` },
    'premierball': { key: 'premierballs', name: 'Honor Ball', cost: PREMIERBALL_COST, promo: false, imageFragment: 'premier-ball.png', desc: `Coût: ${PREMIERBALL_COST} BotCoins.` },
    'luxuryball': { key: 'luxuryballs', name: 'Luxe Ball', cost: LUXURYBALL_COST, promo: false, imageFragment: 'luxury-ball.png', desc: `Coût: ${LUXURYBALL_COST} BotCoins.` },
};

const BONUS_BALLS = [
    { key: 'greatballs', name: 'Super Ball' }, { key: 'ultraballs', name: 'Hyper Ball' }, 
    { key: 'masterballs', name: 'Master Ball' }, { key: 'safariballs', name: 'Safari Ball' }, 
    { key: 'premierballs', name: 'Honor Ball' }, { key: 'luxuryballs', name: 'Luxe Ball' },
];

function getRandomBonusBall() {
    const randomIndex = Math.floor(Math.random() * BONUS_BALLS.length);
    return BONUS_BALLS[randomIndex];
}

// --- SECRETS & URLS ---
const mongoUri = process.env.MONGO_URI; 
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = 'https://pokedex-online-pxmg.onrender.com/api/auth/discord/callback'; 

const RENDER_API_PUBLIC_URL = 'https://pokedex-online-pxmg.onrender.com';
const GITHUB_PAGES_URL = 'https://xezy-b2.github.io/Pokedex-Online'; 


// --- 2. CONFIGURATION EXPRESS & CORS ---
const corsOptions = {
    origin: [RENDER_API_PUBLIC_URL, GITHUB_PAGES_URL, 'https://xezy-b2.github.io'], 
    methods: 'GET, POST, OPTIONS', 
    allowedHeaders: ['Content-Type'], 
    credentials: true, 
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 
app.use(express.json()); 


// --- 3. CONNEXION MONGODB ---
if (!mongoUri) {
    console.error('❌ FATAL: La variable d\'environnement MONGO_URI n\'est pas définie.');
    if (process.env.NODE_ENV === 'production') process.exit(1); 
}

mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connecté à la base de données MongoDB pour le site web !'))
    .catch(err => {
        console.error('❌ Erreur de connexion MongoDB :', err);
        if (process.env.NODE_ENV === 'production') process.exit(1);
    });


// --- 4. ROUTES AUTHENTIFICATION ---

app.get('/api/auth/discord/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        return res.redirect(GITHUB_PAGES_URL); 
    }

    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
        console.error("Secrets Discord non définis.");
        return res.status(500).send("Erreur de configuration OAuth.");
    }

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: DISCORD_REDIRECT_URI,
            scope: 'identify' 
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const discordUser = userResponse.data;
        
        await User.findOneAndUpdate(
            { userId: discordUser.id },
            { $set: { username: discordUser.username } },
            { upsert: true, new: true } 
        );

        const redirectUrl = `${GITHUB_PAGES_URL}?discordId=${discordUser.id}&username=${encodeURIComponent(discordUser.username)}`;
        res.redirect(redirectUrl); 

    } catch (error) {
        console.error('Erreur lors de l\'échange OAuth2:', error.response?.data || error.message);
        res.status(500).send('Échec de la connexion Discord.');
    }
});


// --- 5. ROUTES API (POKÉDEX, PROFIL, SHOP) ---

// Route 5.1: Pokédex (MODIFIÉ pour inclure les stats de base et les Pokémon manquants)
app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('pokemons');

        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }

        const capturedPokemons = user.pokemons || [];
        
        // Map pour un accès rapide aux IDs capturés uniques
        const capturedPokedexIds = new Set(capturedPokemons.map(p => p.pokedexId));
        
        // 1. Collecter les IDs uniques pour les stats
        const uniquePokedexIds = [...capturedPokedexIds];
        
        // 2. Fetcher les stats en parallèle
        const statsPromises = uniquePokedexIds.map(id => fetchPokemonBaseStats(id));
        const allStats = await Promise.all(statsPromises);
        
        // 3. Créer une map PokedexId -> Stats
        const statsMap = uniquePokedexIds.reduce((map, id, index) => {
            map[id] = allStats[index];
            return map;
        }, {});
        
        // 4. Enrichir chaque Pokémon capturé avec ses stats
        const enrichedCapturedPokedex = capturedPokemons.map(pokemon => {
            const stats = statsMap[pokemon.pokedexId] || [];
            // Assurez-vous d'utiliser toObject() si ce n'est pas déjà un objet simple
            const enrichedPokemon = pokemon.toObject ? pokemon.toObject() : pokemon;
            
            return {
                ...enrichedPokemon,
                baseStats: stats // AJOUT DES STATS ICI
            };
        });

        // --- NOUVEAU: Génération de la liste complète (Capturés + Manquants) ---
        const fullPokedexList = [];
        const uniqueCaughtPokedexIds = new Set();
        
        // 1. Ajouter d'abord les Pokémon Capturés
        enrichedCapturedPokedex.forEach(pokemon => {
            fullPokedexList.push(pokemon);
            uniqueCaughtPokedexIds.add(pokemon.pokedexId);
        });
        
        // 2. Ajouter les Pokémon Manquants (de 1 à MAX_POKEDEX_ID_GEN_2)
        for (let id = 1; id <= MAX_POKEDEX_ID_GEN_2; id++) {
            // Si l'ID n'est pas dans la liste des IDs uniques capturés, on l'ajoute comme manquant.
            if (!uniqueCaughtPokedexIds.has(id)) {
                fullPokedexList.push({
                    pokedexId: id,
                    name: `[${id.toString().padStart(3, '0')}] Inconnu`, // Nom temporaire (sera écrasé côté client)
                    isCaptured: false,
                    // Ajout des propriétés minimales pour éviter les erreurs côté client
                    baseStats: [],
                    level: 0,
                    isShiny: false,
                    // IVs pour uniformité
                    iv_hp: 0, 
                    iv_attack: 0, 
                    iv_defense: 0, 
                    iv_special_attack: 0, 
                    iv_special_defense: 0, 
                    iv_speed: 0,
                });
            }
        }
        
        // 3. Trier la liste complète par pokedexId (important pour le client)
        fullPokedexList.sort((a, b) => a.pokedexId - b.pokedexId);


        // 5. Envoi de l'objet STRUCTURÉ
        res.json({
            fullPokedex: fullPokedexList, // La liste complète triée
            uniquePokedexCount: capturedPokedexIds.size,
            maxPokedexId: MAX_POKEDEX_ID_GEN_2, // La limite du Pokédex
        });

    } catch (error) {
        console.error('Erreur API Pokédex:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});


// Route 5.2: Profil 
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        const user = await User.findOne({ userId: userId }).select('-__v'); 
        
        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }
        
        let companionPokemon = null;
        if (user.companionPokemonId && user.pokemons) {
            const companionIdString = user.companionPokemonId.toString();
            companionPokemon = user.pokemons.find(p => p._id.toString() === companionIdString);
        }

        const totalPokemons = await User.aggregate([
            { $match: { userId: userId } },
            { $project: { 
                totalCount: { $size: "$pokemons" },
                uniqueCount: { $size: { $setUnion: ["$pokemons.pokedexId", []] } }
            }}
        ]);
        
        const stats = {
            totalCaptures: totalPokemons[0]?.totalCount || 0,
            uniqueCaptures: totalPokemons[0]?.uniqueCount || 0
        };

        const userObject = user.toObject();
        delete userObject.pokemons; 
        delete userObject.companionPokemonId; 

        res.json({
            ...userObject,
            stats: stats,
            companionPokemon: companionPokemon,
            // NOUVEAU: Ajout de la limite max pour le Pokédex
            maxPokedexId: MAX_POKEDEX_ID_GEN_2 
        });
    } catch (error) {
        console.error('Erreur API Profil:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Route 5.3: Boutique (GET) 
// ... (reste du code inchangé)

// Route 5.4: Achat (POST) 
// ... (reste du code inchangé)

// Route 5.5: Vendre un Pokémon (POST) ---
// ... (reste du code inchangé)

// --- 6. DÉMARRAGE DU SERVEUR ---

app.listen(PORT, () => {
    console.log(`🌍 Serveur web démarré sur le port ${PORT}`);
});
