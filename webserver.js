const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const User = require('./models/User.js');
const TradeOffer = require('./models/TradeOffer.js');
const DailyMissions = require('./models/DailyMissions.js');
const Battle = require('./models/Battle.js');

const app = express();
const PORT = process.env.PORT || 3000;
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
const MAX_POKEDEX_ID_GEN_7 = 809; // Alola
const MAX_POKEDEX_ID_GEN_8 = 905; // Galar
const MAX_POKEDEX_ID_GEN_9 = 1025; // Paldea
const MAX_POKEDEX_ID_GEN_10 = 1200; // Gen X (placeholder)

function generateBot(difficulty) {
    const botNames = [
        "Dresseur Novice", "Montagnard Pierre", "Scout Martin", "Campeur Alex",
        "Fillette Sophie", "Topdresseur Marc", "Kinésiste Luna", "Champion Léo",
        "Maître Karaté", "Sage Chen", "Expert Dragon", "Champion d'Arène"
    ];
    
    const difficultySettings = {
        easy: { levelRange: [10, 30], ivRange: [0, 15], shinyChance: 0.01, megaChance: 0 },
        medium: { levelRange: [30, 50], ivRange: [15, 25], shinyChance: 0.05, megaChance: 0.02 },
        hard: { levelRange: [50, 70], ivRange: [20, 30], shinyChance: 0.1, megaChance: 0.1 },
        expert: { levelRange: [70, 100], ivRange: [25, 31], shinyChance: 0.2, megaChance: 0.3 }
    };
    
    const settings = difficultySettings[difficulty] || difficultySettings.medium;
    const name = botNames[Math.floor(Math.random() * botNames.length)];
    
    // Pokémon aléatoire
    const pokedexId = Math.floor(Math.random() * 151) + 1; // Gen 1 uniquement pour les bots
    const level = Math.floor(Math.random() * (settings.levelRange[1] - settings.levelRange[0] + 1)) + settings.levelRange[0];
    
    // IVs aléatoires
    const ivs = {
        hp: Math.floor(Math.random() * (settings.ivRange[1] - settings.ivRange[0] + 1)) + settings.ivRange[0],
        attack: Math.floor(Math.random() * (settings.ivRange[1] - settings.ivRange[0] + 1)) + settings.ivRange[0],
        defense: Math.floor(Math.random() * (settings.ivRange[1] - settings.ivRange[0] + 1)) + settings.ivRange[0],
        spAttack: Math.floor(Math.random() * (settings.ivRange[1] - settings.ivRange[0] + 1)) + settings.ivRange[0],
        spDefense: Math.floor(Math.random() * (settings.ivRange[1] - settings.ivRange[0] + 1)) + settings.ivRange[0],
        speed: Math.floor(Math.random() * (settings.ivRange[1] - settings.ivRange[0] + 1)) + settings.ivRange[0]
    };
    
    const isShiny = Math.random() < settings.shinyChance;
    const isMega = Math.random() < settings.megaChance;
    
    // Nom du Pokémon (à récupérer depuis l'API ou hardcodé)
    const pokemonNames = {
        1: "Bulbizarre", 2: "Herbizarre", 3: "Florizarre", 4: "Salamèche", 5: "Reptincel",
        6: "Dracaufeu", 7: "Carapuce", 8: "Carabaffe", 9: "Tortank", 10: "Chenipan",
        11: "Chrysacier", 12: "Papilusion", 13: "Aspicot", 14: "Coconfort", 15: "Dardargnan",
        16: "Roucool", 17: "Roucoups", 18: "Roucarnage", 19: "Rattata", 20: "Rattatac",
        21: "Piafabec", 22: "Rapasdepic", 23: "Abo", 24: "Arbok", 25: "Pikachu",
        26: "Raichu", 27: "Sabelette", 28: "Sablaireau", 29: "Nidoran♀", 30: "Nidorina",
        31: "Nidoqueen", 32: "Nidoran♂", 33: "Nidorino", 34: "Nidoking", 35: "Mélofée",
        36: "Mélodelfe", 37: "Goupix", 38: "Feunard", 39: "Rondoudou", 40: "Grodoudou",
        41: "Nosferapti", 42: "Nosferalto", 43: "Mystherbe", 44: "Ortide", 45: "Rafflesia",
        46: "Paras", 47: "Parasect", 48: "Mimitoss", 49: "Aéromite", 50: "Taupiqueur",
        51: "Triopikeur", 52: "Miaouss", 53: "Persian", 54: "Psykokwak", 55: "Akwakwak",
        56: "Férosinge", 57: "Colossinge", 58: "Caninos", 59: "Arcanin", 60: "Ptitard",
        61: "Têtarte", 62: "Tartard", 63: "Abra", 64: "Kadabra", 65: "Alakazam",
        66: "Machoc", 67: "Machopeur", 68: "Mackogneur", 69: "Chétiflor", 70: "Boustiflor",
        71: "Empiflor", 72: "Tentacool", 73: "Tentacruel", 74: "Racaillou", 75: "Gravalanch",
        76: "Grolem", 77: "Ponyta", 78: "Galopa", 79: "Ramoloss", 80: "Flagadoss",
        81: "Magnéti", 82: "Magnéton", 83: "Canarticho", 84: "Doduo", 85: "Dodrio",
        86: "Otaria", 87: "Lamantine", 88: "Tadmorv", 89: "Grotadmorv", 90: "Kokiyas",
        91: "Crustabri", 92: "Fantominus", 93: "Spectrum", 94: "Ectoplasma", 95: "Onix",
        96: "Soporifik", 97: "Hypnomade", 98: "Krabby", 99: "Krabboss", 100: "Voltorbe",
        101: "Électrode", 102: "Nœunœuf", 103: "Noadkoko", 104: "Osselait", 105: "Ossatueur",
        106: "Kicklee", 107: "Tygnon", 108: "Excelangue", 109: "Smogo", 110: "Smogogo",
        111: "Rhinocorne", 112: "Rhinoféros", 113: "Leveinard", 114: "Saquedeneu", 115: "Kangaskhan",
        116: "Hypotrempe", 117: "Hypocéan", 118: "Poissirène", 119: "Poissoroy", 120: "Stari",
        121: "Staross", 122: "M. Mime", 123: "Insécateur", 124: "Lippoutou", 125: "Élektek",
        126: "Magmar", 127: "Scarabrute", 128: "Tauros", 129: "Magicarpe", 130: "Léviator",
        131: "Lokhlass", 132: "Métamorph", 133: "Évoli", 134: "Aquali", 135: "Voltali",
        136: "Pyroli", 137: "Porygon", 138: "Amonita", 139: "Amonistar", 140: "Kabuto",
        141: "Kabutops", 142: "Ptéra", 143: "Ronflex", 144: "Artikodin", 145: "Électhor",
        146: "Sulfura", 147: "Minidraco", 148: "Draco", 149: "Dracolosse", 150: "Mewtwo",
        151: "Mew"
    };
    
    const pokemonName = pokemonNames[pokedexId] || `Pokémon #${pokedexId}`;
    
    return {
        name,
        pokemon: {
            _id: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: pokemonName,
            pokedexId,
            level,
            isShiny,
            isMega,
            ivs
        }
    };
}

