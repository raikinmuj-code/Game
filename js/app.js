// ============= ОСНОВНАЯ ЛОГИКА ПРОСМОТРА =============
function watchAd(blockId) {
    debugLog(`👁️ watchAd вызван, блок: ${blockId}, баланс ДО: ${user.balance}`, 'info');
    
    if (window.hapticFeedback) window.hapticFeedback('light');
    
    const block = blocks.find(b => b.id === blockId);
    if (!block) {
        debugLog(`❌ Блок не найден: ${blockId}`, 'error');
        return;
    }
    
    if (Date.now() < block.l) {
        debugLog(`🔒 Блок ${blockId} заблокирован до: ${new Date(block.l)}`, 'warning');
        if (window.showNotification) {
            window.showNotification('🔒 Блок заблокирован на 24 часа', 'error');
        }
        return;
    }
    
    const adReward = getRewardForCurrentLevel();
    debugLog(`💰 Награда за просмотр: ${adReward}`, 'info');
    
    const giveReward = () => {
        debugLog(`✅ Начисляем награду! +${adReward}`, 'success');
        
        user.balance += adReward;
        user.ads += 1;
        block.v += 1;
        
        debugLog(`💰 Новый баланс: ${user.balance}`, 'success');
        debugLog(`📊 Просмотров блока ${blockId}: ${block.v}/15`, 'info');
        
        if (window.fullRender) window.fullRender();
        debounceSave();
        
        if (window.showNotification) {
            window.showNotification(`✅ +$${adReward.toFixed(4)} за просмотр!`, 'success');
        }
        
        if (window.sendToTelegram) {
            window.sendToTelegram('ad_watched', { 
                blockId: blockId, 
                reward: adReward, 
                level: user.level 
            });
        }
        
        let leveled = false;
        while (user.ads >= 100) {
            user.level += 1;
            user.ads = 0;
            leveled = true;
            debugLog(`🎉 ПОВЫШЕНИЕ УРОВНЯ! Новый уровень: ${user.level}`, 'success');
        }
        
        if (block.v >= 15) {
            block.l = Date.now() + 86400000;
            debugLog(`🔒 Блок ${blockId} ЗАБЛОКИРОВАН на 24 часа`, 'info');
            if (window.showNotification) {
                window.showNotification(`🔒 ${getBlockName(blockId)} заблокирован на 24 часа!`, 'info');
            }
        }
        
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
    
    if (window.showGigapubAd) {
        if (window.showNotification) {
            window.showNotification('📺 Загрузка рекламы...', 'info');
        }
        
        window.showGigapubAd(blockId, (success) => {
            debugLog(`🎬 Callback от showGigapubAd, success: ${success}`, 'info');
            
            if (success) {
                giveReward();
            } else {
                debugLog('❌ Реклама не просмотрена', 'error');
                if (window.showNotification) {
                    window.showNotification('❌ Реклама не загрузилась, попробуйте позже', 'error');
                }
            }
        });
    } else {
        debugLog('❌ window.showGigapubAd не определён!', 'error');
        if (window.showNotification) {
            window.showNotification('❌ Реклама временно недоступна', 'error');
        }
    }
}