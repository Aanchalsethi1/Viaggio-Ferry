// const createHttpError = require("http-errors")
// const mongoose = require("mongoose")
// const AvailabilityAgentAllocation = require("../models/AvailabilityAgentAllocation")
// const { Trip } = require("../models/Trip")
// const { TripAvailability } = require("../models/TripAvailability")
// const Partner = require("../models/Partner")
// const { Cabin } = require("../models/Cabin")

// const buildActor = (user) => ({
//   id: user?.id || null,
//   name: user?.name || "Unknown",
//   type: user?.layer || "system",
//   layer: user?.layer,
// })

// // GET - List all agent allocations for a trip
// exports.listAgentAllocations = async (req, res) => {
//   try {
//     const { companyId } = req
//     const { tripId } = req.params
//     const { page = 1, limit = 10 } = req.query

//     const skip = (parseInt(page) - 1) * parseInt(limit)
//     const limitNum = parseInt(limit)

//     const query = {
//       company: companyId,
//       trip: tripId,
//       isDeleted: false,
//     }

//     const [allocations, total] = await Promise.all([
//       AvailabilityAgentAllocation.find(query)
//         .populate("agent", "name code type")
//         .populate("availability", "type cabins")
//         .populate("allocations.cabins.cabin", "name type")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum)
//         .lean(),
//       AvailabilityAgentAllocation.countDocuments(query),
//     ])

//     res.status(200).json({
//       success: true,
//       message: "Agent allocations fetched successfully",
//       data: allocations,
//       pagination: {
//         page: parseInt(page),
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum),
//       },
//     })
//   } catch (error) {
//     console.error("[v0] Error in listAgentAllocations:", error)
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message,
//       stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//     })
//   }
// }

// // GET - List all agent allocations for a trip (without needing availability ID)
// exports.listAgentAllocationsByTrip = async (req, res) => {
//   try {
//     const { companyId } = req
//     const { tripId } = req.params
//     const { page = 1, limit = 10 } = req.query

//     const skip = (parseInt(page) - 1) * parseInt(limit)
//     const limitNum = parseInt(limit)

//     const query = {
//       company: companyId,
//       trip: tripId,
//       isDeleted: false,
//     }

//     const [allocations, total] = await Promise.all([
//       AvailabilityAgentAllocation.find(query)
//         .populate("agent", "name code type")
//         .populate("availability", "type cabins")
//         .populate("allocations.cabins.cabin", "name type")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum)
//         .lean(),
//       AvailabilityAgentAllocation.countDocuments(query),
//     ])

//     res.status(200).json({
//       success: true,
//       message: "Agent allocations fetched successfully",
//       data: allocations,
//       pagination: {
//         page: parseInt(page),
//         limit: limitNum,
//         total,
//         pages: Math.ceil(total / limitNum),
//       },
//     })
//   } catch (error) {
//     console.error("[v0] Error in listAgentAllocationsByTrip:", error)
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message,
//       stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//     })
//   }
// }

// // GET - Get specific agent allocation
// exports.getAgentAllocationById = async (req, res) => {
//   try {
//     const { companyId } = req
//     const { tripId, allocationId } = req.params

//     const allocation = await AvailabilityAgentAllocation.findOne({
//       _id: allocationId,
//       company: companyId,
//       trip: tripId,
//       isDeleted: false,
//     })
//       .populate("agent", "name code type")
//       .populate("availability", "type cabins")
//       .populate("allocations.cabins.cabin", "name type")

//     if (!allocation) {
//       throw createHttpError(404, "Agent allocation not found")
//     }

//     res.status(200).json({
//       success: true,
//       message: "Agent allocation fetched successfully",
//       data: allocation,
//     })
//   } catch (error) {
//     console.error("[v0] Error in getAgentAllocationById:", error)
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message,
//       stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//     })
//   }
// }

// // POST - Create agent allocation(s) with transaction support
// // Accepts: Single agent - { agent: "id", allocations: [...] }
// // Accepts: Multiple agents - [{ agent: "id1", allocations: [...] }, { agent: "id2", allocations: [...] }]
// exports.createAgentAllocation = async (req, res) => {
//   const session = await mongoose.startSession()
//   session.startTransaction()
  
//   try {
//     const { companyId, user } = req
//     const { tripId, availabilityId } = req.params
//     let agents = []

//     // Check if body is array (multiple agents) or object (single agent)
//     if (Array.isArray(req.body)) {
//       // Multiple agents format
//       agents = req.body
//       if (agents.length === 0) {
//         throw createHttpError(400, "At least one agent allocation is required")
//       }
//     } else {
//       // Single agent format
//       const { agent, allocations } = req.body
//       if (!agent || !allocations) {
//         throw createHttpError(400, "Agent ID and allocations array are required")
//       }
//       agents = [{ agent, allocations }]
//     }

//     // Validate all agents have required fields
//     for (const agentData of agents) {
//       if (!agentData.agent || !agentData.allocations || !Array.isArray(agentData.allocations) || agentData.allocations.length === 0) {
//         throw createHttpError(400, "Each agent must have an ID and allocations array")
//       }
//     }

//     // Verify trip and availability exist (with transaction session)
//     const trip = await Trip.findOne({
//       _id: tripId,
//       company: companyId,
//       isDeleted: false,
//     }).session(session)
//     if (!trip) throw createHttpError(404, "Trip not found")

//     // Verify all agents exist and belong to company
//     const agentIds = agents.map(a => a.agent)
    
//     // Check for duplicate agent IDs in the request
//     const uniqueAgentIds = new Set(agentIds.map(id => id.toString()))
//     if (uniqueAgentIds.size !== agentIds.length) {
//       throw createHttpError(400, "Cannot allocate the same agent multiple times in a single request")
//     }
    
//     const agentDocs = await Partner.find({
//       _id: { $in: agentIds },
//       company: companyId,
//       status: "Active",
//       isDeleted: false,
//     }).session(session)
    
//     if (agentDocs.length !== agentIds.length) {
//       const foundIds = agentDocs.map(a => a._id.toString())
//       const missingIds = agentIds.filter(id => !foundIds.includes(id.toString()))
//       throw createHttpError(404, `One or more agents not found or inactive: ${missingIds.join(", ")}`)
//     }

//     // Check if any agent already has an allocation for this trip
//     const existingAllocations = await AvailabilityAgentAllocation.find({
//       agent: { $in: agentIds },
//       trip: tripId,
//       company: companyId,
//       isDeleted: false,
//     }).session(session)

//     if (existingAllocations.length > 0) {
//       const allocatedAgents = existingAllocations.map(alloc => 
//         agentDocs.find(doc => doc._id.toString() === alloc.agent.toString())?.name
//       ).filter(Boolean)
//       throw createHttpError(
//         400,
//         `Agent allocation(s) already exist for this trip: ${allocatedAgents.join(", ")}. Use update endpoint to modify existing allocations.`
//       )
//     }

//     // Fetch the availability document ONCE for this trip (single doc with availabilityTypes array)
//     const availability = await TripAvailability.findOne({
//       trip: tripId,
//       company: companyId,
//       isDeleted: false,
//     }).session(session).populate("availabilityTypes.cabins.cabin", "name type")
    
//     if (!availability) {
//       throw createHttpError(404, `No availability found for this trip`)
//     }

//     // Helper function to process and validate allocations for an agent
//     const processAgentAllocations = async (allocations) => {
//       const processedAllocations = []

//       for (const allocationEntry of allocations) {
//         const { type, cabins: cabinAllocations } = allocationEntry

//         if (!type || !cabinAllocations || !Array.isArray(cabinAllocations)) {
//           throw createHttpError(400, `Invalid allocation format. Each must have type and cabins array`)
//         }

//         // Find the specific availability type within the document
//         const availType = availability.availabilityTypes.find(at => at.type === type)
//         if (!availType) {
//           throw createHttpError(404, `No ${type} availability found for this trip`)
//         }

//         const processedCabins = []
//         let totalAllocatedSeats = 0

//         for (const cabinEntry of cabinAllocations) {
//           const { cabin, allocatedSeats } = cabinEntry

//           // Verify cabin exists and is of correct type
//           const cabinDoc = await Cabin.findOne({
//             _id: cabin,
//             company: companyId,
//             type,
//             isDeleted: false,
//           }).session(session)
//           if (!cabinDoc) {
//             throw createHttpError(404, `Cabin not found or type mismatch for cabin ID: ${cabin}`)
//           }

//           const seatsNum = parseInt(allocatedSeats)
//           if (isNaN(seatsNum) || seatsNum < 0) {
//             throw createHttpError(400, `Allocated seats must be a non-negative number for cabin ${cabinDoc.name}`)
//           }