// Cache temporaire des bots générés par preview (userId → bot)
const botPreviewCache = new Map();

// ==========================================
// ROUTE : COMBATTRE UN BOT
// ==========================================
app.post('/api/battle/bot', async (req, res) => {
    const { userId, difficulty } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "UserId manquant" });
    }

    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({ error: "Difficulté invalide" });
    }

    try {
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }

        if (!user.companionPokemonId) {
            return res.status(400).json({ error: "Tu n'as pas de compagnon !" });
        }

        const playerPokemon = user.pokemons.id(user.companionPokemonId);
        if (!playerPokemon) {
            return res.status(404).json({ error: "Compagnon introuvable" });
        }

        // Utiliser le bot du preview si disponible, sinon en générer un nouveau
        const cachedBot = botPreviewCache.get(userId);
        const bot = (cachedBot && cachedBot.difficulty === difficulty) ? cachedBot.bot : generateBot(difficulty);
        botPreviewCache.delete(userId);

        // Calculer les puissances
        const playerPower = calculatePower(playerPokemon);
        const botPower = calculatePower(bot.pokemon);

        const player = {
            userId,
            username: user.username,
            pokemon: {
                _id: playerPokemon._id,
                name: playerPokemon.name,
                pokedexId: playerPokemon.pokedexId,
                level: playerPokemon.level,
                isShiny: playerPokemon.isShiny,
                isMega: playerPokemon.isMega,
                ivs: playerPokemon.ivs
            },
            power: playerPower
        };

        const botPlayer = {
            userId: 'bot',
            username: bot.name,
            pokemon: bot.pokemon,
            power: botPower
        };

        // Simuler le combat
        const result = simulateBattle(player, botPlayer);

        // Récompenses basées sur la difficulté
        const difficultyMultipliers = {
            easy: 0.5,
            medium: 1.0,
            hard: 1.5,
            expert: 2.0
        };

        const multiplier = difficultyMultipliers[difficulty];
        const isWinner = String(result.winner) === String(userId);

        const rewards = {
            money: isWinner 
                ? Math.floor((150 + Math.random() * 100) * multiplier) 
                : Math.floor((30 + Math.random() * 30) * multiplier),
            xp: isWinner 
                ? Math.floor((80 + Math.random() * 40) * multiplier) 
                : Math.floor((20 + Math.random() * 20) * multiplier)
        };

        // Donner les récompenses
        user.money += rewards.money;

        // Donner l'XP au compagnon
        if (user.companionPokemonId) {
            const companion = user.pokemons.id(user.companionPokemonId);
            if (companion) {
                companion.xp = (companion.xp || 0) + rewards.xp;
                const nextLevelXP = companion.level * 100;
                if (companion.xp >= nextLevelXP) {
                    companion.level += 1;
                    companion.xp = 0;
                    console.log(`[Battle] ${companion.name} monte au niveau ${companion.level} !`);
                }
            }
        }

        await user.save();

        // Sauvegarder le combat dans l'historique (optionnel)
        const battle = new Battle({
            player1: player,
            player2: botPlayer,
            winner: result.winner,
            battleLog: result.battleLog,
            rewards: {
                winner: { money: rewards.money, xp: rewards.xp },
                loser: { money: 0, xp: 0 }
            },
            status: 'completed',
            completedAt: new Date()
        });

        await battle.save();

        // Mettre à jour les missions (si système activé)
        if (isWinner && typeof updateMissionProgress === 'function') {
            await updateMissionProgress(userId, 'battle_bot', 1);
        }

        res.json({ 
            success: true, 
            isWinner,
            battle: {
                bot: bot.name,
                botPokemon: bot.pokemon.name,
                botLevel: bot.pokemon.level,
                botPower: botPower,
                winner: result.winner,
                battleLog: result.battleLog,
                rewards
            }
        });

    } catch (e) {
        console.error("Erreur combat bot:", e);
        res.status(500).json({ error: "Erreur lors du combat contre le bot" });
    }
});

