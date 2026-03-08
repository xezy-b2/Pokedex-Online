// ==========================================
// ⚔️ SYSTÈME DE COMBATS PVP
// ==========================================

let battleData = null;

// ==========================================
// 🎯 SÉLECTEUR DE POKÉMON PVP (modal partagé)
// Utilisé pour "Défier" et "Accepter"
// ==========================================
let _pvpPokemonCallback = null; // fonction appelée après sélection

async function openPvpPokemonModal(titleText, callback) {
    if (!currentUserId) return alert("Connecte-toi d'abord !");

    _pvpPokemonCallback = callback;

    try {
        const res      = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data     = await res.json();
        const captured = data.capturedPokemonsList || [];

        if (captured.length === 0) return alert("❌ Tu n'as aucun Pokémon capturé !");

        const modal = document.getElementById('pvp-pokemon-modal');
        const grid  = document.getElementById('pvp-pokemon-grid');

        // Titre
        const titleEl = document.getElementById('pvp-pokemon-modal-title');
        if (titleEl) titleEl.textContent = titleText;

        // ---- Filtres ----
        let filterBar = document.getElementById('pvp-pokemon-filters');
        if (!filterBar) {
            filterBar = document.createElement('div');
            filterBar.id = 'pvp-pokemon-filters';
            filterBar.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
            grid.parentNode.insertBefore(filterBar, grid);
        }

        function pvpBtnStyle(filter, isActive) {
            const palette = {
                all:    { bg: '#555', fg: '#fff' },
                shiny:  { bg: '#f0c040', fg: '#1a1a2e' },
                mega:   { bg: '#ff00ff', fg: '#fff' },
                custom: { bg: '#00cfff', fg: '#1a1a2e' },
            };
            const c = palette[filter] || palette.all;
            return `padding:5px 14px;border-radius:20px;border:none;cursor:pointer;font-size:0.85em;font-weight:bold;
                    background:${isActive ? c.bg : 'var(--bg-secondary,#2a1f1a)'};
                    color:${isActive ? c.fg : 'var(--text-secondary,#aaa)'};
                    transition:all 0.2s;`;
        }

        filterBar.innerHTML = `
            <button data-filter="all"    onclick="setPvpFilter('all')">Tous</button>
            <button data-filter="shiny"  onclick="setPvpFilter('shiny')">✨ Shiny</button>
            <button data-filter="mega"   onclick="setPvpFilter('mega')">🔮 Méga</button>
            <button data-filter="custom" onclick="setPvpFilter('custom')">🌀 WTF</button>
        `;

        // ---- Recherche ----
        let searchBar = document.getElementById('pvp-pokemon-search');
        if (!searchBar) {
            searchBar = document.createElement('input');
            searchBar.id = 'pvp-pokemon-search';
            searchBar.type = 'text';
            searchBar.placeholder = '🔍 Rechercher un Pokémon...';
            searchBar.style.cssText = `
                width:100%;padding:10px 14px;margin-bottom:12px;
                border-radius:8px;border:1px solid var(--border-color,#ccc);
                background:var(--bg-secondary,#1a1a2e);color:var(--text-primary,#fff);
                font-size:1em;box-sizing:border-box;
            `;
            grid.parentNode.insertBefore(searchBar, grid);
        }
        searchBar.value = '';

        // ---- Rendu grille ----
        function renderPvpGrid(nameFilter = '', typeFilter = 'all') {
            filterBar.querySelectorAll('button').forEach(btn => {
                btn.style.cssText = pvpBtnStyle(btn.dataset.filter, btn.dataset.filter === typeFilter);
            });

            let list = captured;
            if (nameFilter) list = list.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()));
            if (typeFilter === 'shiny')  list = list.filter(p => p.isShiny === true);
            if (typeFilter === 'mega')   list = list.filter(p => p.isMega === true || (p.name && p.name.toLowerCase().includes('méga')));
            if (typeFilter === 'custom') list = list.filter(p => p.isCustom === true);

            if (list.length === 0) {
                grid.innerHTML = `<div style="color:var(--text-secondary);text-align:center;padding:30px;width:100%;">Aucun Pokémon trouvé 😔</div>`;
                return;
            }

            grid.innerHTML = list.map(p => {
                const sprite   = (typeof getPokemonSprite === 'function') ? getPokemonSprite(p) : _getPvpSprite(p);
                const isMega   = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
                const isCustom = p.isCustom === true;
                let label = '';
                if (p.isShiny) label += '✨ ';
                if (isMega)    label += '🔮 ';
                if (isCustom)  label += '🌀 ';
                label += p.name;

                return `
                <div class="pokedex-card pokemon-selectable ${p.isShiny ? 'is-shiny' : ''} ${isMega ? 'is-mega' : ''} ${isCustom ? 'is-custom' : ''}"
                     onclick="confirmPvpPokemon(${JSON.stringify(p).replace(/"/g, '&quot;')})"
                     style="cursor:pointer;position:relative;">
                    ${isMega   ? `<span style="position:absolute;top:4px;left:4px;background:#ff00ff;color:white;font-size:0.55em;padding:1px 5px;border-radius:4px;font-weight:bold;z-index:10;">MÉGA</span>` : ''}
                    ${isCustom ? `<span style="position:absolute;top:4px;left:4px;background:#00cfff;color:#1a1a2e;font-size:0.55em;padding:1px 5px;border-radius:4px;font-weight:bold;z-index:10;">WTF</span>` : ''}
                    <img src="${sprite}" class="poke-sprite" loading="lazy"
                         onerror="this.onerror=null;this.src='${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png';"
                         style="width:80px;height:80px;object-fit:contain;margin:0 auto;">
                    <span class="pokemon-name">${label}</span>
                    <div style="color:var(--accent-warm);font-size:0.85em;">Lv.${p.level}</div>
                </div>`;
            }).join('');
        }

        window._pvpTypeFilter    = 'all';
        window._pvpNameFilter    = '';
        window._renderPvpGrid    = renderPvpGrid;
        window._pvpBtnStyleFn    = pvpBtnStyle;

        searchBar.oninput = (e) => {
            window._pvpNameFilter = e.target.value;
            renderPvpGrid(window._pvpNameFilter, window._pvpTypeFilter);
        };

        renderPvpGrid();
        modal.classList.add('active');
        setTimeout(() => searchBar.focus(), 100);

    } catch (e) {
        console.error("Erreur chargement Pokémon:", e);
        alert("❌ Erreur lors du chargement de ta collection");
    }
}

