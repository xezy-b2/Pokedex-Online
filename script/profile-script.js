// ==========================================
// 👤 SYSTÈME DE PROFILS PUBLICS
// ==========================================

async function loadPublicProfile(username) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/profile?username=${encodeURIComponent(username)}&viewerId=${currentUserId}`);
        if (!res.ok) {
            if (res.status === 404) { alert("❌ Utilisateur introuvable"); showPage('home'); return; }
            if (res.status === 403) { alert("🔒 Ce profil est privé"); showPage('home'); return; }
            throw new Error("Erreur chargement profil");
        }
        const profile = await res.json();
        renderPublicProfile(profile);
    } catch (e) {
        console.error("Erreur chargement profil:", e);
        alert("Erreur lors du chargement du profil");
        showPage('home');
    }
}

function renderPublicProfile(profile) {
    document.getElementById('profile-username').textContent = profile.username;
    
    if (profile.avatar) {
        document.getElementById('profile-avatar').innerHTML = `<img src="${profile.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    }
    
    const memberDate = new Date(profile.memberSince);
    document.getElementById('profile-member-since').textContent = `Membre depuis ${memberDate.toLocaleDateString('fr-FR')}`;

    // Bouton Partager : assigner le onclick ici avec le username déjà connu
    const shareBtn = document.getElementById('profile-share-btn');
    if (shareBtn) {
        shareBtn.onclick = () => {
            const url = `${window.location.origin}${window.location.pathname}?profile=${encodeURIComponent(profile.username)}`;
            navigator.clipboard.writeText(url).then(() => {
                shareBtn.textContent = '✅ Copié !';
                setTimeout(() => { shareBtn.textContent = '🔗 Partager'; }, 2000);
            }).catch(() => { prompt("Copie ce lien :", url); });
        };
    }

    // Bouton Modifier : visible seulement si c'est son propre profil
    const isOwnProfile = currentUserId && String(profile.userId) === String(currentUserId);
    const editBtn = document.getElementById('profile-edit-btn');
    if (editBtn) editBtn.style.display = isOwnProfile ? 'inline-block' : 'none';
    const editPanel = document.getElementById('profile-edit-panel');
    if (editPanel) editPanel.style.display = 'none';

    // Pré-remplir le formulaire d'édition
    if (isOwnProfile && profile.settings) {
        const s = profile.settings;
        const vis    = document.getElementById('edit-visibility');
        const col    = document.getElementById('edit-collection-visibility');
        const combat = document.getElementById('edit-combat-visible');
        const wall   = document.getElementById('edit-wall-enabled');
        const msg    = document.getElementById('edit-companion-message');
        if (vis)    vis.value      = s.visibility           || 'public';
        if (col)    col.value      = s.collectionVisibility || 'public';
        if (combat) combat.checked = s.combatStatsVisible   !== false;
        if (wall)   wall.checked   = s.wallEnabled          !== false;
        if (msg)    msg.value      = profile.companion?.customMessage || '';
    }
    
    // Stats Collection
    document.getElementById('profile-total-captured').textContent = `${profile.stats.collection.total}/1200 (${profile.stats.collection.percentage}%)`;
    document.getElementById('profile-collection-progress').style.width = `${profile.stats.collection.percentage}%`;
    document.getElementById('profile-shinies').textContent  = profile.stats.collection.shinies;
    document.getElementById('profile-megas').textContent    = profile.stats.collection.megas;
    document.getElementById('profile-customs').textContent  = profile.stats.collection.customs;
    document.getElementById('profile-money').textContent    = profile.stats.money.toLocaleString() + '💰';
    
    // Stats Combat
    if (profile.settings.combatStatsVisible) {
        document.getElementById('profile-combat-stats').style.display = 'block';
        document.getElementById('profile-victories').textContent     = profile.stats.combat.victories;
        document.getElementById('profile-total-battles').textContent = profile.stats.combat.totalBattles;
        document.getElementById('profile-winrate').textContent       = profile.stats.combat.winRate + '%';
    } else {
        document.getElementById('profile-combat-stats').style.display = 'none';
    }
    
    // Badges
    const badgesContainer = document.getElementById('profile-badges');
    badgesContainer.innerHTML = profile.badges.length > 0
        ? profile.badges.map(b => `<div class="profile-badge"><div class="profile-badge-icon">${b.icon}</div><div class="profile-badge-name">${b.name}</div></div>`).join('')
        : '<div style="color:var(--text-secondary);text-align:center;width:100%;">Aucun badge pour le moment</div>';
    
    // Compagnon
    if (profile.companion) {
        document.getElementById('profile-companion-section').style.display = 'block';
        const comp = profile.companion;
        document.getElementById('profile-companion-img').src = `${POKEAPI_URL}${comp.isShiny ? 'shiny/' : ''}${comp.pokedexId}.png`;
        document.getElementById('profile-companion-name').textContent  = `${comp.isShiny ? '✨ ' : ''}${comp.name}`;
        document.getElementById('profile-companion-level').textContent = `Niveau ${comp.level}`;
        if (comp.customMessage) {
            document.getElementById('profile-companion-message').textContent = `"${comp.customMessage}"`;
            document.getElementById('profile-companion-message').style.display = 'block';
        } else {
            document.getElementById('profile-companion-message').style.display = 'none';
        }
    } else {
        document.getElementById('profile-companion-section').style.display = 'none';
    }
    
    // Équipe Favorite
    if (profile.favoriteTeam && profile.favoriteTeam.length > 0) {
        document.getElementById('profile-team-section').style.display = 'block';
        document.getElementById('profile-favorite-team').innerHTML = profile.favoriteTeam.map(p => `
            <div class="profile-team-pokemon">
                <img src="${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png" loading="lazy">
                <div class="profile-team-pokemon-name">${p.isShiny ? '✨ ' : ''}${p.name}</div>
                <div class="profile-team-pokemon-level">Niv. ${p.level}</div>
            </div>`).join('');
    } else {
        document.getElementById('profile-team-section').style.display = 'none';
    }
    
    // Collection
    if (profile.collection) {
        document.getElementById('profile-collection-section').style.display = 'block';
        document.getElementById('profile-collection-private').style.display = 'none';
        document.getElementById('profile-collection-grid').innerHTML = profile.collection.map(p => `
            <div class="pokedex-card ${p.isShiny ? 'is-shiny' : ''}">
                <img src="${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png" class="poke-sprite" loading="lazy">
                <span class="pokemon-name">${p.isShiny ? '✨ ' : ''}${p.name}</span>
                <div style="color:var(--accent-warm);font-size:0.85em;font-weight:bold;">Lv.${p.level}</div>
            </div>`).join('');
    } else {
        document.getElementById('profile-collection-section').style.display = 'none';
        document.getElementById('profile-collection-private').style.display = 'block';
    }
}

