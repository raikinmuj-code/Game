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
            
            if (pageId === 'friends') {
                if (window.loadLeaderboard) window.loadLeaderboard();
            }
        });
    });
}

function bindEvents() {
    const autoBtnEl = document.getElementById("autoBtn");
    if (autoBtnEl) {
        const newAutoBtn = autoBtnEl.cloneNode(true);
        autoBtnEl.parentNode.replaceChild(newAutoBtn, autoBtnEl);
        newAutoBtn.addEventListener("click", () => {
            if (window.toggleAutoMode) window.toggleAutoMode();
        });
    }
    const langButton = document.getElementById("langBtn");
    if (langButton) {
        const newLangBtn = langButton.cloneNode(true);
        langButton.parentNode.replaceChild(newLangBtn, langButton);
        newLangBtn.addEventListener("click", () => {
            if (window.toggleLanguage) window.toggleLanguage();
        });
    }
}

// ============= ЗАГРУЗКА ПРИЛОЖЕНИЯ =============
document.addEventListener("DOMContentLoaded", async () => {
    console.log('🚀 Приложение загружается...');
    
    initNavigation();
    bindEvents();
    
    const balanceEl = document.getElementById("balance");
    if (balanceEl) balanceEl.innerText = "Loading...";
    
    // Инициализация пользователя (данные придут с сервера)
    const connected = await window.initUser();
    
    if (!connected && window.showNotification) {
        window.showNotification('⚠️ Ошибка подключения к серверу', 'error');
    }
    
    // Запуск сервисов
    if (window.startBoostChecker) window.startBoostChecker();
    if (window.startAutoClickerLoop) window.startAutoClickerLoop();
    if (window.initTasks) window.initTasks();
    
    // Инициализация GIGAPUB
    if (window.checkGigaPubReady) {
        setTimeout(() => {
            console.log('🔍 Проверка GigaPub...');
            window.checkGigaPubReady();
        }, 2000);
    }
    
    // КНОПКИ БУСТОВ
    const boostDoubleBtn = document.getElementById('boostDoubleBtn');
    if (boostDoubleBtn) {
        boostDoubleBtn.onclick = () => {
            if (window.buyBoost) window.buyBoost('double', 5000, 24);
        };
    }
    
    const boostAutoBtn = document.getElementById('boostAutoBtn');
    if (boostAutoBtn) {
        boostAutoBtn.onclick = () => {
            if (window.buyBoost) window.buyBoost('auto', 10000, 24);
        };
    }
    
    // КНОПКА ВЫВОДА СРЕДСТВ
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
        withdrawBtn.onclick = () => {
            if (window.withdrawFunds) window.withdrawFunds();
        };
    }
    
    console.log('✅ Приложение загружено');
});