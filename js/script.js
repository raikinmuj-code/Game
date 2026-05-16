// script.js - Только серверное сохранение

const tg = window.Telegram.WebApp;
tg.expand();
tg.enableClosingConfirmation();

let userData = {
    id: '',
    name: 'User',
    avatar: '',
    balance: 0,
    level: 1,
    xp: 0,
    boostDouble: false,
    boostDoubleEnd: 0,
    completedTasks: [],
    referrerId: ''
};

let adsData = {
    blocks: [],
    isWatching: false
};

let autoMode = true;
let isProcessing = false;
let boostDoubleTimer = null;
let currentLang = 'ru';
let serverToken = null;
let autoWatchIndex = 0;

// Многоязычность
const translations = {
    ru: {
        balance: 'БАЛАНС', home: 'Главная', friends: 'Друзья',
        boosts: 'Бусты', tasks: 'Задания', wallet: 'Кошелек',
        auto_on: 'AUTO ON', auto_off: 'AUTO OFF', watch_ad: '📺 Смотреть',
        left: 'осталось', level_up: 'УРОВЕНЬ ПОВЫШЕН!', double_active: '×2 АКТИВЕН'
    },
    en: {
        balance: 'BALANCE', home: 'Home', friends: 'Friends',
        boosts: 'Boosts', tasks: 'Tasks', wallet: 'Wallet',
        auto_on: 'AUTO ON', auto_off: 'AUTO OFF', watch_ad: '📺 Watch',
        left: 'left', level_up: 'LEVEL UP!', double_active: '×2 ACTIVE'
    }
};

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
        z-index: 10000;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function getCurrentReward(baseReward) {
    if (userData.boostDouble && Date.now() < userData.boostDoubleEnd) {
        return baseReward * 2;
    }
    return baseReward;
}

// Уровни
const levelRequirements = [0, 100, 200, 300, 400, 500];
const levelMultipliers = [1, 1, 2, 3, 4, 5];

function updateLevel() {
    let newLevel = userData.level;
    for (let i = userData.level; i <= 5; i++) {
        if (userData.xp >= levelRequirements[i]) newLevel = i + 1;
        else break;
    }
    if (newLevel > 5) newLevel = 5;
    
    if (newLevel !== userData.level) {
        userData.level = newLevel;
        showToast(`${translations[currentLang].level_up} Level ${userData.level}`);
        saveToServer();
    }
    
    let currentXP = userData.xp - (levelRequirements[userData.level - 1] || 0);
    let neededXP = (levelRequirements[userData.level] || 500) - (levelRequirements[userData.level - 1] || 0);
    let percent = (currentXP / neededXP) * 100;
    
    const xpFill = document.getElementById('xpFill');
    if (xpFill) xpFill.style.width = (isNaN(percent) ? 0 : percent) + '%';
    
    const levelEl = document.getElementById('level');
    if (levelEl) levelEl.innerHTML = `Level ${userData.level} • ${currentXP}/${neededXP}`;
    
    let nextReward = (levelMultipliers[userData.level] || 1) * 0.0009;
    const nextRewardValue = document.getElementById('nextRewardValue');
    if (nextRewardValue) nextRewardValue.innerHTML = `+${nextReward.toFixed(4)}$`;
    
    // Обновляем награду в блоках
    if (adsData.blocks) {
        adsData.blocks.forEach(block => {
            block.rewardPerView = 0.0009 * (levelMultipliers[userData.level] || 1);
        });
    }
}

function addXP(amount) {
    userData.xp += amount;
    updateLevel();
}

// Gigapub реклама
function showGigapubAd() {
    return new Promise((resolve, reject) => {
        if (typeof window.showGiga === 'undefined') {
            setTimeout(() => resolve(true), 2000);
            return;
        }
        window.showGiga()
            .then(() => resolve(true))
            .catch((e) => reject(e));
    });
}

