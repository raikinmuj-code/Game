// ============= GIGAPUB ИНТЕГРАЦИЯ (с правильным callback) =============

let gigapubReady = false;

// Функция проверки готовности GigaPub
function checkGigaPubReady() {
    if (typeof window.showGiga !== 'undefined') {
        console.log('✅ GigaPub готов!');
        gigapubReady = true;
        return true;
    }
    return false;
}

// Показ рекламы
async function showGigapubAd(blockId, onRewardCallback) {
    console.log('📺 Показ рекламы GigaPub для блока', blockId);
    
    // Ждём готовность (максимум 3 секунды)
    let attempts = 0;
    while (!gigapubReady && attempts < 30) {
        await new Promise(r => setTimeout(r, 100));
        checkGigaPubReady();
        attempts++;
    }
    
    if (!gigapubReady || typeof window.showGiga === 'undefined') {
        console.error('❌ GigaPub не готов');
        if (onRewardCallback) onRewardCallback(false);
        return;
    }
    
    try {
        console.log('🎬 Вызываем window.showGiga()...');
        
        // showGiga возвращает Promise
        // Когда реклама просмотрена до конца — Promise резолвится
        await window.showGiga();
        
        console.log('✅ Реклама просмотрена, награда выдана!');
        if (onRewardCallback) onRewardCallback(true);
        
    } catch (error) {
        console.error('❌ Ошибка показа рекламы:', error);
        if (onRewardCallback) onRewardCallback(false);
    }
}

// Экспорт
window.showGigapubAd = showGigapubAd;
window.checkGigaPubReady = checkGigaPubReady;

console.log('✅ gigapub.js загружен');