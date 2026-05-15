// ============= ДАННЫЕ ПОЛЬЗОВАТЕЛЯ =============
let user = { balance: 0, level: 1, ads: 0 };
let blocks = [
    { id: 1, v: 0, l: 0 },
    { id: 2, v: 0, l: 0 },
    { id: 3, v: 0, l: 0 }
];

let timerIntervals = [];
let saveTimeout = null;

function clearAllTimers() {
    timerIntervals.forEach(interval => clearInterval(interval));
    timerIntervals = [];
}

function getRewardForCurrentLevel() {
    return 0.0009 * user.level;
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

// Автосохранение (не чаще раза в секунду)
function debounceSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        if (window.saveProgress) window.saveProgress();
    }, 500);
}

function watchAd(blockId) {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    if (Date.now() < block.l) return;
    
    const reward = getRewardForCurrentLevel();
    user.balance += reward;
    user.ads += 1;
    block.v += 1;
    
    // Повышение уровня
    let leveled = false;
    while (user.ads >= 100) {
        user.level += 1;
        user.ads = 0;
        leveled = true;
    }
    
    // Блокировка на 24 часа при 15 просмотрах
    if (block.v >= 15) {
        block.l = Date.now() + 86400000;
    }
    
    if (window.fullRender) window.fullRender();
    debounceSave(); // Сохраняем после действия
    
    if (leveled) {
        const rewardDiv = document.getElementById("nextLevelReward");
        if (rewardDiv) {
            rewardDiv.style.transform = "scale(1.08)";
            setTimeout(() => { if(rewardDiv) rewardDiv.style.transform = ""; }, 200);
        }
    }
}