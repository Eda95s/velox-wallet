// kaspa.js - Логика взаимодействия с блокчейном
import init, { 
    Mnemonic, 
    XPrv, 
    PrivateKey, 
    Address, 
    Hash, 
    TransactionOutpoint, 
    TransactionUtxoEntry, 
    createTransaction, 
    signTransaction, 
    kaspaToSompi 
} from './kaspa/kaspa.js';

const KASPA_API = "https://api.kaspa.org";
let isInitialized = false;

// 1. Инициализация WASM
async function initKaspa() {
    if (isInitialized) return;
    try {
        await init('./kaspa/kaspa_bg.wasm');
        isInitialized = true;
        console.log("Kaspa WASM ядро инициализировано");
    } catch (err) {
        console.error("Ошибка инициализации WASM:", err);
        throw err;
    }
}

// 2. Глобально доступные функции
window.showAddress = async function() {
    const addrDiv = document.getElementById('wallet-address');
    if (!addrDiv) return;
    addrDiv.innerText = "Генерация...";
    try {
        const address = await getPersistentAddress();
        addrDiv.innerText = address;
        document.getElementById('receive-section').style.display = 'block';
        await updateBalance();
    } catch (err) {
        addrDiv.innerText = "Ошибка генерации";
    }
};

window.sendTransaction = async function(toAddress, amountKAS) {
    try {
        await initKaspa(); 

        const mnemonicStr = localStorage.getItem('user_mnemonic');
        if (!mnemonicStr) throw new Error("Мнемоника не найдена");
        
        const seed = new Mnemonic(mnemonicStr).toSeed();
        const xprv = new XPrv(seed);
        const privateKey = xprv.derivePath("m/44'/111111'/0'/0/0").toPrivateKey();
        const sourceAddressStr = privateKey.toPublicKey().toAddress("mainnet").toString();

        console.log("Отправка с адреса:", sourceAddressStr);

        // Получаем UTXO
        const response = await fetch(`${KASPA_API}/addresses/${sourceAddressStr}/utxos`);
        const utxoData = await response.json();

        if (!utxoData || utxoData.length === 0) throw new Error("Недостаточно средств (нет UTXO)");

        // ПРЕОБРАЗОВАНИЕ В ОБЪЕКТЫ WASM
        const utxos = utxoData.map(u => ({
            outpoint: new TransactionOutpoint(new Hash(u.outpoint.transactionId), u.outpoint.index),
            utxoEntry: new TransactionUtxoEntry(
                BigInt(u.utxoEntry.amount), 
                u.utxoEntry.scriptPublicKey,
                BigInt(u.utxoEntry.blockDaaScore),
                u.utxoEntry.isCoinbase
            )
        }));

        // Считаем общую сумму входа
        const totalIn = utxoData.reduce((acc, u) => acc + BigInt(u.utxoEntry.amount), 0n);
        const sendSompi = BigInt(kaspaToSompi(amountKAS.toString()));
        const feeSompi = 1000n; // Минимальная комиссия 0.00001 KAS
        const changeSompi = totalIn - sendSompi - feeSompi;

        if (changeSompi < 0n) throw new Error("Недостаточно баланса для отправки и комиссии");

        // Формируем выходы: Получатель + Сдача (себе)
        const outputs = [
            { address: toAddress, amount: sendSompi }
        ];
        
        // Добавляем сдачу, если она есть
        if (changeSompi > 500n) {
            outputs.push({ address: sourceAddressStr, amount: changeSompi });
        }

        // Создаем транзакцию
        const tx = createTransaction(utxos, outputs, feeSompi, "", 1);

        // Подписываем
        const signedTx = signTransaction(tx, [privateKey], true);

        // ВАЖНО: Сериализуем для API (через метод toJSON или явную структуру)
        const txToSubmit = typeof signedTx.toJSON === 'function' ? signedTx.toJSON() : signedTx;

        // Отправляем
        const submitResponse = await fetch(`${KASPA_API}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction: txToSubmit })
        });

        const result = await submitResponse.json();
        
        if (result.transactionId) {
            console.log("Успех!", result.transactionId);
            alert("Транзакция отправлена!\nID: " + result.transactionId);
        } else {
            console.error("Ошибка API:", result);
            alert("Ошибка сети: " + (result.errors || result.message || JSON.stringify(result)));
        }

    } catch (err) {
        console.error("Ошибка:", err);
        alert("Ошибка: " + err.message);
    }
};

async function getPersistentAddress() {
    await initKaspa();
    let mnemonic = localStorage.getItem('user_mnemonic');
    if (!mnemonic) {
        if (typeof bip39 !== 'undefined') {
            mnemonic = bip39.generateMnemonic(128);
            localStorage.setItem('user_mnemonic', mnemonic);
        } else {
            throw new Error("Библиотека BIP39 не загружена");
        }
    }
    
    const m = new Mnemonic(mnemonic);
    const xprv = new XPrv(m.toSeed());
    const address = xprv.derivePath("m/44'/111111'/0'/0/0").toPrivateKey().toPublicKey().toAddress("mainnet").toString();
    
    localStorage.setItem('kaspa_address', address);
    return address;
}

async function updateBalance() {
    const address = localStorage.getItem('kaspa_address');
    if (!address) return;
    try {
        const response = await fetch(`${KASPA_API}/addresses/${address}/balance`);
        const data = await response.json();
        const balanceKAS = (data.balance || 0) / 100000000;
        
        const bEl = document.getElementById('kas-balance');
        if (bEl) bEl.innerText = balanceKAS.toFixed(8);
        const hEl = document.getElementById('total-balance-header');
        if (hEl) hEl.innerText = balanceKAS.toFixed(8);
    } catch (e) {
        console.error("Баланс ошибка:", e);
    }
}

updateBalance();