function setPvpFilter(filter) {
    window._pvpTypeFilter = filter;
    if (window._renderPvpGrid) {
        window._renderPvpGrid(window._pvpNameFilter || '', filter);
    }
}

function confirmPvpPokemon(p) {
    closePvpPokemonModal();
    if (typeof _pvpPokemonCallback === 'function') {
        _pvpPokemonCallback(p);
    }
}

function closePvpPokemonModal() {
    document.getElementById('pvp-pokemon-modal')?.classList.remove('active');
    _pvpPokemonCallback = null;
}

// Fallback sprite local
function _getPvpSprite(p) {
    if (p.isCustom && p.customSprite) return `assets/sprites/custom/${p.customSprite}`;
    const isShiny = p.isShiny;
    const isMega  = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
    if (isMega) {
        let nameLower = p.name.toLowerCase();
        let suffix = "";
        if (nameLower.includes(' x')) suffix = "x";
        if (nameLower.includes(' y')) suffix = "y";
        let baseName = nameLower.replace(/[éèêë]/g, 'e').replace('méga-','').replace('mega-','').replace(' x','').replace(' y','').trim();
        const tr = {
            "florizarre":"venusaur","dracaufeu":"charizard","tortank":"blastoise","dardargnan":"beedrill",
            "roucarnage":"pidgeot","alakazam":"alakazam","flagadoss":"slowbro","ectoplasma":"gengar",
            "kangourex":"kangaskhan","scarabrute":"pinsir","leviator":"gyarados","ptera":"aerodactyl",
            "mewtwo":"mewtwo","pharamp":"ampharos","steelix":"steelix","cizayox":"scizor",
            "scarhino":"heracross","demolosse":"houndoom","tyranocif":"tyranitar","jungleko":"sceptile",
            "brasegali":"blaziken","laggron":"swampert","gardevoir":"gardevoir","tenefix":"sableye",
            "mysdibule":"mawhile","galeking":"aggron","charmina":"medicham","elecsprint":"manectric",
            "sharpedo":"sharpedo","camerupt":"camerupt","altaria":"altaria","branette":"banette",
            "absol":"absol","oniglali":"glalie","drattak":"salamence","metalosse":"metagross",
            "latias":"latias","latios":"latios","rayquaza":"rayquaza","lockpin":"lopunny",
            "carchacrok":"garchomp","lucario":"lucario","blizzaroi":"abomasnow","gallame":"gallade",
            "nanmeouie":"audino","diancie":"diancie"
        };
        const en = tr[baseName] || baseName;
        return `https://play.pokemonshowdown.com/sprites/ani${isShiny ? '-shiny' : ''}/${en}-${suffix ? 'mega'+suffix : 'mega'}.gif`;
    }
    return `${POKEAPI_URL}${isShiny ? 'shiny/' : ''}${p.pokedexId}.png`;
}

