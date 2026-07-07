const { StatusCodes } = require('http-status-codes');
const asyncHandler = require('../utils/asyncHandler');
const sensorDataService = require('../services/sensorData.service');

/**
 * POST /api/sensors/data
 * Receive and process real-time sensor data from an IoT device.
 *
 * The device identifies itself via its hardware deviceId.
 * The system resolves the owner user from that deviceId.
 *
 * Request body: { deviceId, temperature, humidity, soilMoisture, lightIntensity, timestamp? }
 */
const processSensorData = asyncHandler(async (req, res) => {
  const { deviceId, temperature, humidity, soilMoisture, lightIntensity, timestamp } = req.body;

  const result = await sensorDataService.processSensorData({
    deviceId,
    temperature,
    humidity,
    soilMoisture,
    lightIntensity,
    timestamp,
  });

  const { reading, notifications, alerts, savedToDB, statusChanged } = result;

  let message = 'تم استلام بيانات المستشعر ومعالجتها بنجاح.';
  if (reading.overallStatus === 'warning') {
    message = 'تم استلام البيانات. بعض القيم خارج النطاق المثالي — يرجى مراجعة التنبيهات.';
  } else if (reading.overallStatus === 'danger') {
    message = 'تم استلام البيانات. تم اكتشاف قيم حرجة — يجب اتخاذ إجراء فوري!';
  }

  const readingPayload = {
    _id: reading._id || null,
    deviceId: reading.deviceId,
    temperature: reading.temperature,
    humidity: reading.humidity,
    soilMoisture: reading.soilMoisture,
    lightIntensity: reading.lightIntensity,
    evaluations: reading.evaluations,
    overallStatus: reading.overallStatus,
    timestamp: reading.timestamp,
    createdAt: reading.createdAt,
  };

  const responseData = {
    reading: readingPayload,
    notifications: notifications.map((n) => ({
      _id: n._id,
      sensorType: n.sensorType,
      status: n.status,
      title: n.title,
      message: n.message,
      recommendation: n.recommendation,
      currentValue: n.currentValue,
      pushSent: n.pushSent,
      isRead: n.isRead,
      timestamp: n.timestamp,
    })),
    savedToDB,
    statusChanged,
  };

  if (process.env.NODE_ENV === 'development' && alerts.length > 0) {
    responseData.fcmAlerts = alerts;
  }

  // ── Emit real-time sensor data via Socket.IO (ALWAYS, even if not saved) ──
  const io = req.app.get('io');
  if (io) {
    io.to(`device:${deviceId}`).emit('sensor_reading', readingPayload);
  }

  return res.status(StatusCodes.CREATED).json({
    success: true,
    message,
    overallStatus: reading.overallStatus,
    data: responseData,
  });
});

/**
 * GET /api/sensors/history/:deviceId
 * Get paginated sensor reading history for a specific device.
 * Only the device owner can access this.
 *
 * Query params: page, limit, status (normal|warning|danger)
 */
const getSensorHistory = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const { page, limit, status } = req.query;

  const result = await sensorDataService.getSensorHistory(deviceId, req.user._id, {
    page,
    limit,
    status,
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/sensors/notifications
 * Get paginated sensor alert notifications for the authenticated user.
 *
 * Query params: page, limit, isRead, status (warning|danger), deviceId
 */
const getSensorNotifications = asyncHandler(async (req, res) => {
  const { page, limit, isRead, status, deviceId } = req.query;

  const result = await sensorDataService.getSensorNotifications(req.user._id, {
    page,
    limit,
    isRead,
    status,
    deviceId,
  });

  return res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/sensors/notifications/unread-count
 * Get the unread sensor notification count for the authenticated user.
 */
const getUnreadSensorNotificationCount = asyncHandler(async (req, res) => {
  const count = await sensorDataService.getUnreadSensorNotificationCount(req.user._id);

  return res.status(StatusCodes.OK).json({
    success: true,
    data: { unreadCount: count },
  });
});

/**
 * PATCH /api/sensors/notifications/:id/read
 * Mark a single sensor notification as read.
 */
const markSensorNotificationRead = asyncHandler(async (req, res) => {
  const notification = await sensorDataService.markSensorNotificationRead(
    req.params.id,
    req.user._id
  );

  return res.status(StatusCodes.OK).json({
    success: true,
    message: 'Notification marked as read.',
    data: { notification },
  });
});

/**
 * PATCH /api/sensors/notifications/read-all
 * Mark all sensor notifications as read for the authenticated user.
 */
const markAllSensorNotificationsRead = asyncHandler(async (req, res) => {
  const result = await sensorDataService.markAllSensorNotificationsRead(req.user._id);

  return res.status(StatusCodes.OK).json({
    success: true,
    message: 'All sensor notifications marked as read.',
    data: result,
  });
});

module.exports = {
  processSensorData,
  getSensorHistory,
  getSensorNotifications,
  getUnreadSensorNotificationCount,
  markSensorNotificationRead,
  markAllSensorNotificationsRead,
};
