const mongoose = require('mongoose');

/**
 * Stores the evaluation result for a single sensor reading.
 */
const evaluationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['normal', 'warning', 'danger'],
      required: true,
    },
    title: { type: String, default: null },
    message: { type: String, default: null },
    recommendation: { type: [String], default: [] },
  },
  { _id: false }
);

const sensorReadingSchema = new mongoose.Schema(
  {
    // The IoT device that submitted this reading
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      trim: true,
      index: true,
    },
    // The user who owns this device
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    // ── Raw sensor values ─────────────────────────────────────────────────
    temperature: {
      type: Number,
      required: [true, 'Temperature is required'],
    },
    humidity: {
      type: Number,
      required: [true, 'Humidity is required'],
      min: [0, 'Humidity must be between 0 and 100'],
      max: [100, 'Humidity must be between 0 and 100'],
    },
    soilMoisture: {
      type: Number,
      required: [true, 'Soil moisture is required'],
      min: [0, 'Soil moisture must be between 0 and 100'],
      max: [100, 'Soil moisture must be between 0 and 100'],
    },
    lightIntensity: {
      type: Number,
      required: [true, 'Light intensity is required'],
      min: [0, 'Light intensity must be non-negative'],
    },
    // ── Per-sensor evaluation results ─────────────────────────────────────
    evaluations: {
      temperature: { type: evaluationSchema },
      humidity: { type: evaluationSchema },
      soilMoisture: { type: evaluationSchema },
      lightIntensity: { type: evaluationSchema },
    },
    /**
     * Worst status across all sensors for quick filtering.
     * danger > warning > normal
     */
    overallStatus: {
      type: String,
      enum: ['normal', 'warning', 'danger'],
      required: true,
      index: true,
    },
    // Sensor-provided timestamp (may differ from createdAt)
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
sensorReadingSchema.index({ deviceId: 1, createdAt: -1 });
sensorReadingSchema.index({ userId: 1, createdAt: -1 });
sensorReadingSchema.index({ deviceId: 1, overallStatus: 1 });

const SensorReading = mongoose.model('SensorReading', sensorReadingSchema);

module.exports = SensorReading;