//           // Validate against availability type cabins
//           const availabilityCabin = availType.cabins.find(c => {
//             const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
//             const requestCabinId = cabin.toString()
//             return cabinId === requestCabinId
//           })
//           if (!availabilityCabin) {
//             throw createHttpError(
//               400,
//               `Cabin ${cabinDoc.name} is not available in this availability type for allocation`
//             )
//           }

//           // Validate against availability: can only allocate what's not already allocated
//           if (seatsNum > availabilityCabin.seats - availabilityCabin.allocatedSeats) {
//             throw createHttpError(
//               400,
//               `Cannot allocate ${seatsNum} seats to cabin ${cabinDoc.name}. Only ${availabilityCabin.seats - availabilityCabin.allocatedSeats} seats available.`
//             )
//           }

//           totalAllocatedSeats += seatsNum
//           processedCabins.push({
//             cabin,
//             allocatedSeats: seatsNum,
//           })
//         }

//         processedAllocations.push({
//           type,
//           cabins: processedCabins,
//           totalAllocatedSeats,
//           availTypeIndex: availability.availabilityTypes.findIndex(at => at.type === type),
//         })
//       }

//       return processedAllocations
//     }

//     // Process and create allocations for each agent
//     const createdAllocations = []

//     for (const agentData of agents) {
//       const processedAllocations = await processAgentAllocations(agentData.allocations)

//       // Create agent allocation document
//       const allocationData = {
//         company: companyId,
//         trip: tripId,
//         availability: availability._id,
//         agent: agentData.agent,
//         allocations: processedAllocations.map(p => ({
//           type: p.type,
//           cabins: p.cabins,
//           totalAllocatedSeats: p.totalAllocatedSeats,
//         })),
//         createdBy: buildActor(user),
//       }

//       const newAllocation = new AvailabilityAgentAllocation(allocationData)
//       await newAllocation.save({ session })
//       createdAllocations.push(newAllocation)

//       // Update availability for all types within transaction
//       for (const allocation of processedAllocations) {
//         const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === allocation.type)
        
//         // Agent allocations reduce public available seats but DO NOT reduce trip operational capacity
//         for (const cabin of allocation.cabins) {
//           const cabinIndex = availability.availabilityTypes[availTypeIndex].cabins.findIndex(c => {
//             const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
//             const requestCabinId = cabin.cabin.toString()
//             return cabinId === requestCabinId
//           })
          
//           if (cabinIndex >= 0) {
//             await TripAvailability.updateOne(
//               { _id: availability._id },
//               {
//                 $inc: {
//                   [`availabilityTypes.${availTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: cabin.allocatedSeats
//                 }
//               },
//               { session }
//             )
//           }
//         }
//       }
//     }

//     // Commit transaction
//     await session.commitTransaction()

//     // Populate all created allocations with details (after transaction)
//     const populatedAllocations = await Promise.all(
//       createdAllocations.map(allocation =>
//         AvailabilityAgentAllocation.findById(allocation._id)
//           .populate("agent", "name code type")
//           .populate("availability")
//           .populate("allocations.cabins.cabin", "name type")
//       )
//     )

//     // Fetch latest availability to get current allocatedSeats
//     const updatedAvailability = await TripAvailability.findById(availability._id)

//     // Build availability summary for all types
//     const availabilitySummary = updatedAvailability.availabilityTypes.map(availType => ({
//       type: availType.type,
//       cabins: availType.cabins.map(cabin => ({
//         cabin: cabin.cabin,
//         cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
//         cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
//         totalSeats: cabin.seats,
//         allocatedSeats: cabin.allocatedSeats,
//         remainingSeats: cabin.seats - cabin.allocatedSeats,
//       }))
//     }))

//     res.status(201).json({
//       success: true,
//       message: `${populatedAllocations.length} agent allocation(s) created successfully`,
//       data: {
//         allocations: populatedAllocations.map(allocation => ({
//           _id: allocation._id,
//           company: allocation.company,
//           trip: allocation.trip,
//           availability: allocation.availability._id,
//           agent: {
//             _id: allocation.agent._id,
//             name: allocation.agent.name,
//             code: allocation.agent.code,
//             type: allocation.agent.type,
//           },
//           allocations: allocation.allocations,
//           createdAt: allocation.createdAt,
//           updatedAt: allocation.updatedAt,
//         })),
//         availabilitySummary,
//       },
//     })
//   } catch (error) {
//     // Abort transaction on error
//     await session.abortTransaction()
    
//     console.error("[v0] Error in createAgentAllocation:", error)
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message,
//       stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//     })
//   } finally {
//     // End session
//     await session.endSession()
//   }
// }

// // PUT - Update agent allocation with transaction support
// exports.updateAgentAllocation = async (req, res) => {
//   const session = await mongoose.startSession()
//   session.startTransaction()
  
//   try {
//     const { companyId, user } = req
//     const { tripId, allocationId } = req.params
//     const { allocations } = req.body

//     if (!allocations || !Array.isArray(allocations)) {
//       throw createHttpError(400, "Allocations array is required")
//     }

//     const allocation = await AvailabilityAgentAllocation.findOne({
//       _id: allocationId,
//       company: companyId,
//       trip: tripId,
//       isDeleted: false,
//     }).session(session)
//     if (!allocation) throw createHttpError(404, "Agent allocation not found")

//     const availability = await TripAvailability.findById(allocation.availability).session(session)
//     if (!availability) throw createHttpError(404, "Availability not found")

//     const trip = await Trip.findById(tripId).session(session)
//     if (!trip) throw createHttpError(404, "Trip not found")

//     // Get the allocation type and availability type index
//     const prevAllocationData = allocation.allocations[0]
//     const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === prevAllocationData.type)
    
//     if (availTypeIndex < 0) {
//       throw createHttpError(400, "Availability type not found")
//     }

//     // Restore previous allocations from availability (track seat restoration)
//     console.log(`[v0] UPDATE: Restoring previous allocations for agent allocation ${allocationId}`)
//     const seatMovements = []
    
//     for (const prevAllocation of allocation.allocations) {
//       const prevAvailTypeIndex = availability.availabilityTypes.findIndex(at => at.type === prevAllocation.type)
      
//       for (const cabin of prevAllocation.cabins) {
//         const cabinIndex = availability.availabilityTypes[prevAvailTypeIndex].cabins.findIndex(c => {
//           const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
//           const requestCabinId = cabin.cabin.toString()
//           return cabinId === requestCabinId
//         })
        
//         if (cabinIndex >= 0) {
//           const cabinData = availability.availabilityTypes[prevAvailTypeIndex].cabins[cabinIndex]
//           const prevAllocated = cabinData.allocatedSeats
          
//           seatMovements.push({
//             cabin: cabin.cabin.toString(),
//             type: prevAllocation.type,
//             action: 'restore',
//             previouslyAllocated: cabin.allocatedSeats,
//             beforeAvailable: prevAllocated,
//             afterAvailable: prevAllocated - cabin.allocatedSeats
//           })
          
//           await TripAvailability.updateOne(
//             { _id: allocation.availability },
//             {
//               $inc: {
//                 [`availabilityTypes.${prevAvailTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: -cabin.allocatedSeats
//               }
//             },
//             { session }
//           )
//         }
//       }
//     }
//     console.log(`[v0] UPDATE: Restored ${seatMovements.length} cabin allocations`, JSON.stringify(seatMovements))

//       // Validate new allocations
//       const processedAllocations = []

//       for (const allocationEntry of allocations) {
//         const { type, cabins: cabinAllocations } = allocationEntry

//         if (!type || !cabinAllocations || !Array.isArray(cabinAllocations)) {
//           throw createHttpError(400, `Invalid allocation format`)
//         }

//         // Check for duplicate cabins within the same type
//         const cabinIds = cabinAllocations.map(c => c.cabin.toString())
//         const uniqueCabinIds = new Set(cabinIds)
//         if (uniqueCabinIds.size !== cabinIds.length) {
//           throw createHttpError(400, `Cannot allocate the same cabin multiple times in a single request for type '${type}'`)
//         }

//         const processedCabins = []
//         let totalAllocatedSeats = 0

//         for (const cabinEntry of cabinAllocations) {
//           const { cabin, allocatedSeats } = cabinEntry

//           const cabinDoc = await Cabin.findOne({
//             _id: cabin,
//             company: companyId,
//             type,
//             isDeleted: false,
//           }).session(session)
//           if (!cabinDoc) {
//             throw createHttpError(404, `Cabin not found for ID: ${cabin}`)
//           }

//           const seatsNum = parseInt(allocatedSeats)
//           if (isNaN(seatsNum) || seatsNum < 0) {
//             throw createHttpError(400, `Allocated seats must be non-negative`)
//           }

//           // Find the availability type
//           const availType = availability.availabilityTypes.find(at => at.type === type)
//           if (!availType) {
//             throw createHttpError(400, `Availability type '${type}' not found`)
//           }

