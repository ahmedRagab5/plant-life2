const mongoose = require('mongoose');

/**
 * IoT sensor alert notification.
 * Decoupled from the existing Notification model (which handles scan/heal-plan alerts).
 * Each document represents one sensor that crossed a warning or danger threshold.
 */
const sensorNotificationSchema = new mongoose.Schema(
  {
    // The user who owns the device
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // The IoT device that triggered this notification
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      trim: true,
      index: true,
    },
    // The sensor reading that triggered this notification
    readingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SensorReading',
      default: null,
    },
    sensorType: {
      type: String,
      enum: ['temperature', 'humidity', 'soilMoisture', 'lightIntensity'],
      required: [true, 'Sensor type is required'],
    },
    currentValue: {
      type: Number,
      required: [true, 'Current sensor value is required'],
    },
    status: {
      type: String,
      enum: ['warning', 'danger', 'normal'],
      required: [true, 'Status is required'],
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    recommendation: {
      type: [String],
      default: [],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Sensor-provided timestamp from the triggering reading
    timestamp: {
      type: Date,
      default: Date.now,
    },
    // True if an FCM push notification was successfully sent
    pushSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
sensorNotificationSchema.index({ userId: 1, createdAt: -1 });
sensorNotificationSchema.index({ userId: 1, isRead: 1 });
sensorNotificationSchema.index({ deviceId: 1, createdAt: -1 });

const SensorNotification = mongoose.model('SensorNotification', sensorNotificationSchema);

module.exports = SensorNotification;
