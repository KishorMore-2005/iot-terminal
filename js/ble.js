const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const RX_UUID      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // browser → ESP32
const TX_UUID      = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // ESP32 → browser

let bluetoothDevice    = null;
let rxCharacteristic   = null;
let txCharacteristic   = null;
let isConnected        = false;

let connectBtn, statusText, terminal, commandInput, sendBtn;

document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    connectBtn   = document.getElementById('connectBtn');
    statusText   = document.getElementById('statusText');
    terminal     = document.getElementById('terminal');
    commandInput = document.getElementById('commandInput');
    sendBtn      = document.getElementById('sendBtn');

    if (!navigator.bluetooth) {
        addTerminalLine("ERROR", "Web Bluetooth not supported. Use Chrome.", "error");
        connectBtn.disabled = true;
        return;
    }

    connectBtn.addEventListener('click', handleConnect);
    sendBtn.addEventListener('click', sendCommand);
    commandInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendCommand(); });

    addTerminalLine("SYSTEM", "Ready. Click CONNECT ESP32.", "success");
}

async function handleConnect() {
    if (isConnected) disconnect();
    else await connect();
}

async function connect() {
    try {
        addTerminalLine("SYSTEM", "Opening Bluetooth chooser...", "warning");

        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'ESP32_TEMP_SENSOR' }], // matches your ESP32 firmware name
            optionalServices: [SERVICE_UUID]
        });

        addTerminalLine("BLE", "Selected: " + bluetoothDevice.name, "info");

        // ✅ FIX: attach disconnect listener BEFORE connecting
        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

        addTerminalLine("SYSTEM", "Connecting...", "warning");

        const server  = await bluetoothDevice.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);

        // RX = browser writes to ESP32
        rxCharacteristic = await service.getCharacteristic(RX_UUID);

        // TX = ESP32 notifies browser
        txCharacteristic = await service.getCharacteristic(TX_UUID);
        await txCharacteristic.startNotifications();
        txCharacteristic.addEventListener('characteristicvaluechanged', receiveData);

        // ✅ Only mark connected AFTER everything is fully ready
        isConnected = true;
        updateStatus(true);
        addTerminalLine("SUCCESS", "ESP32 Connected! Try: HELP", "success");

    } catch (error) {
        addTerminalLine("ERROR", error.message, "error");
        updateStatus(false);
    }
}

function disconnect() {
    if (bluetoothDevice?.gatt?.connected) bluetoothDevice.gatt.disconnect();
    isConnected = false;
    updateStatus(false);
}

function onDisconnected() {
    // ✅ FIX: short delay prevents false disconnect during BLE negotiation
    setTimeout(() => {
        if (!bluetoothDevice?.gatt?.connected) {
            isConnected = false;
            updateStatus(false);
            addTerminalLine("SYSTEM", "ESP32 disconnected.", "error");
        }
    }, 1000);
}

async function sendCommand() {
    if (!isConnected || !rxCharacteristic) {
        addTerminalLine("ERROR", "Not connected.", "error");
        return;
    }

    const text = commandInput.value.trim();
    if (!text) return;

    try {
        const data = new TextEncoder().encode(text);

        // ✅ Prefer writeWithoutResponse if available (faster for NUS)
        if (rxCharacteristic.properties.writeWithoutResponse) {
            await rxCharacteristic.writeValueWithoutResponse(data);
        } else {
            await rxCharacteristic.writeValue(data);
        }

        addTerminalLine("YOU", text, "warning");
        commandInput.value = "";

    } catch (error) {
        addTerminalLine("ERROR", error.message, "error");
    }
}

function receiveData(event) {
    const value = new TextDecoder().decode(event.target.value);
    addTerminalLine("ESP32", value, "success");
}

function updateStatus(connected) {
    if (connected) {
        statusText.textContent = "● Connected";
        statusText.style.color = "#00ff88";
        connectBtn.textContent = "DISCONNECT";
        commandInput.disabled  = false;
        sendBtn.disabled       = false;
    } else {
        statusText.textContent = "● Disconnected";
        statusText.style.color = "#ff4444";
        connectBtn.textContent = "CONNECT ESP32";
        commandInput.disabled  = true;
        sendBtn.disabled       = true;
    }
}

// ✅ FIX: actually uses the 'type' parameter for color
function addTerminalLine(prefix, message, type = 'info') {
    const colors = {
        success: '#00ff88',
        error:   '#ff4444',
        warning: '#ffaa00',
        info:    '#00f3ff'
    };
    const div = document.createElement("div");
    div.style.color = colors[type] || colors.info;
    div.innerHTML = `<span>[${prefix}]</span> ${escapeHtml(message)}`;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}