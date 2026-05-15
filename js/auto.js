// ============= АВТОМАТИЧЕСКИЙ ПРОСМОТР =============
let auto = false;
let autoLoopActive = false;

async function autoWatchLoop() {
    if (!auto) {
        autoLoopActive = false;
        return;
    }
    if (autoLoopActive) return;
    autoLoopActive = true;
    
    while (auto) {
        let anyAction = false;
        for (let b of window.blocks || []) {
            if (!auto) break;
            const notLocked = Date.now() >= b.l;
            const notFull = b.v < 15;
            if (notLocked && notFull) {
                await new Promise(resolve => setTimeout(resolve, 1200));
                if (!auto) break;
                
                const reward = window.getRewardForCurrentLevel ? window.getRewardForCurrentLevel() : 0.0009;
                window.user.balance += reward;
                window.user.ads += 1;
                b.v += 1;
                
                let leveled = false;
                while (window.user.ads >= 100) {
                    window.user.level += 1;
                    window.user.ads = 0;
                    leveled = true;
                }
                
                if (b.v >= 15) {
                    b.l = Date.now() + 86400000;
                }
                
                if (window.fullRender) window.fullRender();
                if (window.debounceSave) window.debounceSave();
                
                if (leveled) {
                    const rewardDiv = document.getElementById("nextLevelReward");
                    if (rewardDiv) {
                        rewardDiv.style.transform = "scale(1.08)";
                        setTimeout(() => { if(rewardDiv) rewardDiv.style.transform = ""; }, 200);
                    }
                }
                anyAction = true;
                break;
            }
        }
        if (!anyAction) {
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    autoLoopActive = false;
}

function toggleAutoMode() {
    auto = !auto;
    if (window.fullRender) window.fullRender();
    if (auto && !autoLoopActive) {
        autoWatchLoop();
    }
}

// Экспорт функций
window.autoWatchLoop = autoWatchLoop;
window.toggleAutoMode = toggleAutoMode;

// Геттеры для переменных (чтобы window.auto всегда показывал актуальное значение)
Object.defineProperty(window, 'auto', {
    get: () => auto,
    set: (val) => { auto = val; }
});

Object.defineProperty(window, 'autoLoopActive', {
    get: () => autoLoopActive,
    set: (val) => { autoLoopActive = val; }
});