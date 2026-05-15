// ============= GIGAPUB ИНТЕГРАЦИЯ =============
let gigapubInitialized = false;
let gigapubPlacementId = '6724'; // Твой код из Gigapub!

// Инициализация Gigapub
function initGigapub() {
    if (typeof Gigapub === 'undefined') {
        console.warn('⚠️ Gigapub SDK не загружен, проверь подключение скрипта');
        return false;
    }
    
    try {
        console.log('🔄 Инициализация Gigapub...');
        
        Gigapub.init({
            placementId: gigapubPlacementId,
            debug: true, // Включи для отладки (потом выключи)
            testMode: false, // Режим боевой, т.к. есть реальный ID
            onReady: () => {
                console.log('✅ Gigapub готов к работе! Placement ID:', gigapubPlacementId);
                gigapubInitialized = true;
                if (window.showNotification) {
                    window.showNotification('📺 Реклама готова к показу!', 'success');
                }
            },
            onError: (error) => {
                console.error('❌ Gigapub ошибка:', error);
                gigapubInitialized = false;
            }
        });
        return true;
    } catch (error) {
        console.error('❌ Ошибка инициализации Gigapub:', error);
        return false;
    }
}

// Показ рекламы через Gigapub
function showGigapubAd(blockId, onRewardCallback) {
    if (!gigapubInitialized && typeof Gigapub !== 'undefined') {
        initGigapub();
    }
    
    // Проверяем доступность
    if (typeof Gigapub === 'undefined' || !Gigapub.showRewardedAd) {
        console.warn('⚠️ Gigapub недоступен, используем симуляцию');
        // Фолбэк: симулируем просмотр через 1 секунду
        setTimeout(() => {
            if (onRewardCallback) onRewardCallback(true, { amount: 0.0009, type: 'simulated' });
        }, 1000);
        return;
    }
    
    console.log('📺 Показ рекламы Gigapub для блока', blockId, 'Placement:', gigapubPlacementId);
    
    try {
        Gigapub.showRewardedAd({
            placementId: gigapubPlacementId,
            onReward: (reward) => {
                console.log('🎁 Награда от Gigapub:', reward);
                if (onRewardCallback) {
                    onRewardCallback(true, reward);
                }
            },
            onClose: () => {
                console.log('🚪 Реклама закрыта без награды');
                if (onRewardCallback) {
                    onRewardCallback(false, null);
                }
            },
            onError: (error) => {
                console.error('❌ Ошибка показа рекламы:', error);
                if (onRewardCallback) {
                    onRewardCallback(false, null);
                }
            }
        });
    } catch (error) {
        console.error('❌ Исключение при показе рекламы:', error);
        if (onRewardCallback) {
            onRewardCallback(false, null);
        }
    }
}

// Проверка доступности рекламы
function isGigapubAvailable() {
    return typeof Gigapub !== 'undefined' && gigapubInitialized;
}

// Установка Placement ID
function setGigapubPlacementId(placementId) {
    gigapubPlacementId = placementId;
    gigapubInitialized = false;
    console.log('🔄 Placement ID обновлён:', placementId);
    initGigapub();
}

// Экспорт
window.initGigapub = initGigapub;
window.showGigapubAd = showGigapubAd;
window.isGigapubAvailable = isGigapubAvailable;
window.setGigapubPlacementId = setGigapubPlacementId;
window.gigapubPlacementId = gigapubPlacementId;

console.log('✅ gigapub.js загружен, Placement ID:', gigapubPlacementId);