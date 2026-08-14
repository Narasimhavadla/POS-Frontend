"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/apiClient";
import { toast } from "sonner";
import {
  UserCheck,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  Star,
  Clock,
  ChefHat,
  Receipt,
  Eye,
  EyeOff,
  KeyRound,
  Shield
} from "lucide-react";

export default function OwnerScreen() {
  const { store, setStore, getActiveTenant, getActiveBranch } = useAuth();
  const tenant = getActiveTenant();
  const branch = getActiveBranch();

  const currencySymbol = tenant?.currencySymbol || "₹";

  // ─── Change PIN state ────────────────────────────────────────────────────
  const [pinForm, setPinForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [pinLoading, setPinLoading] = useState(false);
  const [showPins, setShowPins] = useState({ current: false, new: false, confirm: false });

  const handleChangePinSubmit = async (e) => {
    e.preventDefault();
    if (!pinForm.newPin || !pinForm.confirmPin) {
      toast.error("Please fill in new PIN and confirm PIN fields."); return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      toast.error("New PIN and Confirm PIN do not match."); return;
    }
    if (pinForm.newPin.length < 4) {
      toast.error("PIN must be at least 4 digits."); return;
    }
    setPinLoading(true);
    try {
      const res = await api.changeOwnerPin(pinForm);
      if (res.success) {
        toast.success("PIN changed successfully! ✓");
        setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
      } else {
        toast.error(res.message || "Failed to change PIN.");
      }
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setPinLoading(false);
  };

  useEffect(() => {
    Promise.allSettled([
      api.getPosOrders(),
      api.getTables()
    ]).then(([ordersRes, tablesRes]) => {
      setStore((prev) => {
        const updated = { ...prev };
        if (ordersRes.status === "fulfilled" && ordersRes.value?.success && Array.isArray(ordersRes.value.data)) {
          const fetchedOrders = ordersRes.value.data.map((o) => {
            let parsed = o.items;
            if (typeof o.items === "string") {
              try { parsed = JSON.parse(o.items || "[]"); } catch { parsed = []; }
            }
            return { ...o, items: Array.isArray(parsed) ? parsed : [] };
          });
          updated.orders = fetchedOrders;
        }
        if (tablesRes.status === "fulfilled" && tablesRes.value?.success && Array.isArray(tablesRes.value.data)) {
          updated.tables = tablesRes.value.data;
        }
        return updated;
      });
    }).catch((err) => console.warn("Live analytics fetch fallback:", err.message));
  }, []);

  const allOrders = (store.orders || []).filter(
    (o) => !o.tenantId || !tenant?.id || o.tenantId === tenant?.id
  );

  const tables = (store.tables || []).filter(
    (t) => !t.tenantId || t.tenantId === tenant?.id
  );

  // Helper: Get local date string YYYY-MM-DD
  const getLocalDateStr = (dateObj = new Date()) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(new Date());

  // Filter orders strictly created TODAY
  const todayOrders = allOrders.filter((o) => {
    if (!o.createdAt) return true; // fallback for freshly placed local orders
    const orderDateStr = getLocalDateStr(o.createdAt);
    return orderDateStr === todayStr;
  });

  // Dynamic TODAY KPI Calculations
  const todayRevenue = todayOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || o.total || 0), 0);
  const todayOrdersCount = todayOrders.length;
  const avgOrderValue = todayOrdersCount > 0 ? Math.round(todayRevenue / todayOrdersCount) : 0;
  const occupiedTables = tables.filter((t) => t.status === "occupied" || t.status === "reserved").length;
  const occupancyRate = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;

  // Dynamic Top Selling Items Calculation (Strictly for TODAY)
  const itemMap = {};
  todayOrders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const name = it.name;
      const qty = parseInt(it.qty || it.quantity || 1, 10);
      const rev = parseFloat(it.price || 0) * qty;
      if (!itemMap[name]) {
        itemMap[name] = { name, orders: 0, revenue: 0 };
      }
      itemMap[name].orders += qty;
      itemMap[name].revenue += rev;
    });
  });

  const dynamicTopItems = Object.values(itemMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Dynamic Weekly Revenue (last 7 days breakdown)
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dayName: i === 6 ? "Today" : weekDays[d.getDay()],
      dateStr: getLocalDateStr(d),
      revenue: 0
    };
  });

  allOrders.forEach((o) => {
    const totalVal = parseFloat(o.totalAmount || o.total || 0);
    if (!o.createdAt) {
      last7Days[6].revenue += totalVal;
      return;
    }
    const orderDate = getLocalDateStr(o.createdAt);
    const match = last7Days.find((d) => d.dateStr === orderDate);
    if (match) {
      match.revenue += totalVal;
    } else if (orderDate === todayStr) {
      last7Days[6].revenue += totalVal;
    }
  });

  const maxRevenue = Math.max(...last7Days.map((d) => d.revenue), 1000);

  // Dynamic Recent Transactions List
  const recentTransactions = allOrders.slice(0, 5).map((o, idx) => {
    const kotId = o.kotNo || o.orderNumber || (o.id && String(o.id).startsWith("KOT-") ? o.id : `KOT-${100001 + idx}`);
    return {
      id: kotId,
      table: o.tableNo ? `Table ${o.tableNo}` : "Takeaway",
      amount: o.totalAmount || o.total || 0,
      method: o.paymentMethod || "UPI / Cash",
      status: o.paymentStatus || "PAID",
      time: new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  });

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1 font-sans">

      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#FF5B32]/30">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">{tenant?.name || "Owner Operations Hub"}</h2>
            <p className="text-xs text-stone-500">Owner Operations Hub • {branch?.name || "HQ Outlet"} • {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Today Data Sync
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Today's Revenue", value: `${currencySymbol}${todayRevenue.toLocaleString()}`, sub: `${todayOrdersCount} total orders`, icon: DollarSign, color: "from-[#FF5B32] to-amber-500" },
          { label: "Orders Placed", value: todayOrdersCount, sub: "Live customer orders", icon: ShoppingBag, color: "from-blue-500 to-indigo-600" },
          { label: "Avg Order Value", value: `${currencySymbol}${avgOrderValue}`, sub: "Per customer ticket", icon: Receipt, color: "from-violet-500 to-purple-600" },
          { label: "Table Occupancy", value: `${occupancyRate}%`, sub: `${occupiedTables} of ${tables.length} active`, icon: TrendingUp, color: "from-emerald-500 to-teal-600" }
        ].map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all space-y-3">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${kpi.color} flex items-center justify-center text-white shadow-md`}>
                  <KpiIcon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-stone-900">{kpi.value}</p>
                <p className="text-xs font-semibold text-stone-500 mt-0.5">{kpi.label}</p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Grid: Weekly Chart + Top Items + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Weekly Revenue Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100">
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#FF5B32]" />
              Dynamic Weekly Revenue Trend
            </h3>
            <span className="text-xs font-semibold text-stone-400">Last 7 Days</span>
          </div>
          <div className="mt-6 flex items-end gap-3 h-40">
            {last7Days.map((d, i) => {
              const heightPct = Math.max((d.revenue / maxRevenue) * 100, 8);
              const isToday = i === 6;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="relative w-full flex justify-center group">
                    <div
                      className={`w-full rounded-t-lg transition-all ${isToday ? "bg-[#FF5B32] shadow-md shadow-[#FF5B32]/30" : "bg-stone-200 hover:bg-stone-300"}`}
                      style={{ height: `${(heightPct / 100) * 130}px` }}
                    />
                    <div className="absolute -top-7 bg-stone-900 text-white text-[10px] font-bold px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                      {currencySymbol}{d.revenue.toLocaleString()}
                    </div>
                  </div>
                  <span className={`text-[10px] font-black ${isToday ? "text-[#FF5B32]" : "text-stone-500"}`}>
                    {d.dayName}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-4 border-b border-stone-100">
            <Star className="w-4 h-4 text-amber-500" />
            Top Selling Items
          </h3>
          <div className="mt-3 space-y-3">
            {dynamicTopItems.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-2 border-b border-stone-50 pb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className={`font-black text-xs mt-0.5 ${i === 0 ? "text-[#FF5B32]" : "text-stone-400"}`}>
                    #{i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-stone-900 truncate">{item.name}</p>
                    <p className="text-[11px] text-stone-500">{item.orders} ordered</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-stone-900">{currencySymbol}{item.revenue.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-emerald-600">+Live</p>
                </div>
              </div>
            ))}

            {dynamicTopItems.length === 0 && (
              <div className="py-8 text-center text-xs text-stone-400 font-semibold">
                No orders recorded yet. Top items will appear here live!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-4 border-b border-stone-100">
          <Receipt className="w-4 h-4 text-[#FF5B32]" />
          Recent Live Transactions
        </h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-100">
                <th className="text-left pb-2 font-black">Order / KOT</th>
                <th className="text-left pb-2 font-black">Table</th>
                <th className="text-left pb-2 font-black">Amount</th>
                <th className="text-left pb-2 font-black">Method</th>
                <th className="text-left pb-2 font-black">Status</th>
                <th className="text-left pb-2 font-black">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-stone-50/50">
                  <td className="py-2.5 font-mono font-bold text-stone-800">{tx.id}</td>
                  <td className="py-2.5 font-semibold text-stone-700">{tx.table}</td>
                  <td className="py-2.5 font-bold text-stone-900">{currencySymbol}{tx.amount}</td>
                  <td className="py-2.5 text-stone-600">{tx.method}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tx.status === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-2.5 text-stone-400 font-semibold">{tx.time}</td>
                </tr>
              ))}

              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-stone-400 font-semibold">
                    No recent transactions found. Placed orders will reflect here live!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Change Owner PIN Card */}
      {/* <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
        <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-4 border-b border-stone-100">
          <KeyRound className="w-4 h-4 text-[#FF5B32]" />
          Change Owner PIN
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-black border border-amber-200 flex items-center gap-1">
            <Shield className="w-2.5 h-2.5" /> Security
          </span>
        </h3>
        <form onSubmit={handleChangePinSubmit} className="mt-4 space-y-3 max-w-md">
          <p className="text-[11px] text-stone-500 font-semibold">
            Set your POS PIN now. If a PIN already exists, enter Current PIN to change it.
          </p>
          {[
            { key: "currentPin", label: "Current PIN (Leave blank for first setup)",  showKey: "current" },
            { key: "newPin",     label: "New PIN",      showKey: "new"     },
            { key: "confirmPin", label: "Confirm PIN",  showKey: "confirm" }
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">{field.label}</label>
              <div className="relative">
                <input
                  type={showPins[field.showKey] ? "text" : "password"}
                  value={pinForm[field.key]}
                  onChange={e => setPinForm(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.label}
                  maxLength={8}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-[#FF5B32] text-sm font-mono tracking-[4px] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPins(p => ({ ...p, [field.showKey]: !p[field.showKey] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPins[field.showKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={pinLoading}
            className="px-5 py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04822] text-white font-black text-xs shadow-md shadow-[#FF5B32]/30 transition-all disabled:opacity-60 flex items-center gap-2"
          >
            <KeyRound className="w-3.5 h-3.5" />
            {pinLoading ? "Changing..." : "Change PIN"}
          </button>
        </form>
      </div> */}
    </div>
  );
}
