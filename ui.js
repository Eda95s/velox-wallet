// --- ИНИЦИАЛИЗАЦИЯ И ОБЩИЕ ФУНКЦИИ ---

(function() {
    // 1. Ловим все необработанные ошибки JS
    window.onerror = function(message, source, lineno, colno, error) {
        console.error("--- КРИТИЧЕСКАЯ ОШИБКА ---");
        console.error("Сообщение:", message);
        console.error("Файл:", source);
        console.error("Строка:", lineno, ":", colno);
        console.error("Стек:", error ? error.stack : "нет стека");
        alert("Ошибка в скрипте: " + message);
        return false;
    };

    // 2. Ловим ошибки в Promise (это важно для async/await функций)
    window.addEventListener("unhandledrejection", event => {
        console.error("--- ОШИБКА PROMISE ---");
        console.error("Причина:", event.reason);
    });

    // 3. Отслеживаем загрузку WASM
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        if (args[0].toString().includes('.wasm')) {
            console.log("Загрузка WASM файла:", args[0]);
        }
        return originalFetch.apply(this, args);
    };

    console.log("Отладчик успешно запущен. Все ошибки будут выведены в консоль (F12).");
})();

document.addEventListener('DOMContentLoaded', () => {
    const icon = document.getElementById('wallet-menu-icon');
    const modal = document.getElementById('auth-modal');

    // Открыть старое меню (если нужно)
    if (icon && modal) {
        icon.onclick = () => { modal.style.display = 'flex'; };
    }
    
    // Закрыть (функция для кнопки "Закрыть")
    window.closeModal = () => { 
        if(modal) modal.style.display = 'none'; 
    };
    unlockApp();
});

function refreshBalance() {
    const amountEl = document.querySelector('.amount');
    const coinEl = document.querySelector('.val-coin');
    
    // Эффект мерцания при обновлении
    if (amountEl && coinEl) {
        [amountEl, coinEl].forEach(el => {
            el.style.opacity = '0.5';
            setTimeout(() => {
                el.style.opacity = '1';
            }, 300);
        });
    }
}

// Обновляем раз в 30 секунд
setInterval(refreshBalance, 30000);

async function unlockApp() {
    const encrypted = localStorage.getItem('encrypted_mnemonic');
    if (!encrypted) return;

    showActionModal("Авторизация", 
        `<div style="text-align: center;">
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 15px;">Введите ваш мастер-пароль</p>
    <input type="password" class="pin-input-field" id="auth-pin" placeholder="••••" maxlength="32">
</div>`, 
"Войти", 
async () => {
            const pin = document.getElementById('auth-pin').value;
            try {
                const mnemonic = await decryptMnemonic(encrypted, pin);
                window.userMnemonic = mnemonic; 
                
                const screen = document.getElementById('auth-screen');
                if (screen) {
                    screen.style.transition = "opacity 0.6s ease";
                    screen.style.opacity = "0";
                    setTimeout(() => { screen.style.display = "none"; }, 600);
                }
                document.getElementById('action-modal').style.display = 'none';
            } catch (e) {
                alert("Неверный пароль!");
            }
        }
    );
}

// --- СИСТЕМА МОДАЛЬНЫХ ОКОН (ACTION MODAL) ---

function showActionModal(title, content, btnText, onAction) {
    const modal = document.getElementById('action-modal');
    if (!modal) return;

    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-content').innerHTML = content;
    
    const btn = document.getElementById('modal-action-btn');
    btn.innerText = btnText;
    btn.onclick = onAction;
    
    modal.style.display = 'flex';
}

// Красивое уведомление вместо стандартного alert
function showNotification(message, onConfirm = null) {
    const html = `
        <div style="text-align: center; padding: 10px;">
            <i class="fas fa-check-circle" style="font-size: 40px; color: var(--accent-blue); margin-bottom: 15px;"></i>
            <p style="color: white; font-size: 16px; margin-bottom: 20px;">${message}</p>
        </div>
    `;
    
    showActionModal("Успешно", html, "ОК", () => {
        document.getElementById('action-modal').style.display = 'none';
        if (onConfirm) onConfirm();
    });
}

// --- ФУНКЦИИ СОЗДАНИЯ КОШЕЛЬКА ---

