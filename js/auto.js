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
        for (let b of blocks) {
            if (!auto) break;
            const notLocked = Date.now() >= b.l;
            const notFull = b.v < 15;
            if (notLocked && notFull) {
                await new Promise(resolve => setTimeout(resolve, 1200));
                if (!auto) break;
                
                const reward = getRewardForCurrentLevel();
                user.balance += reward;
                user.ads += 1;
                b.v += 1;
                
                let leveled = false;
                while (user.ads >= 100) {
                    user.level += 1;
                    user.ads = 0;
                    leveled = true;
                }
                
                if (b.v >= 15) {
                    b.l = Date.now() + 86400000;
                }
                
                if (window.fullRender) window.fullRender();
                
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