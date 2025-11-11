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
// Render doit avoir MONGO_URI configuré dans ses variables d'environnement
const mongoUri = process.env.MONGO_URI; 

// --- URLS PUBLIQUES (CORRIGÉES) ---
const RENDER_API_PUBLIC_URL = 'https://pokedex-online-pxmg.onrender.com';
const GITHUB_PAGES_URL = 'https://xezy-b2.github.io'; 


// --- 1. CONFIGURATION CORS (DOIT ÊTRE EN PREMIER) ---
// Autorise les requêtes de votre site GitHub Pages vers votre API Render
const corsOptions = {
    origin: [RENDER_API_PUBLIC_URL, GITHUB_PAGES_URL], 
    methods: 'GET', 
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 


// --- 2. CONNEXION MONGODB ---
if (!mongoUri) {
    console.error('❌ FATAL: La variable d\'environnement MONGO_URI n\'est pas définie. Le serveur ne démarrera pas sur Render.');
    // Force l'arrêt si pas de base de données en production
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


// --- 5. DÉMARRAGE DU SERVEUR ---

app.listen(PORT, () => {
    console.log(`🌍 Serveur web démarré sur le port ${PORT}`);
});