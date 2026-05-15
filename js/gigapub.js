// ============= GIGAPUB ИНТЕГРАЦИЯ =============

let gigapubReady = false;

function checkGigaPubReady() {
    if (typeof window.showGiga !== 'undefined') {
        console.log('✅ GigaPub готов!');
        gigapubReady = true;
        return true;
    }
    return false;
}

async function showGigapubAd(blockId, onRewardCallback) {
    console.log('📺 Показ рекламы для блока', blockId);
    
    // Ждём готовность
    let attempts = 0;
    while (!gigapubReady && attempts < 30) {
        await new Promise(r => setTimeout(r, 100));
        checkGigaPubReady();
        attempts++;
    }
    
    // Пытаемся показать реальную рекламу
    if (gigapubReady && typeof window.showGiga !== 'undefined') {
        try {
            console.log('🎬 Реальный вызов showGiga()...');
            
            // Пробуем разные форматы вызова
            if (typeof window.showGiga === 'function') {
                // Вариант 1: async/await
                const result = await window.showGiga();
                console.log('✅ Реальная реклама просмотрена! result:', result);
                if (onRewardCallback) onRewardCallback(true);
                return;
            }
        } catch (error) {
            console.error('❌ Ошибка реального показа:', error);
        }
        
        // Вариант 2: с колбэками
        if (typeof window.showGiga === 'function') {
            try {
                window.showGiga({
                    onReward: () => {
                        console.log('🎁 Награда от GigaPub (колбэк)!');
                        if (onRewardCallback) onRewardCallback(true);
                    },
                    onClose: () => {
                        console.log('🚪 Реклама закрыта без награды');
                        if (onRewardCallback) onRewardCallback(false);
                    },
                    onError: (err) => {
                        console.error('❌ Ошибка GigaPub:', err);
                        if (onRewardCallback) onRewardCallback(false);
                    }
                });
                return;
            } catch (err) {
                console.error('❌ Ошибка вызова с колбэком:', err);
            }
        }
    }
    
    // Если ничего не сработало — тестовый режим
    console.log('🎮 ТЕСТОВЫЙ РЕЖИМ: начисляем через 1 секунду');
    setTimeout(() => {
        console.log('✅ ТЕСТОВЫЙ РЕЖИМ: начисляем награду!');
        if (onRewardCallback) onRewardCallback(true);
    }, 1000);
}

window.showGigapubAd = showGigapubAd;
window.checkGigaPubReady = checkGigaPubReady;

console.log('✅ gigapub.js загружен');