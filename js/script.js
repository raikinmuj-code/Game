// script.js - Полный скрипт для Duck Ads с MongoDB

// ==================== ИНИЦИАЛИЗАЦИЯ TELEGRAM ====================
const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let userData = {
    id: '',
    name: 'User',
    avatar: '',
    balance: 0.0,
    level: 1,
    xp: 0,
    xpNeeded: 100,
    boostDouble: false,
    boostDoubleEnd: 0,
    completedTasks: [],
    lastDaily: 0,
    referrerId: '',
    referrals: []
};

let adsData = {
    blocks: [
        { id: 0, watched: 0, maxWatches: 15, rewardPerView: 0.0009 },
        { id: 1, watched: 0, maxWatches: 15, rewardPerView: 0.0009 },
        { id: 2, watched: 0, maxWatches: 15, rewardPerView: 0.0009 }
    ],
    isWatching: false
};

let autoMode = true;
let autoInterval = null;
let isProcessing = false;
let boostDoubleTimer = null;
let currentLang = 'ru';
let translations = {};
let serverToken = null;

// ==================== МНОГОЯЗЫЧНОСТЬ ====================
translations = {
    ru: {
        balance: 'БАЛАНС',
        home: 'Главная',
        friends: 'Друзья',
        boosts: 'Бусты',
        tasks: 'Задания',
        wallet: 'Кошелек',
        auto_on: 'AUTO ON',
        auto_off: 'AUTO OFF',
        watch_ad: '📺 Смотреть',
        left: 'осталось',
        level_up: 'УРОВЕНЬ ПОВЫШЕН!',
        double_active: '×2 АКТИВЕН',
        auto_active: 'АВТО АКТИВЕН',
        invite_text: 'Приглашай друзей и получай 10% от их дохода!'
    },
    en: {
        balance: 'BALANCE',
        home: 'Home',
        friends: 'Friends',
        boosts: 'Boosts',
        tasks: 'Tasks',
        wallet: 'Wallet',
        auto_on: 'AUTO ON',
        auto_off: 'AUTO OFF',
        watch_ad: '📺 Watch',
        left: 'left',
        level_up: 'LEVEL UP!',
        double_active: '×2 ACTIVE',
        auto_active: 'AUTO ACTIVE',
        invite_text: 'Invite friends and get 10% of their earnings!'
    }
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function formatMoney(value) {
    return '$' + value.toFixed(4);
}

function showToast(message, isError = false) {
    let toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: ${isError ? '#e74c3c' : '#2AABEE'};
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
        z-index: 1000;
        white-space: nowrap;
        max-width: 90%;
        white-space: normal;
        text-align: center;
        pointer-events: none;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function getCurrentReward(baseReward) {
    let reward = baseReward;
    if (userData.boostDouble && Date.now() < userData.boostDoubleEnd) {
        reward *= 2;
    }
    return reward;
}

async function safeAsync(callback, errorMsg) {
    if (isProcessing) return;
    isProcessing = true;
    try {
        await callback();
    } catch (error) {
        console.error(error);
        showToast(errorMsg || 'Ошибка, попробуйте позже', true);
    } finally {
        setTimeout(() => { isProcessing = false; }, 300);
    }
}

// ==================== УРОВНИ ====================
const levelRequirements = [0, 100, 200, 300, 400, 500];
const levelMultipliers = [1, 1, 2, 3, 4, 5];

function updateLevel() {
    let newLevel = userData.level;
    let totalXP = userData.xp;
    
    for (let i = userData.level; i <= 5; i++) {
        if (totalXP >= levelRequirements[i]) {
            newLevel = i + 1;
        } else {
            break;
        }
    }
    
    if (newLevel > 5) newLevel = 5;
    
    if (newLevel !== userData.level) {
        userData.level = newLevel;
        showToast(`${translations[currentLang].level_up} Level ${userData.level}! +${(levelMultipliers[userData.level] * 0.0009).toFixed(4)}$ за просмотр`);
        saveUserData();
    }
    
    userData.xpNeeded = levelRequirements[userData.level] || 500;
    
    let xpForNext = userData.xpNeeded;
    let currentXP = userData.xp - (levelRequirements[userData.level - 1] || 0);
    let neededXP = xpForNext - (levelRequirements[userData.level - 1] || 0);
    let percent = (currentXP / neededXP) * 100;
    if (isNaN(percent)) percent = 0;
    
    document.getElementById('xpFill').style.width = percent + '%';
    document.getElementById('level').innerHTML = `Level ${userData.level} • ${currentXP}/${neededXP}`;
    
    let nextReward = (levelMultipliers[userData.level] || 1) * 0.0009;
    document.getElementById('nextRewardValue').innerHTML = `+${nextReward.toFixed(4)}$`;
    
    updateAdRewards();
}

function addXP(amount) {
    userData.xp += amount;
    updateLevel();
    saveUserData();
}

function updateAdRewards() {
    let baseReward = 0.0009 * (levelMultipliers[userData.level] || 1);
    adsData.blocks.forEach(block => {
        block.rewardPerView = baseReward;
    });
}

// ==================== API ИНТЕГРАЦИЯ С MONGODB ====================
async function initServerUser() {
    const telegramId = userData.id;
    const name = userData.name;
    const avatar = userData.avatar;
    const referrerId = userData.referrerId;
    
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId, name, avatar, referrerId })
        });
        
        const data = await response.json();
        if (data.success) {
            serverToken = data.token;
            userData.balance = data.user.balance;
            userData.level = data.user.level;
            userData.xp = data.user.xp;
            userData.boostDouble = data.user.boostDouble;
            userData.boostDoubleEnd = data.user.boostDoubleEnd;
            userData.completedTasks = data.user.completedTasks || [];
            userData.referrerId = data.user.referrerId;
            
            await loadAdsFromServer();
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка подключения к серверу:', error);
        showToast('Офлайн режим: данные сохраняются локально', true);
    }
}

