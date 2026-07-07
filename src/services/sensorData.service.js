const User = require('../models/User');
const SensorReading = require('../models/SensorReading');
const SensorNotification = require('../models/SensorNotification');
const ApiError = require('../utils/ApiError');
const { evaluateAllSensors } = require('./sensorEvaluation.service');
const { sendSensorAlertPush } = require('./firebase.service');
const { SENSOR_THRESHOLDS } = require('../utils/sensorConstants');
const pagination = require('../utils/pagination');

/**
 * Process incoming IoT sensor data.
 *
 * The device ID is the link between the hardware device and the user.
 * No Plant lookup is needed — global thresholds from sensorConstants are used.
 *
 * Steps:
 *  1. Find the User who owns this deviceId (validates device is registered).
 *  2. Evaluate all sensor values against global thresholds.
 *  3. Save the SensorReading to MongoDB.
 *  4. For each sensor in Warning  → create SensorNotification (no push).
 *  5. For each sensor in Danger   → create SensorNotification + send FCM push.
 *  6. Return the saved reading + all notifications created.
 *
 * @param {object} params
 * @param {string} params.deviceId       - IoT device hardware ID
 * @param {number} params.temperature
 * @param {number} params.humidity
 * @param {number} params.soilMoisture
 * @param {number} params.lightIntensity
 * @param {Date}   [params.timestamp]
 *
 * @returns {Promise<{ reading, notifications, alerts }>}
 */
const processSensorData = async ({
  deviceId,
  temperature,
  humidity,
  soilMoisture,
  lightIntensity,
  timestamp,
}) => {
  // 1 ── Find user by deviceId ─────────────────────────────────────────────
  const user = await User.findOne({ deviceId }).select('+fcmToken');

  if (!user) {
    throw ApiError.notFound(
      `No user account is registered with device ID "${deviceId}". ` +
      'Please register this device via PATCH /api/auth/device.'
    );
  }

  const userId = user._id;
  const fcmToken = user.fcmToken || null;

  // 2 ── Evaluate all sensors against global thresholds ────────────────────
  const rawReading = { temperature, humidity, soilMoisture, lightIntensity };
  const { evaluations, overallStatus } = evaluateAllSensors(rawReading, SENSOR_THRESHOLDS);

  let reading;
  let savedToDB = false;
  const notifications = [];
  const alerts = [];

  // 3 ── Save SensorReading only when status CHANGES from the last saved one ─
  const lastReading = await SensorReading.findOne({ deviceId })
    .sort({ createdAt: -1 })
    .select('overallStatus')
    .lean();

  const lastStatus = lastReading ? lastReading.overallStatus : null;
  const statusChanged = lastStatus !== overallStatus;

  if (statusChanged) {
    reading = await SensorReading.create({
      deviceId,
      userId,
      temperature,
      humidity,
      soilMoisture,
      lightIntensity,
      evaluations,
      overallStatus,
      timestamp: timestamp || new Date(),
    });
    savedToDB = true;
  } else {
    // Build a local object for API response & Socket.IO (not persisted)
    reading = {
      deviceId,
      userId,
      temperature,
      humidity,
      soilMoisture,
      lightIntensity,
      evaluations,
      overallStatus,
      timestamp: timestamp || new Date(),
      createdAt: new Date(),
    };
  }

  // 4 ── Handle notifications for Warning & Danger (only on status transition) ─
  //      Save SensorNotification for both; FCM push only for danger.
  if (statusChanged && (overallStatus === 'warning' || overallStatus === 'danger')) {
    const sensorTypes = ['temperature', 'humidity', 'soilMoisture', 'lightIntensity'];

    for (const sensorType of sensorTypes) {
      const evaluation = evaluations[sensorType];

      // Save notification for warning or danger sensors
      if (evaluation.status === 'warning' || evaluation.status === 'danger') {
        const notifData = {
          userId,
          deviceId,
          readingId: reading._id || null,
          sensorType,
          currentValue: rawReading[sensorType],
          status: evaluation.status,
          title: evaluation.title,
          message: evaluation.message,
          recommendation: evaluation.recommendation,
          timestamp: reading.timestamp,
          pushSent: false,
        };

        // Only send FCM push for danger-level sensors
        if (evaluation.status === 'danger') {
          const pushSent = await sendSensorAlertPush(fcmToken, {
            title: evaluation.title,
            message: evaluation.message,
            sensorType,
            currentValue: rawReading[sensorType],
            status: 'danger',
            deviceId,
          });

          if (pushSent) {
            notifData.pushSent = true;
            alerts.push({
              sensorType,
              status: 'danger',
              pushSent,
              fcmTokenPresent: !!fcmToken,
            });
          }
        }

        const notification = await SensorNotification.create(notifData);
        notifications.push(notification);
      }
    }
  } else if (statusChanged && overallStatus === 'normal') {
    // 5 ── Problem Solved Check: transition from danger to normal ─────────────
    const unresolvedDangerAlerts = await SensorNotification.find({
      deviceId,
      status: 'danger',
      isRead: false,
    });

    if (unresolvedDangerAlerts.length > 0) {
      // Mark all previous danger notifications as read
      await SensorNotification.updateMany(
        { deviceId, status: 'danger', isRead: false },
        { isRead: true }
      );

      const resolvedTitle = '✅ تم حل المشكلة — الحالة طبيعية';
      const resolvedMsg = 'عادت جميع قراءات أجهزة الاستشعار إلى المعدلات الطبيعية الآمنة.';

      // Send the FCM push directly without saving a resolved notification in the DB
      const pushSent = await sendSensorAlertPush(fcmToken, {
        title: resolvedTitle,
        message: resolvedMsg,
        sensorType: unresolvedDangerAlerts[0].sensorType,
        currentValue: rawReading[unresolvedDangerAlerts[0].sensorType],
        status: 'normal',
        deviceId,
      });

      alerts.push({
        sensorType: unresolvedDangerAlerts[0].sensorType,
        status: 'normal',
        pushSent,
        fcmTokenPresent: !!fcmToken,
      });
    }
  }

  return { reading, notifications, alerts, savedToDB, statusChanged };
};

