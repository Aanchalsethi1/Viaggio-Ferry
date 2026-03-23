const mongoose = require("mongoose")
const createHttpError = require("http-errors")
const AvailabilityAgentAllocation = require("../models/AvailabilityAgentAllocation")
const { TripAvailability } = require("../models/TripAvailability")
const { Trip } = require("../models/Trip")
const Partner = require("../models/Partner")
const User = require("../models/User")

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Resolve the agent partner for the authenticated user.
 * - company role: no agent partner; returns null
 * - user role: looks up user.agent
 */
async function resolveAgentPartner(req) {
  const { role, id: userId, companyId } = req.user

  if (role === "company") return null

  const userRecord = await User.findOne({ _id: userId, isDeleted: false }).select("agent")
  if (!userRecord || !userRecord.agent) {
    throw createHttpError(400, "No partner (agent) linked to this user account")
  }

  const partner = await Partner.findOne({
    _id: userRecord.agent,
    company: companyId,
    isDeleted: false,
  }).select("_id name layer parentAccount")

  if (!partner) {
    throw createHttpError(404, "Agent partner account not found")
  }

  return partner
}

/**
 * Verify that childAgentId is a direct child of parentPartnerId in Partner hierarchy.
 */
async function verifyChildHierarchy(parentPartnerId, childAgentId, companyId) {
  const child = await Partner.findOne({
    _id: childAgentId,
    parentAccount: parentPartnerId,
    company: companyId,
    isDeleted: false,
  }).select("_id name layer")

  if (!child) {
    throw createHttpError(400, "Child agent does not belong to your hierarchy")
  }

  if (child.layer === "Marine") {
    throw createHttpError(400, "Cannot allocate to a Marine partner directly; they receive from company")
  }

  return child
}

/**
 * Build audit trail object from request.
 */
function buildAuditTrail(req) {
  return {
    id: req.user?.id,
    name: req.user?.email,
    type: req.user?.role === "company" ? "company" : "user",
    layer: req.user?.layer || undefined,
  }
}

/**
 * Compute total allocated seats for a given type+cabin across child allocations of a parent.
 * Used to validate remaining seats before creating/updating.
 *
 * @param {ObjectId} agentId         - The agent whose allocation we're inspecting
 * @param {ObjectId} tripId
 * @param {ObjectId} companyId
 * @param {string}   type            - "passenger" | "cargo" | "vehicle"
 * @param {ObjectId} cabinId
 * @param {ObjectId} [excludeId]     - allocationId to exclude (for updates)
 */
async function sumChildAllocations(agentId, tripId, companyId, type, cabinId, excludeId = null) {
  // Always cast to ObjectId so aggregation $match works correctly
  const matchFilter = {
    parentAgent: new mongoose.Types.ObjectId(agentId.toString()),
    trip:        new mongoose.Types.ObjectId(tripId.toString()),
    company:     new mongoose.Types.ObjectId(companyId.toString()),
    isDeleted: false,
  }
  if (excludeId) {
    matchFilter._id = { $ne: new mongoose.Types.ObjectId(excludeId.toString()) }
  }

  // cabinId may arrive as a populated object { _id, name, type } or a plain ObjectId/string
  const cabinObjId = new mongoose.Types.ObjectId(
    (cabinId && cabinId._id ? cabinId._id : cabinId).toString()
  )

  const results = await AvailabilityAgentAllocation.aggregate([
    { $match: matchFilter },
    { $unwind: "$allocations" },
    { $match: { "allocations.type": type } },
    { $unwind: "$allocations.cabins" },
    { $match: { "allocations.cabins.cabin": cabinObjId } },
    {
      $group: {
        _id: null,
        total: { $sum: "$allocations.cabins.allocatedSeats" },
      },
    },
  ])

  return results.length > 0 ? results[0].total : 0
}

// ─── 1. GET MY ALLOCATED TRIPS ────────────────────────────────────────────────
/**
 * GET /api/allocations/my-trips
 * Return all trips allocated to the logged-in agent.
 */
