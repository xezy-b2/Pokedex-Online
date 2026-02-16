let selectedOfferPokemon = null;
let selectedProposePokemon = null;
let currentOffer = null;

// ==========================================
// CHARGER LES OFFRES D'ÉCHANGE
// ==========================================
async function loadTradeOffers() {
    const filter = document.getElementById('trade-filter')?.value || 'all';
    const search = document.getElementById('trade-search')?.value || '';
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/offers?filter=${filter}&search=${search}&userId=${currentUserId}`);
        const data = await res.json();
        
        const grid = document.getElementById('trade-offers-grid');
        if (!grid) return;
        
        if (data.offers.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Aucune offre disponible pour le moment.</p>';
            return;
        }
        
        grid.innerHTML = data.offers.map(offer => createTradeCard(offer)).join('');
        
    } catch (e) {
        console.error("Erreur chargement offres:", e);
    }
}

// ==========================================
// CRÉER UNE CARTE D'OFFRE
// ==========================================
function createTradeCard(offer) {
    const timeAgo = getTimeAgo(offer.createdAt);
    const conditions = [];
    
    if (offer.wantedPokemon.conditions.minLevel) {
        conditions.push(`Niv. ${offer.wantedPokemon.conditions.minLevel}+`);
    }
    if (offer.wantedPokemon.conditions.mustBeShiny) {
        conditions.push('✨ Shiny');
    }
    if (offer.wantedPokemon.conditions.mustBeMega) {
        conditions.push('🔥 Méga');
    }
    
    const conditionsBadges = conditions.length > 0 
        ? `<div class="trade-conditions">${conditions.map(c => `<span class="trade-condition-badge">${c}</span>`).join('')}</div>`
        : '';
    
    return `
        <div class="trade-card">
            <div class="trade-card-header">
                <span class="trade-username">👤 ${offer.creatorUsername}</span>
                <span class="trade-date">⏱️ ${timeAgo}</span>
            </div>
            
            <div class="trade-exchange">
                <div class="trade-pokemon">
                    <img src="${getPokemonSprite(offer.offeredPokemon)}" loading="lazy">
                    <div class="trade-pokemon-name">${offer.offeredPokemon.isShiny ? '✨ ' : ''}${offer.offeredPokemon.name}</div>
                    <div class="trade-pokemon-level">Niv. ${offer.offeredPokemon.level}</div>
                </div>
                
                <div class="trade-arrow">⇆</div>
                
                <div class="trade-pokemon">
                    <div style="width: 80px; height: 80px; background: rgba(255, 154, 108, 0.1); border-radius: 15px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 2em;">❓</div>
                    <div class="trade-pokemon-name">${offer.wantedPokemon.name}</div>
                    ${conditionsBadges}
                </div>
            </div>
            
            ${offer.message ? `<div class="trade-message">💬 "${offer.message}"</div>` : ''}
            
            <div style="text-align: center; margin-top: 15px;">
                <button class="cta-button" onclick="showProposeModal('${offer._id}')" style="width: 100%; max-width: 250px;">
                    📤 Proposer un Échange
                </button>
            </div>
        </div>
    `;
}

// ==========================================
// MES OFFRES
// ==========================================
async function loadMyOffers() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/my-activity/${currentUserId}`);
        const data = await res.json();
        
        const grid = document.getElementById('my-offers-grid');
        if (!grid) return;
        
        if (data.myOffers.length === 0) {
            grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Tu n\'as créé aucune offre.</p>';
            return;
        }
        
        grid.innerHTML = data.myOffers.map(offer => createMyOfferCard(offer)).join('');
        
    } catch (e) {
        console.error("Erreur chargement mes offres:", e);
    }
}

