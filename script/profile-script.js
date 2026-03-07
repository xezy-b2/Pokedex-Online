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

    const isOwnProfile = currentUserId && String(profile.userId) === String(currentUserId);
    const editBtn = document.getElementById('profile-edit-btn');
    if (editBtn) editBtn.style.display = isOwnProfile ? 'inline-block' : 'none';
    const editPanel = document.getElementById('profile-edit-panel');
    if (editPanel) editPanel.style.display = 'none';

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
    
    // ==========================================
    // 🐾 COMPAGNON — avec support Méga / Shiny / WTF
    // ==========================================
    if (profile.companion) {
        document.getElementById('profile-companion-section').style.display = 'block';
        const comp = profile.companion;

        const isMega   = comp.isMega === true || (comp.name && comp.name.toLowerCase().includes('méga'));
        const isCustom = comp.isCustom === true;

        // Utilise getPokemonSprite si disponible (défini dans script.js), sinon fallback local
        const spriteUrl = (typeof getPokemonSprite === 'function')
            ? getPokemonSprite(comp)
            : _getProfileSprite(comp);

        const imgEl = document.getElementById('profile-companion-img');
        imgEl.src = spriteUrl;
        imgEl.onerror = function() {
            this.onerror = null;
            this.src = `${POKEAPI_URL}${comp.isShiny ? 'shiny/' : ''}${comp.pokedexId}.png`;
        };
        if (isMega) {
            imgEl.style.width  = '120px';
            imgEl.style.height = '120px';
            imgEl.style.objectFit = 'contain';
        }

        // Nom avec préfixes
        let nameParts = '';
        if (comp.isShiny) nameParts += '✨ ';
        if (isMega)       nameParts += '🔮 ';
        if (isCustom)     nameParts += '🌀 ';
        nameParts += comp.name;

        document.getElementById('profile-companion-name').textContent  = nameParts;
        document.getElementById('profile-companion-level').textContent = `Niveau ${comp.level}`;

        // Badges colorés sous le niveau
        const badgesHtml = [
            comp.isShiny ? `<span style="background:#f0c040;color:#1a1a2e;font-size:0.7em;padding:2px 8px;border-radius:10px;font-weight:bold;">✨ SHINY</span>` : '',
            isMega       ? `<span style="background:#ff00ff;color:#fff;font-size:0.7em;padding:2px 8px;border-radius:10px;font-weight:bold;">🔮 MÉGA</span>` : '',
            isCustom     ? `<span style="background:#00cfff;color:#1a1a2e;font-size:0.7em;padding:2px 8px;border-radius:10px;font-weight:bold;">🌀 WTF</span>` : '',
        ].filter(Boolean).join(' ');

        let badgesEl = document.getElementById('profile-companion-badges');
        if (!badgesEl) {
            badgesEl = document.createElement('div');
            badgesEl.id = 'profile-companion-badges';
            badgesEl.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;justify-content:center;margin-top:6px;';
            document.getElementById('profile-companion-level').insertAdjacentElement('afterend', badgesEl);
        }
        badgesEl.innerHTML = badgesHtml;

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
        document.getElementById('profile-favorite-team').innerHTML = profile.favoriteTeam.map(p => {
            const sprite   = (typeof getPokemonSprite === 'function') ? getPokemonSprite(p) : _getProfileSprite(p);
            const isMega   = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
            const isCustom = p.isCustom === true;
            let label = '';
            if (p.isShiny) label += '✨ ';
            if (isMega)    label += '🔮 ';
            if (isCustom)  label += '🌀 ';
            label += p.name;
            return `
            <div class="profile-team-pokemon">
                <img src="${sprite}" loading="lazy"
                     onerror="this.onerror=null;this.src=`${POKEAPI_URL}${p.isShiny?'shiny/':''}${p.pokedexId}.png`;"
                     style="${isMega ? 'width:80px;height:80px;' : ''}object-fit:contain;">
                <div class="profile-team-pokemon-name">${label}</div>
                <div class="profile-team-pokemon-level">Niv. ${p.level}</div>
            </div>`;
        }).join('');
    } else {
        document.getElementById('profile-team-section').style.display = 'none';
    }
    
    // ==========================================
    // 📦 COLLECTION — avec filtres Tous / Shiny / Méga / WTF + recherche
    // ==========================================
    if (profile.collection) {
        document.getElementById('profile-collection-section').style.display = 'block';
        document.getElementById('profile-collection-private').style.display = 'none';

        const collectionData = profile.collection;
        const grid = document.getElementById('profile-collection-grid');
        const section = document.getElementById('profile-collection-section');

        // --- Barre de filtre (injectée une seule fois) ---
        if (!document.getElementById('profile-collection-filters')) {
            const controlsDiv = document.createElement('div');
            controlsDiv.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:14px;';

            // Filtres
            const filterBar = document.createElement('div');
            filterBar.id = 'profile-collection-filters';
            filterBar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
            filterBar.innerHTML = `
                <button data-filter="all"    onclick="setCollectionFilter('all')">Tous</button>
                <button data-filter="shiny"  onclick="setCollectionFilter('shiny')">✨ Shiny</button>
                <button data-filter="mega"   onclick="setCollectionFilter('mega')">🔮 Méga</button>
                <button data-filter="custom" onclick="setCollectionFilter('custom')">🌀 WTF</button>
            `;

            // Recherche
            const searchInput = document.createElement('input');
            searchInput.id = 'profile-collection-search';
            searchInput.type = 'text';
            searchInput.placeholder = '🔍 Rechercher dans la collection...';
            searchInput.style.cssText = `
                width:100%;padding:9px 14px;border-radius:8px;
                border:1px solid var(--border-color,#ccc);
                background:var(--bg-secondary,#1a1a2e);color:var(--text-primary,#fff);
                font-size:0.95em;box-sizing:border-box;
            `;
            searchInput.oninput = (e) => {
                window._collectionNameFilter = e.target.value;
                renderCollectionGrid(window._collectionNameFilter, window._collectionTypeFilter);
            };

            controlsDiv.appendChild(filterBar);
            controlsDiv.appendChild(searchInput);
            section.insertBefore(controlsDiv, grid);
        }

        // Styles des boutons filtre collection
        function collectionBtnStyle(filter, isActive) {
            const palette = {
                all:    { bg: '#555555', fg: '#ffffff' },
                shiny:  { bg: '#f0c040', fg: '#1a1a2e' },
                mega:   { bg: '#ff00ff', fg: '#ffffff' },
                custom: { bg: '#00cfff', fg: '#1a1a2e' },
            };
            const c = palette[filter] || palette.all;
            return `padding:5px 14px;border-radius:20px;border:none;cursor:pointer;font-size:0.85em;font-weight:bold;
                    background:${isActive ? c.bg : 'var(--bg-secondary,#333)'};
                    color:${isActive ? c.fg : 'var(--text-secondary,#aaa)'};
                    transition:all 0.2s;`;
        }

        function renderCollectionGrid(nameFilter = '', typeFilter = 'all') {
            // Mettre à jour les styles des boutons
            const filterBar = document.getElementById('profile-collection-filters');
            if (filterBar) {
                filterBar.querySelectorAll('button').forEach(btn => {
                    btn.style.cssText = collectionBtnStyle(btn.dataset.filter, btn.dataset.filter === typeFilter);
                });
            }

            let list = collectionData;
            if (nameFilter) {
                list = list.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()));
            }
            if (typeFilter === 'shiny')  list = list.filter(p => p.isShiny === true);
            if (typeFilter === 'mega')   list = list.filter(p => p.isMega === true || (p.name && p.name.toLowerCase().includes('méga')));
            if (typeFilter === 'custom') list = list.filter(p => p.isCustom === true);

            if (list.length === 0) {
                grid.innerHTML = `<div style="color:var(--text-secondary);text-align:center;padding:30px;width:100%;">Aucun Pokémon trouvé 😔</div>`;
                return;
            }

            grid.innerHTML = list.map(p => {
                const sprite   = (typeof getPokemonSprite === 'function') ? getPokemonSprite(p) : _getProfileSprite(p);
                const isMega   = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
                const isCustom = p.isCustom === true;
                let label = '';
                if (p.isShiny) label += '✨ ';
                if (isMega)    label += '🔮 ';
                if (isCustom)  label += '🌀 ';
                label += p.name;
                return `
                <div class="pokedex-card ${p.isShiny ? 'is-shiny' : ''} ${isMega ? 'is-mega' : ''} ${isCustom ? 'is-custom' : ''}">
                    ${isMega   ? `<span style="position:absolute;top:6px;left:6px;background:#ff00ff;color:white;font-size:0.55em;padding:2px 5px;border-radius:4px;font-weight:bold;z-index:10;">MÉGA</span>` : ''}
                    ${isCustom ? `<span style="position:absolute;top:6px;left:6px;background:#00cfff;color:#1a1a2e;font-size:0.55em;padding:2px 5px;border-radius:4px;font-weight:bold;z-index:10;">WTF</span>` : ''}
                    <img src="${sprite}" class="poke-sprite" loading="lazy"
                         onerror="this.onerror=null;this.src=`${POKEAPI_URL}${p.isShiny?'shiny/':''}${p.pokedexId}.png`;"
                         style="${isMega ? 'width:100px;height:100px;' : ''}object-fit:contain;">
                    <span class="pokemon-name">${label}</span>
                    <div style="color:var(--accent-warm);font-size:0.85em;font-weight:bold;">Lv.${p.level}</div>
                </div>`;
            }).join('');
        }

        // Init état des filtres
        window._collectionTypeFilter = 'all';
        window._collectionNameFilter = '';
        window._renderCollectionGrid = renderCollectionGrid;

        // Reset la recherche à chaque chargement de profil
        const searchInput = document.getElementById('profile-collection-search');
        if (searchInput) searchInput.value = '';

        renderCollectionGrid();

    } else {
        document.getElementById('profile-collection-section').style.display = 'none';
        document.getElementById('profile-collection-private').style.display = 'block';
    }
}

