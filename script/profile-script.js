// ==========================================
// 👤 SYSTÈME DE PROFILS PUBLICS
// JavaScript à ajouter dans script.js
// ==========================================

// ==========================================
// CHARGER UN PROFIL PUBLIC
// ==========================================
async function loadPublicProfile(username) {
    try {
        // Le serveur gère maintenant les underscores Discord automatiquement
        const res = await fetch(`${API_BASE_URL}/api/profile/${username}?viewerId=${currentUserId}`);
        
        if (!res.ok) {
            if (res.status === 404) {
                alert("❌ Utilisateur introuvable");
                showPage('home');
                return;
            }
            if (res.status === 403) {
                alert("🔒 Ce profil est privé");
                showPage('home');
                return;
            }
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

// ==========================================
// AFFICHER LE PROFIL
// ==========================================
function renderPublicProfile(profile) {
    // Header
    document.getElementById('profile-username').textContent = profile.username;
    
    if (profile.avatar) {
        document.getElementById('profile-avatar').innerHTML = `<img src="${profile.avatar}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }
    
    const memberDate = new Date(profile.memberSince);
    document.getElementById('profile-member-since').textContent = 
        `Membre depuis ${memberDate.toLocaleDateString('fr-FR')}`;

    // Bouton Partager : utilise le username déjà chargé
    const shareBtn = document.getElementById('profile-share-btn');
    if (shareBtn) {
        shareBtn.onclick = () => {
            const profileURL = `${window.location.origin}${window.location.pathname}?profile=${encodeURIComponent(profile.username)}`;
            navigator.clipboard.writeText(profileURL).then(() => {
                shareBtn.textContent = '✅ Copié !';
                setTimeout(() => shareBtn.textContent = '🔗 Partager', 2000);
            }).catch(() => {
                prompt("Copie ce lien :", profileURL);
            });
        };
    }

    // Bouton "Modifier mon profil" visible uniquement si c'est son propre profil
    const isOwnProfile = currentUserId && profile.userId === currentUserId;
    const editBtn = document.getElementById('profile-edit-btn');
    if (editBtn) editBtn.style.display = isOwnProfile ? 'inline-block' : 'none';
    const editPanel = document.getElementById('profile-edit-panel');
    if (editPanel) editPanel.style.display = 'none';

    // Pré-remplir le formulaire d'édition
    if (isOwnProfile && profile.settings) {
        const s = profile.settings;
        const vis = document.getElementById('edit-visibility');
        const col = document.getElementById('edit-collection-visibility');
        const combat = document.getElementById('edit-combat-visible');
        const wall = document.getElementById('edit-wall-enabled');
        const msg = document.getElementById('edit-companion-message');
        if (vis) vis.value = s.visibility || 'public';
        if (col) col.value = s.collectionVisibility || 'public';
        if (combat) combat.checked = s.combatStatsVisible !== false;
        if (wall) wall.checked = s.wallEnabled !== false;
        if (msg && profile.companion) msg.value = profile.companion.customMessage || '';
    }
    
    // Stats Collection
    document.getElementById('profile-total-captured').textContent = 
        `${profile.stats.collection.total}/1200 (${profile.stats.collection.percentage}%)`;
    document.getElementById('profile-collection-progress').style.width = 
        `${profile.stats.collection.percentage}%`;
    document.getElementById('profile-shinies').textContent = profile.stats.collection.shinies;
    document.getElementById('profile-megas').textContent = profile.stats.collection.megas;
    document.getElementById('profile-customs').textContent = profile.stats.collection.customs;
    document.getElementById('profile-money').textContent = profile.stats.money.toLocaleString() + '💰';
    
    // Stats Combat
    if (profile.settings.combatStatsVisible) {
        document.getElementById('profile-combat-stats').style.display = 'block';
        document.getElementById('profile-victories').textContent = profile.stats.combat.victories;
        document.getElementById('profile-total-battles').textContent = profile.stats.combat.totalBattles;
        document.getElementById('profile-winrate').textContent = profile.stats.combat.winRate + '%';
    } else {
        document.getElementById('profile-combat-stats').style.display = 'none';
    }
    
    // Badges
    const badgesContainer = document.getElementById('profile-badges');
    if (profile.badges.length > 0) {
        badgesContainer.innerHTML = profile.badges.map(badge => `
            <div class="profile-badge">
                <div class="profile-badge-icon">${badge.icon}</div>
                <div class="profile-badge-name">${badge.name}</div>
            </div>
        `).join('');
    } else {
        badgesContainer.innerHTML = '<div style="color: var(--text-secondary); text-align: center; width: 100%;">Aucun badge pour le moment</div>';
    }
    
    // Compagnon
    if (profile.companion) {
        document.getElementById('profile-companion-section').style.display = 'block';
        const comp = profile.companion;
        const compImg = `${POKEAPI_URL}${comp.isShiny ? 'shiny/' : ''}${comp.pokedexId}.png`;
        document.getElementById('profile-companion-img').src = compImg;
        document.getElementById('profile-companion-name').textContent = 
            `${comp.isShiny ? '✨ ' : ''}${comp.name}`;
        document.getElementById('profile-companion-level').textContent = `Niveau ${comp.level}`;
        
        if (comp.customMessage) {
            document.getElementById('profile-companion-message').textContent = 
                `"${comp.customMessage}"`;
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
            </div>
        `).join('');
    } else {
        document.getElementById('profile-team-section').style.display = 'none';
    }
    
    // Collection
    if (profile.collection) {
        document.getElementById('profile-collection-section').style.display = 'block';
        document.getElementById('profile-collection-private').style.display = 'none';
        
        const grid = document.getElementById('profile-collection-grid');
        grid.innerHTML = profile.collection.map(p => `
            <div class="pokedex-card ${p.isShiny ? 'is-shiny' : ''}">
                <img src="${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png" 
                     class="poke-sprite" loading="lazy">
                <span class="pokemon-name">${p.isShiny ? '✨ ' : ''}${p.name}</span>
                <div style="color:var(--accent-warm); font-size:0.85em; font-weight:bold;">Lv.${p.level}</div>
            </div>
        `).join('');
    } else {
        document.getElementById('profile-collection-section').style.display = 'none';
        document.getElementById('profile-collection-private').style.display = 'block';
    }
}

// ==========================================
// DÉTECTER URL AVEC ?profile=username
// ==========================================
function checkProfileURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const profileUsername = urlParams.get('profile');
    
    if (profileUsername) {
        showPage('public-profile');
        loadPublicProfile(profileUsername);
        return true;
    }
    return false;
}

// ==========================================
// PARTAGER SON PROFIL
// ==========================================
async function saveProfileSettings() {
    if (!currentUserId) return;
    const btn = document.getElementById('profile-save-btn');
    if (btn) { btn.textContent = '⏳ Sauvegarde...'; btn.disabled = true; }

    const settings = {
        visibility: document.getElementById('edit-visibility')?.value || 'public',
        collectionVisibility: document.getElementById('edit-collection-visibility')?.value || 'public',
        combatStatsVisible: document.getElementById('edit-combat-visible')?.checked !== false,
        wallEnabled: document.getElementById('edit-wall-enabled')?.checked !== false,
    };

    const companionMessage = document.getElementById('edit-companion-message')?.value || '';

    try {
        await fetch(`${API_BASE_URL}/api/profile/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, settings })
        });
        await fetch(`${API_BASE_URL}/api/profile/companion-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, message: companionMessage })
        });
        if (btn) { btn.textContent = '✅ Sauvegardé !'; btn.disabled = false; }
        setTimeout(() => {
            if (btn) btn.textContent = '💾 Sauvegarder';
            document.getElementById('profile-edit-panel').style.display = 'none';
        }, 1500);
    } catch(e) {
        console.error(e);
        if (btn) { btn.textContent = '❌ Erreur'; btn.disabled = false; }
    }
}

// ==========================================
// VOIR LE PROFIL D'UN JOUEUR
// ==========================================
function viewPlayerProfile(username) {
    window.location.href = `${window.location.origin}${window.location.pathname}?profile=${username}`;
}

// ==========================================
// EXPOSITION AU SCOPE GLOBAL
// ==========================================
window.loadPublicProfile = loadPublicProfile;
window.viewPlayerProfile = viewPlayerProfile;
window.saveProfileSettings = saveProfileSettings;

// ==========================================
// INIT - Vérifier URL au chargement
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Attendre que l'auth soit faite
    setTimeout(() => {
        if (!checkProfileURL()) {
            // Pas de profil dans l'URL, continuer normalement
        }
    }, 500);
});

console.log("✅ Système de profils publics chargé côté client");
