const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Register a new user.
 */
const register = async ({ name, email, password }) => {
  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw ApiError.badRequest('البريد الإلكتروني مسجل بالفعل');
  }

  const user = await User.create({ name, email, password });

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Store refresh token in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Login an existing user.
 */
const login = async ({ email, password }) => {
  // Find user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw ApiError.unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw ApiError.unauthorized('البريد الإلكتروني أو كلمة المرور غير صحيحة');
  }

  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Store refresh token in DB
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Refresh access token using a valid refresh token.
 */
const refreshAccessToken = async (refreshToken) => {
  const jwt = require('jsonwebtoken');
  const env = require('../config/env');

  if (!refreshToken) {
    throw ApiError.unauthorized('رمز التحديث مطلوب');
  }

  try {
    const decoded = jwt.verify(refreshToken, env.jwtRefreshSecret);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('رمز التحديث غير صالح');
    }

    // Generate new tokens
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.unauthorized('رمز التحديث غير صالح أو منتهي');
  }
};

/**
 * Update the FCM device token for a user.
 * @param {string} userId
 * @param {string} fcmToken
 */
const updateFcmToken = async (userId, fcmToken) => {
  await User.findByIdAndUpdate(userId, { fcmToken });
};

/**
 * Register an IoT device ID for a user.
 * The deviceId must be unique — it is the hardware identifier of the
 * sensor device and links all its sensor readings to this user account.
 *
 * @param {string} userId
 * @param {string} deviceId
 */
const updateDeviceId = async (userId, deviceId) => {
  // Check if another user already owns this device
  const existing = await User.findOne({ deviceId, _id: { $ne: userId } });
  if (existing) {
    throw ApiError.badRequest(
      `Device "${deviceId}" is already registered to another account.`
    );
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { deviceId },
    { new: true }
  );

  return { deviceId: user.deviceId };
};

module.exports = { register, login, refreshAccessToken, updateFcmToken, updateDeviceId };