// ==========================================
// CHARGER LA PAGE COMBAT
// ==========================================
async function loadBattlePage() {
    switchBattleTab('opponents');
    await loadBattleStats();
}

// ==========================================
// CHARGER LES STATS
// ==========================================
async function loadBattleStats() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/battle/my-battles/${currentUserId}`);
        const data = await res.json();
        
        battleData = data;
        
        // Mettre à jour les stats
        document.getElementById('battle-victories').textContent = data.stats.victories;
        document.getElementById('battle-total').textContent = data.stats.totalBattles;
        document.getElementById('battle-winrate').textContent = data.stats.winRate + '%';
        
        // Badge pour défis en attente
        const badge = document.getElementById('badge-pending-battles');
        if (badge) {
            if (data.pendingChallenges.length > 0) {
                badge.textContent = data.pendingChallenges.length;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
    } catch (e) {
        console.error("Erreur chargement stats combat:", e);
    }
}

// ==========================================
// SWITCH TAB
// ==========================================
function switchBattleTab(tab) {
    // Changer les tabs
    document.querySelectorAll('.battle-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-battle-${tab}`)?.classList.add('active');
    
    // Changer le contenu
    document.querySelectorAll('.battle-content').forEach(c => c.style.display = 'none');
    document.getElementById(`${tab}-content`).style.display = 'block';
    
    // Charger les données
    if (tab === 'opponents') {
        loadOpponents();
    } else if (tab === 'pending') {
        loadPendingBattles();
    } else if (tab === 'history') {
        loadBattleHistory();
    }
}

