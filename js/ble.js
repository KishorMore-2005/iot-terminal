/**
 * ESP32 BLE Temperature Monitor - Bluetooth Logic
 * Uses Web Bluetooth API to connect directly to ESP32
 * Nordic UART Service (NUS) for BLE communication
 */

// Nordic UART Service UUIDs
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write to ESP32
const TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Read from ESP32

// Global variables
let bluetoothDevice = null;
let bleServer = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let isConnected = false;

// DOM Elements (initialized on DOMContentLoaded)
let connectBtn = null;
let statusDot = null;
let statusText = null;
let terminal = null;
let clearBtn = null;
let commandInput = null;
let sendBtn = null;
let commandButtons = [];
let tempValue = null;
let lastUpdate = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/**
 * Initialize application
 */
function initializeApp() {
    // Check Web Bluetooth support
    if (!navigator.bluetooth) {
        // terminal might not be initialized yet; log to console
        console.error('Web Bluetooth API not supported! Use Chrome on Android or Desktop.');
        // still try to set up DOM so user sees disabled controls
        return;

    // Initialize DOM references (safe)
    connectBtn = document.getElementById('connectBtn');
    statusDot = document.getElementById('statusDot');
    statusText = document.getElementById('statusText');
    terminal = document.getElementById('terminal');
    clearBtn = document.getElementById('clearBtn');
    commandInput = document.getElementById('commandInput');
    sendBtn = document.getElementById('sendBtn');
    commandButtons = Array.from(document.querySelectorAll('.btn-command'));
    tempValue = document.getElementById('tempValue');
    lastUpdate = document.getElementById('lastUpdate');

    // Event Listeners (guarded)
    if (connectBtn) connectBtn.addEventListener('click', handleConnect);
    if (clearBtn) clearBtn.addEventListener('click', clearTerminal);
    if (sendBtn) sendBtn.addEventListener('click', sendCommand);
    // Allow typing before connection; only send on Enter when sendBtn is enabled
    if (commandInput) commandInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && sendBtn && !sendBtn.disabled) sendCommand();
    });

    // Quick command buttons (disabled until connected)
    commandButtons.forEach(btn => {
        btn.disabled = true;
        btn.addEventListener('click', () => {
            const command = btn.getAttribute('data-command');
            sendCommandToESP32(command);
        });
    });

    addTerminalLine('SYSTEM', 'Application initialized. Bluetooth ready.', 'success');

    // If navigator.bluetooth unsupported, disable connect button
    if (!navigator.bluetooth && connectBtn) connectBtn.disabled = true;
    addTerminalLine('SYSTEM', 'Application initialized. Bluetooth ready.', 'success');
}

/**
 * Handle Connect/Disconnect button click
 */
async function handleConnect() {
    if (isConnected) {
        disconnect();
    } else {
        await connect();
    }
}

/**
 * Connect to ESP32 via BLE
 */
async function connect() {
    try {
        addTerminalLine('SYSTEM', 'Scanning for ESP32 devices...', 'warning');
        connectBtn.disabled = true;

        // Request Bluetooth device (first try with specific filters)
        try {
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                filters: [
                    { name: 'ESP32_TEMP_SENSOR' },
                    { services: [SERVICE_UUID] }
                ],
                optionalServices: [SERVICE_UUID]
            });
        } catch (err) {
            // If no device found or user canceled, try a permissive chooser as a fallback
            console.warn('Initial requestDevice failed:', err);
            addTerminalLine('SYSTEM', `No device selected with filters — opening device chooser...`, 'warning');
            try {
                bluetoothDevice = await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: [SERVICE_UUID]
                });
            } catch (err2) {
                // User likely cancelled or the browser blocked the request
                console.error('Fallback requestDevice failed:', err2);
                throw err2; // rethrow to outer catch
            }
        }

        addTerminalLine('BLE', `Found device: ${bluetoothDevice.name}`, 'success');
        
        // Listen for disconnection
        bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

        // Connect to GATT Server
        addTerminalLine('BLE', 'Connecting to GATT Server...', 'warning');
        bleServer = await bluetoothDevice.gatt.connect();
        
        // Get Nordic UART Service
        addTerminalLine('BLE', 'Getting UART Service...', 'warning');
        const service = await bleServer.getPrimaryService(SERVICE_UUID);
        
        // Get RX and TX characteristics
        rxCharacteristic = await service.getCharacteristic(RX_UUID);
        txCharacteristic = await service.getCharacteristic(TX_UUID);
        
        // Start notifications for receiving data
        await txCharacteristic.startNotifications();
        txCharacteristic.addEventListener('characteristicvaluechanged', handleNotification);
        
        // Update UI
        isConnected = true;
        updateConnectionStatus(true);
        addTerminalLine('SUCCESS', '✓ Connected to ESP32! Waiting for temperature data...', 'success');
        
        connectBtn.textContent = '🔌 Disconnect';
        connectBtn.disabled = false;
        
    } catch (error) {
        console.error('Connection error:', error);
        addTerminalLine('ERROR', `Connection failed: ${error.message}`, 'error');
        connectBtn.disabled = false;
        updateConnectionStatus(false);
    }
}

