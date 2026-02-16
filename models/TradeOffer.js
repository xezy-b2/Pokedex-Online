// models/TradeOffer.js

const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
    proposalId: { type: String, required: true },
    proposerId: { type: String, required: true },
    proposerUsername: { type: String, required: true },
    offeredPokemon: {
        _id: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        pokedexId: { type: Number, required: true },
        level: { type: Number, required: true },
        isShiny: { type: Boolean, default: false },
        isMega: { type: Boolean, default: false },
        isCustom: { type: Boolean, default: false }
    },
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) } // 48h
});

const tradeOfferSchema = new mongoose.Schema({
    creatorId: { type: String, required: true },
    creatorUsername: { type: String, required: true },
    
    // Pokémon proposé à l'échange
    offeredPokemon: {
        _id: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        pokedexId: { type: Number, required: true },
        level: { type: Number, required: true },
        isShiny: { type: Boolean, default: false },
        isMega: { type: Boolean, default: false },
        isCustom: { type: Boolean, default: false },
        customSprite: { type: String, default: null }
    },
    
    // Ce que le créateur recherche
    wantedPokemon: {
        name: { type: String, required: true },
        conditions: {
            minLevel: { type: Number, default: null },
            mustBeShiny: { type: Boolean, default: false },
            mustBeMega: { type: Boolean, default: false }
        }
    },
    
    message: { type: String, default: '' },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    
    proposals: [proposalSchema],
    
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 jours
});

// Index pour performance
tradeOfferSchema.index({ status: 1, createdAt: -1 });
tradeOfferSchema.index({ creatorId: 1 });
tradeOfferSchema.index({ 'wantedPokemon.name': 1 });

module.exports = mongoose.model('TradeOffer', tradeOfferSchema);
