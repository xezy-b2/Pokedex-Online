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
const MAX_POKEDEX_ID_GEN_3 = 386;
const MAX_POKEDEX_ID_GEN_4 = 493; // Sinnoh
const MAX_POKEDEX_ID_GEN_5 = 649; // Unys
const MAX_POKEDEX_ID_GEN_6 = 721; // Kalos

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

// Utility function for generating random numbers
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Génère un nouveau Pokémon aléatoire.
 * Il inclut un appel à PokeAPI pour récupérer le nom.
 * @returns {Object} Le nouvel objet Pokémon prêt à être inséré (avec nom).
 */
async function generateRandomPokemon() {
    // ID aléatoire (1 à MAX_POKEDEX_ID_GEN_2, qui est défini à 251)
    const pokedexId = getRandomInt(1, MAX_POKEDEX_ID_GEN_6); 
    
    // Niveau aléatoire entre 1 et 100
    const level = getRandomInt(1, 100);
    
    // IVs aléatoires entre 0 et 31
    const iv_hp = getRandomInt(0, 31);
    const iv_attack = getRandomInt(0, 31);
    const iv_defense = getRandomInt(0, 31);
    const iv_special_attack = getRandomInt(0, 31);
    const iv_special_defense = getRandomInt(0, 31);
    const iv_speed = getRandomInt(0, 31);
    
    // Taux de Shiny: 1/100 (ajustez si besoin)
    const isShiny = getRandomInt(1, 100) === 1; 

    let pokemonName = 'Inconnu';
    try {
        const nameResponse = await axios.get(`${POKEAPI_BASE_URL}${pokedexId}`);
        // Mettre la première lettre en majuscule
        pokemonName = nameResponse.data.name.charAt(0).toUpperCase() + nameResponse.data.name.slice(1);
    } catch (error) {
        console.error(`Erreur de récupération du nom pour Pokedex ID ${pokedexId}:`, error.message);
    }

    return {
        pokedexId,
        name: pokemonName, 
        level,
        isShiny,
        iv_hp,
        iv_attack,
        iv_defense,
        iv_special_attack,
        iv_special_defense,
        iv_speed,
    };
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
    { key: 'ellbaballs', name: 'Ellba Ball'},
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

// Route 5.1: Pokédex (MODIFIÉ pour inclure la liste complète des capturés)
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
        
        // 5. Enrichir chaque Pokémon capturé (y compris les doublons) avec ses stats
        const enrichedCapturedPokedex = capturedPokemons.map(pokemon => {
            const stats = statsMap[pokemon.pokedexId] || [];
            // Assurez-vous d'utiliser toObject() si ce n'est pas déjà un objet simple
            const enrichedPokemon = pokemon.toObject ? pokemon.toObject() : pokemon;
            
            return {
                ...enrichedPokemon,
                baseStats: stats // AJOUT DES STATS ICI
            };
        });

        // --- Génération de la liste complète pour le Pokédex UNIQUE (Capturés + Manquants) ---
        const fullPokedexMap = new Map();

        // Remplir la Map avec tous les IDs (1 à 251) comme manquants par défaut
        for (let id = 1; id <= MAX_POKEDEX_ID_GEN_6; id++) {
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
             // On garde la dernière instance capturée pour l'affichage unique du Pokédex
            uniqueCapturedPokemons.set(pokemon.pokedexId, pokemon); 
        });

        uniqueCapturedPokemons.forEach((pokemon, pokedexId) => {
            fullPokedexMap.set(pokedexId, { 
                ...pokemon, 
                isCaptured: true 
            });
        });

        // Convertir la Map en tableau trié
        const fullPokedex = Array.from(fullPokedexMap.values()).sort((a, b) => a.pokedexId - b.pokedexId);

