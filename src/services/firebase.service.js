const { getMessaging } = require('firebase-admin/messaging');
const { isFirebaseReady } = require('../config/firebase');

/**
 * Sends an FCM push notification to a single device token.
 *
 * This function is fire-and-forget-safe: if Firebase is not initialized
 * or the send fails, the error is logged but NOT re-thrown, so the main
 * request still succeeds.
 *
 * @param {string} fcmToken  - Target device FCM registration token
 * @param {object} payload
 * @param {string} payload.title        - Notification title
 * @param {string} payload.body         - Notification body text
 * @param {object} [payload.data]       - Optional key-value data payload (string values only)
 *
 * @returns {Promise<boolean>} true if sent successfully, false otherwise
 */
const sendPushNotification = async (fcmToken, { title, body, data = {} }) => {
  if (!isFirebaseReady()) {
    console.warn('⚠️  FCM: Firebase is not initialized. Skipping push notification.');
    return false;
  }

  if (!fcmToken) {
    console.warn('⚠️  FCM: No FCM token provided. Skipping push notification.');
    return false;
  }

  // FCM data payload values must all be strings
  const stringifiedData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  const message = {
    token: fcmToken,
    notification: {
      title,
      body,
    },
    data: stringifiedData,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'plant_alerts',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true,
        },
      },
    },
  };

  try {
    const response = await getMessaging().send(message);
    console.log(`✅ FCM push sent. Message ID: ${response}`);
    return true;
  } catch (error) {
    console.error('❌ FCM send failed:', error.code, error.message);
    return false;
  }
};

/**
 * Sends an FCM push notification for a sensor alert.
 * Convenience wrapper that builds the payload from sensor notification data.
 *
 * @param {string} fcmToken
 * @param {object} notificationDoc - SensorNotification document
 * @returns {Promise<boolean>}
 */
const sendSensorAlertPush = async (fcmToken, notificationDoc) => {
  const { title, message, sensorType, currentValue, status, deviceId } = notificationDoc;

  return sendPushNotification(fcmToken, {
    title,
    body: message,
    data: {
      type: 'sensor_alert',
      status,
      sensorType,
      currentValue: String(currentValue),
      deviceId: String(deviceId),
    },
  });
};

module.exports = { sendPushNotification, sendSensorAlertPush };
