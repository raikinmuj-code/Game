// ============= API ДЛЯ РАБОТЫ С БЕКЕНДОМ =============
const API_BASE_URL = 'https://serv-production-2773.up.railway.app';
const API_URL = `${API_BASE_URL}/api`;
const BOT_USERNAME = 'Duckkadsbot';

let currentUserId = null;
let telegramUser = null;

async function initUser() {
    telegramUser = window.initTelegram ? window.initTelegram() : null;
    
    let userId = localStorage.getItem('userId');
    let referrerId = localStorage.getItem('referrerId');
    
    if (telegramUser && telegramUser.id) {
        userId = `tg_${telegramUser.id}`;
        console.log('✅ Telegram пользователь:', telegramUser.username, 'ID:', userId);
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
        console.log('📦 Блоки с сервера:', data.blocks);
        
        currentUserId = data.user.id;
        localStorage.setItem('userId', currentUserId);
        
        if (referrerId) {
            localStorage.removeItem('referrerId');
        }
        
        // ОБНОВЛЯЕМ ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
        window.user = {
            balance: data.user.balance,
            level: data.user.level,
            ads: data.user.ads
        };
        
        // ОБНОВЛЯЕМ БЛОКИ из данных сервера
        if (window.blocks && data.blocks) {
            for (let i = 1; i <= 3; i++) {
                if (data.blocks[i]) {
                    window.blocks[i-1].v = data.blocks[i].v;
                    window.blocks[i-1].l = data.blocks[i].l;
                }
            }
        }
        
        // СИНХРОНИЗИРУЕМ локальные переменные
        if (window.user) {
            user.balance = window.user.balance;
            user.level = window.user.level;
            user.ads = window.user.ads;
        }
        
        if (window.blocks) {
            for (let i = 0; i < blocks.length; i++) {
                blocks[i].v = window.blocks[i].v;
                blocks[i].l = window.blocks[i].l;
            }
        }
        
        console.log('🔄 После синхронизации:', {
            user: user,
            blocks: blocks
        });
        
        if (window.fullRender) window.fullRender();
        
        // Обновляем отображение
        const usernameSpan = document.getElementById("username");
        if (usernameSpan) {
            if (telegramUser?.username) {
                usernameSpan.innerText = '@' + telegramUser.username;
            } else if (telegramUser?.firstName) {
                usernameSpan.innerText = telegramUser.firstName;
            } else {
                usernameSpan.innerText = data.user.username;
            }
        }
        
        const avatarImg = document.getElementById("avatar");
        if (avatarImg) {
            if (telegramUser?.avatar) {
                avatarImg.src = telegramUser.avatar;
            } else {
                avatarImg.src = data.user.avatar;
            }
        }
        
        const userIdSpan = document.getElementById("userid");
        if (userIdSpan && telegramUser) {
            userIdSpan.innerText = `ID: ${telegramUser.id}`;
        } else if (userIdSpan) {
            userIdSpan.innerText = `ID: ${data.user.id.slice(0, 8)}`;
        }
        
        updateInviteLink();
        
        if (window.sendToTelegram) {
            window.sendToTelegram('app_opened', { 
                userId: currentUserId, 
                telegramId: telegramUser?.id,
                level: window.user.level 
            });
        }
        
        return true;
    } catch (error) {
        console.error('❌ Ошибка подключения:', error);
        if (window.showNotification) {
            window.showNotification('⚠️ Ошибка подключения к серверу', 'error');
        }
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

async function saveProgress() {
    if (!currentUserId) {
        console.log('❌ saveProgress: нет currentUserId');
        return;
    }
    if (!window.user || !window.blocks) {
        console.log('❌ saveProgress: нет user или blocks');
        return;
    }
    
    const blocksData = {};
    window.blocks.forEach((b, idx) => {
        blocksData[idx + 1] = { v: b.v, l: b.l };
    });
    
    console.log('💾 Сохраняем:', {
        userId: currentUserId,
        balance: window.user.balance,
        level: window.user.level,
        ads: window.user.ads,
        blocks: blocksData
    });
    
    try {
        const response = await fetch(`${API_URL}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                user: { 
                    balance: window.user.balance, 
                    level: window.user.level, 
                    ads: window.user.ads 
                },
                blocks: blocksData
            })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        console.log('💾 Прогресс сохранён на сервере:', result);
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
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
                            <span>${player.username}</span>
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
        background: ${type === 'error' ? '#ff4444' : '#2AABEE'};
        color: #fff;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 12px;
        z-index: 100;
        text-align: center;
        white-space: nowrap;
        animation: fadeOut 3s forwards;
    `;
    notice.innerText = message;
    document.body.appendChild(notice);
    
    setTimeout(() => notice.remove(), 3000);
}

window.initUser = initUser;
window.saveProgress = saveProgress;
window.loadLeaderboard = loadLeaderboard;
window.showNotification = showNotification;
window.updateInviteLink = updateInviteLink;
window.API_URL = API_URL;
window.BOT_USERNAME = BOT_USERNAME;