const getMyAllocatedTrips = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.id
    const { page = 1, limit = 10 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const agentPartner = await resolveAgentPartner(req)
    if (!agentPartner) {
      throw createHttpError(403, "Company admin should use trip availability APIs directly")
    }

    const filter = {
      agent: agentPartner._id,
      company: companyId,
      isDeleted: false,
    }

    const total = await AvailabilityAgentAllocation.countDocuments(filter)

    const allocations = await AvailabilityAgentAllocation.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: "trip",
        select: "tripName tripCode ship departurePort arrivalPort departureDateTime arrivalDateTime status",
        populate: [
          { path: "ship", select: "name" },
          { path: "departurePort", select: "name code" },
          { path: "arrivalPort", select: "name code" },
        ],
      })
      .populate("availability", "availabilityTypes")
      .populate({
        path: "allocations.cabins.cabin",
        select: "name type",
        model: "Cabin",
      })
      .sort({ createdAt: -1 })
      .lean()

    // Summarise per allocation + compute remainingSeats
    const data = await Promise.all(allocations.map(async (alloc) => {
      const summary = { passenger: 0, cargo: 0, vehicle: 0 }
      const allocationsWithRemaining = await Promise.all(
        (alloc.allocations || []).map(async (a) => {
          let typeTotal = 0
          const cabinsWithRemaining = await Promise.all(
            (a.cabins || []).map(async (c) => {
              typeTotal += c.allocatedSeats
              const alreadyGiven = await sumChildAllocations(
                agentPartner._id,
                alloc.trip?._id || alloc.trip,
                companyId,
                a.type,
                c.cabin
              )
              return {
                ...c,
                allocatedToChildren: alreadyGiven,
                remainingSeats: c.allocatedSeats - alreadyGiven,
              }
            })
          )
          summary[a.type] = typeTotal
          return { ...a, cabins: cabinsWithRemaining }
        })
      )

      return {
        allocationId: alloc._id,
        trip: alloc.trip,
        availability: alloc.availability,
        allocatedPassengerSeats: summary.passenger,
        allocatedCargoSeats: summary.cargo,
        allocatedVehicleSeats: summary.vehicle,
        allocations: allocationsWithRemaining,
        createdAt: alloc.createdAt,
        updatedAt: alloc.updatedAt,
      }
    }))

    res.json({
      success: true,
      count: data.length,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
      data,
    })
  } catch (error) {
    next(error)
  }
}

// ─── 2. GET SINGLE TRIP ALLOCATION DETAILS ────────────────────────────────────
/**
 * GET /api/allocations/my-trips/:tripId
 * Return trip details, availability, agent's own allocation, and child allocations.
 */
const getSingleTripAllocation = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.id
    const { tripId } = req.params

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Invalid tripId")
    }

    const agentPartner = await resolveAgentPartner(req)
    if (!agentPartner) {
      throw createHttpError(403, "Company admin should use trip availability APIs directly")
    }

    // Fetch trip
    const trip = await Trip.findOne({ _id: tripId, company: companyId, isDeleted: false })
      .populate("ship", "name")
      .populate("departurePort", "name code")
      .populate("arrivalPort", "name code")
      .lean()

    if (!trip) throw createHttpError(404, "Trip not found")

    // Fetch trip availability
    const availability = await TripAvailability.findOne({
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })
      .populate("availabilityTypes.cabins.cabin", "name type")
      .lean()

    // Fetch this agent's allocation for the trip
    const myAllocation = await AvailabilityAgentAllocation.findOne({
      trip: tripId,
      agent: agentPartner._id,
      company: companyId,
      isDeleted: false,
    })
      .populate({
        path: "allocations.cabins.cabin",
        select: "name type",
        model: "Cabin",
      })
      .lean()

    // Fetch child allocations created by this agent for this trip
    const childAllocations = await AvailabilityAgentAllocation.find({
      parentAgent: agentPartner._id,
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })
      .populate("agent", "name layer")
      .populate({
        path: "allocations.cabins.cabin",
        select: "name type",
        model: "Cabin",
      })
      .lean()

    // Compute remainingSeats per type+cabin for myAllocation
    let myAllocationWithRemaining = null
    if (myAllocation) {
      const allocationsWithRemaining = await Promise.all(
        (myAllocation.allocations || []).map(async (alloc) => {
          const cabinsWithRemaining = await Promise.all(
            (alloc.cabins || []).map(async (cabinEntry) => {
              const alreadyGiven = await sumChildAllocations(
                agentPartner._id,
                tripId,
                companyId,
                alloc.type,
                cabinEntry.cabin
              )
              return {
                ...cabinEntry,
                allocatedToChildren: alreadyGiven,
                remainingSeats: cabinEntry.allocatedSeats - alreadyGiven,
              }
            })
          )
          return { ...alloc, cabins: cabinsWithRemaining }
        })
      )
      myAllocationWithRemaining = { ...myAllocation, allocations: allocationsWithRemaining }
    }

    res.json({
      success: true,
      data: {
        trip,
        availability: availability || null,
        myAllocation: myAllocationWithRemaining,
        childAllocations,
      },
    })
  } catch (error) {
    next(error)
  }
}