// Просмотр рекламы
async function watchAd(blockId) {
    if (isProcessing) {
        showToast('Подождите, реклама уже показывается', true);
        return;
    }
    
    let block = adsData.blocks[blockId];
    if (!block || block.watched >= block.maxWatches) {
        showToast('Лимит просмотров на сегодня исчерпан', true);
        return;
    }
    
    isProcessing = true;
    showToast('🎬 Загрузка рекламы...', false);
    
    try {
        await showGigapubAd();
        
        let reward = getCurrentReward(block.rewardPerView);
        userData.balance += reward;
        block.watched++;
        addXP(1);
        
        await saveToServer();
        updateUI();
        showToast(`+${formatMoney(reward)} за просмотр!`);
        
        if (autoMode) scheduleNextAutoWatch();
    } catch (error) {
        showToast('Ошибка показа рекламы', true);
    } finally {
        setTimeout(() => { isProcessing = false; }, 500);
    }
}

// Авто-режим
function scheduleNextAutoWatch() {
    if (!autoMode || isProcessing) return;
    
    for (let i = 0; i < adsData.blocks.length; i++) {
        let idx = (autoWatchIndex + i) % adsData.blocks.length;
        if (adsData.blocks[idx].watched < adsData.blocks[idx].maxWatches) {
            autoWatchIndex = idx;
            setTimeout(() => {
                if (autoMode && !isProcessing && adsData.blocks[autoWatchIndex].watched < adsData.blocks[autoWatchIndex].maxWatches) {
                    watchAd(autoWatchIndex);
                    autoWatchIndex = (autoWatchIndex + 1) % adsData.blocks.length;
                } else if (autoMode) {
                    autoWatchIndex = (autoWatchIndex + 1) % adsData.blocks.length;
                    scheduleNextAutoWatch();
                }
            }, 5000);
            return;
        }
    }
}

function toggleAutoMode() {
    autoMode = !autoMode;
    const autoBtn = document.getElementById('autoBtn');
    if (autoBtn) autoBtn.innerHTML = autoMode ? translations[currentLang].auto_on : translations[currentLang].auto_off;
    if (autoMode) {
        autoWatchIndex = 0;
        scheduleNextAutoWatch();
    }
    saveToServer();
}

// Бусты
function buyDoubleBoost() {
    if (userData.balance >= 5000) {
        userData.balance -= 5000;
        userData.boostDouble = true;
        userData.boostDoubleEnd = Date.now() + 86400000;
        
        if (boostDoubleTimer) clearInterval(boostDoubleTimer);
        boostDoubleTimer = setInterval(() => {
            if (Date.now() >= userData.boostDoubleEnd) {
                userData.boostDouble = false;
                clearInterval(boostDoubleTimer);
                updateUI();
            }
        }, 1000);
        
        saveToServer();
        updateUI();
        showToast('Удвоение дохода куплено на 24 часа!');
    } else {
        showToast('Недостаточно средств! Нужно 5000$', true);
    }
}

// Задания
function completeTask(taskId, reward) {
    if (userData.completedTasks.includes(taskId)) {
        showToast('Задание уже выполнено', true);
        return;
    }
    userData.completedTasks.push(taskId);
    userData.balance += reward;
    saveToServer();
    updateUI();
    showToast(`+${formatMoney(reward)} за задание!`);
}

// Рефералы
function shareInvite() {
    let link = `https://t.me/duckads_bot?start=${userData.id}`;
    tg.showPopup({
        title: 'Пригласить друга',
        message: `Ваша реферальная ссылка:\n${link}`,
        buttons: [{ type: 'ok', text: 'OK' }]
    });
}

// Вывод средств
function withdrawFunds() {
    if (userData.balance < 1) {
        showToast('Минимальная сумма вывода 1.00$', true);
        return;
    }
    tg.showPopup({
        title: 'Вывод средств',
        message: `Сумма: ${formatMoney(userData.balance)}\nВведите адрес USDT (TRC20):`,
        buttons: [{ type: 'default', text: 'Отправить' }]
    });
}

// ==================== СЕРВЕРНЫЕ ФУНКЦИИ ====================

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
            adsData.blocks = data.user.adsBlocks || [
                { id: 0, watched: 0, maxWatches: 15, rewardPerView: 0.0009 },
                { id: 1, watched: 0, maxWatches: 15, rewardPerView: 0.0009 },
                { id: 2, watched: 0, maxWatches: 15, rewardPerView: 0.0009 }
            ];
            autoMode = data.user.autoMode !== undefined ? data.user.autoMode : true;
            
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка подключения к серверу:', error);
        showToast('Ошибка подключения к серверу', true);
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

