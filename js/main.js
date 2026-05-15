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
            
            // Если открыли страницу друзей, показываем лидерборд
            if (pageId === 'friends') {
                showLeaderboard();
            }
        });
    });
}

async function showLeaderboard() {
    const leaderboard = await loadLeaderboard();
    const friendsCard = document.querySelector("#friends .card");
    if (friendsCard && leaderboard.length > 0) {
        let html = `<div data-i18n="friends">🏆 Топ игроков</div>`;
        leaderboard.slice(0, 10).forEach((player, idx) => {
            html += `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span>${idx + 1}. ${player.username}</span>
                    <span style="color: #4ade80">$${player.balance.toFixed(4)}</span>
                    <span style="color: #8EA2B1">Lvl ${player.level}</span>
                </div>
            `;
        });
        friendsCard.innerHTML = html;
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
    
    // Загружаем данные с сервера
    const connected = await initUser();
    
    if (!connected) {
        // Офлайн-режим: показываем уведомление
        const notice = document.createElement('div');
        notice.style.cssText = 'position:fixed; bottom:90px; left:50%; transform:translateX(-50%); background:#ff4444; color:#fff; padding:8px 16px; border-radius:20px; font-size:12px; z-index:100;';
        notice.innerText = '⚠️ Сервер не доступен, данные сохраняются локально';
        document.body.appendChild(notice);
        setTimeout(() => notice.remove(), 3000);
    }
    
    fullRender();
});