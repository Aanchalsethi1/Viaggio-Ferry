/**
 * BACKEND MASTER MENU CONFIG
 * ==========================
 * Single source of truth for all modules, submodules, routes, and UI metadata.
 * 
 * This file is AUTHORITATIVE for:
 * - Sidebar API (returns filtered menu based on permissions)
 * - RBAC validation (ensures permissions map to real features)
 * - Access group creation (validates module/submodule codes)
 * - Route protection (ensures routes match real menu items)
 * 
 * ARCHITECTURE PRINCIPLE:
 * If it is not defined here, it does not exist in the system.
 * 
 * DO NOT duplicate this in frontend.
 * Frontend receives menu structure from Sidebar API.
 */

const menuConfig = {
  // ========================================
  // DASHBOARD
  // ========================================
  dashboard: {
    moduleCode: "dashboard",
    label: "Dashboard",
    icon: "fe-home",
    route: "/company/dashboard",
    type: "single", // Single page module (no submodules)
    displayOrder: 1,
    description: "Company dashboard and overview",
  },

  // ========================================
  // ADMINISTRATION
  // ========================================
  administration: {
    moduleCode: "administration",
    label: "Administration",
    icon: "fa-user",
    type: "menu", // Menu with submodules
    displayOrder: 2,
    description: "Administrative settings and management",
    submodules: {
      users: {
        submoduleCode: "users",
        label: "User List",
        route: "/company/administration/user-list",
        displayOrder: 1,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage company users and staff",
      },
      currency: {
        submoduleCode: "currency",
        label: "Currency",
        route: "/company/administration/currency",
        displayOrder: 2,
        actions: ["read", "write", "edit", "delete"],
        description: "Configure company currencies and exchange rates",
      },
      taxes: {
        submoduleCode: "taxes",
        label: "Taxes",
        route: "/company/administration/taxes",
        displayOrder: 3,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage tax configurations",
      },
      "contact-messages": {
        submoduleCode: "contact-messages",
        label: "Contact Messages",
        route: "/company/administration/support",
        displayOrder: 4,
        actions: ["read", "write", "edit"],
        description: "View and manage contact messages",
      },
      "terms-conditions": {
        submoduleCode: "terms-conditions",
        label: "Terms & Conditions",
        route: "/company/administration/terms",
        displayOrder: 5,
        actions: ["read", "write", "edit"],
        description: "Manage company terms and conditions",
      },
    },
  },

  // ========================================
  // SHIP & TRIP MANAGEMENT
  // ========================================
  "ship-trips": {
    moduleCode: "ship-trips",
    label: "Ship & Trip",
    icon: "fe-globe",
    type: "menu",
    displayOrder: 3,
    description: "Manage ships and voyage trips",
    submodules: {
      ships: {
        submoduleCode: "ships",
        label: "Ships",
        route: "/company/ship-trip/ships",
        displayOrder: 1,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage fleet of ships",
      },
      trips: {
        submoduleCode: "trips",
        label: "Trips",
        route: "/company/ship-trip/trips",
        displayOrder: 2,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage voyage trips",
      },
    },
  },

  // ========================================
  // PARTNER MANAGEMENT
  // ========================================
  "partners-management": {
    moduleCode: "partners-management",
    label: "Partner Management",
    icon: "fe-users",
    type: "menu",
    displayOrder: 4,
    description: "Manage business partners and customers",
    submodules: {
      "business-partners": {
        submoduleCode: "business-partners",
        label: "Business Partners",
        route: "/company/partners",
        displayOrder: 1,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage business partners",
      },
      "b2c-customers": {
        submoduleCode: "b2c-customers",
        label: "B2C Customers",
        route: "/company/b2c-customers",
        displayOrder: 2,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage B2C customer relationships",
      },
      salesmen: {
        submoduleCode: "salesmen",
        label: "Salesmen",
        route: "/company/salesmen",
        displayOrder: 3,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage sales representatives",
      },
      "markup-discounts": {
        submoduleCode: "markup-discounts",
        label: "Markup & Discount Board",
        route: "/company/markup",
        displayOrder: 4,
        actions: ["read", "write", "edit", "delete"],
        description: "Configure markup and discount rules",
      },
      commissions: {
        submoduleCode: "commissions",
        label: "Commission Board",
        route: "/company/commission",
        displayOrder: 5,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage commission structures",
      },
      promotions: {
        submoduleCode: "promotions",
        label: "Promotions",
        route: "/company/partner-management/promotions",
        displayOrder: 6,
        actions: ["read", "write", "edit", "delete"],
        description: "Create and manage promotions",
      },
      allocation: {
        submoduleCode: "allocation",
        label: "Allocation",
        route: "/company/partner-management/allocation",
        displayOrder: 7,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage ticket and seat allocations for partners",
      },
    },
  },

  // ========================================
  // SALES & BOOKING
  // ========================================
  "sales-bookings": {
    moduleCode: "sales-bookings",
    label: "Sales & Booking",
    icon: "fa-shopping-cart",
    type: "menu",
    displayOrder: 5,
    description: "Manage pricing, bookings, and tickets",
    submodules: {
      "price-list": {
        submoduleCode: "price-list",
        label: "Price List",
        route: "/company/pricelist",
        displayOrder: 1,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage pricing and rates",
      },
      "ticketing-rules": {
        submoduleCode: "ticketing-rules",
        label: "Ticketing Rules",
        route: "/company/ticketing-rules",
        displayOrder: 2,
        actions: ["read", "write", "edit", "delete"],
        description: "Configure ticketing rules and policies",
      },
      bookings: {
        submoduleCode: "bookings",
        label: "Bookings & Tickets",
        route: "/company/booking-and-tickets",
        displayOrder: 3,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage bookings and ticket generation",
      },
      "excess-baggage": {
        submoduleCode: "excess-baggage",
        label: "Excess Baggage Tickets",
        route: "/company/excess-baggage-tickets",
        displayOrder: 4,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage excess baggage charges and tickets",
      },
    },
  },

  // ========================================
  // CHECKING & BOARDING
  // ========================================
  "checkin-boardings": {
    moduleCode: "checkin-boardings",
    label: "Checking & Boardings",
    icon: "fa-clipboard-list",
    type: "menu",
    displayOrder: 6,
    description: "Manage passenger and cargo operations",
    submodules: {
      "passenger-checkin": {
        submoduleCode: "passenger-checkin",
        label: "Passenger Check-in",
        route: "/company/passenger-checking",
        displayOrder: 1,
        actions: ["read", "write", "edit"],
        description: "Check in passengers",
      },
      "cargo-boarding": {
        submoduleCode: "cargo-boarding",
        label: "Cargo Boarding",
        route: "/company/cargo-boarding",
        displayOrder: 2,
        actions: ["read", "write", "edit"],
        description: "Board cargo",
      },
      "vehicle-checkin": {
        submoduleCode: "vehicle-checkin",
        label: "Vehicle Checking In",
        route: "/company/vehicle-checking",
        displayOrder: 3,
        actions: ["read", "write", "edit"],
        description: "Check in vehicles",
      },
      "passenger-boarding": {
        submoduleCode: "passenger-boarding",
        label: "Passenger Boarding",
        route: "/company/passenger-boarding",
        displayOrder: 4,
        actions: ["read", "write", "edit"],
        description: "Board passengers",
      },
      "cargo-checkin": {
        submoduleCode: "cargo-checkin",
        label: "Cargo Boarding",
        route: "/company/cargo-checking",
        displayOrder: 5,
        actions: ["read", "write", "edit"],
        description: "Cargo operations",
      },
      "vehicle-boarding": {
        submoduleCode: "vehicle-boarding",
        label: "Vehicle Boarding",
        route: "/company/vehicle-boarding",
        displayOrder: 6,
        actions: ["read", "write", "edit"],
        description: "Board vehicles",
      },
      "trip-completion": {
        submoduleCode: "trip-completion",
        label: "Trip Completion & Closure",
        route: "/company/trip-completion",
        displayOrder: 7,
        actions: ["read", "write", "edit"],
        description: "Complete and close trips",
      },
    },
  },

  // ========================================
  // FINANCE
  // ========================================
  finance: {
    moduleCode: "finance",
    label: "Finance",
    icon: "fa-credit-card",
    type: "menu",
    displayOrder: 7,
    description: "Financial management and accounting",
    submodules: {
      "chart-of-accounts": {
        submoduleCode: "chart-of-accounts",
        label: "Chart of Accounts",
        route: "/company/finance/chart-of-accounts",
        displayOrder: 1,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage chart of accounts and ledgers",
      },
      "bank-cash-accounts": {
        submoduleCode: "bank-cash-accounts",
        label: "Bank & Cash Accounts",
        route: "/company/finance/bank-cash-accounts",
        displayOrder: 2,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage bank and cash accounts",
      },
      "journal-entries": {
        submoduleCode: "journal-entries",
        label: "Journal Entries",
        route: "/company/finance/journal-entries",
        displayOrder: 3,
        actions: ["read", "write", "edit", "delete"],
        description: "Create and manage journal entries",
      },
      "payments-receipts": {
        submoduleCode: "payments-receipts",
        label: "Payments & Receipts",
        route: "/company/finance/payments-receipts",
        displayOrder: 4,
        actions: ["read", "write", "edit", "delete"],
        description: "Record payments and receipts",
      },
      "agent-topup": {
        submoduleCode: "agent-topup",
        label: "Agent Top-up Deposits",
        route: "/company/finance/agent-top-up-deposits",
        displayOrder: 5,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage agent deposits and top-ups",
      },
      "general-ledger": {
        submoduleCode: "general-ledger",
        label: "General Ledger",
        route: "/company/finance/general-ledger",
        displayOrder: 6,
        actions: ["read"],
        description: "View general ledger reports",
      },
      "trial-balance": {
        submoduleCode: "trial-balance",
        label: "Trial Balance",
        route: "/company/finance/trial-balance",
        displayOrder: 7,
        actions: ["read"],
        description: "View trial balance reports",
      },
      "accounting-periods": {
        submoduleCode: "accounting-periods",
        label: "Accounting Periods",
        route: "/company/finance/accounting-periods",
        displayOrder: 8,
        actions: ["read", "write", "edit"],
        description: "Manage accounting periods",
      },
    },
  },

  // ========================================
  // SETTINGS
  // ========================================
  settings: {
    moduleCode: "settings",
    label: "Settings",
    icon: "fa-cog",
    type: "menu",
    displayOrder: 8,
    description: "Company configuration and administration",
    submodules: {
      "company-profile": {
        submoduleCode: "company-profile",
        label: "Company Profile",
        route: "/company/settings/company-profile",
        displayOrder: 1,
        actions: ["read", "write", "edit"],
        description: "Manage company profile information",
      },
      "roles-permissions": {
        submoduleCode: "roles-permissions",
        label: "Role & Permission",
        route: "/company/settings/role-permission",
        displayOrder: 2,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage roles and permissions",
      },
      "load-types": {
        submoduleCode: "load-types",
        label: "Load Type",
        route: "/company/settings/load-types",
        displayOrder: 3,
        actions: ["read", "write", "edit", "delete"],
        description: "Configure load types",
      },
      "partners-classifications": {
        submoduleCode: "partners-classifications",
        label: "Partners Classifications",
        route: "/company/settings/partners-classifications",
        displayOrder: 4,
        actions: ["read", "write", "edit", "delete"],
        description: "Manage partner classifications",
      },
      ports: {
        submoduleCode: "ports",
        label: "Port",
        route: "/company/settings/port",
        displayOrder: 5,
        actions: ["read", "write", "edit", "delete"],
        description: "Configure ports",
      },
      cabins: {
        submoduleCode: "cabins",
        label: "Cabin",
        route: "/company/settings/cabin",
        displayOrder: 6,
        actions: ["read", "write", "edit", "delete"],
        description: "Configure cabins",
      },
      "payload-type": {
        submoduleCode: "payload-type",
        label: "Payload Type",
        route: "/company/settings/payload-type",
        displayOrder: 7,
        actions: ["read", "write", "edit", "delete"],
        description: "Configure payload types",
      },
    },
  },

  // ========================================
  // SYSTEM ALERTS
  // ========================================
  "system-alerts": {
    moduleCode: "system-alerts",
    label: "System Alerts",
    icon: "fa-bell",
    route: "/company/system-alerts",
    type: "single",
    displayOrder: 9,
    description: "View system alerts and notifications",
  },
}

