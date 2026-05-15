// ============= ДЕБАГ-ПАНЕЛЬ ДЛЯ ТЕЛЕФОНОВ =============

let debugMode = true; // Включить/выключить режим отладки
let debugMessages = [];
let debugPanel = null;

// Функция логирования с выводом на экран
function debugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    debugMessages.unshift(logEntry);
    
    // Оставляем только последние 20 сообщений
    if (debugMessages.length > 20) debugMessages.pop();
    
    console.log(`[${timestamp}] ${message}`);
    
    // Обновляем панель на экране
    updateDebugPanel();
    
    // Вибрация при ошибке
    if (type === 'error' && window.hapticFeedback) {
        window.hapticFeedback('error');
    }
}

// Создание панели отладки
function createDebugPanel() {
    if (debugPanel) return;
    
    debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        padding: 10px;
        z-index: 9999;
        font-family: monospace;
        font-size: 10px;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #2AABEE;
        display: none;
        color: #fff;
    `;
    
    // Заголовок с кнопкой закрытия
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        padding-bottom: 5px;
        border-bottom: 1px solid #333;
    `;
    header.innerHTML = `
        <span style="color: #2AABEE; font-weight: bold;">🐛 DEBUG CONSOLE</span>
        <button id="close-debug" style="background: none; border: none; color: #fff; cursor: pointer;">✖️</button>
    `;
    debugPanel.appendChild(header);
    
    // Контейнер для сообщений
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'debug-messages';
    debugPanel.appendChild(messagesContainer);
    
    document.body.appendChild(debugPanel);
    
    // Кнопка закрытия
    document.getElementById('close-debug')?.addEventListener('click', () => {
        debugPanel.style.display = 'none';
    });
}

// Обновление панели сообщениями
function updateDebugPanel() {
    if (!debugPanel) return;
    
    const container = document.getElementById('debug-messages');
    if (!container) return;
    
    container.innerHTML = debugMessages.map(msg => {
        let color = '#aaa';
        if (msg.type === 'error') color = '#ff6b6b';
        if (msg.type === 'success') color = '#4ade80';
        if (msg.type === 'warning') color = '#ffb347';
        if (msg.type === 'info') color = '#2AABEE';
        
        return `<div style="color: ${color}; margin-bottom: 4px; border-bottom: 1px solid #222; padding: 2px 0;">
            <span style="color: #666;">[${msg.timestamp}]</span> ${msg.message}
        </div>`;
    }).join('');
}

// Показать/скрыть панель
function toggleDebugPanel() {
    if (!debugPanel) createDebugPanel();
    debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
}

// Добавляем кнопку для открытия дебага
function addDebugButton() {
    const btn = document.createElement('button');
    btn.innerHTML = '🐛';
    btn.style.cssText = `
        position: fixed;
        bottom: 90px;
        right: 10px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: #2AABEE;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        z-index: 9998;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        opacity: 0.7;
    `;
    btn.onclick = toggleDebugPanel;
    document.body.appendChild(btn);
}

// Перехват ошибок
window.addEventListener('error', (event) => {
    debugLog(`❌ Ошибка: ${event.message}`, 'error');
});

// Перехват rejected промисов
window.addEventListener('unhandledrejection', (event) => {
    debugLog(`❌ Promise ошибка: ${event.reason}`, 'error');
});

// Модифицируем существующие функции для дебага
if (window.watchAd) {
    const originalWatchAd = window.watchAd;
    window.watchAd = function(blockId) {
        debugLog(`👁️ Нажатие на рекламу блока ${blockId}`, 'info');
        originalWatchAd(blockId);
    };
}

// Экспорт
window.debugLog = debugLog;
window.toggleDebugPanel = toggleDebugPanel;
window.debugMode = debugMode;

// Автозапуск
setTimeout(() => {
    createDebugPanel();
    addDebugButton();
    debugLog('🐛 Дебаг-панель активирована! Нажмите на кнопку 🐛', 'success');
}, 1000);

console.log('✅ debug.js загружен');