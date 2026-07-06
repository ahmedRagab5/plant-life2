const express = require('express');
const { body, param } = require('express-validator');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const Plant = require('../models/Plant');
const ApiError = require('../utils/ApiError');
const { StatusCodes } = require('http-status-codes');

const router = express.Router();

// All plant routes require authentication
router.use(protect);

// ─── Validation helpers ──────────────────────────────────────────────────────

const validatePlantId = [
  param('id')
    .custom((v) => mongoose.Types.ObjectId.isValid(v))
    .withMessage('Plant ID must be a valid MongoDB ObjectId.'),
];

const validateCreatePlant = [
  body('name')
    .notEmpty().withMessage('Plant name is required.')
    .isString()
    .trim()
    .isLength({ max: 100 }).withMessage('Plant name must not exceed 100 characters.'),

  body('type')
    .notEmpty().withMessage('Plant type is required.')
    .isString().trim(),

  body('location')
    .optional()
    .isString().trim(),

  // thresholds are fully optional — defaults are applied in the Plant model pre-save hook
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * POST /api/plants
 * Create a new plant for the authenticated user.
 * Thresholds default to global values if not provided.
 */
router.post(
  '/',
  validateCreatePlant,
  validate,
  asyncHandler(async (req, res) => {
    const { name, type, location, thresholds } = req.body;

    const plant = await Plant.create({
      userId: req.user._id,
      name,
      type,
      location: location || null,
      thresholds: thresholds || undefined, // undefined triggers pre-save default fill
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: 'Plant created successfully.',
      data: { plant },
    });
  })
);

/**
 * GET /api/plants
 * List all plants owned by the authenticated user.
 * Query: ?isActive=true|false
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = { userId: req.user._id };
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const plants = await Plant.find(filter).sort({ createdAt: -1 }).lean();

    return res.status(StatusCodes.OK).json({
      success: true,
      data: { plants, total: plants.length },
    });
  })
);

/**
 * GET /api/plants/:id
 * Get a single plant by ID (owner only).
 */
router.get(
  '/:id',
  validatePlantId,
  validate,
  asyncHandler(async (req, res) => {
    const plant = await Plant.findById(req.params.id).lean();

    if (!plant) throw ApiError.notFound('Plant not found.');
    if (plant.userId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You do not have permission to view this plant.');
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: { plant },
    });
  })
);

/**
 * PATCH /api/plants/:id
 * Update a plant's name, type, location, thresholds, or isActive status.
 */
router.patch(
  '/:id',
  validatePlantId,
  validate,
  asyncHandler(async (req, res) => {
    const plant = await Plant.findById(req.params.id);

    if (!plant) throw ApiError.notFound('Plant not found.');
    if (plant.userId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You do not have permission to update this plant.');
    }

    const allowedFields = ['name', 'type', 'location', 'thresholds', 'isActive'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        plant[field] = req.body[field];
      }
    });

    await plant.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Plant updated successfully.',
      data: { plant },
    });
  })
);

/**
 * DELETE /api/plants/:id
 * Soft-delete a plant by setting isActive = false.
 */
router.delete(
  '/:id',
  validatePlantId,
  validate,
  asyncHandler(async (req, res) => {
    const plant = await Plant.findById(req.params.id);

    if (!plant) throw ApiError.notFound('Plant not found.');
    if (plant.userId.toString() !== req.user._id.toString()) {
      throw ApiError.forbidden('You do not have permission to delete this plant.');
    }

    plant.isActive = false;
    await plant.save();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: 'Plant deactivated successfully.',
    });
  })
);

module.exports = router;