function createMyOfferCard(offer) {
    const pendingProposals = offer.proposals.filter(p => p.status === 'pending').length;
    const statusText = offer.status === 'completed' ? '✅ Complété' : offer.status === 'cancelled' ? '❌ Annulé' : `📬 ${pendingProposals} proposition(s)`;
    
    return `
        <div class="trade-card">
            <div class="trade-card-header">
                <span class="trade-username">Mon Offre</span>
                <span class="trade-date">${statusText}</span>
            </div>
            
            <div class="trade-exchange">
                <div class="trade-pokemon">
                    <img src="${getPokemonSprite(offer.offeredPokemon)}" loading="lazy">
                    <div class="trade-pokemon-name">${offer.offeredPokemon.isShiny ? '✨ ' : ''}${offer.offeredPokemon.name}</div>
                    <div class="trade-pokemon-level">Niv. ${offer.offeredPokemon.level}</div>
                </div>
                
                <div class="trade-arrow">⇆</div>
                
                <div class="trade-pokemon">
                    <div style="width: 80px; height: 80px; background: rgba(255, 154, 108, 0.1); border-radius: 15px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; font-size: 2em;">❓</div>
                    <div class="trade-pokemon-name">${offer.wantedPokemon.name}</div>
                </div>
            </div>
            
            ${offer.message ? `<div class="trade-message">💬 "${offer.message}"</div>` : ''}
            
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                ${offer.status === 'active' ? `
                    ${pendingProposals > 0 ? `<button class="cta-button" onclick="viewProposals('${offer._id}')" style="flex: 1;">📬 Voir les ${pendingProposals} proposition(s)</button>` : ''}
                    <button class="btn-action btn-sell" onclick="cancelOffer('${offer._id}')" style="flex: 1;">❌ Annuler</button>
                ` : ''}
            </div>
        </div>
    `;
}

// ==========================================
// PROPOSITIONS REÇUES
// ==========================================
async function loadReceivedProposals() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/my-activity/${currentUserId}`);
        const data = await res.json();
        
        const grid = document.getElementById('received-proposals-grid');
        if (!grid) return;
        
        // Compter les propositions en attente
        let totalPending = 0;
        data.receivedProposals.forEach(offer => {
            totalPending += offer.proposals.filter(p => p.status === 'pending').length;
        });
        
        // Mettre à jour le badge
        const badge = document.getElementById('badge-received');
        if (badge) {
            if (totalPending > 0) {
                badge.textContent = totalPending;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
        
        if (totalPending === 0) {
            grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Aucune proposition en attente.</p>';
            return;
        }
        
        let html = '';
        data.receivedProposals.forEach(offer => {
            offer.proposals.filter(p => p.status === 'pending').forEach(proposal => {
                html += createProposalCard(offer, proposal);
            });
        });
        
        grid.innerHTML = html;
        
    } catch (e) {
        console.error("Erreur chargement propositions:", e);
    }
}

function createProposalCard(offer, proposal) {
    const timeAgo = getTimeAgo(proposal.createdAt);
    
    return `
        <div class="trade-card">
            <div class="trade-card-header">
                <span class="trade-username">👤 ${proposal.proposerUsername}</span>
                <span class="trade-date">⏱️ ${timeAgo}</span>
            </div>
            
            <p style="color: var(--text-secondary); margin-bottom: 15px;">Propose un échange pour ton offre :</p>
            
            <div class="trade-exchange">
                <div class="trade-pokemon">
                    <img src="${getPokemonSprite(offer.offeredPokemon)}" loading="lazy">
                    <div class="trade-pokemon-name">${offer.offeredPokemon.isShiny ? '✨ ' : ''}${offer.offeredPokemon.name}</div>
                    <div class="trade-pokemon-level">Niv. ${offer.offeredPokemon.level}</div>
                    <div style="font-size: 0.8em; color: var(--accent-warm);">Tu donnes</div>
                </div>
                
                <div class="trade-arrow">⇆</div>
                
                <div class="trade-pokemon">
                    <img src="${getPokemonSprite(proposal.offeredPokemon)}" loading="lazy">
                    <div class="trade-pokemon-name">${proposal.offeredPokemon.isShiny ? '✨ ' : ''}${proposal.offeredPokemon.name}</div>
                    <div class="trade-pokemon-level">Niv. ${proposal.offeredPokemon.level}</div>
                    <div style="font-size: 0.8em; color: var(--accent-nature);">Tu reçois</div>
                </div>
            </div>
            
            ${proposal.message ? `<div class="trade-message">💬 "${proposal.message}"</div>` : ''}
            
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button class="cta-button" onclick="acceptProposal('${offer._id}', '${proposal.proposalId}')" style="flex: 1;">
                    ✅ Accepter
                </button>
                <button class="btn-action btn-sell" onclick="rejectProposal('${offer._id}', '${proposal.proposalId}')" style="flex: 1;">
                    ❌ Refuser
                </button>
            </div>
        </div>
    `;
}

// ==========================================
// SWITCH TAB
// ==========================================
function switchTradeTab(tab) {
    // Changer les tabs
    document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tab-${tab}`)?.classList.add('active');
    
    // Changer le contenu
    document.querySelectorAll('.trade-content').forEach(c => c.style.display = 'none');
    document.getElementById(`${tab}-content`).style.display = 'block';
    
    // Charger les données
    if (tab === 'all-offers') {
        loadTradeOffers();
    } else if (tab === 'my-offers') {
        loadMyOffers();
    } else if (tab === 'received') {
        loadReceivedProposals();
    }
}

