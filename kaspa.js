// Функция показа адреса
function showAddress() {
    const section = document.getElementById('receive-section');
    const addrDiv = document.getElementById('wallet-address');
    
    // Генерируем или берем существующий адрес
    let address = localStorage.getItem('kaspa_address');
    if (!address) {
        address = 'kaspa:qp' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('kaspa_address', address);
    }
    
    addrDiv.innerText = address;
    section.style.display = 'block'; // Показываем блок
}

// Привязываем к кнопке 'Получить' (вторая кнопка в списке)
document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.wallet-actions button');
    if (buttons.length >= 2) {
        buttons[1].onclick = showAddress; // Привязка функции к кнопке Получить
    }
});