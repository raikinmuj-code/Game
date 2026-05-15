// ============= ЯЗЫКИ И ПЕРЕВОДЫ =============
const dict = {
    ru: {
        balance: "БАЛАНС",
        home: "Главная",
        friends: "Друзья",
        boosts: "Бусты",
        tasks: "Задания",
        wallet: "Кошелек",
        auto_on: "AUTO ON",
        auto_off: "AUTO OFF",
        watch: "Смотреть рекламу",
        locked: "Заблокировано",
        active: "Активно",
        adblock: "Рекламный блок",
        level: "Уровень",
        views: "просмотров"
    },
    en: {
        balance: "BALANCE",
        home: "Home",
        friends: "Friends",
        boosts: "Boosts",
        tasks: "Tasks",
        wallet: "Wallet",
        auto_on: "AUTO ON",
        auto_off: "AUTO OFF",
        watch: "Watch Ad",
        locked: "Locked",
        active: "Active",
        adblock: "Ad Block",
        level: "Level",
        views: "views"
    }
};

let lang = "ru";

function t(key) {
    return dict[lang][key] || key;
}

function applyLanguageToStatic() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[lang][key]) {
            el.innerText = dict[lang][key];
        }
    });
    const langBtn = document.getElementById("langBtn");
    if (langBtn) langBtn.innerText = lang.toUpperCase();
}

function toggleLanguage() {
    lang = (lang === "ru") ? "en" : "ru";
    if (window.fullRender) window.fullRender();
}