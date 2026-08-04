/*
 * SAFE-FUSE AI — ESP32 Sensor Firmware
 * ======================================
 * Predictive AI-Powered Industrial Safety Intelligence Platform
 * Predict • Explain • Act • Prevent
 *
 * Hardware:
 *  - ESP32 Dev Module
 *  - DHT22 — Temperature & Humidity (GPIO4)
 *  - MQ-2  — Smoke/Gas Sensor (GPIO34 ADC)
 *  - MQ-135 — Air Quality/Gas (GPIO35 ADC)
 *  - GP2Y1010AU0F — Dust Sensor (GPIO32 ADC, GPIO25 LED)
 *  - IR Flame Sensor — Digital (GPIO26)
 *  - ACS712 20A — Current Sensor (GPIO33 ADC)
 *  - 2-Channel Relay Module (GPIO14=Relay1/Fan, GPIO27=Relay2/Humidifier)
 *  - Active Buzzer (GPIO13)
 *  - Warning LED (GPIO12)
 *  - SSD1306 OLED 128x64 (I2C: SDA=GPIO21, SCL=GPIO22)
 *
 * MQTT Topics:
 *  Publish: safefuse/sensors/data    (every 2s)
 *  Subscribe: safefuse/commands/#    (relay control)
 *
 * WiFi + MQTT broker required.
 * Update WIFI_SSID, WIFI_PASS, MQTT_SERVER below.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>

// ─── Configuration ────────────────────────────────────────────────────────────
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASS       "YOUR_WIFI_PASSWORD"
#define MQTT_SERVER     "192.168.1.100"   // IP of your PC running Mosquitto
#define MQTT_PORT       1883
#define MQTT_CLIENT_ID  "safefuse-esp32"
#define DEVICE_ZONE     "Mixing Room"     // Change per deployment zone

// ─── Pin Definitions ──────────────────────────────────────────────────────────
#define DHT_PIN         4
#define DHT_TYPE        DHT22
#define MQ2_PIN         34    // ADC
#define MQ135_PIN       35    // ADC
#define DUST_LED_PIN    25    // Dust sensor LED control
#define DUST_ADC_PIN    32    // Dust sensor analog output
#define FLAME_PIN       26    // Digital
#define ACS712_PIN      33    // ADC
#define RELAY1_PIN      14    // Cooling Fan
#define RELAY2_PIN      27    // Humidifier/Exhaust Fan
#define BUZZER_PIN      13
#define WARNING_LED_PIN 12
#define OLED_SDA        21
#define OLED_SCL        22

// ─── OLED Config ──────────────────────────────────────────────────────────────
#define SCREEN_WIDTH    128
#define SCREEN_HEIGHT   64
#define OLED_RESET      -1

// ─── Sensor Objects ───────────────────────────────────────────────────────────
DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

// ─── Global State ─────────────────────────────────────────────────────────────
float temperature = 0, humidity = 0;
int smoke_raw = 0, gas_raw = 0, dust_raw = 0;
bool flame_detected = false;
float current_amps = 0;
bool relay1_state = false;    // Cooling Fan
bool relay2_state = false;    // Humidifier
bool alarm_state = false;
bool warning_led_state = false;
unsigned long lastSensorRead = 0;
unsigned long lastPublish = 0;
const unsigned long PUBLISH_INTERVAL = 2000;  // 2 seconds

// ─── ACS712 Calibration ───────────────────────────────────────────────────────
const float ACS712_SENSITIVITY = 0.100;  // 100mV/A for 20A module
const float ACS712_ZERO = 2.5;           // Output at 0A (2.5V for 5V supply)
const float ADC_REF = 3.3;              // ESP32 ADC reference voltage
const int   ADC_RESOLUTION = 4095;

// ─── Dust Sensor Timing ───────────────────────────────────────────────────────
const int DUST_SAMPLE_TIME = 280;   // µs
const int DUST_DELTA_TIME  = 40;    // µs
const int DUST_SLEEP_TIME  = 9680;  // µs

// ─── Function Prototypes ──────────────────────────────────────────────────────
void connectWiFi();
void connectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void readSensors();
float readDust();
float readCurrentAmps();
float rawToSmokePPM(int raw);
float rawToGasPPM(int raw);
void publishSensorData();
void updateOLED();
void setRelay(int pin, bool state, const char* name);
void setAlarm(bool state);

// ═════════════════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println("\n[SAFE-FUSE AI] Starting up...");

  // Initialize output pins
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(WARNING_LED_PIN, OUTPUT);
  pinMode(DUST_LED_PIN, OUTPUT);
  pinMode(FLAME_PIN, INPUT);

  // Default relay states (LOW = OFF for most relay modules = NORMALLY OPEN)
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(WARNING_LED_PIN, LOW);

  // OLED display
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("[OLED] FAILED to initialize");
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("SAFE-FUSE AI");
    display.println("Initializing...");
    display.display();
  }

  // DHT22
  dht.begin();

  // WiFi + MQTT
  connectWiFi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  connectMQTT();

  Serial.println("[SAFE-FUSE AI] ✅ Ready!");
}

// ═════════════════════════════════════════════════════════════════════════════
void loop() {
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  unsigned long now = millis();

  // Read sensors and publish every PUBLISH_INTERVAL ms
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;
    readSensors();
    publishSensorData();
    updateOLED();
  }
}

// ─── WiFi Connection ──────────────────────────────────────────────────────────
void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] ✅ Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] ❌ Failed to connect");
  }
}

// ─── MQTT Connection ──────────────────────────────────────────────────────────
void connectMQTT() {
  int attempts = 0;
  while (!mqttClient.connected() && attempts < 5) {
    Serial.printf("[MQTT] Connecting to %s:%d...\n", MQTT_SERVER, MQTT_PORT);
    if (mqttClient.connect(MQTT_CLIENT_ID)) {
      Serial.println("[MQTT] ✅ Connected!");
      // Subscribe to command topics
      mqttClient.subscribe("safefuse/commands/#");
      mqttClient.subscribe("safefuse/commands/relay1");
      mqttClient.subscribe("safefuse/commands/relay2");
      mqttClient.subscribe("safefuse/commands/humidifier");
      mqttClient.subscribe("safefuse/commands/alarm");
      mqttClient.subscribe("safefuse/commands/warning_led");
    } else {
      Serial.printf("[MQTT] Failed (rc=%d), retrying in 2s...\n", mqttClient.state());
      delay(2000);
      attempts++;
    }
  }
}

// ─── MQTT Command Callback ────────────────────────────────────────────────────
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Parse JSON command
  char msg[256];
  memcpy(msg, payload, min(length, (unsigned int)255));
  msg[length] = '\0';

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, msg) != DeserializationError::Ok) {
    Serial.printf("[MQTT] Invalid JSON from topic %s\n", topic);
    return;
  }

  const char* device = doc["device"];
  const char* action = doc["action"];
  bool turnOn = strcmp(action, "ON") == 0;

  Serial.printf("[MQTT] Command: %s → %s\n", device, action);

  if (strcmp(device, "relay1") == 0 || strcmp(device, "fan") == 0) {
    setRelay(RELAY1_PIN, turnOn, "Cooling Fan");
    relay1_state = turnOn;
  } else if (strcmp(device, "relay2") == 0 || strcmp(device, "humidifier") == 0) {
    setRelay(RELAY2_PIN, turnOn, "Humidifier");
    relay2_state = turnOn;
  } else if (strcmp(device, "alarm") == 0) {
    setAlarm(turnOn);
    alarm_state = turnOn;
  } else if (strcmp(device, "warning_led") == 0) {
    digitalWrite(WARNING_LED_PIN, turnOn ? HIGH : LOW);
    warning_led_state = turnOn;
  }
}

// ─── Read All Sensors ─────────────────────────────────────────────────────────
void readSensors() {
  // DHT22 — Temperature & Humidity
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) temperature = t;
  if (!isnan(h)) humidity = h;

  // MQ-2 — Smoke
  smoke_raw = analogRead(MQ2_PIN);

  // MQ-135 — Gas / Air Quality
  gas_raw = analogRead(MQ135_PIN);

  // Dust Sensor
  // (Requires precise timing for accurate reading)
  digitalWrite(DUST_LED_PIN, LOW);      // Turn on LED
  delayMicroseconds(DUST_SAMPLE_TIME);
  dust_raw = analogRead(DUST_ADC_PIN);
  delayMicroseconds(DUST_DELTA_TIME);
  digitalWrite(DUST_LED_PIN, HIGH);     // Turn off LED

  // Flame Sensor (Active LOW typically)
  flame_detected = (digitalRead(FLAME_PIN) == LOW);

  // ACS712 Current Sensor
  current_amps = readCurrentAmps();
}

// ─── Dust Density Calculation ─────────────────────────────────────────────────
float readDust() {
  // Convert ADC reading to voltage, then to dust density (µg/m³)
  float voltage = (dust_raw * ADC_REF) / ADC_RESOLUTION;
  float dust_density = (0.17 * voltage - 0.1) * 1000;  // Approx. formula
  return max(0.0f, dust_density);
}

// ─── Current Sensor Calculation ───────────────────────────────────────────────
float readCurrentAmps() {
  // Average multiple samples for noise reduction
  long sum = 0;
  for (int i = 0; i < 50; i++) {
    sum += analogRead(ACS712_PIN);
    delayMicroseconds(100);
  }
  float avg = sum / 50.0;
  float voltage = (avg / ADC_RESOLUTION) * ADC_REF;
  float current = (voltage - ACS712_ZERO) / ACS712_SENSITIVITY;
  return abs(current);  // Return absolute value
}

// ─── MQ Sensor Conversions (simplified linear calibration) ───────────────────
float rawToSmokePPM(int raw) {
  // Calibrated for MQ-2 in LPG/smoke mode
  // Actual calibration requires Rs/Ro curve — this is simplified
  float voltage = (raw * ADC_REF) / ADC_RESOLUTION;
  float Rs = (ADC_REF - voltage) / voltage * 10.0; // 10kΩ load resistor
  float Ro = 5.0;  // Calibrated baseline resistance in clean air
  float ratio = Rs / Ro;
  // LPG smoke curve: ppm ≈ 605.18 * ratio^(-2.848)
  float ppm = 605.18 * pow(ratio, -2.848);
  return max(0.0f, ppm);
}

float rawToGasPPM(int raw) {
  // Calibrated for MQ-135 in CO2/NH3 mode (simplified)
  float voltage = (raw * ADC_REF) / ADC_RESOLUTION;
  float Rs = (ADC_REF - voltage) / voltage * 22.0;  // 22kΩ load resistor
  float Ro = 9.8;
  float ratio = Rs / Ro;
  float ppm = 116.60 * pow(ratio, -2.769);
  return max(0.0f, ppm);
}

// ─── Publish Sensor Data via MQTT ─────────────────────────────────────────────
void publishSensorData() {
  StaticJsonDocument<512> doc;

  doc["zone"]    = DEVICE_ZONE;
  doc["temp"]    = round(temperature * 10) / 10.0;
  doc["hum"]     = round(humidity * 10) / 10.0;
  doc["smoke"]   = round(rawToSmokePPM(smoke_raw) * 10) / 10.0;
  doc["gas"]     = round(rawToGasPPM(gas_raw) * 10) / 10.0;
  doc["dust"]    = round(readDust() * 10) / 10.0;
  doc["flame"]   = flame_detected ? 1 : 0;
  doc["current"] = round(current_amps * 100) / 100.0;
  doc["power"]   = round(current_amps * 240 * 10) / 10.0;
  doc["relay1"]  = relay1_state ? 1 : 0;
  doc["relay2"]  = relay2_state ? 1 : 0;
  doc["alarm"]   = alarm_state ? 1 : 0;
  doc["wifi_rssi"] = WiFi.RSSI();

  char buffer[512];
  serializeJson(doc, buffer);

  if (mqttClient.publish("safefuse/sensors/data", buffer)) {
    Serial.printf("[MQTT] ✅ Published: temp=%.1f°C hum=%.1f%% gas=%.0fppm\n",
                  temperature, humidity, rawToGasPPM(gas_raw));
  } else {
    Serial.println("[MQTT] ❌ Publish failed");
  }
}

// ─── OLED Display Update ──────────────────────────────────────────────────────
void updateOLED() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  // Header
  display.setCursor(0, 0);
  display.println("SAFE-FUSE AI");
  display.drawLine(0, 9, 128, 9, SSD1306_WHITE);

  // Sensor values
  display.setCursor(0, 12);
  display.printf("T:%.1fC  H:%.1f%%\n", temperature, humidity);
  display.printf("GAS:%.0fppm\n", rawToGasPPM(gas_raw));
  display.printf("SMK:%.0fppm\n", rawToSmokePPM(smoke_raw));
  display.printf("CUR:%.1fA %.0fW\n", current_amps, current_amps * 240);

  // Status bar at bottom
  display.setCursor(0, 56);
  if (flame_detected) {
    display.println("!! FLAME DETECTED !!");
  } else if (relay1_state || relay2_state || alarm_state) {
    String status = "ACTIVE:";
    if (relay1_state) status += " FAN";
    if (relay2_state) status += " HUM";
    if (alarm_state)  status += " ALM";
    display.println(status);
  } else {
    display.println("STATUS: ALL CLEAR");
  }

  display.display();
}

// ─── Relay Control ────────────────────────────────────────────────────────────
void setRelay(int pin, bool state, const char* name) {
  // Most relay modules: LOW = ON, HIGH = OFF (active low)
  digitalWrite(pin, state ? LOW : HIGH);
  Serial.printf("[RELAY] %s → %s\n", name, state ? "ON" : "OFF");
}

// ─── Alarm Control ────────────────────────────────────────────────────────────
void setAlarm(bool state) {
  if (state) {
    // Generate alarm tone (short beeps)
    for (int i = 0; i < 3; i++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(200);
      digitalWrite(BUZZER_PIN, LOW);
      delay(100);
    }
    // Keep buzzer on for continuous alarm
    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(WARNING_LED_PIN, HIGH);
  } else {
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(WARNING_LED_PIN, LOW);
  }
}