// ==========================================
// CHARGER LA LISTE DES ADVERSAIRES
// ==========================================
async function loadOpponents() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/battle/available-opponents/${currentUserId}`);
        const data = await res.json();
        
        const grid = document.getElementById('opponents-grid');
        if (!grid) return;
        
        if (!data.opponents || data.opponents.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Aucun adversaire disponible pour le moment.<br><small>Les joueurs doivent avoir un compagnon pour combattre.</small></p>';
            return;
        }
        
        grid.innerHTML = data.opponents.map(opp => createOpponentCard(opp)).join('');
        
    } catch (e) {
        console.error("Erreur chargement adversaires:", e);
    }
}

// ==========================================
// CRÉER UNE CARTE ADVERSAIRE
// ==========================================
function createOpponentCard(opponent) {
    return `
        <div class="opponent-card">
            <div class="opponent-header">
                <span class="opponent-username">👤 ${opponent.username}</span>
                <span class="opponent-power">💪 ${opponent.power}</span>
            </div>
            
            <div class="opponent-companion">
                <img src="${POKEAPI_URL}${opponent.companion.isShiny ? 'shiny/' : ''}${opponent.companion.pokedexId}.png" loading="lazy">
                <div class="companion-name">${opponent.companion.isShiny ? '✨ ' : ''}${opponent.companion.name}</div>
                <div class="companion-level">Niv. ${opponent.companion.level}</div>
            </div>
            
            <button class="cta-button" onclick="challengeOpponent('${opponent.userId}', '${opponent.username}')" style="width: 100%;">
                ⚔️ Défier ${opponent.username}
            </button>
        </div>
    `;
}

// ==========================================
// DÉFIER UN ADVERSAIRE
// ==========================================
async function challengeOpponent(opponentId, opponentUsername) {
    // Ouvrir le sélecteur de Pokémon d'abord
    openPvpPokemonModal(`⚔️ Choisir ton Pokémon contre ${opponentUsername}`, async (pokemon) => {
        const isMega   = pokemon.isMega === true || (pokemon.name && pokemon.name.toLowerCase().includes('méga'));
        const isCustom = pokemon.isCustom === true;
        let label = '';
        if (pokemon.isShiny) label += '✨ ';
        if (isMega)           label += '🔮 ';
        if (isCustom)         label += '🌀 ';
        label += pokemon.name;

        if (!confirm(`Défier ${opponentUsername} avec ${label} (Niv.${pokemon.level}) ?`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/battle/challenge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengerId: currentUserId,
                    opponentId,
                    pokemonId: pokemon._id
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert(`✅ ${data.message}\n\nEn attente que ${opponentUsername} accepte le défi...`);
                loadBattleStats();
            } else {
                alert("❌ " + data.error);
            }

        } catch (e) {
            console.error("Erreur défi:", e);
            alert("Erreur lors de l'envoi du défi");
        }
    });
}

// ==========================================
// CHARGER LES DÉFIS REÇUS
// ==========================================
async function loadPendingBattles() {
    const grid = document.getElementById('pending-battles-grid');
    if (!grid) return;

    grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">⏳ Chargement...</p>';

    try {
        // Toujours recharger depuis l'API pour avoir les défis les plus récents
        const res  = await fetch(`${API_BASE_URL}/api/battle/my-battles/${currentUserId}`);
        const data = await res.json();
        battleData = data; // Mettre à jour le cache global

        // Mettre à jour le badge
        const badge = document.getElementById('badge-pending-battles');
        if (badge) {
            if (data.pendingChallenges.length > 0) {
                badge.textContent = data.pendingChallenges.length;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }

        if (!data.pendingChallenges || data.pendingChallenges.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Aucun défi en attente.</p>';
            return;
        }

        grid.innerHTML = data.pendingChallenges.map(battle => createPendingBattleCard(battle)).join('');

    } catch (e) {
        console.error("Erreur chargement défis:", e);
        grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Erreur de chargement.</p>';
    }
}

// ==========================================
// CRÉER UNE CARTE DE DÉFI EN ATTENTE
// ==========================================
function createPendingBattleCard(battle) {
    const timeAgo = getTimeAgo(battle.createdAt);
    
    return `
        <div class="battle-challenge-card">
            <div style="text-align: center; margin-bottom: 15px;">
                <span style="color: var(--accent-warm); font-weight: 700; font-size: 1.2em;">
                    ⚔️ Défi de ${battle.player1.username}
                </span>
                <div style="color: var(--text-secondary); font-size: 0.85em; margin-top: 5px;">
                    ${timeAgo}
                </div>
            </div>
            
            <div class="battle-vs">
                <div class="battle-fighter">
                    <img src="${POKEAPI_URL}${battle.player1.pokemon.isShiny ? 'shiny/' : ''}${battle.player1.pokemon.pokedexId}.png" loading="lazy">
                    <div style="font-weight: 700; color: var(--text-primary);">${battle.player1.pokemon.isShiny ? '✨ ' : ''}${battle.player1.pokemon.name}</div>
                    <div style="color: var(--text-secondary); font-size: 0.85em;">Niv. ${battle.player1.pokemon.level}</div>
                    <div style="color: var(--accent-warm); font-size: 0.85em; font-weight: 600;">💪 ${battle.player1.power}</div>
                </div>
                
                <div class="battle-vs-icon">⚔️</div>
                
                <div class="battle-fighter">
                    <img src="${POKEAPI_URL}${battle.player2.pokemon.isShiny ? 'shiny/' : ''}${battle.player2.pokemon.pokedexId}.png" loading="lazy">
                    <div style="font-weight: 700; color: var(--text-primary);">${battle.player2.pokemon.isShiny ? '✨ ' : ''}${battle.player2.pokemon.name}</div>
                    <div style="color: var(--text-secondary); font-size: 0.85em;">Niv. ${battle.player2.pokemon.level}</div>
                    <div style="color: var(--accent-warm); font-size: 0.85em; font-weight: 600;">💪 ${battle.player2.power}</div>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="cta-button" onclick="acceptBattle('${battle._id}')" style="flex: 1;">
                    ⚔️ Accepter le combat
                </button>
                <button class="btn-action btn-sell" onclick="declineBattle('${battle._id}')" style="flex: 1;">
                    ❌ Refuser
                </button>
            </div>
        </div>
    `;
}

// ==========================================
// ACCEPTER UN COMBAT
// ==========================================
async function acceptBattle(battleId) {
    // Trouver le nom du challenger depuis battleData
    const battle = battleData?.pendingChallenges?.find(b => b._id === battleId);
    const challengerName = battle?.player1?.username || 'l\'adversaire';

    // Ouvrir le sélecteur de Pokémon
    openPvpPokemonModal(`⚔️ Choisir ton Pokémon contre ${challengerName}`, async (pokemon) => {
        const isMega   = pokemon.isMega === true || (pokemon.name && pokemon.name.toLowerCase().includes('méga'));
        const isCustom = pokemon.isCustom === true;
        let label = '';
        if (pokemon.isShiny) label += '✨ ';
        if (isMega)           label += '🔮 ';
        if (isCustom)         label += '🌀 ';
        label += pokemon.name;

        if (!confirm(`⚔️ Accepter le combat avec ${label} (Niv.${pokemon.level}) ?\n\nLe combat va se dérouler automatiquement !`)) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/battle/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId,
                    battleId,
                    pokemonId: pokemon._id
                })
            });

            const data = await res.json();

            if (res.ok) {
                showBattleResult(data.battle);
                localStorage.removeItem('pokedex_data_cache');
                loadBattleStats();
                if (typeof loadProfile === 'function') loadProfile();
            } else {
                alert("❌ " + data.error);
            }

        } catch (e) {
            console.error("Erreur acceptation combat:", e);
            alert("Erreur lors de l'acceptation du combat");
        }
    });
}

// ==========================================
// REFUSER UN COMBAT
// ==========================================
async function declineBattle(battleId) {
    if (!confirm("Refuser ce défi ?")) {
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/battle/decline`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                battleId
            })
        });
        
        if (res.ok) {
            alert("✅ Défi refusé");
            loadBattleStats();
            loadPendingBattles();
        } else {
            alert("❌ Erreur");
        }
        
    } catch (e) {
        console.error("Erreur refus combat:", e);
    }
}

