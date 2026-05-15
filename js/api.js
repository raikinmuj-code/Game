// ============= API ДЛЯ РАБОТЫ С БЕКЕНДОМ =============
// ТВОЙ РЕАЛЬНЫЙ URL ИЗ RAILWAY (без /api в конце, добавим при запросах)
const API_BASE_URL = 'https://serv-production-804f.up.railway.app';
const API_URL = `${API_BASE_URL}/api`;

let currentUserId = null;

async function initUser() {
    let userId = localStorage.getItem('userId');
    
    try {
        console.log('Подключение к серверу:', API_URL);
        
        const response = await fetch(`${API_URL}/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Данные с сервера:', data);
        
        currentUserId = data.user.id;
        localStorage.setItem('userId', currentUserId);
        
        user = {
            balance: data.user.balance,
            level: data.user.level,
            ads: data.user.ads
        };
        
        // Загружаем блоки
        for (let i = 1; i <= 3; i++) {
            if (data.blocks && data.blocks[i]) {
                blocks[i-1].v = data.blocks[i].v;
                blocks[i-1].l = data.blocks[i].l;
            } else {
                blocks[i-1].v = 0;
                blocks[i-1].l = 0;
            }
        }
        
        if (window.fullRender) window.fullRender();
        
        const usernameSpan = document.getElementById("username");
        if (usernameSpan) usernameSpan.innerText = data.user.username;
        
        const avatarImg = document.getElementById("avatar");
        if (avatarImg) avatarImg.src = data.user.avatar;
        
        const userIdSpan = document.getElementById("userid");
        if (userIdSpan) userIdSpan.innerText = `ID: ${data.user.id.slice(0, 8)}`;
        
        return true;
    } catch (error) {
        console.error('Ошибка подключения к серверу:', error);
        document.body.innerHTML += `
            <div style="position:fixed; bottom:90px; left:50%; transform:translateX(-50%); 
                        background:#ff4444; color:#fff; padding:8px 16px; border-radius:20px; 
                        font-size:12px; z-index:100; text-align:center;">
                ⚠️ Сервер не доступен: ${error.message}
            </div>
        `;
        return false;
    }
}

async function saveProgress() {
    if (!currentUserId) {
        console.log('Нет userId, сохранение отложено');
        return;
    }
    
    const blocksData = {};
    blocks.forEach((b, idx) => {
        blocksData[idx + 1] = { v: b.v, l: b.l };
    });
    
    try {
        const response = await fetch(`${API_URL}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                user: { balance: user.balance, level: user.level, ads: user.ads },
                blocks: blocksData
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        console.log('Прогресс сохранён');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка загрузки лидерборда:', error);
        return [];
    }
}