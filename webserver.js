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

// NOUVEAU: Constantes pour les limites de Génération
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

// Route 5.1: Pokédex (MODIFIÉ pour inclure les stats de base, les Pokémon manquants et les limites de génération)
app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('pokemons');

        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }

        const capturedPokemons = user.pokemons || [];
        
        // 1. Map pour un accès rapide aux IDs capturés uniques
        const capturedPokedexIds = new Set(capturedPokemons.map(p => p.pokedexId));
        
        // 2. Collecter les IDs uniques pour les stats
        const uniquePokedexIds = [...capturedPokedexIds];
        
        // 3. Fetcher les stats en parallèle
        const statsPromises = uniquePokedexIds.map(id => fetchPokemonBaseStats(id));
        const allStats = await Promise.all(statsPromises);
        
        // 4. Créer une map PokedexId -> Stats
        const statsMap = uniquePokedexIds.reduce((map, id, index) => {
            map[id] = allStats[index];
            return map;
        }, {});
        
        // 5. Enrichir chaque Pokémon capturé avec ses stats
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
        const fullPokedexMap = new Map();

        // Remplir la Map avec tous les IDs (1 à 251) comme manquants par défaut
        for (let id = 1; id <= MAX_POKEDEX_ID_GEN_2; id++) {
            fullPokedexMap.set(id, {
                pokedexId: id,
                name: `[${id.toString().padStart(3, '0')}] Inconnu`, 
                isCaptured: false,
                // Minimal properties for consistency
                baseStats: [], level: 0, isShiny: false, 
                iv_hp: 0, iv_attack: 0, iv_defense: 0, 
                iv_special_attack: 0, iv_special_defense: 0, iv_speed: 0,
            });
        }
        
        // Remplacer les "manquants" par les Pokémon capturés s'ils existent (un par ID unique)
        const uniqueCapturedPokemons = new Map();
        enrichedCapturedPokedex.forEach(pokemon => {
             // S'assurer qu'on ne garde qu'une entrée par pokedexId (le dernier capturé, ou n'importe lequel)
            uniqueCapturedPokemons.set(pokemon.pokedexId, pokemon); 
        });

        uniqueCapturedPokemons.forEach((pokemon, pokedexId) => {
            fullPokedexMap.set(pokedexId, {
                ...pokemon,
                isCaptured: true // S'assurer que le drapeau est correct
            });
        });

        // Transformer la Map en tableau et la trier (normalement déjà triée)
        const fullPokedexList = Array.from(fullPokedexMap.values()).sort((a, b) => a.pokedexId - b.pokedexId);


        // 6. Envoi de l'objet STRUCTURÉ
        res.json({
            fullPokedex: fullPokedexList, // La liste complète triée
            uniquePokedexCount: capturedPokedexIds.size,
            maxPokedexId: MAX_POKEDEX_ID_GEN_2, // La limite du Pokédex
            maxGen1Id: MAX_POKEDEX_ID_GEN_1 // NOUVEAU: Limite Gen 1
        });

    } catch (error) {
        console.error('Erreur API Pokédex:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});


// Route 5.2: Profil (MODIFIÉ pour inclure la limite max)
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
            maxPokedexId: MAX_POKEDEX_ID_GEN_2 // NOUVEAU: Limite max
        });
    } catch (error) {
        console.error('Erreur API Profil:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Route 5.3: Boutique (GET) 
app.get('/api/shop', (req, res) => {
    res.json(SHOP_ITEMS);
});


// Route 5.4: Achat (POST) 
app.post('/api/shop/buy', async (req, res) => {
    const { userId, itemKey, quantity } = req.body;
    const item = SHOP_ITEMS[itemKey];

    if (!userId || !item || !quantity || quantity < 1) {
        return res.status(400).json({ success: false, message: "Requête invalide." });
    }

    const totalCost = item.cost * quantity;
    
    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }

        if (user.money < totalCost) {
            return res.status(400).json({ success: false, message: `Fonds insuffisants. Il vous manque ${totalCost - user.money} 💰.` });
        }
        
        const update = {
            $inc: { 
                money: -totalCost,
                [`${item.key}`]: quantity
            }
        };

        let bonusMessage = '';
        if (item.promo && itemKey === 'pokeball' && quantity >= 10) {
            const bonusCount = Math.floor(quantity / 10);
            for (let i = 0; i < bonusCount; i++) {
                const bonusBall = getRandomBonusBall();
                update.$inc[`${bonusBall.key}`] = (update.$inc[`${bonusBall.key}`] || 0) + 1;
                bonusMessage += ` +1 ${bonusBall.name}`;
            }
        }
        
        await User.updateOne({ userId }, update);

        res.json({
            success: true,
            message: `${quantity.toLocaleString()} ${item.name}(s) achetée(s) pour ${totalCost.toLocaleString()} 💰.` + (bonusMessage ? ` BONUS: ${bonusMessage.trim()}` : ''),
            newMoney: user.money - totalCost
        });

    } catch (error) {
        console.error('Erreur API Achat Boutique:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});


// Route 5.5: Vendre un Pokémon (POST) ---
app.post('/api/sell/pokemon', async (req, res) => {
    const { userId, pokemonIdToSell } = req.body;

    if (!userId || !pokemonIdToSell) {
        return res.status(400).json({ success: false, message: "ID Dresseur et ID Pokémon requis." });
    }

    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }
        
        // Convertir l'ID pour la comparaison (Mongoose ObjectID vs String)
        const pokemonIndex = user.pokemons.findIndex(p => p._id.toString() === pokemonIdToSell);

        if (pokemonIndex === -1) {
            return res.status(404).json({ success: false, message: "Pokémon non trouvé dans votre collection." });
        }

        const pokemonToSell = user.pokemons[pokemonIndex];
        
        // Calcul du prix (basé sur le frontend)
        const basePrice = 50; 
        const levelBonus = (pokemonToSell.level || 1) * 5; 
        const shinyBonus = pokemonToSell.isShiny ? 200 : 0; 
        
        const salePrice = basePrice + levelBonus + shinyBonus;

        // Vérification du compagnon
        if (user.companionPokemonId && user.companionPokemonId.toString() === pokemonIdToSell) {
             return res.status(403).json({ success: false, message: `Vous ne pouvez pas vendre votre Compagnon (${pokemonToSell.name}). Retirez-le avec !removecompanion d'abord.` });
        }

        // Transaction
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

// Route 5.6: Définir le Compagnon (POST)
app.post('/api/companion/set', async (req, res) => {
    const { userId, pokemonId } = req.body;
    
    if (!userId || !pokemonId) {
        return res.status(400).json({ success: false, message: "ID Dresseur et ID Pokémon requis." });
    }

    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }
        
        const pokemonExists = user.pokemons.some(p => p._id.toString() === pokemonId);

        if (!pokemonExists) {
             return res.status(404).json({ success: false, message: "Ce Pokémon n'est pas dans votre collection." });
        }
        
        user.companionPokemonId = pokemonId;
        await user.save();

        res.json({
            success: true,
            message: `Nouveau compagnon défini !`,
            companionId: pokemonId
        });

    } catch (error) {
        console.error('Erreur API Set Compagnon:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});


// --- 6. DÉMARRAGE DU SERVEUR ---

app.listen(PORT, () => {
    console.log(`🌍 Serveur web démarré sur le port ${PORT}`);
});
