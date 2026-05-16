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

async function loadUserData() {
    if (!window.currentUserId) {
        console.log('⏳ Ждём инициализацию пользователя...');
        setTimeout(loadUserData, 1000);
        return;
    }
    
    console.log(`📥 Загружаем данные для ${window.currentUserId}`);
    
    try {
        const response = await fetch(`${window.API_URL}/user/${window.currentUserId}`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        window.user = {
            userId: data.user.userId,
            username: data.user.username,
            balance: data.user.balance,
            level: data.user.level,
            ads: data.user.ads,
            avatar: data.user.avatar
        };
        
        window.blocks = [
            { id: 1, v: data.blocks['1']?.v || 0, l: data.blocks['1']?.l || 0 },
            { id: 2, v: data.blocks['2']?.v || 0, l: data.blocks['2']?.l || 0 },
            { id: 3, v: data.blocks['3']?.v || 0, l: data.blocks['3']?.l || 0 }
        ];
        
        window.boosts = data.boosts;
        
        console.log(`✅ Загружено: баланс $${window.user.balance}, уровень ${window.user.level}`);
        
        if (window.fullRender) window.fullRender();
        
    } catch (error) {
        console.error(`❌ Ошибка загрузки:`, error);
    }
}

// ============= ЗАГРУЗКА ПРИЛОЖЕНИЯ =============
document.addEventListener("DOMContentLoaded", async () => {
    console.log('🚀 Приложение загружается...');
    
    initNavigation();
    bindEvents();
    
    const balanceEl = document.getElementById("balance");
    if (balanceEl) balanceEl.innerText = "Loading...";
    
    const connected = await window.initUser();
    
    if (!connected && window.showNotification) {
        window.showNotification('⚠️ Ошибка подключения к серверу', 'error');
    }
    
    if (window.startBoostChecker) window.startBoostChecker();
    if (window.startAutoClickerLoop) window.startAutoClickerLoop();
    if (window.initTasks) window.initTasks();
    
    if (window.checkGigaPubReady) {
        setTimeout(() => {
            console.log('🔍 Проверка GigaPub...');
            window.checkGigaPubReady();
        }, 2000);
    }
    
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
    
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) {
        withdrawBtn.onclick = () => {
            if (window.withdrawFunds) window.withdrawFunds();
        };
    }
    
    // Дополнительная загрузка данных через 2 секунды
    setTimeout(loadUserData, 2000);
    
    console.log('✅ Приложение загружено');
});