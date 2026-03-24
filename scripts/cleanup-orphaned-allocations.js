/**
 * Cleanup Script: Fix Orphaned Allocations
 * 
 * This script handles the scenario where child allocations were reset but not properly soft-deleted.
 * It will:
 * 1. Find allocations with empty allocations arrays that aren't soft-deleted
 * 2. Either soft-delete them or show them for manual review
 * 
 * Usage: node scripts/cleanup-orphaned-allocations.js
 */

const mongoose = require("mongoose")
require("dotenv").config()

const AvailabilityAgentAllocation = require("../src/models/AvailabilityAgentAllocation")

async function cleanupOrphanedAllocations() {
  try {
    console.log("[CLEANUP] Connecting to database...")
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("[CLEANUP] Connected successfully")

    // Find all active allocations with empty allocations arrays
    console.log("[CLEANUP] Finding orphaned allocations...")
    const orphanedAllocations = await AvailabilityAgentAllocation.find({
      isDeleted: false,
      allocations: { $size: 0 }, // Empty allocations array
    }).lean()

    console.log(`[CLEANUP] Found ${orphanedAllocations.length} orphaned allocations`)

    if (orphanedAllocations.length === 0) {
      console.log("[CLEANUP] No orphaned allocations found. Database is clean!")
      await mongoose.connection.close()
      return
    }

    // Display them for review
    console.log("\n[CLEANUP] Orphaned Allocations Details:")
    orphanedAllocations.forEach((alloc, index) => {
      console.log(`\n${index + 1}. Allocation ID: ${alloc._id}`)
      console.log(`   Agent: ${alloc.agent}`)
      console.log(`   Parent Agent: ${alloc.parentAgent || "COMPANY"}`)
      console.log(`   Trip: ${alloc.trip}`)
      console.log(`   Created: ${alloc.createdAt}`)
      console.log(`   Updated: ${alloc.updatedAt}`)
    })

    // Ask for confirmation before soft-deleting
    console.log("\n[CLEANUP] ⚠️  These allocations will be SOFT-DELETED (isDeleted: true)")
    console.log("[CLEANUP] This allows child agents to create new allocations for the same trip")

    // Automatically soft-delete (you can comment this out for manual review)
    const result = await AvailabilityAgentAllocation.updateMany(
      {
        isDeleted: false,
        allocations: { $size: 0 },
      },
      {
        $set: {
          isDeleted: true,
          updatedBy: {
            type: "system",
            name: "Cleanup Script",
            reason: "Orphaned allocation (empty allocations array)",
          },
        },
      }
    )

    console.log(
      `\n[CLEANUP] ✅ Successfully soft-deleted ${result.modifiedCount} orphaned allocations`
    )
    console.log("[CLEANUP] Child agents can now create new allocations for their trips")

    await mongoose.connection.close()
    console.log("[CLEANUP] Database connection closed")
  } catch (error) {
    console.error("[CLEANUP] Error during cleanup:", error)
    process.exit(1)
  }
}

// Run the cleanup
cleanupOrphanedAllocations()