// ==========================================
// MODAL CRÉER UNE OFFRE
// ==========================================
function showCreateOfferModal() {
    selectedOfferPokemon = null;
    document.getElementById('create-offer-modal').style.display = 'flex';
    document.getElementById('step-1-select-pokemon').style.display = 'block';
    document.getElementById('step-2-define-wanted').style.display = 'none';
    loadSelectablePokemon('select-pokemon-grid', 'offer');
}

function closeCreateOfferModal() {
    document.getElementById('create-offer-modal').style.display = 'none';
    selectedOfferPokemon = null;
}

function loadSelectablePokemon(gridId, type) {
    const grid = document.getElementById(gridId);
    if (!grid || !cachedPokedexData) return;
    
    // Compter les Pokémon par pokedexId pour identifier les doublons
    const pokemonCounts = {};
    cachedPokedexData.capturedPokemonsList.forEach(p => {
        const key = `${p.pokedexId}_${p.isShiny ? 'shiny' : 'normal'}_${p.isMega ? 'mega' : 'normal'}_${p.isCustom ? 'custom' : 'normal'}`;
        if (!pokemonCounts[key]) {
            pokemonCounts[key] = [];
        }
        pokemonCounts[key].push(p);
    });
    
    // Filtrer pour ne garder que les doublons (+ exclure compagnon et favoris)
    const pokemons = cachedPokedexData.capturedPokemonsList.filter(p => {
        // Ne pas montrer le compagnon
        if (currentCompanionId && p._id === currentCompanionId) return false;
        
        // Ne pas montrer les favoris (optionnel, tu peux commenter cette ligne si tu veux autoriser les favoris)
        if (favoritePokes.includes(p._id)) return false;
        
        // Vérifier si c'est un doublon
        const key = `${p.pokedexId}_${p.isShiny ? 'shiny' : 'normal'}_${p.isMega ? 'mega' : 'normal'}_${p.isCustom ? 'custom' : 'normal'}`;
        const count = pokemonCounts[key].length;
        
        // Garder seulement si on en a 2 ou plus
        return count >= 2;
    });
    
    if (pokemons.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Aucun doublon disponible pour l\'échange.<br><small>Seuls les Pokémon en double peuvent être échangés.</small></p>';
        return;
    }
    
    grid.innerHTML = pokemons.map(p => {
        // Compter combien on en a
        const key = `${p.pokedexId}_${p.isShiny ? 'shiny' : 'normal'}_${p.isMega ? 'mega' : 'normal'}_${p.isCustom ? 'custom' : 'normal'}`;
        const count = pokemonCounts[key].length;
        
        return `
            <div class="pokedex-card pokemon-selectable" onclick="selectPokemon('${p._id}', '${type}')" id="${type}-pokemon-${p._id}">
                <img src="${getPokemonSprite(p)}" loading="lazy">
                <h3>${p.isShiny ? '✨ ' : ''}${p.name}</h3>
                <p>Niv. ${p.level}</p>
                <p style="font-size: 0.8em; color: var(--accent-warm);">x${count} en stock</p>
            </div>
        `;
    }).join('');
}

