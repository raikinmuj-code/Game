// ============= АВТОМАТИЧЕСКИЙ ПРОСМОТР (РЕАЛЬНАЯ РЕКЛАМА) =============

let auto = false;
let autoLoopActive = false;
let isAdShowing = false;

async function autoWatchLoop() {
    if (!auto) {
        autoLoopActive = false;
        return;
    }
    if (autoLoopActive) return;
    autoLoopActive = true;
    
    debugLog('🤖 Авто-режим ЗАПУЩЕН', 'success');
    
    while (auto) {
        if (isAdShowing) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }
        
        let anyAction = false;
        
        for (let b of window.blocks || []) {
            if (!auto) break;
            
            const notLocked = Date.now() >= b.l;
            const notFull = b.v < 15;
            
            if (notLocked && notFull) {
                debugLog(`🤖 Авто: показываем рекламу для блока ${b.id} (просмотров: ${b.v}/15)`, 'info');
                
                isAdShowing = true;
                
                if (window.showGigapubAd) {
                    await new Promise((resolve) => {
                        window.showGigapubAd(b.id, (success) => {
                            if (success) {
                                debugLog(`🤖 Авто: блок ${b.id} - реклама просмотрена!`, 'success');
                                
                                const reward = window.getRewardForCurrentLevel ? window.getRewardForCurrentLevel() : 0.0009;
                                window.user.balance += reward;
                                window.user.ads += 1;
                                b.v += 1;
                                
                                debugLog(`🤖 Авто: начислено +$${reward.toFixed(4)}, новый баланс: $${window.user.balance.toFixed(4)}`, 'success');
                                
                                let leveled = false;
                                while (window.user.ads >= 100) {
                                    window.user.level += 1;
                                    window.user.ads = 0;
                                    leveled = true;
                                    debugLog(`🤖 Авто: ПОВЫШЕНИЕ УРОВНЯ! Новый уровень: ${window.user.level}`, 'success');
                                }
                                
                                if (b.v >= 15) {
                                    b.l = Date.now() + 86400000;
                                    debugLog(`🤖 Авто: блок ${b.id} заблокирован на 24 часа`, 'info');
                                }
                                
                                if (window.fullRender) window.fullRender();
                                if (window.debounceSave) window.debounceSave();
                                
                                if (leveled && window.hapticFeedback) {
                                    window.hapticFeedback('success');
                                }
                            } else {
                                debugLog(`🤖 Авто: блок ${b.id} - реклама НЕ просмотрена`, 'warning');
                            }
                            isAdShowing = false;
                            resolve();
                        });
                    });
                } else {
                    debugLog('🤖 Авто: GigaPub не доступен', 'error');
                    isAdShowing = false;
                }
                
                anyAction = true;
                break;
            }
        }
        
        if (!anyAction) {
            debugLog('🤖 Авто: нет доступных блоков, ожидание...', 'info');
            await new Promise(r => setTimeout(r, 5000));
        } else {
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    
    autoLoopActive = false;
    debugLog('🤖 Авто-режим ОСТАНОВЛЕН', 'info');
}

function toggleAutoMode() {
    auto = !auto;
    debugLog(`🤖 Авто-режим: ${auto ? 'ВКЛЮЧЁН' : 'ВЫКЛЮЧЁН'}`, 'info');
    
    if (window.fullRender) window.fullRender();
    
    if (auto && !autoLoopActive) {
        autoWatchLoop();
    }
}

Object.defineProperty(window, 'auto', {
    get: () => auto,
    set: (val) => { auto = val; }
});

Object.defineProperty(window, 'autoLoopActive', {
    get: () => autoLoopActive,
    set: (val) => { autoLoopActive = val; }
});

window.autoWatchLoop = autoWatchLoop;
window.toggleAutoMode = toggleAutoMode;

debugLog('✅ auto.js загружен (авто-режим с реальной рекламой)', 'success');