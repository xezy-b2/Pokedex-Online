// webserver.js - Version Complète Corrigée
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const axios = require('axios'); 
const User = require('./models/User.js'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// --- 0. CONSTANTES ET CACHE POUR POKEAPI ---
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/pokemon/';
const statsCache = {}; 

const MAX_POKEDEX_ID_GEN_1 = 151; 
const MAX_POKEDEX_ID_GEN_2 = 251; 
const MAX_POKEDEX_ID_GEN_3 = 386;
const MAX_POKEDEX_ID_GEN_4 = 493; 
const MAX_POKEDEX_ID_GEN_5 = 649; 
const MAX_POKEDEX_ID_GEN_6 = 721; 

// --- 1. BOUTIQUE ET LOGIQUE DES BONUS ---
// Harmonisation des clés avec User.js
const SHOP_ITEMS = {
    'pokeball': { key: 'pokeballs', name: 'Poké Ball', cost: 100 },
    'greatball': { key: 'greatballs', name: 'Super Ball', cost: 300 },
    'ultraball': { key: 'ultraballs', name: 'Hyper Ball', cost: 800 },
    'masterball': { key: 'masterballs', name: 'Master Ball', cost: 15000 }, 
    'safariball': { key: 'safariballs', name: 'Safari Ball', cost: 500 },
    'premierball': { key: 'premierballs', name: 'Honor Ball', cost: 150 },
    'luxuryball': { key: 'luxuryballs', name: 'Luxe Ball', cost: 1000 },
};

// Fonction unique pour les bonus (utilisée dans /api/shop/buy)
function getRandomBonusBall() {
    const bonusPool = [
        { key: 'ellbaballs', name: 'Ellba Ball' }, // Correction : Clé exacte du schéma
        { key: 'luxuryballs', name: 'Luxe Ball' },
        { key: 'premierballs', name: 'Honor Ball' },
        { key: 'ultraballs', name: 'Hyper Ball' }
    ];
    return bonusPool[Math.floor(Math.random() * bonusPool.length)];
}

// --- UTILS ---
async function fetchPokemonBaseStats(pokedexId) {
    if (statsCache[pokedexId]) return statsCache[pokedexId];
    try {
        const response = await axios.get(`${POKEAPI_BASE_URL}${pokedexId}`);
        const baseStats = response.data.stats.map(statEntry => ({
            name: statEntry.stat.name,
            base_stat: statEntry.base_stat
        }));
        statsCache[pokedexId] = baseStats;
        return baseStats;
    } catch (error) { return []; }
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
}

async function generateRandomPokemon() {
    const pokedexId = getRandomInt(1, MAX_POKEDEX_ID_GEN_6); 
    const level = getRandomInt(1, 100);
    const isShiny = getRandomInt(1, 100) === 1; 

    let pokemonName = 'Inconnu';
    try {
        const nameResponse = await axios.get(`${POKEAPI_BASE_URL}${pokedexId}`);
        pokemonName = nameResponse.data.name.charAt(0).toUpperCase() + nameResponse.data.name.slice(1);
    } catch (error) {}

    return {
        pokedexId,
        name: pokemonName, 
        level,
        isShiny,
        ivs: {
            hp: getRandomInt(0, 31),
            attack: getRandomInt(0, 31),
            defense: getRandomInt(0, 31),
            spAttack: getRandomInt(0, 31),
            spDefense: getRandomInt(0, 31),
            speed: getRandomInt(0, 31)
        }
    };
}

// --- CONFIGURATION ---
const mongoUri = process.env.MONGO_URI; 
const DISCORD_REDIRECT_URI = 'https://pokedex-online-pxmg.onrender.com/api/auth/discord/callback'; 

app.use(cors({
    origin: ['https://pokedex-online-pxmg.onrender.com', 'https://xezy-b2.github.io'], 
    credentials: true
})); 
app.use(express.json()); 

mongoose.connect(mongoUri)
    .then(() => console.log('✅ MongoDB Connecté'))
    .catch(err => console.error('❌ Erreur de connexion MongoDB:', err));

// --- ROUTES AUTH DISCORD ---
app.get('/api/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('https://xezy-b2.github.io/Pokedex-Online'); 
    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: DISCORD_REDIRECT_URI,
            scope: 'identify' 
        }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
        });

        const userData = userResponse.data;
        await User.findOneAndUpdate(
            { userId: userData.id }, 
            { username: userData.username }, 
            { upsert: true, new: true }
        );

        res.redirect(`https://xezy-b2.github.io/Pokedex-Online?discordId=${userData.id}&username=${encodeURIComponent(userData.username)}`);
    } catch (error) { 
        console.error('Erreur Auth:', error);
        res.status(500).send('Erreur d\'authentification Discord'); 
    }
});

// --- ROUTES PROFIL & POKEDEX ---
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });
        
        let companion = null;
        if (user.companionPokemonId) {
            companion = user.pokemons.id(user.companionPokemonId);
        }

        const userObj = user.toObject();
        delete userObj.pokemons; // Pour alléger la réponse du profil

        res.json({ ...userObj, companionPokemon: companion });
    } catch (e) { res.status(500).json({ message: "Erreur serveur" }); }
});

