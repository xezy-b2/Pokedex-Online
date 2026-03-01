// models/User.js

const mongoose = require('mongoose');

const pokemonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    pokedexId: { type: Number, required: true },
    level: { type: Number, default: 5 },
    xp: { type: Number, default: 0 },
    capturedWith: { type: String, default: 'pokeball' },
    ivs: {
        hp: Number, attack: Number, defense: Number, 
        spAttack: Number, spDefense: Number, speed: Number
    },
    caughtAt: { type: Date, default: Date.now },
    isShiny: { type: Boolean, default: false },
    isMega: { type: Boolean, default: false },
    form: { type: String, default: null },
    isCustom: { type: Boolean, default: false },
    customSprite: { type: String, default: null }
});

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    pokemons: [pokemonSchema],
    money: { type: Number, default: 1000 }, 
    // 🔥 AJOUT DE TOUTES LES POKÉ BALLS
    pokeballs: { type: Number, default: 5 },    
    greatballs: { type: Number, default: 0 },   
    ultraballs: { type: Number, default: 0 },   
    masterballs: { type: Number, default: 0 },  
    safariballs: { type: Number, default: 0 },  
    premierballs: { type: Number, default: 0 }, 
    luxuryballs: { type: Number, default: 0 },
    ellbaballs: { type: Number, default: 1 },
    lastDaily: { type: Date, default: null }, 
    dailyNotified: { type: Boolean, default: false },
    companionPokemonId: { type: mongoose.Schema.Types.ObjectId, default: null },
    favorites: { type: [String], default: [] },
    
    // 👤 PROFILS PUBLICS
    profileSettings: {
        visibility: { 
            type: String, 
            enum: ['public', 'friends_only', 'private'], 
            default: 'public' 
        },
        collectionVisibility: { 
            type: String, 
            enum: ['public', 'friends_only', 'hidden'], 
            default: 'public' 
        },
        combatStatsVisible: { type: Boolean, default: true },
        wallEnabled: { type: Boolean, default: true }
    },
    
    companionMessage: { type: String, maxlength: 100, default: null },
    
    wallPosts: [{
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        authorId: String,
        authorUsername: String,
        message: { type: String, maxlength: 200 },
        likes: [String],
        createdAt: { type: Date, default: Date.now }
    }],
    
    activityLog: [{
        type: { 
            type: String, 
            enum: ['capture', 'capture_shiny', 'battle_win', 'trade', 'gallery_post', 'evolution']
        },
        description: String,
        timestamp: { type: Date, default: Date.now }
    }],
    
    discordAvatar: String,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