async function loadAdsFromServer() {
    if (!serverToken) return;
    
    try {
        const response = await fetch('/api/ads', {
            headers: { 'Authorization': serverToken }
        });
        const blocks = await response.json();
        if (blocks && blocks.length) {
            adsData.blocks = blocks;
        }
    } catch (error) {
        console.error('Ошибка загрузки рекламы:', error);
    }
}

async function saveToServer() {
    if (!serverToken) return;
    
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': serverToken
            },
            body: JSON.stringify({
                balance: userData.balance,
                level: userData.level,
                xp: userData.xp,
                boostDouble: userData.boostDouble,
                boostDoubleEnd: userData.boostDoubleEnd,
                completedTasks: userData.completedTasks,
                adsBlocks: adsData.blocks,
                autoMode: autoMode
            })
        });
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

async function addWatchToServer() {
    if (!serverToken) return;
    
    try {
        await fetch('/api/addWatch', {
            method: 'POST',
            headers: { 'Authorization': serverToken }
        });
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const leaders = await response.json();
        
        const leaderboardContent = document.getElementById('leaderboardContent');
        if (leaderboardContent) {
            if (leaders.length === 0) {
                leaderboardContent.innerHTML = 'Пока нет игроков';
            } else {
                leaderboardContent.innerHTML = leaders.map((user, idx) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight: bold; color: #2AABEE;">${idx + 1}</span>
                            <img src="${user.avatar || 'https://i.pravatar.cc/32'}" style="width: 28px; height: 28px; border-radius: 50%;">
                            <span>${user.name}</span>
                        </div>
                        <div>
                            <span style="color: #4ade80;">${formatMoney(user.balance)}</span>
                            <span style="font-size: 11px; color: #8EA2B1; margin-left: 8px;">Lvl ${user.level}</span>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки топа:', error);
    }
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        const statsElement = document.getElementById('statsInfo');
        if (statsElement) {
            statsElement.innerHTML = `
                <div style="text-align: center; padding: 10px;">
                    <div>👥 Всего игроков: ${stats.totalUsers}</div>
                    <div>💰 Общий баланс: ${formatMoney(stats.totalBalance)}</div>
                    <div>📺 Всего просмотров: ${stats.totalWatched || 0}</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// ==================== РЕКЛАМА ====================
function watchAd(blockId) {
    if (isProcessing) return;
    isProcessing = true;
    
    let block = adsData.blocks[blockId];
    if (!block || block.watched >= block.maxWatches) {
        showToast('Лимит просмотров на сегодня исчерпан', true);
        isProcessing = false;
        return;
    }
    
    showToast('🎬 Показ рекламы...', false);
    
    setTimeout(() => {
        let reward = getCurrentReward(block.rewardPerView);
        userData.balance += reward;
        block.watched++;
        addXP(1);
        saveUserData();
        addWatchToServer();
        updateUI();
        showToast(`+${formatMoney(reward)} за просмотр!`);
        isProcessing = false;
        
        if (autoMode) {
            scheduleNextAutoWatch();
        }
    }, 100);
}

// ==================== АВТО-КЛИКЕР ====================
let autoWatchIndex = 0;

function scheduleNextAutoWatch() {
    if (!autoMode) return;
    
    let found = false;
    for (let i = 0; i < adsData.blocks.length; i++) {
        let idx = (autoWatchIndex + i) % adsData.blocks.length;
        if (adsData.blocks[idx].watched < adsData.blocks[idx].maxWatches) {
            autoWatchIndex = idx;
            found = true;
            break;
        }
    }
    
    if (found) {
        setTimeout(() => {
            if (autoMode && adsData.blocks[autoWatchIndex].watched < adsData.blocks[autoWatchIndex].maxWatches) {
                watchAd(autoWatchIndex);
                autoWatchIndex = (autoWatchIndex + 1) % adsData.blocks.length;
            } else if (autoMode) {
                autoWatchIndex = (autoWatchIndex + 1) % adsData.blocks.length;
                scheduleNextAutoWatch();
            }
        }, 3000);
    }
}

function startAutoMode() {
    if (autoInterval) clearInterval(autoInterval);
    if (autoMode) {
        scheduleNextAutoWatch();
    }
}

function toggleAutoMode() {
    autoMode = !autoMode;
    
    if (autoMode) {
        autoWatchIndex = 0;
        startAutoMode();
        document.getElementById('autoBtn').innerHTML = translations[currentLang].auto_on;
        showToast('Авто-режим включен! Блоки будут просматриваться автоматически');
    } else {
        document.getElementById('autoBtn').innerHTML = translations[currentLang].auto_off;
        showToast('Авто-режим выключен');
    }
    saveUserData();
}

// ==================== БУСТЫ ====================
function buyDoubleBoost() {
    safeAsync(async () => {
        if (userData.balance >= 5000) {
            userData.balance -= 5000;
            userData.boostDouble = true;
            userData.boostDoubleEnd = Date.now() + 86400000;
            
            if (boostDoubleTimer) clearInterval(boostDoubleTimer);
            boostDoubleTimer = setInterval(() => {
                if (Date.now() >= userData.boostDoubleEnd) {
                    userData.boostDouble = false;
                    clearInterval(boostDoubleTimer);
                    showToast('Удвоение дохода закончилось');
                    updateUI();
                }
            }, 1000);
            
            saveUserData();
            updateUI();
            showToast('Удвоение дохода куплено на 24 часа!');
        } else {
            showToast('Недостаточно средств! Нужно 5000$', true);
        }
    }, 'Ошибка покупки');
}

// ==================== ЗАДАНИЯ ====================
function completeTask(taskId, reward) {
    if (userData.completedTasks.includes(taskId)) {
        showToast('Задание уже выполнено', true);
        return;
    }
    
    userData.completedTasks.push(taskId);
    userData.balance += reward;
    saveUserData();
    updateUI();
    showToast(`+${formatMoney(reward)} за задание!`);
}

// ==================== ДРУЗЬЯ И РЕФЕРАЛЫ ====================
function generateInviteLink() {
    let botName = window.location.hostname === 'localhost' ? 'duckads_bot' : (tg.initDataUnsafe?.user?.username || 'duckads_bot');
    let link = `https://t.me/${botName}?start=${userData.id}`;
    return link;
}

async function shareInvite() {
    let link = generateInviteLink();
    if (tg.shareToStory) {
        tg.shareToStory(link);
    } else {
        let textarea = document.createElement('textarea');
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Ссылка скопирована!');
    }
}

async function addReferralToServer(referrerId) {
    if (!serverToken || !referrerId || referrerId === userData.id) return;
    
    try {
        await fetch('/api/addReferral', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': serverToken
            },
            body: JSON.stringify({ referrerId })
        });
    } catch (error) {
        console.error('Ошибка добавления реферала:', error);
    }
}

function updateReferralCount() {
    let count = userData.referrals.length;
    document.getElementById('referralCount').innerHTML = `Приглашено друзей: ${count} | Вы получаете 10% от их заработка!`;
}

// ==================== ВЫВОД СРЕДСТВ ====================
async function withdrawFunds() {
    if (userData.balance < 1.0) {
        showToast('Минимальная сумма вывода 1.00$', true);
        return;
    }
    
    let wallet = prompt('Введите адрес кошелька USDT (TRC20):');
    if (!wallet) return;
    
    try {
        const response = await fetch('/api/withdraw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': serverToken
            },
            body: JSON.stringify({ amount: userData.balance, wallet })
        });
        
        const data = await response.json();
        if (data.success) {
            showToast('Запрос на вывод отправлен! Обработка до 24 часов');
            userData.balance = 0;
            saveUserData();
            updateUI();
        } else {
            showToast(data.error || 'Ошибка вывода', true);
        }
    } catch (error) {
        showToast('Ошибка сервера', true);
    }
}

