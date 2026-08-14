"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  Building2,
  Users,
  DollarSign,
  Activity,
  Plus,
  CheckCircle2,
  XCircle,
  Globe,
  CreditCard,
  BarChart3,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  Ban,
  LogIn,
  Layers,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  User,
  X,
  ClipboardList,
  RefreshCw,
  History,
  ChevronDown,
  Calendar,
  Zap,
  Shield
} from "lucide-react";

import { api } from "@/services/apiClient";
import { toast } from "sonner";

const PLAN_CONFIG_DISPLAY = {
  enterprise:   { label: "Enterprise",   color: "bg-violet-100 text-violet-700 border-violet-200",  price: "₹4,999/mo", branches: 20,  users: 100 },
  professional: { label: "Professional", color: "bg-blue-100 text-blue-700 border-blue-200",        price: "₹2,499/mo", branches: 5,   users: 25  },
  basic:        { label: "Basic",        color: "bg-amber-100 text-amber-700 border-amber-200",     price: "₹999/mo",   branches: 2,   users: 10  },
  starter:      { label: "Starter",      color: "bg-stone-100 text-stone-700 border-stone-200",     price: "Free",      branches: 1,   users: 5   }
};

const STATUS_COLOR = {
  Active:         "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Pending Approval": "bg-amber-100 text-amber-800 border-amber-300",
  Suspended:      "bg-red-100 text-red-700 border-red-200",
  Rejected:       "bg-stone-100 text-stone-600 border-stone-300",
  Expired:        "bg-red-100 text-red-800 border-red-200",
  Trial:          "bg-sky-100 text-sky-700 border-sky-200",
  "Expiring Soon":"bg-orange-100 text-orange-800 border-orange-200"
};

