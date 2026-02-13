/**
 * ESP32 BLE Terminal - Full Working Version
 * Supports Nordic UART Service (NUS)
 */

// Nordic UART UUIDs
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

// Global variables
let bluetoothDevice = null;
let bleServer = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let isConnected = false;

// DOM Elements
let connectBtn;
let statusDot;
let statusText;
let terminal;
let commandInput;
let sendBtn;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {

    // Get DOM elements
    connectBtn = document.getElementById('connectBtn');
    statusDot = document.getElementById('statusDot');
    statusText = document.getElementById('statusText');
    terminal = document.getElementById('terminal');
    commandInput = document.getElementById('commandInput');
    sendBtn = document.getElementById('sendBtn');

    // Check Bluetooth support
    if (!navigator.bluetooth) {
        addTerminalLine("ERROR", "Web Bluetooth not supported. Use Chrome.", "error");
        connectBtn.disabled = true;
        return;
    }

    // Event listeners
    connectBtn.addEventListener('click', handleConnect);

    sendBtn.addEventListener('click', sendCommand);

    commandInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendCommand();
        }
    });

    addTerminalLine("SYSTEM", "Ready. Click Connect.", "success");
}

async function handleConnect() {
    if (isConnected) {
        disconnect();
    } else {
        await connect();
    }
}

async function connect() {

    try {

        addTerminalLine("SYSTEM", "Opening Bluetooth device chooser...", "warning");

        bluetoothDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [SERVICE_UUID]
        });

        addTerminalLine("BLE", "Device selected: " + bluetoothDevice.name, "success");

        bluetoothDevice.addEventListener(
            'gattserverdisconnected',
            onDisconnected
        );

        addTerminalLine("BLE", "Connecting to GATT Server...", "warning");

        bleServer = await bluetoothDevice.gatt.connect();

        const service = await bleServer.getPrimaryService(SERVICE_UUID);

        rxCharacteristic = await service.getCharacteristic(RX_UUID);

        txCharacteristic = await service.getCharacteristic(TX_UUID);

        await txCharacteristic.startNotifications();

        txCharacteristic.addEventListener(
            'characteristicvaluechanged',
            receiveData
        );

        isConnected = true;

        updateStatus(true);

        addTerminalLine("SUCCESS", "Connected successfully!", "success");

    }
    catch (error) {

        addTerminalLine("ERROR", error.message, "error");

        updateStatus(false);
    }
}

function disconnect() {

    if (bluetoothDevice && bluetoothDevice.gatt.connected) {

        bluetoothDevice.gatt.disconnect();
    }

    isConnected = false;

    updateStatus(false);

    addTerminalLine("SYSTEM", "Disconnected.", "warning");
}

function onDisconnected() {

    isConnected = false;

    updateStatus(false);

    addTerminalLine("SYSTEM", "Device disconnected.", "error");
}

async function sendCommand() {

    if (!isConnected) {

        addTerminalLine("ERROR", "Not connected.", "error");

        return;
    }

    const text = commandInput.value;

    if (!text) return;

    try {

        const encoder = new TextEncoder();

        await rxCharacteristic.writeValue(
            encoder.encode(text + "\n")
        );

        addTerminalLine("YOU", text, "warning");

        commandInput.value = "";

    }
    catch (error) {

        addTerminalLine("ERROR", error.message, "error");
    }
}

function receiveData(event) {

    const decoder = new TextDecoder();

    const value = decoder.decode(event.target.value);

    addTerminalLine("ESP32", value, "success");
}

function updateStatus(connected) {

    if (connected) {

        statusText.textContent = "Connected";

        statusDot.style.background = "lime";

        connectBtn.textContent = "Disconnect";

        commandInput.disabled = false;

        sendBtn.disabled = false;
    }
    else {

        statusText.textContent = "Disconnected";

        statusDot.style.background = "red";

        connectBtn.textContent = "Connect ESP32";

        commandInput.disabled = true;

        sendBtn.disabled = true;
    }
}

function addTerminalLine(prefix, message, type) {

    const div = document.createElement("div");

    div.innerHTML =
        `<span>[${prefix}]</span> ${message}`;

    div.style.marginBottom = "5px";

    terminal.appendChild(div);

    terminal.scrollTop = terminal.scrollHeight;
}