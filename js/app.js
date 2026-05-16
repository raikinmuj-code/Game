// ============= НАЗВАНИЯ РЕКЛАМНЫХ БЛОКОВ =============
const blockNames = {
    1: 'Gigapub',
    2: 'CryptoAds',
    3: 'TokenBoost'
};

function getBlockName(blockId) {
    return blockNames[blockId] || `Блок ${blockId}`;
}

let timerIntervals = [];
let saveTimeout = null;
let boostCheckInterval = null;
let autoClickerInterval = null;

function clearAllTimers() {
    timerIntervals.forEach(interval => clearInterval(interval));
    timerIntervals = [];
    if (boostCheckInterval) clearInterval(boostCheckInterval);
}

function getRewardForCurrentLevel() {
    if (!window.user) return 0.0009;
    let reward = 0.0009 * window.user.level;
    if (window.boosts?.doubleIncome && window.boosts.doubleIncomeUntil > Date.now()) {
        reward *= 2;
    }
    return reward;
}

function getRewardForNextLevel() {
    if (!window.user) return 0.0018;
    return 0.0009 * (window.user.level + 1);
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
        saveToServer();
    }, 500);
}

async function saveToServer() {
    if (!window.user || !window.blocks) {
        console.log('⚠️ Нет данных для сохранения');
        return;
    }
    
    if (!window.currentUserId) {
        console.log('⚠️ Нет userId для сохранения');
        return;
    }
    
    const blocksData = {};
    window.blocks.forEach((b, idx) => {
        blocksData[idx + 1] = { v: b.v, l: b.l };
    });
    
    try {
        const response = await fetch(`${window.API_URL}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: window.currentUserId,
                user: { 
                    balance: window.user.balance, 
                    level: window.user.level, 
                    ads: window.user.ads 
                },
                blocks: blocksData,
                boosts: window.boosts
            })
        });
        
        if (response.ok) {
            console.log(`💾 Сохранено: баланс $${window.user.balance}`);
        } else {
            console.log(`❌ Ошибка сохранения: ${response.status}`);
        }
    } catch (err) {
        console.log(`❌ Ошибка сохранения: ${err.message}`);
    }
}

function checkBoosts() {
    if (!window.boosts) return;
    let updated = false;
    
    if (window.boosts.doubleIncome && window.boosts.doubleIncomeUntil <= Date.now()) {
        window.boosts.doubleIncome = false;
        window.boosts.doubleIncomeUntil = 0;
        updated = true;
        if (window.showNotification) {
            window.showNotification('⏰ Удвоение дохода закончилось!', 'info');
        }
    }
    
    if (window.boosts.autoClicker && window.boosts.autoClickerUntil <= Date.now()) {
        window.boosts.autoClicker = false;
        window.boosts.autoClickerUntil = 0;
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
    if (!window.user) return false;
    
    if (window.user.balance < cost) {
        if (window.showAlert) {
            window.showAlert(`❌ Недостаточно средств! Нужно $${cost.toFixed(4)}`);
        }
        if (window.hapticFeedback) window.hapticFeedback('error');
        return false;
    }
    
    window.user.balance -= cost;
    
    switch(boostType) {
        case 'double':
            window.boosts.doubleIncome = true;
            window.boosts.doubleIncomeUntil = Date.now() + (durationHours * 3600000);
            if (window.showNotification) {
                window.showNotification(`💰 Удвоение дохода активировано на ${durationHours} часа!`, 'success');
            }
            break;
        case 'auto':
            window.boosts.autoClicker = true;
            window.boosts.autoClickerUntil = Date.now() + (durationHours * 3600000);
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

async function watchAd(blockId) {
    if (!window.user || !window.blocks) return;
    
    if (window.hapticFeedback) window.hapticFeedback('light');
    
    const block = window.blocks.find(b => b.id === blockId);
    if (!block) return;
    
    if (Date.now() < block.l) {
        if (window.showNotification) {
            window.showNotification('🔒 Blocked for 24 hours', 'error');
        }
        return;
    }
    
    const adReward = window.getRewardForCurrentLevel();
    
    // ГЛАВНОЕ: начисляем награду
    window.user.balance += adReward;
    window.user.ads += 1;
    block.v += 1;
    
    console.log(`🎬 Watch ad: +$${adReward.toFixed(4)}, new balance: $${window.user.balance}`);
    
    // Проверяем повышение уровня
    let leveled = false;
    while (window.user.ads >= 100) {
        window.user.level += 1;
        window.user.ads = 0;
        leveled = true;
        console.log(`⬆️ LEVEL UP! Now level ${window.user.level}`);
    }
    
    // Проверяем блокировку блока
    if (block.v >= 15) {
        block.l = Date.now() + 86400000;
        console.log(`🔒 Block ${blockId} locked for 24 hours`);
    }
    
    // Обновляем UI
    if (window.fullRender) window.fullRender();
    
    // СОХРАНЯЕМ на сервер
    await window.saveToServer();
    
    if (window.showNotification) {
        window.showNotification(`✅ +$${adReward.toFixed(4)}`, 'success');
    }
    
    if (leveled && window.hapticFeedback) {
        window.hapticFeedback('success');
    }
}

function collectAutoClickerIncome() {
    if (!window.boosts?.autoClicker || window.boosts.autoClickerUntil <= Date.now()) return false;
    if (!window.user || !window.blocks) return false;
    
    let collected = false;
    for (let b of window.blocks) {
        if (Date.now() >= b.l && b.v < 15) {
            const reward = getRewardForCurrentLevel();
            window.user.balance += reward;
            b.v += 1;
            collected = true;
            
            if (b.v >= 15) {
                b.l = Date.now() + 86400000;
            }
            break;
        }
    }
    
    while (window.user.ads >= 100) {
        window.user.level += 1;
        window.user.ads = 0;
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
        if (window.boosts?.autoClicker && window.boosts.autoClickerUntil > Date.now()) {
            collectAutoClickerIncome();
        }
    }, 5000);
}

async function completeTask(taskId, reward) {
    if (!window.user) return false;
    
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
        window.user.balance += reward;
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
    if (!window.user) return;
    
    if (window.user.balance < 0.01) {
        if (window.showAlert) {
            window.showAlert('❌ Минимальная сумма для вывода: $0.01');
        }
        return;
    }
    
    if (window.showConfirm) {
        window.showConfirm(`Вывести $${window.user.balance.toFixed(4)}?`, async (confirmed) => {
            if (confirmed) {
                const response = await fetch(`${window.API_URL}/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: window.currentUserId,
                        amount: window.user.balance
                    })
                });
                
                if (response.ok) {
                    window.user.balance = 0;
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
window.saveToServer = saveToServer;
window.debounceSave = debounceSave;

console.log('✅ app.js загружен');