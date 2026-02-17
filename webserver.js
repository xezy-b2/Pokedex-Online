const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const User = require('./models/User.js');
const TradeOffer = require('./models/TradeOffer.js');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== MIDDLEWARES (ORDRE IMPORTANT) ==========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/pokemon/';
const statsCache = {}; 


const MAX_POKEDEX_ID_GEN_1 = 151; 
const MAX_POKEDEX_ID_GEN_2 = 251; 
const MAX_POKEDEX_ID_GEN_3 = 386;
const MAX_POKEDEX_ID_GEN_4 = 493; // Sinnoh
const MAX_POKEDEX_ID_GEN_5 = 649; // Unys
const MAX_POKEDEX_ID_GEN_6 = 721; // Kalos

// ==========================================
// 🔄 ROUTES D'ÉCHANGE DIRECT
// À ajouter dans webserver.js AVANT app.listen()
// ==========================================

// ==========================================
// 1. CRÉER UNE OFFRE D'ÉCHANGE
// ==========================================
app.post('/api/trade/create-offer', async (req, res) => {
    const { userId, offeredPokemonId, wantedPokemonName, conditions, message } = req.body;

    if (!userId || !offeredPokemonId || !wantedPokemonName) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }

        // Vérifier que le Pokémon appartient à l'utilisateur
        const pokemon = user.pokemons.id(offeredPokemonId);
        if (!pokemon) {
            return res.status(404).json({ error: "Pokémon introuvable" });
        }

        // Vérifier que ce n'est pas le compagnon
        if (user.companionPokemonId && user.companionPokemonId.toString() === offeredPokemonId) {
            return res.status(400).json({ error: "Vous ne pouvez pas échanger votre compagnon actuel" });
        }

        // Vérifier le nombre d'offres actives
        const activeOffersCount = await TradeOffer.countDocuments({ 
            creatorId: userId, 
            status: 'active' 
        });

        if (activeOffersCount >= 5) {
            return res.status(400).json({ error: "Vous avez déjà 5 offres actives. Annulez-en une pour en créer une nouvelle." });
        }

        // Créer l'offre
        const newOffer = new TradeOffer({
            creatorId: userId,
            creatorUsername: user.username,
            offeredPokemon: {
                _id: pokemon._id,
                name: pokemon.name,
                pokedexId: pokemon.pokedexId,
                level: pokemon.level,
                isShiny: pokemon.isShiny || false,
                isMega: pokemon.isMega || false,
                isCustom: pokemon.isCustom || false,
                customSprite: pokemon.customSprite || null
            },
            wantedPokemon: {
                name: wantedPokemonName,
                conditions: conditions || {}
            },
            message: message || ''
        });

        await newOffer.save();

        res.json({ 
            success: true, 
            message: "Offre créée avec succès !",
            offerId: newOffer._id 
        });

    } catch (e) {
        console.error("Erreur création offre:", e);
        res.status(500).json({ error: "Erreur lors de la création de l'offre" });
    }
});

// ==========================================
// 2. LISTER TOUTES LES OFFRES ACTIVES
// ==========================================
app.get('/api/trade/offers', async (req, res) => {
    const { filter, search, userId } = req.query;

    try {
        let query = { status: 'active', expiresAt: { $gt: new Date() } };

        // Filtres
        if (filter === 'shiny') {
            query['offeredPokemon.isShiny'] = true;
        } else if (filter === 'mega') {
            query['offeredPokemon.isMega'] = true;
        } else if (filter === 'custom') {
            query['offeredPokemon.isCustom'] = true;
        }

        // Recherche par nom
        if (search) {
            query.$or = [
                { 'offeredPokemon.name': { $regex: search, $options: 'i' } },
                { 'wantedPokemon.name': { $regex: search, $options: 'i' } }
            ];
        }

        // Ne pas afficher ses propres offres dans la liste publique
        if (userId) {
            query.creatorId = { $ne: userId };
        }

        const offers = await TradeOffer.find(query)
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ offers });

    } catch (e) {
        console.error("Erreur listing offres:", e);
        res.status(500).json({ error: "Erreur lors de la récupération des offres" });
    }
});