function selectPokemon(pokemonId, type) {
    // Retirer la sélection précédente
    document.querySelectorAll(`.${type}-pokemon-selected`).forEach(el => {
        el.classList.remove('pokemon-selected', `${type}-pokemon-selected`);
    });
    
    // Ajouter la nouvelle sélection
    const card = document.getElementById(`${type}-pokemon-${pokemonId}`);
    if (card) {
        card.classList.add('pokemon-selected', `${type}-pokemon-selected`);
    }
    
    if (type === 'offer') {
        selectedOfferPokemon = pokemonId;
        document.getElementById('btn-next-step').disabled = false;
        document.getElementById('btn-next-step').style.opacity = '1';
    } else if (type === 'propose') {
        selectedProposePokemon = pokemonId;
        document.getElementById('btn-submit-propose').disabled = false;
        document.getElementById('btn-submit-propose').style.opacity = '1';
    }
}

function nextStepCreateOffer() {
    if (!selectedOfferPokemon) return;
    document.getElementById('step-1-select-pokemon').style.display = 'none';
    document.getElementById('step-2-define-wanted').style.display = 'block';
}

function previousStepCreateOffer() {
    document.getElementById('step-1-select-pokemon').style.display = 'block';
    document.getElementById('step-2-define-wanted').style.display = 'none';
}

async function submitCreateOffer() {
    const wantedName = document.getElementById('wanted-pokemon-name').value.trim();
    
    if (!selectedOfferPokemon || !wantedName) {
        alert("Veuillez remplir tous les champs obligatoires");
        return;
    }
    
    const conditions = {
        minLevel: parseInt(document.getElementById('cond-min-level').value) || null,
        mustBeShiny: document.getElementById('cond-shiny').checked,
        mustBeMega: document.getElementById('cond-mega').checked
    };
    
    const message = document.getElementById('offer-message').value.trim();
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/create-offer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                offeredPokemonId: selectedOfferPokemon,
                wantedPokemonName: wantedName,
                conditions,
                message
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert("✅ " + data.message);
            closeCreateOfferModal();
            switchTradeTab('my-offers');
        } else {
            alert("❌ " + data.error);
        }
        
    } catch (e) {
        console.error("Erreur création offre:", e);
        alert("Erreur lors de la création de l'offre");
    }
}

// ==========================================
// MODAL PROPOSER
// ==========================================
async function showProposeModal(offerId) {
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/offers`);
        const data = await res.json();
        const offer = data.offers.find(o => o._id === offerId);
        
        if (!offer) {
            alert("Offre introuvable");
            return;
        }
        
        currentOffer = offer;
        selectedProposePokemon = null;
        
        // Afficher les infos de l'offre
        const infoDiv = document.getElementById('propose-offer-info');
        infoDiv.innerHTML = `
            <p style="color: var(--text-primary); margin-bottom: 10px;">
                <strong>👤 ${offer.creatorUsername}</strong> cherche :
            </p>
            <p style="color: var(--accent-warm); font-size: 1.2em; font-weight: 700;">
                ${offer.wantedPokemon.name}
            </p>
            ${offer.wantedPokemon.conditions.minLevel ? `<p style="color: var(--text-secondary);">📈 Niveau minimum : ${offer.wantedPokemon.conditions.minLevel}</p>` : ''}
            ${offer.wantedPokemon.conditions.mustBeShiny ? `<p style="color: var(--text-secondary);">✨ Doit être chromatique</p>` : ''}
            ${offer.wantedPokemon.conditions.mustBeMega ? `<p style="color: var(--text-secondary);">🔥 Doit être une Méga-évolution</p>` : ''}
        `;
        
        // Charger uniquement les Pokémon qui correspondent
        loadMatchingPokemon(offer);
        
        document.getElementById('propose-trade-modal').style.display = 'flex';
        
    } catch (e) {
        console.error("Erreur:", e);
        alert("Erreur lors du chargement de l'offre");
    }
}

function loadMatchingPokemon(offer) {
    const grid = document.getElementById('propose-pokemon-grid');
    if (!grid || !cachedPokedexData) return;
    
    const pokemons = cachedPokedexData.capturedPokemonsList.filter(p => {
        // Ne pas montrer le compagnon
        if (currentCompanionId && p._id === currentCompanionId) return false;
        
        // Vérifier le nom
        if (p.name.toLowerCase() !== offer.wantedPokemon.name.toLowerCase()) return false;
        
        // Vérifier les conditions
        const cond = offer.wantedPokemon.conditions;
        if (cond.minLevel && p.level < cond.minLevel) return false;
        if (cond.mustBeShiny && !p.isShiny) return false;
        if (cond.mustBeMega && !p.isMega) return false;
        
        return true;
    });
    
    if (pokemons.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); padding: 40px;">Tu n\'as aucun Pokémon correspondant à cette offre.</p>';
        return;
    }
    
    grid.innerHTML = pokemons.map(p => {
        return `
            <div class="pokedex-card pokemon-selectable" onclick="selectPokemon('${p._id}', 'propose')" id="propose-pokemon-${p._id}">
                <img src="${getPokemonSprite(p)}" loading="lazy">
                <h3>${p.isShiny ? '✨ ' : ''}${p.name}</h3>
                <p>Niv. ${p.level}</p>
            </div>
        `;
    }).join('');
}

function closeProposeModal() {
    document.getElementById('propose-trade-modal').style.display = 'none';
    selectedProposePokemon = null;
    currentOffer = null;
}

async function submitPropose() {
    if (!selectedProposePokemon || !currentOffer) {
        alert("Veuillez sélectionner un Pokémon");
        return;
    }
    
    const message = document.getElementById('propose-message').value.trim();
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/propose`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                offerId: currentOffer._id,
                offeredPokemonId: selectedProposePokemon,
                message
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert("✅ " + data.message);
            closeProposeModal();
            loadTradeOffers();
        } else {
            alert("❌ " + data.error);
        }
        
    } catch (e) {
        console.error("Erreur proposition:", e);
        alert("Erreur lors de la proposition");
    }
}

