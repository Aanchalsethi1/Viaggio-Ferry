const express = require("express")
const router = express.Router()
const allocationController = require("../controllers/allocationController")
const { verifyToken, extractCompanyId, extractUserId } = require("../middleware/authMiddleware")
const { checkPermission } = require("../middleware/permissionMiddleware")

// Apply auth middleware to all allocation routes
router.use(verifyToken)
router.use(extractCompanyId)
router.use(extractUserId)

/**
 * GET /api/allocations/my-trips
 * Return all trips allocated to the logged-in agent.
 * Permission: partners-management > allocation > read
 */
router.get(
  "/my-trips",
  checkPermission("partners-management", "allocation", "read"),
  allocationController.getMyAllocatedTrips
)

/**
 * GET /api/allocations/my-trips/:tripId
 * Return trip details, availability, agent's own allocation, and child allocations.
 * NOTE: Must come before /:allocationId routes.
 * Permission: partners-management > allocation > read
 */
router.get(
  "/my-trips/:tripId",
  checkPermission("partners-management", "allocation", "read"),
  allocationController.getSingleTripAllocation
)

/**
 * GET /api/allocations/my-child-allocations/:tripId
 * Return all child allocations created by the logged-in agent for a given trip.
 * Permission: partners-management > allocation > read
 */
router.get(
  "/my-child-allocations/:tripId",
  checkPermission("partners-management", "allocation", "read"),
  allocationController.getChildAllocations
)

/**
 * POST /api/allocations/child
 * Create a new allocation from logged-in agent to a child agent.
 * Permission: partners-management > allocation > write
 */
router.post(
  "/child",
  checkPermission("partners-management", "allocation", "write"),
  allocationController.createChildAllocation
)

/**
 * PUT /api/allocations/:allocationId
 * Update seats in an existing child allocation.
 * Permission: partners-management > allocation > edit
 */
router.put(
  "/:allocationId",
  checkPermission("partners-management", "allocation", "edit"),
  allocationController.updateAllocation
)

/**
 * DELETE /api/allocations/:allocationId
 * Soft-delete an allocation and return seats to parent.
 * Permission: partners-management > allocation > delete
 */
router.delete(
  "/:allocationId",
  checkPermission("partners-management", "allocation", "delete"),
  allocationController.deleteAllocation
)

module.exports = router