// ==========================================
// 3. PROPOSER UN ÉCHANGE SUR UNE OFFRE
// ==========================================
app.post('/api/trade/propose', async (req, res) => {
    const { userId, offerId, offeredPokemonId, message } = req.body;

    if (!userId || !offerId || !offeredPokemonId) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }

        const offer = await TradeOffer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: "Offre introuvable" });
        }

        if (offer.status !== 'active') {
            return res.status(400).json({ error: "Cette offre n'est plus active" });
        }

        if (offer.creatorId === userId) {
            return res.status(400).json({ error: "Vous ne pouvez pas proposer sur votre propre offre" });
        }

        // Vérifier que le Pokémon appartient à l'utilisateur
        const pokemon = user.pokemons.id(offeredPokemonId);
        if (!pokemon) {
            return res.status(404).json({ error: "Pokémon introuvable" });
        }

        // Vérifier que ce n'est pas le compagnon
        if (user.companionPokemonId && user.companionPokemonId.toString() === offeredPokemonId) {
            return res.status(400).json({ error: "Vous ne pouvez pas échanger votre compagnon actuel" });
        }

        // Vérifier les conditions de l'offre
        const conditions = offer.wantedPokemon.conditions;
        
        if (pokemon.name.toLowerCase() !== offer.wantedPokemon.name.toLowerCase()) {
            return res.status(400).json({ error: `Cette offre recherche un ${offer.wantedPokemon.name}` });
        }

        if (conditions.minLevel && pokemon.level < conditions.minLevel) {
            return res.status(400).json({ error: `Niveau minimum requis : ${conditions.minLevel}` });
        }

        if (conditions.mustBeShiny && !pokemon.isShiny) {
            return res.status(400).json({ error: "Un Pokémon chromatique est requis" });
        }

        if (conditions.mustBeMega && !pokemon.isMega) {
            return res.status(400).json({ error: "Une Méga-évolution est requise" });
        }

        // Vérifier qu'on n'a pas déjà proposé
        const alreadyProposed = offer.proposals.some(p => p.proposerId === userId && p.status === 'pending');
        if (alreadyProposed) {
            return res.status(400).json({ error: "Vous avez déjà proposé un échange sur cette offre" });
        }

        // Limiter le nombre de propositions par jour
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const proposalsToday = await TradeOffer.countDocuments({
            'proposals.proposerId': userId,
            'proposals.createdAt': { $gte: today }
        });

        if (proposalsToday >= 10) {
            return res.status(400).json({ error: "Limite de 10 propositions par jour atteinte" });
        }

        // Créer la proposition
        const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        offer.proposals.push({
            proposalId,
            proposerId: userId,
            proposerUsername: user.username,
            offeredPokemon: {
                _id: pokemon._id,
                name: pokemon.name,
                pokedexId: pokemon.pokedexId,
                level: pokemon.level,
                isShiny: pokemon.isShiny || false,
                isMega: pokemon.isMega || false,
                isCustom: pokemon.isCustom || false
            },
            message: message || ''
        });

        await offer.save();

        res.json({ 
            success: true, 
            message: "Proposition envoyée avec succès !",
            proposalId 
        });

    } catch (e) {
        console.error("Erreur proposition:", e);
        res.status(500).json({ error: "Erreur lors de la proposition" });
    }
});

// ==========================================
// 4. ACCEPTER UNE PROPOSITION
// ==========================================
app.post('/api/trade/accept', async (req, res) => {
    const { userId, offerId, proposalId } = req.body;

    if (!userId || !offerId || !proposalId) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const offer = await TradeOffer.findById(offerId).session(session);
        if (!offer) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Offre introuvable" });
        }

        if (offer.creatorId !== userId) {
            await session.abortTransaction();
            return res.status(403).json({ error: "Vous n'êtes pas le créateur de cette offre" });
        }

        if (offer.status !== 'active') {
            await session.abortTransaction();
            return res.status(400).json({ error: "Cette offre n'est plus active" });
        }

        const proposal = offer.proposals.find(p => p.proposalId === proposalId);
        if (!proposal) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Proposition introuvable" });
        }

        if (proposal.status !== 'pending') {
            await session.abortTransaction();
            return res.status(400).json({ error: "Cette proposition a déjà été traitée" });
        }

        // Récupérer les deux utilisateurs
        const creator = await User.findOne({ userId: offer.creatorId }).session(session);
        const proposer = await User.findOne({ userId: proposal.proposerId }).session(session);

        if (!creator || !proposer) {
            await session.abortTransaction();
            return res.status(404).json({ error: "Un des utilisateurs est introuvable" });
        }

        // Vérifier que les deux Pokémon existent toujours
        const creatorPokemon = creator.pokemons.id(offer.offeredPokemon._id);
        const proposerPokemon = proposer.pokemons.id(proposal.offeredPokemon._id);

        if (!creatorPokemon) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Votre Pokémon n'existe plus" });
        }

        if (!proposerPokemon) {
            await session.abortTransaction();
            return res.status(400).json({ error: "Le Pokémon proposé n'existe plus" });
        }

        // ÉCHANGE ATOMIQUE
        // Retirer les Pokémon de leurs propriétaires actuels
        creator.pokemons.pull(creatorPokemon._id);
        proposer.pokemons.pull(proposerPokemon._id);

        // Ajouter les Pokémon aux nouveaux propriétaires
        creator.pokemons.push(proposerPokemon);
        proposer.pokemons.push(creatorPokemon);

        // Sauvegarder les utilisateurs
        await creator.save({ session });
        await proposer.save({ session });

        // Marquer l'offre comme complétée
        offer.status = 'completed';
        proposal.status = 'accepted';
        await offer.save({ session });

        await session.commitTransaction();

        res.json({ 
            success: true, 
            message: "Échange réussi !",
            receivedPokemon: {
                name: proposerPokemon.name,
                level: proposerPokemon.level,
                isShiny: proposerPokemon.isShiny
            }
        });

    } catch (e) {
        await session.abortTransaction();
        console.error("Erreur acceptation:", e);
        res.status(500).json({ error: "Erreur lors de l'échange" });
    } finally {
        session.endSession();
    }
});

