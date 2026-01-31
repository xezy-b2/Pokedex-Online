const API_BASE_URL = 'https://pokedex-online-pxmg.onrender.com';
const POKEAPI_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
const BALL_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';

let currentUserId = localStorage.getItem('currentUserId');
let currentUsername = localStorage.getItem('currentUsername');

// --- UTILITAIRE : GÉNÉRATION D'IMAGE (Gère Dracaufeu X/Y, Mewtwo X/Y et tous les Mégas Gen 1-6) ---
function getPokemonSprite(p) {
    const isShiny = p.isShiny;
    const isMega = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
    
    if (isMega) {
        let nameLower = p.name.toLowerCase();
        
        // Détection des formes X et Y (Dracaufeu / Mewtwo)
        let suffix = "";
        if (nameLower.includes(' x')) suffix = "x";
        if (nameLower.includes(' y')) suffix = "y";
        
        // Nettoyage du nom pour le mapping
        let baseName = nameLower
            .replace(/[éèêë]/g, 'e')
            .replace('méga-', '')
            .replace('mega-', '')
            .replace(' x', '')
            .replace(' y', '')
            .trim();

        // Dictionnaire complet des Mégas Gen 1 à 6
        const translations = { 
            // Gen 1
            "florizarre": "venusaur", "dracaufeu": "charizard", "tortank": "blastoise",
            "dardargnan": "beedrill", "roucarnage": "pidgeot", "alakazam": "alakazam",
            "flagadoss": "slowbro", "ectoplasma": "gengar", "kangourex": "kangaskhan",
            "scarabrute": "pinsir", "leviator": "gyarados", "ptera": "aerodactyl",
            "mewtwo": "mewtwo",
            // Gen 2
            "pharamp": "ampharos", "steelix": "steelix", "cizayox": "scizor",
            "scarhino": "heracross", "demolosse": "houndoom", "tyranocif": "tyranitar",
            // Gen 3
            "jungleko": "sceptile", "brasegali": "blaziken", "laggron": "swampert",
            "gardevoir": "gardevoir", "tenefix": "sableye", "mysdibule": "mawhile",
            "galeking": "aggron", "charmina": "medicham", "elecsprint": "manectric",
            "sharpedo": "sharpedo", "camerupt": "camerupt", "altaria": "altaria",
            "branette": "banette", "absol": "absol", "oniglali": "glalie",
            "drattak": "salamence", "metalosse": "metagross", "latias": "latias",
            "latios": "latios", "rayquaza": "rayquaza",
            // Gen 4
            "lockpin": "lopunny", "carchacrok": "garchomp", "lucario": "lucario",
            "blizzaroi": "abomasnow", "gallame": "gallade",
            // Gen 5
            "nanmeouie": "audino",
            // Gen 6
            "diancie": "diancie"
        };

        const englishName = translations[baseName] || baseName;
        const megaType = suffix ? `mega${suffix}` : `mega`;
        
        return `https://play.pokemonshowdown.com/sprites/ani${isShiny ? '-shiny' : ''}/${englishName}-${megaType}.gif`;
    }
    
    return `${POKEAPI_URL}${isShiny ? 'shiny/' : ''}${p.pokedexId}.png`;
}

// --- INITIALISATION ---
function initializeApp() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('discordId')) {
        currentUserId = urlParams.get('discordId');
        currentUsername = decodeURIComponent(urlParams.get('username'));
        localStorage.setItem('currentUserId', currentUserId);
        localStorage.setItem('currentUsername', currentUsername);
        history.pushState(null, '', window.location.pathname);
    }
    if (currentUserId) {
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('logged-in-user').style.display = 'flex';
        document.getElementById('logged-out-user').style.display = 'none';
        document.getElementById('display-username').textContent = currentUsername;
        loadPokedex();
    }
}

// --- NAVIGATION ---
function showPage(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`${id}-page`);
    if(target) target.classList.add('active');
    
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`nav-${id}`);
    if(btn) btn.classList.add('active');

    if(id === 'shop') loadShop();
    if(id === 'profile') loadProfile();
    if(id === 'pokedex' || id === 'collection') loadPokedex();
}

