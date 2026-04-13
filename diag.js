// diag.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("--- ДИАГНОСТИКА СИСТЕМЫ ---");
    
    // 1. Проверка наличия ключевых функций
    const requiredFunctions = ['sendTransaction', 'showAddress', 'encryptMnemonic'];
    requiredFunctions.forEach(fn => {
        if (typeof window[fn] === 'function' || typeof eval(fn) === 'function') {
            console.log(`✅ Функция ${fn} найдена.`);
        } else {
            console.warn(`❌ Функция ${fn} НЕ найдена!`);
        }
    });

    // 2. Проверка DOM-элементов
    const requiredElements = ['kas-balance', 'send-address', 'wallet-address'];
    requiredElements.forEach(id => {
        if (document.getElementById(id)) {
            console.log(`✅ Элемент #${id} найден.`);
        } else {
            console.warn(`❌ Элемент #${id} НЕ найден в DOM.`);
        }
    });
});