// ==========================================
// 🤖 COMBATS CONTRE BOT
// ==========================================

let selectedBotDifficulty = null;
let selectedFighterPokemon = null; // Pokémon choisi pour combattre

// ==========================================
// SÉLECTIONNER UNE DIFFICULTÉ
// ==========================================
async function selectBotDifficulty(difficulty) {
    selectedBotDifficulty = difficulty;

    document.querySelectorAll('.bot-difficulty-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`[data-difficulty="${difficulty}"]`)?.classList.add('selected');

    try {
        const res = await fetch(`${API_BASE_URL}/api/battle/bot-preview/${difficulty}?userId=${currentUserId}`);
        const data = await res.json();

        if (data.bot) {
            document.getElementById('bot-preview').style.display = 'block';
            document.getElementById('bot-preview-name').textContent = data.bot.name;
            document.getElementById('bot-preview-pokemon').textContent =
                `${data.bot.pokemon.isShiny ? '✨ ' : ''}${data.bot.pokemon.name}`;
            document.getElementById('bot-preview-level').textContent = `Niv. ${data.bot.pokemon.level}`;
            document.getElementById('bot-preview-power').textContent = `💪 Puissance : ${data.bot.power}`;

            const imgUrl = `${POKEAPI_URL}${data.bot.pokemon.isShiny ? 'shiny/' : ''}${data.bot.pokemon.pokedexId}.png`;
            document.getElementById('bot-preview-img').src = imgUrl;
        }

    } catch (e) {
        console.error("Erreur aperçu bot:", e);
    }

    _updateFightBotButton();
}

// ==========================================
// ACTIVER / DÉSACTIVER LE BOUTON COMBAT
// ==========================================
function _updateFightBotButton() {
    const btn = document.getElementById('btn-fight-bot');
    if (!btn) return;
    const ready = selectedBotDifficulty && selectedFighterPokemon;
    btn.disabled = !ready;
    btn.style.opacity = ready ? '1' : '0.5';
}

// ==========================================
// OUVRIR LE MODAL DE SÉLECTION DU POKÉMON
// ==========================================
async function openFighterPokemonModal() {
    if (!currentUserId) return alert("Connecte-toi d'abord !");

    try {
        const res      = await fetch(`${API_BASE_URL}/api/pokedex/${currentUserId}`);
        const data     = await res.json();
        const captured = data.capturedPokemonsList || [];

        if (captured.length === 0) return alert("❌ Tu n'as aucun Pokémon capturé !");

        const modal = document.getElementById('fighter-pokemon-modal');
        const grid  = document.getElementById('fighter-pokemon-grid');

        // ---- Filtres ----
        let filterBar = document.getElementById('fighter-pokemon-filters');
        if (!filterBar) {
            filterBar = document.createElement('div');
            filterBar.id = 'fighter-pokemon-filters';
            filterBar.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
            grid.parentNode.insertBefore(filterBar, grid);
        }

        function fighterBtnStyle(filter, isActive) {
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
            <button data-filter="all"    onclick="setFighterFilter('all')">Tous</button>
            <button data-filter="shiny"  onclick="setFighterFilter('shiny')">✨ Shiny</button>
            <button data-filter="mega"   onclick="setFighterFilter('mega')">🔮 Méga</button>
            <button data-filter="custom" onclick="setFighterFilter('custom')">🌀 WTF</button>
        `;

        // ---- Recherche ----
        let searchBar = document.getElementById('fighter-pokemon-search');
        if (!searchBar) {
            searchBar = document.createElement('input');
            searchBar.id = 'fighter-pokemon-search';
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
        function renderFighterGrid(nameFilter = '', typeFilter = 'all') {
            // Mise à jour styles boutons
            filterBar.querySelectorAll('button').forEach(btn => {
                btn.style.cssText = fighterBtnStyle(btn.dataset.filter, btn.dataset.filter === typeFilter);
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
                const sprite   = (typeof getPokemonSprite === 'function') ? getPokemonSprite(p) : _getFighterSprite(p);
                const isMega   = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
                const isCustom = p.isCustom === true;
                const isSelected = selectedFighterPokemon && selectedFighterPokemon._id === p._id;
                let label = '';
                if (p.isShiny) label += '✨ ';
                if (isMega)    label += '🔮 ';
                if (isCustom)  label += '🌀 ';
                label += p.name;

                return `
                <div class="pokedex-card pokemon-selectable ${p.isShiny ? 'is-shiny' : ''} ${isMega ? 'is-mega' : ''} ${isCustom ? 'is-custom' : ''} ${isSelected ? 'pokemon-selected' : ''}"
                     onclick="selectFighterPokemon(${JSON.stringify(p).replace(/"/g, '&quot;')})"
                     style="cursor:pointer;position:relative;">
                    ${isMega   ? `<span style="position:absolute;top:4px;left:4px;background:#ff00ff;color:white;font-size:0.55em;padding:1px 5px;border-radius:4px;font-weight:bold;z-index:10;">MÉGA</span>` : ''}
                    ${isCustom ? `<span style="position:absolute;top:4px;left:4px;background:#00cfff;color:#1a1a2e;font-size:0.55em;padding:1px 5px;border-radius:4px;font-weight:bold;z-index:10;">WTF</span>` : ''}
                    ${isSelected ? `<span style="position:absolute;top:4px;right:4px;background:var(--accent-nature);color:#fff;font-size:0.7em;padding:2px 6px;border-radius:4px;font-weight:bold;z-index:10;">✓</span>` : ''}
                    <img src="${sprite}" class="poke-sprite" loading="lazy"
                         onerror="this.onerror=null;this.src='${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png';"
                         style="width:80px;height:80px;object-fit:contain;margin:0 auto;">
                    <span class="pokemon-name">${label}</span>
                    <div style="color:var(--accent-warm);font-size:0.85em;">Lv.${p.level}</div>
                </div>`;
            }).join('');
        }

        // Stocker l'état
        window._fighterTypeFilter  = window._fighterTypeFilter || 'all';
        window._fighterNameFilter  = '';
        window._renderFighterGrid  = renderFighterGrid;
        window._fighterBtnStyleFn  = fighterBtnStyle;

        searchBar.oninput = (e) => {
            window._fighterNameFilter = e.target.value;
            renderFighterGrid(window._fighterNameFilter, window._fighterTypeFilter);
        };

        renderFighterGrid('', window._fighterTypeFilter);
        modal.classList.add('active');
        setTimeout(() => searchBar.focus(), 100);

    } catch (e) {
        console.error("Erreur chargement Pokémon:", e);
        alert("❌ Erreur lors du chargement de ta collection");
    }
}

// ==========================================
// CHANGER FILTRE (appelé depuis les boutons)
// ==========================================
function setFighterFilter(filter) {
    window._fighterTypeFilter = filter;
    if (window._renderFighterGrid) {
        window._renderFighterGrid(window._fighterNameFilter || '', filter);
    }
}

// ==========================================
// CONFIRMER LA SÉLECTION D'UN POKÉMON
// ==========================================
function selectFighterPokemon(p) {
    selectedFighterPokemon = p;

    // Mettre à jour la grille pour montrer la sélection
    if (window._renderFighterGrid) {
        window._renderFighterGrid(window._fighterNameFilter || '', window._fighterTypeFilter || 'all');
    }

    // Fermer le modal après un court délai
    setTimeout(() => {
        closeFighterPokemonModal();

        // Mettre à jour l'aperçu du Pokémon choisi
        const sprite = (typeof getPokemonSprite === 'function') ? getPokemonSprite(p) : _getFighterSprite(p);
        const isMega   = p.isMega === true || (p.name && p.name.toLowerCase().includes('méga'));
        const isCustom = p.isCustom === true;
        let label = '';
        if (p.isShiny) label += '✨ ';
        if (isMega)    label += '🔮 ';
        if (isCustom)  label += '🌀 ';
        label += p.name;

        const preview = document.getElementById('selected-fighter-preview');
        if (preview) {
            preview.style.display = 'flex';
            preview.innerHTML = `
                <img src="${sprite}" 
                     onerror="this.onerror=null;this.src='${POKEAPI_URL}${p.isShiny ? 'shiny/' : ''}${p.pokedexId}.png';"
                     style="width:60px;height:60px;object-fit:contain;flex-shrink:0;">
                <div style="text-align:left;">
                    <div style="font-weight:700;color:var(--text-primary);">${label}</div>
                    <div style="color:var(--text-secondary);font-size:0.85em;">Niv. ${p.level}</div>
                    <div style="display:flex;gap:4px;margin-top:3px;">
                        ${p.isShiny ? `<span style="background:#f0c040;color:#1a1a2e;font-size:0.65em;padding:1px 6px;border-radius:8px;font-weight:bold;">✨ SHINY</span>` : ''}
                        ${isMega    ? `<span style="background:#ff00ff;color:#fff;font-size:0.65em;padding:1px 6px;border-radius:8px;font-weight:bold;">🔮 MÉGA</span>` : ''}
                        ${isCustom  ? `<span style="background:#00cfff;color:#1a1a2e;font-size:0.65em;padding:1px 6px;border-radius:8px;font-weight:bold;">🌀 WTF</span>` : ''}
                    </div>
                </div>
                <button onclick="openFighterPokemonModal()" 
                        style="margin-left:auto;background:transparent;border:1px solid var(--border-color,#555);
                               color:var(--text-secondary);border-radius:8px;padding:4px 10px;cursor:pointer;font-size:0.8em;">
                    Changer
                </button>
            `;
        }

        _updateFightBotButton();
    }, 250);
}

function closeFighterPokemonModal() {
    document.getElementById('fighter-pokemon-modal')?.classList.remove('active');
}

// ==========================================
// FALLBACK SPRITE LOCAL
// ==========================================
function _getFighterSprite(p) {
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
// COMBATTRE LE BOT
// ==========================================
async function fightBot() {
    if (!selectedBotDifficulty) {
        alert("Choisis d'abord une difficulté !");
        return;
    }
    if (!selectedFighterPokemon) {
        alert("Choisis d'abord ton Pokémon combattant !");
        return;
    }

    const pokeName = selectedFighterPokemon.name;
    if (!confirm(`⚔️ Envoyer ${pokeName} combattre en mode ${selectedBotDifficulty.toUpperCase()} ?`)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/battle/bot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                difficulty: selectedBotDifficulty,
                pokemonId: selectedFighterPokemon._id
            })
        });

        const data = await res.json();

        if (res.ok) {
            showBotBattleResult(data);
            localStorage.removeItem('pokedex_data_cache');
            loadBattleStats();
            if (typeof loadProfile === 'function') loadProfile();
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
    const rewards  = data.battle.rewards;
    const content  = document.getElementById('battle-result-content');

    content.innerHTML = `
        <div style="font-size:4em;margin:20px 0;">${isWinner ? '🏆' : '💪'}</div>

        <h2 style="color:${isWinner ? 'var(--accent-nature)' : 'var(--accent-pink)'};margin-bottom:20px;">
            ${isWinner ? 'VICTOIRE !' : 'DÉFAITE'}
        </h2>

        <div style="text-align:center;margin-bottom:20px;">
            <div style="color:var(--accent-warm);font-weight:700;font-size:1.1em;">
                Combat contre ${data.battle.bot}
            </div>
            <div style="color:var(--text-secondary);font-size:0.9em;">
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

        <p style="color:var(--text-secondary);margin-top:15px;font-size:0.9em;">
            ${isWinner ? "Excellent ! Continue à t'entraîner !" : 'Continue, tu vas progresser !'}
        </p>
    `;

    document.getElementById('battle-result-modal').style.display = 'flex';
}

// ==========================================
// EXPOSITION AU SCOPE GLOBAL
// ==========================================
window.selectBotDifficulty     = selectBotDifficulty;
window.fightBot                = fightBot;
window.openFighterPokemonModal = openFighterPokemonModal;
window.closeFighterPokemonModal = closeFighterPokemonModal;
window.selectFighterPokemon    = selectFighterPokemon;
window.setFighterFilter        = setFighterFilter;

console.log("✅ Système de combat contre bot chargé côté client");