function filterGen(gen) {
    document.querySelectorAll('.gen-content').forEach(c => c.classList.remove('active'));
    const targetGen = document.getElementById(`gen-${gen}`);
    if(targetGen) targetGen.classList.add('active');
    document.querySelectorAll('#gen-tabs button').forEach(b => b.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
}

// --- LOGIQUE PRIX ---
function calculatePrice(p) {
    const levelBonus = (p.level || 5) * 5;
    const shinyBonus = p.isShiny ? 250 : 0;
    const totalIVs = (p.iv_hp || 0) + (p.iv_attack || 0) + (p.iv_defense || 0) + (p.iv_sp_attack || 0) + (p.iv_sp_defense || 0) + (p.iv_speed || 0);
    const ivBonus = Math.floor(totalIVs / 1.5); 
    return 50 + levelBonus + shinyBonus + ivBonus;
}

// --- RENDU DES CARTES ---
function createCard(p, mode = 'pokedex') {
    const isCaptured = p.isCaptured !== false;
    const isCompanion = p.isCompanion === true;
    const isMega = p.isMega === true;
    const price = calculatePrice(p);
    
    const img = getPokemonSprite(p);
    
    const ballKey = p.capturedWith || 'pokeball';
    const ballFileName = ballKey.replace('ball', '-ball') + '.png';
    const ballImgUrl = `${BALL_URL}${ballFileName}`;
    
    let html = `
        <div class="pokedex-card ${!isCaptured ? 'missing' : ''} ${p.isShiny ? 'is-shiny' : ''} ${isMega ? 'is-mega' : ''} ${isCompanion ? 'is-companion' : ''}">
            ${isCaptured ? `<button class="companion-btn ${isCompanion ? 'active' : ''}" onclick="setCompanion('${p._id}')" title="Définir comme compagnon">❤️</button>` : ''}
            
            <span style="font-size:0.7em; color:var(--text-sec); position:absolute; top:10px; right:10px;">#${p.pokedexId}</span>
            
            ${isMega ? `<span style="position:absolute; top:10px; left:10px; background:#ff00ff; color:white; font-size:0.6em; padding:2px 5px; border-radius:4px; font-weight:bold; z-index:10;">MÉGA</span>` : ''}
            
            <img src="${img}" 
                 class="poke-sprite" 
                 onerror="this.onerror=null; this.src='${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png';" 
                 style="${isMega ? 'width:100px; height:100px; object-fit:contain;' : ''}">
            
            <span class="pokemon-name" style="font-weight:bold;">${p.isShiny ? '✨ ' : ''}${p.name || '???'}</span>
            
            <div style="display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 5px;">
                <span style="color:var(--highlight); font-size:0.85em; font-weight:bold;">Lv.${p.level || 5}</span>
                ${isCaptured ? `<img src="${ballImgUrl}" style="width:20px; height:20px; margin:0;" title="${ballKey}">` : ''}
            </div>
    `;

    if (mode === 'collection' && isCaptured) {
        html += `
            <button class="btn-action btn-sell" onclick="sellPoke('${p._id}', '${p.name}', ${price})">Vendre (${price} 💰)</button>
            ${!p.isShiny && !isMega ? `<button class="btn-action btn-trade" onclick="wonderTrade('${p._id}', '${p.name}')">Miracle 🎲</button>` : ''}
        `;
    }
    return html + `</div>`;
}

async function loadPokedex() {
    try {
        const profRes = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const userProfile = await profRes.json();
        
        const comp = userProfile.companionPokemon;
        const companionId = comp ? comp._id : null;

        const compImg = document.getElementById('companion-img');
        const compName = document.getElementById('companion-name');

        if (comp && compImg) {
            const spriteUrl = getPokemonSprite(comp);
            compImg.src = spriteUrl; 
            compImg.style.display = 'block';
            compImg.onerror = function() {
                this.onerror = null;
                this.src = `${POKEAPI_URL}${comp.isShiny ? 'shiny/' : ''}${comp.pokedexId}.png`;
            };
            if (compName) compName.innerText = comp.name.toUpperCase();
        } else if (compImg) {
            compImg.style.display = 'none';
        }

        const res = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data = await res.json();
        
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const totals = { 1: 151, 2: 100, 3: 135, 4: 107, 5: 156, 6: 72 };
        const genNames = { 1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unys', 6: 'Kalos' };
        
        for(let i = 1; i <= 6; i++) {
            const grid = document.getElementById(`grid-${i}`);
            if(grid) grid.innerHTML = '';
        }

        data.fullPokedex.forEach(p => {
            let gen = (p.pokedexId <= 151) ? 1 : (p.pokedexId <= 251) ? 2 : (p.pokedexId <= 386) ? 3 : (p.pokedexId <= 493) ? 4 : (p.pokedexId <= 649) ? 5 : 6;
            if (p.isCaptured) {
                counts[gen]++;
                p.isCompanion = (p._id === companionId);
            }
            const grid = document.getElementById(`grid-${gen}`);
            if (grid) grid.innerHTML += createCard(p, 'pokedex');
        });

        document.querySelectorAll('#gen-tabs button').forEach((btn, i) => {
            const g = i + 1;
            btn.innerHTML = `Gen ${g} (${genNames[g]}) <br><small>${counts[g]}/${totals[g]}</small>`;
        });

        const sGrid = document.getElementById('shiny-grid');
        const mGrid = document.getElementById('mega-grid'); 
        const dGrid = document.getElementById('duplicate-grid');
        if(sGrid) sGrid.innerHTML = ''; if(mGrid) mGrid.innerHTML = ''; if(dGrid) dGrid.innerHTML = '';

        const keepers = new Set();
        data.capturedPokemonsList.forEach(p => {
            p.isCompanion = (p._id === companionId);
            if (p.isMega === true) {
                if(mGrid) mGrid.innerHTML += createCard(p, 'collection');
            } else if (p.isShiny) {
                if(sGrid) sGrid.innerHTML += createCard(p, 'collection');
            } else {
                if (keepers.has(p.pokedexId)) {
                    if(dGrid) dGrid.innerHTML += createCard(p, 'collection');
                } else {
                    keepers.add(p.pokedexId);
                }
            }
        });
    } catch (e) { console.error("Erreur loadPokedex :", e); }
}

async function setCompanion(pokemonId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/companion/set`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, pokemonId: pokemonId })
        });
        if(res.ok) {
            loadPokedex();
            if(document.getElementById('profile-page') && document.getElementById('profile-page').classList.contains('active')) loadProfile();
        } else {
            const data = await res.json();
            alert(data.message);
        }
    } catch (e) { console.error("Erreur setCompanion:", e); }
}

// --- LOGIQUE DAILY ---
function getCooldownTime(lastDailyDate) {
    if (!lastDailyDate) return null;
    const GIFT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
    const now = new Date();
    const lastDaily = new Date(lastDailyDate);
    const timeLeft = GIFT_COOLDOWN_MS - (now - lastDaily);
    if (timeLeft <= 0) return null;
    const hours = Math.floor(timeLeft / 3600000);
    const minutes = Math.floor((timeLeft % 3600000) / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
}

async function claimDaily() {
    const btn = document.getElementById('dailyBtn');
    if (btn) btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/daily/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
        });
        const data = await res.json();
        if (data.success) {
            alert(`🎁 ${data.message}\n${data.rewards}`);
            loadProfile(); 
        } else { alert(data.message); if(btn) btn.disabled = false; }
    } catch (e) { alert("Erreur lors de la récupération."); if(btn) btn.disabled = false; }
}

// --- PROFIL ---
// --- PROFIL ---
async function loadProfile() {
    const container = document.getElementById('profileContainer');
    if(!container) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        if (!res.ok) throw new Error("Erreur serveur");
        const user = await res.json();
        
        // --- CALCUL DES STATS SÉCURISÉ ---
        // On vérifie si user.pokemons existe, sinon on met un tableau vide pour éviter le crash
        const userPokes = user.pokemons || [];
        const totalUnique = new Set(userPokes.map(p => p.pokedexId)).size;
        const totalShiny = userPokes.filter(p => p.isShiny).length;
        const totalMega = userPokes.filter(p => p.isMega).length;

        // --- LOGIQUE DES BADGES ---
        const badges = [
            { 
                name: "Scout", 
                desc: "50 Pokémon différents", 
                unlocked: totalUnique >= 50, 
                icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/1.png" 
            },
            { 
                name: "Collectionneur", 
                desc: "150 Pokémon différents", 
                unlocked: totalUnique >= 150, 
                icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/3.png" 
            },
            { 
                name: "Maître Pokédex", 
                desc: "400 Pokémon différents", 
                unlocked: totalUnique >= 400, 
                icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/8.png" 
            },
            { 
                name: "Shiny Hunter", 
                desc: "5 Pokémon Shinies", 
                unlocked: totalShiny >= 5, 
                icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/badges/7.png" 
            },
            { 
                name: "Millionnaire", 
                desc: "100 000 💰", 
                unlocked: (user.money || 0) >= 100000, 
                icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/nugget.png" 
            },
            { 
                name: "Maître Méga", 
                desc: "Au moins une Méga-Évolution", 
                unlocked: totalMega >= 1, 
                icon: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mega-ring.png" 
            }
        ];

        let badgesHtml = `
            <div class="stat-box" style="text-align:center;">
                <h3 style="color:var(--highlight); margin-bottom:10px;">🏆 Badges d'Exploits</h3>
                <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; padding:10px; background:rgba(0,0,0,0.2); border-radius:10px;">
                    ${badges.map(b => `
                        <img src="${b.icon}" 
                             title="${b.name}: ${b.desc}" 
                             style="width:45px; height:45px; object-fit:contain; transition: transform 0.2s; ${b.unlocked ? 'filter: drop-shadow(0 0 5px gold);' : 'filter:grayscale(1) opacity(0.2);'}"
                             onmouseover="this.style.transform='scale(1.2)'" 
                             onmouseout="this.style.transform='scale(1)'">
                    `).join('')}
                </div>
            </div>
        `;

        let compHtml = '<p>Aucun compagnon</p>';
        if(user.companionPokemon) {
            const cp = user.companionPokemon;
            // Utilisation de ta fonction getPokemonSprite définie dans ton script
            const spriteSrc = typeof getPokemonSprite === "function" ? getPokemonSprite(cp) : `${POKEAPI_URL}${cp.isShiny ? 'shiny/' : ''}${cp.pokedexId}.png`;
            
            compHtml = `
                <div class="is-companion">
                    <img src="${spriteSrc}" 
                         class="poke-sprite" 
                         onerror="this.onerror=null; this.src='${POKEAPI_URL}${cp.isShiny ? 'shiny/' : ''}${cp.pokedexId}.png';"
                         style="width:120px; filter: drop-shadow(0 0 10px rgba(163, 51, 200, 0.5));">
                    <p style="color:var(--shiny); font-weight:bold; margin:0;">${cp.isShiny ? '✨ ' : ''}${cp.name}</p>
                    <p style="font-size:0.8em;">Niveau ${cp.level}</p>
                </div>
            `;
        }

        const cooldownText = getCooldownTime(user.lastDaily);
        const isOff = cooldownText !== null;

        container.innerHTML = `
            ${badgesHtml}
            <div class="stat-box" style="text-align:center;"><h3>Compagnon Actuel</h3>${compHtml}</div>
            <div class="stat-box" style="text-align:center;">
                <h2>💰 Portefeuille : ${(user.money || 0).toLocaleString()} 💰</h2>
                <button id="dailyBtn" onclick="claimDaily()" class="btn-action" 
                    ${isOff ? 'disabled' : ''} 
                    style="margin-top:15px; padding:12px; width:100%; max-width:250px; font-weight:bold; border-radius:8px; border:none; color:white; cursor:${isOff ? 'not-allowed' : 'pointer'}; background:${isOff ? '#333' : 'var(--highlight)'};">
                    ${isOff ? `⏳ Prochain cadeau dans :<br>${cooldownText}` : '🎁 RÉCUPÉRER MON CADEAU'}
                </button>
            </div>
            <div class="stat-box">
                <h3 style="text-align:center;">🎒 Inventaire des Balls</h3>
                <div class="ball-inventory">
                    <div class="ball-item"><img src="${BALL_URL}poke-ball.png"><br><b>x${user.pokeballs || 0}</b><br><small>Poké Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}great-ball.png"><br><b>x${user.greatballs || 0}</b><br><small>Super Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}ultra-ball.png"><br><b>x${user.ultraballs || 0}</b><br><small>Hyper Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}master-ball.png"><br><b>x${user.masterballs || 0}</b><br><small>Master Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}premier-ball.png"><br><b>x${user.premierballs || 0}</b><br><small>Honor Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}luxury-ball.png"><br><b>x${user.luxuryballs || 0}</b><br><small>Luxe Ball</small></div>
                    <div class="ball-item"><img src="${BALL_URL}safari-ball.png"><br><b>x${user.safariballs || 0}</b><br><small>Safari ball</small></div>
                    <div class="ball-item">
                        <img src="https://raw.githubusercontent.com/xezy-b2/Pokedex-Online/refs/heads/main/elbaball30retesttt.png" style="filter: hue-rotate(290deg) brightness(1.3); width:35px;">
                        <br><b>x${user.ellbaballs || 0}</b><br><small style="font-size:0.8em;">Ellba Ball</small>
                    </div>
                </div>
            </div>
        `;

        if (isOff) {
            const timer = setInterval(() => {
                const updatedTime = getCooldownTime(user.lastDaily);
                const dailyBtn = document.getElementById('dailyBtn');
                if (!updatedTime || !dailyBtn) {
                    if(dailyBtn) { 
                        dailyBtn.disabled = false; 
                        dailyBtn.style.background = 'var(--highlight)'; 
                        dailyBtn.innerHTML = '🎁 RÉCUPÉRER MON CADEAU'; 
                    }
                    clearInterval(timer);
                } else { 
                    dailyBtn.innerHTML = `⏳ Prochain cadeau dans :<br>${updatedTime}`; 
                }
            }, 1000);
        }
    } catch (e) { 
        console.error(e);
        container.innerHTML = "Erreur profil."; 
    }
}
async function loadShop() {
    const container = document.getElementById('shopContainer');
    const shopMoneySpan = document.getElementById('shop-money');
    if(!container) return;
    try {
        const profRes = await fetch(`${API_BASE_URL}/api/profile/${currentUserId}`);
        const user = await profRes.json();
        if (shopMoneySpan) shopMoneySpan.innerText = user.money.toLocaleString();

        const res = await fetch(`${API_BASE_URL}/api/shop`);
        const data = await res.json();
        const items = Array.isArray(data) ? data.reduce((acc, item) => ({...acc, [item.id || item.key]: item}), {}) : data;

        const getPrice = (keys) => {
            for (let key of keys) { if (items[key] && items[key].cost) return items[key].cost.toLocaleString(); }
            return "0";
        };

        const imgStyle = "width:35px; height:35px; object-fit:contain; display:block; margin: 10px auto;";
        const itemKeys = ['pokeball', 'greatball', 'ultraball', 'masterball', 'safariball', 'premierball', 'luxuryball'];
        const itemNames = ['Poké Ball', 'Super Ball', 'Hyper Ball', 'Master Ball', 'Safari Ball', 'Honor Ball', 'Luxe Ball'];
        
        let shopHtml = '';
        itemKeys.forEach((key, i) => {
            const ballImg = key.replace('ball', '-ball') + '.png';
            shopHtml += `
                <div class="pokedex-card">
                    <img src="${BALL_URL}${ballImg}" style="${imgStyle}">
                    <h3 style="font-size:1em; margin: 5px 0;">${itemNames[i]}</h3>
                    <p style="color:var(--shiny); font-weight:bold; margin-bottom: 10px;">${getPrice([key])} 💰</p>
                    <input type="number" id="qty-${key}" value="1" min="1" 
                           style="width:50px; background:#000; color:#fff; border:1px solid var(--border); border-radius:5px; margin-bottom:10px; text-align:center;">
                    <button onclick="buyItem('${key}', document.getElementById('qty-${key}').value)" 
                            class="btn-action btn-trade" style="width:100%">Acheter</button>
                </div>
            `;
        });
        container.innerHTML = shopHtml;
    } catch (e) { container.innerHTML = "<p>Erreur boutique.</p>"; }
}

// --- ACTIONS ---
async function sellPoke(id, name, price) {
    if(!confirm(`Vendre ${name} pour ${price} 💰 ?`)) return;
    const res = await fetch(`${API_BASE_URL}/api/sell/pokemon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToSell: id })
    });
    if(res.ok) loadPokedex();
}