// ==========================================
// 5. REFUSER UNE PROPOSITION
// ==========================================
app.post('/api/trade/reject', async (req, res) => {
    const { userId, offerId, proposalId } = req.body;

    if (!userId || !offerId || !proposalId) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
        const offer = await TradeOffer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: "Offre introuvable" });
        }

        if (offer.creatorId !== userId) {
            return res.status(403).json({ error: "Vous n'êtes pas le créateur de cette offre" });
        }

        const proposal = offer.proposals.find(p => p.proposalId === proposalId);
        if (!proposal) {
            return res.status(404).json({ error: "Proposition introuvable" });
        }

        proposal.status = 'rejected';
        await offer.save();

        res.json({ success: true, message: "Proposition refusée" });

    } catch (e) {
        console.error("Erreur refus:", e);
        res.status(500).json({ error: "Erreur lors du refus" });
    }
});

// ==========================================
// 6. ANNULER SON OFFRE
// ==========================================
app.delete('/api/trade/cancel/:offerId', async (req, res) => {
    const { offerId } = req.params;
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "UserId manquant" });
    }

    try {
        const offer = await TradeOffer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: "Offre introuvable" });
        }

        if (offer.creatorId !== userId) {
            return res.status(403).json({ error: "Vous n'êtes pas le créateur de cette offre" });
        }

        offer.status = 'cancelled';
        await offer.save();

        res.json({ success: true, message: "Offre annulée avec succès" });

    } catch (e) {
        console.error("Erreur annulation:", e);
        res.status(500).json({ error: "Erreur lors de l'annulation" });
    }
});

// ==========================================
// 7. MES OFFRES ET PROPOSITIONS
// ==========================================
app.get('/api/trade/my-activity/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Mes offres créées
        const myOffers = await TradeOffer.find({ 
            creatorId: userId,
            status: { $in: ['active', 'completed'] }
        }).sort({ createdAt: -1 });

        // Propositions que j'ai faites
        const myProposals = await TradeOffer.find({ 
            'proposals.proposerId': userId,
            status: 'active'
        }).sort({ createdAt: -1 });

        // Propositions reçues sur mes offres
        const receivedProposals = await TradeOffer.find({
            creatorId: userId,
            status: 'active',
            'proposals.status': 'pending'
        }).sort({ createdAt: -1 });

        res.json({ 
            myOffers,
            myProposals,
            receivedProposals 
        });

    } catch (e) {
        console.error("Erreur activité:", e);
        res.status(500).json({ error: "Erreur lors de la récupération de l'activité" });
    }
});

// ==========================================
// 8. NETTOYAGE AUTOMATIQUE DES OFFRES EXPIRÉES
// ==========================================
async function cleanExpiredOffers() {
    try {
        const result = await TradeOffer.updateMany(
            { 
                status: 'active',
                expiresAt: { $lt: new Date() }
            },
            { 
                $set: { status: 'cancelled' }
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`🧹 ${result.modifiedCount} offres expirées nettoyées`);
        }
    } catch (e) {
        console.error("Erreur nettoyage:", e);
    }
}