// ==========================================
// ROUTE : OBTENIR UN APERÇU D'UN BOT (sans combattre)
// ==========================================
app.get('/api/battle/bot-preview/:difficulty', async (req, res) => {
    const { difficulty } = req.params;
    const { userId } = req.query;

    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({ error: "Difficulté invalide" });
    }

    try {
        const bot = generateBot(difficulty);
        const power = calculatePower(bot.pokemon);

        // Stocker le bot en cache si userId fourni
        if (userId) {
            botPreviewCache.set(userId, { bot, difficulty });
            setTimeout(() => botPreviewCache.delete(userId), 5 * 60 * 1000);
        }

        res.json({ 
            bot: {
                name: bot.name,
                pokemon: bot.pokemon,
                power
            }
        });

    } catch (e) {
        console.error("Erreur aperçu bot:", e);
        res.status(500).json({ error: "Erreur lors de la génération du bot" });
    }
});

console.log("✅ Système de combat contre bot chargé");

function calculatePower(pokemon, baseStats = []) {
    const level = pokemon.level || 5;
    const ivs = pokemon.ivs || {};
    
    // Moyenne des IVs (0-31)
    const avgIV = (
        (ivs.hp || 0) +
        (ivs.attack || 0) +
        (ivs.defense || 0) +
        (ivs.spAttack || 0) +
        (ivs.spDefense || 0) +
        (ivs.speed || 0)
    ) / 6;
    
    // Base stats moyenne (si disponible)
    let avgBaseStat = 75; // Valeur par défaut
    if (baseStats && baseStats.length > 0) {
        avgBaseStat = baseStats.reduce((sum, stat) => sum + stat.base_stat, 0) / baseStats.length;
    }
    
    // Bonus pour Shiny et Méga
    const shinyBonus = pokemon.isShiny ? 1.1 : 1.0; // +10%
    const megaBonus = pokemon.isMega ? 1.3 : 1.0; // +30%
    
    // Formule de puissance
    const power = Math.floor(
        (level * 2) + 
        (avgIV * 1.5) + 
        (avgBaseStat * 0.5)
    ) * shinyBonus * megaBonus;
    
    return power;
}