async function sellAllDuplicates() {
    if(!confirm("Vendre tous tes doublons non-shiny ?")) return;
    const res = await fetch(`${API_BASE_URL}/api/sell/duplicates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
    });
    const data = await res.json();
    alert(data.message);
    if(res.ok) loadPokedex();
}

async function wonderTrade(id, name) {
    if(!confirm(`Envoyer ${name} en Échange Miracle ?`)) return;
    const res = await fetch(`${API_BASE_URL}/api/trade/wonder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, pokemonIdToTrade: id })
    });
    const data = await res.json();
    if(res.ok) {
        document.getElementById('modal-img').src = `${POKEAPI_URL}${data.newPokemon.isShiny ? 'shiny/' : ''}${data.newPokemon.pokedexId}.png`;
        document.getElementById('modal-text').innerHTML = `Vous avez reçu : <b>${data.newPokemon.name}</b> !`;
        document.getElementById('trade-modal').style.display = 'flex';
        loadPokedex();
    }
}

async function buyItem(key, qty) {
    const quantity = parseInt(qty);
    if (isNaN(quantity) || quantity <= 0) return alert("Quantité invalide");
    try {
        const res = await fetch(`${API_BASE_URL}/api/shop/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, itemKey: key, quantity: quantity })
        });
        const data = await res.json();
        if (!res.ok) alert("Erreur : " + (data.message || "Achat impossible"));
        else { alert(data.message); loadShop(); loadProfile(); }
    } catch (e) { console.error(e); }
}

function logout() { localStorage.clear(); location.reload(); }
document.addEventListener('DOMContentLoaded', initializeApp);


