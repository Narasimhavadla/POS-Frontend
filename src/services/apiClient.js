export const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname || "localhost";
    const protocol = window.location.protocol || "http:";
    return `${protocol}//${hostname}:5000`;
  }
  return "http://localhost:5000";
};

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname || "localhost";
    const protocol = window.location.protocol || "http:";
    return `${protocol}//${hostname}:5000/api/v1`;
  }
  return "http://localhost:5000/api/v1";
};

/**
 * Returns the current tenant SSID stored after login.
 * Used to construct SSID-scoped API URLs: /api/v1/{ssid}/owner/...
 */
const getTenantSsid = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("smartserve_tenant_ssid") || null;
};

/**
 * Core fetch helper.
 * - For tenant-scoped endpoints (owner/, pos/): prepends the SSID automatically.
 * - For global endpoints (auth/, super-admin/): uses the flat URL.
 */
export async function fetchApi(endpoint, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("smartserve_token") : null;
  const baseUrl = getApiBaseUrl();

  // Determine if this is a tenant-scoped endpoint
  const isTenantEndpoint = endpoint.startsWith("/owner/") || endpoint.startsWith("/pos/");
  const ssid = getTenantSsid();

  let url;
  if (isTenantEndpoint && ssid) {
    // SSID-scoped URL: /api/v1/{ssid}/owner/...  or  /api/v1/{ssid}/pos/...
    url = `${baseUrl}/${ssid}${endpoint}`;
  } else {
    // Global or fallback URL
    url = `${baseUrl}${endpoint}`;
  }

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      return { success: false, message: `Non-JSON response from server (${res.status})` };
    }
  } catch (error) {
    console.warn(`API call failed for ${url}:`, error.message);
    return { success: false, message: error.message };
  }
}

