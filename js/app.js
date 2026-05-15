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

// ============= ОСНОВНАЯ ЛОГИКА ПРОСМОТРА (с Gigapub) =============
function watchAd(blockId) {
    console.log('👁️ watchAd вызван, блок:', blockId);
    console.log('Текущий баланс ДО:', user.balance);
    
    if (window.hapticFeedback) window.hapticFeedback('light');
    
    const block = blocks.find(b => b.id === blockId);
    if (!block) {
        console.error('❌ Блок не найден:', blockId);
        return;
    }
    
    if (Date.now() < block.l) {
        console.log('🔒 Блок заблокирован до:', new Date(block.l));
        if (window.showNotification) {
            window.showNotification('🔒 Блок заблокирован на 24 часа', 'error');
        }
        return;
    }
    
    const adReward = getRewardForCurrentLevel();
    console.log('💰 Награда за просмотр:', adReward);
    
    // Показываем реальную рекламу через Gigapub
    if (window.showGigapubAd) {
        if (window.showNotification) {
            window.showNotification('📺 Загрузка рекламы Gigapub...', 'info');
        }
        
        window.showGigapubAd(blockId, (success, rewardData) => {
            if (success) {
                console.log('✅ Реклама просмотрена, начисляем награду');
                
                user.balance += adReward;
                user.ads += 1;
                block.v += 1;
                
                console.log('💰 Начислено:', adReward);
                console.log('💰 Новый баланс:', user.balance);
                
                if (window.showNotification) {
                    window.showNotification(`✅ Получено +$${adReward.toFixed(4)} за просмотр!`, 'success');
                }
                
                if (window.sendToTelegram) {
                    window.sendToTelegram('ad_watched', { 
                        blockId: blockId, 
                        reward: adReward, 
                        level: user.level 
                    });
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
                    if (window.showAlert) {
                        setTimeout(() => {
                            window.showAlert(`🎉 Поздравляем! Вы достигли ${user.level} уровня!`);
                        }, 100);
                    }
                }
            } else {
                console.log('❌ Реклама не просмотрена');
                if (window.showNotification) {
                    window.showNotification('❌ Реклама не просмотрена, попробуйте ещё раз', 'error');
                }
            }
        });
    } else {
        // Фолбэк
        console.log('⚠️ Gigapub не доступен, симуляция');
        user.balance += adReward;
        user.ads += 1;
        block.v += 1;
        
        if (window.showNotification) {
            window.showNotification(`💰 +$${adReward.toFixed(4)} (демо-режим)`, 'success');
        }
        
        let leveled = false;
        while (user.ads >= 100) {
            user.level += 1;
            user.ads = 0;
            leveled = true;
        }
        
        if (block.v >= 15) {
            block.l = Date.now() + 86400000;
        }
        
        if (window.fullRender) window.fullRender();
        debounceSave();
    }
}

// ============= ОСТАЛЬНЫЕ ФУНКЦИИ (collectAutoClickerIncome, startAutoClickerLoop, initTasks, withdrawFunds и т.д.) =============
// ... (оставь все остальные функции без изменений из твоего app.js) ...

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
window.startBoostChecker = startBoostChecker;
window.startAutoClickerLoop = startAutoClickerLoop;
window.collectAutoClickerIncome = collectAutoClickerIncome;
window.checkBoosts = checkBoosts;
window.clearAllTimers = clearAllTimers;