/**
 * Get paginated sensor reading history for a device.
 * Only accessible by the device owner.
 *
 * @param {string} deviceId
 * @param {string} userId         - Authenticated user's ID (ownership check)
 * @param {object} options        - { page, limit, status }
 */
const getSensorHistory = async (deviceId, userId, { page = 1, limit = 20, status } = {}) => {
  // Verify the device belongs to this user
  const user = await User.findOne({ deviceId, _id: userId });
  if (!user) {
    throw ApiError.forbidden(
      'Device not found or you do not have permission to view its readings.'
    );
  }

  const filter = { deviceId };
  if (status) filter.overallStatus = status;

  const total = await SensorReading.countDocuments(filter);
  const paginationInfo = pagination({ page, limit }, total);

  const readings = await SensorReading.find(filter)
    .sort({ createdAt: -1 })
    .skip(paginationInfo.skip)
    .limit(paginationInfo.limit)
    .lean();

  return {
    deviceId,
    readings,
    pagination: {
      page: paginationInfo.page,
      limit: paginationInfo.limit,
      totalPages: paginationInfo.totalPages,
      total: paginationInfo.total,
    },
  };
};

/**
 * Get paginated sensor notifications for the authenticated user.
 *
 * @param {string} userId
 * @param {object} options - { page, limit, isRead, status, deviceId }
 */
const getSensorNotifications = async (
  userId,
  { page = 1, limit = 20, isRead, status, deviceId } = {}
) => {
  const filter = { userId };
  if (isRead !== undefined) filter.isRead = isRead === 'true' || isRead === true;
  if (status) filter.status = status;
  if (deviceId) filter.deviceId = deviceId;

  const total = await SensorNotification.countDocuments(filter);
  const paginationInfo = pagination({ page, limit }, total);

  const notifications = await SensorNotification.find(filter)
    .sort({ createdAt: -1 })
    .skip(paginationInfo.skip)
    .limit(paginationInfo.limit)
    .lean();

  return {
    notifications,
    pagination: {
      page: paginationInfo.page,
      limit: paginationInfo.limit,
      totalPages: paginationInfo.totalPages,
      total: paginationInfo.total,
    },
  };
};

/**
 * Mark a single sensor notification as read.
 *
 * @param {string} notificationId
 * @param {string} userId
 */
const markSensorNotificationRead = async (notificationId, userId) => {
  const notification = await SensorNotification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw ApiError.notFound('Sensor notification not found.');
  }

  return notification;
};

/**
 * Mark all sensor notifications as read for a user.
 *
 * @param {string} userId
 */
const markAllSensorNotificationsRead = async (userId) => {
  const result = await SensorNotification.updateMany(
    { userId, isRead: false },
    { isRead: true }
  );
  return { updated: result.modifiedCount };
};

/**
 * Get unread sensor notification count for a user.
 *
 * @param {string} userId
 */
const getUnreadSensorNotificationCount = async (userId) => {
  return SensorNotification.countDocuments({ userId, isRead: false });
};

module.exports = {
  processSensorData,
  getSensorHistory,
  getSensorNotifications,
  markSensorNotificationRead,
  markAllSensorNotificationsRead,
  getUnreadSensorNotificationCount,
};
