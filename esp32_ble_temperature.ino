/*
 * ESP32 BLE Temperature Sensor
 * Sends temperature data via Bluetooth Low Energy (BLE)
 * Uses Nordic UART Service (NUS) for communication
 * Compatible with Web Bluetooth API
 * 
 * Hardware Required:
 * - ESP32 DevKit
 * - DHT11 or DHT22 temperature sensor
 * - LED (optional, for command testing)
 * - 10K resistor (pull-up for DHT sensor)
 * 
 * Connections:
 * DHT11/DHT22:
 *   - VCC  -> 3.3V
 *   - GND  -> GND
 *   - DATA -> GPIO 4 (with 10K pull-up to 3.3V)
 * 
 * LED (Optional):
 *   - Anode  -> GPIO 2
 *   - Cathode -> GND (via 220Ω resistor)
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <DHT.h>

// DHT Sensor Configuration
#define DHTPIN 4          // GPIO pin connected to DHT sensor
#define DHTTYPE DHT11     // Change to DHT22 if using DHT22 sensor
//#define DHTTYPE DHT22   // Uncomment this line if using DHT22

// LED Pin (optional)
#define LED_PIN 2         // Built-in LED on most ESP32 boards

// BLE Configuration
#define SERVICE_UUID        "6e400001-b5a3-f393-e0a9-e50e24dcca9e"  // Nordic UART Service
#define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"  // Receive from client
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"  // Send to client

// Global Variables
DHT dht(DHTPIN, DHTTYPE);
BLEServer *pServer = NULL;
BLECharacteristic *pTxCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
unsigned long lastTempUpdate = 0;
const unsigned long tempUpdateInterval = 2000; // Send temperature every 2 seconds

// BLE Callbacks
class MyServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        Serial.println("Client connected!");
    }

    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        Serial.println("Client disconnected!");
    }
};

// Callback for receiving data from client
class MyCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        std::string rxValue = pCharacteristic->getValue();

        if (rxValue.length() > 0) {
            String command = "";
            for (int i = 0; i < rxValue.length(); i++) {
                command += rxValue[i];
            }
            
            command.trim();
            Serial.println("Received command: " + command);
            
            // Process commands
            processCommand(command);
        }
    }
};

void setup() {
    Serial.begin(115200);
    Serial.println("ESP32 BLE Temperature Sensor Starting...");

    // Initialize DHT sensor
    dht.begin();
    Serial.println("DHT sensor initialized");

    // Initialize LED
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    // Initialize BLE
    initBLE();

    Serial.println("System ready! Waiting for BLE connection...");
    
    // Blink LED to indicate ready state
    blinkLED(3, 200);
}

void loop() {
    // Handle BLE connection state changes
    handleBLEConnection();

    // Send temperature data periodically if connected
    if (deviceConnected) {
        unsigned long currentMillis = millis();
        
        if (currentMillis - lastTempUpdate >= tempUpdateInterval) {
            lastTempUpdate = currentMillis;
            sendTemperatureData();
        }
    }

    delay(10); // Small delay to prevent watchdog issues
}

/**
 * Initialize BLE
 */
void initBLE() {
    // Create BLE Device
    BLEDevice::init("ESP32_TEMP_SENSOR");

    // Create BLE Server
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new MyServerCallbacks());

    // Create BLE Service
    BLEService *pService = pServer->createService(SERVICE_UUID);

    // Create TX Characteristic (ESP32 sends data to client)
    pTxCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID_TX,
        BLECharacteristic::PROPERTY_NOTIFY
    );
    pTxCharacteristic->addDescriptor(new BLE2902());

    // Create RX Characteristic (ESP32 receives data from client)
    BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID_RX,
        BLECharacteristic::PROPERTY_WRITE
    );
    pRxCharacteristic->setCallbacks(new MyCallbacks());

    // Start the service
    pService->start();

    // Start advertising
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("BLE initialized. Device name: ESP32_TEMP_SENSOR");
    Serial.println("Advertising started. Waiting for connection...");
}

/**
 * Handle BLE connection state changes
 */
void handleBLEConnection() {
    // Disconnecting
    if (!deviceConnected && oldDeviceConnected) {
        delay(500); // Give the bluetooth stack time to get ready
        pServer->startAdvertising(); // Restart advertising
        Serial.println("Start advertising again...");
        oldDeviceConnected = deviceConnected;
    }
    
    // Connecting
    if (deviceConnected && !oldDeviceConnected) {
        oldDeviceConnected = deviceConnected;
    }
}

/**
 * Read and send temperature data
 */
void sendTemperatureData() {
    // Read temperature as Celsius
    float temperature = dht.readTemperature();
    
    // Read humidity (optional - can be sent too)
    float humidity = dht.readHumidity();

    // Check if reading failed
    if (isnan(temperature) || isnan(humidity)) {
        Serial.println("Failed to read from DHT sensor!");
        sendMessage("Error: Sensor read failed!");
        return;
    }

    // Create message
    String message = "Temperature: " + String(temperature, 1) + " °C | Humidity: " + String(humidity, 1) + " %";
    
    // Send via BLE
    sendMessage(message);
    
    // Print to Serial for debugging
    Serial.println(message);
}

/**
 * Send message to BLE client
 */
void sendMessage(String message) {
    if (deviceConnected) {
        pTxCharacteristic->setValue(message.c_str());
        pTxCharacteristic->notify();
    }
}

/**
 * Process commands received from BLE client
 */
void processCommand(String command) {
    command.toUpperCase(); // Convert to uppercase for case-insensitive matching
    
    if (command == "STATUS") {
        // Send current status
        float temp = dht.readTemperature();
        float hum = dht.readHumidity();
        
        if (!isnan(temp) && !isnan(hum)) {
            String status = "Status: Temperature=" + String(temp, 1) + "°C, Humidity=" + String(hum, 1) + "%, LED=" + (digitalRead(LED_PIN) ? "ON" : "OFF");
            sendMessage(status);
        } else {
            sendMessage("Status: Sensor Error!");
        }
    }
    else if (command == "LED ON" || command == "LEDON") {
        // Turn LED on
        digitalWrite(LED_PIN, HIGH);
        sendMessage("LED turned ON");
        Serial.println("LED: ON");
    }
    else if (command == "LED OFF" || command == "LEDOFF") {
        // Turn LED off
        digitalWrite(LED_PIN, LOW);
        sendMessage("LED turned OFF");
        Serial.println("LED: OFF");
    }
    else if (command == "TEMP") {
        // Send immediate temperature reading
        sendTemperatureData();
    }
    else if (command == "HELLO" || command == "HI") {
        sendMessage("Hello! ESP32 Temperature Sensor ready!");
    }
    else if (command == "HELP") {
        sendMessage("Commands: STATUS, LED ON, LED OFF, TEMP, HELLO, HELP");
    }
    else {
        // Unknown command
        sendMessage("Unknown command: " + command + ". Try HELP");
        Serial.println("Unknown command received: " + command);
    }
}

/**
 * Blink LED for visual feedback
 */
void blinkLED(int times, int delayMs) {
    for (int i = 0; i < times; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(delayMs);
        digitalWrite(LED_PIN, LOW);
        delay(delayMs);
    }
}
