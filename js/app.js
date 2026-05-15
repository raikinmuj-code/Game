// ============= НАЗВАНИЯ РЕКЛАМНЫХ БЛОКОВ =============
const blockNames = {
    1: 'Gigapub',
    2: 'CryptoAds',
    3: 'TokenBoost'
};

function getBlockName(blockId) {
    return blockNames[blockId] || `Блок ${blockId}`;
}

// ============= ДАННЫЕ ПОЛЬЗОВАТЕЛЯ (только с сервера) =============
let user = null;
let blocks = null;
let boosts = null;

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
    if (!user) return 0.0009;
    let reward = 0.0009 * user.level;
    if (boosts?.doubleIncome && boosts.doubleIncomeUntil > Date.now()) {
        reward *= 2;
    }
    return reward;
}

function getRewardForNextLevel() {
    if (!user) return 0.0018;
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

// Мгновенное сохранение (без debounce)
function saveToServer() {
    if (!user || !blocks) return;
    
    const blocksData = {};
    blocks.forEach((b, idx) => {
        blocksData[idx + 1] = { v: b.v, l: b.l };
    });
    
    fetch(`${window.API_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: window.currentUserId,
            user: { 
                balance: user.balance, 
                level: user.level, 
                ads: user.ads 
            },
            blocks: blocksData,
            boosts: boosts
        })
    }).catch(err => console.error('Save error:', err));
}

function checkBoosts() {
    if (!boosts) return;
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
    
    if (updated) {
        if (window.fullRender) window.fullRender();
        saveToServer();
    }
}

function startBoostChecker() {
    if (boostCheckInterval) clearInterval(boostCheckInterval);
    boostCheckInterval = setInterval(checkBoosts, 1000);
}

async function buyBoost(boostType, cost, durationHours) {
    if (!user) return false;
    
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
            break;
    }
    
    if (window.hapticFeedback) window.hapticFeedback('success');
    if (window.fullRender) window.fullRender();
    saveToServer();
    return true;
}

// ============= ОСНОВНАЯ ЛОГИКА ПРОСМОТРА =============
async function watchAd(blockId) {
    if (!user || !blocks) return;
    
    if (window.hapticFeedback) window.hapticFeedback('light');
    
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    if (Date.now() < block.l) {
        if (window.showNotification) {
            window.showNotification('🔒 Блок заблокирован на 24 часа', 'error');
        }
        return;
    }
    
    const adReward = getRewardForCurrentLevel();
    
    const giveReward = () => {
        user.balance += adReward;
        user.ads += 1;
        block.v += 1;
        
        if (window.fullRender) window.fullRender();
        saveToServer();
        
        if (window.showNotification) {
            window.showNotification(`✅ +$${adReward.toFixed(4)} за просмотр!`, 'success');
        }
        
        let leveled = false;
        while (user.ads >= 100) {
            user.level += 1;
            user.ads = 0;
            leveled = true;
        }
        
        if (block.v >= 15) {
            block.l = Date.now() + 86400000;
            if (window.showNotification) {
                window.showNotification(`🔒 ${getBlockName(blockId)} заблокирован на 24 часа!`, 'info');
            }
        }
        
        if (window.fullRender) window.fullRender();
        saveToServer();
        
        if (leveled && window.hapticFeedback) {
            window.hapticFeedback('success');
        }
    };
    
    if (window.showGigapubAd) {
        if (window.showNotification) {
            window.showNotification('📺 Загрузка рекламы...', 'info');
        }
        
        window.showGigapubAd(blockId, (success) => {
            if (success) {
                giveReward();
            } else {
                if (window.showNotification) {
                    window.showNotification('❌ Реклама не загрузилась', 'error');
                }
            }
        });
    } else {
        giveReward();
    }
}

// ============= АВТОКЛИКЕР =============
function collectAutoClickerIncome() {
    if (!boosts?.autoClicker || boosts.autoClickerUntil <= Date.now()) return false;
    if (!user || !blocks) return false;
    
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
        saveToServer();
    }
    
    return collected;
}

function startAutoClickerLoop() {
    if (autoClickerInterval) clearInterval(autoClickerInterval);
    autoClickerInterval = setInterval(() => {
        if (boosts?.autoClicker && boosts.autoClickerUntil > Date.now()) {
            collectAutoClickerIncome();
        }
    }, 5000);
}

// ============= ЗАДАНИЯ =============
async function completeTask(taskId, reward) {
    if (!user) return false;
    
    const response = await fetch(`${window.API_URL}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: window.currentUserId,
            taskId: taskId
        })
    });
    
    const result = await response.json();
    
    if (result.success) {
        user.balance += reward;
        if (window.fullRender) window.fullRender();
        saveToServer();
        
        if (window.hapticFeedback) window.hapticFeedback('success');
        if (window.showNotification) {
            window.showNotification(`🎁 Получено +$${reward} за задание!`, 'success');
        }
        return true;
    } else {
        if (window.showNotification) {
            window.showNotification(result.message || 'Задание уже выполнено', 'info');
        }
        return false;
    }
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

async function withdrawFunds() {
    if (!user) return;
    
    if (user.balance < 0.01) {
        if (window.showAlert) {
            window.showAlert('❌ Минимальная сумма для вывода: $0.01');
        }
        return;
    }
    
    if (window.showConfirm) {
        window.showConfirm(`Вывести $${user.balance.toFixed(4)}?`, async (confirmed) => {
            if (confirmed) {
                const response = await fetch(`${window.API_URL}/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: window.currentUserId,
                        amount: user.balance
                    })
                });
                
                if (response.ok) {
                    user.balance = 0;
                    if (window.fullRender) window.fullRender();
                    saveToServer();
                    if (window.showNotification) {
                        window.showNotification('✅ Заявка на вывод отправлена!', 'success');
                    }
                }
            }
        });
    }
}

// Обновление данных из сервера
async function syncFromServer() {
    if (!window.currentUserId) return false;
    
    try {
        const response = await fetch(`${window.API_URL}/user/${window.currentUserId}`);
        if (!response.ok) throw new Error('Sync failed');
        
        const data = await response.json();
        
        user = data.user;
        blocks = [
            { id: 1, v: data.blocks['1']?.v || 0, l: data.blocks['1']?.l || 0 },
            { id: 2, v: data.blocks['2']?.v || 0, l: data.blocks['2']?.l || 0 },
            { id: 3, v: data.blocks['3']?.v || 0, l: data.blocks['3']?.l || 0 }
        ];
        boosts = data.boosts || {
            doubleIncome: false,
            doubleIncomeUntil: 0,
            autoClicker: false,
            autoClickerUntil: 0
        };
        
        if (window.fullRender) window.fullRender();
        return true;
    } catch (error) {
        console.error('Sync error:', error);
        return false;
    }
}

// ============= ЭКСПОРТ =============
window.getBlockName = getBlockName;
window.getRewardForCurrentLevel = getRewardForCurrentLevel;
window.getRewardForNextLevel = getRewardForNextLevel;
window.formatLockTime = formatLockTime;
window.formatBoostTime = formatBoostTime;
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
window.syncFromServer = syncFromServer;
window.saveToServer = saveToServer;

// Геттеры для доступа из UI
Object.defineProperty(window, 'user', {
    get: () => user,
    set: (val) => { user = val; }
});
Object.defineProperty(window, 'blocks', {
    get: () => blocks,
    set: (val) => { blocks = val; }
});
Object.defineProperty(window, 'boosts', {
    get: () => boosts,
    set: (val) => { boosts = val; }
});

console.log('✅ app.js загружен (только серверное сохранение)');