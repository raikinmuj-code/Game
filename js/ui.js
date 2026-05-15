// ============= UI РЕНДЕРИНГ =============
function renderHomePage() {
    const balanceEl = document.getElementById("balance");
    if (balanceEl) balanceEl.innerText = "$" + user.balance.toFixed(4);
    
    const levelEl = document.getElementById("level");
    if (levelEl) {
        levelEl.innerText = `${t("level")} ${user.level} • ${user.ads}/100`;
    }
    
    const fillEl = document.getElementById("xpFill");
    if (fillEl) fillEl.style.width = user.ads + "%";
    
    const autoBtn = document.getElementById("autoBtn");
    if (autoBtn) autoBtn.innerText = window.auto ? t("auto_on") : t("auto_off");
    
    const nextRewardSpan = document.getElementById("nextRewardValue");
    if (nextRewardSpan) {
        nextRewardSpan.innerText = `+$${getRewardForNextLevel().toFixed(4)}`;
    }
}

function renderAdBlocks() {
    const cardsDiv = document.getElementById("cards");
    if (!cardsDiv) return;
    
    clearAllTimers();
    
    let html = "";
    const currentReward = getRewardForCurrentLevel();
    
    blocks.forEach(b => {
        const locked = Date.now() < b.l;
        const viewsPercent = (b.v / 15) * 100;
        const statusText = locked ? t("locked") : t("active");
        const viewsLabel = t("views");
        const btnDisabledAttr = locked ? "disabled" : "";
        
        html += `
            <div class="card" data-block-id="${b.id}">
                <div class="card-title">
                    <span>${t("adblock")} ${b.id}</span>
                    <span style="color:#4ade80">+$${currentReward.toFixed(4)}</span>
                </div>
                <div class="stats">
                    <span>${b.v}/15 ${viewsLabel}</span>
                    <span>${statusText}</span>
                </div>
                <div class="small-bar">
                    <div class="small-fill" style="width:${viewsPercent}%"></div>
                </div>
                <button class="btn" id="adBtn_${b.id}" ${btnDisabledAttr} onclick="watchAd(${b.id})">
                    ${t("watch")}
                    ${locked ? '<span class="btn-timer-text" id="timerSpan_' + b.id + '">(--:--:--)</span>' : ''}
                </button>
            </div>
        `;
    });
    
    cardsDiv.innerHTML = html;
    
    // Запуск таймеров для заблокированных кнопок
    blocks.forEach(b => {
        if (Date.now() < b.l) {
            const timerSpan = document.getElementById(`timerSpan_${b.id}`);
            if (timerSpan) {
                const updateTimer = () => {
                    const remaining = formatLockTime(b.l);
                    if (remaining) {
                        timerSpan.innerText = `(${remaining})`;
                    } else if (window.fullRender) {
                        window.fullRender();
                    }
                };
                updateTimer();
                const intervalId = setInterval(updateTimer, 1000);
                timerIntervals.push(intervalId);
            }
        }
    });
}

function updateTopBarBalance() {
    const balanceTopSpan = document.getElementById("balanceTop");
    if (balanceTopSpan) balanceTopSpan.innerText = "$" + user.balance.toFixed(4);
}

function fullRender() {
    applyLanguageToStatic();
    renderHomePage();
    renderAdBlocks();
    updateTopBarBalance();
}