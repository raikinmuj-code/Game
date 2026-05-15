// ============= НАЗВАНИЯ РЕКЛАМНЫХ БЛОКОВ =============
const blockNames = {
    1: 'Gigapub',
    2: 'CryptoAds',
    3: 'TokenBoost'
};

function getBlockName(blockId) {
    return blockNames[blockId] || `Блок ${blockId}`;
}

// ============= ДАННЫЕ ПОЛЬЗОВАТЕЛЯ =============
let user = { balance: 0, level: 1, ads: 0 };
let blocks = [
    { id: 1, v: 0, l: 0 },
    { id: 2, v: 0, l: 0 },
    { id: 3, v: 0, l: 0 }
];

let boosts = {
    doubleIncome: false,
    autoClicker: false,
    doubleIncomeUntil: 0,
    autoClickerUntil: 0
};

let timerIntervals = [];
let saveTimeout = null;
let boostCheckInterval = null;
let autoClickerInterval = null;

// ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============
function clearAllTimers() {
    timerIntervals.forEach(interval => clearInterval(interval));
    timerIntervals = [];
    if (boostCheckInterval) clearInterval(boostCheckInterval);
}

function getRewardForCurrentLevel() {
    let reward = 0.0009 * user.level;
    if (boosts.doubleIncome && boosts.doubleIncomeUntil > Date.now()) {
        reward *= 2;
    } else if (boosts.doubleIncome) {
        boosts.doubleIncome = false;
    }
    return reward;
}

function getRewardForNextLevel() {
    return 0.0009 * (user.level + 1);
}

function formatLockTime(lockUntil) {
    const now = Date.now();
    if (now >= lockUntil) return null;
    const diffMs = lockUntil - now;
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatBoostTime(until) {
    if (!until || until <= Date.now()) return null;
    const diffMs = until - Date.now();
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    if (hours > 0) return `${hours}ч ${minutes}м`;
    if (minutes > 0) return `${minutes}м ${seconds}с`;
    return `${seconds}с`;
}

function debounceSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (window.saveProgress) window.saveProgress();
    }, 500);
}

function checkBoosts() {
    let updated = false;
    
    if (boosts.doubleIncome && boosts.doubleIncomeUntil <= Date.now()) {
        boosts.doubleIncome = false;
        boosts.doubleIncomeUntil = 0;
        updated = true;
        if (window.showNotification) {
            window.showNotification('⏰ Удвоение дохода закончилось!', 'info');
        }
    }
    
    if (boosts.autoClicker && boosts.autoClickerUntil <= Date.now()) {
        boosts.autoClicker = false;
        boosts.autoClickerUntil = 0;
        updated = true;
    }
    
    if (updated && window.fullRender) {
        window.fullRender();
        debounceSave();
    }
}

function startBoostChecker() {
    if (boostCheckInterval) clearInterval(boostCheckInterval);
    boostCheckInterval = setInterval(checkBoosts, 1000);
}

function buyBoost(boostType, cost, durationHours) {
    if (user.balance < cost) {
        if (window.showAlert) {
            window.showAlert(`❌ Недостаточно средств! Нужно $${cost.toFixed(4)}`);
        }
        if (window.hapticFeedback) window.hapticFeedback('error');
        return false;
    }
    
    user.balance -= cost;
    
    switch(boostType) {
        case 'double':
            boosts.doubleIncome = true;
            boosts.doubleIncomeUntil = Date.now() + (durationHours * 3600000);
            if (window.showNotification) {
                window.showNotification(`💰 Удвоение дохода активировано на ${durationHours} часа!`, 'success');
            }
            break;
        case 'auto':
            boosts.autoClicker = true;
            boosts.autoClickerUntil = Date.now() + (durationHours * 3600000);
            if (window.showNotification) {
                window.showNotification(`⚡ Авто-кликер активирован на ${durationHours} часа!`, 'success');
            }
            if (!window.auto) {
                setTimeout(() => {
                    if (window.toggleAutoMode && !window.auto) {
                        window.toggleAutoMode();
                    }
                }, 500);
            }
            break;
    }
    
    if (window.hapticFeedback) window.hapticFeedback('success');
    if (window.fullRender) window.fullRender();
    debounceSave();
    return true;
}