export default function SuperAdminScreen({ initialTab = "tenants" }) {
  const { registeredTenants, updateTenantStatus, impersonateTenant } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab);

  // ─── Credentials & Modals state ─────────────────────────────────────────────
  const [revealedPassIds, setRevealedPassIds]     = useState({});
  const [approvalCredentials, setApprovalCredentials] = useState(null);
  const [resetPassTenant, setResetPassTenant]     = useState(null);
  const [customPassword, setCustomPassword]       = useState("");

  // Feature Flags Modal
  const [flagModalTenant, setFlagModalTenant]     = useState(null);
  const [tenantFlags, setTenantFlags]             = useState({
    pos: true, cashier: true, kds: true, waiter: true,
    inventory: true, reports: true, qrOrdering: true, voidOrders: true
  });

  // ─── Registration form state ─────────────────────────────────────────────────
  const [regForm, setRegForm] = useState({
    restaurantName: "", ownerName: "", email: "", phone: "",
    city: "", address: "", plan: "starter",
    branchName: "", branchCode: "MB-001"
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState(null);

  // ─── Subscriptions state ─────────────────────────────────────────────────────
  const [subscriptions, setSubscriptions] = useState([]);
  const [subLoading, setSubLoading]       = useState(false);
  const [subSearch, setSubSearch]         = useState("");
  const [planModal, setPlanModal]         = useState(null);   // { tenantId, currentPlan, tenantName }
  const [newPlanData, setNewPlanData]     = useState({ plan: "professional", days: 30, reason: "" });
  const [historyModal, setHistoryModal]   = useState(null);
  const [historyData, setHistoryData]     = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ─── Load subscriptions when tab changes ─────────────────────────────────────
  useEffect(() => {
    if (activeTab === "subscriptions") loadSubscriptions();
  }, [activeTab]);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  const loadSubscriptions = async () => {
    setSubLoading(true);
    try {
      const res = await api.getAllSubscriptions();
      if (res.success) setSubscriptions(res.data || []);
    } catch (e) { console.warn("Failed to load subscriptions:", e); }
    setSubLoading(false);
  };

  const openPlanModal = (sub) => {
    setPlanModal({ tenantId: sub.tenantId, currentPlan: sub.plan, tenantName: sub.tenantName });
    setNewPlanData({ plan: sub.plan || "starter", days: 30, reason: "" });
  };

  const handleChangePlan = async () => {
    if (!planModal) return;
    try {
      const res = await api.changeSubscriptionPlan(planModal.tenantId, {
        newPlan: newPlanData.plan,
        durationDays: parseInt(newPlanData.days),
        reason: newPlanData.reason
      });
      if (res.success) {
        toast.success(`Plan changed to ${newPlanData.plan} for ${planModal.tenantName}`);
        setPlanModal(null);
        loadSubscriptions();
      } else {
        toast.error(res.message || "Failed to change plan");
      }
    } catch (e) { toast.error("Error: " + e.message); }
  };

  const openHistory = async (tenantId, tenantName) => {
    setHistoryModal({ tenantId, tenantName });
    setHistoryLoading(true);
    try {
      const res = await api.getSubscriptionHistory(tenantId);
      if (res.success) setHistoryData(res.data || []);
    } catch (e) { console.warn("Failed to load history:", e); }
    setHistoryLoading(false);
  };

  // ─── Feature flags helpers ───────────────────────────────────────────────────
  const openFlagModal = (tenant) => {
    setFlagModalTenant(tenant);
    let current = { pos: true, cashier: true, kds: true, waiter: true, inventory: true, reports: true, qrOrdering: true, voidOrders: true };
    if (tenant.featureFlagsJson) {
      try { current = typeof tenant.featureFlagsJson === "string" ? JSON.parse(tenant.featureFlagsJson) : tenant.featureFlagsJson; } catch {}
    }
    setTenantFlags(current);
  };

  const saveFlags = async () => {
    if (!flagModalTenant) return;
    try {
      const res = await api.updateFeatureFlags(flagModalTenant.id, tenantFlags);
      if (res.success) { toast.success(`Feature flags updated for ${flagModalTenant.name}`); setFlagModalTenant(null); }
      else toast.error("Failed to update feature flags: " + res.message);
    } catch (e) { toast.error("Error saving feature flags: " + e.message); }
  };

  // ─── Registration submit ─────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regForm.restaurantName || !regForm.ownerName || !regForm.email) {
      toast.error("Restaurant name, owner name, and email are required.");
      return;
    }
    setRegLoading(true);
    try {
      const res = await api.registerRestaurant({
        restaurantName: regForm.restaurantName,
        ownerName:      regForm.ownerName,
        email:          regForm.email,
        phone:          regForm.phone,
        city:           regForm.city,
        address:        regForm.address,
        plan:           regForm.plan,
        branchName:     regForm.branchName || `${regForm.restaurantName} Main Branch`,
        branchCode:     regForm.branchCode || "MB-001"
      });
      if (res.success) {
        toast.success(`Restaurant "${regForm.restaurantName}" registered! Pending approval.`);
        setRegResult(res);
        setRegForm({ restaurantName: "", ownerName: "", email: "", phone: "", city: "", address: "", plan: "starter", branchName: "", branchCode: "MB-001" });
      } else {
        toast.error(res.message || "Registration failed.");
      }
    } catch (e) { toast.error("Registration error: " + e.message); }
    setRegLoading(false);
  };

  const pendingCount = registeredTenants.filter(t => t.status === "Pending Approval").length;
  const activeCount  = registeredTenants.filter(t => t.status === "Active").length;

  const TABS = [
    { id: "tenants",       label: "Registered Tenants",   icon: Building2     },
    { id: "register",      label: "Register Tenant",       icon: ClipboardList },
    { id: "subscriptions", label: "Subscriptions & Plans", icon: Layers        },
    { id: "analytics",     label: "Global Analytics",      icon: BarChart3     }
  ];

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">SuperAdmin SaaS Portal</h2>
            <p className="text-xs text-stone-500">Tenant Registration, Subscriptions & Platform Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-xs font-black text-amber-900 animate-pulse">
              <Clock className="w-3.5 h-3.5" />
              {pendingCount} Pending Applications
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-xs font-bold text-violet-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            Super Admin Access Active
          </div>
        </div>
      </div>

      {/* ─── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Restaurants",   value: registeredTenants.length, sub: `${activeCount} active`,         icon: Building2,  color: "from-violet-500 to-indigo-600" },
          { label: "Pending Verification",value: pendingCount,              sub: "Requires approval",             icon: Clock,      color: "from-amber-500 to-orange-500"  },
          { label: "Active Subscriptions",value: activeCount,               sub: "Paying tenants",                icon: CreditCard, color: "from-emerald-500 to-teal-600"  },
          { label: "Platform Uptime",     value: "99.94%",                  sub: "Last 30 days",                  icon: Activity,   color: "from-blue-500 to-cyan-600"     }
        ].map(kpi => {
          const KpiIcon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${kpi.color} flex items-center justify-center text-white shadow-md`}>
                <KpiIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-stone-900">{kpi.value}</p>
                <p className="text-xs font-semibold text-stone-500 mt-0.5">{kpi.label}</p>
                <p className="text-[11px] text-stone-400 font-semibold mt-1">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Tab Nav ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl w-fit border border-stone-200 overflow-x-auto max-w-full">
        {TABS.map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === tab.id ? "bg-[#FF5B32] text-white shadow-sm" : "text-stone-600 hover:bg-stone-200/60"
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === "tenants" && pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-amber-900 text-[9px] font-black flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Content Area ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">

        {/* ═══ Registered Tenants Tab ════════════════════════════════════ */}
        {activeTab === "tenants" && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100">
                  <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Restaurant / Owner</th>
                  <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Tenant SSID</th>
                  <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Owner Credentials</th>
                  <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Plan</th>
                  <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {registeredTenants.map((tenant) => {
                  const planKey     = (tenant.plan || "starter").toLowerCase();
                  const planCfg     = PLAN_CONFIG_DISPLAY[planKey] || PLAN_CONFIG_DISPLAY.starter;
                  const isPending   = tenant.status === "Pending Approval";
                  const isActive    = tenant.status === "Active";
                  const ownerUsername = tenant.ownerUsername || tenant.username || (tenant.owner ? tenant.owner.toLowerCase().replace(/\s+/g, '') : "owner");
                  const ownerPassword = tenant.ownerTempPassword || tenant.tempPassword || "(not set)";
                  const isPassRevealed = revealedPassIds[tenant.id];

                  const handleApprove = async () => {
                    const creds = await updateTenantStatus(tenant.id, "Active");
                    setApprovalCredentials({
                      tenantName: tenant.name,
                      ssid: tenant.ssid,
                      username: creds?.username || ownerUsername,
                      password: creds?.password || ownerPassword,
                      staffId:  creds?.staffId,
                      defaultPin: creds?.defaultPin,
                      branchName: creds?.branchName,
                      branchCode: creds?.branchCode
                    });
                  };

                  return (
                    <tr key={tenant.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-stone-900">{tenant.name}</p>
                        <p className="text-[11px] text-stone-500">{tenant.ownerName || tenant.owner} ({tenant.email})</p>
                        {tenant.city && <p className="text-[10px] text-stone-400">📍 {tenant.city}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-lg bg-[#FFF2CF] text-[#FF5B32] font-mono font-bold text-[11px] border border-[#FF5B32]/30">
                          {tenant.ssid || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="bg-stone-50 p-2 rounded-xl border border-stone-200 space-y-1 text-[11px] min-w-[180px]">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-violet-500 flex-shrink-0" />
                            <span className="font-mono font-bold text-violet-700 truncate">{ownerUsername}</span>
                            <button onClick={() => { navigator.clipboard.writeText(ownerUsername); toast.success("Username copied!"); }} className="ml-auto text-stone-400 hover:text-stone-700">
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <KeyRound className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            {ownerPassword === "(not set)" ? (
                              <button onClick={() => { setResetPassTenant(tenant); setCustomPassword(""); }} className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[10px] border border-amber-300">
                                ⚡ Set Password
                              </button>
                            ) : (
                              <>
                                <span className="font-mono font-bold text-emerald-700 truncate">
                                  {isPassRevealed ? ownerPassword : "••••••••"}
                                </span>
                                <button onClick={() => setRevealedPassIds(prev => ({ ...prev, [tenant.id]: !prev[tenant.id] }))} className="ml-auto text-stone-400 hover:text-stone-700">
                                  {isPassRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                {isPassRevealed && (
                                  <button onClick={() => { navigator.clipboard.writeText(ownerPassword); toast.success("Password copied!"); }} className="text-stone-400 hover:text-stone-700">
                                    <Copy className="w-3 h-3" />
                                  </button>
                                )}
                                <button onClick={() => { setResetPassTenant(tenant); setCustomPassword(""); }} className="text-stone-400 hover:text-violet-600 font-bold text-[10px]" title="Reset Password">✎</button>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${planCfg.color}`}>{planCfg.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 w-fit border ${STATUS_COLOR[tenant.status] || "bg-stone-100 text-stone-600 border-stone-300"}`}>
                          {isPending && <Clock className="w-3 h-3 animate-spin" />}
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isActive && (
                            <button onClick={() => impersonateTenant(tenant)} className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] transition-colors flex items-center gap-1">
                              <LogIn className="w-3 h-3" /> Login As
                            </button>
                          )}
                          <button onClick={() => openFlagModal(tenant)} className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors flex items-center gap-1">
                            <Layers className="w-3 h-3" /> Features
                          </button>
                          {isPending && (
                            <button onClick={handleApprove} className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-sm">
                              ✓ Approve
                            </button>
                          )}
                          {isActive ? (
                            <button onClick={() => updateTenantStatus(tenant.id, "Suspended")} className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] transition-colors">
                              Suspend
                            </button>
                          ) : !isPending && (
                            <button onClick={() => updateTenantStatus(tenant.id, "Active")} className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-black text-white font-bold text-[11px] transition-colors">
                              Activate
                            </button>
                          )}
                          <button onClick={() => updateTenantStatus(tenant.id, "Rejected")} className="px-2.5 py-1 rounded-lg border border-red-300 hover:bg-red-50 text-red-600 font-bold text-[11px] transition-colors">
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {registeredTenants.length === 0 && (
              <div className="text-center py-12 text-stone-400 text-xs font-semibold">No tenants registered yet.</div>
            )}
          </div>
        )}

        {/* ═══ Register New Tenant Tab ════════════════════════════════════ */}
        {activeTab === "register" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Registration Form */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-500 flex items-center justify-center text-white shadow-md">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-stone-900">Register New Restaurant</h3>
                  <p className="text-[11px] text-stone-500">Creates a pending application for Super Admin approval</p>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Restaurant Info */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Restaurant Information</p>
                  <input
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold"
                    placeholder="Restaurant Name *"
                    value={regForm.restaurantName}
                    onChange={e => setRegForm(p => ({ ...p, restaurantName: e.target.value }))}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold" placeholder="City" value={regForm.city} onChange={e => setRegForm(p => ({ ...p, city: e.target.value }))} />
                    <input className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold" placeholder="Address" value={regForm.address} onChange={e => setRegForm(p => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>

                {/* Owner Info */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Owner Details</p>
                  <input className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold" placeholder="Owner Full Name *" value={regForm.ownerName} onChange={e => setRegForm(p => ({ ...p, ownerName: e.target.value }))} required />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold" placeholder="Email *" type="email" value={regForm.email} onChange={e => setRegForm(p => ({ ...p, email: e.target.value }))} required />
                    <input className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold" placeholder="Phone" value={regForm.phone} onChange={e => setRegForm(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>

                {/* Branch Info */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">First Branch / Outlet</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold" placeholder="Branch Name (e.g. Main Branch)" value={regForm.branchName} onChange={e => setRegForm(p => ({ ...p, branchName: e.target.value }))} />
                    <input className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold" placeholder="Branch Code (e.g. MB-001)" value={regForm.branchCode} onChange={e => setRegForm(p => ({ ...p, branchCode: e.target.value }))} />
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Subscription Plan</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(PLAN_CONFIG_DISPLAY).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRegForm(p => ({ ...p, plan: key }))}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          regForm.plan === key ? "border-[#FF5B32] bg-[#FFF2CF]/60" : "border-stone-200 hover:border-stone-300"
                        }`}
                      >
                        <p className="font-black text-xs text-stone-900">{cfg.label}</p>
                        <p className="text-[10px] font-bold text-[#FF5B32]">{cfg.price}</p>
                        <p className="text-[10px] text-stone-500">Up to {cfg.branches} branch · {cfg.users} users</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-3 rounded-xl bg-[#FF5B32] hover:bg-[#e04822] text-white font-black text-xs shadow-md shadow-[#FF5B32]/30 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {regLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {regLoading ? "Registering..." : "Register Restaurant"}
                </button>
              </form>
            </div>

            {/* Registration Result / Info Panel */}
            <div className="space-y-4">
              {regResult && (
                <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-black text-sm text-emerald-900">Registration Submitted!</h4>
                  </div>
                  <p className="text-xs text-emerald-700 font-semibold">
                    The restaurant has been registered and is now <strong>Pending Approval</strong>. 
                    Go to the <strong>Registered Tenants</strong> tab to approve it and generate credentials.
                  </p>
                  {regResult.data?.ssid && (
                    <div className="bg-white p-3 rounded-xl border border-emerald-200 text-xs font-mono">
                      <span className="text-stone-500 font-semibold">SSID: </span>
                      <span className="font-bold text-[#FF5B32]">{regResult.data.ssid}</span>
                    </div>
                  )}
                  <button onClick={() => setRegResult(null)} className="text-[11px] text-emerald-700 font-bold hover:underline">Dismiss</button>
                </div>
              )}

              {/* Workflow Guide */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
                <h4 className="font-black text-sm text-stone-900">Onboarding Workflow</h4>
                {[
                  { step: 1, title: "Register Restaurant", desc: "Fill in restaurant details, owner info, and select a plan.", icon: ClipboardList, color: "bg-violet-100 text-violet-600" },
                  { step: 2, title: "Approve Tenant", desc: "Go to Registered Tenants tab, click ✓ Approve. System auto-creates Owner account, Staff profile, Branch and Subscription.", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
                  { step: 3, title: "Share Credentials", desc: "Credentials modal shows username, temp password, Staff ID and default PIN (1234). Share securely with owner.", icon: KeyRound, color: "bg-amber-100 text-amber-600" },
                  { step: 4, title: "Owner Configures PIN", desc: "Owner logs in and changes their PIN from the settings panel. Managers must set a custom PIN too.", icon: Shield, color: "bg-blue-100 text-blue-600" }
                ].map(w => {
                  const WIcon = w.icon;
                  return (
                    <div key={w.step} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${w.color} flex items-center justify-center flex-shrink-0`}>
                        <WIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-black text-xs text-stone-900">Step {w.step}: {w.title}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">{w.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ Subscriptions & Plans Tab ══════════════════════════════════ */}
        {activeTab === "subscriptions" && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center gap-3">
              <input
                className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold"
                placeholder="Search by restaurant or owner name..."
                value={subSearch}
                onChange={e => setSubSearch(e.target.value)}
              />
              <button onClick={loadSubscriptions} className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-xs font-bold flex items-center gap-1.5 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${subLoading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            {/* Subscription Table */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <h3 className="font-black text-sm text-stone-900">Active Subscriptions</h3>
                <span className="text-[11px] text-stone-500 font-semibold">{subscriptions.length} total subscriptions</span>
              </div>
              {subLoading ? (
                <div className="text-center py-12 text-stone-400 text-xs font-semibold flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading subscriptions...
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-100">
                      <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Restaurant</th>
                      <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Plan</th>
                      <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Expiry</th>
                      <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Days Left</th>
                      <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {subscriptions
                      .filter(s => {
                        if (!subSearch) return true;
                        const q = subSearch.toLowerCase();
                        return (s.tenantName || "").toLowerCase().includes(q) || (s.ownerName || "").toLowerCase().includes(q);
                      })
                      .map(sub => {
                        const planCfg = PLAN_CONFIG_DISPLAY[sub.plan] || PLAN_CONFIG_DISPLAY.starter;
                        const status  = sub.computedStatus || sub.status;
                        const days    = sub.daysRemaining;
                        const isExpiring = days !== null && days <= 7 && days > 0;
                        const isExpired  = days !== null && days <= 0;

                        return (
                          <tr key={sub.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <p className="font-bold text-stone-900">{sub.tenantName || "—"}</p>
                              <p className="text-[11px] text-stone-500">{sub.ownerName || "—"}</p>
                              <span className="text-[10px] font-mono text-stone-400">{sub.tenantSsid}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${planCfg.color}`}>
                                {planCfg.label}
                              </span>
                              <p className="text-[10px] text-stone-400 mt-1">{planCfg.price}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border w-fit flex items-center gap-1 ${STATUS_COLOR[status] || "bg-stone-100 text-stone-600 border-stone-300"}`}>
                                {isExpiring && <Zap className="w-2.5 h-2.5" />}
                                {status || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {sub.endDate ? (
                                <div>
                                  <p className="font-bold text-stone-900">{new Date(sub.endDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" })}</p>
                                </div>
                              ) : <span className="text-stone-400">Trial / No Expiry</span>}
                            </td>
                            <td className="px-4 py-3">
                              {days !== null ? (
                                <span className={`font-black text-sm ${isExpired ? "text-red-600" : isExpiring ? "text-orange-600" : "text-emerald-600"}`}>
                                  {isExpired ? "EXPIRED" : `${days}d`}
                                </span>
                              ) : <span className="text-stone-400 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => openPlanModal(sub)}
                                  className="px-2.5 py-1 rounded-lg bg-[#FF5B32] hover:bg-[#e04822] text-white font-bold text-[11px] transition-colors flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" /> Change Plan
                                </button>
                                <button
                                  onClick={() => openHistory(sub.tenantId, sub.tenantName)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold text-[11px] transition-colors flex items-center gap-1"
                                >
                                  <History className="w-3 h-3" /> History
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {subscriptions.length === 0 && !subLoading && (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-xs font-semibold">No subscriptions found. Approve tenants to generate subscriptions.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Plan Cards Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(PLAN_CONFIG_DISPLAY).map(([key, cfg]) => (
                <div key={key} className={`p-4 rounded-2xl border-2 space-y-2 ${key === "enterprise" ? "border-violet-300 bg-violet-50/40" : key === "professional" ? "border-blue-300 bg-blue-50/40" : key === "basic" ? "border-amber-300 bg-amber-50/40" : "border-stone-300 bg-stone-50"}`}>
                  <p className="font-black text-stone-900 text-sm">{cfg.label}</p>
                  <p className="font-extrabold text-[#FF5B32] text-lg">{cfg.price}</p>
                  <div className="text-[11px] text-stone-600 space-y-1">
                    <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Up to {cfg.branches} {cfg.branches === 1 ? "branch" : "branches"}</p>
                    <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Up to {cfg.users} users</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ Analytics Tab ══════════════════════════════════════════════ */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-black text-base text-stone-900">Global SaaS Revenue & Licensing Analytics</h3>
                  <p className="text-xs text-stone-500">Monthly recurring revenue (MRR) & tenant subscription statistics</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">Live Platform Data</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <p className="text-xs text-stone-500 font-bold">Active Subscriptions</p>
                  <p className="text-3xl font-black text-stone-900">{activeCount}</p>
                  <p className="text-xs text-emerald-600 font-bold">of {registeredTenants.length} total tenants</p>
                </div>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <p className="text-xs text-stone-500 font-bold">Pending Applications</p>
                  <p className="text-3xl font-black text-stone-900">{pendingCount}</p>
                  <p className="text-xs text-amber-600 font-bold">Awaiting approval</p>
                </div>
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <p className="text-xs text-stone-500 font-bold">Platform Renewal Rate</p>
                  <p className="text-3xl font-black text-stone-900">98.4%</p>
                  <p className="text-xs text-emerald-600 font-bold">Low churn rate</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ═══ Feature Flags Modal ═══════════════════════════════════════════════ */}
      {flagModalTenant && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-black text-base text-stone-900">Module Access & Feature Flags</h3>
                <p className="text-xs text-stone-500">Configure enabled modules for {flagModalTenant.name} (SSID: {flagModalTenant.ssid})</p>
              </div>
              <button onClick={() => setFlagModalTenant(null)} className="text-stone-400 font-bold hover:text-stone-700">✕</button>
            </div>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {[
                { key: "pos",        label: "POS Billing Module",             desc: "Allow cashier billing and floorplan table access" },
                { key: "cashier",    label: "Cashier Verification Screen",    desc: "Enable pending order review & cashier approvals" },
                { key: "kds",        label: "Kitchen Display System (KDS)",   desc: "Kitchen line display & preparation bump screen" },
                { key: "waiter",     label: "Waiter POS App",                 desc: "Table-side ordering and waiter order status" },
                { key: "inventory",  label: "Inventory & Stock Management",   desc: "Ingredient tracking and low-stock alerts" },
                { key: "reports",    label: "Reports & Analytics",            desc: "Sales, Z-report, and revenue analytics" },
                { key: "qrOrdering", label: "Customer QR Self-Ordering",      desc: "Mobile QR standee menu ordering page" },
                { key: "voidOrders", label: "Order Void Authorization",       desc: "Manager PIN void & audit logging" }
              ].map(flag => (
                <div key={flag.key} className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
                  <div>
                    <p className="text-xs font-black text-stone-800">{flag.label}</p>
                    <p className="text-[10px] text-stone-500">{flag.desc}</p>
                  </div>
                  <input type="checkbox" checked={tenantFlags[flag.key] !== false} onChange={e => setTenantFlags(prev => ({ ...prev, [flag.key]: e.target.checked }))} className="w-4 h-4 accent-[#FF5B32] cursor-pointer" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button onClick={() => setFlagModalTenant(null)} className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100">Cancel</button>
              <button onClick={saveFlags} className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] text-white font-black text-xs hover:bg-[#e04d26] shadow-md shadow-[#FF5B32]/30">Save Module Access</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Change Plan Modal ════════════════════════════════════════════════ */}
      {planModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 relative">
            <button onClick={() => setPlanModal(null)} className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-500 flex items-center justify-center text-white shadow-md">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-stone-900">Change Subscription Plan</h3>
                <p className="text-xs text-stone-500">{planModal.tenantName}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">New Plan</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PLAN_CONFIG_DISPLAY).map(([key, cfg]) => (
                    <button key={key} type="button" onClick={() => setNewPlanData(p => ({ ...p, plan: key }))}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${newPlanData.plan === key ? "border-[#FF5B32] bg-[#FFF2CF]/60" : "border-stone-200 hover:border-stone-300"}`}
                    >
                      <p className="font-black text-xs text-stone-900">{cfg.label}</p>
                      <p className="text-[10px] font-bold text-[#FF5B32]">{cfg.price}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Duration (days)</label>
                  <input type="number" min={1} max={365} value={newPlanData.days} onChange={e => setNewPlanData(p => ({ ...p, days: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">Reason (optional)</label>
                  <input type="text" placeholder="Upgrade, renewal..." value={newPlanData.reason} onChange={e => setNewPlanData(p => ({ ...p, reason: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-xs font-semibold" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button onClick={() => setPlanModal(null)} className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100">Cancel</button>
              <button onClick={handleChangePlan} className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] text-white font-black text-xs hover:bg-[#e04822] shadow-md shadow-[#FF5B32]/30">Confirm Plan Change</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Subscription History Modal ══════════════════════════════════════ */}
      {historyModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-stone-200 space-y-4 relative max-h-[90vh] flex flex-col">
            <button onClick={() => setHistoryModal(null)} className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-stone-900">Subscription History</h3>
                <p className="text-xs text-stone-500">{historyModal.tenantName}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8 text-stone-400 text-xs gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading history...
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-xs font-semibold">No plan changes recorded yet.</div>
              ) : historyData.map((h, i) => (
                <div key={i} className="p-3 rounded-xl border border-stone-200 bg-stone-50 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${PLAN_CONFIG_DISPLAY[h.previousPlan]?.color || "bg-stone-100 text-stone-600 border-stone-200"}`}>{h.previousPlan || "—"}</span>
                      <ArrowUpRight className="w-3 h-3 text-stone-400" />
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${PLAN_CONFIG_DISPLAY[h.newPlan]?.color || "bg-stone-100 text-stone-600 border-stone-200"}`}>{h.newPlan}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-semibold">{new Date(h.changedAt).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"2-digit" })}</span>
                  </div>
                  <p className="text-[11px] text-stone-500">Changed by: <span className="font-bold text-stone-700">{h.changedBy}</span></p>
                  {h.reason && <p className="text-[11px] text-stone-500 italic">"{h.reason}"</p>}
                  {h.newExpiryDate && <p className="text-[10px] text-stone-400">New expiry: {new Date(h.newExpiryDate).toLocaleDateString("en-IN")}</p>}
                </div>
              ))}
            </div>
            <button onClick={() => setHistoryModal(null)} className="w-full py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100">Close</button>
          </div>
        </div>
      )}

      {/* ═══ Approval Credentials Popup Modal ════════════════════════════════ */}
      {approvalCredentials && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-emerald-500 space-y-5 relative">
            <button onClick={() => setApprovalCredentials(null)} className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shadow-sm">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900">Tenant Approved & Activated!</h3>
                <p className="text-xs text-stone-500">{approvalCredentials.tenantName} (SSID: {approvalCredentials.tenantSsid || approvalCredentials.ssid})</p>
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-emerald-900">Share these credentials securely with the restaurant owner:</p>
              <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-2 text-xs">
                {[
                  { label: "Tenant SSID", value: approvalCredentials.tenantSsid, color: "text-stone-700" },
                  { label: "Owner SSID",  value: approvalCredentials.ownerSsid,  color: "text-rose-700" },
                  { label: "Username",    value: approvalCredentials.username,   color: "text-violet-700" },
                  { label: "Password",    value: approvalCredentials.password,   color: "text-emerald-700" },
                  { label: "Staff ID",    value: approvalCredentials.staffId,    color: "text-blue-700" },
                  { label: "Branch",      value: approvalCredentials.branchName ? `${approvalCredentials.branchName} (${approvalCredentials.branchCode})` : null, color: "text-stone-700" }
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="flex items-center justify-between border-b border-stone-50 pb-1 last:border-0 last:pb-0">
                    <span className="text-stone-500 font-semibold">{row.label}:</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${row.color}`}>{row.value}</span>
                      <button onClick={() => { navigator.clipboard.writeText(row.value); toast.success(`${row.label} copied!`); }} className="p-1 text-stone-400 hover:text-stone-700">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-amber-700 font-semibold">⚠️ Owner must set a POS PIN after first login. POS access then uses Owner SSID + PIN.</p>
            </div>

            <button
              onClick={() => {
                const lines = [
                  "SmartServe POS Access Credentials",
                  `Restaurant: ${approvalCredentials.tenantName}`,
                  approvalCredentials.tenantSsid ? `Tenant SSID: ${approvalCredentials.tenantSsid}` : null,
                  approvalCredentials.ownerSsid ? `Owner SSID: ${approvalCredentials.ownerSsid}` : null,
                  `Username: ${approvalCredentials.username}`,
                  `Password: ${approvalCredentials.password}`,
                  approvalCredentials.staffId ? `Staff ID: ${approvalCredentials.staffId}` : null,
                  "Owner must set POS PIN after first login.",
                  approvalCredentials.branchName ? `Branch: ${approvalCredentials.branchName} (${approvalCredentials.branchCode})` : null,
                  "Login URL: " + (process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000")
                ].filter(Boolean).join("\n");
                navigator.clipboard.writeText(lines);
                toast.success("Full credentials copied to clipboard!");
                setApprovalCredentials(null);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Full Credentials & Close</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══ Reset Password Modal ═════════════════════════════════════════════ */}
      {resetPassTenant && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 relative">
            <button onClick={() => setResetPassTenant(null)} className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-sm">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900">Set / Reset Owner Password</h3>
                <p className="text-xs text-stone-500">{resetPassTenant.name}</p>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Owner Username</label>
                <input type="text" disabled value={resetPassTenant.ownerUsername || resetPassTenant.username || "owner"} className="w-full px-3.5 py-2 rounded-xl bg-stone-100 border border-stone-200 text-xs font-mono font-bold text-violet-700" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-stone-700">New Password</label>
                  <button type="button" onClick={() => { const f = (resetPassTenant.ownerName || resetPassTenant.owner || "Owner").split(" ")[0]; setCustomPassword(`${f}@${Math.random().toString(36).slice(2,6).toUpperCase()}#1`); }} className="text-[11px] font-bold text-[#FF5B32] hover:underline">
                    🎲 Auto Generate
                  </button>
                </div>
                <input type="text" value={customPassword} onChange={e => setCustomPassword(e.target.value)} placeholder="Enter new password (e.g. Owner@123#)" className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] text-xs font-mono font-bold text-emerald-800" />
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button type="button" onClick={() => setResetPassTenant(null)} className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100 transition-colors">Cancel</button>
              <button type="button" onClick={async () => {
                if (!customPassword.trim()) { toast.error("Please enter a valid password."); return; }
                try {
                  let tenantIdentifier = resetPassTenant.id;

                  // Some locally-added rows can briefly use temporary IDs before backend refresh.
                  // Resolve to a real tenant id (or ssid fallback) before calling reset API.
                  if (!tenantIdentifier || String(tenantIdentifier).startsWith("tenant-")) {
                    const fresh = await api.getTenants();
                    if (fresh?.success && Array.isArray(fresh.data)) {
                      const matched = fresh.data.find((t) =>
                        (resetPassTenant.ssid && t.ssid === resetPassTenant.ssid) ||
                        (resetPassTenant.name && t.name === resetPassTenant.name && t.email === resetPassTenant.email)
                      );
                      if (matched?.id) tenantIdentifier = matched.id;
                      else if (matched?.ssid) tenantIdentifier = matched.ssid;
                    }
                  }

                  if (!tenantIdentifier) {
                    toast.error("Tenant record not synced yet. Refresh tenants and try again.");
                    return;
                  }

                  const res = await api.resetTenantPassword(tenantIdentifier, customPassword.trim());
                  if (res.success) {
                    toast.success(`Password updated for ${resetPassTenant.name}!`);
                    setResetPassTenant(null);
                  } else { toast.error(res.message || "Failed."); }
                } catch (e) { toast.error("Failed: " + e.message); }
              }} className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04822] text-white font-bold text-xs shadow-md shadow-[#FF5B32]/30 transition-colors cursor-pointer">
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
