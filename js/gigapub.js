// ============= GIGAPUB ИНТЕГРАЦИЯ (КАСКАДНАЯ) =============

let gigapubReady = false;

// Проверка готовности GigaPub
function checkGigaPubReady() {
    if (typeof window.showGiga !== 'undefined') {
        console.log('✅ GigaPub готов к работе!');
        gigapubReady = true;
        return true;
    }
    console.log('⏳ Ожидаем загрузку GigaPub...');
    return false;
}

// Показ рекламы через GigaPub
async function showGigapubAd(blockId, onRewardCallback) {
    console.log('📺 Показ рекламы GigaPub для блока', blockId);
    
    // Проверяем готовность
    if (!gigapubReady && !checkGigaPubReady()) {
        // Ждём загрузку до 5 секунд
        for (let i = 0; i < 25; i++) {
            await new Promise(r => setTimeout(r, 200));
            if (checkGigaPubReady()) break;
        }
    }
    
    if (!gigapubReady || typeof window.showGiga === 'undefined') {
        console.error('❌ GigaPub не загружен');
        if (onRewardCallback) onRewardCallback(false);
        return;
    }
    
    try {
        console.log('🎬 Вызываем window.showGiga()...');
        
        // Показываем рекламу
        await window.showGiga();
        
        console.log('✅ Реклама просмотрена, награда выдана!');
        if (onRewardCallback) onRewardCallback(true);
        
    } catch (error) {
        console.error('❌ Ошибка показа рекламы:', error);
        if (onRewardCallback) onRewardCallback(false);
    }
}

// Функция для принудительной инициализации (если нужно)
function initGigapub() {
    console.log('🔄 Принудительная проверка GigaPub...');
    checkGigaPubReady();
}

// Экспорт
window.showGigapubAd = showGigapubAd;
window.initGigapub = initGigapub;
window.checkGigaPubReady = checkGigaPubReady;

console.log('✅ gigapub.js загружен');