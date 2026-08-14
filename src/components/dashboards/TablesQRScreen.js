"use client";

import React, { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/apiClient";
import {
  QrCode,
  Users,
  Sofa,
  CheckCircle,
  Clock,
  Ban,
  RefreshCw,
  Download,
  Grid2x2,
  Plus,
  ExternalLink,
  Sparkles,
  Printer,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { toast } from "sonner";

const TABLE_STATUS_CONFIG = {
  vacant: {
    label: "Vacant",
    bg: "bg-emerald-50/70",
    border: "border-emerald-300",
    badge: "bg-emerald-100 text-emerald-800",
    icon: CheckCircle,
    iconColor: "text-emerald-500"
  },
  occupied: {
    label: "Occupied",
    bg: "bg-amber-50/70",
    border: "border-amber-300",
    badge: "bg-amber-100 text-amber-800",
    icon: Users,
    iconColor: "text-amber-500"
  },
  reserved: {
    label: "Reserved",
    bg: "bg-blue-50/70",
    border: "border-blue-300",
    badge: "bg-blue-100 text-blue-800",
    icon: Clock,
    iconColor: "text-blue-500"
  },
  cleaning: {
    label: "Cleaning",
    bg: "bg-stone-50",
    border: "border-stone-300",
    badge: "bg-stone-100 text-stone-600",
    icon: RefreshCw,
    iconColor: "text-stone-400"
  }
};

export default function TablesQRScreen() {
  const { store, setStore, getActiveTenant, getActiveBranch, updateTableStatus, addTable, setActiveScreen, orderWorkflowMode, isManagerUnlocked, setIsManagerUnlocked, verifyManagerPin } = useAuth();

  const tenant = getActiveTenant();
  const branch = getActiveBranch();

  const tables = (store.tables || []).filter(
    (t) => t.tenantId === tenant?.id && (!t.branchId || t.branchId === branch?.id)
  );

  const zones = [...new Set(tables.map((t) => t.zone))];
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedTableId, setSelectedTableId] = useState(null);
  
  // QR Standee Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTable, setQrTable] = useState(null);

  // New Table Modal
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableZone, setNewTableZone] = useState("Main Dining");
  const [newTableSeats, setNewTableSeats] = useState(4);

  // Edit Table Modal State
  const [showEditTableModal, setShowEditTableModal] = useState(false);
  const [editTableData, setEditTableData] = useState(null); // { id, number, zone, seats }

  // Delete Confirmation Modal State
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteTargetTable, setDeleteTargetTable] = useState(null);

  // Manager PIN Security Modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pendingAction, setPendingAction] = useState(null); // { type: 'delete' | 'edit', data: ... }

  const handleOpenEditModal = (table) => {
    setEditTableData({
      id: table.id,
      number: table.number,
      zone: table.zone || "Main Dining",
      seats: table.seats || 4
    });
    setShowEditTableModal(true);
  };

  const handleOpenDeleteModal = (table) => {
    setDeleteTargetTable(table);
    setShowDeleteConfirmModal(true);
  };

  const handleRequestSubmitEdit = (e) => {
    e.preventDefault();
    if (!editTableData) return;
    if (isManagerUnlocked) {
      commitEditTable(editTableData);
      setShowEditTableModal(false);
      return;
    }
    setPendingAction({ type: "edit", data: editTableData });
    setPinInput("");
    setShowPinModal(true);
  };

  const handleRequestConfirmDelete = () => {
    if (!deleteTargetTable) return;
    if (isManagerUnlocked) {
      commitDeleteTable(deleteTargetTable);
      setShowDeleteConfirmModal(false);
      return;
    }
    setPendingAction({ type: "delete", data: deleteTargetTable });
    setPinInput("");
    setShowPinModal(true);
  };

  const verifyPinAndExecute = async () => {
    if (await verifyManagerPin(pinInput)) {
      setIsManagerUnlocked(true);
      setShowPinModal(false);
      if (pendingAction) {
        if (pendingAction.type === "edit") {
          commitEditTable(pendingAction.data);
          setShowEditTableModal(false);
        } else if (pendingAction.type === "delete") {
          commitDeleteTable(pendingAction.data);
          setShowDeleteConfirmModal(false);
        }
        setPendingAction(null);
      }
    } else {
      toast.error("Invalid Manager PIN", { description: "Security verification failed." });
    }
  };

  const commitEditTable = (data) => {
    const formattedNo = data.number.startsWith("T-") || data.number.startsWith("Table ")
      ? data.number
      : `T-${data.number}`;

    const updatedData = {
      number: formattedNo,
      zone: data.zone,
      seats: Number(data.seats) || 4
    };

    setStore((prev) => ({
      ...prev,
      tables: (prev.tables || []).map((t) =>
        t.id === data.id ? { ...t, ...updatedData } : t
      )
    }));

    api.updateTable(data.id, updatedData).catch((e) => console.warn("Backend update table fallback:", e.message));
    toast.success(`Table ${formattedNo} updated successfully!`);
  };

  const commitDeleteTable = (table) => {
    setStore((prev) => ({
      ...prev,
      tables: (prev.tables || []).filter((t) => t.id !== table.id)
    }));

    api.deleteTable(table.id).catch((e) => console.warn("Backend delete table fallback:", e.message));
    toast.success(`Table ${table.number} deleted successfully.`);
  };

  const normalizeTable = (num) => String(num || "").trim().toUpperCase().replace(/^TABLE\s*/, "").replace(/^T-/, "");

  const getTableActiveOrder = (tableNumber) => {
    return (store.orders || []).find(
      (o) =>
        o.tenantId === tenant?.id &&
        (!o.branchId || o.branchId === branch?.id) &&
        normalizeTable(o.tableNo || o.tableNumber) === normalizeTable(tableNumber) &&
        o.paymentStatus !== "PAID" &&
        o.paymentStatus !== "paid" &&
        o.paymentStatus !== "VOIDED" &&
        o.paymentStatus !== "voided" &&
        o.status !== "CLOSED" &&
        o.status !== "closed" &&
        o.status !== "voided" &&
        o.status !== "VOIDED"
    );
  };

  const getTableEffectiveStatus = (table) => {
    const activeOrder = getTableActiveOrder(table.number);
    if (activeOrder) return "occupied";
    if (table.status === "occupied" || table.status === "OCCUPIED") return "occupied";
    if (table.status === "cleaning" || table.status === "CLEANING") return "cleaning";
    return "vacant";
  };

  const filteredTables =
    selectedZone === "all" ? tables : tables.filter((t) => t.zone === selectedZone);

  const statusCounts = {
    vacant: tables.filter((t) => getTableEffectiveStatus(t) === "vacant" || getTableEffectiveStatus(t) === "cleaning").length,
    occupied: tables.filter((t) => getTableEffectiveStatus(t) === "occupied").length
  };

  const handleShowQR = (table) => {
    setQrTable(table);
    setShowQrModal(true);
  };

  const cycleStatus = (tableId, currentStatus) => {
    const cycle = { vacant: "occupied", occupied: "cleaning", cleaning: "vacant", reserved: "vacant" };
    updateTableStatus(tableId, cycle[currentStatus] || "vacant");
  };

  const handleCreateTable = (e) => {
    e.preventDefault();
    if (!newTableNumber) return;

    const formattedNo = newTableNumber.startsWith("T-") || newTableNumber.startsWith("Table ")
      ? newTableNumber
      : `T-${newTableNumber}`;

    const ssid = tenant?.ssid || "982145";
    const restaurantSlug = encodeURIComponent(tenant?.name || "SmartServe");
    const originUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const standeeTargetUrl = `${originUrl}/menu?restaurant=${restaurantSlug}&ssid=${ssid}&table=${formattedNo}`;

    const newTable = {
      id: `tbl-${Date.now()}`,
      tenantId: tenant?.id || "tenant-spice-bistro",
      branchId: branch?.id || "br-1",
      number: formattedNo,
      zone: newTableZone || "Main Dining",
      seats: Number(newTableSeats) || 4,
      status: "vacant",
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(standeeTargetUrl)}`
    };

    addTable(newTable);
    setShowAddTableModal(false);
    setNewTableNumber("");
  };

  // Composite High-Resolution PNG Standee Download with Central Embedded Logo
  const handleDownloadQR = (tableNumber) => {
    const ssid = tenant?.ssid || "982145";
    const restaurantSlug = encodeURIComponent(tenant?.name || "SmartServe");
    const originUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const targetUrl = `${originUrl}/menu?restaurant=${restaurantSlug}&ssid=${ssid}&table=${tableNumber}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(targetUrl)}`;

    const canvas = document.createElement("canvas");
    const size = 600;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const qrImage = new Image();
    qrImage.crossOrigin = "anonymous";
    qrImage.src = qrApiUrl;

    qrImage.onload = () => {
      // 1. Draw base QR code
      ctx.drawImage(qrImage, 0, 0, size, size);

      // 2. Draw central circular white badge container
      const center = size / 2;
      const outerRadius = 70;
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, outerRadius, 0, 2 * Math.PI, false);
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#e7e5e4";
      ctx.stroke();
      ctx.restore();

      // 3. Draw Logo Image or First Letter Fallback
      if (tenant?.logo) {
        const logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = tenant.logo;

        logoImg.onload = () => {
          ctx.save();
          ctx.beginPath();
          ctx.arc(center, center, outerRadius - 8, 0, 2 * Math.PI, false);
          ctx.clip();
          ctx.drawImage(
            logoImg,
            center - (outerRadius - 8),
            center - (outerRadius - 8),
            (outerRadius - 8) * 2,
            (outerRadius - 8) * 2
          );
          ctx.restore();
          triggerDownloadCanvas();
        };

        logoImg.onerror = () => {
          drawFallbackLetter();
          triggerDownloadCanvas();
        };
      } else {
        drawFallbackLetter();
        triggerDownloadCanvas();
      }

      function drawFallbackLetter() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, outerRadius - 8, 0, 2 * Math.PI, false);
        const grad = ctx.createLinearGradient(center - outerRadius, center - outerRadius, center + outerRadius, center + outerRadius);
        grad.addColorStop(0, "#FF5B32");
        grad.addColorStop(1, "#f59e0b");
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.font = "bold 52px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const letter = (tenant?.name || "S").charAt(0).toUpperCase();
        ctx.fillText(letter, center, center + 2);
        ctx.restore();
      }

      function triggerDownloadCanvas() {
        canvas.toBlob((blob) => {
          if (!blob) return;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `QR-Standee-${tenant?.name || "Restaurant"}-${tableNumber}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          toast.success(`Downloaded QR Standee with logo for Table ${tableNumber}!`);
        });
      }
    };

    qrImage.onerror = () => {
      toast.error("Failed to load QR code for standee download.");
    };
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden font-sans">

      {/* Top Bar Header */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base text-stone-900">Tables & Live QR Standees</h2>
              <span className="px-2 py-0.5 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-[10px] font-black uppercase">
                QR Direct Ordering
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {branch?.name} — {tables.length} tables configured | Workflow: <span className="font-bold text-amber-600">{orderWorkflowMode === "WORKFLOW_1" ? "Cashier Approval First" : "Direct Kitchen KDS"}</span>
            </p>
          </div>
        </div>

        {/* Live Table Stats & Create Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            {[
              { key: "vacant", label: "Vacant", color: "bg-emerald-100 text-emerald-800" },
              { key: "occupied", label: "Occupied", color: "bg-amber-100 text-amber-800" }
            ].map((s) => (
              <div key={s.key} className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${s.color}`}>
                <span className="font-black">{statusCounts[s.key]}</span>
                <span className="hidden md:inline">{s.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowAddTableModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs shadow-md shadow-[#FF5B32]/20 flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Zone Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedZone("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
            selectedZone === "all"
              ? "bg-stone-900 text-white shadow-sm"
              : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
          }`}
        >
          <Grid2x2 className="w-3.5 h-3.5" />
          All Zones ({tables.length})
        </button>
        {zones.map((zone) => (
          <button
            key={zone}
            onClick={() => setSelectedZone(zone)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedZone === zone
                ? "bg-stone-900 text-white shadow-sm"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            📍 {zone}
          </button>
        ))}
      </div>

      {/* Table Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pr-1">
        {filteredTables.map((table) => {
          const activeOrder = getTableActiveOrder(table.number);
          const effectiveStatus = getTableEffectiveStatus(table);
          const config = TABLE_STATUS_CONFIG[effectiveStatus] || TABLE_STATUS_CONFIG.vacant;
          const StatusIcon = config.icon;

          return (
            <div
              key={table.id}
              className={`p-4 rounded-2xl border-2 ${config.bg} ${config.border} flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group`}
              onClick={() => setSelectedTableId(selectedTableId === table.id ? null : table.id)}
            >
              {/* Table Info Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-xl text-stone-900 leading-none">{table.number}</h3>
                  <p className="text-[11px] text-stone-500 font-bold mt-1">{table.zone}</p>
                </div>
                <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
              </div>

              {/* Seats & Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-600 font-bold">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {table.seats} Seats
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${config.badge}`}>
                    {config.label}
                  </span>
                </div>

                {activeOrder ? (
                  <div className="p-2 rounded-xl bg-amber-100/80 border border-amber-300 text-[11px] font-bold text-amber-900 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>{activeOrder.kotNo || activeOrder.orderNumber || "KOT-100001"}</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-white text-[9px] font-black uppercase">
                        {activeOrder.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-700 font-semibold truncate">
                      {activeOrder.items?.length || 0} items • ₹{activeOrder.totalAmount}
                    </p>
                  </div>
                ) : (
                  <div className="text-[10px] text-stone-400 font-semibold flex items-center gap-1">
                    <QrCode className="w-3 h-3 text-violet-500" />
                    <span>QR Ready to Scan</span>
                  </div>
                )}
              </div>

              {/* Quick Actions Bar */}
              <div className="pt-2 border-t border-stone-200/80 space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleStatus(table.id, table.status);
                    }}
                    className="py-1.5 rounded-xl bg-stone-900 text-white font-bold text-[11px] hover:bg-black transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Toggle Table Status"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Status
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowQR(table);
                    }}
                    className="py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px] shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                    title="Generate & View QR Standee"
                  >
                    <QrCode className="w-3 h-3" />
                    QR Code
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(table);
                    }}
                    className="py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    title="Edit Table Details"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDeleteModal(table);
                    }}
                    className="py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                    title="Delete Table"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF5B32] text-white flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
                <h3 className="font-black text-base text-stone-900">Create New Table & QR</h3>
              </div>
              <button
                onClick={() => setShowAddTableModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Table Identifier / Number</label>
                <input
                  type="text"
                  placeholder="e.g. T-12 or Table 12"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-900 font-bold focus:outline-none focus:border-[#FF5B32]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Floor Zone</label>
                  <select
                    value={newTableZone}
                    onChange={(e) => setNewTableZone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-900 font-bold focus:outline-none focus:border-[#FF5B32]"
                  >
                    <option value="Main Dining">Main Dining</option>
                    <option value="Rooftop Terrace">Rooftop Terrace</option>
                    <option value="VIP Lounge">VIP Lounge</option>
                    <option value="Garden Patio">Garden Patio</option>
                    <option value="Bar Counters">Bar Counters</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newTableSeats}
                    onChange={(e) => setNewTableSeats(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-900 font-bold focus:outline-none focus:border-[#FF5B32]"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddTableModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-bold text-xs shadow-md shadow-[#FF5B32]/30"
                >
                  Create & Generate QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Standee Printable Modal */}
      {showQrModal && qrTable && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-center space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-violet-600" />
                <h3 className="font-black text-base text-stone-900">QR Standee — {qrTable.number}</h3>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Simulated Live Vector Printable QR Code Card */}
            <div className="bg-stone-900 text-white rounded-2xl p-5 border-2 border-stone-800 shadow-xl space-y-3">
              <div>
                <p className="font-black text-base tracking-tight text-white">{tenant?.name || "SmartServe Bistro"}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#FF5B32] mt-0.5">
                  TABLE {qrTable.number} • {qrTable.zone}
                </p>
              </div>

              {/* Real Scannable QR Code Image with Central Embedded Restaurant Logo / Initial Badge */}
              <div className="bg-white p-3.5 rounded-2xl mx-auto w-52 h-52 flex items-center justify-center shadow-inner relative group">
                <img
                  id="qr-code-img"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? `${window.location.origin}/menu?restaurant=${encodeURIComponent(tenant?.name || "SmartServe")}&ssid=${tenant?.ssid || "982145"}&table=${qrTable.number}`
                      : `http://localhost:3000/menu?restaurant=${encodeURIComponent(tenant?.name || "SmartServe")}&ssid=${tenant?.ssid || "982145"}&table=${qrTable.number}`
                  )}`}
                  alt={`QR Code for Table ${qrTable.number}`}
                  className="w-44 h-44 object-contain rounded-lg"
                  crossOrigin="anonymous"
                />

                {/* Stylish Central Badge Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white p-1 shadow-lg border-2 border-stone-200 flex items-center justify-center">
                    {tenant?.logo ? (
                      <img
                        src={tenant.logo}
                        alt="Logo"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF5B32] to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-sm">
                        {(tenant?.name || "S").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Scan with Mobile Camera to Order</span>
                </div>
                <p className="text-[10px] text-stone-400 font-mono truncate">
                  {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/menu?restaurant={encodeURIComponent(tenant?.name || "SmartServe")}&table={qrTable.number}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  setShowQrModal(false);
                  setActiveScreen("customer");
                  toast.info(`Simulating customer scan for Table ${qrTable.number}`);
                }}
                className="py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-700 hover:bg-stone-100 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Simulate Scan
              </button>

              <button
                onClick={() => handleDownloadQR(qrTable.number)}
                className="py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs shadow-md shadow-[#FF5B32]/30 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Standee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {showEditTableModal && editTableData && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FF5B32] text-white flex items-center justify-center font-bold">
                  ✏️
                </div>
                <h3 className="font-black text-base text-stone-900">Edit Table Details</h3>
              </div>
              <button
                onClick={() => setShowEditTableModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestSubmitEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Table Identifier / Number</label>
                <input
                  type="text"
                  placeholder="e.g. T-12 or Table 12"
                  value={editTableData.number}
                  onChange={(e) => setEditTableData({ ...editTableData, number: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-900 font-bold focus:outline-none focus:border-[#FF5B32]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Floor Zone</label>
                  <select
                    value={editTableData.zone}
                    onChange={(e) => setEditTableData({ ...editTableData, zone: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-900 font-bold focus:outline-none focus:border-[#FF5B32]"
                  >
                    <option value="Main Dining">Main Dining</option>
                    <option value="Patio / Garden">Patio / Garden</option>
                    <option value="Rooftop">Rooftop</option>
                    <option value="VIP Lounge">VIP Lounge</option>
                    <option value="Bar Zone">Bar Zone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Seating Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editTableData.seats}
                    onChange={(e) => setEditTableData({ ...editTableData, seats: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-stone-50 border border-stone-300 text-xs text-stone-900 font-bold focus:outline-none focus:border-[#FF5B32]"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowEditTableModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs shadow-md shadow-[#FF5B32]/30 cursor-pointer"
                >
                  Update & Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && deleteTargetTable && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              🗑️
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-base">Delete Table {deleteTargetTable.number}?</h3>
              <p className="text-xs text-stone-500 font-medium mt-1">
                Are you sure you want to remove this table and its QR Standee? This action requires Manager PIN authorization.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeleteTargetTable(null);
                }}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 font-bold text-xs text-stone-700"
              >
                Cancel
              </button>

              <button
                onClick={handleRequestConfirmDelete}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-black text-xs text-white shadow-md cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager PIN Override Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-stone-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-base">Manager Security PIN</h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                {pendingAction?.type === "delete" ? `Delete ${pendingAction.data.number}` : `Edit ${pendingAction?.data.number}`} requires authorization.
              </p>
            </div>

            <input
              type="password"
              maxLength={6}
              placeholder="Enter Manager PIN"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full text-center text-xl font-mono tracking-widest p-3 rounded-xl border border-stone-300 font-black outline-none focus:border-[#FF5B32]"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPendingAction(null);
                }}
                className="py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 font-bold text-xs text-stone-700"
              >
                Cancel
              </button>

              <button
                onClick={verifyPinAndExecute}
                className="py-2.5 rounded-xl bg-stone-900 hover:bg-black font-black text-xs text-white shadow-md"
              >
                Authorize
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
