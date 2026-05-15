// ============= ИНИЦИАЛИЗАЦИЯ И НАВИГАЦИЯ =============
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const pageId = item.getAttribute("data-page");
            if (!pageId) return;
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");
            document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
            const targetPage = document.getElementById(pageId);
            if (targetPage) targetPage.classList.add("active");
            
            // Если открыли страницу друзей/лидерборда
            if (pageId === 'friends') {
                showLeaderboard();
            }
        });
    });
}

async function showLeaderboard() {
    const leaderboard = await loadLeaderboard();
    const friendsCard = document.querySelector("#friends .card");
    
    if (friendsCard) {
        if (leaderboard.length > 0) {
            let html = `<div style="font-weight:700; margin-bottom:12px;" data-i18n="friends">🏆 Топ игроков</div>`;
            leaderboard.slice(0, 10).forEach((player, idx) => {
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight:700; color:#2AABEE;">${idx + 1}</span>
                            <img src="${player.avatar || 'https://i.pravatar.cc/32'}" style="width:28px; height:28px; border-radius:50%;">
                            <span>${player.username}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #4ade80; font-weight:600;">$${player.balance.toFixed(4)}</div>
                            <div style="font-size:10px; color:#8EA2B1;">Lvl ${player.level}</div>
                        </div>
                    </div>
                `;
            });
            friendsCard.innerHTML = html;
        } else {
            friendsCard.innerHTML = `
                <div style="font-weight:700; margin-bottom:12px;" data-i18n="friends">👥 Друзья</div>
                <div style="font-size:12px; color:#8EA2B1; text-align:center; padding:20px;">
                    Пока никого нет. Стань первым!
                </div>
            `;
        }
    }
}

function bindEvents() {
    const autoBtnEl = document.getElementById("autoBtn");
    if (autoBtnEl) {
        const newAutoBtn = autoBtnEl.cloneNode(true);
        autoBtnEl.parentNode.replaceChild(newAutoBtn, autoBtnEl);
        newAutoBtn.addEventListener("click", toggleAutoMode);
    }
    const langButton = document.getElementById("langBtn");
    if (langButton) {
        const newLangBtn = langButton.cloneNode(true);
        langButton.parentNode.replaceChild(newLangBtn, langButton);
        newLangBtn.addEventListener("click", toggleLanguage);
    }
}

function resetUserData() {
    user = { balance: 0, level: 1, ads: 0 };
    blocks = [
        { id: 1, v: 0, l: 0 },
        { id: 2, v: 0, l: 0 },
        { id: 3, v: 0, l: 0 }
    ];
    auto = false;
    autoLoopActive = false;
    clearAllTimers();
    if (window.fullRender) window.fullRender();
    if (window.saveProgress) saveProgress();
}

// Глобальные функции
window.watchAd = watchAd;
window.toggleAutoMode = toggleAutoMode;
window.toggleLanguage = toggleLanguage;
window.fullRender = fullRender;
window.saveProgress = saveProgress;
window.resetUserData = resetUserData;

// Запуск при загрузке
document.addEventListener("DOMContentLoaded", async () => {
    initNavigation();
    bindEvents();
    
    // Показываем индикатор загрузки
    const balanceEl = document.getElementById("balance");
    if (balanceEl) balanceEl.innerText = "Loading...";
    
    // Загружаем данные с сервера
    const connected = await initUser();
    
    if (!connected) {
        // Офлайн-режим: создаём уведомление
        const notice = document.createElement('div');
        notice.id = 'offline-notice';
        notice.style.cssText = 'position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:#ff4444; color:#fff; padding:8px 16px; border-radius:20px; font-size:12px; z-index:100; text-align:center; white-space:nowrap;';
        notice.innerText = '⚠️ Офлайн-режим: данные не сохраняются';
        document.body.appendChild(notice);
        setTimeout(() => {
            if (notice) notice.remove();
        }, 5000);
    }
    
    fullRender();
});