// ==========================================
// SIMULER UN COMBAT
// ==========================================
function simulateBattle(p1, p2) {
    const battleLog = [];
    
    battleLog.push(`⚔️ ${p1.username}'s ${p1.pokemon.name} (Lv.${p1.pokemon.level}) VS ${p2.username}'s ${p2.pokemon.name} (Lv.${p2.pokemon.level})`);
    battleLog.push(`💪 Puissance : ${p1.power} VS ${p2.power}`);
    
    // Bonus aléatoire (chance) : ±15%
    const p1Roll = p1.power * (0.85 + Math.random() * 0.3);
    const p2Roll = p2.power * (0.85 + Math.random() * 0.3);
    
    battleLog.push(`🎲 Avec le facteur chance : ${Math.floor(p1Roll)} VS ${Math.floor(p2Roll)}`);
    
    // Calcul des dégâts
    const p1Damage = Math.floor(p1Roll * (1 + Math.random() * 0.5));
    const p2Damage = Math.floor(p2Roll * (1 + Math.random() * 0.5));
    
    battleLog.push(`💥 ${p1.username} inflige ${p1Damage} dégâts !`);
    battleLog.push(`💥 ${p2.username} inflige ${p2Damage} dégâts !`);
    
    // Déterminer le gagnant
    let winner;
    if (p1Damage > p2Damage) {
        winner = p1.userId;
        battleLog.push(`🏆 ${p1.username}'s ${p1.pokemon.name} remporte le combat !`);
    } else if (p2Damage > p1Damage) {
        winner = p2.userId;
        battleLog.push(`🏆 ${p2.username}'s ${p2.pokemon.name} remporte le combat !`);
    } else {
        // Égalité → tirage au sort
        winner = Math.random() > 0.5 ? p1.userId : p2.userId;
        battleLog.push(`⚖️ Match nul ! Victoire aléatoire pour ${winner === p1.userId ? p1.username : p2.username} !`);
    }
    
    // Récompenses
    const rewards = {
        winner: {
            money: 200 + Math.floor(Math.random() * 100), // 200-300💰
            xp: 100 + Math.floor(Math.random() * 50) // 100-150 XP
        },
        loser: {
            money: 50 + Math.floor(Math.random() * 50), // 50-100💰
            xp: 25 + Math.floor(Math.random() * 25) // 25-50 XP
        }
    };
    
    return {
        winner,
        battleLog,
        rewards,
        p1Damage,
        p2Damage
    };
}

// ==========================================
// 1. DÉFIER UN JOUEUR
// ==========================================
app.post('/api/battle/challenge', async (req, res) => {
    const { challengerId, opponentId } = req.body;

    if (!challengerId || !opponentId) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    if (challengerId === opponentId) {
        return res.status(400).json({ error: "Tu ne peux pas te défier toi-même !" });
    }

    try {
        // Récupérer les deux joueurs
        const challenger = await User.findOne({ userId: challengerId });
        const opponent = await User.findOne({ userId: opponentId });

        if (!challenger || !opponent) {
            return res.status(404).json({ error: "Joueur introuvable" });
        }

        // Vérifier que les deux ont un compagnon
        if (!challenger.companionPokemonId) {
            return res.status(400).json({ error: "Tu n'as pas de compagnon !" });
        }

        if (!opponent.companionPokemonId) {
            return res.status(400).json({ error: "L'adversaire n'a pas de compagnon !" });
        }

        // Récupérer les compagnons
        const p1Pokemon = challenger.pokemons.id(challenger.companionPokemonId);
        const p2Pokemon = opponent.pokemons.id(opponent.companionPokemonId);

        if (!p1Pokemon || !p2Pokemon) {
            return res.status(404).json({ error: "Compagnon introuvable" });
        }

        // Calculer les puissances
        const p1Power = calculatePower(p1Pokemon);
        const p2Power = calculatePower(p2Pokemon);

        // Créer le défi
        const battle = new Battle({
            player1: {
                userId: challengerId,
                username: challenger.username,
                pokemon: {
                    _id: p1Pokemon._id,
                    name: p1Pokemon.name,
                    pokedexId: p1Pokemon.pokedexId,
                    level: p1Pokemon.level,
                    isShiny: p1Pokemon.isShiny,
                    isMega: p1Pokemon.isMega,
                    ivs: p1Pokemon.ivs
                },
                power: p1Power
            },
            player2: {
                userId: opponentId,
                username: opponent.username,
                pokemon: {
                    _id: p2Pokemon._id,
                    name: p2Pokemon.name,
                    pokedexId: p2Pokemon.pokedexId,
                    level: p2Pokemon.level,
                    isShiny: p2Pokemon.isShiny,
                    isMega: p2Pokemon.isMega,
                    ivs: p2Pokemon.ivs
                },
                power: p2Power
            },
            status: 'pending'
        });

        await battle.save();

        res.json({ 
            success: true, 
            message: `Défi envoyé à ${opponent.username} !`,
            battleId: battle._id
        });

    } catch (e) {
        console.error("Erreur défi:", e);
        res.status(500).json({ error: "Erreur lors de la création du défi" });
    }
});

