// ==========================================
// 🔧 CORRECTIONS À APPLIQUER DANS script.js
// ==========================================

// 1. AJOUTER LE BOUTON "PARTAGER MON PROFIL"
// Dans la fonction loadProfile(), ligne 589, REMPLACER la ligne :
// container.innerHTML = `${badgesHtml}...`;

// PAR :

container.innerHTML = `
    ${badgesHtml}
    
    <!-- NOUVEAU : Bouton Partager Profil -->
    <div class="stat-box" style="text-align:center; background: linear-gradient(135deg, rgba(168, 197, 160, 0.2) 0%, rgba(52, 40, 32, 0.7) 100%); border: 2px solid var(--accent-nature);">
        <h3 style="color:var(--accent-nature); margin: 0 0 15px 0;">🌐 Partage ton profil</h3>
        <p style="color: var(--text-secondary); margin-bottom: 15px;">Montre ta collection et tes exploits à tes amis !</p>
        <button class="cta-button" onclick="shareMyProfile()" style="padding: 15px 40px; font-size: 1.1em;">
            🔗 Copier le lien de mon profil
        </button>
        <button class="cta-button" onclick="viewMyPublicProfile()" style="padding: 12px 30px; font-size: 0.95em; margin-top: 10px; background: rgba(255, 154, 108, 0.2); border: 2px solid rgba(255, 154, 108, 0.4);">
            👁️ Voir mon profil public
        </button>
    </div>
    
    <div class="stat-box" style="text-align:center;">
        <h3>Compagnon Actuel</h3>
        ${compHtml}
    </div>
    
    <div class="stat-box" style="text-align:center;">
        <h2>💰 Portefeuille : ${user.money.toLocaleString()} 💰</h2>
        <button id="dailyBtn" onclick="claimDaily()" class="btn-action" ${isOff ? 'disabled' : ''} 
                style="margin-top:15px; padding:12px; width:100%; max-width:250px; font-weight:bold; border-radius:8px; border:none; color:white; cursor:${isOff ? 'not-allowed' : 'pointer'}; background:${isOff ? '#333' : 'var(--accent-warm)'};">
            ${isOff ? `⏳ Prochain cadeau dans :<br>${cooldownText}` : '🎁 RÉCUPÉRER MON CADEAU'}
        </button>
    </div>
    
    <div class="stat-box">
        <h3 style="text-align:center;">🎒 Inventaire des Balls</h3>
        <div class="ball-inventory">
            <div class="ball-item"><img src="${BALL_URL}poke-ball.png" loading="lazy"><br><b>x${user.pokeballs || 0}</b><br><small>Poké Ball</small></div>
            <div class="ball-item"><img src="${BALL_URL}great-ball.png" loading="lazy"><br><b>x${user.greatballs || 0}</b><br><small>Super Ball</small></div>
            <div class="ball-item"><img src="${BALL_URL}ultra-ball.png" loading="lazy"><br><b>x${user.ultraballs || 0}</b><br><small>Hyper Ball</small></div>
            <div class="ball-item"><img src="${BALL_URL}master-ball.png" loading="lazy"><br><b>x${user.masterballs || 0}</b><br><small>Master Ball</small></div>
            <div class="ball-item"><img src="${BALL_URL}premier-ball.png" loading="lazy"><br><b>x${user.premierballs || 0}</b><br><small>Honor Ball</small></div>
            <div class="ball-item"><img src="${BALL_URL}luxury-ball.png" loading="lazy"><br><b>x${user.luxuryballs || 0}</b><br><small>Luxe Ball</small></div>
            <div class="ball-item"><img src="${BALL_URL}safari-ball.png" loading="lazy"><br><b>x${user.safariballs || 0}</b><br><small>Safari ball</small></div>
            <div class="ball-item"><img src="https://raw.githubusercontent.com/xezy-b2/Pokedex-Online/refs/heads/main/elbaball30retesttt.png" style="filter: hue-rotate(290deg) brightness(1.3); width:35px;" loading="lazy"><br><b>x${user.ellbaballs || 0}</b><br><small style="font-size:0.8em;">Ellba Ball</small></div>
        </div>
    </div>
`;


// 2. AJOUTER LA FONCTION viewMyPublicProfile()
// À la fin de script.js, AJOUTER :

function viewMyPublicProfile() {
    if (!currentUsername) {
        alert("Erreur : Pseudo introuvable");
        return;
    }
    // Nettoyer le username des underscores en trop (bug Discord)
    const cleanUsername = currentUsername.replace(/__+$/, ''); // Retire les __ à la fin
    window.location.href = `${window.location.origin}${window.location.pathname}?profile=${cleanUsername}`;
}

window.viewMyPublicProfile = viewMyPublicProfile;
