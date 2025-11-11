// public/script.js

const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com'; 
const POKEAPI_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

let currentUserId = localStorage.getItem('currentUserId'); 
let currentUsername = localStorage.getItem('currentUsername');

// --- GESTION DE LA REDIRECTION OAUTH ET DE L'ÉTAT ---
function initializeApp() {
    // ... (Logique initializeApp inchangée) ...
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

function updateUIState(isLoggedIn) {
    // ... (Logique updateUIState inchangée) ...
    const loginLink = document.getElementById('discord-login-link');
    const loggedInUserDiv = document.getElementById('logged-in-user');
    const mainNav = document.getElementById('main-nav');
    const usernameDisplay = document.getElementById('username-display');
    
    if (isLoggedIn) {
        loginLink.style.display = 'none';
        loggedInUserDiv.style.display = 'flex';
        mainNav.style.display = 'flex';
        document.getElementById('display-username').textContent = currentUsername;
        usernameDisplay.innerHTML = `Dresseur Actuel : **${currentUsername}**`;
    } else {
        loginLink.style.display = 'block';
        loggedInUserDiv.style.display = 'none';
        mainNav.style.display = 'none';
        usernameDisplay.innerHTML = '';
    }
}

function logout() {
    // ... (Logique logout inchangée) ...
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUsername');
    currentUserId = null;
    currentUsername = null;
    
    updateUIState(false);
    showPage('pokedex'); 
    document.getElementById('pokedexContainer').innerHTML = '<p>Connectez-vous avec Discord pour charger votre Pokédex.</p>';
}

function showPage(pageName) {
    // ... (Logique showPage inchangée) ...
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    document.querySelectorAll('nav button').forEach(button => {
        button.classList.remove('active');
    });
    const navButton = document.getElementById(`nav-${pageName}`);
    if (navButton) navButton.classList.add('active');

    if (currentUserId) {
        if (pageName === 'pokedex') {
            loadPokedex(currentUserId);
        } else if (pageName === 'profile') {
            loadProfile(currentUserId);
        }
    }
    
    if (pageName === 'shop') {
        loadShop(); 
    }
}

// --- FONCTION D'ACHAT WEB (NOUVELLE) ---

async function buyItemWeb(itemKey, itemName, defaultQuantity = 1) {
    if (!currentUserId) {
        alert("Veuillez vous connecter avec Discord d'abord.");
        return;
    }
    
    const quantityInput = prompt(`Combien de ${itemName} voulez-vous acheter ? (Min: 1)`, defaultQuantity);
    
    if (quantityInput === null) return; // Annulation
    
    const quantity = parseInt(quantityInput);

    if (isNaN(quantity) || quantity < 1) {
        alert("Achat annulé ou quantité non valide.");
        return;
    }

    const errorContainer = document.getElementById('pokedex-error-container');
    errorContainer.innerHTML = `<p style="color: var(--highlight-color);">Achat de ${quantity} ${itemName} en cours... (Vérifiez votre solde)</p>`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/shop/buy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: currentUserId,
                itemKey: itemKey,
                quantity: quantity
            })
        });

        const data = await response.json();
        
        if (data.success) {
            alert(`✅ ${data.message} | Argent restant : ${data.newMoney.toLocaleString()} ₽`);
            errorContainer.innerHTML = `<p style="color: var(--highlight-color);">${data.message}</p>`;
            // Mise à jour du profil et du stock après l'achat réussi
            loadProfile(currentUserId); 
        } else {
            alert(`❌ Échec de l'achat : ${data.message}`);
            errorContainer.innerHTML = `<p style="color: var(--red-discord);">${data.message}</p>`;
        }
        
    } catch (error) {
        console.error('Erreur lors de l\'achat web:', error);
        errorContainer.innerHTML = '<p style="color: var(--red-discord);">Erreur Réseau lors de l\'achat. L\'API est-elle en ligne ?</p>';
    }
}


// --- FONCTION DE CHARGEMENT DE BOUTIQUE (MISE À JOUR) ---

async function loadShop() {
    const container = document.getElementById('shopContainer');
    container.innerHTML = 'Chargement de la boutique...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/shop`); 
        const items = await response.json();

        if (!response.ok) {
            container.innerHTML = '<p style="color: var(--red-discord);">Erreur: Impossible de charger les articles de la boutique.</p>';
            return;
        }

        let shopHtml = '';
        for (const [key, item] of Object.entries(items)) {
            const isExpensive = item.cost >= 1000;
            const borderStyle = `border: 2px solid ${isExpensive ? 'var(--shiny-color)' : 'var(--captured-border)'}`;
            
            const itemImageKey = key; 
            
            shopHtml += `
                <div class="pokedex-card shop-item" style="${borderStyle}">
                    <img src="${POKEAPI_SPRITE_URL}item/${itemImageKey}.png" alt="${item.name}" style="height: 64px; max-height: 64px;">
                    <div class="card-info" style="flex-direction: column; align-items: flex-start;">
                        <span class="pokemon-name">${item.name}</span>
                        <span class="pokedex-id">${item.cost.toLocaleString()} ₽</span>
                        <p style="font-size: 0.8em; color: var(--text-secondary); margin-top: 5px;">${item.desc.replace(/BotCoins/g, '₽')}</p>
                        <button 
                            style="margin-top: 10px; width: 100%;" 
                            onclick="buyItemWeb('${key}', '${item.name}', 1)"
                        >
                            Acheter via le site
                        </button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = shopHtml;

    } catch (error) {
        console.error('Erreur lors de la récupération de la boutique:', error);
        container.innerHTML = '<p style="color: var(--red-discord);">Erreur Réseau : Problème de connexion avec l\'API.</p>';
    }
}


// ... (loadProfile, loadPokedex, createPokedexCard, etc. inchangées)
// ... (Les autres fonctions loadProfile, loadPokedex sont inchangées)
// ... (Elles doivent être incluses dans le fichier final)