/**
 * UTILITY FUNCTIONS
 * ================
 */

/**
 * Get all module codes
 * Used for RBAC validation
 */
function getAllModuleCodes() {
  return Object.keys(menuConfig)
}

/**
 * Get all submodule codes for a specific module
 * Used for RBAC validation
 */
function getSubmoduleCodesForModule(moduleCode) {
  const module = menuConfig[moduleCode]
  if (!module || !module.submodules) {
    return []
  }
  return Object.keys(module.submodules)
}

/**
 * Validate if a module exists
 */
function isValidModule(moduleCode) {
  return moduleCode in menuConfig
}

/**
 * Validate if a submodule exists under a module
 */
function isValidSubmodule(moduleCode, submoduleCode) {
  const module = menuConfig[moduleCode]
  if (!module || !module.submodules) {
    return false
  }
  return submoduleCode in module.submodules
}

/**
 * Get full module definition
 */
function getModule(moduleCode) {
  return menuConfig[moduleCode] || null
}

/**
 * Get full submodule definition
 */
function getSubmodule(moduleCode, submoduleCode) {
  const module = menuConfig[moduleCode]
  if (!module || !module.submodules) {
    return null
  }
  return module.submodules[submoduleCode] || null
}

/**
 * Get menu structure for sidebar (all modules and submodules)
 * Frontend should request this from the Sidebar API
 */
