// ============= АВТОМАТИЧЕСКИЙ ПРОСМОТР (с реальной рекламой) =============
let auto = false;
let autoLoopActive = false;
let isAdShowing = false; // Флаг, чтобы не запускать несколько реклам одновременно

async function autoWatchLoop() {
    if (!auto) {
        autoLoopActive = false;
        return;
    }
    if (autoLoopActive) return;
    autoLoopActive = true;
    
    while (auto) {
        // Проверяем, не показывается ли уже реклама
        if (isAdShowing) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }
        
        let anyAction = false;
        
        // Ищем доступный блок (снизу вверх или по порядку)
        for (let b of window.blocks || []) {
            if (!auto) break;
            
            const notLocked = Date.now() >= b.l;
            const notFull = b.v < 15;
            
            if (notLocked && notFull) {
                console.log('🤖 Авто-режим: найден блок', b.id, 'просмотров:', b.v);
                
                isAdShowing = true;
                
                // Показываем реальную рекламу
                if (window.showGigapubAd) {
                    await new Promise((resolve) => {
                        window.showGigapubAd(b.id, (success) => {
                            if (success) {
                                console.log('🤖 Авто-режим: реклама просмотрена, начисляем');
                                
                                const reward = window.getRewardForCurrentLevel ? window.getRewardForCurrentLevel() : 0.0009;
                                window.user.balance += reward;
                                window.user.ads += 1;
                                b.v += 1;
                                
                                // Проверка повышения уровня
                                while (window.user.ads >= 100) {
                                    window.user.level += 1;
                                    window.user.ads = 0;
                                }
                                
                                // Блокировка при 15 просмотрах
                                if (b.v >= 15) {
                                    b.l = Date.now() + 86400000;
                                }
                                
                                if (window.fullRender) window.fullRender();
                                if (window.debounceSave) window.debounceSave();
                            } else {
                                console.log('🤖 Авто-режим: реклама не просмотрена');
                            }
                            isAdShowing = false;
                            resolve();
                        });
                    });
                } else {
                    // Фолбэк: симуляция
                    console.log('🤖 Авто-режим: GigaPub не доступен, симуляция');
                    const reward = window.getRewardForCurrentLevel ? window.getRewardForCurrentLevel() : 0.0009;
                    window.user.balance += reward;
                    window.user.ads += 1;
                    b.v += 1;
                    
                    while (window.user.ads >= 100) {
                        window.user.level += 1;
                        window.user.ads = 0;
                    }
                    
                    if (b.v >= 15) {
                        b.l = Date.now() + 86400000;
                    }
                    
                    if (window.fullRender) window.fullRender();
                    if (window.debounceSave) window.debounceSave();
                    
                    isAdShowing = false;
                }
                
                anyAction = true;
                break; // После просмотра одного блока начинаем цикл заново
            }
        }
        
        if (!anyAction) {
            // Нет доступных блоков, ждём
            await new Promise(r => setTimeout(r, 2000));
        } else {
            // После просмотра делаем паузу, чтобы не спамить
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    autoLoopActive = false;
}

function toggleAutoMode() {
    auto = !auto;
    console.log('🤖 Авто-режим:', auto ? 'ВКЛЮЧЁН' : 'ВЫКЛЮЧЁН');
    if (window.fullRender) window.fullRender();
    if (auto && !autoLoopActive) {
        autoWatchLoop();
    }
}

// Экспорт
window.auto = auto;
window.autoLoopActive = autoLoopActive;
window.autoWatchLoop = autoWatchLoop;
window.toggleAutoMode = toggleAutoMode;

// Геттеры для window.auto
Object.defineProperty(window, 'auto', {
    get: () => auto,
    set: (val) => { auto = val; }
});

Object.defineProperty(window, 'autoLoopActive', {
    get: () => autoLoopActive,
    set: (val) => { autoLoopActive = val; }
});
