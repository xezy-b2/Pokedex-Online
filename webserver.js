// webserver.js (VERSION FINALE POUR DÉPLOIEMENT RENDER.COM)

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); 
const axios = require('axios'); 
// Assurez-vous que le modèle User.js est présent dans votre répertoire
const User = require('./models/User.js'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// --- SECRETS: LECTURE DES VARIABLES D'ENVIRONNEMENT ---
// Assurez-vous que cette variable MONGO_URI est bien définie sur Render
const mongoUri = process.env.MONGO_URI; 

// --- URLS PUBLIQUES AUTORISÉES (CRITIQUE POUR CORS) ---
// L'URL Render de l'API elle-même
const RENDER_API_PUBLIC_URL = 'https://pokedex-online-pxmg.onrender.com';
// L'URL du Front-end sur GitHub Pages (doit correspondre à votre URL)
const GITHUB_PAGES_URL = 'https://xezy-b2.github.io'; 
// URLs locales (pour être complet)
const LOCAL_URL_VSCODE = 'http://127.0.0.1:5500'; 
const LOCAL_URL_STANDARD = 'http://localhost:5500'; 


// --- 1. CONFIGURATION CORS ---
const corsOptions = {
    // Les origines autorisées à faire des requêtes vers cette API
    origin: [RENDER_API_PUBLIC_URL, GITHUB_PAGES_URL, LOCAL_URL_VSCODE, LOCAL_URL_STANDARD], 
    methods: 'GET,POST', 
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions)); 

// --- 2. MIDDLEWARE JSON ---
app.use(express.json());

// --- 3. CONNEXION MONGODB ---
if (!mongoUri) {
    console.error('❌ FATAL: La variable d\'environnement MONGO_URI n\'est pas définie.');
    process.exit(1); 
}

mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connecté à MongoDB.'))
    .catch(err => {
        console.error('❌ Erreur de connexion MongoDB:', err.message);
    });

// --- 4. DÉFINITION DE LA BOUTIQUE ---
const POKEBALL_COST = 100;
const GREATBALL_COST = 300;
const ULTRABALL_COST = 800;
const MASTERBALL_COST = 15000; 
const SAFARIBALL_COST = 500;
const PREMIERBALL_COST = 150;
const LUXURYBALL_COST = 1000;

const SHOP_ITEMS = {
    'pokeball': { key: 'pokeballs', name: '🔴 Poké Ball', cost: POKEBALL_COST, promo: true, emoji: '🔴', desc: `Coût unitaire: ${POKEBALL_COST} BotCoins. Promotion: +1 ball spéciale par 10 achetées!` },
    'greatball': { key: 'greatballs', name: '🔵 Super Ball', cost: GREATBALL_COST, promo: false, emoji: '🔵', desc: `Coût: ${GREATBALL_COST} BotCoins. (1.5x Taux de capture)` },
    'ultraball': { key: 'ultraballs', name: '⚫ Hyper Ball', cost: ULTRABALL_COST, promo: false, emoji: '⚫', desc: `Coût: ${ULTRABALL_COST} BotCoins. (2x Taux de capture)` },
    'masterball': { key: 'masterballs', name: '✨ Master Ball', cost: MASTERBALL_COST, promo: false, emoji: '✨', desc: `Coût: ${MASTERBALL_COST} BotCoins. (Capture garantie)` },
    'safariball': { key: 'safariballs', name: '🟢 Safari Ball', cost: SAFARIBALL_COST, promo: false, emoji: '🟢', desc: `Coût: ${SAFARIBALL_COST} BotCoins. (Seulement en Safari Zone)` },
    'premierball': { key: 'premierballs', name: '⚪ Honor Ball', cost: PREMIERBALL_COST, promo: false, emoji: '⚪', desc: `Coût: ${PREMIERBALL_COST} BotCoins. (Style !)` },
    'luxuryball': { key: 'luxuryballs', name: '💎 Luxe Ball', cost: LUXURYBALL_COST, promo: false, emoji: '💎', desc: `Coût: ${LUXURYBALL_COST} BotCoins. (Augmente le bonheur)` },
};

function getRandomBonusBall() {
    const ballKeys = ['greatball', 'ultraball', 'safariball']; 
    const randomKey = ballKeys[Math.floor(Math.random() * ballKeys.length)];
    return SHOP_ITEMS[randomKey];
}


// --- 5. ROUTES API (CORRIGÉES POUR GÉRER LA CRÉATION D'UTILISATEUR SI INCONNU) ---

