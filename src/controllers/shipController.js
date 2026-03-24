const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const { Ship } = require("../models/Ship")
const { Cabin } = require("../models/Cabin")

/**
 * Helper function to build actor object based on user role
 */
function buildActor(user) {
  if (!user) {
    return { type: "system", name: "System" }
  }

  if (user.role === "company") {
    return {
      id: user.id,
      name: user.email,
      type: "company",
    }
  }

  return {
    id: user.id,
    name: user.email,
    type: "user",
    layer: user.layer,
  }
}

/**
 * Validate capacity array with cabin integration
 * @param {Array} capacityArray - Array of capacity objects
 * @param {String} cabinType - Expected cabin type ("passenger", "cargo", "vehicle")
 * @returns {Array} Cleaned and validated capacity array
 */
async function validateAndCleanCapacity(capacityArray, cabinType, companyId) {
  if (!Array.isArray(capacityArray)) {
    return []
  }

  // Filter out empty rows
  const nonEmpty = capacityArray.filter((row) => row && row.cabinId)

  // Validate each cabin reference
  const validated = []
  for (const row of nonEmpty) {
    if (!mongoose.Types.ObjectId.isValid(row.cabinId)) {
      throw createHttpError(400, `Invalid cabin ID format: ${row.cabinId}`)
    }

    console.log("[v0] Validating cabin - ID:", row.cabinId, "Expected type:", cabinType, "Company:", companyId)

    // Fetch cabin and validate type
    const cabin = await Cabin.findOne({
      _id: row.cabinId,
      company: companyId,
      type: cabinType.toLowerCase(),
      isDeleted: false,
    }).lean()

    console.log("[v0] Found cabin:", cabin ? { _id: cabin._id, type: cabin.type, name: cabin.name } : "NOT FOUND")

    if (!cabin) {
      // Debug: Check if cabin exists at all (regardless of type)
      const cabinAny = await Cabin.findOne({
        _id: row.cabinId,
        company: companyId,
        isDeleted: false,
      }).lean()
      console.log("[v0] Cabin exists (any type)?", cabinAny ? { _id: cabinAny._id, type: cabinAny.type } : "NO")
      
      throw createHttpError(400, `Cabin ${row.cabinId} not found or type mismatch for ${cabinType}`)
    }

    validated.push({
      cabinId: row.cabinId,
      cabinName: cabin.name,
      ...(cabinType === "passenger" && {
        totalWeightKg: row.totalWeightKg,
        seats: row.seats,
      }),
      ...(cabinType !== "passenger" && {
        totalWeightTons: row.totalWeightTons,
        spots: row.spots,
      }),
    })
  }

  return validated
}

/**
 * GET /api/ships
 * List all ships for the company with pagination and search
 */
