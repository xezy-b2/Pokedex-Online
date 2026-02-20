// models/Battle.js

const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema({
    player1: {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        pokemon: {
            _id: { type: mongoose.Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            pokedexId: { type: Number, required: true },
            level: { type: Number, required: true },
            isShiny: { type: Boolean, default: false },
            isMega: { type: Boolean, default: false },
            ivs: {
                hp: Number,
                attack: Number,
                defense: Number,
                spAttack: Number,
                spDefense: Number,
                speed: Number
            }
        },
        power: { type: Number, required: true }, // Puissance calculée
        damage: { type: Number, default: 0 } // Dégâts infligés
    },
    player2: {
        userId: { type: String, required: true },
        username: { type: String, required: true },
        pokemon: {
            _id: { type: mongoose.Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            pokedexId: { type: Number, required: true },
            level: { type: Number, required: true },
            isShiny: { type: Boolean, default: false },
            isMega: { type: Boolean, default: false },
            ivs: {
                hp: Number,
                attack: Number,
                defense: Number,
                spAttack: Number,
                spDefense: Number,
                speed: Number
            }
        },
        power: { type: Number, required: true },
        damage: { type: Number, default: 0 }
    },
    
    winner: { type: String }, // userId du gagnant
    battleLog: [{ type: String }], // Historique du combat
    rewards: {
        winner: {
            money: { type: Number, default: 0 },
            xp: { type: Number, default: 0 }
        },
        loser: {
            money: { type: Number, default: 0 },
            xp: { type: Number, default: 0 }
        }
    },
    
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'completed', 'declined'], 
        default: 'pending' 
    },
    
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

// Index pour performance
battleSchema.index({ 'player1.userId': 1, status: 1 });
battleSchema.index({ 'player2.userId': 1, status: 1 });
battleSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Battle', battleSchema);