app.post('/api/shop/buy', async (req, res) => {
    try {
        const { userId, itemKey, quantity } = req.body;
        
        if (!userId || !itemKey || !quantity || typeof quantity !== 'number' || quantity < 1) {
            return res.status(400).json({ success: false, message: "Données d'achat invalides." });
        }
        
        const itemConfig = SHOP_ITEMS[itemKey];
        if (!itemConfig) {
            return res.status(404).json({ success: false, message: "Article non trouvé." });
        }

        const itemDBKey = itemConfig.key;
        const totalCost = itemConfig.cost * quantity;

        let user = await User.findOne({ userId: userId });
        
        if (!user) {
            // Création d'un utilisateur par défaut pour le web (avec de l'argent et un Pokémon de départ pour le test)
            user = new User({ userId: userId, username: `WebUser_${userId}`, money: 10000, pokeballs: 10, greatballs: 0, ultraballs: 0, masterballs: 0, safariballs: 0, premierballs: 0, luxuryballs: 0, pokemons: [{ pokedexId: 4, name: "Charmander", level: 5, isShiny: false }] });
            await user.save();
        }
        
        if (user.money < totalCost) {
            return res.status(402).json({ success: false, message: `Solde insuffisant. Il vous manque ${(totalCost - user.money).toLocaleString()} ₽.` });
        }

        user.money -= totalCost;
        user[itemDBKey] = (user[itemDBKey] || 0) + quantity;
        
        let bonusMessage = '';

        if (itemDBKey === 'pokeballs') { 
            const bonusCount = Math.floor(quantity / 10);
            if (bonusCount > 0) {
                let bonusBallsReceived = [];
                for (let i = 0; i < bonusCount; i++) {
                    const bonusBall = getRandomBonusBall();
                    user[bonusBall.key] = (user[bonusBall.key] || 0) + 1; 
                    bonusBallsReceived.push(bonusBall.name);
                }
                const tally = bonusBallsReceived.reduce((acc, name) => {
                    acc[name] = (acc[name] || 0) + 1;
                    return acc;
                }, {});
                const tallyList = Object.entries(tally).map(([name, count]) => `${count} ${name}`).join(', ');
                bonusMessage = ` (+ Bonus: ${tallyList})`;
            }
        }
        
        await user.save();
        
        res.json({ 
            success: true, 
            message: `Achat réussi de ${quantity} ${itemConfig.name} pour ${totalCost.toLocaleString()} ₽. ${bonusMessage}`,
            newMoney: user.money,
            newBallCount: user[itemDBKey]
        });

    } catch (error) {
        console.error('Erreur achat web:', error);
        res.status(500).json({ success: false, message: "Erreur interne du serveur lors de l'achat." });
    }
});

