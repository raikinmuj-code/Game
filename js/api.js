// ============= API ДЛЯ РАБОТЫ С БЕКЕНДОМ =============
const API_BASE_URL = 'https://serv-production-2773.up.railway.app';
const API_URL = `${API_BASE_URL}/api`;
const BOT_USERNAME = 'Duckkadsbot';

let currentUserId = null;

async function initUser() {
    const tgUser = window.initTelegram ? window.initTelegram() : null;
    
    let userId = null;
    let referrerId = null;
    
    if (window.Telegram?.WebApp) {
        const startParam = window.Telegram.WebApp.initDataUnsafe?.start_param;
        if (startParam) {
            referrerId = startParam;
            console.log('🔗 Referrer:', referrerId);
        }
    }
    
    if (tgUser && tgUser.id) {
        userId = `tg_${tgUser.id}`;
        console.log('✅ Telegram user:', tgUser.username, 'ID:', userId);
    } else {
        userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    
    currentUserId = userId;
    
    try {
        console.log('🔄 Connecting to server...');
        
        const response = await fetch(`${API_URL}/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                username: tgUser?.username || tgUser?.firstName || null,
                firstName: tgUser?.firstName || null,
                lastName: tgUser?.lastName || null,
                avatar: tgUser?.avatar || null,
                referrerId: referrerId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Server response:', data);
        
        // Initialize global data
        window.user = {
            userId: data.userId,
            username: data.username,
            balance: data.balance,
            level: data.level,
            ads: data.ads,
            avatar: data.avatar
        };
        
        window.blocks = [
            { id: 1, v: data.blocks['1'].v, l: data.blocks['1'].l },
            { id: 2, v: data.blocks['2'].v, l: data.blocks['2'].l },
            { id: 3, v: data.blocks['3'].v, l: data.blocks['3'].l }
        ];
        
        window.boosts = data.boosts;
        
        console.log(`💰 Balance: $${window.user.balance}, Level: ${window.user.level}`);
        console.log(`📊 Blocks:`, window.blocks);
        
        // Update UI
        const usernameSpan = document.getElementById("username");
        if (usernameSpan) {
            usernameSpan.innerText = tgUser?.username ? '@' + tgUser.username : (data.username || 'Guest');
        }
        
        const balanceTopSpan = document.getElementById("balanceTop");
        if (balanceTopSpan) {
            balanceTopSpan.innerText = `$${window.user.balance.toFixed(4)}`;
        }
        
        const avatarImg = document.getElementById("avatar");
        if (avatarImg) {
            avatarImg.src = data.avatar || 'https://i.pravatar.cc/100';
        }
        
        const userIdSpan = document.getElementById("userid");
        if (userIdSpan && tgUser) {
            userIdSpan.innerText = `ID: ${tgUser.id}`;
        }
        
        updateInviteLink();
        
        if (window.fullRender) window.fullRender();
        
        return true;
        
    } catch (error) {
        console.error('❌ Connection error:', error);
        if (window.showNotification) {
            window.showNotification('⚠️ Connection error', 'error');
        }
        return false;
    }
}

async function saveToServer() {
    if (!window.user || !window.blocks) {
        console.log('⚠️ No data to save - user or blocks missing');
        return false;
    }
    
    if (!currentUserId) {
        console.log('⚠️ No userId to save');
        return false;
    }
    
    const blocksData = {};
    window.blocks.forEach((b, idx) => {
        blocksData[idx + 1] = { v: b.v, l: b.l };
    });
    
    const saveData = {
        userId: currentUserId,
        balance: window.user.balance,
        level: window.user.level,
        ads: window.user.ads,
        blocks: blocksData,
        boosts: window.boosts
    };
    
    console.log('💾 SAVING DATA:', saveData);
    
    try {
        const response = await fetch(`${API_URL}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saveData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log(`✅ SAVE SUCCESS: balance $${window.user.balance}`);
            return true;
        } else {
            console.log(`❌ SAVE ERROR: ${response.status}`, result);
            return false;
        }
    } catch (err) {
        console.error('❌ SAVE EXCEPTION:', err);
        return false;
    }
}

// Авто-сохранение после каждого действия
let saveTimeout = null;
function debounceSave() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveToServer();
    }, 500);
}

function updateInviteLink() {
    const inviteContainer = document.getElementById('inviteLink');
    if (inviteContainer && currentUserId) {
        const shortId = currentUserId.replace('tg_', '').slice(0, 8);
        const inviteUrl = `https://t.me/${BOT_USERNAME}?start=${shortId}`;
        inviteContainer.innerHTML = `
            <button class="btn" id="inviteBtn" style="background: #2AABEE;">📨 Invite Friend</button>
            <div style="font-size: 10px; color: #4ade80; margin-top: 8px; word-break: break-all;">${inviteUrl}</div>
        `;
        
        const inviteBtn = document.getElementById('inviteBtn');
        if (inviteBtn) {
            inviteBtn.onclick = () => {
                navigator.clipboard.writeText(inviteUrl);
                alert('Link copied!');
            };
        }
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        const data = await response.json();
        
        const leaderboardContent = document.getElementById('leaderboardContent');
        if (leaderboardContent && data.length > 0) {
            let html = '';
            data.slice(0, 10).forEach((player, idx) => {
                html += `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; gap: 10px;">
                            <span style="color:#2AABEE;">${idx + 1}</span>
                            <span>${player.username || player.userId}</span>
                        </div>
                        <div style="color: #4ade80;">$${player.balance.toFixed(4)}</div>
                    </div>
                `;
            });
            leaderboardContent.innerHTML = html;
        }
    } catch (error) {
        console.error('Leaderboard error:', error);
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
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 1000;
        white-space: nowrap;
    `;
    notice.textContent = message;
    document.body.appendChild(notice);
    setTimeout(() => notice.remove(), 2000);
}

window.initUser = initUser;
window.saveToServer = saveToServer;
window.debounceSave = debounceSave;
window.loadLeaderboard = loadLeaderboard;
window.showNotification = showNotification;
window.updateInviteLink = updateInviteLink;
window.currentUserId = currentUserId;