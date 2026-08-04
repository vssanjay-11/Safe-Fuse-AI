/*
==========================================================
SAFE-FUSE AI
ESP32 SENSOR NODE
Version : 1.0
Part : 1
Author : Team HIVE
==========================================================
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// WiFi Credentials

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// MQTT Broker

const char* MQTT_SERVER = "192.168.1.100";
const int MQTT_PORT = 1883;

const char* MQTT_CLIENT = "SAFE_FUSE_SENSOR";

const char* SENSOR_TOPIC = "factory/sensors";
const char* HEARTBEAT_TOPIC = "factory/heartbeat";

// Objects

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

// Timing

unsigned long previousHeartbeat = 0;
unsigned long previousSensorUpdate = 0;

const unsigned long heartbeatInterval = 5000;
const unsigned long sensorInterval = 1000;

// Sensor Variables
// (Real values will come in Part 2)

float temperature = 0.0;
float humidity = 0.0;
float gas = 0.0;
float airQuality = 0.0;
float dust = 0.0;
float current = 0.0;

bool flameDetected = false;

int hazardScore = 0;

// Function Prototypes

void connectWiFi();
void connectMQTT();

void publishSensorData();
void publishHeartbeat();

void readSensors();

void calculateHazard();

void setup()
{

Serial.begin(115200);

connectWiFi();

mqtt.setServer(MQTT_SERVER, MQTT_PORT);

}

void loop()
{

if(WiFi.status()!=WL_CONNECTED)
{
connectWiFi();
}

if(!mqtt.connected())
{
connectMQTT();
}

mqtt.loop();

unsigned long currentMillis=millis();

// Sensor Update

if(currentMillis-previousSensorUpdate>=sensorInterval)
{

previousSensorUpdate=currentMillis;

readSensors();

calculateHazard();

publishSensorData();

}

// Heartbeat

if(currentMillis-previousHeartbeat>=heartbeatInterval)
{

previousHeartbeat=currentMillis;

publishHeartbeat();

}

}

void connectWiFi()
{

Serial.println();

Serial.println("Connecting WiFi...");

WiFi.begin(WIFI_SSID,WIFI_PASSWORD);

while(WiFi.status()!=WL_CONNECTED)
{

delay(500);

Serial.print(".");

}

Serial.println();

Serial.print("WiFi Connected : ");

Serial.println(WiFi.localIP());

}

void connectMQTT()
{

while(!mqtt.connected())
{

Serial.println("Connecting MQTT...");

if(mqtt.connect(MQTT_CLIENT))
{

Serial.println("MQTT Connected");

}

else
{

Serial.print("Failed : ");

Serial.println(mqtt.state());

delay(3000);

}

}

}

void publishHeartbeat()
{

StaticJsonDocument<128> doc;

doc["device"]="ESP32_SENSOR";

doc["status"]="ONLINE";

doc["ip"]=WiFi.localIP().toString();

char buffer[128];

serializeJson(doc,buffer);

mqtt.publish(HEARTBEAT_TOPIC,buffer);

}

void publishSensorData()
{

StaticJsonDocument<512> doc;

doc["temperature"]=temperature;
doc["humidity"]=humidity;
doc["gas"]=gas;
doc["air_quality"]=airQuality;
doc["dust"]=dust;
doc["current"]=current;
doc["flame"]=flameDetected;
doc["hazard"]=hazardScore;

char buffer[512];

serializeJson(doc,buffer);

mqtt.publish(SENSOR_TOPIC,buffer);

Serial.println(buffer);

}

// Placeholder
// Real code comes in Part 2

void readSensors()
{

}

// Placeholder
// Real code comes in Part 4

void calculateHazard()
{

}