app.get('/api/pokedex/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        let user = await User.findOne({ userId: userId }).select('pokemons');
        
        if (!user) {
            // Crée un nouvel utilisateur si non trouvé (pour le test/démarrage)
            const newUser = new User({ 
                userId: userId, 
                username: `TestUser_${userId}`, 
                money: 10000, 
                pokeballs: 10, 
                pokemons: [{ pokedexId: 4, name: "Charmander", level: 5, isShiny: false }]
            });
            await newUser.save();
            user = newUser;
        }
        
        res.json({ pokemons: user.pokemons || [] });
    } catch (error) {
        console.error('Erreur API Pokédex:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});

app.get('/api/profile/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId }).select('-__v');
        
        if (!user) {
            return res.status(404).json({ message: "Dresseur non trouvé." });
        }
        
        // Simule le calcul des stats
        const totalCaptures = user.pokemons ? user.pokemons.length : 0;
        const uniqueCaptures = user.pokemons ? new Set(user.pokemons.map(p => p.pokedexId)).size : 0;
        
        const stats = {
            totalCaptures: totalCaptures,
            uniqueCaptures: uniqueCaptures
        };

        res.json({
            // Retire la liste complète des pokemons de la réponse du profil (mais garde le compte)
            ...user.toObject(),
            pokemons: undefined, 
            stats: stats
        });
    } catch (error) {
        console.error('Erreur API Profil:', error);
        res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
});


// Route de base
app.get('/', (req, res) => {
    res.send('Pokédex API is running.');
});


// --- 6. DÉMARRAGE DU SERVEUR ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}. URL API publique: ${RENDER_API_PUBLIC_URL}`);
});
```eof

### 2. script.js (Pour le Front-end sur GitHub Pages)

Ce fichier est configuré pour communiquer avec votre API déployée sur Render.

```{javascript:Client-Side Public Connection:script.js
// public/script.js (VERSION FINALE POUR DÉPLOIEMENT GITHUB PAGES)

// --- URL DE L'API PUBLIQUE ---
// L'URL Render de votre serveur API. C'est l'URL à utiliser pour les requêtes AJAX.
const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- FONCTIONS DE BASE ---

function updateUIState(loggedIn) {
    const loginBtn = document.getElementById('login-btn');
    const loggedInDiv = document.getElementById('logged-in-user');
    const usernameDisplay = document.getElementById('username-display');
    const mainNav = document.getElementById('main-nav');
    
    if (loggedIn && currentUsername) {
        loginBtn.style.display = 'none';
        loggedInDiv.style.display = 'block';
        document.getElementById('display-username').textContent = currentUsername;
        usernameDisplay.textContent = `Connecté en tant que: ${currentUsername} (ID: ${currentUserId})`;
        mainNav.style.display = 'flex'; 
    } else {
        loginBtn.style.display = 'block';
        loggedInDiv.style.display = 'none';
        usernameDisplay.textContent = '';
        mainNav.style.display = 'none'; 
        currentUserId = null;
        currentUsername = null;
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${pageId}-page`).classList.add('active');

    document.querySelectorAll('#main-nav button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`nav-${pageId}`).classList.add('active');

    if (currentUserId) {
        if (pageId === 'pokedex') {
            loadPokedex();
        } else if (pageId === 'profile') {
            loadProfile();
        } else if (pageId === 'shop') {
            loadShop(); 
        }
    } else {
         if (pageId === 'pokedex') {
            document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
        } else if (pageId === 'profile') {
            document.getElementById('profileContainer').innerHTML = '<h2>Veuillez vous connecter.</h2>';
        } else if (pageId === 'shop') {
             document.getElementById('shopContainer').innerHTML = '<p>Connectez-vous pour voir la boutique en ligne.</p>';
        }
    }
}

function logout() {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    updateUIState(false);
    showPage('pokedex'); 
}

// --- GESTION DE LA REDIRECTION OAUTH ET DE L'ÉTAT ---

function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('discordId');
    const usernameFromUrl = urlParams.get('username');
    
    if (idFromUrl) {
        currentUserId = idFromUrl;
        currentUsername = decodeURIComponent(usernameFromUrl);
        
        localStorage.setItem('currentUserId', currentUserId);
        localStorage.setItem('currentUsername', currentUsername);

        history.pushState(null, '', window.location.pathname); 
        updateUIState(true);
        showPage('pokedex'); 
        
    } 
    else if (currentUserId) {
        updateUIState(true);
        showPage('pokedex'); 
    }
    else {
        updateUIState(false);
        showPage('pokedex');
        document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
    }
}

// --- FONCTIONS POKEDEX/CARTE ---

function createPokedexCard(pokemon, count, isCaptured) {
    const isShiny = pokemon.isShiny || pokemon.isShinyFirstCapture;
    const borderStyle = isCaptured 
        ? (isShiny ? `border: 2px solid var(--shiny-color)` : `border: 2px solid var(--captured-border)`)
        : `border: 2px dashed var(--missing-border)`;
    
    const imageSource = isCaptured 
        ? `${POKEAPI_SPRITE_URL}${isShiny ? 'shiny/' : ''}${pokemon.pokedexId}.png`
        : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png`; 

    const nameDisplay = isCaptured 
        ? (isShiny ? `✨ ${pokemon.name}` : pokemon.name) 
        : `???`;
        
    const countDisplay = isCaptured && count > 1 ? `<span class="pokemon-count">x${count}</span>` : '';
    const levelDisplay = isCaptured && pokemon.level ? `<span class="pokemon-level">Lv.${pokemon.level}</span>` : '';
    
    const pokeId = pokemon.pokedexId.toString().padStart(3, '0');

    return `
        <div class="pokedex-card" style="${borderStyle}">
            <span class="pokedex-id">#${pokeId}</span>
            <img src="${imageSource}" alt="${pokemon.name || 'Inconnu'}" onerror="this.onerror=null; this.src='https://placehold.co/100x100/363636/ffffff?text=IMG'">
            <span class="pokemon-name">${nameDisplay}</span>
            ${countDisplay}
            ${levelDisplay}
        </div>
    `;
}

async function loadPokedex() {
    const container = document.getElementById('pokedexContainer');
    container.innerHTML = '<h2>Chargement du Pokédex...</h2><div class="spinner"></div>';
    document.getElementById('pokedex-error-container').innerHTML = ''; 

    try {
        const response = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        
        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) { /* non-JSON */ }
            throw new Error(errorData.message || `Erreur: Statut ${response.status}`);
        }
        
        const data = await response.json();
        const fullPokedex = data.pokemons; 

        let html = `
            <h2>Mon Pokédex</h2>
            <p>Total capturés (uniques) : <strong>${fullPokedex.length > 0 ? new Set(fullPokedex.map(p => p.pokedexId)).size : 0}</strong> / 151</p>`;
        
        const pokedexMap = new Map();
        fullPokedex.forEach(p => {
            const id = p.pokedexId;
            
            if (!pokedexMap.has(id)) {
                pokedexMap.set(id, {
                    ...p,
                    count: 1,
                    isShinyFirstCapture: p.isShiny,
                    isCaptured: true
                });
            } else {
                pokedexMap.get(id).count++;
                if (p.isShiny && !pokedexMap.get(id).isShinyFirstCapture) {
                    pokedexMap.get(id).isShinyFirstCapture = true;
                }
            }
        });

        const maxId = 151; 
        let pokedexGridHtml = '<div class="pokedex-grid">';
        
        for (let i = 1; i <= maxId; i++) { 
            const pokemonData = pokedexMap.get(i);
            
            if (pokemonData) {
                pokedexGridHtml += createPokedexCard(pokemonData, pokemonData.count, true);
            } else {
                pokedexGridHtml += createPokedexCard({ pokedexId: i, name: `N°${i}` }, 0, false);
            }
        }
        
        pokedexGridHtml += '</div>';
        container.innerHTML = html + pokedexGridHtml;

    } catch (error) {
        console.error('Erreur lors du chargement du Pokédex:', error);
        document.getElementById('pokedex-error-container').innerHTML = `<div class="error-message">❌ Erreur de connexion à l'API (${API_BASE_URL}). Détails: ${error.message}</div>`;
        container.innerHTML = '<p>Impossible de charger les données. Vérifiez l\'état de votre API.</p>';
    }
}

