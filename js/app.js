// ============= ОСНОВНАЯ ЛОГИКА ПРОСМОТРА =============
function watchAd(blockId) {
    console.log('👁️ watchAd вызван, блок:', blockId);
    console.log('Текущий баланс ДО:', user.balance);
    
    if (window.hapticFeedback) window.hapticFeedback('light');
    
    const block = blocks.find(b => b.id === blockId);
    if (!block) {
        console.error('❌ Блок не найден:', blockId);
        return;
    }
    
    if (Date.now() < block.l) {
        console.log('🔒 Блок заблокирован до:', new Date(block.l));
        if (window.showNotification) {
            window.showNotification('🔒 Блок заблокирован на 24 часа', 'error');
        }
        return;
    }
    
    const adReward = getRewardForCurrentLevel();
    console.log('💰 Награда за просмотр:', adReward);
    
    // Функция начисления награды
    const giveReward = () => {
        console.log('✅ Начисляем награду!');
        
        user.balance += adReward;
        user.ads += 1;
        block.v += 1;
        
        console.log('💰 Начислено:', adReward);
        console.log('💰 Новый баланс:', user.balance);
        console.log('📊 Просмотров блока:', block.v, '/15');
        
        // Обновляем UI сразу
        if (window.fullRender) window.fullRender();
        
        // Сохраняем на сервер
        debounceSave();
        
        // Уведомление
        if (window.showNotification) {
            window.showNotification(`✅ +$${adReward.toFixed(4)} за просмотр!`, 'success');
        }
        
        // Отправка в Telegram
        if (window.sendToTelegram) {
            window.sendToTelegram('ad_watched', { 
                blockId: blockId, 
                reward: adReward, 
                level: user.level 
            });
        }
        
        // Проверка повышения уровня
        let leveled = false;
        while (user.ads >= 100) {
            user.level += 1;
            user.ads = 0;
            leveled = true;
            console.log('🎉 ПОВЫШЕНИЕ УРОВНЯ! Новый уровень:', user.level);
        }
        
        // Блокировка на 24 часа при 15 просмотрах
        if (block.v >= 15) {
            block.l = Date.now() + 86400000;
            console.log('🔒 Блок ЗАБЛОКИРОВАН на 24 часа');
            if (window.showNotification) {
                window.showNotification(`🔒 ${getBlockName(blockId)} заблокирован на 24 часа!`, 'info');
            }
        }
        
        // Ещё раз обновляем UI (на случай изменения уровня)
        if (window.fullRender) window.fullRender();
        debounceSave();
        
        if (leveled && window.hapticFeedback) {
            window.hapticFeedback('success');
            if (window.showAlert) {
                setTimeout(() => {
                    window.showAlert(`🎉 Поздравляем! Вы достигли ${user.level} уровня!\nНаграда за просмотр: +$${getRewardForCurrentLevel().toFixed(4)}`);
                }, 100);
            }
        }
    };
    
    // Показываем рекламу через GigaPub
    if (window.showGigapubAd) {
        if (window.showNotification) {
            window.showNotification('📺 Загрузка рекламы...', 'info');
        }
        
        window.showGigapubAd(blockId, (success) => {
            console.log('🎬 Callback от showGigapubAd, success:', success);
            
            if (success) {
                giveReward();
            } else {
                console.log('❌ Реклама не просмотрена');
                if (window.showNotification) {
                    window.showNotification('❌ Реклама не загрузилась, попробуйте позже', 'error');
                }
            }
        });
    } else {
        console.error('❌ window.showGigapubAd не определён!');
        if (window.showNotification) {
            window.showNotification('❌ Реклама временно недоступна', 'error');
        }
    }
}