//           const availabilityCabin = availType.cabins.find(c => {
//             const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
//             return cabinId === cabin.toString()
//           })
//           if (!availabilityCabin) {
//             throw createHttpError(400, `Cabin not available in this availability`)
//           }

//           if (seatsNum > availabilityCabin.seats - availabilityCabin.allocatedSeats) {
//             throw createHttpError(
//               400,
//               `Cannot allocate ${seatsNum} seats. Only ${availabilityCabin.seats - availabilityCabin.allocatedSeats} available.`
//             )
//           }

//           totalAllocatedSeats += seatsNum
//           processedCabins.push({
//             cabin,
//             allocatedSeats: seatsNum,
//           })
//         }

//         processedAllocations.push({
//           type,
//           cabins: processedCabins,
//           totalAllocatedSeats,
//         })
//       }

//       // Merge new allocations with existing ones - replace entire allocation type if it exists
//       // This prevents duplicate cabin IDs within the same type
//       const finalAllocations = []
//       const processedTypes = new Set()

//       // First, add all newly processed allocations (these replace existing ones for the same type)
//       for (const newAlloc of processedAllocations) {
//         finalAllocations.push(newAlloc)
//         processedTypes.add(newAlloc.type)
//       }

//       // Then, add any existing allocations for types that weren't updated
//       for (const existingAlloc of allocation.allocations) {
//         if (!processedTypes.has(existingAlloc.type)) {
//           finalAllocations.push(existingAlloc)
//         }
//       }

//       allocation.allocations = finalAllocations
//       allocation.updatedBy = buildActor(user)
//       await allocation.save({ session })

//     // Apply new allocations to availability (track seat allocation changes)
//     console.log(`[v0] UPDATE: Applying new allocations for agent allocation ${allocationId}`)
//     const newSeatMovements = []
    
//     for (const newAllocation of processedAllocations) {
//       const newAvailTypeIndex = availability.availabilityTypes.findIndex(at => at.type === newAllocation.type)
      
//       for (const cabin of newAllocation.cabins) {
//         const cabinIndex = availability.availabilityTypes[newAvailTypeIndex].cabins.findIndex(c => {
//           const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
//           const requestCabinId = cabin.cabin.toString()
//           return cabinId === requestCabinId
//         })
        
//         if (cabinIndex >= 0) {
//           const cabinData = availability.availabilityTypes[newAvailTypeIndex].cabins[cabinIndex]
//           const beforeAllocated = cabinData.allocatedSeats
          
//           newSeatMovements.push({
//             cabin: cabin.cabin.toString(),
//             type: newAllocation.type,
//             action: 'allocate',
//             newlyAllocated: cabin.allocatedSeats,
//             beforeAllocated,
//             afterAllocated: beforeAllocated + cabin.allocatedSeats
//           })
          
//           await TripAvailability.updateOne(
//             { _id: allocation.availability },
//             {
//               $inc: {
//                 [`availabilityTypes.${newAvailTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: cabin.allocatedSeats
//               }
//             },
//             { session }
//           )
//         }
//       }
//     }
//     console.log(`[v0] UPDATE: Applied ${newSeatMovements.length} new cabin allocations`, JSON.stringify(newSeatMovements))

//     // Commit transaction
//     await session.commitTransaction()

//     const updated = await AvailabilityAgentAllocation.findById(allocationId)
//       .populate("agent", "name code type")
//       .populate("availability")
//       .populate("allocations.cabins.cabin", "name type")

//     // Build availability summary for all types
//     const updatedAvailability = await TripAvailability.findById(allocation.availability)
//     const availabilitySummary = updatedAvailability.availabilityTypes.map(availType => ({
//       type: availType.type,
//       cabins: availType.cabins.map(cabin => ({
//         cabin: cabin.cabin,
//         cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
//         cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
//         totalSeats: cabin.seats,
//         allocatedSeats: cabin.allocatedSeats,
//         remainingSeats: cabin.seats - cabin.allocatedSeats,
//       }))
//     }))

//     res.status(200).json({
//       success: true,
//       message: "Agent allocation updated successfully",
//       data: {
//         _id: updated._id,
//         company: updated.company,
//         trip: updated.trip,
//         availability: updated.availability._id,
//         agent: {
//           _id: updated.agent._id,
//           name: updated.agent.name,
//           code: updated.agent.code,
//           type: updated.agent.type,
//         },
//         allocations: updated.allocations,
//         availabilitySummary,
//         seatMovements: {
//           restored: seatMovements,
//           newly_allocated: newSeatMovements,
//         },
//         createdAt: updated.createdAt,
//         updatedAt: updated.updatedAt,
//       },
//     })
//   } catch (error) {
//     await session.abortTransaction()
    
//     console.error("[v0] Error in updateAgentAllocation:", error)
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message,
//       stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//     })
//   } finally {
//     await session.endSession()
//   }
// }

// // DELETE - Delete agent allocation with transaction support
// exports.deleteAgentAllocation = async (req, res) => {
//   const session = await mongoose.startSession()
//   session.startTransaction()
  
//   try {
//     const { companyId, user } = req
//     const { tripId, allocationId } = req.params

//     const allocation = await AvailabilityAgentAllocation.findOne({
//       _id: allocationId,
//       company: companyId,
//       trip: tripId,
//       isDeleted: false,
//     }).session(session)
//     if (!allocation) throw createHttpError(404, "Agent allocation not found")

//     const availability = await TripAvailability.findById(allocation.availability).session(session)
//     if (!availability) throw createHttpError(404, "Availability not found")

//     const trip = await Trip.findById(tripId).session(session)
//     if (!trip) throw createHttpError(404, "Trip not found")

//     // Restore allocation seats back to availability
//     // Agent allocations do NOT affect trip operational capacity, only restore available seats
//     for (const allocationEntry of allocation.allocations) {
//       const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === allocationEntry.type)
      
//       for (const cabin of allocationEntry.cabins) {
//         const cabinIndex = availability.availabilityTypes[availTypeIndex].cabins.findIndex(c => {
//           const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
//           const requestCabinId = cabin.cabin.toString()
//           return cabinId === requestCabinId
//         })
        
//         if (cabinIndex >= 0) {
//           await TripAvailability.updateOne(
//             { _id: allocation.availability },
//             {
//               $inc: {
//                 [`availabilityTypes.${availTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: -cabin.allocatedSeats
//               }
//             },
//             { session }
//           )
//         }
//       }
//     }

//     allocation.isDeleted = true
//     allocation.updatedBy = buildActor(user)
//     await allocation.save({ session })

//     // Commit transaction
//     await session.commitTransaction()

//     // Build availability summary for all types after deletion
//     const updatedAvailability = await TripAvailability.findById(allocation.availability)

//     const availabilitySummary = updatedAvailability.availabilityTypes.map(availType => ({
//       type: availType.type,
//       cabins: availType.cabins.map(cabin => ({
//         cabin: cabin.cabin,
//         cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
//         cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
//         totalSeats: cabin.seats,
//         allocatedSeats: cabin.allocatedSeats,
//         remainingSeats: cabin.seats - cabin.allocatedSeats,
//       }))
//     }))

//     res.status(200).json({
//       success: true,
//       message: "Agent allocation deleted successfully",
//       data: {
//         allocationId: allocation._id,
//         availabilitySummary,
//       },
//     })
//   } catch (error) {
//     await session.abortTransaction()
    
//     console.error("[v0] Error in deleteAgentAllocation:", error)
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message,
//       stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//     })
//   } finally {
//     await session.endSession()
//   }
// }

// // POST - Create bulk agent allocations for multiple agents
// exports.createBulkAgentAllocations = async (req, res) => {
//   const session = await mongoose.startSession()
//   session.startTransaction()
  
//   try {
//     const { companyId, user } = req
//     const { tripId, availabilityId } = req.params
//     const agentAllocations = req.body // Array of {agent: id, allocations: [...]}

//     // Validate input
//     if (!Array.isArray(agentAllocations) || agentAllocations.length === 0) {
//       throw createHttpError(400, "Array of agent allocations is required")
//     }

//     // Verify trip exists
//     const trip = await Trip.findOne({
//       _id: tripId,
//       company: companyId,
//       isDeleted: false,
//     }).session(session)
//     if (!trip) throw createHttpError(404, "Trip not found")

//     // Fetch availability once
//     const availability = await TripAvailability.findOne({
//       trip: tripId,
//       company: companyId,
//       isDeleted: false,
//     }).session(session).populate("availabilityTypes.cabins.cabin", "name type")
    
//     if (!availability) {
//       throw createHttpError(404, `No availability found for this trip`)
//     }

//     const createdAllocations = []
//     const errors = []