// ==========================================
// 2. ACCEPTER UN DÉFI
// ==========================================
app.post('/api/battle/accept', async (req, res) => {
    const { userId, battleId } = req.body;

    if (!userId || !battleId) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
        const battle = await Battle.findById(battleId);
        if (!battle) {
            return res.status(404).json({ error: "Combat introuvable" });
        }

        if (battle.player2.userId !== userId) {
            return res.status(403).json({ error: "Ce n'est pas ton combat" });
        }

        if (battle.status !== 'pending') {
            return res.status(400).json({ error: "Ce combat n'est plus disponible" });
        }

        // Simuler le combat
        const result = simulateBattle(battle.player1, battle.player2);

        // Mettre à jour le combat
        battle.winner = result.winner;
        battle.battleLog = result.battleLog;
        battle.rewards = result.rewards;
        battle.player1.damage = result.p1Damage;
        battle.player2.damage = result.p2Damage;
        battle.status = 'completed';
        battle.completedAt = new Date();

        await battle.save();

        // Donner les récompenses
        const winner = await User.findOne({ userId: result.winner });
        const loser = await User.findOne({ 
            userId: result.winner === battle.player1.userId ? battle.player2.userId : battle.player1.userId 
        });

        if (winner) {
            winner.money += result.rewards.winner.money;
            await winner.save();
        }

        if (loser) {
            loser.money += result.rewards.loser.money;
            await loser.save();
        }

        // Mettre à jour les missions (si système XP activé)
        if (typeof updateMissionProgress === 'function') {
            await updateMissionProgress(result.winner, 'battle', 1);
        }

        res.json({ 
            success: true, 
            battle: {
                winner: result.winner,
                battleLog: result.battleLog,
                rewards: result.rewards
            }
        });

    } catch (e) {
        console.error("Erreur acceptation:", e);
        res.status(500).json({ error: "Erreur lors de l'acceptation du défi" });
    }
});

// ==========================================
// 3. REFUSER UN DÉFI
// ==========================================
app.post('/api/battle/decline', async (req, res) => {
    const { userId, battleId } = req.body;

    if (!userId || !battleId) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
        const battle = await Battle.findById(battleId);
        if (!battle) {
            return res.status(404).json({ error: "Combat introuvable" });
        }

        if (battle.player2.userId !== userId) {
            return res.status(403).json({ error: "Ce n'est pas ton combat" });
        }

        battle.status = 'declined';
        await battle.save();

        res.json({ success: true, message: "Défi refusé" });

    } catch (e) {
        console.error("Erreur refus:", e);
        res.status(500).json({ error: "Erreur lors du refus" });
    }
});

