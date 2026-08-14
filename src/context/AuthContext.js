"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getInitialStore } from "@/services/store";
import { api, getSocketUrl } from "@/services/apiClient";
import { io } from "socket.io-client";
import { toast } from "sonner";

const AuthContext = createContext();

const INITIAL_PERMISSIONS_MATRIX = {
  cashier: {
    pos: true,
    kds: false,
    waiter: false,
    table_ordering: true,
    orders: true,
    order_history: true,
    menu_builder: false,
    inventory: false,
    reports: false,
    staff: false,
    settings: false
  },
  waiter: {
    pos: false,
    kds: false,
    waiter: true,
    table_ordering: true,
    orders: true,
    order_history: true,
    menu_builder: false,
    inventory: false,
    reports: false,
    staff: false,
    settings: false
  },
  kitchen: {
    pos: false,
    kds: true,
    waiter: false,
    table_ordering: false,
    orders: true,
    order_history: true,
    menu_builder: false,
    inventory: true,
    reports: false,
    staff: false,
    settings: false
  },
  manager: {
    pos: true,
    kds: true,
    waiter: true,
    table_ordering: true,
    orders: true,
    order_history: true,
    menu_builder: true,
    inventory: true,
    reports: true,
    staff: true,
    settings: true
  }
};

const INITIAL_REGISTERED_TENANTS = [];