// ==================== ОБНОВЛЕНИЕ UI ====================
function updateUI() {
    document.getElementById('balance').innerHTML = formatMoney(userData.balance);
    document.getElementById('balanceTop').innerHTML = formatMoney(userData.balance);
    document.getElementById('walletBalance').innerHTML = formatMoney(userData.balance);
    
    updateLevel();
    
    let cardsContainer = document.getElementById('cards');
    if (cardsContainer) {
        cardsContainer.innerHTML = '';
        
        adsData.blocks.forEach((block, idx) => {
            let card = document.createElement('div');
            card.className = 'card';
            let remaining = block.maxWatches - block.watched;
            let progressPercent = (block.watched / block.maxWatches) * 100;
            
            card.innerHTML = `
                <div class="card-title">
                    <span>📺 Рекламный блок #${idx+1}</span>
                    <span>+${block.rewardPerView.toFixed(4)}$ / просмотр</span>
                </div>
                <div class="stats">
                    <span>📊 ${block.watched}/${block.maxWatches}</span>
                    <span>⭐ ${translations[currentLang].left}: ${remaining}</span>
                </div>
                <div class="small-bar"><div class="small-fill" style="width: ${progressPercent}%"></div></div>
                <button class="btn ad-btn" data-block="${idx}">${translations[currentLang].watch_ad}</button>
            `;
            cardsContainer.appendChild(card);
        });
        
        document.querySelectorAll('.ad-btn').forEach(btn => {
            btn.onclick = (e) => {
                let blockIdx = parseInt(btn.dataset.block);
                watchAd(blockIdx);
            };
        });
    }
    
    let boostDoubleBtn = document.getElementById('boostDoubleBtn');
    if (boostDoubleBtn) {
        if (userData.boostDouble && Date.now() < userData.boostDoubleEnd) {
            boostDoubleBtn.innerHTML = '✅ АКТИВЕН';
            boostDoubleBtn.disabled = true;
            let hoursLeft = Math.ceil((userData.boostDoubleEnd - Date.now()) / 3600000);
            let doubleMsg = `${translations[currentLang].double_active} (ещё ${hoursLeft}ч)`;
            let boostsTitle = document.querySelector('#boosts .card div:first-child');
            if (boostsTitle) boostsTitle.innerHTML = `⚡ Бусты<br><small style="color:#4ade80">${doubleMsg}</small>`;
        } else {
            boostDoubleBtn.innerHTML = 'Купить за 5000';
            boostDoubleBtn.disabled = false;
            let boostsTitle = document.querySelector('#boosts .card div:first-child');
            if (boostsTitle) boostsTitle.innerHTML = '⚡ Бусты';
        }
    }
    
    updateReferralCount();
}

