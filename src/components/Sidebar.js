"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  CreditCard,
  Flame,
  QrCode,
  Boxes,
  Users,
  UserCheck,
  BarChart3,
  Smartphone,
  ShieldCheck,
  Utensils,
  UtensilsCrossed,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  Lock,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  DollarSign,
  CreditCard as SubscriptionIcon,
  BarChart2,
  Layers,
  CalendarCheck,
  ClipboardList,
  Activity
} from "lucide-react";

export default function Sidebar() {
  const { user, activeRole, activeScreen, setActiveScreen, getActiveTenant, getActiveBranch } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tenant = getActiveTenant();
  const activeBranch = getActiveBranch();

  const role = activeRole || user?.key || "owner";

  const { permissionsMatrix } = useAuth();

  const allNavItems = [
    // SuperAdmin SaaS Modules — Tenant & Subscription Management
    { id: "saas_tenants",       label: "Registered Tenants",         icon: Building2,        category: "SaaS Management", forRole: "superadmin" },
    { id: "saas_register",      label: "Register New Tenant",        icon: ClipboardList,    category: "SaaS Management", forRole: "superadmin" },
    { id: "saas_subscriptions", label: "Subscriptions & Plans",      icon: Layers,           category: "SaaS Management", forRole: "superadmin" },
    { id: "saas_analytics",     label: "Global Revenue & Analytics", icon: BarChart2,        category: "SaaS Management", forRole: "superadmin" },

    // Restaurant / Owner / Staff Operations Modules
    { id: "pos", label: "Cashier POS Terminal", icon: CreditCard, category: "Operations" },
    { id: "kds", label: "Kitchen Display (KDS)", icon: Flame, category: "Operations" },
    { id: "tables_qr", label: "Tables & QR Standees", icon: QrCode, category: "Operations" },
    { id: "waiter", label: "Waiter Service Hub", icon: Utensils, category: "Operations" },
    { id: "table_ordering", label: "Table Order Taking", icon: UtensilsCrossed, category: "Operations" },
    { id: "order_history", label: "Orders History", icon: Activity, category: "Operations" },
    { id: "menu_builder", label: "Menu Builder (Catalog)", icon: Utensils, category: "Catalog" },
    // { id: "inventory", label: "Inventory & Raw Stock", icon: Boxes, category: "Management" },
    { id: "staff", label: "Staff & Shift Roster", icon: Users, category: "Management" },
    { id: "audit_logs", label: "Audit Logs & Sessions", icon: ShieldCheck, category: "Management" },
    { id: "owner", label: "Owner Operations Hub", icon: UserCheck, category: "Management" },
    { id: "reports", label: "Reports & Financials", icon: BarChart3, category: "Management" },
    { id: "permissions", label: "Permission Matrix", icon: Lock, category: "Management" },
    { id: "settings", label: "Restaurant Settings", icon: Settings, category: "Management" },
    // Staff self-service — only shown to staff roles
    { id: "my_attendance", label: "My Attendance", icon: CalendarCheck, category: "My Work" }
  ];

  // Full map of screen IDs -> permission matrix keys
  // 'settings' permission strictly maps to Restaurant Settings screen.
  // Owner Operations Hub and Permission Matrix are reserved for Owner/Tenant role.
  const SCREEN_PERM_MAP = {
    pos:          "pos",
    kds:          "kds",
    tables_qr:    "orders",
    waiter:       "waiter",
    table_ordering: "table_ordering",
    order_history:"order_history",
    menu_builder: "menu_builder",
    inventory:    "inventory",
    staff:        "staff",
    audit_logs:   "staff",
    owner:        "owner",
    permissions:  "permissions",
    settings:     "settings",
    reports:      "reports",
    my_attendance: "my_attendance"
  };

  // Base screens always visible to superadmin regardless of matrix
  const SUPERADMIN_SCREENS = ["saas_tenants", "saas_register", "saas_subscriptions", "saas_analytics", "superadmin"];

  // Owner and tenant always get full access
  const OWNER_SCREENS = ["pos", "kds", "tables_qr", "waiter", "table_ordering", "order_history", "menu_builder", "inventory", "staff", "audit_logs", "owner", "reports", "permissions", "settings"];

  let allowedIds;

  if (role === "superadmin") {
    allowedIds = SUPERADMIN_SCREENS;
  } else if (role === "owner" || role === "tenant") {
    allowedIds = OWNER_SCREENS;
  } else {
    // For all staff roles (cashier, waiter, kitchen/kds, manager):
    // Start from the full restaurant screens pool and filter by permission matrix
    const allRestaurantScreens = ["pos", "kds", "tables_qr", "waiter", "table_ordering", "order_history", "menu_builder", "inventory", "staff", "audit_logs", "owner", "reports", "permissions", "settings"];
    // my_attendance is always available to all authenticated non-owner staff
    const staffSelfService = ["my_attendance"];
    const roleMatrix = (permissionsMatrix && permissionsMatrix[role]) || {};

    allowedIds = [
      ...allRestaurantScreens.filter((screenId) => {
        const pKey = SCREEN_PERM_MAP[screenId];
        if (!pKey) return false;
        // If the matrix has an explicit value, respect it; if missing, default deny for staff
        const matrixValue = roleMatrix[pKey];
        return matrixValue === true;
      }),
      ...staffSelfService
    ];
  }

  const filteredNavItems = allNavItems.filter((item) => allowedIds.includes(item.id));

  useEffect(() => {
    if (filteredNavItems.length > 0 && !allowedIds.includes(activeScreen)) {
      setActiveScreen(filteredNavItems[0].id);
    }
  }, [role, JSON.stringify(permissionsMatrix)]);

  return (
    <aside
      className={`${
        isCollapsed ? "w-20" : "w-64"
      } bg-white border-r border-stone-200 flex flex-col justify-between transition-all duration-300 z-20 select-none shadow-sm h-full relative`}
    >
      <div>
        {/* Restaurant Name & Logo Header & Collapse Toggle */}
        <div className={`border-b border-stone-200 flex items-center justify-between transition-all ${
          isCollapsed ? "p-3 flex-col justify-center gap-2" : "p-4"
        }`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            {role === "superadmin" ? (
              <img
                src="/SS-logo.jpeg"
                alt="SuperAdmin"
                className="w-8 h-8 rounded-xl object-cover border border-stone-200 shadow-sm shrink-0"
              />
            ) : tenant?.logo ? (
              <img
                src={tenant.logo}
                alt={tenant?.name || "Restaurant"}
                className="w-8 h-8 rounded-xl object-cover border border-stone-200 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-500 flex items-center justify-center shadow-sm text-white font-black text-sm shrink-0 select-none">
                {(tenant?.name || user?.tenantName || "R").charAt(0).toUpperCase()}
              </div>
            )}
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-black text-sm tracking-tight leading-none text-stone-900 truncate">
                  {role === "superadmin" ? "D&K SmartServe" : (tenant?.name || user?.tenantName || "My Restaurant")}
                </h1>
                <p className="text-[10px] font-extrabold text-[#FF5B32] mt-1 uppercase tracking-wider truncate">
                  {role === "superadmin" ? "SuperAdmin SaaS" : "Restaurant Outlet"}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
            title={isCollapsed ? "Expand Sidebar" : "Compress Sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#FF5B32]" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Active Role Indicator Badge */}
        {!isCollapsed ? (
          <div className="p-3 mx-3 my-3 rounded-2xl border bg-[#FFF2CF]/50 border-[#FF5B32]/20 space-y-1 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#FF5B32] tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> ROLE: {role.toUpperCase()}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            {tenant && activeBranch && (
              <div>
                <p className="text-xs font-black truncate text-stone-900">{tenant.name}</p>
                <p className="text-[11px] font-bold text-stone-500 truncate">
                  📍 {activeBranch.name} ({activeBranch.code})
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center my-3" title={`Role: ${role.toUpperCase()}`}>
            <div className="w-9 h-9 rounded-xl bg-[#FFF2CF] border border-[#FF5B32]/30 flex items-center justify-center text-[#FF5B32] font-black text-xs">
              {role.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Dynamic Navigation Items List per Role */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {filteredNavItems.map((item, idx) => {
            const isActive = activeScreen === item.id;
            const showCategoryHeader =
              !isCollapsed && (idx === 0 || filteredNavItems[idx - 1].category !== item.category);

            const IconComponent = item.icon;

            return (
              <React.Fragment key={item.id}>
                {showCategoryHeader && (
                  <p className="px-3 pt-3 pb-1 text-[9px] font-black uppercase tracking-widest text-stone-400">
                    {item.category}
                  </p>
                )}
                <button
                  onClick={() => setActiveScreen(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center p-2.5" : "justify-between px-3.5 py-2.5"
                  } rounded-xl text-xs font-extrabold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "bg-[#FF5B32] text-white shadow-md shadow-[#FF5B32]/30 scale-[1.01]"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent
                      className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-[#FF5B32]"}`}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && isActive && <ChevronRight className="w-3 h-3 opacity-80 shrink-0" />}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status Badge */}
      {/* <div className="p-3 border-t border-stone-200 bg-stone-50">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl border border-stone-200 flex items-center justify-between text-xs bg-white">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="truncate">
                <p className="font-bold text-[11px] text-stone-800 truncate">RBAC Filtered</p>
                <p className="text-[9px] text-stone-500 truncate">{filteredNavItems.length} Modules Allowed</p>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase shrink-0">
              ACTIVE
            </span>
          </div>
        ) : (
          <div className="flex justify-center" title="RBAC Active">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        )}
      </div> */}
    </aside>
  );
}
