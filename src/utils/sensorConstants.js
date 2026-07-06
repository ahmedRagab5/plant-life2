/**
 * Sensor threshold definitions and message templates.
 *
 * Source: DOC-20260706-WA0098.json (authoritative threshold spec)
 *
 * Each sensor type defines:
 *  - unit: measurement unit
 *  - normal: { min, max } — optimal range
 *  - warning.low / warning.high: sub-optimal ranges with messages
 *  - danger.low  / danger.high: critical ranges with messages
 *
 * NOTE: The spec field "airHumidity" is stored as "humidity" throughout
 * the API (models, validators, services) for brevity.
 *
 * These are the GLOBAL defaults. Individual plants can override
 * any sensor threshold via the Plant model's `thresholds` field.
 */

const SENSOR_THRESHOLDS = {
  // ── Temperature (°C) ───────────────────────────────────────────────────────
  temperature: {
    "unit": "°C",
    "normal": {
      "min": 20,
      "max": 30
    },
    "warning": {
      "low": {
        "min": 15,
        "max": 19.9,
        "message": "درجة الحرارة أقل من المعدل المثالي.",
        "recommendation": [
          "انقل النبات إلى مكان أكثر دفئًا.",
          "قلل الري قليلًا.",
          "استخدم صوبة أو غطاءً واقيًا إن أمكن."
        ]
      },
      "high": {
        "min": 30.1,
        "max": 35,
        "message": "درجة الحرارة أعلى من المعدل المثالي.",
        "recommendation": [
          "زد كمية الري.",
          "وفر ظلًا جزئيًا.",
          "حسن تهوية المكان."
        ]
      }
    },
    "danger": {
      "low": {
        "max": 14.9,
        "message": "انخفاض شديد في الحرارة قد يوقف نمو النبات.",
        "recommendation": [
          "انقل النبات فورًا إلى مكان أكثر دفئًا.",
          "غطِّ النبات لحمايته من البرد."
        ]
      },
      "high": {
        "min": 35.1,
        "message": "ارتفاع شديد في الحرارة قد يضر النبات.",
        "recommendation": [
          "اسقِ النبات فورًا.",
          "استخدم شبكة تظليل.",
          "تجنب أشعة الشمس المباشرة وقت الظهيرة."
        ]
      }
    }
  },

  // ── Soil Moisture (%) ──────────────────────────────────────────────────────
  soilMoisture: {
    "unit": "%",
    "normal": {
      "min": 60,
      "max": 80
    },
    "warning": {
      "low": {
        "min": 45,
        "max": 59.9,
        "message": "رطوبة التربة أقل من المستوى المثالي.",
        "recommendation": [
          "اسقِ النبات.",
          "راقب رطوبة التربة بعد الري."
        ]
      },
      "high": {
        "min": 80.1,
        "max": 90,
        "message": "رطوبة التربة مرتفعة قليلًا.",
        "recommendation": [
          "قلل كمية الري.",
          "تحقق من تصريف التربة."
        ]
      }
    },
    "danger": {
      "low": {
        "max": 44.9,
        "message": "التربة جافة جدًا. النبات معرض لخطر الجفاف.",
        "recommendation": [
          "اسقِ النبات فورًا.",
          "تحقق من نظام الري."
        ]
      },
      "high": {
        "min": 90.1,
        "message": "التربة مشبعة بالماء. قد يحدث تعفن للجذور.",
        "recommendation": [
          "أوقف الري.",
          "حسن تصريف التربة.",
          "أزل المياه الراكدة."
        ]
      }
    }
  },

  // ── Air Humidity (%) — spec key: "airHumidity", API key: "humidity" ────────
  humidity: {
    "unit": "%",
    "normal": {
      "min": 60,
      "max": 70
    },
    "warning": {
      "low": {
        "min": 50,
        "max": 59.9,
        "message": "رطوبة الهواء منخفضة قليلًا.",
        "recommendation": [
          "رش الماء حول النبات.",
          "زد الرطوبة إذا كان النبات في مكان مغلق."
        ]
      },
      "high": {
        "min": 70.1,
        "max": 80,
        "message": "رطوبة الهواء مرتفعة قليلًا.",
        "recommendation": [
          "حسن التهوية.",
          "تجنب الإفراط في الري."
        ]
      }
    },
    "danger": {
      "low": {
        "max": 49.9,
        "message": "رطوبة الهواء منخفضة جدًا بشكل حرج.",
        "recommendation": [
          "زد الرطوبة فورًا.",
          "قلل التعرض للحرارة."
        ]
      },
      "high": {
        "min": 80.1,
        "message": "رطوبة الهواء مرتفعة جدًا. قد تتطور أمراض فطرية.",
        "recommendation": [
          "حسن التهوية.",
          "قلل الري.",
          "افحص الأوراق بحثًا عن إصابات فطرية."
        ]
      }
    }
  },

  // ── Light Intensity (Lux) ──────────────────────────────────────────────────
  lightIntensity: {
    "unit": "Lux",
    "normal": {
      "min": 20000,
      "max": 60000
    },
    "warning": {
      "low": {
        "min": 10000,
        "max": 19999,
        "message": "شدة الإضاءة أقل من المستوى المثالي.",
        "recommendation": [
          "انقل النبات إلى مكان أكثر إضاءة.",
          "استخدم إضاءة صناعية للنمو إذا كان في مكان مغلق."
        ]
      },
      "high": {
        "min": 60001,
        "max": 70000,
        "message": "شدة الإضاءة مرتفعة قليلًا.",
        "recommendation": [
          "وفر ظلًا جزئيًا.",
          "راقب حالة الأوراق."
        ]
      }
    },
    "danger": {
      "low": {
        "max": 9999,
        "message": "الإضاءة غير كافية وقد تؤثر بشدة على نمو النبات.",
        "recommendation": [
          "وفر إضاءة صناعية للنمو.",
          "انقل النبات إلى ضوء الشمس المباشر."
        ]
      },
      "high": {
        "min": 70001,
        "message": "الإضاءة المفرطة قد تحرق الأوراق.",
        "recommendation": [
          "استخدم شبكة تظليل.",
          "زد كمية الري.",
          "تجنب أشعة الشمس المباشرة بعد الظهر."
        ]
      }
    }
  }
};



/**
 * Human-readable display names for each sensor type (Arabic).
 * Used in notification titles and evaluation messages.
 */
const SENSOR_DISPLAY_NAMES = {
  temperature:    'درجة الحرارة',
  soilMoisture:   'رطوبة التربة',
  humidity:       'رطوبة الهواء',
  lightIntensity: 'شدة الإضاءة',
};

/**
 * All valid sensor type keys (used across validator, service, and model).
 */
const SENSOR_TYPES = Object.keys(SENSOR_THRESHOLDS);

module.exports = {
  SENSOR_THRESHOLDS,
  SENSOR_DISPLAY_NAMES,
  SENSOR_TYPES,
};