// ==================== ЗАГРУЗКА / СОХРАНЕНИЕ ДАННЫХ ====================
function saveUserData() {
    let saveData = { ...userData };
    delete saveData.referrals;
    localStorage.setItem('duckads_user', JSON.stringify(saveData));
    localStorage.setItem('duckads_ads', JSON.stringify(adsData.blocks));
    localStorage.setItem('duckads_auto', autoMode);
    saveToServer();
}

function loadUserData() {
    let saved = localStorage.getItem('duckads_user');
    if (saved) {
        try {
            let parsed = JSON.parse(saved);
            userData = { ...userData, ...parsed };
        } catch(e) {}
    }
    
    let savedAds = localStorage.getItem('duckads_ads');
    if (savedAds) {
        try {
            adsData.blocks = JSON.parse(savedAds);
        } catch(e) {}
    }
    
    let savedAuto = localStorage.getItem('duckads_auto');
    if (savedAuto !== null) {
        autoMode = savedAuto === 'true';
    } else {
        autoMode = true;
    }
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        let teleUser = tg.initDataUnsafe.user;
        userData.id = teleUser.id.toString();
        userData.name = teleUser.first_name || teleUser.username || 'User';
        userData.avatar = teleUser.photo_url || `https://avatars.dicebear.com/api/initials/${userData.name}.svg`;
    } else {
        if (!userData.id) userData.id = Math.floor(Math.random() * 1000000).toString();
        userData.name = userData.name || 'User';
    }
    
    document.getElementById('username').innerHTML = userData.name;
    document.getElementById('userid').innerHTML = `ID: ${userData.id}`;
    let avatarImg = document.getElementById('avatar');
    if (avatarImg) avatarImg.src = userData.avatar;
    
    updateAdRewards();
    updateLevel();
}

