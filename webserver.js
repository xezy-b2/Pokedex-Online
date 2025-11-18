// webserver.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const axios = require('axios'); 
const User = require('./models/User.js'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// --- 1. DÉFINITION DE LA BOUTIQUE (POUR L'API) ---
// Ces constantes DOIVENT être mises à jour ici si elles changent dans votre bot local.
const POKEBALL_COST = 100;
const GREATBALL_COST = 300;
const ULTRABALL_COST = 800;
const MASTERBALL_COST = 15000; 
const SAFARIBALL_COST = 500;
const PREMIERBALL_COST = 150;
const LUXURYBALL_COST = 1000;

const SHOP_ITEMS = {
    // MODIFIÉ: Remplacement des emojis par 'imageFragment'
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
    // Autorise les origines spécifiques (GitHub Pages, Render)
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

        // Redirection vers l'URL corrigée
        const redirectUrl = `${GITHUB_PAGES_URL}?discordId=${discordUser.id}&username=${encodeURIComponent(discordUser.username)}`;
        res.redirect(redirectUrl); 

    } catch (error) {
        console.error('Erreur lors de l\'échange OAuth2:', error.response?.data || error.message);
        res.status(500).send('Échec de la connexion Discord.');
    }
});


// --- 5. ROUTES API (POKÉDEX, PROFIL, SHOP) ---

// Route 5.1: Pokédex (CORRIGÉ pour renvoyer le format { fullPokedex, uniquePokedexCount })
app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // CORRECTION: Nous sélectionnons EXPLICITEMENT le champ 'pokemons' !
        const user = await User.findOne({ userId: userId }).select('pokemons');

        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }

        // 1. Récupération des Pokémons (garanti Array)
        const fullPokedex = user.pokemons || [];
        
        // 2. Calcul du nombre d'espèces uniques
        const uniquePokedexCount = new Set(fullPokedex.map(p => p.pokedexId)).size;

        // 3. Envoi de l'objet STRUCTURÉ comme le client l'attend
        res.json({
            fullPokedex: fullPokedex, 
            uniquePokedexCount: uniquePokedexCount
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
        
        // 1. Fetch user data, including companion ID and the pokemons array to find the companion
        // Nous récupérons tout sauf __v
        const user = await User.findOne({ userId: userId }).select('-__v'); 
        
        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }
        
        // 2. Find the companion Pokémon object
        let companionPokemon = null;
        if (user.companionPokemonId && user.pokemons) {
            // Convert to string for comparison
            const companionIdString = user.companionPokemonId.toString();
            // Le ._id de l'objet Pokémon dans le tableau correspond au companionPokemonId
            companionPokemon = user.pokemons.find(p => p._id.toString() === companionIdString);
        }

        // 3. Calculate capture statistics (using aggregation as before)
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

        // 4. Create the final response object (excluding the full 'pokemons' array for lightness)
        const userObject = user.toObject();
        delete userObject.pokemons; 
        delete userObject.companionPokemonId; 

        res.json({
            ...userObject,
            stats: stats,
            companionPokemon: companionPokemon // AJOUTÉ
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
        return res.status(400).json({ success: false, message: "Données manquantes ou invalides (userId, itemKey, ou quantité)." });
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

        // Logique de bonus Poké Ball 
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


// --- Route 5.5: Vendre un Pokémon (POST) ---
app.post('/api/sell/pokemon', async (req, res) => {
    // Le client doit envoyer l'ID du Pokémon à vendre (son ID interne dans le tableau)
    const { userId, pokemonIdToSell } = req.body; 

    if (!userId || !pokemonIdToSell) {
        return res.status(400).json({ success: false, message: "Données manquantes (userId ou pokemonIdToSell)." });
    }
    
    try {
        // 1. Trouver l'utilisateur
        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({ success: false, message: "Dresseur non trouvé." });
        }
        
        // 2. Trouver l'index du Pokémon dans le tableau 'pokemons'
        const pokemonIndex = user.pokemons.findIndex(p => p._id.toString() === pokemonIdToSell);

        if (pokemonIndex === -1) {
            return res.status(404).json({ success: false, message: "Pokémon non trouvé dans votre collection." });
        }

        const pokemonToSell = user.pokemons[pokemonIndex];
        
        // ** LOGIQUE DU PRIX DE VENTE **
        const basePrice = 50; // Prix de base
        const levelBonus = (pokemonToSell.level || 1) * 5; // +5 BotCoins par niveau
        const shinyBonus = pokemonToSell.isShiny ? 200 : 0; // +200 BotCoins si Shiny
        
        const salePrice = basePrice + levelBonus + shinyBonus;

        // 3. Vérifier si c'est un Compagnon
        if (user.companionPokemonId && user.companionPokemonId.toString() === pokemonIdToSell) {
             // Utilisation du nom du Pokémon pour un meilleur message
             return res.status(403).json({ success: false, message: `Vous ne pouvez pas vendre votre Compagnon (${pokemonToSell.name}). Retirez-le avec !removecompanion d'abord.` });
        }

        // 4. Mettre à jour les données de l'utilisateur
        user.money += salePrice;
        // Supprimer le Pokémon du tableau
        user.pokemons.splice(pokemonIndex, 1); 

        // 5. Sauvegarder les changements
        await user.save();
        
        // 6. Succès
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


// --- 6. DÉMARRAGE DU SERVEUR ---

app.listen(PORT, () => {
    console.log(`🌍 Serveur web démarré sur le port ${PORT}`);
});
