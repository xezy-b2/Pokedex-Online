// webserver.js

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); 
const axios = require('axios'); 
const User = require('./models/User.js'); 

// 🔥 IMPORTATION DE LA LOGIQUE DU SHOP
const { SHOP_ITEMS, getRandomBonusBall } = require('./commands/pokeshop.js'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// --- SECRETS: LECTURE DES VARIABLES D'ENVIRONNEMENT ---
const mongoUri = process.env.MONGO_URI; 

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

const DISCORD_REDIRECT_URI = 'https://pokedex-online-pxmg.onrender.com/api/auth/discord/callback'; 


// --- URLS PUBLIQUES (CORRIGÉES AVEC /Pokedex-Online) ---
const RENDER_API_PUBLIC_URL = 'https://pokedex-online-pxmg.onrender.com';
// 🔥 L'URL DE REDIRECTION DOIT MAINTENANT INCLURE LE NOM DU DÉPÔT
const GITHUB_PAGES_URL = 'https://xezy-b2.github.io/Pokedex-Online'; 


// --- 1. CONFIGURATION CORS ---
const corsOptions = {
    // 🔥 AUTORISE LE POST POUR LES ACHATS
    origin: [RENDER_API_PUBLIC_URL, GITHUB_PAGES_URL], 
    methods: 'GET, POST', 
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 
app.use(express.json()); // Nécessaire pour lire le corps des requêtes POST


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


// --- 3. FICHIERS STATIQUES ---
// Si vous servez le frontend depuis Render: app.use(express.static(path.join(__dirname, 'public')));


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

        // D: Redirection vers le frontend avec l'ID et l'username (URL CORRIGÉE)
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
    // ... (Logique inchangée) ...
});


// Route 5.2: Profil 
app.get('/api/profile/:userId', async (req, res) => {
    // ... (Logique inchangée) ...
});

// Route 5.3: Boutique (GET) - UTILISE SHOP_ITEMS IMPORTÉ
app.get('/api/shop', async (req, res) => {
    res.json(SHOP_ITEMS);
});


// 🔥 Route 5.4: Achat (POST) - NOUVELLE ROUTE
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

        // Logique de bonus Poké Ball (copiée de pokeshop.js)
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
