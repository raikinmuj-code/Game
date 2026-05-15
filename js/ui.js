// ============= UI РЕНДЕРИНГ =============
function renderHomePage() {
    const balanceEl = document.getElementById("balance");
    if (balanceEl) balanceEl.innerText = "$" + (window.user?.balance || 0).toFixed(4);
    
    const levelEl = document.getElementById("level");
    if (levelEl) {
        levelEl.innerText = `${t("level")} ${window.user?.level || 1} • ${window.user?.ads || 0}/100`;
    }
    
    const fillEl = document.getElementById("xpFill");
    if (fillEl) fillEl.style.width = (window.user?.ads || 0) + "%";
    
    const autoBtn = document.getElementById("autoBtn");
    if (autoBtn) autoBtn.innerText = (window.auto === true) ? t("auto_on") : t("auto_off");
    
    const nextRewardSpan = document.getElementById("nextRewardValue");
    if (nextRewardSpan && window.getRewardForNextLevel) {
        nextRewardSpan.innerText = `+$${window.getRewardForNextLevel().toFixed(4)}`;
    }
    
    const boostDoubleBtn = document.getElementById('boostDoubleBtn');
    if (boostDoubleBtn && window.boosts) {
        if (window.boosts.doubleIncome && window.boosts.doubleIncomeUntil > Date.now()) {
            boostDoubleBtn.innerHTML = `✅ Активен ${window.formatBoostTime ? window.formatBoostTime(window.boosts.doubleIncomeUntil) : ''}`;
            boostDoubleBtn.disabled = true;
            boostDoubleBtn.style.opacity = '0.6';
        } else {
            boostDoubleBtn.innerHTML = 'Купить за 5000';
            boostDoubleBtn.disabled = false;
            boostDoubleBtn.style.opacity = '1';
        }
    }
    
    const boostAutoBtn = document.getElementById('boostAutoBtn');
    if (boostAutoBtn && window.boosts) {
        if (window.boosts.autoClicker && window.boosts.autoClickerUntil > Date.now()) {
            boostAutoBtn.innerHTML = `✅ Активен ${window.formatBoostTime ? window.formatBoostTime(window.boosts.autoClickerUntil) : ''}`;
            boostAutoBtn.disabled = true;
            boostAutoBtn.style.opacity = '0.6';
        } else {
            boostAutoBtn.innerHTML = 'Купить за 10000';
            boostAutoBtn.disabled = false;
            boostAutoBtn.style.opacity = '1';
        }
    }
    
    const walletBalance = document.getElementById('walletBalance');
    if (walletBalance && window.user) {
        walletBalance.innerText = `$${window.user.balance.toFixed(4)}`;
    }
}

function renderAdBlocks() {
    const cardsDiv = document.getElementById("cards");
    if (!cardsDiv) return;
    
    if (window.clearAllTimers) window.clearAllTimers();
    
    let html = "";
    const currentReward = window.getRewardForCurrentLevel ? window.getRewardForCurrentLevel() : 0.0009;
    const blocksData = window.blocks || [];
    
    blocksData.forEach(b => {
        const locked = Date.now() < b.l;
        const viewsPercent = (b.v / 15) * 100;
        const statusText = locked ? t("locked") : t("active");
        const viewsLabel = t("views");
        const btnDisabledAttr = locked ? "disabled" : "";
        
        html += `
            <div class="card" data-block-id="${b.id}">
                <div class="card-title">
<span>${window.getBlockName ? window.getBlockName(b.id) : `${t("adblock")} ${b.id}`}</span>
                    <span style="color:#4ade80">+$${currentReward.toFixed(4)}</span>
                </div>
                <div class="stats">
                    <span>${b.v}/15 ${viewsLabel}</span>
                    <span>${statusText}</span>
                </div>
                <div class="small-bar">
                    <div class="small-fill" style="width:${viewsPercent}%"></div>
                </div>
                <button class="btn" id="adBtn_${b.id}" ${btnDisabledAttr} onclick="window.watchAd(${b.id})">
                    ${t("watch")}
                    ${locked ? '<span class="btn-timer-text" id="timerSpan_' + b.id + '">(--:--:--)</span>' : ''}
                </button>
            </div>
        `;
    });
    
    cardsDiv.innerHTML = html;
    
    blocksData.forEach(b => {
        if (Date.now() < b.l) {
            const timerSpan = document.getElementById(`timerSpan_${b.id}`);
            if (timerSpan && window.formatLockTime) {
                const updateTimer = () => {
                    const remaining = window.formatLockTime(b.l);
                    if (remaining) {
                        timerSpan.innerText = `(${remaining})`;
                    } else {
                        if (window.fullRender) window.fullRender();
                    }
                };
                updateTimer();
                const intervalId = setInterval(updateTimer, 1000);
                if (window.timerIntervals) window.timerIntervals.push(intervalId);
            }
        }
    });
}

function updateTopBarBalance() {
    const balanceTopSpan = document.getElementById("balanceTop");
    if (balanceTopSpan && window.user) {
        balanceTopSpan.innerText = "$" + window.user.balance.toFixed(4);
    }
}

function fullRender() {
    if (window.applyLanguageToStatic) window.applyLanguageToStatic();
    renderHomePage();
    renderAdBlocks();
    updateTopBarBalance();
}

window.renderHomePage = renderHomePage;
window.renderAdBlocks = renderAdBlocks;
window.updateTopBarBalance = updateTopBarBalance;
window.fullRender = fullRender;