res.json({
    success: true,
    fullPokedex,
    capturedPokemonsList: capturedPokemons,
    uniquePokedexCount: capturedPokedexIds.size,
    maxPokedexId: MAX_POKEDEX_ID_GEN_3, // On passe à 386 ici
    maxGen1Id: MAX_POKEDEX_ID_GEN_1,     // 151
    maxGen2Id: MAX_POKEDEX_ID_GEN_2      // 251
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
        const user = await User.findOne({ userId: userId }).select('-discordAccessToken -discordRefreshToken -__v');

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
            { $project: { totalCount: { $size: "$pokemons" }, uniqueCount: { $size: { $setUnion: ["$pokemons.pokedexId", []] } } }}
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
            maxPokedexId: MAX_POKEDEX_ID_GEN_6
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
            return res.status(403).json({ success: false, message: `Fonds insuffisants ! Il vous manque ${totalCost - user.money} 💰.` });
        }

        // Transaction
        user.money -= totalCost;
        
        // Utiliser la clé de l'objet utilisateur (ex: 'pokeballs')
        const userItemKey = item.key; 
        user[userItemKey] = (user[userItemKey] || 0) + quantity;
        
        let bonusMessage = '';

const validPromoItems = ['pokeball', 'greatball', 'ultraball', 'masterball', 'safariball', 'premierball', 'luxuryball'];

// --- Bloc de Promotion Corrigé dans webserver.js ---
// webserver.js -> Route /api/shop/buy
if (validPromoItems.includes(itemKey) && quantity >= 10) {
    const bonusCount = Math.floor(quantity / 10);
    for (let i = 0; i < bonusCount; i++) {
        const bonusBall = getRandomBonusBall();
        
        // CORRECTION : Accès dynamique sécurisé
        user[bonusBall.key] = (user[bonusBall.key] || 0) + 1;
        
        // IMPORTANT : Pour Mongoose, il faut marquer le champ comme modifié
        user.markModified(bonusBall.key);
        
        bonusMessage += ` +1 ${bonusBall.name} Bonus !`;
    }
    // On sauvegarde APRES la boucle
    await user.save();
}

        res.json({
            success: true,
            message: `Achat réussi : ${quantity} ${item.name}(s) pour ${totalCost.toLocaleString()} 💰. ${bonusMessage}`,
            newMoney: user.money
        });

    } catch (error) {
        console.error('Erreur API Achat:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});

// Route 5.5: Vendre un Pokémon (POST)
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

// Route 5.8: Échange Miracle (POST) --- MIS À JOUR POUR UN MESSAGE COMBINÉ
// --- Route 5.8 (Corrigée) ---
app.post('/api/trade/wonder', async (req, res) => {
    const { userId, pokemonIdToTrade } = req.body;

    if (!userId || !pokemonIdToTrade) {
        return res.status(400).json({ success: false, message: "ID Dresseur et ID Pokémon requis." });
    }

    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }

        const pokemonIndex = user.pokemons.findIndex(p => p._id.toString() === pokemonIdToTrade);
        if (pokemonIndex === -1) {
            return res.status(404).json({ success: false, message: "Pokémon non trouvé dans votre collection." });
        }

        if (user.companionPokemonId && user.companionPokemonId.toString() === pokemonIdToTrade) {
            return res.status(403).json({ success: false, message: "Vous ne pouvez pas échanger votre Pokémon compagnon." });
        }
        
        user.pokemons.splice(pokemonIndex, 1);

        const newPokemon = await generateRandomPokemon();

        // LOGIQUE POUR ISNEWSLOTCAPTURED
        // On vérifie si l'utilisateur possède déjà ce PokedexId AVANT d'ajouter le nouveau
        const alreadyHadIt = user.pokemons.some(p => p.pokedexId === newPokemon.pokedexId);

        user.pokemons.push(newPokemon);
        await user.save();
        
        res.json({ 
            success: true, 
            message: "Échange réussi !", 
            newPokemon: newPokemon, // Virgule ajoutée ici
            isNewSlotCaptured: !alreadyHadIt 
        });

    } catch (error) {
        console.error('Erreur API Échange Miracle:', error);
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
        console.error('Erreur API Compagnon:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});


// Route 5.7: Vendre TOUS les Doublons (POST)
app.post('/api/sell/duplicates', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ success: false, message: "ID Dresseur requis." });
    }

    try {
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }
        
        const pokemonsToKeepIds = new Set();
        let totalSalePrice = 0;
        const pokemonsToSell = [];

        // 1. Identifier les keepers (la meilleure instance de chaque ID, non-shiny)
        const nonShinies = user.pokemons.filter(p => !p.isShiny);
        
        // Trier pour identifier la 'meilleure' instance (niveau le plus haut) à garder
        const nonShiniesSortedForDuplicationCheck = [...nonShinies].sort((a, b) => {
            // 1. Tri par ID pour grouper
            if (a.pokedexId !== b.pokedexId) return a.pokedexId - b.pokedexId;
            // 2. Tri par Niveau (descendant: le plus haut est gardé)
            return b.level - a.level;
        });

        // Conserver l'ID de la 'meilleure' instance de chaque espèce non-shiny
        const keepersMap = new Map();
        nonShiniesSortedForDuplicationCheck.forEach(p => {
            if (!keepersMap.has(p.pokedexId)) {
                keepersMap.set(p.pokedexId, p._id.toString());
                pokemonsToKeepIds.add(p._id.toString());
            }
        });
        
        // Ajouter l'ID du compagnon à la liste des à garder, s'il est défini
        if (user.companionPokemonId) {
             pokemonsToKeepIds.add(user.companionPokemonId.toString());
        }

        // 2. Filtrer les Pokémon qui DOIVENT être vendus
        const remainingPokemons = [];
        
        user.pokemons.forEach(p => {
            const pIdString = p._id.toString();
            // Les Shinies et les keepers sont exclus de cette vente en masse.
            if (p.isShiny) {
                 remainingPokemons.push(p); // On ne vend pas les shinies
                 return;
            }
            
            if (pokemonsToKeepIds.has(pIdString)) {
                remainingPokemons.push(p); // On garde les 'keepers' et le compagnon
            } else {
                // C'est un doublon non-shiny et non-compagnon -> À vendre
                pokemonsToSell.push(p);
                
                // Calcul du prix
                const basePrice = 50; 
                const levelBonus = (p.level || 1) * 5; 
                const salePrice = basePrice + levelBonus; 
                totalSalePrice += salePrice;
            }
        });

        // 3. Effectuer la transaction
        if (pokemonsToSell.length === 0) {
            return res.status(403).json({ success: false, message: "Aucun doublon non-chromatique à vendre (l'instance de plus haut niveau est conservée pour chaque espèce)." });
        }

        user.money += totalSalePrice;
        user.pokemons = remainingPokemons; // Remplacer la liste des pokémons

        await user.save();
        
        res.json({ 
            success: true, 
            message: `Vente en masse réussie : ${pokemonsToSell.length} doublon(s) vendu(s) pour ${totalSalePrice.toLocaleString()} 💰!`,
            newMoney: user.money
        });


    } catch (error) {
        console.error('Erreur API Vente Doublons:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur lors de la vente en masse.' });
    }
});


// --- 6. DÉMARRAGE DU SERVEUR ---
app.listen(PORT, () => {
    console.log(`🚀 Serveur API démarré sur le port ${PORT}`);
    console.log(`URL Publique: ${RENDER_API_PUBLIC_URL}`);
});





















