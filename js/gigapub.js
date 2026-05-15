// ============= КАСКАДНАЯ РЕКЛАМА: GigaPub → Фолбэк =============

// 1. GIGAPUB (основной, с авто-переключением серверов)
(function() {
    const projectId = '6724'; // Твой ID
    const servers = [
        'https://ad.gigapub.tech',
        'https://ru-ad.gigapub.tech'
    ];
    let currentServer = 0;
    let timeoutId;
    
    function loadGigapub() {
        const script = document.createElement('script');
        script.async = true;
        script.src = servers[currentServer] + '/script?id=' + projectId;
        
        timeoutId = setTimeout(() => {
            script.onload = script.onerror = null;
            script.remove();
            currentServer++;
            if (currentServer < servers.length) {
                loadGigapub();
            } else {
                console.warn('⚠️ GigaPub: все серверы недоступны');
                window.gigapubAvailable = false;
            }
        }, 15000);
        
        script.onload = () => {
            clearTimeout(timeoutId);
            console.log('✅ GigaPub загружен с сервера:', servers[currentServer]);
            window.gigapubAvailable = true;
        };
        
        script.onerror = () => {
            clearTimeout(timeoutId);
            script.remove();
            currentServer++;
            if (currentServer < servers.length) {
                loadGigapub();
            } else {
                console.warn('⚠️ GigaPub: все серверы недоступны');
                window.gigapubAvailable = false;
            }
        };
        
        document.head.appendChild(script);
    }
    
    loadGigapub();
})();

// Глобальный флаг доступности
window.gigapubAvailable = false;

// Функция показа рекламы GigaPub
async function showGigaPubAd() {
    return new Promise((resolve) => {
        if (!window.gigapubAvailable || typeof window.showGiga === 'undefined') {
            console.warn('⚠️ GigaPub не готов');
            resolve(false);
            return;
        }
        
        console.log('📢 Пробуем GigaPub...');
        
        try {
            window.showGiga()
                .then(() => {
                    console.log('✅ GigaPub: реклама показана, награда выдана');
                    resolve(true);
                })
                .catch((error) => {
                    console.warn('❌ GigaPub ошибка:', error);
                    resolve(false);
                });
        } catch (error) {
            console.warn('❌ GigaPub исключение:', error);
            resolve(false);
        }
    });
}

// Основная каскадная функция (сначала GigaPub, потом симуляция)
async function showAdWithCascade() {
    console.log('🎬 Запуск показа рекламы (GigaPub → симуляция)');
    
    // Пытаемся показать GigaPub
    const gigapubShown = await showGigaPubAd();
    if (gigapubShown) {
        return true;
    }
    
    // Если GigaPub не сработал — используем простую симуляцию
    console.log('🎮 GigaPub недоступен, используем встроенную симуляцию');
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log('✅ Симуляция: реклама "просмотрена"');
            resolve(true);
        }, 1500);
    });
}

// Универсальная функция для вызова из приложения
async function showRewardedAd(blockId, onRewardCallback) {
    console.log('📺 Показ рекламы для блока', blockId);
    
    const success = await showAdWithCascade();
    
    if (success) {
        console.log('✅ Реклама успешно показана, начисляем награду');
        if (onRewardCallback) onRewardCallback(true);
    } else {
        console.log('❌ Реклама не показана');
        if (onRewardCallback) onRewardCallback(false);
    }
}

// Экспорт
window.showGigapubAd = showRewardedAd;
window.showAdWithCascade = showAdWithCascade;
window.showGigaPubAd = showGigaPubAd;

console.log('✅ gigapub.js загружен (каскадная система)');