app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.params.userId });
        if (!user) return res.status(404).send("Utilisateur non trouvé");

        const capturedIds = new Set(user.pokemons.map(p => p.pokedexId));
        
        let fullPokedex = [];
        // On renvoie un état pour chaque Pokémon jusqu'à la Gen 6
        for (let i = 1; i <= MAX_POKEDEX_ID_GEN_6; i++) {
            const isCaptured = capturedIds.has(i);
            if (isCaptured) {
                const pData = user.pokemons.find(p => p.pokedexId === i);
                fullPokedex.push({ ...pData.toObject(), isCaptured: true });
            } else {
                fullPokedex.push({ pokedexId: i, name: `???`, isCaptured: false });
            }
        }

        res.json({ fullPokedex, capturedPokemonsList: user.pokemons });
    } catch (e) { res.status(500).send("Erreur serveur"); }
});

// --- ROUTES BOUTIQUE ---
app.post('/api/shop/buy', async (req, res) => {
    const { userId, itemKey, quantity } = req.body;
    const item = SHOP_ITEMS[itemKey];
    
    if (!item || isNaN(quantity) || quantity < 1) {
        return res.status(400).json({ message: "Article ou quantité invalide" });
    }

    try {
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

        const totalCost = item.cost * quantity;
        if (user.money < totalCost) {
            return res.status(403).json({ message: "Fonds insuffisants" });
        }

        // Préparation de l'update
        let updateQuery = { 
            $inc: { 
                money: -totalCost,
                [item.key]: quantity 
            } 
        };

        let bonusMessage = "";
        // Bonus 1 ball gratuite toutes les 10 achetées
        if (quantity >= 10) {
            const bonusQty = Math.floor(quantity / 10);
            const bonus = getRandomBonusBall();
            updateQuery.$inc[bonus.key] = (updateQuery.$inc[bonus.key] || 0) + bonusQty;
            bonusMessage = ` (+${bonusQty} ${bonus.name} offertes !)`;
        }

        const updatedUser = await User.findOneAndUpdate({ userId }, updateQuery, { new: true });
        
        res.json({ 
            success: true, 
            message: `Achat réussi : ${quantity} ${item.name}${bonusMessage}`, 
            newMoney: updatedUser.money 
        });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ message: "Erreur lors de l'achat" }); 
    }
});

// --- ROUTES VENTE & ÉCHANGES ---
app.post('/api/sell/pokemon', async (req, res) => {
    const { userId, pokemonIdToSell } = req.body;
    try {
        const user = await User.findOne({ userId });
        const pokemon = user.pokemons.id(pokemonIdToSell);
        
        if (!pokemon) return res.status(404).json({ message: "Pokémon non trouvé" });
        if (user.companionPokemonId?.toString() === pokemonIdToSell) {
            return res.status(403).json({ message: "Impossible de vendre votre compagnon" });
        }

        const price = 50 + (pokemon.level * 5) + (pokemon.isShiny ? 200 : 0);
        user.money += price;
        user.pokemons.pull(pokemonIdToSell);
        
        await user.save();
        res.json({ success: true, newMoney: user.money, message: `Vendu pour ${price} 💰` });
    } catch (e) { res.status(500).send("Erreur serveur"); }
});

app.post('/api/sell/duplicates', async (req, res) => {
    const { userId } = req.body;
    try {
        const user = await User.findOne({ userId });
        if (!user) return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });

        const counts = {};
        const toKeep = [];
        const toSell = [];
        let totalGain = 0;

        // On trie par niveau pour garder le meilleur
        const sortedPokemons = [...user.pokemons].sort((a, b) => b.level - a.level);

        for (const p of sortedPokemons) {
            // On garde toujours les shiny et le compagnon
            if (p.isShiny || user.companionPokemonId?.toString() === p._id.toString()) {
                toKeep.push(p);
                continue;
            }

            if (!counts[p.pokedexId]) {
                counts[p.pokedexId] = 1;
                toKeep.push(p);
            } else {
                const price = 50 + (p.level * 5);
                totalGain += price;
                toSell.push(p);
            }
        }

        if (toSell.length === 0) return res.status(400).json({ message: "Aucun doublon à vendre." });

        user.pokemons = toKeep;
        user.money += totalGain;
        await user.save();

        res.json({ success: true, message: `${toSell.length} Pokémon vendus pour ${totalGain} 💰` });
    } catch (e) { res.status(500).send("Erreur"); }
});

app.post('/api/trade/wonder', async (req, res) => {
    const { userId, pokemonIdToTrade } = req.body;
    try {
        const user = await User.findOne({ userId });
        const pIndex = user.pokemons.findIndex(p => p._id.toString() === pokemonIdToTrade);
        
        if (pIndex === -1) return res.status(404).send("Pokémon non trouvé");
        if (user.companionPokemonId?.toString() === pokemonIdToTrade) {
            return res.status(403).send("Impossible d'échanger votre compagnon");
        }

        user.pokemons.splice(pIndex, 1);
        const newP = await generateRandomPokemon();
        user.pokemons.push(newP);
        
        await user.save();
        res.json({ success: true, newPokemon: newP });
    } catch (e) { res.status(500).send("Erreur"); }
});

app.post('/api/companion/set', async (req, res) => {
    const { userId, pokemonId } = req.body;
    try {
        const user = await User.findOne({ userId });
        const pokemon = user.pokemons.id(pokemonId);
        if(!pokemon) return res.status(404).send("Pokémon non trouvé");

        user.companionPokemonId = pokemonId;
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(500).send("Erreur"); }
});

// --- DÉMARRAGE ---
app.listen(PORT, () => {
    console.log(`
    ====================================
    🚀 Serveur Pokémon Online démarré !
    Port: ${PORT}
    Statut: Opérationnel
    ====================================
    `);
});
