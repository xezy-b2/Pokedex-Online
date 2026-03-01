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
        const res = await fetch(`${API_BASE_URL}/api/profile/${encodeURIComponent(username)}?viewerId=${currentUserId}`);
        
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
function shareMyProfile() {
    if (!currentUserId) {
        alert("Tu dois être connecté !");
        return;
    }
    
    // Récupérer le username de l'utilisateur
    fetch(`${API_BASE_URL}/api/user/${currentUserId}`)
        .then(res => res.json())
        .then(data => {
            const profileURL = `${window.location.origin}${window.location.pathname}?profile=${data.username}`;
            
            // Copier dans le presse-papier
            navigator.clipboard.writeText(profileURL).then(() => {
                alert(`✅ Lien de profil copié !\n\n${profileURL}\n\nPartage-le à tes amis !`);
            }).catch(() => {
                // Fallback si clipboard API ne marche pas
                prompt("Copie ce lien pour partager ton profil :", profileURL);
            });
        });
}

// ==========================================
// VOIR LE PROFIL D'UN JOUEUR
// ==========================================
function viewPlayerProfile(username) {
    window.location.href = `${window.location.origin}${window.location.pathname}?profile=${encodeURIComponent(username)}`;
}

// ==========================================
// EXPOSITION AU SCOPE GLOBAL
// ==========================================
window.loadPublicProfile = loadPublicProfile;
window.shareMyProfile = shareMyProfile;
window.viewPlayerProfile = viewPlayerProfile;

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
