const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const { StatusCodes } = require('http-status-codes');

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const result = await authService.register({ name, email, password });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: 'تم إنشاء الحساب بنجاح',
    data: result,
  });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'تم تسجيل الدخول بنجاح',
    data: result,
  });
});

/**
 * POST /api/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);

  res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar,
        deviceId: req.user.deviceId || null,
        createdAt: req.user.createdAt,
      },
    },
  });
});

/**
 * PATCH /api/auth/fcm-token
 * Store or update the authenticated user's FCM device token.
 * Called by mobile apps after Firebase registration.
 */
const updateFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body;

  await authService.updateFcmToken(req.user._id, fcmToken);

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'FCM token updated successfully.',
  });
});

/**
 * PATCH /api/auth/device
 * Register or update the authenticated user's IoT device ID.
 * The device ID is the hardware identifier of the sensor device.
 * It is the link between sensor readings and this user account.
 */
const updateDeviceId = asyncHandler(async (req, res) => {
  const { deviceId } = req.body;

  const result = await authService.updateDeviceId(req.user._id, deviceId);

  res.status(StatusCodes.OK).json({
    success: true,
    message: `Device "${result.deviceId}" registered successfully.`,
    data: result,
  });
});

module.exports = { register, login, refreshToken, getMe, updateFcmToken, updateDeviceId };