function createWallet() {
    const selectionHtml = `
        <div style="text-align: center;">
            <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14px;">Выберите длину секретной фразы:</p>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <button onclick="window.generateMnemonicByLength(12)" style="flex: 1; padding: 15px; background: #1a1c22; border: 1px solid #333; color: white; border-radius: 12px; cursor: pointer; font-weight: bold;">12 слов</button>
                <button onclick="window.generateMnemonicByLength(24)" style="flex: 1; padding: 15px; background: #1a1c22; border: 1px solid #333; color: white; border-radius: 12px; cursor: pointer; font-weight: bold;">24 слова</button>
            </div>
        </div>
    `;
    
    if (typeof showActionModal === 'function') {
        showActionModal("Новый кошелек", selectionHtml, "Отмена", () => {
            document.getElementById('action-modal').style.display = 'none';
        });
    }
}

async function generateMnemonicByLength(length) {
    try {
        if (typeof bip39 === 'undefined') {
            alert("Ошибка: библиотека bip39 не найдена");
            return;
        }

        const strength = length === 12 ? 128 : 256;
        const phrase = bip39.generateMnemonic(strength);
        
        const contentHtml = `
            <div style="text-align: center;">
                <div id="phrase-display" style="background: #0a0b0d; padding: 15px; border-radius: 12px; border: 1px solid var(--accent-blue); font-family: monospace; font-size: 14px; color: #fff; word-break: break-word; user-select: all; margin-bottom: 15px;">
                    ${phrase}
                </div>
                <p style="font-size: 12px; color: #ff4444; margin-bottom: 10px;">
                    Запишите фразу! Сейчас мы зашифруем её вашим паролем.
                </p>
                // ... внутри contentHtml ...
<input type="password" id="set-pin" placeholder="Придумайте пароль" 
       oninput="window.checkStrength(this.value)"
       style="width: 100%; padding: 12px; background: #1a1c22; border: 1px solid #333; color: white; border-radius: 10px; text-align: center; font-size: 16px; outline: none;">
<div id="strength-meter" style="margin-top: 10px; font-size: 12px; color: #666; text-align: center;">Минимум 8 знаков, заглавная, цифра и символ</div>
            </div>
        `;

        showActionModal(`Создание кошелька`, contentHtml, "Зашифровать и войти", async () => {
            const pin = document.getElementById('set-pin').value;

            // Внедряем ту самую проверку сложности
            if (typeof validatePasswordStrength === 'function') {
                if (!validatePasswordStrength(pin)) {
                    alert("Пароль слишком простой! Используйте минимум 8 символов, заглавную букву, цифру и символ (например, !, @, #).");
                    return;
                }
            } else if (pin.length < 8) { // Запасной вариант, если функцию забыли добавить
                alert("Пароль должен быть не менее 8 символов");
                return;
            }

            // Если всё ок — шифруем
            const encryptedData = await encryptMnemonic(phrase, pin);
            
            localStorage.setItem('encrypted_mnemonic', encryptedData);
            localStorage.removeItem('user_mnemonic'); 

            showNotification("Кошелек создан и защищен!", () => {
                document.getElementById('action-modal').style.display = 'none';
                unlockApp();
            });
        });
        
    } catch (e) {
        console.error("Ошибка генерации:", e);
    }
}

