const { body, param, query } = require('express-validator');

/**
 * Validation rules for POST /api/sensors/data
 * The IoT device sends its hardware deviceId + the four sensor readings.
 */
const validateSensorData = [
  body('deviceId')
    .notEmpty()
    .withMessage('deviceId is required.')
    .isString()
    .withMessage('deviceId must be a string.')
    .trim(),

  body('temperature')
    .notEmpty()
    .withMessage('temperature is required.')
    .isFloat()
    .withMessage('temperature must be a numeric value.'),

  body('humidity')
    .notEmpty()
    .withMessage('humidity is required.')
    .isFloat({ min: 0, max: 100 })
    .withMessage('humidity must be a number between 0 and 100.'),

  body('soilMoisture')
    .notEmpty()
    .withMessage('soilMoisture is required.')
    .isFloat({ min: 0, max: 100 })
    .withMessage('soilMoisture must be a number between 0 and 100.'),

  body('lightIntensity')
    .notEmpty()
    .withMessage('lightIntensity is required.')
    .isFloat({ min: 0 })
    .withMessage('lightIntensity must be a non-negative number.'),

  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('timestamp must be a valid ISO 8601 date string.')
    .toDate(),
];

/**
 * Validation rules for GET /api/sensors/history/:deviceId
 */
const validateGetHistory = [
  param('deviceId')
    .notEmpty()
    .withMessage('deviceId is required.')
    .isString()
    .withMessage('deviceId must be a string.'),

  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.')
    .toInt(),

  query('status')
    .optional()
    .isIn(['normal', 'warning', 'danger'])
    .withMessage('status must be one of: normal, warning, danger.'),
];

/**
 * Validation rules for GET /api/sensors/notifications
 */
const validateGetNotifications = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer.')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100.')
    .toInt(),

  query('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead must be true or false.'),

  query('status')
    .optional()
    .isIn(['warning', 'danger'])
    .withMessage('status must be one of: warning, danger.'),

  query('deviceId')
    .optional()
    .isString()
    .withMessage('deviceId must be a string.'),
];

/**
 * Validation rules for PATCH /api/sensors/notifications/:id/read
 */
const validateNotificationId = [
  param('id')
    .custom((value) => {
      const mongoose = require('mongoose');
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('Notification ID must be a valid MongoDB ObjectId.'),
];

module.exports = {
  validateSensorData,
  validateGetHistory,
  validateGetNotifications,
  validateNotificationId,
};