// ==========================================
// 4. MES COMBATS (en cours + historique)
// ==========================================
app.get('/api/battle/my-battles/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Défis reçus (en attente)
        const pendingChallenges = await Battle.find({
            'player2.userId': userId,
            status: 'pending'
        }).sort({ createdAt: -1 });

        // Défis envoyés (en attente)
        const sentChallenges = await Battle.find({
            'player1.userId': userId,
            status: 'pending'
        }).sort({ createdAt: -1 });

        // Historique (complétés)
        const battleHistory = await Battle.find({
            $or: [
                { 'player1.userId': userId },
                { 'player2.userId': userId }
            ],
            status: 'completed'
        })
        .sort({ completedAt: -1 })
        .limit(20);

        // Statistiques
        const totalBattles = await Battle.countDocuments({
            $or: [
                { 'player1.userId': userId },
                { 'player2.userId': userId }
            ],
            status: 'completed'
        });

        const victories = await Battle.countDocuments({
            winner: userId,
            status: 'completed'
        });

        const winRate = totalBattles > 0 ? Math.floor((victories / totalBattles) * 100) : 0;

        res.json({ 
            pendingChallenges,
            sentChallenges,
            battleHistory,
            stats: {
                totalBattles,
                victories,
                defeats: totalBattles - victories,
                winRate
            }
        });

    } catch (e) {
        console.error("Erreur récupération combats:", e);
        res.status(500).json({ error: "Erreur lors de la récupération des combats" });
    }
});

// ==========================================
// 5. LISTE DES JOUEURS DISPONIBLES POUR COMBAT
// ==========================================
app.get('/api/battle/available-opponents/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Récupérer les joueurs avec un compagnon (sauf soi-même)
        const opponents = await User.find({
            userId: { $ne: userId },
            companionPokemonId: { $ne: null }
        })
        .select('userId username companionPokemonId pokemons')
        .limit(20);

        // Enrichir avec les infos du compagnon
        const enrichedOpponents = opponents.map(opp => {
            const companion = opp.pokemons.id(opp.companionPokemonId);
            if (!companion) return null;

            return {
                userId: opp.userId,
                username: opp.username,
                companion: {
                    name: companion.name,
                    pokedexId: companion.pokedexId,
                    level: companion.level,
                    isShiny: companion.isShiny,
                    isMega: companion.isMega
                },
                power: calculatePower(companion)
            };
        }).filter(Boolean);

        res.json({ opponents: enrichedOpponents });

    } catch (e) {
        console.error("Erreur liste adversaires:", e);
        res.status(500).json({ error: "Erreur lors de la récupération des adversaires" });
    }
});

console.log("✅ Système de combats PvP chargé");

function generateDailyMissions() {
    // Pool de missions possibles
    const missionPool = [
        {
            type: 'capture',
            title: 'Chasseur du jour',
            description: 'Capture 3 Pokémon',
            target: 3,
            reward: { money: 500, pokeballs: 2 }
        },
        {
            type: 'capture',
            title: 'Collectionneur actif',
            description: 'Capture 5 Pokémon',
            target: 5,
            reward: { money: 1000, greatballs: 3 }
        },
        {
            type: 'trade',
            title: 'Échangeur mystère',
            description: 'Fais 1 Échange Miracle',
            target: 1,
            reward: { money: 300, pokeballs: 1 }
        },
        {
            type: 'trade',
            title: 'Maître du commerce',
            description: 'Réalise 2 échanges directs',
            target: 2,
            reward: { money: 800, ultraballs: 1 }
        },
        {
            type: 'gallery_post',
            title: 'Vedette du jour',
            description: 'Publie dans la Galerie',
            target: 1,
            reward: { money: 400, greatballs: 2 }
        },
        {
            type: 'sell_pokemon',
            title: 'Vendeur efficace',
            description: 'Vends 3 Pokémon',
            target: 3,
            reward: { money: 600, pokeballs: 3 }
        },
        {
            type: 'spend_money',
            title: 'Client fidèle',
            description: 'Dépense 1000💰 dans la boutique',
            target: 1000,
            reward: { money: 500, ultraballs: 1 }
        },
        {
            type: 'login_streak',
            title: 'Dresseur assidu',
            description: 'Connecte-toi 3 jours de suite',
            target: 3,
            reward: { money: 1500, masterballs: 1 }
        },
        {
            type: 'login_streak',
            title: 'Légende vivante',
            description: 'Connecte-toi 7 jours de suite',
            target: 7,
            reward: { money: 5000, masterballs: 2, ultraballs: 5 }
        },
        {
            type: 'battle',
            title: 'Premier sang',
            description: 'Remporte 1 combat contre un joueur',
            target: 1,
            reward: { money: 400, pokeballs: 2 }
        },
        {
            type: 'battle',
            title: 'Combattant',
            description: 'Remporte 3 combats contre des joueurs',
            target: 3,
            reward: { money: 900, greatballs: 2 }
        },
        {
            type: 'battle',
            title: 'Champion de l\'arène',
            description: 'Remporte 5 combats contre des joueurs',
            target: 5,
            reward: { money: 1800, ultraballs: 2 }
        },
        {
            type: 'battle_bot',
            title: 'Entraînement',
            description: 'Bats 1 bot Pokémon',
            target: 1,
            reward: { money: 300, pokeballs: 2 }
        },
        {
            type: 'battle_bot',
            title: 'Chasseur de bots',
            description: 'Bats 3 bots Pokémon',
            target: 3,
            reward: { money: 700, greatballs: 2 }
        },
        {
            type: 'battle_bot',
            title: 'Exterminateur',
            description: 'Bats 5 bots Pokémon',
            target: 5,
            reward: { money: 1500, ultraballs: 1, greatballs: 2 }
        }
    ];

    // Sélectionner 3-4 missions aléatoires
    const shuffled = missionPool.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3 + Math.floor(Math.random() * 2)); // 3 ou 4 missions

    return selected.map(m => ({
        type: m.type,
        title: m.title,
        description: m.description,
        target: m.target,
        current: 0,
        reward: m.reward,
        completed: false,
        claimed: false
    }));
}

