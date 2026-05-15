// ============= GIGAPUB ИНТЕГРАЦИЯ =============
let gigapubInitialized = false;
let gigapubPlacementId = '6724'; // Твой ID

// Инициализация Gigapub
function initGigapub() {
    console.log('🔄 Инициализация Gigapub...');
    
    // Ждём загрузки SDK
    if (typeof Gigapub === 'undefined') {
        console.log('⏳ Gigapub SDK ещё не загружен, ждём...');
        setTimeout(() => initGigapub(), 500);
        return false;
    }
    
    console.log('✅ Gigapub SDK найден:', typeof Gigapub);
    
    try {
        Gigapub.init({
            placementId: gigapubPlacementId,
            debug: true,
            onReady: () => {
                console.log('✅ Gigapub готов к работе! Placement ID:', gigapubPlacementId);
                gigapubInitialized = true;
            },
            onError: (error) => {
                console.error('❌ Gigapub ошибка:', error);
                gigapubInitialized = false;
            }
        });
        return true;
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        return false;
    }
}

// Показ рекламы
function showGigapubAd(blockId, onRewardCallback) {
    console.log('📺 Показ рекламы для блока', blockId);
    
    // Если не инициализирован, пробуем ещё раз
    if (!gigapubInitialized) {
        console.log('🔄 Gigapub не инициализирован, пробуем...');
        initGigapub();
        setTimeout(() => {
            showGigapubAd(blockId, onRewardCallback);
        }, 500);
        return;
    }
    
    if (typeof Gigapub === 'undefined' || !Gigapub.showRewardedAd) {
        console.error('❌ Gigapub.showRewardedAd не доступен');
        if (onRewardCallback) onRewardCallback(false, null);
        return;
    }
    
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
        console.error('❌ Исключение:', error);
        if (onRewardCallback) onRewardCallback(false, null);
    }
}

// Экспорт
window.initGigapub = initGigapub;
window.showGigapubAd = showGigapubAd;

console.log('✅ gigapub.js загружен');