// ─── 3. GET CHILD ALLOCATIONS ─────────────────────────────────────────────────
/**
 * GET /api/allocations/my-child-allocations/:tripId
 * Return all allocations created by logged-in agent for child agents for a given trip.
 */
const getChildAllocations = async (req, res, next) => {
  try {
    const companyId = req.user.companyId || req.user.id
    const { tripId } = req.params

    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Invalid tripId")
    }

    const agentPartner = await resolveAgentPartner(req)
    if (!agentPartner) {
      throw createHttpError(403, "Company admin should use trip availability APIs directly")
    }

    const childAllocations = await AvailabilityAgentAllocation.find({
      parentAgent: agentPartner._id,
      trip: tripId,
      company: companyId,
      isDeleted: false,
    })
      .populate("agent", "name layer")
      .populate({
        path: "trip",
        select: "tripName tripCode departureDateTime",
      })
      .populate({
        path: "allocations.cabins.cabin",
        select: "name type",
        model: "Cabin",
      })
      .lean()

    res.json({
      success: true,
      count: childAllocations.length,
      data: childAllocations,
    })
  } catch (error) {
    next(error)
  }
}

// ─── 4. CREATE CHILD ALLOCATION ───────────────────────────────────────────────
/**
 * POST /api/allocations/child
 * Allocate seats from logged-in agent to a child agent.
 */
