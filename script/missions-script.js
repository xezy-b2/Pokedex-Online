// ==========================================
// 🎯 SYSTÈME DE MISSIONS QUOTIDIENNES
// JavaScript à ajouter dans script.js
// ==========================================

let dailyMissionsData = null;

// ==========================================
// CHARGER LES MISSIONS
// ==========================================
async function loadDailyMissions() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/missions/${currentUserId}`);
        const data = await res.json();
        
        dailyMissionsData = data;
        
        // Mettre à jour le streak
        document.getElementById('login-streak').textContent = data.loginStreak || 0;
        
        // Afficher les missions
        renderMissions(data.missions);
        
    } catch (e) {
        console.error("Erreur chargement missions:", e);
        document.getElementById('missions-grid').innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Erreur lors du chargement des missions.</p>';
    }
}

// ==========================================
// AFFICHER LES MISSIONS
// ==========================================
function renderMissions(missions) {
    const grid = document.getElementById('missions-grid');
    if (!grid) return;
    
    if (!missions || missions.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Aucune mission disponible.</p>';
        return;
    }
    
    grid.innerHTML = missions.map(mission => createMissionCard(mission)).join('');
}

// ==========================================
// CRÉER UNE CARTE DE MISSION
// ==========================================
function createMissionCard(mission) {
    const progress = Math.min((mission.current / mission.target) * 100, 100);
    const isCompleted = mission.completed;
    const isClaimed = mission.claimed;
    
    // Icônes selon le type
    const icons = {
        'capture': '🎯',
        'trade': '🔄',
        'login_streak': '🔥',
        'gallery_post': '🎨',
        'spend_money': '💰',
        'sell_pokemon': '💸',
        'battle': '⚔️',
        'battle_bot': '🤖'
    };
    
    const icon = icons[mission.type] || '⭐';
    
    // Formater les récompenses
    const rewards = [];
    if (mission.reward.money) rewards.push(`${mission.reward.money}💰`);
    if (mission.reward.pokeballs) rewards.push(`${mission.reward.pokeballs}x Poké Ball`);
    if (mission.reward.greatballs) rewards.push(`${mission.reward.greatballs}x Super Ball`);
    if (mission.reward.ultraballs) rewards.push(`${mission.reward.ultraballs}x Hyper Ball`);
    if (mission.reward.masterballs) rewards.push(`${mission.reward.masterballs}x Master Ball`);
    
    return `
        <div class="mission-card ${isCompleted ? 'completed' : ''} ${isClaimed ? 'claimed' : ''}">
            ${isCompleted ? '<span class="mission-checkmark">✅</span>' : ''}
            
            <div class="mission-icon">${icon}</div>
            <h3 class="mission-title">${mission.title}</h3>
            <p class="mission-description">${mission.description}</p>
            
            <div class="mission-progress">
                <div class="mission-progress-bar" style="width: ${progress}%"></div>
                <div class="mission-progress-text">${mission.current} / ${mission.target}</div>
            </div>
            
            <div class="mission-rewards">
                ${rewards.map(r => `<span class="reward-badge">${r}</span>`).join('')}
            </div>
            
            ${isCompleted && !isClaimed ? `
                <button class="btn-claim" onclick="claimMissionReward('${mission._id}')">
                    🎁 Réclamer la récompense
                </button>
            ` : isClaimed ? `
                <button class="btn-claim" disabled>
                    ✅ Récompense réclamée
                </button>
            ` : `
                <button class="btn-claim" disabled>
                    ⏳ En cours...
                </button>
            `}
        </div>
    `;
}

// ==========================================
// RÉCLAMER UNE RÉCOMPENSE
// ==========================================
async function claimMissionReward(missionId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/missions/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: currentUserId, 
                missionId 
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            // Afficher les récompenses
            const rewardText = [];
            if (data.rewards.money) rewardText.push(`${data.rewards.money}💰`);
            if (data.rewards.pokeballs) rewardText.push(`${data.rewards.pokeballs} Poké Balls`);
            if (data.rewards.greatballs) rewardText.push(`${data.rewards.greatballs} Super Balls`);
            if (data.rewards.ultraballs) rewardText.push(`${data.rewards.ultraballs} Hyper Balls`);
            if (data.rewards.masterballs) rewardText.push(`${data.rewards.masterballs} Master Balls`);
            
            alert(`🎉 Récompense reçue !\n\n${rewardText.join('\n')}`);
            
            // Recharger les missions et le profil
            loadDailyMissions();
            if (typeof loadProfile === 'function') loadProfile();
            
        } else {
            alert("❌ " + data.error);
        }
        
    } catch (e) {
        console.error("Erreur claim mission:", e);
        alert("Erreur lors de la réclamation de la récompense");
    }
}

// ==========================================
// BADGE DE NOTIFICATION (nombre de missions complétées)
// ==========================================
function updateMissionsBadge() {
    if (!dailyMissionsData || !dailyMissionsData.missions) return;
    
    const completedNotClaimed = dailyMissionsData.missions.filter(
        m => m.completed && !m.claimed
    ).length;
    
    const badge = document.getElementById('badge-missions');
    if (badge) {
        if (completedNotClaimed > 0) {
            badge.textContent = completedNotClaimed;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// ==========================================
// EXPOSITION AU SCOPE GLOBAL
// ==========================================
window.loadDailyMissions = loadDailyMissions;
window.claimMissionReward = claimMissionReward;

// ==========================================
// AUTO-REFRESH DES MISSIONS (toutes les 30 secondes)
// ==========================================
setInterval(() => {
    if (document.getElementById('missions-page')?.classList.contains('active')) {
        loadDailyMissions();
    }
}, 30000);

console.log("✅ Système de missions quotidiennes chargé côté client");
