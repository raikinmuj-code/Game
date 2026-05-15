// ============= GIGAPUB ИНТЕГРАЦИЯ (РАБОЧАЯ) =============

let gigapubInitialized = false;
let gigapubPlacementId = '6724';

// Функция проверки загрузки SDK
function waitForGigapub(callback, attempt = 0) {
    if (attempt > 50) {
        console.error('❌ GigaPub SDK не загрузился после 50 попыток');
        return;
    }
    
    if (typeof window.Giga !== 'undefined' && window.Giga && typeof window.Giga.showRewardedVideo === 'function') {
        console.log('✅ GigaPub SDK найден, метод showRewardedVideo доступен');
        gigapubInitialized = true;
        if (callback) callback();
        return;
    }
    
    setTimeout(() => waitForGigapub(callback, attempt + 1), 200);
}

// Инициализация GigaPub
function initGigapub() {
    console.log('🔄 Инициализация GigaPub...');
    
    try {
        if (typeof window.Giga !== 'undefined' && window.Giga) {
            window.Giga.init({
                placementId: gigapubPlacementId,
                onReady: () => {
                    console.log('✅ GigaPub готов к работе!');
                    gigapubInitialized = true;
                },
                onError: (error) => {
                    console.error('❌ GigaPub ошибка:', error);
                }
            });
        } else {
            console.log('⏳ Ожидаем загрузку GigaPub SDK...');
            waitForGigapub(() => {
                if (window.Giga) {
                    window.Giga.init({
                        placementId: gigapubPlacementId,
                        onReady: () => {
                            console.log('✅ GigaPub готов к работе!');
                            gigapubInitialized = true;
                        },
                        onError: (error) => {
                            console.error('❌ GigaPub ошибка:', error);
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    }
}

// Показ рекламы
function showGigapubAd(blockId, onRewardCallback) {
    console.log('📺 Показ рекламы GigaPub для блока', blockId);
    
    if (!gigapubInitialized) {
        console.log('⏳ GigaPub не инициализирован, инициализируем...');
        initGigapub();
        setTimeout(() => showGigapubAd(blockId, onRewardCallback), 1000);
        return;
    }
    
    try {
        if (typeof window.Giga !== 'undefined' && window.Giga.showRewardedVideo) {
            window.Giga.showRewardedVideo({
                onReward: () => {
                    console.log('🎁 Награда от GigaPub!');
                    if (onRewardCallback) onRewardCallback(true);
                },
                onClose: () => {
                    console.log('🚪 Реклама закрыта');
                    if (onRewardCallback) onRewardCallback(false);
                },
                onError: (error) => {
                    console.error('❌ Ошибка показа:', error);
                    if (onRewardCallback) onRewardCallback(false);
                }
            });
        } else {
            console.error('❌ GigaPub.showRewardedVideo не доступен');
            if (onRewardCallback) onRewardCallback(false);
        }
    } catch (error) {
        console.error('❌ Исключение:', error);
        if (onRewardCallback) onRewardCallback(false);
    }
}

// Экспорт
window.initGigapub = initGigapub;
window.showGigapubAd = showGigapubAd;

console.log('✅ gigapub.js загружен');