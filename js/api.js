// ============= API ДЛЯ РАБОТЫ С БЕКЕНДОМ =============
const API_URL = 'http://localhost:3000/api'; // для локальной разработки
// const API_URL = 'https://твой-сервер.ru/api'; // для продакшена

let currentUserId = null;

async function initUser() {
    // Пытаемся получить ID из localStorage
    let userId = localStorage.getItem('userId');
    
    try {
        const response = await fetch(`${API_URL}/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        // Сохраняем ID
        currentUserId = data.user.id;
        localStorage.setItem('userId', currentUserId);
        
        // Загружаем данные в глобальные переменные
        user = {
            balance: data.user.balance,
            level: data.user.level,
            ads: data.user.ads
        };
        
        // Загружаем блоки
        for (let i = 1; i <= 3; i++) {
            if (data.blocks[i]) {
                blocks[i-1].v = data.blocks[i].v;
                blocks[i-1].l = data.blocks[i].l;
            } else {
                blocks[i-1].v = 0;
                blocks[i-1].l = 0;
            }
        }
        
        // Обновляем UI
        if (window.fullRender) window.fullRender();
        
        // Обновляем имя и аватар
        const usernameSpan = document.getElementById("username");
        if (usernameSpan) usernameSpan.innerText = data.user.username;
        
        const avatarImg = document.getElementById("avatar");
        if (avatarImg) avatarImg.src = data.user.avatar;
        
        const userIdSpan = document.getElementById("userid");
        if (userIdSpan) userIdSpan.innerText = `ID: ${data.user.id.slice(0, 8)}`;
        
        return true;
    } catch (error) {
        console.error('Ошибка подключения к серверу:', error);
        // Если сервер не доступен, работаем в офлайн-режиме
        return false;
    }
}

async function saveProgress() {
    if (!currentUserId) return;
    
    // Подготовка данных блоков
    const blocksData = {};
    blocks.forEach((b, idx) => {
        blocksData[idx + 1] = { v: b.v, l: b.l };
    });
    
    try {
        await fetch(`${API_URL}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                user: { balance: user.balance, level: user.level, ads: user.ads },
                blocks: blocksData
            })
        });
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка загрузки лидерборда:', error);
        return [];
    }
}