function getFullMenuStructure() {
  return menuConfig
}

/**
 * PERMISSION NORMALIZATION
 * ========================
 * Converts database permission flags to frontend-safe permission keys
 * 
 * Database:  canRead, canWrite, canEdit, canDelete
 * Frontend:  read, create, update, delete
 */
function normalizePermissions(dbPermissions) {
  return {
    read: dbPermissions.canRead === true,
    create: dbPermissions.canWrite === true,
    update: dbPermissions.canEdit === true,
    delete: dbPermissions.canDelete === true,
  }
}

/**
 * BUILD MENU FOR CONTEXT
 * ======================
 * Pure function that builds menu based on user role and access groups
 * 
 * @param {Object} config
 *   - role: "company" | "user"
 *   - accessGroups: Array of AccessGroup documents (for users)
 *   - companyId: (for validation)
 * 
 * @returns {Object} Fully-formed menu with normalized permissions
 */
function buildMenuForContext({ role, accessGroups = [], companyId } = {}) {
  // COMPANY OVERRIDE: Full menu with all permissions
  if (role === "company") {
    const result = {}

    for (const [moduleCode, module] of Object.entries(menuConfig)) {
      const baseModule = { ...module }

      if (module.type === "single") {
        result[moduleCode] = {
          ...baseModule,
          permissions: {
            read: true,
            create: true,
            update: true,
            delete: true,
          },
        }
        continue
      }

      if (module.submodules) {
        const subs = {}
        for (const [subCode, sub] of Object.entries(module.submodules)) {
          // Skip "allocation" submodule for company role (only show for user role)
          if (moduleCode === "partners-management" && subCode === "allocation") {
            continue
          }

          subs[subCode] = {
            ...sub,
            permissions: {
              read: true,
              create: true,
              update: true,
              delete: true,
            },
          }
        }
        result[moduleCode] = {
          ...baseModule,
          submodules: subs,
        }
      }
    }

    return result
  }

  // USER FLOW: Build permission map from access groups
  const permissionMap = {}

  for (const ag of accessGroups) {
    if (!ag.moduleCode || !ag.permissions) continue

    if (!permissionMap[ag.moduleCode]) {
      permissionMap[ag.moduleCode] = {}
    }

    for (const perm of ag.permissions) {
      if (!perm.submoduleCode) continue
      permissionMap[ag.moduleCode][perm.submoduleCode] = normalizePermissions(perm)
    }
  }

  // Build filtered menu from permission map
  const result = {}

  for (const [moduleCode, module] of Object.entries(menuConfig)) {
    const modulePerms = permissionMap[moduleCode]
    if (!modulePerms) continue // Skip if user has no access to this module

    const baseModule = { ...module }

    if (module.type === "single") {
      result[moduleCode] = baseModule
      continue
    }

    if (module.submodules) {
      const visibleSubs = {}

      for (const [subCode, sub] of Object.entries(module.submodules)) {
        const subPerms = modulePerms[subCode]
        if (!subPerms || !subPerms.read) continue // Only show if canRead === true

        visibleSubs[subCode] = {
          ...sub,
          permissions: subPerms,
        }
      }

      // Only include module if it has visible submodules
      if (Object.keys(visibleSubs).length > 0) {
        result[moduleCode] = {
          ...baseModule,
          submodules: visibleSubs,
        }
      }
    }
  }

  return result
}