// Suite dans le prochain fichier...
// ==========================================
// ⚔️ COMBATS PVP - PARTIE 2
// (Suite du fichier précédent)
// ==========================================

// ==========================================
// AFFICHER LE RÉSULTAT DU COMBAT
// ==========================================
function showBattleResult(battle) {
    const isWinner = battle.winner === currentUserId;
    const rewards = isWinner ? battle.rewards.winner : battle.rewards.loser;
    
    const content = document.getElementById('battle-result-content');
    
    content.innerHTML = `
        <div style="font-size: 4em; margin: 20px 0;">
            ${isWinner ? '🏆' : '💪'}
        </div>
        
        <h2 style="color: ${isWinner ? 'var(--accent-nature)' : 'var(--accent-pink)'}; margin-bottom: 20px;">
            ${isWinner ? 'VICTOIRE !' : 'DÉFAITE'}
        </h2>
        
        <div class="battle-log">
            ${battle.battleLog.map(line => `<div class="battle-log-line">${line}</div>`).join('')}
        </div>
        
        <div class="battle-rewards">
            <h4>${isWinner ? '🎁 Récompenses de victoire' : '🎁 Récompenses de participation'}</h4>
            <span class="reward-item">+${rewards.money}💰</span>
            ${rewards.xp ? `<span class="reward-item">+${rewards.xp} XP</span>` : ''}
        </div>
        
        <p style="color: var(--text-secondary); margin-top: 15px; font-size: 0.9em;">
            ${isWinner ? 'Bravo pour cette victoire !' : 'Continue à t\'entraîner pour devenir plus fort !'}
        </p>
    `;
    
    document.getElementById('battle-result-modal').style.display = 'flex';
}

function closeBattleResultModal() {
    document.getElementById('battle-result-modal').style.display = 'none';
    switchBattleTab('pending'); // Recharger la page des défis
}

// ==========================================
// CHARGER L'HISTORIQUE DES COMBATS
// ==========================================
async function loadBattleHistory() {
    if (!battleData) {
        await loadBattleStats();
    }
    
    const grid = document.getElementById('battle-history-grid');
    if (!grid) return;
    
    if (!battleData.battleHistory || battleData.battleHistory.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Aucun combat dans l\'historique.</p>';
        return;
    }
    
    grid.innerHTML = battleData.battleHistory.map(battle => createHistoryCard(battle)).join('');
}

