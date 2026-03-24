const createHttpError = require("http-errors")
const mongoose = require("mongoose")
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
 * GET /api/cabins
 * List all cabins for the company with filtering and pagination
 */
const listCabins = async (req, res, next) => {
  try {
    const { companyId } = req
    const { type, search, page = 1, limit = 10 } = req.query

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

    // Add type filter if provided
    if (type && type.trim()) {
      const validTypes = ["passenger", "vehicle", "cargo"]
      if (!validTypes.includes(type.toLowerCase())) {
        throw createHttpError(400, `Type must be one of: ${validTypes.join(", ")}`)
      }
      query.type = type.toLowerCase()
    }

    // Add search filter if provided
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i")
      query.$or = [{ name: searchRegex }, { description: searchRegex }]
    }

    // Fetch cabins and total count
    const [cabins, total] = await Promise.all([
      Cabin.find(query)
        .select("_id name description remarks type status createdBy updatedBy createdAt updatedAt")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Cabin.countDocuments(query),
    ])

    const totalPages = Math.ceil(total / limitNum)

    res.status(200).json({
      success: true,
      message: "Cabins retrieved successfully",
      data: {
        cabins,
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
 * GET /api/cabins/:id
 * Get a specific cabin by ID
 */
const getCabinById = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid cabin ID format")
    }

    const cabin = await Cabin.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })
      .select("_id name description remarks type status createdBy updatedBy createdAt updatedAt")
      .lean()

    if (!cabin) {
      throw createHttpError(404, "Cabin not found")
    }

    res.status(200).json({
      success: true,
      message: "Cabin retrieved successfully",
      data: cabin,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/cabins
 * Create a new cabin
 */
const createCabin = async (req, res, next) => {
  try {
    const { companyId, user } = req
    const { name, description = "", remarks = "", type, status = "Active" } = req.body

    if (!companyId) {
      throw createHttpError(400, "Company ID is required")
    }

    // Validate required fields
    if (!name || !type) {
      throw createHttpError(400, "Missing required fields: name, type")
    }

    // Validate type
    const validTypes = ["passenger", "vehicle", "cargo"]
    if (!validTypes.includes(type.toLowerCase())) {
      throw createHttpError(400, `Type must be one of: ${validTypes.join(", ")}`)
    }

    // Validate status if provided
    const validStatuses = ["Active", "Inactive"]
    if (status && !validStatuses.includes(status)) {
      throw createHttpError(400, `Status must be one of: ${validStatuses.join(", ")}`)
    }

    // Build createdBy object
    const createdBy = buildActor(user)

    // Create cabin
    const cabin = new Cabin({
      company: companyId,
      name: name.trim(),
      description: description ? description.trim() : "",
      remarks: remarks ? remarks.trim() : "",
      type: type.toLowerCase(),
      status: status || "Active",
      createdBy,
    })

    await cabin.save()

    // Return created cabin
    const cabinData = cabin.toObject()

    res.status(201).json({
      success: true,
      message: "Cabin created successfully",
      data: cabinData,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/cabins/:id
 * Update an existing cabin
 */
const updateCabin = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, user } = req
    const { name, description, remarks, type, status } = req.body

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid cabin ID format")
    }

    // Fetch the cabin
    const cabin = await Cabin.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!cabin) {
      throw createHttpError(404, "Cabin not found")
    }

    // Update fields if provided
    if (name !== undefined) {
      cabin.name = name.trim()
    }

    if (description !== undefined) {
      cabin.description = description.trim()
    }

    if (remarks !== undefined) {
      cabin.remarks = remarks.trim()
    }

    if (type !== undefined) {
      const validTypes = ["passenger", "vehicle", "cargo"]
      const typeLower = type.toLowerCase()
      if (!validTypes.includes(typeLower)) {
        throw createHttpError(400, `Type must be one of: ${validTypes.join(", ")}`)
      }
      cabin.type = typeLower
    }

    if (status !== undefined) {
      const validStatuses = ["Active", "Inactive"]
      if (!validStatuses.includes(status)) {
        throw createHttpError(400, `Status must be one of: ${validStatuses.join(", ")}`)
      }
      cabin.status = status
    }

    // Build updatedBy object
    const updatedBy = buildActor(user)
    cabin.updatedBy = updatedBy

    await cabin.save()

    res.status(200).json({
      success: true,
      message: "Cabin updated successfully",
      data: cabin.toObject(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/cabins/:id
 * Soft delete a cabin
 */
const deleteCabin = async (req, res, next) => {
  try {
    const { id } = req.params
    const { companyId, user } = req

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createHttpError(400, "Invalid cabin ID format")
    }

    const cabin = await Cabin.findOne({
      _id: id,
      company: companyId,
      isDeleted: false,
    })

    if (!cabin) {
      throw createHttpError(404, "Cabin not found")
    }

    // Soft delete
    cabin.isDeleted = true
    const updatedBy = buildActor(user)
    cabin.updatedBy = updatedBy
    await cabin.save()

    res.status(200).json({
      success: true,
      message: "Cabin deleted successfully",
      data: { _id: cabin._id, deletedAt: new Date() },
    })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  listCabins,
  getCabinById,
  createCabin,
  updateCabin,
  deleteCabin,
}