async function loadLeaderboard() {
    try {
        const response = await fetch('/api/leaderboard');
        const leaders = await response.json();
        const container = document.getElementById('leaderboardContent');
        if (container) {
            if (leaders.length === 0) {
                container.innerHTML = 'Пока нет игроков';
            } else {
                container.innerHTML = leaders.map((user, idx) => `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span>${idx + 1}. ${user.name}</span>
                        <span style="color: #2AABEE;">${formatMoney(user.balance)}</span>
                        <span style="font-size: 11px;">Lvl ${user.level}</span>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки топа:', error);
    }
}

// Обновление UI
function updateUI() {
    const balanceEl = document.getElementById('balance');
    const balanceTopEl = document.getElementById('balanceTop');
    const walletBalanceEl = document.getElementById('walletBalance');
    
    if (balanceEl) balanceEl.innerHTML = formatMoney(userData.balance);
    if (balanceTopEl) balanceTopEl.innerHTML = formatMoney(userData.balance);
    if (walletBalanceEl) walletBalanceEl.innerHTML = formatMoney(userData.balance);
    
    updateLevel();
    
    const cardsContainer = document.getElementById('cards');
    if (cardsContainer && adsData.blocks) {
        cardsContainer.innerHTML = '';
        
        adsData.blocks.forEach((block, idx) => {
            let remaining = block.maxWatches - block.watched;
            let progressPercent = (block.watched / block.maxWatches) * 100;
            
            let card = document.createElement('div');
            card.className = 'card';
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
            btn.onclick = () => watchAd(parseInt(btn.dataset.block));
        });
    }
    
    const boostBtn = document.getElementById('boostDoubleBtn');
    if (boostBtn) {
        if (userData.boostDouble && Date.now() < userData.boostDoubleEnd) {
            boostBtn.innerHTML = '✅ АКТИВЕН';
            boostBtn.disabled = true;
        } else {
            boostBtn.innerHTML = 'Купить за 5000';
            boostBtn.disabled = false;
        }
    }
}

// Навигация
function navigateTo(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(page);
    if (target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) item.classList.add('active');
    });
    
    if (page === 'friends') loadLeaderboard();
}

function changeLanguage() {
    currentLang = currentLang === 'ru' ? 'en' : 'ru';
    const langBtn = document.getElementById('langBtn');
    if (langBtn) langBtn.innerHTML = currentLang.toUpperCase();
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        let key = el.dataset.i18n;
        if (translations[currentLang][key]) el.innerHTML = translations[currentLang][key];
    });
    
    updateUI();
    const autoBtn = document.getElementById('autoBtn');
    if (autoBtn) autoBtn.innerHTML = autoMode ? translations[currentLang].auto_on : translations[currentLang].auto_off;
}

// Инициализация
async function init() {
    // Получаем данные из Telegram
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const teleUser = tg.initDataUnsafe.user;
        userData.id = teleUser.id.toString();
        userData.name = teleUser.first_name || teleUser.username || 'User';
        userData.avatar = teleUser.photo_url || `https://avatars.dicebear.com/api/initials/${userData.name}.svg`;
    }
    
    document.getElementById('username').innerHTML = userData.name;
    document.getElementById('userid').innerHTML = `ID: ${userData.id}`;
    document.getElementById('avatar').src = userData.avatar;
    
    // Проверка реферальной ссылки
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');
    if (startParam && startParam !== userData.id) {
        userData.referrerId = startParam;
    }
    
    // Инициализация на сервере
    await initServerUser();
    
    // Назначение обработчиков
    document.getElementById('autoBtn').onclick = toggleAutoMode;
    document.getElementById('inviteBtn').onclick = shareInvite;
    document.getElementById('boostDoubleBtn').onclick = buyDoubleBoost;
    document.getElementById('withdrawBtn').onclick = withdrawFunds;
    document.getElementById('langBtn').onclick = changeLanguage;
    
    document.querySelectorAll('.task-btn').forEach(btn => {
        btn.onclick = () => {
            const task = btn.dataset.task;
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
        scheduleNextAutoWatch();
    }
}

document.addEventListener('DOMContentLoaded', init);