// ==========================================
// CRÉER UNE CARTE D'HISTORIQUE
// ==========================================
function createHistoryCard(battle) {
    const isWinner = battle.winner === currentUserId;
    const isPlayer1 = battle.player1.userId === currentUserId;
    const myPokemon = isPlayer1 ? battle.player1.pokemon : battle.player2.pokemon;
    const opponentPokemon = isPlayer1 ? battle.player2.pokemon : battle.player1.pokemon;
    const opponentUsername = isPlayer1 ? battle.player1.username : battle.player2.username;
    const timeAgo = getTimeAgo(battle.completedAt);
    
    return `
        <div class="battle-history-card ${isWinner ? 'victory' : 'defeat'}">
            <span class="battle-result-badge">${isWinner ? '🏆' : '💪'}</span>
            
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="color: var(--accent-warm); font-weight: 700; font-size: 1.1em;">
                    ${isWinner ? 'Victoire' : 'Défaite'} contre ${opponentUsername}
                </div>
                <div style="color: var(--text-secondary); font-size: 0.85em; margin-top: 5px;">
                    ${timeAgo}
                </div>
            </div>
            
            <div class="battle-vs">
                <div class="battle-fighter">
                    <img src="${POKEAPI_URL}${myPokemon.isShiny ? 'shiny/' : ''}${myPokemon.pokedexId}.png" loading="lazy">
                    <div style="font-weight: 700; color: var(--text-primary);">${myPokemon.isShiny ? '✨ ' : ''}${myPokemon.name}</div>
                    <div style="color: var(--text-secondary); font-size: 0.85em;">Niv. ${myPokemon.level}</div>
                    <div style="color: var(--accent-warm); font-size: 0.85em; font-weight: 600;">💥 ${isPlayer1 ? battle.player1.damage : battle.player2.damage} dégâts</div>
                </div>
                
                <div style="font-size: 1.5em; color: var(--text-secondary);">VS</div>
                
                <div class="battle-fighter">
                    <img src="${POKEAPI_URL}${opponentPokemon.isShiny ? 'shiny/' : ''}${opponentPokemon.pokedexId}.png" loading="lazy">
                    <div style="font-weight: 700; color: var(--text-primary);">${opponentPokemon.isShiny ? '✨ ' : ''}${opponentPokemon.name}</div>
                    <div style="color: var(--text-secondary); font-size: 0.85em;">Niv. ${opponentPokemon.level}</div>
                    <div style="color: var(--accent-warm); font-size: 0.85em; font-weight: 600;">💥 ${isPlayer1 ? battle.player2.damage : battle.player1.damage} dégâts</div>
                </div>
            </div>
            
            <button class="btn-action" onclick="viewBattleDetails('${battle._id}')" style="width: 100%; margin-top: 15px;">
                📜 Voir le rapport de combat
            </button>
        </div>
    `;
}

// ==========================================
// VOIR LES DÉTAILS D'UN COMBAT
// ==========================================
async function viewBattleDetails(battleId) {
    const battle = battleData.battleHistory.find(b => b._id === battleId);
    if (!battle) {
        alert("Combat introuvable");
        return;
    }
    
    const isWinner = battle.winner === currentUserId;
    const rewards = isWinner ? battle.rewards.winner : battle.rewards.loser;
    
    const content = document.getElementById('battle-result-content');
    
    content.innerHTML = `
        <h2 style="color: ${isWinner ? 'var(--accent-nature)' : 'var(--accent-pink)'}; margin-bottom: 20px;">
            ${isWinner ? '🏆 Victoire' : '💪 Défaite'}
        </h2>
        
        <div class="battle-log">
            ${battle.battleLog.map(line => `<div class="battle-log-line">${line}</div>`).join('')}
        </div>
        
        <div class="battle-rewards">
            <h4>🎁 Récompenses reçues</h4>
            <span class="reward-item">+${rewards.money}💰</span>
            ${rewards.xp ? `<span class="reward-item">+${rewards.xp} XP</span>` : ''}
        </div>
    `;
    
    document.getElementById('battle-result-modal').style.display = 'flex';
}

// ==========================================
// EXPOSITION AU SCOPE GLOBAL
// ==========================================
window.loadBattlePage         = loadBattlePage;
window.switchBattleTab        = switchBattleTab;
window.challengeOpponent      = challengeOpponent;
window.acceptBattle           = acceptBattle;
window.declineBattle          = declineBattle;
window.closeBattleResultModal = closeBattleResultModal;
window.viewBattleDetails      = viewBattleDetails;
window.openPvpPokemonModal    = openPvpPokemonModal;
window.closePvpPokemonModal   = closePvpPokemonModal;
window.confirmPvpPokemon      = confirmPvpPokemon;
window.setPvpFilter           = setPvpFilter;

// ==========================================
// AUTO-REFRESH DES DÉFIS (toutes les 30 secondes)
// ==========================================
setInterval(() => {
    if (document.getElementById('battle-page')?.classList.contains('active')) {
        loadBattleStats();
    }
}, 30000);

console.log("✅ Système de combats PvP chargé côté client");
