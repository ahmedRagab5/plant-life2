const { SENSOR_THRESHOLDS, SENSOR_DISPLAY_NAMES } = require('../utils/sensorConstants');

/**
 * Evaluates a single sensor reading against a threshold configuration.
 *
 * @param {string} sensorType   - e.g. 'temperature', 'humidity', 'soilMoisture', 'lightIntensity'
 * @param {number} value        - The raw sensor value to evaluate
 * @param {object} [thresholds] - Optional plant-specific threshold config.
 *                                Falls back to global defaults from sensorConstants.
 *
 * @returns {{ status: string, title: string, message: string, recommendation: string[] }}
 *          status is one of: 'normal' | 'warning' | 'danger'
 */
const evaluateSensor = (sensorType, value, thresholds = null) => {
  const config = thresholds || SENSOR_THRESHOLDS[sensorType];
  const displayName = SENSOR_DISPLAY_NAMES[sensorType] || sensorType;

  if (!config) {
    throw new Error(`Unknown sensor type: "${sensorType}"`);
  }

  const { normal, warning, danger } = config;

  // ── Danger: low ──────────────────────────────────────────────────────────
  if (danger?.low && value <= danger.low.max) {
    return {
      status: 'danger',
      title: `🚨 تحذير حرج: انخفاض ${displayName}`,
      message: danger.low.message,
      recommendation: danger.low.recommendation || [],
    };
  }

  // ── Danger: high ─────────────────────────────────────────────────────────
  if (danger?.high && value >= danger.high.min) {
    return {
      status: 'danger',
      title: `🚨 تحذير حرج: ارتفاع ${displayName}`,
      message: danger.high.message,
      recommendation: danger.high.recommendation || [],
    };
  }

  // ── Warning: low ─────────────────────────────────────────────────────────
  if (warning?.low && value >= warning.low.min && value <= warning.low.max) {
    return {
      status: 'warning',
      title: `⚠️ تنبيه: انخفاض ${displayName}`,
      message: warning.low.message,
      recommendation: warning.low.recommendation || [],
    };
  }

  // ── Warning: high ────────────────────────────────────────────────────────
  if (warning?.high && value >= warning.high.min && value <= warning.high.max) {
    return {
      status: 'warning',
      title: `⚠️ تنبيه: ارتفاع ${displayName}`,
      message: warning.high.message,
      recommendation: warning.high.recommendation || [],
    };
  }

  // ── Normal ───────────────────────────────────────────────────────────────
  if (value >= normal.min && value <= normal.max) {
    return {
      status: 'normal',
      title: `✅ طبيعي: ${displayName}`,
      message: `${displayName} ضمن النطاق المثالي.`,
      recommendation: [],
    };
  }

  // ── Fallback: value is between warning and danger bands (edge case) ───────
  // This can happen if thresholds have gaps. Treat as warning.
  const isLow = value < normal.min;
  return {
    status: 'warning',
    title: `⚠️ تنبيه: ${isLow ? 'انخفاض' : 'ارتفاع'} ${displayName}`,
    message: `${displayName} خارج النطاق المثالي.`,
    recommendation: [],
  };
};

/**
 * Evaluates all four sensor types from a single reading object.
 *
 * @param {object} reading        - { temperature, humidity, soilMoisture, lightIntensity }
 * @param {object} [thresholds]   - Optional plant-specific thresholds object
 *
 * @returns {{ evaluations: object, overallStatus: string }}
 *    evaluations: { temperature: {...}, humidity: {...}, soilMoisture: {...}, lightIntensity: {...} }
 *    overallStatus: worst status across all sensors ('normal' | 'warning' | 'danger')
 */
const evaluateAllSensors = (reading, thresholds = null) => {
  const sensorTypes = ['temperature', 'humidity', 'soilMoisture', 'lightIntensity'];

  const evaluations = {};

  for (const sensorType of sensorTypes) {
    const value = reading[sensorType];
    const plantThreshold = thresholds?.[sensorType] || null;
    evaluations[sensorType] = evaluateSensor(sensorType, value, plantThreshold);
  }

  // Determine overall status: danger > warning > normal
  const STATUS_PRIORITY = { danger: 2, warning: 1, normal: 0 };
  const overallStatus = sensorTypes.reduce((worst, sensorType) => {
    const current = evaluations[sensorType].status;
    return STATUS_PRIORITY[current] > STATUS_PRIORITY[worst] ? current : worst;
  }, 'normal');

  return { evaluations, overallStatus };
};

module.exports = { evaluateSensor, evaluateAllSensors };