// ==========================================
// SAUVEGARDER LES PARAMÈTRES DU PROFIL
// ==========================================
async function saveProfileSettings() {
    if (!currentUserId) return;
    const btn = document.getElementById('profile-save-btn');
    if (btn) { btn.textContent = '⏳ Sauvegarde...'; btn.disabled = true; }

    const settings = {
        visibility:           document.getElementById('edit-visibility')?.value            || 'public',
        collectionVisibility: document.getElementById('edit-collection-visibility')?.value || 'public',
        combatStatsVisible:   document.getElementById('edit-combat-visible')?.checked      !== false,
        wallEnabled:          document.getElementById('edit-wall-enabled')?.checked        !== false,
    };
    const companionMessage = document.getElementById('edit-companion-message')?.value || '';

    try {
        await fetch(`${API_BASE_URL}/api/profile/settings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, settings })
        });
        await fetch(`${API_BASE_URL}/api/profile/companion-message`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, message: companionMessage })
        });
        if (btn) { btn.textContent = '✅ Sauvegardé !'; btn.disabled = false; }
        setTimeout(() => {
            if (btn) btn.textContent = '💾 Sauvegarder';
            const panel = document.getElementById('profile-edit-panel');
            if (panel) panel.style.display = 'none';
        }, 1500);
    } catch (e) {
        console.error("Erreur sauvegarde:", e);
        if (btn) { btn.textContent = '❌ Erreur'; btn.disabled = false; }
    }
}

// ==========================================
// DÉTECTER URL AVEC ?profile=username
// ==========================================
function checkProfileURL() {
    const profileUsername = new URLSearchParams(window.location.search).get('profile');
    if (profileUsername) {
        showPage('public-profile');
        loadPublicProfile(profileUsername);
        return true;
    }
    return false;
}

function viewPlayerProfile(username) {
    window.location.href = `${window.location.origin}${window.location.pathname}?profile=${encodeURIComponent(username)}`;
}

window.loadPublicProfile   = loadPublicProfile;
window.viewPlayerProfile   = viewPlayerProfile;
window.saveProfileSettings = saveProfileSettings;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { checkProfileURL(); }, 500);
});

console.log("✅ Système de profils publics chargé côté client");