export function AuthProvider({ children }) {
  const [store, setStore] = useState(() => getInitialStore());
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("smartserve_user");
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [activeRole, setActiveRole] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartserve_active_role") || null;
    }
    return null;
  });
  const [activeScreen, setActiveScreen] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("smartserve_active_screen") || null;
    }
    return null;
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // PRD States
  const [permissionsMatrix, setPermissionsMatrix] = useState(INITIAL_PERMISSIONS_MATRIX);
  const [orderWorkflowMode, setOrderWorkflowMode] = useState("WORKFLOW_1");
  const [registeredTenants, setRegisteredTenants] = useState(INITIAL_REGISTERED_TENANTS);

  const [taxName, setTaxName] = useState("GST");
  const [taxRate, setTaxRate] = useState(5.0);
  const [currencySymbol, setCurrencySymbol] = useState("₹");

  async function loadBackendData() {
    try {
      const requests = [
        api.getCategories(),
        api.getMenuItems(),
        api.getTables(),
        api.getStaff(),
        api.getPosOrders(),
        api.getSettings(),
        api.getMe(),
        api.getBranches()
      ];
      if (user?.key === 'superadmin' || user?.role === 'superadmin' || user?.role === 'Super Admin') {
        requests.push(api.getTenants());
      }

      const [categoriesRes, menuRes, tablesRes, staffRes, ordersRes, settingsRes, meRes, branchesRes, tenantsRes] = await Promise.allSettled(requests);

      if (branchesRes.status === "fulfilled" && branchesRes.value?.success && Array.isArray(branchesRes.value.data)) {
        const fetchedBranches = branchesRes.value.data;
        setStore((prev) => ({
          ...prev,
          branches: fetchedBranches,
          activeBranchId: prev.activeBranchId || fetchedBranches[0]?.id
        }));
      }

      if (meRes.status === "fulfilled" && meRes.value?.success && meRes.value?.data?.user) {
        const freshUser = meRes.value.data.user;
        const tenantObj = freshUser.tenant || {};
        const mappedUser = {
          id: freshUser.id,
          name: freshUser.name,
          email: freshUser.email || "",
          username: freshUser.username || "",
          ssid: freshUser.ssid || "",
          role: freshUser.role === 'superadmin' ? 'Super Admin' : freshUser.role === 'owner' ? 'Owner' : freshUser.role.toUpperCase(),
          key: freshUser.role,
          tenantId: freshUser.tenantId,
          tenantName: tenantObj.name || freshUser.name || "Restaurant",
          tenantSsid: tenantObj.ssid || "",
          logo: freshUser.logo || tenantObj.logo || null
        };
        setUser(mappedUser);
        if (freshUser.tenantId) {
          localStorage.setItem("smartserve_tenant_id", freshUser.tenantId);
          localStorage.setItem("smartserve_tenant_name", mappedUser.tenantName);
          if (mappedUser.tenantSsid) {
            localStorage.setItem("smartserve_tenant_ssid", mappedUser.tenantSsid);
          }
          if (mappedUser.logo) {
            localStorage.setItem("smartserve_tenant_logo", mappedUser.logo);
          }
          setStore((prev) => ({ ...prev, activeTenantId: freshUser.tenantId }));
        }
        localStorage.setItem("smartserve_user", JSON.stringify(mappedUser));
      }

      setStore((prev) => {
        const updated = { ...prev };
        if (categoriesRes.status === "fulfilled" && categoriesRes.value?.success && Array.isArray(categoriesRes.value.data)) {
          updated.categories = categoriesRes.value.data;
        }
        if (menuRes.status === "fulfilled" && menuRes.value?.success && Array.isArray(menuRes.value.data)) {
          updated.menuItems = menuRes.value.data;
        }
        if (tablesRes.status === "fulfilled" && tablesRes.value?.success && Array.isArray(tablesRes.value.data)) {
          updated.tables = tablesRes.value.data;
        }
        if (staffRes.status === "fulfilled" && staffRes.value?.success && Array.isArray(staffRes.value.data)) {
          updated.staff = staffRes.value.data;
        }
        if (ordersRes.status === "fulfilled" && ordersRes.value?.success && Array.isArray(ordersRes.value.data)) {
          const fetchedOrders = ordersRes.value.data.map((o) => {
            let parsed = o.items;
            if (typeof o.items === "string") {
              try { parsed = JSON.parse(o.items || "[]"); } catch { parsed = []; }
            }
            return { ...o, items: Array.isArray(parsed) ? parsed : [] };
          });

          // Preserve local unclosed active table orders so they hold until closed
          const currentOrders = prev.orders || [];
          const merged = [...fetchedOrders];
          currentOrders.forEach((loc) => {
            if (
              loc.status !== "CLOSED" &&
              loc.status !== "closed" &&
              loc.status !== "VOIDED" &&
              loc.status !== "voided" &&
              loc.paymentStatus !== "PAID" &&
              loc.paymentStatus !== "paid" &&
              loc.paymentStatus !== "VOIDED" &&
              loc.paymentStatus !== "voided"
            ) {
              const idx = merged.findIndex((b) => b.id === loc.id || (b.tableNo && loc.tableNo && String(b.tableNo).toUpperCase() === String(loc.tableNo).toUpperCase()));
              if (idx === -1) {
                merged.unshift(loc);
              } else if ((loc.items || []).length > (merged[idx].items || []).length) {
                merged[idx] = { ...merged[idx], items: loc.items, totalAmount: loc.totalAmount || merged[idx].totalAmount };
              }
            }
          });

          updated.orders = merged;
        }
        return updated;
      });

      if (tenantsRes.status === "fulfilled" && tenantsRes.value?.success && tenantsRes.value?.data?.length) {
        const fetchedTenants = tenantsRes.value.data;
        setStore((prev) => ({
          ...prev,
          tenants: fetchedTenants,
          activeTenantId: prev.activeTenantId || localStorage.getItem("smartserve_tenant_id") || fetchedTenants[0]?.id
        }));
        setRegisteredTenants(fetchedTenants.map(t => ({
          id: t.id,
          ssid: t.ssid,
          name: t.name,
          owner: t.ownerName || t.owner,
          username: t.ownerUsername || (t.users && t.users.length > 0 ? t.users[0].username : (t.ownerName ? t.ownerName.toLowerCase().replace(/\s+/g, '') : "owner")),
          tempPassword: t.ownerTempPassword,
          email: t.email,
          phone: t.phone,
          city: t.city,
          branches: t.outletsCount || t.branches || 1,
          plan: t.plan,
          status: t.status,
          featureFlagsJson: t.featureFlagsJson,
          createdAt: t.createdAt ? t.createdAt.split("T")[0] : "2026-08-01"
        })));
      }

      if (settingsRes.status === "fulfilled" && settingsRes.value?.success && settingsRes.value?.data) {
        const sData = settingsRes.value.data;
        if (sData.orderWorkflowMode) {
          setOrderWorkflowMode(sData.orderWorkflowMode);
        }
        if (sData.taxName) setTaxName(sData.taxName);
        if (sData.taxRate !== undefined) setTaxRate(parseFloat(sData.taxRate) || 5.0);
        if (sData.currency) setCurrencySymbol(sData.currency);
        
        if (sData.logo) {
          if (typeof window !== "undefined") {
            localStorage.setItem("smartserve_tenant_logo", sData.logo);
          }
          setUser((prevUser) => prevUser ? { ...prevUser, logo: sData.logo } : prevUser);
        }

        setStore((prev) => {
          const activeId = prev.activeTenantId || user?.tenantId;
          let tenants = prev.tenants || [];
          const matchedIdx = tenants.findIndex((t) => t.id === activeId);
          if (matchedIdx !== -1) {
            tenants = [...tenants];
            tenants[matchedIdx] = {
              ...tenants[matchedIdx],
              currencySymbol: sData.currency || tenants[matchedIdx].currencySymbol,
              taxName: sData.taxName || tenants[matchedIdx].taxName,
              taxRate: sData.taxRate !== undefined ? sData.taxRate : tenants[matchedIdx].taxRate,
              logo: sData.logo || tenants[matchedIdx].logo
            };
          } else {
            tenants = [{
              id: activeId || "default-tenant",
              name: user?.tenantName || "Restaurant",
              currencySymbol: sData.currency || "₹",
              taxName: sData.taxName || "GST",
              taxRate: sData.taxRate !== undefined ? sData.taxRate : 5.0,
              logo: sData.logo || null
            }, ...tenants];
          }
          return { ...prev, tenants };
        });

        if (sData.permissionsMatrixJson) {
          let parsed = sData.permissionsMatrixJson;
          if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); } catch (e) { parsed = null; }
          }
          if (parsed && typeof parsed === "object") {
            setPermissionsMatrix((prev) => ({ ...prev, ...parsed }));
          }
        }
      }
    } catch (e) {
      console.warn("Backend hydration skipped (using local store state):", e.message);
    }
  }

  // Hydrate Store & State from Backend API on mount
  useEffect(() => {
    // Only clear business data caches - NOT auth session keys (user, role, screen)
    if (typeof window !== "undefined") {
      ["smartserve_orders", "smartserve_tables", "smartserve_permissions_matrix"].forEach(k => {
        localStorage.removeItem(k);
      });
    }

    loadBackendData();

    // BroadcastChannel & Cross-tab storage listener for instant multi-tab sync
    let syncChannel = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      syncChannel = new BroadcastChannel("smartserve_sync_channel");
      syncChannel.onmessage = (event) => {
        if (event.data?.type === "ORDER_CREATED" || event.data?.type === "ORDER_UPDATED") {
          if (event.data?.orders) {
            setStore((prev) => ({ ...prev, orders: event.data.orders }));
          }
          if (event.data?.tables) {
            setStore((prev) => ({ ...prev, tables: event.data.tables }));
          }
        }
      };
    }

    const handleStorageChange = (e) => {
      if (e.key === "smartserve_orders" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setStore((prev) => ({ ...prev, orders: parsed }));
        } catch (err) {}
      }
      if (e.key === "smartserve_tables" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setStore((prev) => ({ ...prev, tables: parsed }));
        } catch (err) {}
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
    }

    // Socket.io Real-Time WebSocket Connection (replaces HTTP polling)
    let socket = null;
    if (typeof window !== "undefined") {
      try {
        const socketUrl = getSocketUrl();
        socket = io(socketUrl, {
          transports: ["websocket", "polling"],
          autoConnect: true
        });

        const activeTenantId = localStorage.getItem("smartserve_tenant_id") || "tenant-spice-bistro";
        socket.emit("join_tenant", activeTenantId);

        socket.on("new_order", (newOrder) => {
          if (!newOrder) return;
          let parsed = newOrder.items;
          if (typeof newOrder.items === "string") {
            try { parsed = JSON.parse(newOrder.items || "[]"); } catch { parsed = []; }
          }
          const formattedOrder = { ...newOrder, items: Array.isArray(parsed) ? parsed : [] };

          setStore((prev) => {
            const orders = [...(prev.orders || [])];
            const idx = orders.findIndex((o) => o.id === formattedOrder.id || (o.kotNo && o.kotNo === formattedOrder.kotNo));
            if (idx !== -1) {
              orders[idx] = { ...orders[idx], ...formattedOrder };
            } else {
              orders.unshift(formattedOrder);
            }
            return { ...prev, orders };
          });
        });

        socket.on("order_updated", (updatedOrder) => {
          if (!updatedOrder) return;
          let parsed = updatedOrder.items;
          if (typeof updatedOrder.items === "string") {
            try { parsed = JSON.parse(updatedOrder.items || "[]"); } catch { parsed = []; }
          }
          const formattedOrder = { ...updatedOrder, items: Array.isArray(parsed) ? parsed : [] };

          setStore((prev) => {
            const orders = [...(prev.orders || [])];
            const idx = orders.findIndex((o) => o.id === formattedOrder.id || (o.kotNo && o.kotNo === formattedOrder.kotNo));
            if (idx !== -1) {
              // Don't let stale socket data overwrite a locally-set terminal status
              const localStatus = (orders[idx].status || "").toUpperCase();
              if ((localStatus === "VOIDED" || localStatus === "CLOSED") && formattedOrder.status !== "VOIDED" && formattedOrder.status !== "CLOSED") {
                return prev; // skip stale update
              }

              // Deep merge item-level statuses to preserve SERVED status if server sends outdated item array
              const mergedItems = (formattedOrder.items || []).map((srvItem, itemIdx) => {
                const localItem = (orders[idx].items || [])[itemIdx];
                if (localItem && (localItem.status || "").toUpperCase() === "SERVED") {
                  return { ...srvItem, status: "SERVED" };
                }
                return srvItem;
              });

              orders[idx] = {
                ...orders[idx],
                ...formattedOrder,
                items: mergedItems
              };
            } else {
              orders.unshift(formattedOrder);
            }
            return { ...prev, orders };
          });
        });

        socket.on("table_updated", (updatedTable) => {
          if (!updatedTable) return;
          setStore((prev) => {
            const tables = [...(prev.tables || [])];
            const idx = tables.findIndex((t) => t.id === updatedTable.id || t.number === updatedTable.number);
            if (idx !== -1) {
              tables[idx] = { ...tables[idx], ...updatedTable };
            } else {
              tables.unshift(updatedTable);
            }
            return { ...prev, tables };
          });
        });

        socket.on("table_deleted", (deletedTable) => {
          if (!deletedTable) return;
          setStore((prev) => ({
            ...prev,
            tables: (prev.tables || []).filter((t) => t.id !== deletedTable.id && t.number !== deletedTable.number)
          }));
        });

        // Real-time permissions update: Owner changes matrix → sync all active terminals immediately
        socket.on("permissions_updated", (data) => {
          if (!data || !data.permissionsMatrix) return;
          setPermissionsMatrix((prev) => ({ ...prev, ...data.permissionsMatrix }));
        });

        // Remote Manager Session Revoke — lock this tab if its sessionId was force-revoked
        socket.on("manager_session_revoked", (data) => {
          const mySessionId = sessionStorage.getItem("smartserve_manager_session_id");
          if (data?.sessionId && mySessionId === data.sessionId) {
            setIsManagerUnlocked(false);
            setUnlockedManagerPin(null);
            sessionStorage.removeItem("smartserve_manager_unlocked");
            sessionStorage.removeItem("smartserve_unlocked_pin");
            sessionStorage.removeItem("smartserve_manager_unlock_expiry");
            sessionStorage.removeItem("smartserve_manager_session_id");
            toast.warning("Session Revoked", {
              description: "Your manager session was remotely revoked by the owner."
            });
          }
        });

        // Remote All Sessions Revoke — lock every tab in this tenant
        socket.on("manager_all_sessions_revoked", () => {
          if (sessionStorage.getItem("smartserve_manager_unlocked") === "true") {
            setIsManagerUnlocked(false);
            setUnlockedManagerPin(null);
            sessionStorage.removeItem("smartserve_manager_unlocked");
            sessionStorage.removeItem("smartserve_unlocked_pin");
            sessionStorage.removeItem("smartserve_manager_unlock_expiry");
            sessionStorage.removeItem("smartserve_manager_session_id");
            toast.warning("All Sessions Revoked", {
              description: "All manager sessions were force-locked by the owner."
            });
          }
        });
      } catch (err) {
        console.warn("Socket.io connection initialization error:", err.message);
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageChange);
      }
      if (socket) {
        socket.disconnect();
      }
      if (syncChannel) {
        syncChannel.close();
      }
    };
  }, []);

  // Sync session with local storage
  useEffect(() => {
    const savedUser = localStorage.getItem("smartserve_user");
    const savedRole = localStorage.getItem("smartserve_active_role");
    const savedScreen = localStorage.getItem("smartserve_active_screen");
    const savedTenantId = localStorage.getItem("smartserve_tenant_id");

    if (savedTenantId) {
      setStore((prev) => ({
        ...prev,
        activeTenantId: savedTenantId
      }));
    }

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        const roleToSet = savedRole || parsed.key || "owner";
        setActiveRole(roleToSet);
        if (savedScreen) {
          setActiveScreen(savedScreen);
        } else {
          const defaultScreens = {
            cashier: "pos",
            waiter: "waiter",
            kds: "kds",
            kitchen: "kds",
            owner: "owner",
            tenant: "owner",
            superadmin: "superadmin"
          };
          setActiveScreen(defaultScreens[roleToSet] || "owner");
        }
      } catch (e) {
        console.error("Failed to parse saved user session", e);
      }
    }
    setIsAuthLoading(false);
  }, []);

  const changeActiveScreen = (screenId) => {
    setActiveScreen(screenId);
    if (typeof window !== "undefined") {
      localStorage.setItem("smartserve_active_screen", screenId);
    }
  };

  const login = async (username, password) => {
    try {
      const ident = String(username || "").trim();
      const isSsidLogin = /^SS\d+/i.test(ident);
      const res = await api.login({
        ...(isSsidLogin ? { ssid: ident, pin: password } : { username: ident, password: password })
      });

      if (res && res.success && res.data) {
        const backendUser = res.data.user;
        const tenantObj = backendUser.tenant || {};
        const mappedUser = {
          id: backendUser.id,
          name: backendUser.name,
          email: backendUser.email || "",
          username: backendUser.username || "",
          ssid: backendUser.ssid || "",
          role: backendUser.role === 'superadmin' ? 'Super Admin' : backendUser.role === 'owner' ? 'Owner' : backendUser.role.toUpperCase(),
          key: backendUser.role, // 'owner', 'superadmin', 'cashier', etc.
          tenantId: backendUser.tenantId,
          tenantName: tenantObj.name || backendUser.name || "Restaurant",
          tenantSsid: tenantObj.ssid || ""
        };

        if (res.data.accessToken) {
          localStorage.setItem("smartserve_token", res.data.accessToken);
        }
        if (res.data.refreshToken) {
          localStorage.setItem("smartserve_refresh_token", res.data.refreshToken);
        }
        if (backendUser.tenantId) {
          localStorage.setItem("smartserve_tenant_id", backendUser.tenantId);
          localStorage.setItem("smartserve_tenant_name", mappedUser.tenantName);
          if (mappedUser.tenantSsid) {
            localStorage.setItem("smartserve_tenant_ssid", mappedUser.tenantSsid);
          }
          setStore((prev) => ({
            ...prev,
            activeTenantId: backendUser.tenantId
          }));
        }

        // Apply the tenant-scoped Permissions Matrix from the login response
        if (backendUser.permissionsMatrixJson) {
          let parsed = backendUser.permissionsMatrixJson;
          if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); } catch (e) { parsed = null; }
          }
          if (parsed && typeof parsed === "object") {
            setPermissionsMatrix((prev) => ({ ...prev, ...parsed }));
          }
        }

        // Apply tenant currency & tax settings from login response
        if (backendUser.currency) setCurrencySymbol(backendUser.currency);
        if (backendUser.taxName) setTaxName(backendUser.taxName);
        if (backendUser.taxRate !== undefined) setTaxRate(parseFloat(backendUser.taxRate) || 5.0);

        setUser(mappedUser);
        setActiveRole(mappedUser.key);

        const defaultScreens = {
          cashier: "pos",
          waiter: "waiter",
          kds: "kds",
          kitchen: "kds",
          owner: "owner",
          tenant: "owner",
          superadmin: "superadmin"
        };
        const targetScreen = defaultScreens[mappedUser.key] || "owner";
        setActiveScreen(targetScreen);

        localStorage.setItem("smartserve_user", JSON.stringify(mappedUser));
        localStorage.setItem("smartserve_active_role", mappedUser.key);
        localStorage.setItem("smartserve_active_screen", targetScreen);

        // Fetch scoped restaurant data (categories, menus, tables, settings) immediately
        await loadBackendData().catch(() => {});

        toast.success(`Welcome back, ${mappedUser.name}!`);
        return { success: true };
      } else {
        toast.error(res?.message || "Invalid login credentials.");
        return { success: false, message: res?.message };
      }
    } catch (e) {
      console.warn("Backend auth call failed:", e.message);
      toast.error("Unable to login right now. Please try again.");
      return { success: false, message: e.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("smartserve_user");
    localStorage.removeItem("smartserve_token");
    localStorage.removeItem("smartserve_refresh_token");
    localStorage.removeItem("smartserve_active_role");
    localStorage.removeItem("smartserve_active_screen");
    toast.info("Logged out of SmartServe session");
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const updatePermission = (role, permissionKey, value) => {
    setPermissionsMatrix((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [permissionKey]: value
      }
    }));
  };

  const savePermissionsMatrix = async (matrix) => {
    try {
      const res = await api.updateSettings({ permissionsMatrixJson: JSON.stringify(matrix) });
      if (res && res.success) {
        setPermissionsMatrix(matrix);
        toast.success("RBAC Permission Matrix saved to DB & live synced across terminals!");
        return { success: true };
      } else {
        toast.error(res?.message || "Failed to save permission matrix.");
        return { success: false, message: res?.message };
      }
    } catch (e) {
      toast.error(`Permission save error: ${e.message}`);
      return { success: false, message: e.message };
    }
  };

  const registerTenant = (tenantData) => {
    const newTenant = {
      id: `tenant-${Date.now()}`,
      status: "Pending Approval",
      createdAt: new Date().toISOString().split("T")[0],
      ...tenantData
    };
    setRegisteredTenants((prev) => [newTenant, ...prev]);

    // Register in backend and refresh tenants list
    api.registerRestaurant({
      restaurantName: tenantData.name,
      ownerName: tenantData.owner,
      email: tenantData.email,
      phone: tenantData.phone,
      city: tenantData.city,
      outlets: tenantData.branches,
      plan: tenantData.plan
    }).then(async (res) => {
      if (res && res.success) {
        // Refresh from backend to get real IDs and generated credentials
        const freshRes = await api.getTenants();
        if (freshRes.success && Array.isArray(freshRes.data)) {
          setRegisteredTenants(freshRes.data.map(t => ({
            id: t.id,
            ssid: t.ssid,
            name: t.name,
            owner: t.ownerName || t.owner,
            username: t.ownerUsername || (t.users && t.users.length > 0 ? t.users[0].username : "owner"),
            tempPassword: t.ownerTempPassword,
            email: t.email,
            phone: t.phone,
            city: t.city,
            branches: t.outletsCount || 1,
            plan: t.plan,
            status: t.status,
            featureFlagsJson: t.featureFlagsJson,
            createdAt: t.createdAt ? t.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]
          })));
        }
      }
    }).catch((e) => console.warn("Backend register fallback:", e.message));

    toast.success("Restaurant application submitted!", {
      description: "Status: Pending Approval by Super Admin"
    });

    return newTenant;
  };

  const impersonateTenant = async (tenant) => {
    try {
      const res = await api.impersonateTenant(tenant.id);
      if (res && res.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("smartserve_tenant_id", tenant.id);
          localStorage.setItem("smartserve_tenant_name", tenant.name);
          if (tenant.ssid) {
            localStorage.setItem("smartserve_tenant_ssid", tenant.ssid);
          } else {
            localStorage.removeItem("smartserve_tenant_ssid");
          }
          localStorage.setItem("smartserve_active_role", "owner");
          localStorage.setItem("smartserve_active_screen", "owner");
        }
        setStore((prev) => ({
          ...prev,
          activeTenantId: tenant.id
        }));
        setActiveRole("owner");
        setActiveScreen("owner");
        setIsManagerUnlocked(true);

        // Fetch scoped restaurant data (categories, menus, tables, settings) immediately for this tenant
        await loadBackendData().catch(() => {});

        toast.success(`Login As: Impersonating ${tenant.name}`, {
          description: `Tenant SSID: ${tenant.ssid || tenant.id} • SuperAdmin Access active`
        });
      } else {
        toast.error(res?.message || "Failed to impersonate tenant");
      }
    } catch (e) {
      toast.error("Failed to impersonate: " + e.message);
    }
  };

  const updateTenantStatus = async (tenantId, newStatus) => {
    // Optimistic UI update
    setRegisteredTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await api.updateTenantStatus(tenantId, newStatus);
      if (res.success) {
        // Re-fetch all tenants to get fresh data including ownerTempPassword
        const freshRes = await api.getTenants();
        if (freshRes.success && Array.isArray(freshRes.data)) {
          setRegisteredTenants(freshRes.data.map(t => ({
            id: t.id,
            ssid: t.ssid,
            name: t.name,
            owner: t.ownerName || t.owner,
            username: t.ownerUsername || (t.users && t.users.length > 0 ? t.users[0].username : "owner"),
            tempPassword: t.ownerTempPassword,
            email: t.email,
            phone: t.phone,
            city: t.city,
            branches: t.outletsCount || 1,
            plan: t.plan,
            status: t.status,
            featureFlagsJson: t.featureFlagsJson,
            createdAt: t.createdAt ? t.createdAt.split("T")[0] : "2026-08-01"
          })));
        }

        if (newStatus === "Active" && res.credentials) {
          toast.success(`✅ Tenant Approved & Activated!`, {
            description: `Tenant SSID: ${res.credentials.tenantSsid} | Owner SSID: ${res.credentials.ownerSsid} | Login: ${res.credentials.username}`,
            duration: 15000
          });
        } else {
          toast.info(`Tenant Status Updated`, {
            description: `Status changed to "${newStatus}"`
          });
        }
        return res.credentials || null;
      }
    } catch (e) {
      console.warn("Backend status update fallback:", e.message);
    }

    toast.info(`Tenant Status Updated`, {
      description: `Tenant status changed to "${newStatus}"`
    });
    return null;
  };

  const getActiveTenant = () => {
    const savedTenantId = typeof window !== "undefined" ? localStorage.getItem("smartserve_tenant_id") : null;
    const savedTenantName = typeof window !== "undefined" ? localStorage.getItem("smartserve_tenant_name") : null;
    const savedTenantSsid = typeof window !== "undefined" ? localStorage.getItem("smartserve_tenant_ssid") : null;
    const savedTenantLogo = typeof window !== "undefined" ? localStorage.getItem("smartserve_tenant_logo") : null;

    const activeId = store.activeTenantId || savedTenantId || user?.tenantId;
    const matched = (store.tenants || []).find((t) => t.id === activeId);
    if (matched) {
      return {
        ...matched,
        logo: matched.logo || user?.logo || savedTenantLogo || null
      };
    }

    const tenantName = user?.tenantName || savedTenantName || (user?.name ? `${user.name}'s Restaurant` : "SmartServe Restaurant");
    const tenantSsid = user?.tenantSsid || savedTenantSsid || "SS-9821";
    const tenantLogo = user?.logo || savedTenantLogo || null;

    return { id: activeId || "default-tenant", name: tenantName, ssid: tenantSsid, logo: tenantLogo };
  };

  const getActiveBranch = () => {
    const branches = store.branches || [];
    const matched = branches.find((b) => b.id === store.activeBranchId || b.code === store.activeBranchId);
    if (matched) return matched;
    if (branches.length > 0) return branches[0];
    const tenant = getActiveTenant();
    const fallbackName = tenant?.name ? `${tenant.name} Main Branch` : "Main Branch";
    return { id: "br-main", name: fallbackName, code: "MB-001" };
  };

  const updateActiveTenantId = (tenantId) => {
    const tenantBranches = (store.branches || []).filter((b) => b.tenantId === tenantId);
    const firstBranchId = tenantBranches[0]?.id || "br-1";
    setStore((prev) => ({
      ...prev,
      activeTenantId: tenantId,
      activeBranchId: firstBranchId
    }));
  };

  const updateActiveBranchId = (branchId) => {
    setStore((prev) => ({ ...prev, activeBranchId: branchId }));
  };

  const updateOrderStatus = (orderId, newStatus, paymentMethod, extraFinancials = {}) => {
    let targetOrder = null;
    setStore((prev) => {
      const orders = [...prev.orders];
      const idx = orders.findIndex((o) => o.id === orderId || o.kotNo === orderId);
      if (idx !== -1) {
        orders[idx] = {
          ...orders[idx],
          ...extraFinancials,
          status: newStatus,
          paymentMethod: paymentMethod || orders[idx].paymentMethod || "CASH",
          paymentStatus: newStatus === "CLOSED" ? "PAID" : newStatus === "VOIDED" ? "VOIDED" : orders[idx].paymentStatus
        };
        targetOrder = orders[idx];
      }
      return { ...prev, orders };
    });

    const payload = { status: newStatus };
    if (paymentMethod) payload.paymentMethod = paymentMethod;
    if (newStatus === "CLOSED") payload.paymentStatus = "PAID";
    if (newStatus === "VOIDED") payload.paymentStatus = "VOIDED";
    if (targetOrder?.tableNo) payload.tableNo = targetOrder.tableNo;
    if (targetOrder?.kotNo) payload.kotNo = targetOrder.kotNo;
    if (targetOrder?.orderNumber) payload.orderNumber = targetOrder.orderNumber;
    
    // Ensure total, subtotal, and tax are sent to backend
    const finalTotal = extraFinancials.total ?? extraFinancials.totalAmount ?? targetOrder?.total ?? targetOrder?.totalAmount;
    const finalSub = extraFinancials.subtotal ?? targetOrder?.subtotal;
    const finalTax = extraFinancials.tax ?? extraFinancials.taxGST ?? extraFinancials.taxAmount ?? targetOrder?.tax ?? targetOrder?.taxAmount;

    if (typeof finalTotal !== 'undefined') payload.total = finalTotal;
    if (typeof finalSub !== 'undefined') payload.subtotal = finalSub;
    if (typeof finalTax !== 'undefined') payload.tax = finalTax;

    api.updateOrderStatus(orderId, payload).catch((e) => console.warn("Backend order status update fallback:", e.message));

    toast.success(`Order Status Updated`, {
      description: `Status: ${newStatus}${paymentMethod ? ` • Method: ${paymentMethod}` : ""}`
    });
  };

  const updateOrderItemStatus = (orderId, itemIndex, newItemStatus) => {
    setStore((prev) => {
      const orders = [...(prev.orders || [])];
      const idx = orders.findIndex((o) => o.id === orderId || o.kotNo === orderId);
      if (idx !== -1) {
        const items = [...(orders[idx].items || [])];
        if (items[itemIndex]) {
          const itemObj = typeof items[itemIndex] === 'string' ? JSON.parse(items[itemIndex]) : items[itemIndex];
          items[itemIndex] = {
            ...itemObj,
            status: newItemStatus
          };

          const allServed = items.every(
            (it) => {
              const st = (it.status || '').toUpperCase();
              return st === "SERVED";
            }
          );
          const allReadyOrServed = items.every(
            (it) => {
              const st = (it.status || '').toUpperCase();
              return st === "READY" || st === "SERVED";
            }
          );
          const newOrderStatus = allServed ? "SERVED" : allReadyOrServed ? "READY" : orders[idx].status;

          orders[idx] = {
            ...orders[idx],
            items,
            status: newOrderStatus
          };

          api.updateOrderStatus(orders[idx].id, {
            status: newOrderStatus,
            items
          }).catch((e) => console.warn("Backend item status sync error:", e.message));
        }
      }
      return { ...prev, orders };
    });
  };

  const updateOrderItemsAndStatus = (orderId, updatedItems, newOrderStatus, extraFields = {}) => {
    setStore((prev) => {
      const orders = [...(prev.orders || [])];
      const idx = orders.findIndex((o) => o.id === orderId || o.kotNo === orderId);
      if (idx !== -1) {
        const updatedOrder = {
          ...orders[idx],
          items: updatedItems,
          status: newOrderStatus,
          ...extraFields
        };
        orders[idx] = updatedOrder;
        api.createPosOrder(updatedOrder).catch((e) => console.warn("Backend order items and status sync error:", e.message));
      }
      return { ...prev, orders };
    });
  };

  const addOrder = (newOrder) => {
    const normalizeTbl = (num) => String(num || "").trim().toUpperCase().replace(/^TABLE\s*/, "").replace(/^T-/, "");

    setStore((prev) => {
      const orders = [...(prev.orders || [])];
      const targetTableNo = normalizeTbl(newOrder.tableNo || newOrder.tableNumber);

      const existingIdx = orders.findIndex(
        (o) =>
          o.id === newOrder.id ||
          (targetTableNo &&
            normalizeTbl(o.tableNo || o.tableNumber) === targetTableNo &&
            o.paymentStatus !== "PAID" &&
            o.paymentStatus !== "paid" &&
            o.status !== "CLOSED" &&
            o.status !== "closed" &&
            o.status !== "voided")
      );

      let updatedOrders;
      if (existingIdx !== -1) {
        updatedOrders = [...orders];
        updatedOrders[existingIdx] = {
          ...updatedOrders[existingIdx],
          ...newOrder,
          id: updatedOrders[existingIdx].id // preserve initial active order ID
        };
      } else {
        updatedOrders = [newOrder, ...orders];
      }

      if (typeof window !== "undefined") {
        if ("BroadcastChannel" in window) {
          try {
            const syncChannel = new BroadcastChannel("smartserve_sync_channel");
            syncChannel.postMessage({ type: "ORDER_CREATED", orders: updatedOrders, tables: prev.tables });
            syncChannel.close();
          } catch (e) {}
        }
      }
      return { ...prev, orders: updatedOrders };
    });

    api.createPosOrder(newOrder).then((res) => {
      if (res && res.success && res.data) {
        setStore((prev) => {
          const orders = [...(prev.orders || [])];
          const idx = orders.findIndex(
            (o) =>
              o.id === newOrder.id ||
              o.id === res.data.id ||
              (o.tableNo && res.data.tableNo && normalizeTbl(o.tableNo) === normalizeTbl(res.data.tableNo) && o.status !== "CLOSED" && o.status !== "closed")
          );
          if (idx !== -1) {
            const dbItems = Array.isArray(res.data.items) ? res.data.items : (typeof res.data.items === 'string' ? JSON.parse(res.data.items || '[]') : []);
            orders[idx] = {
              ...orders[idx],
              ...res.data,
              items: (orders[idx].items && orders[idx].items.length >= dbItems.length) ? orders[idx].items : dbItems
            };
          }
          return { ...prev, orders };
        });
      }
    }).catch((e) => console.warn("Backend order creation fallback:", e.message));
  };

  const updateTableStatus = (tableId, newStatus) => {
    setStore((prev) => {
      const tables = [...prev.tables];
      const idx = tables.findIndex((t) => t.id === tableId || t.number === tableId);
      if (idx !== -1) {
        tables[idx] = { ...tables[idx], status: newStatus };
      }
      return { ...prev, tables };
    });

    api.updateTableStatus(tableId, newStatus).then((res) => {
      if (res && res.success && res.data) {
        setStore((prev) => {
          const tables = [...prev.tables];
          const idx = tables.findIndex((t) => t.id === tableId || t.number === tableId);
          if (idx !== -1) {
            tables[idx] = res.data;
          }
          return { ...prev, tables };
        });
      }
    }).catch((e) => console.warn("Backend table status update error:", e.message));
  };

  const addTable = (newTable) => {
    api.createTable(newTable).then((res) => {
      if (res && res.success && res.data) {
        setStore((prev) => ({
          ...prev,
          tables: [res.data, ...prev.tables.filter((t) => t.id !== newTable.id && t.number !== newTable.number)]
        }));
        toast.success(`Table ${res.data.number} Saved in Database`, {
          description: `Zone: ${res.data.zone} • ${res.data.seats} Seats`
        });
      } else {
        toast.error(res?.message || "Failed to create table in database");
      }
    }).catch((e) => {
      console.warn("Backend table creation error:", e.message);
      toast.error(`Database table creation error: ${e.message}`);
    });
  };

  const findPinOwner = (cleanPin) => {
    if (!cleanPin) return null;
    // Try to match the entered PIN against local staff (plain text only for client-side hint)
    const allManagerOwner = (store.staff || []).filter(
      (s) => (s.role || '').toLowerCase() === 'manager' || (s.role || '').toLowerCase() === 'owner'
    );
    const matched = allManagerOwner.find((s) => s.pin && String(s.pin) === String(cleanPin));
    if (matched) {
      return { name: matched.name, role: matched.role, pinType: (matched.role || '').toLowerCase() === 'owner' ? 'Owner PIN' : 'Manager PIN' };
    }
    // Fallback: use current user context
    const currentRole = user?.role || activeRole || 'Unknown';
    return {
      name: user?.name || 'Unknown',
      role: currentRole,
      pinType: currentRole.toLowerCase() === 'owner' ? 'Owner PIN' : 'Manager PIN'
    };
  };

  const [isManagerUnlocked, setIsManagerUnlocked] = useState(() => {
    if (typeof window !== "undefined") {
      const unlocked = sessionStorage.getItem("smartserve_manager_unlocked") === "true";
      const expiry = sessionStorage.getItem("smartserve_manager_unlock_expiry");
      if (unlocked && expiry && Date.now() < parseInt(expiry)) {
        return true;
      }
      return false;
    }
    return false;
  });

  const [unlockedManagerPin, setUnlockedManagerPin] = useState(() => {
    if (typeof window !== "undefined") {
      const expiry = sessionStorage.getItem("smartserve_manager_unlock_expiry");
      if (expiry && Date.now() < parseInt(expiry)) {
        return sessionStorage.getItem("smartserve_unlocked_pin") || null;
      }
    }
    return null;
  });

  // Broadcast sync and Background Auto-Expiry Checker (30 mins behind-the-scenes)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Broadcast Channel Receiver
    let managerChannel = null;
    if ("BroadcastChannel" in window) {
      try {
        managerChannel = new BroadcastChannel("smartserve_manager_sync_channel");
        managerChannel.onmessage = (e) => {
          if (e.data?.type === "UNLOCK") {
            setIsManagerUnlocked(true);
            setUnlockedManagerPin(e.data.pin);
          } else if (e.data?.type === "LOCK") {
            setIsManagerUnlocked(false);
            setUnlockedManagerPin(null);
          }
        };
      } catch (err) {}
    }

    // 2. Timer Loop checking expiry every 5 seconds
    const interval = setInterval(() => {
      const unlocked = sessionStorage.getItem("smartserve_manager_unlocked") === "true";
      const expiry = sessionStorage.getItem("smartserve_manager_unlock_expiry");
      if (unlocked && expiry) {
        if (Date.now() >= parseInt(expiry)) {
          // Auto Lock
          setIsManagerUnlocked(false);
          setUnlockedManagerPin(null);
          sessionStorage.removeItem("smartserve_manager_unlocked");
          sessionStorage.removeItem("smartserve_unlocked_pin");
          sessionStorage.removeItem("smartserve_manager_unlock_expiry");

          // Emit to other tabs
          if (managerChannel) {
            try { managerChannel.postMessage({ type: "LOCK" }); } catch (err) {}
          }

          toast.warning("Manager Session Expired", {
            description: "Manager Session Expired after 30 minutes. Auto-locked for security."
          });

          // Log auto lock to DB — includes who was active and PIN type
          api.createAuditLog({
            action: "MANAGER_SESSION_LOCK",
            entity: "ManagerPIN",
            details: {
              user: user?.name || "System",
              role: activeRole || "System",
              pinType: (activeRole || '').toLowerCase() === 'owner' ? 'Owner PIN' : 'Manager PIN',
              status: "EXPIRED"
            }
          }).catch(() => {});
        }
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (managerChannel) {
        try { managerChannel.close(); } catch (err) {}
      }
    };
  }, [user, activeRole]);

  const unlockManagerSession = async (pinToUnlock) => {
    if (!pinToUnlock || String(pinToUnlock).trim() === "") return false;
    const cleanPin = String(pinToUnlock).trim();
    const isValid = await verifyManagerPin(cleanPin);
    const pinOwner = findPinOwner(cleanPin);

    // Log PIN unlock action — records whether manager or owner PIN was used
    api.createAuditLog({
      action: "MANAGER_SESSION_UNLOCK",
      entity: "ManagerPIN",
      details: {
        user: pinOwner ? pinOwner.name : (user?.name || "Unknown Staff"),
        role: pinOwner ? pinOwner.role : (activeRole || "Unknown"),
        pinType: pinOwner?.pinType || (activeRole?.toLowerCase() === 'owner' ? 'Owner PIN' : 'Manager PIN'),
        pinUsed: "****",
        status: isValid ? "SUCCESS" : "FAILED"
      }
    }).catch(() => {});

    if (isValid) {
      const expiryTime = Date.now() + 30 * 60 * 1000; // 30 minutes
      setIsManagerUnlocked(true);
      setUnlockedManagerPin(cleanPin);

      if (typeof window !== "undefined") {
        sessionStorage.setItem("smartserve_manager_unlocked", "true");
        sessionStorage.setItem("smartserve_unlocked_pin", cleanPin);
        sessionStorage.setItem("smartserve_manager_unlock_expiry", String(expiryTime));

        // Sync to other tabs
        if ("BroadcastChannel" in window) {
          try {
            const chan = new BroadcastChannel("smartserve_manager_sync_channel");
            chan.postMessage({ type: "UNLOCK", pin: cleanPin });
            chan.close();
          } catch (err) {}
        }
      }

      // Register session server-side for multi-session tracking
      api.registerManagerSession({
        staffName: owner ? owner.name : (user?.name || "Unknown"),
        staffRole: owner ? owner.role : (activeRole || "Unknown")
      }).then((res) => {
        if (res?.success && res?.data?.sessionId) {
          sessionStorage.setItem("smartserve_manager_session_id", res.data.sessionId);
        }
      }).catch(() => {});

      toast.success("Manager Session Unlocked!", {
        description: "Manager operations will now execute automatically without PIN prompts."
      });

      return true;
    }
    return false;
  };

  const lockManagerSession = (silent = false) => {
    const sessionId = typeof window !== "undefined" ? sessionStorage.getItem("smartserve_manager_session_id") : null;

    setIsManagerUnlocked(false);
    setUnlockedManagerPin(null);

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("smartserve_manager_unlocked");
      sessionStorage.removeItem("smartserve_unlocked_pin");
      sessionStorage.removeItem("smartserve_manager_unlock_expiry");
      sessionStorage.removeItem("smartserve_manager_session_id");

      // Sync to other tabs
      if ("BroadcastChannel" in window) {
        try {
          const chan = new BroadcastChannel("smartserve_manager_sync_channel");
          chan.postMessage({ type: "LOCK" });
          chan.close();
        } catch (err) {}
      }
    }

    // Revoke from server-side registry
    if (sessionId) {
      api.revokeManagerSession(sessionId).catch(() => {});
    }

    if (!silent) {
      toast.info("Manager Session Locked", {
        description: "PIN confirmation is now required for manager operations."
      });
    }

    // Log manual lock event — includes who locked the session and their role
    api.createAuditLog({
      action: "MANAGER_SESSION_LOCK",
      entity: "ManagerPIN",
      details: {
        user: user?.name || "Unknown",
        role: activeRole || "Unknown",
        pinType: (activeRole || '').toLowerCase() === 'owner' ? 'Owner PIN' : 'Manager PIN',
        status: "LOCKED"
      }
    }).catch(e => console.warn("Log failed:", e.message));
  };

  const verifyManagerPin = async (inputPin) => {
    if (isManagerUnlocked && (!inputPin || String(inputPin).trim() === "")) return true;
    if (!inputPin || String(inputPin).trim() === "") return false;
    const cleanPin = String(inputPin).trim();
    try {
      const res = await api.verifyManagerPin(cleanPin);
      return !!(res && res.success);
    } catch (err) {
      return false;
    }
  };

  const voidOrder = (orderId, reason = "Manager void authorization") => {
    setStore((prev) => {
      const updatedOrders = (prev.orders || []).map((o) =>
        o.id === orderId ? { ...o, status: "VOIDED" } : o
      );
      return { ...prev, orders: updatedOrders };
    });

    api.voidOrder(orderId, { reason }).then((res) => {
      if (res.success) {
        toast.success(`Order ${orderId} Voided`, { description: `Reason: ${reason}` });
      }
    }).catch((e) => console.warn("Backend void order fallback:", e.message));
  };

  return (
    <AuthContext.Provider
      value={{
        store,
        setStore,
        user,
        isAuthLoading,
        activeRole,
        setActiveRole,
        activeScreen,
        setActiveScreen: (screenId) => {
          setActiveScreen(screenId);
          if (typeof window !== "undefined") {
            localStorage.setItem("smartserve_active_screen", screenId);
          }
        },
        isManagerUnlocked,
        setIsManagerUnlocked,
        unlockedManagerPin,
        unlockManagerSession,
        lockManagerSession,
        verifyManagerPin,
        permissionsMatrix,
        updatePermission,
        savePermissionsMatrix,
        taxName,
        taxRate,
        currencySymbol,
        updateRestaurantSettings: (newSettings) => {
          const newCurr = newSettings.currency || newSettings.currencySymbol;
          if (newSettings.taxName) setTaxName(newSettings.taxName);
          if (newSettings.taxRate !== undefined) setTaxRate(parseFloat(newSettings.taxRate) || 0);
          if (newCurr) setCurrencySymbol(newCurr);
          if (newSettings.orderWorkflowMode) setOrderWorkflowMode(newSettings.orderWorkflowMode);
          
          setStore((prev) => {
            const activeId = prev.activeTenantId || user?.tenantId;
            let tenants = prev.tenants || [];
            const matchedIdx = tenants.findIndex((t) => t.id === activeId);
            if (matchedIdx !== -1) {
              tenants = [...tenants];
              tenants[matchedIdx] = {
                ...tenants[matchedIdx],
                currencySymbol: newCurr || tenants[matchedIdx].currencySymbol,
                taxName: newSettings.taxName || tenants[matchedIdx].taxName,
                taxRate: newSettings.taxRate !== undefined ? newSettings.taxRate : tenants[matchedIdx].taxRate,
                logo: newSettings.logo !== undefined ? newSettings.logo : tenants[matchedIdx].logo,
                orderWorkflowMode: newSettings.orderWorkflowMode || tenants[matchedIdx].orderWorkflowMode
              };
            } else {
              tenants = [{
                id: activeId || "default-tenant",
                name: user?.tenantName || "Restaurant",
                currencySymbol: newCurr || "₹",
                taxName: newSettings.taxName || "GST",
                taxRate: newSettings.taxRate !== undefined ? newSettings.taxRate : 5.0,
                logo: newSettings.logo !== undefined ? newSettings.logo : null,
                orderWorkflowMode: newSettings.orderWorkflowMode || "WORKFLOW_1"
              }, ...tenants];
            }
            return { ...prev, tenants };
          });

          if (newSettings.logo !== undefined && typeof window !== "undefined") {
            if (newSettings.logo) {
              localStorage.setItem("smartserve_tenant_logo", newSettings.logo);
            } else {
              localStorage.removeItem("smartserve_tenant_logo");
            }
          }

          if (user) {
            const updatedUser = {
              ...user,
              currencySymbol: newCurr || user.currencySymbol,
              taxName: newSettings.taxName || user.taxName,
              taxRate: newSettings.taxRate !== undefined ? newSettings.taxRate : user.taxRate,
              logo: newSettings.logo !== undefined ? newSettings.logo : user.logo,
              orderWorkflowMode: newSettings.orderWorkflowMode || user.orderWorkflowMode
            };
            setUser(updatedUser);
            if (typeof window !== "undefined") {
              localStorage.setItem("smartserve_user", JSON.stringify(updatedUser));
            }
          }

          return api.updateSettings({
            currency: newSettings.currency || newSettings.currencySymbol,
            currencySymbol: newSettings.currency || newSettings.currencySymbol,
            taxName: newSettings.taxName,
            taxRate: newSettings.taxRate,
            logo: newSettings.logo,
            orderWorkflowMode: newSettings.orderWorkflowMode,
            managerPin: newSettings.managerPin,
          }).then((res) => {
            if (res && res.success) {
              toast.success("Restaurant Settings Updated!", {
                description: `Currency: ${newSettings.currency || currencySymbol} • Tax: ${newSettings.taxName || taxName}`
              });
              return res;
            } else {
              toast.error(res?.message || "Failed to update settings");
              return res;
            }
          }).catch((e) => {
            console.warn("Backend settings update error:", e.message);
            toast.error(e.message || "Network error updating settings");
            return { success: false, message: e.message };
          });
        },
        orderWorkflowMode,
        setOrderWorkflowMode: (mode) => {
          setOrderWorkflowMode(mode);
        },
        registeredTenants,
        registerTenant,
        updateTenantStatus,
        impersonateTenant,
        login,
        logout,
        getActiveTenant,
        getActiveBranch,
        updateActiveTenantId,
        updateActiveBranchId,
        updateOrderStatus,
        updateOrderItemStatus,
        updateOrderItemsAndStatus,
        voidOrder,
        addOrder,
        addTable,
        updateTableStatus,
        hasFeature: (featureKey) => {
          const tenant = getActiveTenant();
          if (!tenant || !tenant.featureFlags) return true;
          return tenant.featureFlags[featureKey] !== false;
        },
        hasPermission: (permKey) => {
          if (activeRole === 'superadmin' || activeRole === 'owner') return true;
          const roleMatrix = permissionsMatrix[activeRole] || {};
          return roleMatrix[permKey] !== false;
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