const createChildAllocation = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const companyId = req.user.companyId || req.user.id
    const { tripId, childAgentId, allocations } = req.body

    // Basic validation
    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      throw createHttpError(400, "Valid tripId is required")
    }
    if (!childAgentId || !mongoose.Types.ObjectId.isValid(childAgentId)) {
      throw createHttpError(400, "Valid childAgentId is required")
    }
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      throw createHttpError(400, "allocations array is required and must not be empty")
    }

    const agentPartner = await resolveAgentPartner(req)
    if (!agentPartner) {
      throw createHttpError(403, "Company admin cannot use this endpoint; use trip availability APIs")
    }

    // Selling agents cannot allocate further
    if (agentPartner.layer === "Selling") {
      throw createHttpError(403, "Selling agents cannot allocate seats to child agents")
    }

    // Verify child belongs to this agent's hierarchy
    await verifyChildHierarchy(agentPartner._id, childAgentId, companyId)

    // Prevent duplicate allocation for same agent + trip
    const existingAllocation = await AvailabilityAgentAllocation.findOne({
      trip: tripId,
      agent: childAgentId,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (existingAllocation) {
      throw createHttpError(409, "An active allocation already exists for this child agent on this trip. Use the update endpoint instead.")
    }

    // Fetch this agent's own allocation for the trip
    const myAllocation = await AvailabilityAgentAllocation.findOne({
      trip: tripId,
      agent: agentPartner._id,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (!myAllocation) {
      throw createHttpError(400, "You do not have an allocation for this trip. You cannot allocate what you don't have.")
    }

    // Fetch trip availability for updating allocatedSeats
    const tripAvailability = await TripAvailability.findOne({
      trip: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (!tripAvailability) {
      throw createHttpError(404, "Trip availability not found")
    }

    // Validate each allocation type and cabin against parent remaining seats
    const processedAllocations = []

    for (const alloc of allocations) {
      const { type, cabins } = alloc

      if (!["passenger", "cargo", "vehicle"].includes(type)) {
        throw createHttpError(400, `Invalid allocation type: ${type}`)
      }
      if (!cabins || !Array.isArray(cabins) || cabins.length === 0) {
        throw createHttpError(400, `cabins array is required for type: ${type}`)
      }

      // Find parent's allocation entry for this type
      const myTypeAllocation = (myAllocation.allocations || []).find((a) => a.type === type)
      if (!myTypeAllocation) {
        throw createHttpError(400, `You have no allocation for type: ${type}`)
      }

      const processedCabins = []
      let totalAllocatedSeats = 0

      for (const cabinEntry of cabins) {
        const { cabin: cabinId, allocatedSeats } = cabinEntry

        if (!cabinId || !mongoose.Types.ObjectId.isValid(cabinId)) {
          throw createHttpError(400, `Invalid cabinId in ${type} allocation`)
        }
        if (!allocatedSeats || typeof allocatedSeats !== "number" || allocatedSeats <= 0) {
          throw createHttpError(400, `allocatedSeats must be a positive number for cabin ${cabinId}`)
        }

        // Find parent's seats for this cabin
        const parentCabin = (myTypeAllocation.cabins || []).find(
          (c) => c.cabin.toString() === cabinId.toString()
        )
        if (!parentCabin) {
          throw createHttpError(400, `You have no allocation for cabin ${cabinId} in type ${type}`)
        }

        // Sum all existing child allocations for this cabin from this agent
        const alreadyAllocatedToChildren = await sumChildAllocations(
          agentPartner._id,
          tripId,
          companyId,
          type,
          cabinId
        )

        // remaining = what this agent was given - what they already gave to children
        const parentRemaining = parentCabin.allocatedSeats - alreadyAllocatedToChildren

        if (allocatedSeats > parentRemaining) {
          throw createHttpError(
            400,
            `Insufficient remaining seats for cabin ${cabinId} (type: ${type}). ` +
            `Your total: ${parentCabin.allocatedSeats}, Already assigned to children: ${alreadyAllocatedToChildren}, ` +
            `Remaining: ${parentRemaining}, Requested: ${allocatedSeats}`
          )
        }

        processedCabins.push({ cabin: cabinId, allocatedSeats })
        totalAllocatedSeats += allocatedSeats

        // NOTE: Do NOT touch TripAvailability.allocatedSeats here.
        // TripAvailability.allocatedSeats tracks company→marine allocations only.
        // Agent-to-agent sub-allocations are tracked via AvailabilityAgentAllocation.parentAgent.
      }

      processedAllocations.push({ type, cabins: processedCabins, totalAllocatedSeats })
    }

    // Create new allocation document (no TripAvailability update needed)
    const availabilityId = tripAvailability._id

    // Create new allocation document
    const newAllocation = new AvailabilityAgentAllocation({
      company: companyId,
      trip: tripId,
      availability: availabilityId,
      agent: childAgentId,
      parentAgent: agentPartner._id,
      allocations: processedAllocations,
      createdBy: buildAuditTrail(req),
    })

    await newAllocation.save({ session })
    await session.commitTransaction()
    session.endSession()

    res.status(201).json({
      success: true,
      message: "Allocation created successfully",
      data: newAllocation,
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}

// ─── 5. UPDATE ALLOCATION ─��───────────────────────────────────────────────────
/**
 * PUT /api/allocations/:allocationId
 * Update seats in an existing child allocation.
 */
const updateAllocation = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const companyId = req.user.companyId || req.user.id
    const { allocationId } = req.params
    const { allocations } = req.body

    if (!mongoose.Types.ObjectId.isValid(allocationId)) {
      throw createHttpError(400, "Invalid allocationId")
    }
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      throw createHttpError(400, "allocations array is required")
    }

    const agentPartner = await resolveAgentPartner(req)
    if (!agentPartner) {
      throw createHttpError(403, "Company admin cannot use this endpoint")
    }

    // Find the allocation — must have been created by this agent
    const existingAllocation = await AvailabilityAgentAllocation.findOne({
      _id: allocationId,
      parentAgent: agentPartner._id,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (!existingAllocation) {
      throw createHttpError(404, "Allocation not found or you do not have permission to update it")
    }

    // Fetch parent's allocation for the same trip
    const myAllocation = await AvailabilityAgentAllocation.findOne({
      trip: existingAllocation.trip,
      agent: agentPartner._id,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (!myAllocation) {
      throw createHttpError(400, "Your allocation for this trip was not found")
    }

    // Fetch trip availability
    const tripAvailability = await TripAvailability.findOne({
      trip: existingAllocation.trip,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (!tripAvailability) {
      throw createHttpError(404, "Trip availability not found")
    }

    const processedAllocations = []

    for (const alloc of allocations) {
      const { type, cabins } = alloc

      if (!["passenger", "cargo", "vehicle"].includes(type)) {
        throw createHttpError(400, `Invalid allocation type: ${type}`)
      }

      const myTypeAllocation = (myAllocation.allocations || []).find((a) => a.type === type)
      if (!myTypeAllocation) {
        throw createHttpError(400, `You have no allocation for type: ${type}`)
      }

      const existingTypeAlloc = (existingAllocation.allocations || []).find((a) => a.type === type)
      const processedCabins = []
      let totalAllocatedSeats = 0

      for (const cabinEntry of cabins) {
        const { cabin: cabinId, allocatedSeats: newSeats } = cabinEntry

        if (!cabinId || !mongoose.Types.ObjectId.isValid(cabinId)) {
          throw createHttpError(400, `Invalid cabinId in ${type} allocation`)
        }
        if (typeof newSeats !== "number" || newSeats < 0) {
          throw createHttpError(400, `allocatedSeats must be a non-negative number for cabin ${cabinId}`)
        }

        // Old seats for this cabin in the existing allocation
        const oldCabin = existingTypeAlloc
          ? (existingTypeAlloc.cabins || []).find((c) => c.cabin.toString() === cabinId.toString())
          : null
        const oldSeats = oldCabin ? oldCabin.allocatedSeats : 0
        const seatDiff = newSeats - oldSeats // positive = more seats needed, negative = seats returned

        if (seatDiff !== 0) {
          const parentCabin = (myTypeAllocation.cabins || []).find(
            (c) => c.cabin.toString() === cabinId.toString()
          )
          if (!parentCabin) {
            throw createHttpError(400, `You have no allocation for cabin ${cabinId} in type ${type}`)
          }

          // Sum all other child allocations (excluding this one being updated)
          const alreadyAllocatedToOthers = await sumChildAllocations(
            agentPartner._id,
            existingAllocation.trip,
            companyId,
            type,
            cabinId,
            allocationId
          )

          // remaining = parent's seats - what already given to OTHER children
          const parentRemaining = parentCabin.allocatedSeats - alreadyAllocatedToOthers

          if (newSeats > parentRemaining) {
            throw createHttpError(
              400,
              `Insufficient remaining seats for cabin ${cabinId} (type: ${type}). ` +
              `Your total: ${parentCabin.allocatedSeats}, Already assigned to others: ${alreadyAllocatedToOthers}, ` +
              `Remaining: ${parentRemaining}, Requested: ${newSeats}`
            )
          }

          // NOTE: Do NOT touch TripAvailability.allocatedSeats here.
          // TripAvailability tracks company→marine only; agent sub-allocations
          // are tracked via AvailabilityAgentAllocation.parentAgent.
        }

        processedCabins.push({ cabin: cabinId, allocatedSeats: newSeats })
        totalAllocatedSeats += newSeats
      }

      processedAllocations.push({ type, cabins: processedCabins, totalAllocatedSeats })
    }

    // Update allocation document (no TripAvailability mutation for agent sub-allocations)
    existingAllocation.allocations = processedAllocations
    existingAllocation.updatedBy = buildAuditTrail(req)
    await existingAllocation.save({ session })

    await session.commitTransaction()
    session.endSession()

    res.json({
      success: true,
      message: "Allocation updated successfully",
      data: existingAllocation,
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}

// ─── 6. DELETE ALLOCATION ─────────────────────────────────────────────────────
/**
 * DELETE /api/allocations/:allocationId
 * Soft-delete allocation and return seats to parent.
 */
const deleteAllocation = async (req, res, next) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const companyId = req.user.companyId || req.user.id
    const { allocationId } = req.params

    if (!mongoose.Types.ObjectId.isValid(allocationId)) {
      throw createHttpError(400, "Invalid allocationId")
    }

    const agentPartner = await resolveAgentPartner(req)
    if (!agentPartner) {
      throw createHttpError(403, "Company admin cannot use this endpoint")
    }

    const allocation = await AvailabilityAgentAllocation.findOne({
      _id: allocationId,
      parentAgent: agentPartner._id,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (!allocation) {
      throw createHttpError(404, "Allocation not found or you do not have permission to delete it")
    }

    // Fetch trip availability to return seats
    const tripAvailability = await TripAvailability.findOne({
      trip: allocation.trip,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (tripAvailability) {
      // Return all allocated seats back to TripAvailability
      for (const alloc of allocation.allocations || []) {
        const availType = (tripAvailability.availabilityTypes || []).find((at) => at.type === alloc.type)
        if (availType) {
          for (const cabinEntry of alloc.cabins || []) {
            const availCabin = (availType.cabins || []).find(
              (c) => c.cabin.toString() === cabinEntry.cabin.toString()
            )
            if (availCabin) {
              availCabin.allocatedSeats = Math.max(0, (availCabin.allocatedSeats || 0) - cabinEntry.allocatedSeats)
            }
          }
        }
      }
      await tripAvailability.save({ session })
    }

    // Soft delete the allocation
    allocation.isDeleted = true
    allocation.updatedBy = buildAuditTrail(req)
    await allocation.save({ session })

    await session.commitTransaction()
    session.endSession()

    res.json({
      success: true,
      message: "Allocation deleted and seats returned to parent successfully",
    })
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    next(error)
  }
}

module.exports = {
  getMyAllocatedTrips,
  getSingleTripAllocation,
  getChildAllocations,
  createChildAllocation,
  updateAllocation,
  deleteAllocation,
}