// --- FONCTIONS PROFIL ---

async function loadProfile() {
    const container = document.getElementById('profileContainer');
    container.innerHTML = '<h2>Chargement du Profil...</h2><div class="spinner"></div>';
    document.getElementById('profile-error-container').innerHTML = ''; 

    try {
        const response = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        
        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) { /* non-JSON */ }
            throw new Error(errorData.message || `Erreur: Statut ${response.status}`);
        }
        
        const user = await response.json();

        container.innerHTML = `
            <div class="profile-summary">
                <div class="profile-card">
                    <h3>Statistiques du Dresseur</h3>
                    <p><strong>ID Discord :</strong> ${user.userId}</p>
                    <p><strong>Nom d'utilisateur :</strong> ${user.username}</p>
                    <p><strong>BotCoins :</strong> <span class="money-amount">${(user.money || 0).toLocaleString()} ₽</span></p>
                </div>

                <div class="profile-card">
                    <h3>Statistiques Pokédex</h3>
                    <p><strong>Captures Uniques :</strong> ${user.stats.uniqueCaptures} / 151</p>
                    <p><strong>Total Capturés :</strong> ${user.stats.totalCaptures}</p>
                    <p><strong>Pokémons Shiny :</strong> (Non implémenté dans l'API)</p>
                </div>
            </div>

            <h3>Inventaire Poké Balls</h3>
            <div class="inventory-grid">
                <div class="inventory-item">🔴 Poké Balls: <strong>${(user.pokeballs || 0).toLocaleString()}</strong></div>
                <div class="inventory-item">🔵 Super Balls: <strong>${(user.greatballs || 0).toLocaleString()}</strong></div>
                <div class="inventory-item">⚫ Hyper Balls: <strong>${(user.ultraballs || 0).toLocaleString()}</strong></div>
                <div class="inventory-item">✨ Master Balls: <strong>${(user.masterballs || 0).toLocaleString()}</strong></div>
                <div class="inventory-item">🟢 Safari Balls: <strong>${(user.safariballs || 0).toLocaleString()}</strong></div>
                <div class="inventory-item">⚪ Honor Balls: <strong>${(user.premierballs || 0).toLocaleString()}</strong></div>
                <div class="inventory-item">💎 Luxe Balls: <strong>${(user.luxuryballs || 0).toLocaleString()}</strong></div>
            </div>
        `;

    } catch (error) {
        console.error('Erreur lors du chargement du Profil:', error);
        document.getElementById('profile-error-container').innerHTML = `<div class="error-message">❌ Erreur de connexion à l'API. Détails: ${error.message}</div>`;
        container.innerHTML = '<p>Impossible de charger les données du profil.</p>';
    }
}

