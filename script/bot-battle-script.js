// ==========================================
// 🤖 COMBATS CONTRE BOT
// JavaScript à ajouter dans script.js
// ==========================================

let selectedBotDifficulty = null;

// ==========================================
// SÉLECTIONNER UNE DIFFICULTÉ
// ==========================================
async function selectBotDifficulty(difficulty) {
    selectedBotDifficulty = difficulty;
    
    // Mettre à jour les boutons
    document.querySelectorAll('.bot-difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-difficulty="${difficulty}"]`)?.classList.add('selected');
    
    // Charger un aperçu du bot
    try {
        const res = await fetch(`${API_BASE_URL}/api/battle/bot-preview/${difficulty}`);
        const data = await res.json();
        
        if (data.bot) {
            // Afficher l'aperçu
            document.getElementById('bot-preview').style.display = 'block';
            document.getElementById('bot-preview-name').textContent = data.bot.name;
            document.getElementById('bot-preview-pokemon').textContent = 
                `${data.bot.pokemon.isShiny ? '✨ ' : ''}${data.bot.pokemon.name}`;
            document.getElementById('bot-preview-level').textContent = `Niv. ${data.bot.pokemon.level}`;
            document.getElementById('bot-preview-power').textContent = `💪 Puissance : ${data.bot.power}`;
            
            const imgUrl = `${POKEAPI_URL}${data.bot.pokemon.isShiny ? 'shiny/' : ''}${data.bot.pokemon.pokedexId}.png`;
            document.getElementById('bot-preview-img').src = imgUrl;
            
            // Activer le bouton
            const btn = document.getElementById('btn-fight-bot');
            btn.disabled = false;
            btn.style.opacity = '1';
        }
        
    } catch (e) {
        console.error("Erreur aperçu bot:", e);
    }
}

// ==========================================
// COMBATTRE LE BOT
// ==========================================
async function fightBot() {
    if (!selectedBotDifficulty) {
        alert("Choisis d'abord une difficulté !");
        return;
    }
    
    if (!confirm(`⚔️ Combattre un bot en mode ${selectedBotDifficulty.toUpperCase()} ?\n\nTon compagnon combattra automatiquement !`)) {
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/battle/bot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                difficulty: selectedBotDifficulty
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Afficher le résultat du combat
            showBotBattleResult(data);
            
            // Recharger les données
            localStorage.removeItem('pokedex_data_cache');
            loadBattleStats();
            if (typeof loadProfile === 'function') loadProfile();
            
            // Générer un nouveau bot
            selectBotDifficulty(selectedBotDifficulty);
        } else {
            alert("❌ " + data.error);
        }
        
    } catch (e) {
        console.error("Erreur combat bot:", e);
        alert("Erreur lors du combat contre le bot");
    }
}

// ==========================================
// AFFICHER LE RÉSULTAT DU COMBAT BOT
// ==========================================
function showBotBattleResult(data) {
    const isWinner = data.isWinner;
    const rewards = data.battle.rewards;
    
    const content = document.getElementById('battle-result-content');
    
    content.innerHTML = `
        <div style="font-size: 4em; margin: 20px 0;">
            ${isWinner ? '🏆' : '💪'}
        </div>
        
        <h2 style="color: ${isWinner ? 'var(--accent-nature)' : 'var(--accent-pink)'}; margin-bottom: 20px;">
            ${isWinner ? 'VICTOIRE !' : 'DÉFAITE'}
        </h2>
        
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="color: var(--accent-warm); font-weight: 700; font-size: 1.1em;">
                Combat contre ${data.battle.bot}
            </div>
            <div style="color: var(--text-secondary); font-size: 0.9em;">
                ${data.battle.botPokemon} Niv.${data.battle.botLevel} (💪 ${data.battle.botPower})
            </div>
        </div>
        
        <div class="battle-log">
            ${data.battle.battleLog.map(line => `<div class="battle-log-line">${line}</div>`).join('')}
        </div>
        
        <div class="battle-rewards">
            <h4>${isWinner ? '🎁 Récompenses de victoire' : '🎁 Récompenses de participation'}</h4>
            <span class="reward-item">+${rewards.money}💰</span>
            ${rewards.xp ? `<span class="reward-item">+${rewards.xp} XP</span>` : ''}
        </div>
        
        <p style="color: var(--text-secondary); margin-top: 15px; font-size: 0.9em;">
            ${isWinner ? 'Excellent ! Continue à t\'entraîner !' : 'Continue, tu vas progresser !'}
        </p>
    `;
    
    document.getElementById('battle-result-modal').style.display = 'flex';
}

// ==========================================
// EXPOSITION AU SCOPE GLOBAL
// ==========================================
window.selectBotDifficulty = selectBotDifficulty;
window.fightBot = fightBot;

console.log("✅ Système de combat contre bot chargé côté client");
