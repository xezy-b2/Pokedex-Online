// webserver.js (Version Finale et Indépendante)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const axios = require('axios'); 
const User = require('./models/User.js'); 
// 🔥 Suppression de la ligne: const { SHOP_ITEMS, getRandomBonusBall } = require('./commands/pokeshop.js'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// --- 1. DÉFINITION DE LA BOUTIQUE (POUR L'API) ---
const POKEBALL_COST = 100;
const GREATBALL_COST = 300;
const ULTRABALL_COST = 800;
const MASTERBALL_COST = 15000; 
const SAFARIBALL_COST = 500;
const PREMIERBALL_COST = 150;
const LUXURYBALL_COST = 1000;

const SHOP_ITEMS = {
    'pokeball': { key: 'pokeballs', name: '🔴 Poké Ball', cost: POKEBALL_COST, promo: true, emoji: '🔴', desc: `Coût unitaire: ${POKEBALL_COST} BotCoins. Promotion: +1 ball spéciale par 10 achetées!` },
    'greatball': { key: 'greatballs', name: '🔵 Super Ball', cost: GREATBALL_COST, promo: false, emoji: '🔵', desc: `Coût: ${GREATBALL_COST} BotCoins. (1.5x Taux de capture)` },
    'ultraball': { key: 'ultraballs', name: '⚫ Hyper Ball', cost: ULTRABALL_COST, promo: false, emoji: '⚫', desc: `Coût: ${ULTRABALL_COST} BotCoins. (2.0x Taux de capture)` },
    'masterball': { key: 'masterballs', name: '🟣 Master Ball', cost: MASTERBALL_COST, promo: false, emoji: '🟣', desc: `Coût: ${MASTERBALL_COST} BotCoins. (Capture Assurée!)` },
    'safariball': { key: 'safariballs', name: '🟢 Safari Ball', cost: SAFARIBALL_COST, promo: false, emoji: '🟢', desc: `Coût: ${SAFARIBALL_COST} BotCoins.` },
    'premierball': { key: 'premierballs', name: '⚪ Honor Ball', cost: PREMIERBALL_COST, promo: false, emoji: '⚪', desc: `Coût: ${PREMIERBALL_COST} BotCoins.` },
    'luxuryball': { key: 'luxuryballs', name: '⚫ Luxe Ball', cost: LUXURYBALL_COST, promo: false, emoji: '⚫', desc: `Coût: ${LUXURYBALL_COST} BotCoins.` },
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
// 🔥 CORRECTION DE L'URL DE REDIRECTION FINALE
const GITHUB_PAGES_URL = 'https://xezy-b2.github.io/Pokedex-Online'; 


// --- 2. CONFIGURATION EXPRESS & CORS ---
const corsOptions = {
    origin: [RENDER_API_PUBLIC_URL, GITHUB_PAGES_URL], 
    methods: 'GET, POST', 
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
    // ... (Logique OAuth2 inchangée) ...
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

// Route 5.1: Pokédex 
app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('pokemons');
        
        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }
        
        res.json(user.pokemons);

    } catch (error) {
        console.error('Erreur API Pokédex:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});


// Route 5.2: Profil 
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('-pokemons -__v');
        
        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
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

        res.json({
            ...user.toObject(),
            stats: stats
        });
    } catch (error) {
        console.error('Erreur API Profil:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

// Route 5.3: Boutique (GET) 
app.get('/api/shop', async (req, res) => {
    res.json(SHOP_ITEMS);
});


// Route 5.4: Achat (POST) 
app.post('/api/shop/buy', async (req, res) => {
    const { userId, itemKey, quantity } = req.body;
    
    if (!userId || !itemKey || !quantity || isNaN(quantity) || quantity < 1) {
        return res.status(400).json({ success: false, message: "Données manquantes ou invalides." });
    }

    const itemConfig = SHOP_ITEMS[itemKey];

    if (!itemConfig) {
        return res.status(400).json({ success: false, message: "Article non valide." });
    }
    
    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé. Veuillez vous connecter d'abord." });
        }
        
        const totalCost = itemConfig.cost * quantity;

        if (user.money < totalCost) {
            return res.status(403).json({ success: false, message: `Vous n'avez pas assez de BotCoins pour acheter ${quantity} ${itemConfig.name}. Coût total: ${totalCost.toLocaleString()} 💰. Votre solde: ${user.money.toLocaleString()} 💰.` });
        }

        // --- DÉBUT TRANSACTION ---
        user.money -= totalCost;
        const itemDBKey = itemConfig.key;
        user[itemDBKey] = (user[itemDBKey] || 0) + quantity; 
        
        let bonusMessage = '';

        // Logique de bonus Poké Ball (intégrée ici)
        if (itemDBKey === 'pokeballs') { 
            const bonusCount = Math.floor(quantity / 10);
            if (bonusCount > 0) {
                const bonusBallsReceived = [];
                for (let i = 0; i < bonusCount; i++) {
                    const bonusBall = getRandomBonusBall();
                    user[bonusBall.key] = (user[bonusBall.key] || 0) + 1; 
                    bonusBallsReceived.push(bonusBall.name);
                }
                const tally = bonusBallsReceived.reduce((acc, name) => {
                    acc[name] = (acc[name] || 0) + 1;
                    return acc;
                }, {});
                const tallyList = Object.entries(tally).map(([name, count]) => `${count} ${name}`).join(', ');
                bonusMessage = ` (+ Bonus: ${tallyList})`;
            }
        }
        
        await user.save();
        
        res.json({ 
            success: true, 
            message: `Achat réussi de ${quantity} ${itemConfig.name} pour ${totalCost.toLocaleString()} ₽. ${bonusMessage}`,
            newMoney: user.money,
            newBallCount: user[itemDBKey]
        });

    } catch (error) {
        console.error('Erreur achat web:', error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur lors de l'achat." });
    }
});


// --- 6. DÉMARRAGE DU SERVEUR ---

app.listen(PORT, () => {
    console.log(`🌍 Serveur web démarré sur le port ${PORT}`);
});
