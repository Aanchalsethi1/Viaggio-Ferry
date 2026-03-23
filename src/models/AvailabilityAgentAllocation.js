const mongoose = require("mongoose")

const CreatorSchema = new mongoose.Schema(
  {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    name: {
      type: String,
      default: "Unknown",
    },
    type: {
      type: String,
      enum: ["company", "user", "system"],
      default: "system",
    },
    layer: {
      type: String,
      default: undefined,
    },
  },
  { _id: false }
)

const agentAllocationSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
      index: true,
    },
    availability: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripAvailability",
      required: true,
      index: true,
    },
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      required: true,
      index: true,
    },
    // The parent agent who created this allocation (null = allocated by company)
    parentAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
      index: true,
    },
    // Allocations by type: passenger, cargo, vehicle
    allocations: [
      {
        type: {
          type: String,
          enum: ["passenger", "cargo", "vehicle"],
          required: true,
        },
        cabins: [
          {
            cabin: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Cabin",
              required: true,
            },
            allocatedSeats: {
              type: Number,
              required: true,
              min: 0,
            },
            _id: false,
          },
        ],
        totalAllocatedSeats: {
          type: Number,
          required: true,
          default: 0,
          min: 0,
        },
        _id: false,
      },
    ],
    // Audit
    createdBy: {
      type: CreatorSchema,
      default: () => ({
        id: null,
        name: "Unknown",
        type: "system",
        layer: undefined,
      }),
    },
    updatedBy: {
      type: CreatorSchema,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
)

// Indexes for common queries
agentAllocationSchema.index({ company: 1, trip: 1, agent: 1 })
agentAllocationSchema.index({ company: 1, availability: 1 })
agentAllocationSchema.index({ company: 1, trip: 1, isDeleted: 1 })
agentAllocationSchema.index({ parentAgent: 1, trip: 1, isDeleted: 1 })
agentAllocationSchema.index({ company: 1, agent: 1, isDeleted: 1 })

module.exports = mongoose.model("AvailabilityAgentAllocation", agentAllocationSchema)
