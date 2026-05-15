// ============= АВТОМАТИЧЕСКИЙ ПРОСМОТР (РЕАЛЬНАЯ РЕКЛАМА) =============

let auto = false;
let autoLoopActive = false;
let isAdShowing = false; // Флаг, чтобы не показывать несколько реклам одновременно

// Авто-цикл
async function autoWatchLoop() {
    if (!auto) {
        autoLoopActive = false;
        return;
    }
    if (autoLoopActive) return;
    autoLoopActive = true;
    
    console.log('🤖 Авто-режим ЗАПУЩЕН');
    
    while (auto) {
        // Если реклама уже показывается, ждём
        if (isAdShowing) {
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }
        
        let anyAction = false;
        
        // Ищем доступный блок для просмотра
        for (let b of window.blocks || []) {
            if (!auto) break;
            
            const notLocked = Date.now() >= b.l;
            const notFull = b.v < 15;
            
            if (notLocked && notFull) {
                console.log(`🤖 Авто: показываем рекламу для блока ${b.id} (просмотров: ${b.v}/15)`);
                
                isAdShowing = true;
                
                // Показываем реальную рекламу через GigaPub
                if (window.showGigapubAd) {
                    await new Promise((resolve) => {
                        window.showGigapubAd(b.id, (success) => {
                            if (success) {
                                console.log(`🤖 Авто: блок ${b.id} - реклама просмотрена!`);
                                
                                // Начисляем награду
                                const reward = window.getRewardForCurrentLevel ? window.getRewardForCurrentLevel() : 0.0009;
                                window.user.balance += reward;
                                window.user.ads += 1;
                                b.v += 1;
                                
                                console.log(`🤖 Авто: начислено +$${reward.toFixed(4)}, новый баланс: $${window.user.balance.toFixed(4)}`);
                                
                                // Проверка повышения уровня
                                let leveled = false;
                                while (window.user.ads >= 100) {
                                    window.user.level += 1;
                                    window.user.ads = 0;
                                    leveled = true;
                                    console.log(`🤖 Авто: ПОВЫШЕНИЕ УРОВНЯ! Новый уровень: ${window.user.level}`);
                                }
                                
                                // Блокировка блока при 15 просмотрах
                                if (b.v >= 15) {
                                    b.l = Date.now() + 86400000;
                                    console.log(`🤖 Авто: блок ${b.id} заблокирован на 24 часа`);
                                }
                                
                                // Обновляем UI
                                if (window.fullRender) window.fullRender();
                                if (window.debounceSave) window.debounceSave();
                                
                                if (leveled && window.hapticFeedback) {
                                    window.hapticFeedback('success');
                                }
                            } else {
                                console.log(`🤖 Авто: блок ${b.id} - реклама НЕ просмотрена`);
                            }
                            isAdShowing = false;
                            resolve();
                        });
                    });
                } else {
                    // Если GigaPub не доступен, показываем уведомление
                    console.warn('🤖 Авто: GigaPub не доступен');
                    if (window.showNotification) {
                        window.showNotification('⚠️ Авто-режим: реклама временно недоступна', 'error');
                    }
                    isAdShowing = false;
                }
                
                anyAction = true;
                break; // После просмотра одного блока начинаем цикл заново
            }
        }
        
        if (!anyAction) {
            // Нет доступных блоков
            console.log('🤖 Авто: нет доступных блоков, ожидание...');
            await new Promise(r => setTimeout(r, 5000));
        } else {
            // Пауза между рекламами (чтобы не спамить)
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    
    autoLoopActive = false;
    console.log('🤖 Авто-режим ОСТАНОВЛЕН');
}

// Включение/выключение авто-режима
function toggleAutoMode() {
    auto = !auto;
    console.log(`🤖 Авто-режим: ${auto ? 'ВКЛЮЧЁН' : 'ВЫКЛЮЧЁН'}`);
    
    if (window.fullRender) window.fullRender();
    
    if (auto && !autoLoopActive) {
        autoWatchLoop();
    }
}

// Экспорт переменных через геттеры
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

console.log('✅ auto.js загружен (авто-режим с реальной рекламой)');
