
function refreshBalance() {
    const amountEl = document.querySelector('.amount');
    const coinEl = document.querySelector('.val-coin');
    
    // Эффект мерцания при обновлении
    [amountEl, coinEl].forEach(el => {
        el.style.opacity = '0.5';
        setTimeout(() => {
            el.style.opacity = '1';
        }, 300);
    });
}

// Обновляем раз в 30 секунд
setInterval(refreshBalance, 30000);

