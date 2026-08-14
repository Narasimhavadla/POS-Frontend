"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/apiClient";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Receipt,
  ShoppingBag,
  Download,
  Layers,
  CreditCard,
  Percent,
  PieChart,
  Ban,
  FileCheck,
  FileText,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Eye
} from "lucide-react";

export default function ReportsFinancialsScreen() {
  const { store, setStore, getActiveTenant, getActiveBranch } = useAuth();
  const tenant = getActiveTenant();
  const branch = getActiveBranch();
  const currencySymbol = tenant?.currencySymbol || "₹";

  const [dateFilter, setDateFilter] = useState("today"); 
  const [activeTab, setActiveTab] = useState("overview"); 

  // Audit Log Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Shift Drawer & Z-Report state
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [selectedZReportModal, setSelectedZReportModal] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      api.getReportsAnalytics({ dateFilter }),
      api.getMenuItems()
    ]).then(([analyticsRes, menuRes]) => {
      setStore((prev) => {
        const updated = { ...prev };
        if (analyticsRes.status === "fulfilled" && analyticsRes.value?.success && analyticsRes.value?.data) {
          const { orders, categories } = analyticsRes.value.data;
          if (Array.isArray(orders)) updated.orders = orders;
          if (Array.isArray(categories)) updated.categories = categories;
        }
        if (menuRes.status === "fulfilled" && menuRes.value?.success && Array.isArray(menuRes.value.data)) {
          updated.menuItems = menuRes.value.data;
        }
        return updated;
      });
    }).catch((err) => console.warn("Reports API sync fallback:", err.message));
  }, [dateFilter]);

  // Fetch shift drawer history for Z-Report audits
  useEffect(() => {
    setLoadingShifts(true);
    let startDate = "";
    const today = new Date();
    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (dateFilter === "today") {
      startDate = formatDate(today);
    } else if (dateFilter === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      startDate = formatDate(y);
    } else if (dateFilter === "7days") {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      startDate = formatDate(d7);
    } else if (dateFilter === "month") {
      const m1 = new Date();
      m1.setDate(1);
      startDate = formatDate(m1);
    }

    api.getShiftHistory({ startDate, limit: 100 })
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          setShiftHistory(res.data);
        }
      })
      .catch((err) => console.warn("Failed to fetch shift history:", err))
      .finally(() => setLoadingShifts(false));
  }, [dateFilter, activeTab]);

  // Reset pagination when date filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter]);

  const allOrders = (store.orders || []).filter(
    (o) => !o.tenantId || !tenant?.id || o.tenantId === tenant?.id
  );

  // Helper for date string formatting (YYYY-MM-DD)
  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateStr(new Date());

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterdayDate);

  const d7Ago = new Date();
  d7Ago.setDate(d7Ago.getDate() - 7);

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);

  // Filter orders according to selected date range
  const filteredOrders = allOrders.filter((o) => {
    if (!o.createdAt) return dateFilter === "today";
    const orderDate = new Date(o.createdAt);
    const orderDateStr = getLocalDateStr(orderDate);

    switch (dateFilter) {
      case "today":
        return orderDateStr === todayStr;
      case "yesterday":
        return orderDateStr === yesterdayStr;
      case "7days":
        return orderDate >= d7Ago;
      case "month":
        return orderDate >= firstDayOfMonth;
      default:
        return true;
    }
  });

  // KPI Calculations
  const grossSales = filteredOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || o.total || 0), 0);
  const totalOrdersCount = filteredOrders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(grossSales / totalOrdersCount) : 0;
  
  // Voided Orders Calculation for current date filter
  const voidedOrdersList = filteredOrders.filter((o) => {
    const st = (o.status || "").toUpperCase();
    const ps = (o.paymentStatus || "").toUpperCase();
    return st === "VOIDED text" || st === "VOIDED" || ps === "VOIDED" || st === "CANCELLED";
  });
  const voidedOrdersCount = voidedOrdersList.length;
  const voidedTotalAmount = voidedOrdersList.reduce((sum, o) => sum + parseFloat(o.totalAmount || o.total || 0), 0);

  // Tax and Discount Estimates
  const totalTax = filteredOrders.reduce((sum, o) => sum + parseFloat(o.tax || 0), 0);
  const totalDiscounts = filteredOrders.reduce((sum, o) => sum + parseFloat(o.discount || 0), 0);
  const netSales = Math.max(grossSales - totalDiscounts, 0);

  // Payment Breakdown
  const paymentStats = {
    upi: 0,
    cash: 0,
    card: 0,
    other: 0
  };

  // Order Type Channel Breakdown (Dine-In vs Takeaway)
  const channelStats = {
    dineIn: { count: 0, revenue: 0 },
    takeaway: { count: 0, revenue: 0 }
  };

  filteredOrders.forEach((o) => {
    const m = (o.paymentMethod || "cash").toLowerCase();
    const amt = parseFloat(o.totalAmount || o.total || 0);
    if (m.includes("upi") || m.includes("gpay") || m.includes("phonepe") || m.includes("online")) {
      paymentStats.upi += amt;
    } else if (m.includes("card") || m.includes("credit") || m.includes("debit")) {
      paymentStats.card += amt;
    } else if (m.includes("cash")) {
      paymentStats.cash += amt;
    } else {
      paymentStats.other += amt;
    }

    // Channel Breakdown (Dine-In vs Takeaway / Parcel)
    const isParcel =
      (o.orderType && o.orderType.toLowerCase().includes("parcel")) ||
      (o.orderType && o.orderType.toLowerCase().includes("takeaway")) ||
      (o.tableNo && String(o.tableNo).toUpperCase().startsWith("P-")) ||
      (o.tableNo && String(o.tableNo).toLowerCase().includes("parcel")) ||
      !o.tableNo;

    if (isParcel) {
      channelStats.takeaway.count += 1;
      channelStats.takeaway.revenue += amt;
    } else {
      channelStats.dineIn.count += 1;
      channelStats.dineIn.revenue += amt;
    }
  });

  // Category Revenue Breakdown (Cross-reference with menu items & categories)
  const menuItems = store.menuItems || [];
  const categories = store.categories || [];
  const categoryStatsMap = {};

  filteredOrders.forEach((o) => {
    (o.items || []).forEach((it) => {
      let catName = "";

      // 1. Direct item property checks
      if (typeof it.categoryName === "string" && it.categoryName.trim()) {
        catName = it.categoryName;
      } else if (typeof it.category === "string" && it.category.trim()) {
        catName = it.category;
      } else if (it.category && typeof it.category.name === "string") {
        catName = it.category.name;
      }

      // 2. Fallback: match dish in menuItems by name or ID to get true category
      if (!catName || catName.toLowerCase() === "general") {
        const foundMenu = menuItems.find(
          (m) => String(m.id) === String(it.id || it.menuItemId) || (m.name && m.name.toLowerCase() === (it.name || "").toLowerCase())
        );
        if (foundMenu) {
          const foundCat = categories.find((c) => String(c.id) === String(foundMenu.categoryId));
          if (foundCat && foundCat.name) {
            catName = foundCat.name;
          }
        }
      }

      if (!catName) catName = "General";

      const qty = parseInt(it.qty || it.quantity || 1, 10);
      const rev = parseFloat(it.price || 0) * qty;

      if (!categoryStatsMap[catName]) {
        categoryStatsMap[catName] = { name: catName, quantity: 0, revenue: 0 };
      }
      categoryStatsMap[catName].quantity += qty;
      categoryStatsMap[catName].revenue += rev;
    });
  });

  const categoryStatsList = Object.values(categoryStatsMap).sort((a, b) => b.revenue - a.revenue);

  // Top Selling Dishes
  const dishStatsMap = {};
  filteredOrders.forEach((o) => {
    (o.items || []).forEach((it) => {
      const name = it.name;
      const qty = parseInt(it.qty || it.quantity || 1, 10);
      const rev = parseFloat(it.price || 0) * qty;

      if (!dishStatsMap[name]) {
        dishStatsMap[name] = { name, quantity: 0, revenue: 0 };
      }
      dishStatsMap[name].quantity += qty;
      dishStatsMap[name].revenue += rev;
    });
  });

  const topDishes = Object.values(dishStatsMap).sort((a, b) => b.revenue - a.revenue).slice(0, 7);

  // Pagination Logic for Financial Audit Log
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  // Export Financial CSV Report
  const exportFinancialReport = () => {
    const headers = [
      "Order / KOT ID",
      "Date & Time",
      "Table / Type",
      "Items Count",
      "Payment Method",
      "Payment Status",
      "Gross Amount (₹)",
      "Discount (₹)",
      "Tax (₹)",
      "Net Amount (₹)"
    ];

    const rows = filteredOrders.map((o, idx) => {
      const kotId = o.kotNo || o.orderNumber || (o.id && String(o.id).startsWith("KOT-") ? o.id : `KOT-${100001 + idx}`);
      const gross = parseFloat(o.totalAmount || o.total || 0);
      const disc = parseFloat(o.discount || 0);
      const tax = parseFloat(o.tax || 0);
      const net = gross - disc;

      return [
        kotId,
        new Date(o.createdAt || Date.now()).toLocaleString(),
        o.tableNo ? `Table ${o.tableNo}` : "Takeaway / Parcel",
        (o.items || []).length,
        o.paymentMethod || "Cash",
        o.paymentStatus || "PAID",
        gross.toFixed(2),
        disc.toFixed(2),
        tax.toFixed(2),
        net.toFixed(2)
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Financial_Report_${tenant?.name ? tenant.name.replace(/\s+/g, "_") : "Restaurant"}_${dateFilter}_${todayStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1 font-sans">
      {/* Top Title & Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#FF5B32]/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Reports & Financial Analytics</h2>
            <p className="text-xs text-stone-500">
              Detailed sales breakdown, category share, payment methods & audit logs for {tenant?.name || "Restaurant"}
            </p>
          </div>
        </div>

        {/* Date Filter Buttons & Export */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200">
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "7days", label: "Last 7 Days" },
              { id: "month", label: "This Month" }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setDateFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  dateFilter === btn.id
                    ? "bg-[#FF5B32] text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={exportFinancialReport}
            className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Export Report (CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards Row - Compact height with optimized padding */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Gross Sales</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-[#FF5B32] flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-stone-900 leading-tight">{currencySymbol}{grossSales.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-stone-400">Total order billings</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Total Orders</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-stone-900 leading-tight">{totalOrdersCount}</p>
          <p className="text-[10px] font-bold text-stone-400">Filtered period transactions</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Avg Order Value (AOV)</span>
            <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-stone-900 leading-tight">{currencySymbol}{avgOrderValue}</p>
          <p className="text-[10px] font-bold text-stone-400">Per customer receipt</p>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm space-y-0.5 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Voided Orders</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Ban className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black text-rose-600 leading-tight">{voidedOrdersCount}</p>
          <p className="text-[10px] font-bold text-stone-400">
            {voidedOrdersCount > 0
              ? `Total voided value: ${currencySymbol}${voidedTotalAmount.toLocaleString()}`
              : "No voided orders in filter"}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-stone-200 shadow-sm flex flex-wrap items-center gap-1">
        {[
          { id: "overview", label: "Category Revenue Breakdown", icon: Layers },
          { id: "payments", label: "Payment Modes & Sales Share", icon: CreditCard },
          { id: "audit", label: "Financial Audit Log", icon: Receipt },
          // Z-Report & Shift Audits tab — commented for next version release
          // { id: "zreports", label: "Z-Report & Shift Audits", icon: FileCheck }
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#FF5B32] text-white shadow-md"
                  : "bg-stone-50 text-stone-600 hover:bg-stone-100"
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Category Sales & Top Dish Matrix */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Category Sales Share Table & Bar */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
              <Layers className="w-4 h-4 text-[#FF5B32]" />
              Revenue Share by Category
            </h3>
            <div className="space-y-3.5">
              {categoryStatsList.map((cat, idx) => {
                const pct = grossSales > 0 ? Math.round((cat.revenue / grossSales) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-stone-800">{cat.name} ({cat.quantity} items)</span>
                      <span className="text-stone-900">{currencySymbol}{cat.revenue.toLocaleString()} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#FF5B32] to-amber-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {categoryStatsList.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-6 font-semibold">No category sales recorded for this date filter.</p>
              )}
            </div>
          </div>

          {/* Top Dish Performance Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Highest Grossing Items Matrix
            </h3>
            <div className="space-y-3">
              {topDishes.map((dish, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50/80 border border-stone-100">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-[#FF5B32]/10 text-[#FF5B32] font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-extrabold text-xs text-stone-900">{dish.name}</p>
                      <p className="text-[10px] text-stone-500 font-semibold">{dish.quantity} portions sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xs text-stone-900">{currencySymbol}{dish.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}

              {topDishes.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-6 font-semibold">No items sold in the selected period.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Payment Modes & Sales Share Charts */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          {/* Top Payment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3 border-t-4 border-t-blue-500">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs text-stone-500 uppercase tracking-wider">UPI / QR Payment</h4>
                <CreditCard className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-stone-900">{currencySymbol}{paymentStats.upi.toLocaleString()}</p>
              <p className="text-xs text-stone-400 font-bold">
                {grossSales > 0 ? Math.round((paymentStats.upi / grossSales) * 100) : 0}% of total collections
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3 border-t-4 border-t-emerald-500">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs text-stone-500 uppercase tracking-wider">Cash Register</h4>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-stone-900">{currencySymbol}{paymentStats.cash.toLocaleString()}</p>
              <p className="text-xs text-stone-400 font-bold">
                {grossSales > 0 ? Math.round((paymentStats.cash / grossSales) * 100) : 0}% of total collections
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3 border-t-4 border-t-purple-500">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-xs text-stone-500 uppercase tracking-wider">Credit / Debit Cards</h4>
                <CreditCard className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-stone-900">{currencySymbol}{paymentStats.card.toLocaleString()}</p>
              <p className="text-xs text-stone-400 font-bold">
                {grossSales > 0 ? Math.round((paymentStats.card / grossSales) * 100) : 0}% of total collections
              </p>
            </div>
          </div>

          {/* Visual Distribution Charts Below Stats Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Payment Method Revenue Share Progress Bar */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                Payment Method Revenue Share
              </h3>
              <div className="space-y-4">
                {[
                  { name: "UPI / QR Code", amount: paymentStats.upi, color: "bg-blue-500", text: "text-blue-600" },
                  { name: "Cash Payment", amount: paymentStats.cash, color: "bg-emerald-500", text: "text-emerald-600" },
                  { name: "Card Settlement", amount: paymentStats.card, color: "bg-purple-500", text: "text-purple-600" }
                ].map((item, idx) => {
                  const pct = grossSales > 0 ? Math.round((item.amount / grossSales) * 100) : 0;
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-black">
                        <span className="text-stone-800">{item.name}</span>
                        <span className={item.text}>{currencySymbol}{item.amount.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden">
                        <div
                          className={`${item.color} h-3 rounded-full transition-all duration-500`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 2: Order Channel Revenue Share - Interactive Pie/Donut Chart Layout */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
                <PieChart className="w-4 h-4 text-[#FF5B32]" />
                Order Channel Revenue Breakdown
              </h3>

              {(() => {
                const totalChannelRev = channelStats.dineIn.revenue + channelStats.takeaway.revenue;
                const dineInPct = totalChannelRev > 0 ? Math.round((channelStats.dineIn.revenue / totalChannelRev) * 100) : 50;
                const takeawayPct = 100 - dineInPct;

                // SVG conic gradient stroke dash calculation for Donut/Pie chart (r=40, circumference ~ 251.3)
                const circ = 2 * Math.PI * 40; // 251.32
                const strokeDineIn = (dineInPct / 100) * circ;
                const strokeTakeaway = (takeawayPct / 100) * circ;

                return (
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
                    {/* SVG Interactive Donut/Pie Chart */}
                    <div className="relative w-44 h-44 flex items-center justify-center group cursor-pointer">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background Ring */}
                        <circle cx="50" cy="50" r="40" stroke="#f5f5f4" strokeWidth="14" fill="transparent" />
                        
                        {/* Segment 1: Dine-In (#FF5B32) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#FF5B32"
                          strokeWidth="14"
                          fill="transparent"
                          strokeDasharray={`${strokeDineIn} ${circ - strokeDineIn}`}
                          strokeDashoffset="0"
                          className="transition-all duration-700 hover:opacity-90 hover:stroke-[16px]"
                        />

                        {/* Segment 2: Takeaway (#f59e0b) */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#f59e0b"
                          strokeWidth="14"
                          fill="transparent"
                          strokeDasharray={`${strokeTakeaway} ${circ - strokeTakeaway}`}
                          strokeDashoffset={`-${strokeDineIn}`}
                          className="transition-all duration-700 hover:opacity-90 hover:stroke-[16px]"
                        />
                      </svg>

                      {/* Donut Center Display */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-[10px] font-black uppercase text-stone-400">Total Sales</span>
                        <span className="text-base font-black text-stone-900">{currencySymbol}{totalChannelRev.toLocaleString()}</span>
                        <span className="text-[10px] font-bold text-stone-500">{filteredOrders.length} Orders</span>
                      </div>
                    </div>

                    {/* Pie Chart Interactive Legend Cards */}
                    <div className="space-y-3 flex-1 w-full max-w-xs">
                      {/* Dine-In Legend */}
                      <div className="p-3 rounded-2xl bg-orange-50/70 border border-orange-100 flex items-center justify-between hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded-full bg-[#FF5B32] shadow-sm" />
                          <div>
                            <p className="font-extrabold text-xs text-stone-900">Dine-In Tables</p>
                            <p className="text-[10px] text-stone-500 font-bold">{channelStats.dineIn.count} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xs text-[#FF5B32]">{currencySymbol}{channelStats.dineIn.revenue.toLocaleString()}</p>
                          <p className="text-[10px] font-extrabold text-stone-600">{dineInPct}% Share</p>
                        </div>
                      </div>

                      {/* Takeaway Legend */}
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-center justify-between hover:scale-[1.02] transition-transform">
                        <div className="flex items-center gap-2.5">
                          <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm" />
                          <div>
                            <p className="font-extrabold text-xs text-stone-900">Takeaway / Parcel</p>
                            <p className="text-[10px] text-stone-500 font-bold">{channelStats.takeaway.count} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xs text-amber-600">{currencySymbol}{channelStats.takeaway.revenue.toLocaleString()}</p>
                          <p className="text-[10px] font-extrabold text-stone-600">{takeawayPct}% Share</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Detailed Financial Audit Table with Pagination */}
      {activeTab === "audit" && (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#FF5B32]" />
              Detailed Financial Audit Log ({filteredOrders.length} Total Orders)
            </h3>

            {/* Per Page Selector */}
            <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
              <span>Show per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded-xl bg-stone-100 border border-stone-200 font-extrabold focus:outline-none focus:border-[#FF5B32] cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-100">
                  <th className="text-left pb-2 font-black">KOT / Order ID</th>
                  <th className="text-left pb-2 font-black">Date & Time</th>
                  <th className="text-left pb-2 font-black">Table / Type</th>
                  <th className="text-left pb-2 font-black">Payment Method</th>
                  <th className="text-left pb-2 font-black">Status</th>
                  <th className="text-right pb-2 font-black">Gross Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {paginatedOrders.map((o, idx) => {
                  const kotId = o.kotNo || o.orderNumber || (o.id && String(o.id).startsWith("KOT-") ? o.id : `KOT-${100001 + idx}`);
                  return (
                    <tr key={idx} className="hover:bg-stone-50/60">
                      <td className="py-2.5 font-mono font-bold text-stone-800">{kotId}</td>
                      <td className="py-2.5 text-stone-500 font-medium">
                        {new Date(o.createdAt || Date.now()).toLocaleString()}
                      </td>
                      <td className="py-2.5 font-semibold text-stone-700">
                        {o.tableNo ? `Table ${o.tableNo}` : "Takeaway / Parcel"}
                      </td>
                      <td className="py-2.5 font-bold text-stone-700">{o.paymentMethod || "Cash"}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                          {o.paymentStatus || "PAID"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-black text-stone-900">
                        {currencySymbol}{parseFloat(o.totalAmount || o.total || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-stone-400 font-semibold">
                      No transactions recorded for the selected date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Log Pagination Footer */}
          {filteredOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-100 text-xs text-stone-600 font-bold">
              <span>
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white font-extrabold hover:bg-stone-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-stone-100 rounded-xl font-black text-stone-800">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white font-extrabold hover:bg-stone-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Z-Report & Shift Audits — commented for next version release */}
      {false && activeTab === "zreports" && (
        <div className="space-y-4">
          {/* Shift Drawer History Table */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-[#FF5B32]" /> Cashier Shift Drawer & Z-Report History
                </h3>
                <p className="text-xs text-stone-500 font-medium">Real-time audit log of shift float, counted cash, and closing variance</p>
              </div>

              <span className="px-3 py-1 bg-stone-100 rounded-full text-xs font-black text-stone-700">
                {shiftHistory.length} Shifts Recorded
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase font-black tracking-wider">
                    <th className="py-2.5">Staff Cashier</th>
                    <th className="py-2.5">Opened At</th>
                    <th className="py-2.5">Closed At</th>
                    <th className="py-2.5 text-center">Status</th>
                    <th className="py-2.5 text-right">Float</th>
                    <th className="py-2.5 text-right">Cash Sales</th>
                    <th className="py-2.5 text-right">Expected</th>
                    <th className="py-2.5 text-right">Actual Count</th>
                    <th className="py-2.5 text-right">Variance</th>
                    <th className="py-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {shiftHistory.map((s) => {
                    const variance = parseFloat(s.cashVariance || 0);
                    const isClosed = s.status === "CLOSED";
                    return (
                      <tr key={s.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 font-bold text-stone-900">
                          <div>{s.staffName || "Staff User"}</div>
                          <div className="text-[10px] text-stone-400 font-mono capitalize">{s.staffRole || "cashier"} • ID #{s.staffId || s.userId?.substring(0, 6)}</div>
                        </td>
                        <td className="py-3 text-stone-600 font-medium">
                          {s.openedAt ? new Date(s.openedAt).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 text-stone-600 font-medium">
                          {s.closedAt ? new Date(s.closedAt).toLocaleString() : <span className="text-emerald-600 font-black">● In Progress</span>}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isClosed ? "bg-stone-100 text-stone-700 border border-stone-200" : "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-stone-800">
                          {currencySymbol}{parseFloat(s.openingFloat || 0).toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-stone-800">
                          {currencySymbol}{parseFloat(s.totalCashSales || 0).toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-stone-800">
                          {s.expectedCash ? `${currencySymbol}${parseFloat(s.expectedCash).toFixed(2)}` : "—"}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-stone-900">
                          {s.actualCash ? `${currencySymbol}${parseFloat(s.actualCash).toFixed(2)}` : "—"}
                        </td>
                        <td className="py-3 text-right font-mono font-bold">
                          {isClosed ? (
                            <span className={`px-2 py-0.5 rounded-lg text-[11px] ${
                              variance === 0 ? "bg-emerald-100 text-emerald-800 font-black" : variance > 0 ? "bg-blue-100 text-blue-800 font-black" : "bg-rose-100 text-rose-800 font-black"
                            }`}>
                              {variance >= 0 ? `+${currencySymbol}${variance.toFixed(2)}` : `-${currencySymbol}${Math.abs(variance).toFixed(2)}`}
                            </span>
                          ) : (
                            <span className="text-stone-400">—</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => setSelectedZReportModal(s)}
                            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800 font-black text-[11px] transition-all flex items-center gap-1 mx-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Z-Report
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {shiftHistory.length === 0 && !loadingShifts && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-xs text-stone-400 font-semibold">
                        No shift drawer logs found for the selected date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Z-Report Full Audit Detail Modal — commented for next version release ── */}
      {false && selectedZReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" /> Z-Report Audit Detail
              </h3>
              <button
                onClick={() => setSelectedZReportModal(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Printable Z-Report Summary Box */}
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-3 font-mono text-stone-800">
              <div className="text-center pb-2 border-b border-dashed border-amber-300 space-y-1">
                <p className="font-black text-sm text-stone-900">{tenant?.name || "Restaurant"}</p>
                <p className="text-[10px] text-stone-600">{branch?.name || "Main Branch"} • Shift ID #{selectedZReportModal.id?.substring(0, 8)}</p>
                <p className="text-[10px] font-bold text-amber-900">
                  Staff: {selectedZReportModal.staffName} ({selectedZReportModal.staffRole})
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Opened At:</span>
                  <span className="font-bold text-stone-900">{selectedZReportModal.openedAt ? new Date(selectedZReportModal.openedAt).toLocaleString() : "—"}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Closed At:</span>
                  <span className="font-bold text-stone-900">{selectedZReportModal.closedAt ? new Date(selectedZReportModal.closedAt).toLocaleString() : "Still Active"}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Opening Float:</span>
                  <span className="font-bold text-stone-900">{currencySymbol}{parseFloat(selectedZReportModal.openingFloat || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-amber-300 pt-2 space-y-1">
                <p className="font-black text-amber-900 text-[11px]">SALES BREAKDOWN</p>
                <div className="flex justify-between">
                  <span>Cash Sales:</span>
                  <span className="font-bold">{currencySymbol}{parseFloat(selectedZReportModal.totalCashSales || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>UPI Sales:</span>
                  <span className="font-bold">{currencySymbol}{parseFloat(selectedZReportModal.totalUpiSales || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card/Other Sales:</span>
                  <span className="font-bold">{currencySymbol}{parseFloat(selectedZReportModal.totalCardSales || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Voided Orders ({selectedZReportModal.totalVoidCount || 0}):</span>
                  <span className="font-bold">-{currencySymbol}{parseFloat(selectedZReportModal.totalVoidAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-amber-300 pt-2 space-y-1">
                <p className="font-black text-amber-900 text-[11px]">CASH RECONCILIATION</p>
                <div className="flex justify-between">
                  <span>Expected Cash (Float + Cash Sales):</span>
                  <span className="font-bold">{currencySymbol}{parseFloat(selectedZReportModal.expectedCash || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Actual Counted Cash:</span>
                  <span className="font-bold">{currencySymbol}{parseFloat(selectedZReportModal.actualCash || 0).toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-black text-sm pt-1 border-t border-amber-300 ${
                  parseFloat(selectedZReportModal.cashVariance || 0) >= 0 ? "text-emerald-700" : "text-rose-700"
                }`}>
                  <span>Cash Variance:</span>
                  <span>
                    {parseFloat(selectedZReportModal.cashVariance || 0) >= 0 ? "+" : ""}
                    {currencySymbol}{parseFloat(Math.abs(selectedZReportModal.cashVariance || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {selectedZReportModal.notes && (
                <div className="border-t border-dashed border-amber-300 pt-2 text-[10px] text-stone-600">
                  <span className="font-bold text-stone-800">Shift Notes:</span> {selectedZReportModal.notes}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedZReportModal(null)}
              className="w-full py-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs shadow-md transition-colors"
            >
              Close Z-Report View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
