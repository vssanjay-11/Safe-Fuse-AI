/*
==========================================================
              SAFE-FUSE AI
     ESP32 Industrial Safety System
==========================================================

Sensors & Modules:
  - DHT22 (Temperature & Humidity) -> GPIO 4
  - MQ2 (Gas/Smoke Sensor)         -> GPIO 34 (ADC)
  - MQ135 (Air Quality Sensor)     -> GPIO 35 (ADC)
  - Flame Sensor (Analog & Digital) -> GPIO 33 (AO), GPIO 25 (DO)
  - GP2Y1010 Dust Sensor           -> GPIO 32 (Vo), GPIO 14 (LED Control)
  - OLED Display (SSD1306, I2C)    -> GPIO 21 (SDA), GPIO 22 (SCL)
  - 2-Channel Relay Module         -> GPIO 26 (Fan), GPIO 27 (Humidifier)

Board  : ESP32-WROOM-32
Author : Vadavalli Warriors
==========================================================
*/

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Bonezegei_DHT22.h>

//================ OLED CONFIGURATION ====================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

//================ SENSOR PIN DEFINITIONS ================
#define DHT_PIN          4
#define MQ2_PIN          34
#define MQ135_PIN        35
#define FLAME_AO         33
#define FLAME_DO         25
#define DUST_PIN         32
#define DUST_LED         14

//================ RELAY PIN DEFINITIONS =================
#define FAN_RELAY        26
#define HUMIDIFIER_RELAY 27

//================ SENSOR OBJECTS ========================
Bonezegei_DHT22 dht(DHT_PIN);

//================ THRESHOLDS ============================
float TEMP_LIMIT = 35.0;     // High Temp Threshold (°C)
float HUM_LIMIT  = 45.0;     // Low Humidity Threshold (%)

int MQ2_LIMIT    = 1800;     // Gas/Smoke Threshold (ADC Value)
int MQ135_LIMIT  = 1800;     // Air Quality Threshold (ADC Value)
int DUST_LIMIT   = 1200;     // Dust Threshold (ADC Value)

//================ GLOBAL VARIABLES ======================
float temperature = 0.0;
float humidity    = 0.0;

int mq2     = 0;
int mq135   = 0;
int flameAO = 0;
int flameDO = 1;  // HIGH = Normal, LOW = Fire Detected
int dust    = 0;

int riskScore = 0;

//================ SETUP =================================
void setup() {
  Serial.begin(115200);

  // Initialize I2C for OLED
  Wire.begin(21, 22);

  // Initialize DHT22
  dht.begin();

  // Pin Modes
  pinMode(FLAME_DO, INPUT);
  pinMode(DUST_LED, OUTPUT);
  pinMode(FAN_RELAY, OUTPUT);
  pinMode(HUMIDIFIER_RELAY, OUTPUT);

  // Initial Relay State: OFF (Active LOW Relays start HIGH)
  digitalWrite(FAN_RELAY, HIGH);
  digitalWrite(HUMIDIFIER_RELAY, HIGH);

  // Initialize OLED Display
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED Initialization Failed!");
    while (true); // Halt execution on display error
  }

  display.clearDisplay();
  display.display();

  Serial.println();
  Serial.println("====================================");
  Serial.println("        SAFE-FUSE AI STARTED        ");
  Serial.println("====================================");

  delay(1000);
}

//================ SENSOR READINGS =======================

void readDHT() {
  if (dht.getData()) {
    temperature = dht.getTemperature();
    humidity    = dht.getHumidity();
  }
}

void readMQ() {
  mq2   = analogRead(MQ2_PIN);
  mq135 = analogRead(MQ135_PIN);
}

void readFlame() {
  flameAO = analogRead(FLAME_AO);
  flameDO = digitalRead(FLAME_DO);
}

void readDust() {
  digitalWrite(DUST_LED, LOW);   // Turn ON Dust LED
  delayMicroseconds(280);

  dust = analogRead(DUST_PIN);   // Read analog output

  delayMicroseconds(40);
  digitalWrite(DUST_LED, HIGH);  // Turn OFF Dust LED
  delayMicroseconds(9680);       // Wait to finish sampling period
}

