# 🌡️ ESP32 BLE Temperature Monitoring System

A complete IoT project that uses **ESP32** to read temperature from a DHT sensor and transmit data via **Bluetooth Low Energy (BLE)** directly to a web browser using the **Web Bluetooth API**.

**✨ Key Features:**
- ✅ No backend server required
- ✅ Direct browser-to-ESP32 communication
- ✅ Real-time temperature monitoring
- ✅ Terminal-style web interface
- ✅ Battery-powered ESP32 support
- ✅ Works on mobile (Chrome Android)
- ✅ Deployable to GitHub Pages

---

## 📋 Table of Contents
1. [System Architecture](#system-architecture)
2. [Hardware Requirements](#hardware-requirements)
3. [Software Requirements](#software-requirements)
4. [Hardware Setup](#hardware-setup)
5. [ESP32 Code Setup](#esp32-code-setup)
6. [Web Interface Setup](#web-interface-setup)
7. [Hosting on GitHub Pages](#hosting-on-github-pages)
8. [How to Use](#how-to-use)
9. [Troubleshooting](#troubleshooting)
10. [Project Structure](#project-structure)

---

## 🏗️ System Architecture

```
Temperature Sensor (DHT11/DHT22)
         ↓
ESP32 Microcontroller (BLE enabled)
         ↓
   Bluetooth Low Energy (BLE)
         ↓
Mobile Browser (Chrome Android) or Desktop Browser
         ↓
Hosted Website (GitHub Pages/Netlify)
         ↓
Terminal Interface (Web Bluetooth API)
```

**Important:** No Node.js, Python, or WebSocket backend needed!

---

## 🔧 Hardware Requirements

| Component | Quantity | Notes |
|-----------|----------|-------|
| ESP32 Development Board | 1 | Any ESP32 board with BLE |
| DHT11 or DHT22 Sensor | 1 | DHT11 for basic, DHT22 for better accuracy |
| 10kΩ Resistor | 1 | Pull-up resistor for DHT data line |
| LED (optional) | 1 | For testing commands |
| 220Ω Resistor (optional) | 1 | For LED current limiting |
| Jumper Wires | Several | Male-to-male or male-to-female |
| Breadboard | 1 | For prototyping |
| Battery (optional) | 1 | 3.7V Li-Po or USB power bank |

---

## 💻 Software Requirements

### For ESP32:
- Arduino IDE (v1.8.x or v2.x)
- ESP32 Board Package
- DHT Sensor Library
- BLE Libraries (included with ESP32 package)

### For Web Interface:
- Modern web browser with Web Bluetooth support:
  - ✅ Chrome Android (v56+)
  - ✅ Chrome Desktop (v56+)
  - ✅ Edge Desktop (v79+)
  - ❌ iOS Safari (not supported)
  - ❌ Firefox (not supported yet)

---

## 🔌 Hardware Setup

### DHT11/DHT22 Connection:

```
DHT Sensor    ESP32
---------     -----
VCC     -->   3.3V
GND     -->   GND
DATA    -->   GPIO 4 (with 10kΩ pull-up to 3.3V)
```

### LED Connection (Optional):

```
LED          ESP32
---          -----
Anode   -->  GPIO 2
Cathode -->  GND (via 220Ω resistor)
```

### Wiring Diagram:

```
                     ESP32
                   ┌─────────┐
        3.3V ──────┤ 3.3V    │
                   │         │
DHT VCC ───────────┤         │
                   │  GPIO 4 ├──── DHT DATA (with 10kΩ to 3.3V)
                   │         │
                   │  GPIO 2 ├──── LED Anode (via 220Ω)
                   │         │
DHT GND ───────────┤ GND     │
LED GND ───────────┤         │
                   └─────────┘
```

---

## 📲 ESP32 Code Setup

### Step 1: Install Arduino IDE
Download from: https://www.arduino.cc/en/software

### Step 2: Install ESP32 Board Package

1. Open Arduino IDE
2. Go to **File** → **Preferences**
3. Add this URL to "Additional Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools** → **Board** → **Boards Manager**
5. Search for "ESP32"
6. Install "esp32 by Espressif Systems"

### Step 3: Install DHT Sensor Library

1. Go to **Sketch** → **Include Library** → **Manage Libraries**
2. Search for "DHT sensor library"
3. Install "DHT sensor library by Adafruit"
4. Also install "Adafruit Unified Sensor" (dependency)

### Step 4: Upload Code to ESP32

1. Open `esp32_ble_temperature.ino` in Arduino IDE
2. Select your ESP32 board: **Tools** → **Board** → **ESP32 Dev Module**
3. Select correct COM port: **Tools** → **Port** → (your ESP32 port)
4. If using DHT22 instead of DHT11:
   - Comment line: `#define DHTTYPE DHT11`
   - Uncomment line: `#define DHTTYPE DHT22`
5. Click **Upload** button (→)
6. Wait for "Done uploading" message

### Step 5: Verify Upload

1. Open Serial Monitor: **Tools** → **Serial Monitor**
2. Set baud rate to **115200**
3. You should see:
   ```
   ESP32 BLE Temperature Sensor Starting...
   DHT sensor initialized
   BLE initialized. Device name: ESP32_TEMP_SENSOR
   Advertising started. Waiting for connection...
   ```

---

## 🌐 Web Interface Setup

### Local Testing (Optional):

You can test locally before hosting:

1. Open `index.html` directly in Chrome
2. **Note:** File protocol (`file://`) may have limitations
3. For full functionality, use a local server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (if installed)
   npx http-server
   ```
4. Open: `http://localhost:8000`

---

## 🚀 Hosting on GitHub Pages

### Method 1: Upload via GitHub Web Interface

1. **Create GitHub Account** (if you don't have one)
   - Go to: https://github.com
   - Click "Sign up"

2. **Create New Repository**
   - Click "+" → "New repository"
   - Repository name: `esp32-ble-temperature`
   - Make it **Public**
   - Click "Create repository"

3. **Upload Files**
   - Click "uploading an existing file"
   - Drag and drop ALL files:
     - `index.html`
     - `css/style.css`
     - `js/ble.js`
     - `README.md`
   - Keep folder structure intact!
   - Click "Commit changes"

4. **Enable GitHub Pages**
   - Go to repository "Settings"
   - Scroll to "Pages" section
   - Under "Source", select "main" branch
   - Click "Save"
   - Wait 1-2 minutes

5. **Access Your Site**
   - URL will be: `https://your-username.github.io/esp32-ble-temperature/`
   - Copy this URL

### Method 2: Using Git (Advanced)

```bash
# Clone your repository
git clone https://github.com/your-username/esp32-ble-temperature.git
cd esp32-ble-temperature

# Copy project files to repository
cp -r /path/to/project/* .

# Commit and push
git add .
git commit -m "Initial commit - ESP32 BLE Temperature Monitor"
git push origin main

# Enable GitHub Pages in Settings
```

---

## 📱 How to Use

### Step 1: Power ESP32
- Connect ESP32 to battery or USB power
- LED should blink 3 times (ready state)

### Step 2: Open Website on Mobile
1. Open Chrome browser on Android phone
2. Enable Bluetooth on phone
3. Go to your hosted URL: `https://your-username.github.io/esp32-ble-temperature/`

### Step 3: Connect to ESP32
1. Click "📡 Connect to ESP32" button
2. Bluetooth pairing dialog will appear
3. Look for "ESP32_TEMP_SENSOR"
4. Click "Pair"

### Step 4: View Temperature Data
- Terminal will show connection status
- Temperature readings appear every 2 seconds
- Large temperature display updates in real-time

### Step 5: Send Commands
**Quick Commands:**
- 📊 Status - Get current sensor status
- 💡 LED ON - Turn LED on
- 🔌 LED OFF - Turn LED off

**Custom Commands:**
- Type in command box and press Enter
- Available commands:
  - `STATUS` - System status
  - `LED ON` - Turn LED on
  - `LED OFF` - Turn LED off
  - `TEMP` - Get immediate temperature
  - `HELLO` - Test communication
  - `HELP` - Show commands

---

## 🔧 Troubleshooting

### ESP32 Issues:

**Problem:** Code won't upload
- **Solution:** Press and hold "BOOT" button while clicking upload
- Check correct COM port selected
- Check USB cable (some are charge-only)

**Problem:** Temperature shows "nan" or error
- **Solution:** Check DHT sensor wiring
- Verify 10kΩ pull-up resistor connected
- Try different GPIO pin
- Replace sensor if faulty

**Problem:** BLE not advertising
- **Solution:** Restart ESP32
- Check Serial Monitor for errors
- Ensure BLE not disabled in code

### Website Issues:

**Problem:** "Web Bluetooth API not supported"
- **Solution:** Use Chrome Android or Chrome Desktop
- iOS Safari doesn't support Web Bluetooth
- Firefox doesn't support Web Bluetooth yet

**Problem:** Can't find ESP32_TEMP_SENSOR
- **Solution:** ESP32 must be powered and running
- Check ESP32 Serial Monitor shows "Advertising"
- Restart ESP32
- Disable/enable Bluetooth on phone

**Problem:** Connection fails immediately
- **Solution:** Website must be HTTPS (GitHub Pages is HTTPS)
- Clear browser cache
- Restart phone Bluetooth
- Move phone closer to ESP32

**Problem:** No temperature data received
- **Solution:** Check ESP32 Serial Monitor for errors
- Verify DHT sensor working
- Restart connection

### GitHub Pages Issues:

**Problem:** 404 error on GitHub Pages
- **Solution:** Wait 2-3 minutes after enabling Pages
- Check files uploaded to root directory
- Verify repository is public

**Problem:** Page loads but doesn't work
- **Solution:** Check browser console for errors
- Verify all files (HTML, CSS, JS) uploaded
- Check folder structure maintained

---

## 📂 Project Structure

```
iot-ble-terminal/
│
├── index.html              # Main HTML file
├── css/
│   └── style.css          # Cyber-themed terminal styling
├── js/
│   └── ble.js             # Web Bluetooth API logic
├── esp32_ble_temperature.ino  # ESP32 Arduino code
└── README.md              # This file
```

---

## 🧠 How It Works

### ESP32 Side:
1. **Initialization:** ESP32 starts BLE and creates Nordic UART Service
2. **Advertising:** Broadcasts device name "ESP32_TEMP_SENSOR"
3. **Temperature Reading:** Reads DHT sensor every 2 seconds
4. **BLE Transmission:** Sends data via TX characteristic
5. **Command Processing:** Listens for commands on RX characteristic

### Web Interface Side:
1. **Connection:** Uses Web Bluetooth API to scan for ESP32
2. **Service Discovery:** Connects to Nordic UART Service (NUS)
3. **Notifications:** Subscribes to TX characteristic for incoming data
4. **Data Parsing:** Extracts temperature from received strings
5. **Display:** Updates terminal and temperature card
6. **Commands:** Sends user commands via RX characteristic

### Communication Protocol:
```
ESP32 → Browser (TX Characteristic):
  "Temperature: 25.5 °C | Humidity: 60.2 %"

Browser → ESP32 (RX Characteristic):
  "STATUS\n"
  "LED ON\n"
  "LED OFF\n"
```

---

## 🎯 Key Advantages

✅ **No Backend:** Pure frontend + ESP32, no server needed  
✅ **Battery Powered:** ESP32 runs on battery, mobile friendly  
✅ **Direct Connection:** Browser talks directly to ESP32 via BLE  
✅ **Low Power:** BLE is energy efficient  
✅ **Easy Hosting:** Free hosting on GitHub Pages  
✅ **Open Source:** Modify and extend freely  

---

## 🔒 Security Notes

- BLE connection is local (10-100 meter range)
- No internet connection required for ESP32
- Data transmitted over BLE (not encrypted in this basic version)
- For production: implement BLE pairing and encryption

---

## 🚀 Future Enhancements

Possible improvements:
- [ ] Add multiple sensor support (pressure, humidity, etc.)
- [ ] Data logging and graphing
- [ ] Battery level indicator
- [ ] Sleep mode for power saving
- [ ] Encrypted BLE communication
- [ ] PWA (Progressive Web App) support
- [ ] Multiple ESP32 device support
- [ ] Export data to CSV

---

## 📚 References

- [Web Bluetooth API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [ESP32 BLE Arduino Library](https://github.com/nkolban/ESP32_BLE_Arduino)
- [Nordic UART Service Specification](https://developer.nordicsemi.com/nRF_Connect_SDK/doc/latest/nrf/libraries/bluetooth_services/services/nus.html)
- [DHT Sensor Library](https://github.com/adafruit/DHT-sensor-library)

---

## 📧 Support

If you encounter issues:
1. Check Serial Monitor on ESP32
2. Check Browser Console (F12)
3. Review troubleshooting section
4. Verify all connections and settings

---

## 📄 License

This project is open source. Feel free to use, modify, and distribute for educational purposes.

---

## 👨‍🎓 About This Project

This is a college IoT project demonstrating:
- **IoT Concepts:** Sensor integration, wireless communication
- **Web Technologies:** HTML, CSS, JavaScript, Web Bluetooth API
- **Embedded Systems:** ESP32 programming, BLE communication
- **Cloud Deployment:** GitHub Pages hosting

Perfect for demonstrating modern IoT architectures without complex backend infrastructure!

---

**Made with ❤️ for IoT Education**

*Star ⭐ this repository if you found it helpful!*
