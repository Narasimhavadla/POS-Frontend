"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Activity,
  Search,
  Filter,
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileSpreadsheet,
  Calendar,
  RotateCcw
} from "lucide-react";

export default function OrderHistoryScreen() {
  const { store, getActiveTenant, getActiveBranch, currencySymbol: globalCurrencySymbol, taxRate: globalTaxRate, taxName: globalTaxName } = useAuth();
  const tenant = getActiveTenant();
  const branch = getActiveBranch();
  const currencySymbol = globalCurrencySymbol || tenant?.currencySymbol || "₹";
  const activeTaxRate = globalTaxRate !== undefined ? globalTaxRate : 5.0;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const allOrders = (store.orders || []).filter(
    (o) => !o.tenantId || o.tenantId === tenant?.id
  );

  const parseItems = (items) => {
    if (Array.isArray(items)) return items;
    if (typeof items === "string") {
      try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getOrderAmount = (ord) => {
    if (!ord) return 0;
    if (ord.totalPayable && Number(ord.totalPayable) > 0) return Number(ord.totalPayable);
    
    // Check if total / totalAmount already includes tax
    const stored = Number(ord.totalAmount || ord.total || 0);
    const items = parseItems(ord.items);
    const itemsSubtotal = items.reduce((sum, item) => {
      const p = Number(item.price ?? item.unitPrice ?? item.priceAmount ?? item.amount ?? 0);
      const q = Number(item.qty ?? item.quantity ?? 1);
      return sum + (p * q);
    }, 0);

    const discountVal = Number(ord.discountAmount || ord.discount || 0);
    const orderTaxRate = ord.taxRate !== undefined ? Number(ord.taxRate) : activeTaxRate;

    // If stored total is roughly equal to raw items subtotal, it does NOT include tax yet! Calculate full payable with tax.
    if (stored > 0 && Math.abs(stored - itemsSubtotal) > 1 && stored > itemsSubtotal) {
      return stored; // Already total with tax
    }

    const netSubtotal = Math.max(0, itemsSubtotal - discountVal);
    const taxAmt = ord.taxGST !== undefined ? Number(ord.taxGST) : (ord.tax !== undefined && Number(ord.tax) > 0 ? Number(ord.tax) : Math.round((netSubtotal * orderTaxRate) / 100));
    return netSubtotal + taxAmt;
  };

  const formatKotNumber = (ord) => {
    if (!ord) return "KOT-100001";
    if (ord.orderNumber && ord.orderNumber.startsWith("KOT-")) return ord.orderNumber;
    if (ord.kotNo && ord.kotNo.startsWith("KOT-")) return ord.kotNo;
    if (ord.orderNumber && !ord.orderNumber.includes("-") && ord.orderNumber.length <= 8) {
      return `KOT-${ord.orderNumber}`;
    }
    if (ord.kotNo && !ord.kotNo.includes("-") && ord.kotNo.length <= 8) {
      return `KOT-${ord.kotNo}`;
    }
    const cleanId = String(ord.id || ord.orderNumber || "1001").replace(/[^a-zA-Z0-9]/g, "");
    const suffix = cleanId.slice(-6).toUpperCase();
    return `KOT-${suffix}`;
  };

  const matchesDate = (ord) => {
    if (!startDate && !endDate) return true;
    const createdAt = ord.createdAt ? new Date(ord.createdAt) : new Date();
    const orderTime = createdAt.getTime();

    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`).getTime();
      if (orderTime < start) return false;
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`).getTime();
      if (orderTime > end) return false;
    }
    return true;
  };

  const filteredOrders = allOrders.filter((ord) => {
    const kotFormatted = formatKotNumber(ord).toLowerCase();
    const matchesSearch =
      kotFormatted.includes(searchQuery.toLowerCase()) ||
      (ord.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.kotNo || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ord.tableNo || ord.tableNumber || "").toLowerCase().includes(searchQuery.toLowerCase());

    const isOrdVoided =
      (ord.status || "").toUpperCase() === "VOIDED" ||
      (ord.paymentStatus || "").toUpperCase() === "VOIDED";

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "voided"
        ? isOrdVoided
        : statusFilter === "completed"
        ? !isOrdVoided && ((ord.status || "").toUpperCase() === "COMPLETED" || (ord.status || "").toUpperCase() === "CLOSED" || (ord.status || "").toUpperCase() === "SERVED" || (ord.paymentStatus || "").toUpperCase() === "PAID")
        : (ord.status || "").toLowerCase() === statusFilter.toLowerCase();

    const matchesPayment =
      paymentFilter === "all"
        ? true
        : (ord.paymentMethod || "UPI / QR").toLowerCase().includes(paymentFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPayment && matchesDate(ord);
  });

  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const exportCSV = () => {
    const headers = ["KOT ID", "Table", "Type", "Status", "Items Count", "Subtotal", "Total", "Payment Method", "Timestamp"];
    const rows = filteredOrders.map((o) => [
      formatKotNumber(o),
      o.tableNo || o.tableNumber || "Takeaway",
      o.orderType || "Dine-In",
      (o.status || "").toUpperCase() === "VOIDED" || (o.paymentStatus || "").toUpperCase() === "VOIDED" ? "VOIDED" : (o.status || "COMPLETED"),
      parseItems(o.items).length,
      o.subtotal || getOrderAmount(o),
      getOrderAmount(o),
      o.paymentMethod || "UPI / QR",
      new Date(o.createdAt || Date.now()).toLocaleString()
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Order_History_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full flex flex-col gap-3.5 overflow-hidden font-sans">

      {/* Header Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Restaurant Orders History</h2>
            <p className="text-xs text-stone-500">{tenant?.name || "SmartServe"} — Real-time transaction audit & full order logs</p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="px-4 py-2 rounded-xl bg-stone-900 text-white font-bold text-xs flex items-center gap-2 hover:bg-black transition-colors cursor-pointer shadow-sm"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          Export Orders CSV
        </button>
      </div>

      {/* Controls Bar & Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm space-y-3 shrink-0">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Search by KOT ID (e.g. KOT-100001), Table #, item..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-semibold outline-none focus:border-[#FF5B32]"
            />
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-600 font-bold w-full lg:w-auto">
              <Calendar className="w-3.5 h-3.5 text-[#FF5B32]" />
              <span className="text-[11px] text-stone-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none outline-none font-bold text-xs text-stone-800 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-600 font-bold w-full lg:w-auto">
              <Calendar className="w-3.5 h-3.5 text-[#FF5B32]" />
              <span className="text-[11px] text-stone-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none outline-none font-bold text-xs text-stone-800 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Dropdowns & Reset Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-100 pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <span>Filters:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold outline-none focus:border-[#FF5B32] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed / Served</option>
              <option value="voided">Voided</option>
              <option value="paid">Paid</option>
              <option value="preparing">Preparing</option>
              <option value="pending">Pending</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold outline-none focus:border-[#FF5B32] cursor-pointer"
            >
              <option value="all">All Payment Types</option>
              <option value="cash">💵 Cash</option>
              <option value="upi">📱 UPI / QR</option>
              <option value="card">💳 Card</option>
            </select>

            {(searchQuery || statusFilter !== "all" || paymentFilter !== "all" || startDate || endDate) && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Clear Filters
              </button>
            )}
          </div>

          {/* Items Per Page */}
          <div className="flex items-center gap-2 text-xs font-bold text-stone-500">
            <span>Show:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold outline-none focus:border-[#FF5B32] cursor-pointer"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders History Table */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden flex flex-col justify-between">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-100/70 border-b border-stone-200 text-[10px] font-black text-stone-500 uppercase tracking-wider">
                <th className="px-4 py-3">KOT / ORDER ID</th>
                <th className="px-4 py-3">TABLE</th>
                <th className="px-4 py-3">ORDER ITEMS</th>
                <th className="px-4 py-3">PAYMENT TYPE</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3">AMOUNT</th>
                <th className="px-4 py-3">TIMESTAMP</th>
                <th className="px-4 py-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs font-medium">
              {paginatedOrders.map((ord) => {
                const kotId = formatKotNumber(ord);
                const itemsList = parseItems(ord.items);
                const totalAmt = getOrderAmount(ord);
                const isVoided = (ord.status || "").toUpperCase() === "VOIDED" || (ord.paymentStatus || "").toUpperCase() === "VOIDED";
                const payMethod = (ord.paymentMethod || "UPI / QR").toUpperCase();

                return (
                  <tr key={ord.id} className="hover:bg-stone-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 text-xs">
                        {kotId}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-stone-800">
                      {ord.orderType === "Parcel" || (ord.tableNo && (String(ord.tableNo).startsWith("P-") || String(ord.tableNo).toLowerCase().includes("parcel"))) ? (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono font-black border border-purple-300">
                          📦 {ord.tableNo || ord.tableNumber || "Parcel"}
                        </span>
                      ) : (
                        `Table ${ord.tableNo || ord.tableNumber || "01"}`
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-700 max-w-xs truncate font-semibold">
                      {itemsList.length > 0
                        ? itemsList.map((i) => `${i.name} (x${i.qty || i.quantity || 1})`).join(", ")
                        : "Standard Order"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black bg-stone-100 border border-stone-200">
                        {payMethod.includes("CASH") ? (
                          <span className="text-emerald-700 font-black">💵 CASH</span>
                        ) : payMethod.includes("CARD") ? (
                          <span className="text-blue-700 font-black">💳 CARD</span>
                        ) : (
                          <span className="text-violet-700 font-black">📱 {ord.paymentMethod || "UPI / QR"}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          isVoided
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : ord.status === "COMPLETED" || ord.status === "PAID" || ord.status === "SERVED" || ord.status === "served"
                            ? "bg-emerald-100 text-emerald-800"
                            : ord.status === "PREPARING" || ord.status === "preparing"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {isVoided ? "VOIDED" : ord.status || "COMPLETED"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black text-stone-900 font-mono text-sm">
                      {currencySymbol}{totalAmt.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-stone-400 font-semibold">
                      {new Date(ord.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="p-1.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-700 cursor-pointer inline-flex items-center gap-1 font-bold text-[11px] shadow-sm transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#FF5B32]" /> Details
                      </button>
                    </td>
                  </tr>
                );
              })}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-stone-400 font-semibold text-xs">
                    No order history records match your search & filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Navigation Footer */}
        <div className="bg-stone-50 border-t border-stone-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-stone-600 shrink-0">
          <div>
            Showing <span className="font-bold text-stone-900">{totalItems > 0 ? startIndex + 1 : 0}</span> to{" "}
            <span className="font-bold text-stone-900">{Math.min(endIndex, totalItems)}</span> of{" "}
            <span className="font-bold text-stone-900">{totalItems}</span> orders
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={safeCurrentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>

            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    safeCurrentPage === pageNum
                      ? "bg-[#FF5B32] text-white shadow-sm"
                      : "bg-white border border-stone-200 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={safeCurrentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-white font-bold flex items-center gap-1 cursor-pointer transition-all"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 text-sm">
                    {formatKotNumber(selectedOrder)}
                  </span>
                  <span className="text-xs font-bold text-stone-500">Order Details</span>
                </div>
                <p className="text-xs text-stone-400 font-medium mt-1">
                  Table {selectedOrder.tableNo || selectedOrder.tableNumber} • {new Date(selectedOrder.createdAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              <p className="text-[10px] font-black uppercase text-stone-400">Items Ordered:</p>
              {parseItems(selectedOrder.items).map((it, idx) => {
                const q = Number(it.qty ?? it.quantity ?? 1);
                const p = Number(it.price ?? it.unitPrice ?? it.priceAmount ?? it.amount ?? 0);
                const lineTotal = p * q;

                return (
                  <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50 border border-stone-100 text-xs font-bold text-stone-800">
                    <span>{it.name} <span className="text-[#FF5B32]">x{q}</span></span>
                    <span className="text-stone-900 font-mono">{currencySymbol}{lineTotal.toFixed(2)}</span>
                  </div>
                );
              })}

              {parseItems(selectedOrder.items).length === 0 && (
                <p className="text-xs text-stone-400 font-bold italic py-2">No detailed items recorded for this order.</p>
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs font-medium">
              <div className="flex justify-between text-stone-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-stone-900">{selectedOrder.paymentMethod || "UPI / QR"}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Order Status:</span>
                <span className={`font-bold ${selectedOrder.status === "VOIDED" || selectedOrder.status === "voided" ? "text-rose-600 font-black" : "text-emerald-600"}`}>
                  {selectedOrder.status === "VOIDED" || selectedOrder.status === "voided" ? "VOIDED" : selectedOrder.status || "COMPLETED"}
                </span>
              </div>
              {(selectedOrder.status === "VOIDED" || selectedOrder.status === "voided" || selectedOrder.paymentStatus === "VOIDED") && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 space-y-1">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span>Reason for Void:</span>
                    <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold">VOIDED</span>
                  </div>
                  <p className="text-xs italic font-semibold">{selectedOrder.voidReason || "Manager void authorization"}</p>
                </div>
              )}
              
              {/* Detailed Tax Breakdown */}
              {(() => {
                const items = parseItems(selectedOrder.items);
                const itemsSubtotal = items.reduce((sum, item) => {
                  const p = Number(item.price ?? item.unitPrice ?? item.priceAmount ?? item.amount ?? 0);
                  const q = Number(item.qty ?? item.quantity ?? 1);
                  return sum + (p * q);
                }, 0);
                const discountVal = Number(selectedOrder.discountAmount || selectedOrder.discount || 0);
                const netSub = Math.max(0, itemsSubtotal - discountVal);
                const taxName = selectedOrder.taxName || globalTaxName || "GST";
                const taxRateVal = selectedOrder.taxRate !== undefined ? Number(selectedOrder.taxRate) : activeTaxRate;
                const taxAmt = selectedOrder.taxGST !== undefined ? Number(selectedOrder.taxGST) : (selectedOrder.tax !== undefined && Number(selectedOrder.tax) > 0 ? Number(selectedOrder.tax) : Math.round((netSub * taxRateVal) / 100));

                return (
                  <>
                    <div className="border-t border-stone-200 pt-2 flex justify-between text-stone-500">
                      <span>Subtotal:</span>
                      <span className="font-mono font-bold text-stone-800">{currencySymbol}{itemsSubtotal.toFixed(2)}</span>
                    </div>
                    {discountVal > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Discount:</span>
                        <span className="font-mono">-{currencySymbol}{discountVal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-stone-500">
                      <span>{taxName} ({taxRateVal}%):</span>
                      <span className="font-mono font-bold text-stone-800">{currencySymbol}{taxAmt.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}

              <div className="border-t border-stone-200 pt-2 flex justify-between items-center">
                <span className="font-black text-stone-900">Total Payable:</span>
                <span className="text-lg font-black text-[#FF5B32] font-mono">
                  {currencySymbol}{getOrderAmount(selectedOrder).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
