// webserver.js

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); 
// Assurez-vous que le chemin vers votre modèle est correct
const User = require('./models/User.js'); 

const app = express();
// Utilise le port fourni par Render (process.env.PORT) ou 3000 en local
const PORT = process.env.PORT || 3000; 

// --- SECRETS: LECTURE DES VARIABLES D'ENVIRONNEMENT ---
const mongoUri = process.env.MONGO_URI; 

// --- URLS PUBLIQUES (CORRIGÉES) ---
const RENDER_API_PUBLIC_URL = 'https://pokedex-online-pxmg.onrender.com';
const GITHUB_PAGES_URL = 'https://xezy-b2.github.io'; 


// --- 1. CONFIGURATION CORS (DOIT ÊTRE EN PREMIER) ---
const corsOptions = {
    origin: [RENDER_API_PUBLIC_URL, GITHUB_PAGES_URL], 
    methods: 'GET', 
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 


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


// --- 3. FICHIERS STATIQUES (Pour le test local) ---
app.use(express.static(path.join(__dirname, 'public')));


// --- 4. ROUTES API ---

// Route 1: Récupère les données brutes pour le Pokédex (liste de Pokémons)
app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('username pokemons');
        
        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." }); 
        }
        
        const fullPokedex = user.pokemons;
        const uniquePokedexIds = [...new Set(fullPokedex.map(p => p.pokedexId))];
        
        res.json({
            username: user.username,
            fullPokedex: fullPokedex,
            uniquePokedexCount: uniquePokedexIds.length
        });
    } catch (error) {
        console.error('Erreur API Pokédex:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});


// Route 2: Récupère les données de profil (Argent, Balls, Stats)
app.get('/api/profile/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        // On sélectionne TOUT sauf le tableau 'pokemons' complet et le champ de version Mongoose
        const user = await User.findOne({ userId: userId }).select('-pokemons -__v');
        
        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }
        
        // Calcule le nombre de Pokémons uniques et total (nécessite une petite agrégation, ou vous pouvez le calculer dans la route Pokédex et le stocker si vous voulez éviter l'agrégation)
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

        // Combine les données de l'utilisateur avec les stats calculées
        res.json({
            ...user.toObject(),
            stats: stats
        });
    } catch (error) {
        console.error('Erreur API Profil:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});


// --- 5. DÉMARRAGE DU SERVEUR ---

app.listen(PORT, () => {
    console.log(`🌍 Serveur web démarré sur le port ${PORT}`);
});