//     // Process each agent allocation
//     for (const { agent, allocations } of agentAllocations) {
//       try {
//         // Validate agent field exists
//         if (!agent || !allocations || !Array.isArray(allocations) || allocations.length === 0) {
//           errors.push({
//             agent,
//             error: "Agent ID and allocations array are required",
//           })
//           continue
//         }

//         // Verify agent exists and belongs to company
//         const agentDoc = await Partner.findOne({
//           _id: agent,
//           company: companyId,
//           status: "Active",
//           isDeleted: false,
//         }).session(session)
//         if (!agentDoc) {
//           errors.push({
//             agent,
//             error: "Agent not found or inactive",
//           })
//           continue
//         }

//         // Validate allocations
//         const processedAllocations = []

//         for (const allocationEntry of allocations) {
//           const { type, cabins: cabinAllocations } = allocationEntry

//           if (!type || !cabinAllocations || !Array.isArray(cabinAllocations)) {
//             throw createHttpError(400, `Invalid allocation format for agent ${agent}. Each must have type and cabins array`)
//           }

//           // Find the specific availability type within the document
//           const availType = availability.availabilityTypes.find(at => at.type === type)
//           if (!availType) {
//             throw createHttpError(404, `No ${type} availability found for this trip`)
//           }

//           const processedCabins = []
//           let totalAllocatedSeats = 0

//           for (const cabinEntry of cabinAllocations) {
//             const { cabin, allocatedSeats } = cabinEntry

//             // Verify cabin exists and is of correct type
//             const cabinDoc = await Cabin.findOne({
//               _id: cabin,
//               company: companyId,
//               type,
//               isDeleted: false,
//             }).session(session)
//             if (!cabinDoc) {
//               throw createHttpError(404, `Cabin not found or type mismatch for cabin ID: ${cabin}`)
//             }

//             const seatsNum = parseInt(allocatedSeats)
//             if (isNaN(seatsNum) || seatsNum < 0) {
//               throw createHttpError(400, `Allocated seats must be a non-negative number for cabin ${cabinDoc.name}`)
//             }

//             // Validate against availability type cabins
//             const availabilityCabin = availType.cabins.find(c => {
//               const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
//               const requestCabinId = cabin.toString()
//               return cabinId === requestCabinId
//             })
//             if (!availabilityCabin) {
//               throw createHttpError(
//                 400,
//                 `Cabin ${cabinDoc.name} is not available in this availability type for allocation`
//               )
//             }

//             // Validate against availability: can only allocate what's not already allocated
//             if (seatsNum > availabilityCabin.seats - availabilityCabin.allocatedSeats) {
//               throw createHttpError(
//                 400,
//                 `Cannot allocate ${seatsNum} seats to cabin ${cabinDoc.name}. Only ${availabilityCabin.seats - availabilityCabin.allocatedSeats} seats available.`
//               )
//             }

//             totalAllocatedSeats += seatsNum
//             processedCabins.push({
//               cabin,
//               allocatedSeats: seatsNum,
//             })
//           }

//           processedAllocations.push({
//             type,
//             cabins: processedCabins,
//             totalAllocatedSeats,
//             availTypeIndex: availability.availabilityTypes.findIndex(at => at.type === type),
//           })
//         }

//         // Create allocation document for this agent
//         const allocationData = {
//           company: companyId,
//           trip: tripId,
//           availability: availability._id,
//           agent,
//           allocations: processedAllocations.map(p => ({
//             type: p.type,
//             cabins: p.cabins,
//             totalAllocatedSeats: p.totalAllocatedSeats,
//           })),
//           createdBy: buildActor(user),
//         }

//         const newAllocation = new AvailabilityAgentAllocation(allocationData)
//         await newAllocation.save({ session })

//         // Update availability for all types within transaction
//         for (const allocation of processedAllocations) {
//           const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === allocation.type)
          
//           for (const cabin of allocation.cabins) {
//             const cabinIndex = availability.availabilityTypes[availTypeIndex].cabins.findIndex(c => {
//               const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
//               const requestCabinId = cabin.cabin.toString()
//               return cabinId === requestCabinId
//             })
            
//             if (cabinIndex >= 0) {
//               await TripAvailability.updateOne(
//                 { _id: availability._id },
//                 {
//                   $inc: {
//                     [`availabilityTypes.${availTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: cabin.allocatedSeats
//                   }
//                 },
//                 { session }
//               )
//             }
//           }
//         }

//         createdAllocations.push({
//           agentId: agent,
//           allocationId: newAllocation._id,
//           allocations: processedAllocations.map(p => ({
//             type: p.type,
//             totalAllocatedSeats: p.totalAllocatedSeats,
//           })),
//         })
//       } catch (error) {
//         errors.push({
//           agent,
//           error: error.message,
//         })
//       }
//     }

//     // Commit transaction
//     await session.commitTransaction()

//     // If there are errors and some allocations succeeded, return partial success
//     // If all allocations failed, return error
//     if (createdAllocations.length === 0 && errors.length > 0) {
//       throw createHttpError(400, `All allocations failed: ${errors.map(e => e.error).join(", ")}`)
//     }

//     // Fetch updated availability
//     const updatedAvailability = await TripAvailability.findById(availability._id)

//     // Build availability summary for all types
//     const availabilitySummary = updatedAvailability.availabilityTypes.map(availType => ({
//       type: availType.type,
//       cabins: availType.cabins.map(cabin => ({
//         cabin: cabin.cabin,
//         cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
//         cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
//         totalSeats: cabin.seats,
//         allocatedSeats: cabin.allocatedSeats,
//         remainingSeats: cabin.seats - cabin.allocatedSeats,
//       }))
//     }))

//     res.status(201).json({
//       success: true,
//       message: `${createdAllocations.length} agent allocations created successfully${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
//       data: {
//         createdAllocations,
//         ...(errors.length > 0 && { errors }),
//         availabilitySummary,
//       },
//     })
//   } catch (error) {
//     // Abort transaction on error
//     await session.abortTransaction()
    
//     console.error("[v0] Error in createBulkAgentAllocations:", error)
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message,
//       stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//     })
//   } finally {
//     // End session
//     await session.endSession()
//   }
// }

// // GET - Get total availability summary for allocation
// exports.getAvailabilityForAllocation = async (req, res) => {
//   try {
//     const { companyId } = req
//     const { tripId, availabilityId } = req.params

//     const availability = await TripAvailability.findOne({
//       _id: availabilityId,
//       company: companyId,
//       trip: tripId,
//       isDeleted: false,
//     }).populate("cabins.cabin", "name type")

//     if (!availability) throw createHttpError(404, "Availability not found")

//     const trip = await Trip.findById(tripId).select("tripCapacityDetails")
//     if (!trip) throw createHttpError(404, "Trip not found")

//     // Calculate available seats per cabin
//     const availableSummary = {
//       passenger: [],
//       cargo: [],
//       vehicle: [],
//     }

//     if (availability.type === "passenger") {
//       availability.cabins.forEach(cabin => {
//         const available = cabin.seats - cabin.allocatedSeats
//         availableSummary.passenger.push({
//           cabin: cabin.cabin,
//           totalSeats: cabin.seats,
//           allocatedSeats: cabin.allocatedSeats,
//           availableSeats: available,
//         })
//       })
//     } else if (availability.type === "cargo") {
//       availability.cabins.forEach(cabin => {
//         const available = cabin.seats - cabin.allocatedSeats
//         availableSummary.cargo.push({
//           cabin: cabin.cabin,
//           totalSeats: cabin.seats,
//           allocatedSeats: cabin.allocatedSeats,
//           availableSeats: available,
//         })
//       })
//     } else if (availability.type === "vehicle") {
//       availability.cabins.forEach(cabin => {
//         const available = cabin.seats - cabin.allocatedSeats
//         availableSummary.vehicle.push({
//           cabin: cabin.cabin,
//           totalSeats: cabin.seats,
//           allocatedSeats: cabin.allocatedSeats,
//           availableSeats: available,
//         })
//       })
//     }

//     res.status(200).json({
//       success: true,
//       message: "Availability summary for allocation fetched successfully",
//       data: {
//         availabilityId,
//         availabilityType: availability.type,
//         totalSummary: availableSummary,
//         tripCapacityDetails: trip.tripCapacityDetails,
//       },
//     })
//   } catch (error) {
//     console.error("[v0] Error in getAvailabilityForAllocation:", error)
//     res.status(error.status || 500).json({
//       success: false,
//       message: error.message,
//       stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
//     })
//   }
// }


const createHttpError = require("http-errors")
const mongoose = require("mongoose")
const AvailabilityAgentAllocation = require("../models/AvailabilityAgentAllocation")
const { Trip } = require("../models/Trip")
const { TripAvailability } = require("../models/TripAvailability")
const Partner = require("../models/Partner")
const { Cabin } = require("../models/Cabin")