// ==========================================
// 🖼️ FALLBACK SPRITE LOCAL
// Duplique getPokemonSprite de script.js au cas où il ne soit pas encore chargé
// ==========================================
function _getProfileSprite(p) {
    if (p.isCustom && p.customSprite) {
        return `assets/sprites/custom/${p.customSprite}`;
    }
    const isShiny = p.isShiny;
    const isMega  = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
    if (isMega) {
        let nameLower = p.name.toLowerCase();
        let suffix = "";
        if (nameLower.includes(' x')) suffix = "x";
        if (nameLower.includes(' y')) suffix = "y";
        let baseName = nameLower
            .replace(/[éèêë]/g, 'e')
            .replace('méga-', '')
            .replace('mega-', '')
            .replace(' x', '')
            .replace(' y', '')
            .trim();
        const translations = {
            "florizarre":"venusaur","dracaufeu":"charizard","tortank":"blastoise",
            "dardargnan":"beedrill","roucarnage":"pidgeot","alakazam":"alakazam",
            "flagadoss":"slowbro","ectoplasma":"gengar","kangourex":"kangaskhan",
            "scarabrute":"pinsir","leviator":"gyarados","ptera":"aerodactyl",
            "mewtwo":"mewtwo","pharamp":"ampharos","steelix":"steelix","cizayox":"scizor",
            "scarhino":"heracross","demolosse":"houndoom","tyranocif":"tyranitar",
            "jungleko":"sceptile","brasegali":"blaziken","laggron":"swampert",
            "gardevoir":"gardevoir","tenefix":"sableye","mysdibule":"mawhile",
            "galeking":"aggron","charmina":"medicham","elecsprint":"manectric",
            "sharpedo":"sharpedo","camerupt":"camerupt","altaria":"altaria",
            "branette":"banette","absol":"absol","oniglali":"glalie",
            "drattak":"salamence","metalosse":"metagross","latias":"latias",
            "latios":"latios","rayquaza":"rayquaza","lockpin":"lopunny",
            "carchacrok":"garchomp","lucario":"lucario","blizzaroi":"abomasnow",
            "gallame":"gallade","nanmeouie":"audino","diancie":"diancie"
        };
        const englishName = translations[baseName] || baseName;
        const megaType    = suffix ? `mega${suffix}` : `mega`;
        return `https://play.pokemonshowdown.com/sprites/ani${isShiny ? '-shiny' : ''}/${englishName}-${megaType}.gif`;
    }
    return `${POKEAPI_URL}${isShiny ? 'shiny/' : ''}${p.pokedexId}.png`;
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

// ==========================================
// 🖼️ SYSTÈME DE PHOTO DE PROFIL
// ==========================================

async function useDiscordAvatar() {
    if (!currentUserId) return alert("Connecte-toi d'abord !");
    try {
        const res  = await fetch(`${API_BASE_URL}/api/user/${currentUserId}`);
        const user = await res.json();
        if (user.discordAvatar) {
            await saveProfileAvatar(user.discordAvatar, 'discord');
            document.getElementById('profile-avatar-preview').innerHTML =
                `<img src="${user.discordAvatar}" style="width:100%;height:100%;object-fit:cover;">`;
            alert("✅ Avatar Discord activé !");
        } else {
            alert("❌ Aucun avatar Discord trouvé");
        }
    } catch (e) {
        console.error("Erreur avatar Discord:", e);
        alert("❌ Erreur lors de la récupération de l'avatar");
    }
}

// ==========================================
// 🎭 CHOISIR UN POKÉMON AVATAR
// Supporte Shiny / Méga (GIF animé) / WTF (sprite custom)
// ==========================================
async function choosePokemonAvatar() {
    if (!currentUserId) return alert("Connecte-toi d'abord !");
    try {
        const res      = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data     = await res.json();
        const captured = data.capturedPokemonsList || [];

        if (captured.length === 0) return alert("❌ Tu n'as aucun Pokémon capturé !");

        const modal = document.getElementById('pokemon-avatar-modal');
        const grid  = document.getElementById('pokemon-avatar-grid');

        // --- Barre de filtre par type ---
        let filterBar = document.getElementById('pokemon-avatar-filters');
        if (!filterBar) {
            filterBar = document.createElement('div');
            filterBar.id = 'pokemon-avatar-filters';
            filterBar.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
            grid.parentNode.insertBefore(filterBar, grid);
        }

        function filterBtnStyle(filter, isActive) {
            const palette = {
                all:    { bg: '#555555', fg: '#ffffff' },
                shiny:  { bg: '#f0c040', fg: '#1a1a2e' },
                mega:   { bg: '#ff00ff', fg: '#ffffff' },
                custom: { bg: '#00cfff', fg: '#1a1a2e' },
            };
            const c = palette[filter] || palette.all;
            return `padding:5px 14px;border-radius:20px;border:none;cursor:pointer;font-size:0.85em;font-weight:bold;
                    background:${isActive ? c.bg : 'var(--bg-secondary,#333)'};
                    color:${isActive ? c.fg : 'var(--text-secondary,#aaa)'};
                    transition:all 0.2s;`;
        }

        filterBar.innerHTML = `
            <button data-filter="all"    style="${filterBtnStyle('all',    true)}"  onclick="setAvatarFilter('all')">Tous</button>
            <button data-filter="shiny"  style="${filterBtnStyle('shiny',  false)}" onclick="setAvatarFilter('shiny')">✨ Shiny</button>
            <button data-filter="mega"   style="${filterBtnStyle('mega',   false)}" onclick="setAvatarFilter('mega')">🔮 Méga</button>
            <button data-filter="custom" style="${filterBtnStyle('custom', false)}" onclick="setAvatarFilter('custom')">🌀 WTF</button>
        `;

        // --- Barre de recherche ---
        let searchBar = document.getElementById('pokemon-avatar-search');
        if (!searchBar) {
            searchBar = document.createElement('input');
            searchBar.id          = 'pokemon-avatar-search';
            searchBar.type        = 'text';
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

        // --- Fonction de rendu ---
        function renderGrid(nameFilter = '', typeFilter = 'all') {
            let list = captured;
            if (nameFilter) {
                list = list.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()));
            }
            if (typeFilter === 'shiny')  list = list.filter(p => p.isShiny === true);
            if (typeFilter === 'mega')   list = list.filter(p => p.isMega === true || (p.name && p.name.toLowerCase().includes('méga')));
            if (typeFilter === 'custom') list = list.filter(p => p.isCustom === true);

            if (list.length === 0) {
                grid.innerHTML = `<div style="color:var(--text-secondary);text-align:center;padding:20px;width:100%;">Aucun Pokémon trouvé 😔</div>`;
                return;
            }

            grid.innerHTML = list.map(p => {
                const sprite   = (typeof getPokemonSprite === 'function') ? getPokemonSprite(p) : _getProfileSprite(p);
                const isMega   = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
                const isCustom = p.isCustom === true;
                let label = '';
                if (p.isShiny) label += '✨ ';
                if (isMega)    label += '🔮 ';
                if (isCustom)  label += '🌀 ';
                label += p.name;

                // Encode les paramètres pour l'onclick
                const safeCustomSprite = (p.customSprite || '').replace(/'/g, "\\'");
                const safeName         = (p.name || '').replace(/'/g, "\\'");

                return `
                <div class="pokedex-card ${p.isShiny ? 'is-shiny' : ''} ${isMega ? 'is-mega' : ''} ${isCustom ? 'is-custom' : ''}"
                     onclick="selectPokemonAvatar('${p._id}', ${p.pokedexId}, ${!!p.isShiny}, ${!!p.isMega}, ${!!p.isCustom}, '${safeCustomSprite}', '${safeName}')"
                     style="cursor:pointer;position:relative;">
                    ${isMega   ? `<span style="position:absolute;top:4px;left:4px;background:#ff00ff;color:white;font-size:0.55em;padding:1px 5px;border-radius:4px;font-weight:bold;z-index:10;">MÉGA</span>` : ''}
                    ${isCustom ? `<span style="position:absolute;top:4px;left:4px;background:#00cfff;color:#1a1a2e;font-size:0.55em;padding:1px 5px;border-radius:4px;font-weight:bold;z-index:10;">WTF</span>` : ''}
                    <img src="${sprite}"
                         class="poke-sprite" loading="lazy"
                         onerror="this.onerror=null;this.src=`${POKEAPI_URL}${p.isShiny?'shiny/':''}${p.pokedexId}.png`;"
                         style="width:80px;height:80px;object-fit:contain;margin:0 auto;">
                    <span class="pokemon-name">${label}</span>
                    <div style="color:var(--accent-warm);font-size:0.85em;">Lv.${p.level}</div>
                </div>`;
            }).join('');
        }

        // Stocker l'état des filtres globalement pour setAvatarFilter
        window._avatarTypeFilter  = 'all';
        window._avatarNameFilter  = '';
        window._renderAvatarGrid  = renderGrid;
        window._filterBtnStyleFn  = filterBtnStyle;

        searchBar.oninput = (e) => {
            window._avatarNameFilter = e.target.value;
            renderGrid(window._avatarNameFilter, window._avatarTypeFilter);
        };

        renderGrid();
        modal.classList.add('active');
        setTimeout(() => searchBar.focus(), 100);

    } catch (e) {
        console.error("Erreur chargement Pokémon:", e);
        alert("❌ Erreur lors du chargement de ta collection");
    }
}

// Changer le filtre actif (appelé depuis les boutons)
function setAvatarFilter(filter) {
    window._avatarTypeFilter = filter;

    // Mettre à jour les styles des boutons
    const filterBar = document.getElementById('pokemon-avatar-filters');
    if (filterBar && window._filterBtnStyleFn) {
        filterBar.querySelectorAll('button').forEach(btn => {
            const f = btn.dataset.filter;
            btn.style.cssText = window._filterBtnStyleFn(f, f === filter);
        });
    }

    if (window._renderAvatarGrid) {
        window._renderAvatarGrid(window._avatarNameFilter || '', filter);
    }
}

// Sélectionner un Pokémon comme avatar — utilise le vrai sprite (méga GIF, wtf custom, etc.)
async function selectPokemonAvatar(id, pokedexId, isShiny, isMega, isCustom, customSprite, name) {
    const p          = { _id: id, pokedexId, isShiny, isMega, isCustom, customSprite, name };
    const avatarUrl  = (typeof getPokemonSprite === 'function') ? getPokemonSprite(p) : _getProfileSprite(p);
    const fallbackUrl = `${POKEAPI_URL}${isShiny ? 'shiny/' : ''}${pokedexId}.png`;

    try {
        await saveProfileAvatar(avatarUrl, 'pokemon');
        document.getElementById('profile-avatar-preview').innerHTML =
            `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:contain;"
                  onerror="this.onerror=null;this.src='${fallbackUrl}';">`;
        closePokemonAvatarModal();
        alert("✅ Avatar Pokémon activé !");
    } catch (e) {
        console.error("Erreur sauvegarde avatar:", e);
        alert("❌ Erreur lors de la sauvegarde de l'avatar");
    }
}

async function saveProfileAvatar(avatarUrl, source) {
    const res = await fetch(`${API_BASE_URL}/api/profile/set-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, avatar: avatarUrl, source })
    });
    if (!res.ok) throw new Error("Échec de la sauvegarde");
    return res.json();
}

function closePokemonAvatarModal() {
    document.getElementById('pokemon-avatar-modal').classList.remove('active');
}

// Filtre collection profil public (appelé depuis les boutons HTML)
function setCollectionFilter(filter) {
    window._collectionTypeFilter = filter;
    if (window._renderCollectionGrid) {
        window._renderCollectionGrid(window._collectionNameFilter || '', filter);
    }
}

window.setCollectionFilter     = setCollectionFilter;
window.useDiscordAvatar        = useDiscordAvatar;
window.choosePokemonAvatar     = choosePokemonAvatar;
window.selectPokemonAvatar     = selectPokemonAvatar;
window.closePokemonAvatarModal = closePokemonAvatarModal;
window.setAvatarFilter         = setAvatarFilter;

console.log("✅ Système de photo de profil chargé");
