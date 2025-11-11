// webserver.js (MISE À JOUR CORS)
// ... (Début du fichier inchangé jusqu'à CORS)

// --- URLS PUBLIQUES (CORRIGÉES AVEC /Pokedex-Online) ---
const RENDER_API_PUBLIC_URL = 'https://pokedex-online-pxmg.onrender.com';
const GITHUB_PAGES_URL = 'https://xezy-b2.github.io/Pokedex-Online'; // URL Corrigée

// --- 2. CONFIGURATION EXPRESS & CORS ---
const corsOptions = {
    // 🔥 CORRECTION CORS : Autoriser les origines spécifiques à faire GET, POST, et envoyer les headers nécessaires (Content-Type)
    origin: [RENDER_API_PUBLIC_URL, GITHUB_PAGES_URL, 'https://xezy-b2.github.io'], // Ajout du domaine racine au cas où
    methods: 'GET, POST, OPTIONS', // Ajouter OPTIONS pour les requêtes pré-vol (POST/PUT)
    allowedHeaders: ['Content-Type'], // Autoriser l'envoi du JSON
    optionsSuccessStatus: 200 // Assurez-vous que le navigateur reçoit un 200 pour la vérification OPTIONS
};

app.use(cors(corsOptions)); 
app.use(express.json()); 

// ... (Reste du code webserver.js inchangé)