// ============= ОСНОВНАЯ ЛОГИКА ПРОСМОТРА =============
function watchAd(blockId) {
    console.log('👁️ watchAd вызван, блок:', blockId);
    
    if (window.hapticFeedback) window.hapticFeedback('light');
    
    const block = blocks.find(b => b.id === blockId);
    if (!block) {
        console.error('❌ Блок не найден:', blockId);
        return;
    }
    
    if (Date.now() < block.l) {
        console.log('🔒 Блок заблокирован');
        if (window.showNotification) {
            window.showNotification('🔒 Блок заблокирован на 24 часа', 'error');
        }
        return;
    }
    
    const adReward = getRewardForCurrentLevel();
    console.log('💰 Награда за просмотр:', adReward);
    
    const giveReward = () => {
        console.log('✅ Начисляем награду!');
        
        user.balance += adReward;
        user.ads += 1;
        block.v += 1;
        
        console.log('💰 Новый баланс:', user.balance);
        
        if (window.fullRender) window.fullRender();
        debounceSave();
        
        if (window.showNotification) {
            window.showNotification(`✅ +$${adReward.toFixed(4)} за просмотр!`, 'success');
        }
        
        let leveled = false;
        while (user.ads >= 100) {
            user.level += 1;
            user.ads = 0;
            leveled = true;
            console.log('🎉 ПОВЫШЕНИЕ УРОВНЯ! Новый уровень:', user.level);
        }
        
        if (block.v >= 15) {
            block.l = Date.now() + 86400000;
            console.log('🔒 Блок ЗАБЛОКИРОВАН на 24 часа');
            if (window.showNotification) {
                window.showNotification(`🔒 ${getBlockName(blockId)} заблокирован на 24 часа!`, 'info');
            }
        }
        
        if (window.fullRender) window.fullRender();
        debounceSave();
        
        if (leveled && window.hapticFeedback) {
            window.hapticFeedback('success');
        }
    };
    
    if (window.showGigapubAd) {
        if (window.showNotification) {
            window.showNotification('📺 Загрузка рекламы...', 'info');
        }
        
        window.showGigapubAd(blockId, (success) => {
            console.log('🎬 Callback, success:', success);
            
            if (success) {
                giveReward();
            } else {
                console.log('❌ Реклама не просмотрена');
                if (window.showNotification) {
                    window.showNotification('❌ Реклама не загрузилась', 'error');
                }
            }
        });
    } else {
        console.error('❌ showGigapubAd не определён');
        if (window.showNotification) {
            window.showNotification('❌ Реклама временно недоступна', 'error');
        }
    }
}

// ============= ОСТАЛЬНЫЕ ФУНКЦИИ =============
function collectAutoClickerIncome() {
    if (!boosts.autoClicker || boosts.autoClickerUntil <= Date.now()) {
        if (boosts.autoClicker) {
            boosts.autoClicker = false;
            boosts.autoClickerUntil = 0;
            if (window.fullRender) window.fullRender();
        }
        return false;
    }
    
    let collected = false;
    for (let b of blocks) {
        if (Date.now() >= b.l && b.v < 15) {
            const reward = getRewardForCurrentLevel();
            user.balance += reward;
            b.v += 1;
            collected = true;
            
            if (b.v >= 15) {
                b.l = Date.now() + 86400000;
            }
            break;
        }
    }
    
    while (user.ads >= 100) {
        user.level += 1;
        user.ads = 0;
    }
    
    if (collected) {
        if (window.fullRender) window.fullRender();
        debounceSave();
    }
    
    return collected;
}

function startAutoClickerLoop() {
    if (autoClickerInterval) clearInterval(autoClickerInterval);
    autoClickerInterval = setInterval(() => {
        if (boosts.autoClicker && boosts.autoClickerUntil > Date.now()) {
            collectAutoClickerIncome();
        } else if (boosts.autoClicker) {
            boosts.autoClicker = false;
            boosts.autoClickerUntil = 0;
            if (window.fullRender) window.fullRender();
        }
    }, 5000);
}

let completedTasks = { subscribe: false, share: false };

function completeTask(taskId, reward) {
    if (completedTasks[taskId]) {
        if (window.showNotification) {
            window.showNotification('✅ Задание уже выполнено!', 'info');
        }
        return false;
    }
    
    completedTasks[taskId] = true;
    user.balance += reward;
    
    if (window.fullRender) window.fullRender();
    debounceSave();
    
    if (window.hapticFeedback) window.hapticFeedback('success');
    if (window.showNotification) {
        window.showNotification(`🎁 Получено +$${reward.toFixed(0)} за задание!`, 'success');
    }
    
    return true;
}

function initTasks() {
    const taskBtns = document.querySelectorAll('.task-btn');
    taskBtns.forEach(btn => {
        btn.onclick = () => {
            const taskId = btn.getAttribute('data-task');
            if (taskId === 'subscribe') {
                window.open('https://t.me/duckads', '_blank');
                setTimeout(() => completeTask('subscribe', 1000), 3000);
            } else if (taskId === 'share') {
                completeTask('share', 500);
            }
        };
    });
}

function withdrawFunds() {
    if (user.balance < 0.01) {
        if (window.showAlert) {
            window.showAlert('❌ Минимальная сумма для вывода: $0.01');
        }
        return;
    }
    
    if (window.showConfirm) {
        window.showConfirm(`Вывести $${user.balance.toFixed(4)}?`, (confirmed) => {
            if (confirmed) {
                user.balance = 0;
                if (window.fullRender) window.fullRender();
                debounceSave();
            }
        });
    }
}

// ============= ЭКСПОРТ =============
window.user = user;
window.blocks = blocks;
window.boosts = boosts;
window.timerIntervals = timerIntervals;
window.getBlockName = getBlockName;
window.getRewardForCurrentLevel = getRewardForCurrentLevel;
window.getRewardForNextLevel = getRewardForNextLevel;
window.formatLockTime = formatLockTime;
window.formatBoostTime = formatBoostTime;
window.debounceSave = debounceSave;
window.watchAd = watchAd;
window.buyBoost = buyBoost;
window.completeTask = completeTask;
window.initTasks = initTasks;
window.withdrawFunds = withdrawFunds;
window.startBoostChecker = startBoostChecker;
window.startAutoClickerLoop = startAutoClickerLoop;
window.collectAutoClickerIncome = collectAutoClickerIncome;
window.checkBoosts = checkBoosts;
window.clearAllTimers = clearAllTimers;

console.log('✅ app.js загружен');