// ==========================================
// 1. RÉCUPÉRER LES MISSIONS DU JOUR
// ==========================================
app.get('/api/missions/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let userMissions = await DailyMissions.findOne({ userId });

        // Si pas de missions ou missions d'hier → générer nouvelles missions
        if (!userMissions || new Date(userMissions.date).getTime() < today.getTime()) {
            
            // Calculer le streak
            let loginStreak = 1;
            if (userMissions && userMissions.lastLogin) {
                const lastLogin = new Date(userMissions.lastLogin);
                lastLogin.setHours(0, 0, 0, 0);
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                if (lastLogin.getTime() === yesterday.getTime()) {
                    // Connecté hier → incrémente le streak
                    loginStreak = (userMissions.loginStreak || 0) + 1;
                } else if (lastLogin.getTime() === today.getTime()) {
                    // Déjà connecté aujourd'hui → garde le streak
                    loginStreak = userMissions.loginStreak || 1;
                }
                // Sinon → reset à 1
            }

            // Créer ou mettre à jour les missions
            const newMissions = generateDailyMissions();

            if (userMissions) {
                userMissions.date = today;
                userMissions.missions = newMissions;
                userMissions.loginStreak = loginStreak;
                userMissions.lastLogin = new Date();
                await userMissions.save();
            } else {
                userMissions = new DailyMissions({
                    userId,
                    date: today,
                    missions: newMissions,
                    loginStreak,
                    lastLogin: new Date()
                });
                await userMissions.save();
            }

            // Mettre à jour la progression du streak
            const streakMission = userMissions.missions.find(m => m.type === 'login_streak');
            if (streakMission) {
                streakMission.current = loginStreak;
                if (streakMission.current >= streakMission.target) {
                    streakMission.completed = true;
                }
                await userMissions.save();
            }
        }

        res.json({ 
            missions: userMissions.missions,
            loginStreak: userMissions.loginStreak
        });

    } catch (e) {
        console.error("Erreur missions:", e);
        res.status(500).json({ error: "Erreur lors de la récupération des missions" });
    }
});

// ==========================================
// 2. RÉCLAMER UNE RÉCOMPENSE
// ==========================================
app.post('/api/missions/claim', async (req, res) => {
    const { userId, missionId } = req.body;

    if (!userId || !missionId) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    try {
        const userMissions = await DailyMissions.findOne({ userId });
        if (!userMissions) {
            return res.status(404).json({ error: "Missions introuvables" });
        }

        const mission = userMissions.missions.id(missionId);
        if (!mission) {
            return res.status(404).json({ error: "Mission introuvable" });
        }

        if (!mission.completed) {
            return res.status(400).json({ error: "Mission non complétée" });
        }

        if (mission.claimed) {
            return res.status(400).json({ error: "Récompense déjà réclamée" });
        }

        // Donner les récompenses
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({ error: "Utilisateur introuvable" });
        }

        user.money += mission.reward.money || 0;
        user.pokeballs += mission.reward.pokeballs || 0;
        user.greatballs += mission.reward.greatballs || 0;
        user.ultraballs += mission.reward.ultraballs || 0;
        user.masterballs += mission.reward.masterballs || 0;

        await user.save();

        // Marquer comme réclamée
        mission.claimed = true;
        await userMissions.save();

        res.json({ 
            success: true, 
            message: "Récompense réclamée !",
            rewards: mission.reward
        });

    } catch (e) {
        console.error("Erreur claim:", e);
        res.status(500).json({ error: "Erreur lors de la réclamation" });
    }
});