const buildActor = (user) => ({
  id: user?.id || null,
  name: user?.name || "Unknown",
  type: user?.layer || "system",
  layer: user?.layer,
})

/**
 * Cascading Reset Helper Function
 * Recursively finds and resets only GRANDCHILD allocations to zero
 * @param {string} parentAllocationId - The allocation ID that was updated
 * @param {string} companyId - Company ID for filtering
 * @param {string} tripId - Trip ID for filtering
 * @param {object} session - MongoDB session for transaction support
 * @param {boolean} skipDirectChildren - If true, only reset grandchildren (not direct children)
 * @returns {Array} - List of reset allocations
 */
async function resetChildAllocations(parentAllocationId, companyId, tripId, session, skipDirectChildren = false) {
  try {
    const resetAllocations = []
    
    // Find all direct children of this allocation (parentAgent = this allocation's agent)
    const parentAllocation = await AvailabilityAgentAllocation.findById(parentAllocationId).session(session)
    if (!parentAllocation) return resetAllocations
    
    // Get the availability to restore allocation counts
    const availability = await TripAvailability.findById(parentAllocation.availability).session(session)
    if (!availability) return resetAllocations
    
    // Find all child allocations where parentAgent = this allocation's agent
    const childAllocations = await AvailabilityAgentAllocation.find({
      company: companyId,
      trip: tripId,
      parentAgent: parentAllocation.agent,
      isDeleted: false,
    }).session(session)
    
    console.log(`[v0] CASCADING RESET: Found ${childAllocations.length} child allocations for agent ${parentAllocation.agent}, skipDirectChildren=${skipDirectChildren}`)
    
    for (const childAllocation of childAllocations) {
      // Recursively reset GRANDCHILD allocations (children of the child)
      const grandchildResets = await resetChildAllocations(childAllocation._id, companyId, tripId, session, false)
      resetAllocations.push(...grandchildResets)
      
      // Only reset direct children if skipDirectChildren is false
      // When updating a parent allocation, skipDirectChildren=true means we keep child allocations but reset grandchildren
      if (!skipDirectChildren) {
        // Restore all seats from child allocation back to availability
        for (const allocationGroup of childAllocation.allocations) {
          const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === allocationGroup.type)
          
          if (availTypeIndex >= 0) {
            for (const cabin of allocationGroup.cabins) {
              const cabinIndex = availability.availabilityTypes[availTypeIndex].cabins.findIndex(c => {
                const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
                return cabinId === cabin.cabin.toString()
              })
              
              if (cabinIndex >= 0) {
                console.log(`[v0] CASCADING RESET: Restoring ${cabin.allocatedSeats} seats for cabin ${cabin.cabin} from child allocation ${childAllocation._id}`)
                
                await TripAvailability.updateOne(
                  { _id: childAllocation.availability },
                  {
                    $inc: {
                      [`availabilityTypes.${availTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: -cabin.allocatedSeats
                    }
                  },
                  { session }
                )
              }
            }
          }
        }
        
        // Reset child allocation to empty allocations array
        childAllocation.allocations = []
        childAllocation.updatedBy = { type: "system", name: "Cascading Reset" }
        await childAllocation.save({ session })
        
        resetAllocations.push({
          _id: childAllocation._id,
          agent: childAllocation.agent,
          previousAllocations: childAllocation.allocations.length,
          status: "reset_to_zero"
        })
        
        console.log(`[v0] CASCADING RESET: Reset allocation ${childAllocation._id} to zero`)
      }
    }
    
    return resetAllocations
  } catch (error) {
    console.error("[v0] Error in resetChildAllocations:", error)
    throw error
  }
}

// GET - List all agent allocations for a trip
exports.listAgentAllocations = async (req, res) => {
  try {
    const { companyId } = req
    const { tripId } = req.params
    const { page = 1, limit = 10 } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const limitNum = parseInt(limit)

    const query = {
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }

    const [allocations, total] = await Promise.all([
      AvailabilityAgentAllocation.find(query)
        .populate("agent", "name code type")
        .populate("availability", "type cabins")
        .populate("allocations.cabins.cabin", "name type")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AvailabilityAgentAllocation.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      message: "Agent allocations fetched successfully",
      data: allocations,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error("[v0] Error in listAgentAllocations:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// GET - List all agent allocations for a trip (without needing availability ID)
exports.listAgentAllocationsByTrip = async (req, res) => {
  try {
    const { companyId } = req
    const { tripId } = req.params
    const { page = 1, limit = 10 } = req.query

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const limitNum = parseInt(limit)

    // Filter to show ONLY marine allocations (parentAgent is null = company allocated to marine agent)
    // This ensures company layer only sees direct marine agent allocations, not commercial allocations
    const query = {
      company: companyId,
      trip: tripId,
      isDeleted: false,
      parentAgent: null, // Only marine allocations created directly by company
    }

    const [allocations, total] = await Promise.all([
      AvailabilityAgentAllocation.find(query)
        .populate("agent", "name code type")
        .populate("availability", "type cabins")
        .populate("allocations.cabins.cabin", "name type")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AvailabilityAgentAllocation.countDocuments(query),
    ])

    res.status(200).json({
      success: true,
      message: "Marine agent allocations fetched successfully",
      data: allocations,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error("[v0] Error in listAgentAllocationsByTrip:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// GET - Get specific agent allocation
exports.getAgentAllocationById = async (req, res) => {
  try {
    const { companyId } = req
    const { tripId, allocationId } = req.params

    const allocation = await AvailabilityAgentAllocation.findOne({
      _id: allocationId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    })
      .populate("agent", "name code type")
      .populate("availability", "type cabins")
      .populate("allocations.cabins.cabin", "name type")

    if (!allocation) {
      throw createHttpError(404, "Agent allocation not found")
    }

    res.status(200).json({
      success: true,
      message: "Agent allocation fetched successfully",
      data: allocation,
    })
  } catch (error) {
    console.error("[v0] Error in getAgentAllocationById:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}

// POST - Create agent allocation(s) with transaction support
// Accepts: Single agent - { agent: "id", allocations: [...] }
// Accepts: Multiple agents - [{ agent: "id1", allocations: [...] }, { agent: "id2", allocations: [...] }]
exports.createAgentAllocation = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    const { companyId, user } = req
    const { tripId, availabilityId } = req.params
    let agents = []

    // Check if body is array (multiple agents) or object (single agent)
    if (Array.isArray(req.body)) {
      // Multiple agents format
      agents = req.body
      if (agents.length === 0) {
        throw createHttpError(400, "At least one agent allocation is required")
      }
    } else {
      // Single agent format
      const { agent, allocations } = req.body
      if (!agent || !allocations) {
        throw createHttpError(400, "Agent ID and allocations array are required")
      }
      agents = [{ agent, allocations }]
    }

    // Validate all agents have required fields
    for (const agentData of agents) {
      if (!agentData.agent || !agentData.allocations || !Array.isArray(agentData.allocations) || agentData.allocations.length === 0) {
        throw createHttpError(400, "Each agent must have an ID and allocations array")
      }
    }

    // Verify trip and availability exist (with transaction session)
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session)
    if (!trip) throw createHttpError(404, "Trip not found")

    // Verify all agents exist and belong to company
    const agentIds = agents.map(a => a.agent)
    
    // Check for duplicate agent IDs in the request
    const uniqueAgentIds = new Set(agentIds.map(id => id.toString()))
    if (uniqueAgentIds.size !== agentIds.length) {
      throw createHttpError(400, "Cannot allocate the same agent multiple times in a single request")
    }
    
    const agentDocs = await Partner.find({
      _id: { $in: agentIds },
      company: companyId,
      status: "Active",
      isDeleted: false,
    }).session(session)
    
    if (agentDocs.length !== agentIds.length) {
      const foundIds = agentDocs.map(a => a._id.toString())
      const missingIds = agentIds.filter(id => !foundIds.includes(id.toString()))
      throw createHttpError(404, `One or more agents not found or inactive: ${missingIds.join(", ")}`)
    }

    // Check if any agent already has an allocation for this trip
    const existingAllocations = await AvailabilityAgentAllocation.find({
      agent: { $in: agentIds },
      trip: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session)

    if (existingAllocations.length > 0) {
      const allocatedAgents = existingAllocations.map(alloc => 
        agentDocs.find(doc => doc._id.toString() === alloc.agent.toString())?.name
      ).filter(Boolean)
      throw createHttpError(
        400,
        `Agent allocation(s) already exist for this trip: ${allocatedAgents.join(", ")}. Use update endpoint to modify existing allocations.`
      )
    }

    // Fetch the availability document ONCE for this trip (single doc with availabilityTypes array)
    const availability = await TripAvailability.findOne({
      trip: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session).populate("availabilityTypes.cabins.cabin", "name type")
    
    if (!availability) {
      throw createHttpError(404, `No availability found for this trip`)
    }

    // Helper function to process and validate allocations for an agent
    const processAgentAllocations = async (allocations) => {
      const processedAllocations = []

      for (const allocationEntry of allocations) {
        const { type, cabins: cabinAllocations } = allocationEntry

        if (!type || !cabinAllocations || !Array.isArray(cabinAllocations)) {
          throw createHttpError(400, `Invalid allocation format. Each must have type and cabins array`)
        }

        // Find the specific availability type within the document
        const availType = availability.availabilityTypes.find(at => at.type === type)
        if (!availType) {
          throw createHttpError(404, `No ${type} availability found for this trip`)
        }

        const processedCabins = []
        let totalAllocatedSeats = 0

        for (const cabinEntry of cabinAllocations) {
          const { cabin, allocatedSeats } = cabinEntry

          // Verify cabin exists and is of correct type
          const cabinDoc = await Cabin.findOne({
            _id: cabin,
            company: companyId,
            type,
            isDeleted: false,
          }).session(session)
          if (!cabinDoc) {
            throw createHttpError(404, `Cabin not found or type mismatch for cabin ID: ${cabin}`)
          }

          const seatsNum = parseInt(allocatedSeats)
          if (isNaN(seatsNum) || seatsNum < 0) {
            throw createHttpError(400, `Allocated seats must be a non-negative number for cabin ${cabinDoc.name}`)
          }

          // Validate against availability type cabins
          const availabilityCabin = availType.cabins.find(c => {
            const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
            const requestCabinId = cabin.toString()
            return cabinId === requestCabinId
          })
          if (!availabilityCabin) {
            throw createHttpError(
              400,
              `Cabin ${cabinDoc.name} is not available in this availability type for allocation`
            )
          }

          // Validate against availability: can only allocate what's not already allocated
          if (seatsNum > availabilityCabin.seats - availabilityCabin.allocatedSeats) {
            throw createHttpError(
              400,
              `Cannot allocate ${seatsNum} seats to cabin ${cabinDoc.name}. Only ${availabilityCabin.seats - availabilityCabin.allocatedSeats} seats available.`
            )
          }

          totalAllocatedSeats += seatsNum
          processedCabins.push({
            cabin,
            allocatedSeats: seatsNum,
          })
        }

        processedAllocations.push({
          type,
          cabins: processedCabins,
          totalAllocatedSeats,
          availTypeIndex: availability.availabilityTypes.findIndex(at => at.type === type),
        })
      }

      return processedAllocations
    }

    // Process and create allocations for each agent
    const createdAllocations = []

    for (const agentData of agents) {
      const processedAllocations = await processAgentAllocations(agentData.allocations)

      // Create agent allocation document
      const allocationData = {
        company: companyId,
        trip: tripId,
        availability: availability._id,
        agent: agentData.agent,
        allocations: processedAllocations.map(p => ({
          type: p.type,
          cabins: p.cabins,
          totalAllocatedSeats: p.totalAllocatedSeats,
        })),
        createdBy: buildActor(user),
      }

      const newAllocation = new AvailabilityAgentAllocation(allocationData)
      await newAllocation.save({ session })
      createdAllocations.push(newAllocation)

      // Update availability for all types within transaction
      for (const allocation of processedAllocations) {
        const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === allocation.type)
        
        // Agent allocations reduce public available seats but DO NOT reduce trip operational capacity
        for (const cabin of allocation.cabins) {
          const cabinIndex = availability.availabilityTypes[availTypeIndex].cabins.findIndex(c => {
            const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
            const requestCabinId = cabin.cabin.toString()
            return cabinId === requestCabinId
          })
          
          if (cabinIndex >= 0) {
            await TripAvailability.updateOne(
              { _id: availability._id },
              {
                $inc: {
                  [`availabilityTypes.${availTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: cabin.allocatedSeats
                }
              },
              { session }
            )
          }
        }
      }
    }

    // Commit transaction
    await session.commitTransaction()

    // Populate all created allocations with details (after transaction)
    const populatedAllocations = await Promise.all(
      createdAllocations.map(allocation =>
        AvailabilityAgentAllocation.findById(allocation._id)
          .populate("agent", "name code type")
          .populate("availability")
          .populate("allocations.cabins.cabin", "name type")
      )
    )

    // Fetch latest availability to get current allocatedSeats
    const updatedAvailability = await TripAvailability.findById(availability._id)

    // Build availability summary for all types
    const availabilitySummary = updatedAvailability.availabilityTypes.map(availType => ({
      type: availType.type,
      cabins: availType.cabins.map(cabin => ({
        cabin: cabin.cabin,
        cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
        cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
        totalSeats: cabin.seats,
        allocatedSeats: cabin.allocatedSeats,
        remainingSeats: cabin.seats - cabin.allocatedSeats,
      }))
    }))

    res.status(201).json({
      success: true,
      message: `${populatedAllocations.length} agent allocation(s) created successfully`,
      data: {
        allocations: populatedAllocations.map(allocation => ({
          _id: allocation._id,
          company: allocation.company,
          trip: allocation.trip,
          availability: allocation.availability._id,
          agent: {
            _id: allocation.agent._id,
            name: allocation.agent.name,
            code: allocation.agent.code,
            type: allocation.agent.type,
          },
          allocations: allocation.allocations,
          createdAt: allocation.createdAt,
          updatedAt: allocation.updatedAt,
        })),
        availabilitySummary,
      },
    })
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction()
    
    console.error("[v0] Error in createAgentAllocation:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  } finally {
    // End session
    await session.endSession()
  }
}

// PUT - Update agent allocation with transaction support
exports.updateAgentAllocation = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    const { companyId, user } = req
    const { tripId, allocationId } = req.params
    const { allocations } = req.body

    if (!allocations || !Array.isArray(allocations)) {
      throw createHttpError(400, "Allocations array is required")
    }

    const allocation = await AvailabilityAgentAllocation.findOne({
      _id: allocationId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }).session(session)
    if (!allocation) throw createHttpError(404, "Agent allocation not found")

    const availability = await TripAvailability.findById(allocation.availability).session(session)
    if (!availability) throw createHttpError(404, "Availability not found")

    const trip = await Trip.findById(tripId).session(session)
    if (!trip) throw createHttpError(404, "Trip not found")

    // Get the allocation type and availability type index
    const prevAllocationData = allocation.allocations[0]
    const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === prevAllocationData.type)
    
    if (availTypeIndex < 0) {
      throw createHttpError(400, "Availability type not found")
    }

    // Restore previous allocations from availability (track seat restoration)
    console.log(`[v0] UPDATE: Restoring previous allocations for agent allocation ${allocationId}`)
    const seatMovements = []
    
    for (const prevAllocation of allocation.allocations) {
      const prevAvailTypeIndex = availability.availabilityTypes.findIndex(at => at.type === prevAllocation.type)
      
      for (const cabin of prevAllocation.cabins) {
        const cabinIndex = availability.availabilityTypes[prevAvailTypeIndex].cabins.findIndex(c => {
          const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
          const requestCabinId = cabin.cabin.toString()
          return cabinId === requestCabinId
        })
        
        if (cabinIndex >= 0) {
          const cabinData = availability.availabilityTypes[prevAvailTypeIndex].cabins[cabinIndex]
          const prevAllocated = cabinData.allocatedSeats
          
          seatMovements.push({
            cabin: cabin.cabin.toString(),
            type: prevAllocation.type,
            action: 'restore',
            previouslyAllocated: cabin.allocatedSeats,
            beforeAvailable: prevAllocated,
            afterAvailable: prevAllocated - cabin.allocatedSeats
          })
          
          await TripAvailability.updateOne(
            { _id: allocation.availability },
            {
              $inc: {
                [`availabilityTypes.${prevAvailTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: -cabin.allocatedSeats
              }
            },
            { session }
          )
        }
      }
    }
    console.log(`[v0] UPDATE: Restored ${seatMovements.length} cabin allocations`, JSON.stringify(seatMovements))

    // Reload availability from database to get updated seat counts
    console.log(`[v0] UPDATE: Reloading availability to refresh seat counts`)
    const updatedAvailability = await TripAvailability.findById(allocation.availability)
      .session(session)
      .populate("availabilityTypes.cabins.cabin", "name type")
    if (!updatedAvailability) throw createHttpError(404, "Availability not found after reload")
    console.log(`[v0] UPDATE: Availability reloaded successfully`)

      // Validate new allocations against the refreshed availability
      const processedAllocations = []

      for (const allocationEntry of allocations) {
        const { type, cabins: cabinAllocations } = allocationEntry

        if (!type || !cabinAllocations || !Array.isArray(cabinAllocations)) {
          throw createHttpError(400, `Invalid allocation format`)
        }

        // Check for duplicate cabins within the same type
        const cabinIds = cabinAllocations.map(c => c.cabin.toString())
        const uniqueCabinIds = new Set(cabinIds)
        if (uniqueCabinIds.size !== cabinIds.length) {
          throw createHttpError(400, `Cannot allocate the same cabin multiple times in a single request for type '${type}'`)
        }

        const processedCabins = []
        let totalAllocatedSeats = 0

        for (const cabinEntry of cabinAllocations) {
          const { cabin, allocatedSeats } = cabinEntry

          const cabinDoc = await Cabin.findOne({
            _id: cabin,
            company: companyId,
            type,
            isDeleted: false,
          }).session(session)
          if (!cabinDoc) {
            throw createHttpError(404, `Cabin not found for ID: ${cabin}`)
          }

          const seatsNum = parseInt(allocatedSeats)
          if (isNaN(seatsNum) || seatsNum < 0) {
            throw createHttpError(400, `Allocated seats must be non-negative`)
          }

          // Find the availability type
          const availType = updatedAvailability.availabilityTypes.find(at => at.type === type)
          if (!availType) {
            throw createHttpError(400, `Availability type '${type}' not found`)
          }

          const availabilityCabin = availType.cabins.find(c => {
            const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
            return cabinId === cabin.toString()
          })
          if (!availabilityCabin) {
            throw createHttpError(400, `Cabin not available in this availability`)
          }

          if (seatsNum > availabilityCabin.seats - availabilityCabin.allocatedSeats) {
            throw createHttpError(
              400,
              `Cannot allocate ${seatsNum} seats. Only ${availabilityCabin.seats - availabilityCabin.allocatedSeats} available.`
            )
          }

          totalAllocatedSeats += seatsNum
          processedCabins.push({
            cabin,
            allocatedSeats: seatsNum,
          })
        }

        processedAllocations.push({
          type,
          cabins: processedCabins,
          totalAllocatedSeats,
        })
      }

      // Merge new allocations with existing ones - replace entire allocation type if it exists
      // This prevents duplicate cabin IDs within the same type
      const finalAllocations = []
      const processedTypes = new Set()

      // First, add all newly processed allocations (these replace existing ones for the same type)
      for (const newAlloc of processedAllocations) {
        finalAllocations.push(newAlloc)
        processedTypes.add(newAlloc.type)
      }

      // Then, add any existing allocations for types that weren't updated
      for (const existingAlloc of allocation.allocations) {
        if (!processedTypes.has(existingAlloc.type)) {
          finalAllocations.push(existingAlloc)
        }
      }

      allocation.allocations = finalAllocations
      allocation.updatedBy = buildActor(user)
      await allocation.save({ session })

    // CASCADING RESET: Reset only GRANDCHILD allocations when parent is updated (keep direct children but reset their children)
    console.log(`[v0] UPDATE: Initiating cascading reset for allocation ${allocationId}`)
    const resetResults = await resetChildAllocations(allocationId, companyId, tripId, session, true)
    console.log(`[v0] UPDATE: Cascading reset completed, reset ${resetResults.length} grandchild allocations`)

    // Apply new allocations to availability (track seat allocation changes)
    console.log(`[v0] UPDATE: Applying new allocations for agent allocation ${allocationId}`)
    const newSeatMovements = []
    
    for (const newAllocation of processedAllocations) {
      const newAvailTypeIndex = updatedAvailability.availabilityTypes.findIndex(at => at.type === newAllocation.type)
      
      for (const cabin of newAllocation.cabins) {
        const cabinIndex = updatedAvailability.availabilityTypes[newAvailTypeIndex].cabins.findIndex(c => {
          const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
          const requestCabinId = cabin.cabin.toString()
          return cabinId === requestCabinId
        })
        
        if (cabinIndex >= 0) {
          const cabinData = updatedAvailability.availabilityTypes[newAvailTypeIndex].cabins[cabinIndex]
          const beforeAllocated = cabinData.allocatedSeats
          
          newSeatMovements.push({
            cabin: cabin.cabin.toString(),
            type: newAllocation.type,
            action: 'allocate',
            newlyAllocated: cabin.allocatedSeats,
            beforeAllocated,
            afterAllocated: beforeAllocated + cabin.allocatedSeats
          })
          
          await TripAvailability.updateOne(
            { _id: allocation.availability },
            {
              $inc: {
                [`availabilityTypes.${newAvailTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: cabin.allocatedSeats
              }
            },
            { session }
          )
        }
      }
    }
    console.log(`[v0] UPDATE: Applied ${newSeatMovements.length} new cabin allocations`, JSON.stringify(newSeatMovements))

    // Commit transaction
    await session.commitTransaction()

    const updated = await AvailabilityAgentAllocation.findById(allocationId)
      .populate("agent", "name code type")
      .populate("availability")
      .populate("allocations.cabins.cabin", "name type")

    // Build availability summary for all types
    const finalAvailability = await TripAvailability.findById(allocation.availability)
    const availabilitySummary = finalAvailability.availabilityTypes.map(availType => ({
      type: availType.type,
      cabins: availType.cabins.map(cabin => ({
        cabin: cabin.cabin,
        cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
        cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
        totalSeats: cabin.seats,
        allocatedSeats: cabin.allocatedSeats,
        remainingSeats: cabin.seats - cabin.allocatedSeats,
      }))
    }))

    res.status(200).json({
      success: true,
      message: "Agent allocation updated successfully",
      data: {
        _id: updated._id,
        company: updated.company,
        trip: updated.trip,
        availability: updated.availability._id,
        agent: {
          _id: updated.agent._id,
          name: updated.agent.name,
          code: updated.agent.code,
          type: updated.agent.type,
        },
        allocations: updated.allocations,
        availabilitySummary,
        seatMovements: {
          restored: seatMovements,
          newly_allocated: newSeatMovements,
        },
        cascadingReset: {
          status: resetResults.length > 0 ? "completed" : "none_required",
          resetCount: resetResults.length,
          resetAllocations: resetResults,
        },
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    })
  } catch (error) {
    await session.abortTransaction()
    
    console.error("[v0] Error in updateAgentAllocation:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  } finally {
    await session.endSession()
  }
}

// DELETE - Delete agent allocation with transaction support
exports.deleteAgentAllocation = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    const { companyId, user } = req
    const { tripId, allocationId } = req.params

    const allocation = await AvailabilityAgentAllocation.findOne({
      _id: allocationId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }).session(session)
    if (!allocation) throw createHttpError(404, "Agent allocation not found")

    const availability = await TripAvailability.findById(allocation.availability).session(session)
    if (!availability) throw createHttpError(404, "Availability not found")

    const trip = await Trip.findById(tripId).session(session)
    if (!trip) throw createHttpError(404, "Trip not found")

    // Restore allocation seats back to availability
    // Agent allocations do NOT affect trip operational capacity, only restore available seats
    for (const allocationEntry of allocation.allocations) {
      const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === allocationEntry.type)
      
      for (const cabin of allocationEntry.cabins) {
        const cabinIndex = availability.availabilityTypes[availTypeIndex].cabins.findIndex(c => {
          const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
          const requestCabinId = cabin.cabin.toString()
          return cabinId === requestCabinId
        })
        
        if (cabinIndex >= 0) {
          await TripAvailability.updateOne(
            { _id: allocation.availability },
            {
              $inc: {
                [`availabilityTypes.${availTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: -cabin.allocatedSeats
              }
            },
            { session }
          )
        }
      }
    }

    allocation.isDeleted = true
    allocation.updatedBy = buildActor(user)
    await allocation.save({ session })

    // Commit transaction
    await session.commitTransaction()

    // Build availability summary for all types after deletion
    const updatedAvailability = await TripAvailability.findById(allocation.availability)

    const availabilitySummary = updatedAvailability.availabilityTypes.map(availType => ({
      type: availType.type,
      cabins: availType.cabins.map(cabin => ({
        cabin: cabin.cabin,
        cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
        cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
        totalSeats: cabin.seats,
        allocatedSeats: cabin.allocatedSeats,
        remainingSeats: cabin.seats - cabin.allocatedSeats,
      }))
    }))

    res.status(200).json({
      success: true,
      message: "Agent allocation deleted successfully",
      data: {
        allocationId: allocation._id,
        availabilitySummary,
      },
    })
  } catch (error) {
    await session.abortTransaction()
    
    console.error("[v0] Error in deleteAgentAllocation:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  } finally {
    await session.endSession()
  }
}

// POST - Create bulk agent allocations for multiple agents
exports.createBulkAgentAllocations = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  
  try {
    const { companyId, user } = req
    const { tripId, availabilityId } = req.params
    const agentAllocations = req.body // Array of {agent: id, allocations: [...]}

    // Validate input
    if (!Array.isArray(agentAllocations) || agentAllocations.length === 0) {
      throw createHttpError(400, "Array of agent allocations is required")
    }

    // Verify trip exists
    const trip = await Trip.findOne({
      _id: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session)
    if (!trip) throw createHttpError(404, "Trip not found")

    // Fetch availability once
    const availability = await TripAvailability.findOne({
      trip: tripId,
      company: companyId,
      isDeleted: false,
    }).session(session).populate("availabilityTypes.cabins.cabin", "name type")
    
    if (!availability) {
      throw createHttpError(404, `No availability found for this trip`)
    }

    const createdAllocations = []
    const errors = []

    // Process each agent allocation
    for (const { agent, allocations } of agentAllocations) {
      try {
        // Validate agent field exists
        if (!agent || !allocations || !Array.isArray(allocations) || allocations.length === 0) {
          errors.push({
            agent,
            error: "Agent ID and allocations array are required",
          })
          continue
        }

        // Verify agent exists and belongs to company
        const agentDoc = await Partner.findOne({
          _id: agent,
          company: companyId,
          status: "Active",
          isDeleted: false,
        }).session(session)
        if (!agentDoc) {
          errors.push({
            agent,
            error: "Agent not found or inactive",
          })
          continue
        }

        // Validate allocations
        const processedAllocations = []

        for (const allocationEntry of allocations) {
          const { type, cabins: cabinAllocations } = allocationEntry

          if (!type || !cabinAllocations || !Array.isArray(cabinAllocations)) {
            throw createHttpError(400, `Invalid allocation format for agent ${agent}. Each must have type and cabins array`)
          }

          // Find the specific availability type within the document
          const availType = availability.availabilityTypes.find(at => at.type === type)
          if (!availType) {
            throw createHttpError(404, `No ${type} availability found for this trip`)
          }

          const processedCabins = []
          let totalAllocatedSeats = 0

          for (const cabinEntry of cabinAllocations) {
            const { cabin, allocatedSeats } = cabinEntry

            // Verify cabin exists and is of correct type
            const cabinDoc = await Cabin.findOne({
              _id: cabin,
              company: companyId,
              type,
              isDeleted: false,
            }).session(session)
            if (!cabinDoc) {
              throw createHttpError(404, `Cabin not found or type mismatch for cabin ID: ${cabin}`)
            }

            const seatsNum = parseInt(allocatedSeats)
            if (isNaN(seatsNum) || seatsNum < 0) {
              throw createHttpError(400, `Allocated seats must be a non-negative number for cabin ${cabinDoc.name}`)
            }

            // Validate against availability type cabins
            const availabilityCabin = availType.cabins.find(c => {
              const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
              const requestCabinId = cabin.toString()
              return cabinId === requestCabinId
            })
            if (!availabilityCabin) {
              throw createHttpError(
                400,
                `Cabin ${cabinDoc.name} is not available in this availability type for allocation`
              )
            }

            // Validate against availability: can only allocate what's not already allocated
            if (seatsNum > availabilityCabin.seats - availabilityCabin.allocatedSeats) {
              throw createHttpError(
                400,
                `Cannot allocate ${seatsNum} seats to cabin ${cabinDoc.name}. Only ${availabilityCabin.seats - availabilityCabin.allocatedSeats} seats available.`
              )
            }

            totalAllocatedSeats += seatsNum
            processedCabins.push({
              cabin,
              allocatedSeats: seatsNum,
            })
          }

          processedAllocations.push({
            type,
            cabins: processedCabins,
            totalAllocatedSeats,
            availTypeIndex: availability.availabilityTypes.findIndex(at => at.type === type),
          })
        }

        // Create allocation document for this agent
        const allocationData = {
          company: companyId,
          trip: tripId,
          availability: availability._id,
          agent,
          allocations: processedAllocations.map(p => ({
            type: p.type,
            cabins: p.cabins,
            totalAllocatedSeats: p.totalAllocatedSeats,
          })),
          createdBy: buildActor(user),
        }

        const newAllocation = new AvailabilityAgentAllocation(allocationData)
        await newAllocation.save({ session })

        // Update availability for all types within transaction
        for (const allocation of processedAllocations) {
          const availTypeIndex = availability.availabilityTypes.findIndex(at => at.type === allocation.type)
          
          for (const cabin of allocation.cabins) {
            const cabinIndex = availability.availabilityTypes[availTypeIndex].cabins.findIndex(c => {
              const cabinId = c.cabin && c.cabin._id ? c.cabin._id.toString() : (c.cabin ? c.cabin.toString() : null)
              const requestCabinId = cabin.cabin.toString()
              return cabinId === requestCabinId
            })
            
            if (cabinIndex >= 0) {
              await TripAvailability.updateOne(
                { _id: availability._id },
                {
                  $inc: {
                    [`availabilityTypes.${availTypeIndex}.cabins.${cabinIndex}.allocatedSeats`]: cabin.allocatedSeats
                  }
                },
                { session }
              )
            }
          }
        }

        createdAllocations.push({
          agentId: agent,
          allocationId: newAllocation._id,
          allocations: processedAllocations.map(p => ({
            type: p.type,
            totalAllocatedSeats: p.totalAllocatedSeats,
          })),
        })
      } catch (error) {
        errors.push({
          agent,
          error: error.message,
        })
      }
    }

    // Commit transaction
    await session.commitTransaction()

    // If there are errors and some allocations succeeded, return partial success
    // If all allocations failed, return error
    if (createdAllocations.length === 0 && errors.length > 0) {
      throw createHttpError(400, `All allocations failed: ${errors.map(e => e.error).join(", ")}`)
    }

    // Fetch updated availability
    const updatedAvailability = await TripAvailability.findById(availability._id)

    // Build availability summary for all types
    const availabilitySummary = updatedAvailability.availabilityTypes.map(availType => ({
      type: availType.type,
      cabins: availType.cabins.map(cabin => ({
        cabin: cabin.cabin,
        cabinName: cabin.cabin ? cabin.cabin.name : 'N/A',
        cabinType: cabin.cabin ? cabin.cabin.type : 'N/A',
        totalSeats: cabin.seats,
        allocatedSeats: cabin.allocatedSeats,
        remainingSeats: cabin.seats - cabin.allocatedSeats,
      }))
    }))

    res.status(201).json({
      success: true,
      message: `${createdAllocations.length} agent allocations created successfully${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
      data: {
        createdAllocations,
        ...(errors.length > 0 && { errors }),
        availabilitySummary,
      },
    })
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction()
    
    console.error("[v0] Error in createBulkAgentAllocations:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  } finally {
    // End session
    await session.endSession()
  }
}

// GET - Get total availability summary for allocation
exports.getAvailabilityForAllocation = async (req, res) => {
  try {
    const { companyId } = req
    const { tripId, availabilityId } = req.params

    const availability = await TripAvailability.findOne({
      _id: availabilityId,
      company: companyId,
      trip: tripId,
      isDeleted: false,
    }).populate("cabins.cabin", "name type")

    if (!availability) throw createHttpError(404, "Availability not found")

    const trip = await Trip.findById(tripId).select("tripCapacityDetails")
    if (!trip) throw createHttpError(404, "Trip not found")

    // Calculate available seats per cabin
    const availableSummary = {
      passenger: [],
      cargo: [],
      vehicle: [],
    }

    if (availability.type === "passenger") {
      availability.cabins.forEach(cabin => {
        const available = cabin.seats - cabin.allocatedSeats
        availableSummary.passenger.push({
          cabin: cabin.cabin,
          totalSeats: cabin.seats,
          allocatedSeats: cabin.allocatedSeats,
          availableSeats: available,
        })
      })
    } else if (availability.type === "cargo") {
      availability.cabins.forEach(cabin => {
        const available = cabin.seats - cabin.allocatedSeats
        availableSummary.cargo.push({
          cabin: cabin.cabin,
          totalSeats: cabin.seats,
          allocatedSeats: cabin.allocatedSeats,
          availableSeats: available,
        })
      })
    } else if (availability.type === "vehicle") {
      availability.cabins.forEach(cabin => {
        const available = cabin.seats - cabin.allocatedSeats
        availableSummary.vehicle.push({
          cabin: cabin.cabin,
          totalSeats: cabin.seats,
          allocatedSeats: cabin.allocatedSeats,
          availableSeats: available,
        })
      })
    }

    res.status(200).json({
      success: true,
      message: "Availability summary for allocation fetched successfully",
      data: {
        availabilityId,
        availabilityType: availability.type,
        totalSummary: availableSummary,
        tripCapacityDetails: trip.tripCapacityDetails,
      },
    })
  } catch (error) {
    console.error("[v0] Error in getAvailabilityForAllocation:", error)
    res.status(error.status || 500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    })
  }
}