// ==========================================
// ACCEPTER/REFUSER PROPOSITION
// ==========================================
async function acceptProposal(offerId, proposalId) {
    if (!confirm("⚠️ Accepter cet échange ? Cette action est DÉFINITIVE !")) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                offerId,
                proposalId
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            alert(`🎉 Échange réussi ! Tu as reçu ${data.receivedPokemon.name} Niv.${data.receivedPokemon.level} !`);
            localStorage.removeItem('pokedex_data_cache');
            loadPokedex();
            loadReceivedProposals();
        } else {
            alert("❌ " + data.error);
        }
        
    } catch (e) {
        console.error("Erreur acceptation:", e);
        alert("Erreur lors de l'acceptation");
    }
}

async function rejectProposal(offerId, proposalId) {
    if (!confirm("Refuser cette proposition ?")) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                offerId,
                proposalId
            })
        });
        
        if (res.ok) {
            alert("✅ Proposition refusée");
            loadReceivedProposals();
        } else {
            alert("❌ Erreur");
        }
        
    } catch (e) {
        console.error("Erreur refus:", e);
    }
}

// ==========================================
// ANNULER SON OFFRE
// ==========================================
async function cancelOffer(offerId) {
    if (!confirm("Annuler cette offre ?")) return;
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/trade/cancel/${offerId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
        });
        
        if (res.ok) {
            alert("✅ Offre annulée");
            loadMyOffers();
        } else {
            alert("❌ Erreur");
        }
        
    } catch (e) {
        console.error("Erreur annulation:", e);
    }
}

// ==========================================
// UTILITAIRES
// ==========================================
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return "À l'instant";
    if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
    return `Il y a ${Math.floor(seconds / 86400)}j`;
}

// ==========================================
// EXPOSITION AU SCOPE GLOBAL
// ==========================================
window.showCreateOfferModal = showCreateOfferModal;
window.closeCreateOfferModal = closeCreateOfferModal;
window.showProposeModal = showProposeModal;
window.closeProposeModal = closeProposeModal;
window.switchTradeTab = switchTradeTab;
window.selectPokemon = selectPokemon;
window.nextStepCreateOffer = nextStepCreateOffer;
window.previousStepCreateOffer = previousStepCreateOffer;
window.submitCreateOffer = submitCreateOffer;
window.submitPropose = submitPropose;
window.acceptProposal = acceptProposal;
window.rejectProposal = rejectProposal;
window.cancelOffer = cancelOffer;
window.loadTradeOffers = loadTradeOffers;
window.viewProposals = (offerId) => {
    switchTradeTab('received');
};

console.log("✅ Système d'échanges chargé !");