// Exécuter le nettoyage toutes les heures
setInterval(cleanExpiredOffers, 60 * 60 * 1000);
cleanExpiredOffers(); // Exécution au démarrage

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

async function generateRandomPokemon() {
    // --- CONFIGURATION CUSTOMS (Vaudou/Magma) ---
    const CUSTOM_CHANCE = 0.01; // 2% de chance
    const isCustomLucky = Math.random() < CUSTOM_CHANCE;

    if (isCustomLucky) {
        const variants = [
            { name: "Ectoplasma Vaudou", sprite: "gengar-voodoo.png" },
            { name: "Ectoplasma Magma", sprite: "gengar-magma.png" },
            { name: "Dracaufeu Magma", sprite: "dracaufeu-magma.png"},
            { name: "Evoli Magma", sprite: "evoli-magma.png"},
            { name: "Salameche Magma", sprite: "salameche-magma.png"},
            { name: "Bulbizarre Magma", sprite: "bulbizarre-magma.png"},
            { name: "Carapuce Magma", sprite: "carapuce-magma.png"},
            { name: "Mew Magma", sprite: "mew-magma.png"},
            { name: "Mewtwo Magma", sprite: "mewtow-magma.png"}
        ];
        const chosen = variants[Math.floor(Math.random() * variants.length)];
        const randomLevel = Math.floor(Math.random() * 31) + 70;
        
        return {
            pokedexId: 94, // ID d'Ectoplasma
            name: chosen.name,
            level: randomLevel,
            isShiny: false,
            isMega: false,
            isCustom: true, // IMPORTANT : pour le script.js
            customSprite: chosen.sprite, // IMPORTANT : nom du fichier
            iv_hp: 31, iv_attack: 31, iv_defense: 31, 
            iv_special_attack: 31, iv_special_defense: 31, iv_speed: 31
        };
    }

    // --- CONFIGURATION MÉGAS (Ton code actuel) ---
    const MEGA_CHANCE = 0.01; 
    const MEGA_IDS = [
        10033, 10034, 10035, 10036, 10037, 10038, 10039, 10040, 10041, 10042, 
        10043, 10044, 10045, 10046, 10047, 10048, 10049, 10050, 10051, 10052, 
        10053, 10054, 10055, 10056, 10057, 10058, 10059, 10060, 10061, 10062, 
        10063, 10064, 10065, 10066, 10067, 10068, 10069, 10070, 10071, 10072, 
        10073, 10074, 10075, 10076, 10077, 10078, 10079, 10087, 10088, 10089, 10090
    ];

    const isMegaLucky = Math.random() < MEGA_CHANCE;
    let pokedexId;
    let isMega = false;

    if (isMegaLucky) {
        pokedexId = MEGA_IDS[Math.floor(Math.random() * MEGA_IDS.length)];
        isMega = true;
    } else {
        pokedexId = getRandomInt(1, MAX_POKEDEX_ID_GEN_6);
    }

    // Statistiques et Shiny
    const level = isMega ? getRandomInt(50, 100) : getRandomInt(1, 100);
    const iv_hp = getRandomInt(0, 31);
    const iv_attack = getRandomInt(0, 31);
    const iv_defense = getRandomInt(0, 31);
    const iv_special_attack = getRandomInt(0, 31);
    const iv_special_defense = getRandomInt(0, 31);
    const iv_speed = getRandomInt(0, 31);
    const isShiny = getRandomInt(1, 100) === 1; 

    let pokemonName = 'Inconnu';
    try {
        const nameResponse = await axios.get(`${POKEAPI_BASE_URL}${pokedexId}`);
        let rawName = nameResponse.data.name;

        if (isMega) {
            let formattedName = rawName
                .replace('-mega', '')
                .replace('-x', ' X')
                .replace('-y', ' Y');
            formattedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
            pokemonName = "Méga-" + formattedName;
        } else {
            pokemonName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        }
    } catch (error) {
        console.error(`Erreur pour ID ${pokedexId}:`, error.message);
    }

    return {
        pokedexId,
        name: pokemonName, 
        level,
        isShiny,
        isMega,
        isCustom: false, // Pas un custom si on arrive ici
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

app.get('/ping', (req, res) => {
    res.status(200).json({ 
        status: 'alive', 
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Serveur API démarré sur le port ${PORT}`);
    console.log(`URL Publique: ${RENDER_API_PUBLIC_URL}`);
});

