/**
 * Get full menu with all permissions enabled
 * Used for company role (system owner) to have complete access
 * 
 * @returns {Object} Full menu structure with all permissions granted
 */
function getFullMenuWithPermissions() {
  return buildMenuForContext({ role: "company" })
}

/**
 * Build sidebar menu filtered by user permissions
 * This will be used in the Sidebar API controller
 * 
 * @param {Array} accessGroups - User's access groups with permissions
 * @returns {Object} Filtered menu structure
 */
function buildFilteredMenu(accessGroups) {
  const filteredMenu = {}

  // For each module in the config
  for (const [moduleCode, moduleConfig] of Object.entries(menuConfig)) {
    // Check if user has permission for this module
    const hasModulePermission = accessGroups.some(
      (ag) => ag.moduleCode === moduleCode
    )

    if (!hasModulePermission) {
      continue // Skip module if user has no permission
    }

    // If it's a single-page module (no submodules), include it
    if (moduleConfig.type === "single") {
      filteredMenu[moduleCode] = {
        ...moduleConfig,
        hasAccess: true,
      }
      continue
    }

    // For menu modules, filter submodules by permissions
    if (moduleConfig.submodules) {
      const moduleData = accessGroups.find((ag) => ag.moduleCode === moduleCode)

      const filteredSubmodules = {}
      for (const [submoduleCode, submoduleConfig] of Object.entries(
        moduleConfig.submodules
      )) {
        // Check if user has permission for this submodule
        const hasPermission = moduleData.permissions.some(
          (p) => p.submoduleCode === submoduleCode && p.canRead === true
        )

        if (hasPermission) {
          const permission = moduleData.permissions.find(
            (p) => p.submoduleCode === submoduleCode
          )
          filteredSubmodules[submoduleCode] = {
            ...submoduleConfig,
            userPermissions: {
              canRead: permission.canRead === true,
              canWrite: permission.canWrite === true,
              canEdit: permission.canEdit === true,
              canDelete: permission.canDelete === true,
            },
          }
        }
      }

      // Only include module if it has accessible submodules
      if (Object.keys(filteredSubmodules).length > 0) {
        filteredMenu[moduleCode] = {
          ...moduleConfig,
          submodules: filteredSubmodules,
          hasAccess: true,
        }
      }
    }
  }

  return filteredMenu
}

module.exports = {
  // Main config
  menuConfig,

  // Core menu builder (STEP 2)
  buildMenuForContext,
  normalizePermissions,

  // Utility functions
  getAllModuleCodes,
  getSubmoduleCodesForModule,
  isValidModule,
  isValidSubmodule,
  getModule,
  getSubmodule,
  getFullMenuStructure,
  getFullMenuWithPermissions,
  buildFilteredMenu,
}