export const api = {
  // Auth (no SSID needed)
  registerRestaurant: (payload) => fetchApi("/auth/register-restaurant", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => fetchApi("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  getMe: () => fetchApi("/auth/me"),

  // Super Admin (no SSID needed)
  getTenants: () => fetchApi("/super-admin/tenants"),
  updateTenantStatus: (id, status, branchInfo = {}) => fetchApi(`/super-admin/tenants/${id}/status`, { method: "PUT", body: JSON.stringify({ status, ...branchInfo }) }),
  resetTenantPassword: (id, newPassword) => fetchApi(`/super-admin/tenants/${id}/reset-password`, { method: "PUT", body: JSON.stringify({ newPassword }) }),
  updateFeatureFlags: (id, featureFlags) => fetchApi(`/super-admin/tenants/${id}/feature-flags`, { method: "PATCH", body: JSON.stringify({ featureFlags }) }),
  impersonateTenant: (id) => fetchApi(`/super-admin/tenants/${id}/impersonate`, { method: "POST" }),
  getGlobalAnalytics: () => fetchApi("/super-admin/analytics"),
  // Subscription management
  getAllSubscriptions: () => fetchApi("/super-admin/subscriptions"),
  changeSubscriptionPlan: (tenantId, payload) => fetchApi(`/super-admin/subscriptions/${tenantId}/plan`, { method: "PATCH", body: JSON.stringify(payload) }),
  getSubscriptionHistory: (tenantId) => fetchApi(`/super-admin/subscriptions/${tenantId}/history`),

  // ─── Owner & Settings & Menu Builder (SSID-scoped) ───────────────────────────
  getStaff: () => fetchApi("/owner/staff"),
  createStaff: (payload) => fetchApi("/owner/staff", { method: "POST", body: JSON.stringify(payload) }),
  updateStaff: (id, payload) => fetchApi(`/owner/staff/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteStaff: (id, payload) => fetchApi(`/owner/staff/${id}`, { method: "DELETE", body: JSON.stringify(payload || {}) }),
  updateStaffPin: (id, payload) => fetchApi(`/owner/staff/${id}/pin`, { method: "PUT", body: JSON.stringify(payload) }),

  // PIN management
  verifyManagerPin: (pin) => fetchApi("/owner/verify-manager-pin", { method: "POST", body: JSON.stringify({ pin }) }),
  changeOwnerPin: (payload) => fetchApi("/owner/owner/change-pin", { method: "POST", body: JSON.stringify(payload) }),

  getCategories: () => fetchApi("/owner/categories"),
  createCategory: (payload) => fetchApi("/owner/categories", { method: "POST", body: JSON.stringify(payload) }),
  updateCategory: (id, payload) => fetchApi(`/owner/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCategory: (id) => fetchApi(`/owner/categories/${id}`, { method: "DELETE" }),

  getMenuItems: () => fetchApi("/owner/menu-items"),
  createMenuItem: (payload) => fetchApi("/owner/menu-items", { method: "POST", body: JSON.stringify(payload) }),
  updateMenuItem: (id, payload) => fetchApi(`/owner/menu-items/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMenuItem: (id) => fetchApi(`/owner/menu-items/${id}`, { method: "DELETE" }),

  getInventory: () => fetchApi("/owner/inventory"),

  getTables: () => fetchApi("/owner/tables"),
  createTable: (payload) => fetchApi("/owner/tables", { method: "POST", body: JSON.stringify(payload) }),
  updateTableStatus: (id, status) => fetchApi(`/owner/tables/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  updateTable: (id, payload) => fetchApi(`/owner/tables/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTable: (id) => fetchApi(`/owner/tables/${id}`, { method: "DELETE" }),

  getSettings: () => fetchApi("/owner/settings"),
  updateSettings: (payload) => fetchApi("/owner/settings", { method: "PUT", body: JSON.stringify(payload) }),

  uploadLogo: async (file) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("smartserve_token") : null;
    const ssid = getTenantSsid();
    const baseUrl = getApiBaseUrl();
    const formData = new FormData();
    formData.append("logo", file);
    const headers = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const uploadUrl = ssid
      ? `${baseUrl}/${ssid}/owner/upload-logo`
      : `${baseUrl}/owner/upload-logo`;
    const res = await fetch(uploadUrl, { method: "POST", headers, body: formData });
    return res.json();
  },

  getReportsAnalytics: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/owner/reports${query ? `?${query}` : ''}`);
  },

  getAuditLogs: () => fetchApi("/owner/audit-logs"),
  createAuditLog: (payload) => fetchApi("/owner/audit-logs", { method: "POST", body: JSON.stringify(payload) }),

  // Manager Session Registry (SSID-scoped)
  registerManagerSession: (payload) => fetchApi("/owner/manager-sessions", { method: "POST", body: JSON.stringify(payload) }),
  getActiveSessions: () => fetchApi("/owner/manager-sessions"),
  revokeManagerSession: (sessionId) => fetchApi(`/owner/manager-sessions/${sessionId}`, { method: "DELETE" }),
  revokeAllManagerSessions: () => fetchApi("/owner/manager-sessions", { method: "DELETE" }),

  // Multi-Branch / Outlet Support
  getBranches: () => fetchApi("/owner/branches"),
  createBranch: (payload) => fetchApi("/owner/branches", { method: "POST", body: JSON.stringify(payload) }),

  // ─── POS & KDS Orders (SSID-scoped) ──────────────────────────────────────────
  getPosOrders: () => fetchApi("/pos/orders"),
  createPosOrder: (payload) => fetchApi("/pos/orders", { method: "POST", body: JSON.stringify(payload) }),
  updateOrderStatus: (id, payload) => fetchApi(`/pos/orders/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  voidOrder: (id, payload) => fetchApi(`/pos/orders/${id}/void`, { method: "POST", body: JSON.stringify(payload) }),

  // ─── Shift Drawer & Z-Report (SSID-scoped) ───────────────────────────────────
  getActiveShift: () => fetchApi("/pos/shifts/active"),
  openShift: (payload) => fetchApi("/pos/shifts/open", { method: "POST", body: JSON.stringify(payload) }),
  closeShift: (shiftId, payload) => fetchApi(`/pos/shifts/${shiftId}/close`, { method: "POST", body: JSON.stringify(payload) }),
  // Owner-only: full shift history across all staff
  getShiftHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/owner/shifts/history${query ? `?${query}` : ''}`);
  },
  getOwnerActiveShift: () => fetchApi("/owner/shifts/active"),

  // ─── Staff Attendance (SSID-scoped) ───────────────────────────────────────
  // Staff self-service
  clockIn:  () => fetchApi("/pos/attendance/clock-in",  { method: "POST" }),
  clockOut: () => fetchApi("/pos/attendance/clock-out", { method: "PUT" }),
  getMyAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/pos/attendance/my${query ? `?${query}` : ''}`);
  },
  // Owner/Manager management
  getAllAttendance: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/owner/attendance${query ? `?${query}` : ''}`);
  },
  getAttendanceSummary: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/owner/attendance/summary${query ? `?${query}` : ''}`);
  },
  getActiveClockIns: () => fetchApi("/owner/attendance/live"),
  markAbsent: (payload) => fetchApi("/owner/attendance/mark-absent", { method: "POST", body: JSON.stringify(payload) }),

  // Holidays API
  getHolidays: () => fetchApi("/pos/holidays"),
  createHoliday: (payload) => fetchApi("/owner/holidays", { method: "POST", body: JSON.stringify(payload) }),
  deleteHoliday: (id) => fetchApi(`/owner/holidays/${id}`, { method: "DELETE" }),

  // ─── Leave Management (SSID-scoped) ───────────────────────────────────────
  // Staff self-service
  submitLeaveRequest: (payload) => fetchApi("/pos/leaves", { method: "POST", body: JSON.stringify(payload) }),
  getMyLeaveRequests: () => fetchApi("/pos/leaves/my"),
  cancelLeaveRequest: (id) => fetchApi(`/pos/leaves/${id}`, { method: "DELETE" }),
  // Owner/Manager
  getAllLeaveRequests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/owner/leaves${query ? `?${query}` : ''}`);
  },
  updateLeaveStatus: (id, payload) => fetchApi(`/owner/leaves/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),

  // Support Tickets (global)
  getTickets: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/tickets${query ? `?${query}` : ''}`);
  },
  createTicket: (payload) => fetchApi("/tickets", { method: "POST", body: JSON.stringify(payload) }),
  replyTicket: (id, message) => fetchApi(`/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ message }) }),
  updateTicketStatus: (id, status) => fetchApi(`/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
};