/**
 * Disconnect from ESP32
 */
function disconnect() {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
        addTerminalLine('SYSTEM', 'Disconnected from ESP32', 'warning');
    }
    
    isConnected = false;
    updateConnectionStatus(false);
    connectBtn.textContent = '📡 Connect to ESP32';
    connectBtn.disabled = false;
}

/**
 * Handle disconnection event
 */
function onDisconnected() {
    addTerminalLine('SYSTEM', 'ESP32 disconnected!', 'error');
    isConnected = false;
    updateConnectionStatus(false);
    connectBtn.textContent = '📡 Connect to ESP32';
    connectBtn.disabled = false;
}

/**
 * Handle incoming data notifications from ESP32
 */
function handleNotification(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const data = decoder.decode(value).trim();
    
    // Parse temperature data
    if (data.includes('Temperature:')) {
        const tempMatch = data.match(/Temperature:\s*([\d.]+)/);
        if (tempMatch) {
            const temp = tempMatch[1];
            updateTemperature(temp);
            addTerminalLine('ESP32', `📡 ${data}`, 'success');
        }
    } else {
        // Other messages from ESP32
        addTerminalLine('ESP32', data);
    }
}

/**
 * Send command to ESP32
 */
async function sendCommand() {
    // allow optional string argument: sendCommand('LED ON')
    const arg = arguments[0];
    let command = '';
    if (typeof arg === 'string') command = arg.trim();
    else if (commandInput) command = commandInput.value.trim();
    if (!command) return;

    await sendCommandToESP32(command);
    if (commandInput) commandInput.value = '';
}

/**
 * Send command to ESP32 via BLE
 */
async function sendCommandToESP32(command) {
    if (!isConnected || !rxCharacteristic) {
        addTerminalLine('ERROR', 'Not connected to ESP32!', 'error');
        return;
    }

    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(command + '\n');
        await rxCharacteristic.writeValue(data);
        addTerminalLine('YOU', `→ ${command}`, 'warning');
    } catch (error) {
        console.error('Send error:', error);
        addTerminalLine('ERROR', `Failed to send command: ${error.message}`, 'error');
    }
}

/**
 * Update temperature display
 */
function updateTemperature(temp) {
    if (tempValue) tempValue.textContent = temp;
    // Update timestamp
    if (lastUpdate) lastUpdate.textContent = new Date().toLocaleTimeString();
    // Add visual feedback if supported
    if (tempValue && tempValue.style) {
        tempValue.style.animation = 'none';
        setTimeout(() => {
            tempValue.style.animation = 'fadeIn 0.5s ease';
        }, 10);
    }
}

/**
 * Update connection status UI
 */
function updateConnectionStatus(connected) {
    if (connected) {
        if (statusDot) statusDot.classList.add('connected');
        if (statusText) { statusText.textContent = 'Connected'; statusText.style.color = 'var(--success-color)'; }

        // Enable input controls
        if (commandInput) commandInput.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        commandButtons.forEach(btn => { if (btn) btn.disabled = false; });
    } else {
        if (statusDot) statusDot.classList.remove('connected');
        if (statusText) { statusText.textContent = 'Disconnected'; statusText.style.color = 'var(--error-color)'; }

        // Disable input controls
        if (commandInput) commandInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
        commandButtons.forEach(btn => { if (btn) btn.disabled = true; });

        // Reset temperature display
        if (tempValue) tempValue.textContent = '--';
        if (lastUpdate) lastUpdate.textContent = 'Never';
    }
}

/**
 * Add line to terminal output
 */
function addTerminalLine(prefix, text, className = '') {
    if (!terminal) {
        // Fallback: log to console if terminal DOM not available
        console.log(`[${new Date().toLocaleTimeString()}] [${prefix}] ${text}`);
        return;
    }

    const line = document.createElement('div');
    line.className = 'terminal-line';

    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = `[${new Date().toLocaleTimeString()}]`;

    const promptSpan = document.createElement('span');
    promptSpan.className = 'prompt';
    promptSpan.textContent = `[${prefix}]`;

    const textSpan = document.createElement('span');
    textSpan.className = className ? className : 'text';
    textSpan.textContent = text;

    line.appendChild(timestamp);
    line.appendChild(promptSpan);
    line.appendChild(textSpan);

    terminal.appendChild(line);

    // Auto-scroll to bottom
    terminal.scrollTop = terminal.scrollHeight;

    // Limit terminal lines (keep last 100)
    while (terminal.children.length > 100) {
        terminal.removeChild(terminal.firstChild);
    }
}

/**
 * Clear terminal
 */
function clearTerminal() {
    terminal.innerHTML = '';
    addTerminalLine('SYSTEM', 'Terminal cleared.', 'success');
}

/**
 * Utility: Convert string to ArrayBuffer
 */
function str2ab(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

/**
 * Utility: Convert ArrayBuffer to string
 */
function ab2str(buffer) {
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
}

// Export functions for debugging (optional)
window.bleDebug = {
    connect,
    disconnect,
    sendCommand: sendCommandToESP32,
    getStatus: () => ({
        connected: isConnected,
        device: bluetoothDevice?.name || 'None'
    })
};
