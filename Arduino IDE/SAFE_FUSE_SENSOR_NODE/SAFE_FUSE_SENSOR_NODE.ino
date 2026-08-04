#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN,DHTTYPE);

#define MQ2_PIN 34
#define MQ135_PIN 35
#define FLAME_AO 33
#define FLAME_DO 25
#define DUST_PIN 32
#define DUST_LED 14
#define FAN_RELAY 26
#define HUMIDIFIER_RELAY 27

float TEMP_LIMIT=35.0;
float HUM_LIMIT=45.0;
int MQ2_LIMIT=1800;
int MQ135_LIMIT=1800;
int DUST_LIMIT=1500;

float temperature=0;
float humidity=0;
int mq2=0,mq135=0,dust=0;
int flameAnalog=0,flameDigital=HIGH,risk=0;

void setup(){
 Serial.begin(115200);
 Wire.begin(21,22);
 dht.begin();
 delay(2500);

 pinMode(FLAME_DO,INPUT);
 pinMode(DUST_LED,OUTPUT);
 pinMode(FAN_RELAY,OUTPUT);
 pinMode(HUMIDIFIER_RELAY,OUTPUT);

 digitalWrite(FAN_RELAY,HIGH);
 digitalWrite(HUMIDIFIER_RELAY,HIGH);

 if(!display.begin(SSD1306_SWITCHCAPVCC,0x3C)){
   Serial.println("OLED Failed");
   while(true);
 }

 display.clearDisplay();
 display.display();

 Serial.println("SAFE-FUSE AI SENSOR NODE");
}

void loop(){

 float t=dht.readTemperature();
 float h=dht.readHumidity();

 if(!isnan(t) && !isnan(h)){
   temperature=t;
   humidity=h;
 }else{
   Serial.println("DHT Read Failed - Using Previous Values");
 }

 long s1=0,s2=0;
 for(int i=0;i<20;i++){
   s1+=analogRead(MQ2_PIN);
   s2+=analogRead(MQ135_PIN);
   delay(1);
 }
 mq2=s1/20;
 mq135=s2/20;

 flameAnalog=analogRead(FLAME_AO);
 flameDigital=digitalRead(FLAME_DO);

 digitalWrite(DUST_LED,LOW);
 delayMicroseconds(280);

 long dsum=0;
 for(int i=0;i<10;i++){
   dsum+=analogRead(DUST_PIN);
   delay(2);
 }
 dust=dsum/10;

 delayMicroseconds(40);
 digitalWrite(DUST_LED,HIGH);
 delayMicroseconds(9680);

 risk=0;
 if(temperature>TEMP_LIMIT) risk+=20;
 if(humidity<HUM_LIMIT) risk+=10;
 if(mq2>MQ2_LIMIT) risk+=20;
 if(mq135>MQ135_LIMIT) risk+=15;
 if(dust>DUST_LIMIT) risk+=15;
 if(flameDigital==LOW) risk+=40;
 if(risk>100) risk=100;

 digitalWrite(FAN_RELAY,(temperature>TEMP_LIMIT || mq2>MQ2_LIMIT)?LOW:HIGH);
 digitalWrite(HUMIDIFIER_RELAY,(humidity<HUM_LIMIT)?LOW:HIGH);

 if(flameDigital==LOW){
   digitalWrite(FAN_RELAY,HIGH);
   digitalWrite(HUMIDIFIER_RELAY,HIGH);
 }

 display.clearDisplay();
 display.setTextSize(1);
 display.setTextColor(WHITE);

 display.setCursor(0,0);
 display.print("SAFE-FUSE AI");

 display.setCursor(0,10);
 display.printf("T:%.1fC H:%.1f%%",temperature,humidity);

 display.setCursor(0,22);
 display.printf("MQ2:%d",mq2);

 display.setCursor(0,32);
 display.printf("MQ135:%d",mq135);

 display.setCursor(0,42);
 display.printf("Dust:%d",dust);

 display.setCursor(0,54);
 if(flameDigital==LOW) display.print("FIRE");
 else if(risk>=70) display.print("DANGER");
 else if(risk>=40) display.print("WARNING");
 else display.print("SAFE");

 display.display();

 Serial.println("---------------------------");
 Serial.printf("Temperature : %.2f C\n",temperature);
 Serial.printf("Humidity    : %.2f %%\n",humidity);
 Serial.printf("MQ2         : %d\n",mq2);
 Serial.printf("MQ135       : %d\n",mq135);
 Serial.printf("Dust        : %d\n",dust);
 Serial.printf("Flame AO    : %d\n",flameAnalog);
 Serial.printf("Flame DO    : %s\n",flameDigital==LOW?"FIRE":"SAFE");
 Serial.printf("Risk Score  : %d %%\n",risk);
 Serial.printf("Fan         : %s\n",digitalRead(FAN_RELAY)==LOW?"ON":"OFF");
 Serial.printf("Humidifier  : %s\n",digitalRead(HUMIDIFIER_RELAY)==LOW?"ON":"OFF");

 delay(2500);
}