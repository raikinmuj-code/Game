// ============= DUCK ADS - ПОЛНЫЙ КЛИЕНТСКИЙ СКРИПТ =============

(function() {
    // ============= TELEGRAM INTEGRATION =============
    let tg = window.Telegram?.WebApp;
    
    function initTelegram() {
        if (tg) {
            tg.expand();
            tg.BackButton.hide();
            
            const user = tg.initDataUnsafe?.user;
            const startParam = tg.initDataUnsafe?.start_param;
            
            if (startParam) {
                localStorage.setItem('referrerId', startParam);
                console.log('🔗 Referrer:', startParam);
            }
            
            if (user) {
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
    
    function showAlert(message, callback) {
        if (tg) tg.showAlert(message, callback);
        else { alert(message); if (callback) callback(); }
    }
    
    function showConfirm(message, callback) {
        if (tg) tg.showConfirm(message, callback);
        else callback(confirm(message));
    }
    
    function hapticFeedback(type = 'light') {
        if (tg?.HapticFeedback) {
            const impactMap = { light: 'light', medium: 'medium', heavy: 'heavy' };
            const notificationMap = { success: 'success', error: 'error' };
            if (impactMap[type]) tg.HapticFeedback.impactOccurred(impactMap[type]);
            if (notificationMap[type]) tg.HapticFeedback.notificationOccurred(notificationMap[type]);
        }
    }
    
    // ============= API =============
    const API_BASE_URL = 'https://serv-production-2773.up.railway.app';
    const API_URL = `${API_BASE_URL}/api`;
    const BOT_USERNAME = 'Duckkadsbot';
    
    let currentUserId = null;
    let user = null;
    let blocks = null;
    let boosts = null;
    let auto = false;
    let autoLoopActive = false;
    let isAdShowing = false;
    let saveTimeout = null;
    let boostCheckInterval = null;
    let autoClickerInterval = null;
    let timerIntervals = [];
    
    // ============= ЯЗЫКИ =============
    const dict = {
        ru: {
            balance: "БАЛАНС", home: "Главная", friends: "Друзья", boosts: "Бусты",
            tasks: "Задания", wallet: "Кошелек", auto_on: "AUTO ON", auto_off: "AUTO OFF",
            watch: "Смотреть рекламу", locked: "Заблокировано", active: "Активно",
            adblock: "Рекламный блок", level: "Уровень", views: "просмотров"
        },
        en: {
            balance: "BALANCE", home: "Home", friends: "Friends", boosts: "Boosts",
            tasks: "Tasks", wallet: "Wallet", auto_on: "AUTO ON", auto_off: "AUTO OFF",
            watch: "Watch Ad", locked: "Locked", active: "Active",
            adblock: "Ad Block", level: "Level", views: "views"
        }
    };
    let lang = "ru";
    
    function t(key) { return dict[lang][key] || key; }
    
    // ============= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =============
    function getRewardForCurrentLevel() {
        if (!user) return 0.0009;
        let reward = 0.0009 * user.level;
        if (boosts?.doubleIncome && boosts.doubleIncomeUntil > Date.now()) reward *= 2;
        return reward;
    }
    
    function getRewardForNextLevel() {
        if (!user) return 0.0018;
        return 0.0009 * (user.level + 1);
    }
    
    function formatLockTime(lockUntil) {
        const now = Date.now();
        if (now >= lockUntil) return null;
        const diffMs = lockUntil - now;
        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    function formatBoostTime(until) {
        if (!until || until <= Date.now()) return null;
        const diffMs = until - Date.now();
        const hours = Math.floor(diffMs / 3600000);
        const minutes = Math.floor((diffMs % 3600000) / 60000);
        const seconds = Math.floor((diffMs % 60000) / 1000);
        if (hours > 0) return `${hours}ч ${minutes}м`;
        if (minutes > 0) return `${minutes}м ${seconds}с`;
        return `${seconds}с`;
    }
    
    function getBlockName(blockId) {
        const names = { 1: 'Gigapub', 2: 'CryptoAds', 3: 'TokenBoost' };
        return names[blockId] || `Блок ${blockId}`;
    }
    
    // ============= СОХРАНЕНИЕ =============
    async function saveToServer() {
        if (!user || !blocks || !currentUserId) return false;
        
        const blocksData = {};
        for (let i = 0; i < blocks.length; i++) {
            blocksData[i + 1] = { v: blocks[i].v, l: blocks[i].l };
        }
        
        try {
            const response = await fetch(`${API_URL}/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUserId,
                    balance: user.balance,
                    level: user.level,
                    ads: user.ads,
                    blocks: blocksData,
                    boosts: boosts
                })
            });
            
            if (response.ok) {
                console.log(`💾 Saved: $${user.balance}`);
                return true;
            }
        } catch (err) { 
            console.error('Save error:', err); 
        }
        return false;
    }
    
    function debounceSave() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => saveToServer(), 500);
    }
    
    // ============= GIGAPUB РЕКЛАМА =============
    let gigapubReady = false;
    
    function checkGigaPubReady() {
        if (typeof window.showGiga !== 'undefined') {
            console.log('✅ GigaPub ready');
            gigapubReady = true;
            return true;
        }
        return false;
    }
    
    async function showGigapubAd(blockId, onRewardCallback) {
        let attempts = 0;
        while (!gigapubReady && attempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            checkGigaPubReady();
            attempts++;
        }
        
        if (gigapubReady && typeof window.showGiga === 'function') {
            try {
                await window.showGiga();
                if (onRewardCallback) onRewardCallback(true);
                return;
            } catch (error) {
                console.error('Ad error:', error);
            }
        }
        
        setTimeout(() => {
            if (onRewardCallback) onRewardCallback(true);
        }, 1000);
    }
    
    // ============= ПРОСМОТР РЕКЛАМЫ =============
    async function watchAd(blockId) {
        if (!user || !blocks) return;
        
        hapticFeedback('light');
        
        const block = blocks.find(b => b.id === blockId);
        if (!block) return;
        
        if (Date.now() < block.l) {
            showNotification('🔒 Блок заблокирован на 24 часа', 'error');
            return;
        }
        
        const adReward = getRewardForCurrentLevel();
        
        // Начисляем награду
        user.balance += adReward;
        user.ads += 1;
        block.v += 1;
        
        console.log(`🎬 Watch ad block ${blockId}: +$${adReward.toFixed(4)}, balance: $${user.balance}`);
        
        let leveled = false;
        while (user.ads >= 100) {
            user.level += 1;
            user.ads = 0;
            leveled = true;
            console.log(`⬆️ LEVEL UP! Now level ${user.level}`);
        }
        
        if (block.v >= 15) {
            block.l = Date.now() + 86400000;
            showNotification(`🔒 ${getBlockName(blockId)} заблокирован на 24 часа`, 'info');
        }
        
        fullRender();
        
        // Сохраняем
        const saved = await saveToServer();
        if (saved) {
            showNotification(`✅ +$${adReward.toFixed(4)}`, 'success');
        } else {
            showNotification(`⚠️ +$${adReward.toFixed(4)} но сохранение не удалось`, 'warning');
        }
        
        if (leveled) hapticFeedback('success');
    }
    
    // ============= АВТО-РЕЖИМ =============
    async function autoWatchLoop() {
        if (!auto) { autoLoopActive = false; return; }
        if (autoLoopActive) return;
        autoLoopActive = true;
        
        while (auto) {
            if (isAdShowing) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            
            let anyAction = false;
            
            for (let b of blocks) {
                if (!auto) break;
                if (Date.now() >= b.l && b.v < 15) {
                    isAdShowing = true;
                    
                    await new Promise((resolve) => {
                        showGigapubAd(b.id, async (success) => {
                            if (success) {
                                const reward = getRewardForCurrentLevel();
                                user.balance += reward;
                                user.ads += 1;
                                b.v += 1;
                                
                                while (user.ads >= 100) {
                                    user.level += 1;
                                    user.ads = 0;
                                }
                                
                                if (b.v >= 15) b.l = Date.now() + 86400000;
                                
                                fullRender();
                                await saveToServer();
                            }
                            isAdShowing = false;
                            resolve();
                        });
                    });
                    
                    anyAction = true;
                    break;
                }
            }
            
            if (!anyAction) await new Promise(r => setTimeout(r, 5000));
            else await new Promise(r => setTimeout(r, 2000));
        }
        
        autoLoopActive = false;
    }
    
    function toggleAutoMode() {
        auto = !auto;
        if (auto && !autoLoopActive) autoWatchLoop();
        fullRender();
    }
    
    // ============= БУСТЫ =============
    function checkBoosts() {
        if (!boosts) return;
        let updated = false;
        
        if (boosts.doubleIncome && boosts.doubleIncomeUntil <= Date.now()) {
            boosts.doubleIncome = false;
            boosts.doubleIncomeUntil = 0;
            updated = true;
            showNotification('⏰ Удвоение дохода закончилось', 'info');
        }
        
        if (boosts.autoClicker && boosts.autoClickerUntil <= Date.now()) {
            boosts.autoClicker = false;
            boosts.autoClickerUntil = 0;
            updated = true;
        }
        
        if (updated) { fullRender(); saveToServer(); }
    }
    
    function startBoostChecker() {
        if (boostCheckInterval) clearInterval(boostCheckInterval);
        boostCheckInterval = setInterval(checkBoosts, 1000);
    }
    
    async function buyBoost(boostType, cost, durationHours) {
        if (!user) return false;
        
        if (user.balance < cost) {
            showAlert(`❌ Недостаточно средств! Нужно $${cost.toFixed(4)}`);
            hapticFeedback('error');
            return false;
        }
        
        user.balance -= cost;
        
        switch(boostType) {
            case 'double':
                boosts.doubleIncome = true;
                boosts.doubleIncomeUntil = Date.now() + (durationHours * 3600000);
                showNotification(`💰 Удвоение дохода активировано на ${durationHours} часа`, 'success');
                break;
            case 'auto':
                boosts.autoClicker = true;
                boosts.autoClickerUntil = Date.now() + (durationHours * 3600000);
                showNotification(`⚡ Авто-кликер активирован на ${durationHours} часа`, 'success');
                break;
        }
        
        hapticFeedback('success');
        fullRender();
        await saveToServer();
        return true;
    }
    
    function collectAutoClickerIncome() {
        if (!boosts?.autoClicker || boosts.autoClickerUntil <= Date.now()) return false;
        if (!user || !blocks) return false;
        
        for (let b of blocks) {
            if (Date.now() >= b.l && b.v < 15) {
                const reward = getRewardForCurrentLevel();
                user.balance += reward;
                b.v += 1;
                if (b.v >= 15) b.l = Date.now() + 86400000;
                break;
            }
        }
        
        while (user.ads >= 100) {
            user.level += 1;
            user.ads = 0;
        }
        
        fullRender();
        saveToServer();
        return true;
    }
    
    function startAutoClickerLoop() {
        if (autoClickerInterval) clearInterval(autoClickerInterval);
        autoClickerInterval = setInterval(() => {
            if (boosts?.autoClicker && boosts.autoClickerUntil > Date.now()) {
                collectAutoClickerIncome();
            }
        }, 5000);
    }
    
    // ============= ЗАДАНИЯ =============
    async function completeTask(taskId, reward) {
        try {
            const response = await fetch(`${API_URL}/task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, taskId })
            });
            const result = await response.json();
            
            if (result.success) {
                user.balance += reward;
                fullRender();
                await saveToServer();
                hapticFeedback('success');
                showNotification(`🎁 Получено +$${reward} за задание!`, 'success');
                return true;
            } else {
                showNotification(result.message || 'Задание уже выполнено', 'info');
                return false;
            }
        } catch (error) {
            console.error('Task error:', error);
            return false;
        }
    }
    
    // ============= ВЫВОД СРЕДСТВ =============
    async function withdrawFunds() {
        if (!user) return;
        
        if (user.balance < 0.01) {
            showAlert('❌ Минимальная сумма для вывода: $0.01');
            return;
        }
        
        showConfirm(`Вывести $${user.balance.toFixed(4)}?`, async (confirmed) => {
            if (confirmed) {
                const response = await fetch(`${API_URL}/withdraw`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: currentUserId, amount: user.balance })
                });
                
                if (response.ok) {
                    user.balance = 0;
                    fullRender();
                    await saveToServer();
                    showNotification('✅ Заявка на вывод отправлена!', 'success');
                }
            }
        });
    }
    
    // ============= ЛИДЕРБОРД =============
    async function loadLeaderboard() {
        try {
            const response = await fetch(`${API_URL}/leaderboard`);
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
            }
        } catch (error) {
            console.error('Leaderboard error:', error);
        }
    }
    
    // ============= UI РЕНДЕРИНГ =============
    function fullRender() {
        applyLanguageToStatic();
        
        const balanceEl = document.getElementById("balance");
        if (balanceEl) balanceEl.innerText = "$" + (user?.balance || 0).toFixed(4);
        
        const balanceTopSpan = document.getElementById("balanceTop");
        if (balanceTopSpan) balanceTopSpan.innerText = "$" + (user?.balance || 0).toFixed(4);
        
        const walletBalance = document.getElementById('walletBalance');
        if (walletBalance && user) walletBalance.innerText = `$${user.balance.toFixed(4)}`;
        
        const levelEl = document.getElementById("level");
        if (levelEl) levelEl.innerText = `${t("level")} ${user?.level || 1} • ${user?.ads || 0}/100`;
        
        const fillEl = document.getElementById("xpFill");
        if (fillEl) fillEl.style.width = (user?.ads || 0) + "%";
        
        const autoBtn = document.getElementById("autoBtn");
        if (autoBtn) autoBtn.innerText = auto ? t("auto_on") : t("auto_off");
        
        const nextRewardSpan = document.getElementById("nextRewardValue");
        if (nextRewardSpan) nextRewardSpan.innerText = `+$${getRewardForNextLevel().toFixed(4)}`;
        
        const boostDoubleBtn = document.getElementById('boostDoubleBtn');
        if (boostDoubleBtn && boosts) {
            if (boosts.doubleIncome && boosts.doubleIncomeUntil > Date.now()) {
                boostDoubleBtn.innerHTML = `✅ Активен ${formatBoostTime(boosts.doubleIncomeUntil) || ''}`;
                boostDoubleBtn.disabled = true;
            } else {
                boostDoubleBtn.innerHTML = 'Купить за 5000';
                boostDoubleBtn.disabled = false;
            }
        }
        
        const boostAutoBtn = document.getElementById('boostAutoBtn');
        if (boostAutoBtn && boosts) {
            if (boosts.autoClicker && boosts.autoClickerUntil > Date.now()) {
                boostAutoBtn.innerHTML = `✅ Активен ${formatBoostTime(boosts.autoClickerUntil) || ''}`;
                boostAutoBtn.disabled = true;
            } else {
                boostAutoBtn.innerHTML = 'Купить за 10000';
                boostAutoBtn.disabled = false;
            }
        }
        
        renderAdBlocks();
    }
    
    function renderAdBlocks() {
        const cardsDiv = document.getElementById("cards");
        if (!cardsDiv || !blocks) return;
        
        timerIntervals.forEach(interval => clearInterval(interval));
        timerIntervals = [];
        
        let html = "";
        const currentReward = getRewardForCurrentLevel();
        
        blocks.forEach(b => {
            const locked = Date.now() < b.l;
            const viewsPercent = (b.v / 15) * 100;
            const statusText = locked ? t("locked") : t("active");
            
            html += `
                <div class="card" data-block-id="${b.id}">
                    <div class="card-title">
                        <span>${getBlockName(b.id)}</span>
                        <span style="color:#4ade80">+$${currentReward.toFixed(4)}</span>
                    </div>
                    <div class="stats">
                        <span>${b.v}/15 ${t("views")}</span>
                        <span>${statusText}</span>
                    </div>
                    <div class="small-bar">
                        <div class="small-fill" style="width:${viewsPercent}%"></div>
                    </div>
                    <button class="btn" id="adBtn_${b.id}" ${locked ? 'disabled' : ''} onclick="window.watchAd && window.watchAd(${b.id})">
                        ${t("watch")}
                        ${locked ? '<span class="btn-timer-text" id="timerSpan_' + b.id + '">(--:--:--)</span>' : ''}
                    </button>
                </div>
            `;
        });
        
        cardsDiv.innerHTML = html;
        
        blocks.forEach(b => {
            if (Date.now() < b.l) {
                const timerSpan = document.getElementById(`timerSpan_${b.id}`);
                if (timerSpan) {
                    const updateTimer = () => {
                        const remaining = formatLockTime(b.l);
                        if (remaining) timerSpan.innerText = `(${remaining})`;
                        else fullRender();
                    };
                    updateTimer();
                    const intervalId = setInterval(updateTimer, 1000);
                    timerIntervals.push(intervalId);
                }
            }
        });
    }
    
    function applyLanguageToStatic() {
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (dict[lang][key]) el.innerText = dict[lang][key];
        });
        const langBtn = document.getElementById("langBtn");
        if (langBtn) langBtn.innerText = lang.toUpperCase();
    }
    
    function toggleLanguage() {
        lang = (lang === "ru") ? "en" : "ru";
        fullRender();
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
            z-index: 1000;
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
    
    // ============= ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ =============
    async function initUser() {
        const telegramUser = initTelegram();
        
        let userId = null;
        let referrerId = localStorage.getItem('referrerId');
        
        if (telegramUser && telegramUser.id) {
            userId = `tg_${telegramUser.id}`;
            console.log('✅ Telegram user:', userId);
        } else {
            userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        }
        
        currentUserId = userId;
        
        try {
            const response = await fetch(`${API_URL}/user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    username: telegramUser?.username || telegramUser?.firstName || null,
                    firstName: telegramUser?.firstName || null,
                    lastName: telegramUser?.lastName || null,
                    avatar: telegramUser?.avatar || null,
                    referrerId: referrerId
                })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            console.log('✅ Server data:', data);
            
            user = {
                userId: data.userId,
                username: data.username,
                balance: data.balance,
                level: data.level,
                ads: data.ads,
                avatar: data.avatar
            };
            
            blocks = [
                { id: 1, v: data.blocks['1'].v, l: data.blocks['1'].l },
                { id: 2, v: data.blocks['2'].v, l: data.blocks['2'].l },
                { id: 3, v: data.blocks['3'].v, l: data.blocks['3'].l }
            ];
            
            boosts = data.boosts;
            
            const usernameSpan = document.getElementById("username");
            if (usernameSpan) {
                usernameSpan.innerText = telegramUser?.username ? '@' + telegramUser.username : (data.username || 'Guest');
            }
            
            const avatarImg = document.getElementById("avatar");
            if (avatarImg) avatarImg.src = data.avatar || 'https://i.pravatar.cc/100';
            
            const userIdSpan = document.getElementById("userid");
            if (userIdSpan && telegramUser) userIdSpan.innerText = `ID: ${telegramUser.id}`;
            
            updateInviteLink();
            fullRender();
            
            return true;
        } catch (error) {
            console.error('❌ Connection error:', error);
            showNotification('⚠️ Ошибка подключения к серверу', 'error');
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
                    showAlert('✅ Ссылка скопирована! Поделитесь с другом.');
                    hapticFeedback('success');
                };
            }
        }
    }
    
    // ============= НАВИГАЦИЯ =============
    function initNavigation() {
        const navItems = document.querySelectorAll(".nav-item");
        navItems.forEach(item => {
            item.addEventListener("click", () => {
                const pageId = item.getAttribute("data-page");
                if (!pageId) return;
                navItems.forEach(nav => nav.classList.remove("active"));
                item.classList.add("active");
                document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
                const targetPage = document.getElementById(pageId);
                if (targetPage) targetPage.classList.add("active");
                
                if (pageId === 'friends') loadLeaderboard();
            });
        });
    }
    
    function bindEvents() {
        const autoBtnEl = document.getElementById("autoBtn");
        if (autoBtnEl) {
            const newAutoBtn = autoBtnEl.cloneNode(true);
            autoBtnEl.parentNode.replaceChild(newAutoBtn, autoBtnEl);
            newAutoBtn.addEventListener("click", toggleAutoMode);
        }
        
        const langButton = document.getElementById("langBtn");
        if (langButton) {
            const newLangBtn = langButton.cloneNode(true);
            langButton.parentNode.replaceChild(newLangBtn, langButton);
            newLangBtn.addEventListener("click", toggleLanguage);
        }
        
        const boostDoubleBtn = document.getElementById('boostDoubleBtn');
        if (boostDoubleBtn) boostDoubleBtn.onclick = () => buyBoost('double', 5000, 24);
        
        const boostAutoBtn = document.getElementById('boostAutoBtn');
        if (boostAutoBtn) boostAutoBtn.onclick = () => buyBoost('auto', 10000, 24);
        
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (withdrawBtn) withdrawBtn.onclick = withdrawFunds;
        
        document.querySelectorAll('.task-btn').forEach(btn => {
            btn.onclick = () => {
                const taskId = btn.getAttribute('data-task');
                if (taskId === 'subscribe') {
                    window.open('https://t.me/duckads', '_blank');
                    setTimeout(() => completeTask('subscribe', 1000), 3000);
                } else if (taskId === 'share') {
                    completeTask('share', 500);
                }
            };
        });
    }
    
    // Сохранение при закрытии
    window.addEventListener('beforeunload', () => {
        if (user && user.balance > 0) {
            navigator.sendBeacon(`${API_URL}/save`, JSON.stringify({
                userId: currentUserId,
                balance: user.balance,
                level: user.level,
                ads: user.ads
            }));
        }
    });
    
    // ============= ЗАПУСК =============
    document.addEventListener("DOMContentLoaded", async () => {
        console.log('🚀 Duck Ads starting...');
        
        initNavigation();
        bindEvents();
        
        await initUser();
        
        startBoostChecker();
        startAutoClickerLoop();
        
        setTimeout(() => checkGigaPubReady(), 2000);
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            @keyframes fadeOut {
                from { opacity: 1; transform: translateX(-50%) translateY(0); }
                to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
        
        console.log('✅ Duck Ads ready!');
    });
    
    // Экспортируем глобальные функции
    window.watchAd = watchAd;
    window.toggleAutoMode = toggleAutoMode;
    window.toggleLanguage = toggleLanguage;
    window.saveToServer = saveToServer;
    window.showNotification = showNotification;
    window.hapticFeedback = hapticFeedback;
    window.showAlert = showAlert;
    window.showConfirm = showConfirm;
    window.currentUserId = () => currentUserId;
})();