const listShips = async (req, res, next) => {
  try {
    const { companyId } = req
    const { page = 1, limit = 10, search = "" } = req.query

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10))
    const skip = (pageNum - 1) * limitNum

    // Build query
    const query = {
      company: companyId,
      isDeleted: false,
    }

    // Add search filter
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i")
      query.$or = [{ name: searchRegex }, { imoNumber: searchRegex }, { flagState: searchRegex }]
    }

    // Fetch ships and total count
    const [ships, total] = await Promise.all([
      Ship.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Ship.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limitNum)

    res.status(200).json({
      success: true,
      message: "Ships retrieved successfully",
      data: {
        ships,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/ships/:id
 * Get a specific ship by ID
 */
const getShipById = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid ship ID format")
    }

    const ship = await Ship.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    }).lean()

    if (!ship) {
      throw createHttpError(404, "Ship not found")
    }

    res.status(200).json({
      success: true,
      message: "Ship retrieved successfully",
      data: ship,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Helper function to safely parse and convert numeric fields in capacity arrays
 */
const parseAndConvertCapacity = (capacity) => {
  if (!capacity) return [];
  if (typeof capacity === "string") {
    try {
      capacity = JSON.parse(capacity);
    } catch (err) {
      throw createHttpError(400, `Invalid capacity format: ${err.message}`);
    }
  }
  if (!Array.isArray(capacity)) {
    throw createHttpError(400, "Capacity must be an array");
  }
  // Convert numeric strings to numbers
  return capacity.map(item => ({
    ...item,
    totalWeightKg: item.totalWeightKg ? Number(item.totalWeightKg) : 0,
    totalWeightTons: item.totalWeightTons ? Number(item.totalWeightTons) : 0,
    seats: item.seats ? Number(item.seats) : 0,
    spots: item.spots ? Number(item.spots) : 0,
  }));
};

/**
 * Helper function to safely parse and convert technical specifications
 */
const parseAndConvertTechnical = (technical) => {
  if (!technical) return {};
  if (typeof technical === "string") {
    try {
      technical = JSON.parse(technical);
    } catch (err) {
      throw createHttpError(400, `Invalid technical specifications format: ${err.message}`);
    }
  }
  if (typeof technical !== "object") {
    throw createHttpError(400, "Technical specifications must be an object");
  }
  // Convert numeric strings to numbers
  return {
    grossTonnage: technical.grossTonnage ? Number(technical.grossTonnage) : 0,
    netTonnage: technical.netTonnage ? Number(technical.netTonnage) : 0,
    loa: technical.loa ? Number(technical.loa) : 0,
    beam: technical.beam ? Number(technical.beam) : 0,
    draft: technical.draft ? Number(technical.draft) : 0,
  };
};

/**
 * POST /api/ships
 * Create a new ship
 */
const createShip = async (req, res, next) => {
  try {
    const { companyId, user } = req
    let { name, status = "Active", passengerCapacity = [], cargoCapacity = [], vehicleCapacity = [], technical = {}, ...rest } =
      req.body

    console.log("[v0] Create ship - Raw req.body:", JSON.stringify(req.body, null, 2))

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Parse and convert nested objects and arrays with error handling
    try {
      passengerCapacity = parseAndConvertCapacity(passengerCapacity)
      cargoCapacity = parseAndConvertCapacity(cargoCapacity)
      vehicleCapacity = parseAndConvertCapacity(vehicleCapacity)
      technical = parseAndConvertTechnical(technical)
    } catch (parseErr) {
      return next(parseErr)
    }

    console.log("[v0] Create ship - Parsed passengerCapacity:", passengerCapacity)
    console.log("[v0] Create ship - Parsed cargoCapacity:", cargoCapacity)
    console.log("[v0] Create ship - Parsed vehicleCapacity:", vehicleCapacity)
    console.log("[v0] Create ship - Parsed technical:", technical)

    // Validate required fields
    if (!name || !name.trim()) {
      throw createHttpError(400, "Missing required field: name")
    }

    if (!status) {
      throw createHttpError(400, "Missing required field: status")
    }

    // Validate status
    const validStatuses = ["Active", "Inactive"]
    if (!validStatuses.includes(status)) {
      throw createHttpError(400, `Status must be one of: ${validStatuses.join(", ")}`)
    }

    // Validate and clean capacity arrays with cabin integration (ensure lowercase types)
    const validPassengerCapacity = await validateAndCleanCapacity(passengerCapacity, "passenger", companyId)
    const validCargoCapacity = await validateAndCleanCapacity(cargoCapacity, "cargo", companyId)
    const validVehicleCapacity = await validateAndCleanCapacity(vehicleCapacity, "vehicle", companyId)
    
    console.log("[v0] Create ship - passengerCapacity validated:", validPassengerCapacity)
    console.log("[v0] Create ship - cargoCapacity validated:", validCargoCapacity)
    console.log("[v0] Create ship - vehicleCapacity validated:", validVehicleCapacity)

    // Process uploaded documents
    const documents = []
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        documents.push({
          fileName: file.originalname,
          fileUrl: `/uploads/ships/${file.filename}`,
          fileType: file.mimetype === "application/pdf" ? "pdf" : "image",
        })
      }
    }

    // Build createdBy object
    const createdBy = buildActor(user)

    // Create ship
    const ship = new Ship({
      company: companyId,
      name: name.trim(),
      status,
      passengerCapacity: validPassengerCapacity,
      cargoCapacity: validCargoCapacity,
      vehicleCapacity: validVehicleCapacity,
      technical,
      documents,
      createdBy,
      ...rest,
    })

    await ship.save()

    res.status(201).json({
      success: true,
      message: "Ship created successfully",
      data: ship.toObject(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/ships/:id
 * Update an existing ship
 */
const updateShip = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, user } = req
    let { passengerCapacity, cargoCapacity, vehicleCapacity, technical, ...updates } = req.body

    console.log("[v0] Update ship - Raw req.body:", JSON.stringify(req.body, null, 2))

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid ship ID format")
    }

    // Parse and convert nested objects and arrays with error handling
    try {
      if (passengerCapacity) {
        passengerCapacity = parseAndConvertCapacity(passengerCapacity)
      }
      if (cargoCapacity) {
        cargoCapacity = parseAndConvertCapacity(cargoCapacity)
      }
      if (vehicleCapacity) {
        vehicleCapacity = parseAndConvertCapacity(vehicleCapacity)
      }
      if (technical) {
        technical = parseAndConvertTechnical(technical)
      }
    } catch (parseErr) {
      return next(parseErr)
    }

    console.log("[v0] Update ship - Parsed passengerCapacity:", passengerCapacity)
    console.log("[v0] Update ship - Parsed cargoCapacity:", cargoCapacity)
    console.log("[v0] Update ship - Parsed vehicleCapacity:", vehicleCapacity)
    console.log("[v0] Update ship - Parsed technical:", technical)

    // Fetch the ship
    const ship = await Ship.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!ship) {
      throw createHttpError(404, "Ship not found")
    }

    // Update fields
    Object.assign(ship, updates)
    if (technical) {
      ship.technical = { ...ship.technical, ...technical }
    }

    // Update capacity arrays with validation
    if (passengerCapacity && Array.isArray(passengerCapacity) && passengerCapacity.length > 0) {
      ship.passengerCapacity = await validateAndCleanCapacity(passengerCapacity, "passenger", companyId)
    }

    if (cargoCapacity && Array.isArray(cargoCapacity) && cargoCapacity.length > 0) {
      ship.cargoCapacity = await validateAndCleanCapacity(cargoCapacity, "cargo", companyId)
    }

    if (vehicleCapacity && Array.isArray(vehicleCapacity) && vehicleCapacity.length > 0) {
      ship.vehicleCapacity = await validateAndCleanCapacity(vehicleCapacity, "vehicle", companyId)
    }

    // Process uploaded documents - push to existing array
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        ship.documents.push({
          fileName: file.originalname,
          fileUrl: `/uploads/ships/${file.filename}`,
          fileType: file.mimetype === "application/pdf" ? "pdf" : "image",
        })
      }
    }

    // Build updatedBy object
    const updatedBy = buildActor(user)
    ship.updatedBy = updatedBy

    await ship.save()

    res.status(200).json({
      success: true,
      message: "Ship updated successfully",
      data: ship.toObject(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/ships/:id
 * Soft delete a ship
 */
const deleteShip = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, user } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid ship ID format")
    }

    const ship = await Ship.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!ship) {
      throw createHttpError(404, "Ship not found")
    }

    // Soft delete
    ship.isDeleted = true
    const updatedBy = buildActor(user)
    ship.updatedBy = updatedBy
    await ship.save()

    res.status(200).json({
      success: true,
      message: "Ship deleted successfully",
      data: { _id: ship._id, deletedAt: new Date() },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listShips,
  getShipById,
  createShip,
  updateShip,
  deleteShip,
}