//================ RISK CALCULATION ======================

void calculateRisk() {
  riskScore = 0;

  if (temperature > TEMP_LIMIT) riskScore += 20;
  if (humidity < HUM_LIMIT)     riskScore += 10;
  if (mq2 > MQ2_LIMIT)          riskScore += 20;
  if (mq135 > MQ135_LIMIT)      riskScore += 15;
  if (dust > DUST_LIMIT)        riskScore += 15;
  if (flameDO == LOW)           riskScore += 40;

  if (riskScore > 100) riskScore = 100;
}

//================ RELAY CONTROL LOGIC ===================

void controlRelays() {
  // Fan Control (Active LOW)
  if (temperature > TEMP_LIMIT || mq2 > MQ2_LIMIT) {
    digitalWrite(FAN_RELAY, LOW);   // Turn Fan ON
  } else {
    digitalWrite(FAN_RELAY, HIGH);  // Turn Fan OFF
  }

  // Humidifier Control (Active LOW)
  if (humidity < HUM_LIMIT) {
    digitalWrite(HUMIDIFIER_RELAY, LOW);   // Turn Humidifier ON
  } else {
    digitalWrite(HUMIDIFIER_RELAY, HIGH);  // Turn Humidifier OFF
  }

  // Emergency Fire Override: Shut down relays to prevent feeding oxygen/sparks
  if (flameDO == LOW) {
    digitalWrite(FAN_RELAY, HIGH);        // Force Fan OFF
    digitalWrite(HUMIDIFIER_RELAY, HIGH); // Force Humidifier OFF
  }
}

//================ OLED DISPLAY DISPLAY UPDATE ===========

void updateOLED() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(WHITE);

  // Title Line
  display.setCursor(0, 0);
  display.print("SAFE-FUSE AI");

  // Temp & Humidity Line
  display.setCursor(0, 10);
  display.print("T:");
  display.print(temperature, 1);
  display.print("C");

  display.setCursor(64, 10);
  display.print("H:");
  display.print(humidity, 1);
  display.print("%");

  // MQ Sensor Readings
  display.setCursor(0, 22);
  display.print("MQ2:");
  display.print(mq2);

  display.setCursor(0, 32);
  display.print("MQ135:");
  display.print(mq135);

  // Dust Sensor Reading
  display.setCursor(0, 42);
  display.print("Dust:");
  display.print(dust);

  // Safety Status Banner
  display.setCursor(0, 54);
  if (flameDO == LOW) {
    display.print("STATUS: FIRE");
  } else if (riskScore >= 70) {
    display.print("STATUS: DANGER");
  } else if (riskScore >= 40) {
    display.print("STATUS: WARNING");
  } else {
    display.print("STATUS: SAFE");
  }

  display.display();
}

//================ SERIAL LOGGING ========================

void serialOutput() {
  Serial.println();
  Serial.println("======================================");

  Serial.print("Temperature : ");
  Serial.print(temperature);
  Serial.println(" C");

  Serial.print("Humidity    : ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("MQ2         : ");
  Serial.println(mq2);

  Serial.print("MQ135       : ");
  Serial.println(mq135);

  Serial.print("Dust        : ");
  Serial.println(dust);

  Serial.print("Flame AO    : ");
  Serial.println(flameAO);

  Serial.print("Flame DO    : ");
  if (flameDO == LOW) {
    Serial.println("FIRE");
  } else {
    Serial.println("SAFE");
  }

  Serial.print("Risk Score  : ");
  Serial.print(riskScore);
  Serial.println("%");

  Serial.print("Fan Relay   : ");
  if (digitalRead(FAN_RELAY) == LOW) {
    Serial.println("ON");
  } else {
    Serial.println("OFF");
  }

  Serial.print("Humidifier  : ");
  if (digitalRead(HUMIDIFIER_RELAY) == LOW) {
    Serial.println("ON");
  } else {
    Serial.println("OFF");
  }

  Serial.println("======================================");
}

//================ MAIN LOOP =============================

void loop() {
  readDHT();
  readMQ();
  readFlame();
  readDust();

  calculateRisk();
  controlRelays();

  updateOLED();
  serialOutput();

  delay(1000);
}