/**
 * ESP32 BLE Terminal - Clean Final Version
 * Nordic UART Service Compatible
 */

const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

let bluetoothDevice = null;
let bleServer = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let isConnected = false;

let connectBtn;
let statusText;
let terminal;
let commandInput;
let sendBtn;


document.addEventListener('DOMContentLoaded', initializeApp);


function initializeApp() {

    connectBtn = document.getElementById('connectBtn');
    statusText = document.getElementById('statusText');
    terminal = document.getElementById('terminal');
    commandInput = document.getElementById('commandInput');
    sendBtn = document.getElementById('sendBtn');

    if (!navigator.bluetooth) {

        addTerminalLine("ERROR", "Web Bluetooth not supported. Use Chrome.", "error");

        connectBtn.disabled = true;
        return;
    }

    connectBtn.addEventListener('click', handleConnect);
    sendBtn.addEventListener('click', sendCommand);

    commandInput.addEventListener('keypress', function(e) {

        if (e.key === 'Enter') sendCommand();
    });

    addTerminalLine("SYSTEM", "Ready. Click CONNECT ESP32.", "success");
}


async function handleConnect() {

    if (isConnected)
        disconnect();
    else
        await connect();
}


async function connect() {

    try {

        addTerminalLine("SYSTEM", "Opening Bluetooth chooser...", "warning");

        bluetoothDevice = await navigator.bluetooth.requestDevice({

            acceptAllDevices: true,
            optionalServices: [SERVICE_UUID]
        });

        addTerminalLine("BLE", "Selected: " + bluetoothDevice.name, "success");

        bluetoothDevice.addEventListener(
            'gattserverdisconnected',
            onDisconnected
        );

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

        addTerminalLine("SUCCESS", "ESP32 Connected!", "success");

    }
    catch(error){

        addTerminalLine("ERROR", error.message, "error");

        updateStatus(false);
    }
}


function disconnect(){

    if(bluetoothDevice && bluetoothDevice.gatt.connected)
        bluetoothDevice.gatt.disconnect();

    isConnected = false;

    updateStatus(false);
}


function onDisconnected(){

    isConnected = false;

    updateStatus(false);

    addTerminalLine("SYSTEM", "ESP32 disconnected.", "error");
}


async function sendCommand(){

    if(!isConnected || !rxCharacteristic){

        addTerminalLine("ERROR", "Not connected.", "error");
        return;
    }

    const text = commandInput.value.trim();

    if(!text) return;

    try{

        const encoder = new TextEncoder();
        const data = encoder.encode(text);

        if(rxCharacteristic.properties.writeWithoutResponse){

            await rxCharacteristic.writeValueWithoutResponse(data);

        }else{

            await rxCharacteristic.writeValue(data);
        }

        addTerminalLine("YOU", text, "warning");

        commandInput.value = "";

    }
    catch(error){

        addTerminalLine("ERROR", error.message, "error");
    }
}


function receiveData(event){

    const decoder = new TextDecoder();

    const value = decoder.decode(event.target.value);

    addTerminalLine("ESP32", value, "success");
}


function updateStatus(connected){

    if(connected){

        statusText.textContent = "Connected";
        statusText.style.color = "lime";

        connectBtn.textContent = "Disconnect";

        commandInput.disabled = false;
        sendBtn.disabled = false;

    }else{

        statusText.textContent = "Disconnected";
        statusText.style.color = "red";

        connectBtn.textContent = "CONNECT ESP32";

        commandInput.disabled = true;
        sendBtn.disabled = true;
    }
}


function addTerminalLine(prefix, message){

    const div = document.createElement("div");

    div.innerHTML = `<span>[${prefix}]</span> ${message}`;

    terminal.appendChild(div);

    terminal.scrollTop = terminal.scrollHeight;
}