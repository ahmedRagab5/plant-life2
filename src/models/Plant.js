const mongoose = require('mongoose');
const { SENSOR_THRESHOLDS } = require('../utils/sensorConstants');

/**
 * Embedded threshold schema for a single sensor.
 * Mirrors the structure in sensorConstants.js so individual plants
 * can override the global defaults.
 */
const sensorThresholdSchema = new mongoose.Schema(
  {
    unit: { type: String },
    normal: {
      min: { type: Number, required: true },
      max: { type: Number, required: true },
    },
    warning: {
      low: {
        min: { type: Number },
        max: { type: Number },
        message: { type: String },
        recommendation: [{ type: String }],
      },
      high: {
        min: { type: Number },
        max: { type: Number },
        message: { type: String },
        recommendation: [{ type: String }],
      },
    },
    danger: {
      low: {
        max: { type: Number },
        message: { type: String },
        recommendation: [{ type: String }],
      },
      high: {
        min: { type: Number },
        message: { type: String },
        recommendation: [{ type: String }],
      },
    },
  },
  { _id: false }
);

const plantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Plant name is required'],
      trim: true,
      maxlength: [100, 'Plant name must not exceed 100 characters'],
    },
    type: {
      type: String,
      required: [true, 'Plant type is required'],
      trim: true,
      lowercase: true,
    },
    location: {
      type: String,
      trim: true,
      default: null,
    },
    /**
     * Per-plant configurable thresholds.
     * If not provided at creation time, defaults from sensorConstants are used.
     */
    thresholds: {
      temperature: { type: sensorThresholdSchema },
      humidity: { type: sensorThresholdSchema },
      soilMoisture: { type: sensorThresholdSchema },
      lightIntensity: { type: sensorThresholdSchema },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
plantSchema.index({ userId: 1, createdAt: -1 });
plantSchema.index({ userId: 1, isActive: 1 });

/**
 * Before saving a new Plant, fill in any missing thresholds
 * from the global defaults in sensorConstants.js.
 */
plantSchema.pre('save', function (next) {
  if (!this.thresholds) {
    this.thresholds = {};
  }

  const sensorTypes = ['temperature', 'humidity', 'soilMoisture', 'lightIntensity'];

  sensorTypes.forEach((sensor) => {
    if (!this.thresholds[sensor]) {
      this.thresholds[sensor] = SENSOR_THRESHOLDS[sensor];
    }
  });

  next();
});

const Plant = mongoose.model('Plant', plantSchema);

module.exports = Plant;
