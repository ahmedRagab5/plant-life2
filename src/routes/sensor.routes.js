const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const sensorController = require('../controllers/sensor.controller');
const {
  validateSensorData,
  validateGetHistory,
  validateGetNotifications,
  validateNotificationId,
} = require('../middleware/sensor.validator');

const router = express.Router();

// ─── Sensor Data ─────────────────────────────────────────────────────────────

/**
 * POST /api/sensors/data
 * Receive real-time sensor data from an IoT device.
 *
 * ⚠️  NO AUTH required — the device identifies itself via its hardware deviceId.
 *    The system resolves the owner from the registered deviceId.
 *
 * Body: { deviceId, temperature, humidity, soilMoisture, lightIntensity, timestamp? }
 */
router.post(
  '/data',
  validateSensorData,
  validate,
  sensorController.processSensorData
);

/**
 * GET /api/sensors/history/:deviceId
 * Get paginated sensor reading history for a device (owner only).
 * Query: ?page=1&limit=20&status=warning
 */
router.get(
  '/history/:deviceId',
  protect,
  validateGetHistory,
  validate,
  sensorController.getSensorHistory
);

// ─── Sensor Notifications ────────────────────────────────────────────────────
// All notification routes require authentication

/**
 * GET /api/sensors/notifications
 * Get paginated sensor alert notifications for the authenticated user.
 * Query: ?page=1&limit=20&isRead=false&status=danger&deviceId=<id>
 */
router.get(
  '/notifications',
  protect,
  validateGetNotifications,
  validate,
  sensorController.getSensorNotifications
);

/**
 * GET /api/sensors/notifications/unread-count
 * Get the count of unread sensor notifications.
 */
router.get('/notifications/unread-count', protect, sensorController.getUnreadSensorNotificationCount);

/**
 * PATCH /api/sensors/notifications/read-all
 * Mark all sensor notifications as read.
 * Must be defined BEFORE /:id/read to avoid 'read-all' being treated as an ID.
 */
router.patch('/notifications/read-all', protect, sensorController.markAllSensorNotificationsRead);

/**
 * PATCH /api/sensors/notifications/:id/read
 * Mark a single sensor notification as read.
 */
router.patch(
  '/notifications/:id/read',
  protect,
  validateNotificationId,
  validate,
  sensorController.markSensorNotificationRead
);

module.exports = router;