// ==========================================
// 3. ROUTE INTERNE : INCRÉMENTER LA PROGRESSION (appelée par le bot Discord)
// ==========================================
app.post('/api/missions/progress', async (req, res) => {
    const { userId, missionType, amount } = req.body;

    if (!userId || !missionType) {
        return res.status(400).json({ error: "Paramètres manquants" });
    }

    await updateMissionProgress(userId, missionType, amount || 1);
    res.json({ success: true });
});

// ==========================================
// 4. FONCTION INTERNE : INCRÉMENTER LA PROGRESSION
// ==========================================
async function updateMissionProgress(userId, missionType, amount = 1) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // On cherche uniquement par userId pour éviter les problèmes de comparaison de dates
        const userMissions = await DailyMissions.findOne({ userId });

        if (!userMissions) {
            console.log(`[Missions] Aucun document trouvé pour userId=${userId}`);
            return;
        }

        // Vérifier que les missions sont bien du jour
        const missionDate = new Date(userMissions.date);
        missionDate.setHours(0, 0, 0, 0);
        if (missionDate.getTime() < today.getTime()) {
            console.log(`[Missions] Missions périmées pour userId=${userId}, pas de mise à jour`);
            return;
        }

        // Trouver les missions du type concerné
        const missions = userMissions.missions.filter(m => m.type === missionType && !m.completed);
        console.log(`[Missions] userId=${userId} type=${missionType} amount=${amount} → ${missions.length} mission(s) trouvée(s)`);

        if (missions.length === 0) return;

        missions.forEach(mission => {
            mission.current = Math.min(mission.current + amount, mission.target);
            if (mission.current >= mission.target) {
                mission.completed = true;
            }
            console.log(`[Missions] "${mission.title}" → ${mission.current}/${mission.target} completed=${mission.completed}`);
        });

        await userMissions.save();
        console.log(`[Missions] Sauvegarde OK pour userId=${userId}`);
    } catch (e) {
        console.error("[Missions] Erreur update mission:", e);
    }
}

// Exposition globale après définition de la fonction
global.updateMissionProgress = updateMissionProgress;

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

        // Mise à jour mission "trade" pour les deux joueurs
        await updateMissionProgress(offer.creatorId, 'trade', 1);
        await updateMissionProgress(proposal.proposerId, 'trade', 1);

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
        pokedexId = getRandomInt(1, MAX_POKEDEX_ID_GEN_10);
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

        const capturedPokemons = (user.pokemons || []).sort((a, b) => {
            // Les classiques (non shiny, non méga, non custom) passent en premier
            const aIsSpecial = a.isShiny || a.isMega || a.isCustom ? 1 : 0;
            const bIsSpecial = b.isShiny || b.isMega || b.isCustom ? 1 : 0;
            return aIsSpecial - bIsSpecial;
        });
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

        for (let id = 1; id <= MAX_POKEDEX_ID_GEN_10; id++) {
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
    maxPokedexId: MAX_POKEDEX_ID_GEN_10,
    maxGen1Id: MAX_POKEDEX_ID_GEN_1, 
    maxGen2Id: MAX_POKEDEX_ID_GEN_2,
    maxGen3Id: MAX_POKEDEX_ID_GEN_3,
    maxGen4Id: MAX_POKEDEX_ID_GEN_4,
    maxGen5Id: MAX_POKEDEX_ID_GEN_5,
    maxGen6Id: MAX_POKEDEX_ID_GEN_6,
    maxGen7Id: MAX_POKEDEX_ID_GEN_7,
    maxGen8Id: MAX_POKEDEX_ID_GEN_8,
    maxGen9Id: MAX_POKEDEX_ID_GEN_9,
    maxGen10Id: MAX_POKEDEX_ID_GEN_10
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

        // Mise à jour mission "spend_money"
        await updateMissionProgress(userId, 'spend_money', totalCost);

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

        // Mise à jour mission "sell_pokemon"
        await updateMissionProgress(userId, 'sell_pokemon', 1);
        
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

        // Mise à jour mission "trade"
        await updateMissionProgress(userId, 'trade', 1);
        
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

        // Mise à jour mission "gallery_post"
        await updateMissionProgress(userId, 'gallery_post', 1);

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
