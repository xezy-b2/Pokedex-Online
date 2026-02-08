const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const axios = require('axios'); 
const User = require('./models/User.js'); 

const app = express();
const PORT = process.env.PORT || 3000; 


const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/pokemon/';
const statsCache = {}; 


const MAX_POKEDEX_ID_GEN_1 = 151; 
const MAX_POKEDEX_ID_GEN_2 = 251; /
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
        
        const baseStats = data.stats.map(statEntry => ({
            name: statEntry.stat.name,
            base_stat: statEntry.base_stat
        }));
        
        statsCache[pokedexId] = baseStats;
        return baseStats;
    } catch (error) {
        console.error(`Erreur de récupération des stats pour Pokedex ID ${pokedexId}:`, error.message);
        return [];
    }
}

const GalleryPostSchema = new mongoose.Schema({
    userId: String,
    username: String,
    message: String,
    teamData: Array,
    likes: { type: [String], default: [] }, 
    createdAt: { type: Date, default: Date.now }
});
const GalleryPost = mongoose.model('GalleryPost', GalleryPostSchema);


function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generateRandomPokemon() 
{
    const pokedexId = getRandomInt(1, MAX_POKEDEX_ID_GEN_6); 

    const level = getRandomInt(1, 100);
    const iv_hp = getRandomInt(0, 31);
    const iv_attack = getRandomInt(0, 31);
    const iv_defense = getRandomInt(0, 31);
    const iv_special_attack = getRandomInt(0, 31);
    const iv_special_defense = getRandomInt(0, 31);
    const iv_speed = getRandomInt(0, 31);
    const isShiny = getRandomInt(1, 100) === 1; 

    let pokemonName = 'Inconnu';
    try 
    {
        const nameResponse = await axios.get(`${POKEAPI_BASE_URL}${pokedexId}`);
        pokemonName = nameResponse.data.name.charAt(0).toUpperCase() + nameResponse.data.name.slice(1);
    } 
    catch (error) 
    {
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

const mongoUri = process.env.MONGO_URI; 
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = 'https://pokedex-online-pxmg.onrender.com/api/auth/discord/callback'; 

const RENDER_API_PUBLIC_URL = 'https://pokedex-online-pxmg.onrender.com';
const GITHUB_PAGES_URL = 'https://xezy-b2.github.io/Pokedex-Online'; 

const corsOptions = {
    origin: [RENDER_API_PUBLIC_URL, GITHUB_PAGES_URL, 'https://xezy-b2.github.io'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'], 
    credentials: true, 
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 
app.use(express.json()); 

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

app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('pokemons');

        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }

        const capturedPokemons = user.pokemons || [];
        const capturedPokedexIds = new Set(capturedPokemons.map(p => p.pokedexId));
        const uniquePokedexIds = [...capturedPokedexIds];
        const statsPromises = uniquePokedexIds.map(id => fetchPokemonBaseStats(id));
        const allStats = await Promise.all(statsPromises);
        const statsMap = uniquePokedexIds.reduce((map, id, index) => {
            map[id] = allStats[index];
            return map;
        }, {});
        
        const enrichedCapturedPokedex = capturedPokemons.map(pokemon => {
            const stats = statsMap[pokemon.pokedexId] || [];
            const enrichedPokemon = pokemon.toObject ? pokemon.toObject() : pokemon;
            
            return {
                ...enrichedPokemon,
                baseStats: stats
            };
        });
        const fullPokedexMap = new Map();

        for (let id = 1; id <= MAX_POKEDEX_ID_GEN_6; id++) {
            fullPokedexMap.set(id, {
                pokedexId: id,
                name: `[${id.toString().padStart(3, '0')}] Inconnu`, 
                isCaptured: false,
                baseStats: [], level: 0, isShiny: false, 
                iv_hp: 0, iv_attack: 0, iv_defense: 0, 
                iv_special_attack: 0, iv_special_defense: 0, iv_speed: 0,
            });
        }
        
        const uniqueCapturedPokemons = new Map();
        enrichedCapturedPokedex.forEach(pokemon => {
            uniqueCapturedPokemons.set(pokemon.pokedexId, pokemon); 
        });

        uniqueCapturedPokemons.forEach((pokemon, pokedexId) => {
            fullPokedexMap.set(pokedexId, { 
                ...pokemon, 
                isCaptured: true 
            });
        });
        const fullPokedex = Array.from(fullPokedexMap.values()).sort((a, b) => a.pokedexId - b.pokedexId);

res.json({
    success: true,
    fullPokedex,
    capturedPokemonsList: capturedPokemons,
    uniquePokedexCount: capturedPokedexIds.size,
    maxPokedexId: MAX_POKEDEX_ID_GEN_3,
    maxGen1Id: MAX_POKEDEX_ID_GEN_1, 
    maxGen2Id: MAX_POKEDEX_ID_GEN_2  
});

    } catch (error) {
        console.error('Erreur API Pokédex:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

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

app.get('/api/shop', (req, res) => {
    res.json(SHOP_ITEMS);
});

app.post('/api/shop/buy', async (req, res) => {
    const { userId, itemKey, quantity } = req.body;
    const item = SHOP_ITEMS[itemKey];
    
    if (!userId || !item || !quantity || quantity < 1) {
        return res.status(400).json({ success: false, message: "Requête invalide." });
    }

    const totalCost = item.cost * quantity;

    try {
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: "Dresseur non trouvé." });

        if (user.money < totalCost) {
            return res.status(403).json({ success: false, message: `Fonds insuffisants !` });
        }
        const updateFields = {
            $inc: {
                money: -totalCost,
                [item.key]: quantity
            }
        };

        let bonusMessage = '';
        const validPromoItems = ['pokeball', 'greatball', 'ultraball', 'masterball', 'safariball', 'premierball', 'luxuryball'];

        if (validPromoItems.includes(itemKey) && quantity >= 10) {
            const bonusCount = Math.floor(quantity / 10);
            for (let i = 0; i < bonusCount; i++) {
                const bonusBall = getRandomBonusBall();
                const bKey = bonusBall.key;

                if (!updateFields.$inc[bKey]) updateFields.$inc[bKey] = 0;
                updateFields.$inc[bKey] += 1;
                
                bonusMessage += ` +1 ${bonusBall.name} Bonus !`;
            }
        }

        const updatedUser = await User.findOneAndUpdate(
            { userId: userId },
            updateFields,
            { new: true }
        );

        res.json({
            success: true,
            message: `Achat réussi : ${quantity} ${item.name}(s).${bonusMessage}`,
            newMoney: updatedUser.money
        });

    } catch (error) {
        console.error('Erreur API Achat:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});

function getRandomBonusBall() {
    const balls = [
    { key: 'greatballs', name: 'Super Ball' }, { key: 'ultraballs', name: 'Hyper Ball' }, 
    { key: 'masterballs', name: 'Master Ball' }, { key: 'safariballs', name: 'Safari Ball' }, 
    { key: 'premierballs', name: 'Honor Ball' }, { key: 'luxuryballs', name: 'Luxe Ball' },
    { key: 'ellbaballs', name: 'Ellba Ball'},
    ];
    return balls[Math.floor(Math.random() * balls.length)];
}

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
        const alreadyHadIt = user.pokemons.some(p => p.pokedexId === newPokemon.pokedexId);

        user.pokemons.push(newPokemon);
        await user.save();
        
        res.json({ 
            success: true, 
            message: "Échange réussi !", 
            newPokemon: newPokemon,
            isNewSlotCaptured: !alreadyHadIt 
        });

    } catch (error) {
        console.error('Erreur API Échange Miracle:', error);
        res.status(500).json({ success: false, message: 'Erreur interne du serveur.' });
    }
});

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
        const nonShinies = user.pokemons.filter(p => !p.isShiny);
        const nonShiniesSortedForDuplicationCheck = [...nonShinies].sort((a, b) => 
            {
            if (a.pokedexId !== b.pokedexId) return a.pokedexId - b.pokedexId;
            return b.level - a.level;
        });
        const keepersMap = new Map();
        nonShiniesSortedForDuplicationCheck.forEach(p => 
            {
            if (!keepersMap.has(p.pokedexId)) {
                keepersMap.set(p.pokedexId, p._id.toString());
                pokemonsToKeepIds.add(p._id.toString());
            }
        });

        if (user.companionPokemonId) {
             pokemonsToKeepIds.add(user.companionPokemonId.toString());
        }

        const remainingPokemons = [];
        
        user.pokemons.forEach(p => {
            const pIdString = p._id.toString();
            if (p.isShiny) {
                 remainingPokemons.push(p);
                 return;
            }
            
            if (pokemonsToKeepIds.has(pIdString)) {
                remainingPokemons.push(p); 
            } else {
               
                pokemonsToSell.push(p);
                
                const basePrice = 50; 
                const levelBonus = (p.level || 1) * 5; 
                const salePrice = basePrice + levelBonus; 
                totalSalePrice += salePrice;
            }
        });

        if (pokemonsToSell.length === 0) {
            return res.status(403).json({ success: false, message: "Aucun doublon non-chromatique à vendre (l'instance de plus haut niveau est conservée pour chaque espèce)." });
        }

        user.money += totalSalePrice;
        user.pokemons = remainingPokemons;

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

app.post('/api/daily/claim', async (req, res) => {
    const { userId } = req.body;
    const GIFT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const MIN_MONEY_REWARD = 10;
    const MAX_MONEY_REWARD = 1000;
    const COMMON_BALLS = [
        { key: 'pokeballs', name: 'Poké Ball' },
        { key: 'greatballs', name: 'Super Ball' },
        { key: 'ultraballs', name: 'Hyper Ball' },
        { key: 'safariballs', name: 'Safari Ball' },
        { key: 'premierballs', name: 'Honor Ball' }
    ];
    const RARE_BALL = [
        { key: 'masterballs', name: 'Master Ball' },
        { key: 'ellbaballs', name: 'Ellba Ball' }
    ];

    try {
        const user = await User.findOne({ discordId: userId }) || await User.findOne({ userId: userId });
        
        if (!user) return res.status(404).json({ success: false, message: "Dresseur non trouvé." });

        const now = Date.now();
        if (user.lastDaily && (now - user.lastDaily.getTime()) < GIFT_COOLDOWN_MS) {
            return res.status(403).json({ success: false, message: "Trop tôt ! Revenez plus tard." });
        }
        const rewardMoney = Math.floor(Math.random() * (MAX_MONEY_REWARD - MIN_MONEY_REWARD + 1)) + MIN_MONEY_REWARD;
        user.money = (user.money || 0) + rewardMoney;

        let selectedBalls = [];
        const isLucky = Math.random() < 0.05; 

        if (isLucky) {
            const randomRare = RARE_BALL[Math.floor(Math.random() * RARE_BALL.length)];
            selectedBalls.push(randomRare);
            selectedBalls.push(COMMON_BALLS[Math.floor(Math.random() * COMMON_BALLS.length)]);
        } else {
            const shuffled = [...COMMON_BALLS].sort(() => 0.5 - Math.random());
            selectedBalls = shuffled.slice(0, 2);
        }

        let rewardTextParts = [`${rewardMoney} 💰`];
        
        selectedBalls.forEach(ball => {
            const amount = (ball.key === 'masterballs' || ball.key === 'ellbaballs') ? 1 : Math.floor(Math.random() * 2) + 1;
            user[ball.key] = (user[ball.key] || 0) + amount;
            rewardTextParts.push(`${amount}x ${ball.name}`);
        });
        
        user.lastDaily = new Date(now);
        user.dailyNotified = false; 
        await user.save();

        res.json({ 
            success: true, 
            message: "Cadeau récupéré !", 
            rewards: rewardTextParts.join(" et ")
        });

    } catch (error) {
        console.error('Erreur Daily Claim:', error);
        res.status(500).json({ success: false, message: "Erreur lors de la récupération du cadeau." });
    }
});

app.post('/api/evolve-companion', async (req, res) => {
    const { userId, newId, newName } = req.body;
    try {
        const user = await User.findOne({ userId: userId });
        if (!user || !user.companionPokemon) return res.status(404).json({ error: "Dresseur ou compagnon non trouvé" });

        user.companionPokemon.pokedexId = newId;
        user.companionPokemon.name = newName;

        const pokemonInList = user.pokemons.id(user.companionPokemon._id);
        if (pokemonInList) {
            pokemonInList.pokedexId = newId;
            pokemonInList.name = newName;
        }

        await user.save();
        res.json({ success: true, message: `Évolution réussie en ${newName}` });
    } catch (e) {
        res.status(500).json({ error: "Erreur lors de l'évolution" });
    }
});

app.post('/api/profile/update-favorites', async (req, res) => {
    const { userId, favorites } = req.body;
    try {
        const cleanFavorites = Array.isArray(favorites) ? favorites.map(id => String(id)) : [];

        const user = await User.findOneAndUpdate(
            { userId: userId },
            { $set: { favorites: cleanFavorites } },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
        
        res.json({ success: true, favorites: user.favorites });
    } catch (e) {
        console.error("Erreur Backend Favorites:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/gallery', async (req, res) => {
    try {
        const posts = await GalleryPost.find().sort({ createdAt: -1 }).limit(50);
        res.json(posts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/gallery/post', async (req, res) => {
    try {
        const { userId, username, message, teamIds } = req.body;
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ error: "User non trouvé" });
        
        // On prend les données des Pokémon favoris de l'user
        const teamData = user.pokemons.filter(p => teamIds.includes(p._id.toString()));
        
        const newPost = new GalleryPost({ userId, username, message, teamData });
        await newPost.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const MY_ADMIN_ID = "1238112721984028706"; 

app.delete('/api/gallery/post/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { adminId } = req.body;

        if (String(adminId) !== String(MY_ADMIN_ID)) {
            console.log(`Tentative de suppression refusée pour l'ID : ${adminId}`);
            return res.status(403).json({ error: "Accès refusé : Identifiant Admin incorrect." });
        }

        await GalleryPost.findByIdAndDelete(postId);
        res.json({ success: true, message: "Post supprimé avec succès" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/gallery/like', async (req, res) => {
    const { postId, userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "Vous devez être connecté pour liker." });
    }

    try {
        const post = await GalleryPost.findById(postId);
        if (!post) return res.status(404).json({ error: "Publication introuvable." });

        const hasLiked = post.likes.includes(userId);

        if (hasLiked) {
            await GalleryPost.findByIdAndUpdate(postId, { $pull: { likes: userId } });
        } else {
            await GalleryPost.findByIdAndUpdate(postId, { $addToSet: { likes: userId } });
        }

        const updatedPost = await GalleryPost.findById(postId);
        res.json({ 
            success: true, 
            likesCount: updatedPost.likes.length, 
            hasLiked: !hasLiked 
        });

    } catch (e) {
        console.error("Erreur Like:", e);
        res.status(500).json({ error: "Erreur lors du like." });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur API démarré sur le port ${PORT}`);
    console.log(`URL Publique: ${RENDER_API_PUBLIC_URL}`);
});
