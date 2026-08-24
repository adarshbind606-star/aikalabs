interface AnalysisResult {
  projectType: string;
  confidence: number;
  detectedSensors: string[];
  detectedActuators: string[];
  detectedLibraries: string[];
  serializationFormat: 'json' | 'simple' | 'structured' | 'unknown';
  expectedDataFields: string[];
  description: string;
}

const SENSOR_PATTERNS: Record<string, RegExp> = {
  IR_SENSOR: /IR|infrared|ir_sensor|analog.*IR/i,
  ULTRASONIC: /HC-SR04|ultrasonic|distance|sonar/i,
  PIR: /PIR|motion|pir_sensor/i,
  DHT: /DHT11|DHT22|DHT|temperature.*humidity|humidity.*temperature/i,
  SOIL_MOISTURE: /soil|moisture|soil_moisture|capacitive/i,
  GAS_SENSOR: /MQ|gas|smoke|lpg|co2|methane/i,
  WATER_LEVEL: /water|level|liquid|float/i,
  LDR: /LDR|light|photoresistor|brightness/i,
  FLAME: /flame|fire|fire_sensor|ir_flame/i,
  RFID: /RFID|mfrc522|nfc|card/i,
  BUTTON: /button|switch|push|input/i,
  POTENTIOMETER: /pot|potentiometer|analog_input/i,
};

const ACTUATOR_PATTERNS: Record<string, RegExp> = {
  SERVO: /servo|servo_motor|angle|180/i,
  DC_MOTOR: /motor|pump|fan|speed/i,
  LED: /led|light|digitalWrite.*HIGH|digitalWrite.*LOW/i,
  RELAY: /relay|switch|power|on.*off/i,
  BUZZER: /buzzer|beep|tone|sound|alarm/i,
  LCD: /LCD|liquid.*crystal|i2c|16x2|20x4/i,
  OLED: /OLED|display.*0x3c|u8g2/i,
};

const LIBRARY_PATTERNS: Record<string, RegExp> = {
  SERVO: /#include.*Servo|Servo servo/i,
  WIRE: /#include.*Wire|Wire.begin/i,
  SPI: /#include.*SPI|SPI.begin/i,
  SERIALPORT: /#include.*Serial|Serial.begin/i,
  DHT: /#include.*DHT|DHT dht/i,
  LIQUIDCRYSTAL: /#include.*LiquidCrystal|LiquidCrystal lcd/i,
  LIQUIDCRYSTAL_I2C: /#include.*LiquidCrystal_I2C|LiquidCrystal_I2C lcd/i,
  MFRC522: /#include.*MFRC522|MFRC522 mfrc522/i,
};

const PROJECT_PATTERNS: Record<string, { score: number; sensors: string[]; actuators: string[] }> = {
  SMART_PARKING: {
    score: 0,
    sensors: ['IR_SENSOR', 'SERVO'],
    actuators: ['SERVO', 'LCD'],
  },
  PLANT_WATERING: {
    score: 0,
    sensors: ['SOIL_MOISTURE', 'DHT'],
    actuators: ['DC_MOTOR', 'RELAY'],
  },
  WEATHER_STATION: {
    score: 0,
    sensors: ['DHT', 'LDR'],
    actuators: ['LCD', 'OLED'],
  },
  SECURITY_SYSTEM: {
    score: 0,
    sensors: ['PIR', 'BUTTON'],
    actuators: ['BUZZER', 'LED', 'RELAY'],
  },
  SMART_DUSTBIN: {
    score: 0,
    sensors: ['ULTRASONIC'],
    actuators: ['SERVO', 'LED'],
  },
  FIRE_SAFETY: {
    score: 0,
    sensors: ['GAS_SENSOR', 'FLAME'],
    actuators: ['BUZZER', 'LED', 'RELAY'],
  },
  RFID_DOOR: {
    score: 0,
    sensors: ['RFID'],
    actuators: ['SERVO', 'LED', 'BUZZER'],
  },
};

export function analyzeArduinoCode(code: string): AnalysisResult {
  const detectedSensors: string[] = [];
  const detectedActuators: string[] = [];
  const detectedLibraries: string[] = [];
  const expectedDataFields: string[] = [];

  // Detect sensors
  for (const [sensor, pattern] of Object.entries(SENSOR_PATTERNS)) {
    if (pattern.test(code)) {
      detectedSensors.push(sensor);
    }
  }

  // Detect actuators
  for (const [actuator, pattern] of Object.entries(ACTUATOR_PATTERNS)) {
    if (pattern.test(code)) {
      detectedActuators.push(actuator);
    }
  }

  // Detect libraries
  for (const [library, pattern] of Object.entries(LIBRARY_PATTERNS)) {
    if (pattern.test(code)) {
      detectedLibraries.push(library);
    }
  }

  // Detect serialization format
  let serializationFormat: 'json' | 'simple' | 'structured' | 'unknown' = 'unknown';
  if (/{.*:.*}/.test(code)) {
    serializationFormat = 'json';
    expectedDataFields.push('JSON_data');
  } else if (/Serial\.print.*=/.test(code)) {
    serializationFormat = 'structured';
    const fieldMatches = code.match(/Serial\.print[a-zA-Z]*\(\s*"([^"]+)"/g);
    if (fieldMatches) {
      fieldMatches.forEach((match) => {
        const field = match.match(/"([^"]+)"/)?.[1];
        if (field) expectedDataFields.push(field);
      });
    }
  } else {
    serializationFormat = 'simple';
  }

  // Classify project type
  let projectType = 'Custom Project';
  let maxScore = 0;
  let confidence = 0;

  for (const [project, patterns] of Object.entries(PROJECT_PATTERNS)) {
    let score = 0;
    const detectedCount = patterns.sensors.filter((s) => detectedSensors.includes(s)).length;
    score += detectedCount * 40;
    score += patterns.actuators.filter((a) => detectedActuators.includes(a)).length * 30;
    score += detectedLibraries.length * 10;

    if (score > maxScore) {
      maxScore = score;
      projectType = project.replace(/_/g, ' ');
      confidence = Math.min(100, score);
    }
  }

  const description = `Detected ${detectedSensors.length} sensor(s) and ${detectedActuators.length} actuator(s). Using ${serializationFormat} data format.`;

  return {
    projectType,
    confidence,
    detectedSensors,
    detectedActuators,
    detectedLibraries,
    serializationFormat,
    expectedDataFields,
    description,
  };
}
