#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

//==================== OLED ====================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

//==================== DHT =====================
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

//==================== MQ ======================
#define MQ2_PIN 34
#define MQ135_PIN 35

//==================== Flame ===================
#define FLAME_AO 33
#define FLAME_DO 25

//==================== Dust ====================
#define DUST_PIN 32
#define DUST_LED 14

//==================== Relay ===================
#define FAN_RELAY 26
#define HUMIDIFIER_RELAY 27

//==================== Thresholds ==============
float TEMP_LIMIT = 35.0;
float HUM_LIMIT = 45.0;

int MQ2_LIMIT = 1800;
int MQ135_LIMIT = 1800;

int DUST_LIMIT = 1500;

void setup()
{
  Serial.begin(115200);

  Wire.begin(21,22);

  dht.begin();

  pinMode(FAN_RELAY, OUTPUT);
  pinMode(HUMIDIFIER_RELAY, OUTPUT);

  pinMode(FLAME_DO, INPUT);

  pinMode(DUST_LED, OUTPUT);

  // Relay OFF (Most relay modules are Active LOW)
  digitalWrite(FAN_RELAY, HIGH);
  digitalWrite(HUMIDIFIER_RELAY, HIGH);

  if(!display.begin(SSD1306_SWITCHCAPVCC,0x3C))
  {
    Serial.println("OLED Failed");
    while(true);
  }

  display.clearDisplay();
  display.display();

  Serial.println("SAFE-FUSE AI Started");
}

void loop()
{

  //---------------- DHT ----------------

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  //---------------- MQ -----------------

  int mq2 = analogRead(MQ2_PIN);
  int mq135 = analogRead(MQ135_PIN);

  //---------------- Flame -------------

  int flameAnalog = analogRead(FLAME_AO);
  int flameDigital = digitalRead(FLAME_DO);

  //---------------- Dust --------------

  digitalWrite(DUST_LED, LOW);
  delayMicroseconds(280);

  int dust = analogRead(DUST_PIN);

  delayMicroseconds(40);

  digitalWrite(DUST_LED, HIGH);

  delayMicroseconds(9680);

  //---------------- Risk Score --------

  int risk = 0;

  if(temperature > TEMP_LIMIT)
      risk += 20;

  if(humidity < HUM_LIMIT)
      risk += 10;

  if(mq2 > MQ2_LIMIT)
      risk += 20;

  if(mq135 > MQ135_LIMIT)
      risk += 15;

  if(dust > DUST_LIMIT)
      risk += 15;

  if(flameDigital == LOW)
      risk += 40;

  if(risk > 100)
      risk = 100;

  //---------------- Relay -------------

  // Fan

  if(temperature > TEMP_LIMIT || mq2 > MQ2_LIMIT)
      digitalWrite(FAN_RELAY, LOW);
  else
      digitalWrite(FAN_RELAY, HIGH);

  // Humidifier

  if(humidity < HUM_LIMIT)
      digitalWrite(HUMIDIFIER_RELAY, LOW);
  else
      digitalWrite(HUMIDIFIER_RELAY, HIGH);

  // Fire

  if(flameDigital == LOW)
  {
      digitalWrite(FAN_RELAY, HIGH);
      digitalWrite(HUMIDIFIER_RELAY, HIGH);
  }

  //---------------- OLED -------------

  display.clearDisplay();

  display.setTextSize(1);
  display.setTextColor(WHITE);

  display.setCursor(0,0);
  display.print("Temp:");
  display.print(temperature,1);
  display.print(" C");

  display.setCursor(0,10);
  display.print("Hum :");
  display.print(humidity,1);
  display.print("%");

  display.setCursor(0,20);
  display.print("MQ2 :");
  display.print(mq2);

  display.setCursor(0,30);
  display.print("MQ135:");
  display.print(mq135);

  display.setCursor(0,40);
  display.print("Dust:");
  display.print(dust);

  display.setCursor(0,50);

  if(flameDigital == LOW)
      display.print("FIRE!");
  else
      display.print("SAFE");

  display.display();

  //---------------- Serial -----------

  Serial.println("--------------------------------");

  Serial.print("Temperature : ");
  Serial.println(temperature);

  Serial.print("Humidity    : ");
  Serial.println(humidity);

  Serial.print("MQ2         : ");
  Serial.println(mq2);

  Serial.print("MQ135       : ");
  Serial.println(mq135);

  Serial.print("Dust        : ");
  Serial.println(dust);

  Serial.print("Flame AO    : ");
  Serial.println(flameAnalog);

  Serial.print("Flame DO    : ");
  Serial.println(flameDigital);

  Serial.print("Risk Score  : ");
  Serial.println(risk);

  Serial.println("--------------------------------");

  delay(1000);

}