// ==========================================
// ⚔️ SYSTÈME DE COMBATS PVP
// JavaScript à ajouter dans script.js
// ==========================================

let battleData = null;

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
    if (!confirm(`Défier ${opponentUsername} en combat ?\n\nTon compagnon combattra automatiquement !`)) {
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/battle/challenge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                challengerId: currentUserId,
                opponentId
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
}

// ==========================================
// CHARGER LES DÉFIS REÇUS
// ==========================================
async function loadPendingBattles() {
    if (!battleData) {
        await loadBattleStats();
    }
    
    const grid = document.getElementById('pending-battles-grid');
    if (!grid) return;
    
    if (!battleData.pendingChallenges || battleData.pendingChallenges.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Aucun défi en attente.</p>';
        return;
    }
    
    grid.innerHTML = battleData.pendingChallenges.map(battle => createPendingBattleCard(battle)).join('');
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
    if (!confirm("⚔️ Accepter le combat ?\n\nLe combat va se dérouler automatiquement !")) {
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/battle/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                battleId
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Afficher le résultat du combat
            showBattleResult(data.battle);
            
            // Recharger les données
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
window.loadBattlePage = loadBattlePage;
window.switchBattleTab = switchBattleTab;
window.challengeOpponent = challengeOpponent;
window.acceptBattle = acceptBattle;
window.declineBattle = declineBattle;
window.closeBattleResultModal = closeBattleResultModal;
window.viewBattleDetails = viewBattleDetails;

// ==========================================
// AUTO-REFRESH DES DÉFIS (toutes les 30 secondes)
// ==========================================
setInterval(() => {
    if (document.getElementById('battle-page')?.classList.contains('active')) {
        loadBattleStats();
    }
}, 30000);

console.log("✅ Système de combats PvP chargé côté client");
