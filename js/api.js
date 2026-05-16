// ============= API ДЛЯ РАБОТЫ С БЕКЕНДОМ =============
const API_BASE_URL = 'https://serv-production-2773.up.railway.app';
const API_URL = `${API_BASE_URL}/api`;
const BOT_USERNAME = 'Duckkadsbot';

let currentUserId = null;
let telegramUser = null;

async function initUser() {
    telegramUser = window.initTelegram ? window.initTelegram() : null;
    
    let userId = null;
    let referrerId = null;
    
    if (window.Telegram?.WebApp) {
        const startParam = window.Telegram.WebApp.initDataUnsafe?.start_param;
        if (startParam) {
            referrerId = startParam;
            console.log('🔗 Приглашён пользователем:', referrerId);
        }
    }
    
    if (telegramUser && telegramUser.id) {
        userId = `tg_${telegramUser.id}`;
        console.log('✅ Telegram пользователь:', telegramUser.username, 'ID:', userId);
    } else {
        userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    
    const payload = {
        userId: userId,
        username: telegramUser?.username || telegramUser?.firstName || null,
        firstName: telegramUser?.firstName || null,
        lastName: telegramUser?.lastName || null,
        avatar: telegramUser?.avatar || null,
        languageCode: telegramUser?.languageCode || null,
        isPremium: telegramUser?.isPremium || false,
        referrerId: referrerId
    };
    
    try {
        console.log('🔄 Подключение к серверу:', API_URL);
        
        const response = await fetch(`${API_URL}/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Данные с сервера:', data);
        
        currentUserId = data.user.userId;
        
        window.user = {
            userId: data.user.userId,
            username: data.user.username,
            balance: data.user.balance,
            level: data.user.level,
            ads: data.user.ads,
            avatar: data.user.avatar
        };
        
        window.blocks = [
            { id: 1, v: data.blocks['1']?.v || 0, l: data.blocks['1']?.l || 0 },
            { id: 2, v: data.blocks['2']?.v || 0, l: data.blocks['2']?.l || 0 },
            { id: 3, v: data.blocks['3']?.v || 0, l: data.blocks['3']?.l || 0 }
        ];
        
        window.boosts = data.boosts || {
            doubleIncome: false,
            doubleIncomeUntil: 0,
            autoClicker: false,
            autoClickerUntil: 0
        };
        
        const usernameSpan = document.getElementById("username");
        if (usernameSpan) {
            if (telegramUser?.username) {
                usernameSpan.innerText = '@' + telegramUser.username;
            } else if (telegramUser?.firstName) {
                usernameSpan.innerText = telegramUser.firstName;
            } else {
                usernameSpan.innerText = data.user.username || 'Guest';
            }
        }
        
        const avatarImg = document.getElementById("avatar");
        if (avatarImg) {
            avatarImg.src = data.user.avatar || 'https://i.pravatar.cc/100';
        }
        
        const userIdSpan = document.getElementById("userid");
        if (userIdSpan && telegramUser) {
            userIdSpan.innerText = `ID: ${telegramUser.id}`;
        } else if (userIdSpan) {
            userIdSpan.innerText = `ID: ${data.user.userId?.slice(0, 8) || 'guest'}`;
        }
        
        updateInviteLink();
        
        if (window.fullRender) window.fullRender();
        
        if (window.sendToTelegram) {
            window.sendToTelegram('app_opened', { 
                userId: currentUserId, 
                telegramId: telegramUser?.id
            });
        }
        
        // Принудительно загружаем свежие данные с сервера
        await forceSyncFromServer();
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        if (window.showNotification) {
            window.showNotification('⚠️ Ошибка подключения к серверу', 'error');
        }
        return false;
    }
}

async function forceSyncFromServer() {
    if (!currentUserId) {
        console.log('❌ Нет userId для синхронизации');
        return false;
    }
    
    try {
        console.log(`🔄 Принудительная синхронизация для ${currentUserId}`);
        const response = await fetch(`${API_URL}/user/${currentUserId}`);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        window.user = {
            ...window.user,
            balance: data.user.balance,
            level: data.user.level,
            ads: data.user.ads
        };
        
        window.blocks = [
            { id: 1, v: data.blocks['1']?.v || 0, l: data.blocks['1']?.l || 0 },
            { id: 2, v: data.blocks['2']?.v || 0, l: data.blocks['2']?.l || 0 },
            { id: 3, v: data.blocks['3']?.v || 0, l: data.blocks['3']?.l || 0 }
        ];
        
        window.boosts = data.boosts;
        
        console.log(`✅ Синхронизировано: баланс $${window.user.balance}, уровень ${window.user.level}`);
        
        if (window.fullRender) window.fullRender();
        
        return true;
    } catch (error) {
        console.error(`❌ Ошибка синхронизации:`, error);
        return false;
    }
}

function updateInviteLink() {
    const inviteContainer = document.getElementById('inviteLink');
    if (inviteContainer && currentUserId) {
        const shortId = currentUserId.replace('tg_', '').slice(0, 8);
        const inviteUrl = `https://t.me/${BOT_USERNAME}?start=${shortId}`;
        inviteContainer.innerHTML = `
            <button class="btn" id="inviteBtn" style="background: #2AABEE;">📨 Пригласить друга</button>
            <div style="font-size: 10px; color: #4ade80; margin-top: 8px; word-break: break-all;">${inviteUrl}</div>
            <div style="font-size: 12px; color: #8EA2B1; margin-top: 8px; text-align: center;" id="referralCount"></div>
        `;
        
        const inviteBtn = document.getElementById('inviteBtn');
        if (inviteBtn) {
            inviteBtn.onclick = () => {
                navigator.clipboard.writeText(inviteUrl);
                if (window.showAlert) {
                    window.showAlert('✅ Ссылка скопирована! Поделитесь с другом.');
                } else {
                    alert('Ссылка скопирована!');
                }
                if (window.hapticFeedback) window.hapticFeedback('success');
            };
        }
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        const leaderboardContent = document.getElementById('leaderboardContent');
        if (leaderboardContent && data.length > 0) {
            let html = '';
            data.slice(0, 10).forEach((player, idx) => {
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight:700; color:#2AABEE; width:25px;">${idx + 1}</span>
                            <img src="${player.avatar || 'https://i.pravatar.cc/32'}" style="width:28px; height:28px; border-radius:50%;">
                            <span>${player.username || player.userId}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #4ade80; font-weight:600;">$${player.balance.toFixed(4)}</div>
                            <div style="font-size:10px; color:#8EA2B1;">Lvl ${player.level}</div>
                        </div>
                    </div>
                `;
            });
            leaderboardContent.innerHTML = html;
        } else if (leaderboardContent) {
            leaderboardContent.innerHTML = '<div style="text-align:center; padding:20px;">Пока никого нет. Стань первым!</div>';
        }
        
        return data;
    } catch (error) {
        console.error('❌ Ошибка загрузки лидерборда:', error);
        return [];
    }
}

function showNotification(message, type = 'info') {
    const notice = document.createElement('div');
    notice.style.cssText = `
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#ff4444' : (type === 'success' ? '#4ade80' : '#2AABEE')};
        color: #fff;
        padding: 12px 20px;
        border-radius: 25px;
        font-size: 13px;
        font-weight: 600;
        z-index: 100;
        text-align: center;
        white-space: nowrap;
        animation: slideUp 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notice.innerText = message;
    document.body.appendChild(notice);
    
    setTimeout(() => {
        notice.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => notice.remove(), 300);
    }, 2500);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

window.initUser = initUser;
window.loadLeaderboard = loadLeaderboard;
window.showNotification = showNotification;
window.updateInviteLink = updateInviteLink;
window.forceSyncFromServer = forceSyncFromServer;
window.currentUserId = currentUserId;
window.API_URL = API_URL;
window.BOT_USERNAME = BOT_USERNAME;