// ==================== НАВИГАЦИЯ ====================
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    let targetPage = document.getElementById(page);
    if (targetPage) targetPage.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });
    
    if (page === 'friends') {
        loadLeaderboard();
    }
    if (page === 'wallet') {
        loadStats();
    }
}

function changeLanguage() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    let langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.innerHTML = currentLang.toUpperCase();
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        let key = el.dataset.i18n;
        if (translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });
    
    updateUI();
    let autoBtn = document.getElementById('autoBtn');
    if (autoBtn) {
        let autoBtnText = autoMode ? translations[currentLang].auto_on : translations[currentLang].auto_off;
        autoBtn.innerHTML = autoBtnText;
    }
}

// ==================== ОБРАБОТКА РЕФЕРАЛЬНОЙ ССЫЛКИ ====================
function checkReferralStart() {
    let urlParams = new URLSearchParams(window.location.search);
    let startParam = urlParams.get('start');
    if (startParam && startParam !== userData.id) {
        userData.referrerId = startParam;
        addReferralToServer(startParam);
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
async function init() {
    loadUserData();
    
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        await initServerUser();
    }
    
    checkReferralStart();
    
    let autoBtn = document.getElementById('autoBtn');
    if (autoBtn) autoBtn.onclick = toggleAutoMode;
    
    let inviteBtn = document.getElementById('inviteBtn');
    if (inviteBtn) inviteBtn.onclick = shareInvite;
    
    let boostDoubleBtn = document.getElementById('boostDoubleBtn');
    if (boostDoubleBtn) boostDoubleBtn.onclick = buyDoubleBoost;
    
    let withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) withdrawBtn.onclick = withdrawFunds;
    
    let langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.onclick = changeLanguage;
    
    document.querySelectorAll('.task-btn').forEach(btn => {
        btn.onclick = () => {
            let task = btn.dataset.task;
            if (task === 'subscribe') completeTask('subscribe', 1000);
            if (task === 'share') {
                shareInvite();
                completeTask('share', 500);
            }
        };
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => navigateTo(item.dataset.page);
    });
    
    updateUI();
    
    if (autoMode) {
        autoWatchIndex = 0;
        startAutoMode();
    }
    
    setInterval(() => {
        if (autoMode) {
            let anyLeft = adsData.blocks.some(b => b.watched < b.maxWatches);
            if (!anyLeft && autoMode) {
                showToast('Все блоки просмотрены на сегодня! Завтра будет новый лимит', false);
            }
        }
    }, 60000);
}

document.addEventListener('DOMContentLoaded', init);