// --- FONCTIONS BOUTIQUE ---

function loadShop() {
    const shopItems = {
        'pokeball': { key: 'pokeballs', name: '🔴 Poké Ball', cost: 100, promo: true, emoji: '🔴', desc: `Coût unitaire: 100 ₽. Promotion: 1 ball spéciale gratuite par 10 achetées!` },
        'greatball': { key: 'greatballs', name: '🔵 Super Ball', cost: 300, promo: false, emoji: '🔵', desc: `Coût: 300 ₽. (1.5x Taux de capture)` },
        'ultraball': { key: 'ultraballs', name: '⚫ Hyper Ball', cost: 800, promo: false, emoji: '⚫', desc: `Coût: 800 ₽. (2x Taux de capture)` },
        'masterball': { key: 'masterballs', name: '✨ Master Ball', cost: 15000, promo: false, emoji: '✨', desc: `Coût: 15,000 ₽. (Capture garantie)` },
        'safariball': { key: 'safariballs', name: '🟢 Safari Ball', cost: 500, promo: false, emoji: '🟢', desc: `Coût: 500 ₽. (Utilisation limitée à la Zone Safari)` },
        'premierball': { key: 'premierballs', name: '⚪ Honor Ball', cost: 150, promo: false, emoji: '⚪', desc: `Coût: 150 ₽. (Pour le style !)` },
        'luxuryball': { key: 'luxuryballs', name: '💎 Luxe Ball', cost: 1000, promo: false, emoji: '💎', desc: `Coût: 1,000 ₽. (Augmente le bonheur)` },
    };

    const container = document.getElementById('shopContainer');
    let html = '<div class="shop-grid">';

    for (const key in shopItems) {
        const item = shopItems[key];
        
        const buyInterface = currentUserId ? 
            `<div class="buy-controls">
                <input type="number" id="qty-${key}" min="1" value="1" placeholder="Qté" class="quantity-input">
                <button onclick="buyItem('${key}')" class="buy-btn">Acheter</button>
            </div>` : `<p>Connectez-vous pour acheter.</p>`;
            
        const promoBadge = item.promo ? '<span class="promo-badge">PROMO</span>' : '';

        html += `
            <div class="shop-card">
                ${promoBadge}
                <h3>${item.emoji} ${item.name}</h3>
                <p>${item.desc}</p>
                <div class="shop-price">Prix: <strong>${item.cost.toLocaleString()} ₽</strong></div>
                ${buyInterface}
            </div>
        `;
    }

    html += '</div>';
    html += '<div id="shop-message" class="shop-message"></div>'; 
    container.innerHTML = html;
}

async function buyItem(itemKey) {
    if (!currentUserId) {
        document.getElementById('shop-message').textContent = 'Veuillez vous connecter pour effectuer un achat.';
        return;
    }

    const qtyInput = document.getElementById(`qty-${itemKey}`);
    const qty = parseInt(qtyInput.value);
    const messageContainer = document.getElementById('shop-message');

    if (isNaN(qty) || qty < 1) {
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Veuillez entrer une quantité valide (minimum 1).';
        return;
    }

    messageContainer.style.color = 'var(--text-color)';
    messageContainer.textContent = 'Transaction en cours...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                itemKey: itemKey,
                quantity: qty
            })
        });

        const data = await response.json();

        if (response.ok) {
            messageContainer.style.color = 'var(--highlight-color)'; 
            messageContainer.textContent = data.message;
            
            if (document.getElementById('profile-page').classList.contains('active')) {
                loadProfile(); 
            }

        } else {
            messageContainer.style.color = 'var(--red-discord)'; 
            messageContainer.textContent = data.message || `Erreur: Statut ${response.status}.`;
        }

    } catch (error) {
        console.error('Erreur lors de l\'achat:', error);
        messageContainer.style.color = 'var(--red-discord)';
        messageContainer.textContent = 'Erreur de connexion au serveur API.';
    }
}

// --- INITIALISATION ---
window.onload = initializeApp;
```eof
