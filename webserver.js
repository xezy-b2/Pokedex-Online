// webserver.js

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); 
const axios = require('axios'); // <-- Ajouté pour les requêtes Discord OAuth2
const User = require('./models/User.js'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// --- SECRETS: LECTURE DES VARIABLES D'ENVIRONNEMENT ---
const mongoUri = process.env.MONGO_URI; 

// --- NOUVELLES VARIABLES OAUTH2 ---
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = 'https://pokedex-online-pxmg.onrender.com/api/auth/discord/callback'; 


// --- URLS PUBLIQUES ---
const RENDER_API_PUBLIC_URL = 'https://pokedex-online-pxmg.onrender.com';
const GITHUB_PAGES_URL = 'https://xezy-b2.github.io'; 


// --- CONFIGURATION DE LA BOUTIQUE (Copie des données de pokeshop.js) ---
const SHOP_ITEMS_DATA = {
    'pokeball': { name: '🔴 Poké Ball', cost: 100, desc: `Coût: 100 ₽. Promotion: +1 ball spéciale par 10 achetées!` },
    'greatball': { name: '🔵 Super Ball', cost: 300, desc: `Coût: 300 ₽. (1.5x Taux de capture)` },
    'ultraball': { name: '⚫ Hyper Ball', cost: 800, desc: `Coût: 800 ₽. (2.0x Taux de capture)` },
    'masterball': { name: '🟣 Master Ball', cost: 15000, desc: `Coût: 15,000 ₽. (Capture Assurée!)` },
    'safariball': { name: '🟢 Safari Ball', cost: 500, desc: `Coût: 500 ₽.` },
    'premierball': { name: '⚪ Honor Ball', cost: 150, desc: `Coût: 150 ₽.` },
    'luxuryball': { name: '⚫ Luxe Ball', cost: 1000, desc: `Coût: 1,000 ₽.` },
};


// --- 1. CONFIGURATION CORS (DOIT ÊTRE EN PREMIER) ---
const corsOptions = {
    origin: [RENDER_API_PUBLIC_URL, GITHUB_PAGES_URL], 
    methods: 'GET, POST', 
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 
app.use(express.json()); // Nécessaire pour les requêtes POST futures


// --- 2. CONNEXION MONGODB ---
if (!mongoUri) {
    console.error('❌ FATAL: La variable d\'environnement MONGO_URI n\'est pas définie. Le serveur ne démarrera pas sur Render.');
    if (process.env.NODE_ENV === 'production') process.exit(1); 
}

mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connecté à la base de données MongoDB pour le site web !'))
    .catch(err => {
        console.error('❌ Erreur de connexion MongoDB (Vérifiez MONGO_URI) :', err);
        if (process.env.NODE_ENV === 'production') process.exit(1);
    });


// --- 3. FICHIERS STATIQUES (Pour le test local) ---
app.use(express.static(path.join(__dirname, 'public')));


// --- 4. ROUTES AUTHENTIFICATION (NOUVELLES) ---

// Route 3: Le point de retour (Callback) après l'approbation Discord
app.get('/api/auth/discord/callback', async (req, res) => {
    const code = req.query.code;

    if (!code) {
        // En cas d'annulation ou d'erreur, on redirige vers l'accueil
        return res.redirect(GITHUB_PAGES_URL); 
    }

    // Vérification rapide des secrets
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
        console.error("Secrets Discord non définis. Impossible de procéder à l'OAuth.");
        return res.status(500).send("Erreur de configuration OAuth.");
    }

    try {
        // Étape A: Échange du code contre un jeton d'accès (Access Token)
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

        // Étape B: Utilisation du jeton pour obtenir les informations de l'utilisateur
        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const discordUser = userResponse.data;
        
        // Mise à jour de l'utilisateur dans la base de données (si nouveau, ou juste pour l'username)
        // Upsert: si l'ID existe, on met à jour le username; sinon, on crée.
        await User.findOneAndUpdate(
            { userId: discordUser.id },
            { $set: { username: discordUser.username } },
            { upsert: true, new: true } 
        );

        // Étape C: Redirection vers le frontend avec l'ID et l'username (TRES TEMPORAIRE / POC)
        // La vraie sécurité exigerait l'envoi d'un JWT ou d'un cookie.
        const redirectUrl = `${GITHUB_PAGES_URL}?discordId=${discordUser.id}&username=${encodeURIComponent(discordUser.username)}`;
        res.redirect(redirectUrl); 

    } catch (error) {
        console.error('Erreur lors de l\'échange OAuth2:', error.response?.data || error.message);
        res.status(500).send('Échec de la connexion Discord. Vérifiez les logs Render.');
    }
});


// --- 5. ROUTES API EXISTANTES ---

// Route 5.1: Pokédex 
app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('username pokemons');
        
        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." }); 
        }
        
        const fullPokedex = user.pokemons;
        const uniquePokedexIds = [...new Set(fullPokedex.map(p => p.pokedexId))];
        
        res.json({
            username: user.username,
            fullPokedex: fullPokedex,
            uniquePokedexCount: uniquePokedexIds.length
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
        const user = await User.findOne({ userId: userId }).select('-pokemons -__v');
        
        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }
        
        // L'agrégation est lourde, mais assure la justesse du compte si l'utilisateur est trouvé.
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
    res.json(SHOP_ITEMS_DATA);
});


// --- 6. DÉMARRAGE DU SERVEUR ---

app.listen(PORT, () => {
    console.log(`🌍 Serveur web démarré sur le port ${PORT}`);
});