// Вспомогательная функция для визуального контроля (вставь её рядом или в конец ui.js)
window.checkStrength = (val) => {
    const meter = document.getElementById('strength-meter');
    if (!meter) return;

    // Спецсимволы теперь включают: !@#$%^&*() . / - _ + =
    // Это выражение разрешает любые из этих знаков: [!@#$%^&*()\/.\-_+=]
    const hasSpecial = /[!@#$%^&*()\/.\-_+=]/.test(val);
    const hasLength = val.length >= 8;
    const hasUpper = /[A-Z]/.test(val);
    const hasNumber = /[0-9]/.test(val);
    const noCyrillic = !/[а-яА-ЯёЁ]/.test(val);

    const rules = [
        { label: "8+ символов", valid: hasLength },
        { label: "Заглавная латинская", valid: hasUpper },
        { label: "Цифра", valid: hasNumber },
        { label: "Спецсимвол", valid: hasSpecial },
        { label: "Только английская раскладка", valid: noCyrillic }
    ];

    let statusHtml = '<div style="text-align: left; display: inline-block; margin-top: 10px; font-size: 11px;">';
    rules.forEach(rule => {
        const color = rule.valid ? "#00ff00" : "#ff4444";
        const icon = rule.valid ? "✓" : "✕";
        statusHtml += `<div style="color: ${color}; margin-bottom: 2px;">${icon} ${rule.label}</div>`;
    });
    statusHtml += '</div>';

    meter.innerHTML = statusHtml;
    window.isPasswordValid = rules.every(r => r.valid);
};

// Вспомогательная функция валидации для использования в коде
function validatePasswordStrength(password) {
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const noCyrillic = !/[а-яА-Я]/.test(password);
    
    return hasLength && hasUpper && hasNumber && hasSpecial && noCyrillic;
}

// Принудительная глобализация функций для доступа из HTML-строк
window.createWallet = createWallet;
window.generateMnemonicByLength = generateMnemonicByLength;

// --- ФУНКЦИИ ИМПОРТА КОШЕЛЬКА ---

function importWallet() {
    const selectionHtml = `
        <div style="text-align: center;">
            <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 14px;">Какую фразу вы хотите импортировать?</p>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <button onclick="showImportInput(12)" style="flex: 1; padding: 15px; background: #1a1c22; border: 1px solid #333; color: white; border-radius: 12px; cursor: pointer; font-weight: bold;">12 слов</button>
                <button onclick="showImportInput(24)" style="flex: 1; padding: 15px; background: #1a1c22; border: 1px solid #333; color: white; border-radius: 12px; cursor: pointer; font-weight: bold;">24 слова</button>
            </div>
        </div>
    `;
    showActionModal("Импорт кошелька", selectionHtml, "Отмена", () => {
        document.getElementById('action-modal').style.display = 'none';
    });
}

function showImportInput(length) {
    const inputHtml = `
        <div style="text-align: center;">
            <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 10px;">Введите ваши ${length} слов:</p>
            <textarea id="seed-input" 
                style="width: 100%; height: 110px; background: #0a0b0d; border: 1px solid var(--accent-blue); color: white; padding: 12px; border-radius: 12px; font-family: monospace; font-size: 14px; resize: none; outline: none; text-align: center;"
                placeholder="word1 word2 word3..."></textarea>
        </div>
    `;

    showActionModal(`Восстановление`, inputHtml, "Далее", () => {
        const text = document.getElementById('seed-input').value.trim().toLowerCase();
        if (bip39.validateMnemonic(text)) {
            // Теперь открываем окно ПАРОЛЯ с проверкой сложности
            showPasswordSetup(text); 
        } else {
            showNotification("Ошибка: Неверная фраза");
        }
    });
}

// Отдельная функция для красивого задания пароля
function showPasswordSetup(mnemonic) {
    const html = `
        <div style="text-align: center;">
            <p style="color: var(--text-secondary); margin-bottom: 15px;">Установите надежный пароль:</p>
            <input type="password" id="new-password" oninput="window.checkStrength(this.value)"
                   placeholder="Пароль..." style="width: 100%; padding: 12px; border-radius: 10px; background: #0a0b0d; border: 1px solid #333; color: white; text-align: center; box-sizing: border-box;">
            <div id="strength-meter" style="margin-top: 10px; font-size: 12px; color: #666;">Минимум 8 символов, цифра и спецсимвол</div>
        </div>
    `;

    showActionModal("Безопасность", html, "Сохранить", async () => {
        const pass = document.getElementById('new-password').value;
        
        // 1. Проверяем валидность
        if (!validatePasswordStrength(pass)) {
            alert("Пароль слабый! Убедитесь, что есть 8+ символов, заглавная, цифра и символ (точка, слэш и т.д.).");
            return; // ВАЖНО: мы просто выходим из функции, НЕ закрывая окно
        }

        // 2. Если всё хорошо, шифруем
        try {
            const encrypted = await encryptMnemonic(mnemonic, pass);
            localStorage.setItem('encrypted_mnemonic', encrypted);
            
            // 3. Успех: закрываем окно вручную и показываем уведомление
            document.getElementById('action-modal').style.display = 'none';
            showNotification("Кошелек защищен!", unlockApp);
        } catch (e) {
            console.error(e);
            alert("Ошибка при шифровании. Попробуйте еще раз.");
        }
    });
}

// --- НАСТРОЙКИ БЕЗОПАСНОСТИ ---

function showSecuritySettings() {
    const html = `
    <div style="text-align: center; padding: 10px 0;">
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 10px;">Введите ваш мастер-пароль</p>
        <input type="password" class="pin-input-field" id="auth-pin" placeholder="••••" maxlength="32">
    </div>
`;    
    showActionModal("Безопасность", html, "Показать", async () => {
        const pass = document.getElementById('check-password').value;
        const encrypted = localStorage.getItem('encrypted_mnemonic');
        
        if (!encrypted) {
            showNotification("Кошелек не найден!");
            return;
        }

        try {
            // Пытаемся расшифровать тем паролем, что ввел юзер
            const secret = await decryptMnemonic(encrypted, pass);
            
            // Если успех — показываем фразу
            showActionModal("Ваша фраза", 
                `<div style="font-family:monospace; background: #000; padding:10px; word-break: break-all; color: #00ff00;">${secret}</div>`, 
                "Закрыть", 
                () => { document.getElementById('action-modal').style.display = 'none'; }
            );
        } catch (e) {
            // Если ошибка (неверный пароль или данные повреждены)
            showNotification("Неверный пароль!");
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Кнопка "ОТПРАВИТЬ"
    // 1. Кнопка "ОТПРАВИТЬ"
const btnSend = document.getElementById('btn-show-send');
if (btnSend) {
    btnSend.addEventListener('click', () => {
        showActionModal(
            "Отправить KAS", 
            `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <input type="text" id="modal-send-address" placeholder="Адрес получателя" style="width: 100%; padding: 12px; border-radius: 10px; background: #0a0b0d; border: 1px solid #333; color: white;">
                <input type="number" id="modal-send-amount" placeholder="Сумма KAS" style="width: 100%; padding: 12px; border-radius: 10px; background: #0a0b0d; border: 1px solid #333; color: white;">
            </div>
            `,
            "Подтвердить отправку",
            async () => {
                // Ищем поля именно внутри модального окна
                const addr = document.getElementById('modal-send-address').value;
                const amount = document.getElementById('modal-send-amount').value;
                
                if (addr && amount) {
                    if (typeof sendTransaction === 'function') {
                        await sendTransaction(addr, amount);
                    }
                } else {
                    alert("Заполните все поля");
                }
            }
        );
    });
}
    // 2. Кнопка "ПОЛУЧИТЬ" (уже была, но давай проверим)
    const btnReceive = document.getElementById('btn-show-receive');
    if (btnReceive) {
        btnReceive.addEventListener('click', () => {
            // Если в kaspa.js есть функция showAddress
            if (typeof showAddress === 'function') {
                showAddress();
            } else {
                // Если нет, просто показываем адрес из памяти
                const addr = localStorage.getItem('kaspa_address') || "Адрес еще не создан";
                showActionModal("Ваш адрес", `<div style="word-break: break-all; text-align: center;">${addr}</div>`, "Копировать", () => {
                    navigator.clipboard.writeText(addr);
                    alert("Скопировано!");
                });
            }
        });
    }
});

// Генерация ключа из пароля (PIN-кода)
async function deriveKey(pin, salt) {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

// Шифрование фразы
async function encryptMnemonic(mnemonic, pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(pin, salt);
    
    const encoded = new TextEncoder().encode(mnemonic);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    
    // Соединяем соль + IV + зашифрованные данные в одну строку base64
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    return btoa(String.fromCharCode(...result));
}

// Дешифрование фразы
async function decryptMnemonic(encryptedBase64, pin) {
    try {
        const data = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
        const salt = data.slice(0, 16);
        const iv = data.slice(16, 28);
        const encrypted = data.slice(28);
        
        const key = await deriveKey(pin, salt);
        
        // ВАЖНО: crypto.subtle.decrypt выбрасывает ошибку, если пароль неверный
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        // Мы пробрасываем ошибку дальше, чтобы catch в unlockApp или showSecuritySettings её поймал
        console.error("Ошибка дешифровки:", e);
        throw new Error("Неверный пароль"); 
    }
}

function validatePasswordStrength(password) {
    if (!password) return false; // Защита от пустого пароля
    
    // 1. Минимум 8 символов
    const hasLength = password.length >= 8;
    // 2. Заглавная буква
    const hasUpper = /[A-Z]/.test(password);
    // 3. Цифра
    const hasNumber = /[0-9]/.test(password);
    // 4. Спецсимвол (любой знак, кроме букв и цифр)
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    // 5. Запрет на кириллицу
    const noCyrillic = !/[а-яА-ЯёЁ]/.test(password);

    return hasLength && hasUpper && hasNumber && hasSpecial && noCyrillic;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ищем контейнер, где у тебя лежат кнопки "Создать" и "Импортировать"
    // Обычно это div внутри auth-screen
    const authContainer = document.querySelector('#auth-screen > div');

    if (authContainer) {
        // 2. Создаем кнопку
        const btn = document.createElement('button');
        btn.innerText = "ВОЙТИ";
        btn.onclick = unlockApp;
        
        // 3. Применяем "Божественный стиль" прямо в JS
        // Это гарантированно перекроет любые конфликты в CSS
        Object.assign(btn.style, {
            display: "block",
            margin: "20px auto 0",
            width: "180px",
            height: "45px",
            borderRadius: "50px",
            border: "none",
            background: "linear-gradient(135deg, #0088ff, #0044aa)",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "1.5px",
            cursor: "pointer",
            boxShadow: "0 8px 20px rgba(0, 110, 255, 0.3)",
            transition: "all 0.3s ease"
        });

        // Эффекты при наведении
        btn.onmouseover = () => {
            btn.style.transform = "scale(1.05)";
            btn.style.boxShadow = "0 10px 25px rgba(0, 110, 255, 0.5)";
        };
        btn.onmouseout = () => {
            btn.style.transform = "scale(1)";
            btn.style.boxShadow = "0 8px 20px rgba(0, 110, 255, 0.3)";
        };

        // 4. Вставляем кнопку сразу после кнопки "Импортировать"
        // Находим кнопку импорта (вторая кнопка в контейнере)
        const importBtn = authContainer.querySelectorAll('button')[1];
        if (importBtn) {
            importBtn.after(btn);
        } else {
            authContainer.appendChild(btn);
        }
    }
});

function initKaspaDAGAnimation() {
    const canvas = document.getElementById('blockchain-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let blocks = [];
    const maxBlocks = 40; 

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Block {
        constructor(isInitial = false) {
            // Появляются справа или в случайном месте при старте
            this.x = isInitial ? Math.random() * canvas.width : canvas.width + 50;
            this.y = Math.random() * canvas.height;
            this.vx = -(Math.random() * 0.5 + 0.2); // Скорость движения влево
            this.size = Math.random() * 2 + 2;
            this.parents = [];
            this.life = 1; // Для эффекта появления
        }

        update() {
            this.x += this.vx;
            // Находим "родителей" среди тех, кто левее (уже в сети)
            if (this.parents.length < 2) {
                this.findParents();
            }
        }

        findParents() {
            // Ищем блоки, которые находятся левее текущего для создания DAG-связи
            for (let b of blocks) {
                if (b !== this && b.x < this.x && b.x > this.x - 200) {
                    if (!this.parents.includes(b) && this.parents.length < 3) {
                        this.parents.push(b);
                    }
                }
            }
        }

        draw() {
            // Рисуем связи (ребра графа)
            this.parents.forEach(p => {
                const dist = Math.abs(this.x - p.x);
                ctx.beginPath();
                ctx.strokeStyle = `rgba(112, 219, 219, ${0.3 * (1 - dist/250)})`; // Цвет Kaspa (бирюзовый)
                ctx.lineWidth = 0.8;
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
            });

            // Рисуем сам блок
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = '#70dbdb'; // Фирменный цвет Kaspa
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#70dbdb';
            ctx.fill();
            ctx.shadowBlur = 0; // Сбрасываем тень для оптимизации
        }
    }

    // Начальное заполнение
    for(let i=0; i<maxBlocks; i++) blocks.push(new Block(true));

    function animate() {
        const authScreen = document.getElementById('auth-screen');
        if (authScreen && authScreen.style.display === 'none') return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Обновляем и рисуем блоки
        blocks.forEach((b, index) => {
            b.update();
            b.draw();

            // Если блок ушел далеко влево, удаляем его и создаем новый справа
            if (b.x < -100) {
                blocks.splice(index, 1);
                blocks.push(new Block());
            }
        });

        requestAnimationFrame(animate);
    }

    animate();
}

document.addEventListener('DOMContentLoaded', initKaspaDAGAnimation);