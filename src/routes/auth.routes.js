const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('الاسم مطلوب')
      .isLength({ min: 2, max: 50 })
      .withMessage('الاسم يجب أن يكون بين 2 و 50 حرفًا'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('البريد الإلكتروني مطلوب')
      .isEmail()
      .withMessage('يرجى إدخال بريد إلكتروني صحيح')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('كلمة المرور مطلوبة')
      .isLength({ min: 6 })
      .withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    validate,
  ],
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('البريد الإلكتروني مطلوب')
      .isEmail()
      .withMessage('يرجى إدخال بريد إلكتروني صحيح')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('كلمة المرور مطلوبة'),
    validate,
  ],
  authController.login
);

// POST /api/auth/refresh-token
router.post(
  '/refresh-token',
  [
    body('refreshToken')
      .notEmpty()
      .withMessage('رمز التحديث مطلوب'),
    validate,
  ],
  authController.refreshToken
);

// GET /api/auth/me (protected)
router.get('/me', protect, authController.getMe);

// PATCH /api/auth/fcm-token (protected)
// Store or update the user's FCM device token for push notifications
router.patch(
  '/fcm-token',
  protect,
  [
    body('fcmToken')
      .notEmpty()
      .withMessage('fcmToken is required.')
      .isString()
      .withMessage('fcmToken must be a string.'),
    validate,
  ],
  authController.updateFcmToken
);

// PATCH /api/auth/device (protected)
// Register the IoT sensor device ID for this user account.
// The deviceId links the hardware device to the user — must be unique across all users.
router.patch(
  '/device',
  protect,
  [
    body('deviceId')
      .notEmpty()
      .withMessage('deviceId is required.')
      .isString()
      .withMessage('deviceId must be a string.')
      .trim(),
    validate,
  ],
  authController.updateDeviceId
);

module.exports = router;
