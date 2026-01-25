// models/User.js

const mongoose = require('mongoose');

const pokemonSchema = new mongoose.Schema({
    name: { type: String, required: true },
    pokedexId: { type: Number, required: true },
    level: { type: Number, default: 5 },
    ivs: {
        hp: Number, attack: Number, defense: Number, 
        spAttack: Number, spDefense: Number, speed: Number
    },
    caughtAt: { type: Date, default: Date.now },
    isShiny: { type: Boolean, default: false }
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
    companionPokemonId: { type: mongoose.Schema.Types.ObjectId, default: null } 
});

module.exports = mongoose.model('User', userSchema);
