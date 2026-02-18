// models/DailyMissions.js

const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema({
    type: { 
        type: String, 
        required: true,
        enum: ['capture', 'trade', 'login_streak', 'gallery_post', 'spend_money', 'sell_pokemon']
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    target: { type: Number, required: true }, // Objectif à atteindre
    current: { type: Number, default: 0 }, // Progression actuelle
    reward: {
        money: { type: Number, default: 0 },
        pokeballs: { type: Number, default: 0 },
        greatballs: { type: Number, default: 0 },
        ultraballs: { type: Number, default: 0 },
        masterballs: { type: Number, default: 0 }
    },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false } // Récompense récupérée ?
});

const dailyMissionsSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    date: { type: Date, default: Date.now }, // Date de génération des missions
    missions: [missionSchema],
    loginStreak: { type: Number, default: 0 }, // Jours consécutifs
    lastLogin: { type: Date, default: null }
});

// Index pour performance
dailyMissionsSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('DailyMissions', dailyMissionsSchema);
