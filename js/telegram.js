// ============= TELEGRAM INTEGRATION =============
let tg = window.Telegram?.WebApp;

// Инициализация Telegram WebApp
function initTelegram() {
    if (tg) {
        // Расширяем на все окно
        tg.expand();
        
        // Скрываем кнопку "Назад"
        tg.BackButton.hide();
        
        // Адаптация темы
        if (tg.colorScheme === 'dark') {
            document.body.style.background = '#0E1621';
        } else {
            document.body.style.background = '#ffffff';
        }
        
        // Получаем данные пользователя
        const user = tg.initDataUnsafe?.user;
        
        // Получаем реферальный параметр из start_param
        const startParam = tg.initDataUnsafe?.start_param;
        if (startParam) {
            localStorage.setItem('referrerId', startParam);
            console.log('🔗 Приглашён пользователем:', startParam);
        }
        
        if (user) {
            console.log('👤 Telegram User:', user);
            return {
                id: user.id.toString(),
                username: user.username || null,
                firstName: user.first_name,
                lastName: user.last_name,
                avatar: `https://t.me/i/userpic/360/${user.id}.jpg`,
                languageCode: user.language_code,
                isPremium: user.is_premium || false
            };
        }
    }
    
    return null;
}

// Отправка данных в Telegram
function sendToTelegram(event, data) {
    if (tg) {
        tg.sendData(JSON.stringify({
            event: event,
            data: data,
            timestamp: Date.now()
        }));
    }
}

// Показать всплывающее окно
function showAlert(message, callback) {
    if (tg) {
        tg.showAlert(message, callback);
    } else {
        alert(message);
        if (callback) callback();
    }
}

// Показать подтверждение
function showConfirm(message, callback) {
    if (tg) {
        tg.showConfirm(message, callback);
    } else {
        if (confirm(message)) callback(true);
        else callback(false);
    }
}

// Закрыть WebApp
function closeWebApp() {
    if (tg) {
        tg.close();
    }
}

// Вибрация
function hapticFeedback(type = 'light') {
    if (tg?.HapticFeedback) {
        switch(type) {
            case 'light':
                tg.HapticFeedback.impactOccurred('light');
                break;
            case 'medium':
                tg.HapticFeedback.impactOccurred('medium');
                break;
            case 'heavy':
                tg.HapticFeedback.impactOccurred('heavy');
                break;
            case 'success':
                tg.HapticFeedback.notificationOccurred('success');
                break;
            case 'error':
                tg.HapticFeedback.notificationOccurred('error');
                break;
        }
    }
}

// Создание реферальной ссылки
function getInviteLink(botUsername, userId) {
    return `https://t.me/${botUsername}?start=${userId}`;
}

// Экспорт
window.initTelegram = initTelegram;
window.sendToTelegram = sendToTelegram;
window.showAlert = showAlert;
window.showConfirm = showConfirm;
window.closeWebApp = closeWebApp;
window.hapticFeedback = hapticFeedback;
window.getInviteLink = getInviteLink;