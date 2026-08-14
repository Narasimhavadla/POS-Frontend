"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bell,
  Volume2,
  VolumeX,
  ChefHat,
  Filter,
  Check,
  Maximize2,
  Sparkles,
  RotateCcw,
  Search,
  Timer
} from "lucide-react";
import { toast } from "sonner";

export default function KDSScreen() {
  const { store, getActiveTenant, getActiveBranch, updateOrderStatus, updateOrderItemStatus, updateOrderItemsAndStatus, orderWorkflowMode } = useAuth();

  const tenant = getActiveTenant();
  const branch = getActiveBranch();

  const allOrders = store.orders || [];

  // Filter orders by tenant and branch
  const branchOrders = allOrders.filter(
    (o) =>
      (!o.tenantId || !tenant?.id || o.tenantId === tenant?.id) &&
      (!o.branchId || o.branchId === branch?.id || o.branchId === branch?.code)
  );

  // Filter depending on Order Fulfillment Workflow
  const kdsOrders = branchOrders.filter((o) => {
    if (o.kdsClosed || o.status === "CLOSED" || o.status === "closed" || o.status === "voided" || o.status === "SERVED" || o.status === "served") return false;
    if (orderWorkflowMode === "WORKFLOW_1") {
      return o.status === "PREPARING" || o.status === "preparing" || o.status === "READY" || o.status === "ready";
    }
    return true;
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [itemCheckState, setItemCheckState] = useState({});
  const [now, setNow] = useState(Date.now());

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio chime play error:", e);
    }
  };

  const speakAnnouncement = (text) => {
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 0.8; // Deep male pitch setting

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const maleVoice =
          voices.find(
            (v) =>
              v.lang.startsWith("en") &&
              (v.name.includes("Male") ||
                v.name.includes("David") ||
                v.name.includes("Mark") ||
                v.name.includes("George") ||
                v.name.includes("James") ||
                v.name.includes("Guy") ||
                v.name.includes("Google US English"))
          ) || voices.find((v) => v.lang.startsWith("en"));
        if (maleVoice) utterance.voice = maleVoice;
      }
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e) {
      console.warn("Speech announcement error:", e);
      return false;
    }
  };

  // Pre-load synthesis voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  const kdsOrdersKey = kdsOrders.map((o) => o.id).join(",");
  const seenOrderIdsRef = useRef(new Set());
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    const currentIds = kdsOrders.map((o) => o.id).filter(Boolean);

    if (isInitialMountRef.current) {
      currentIds.forEach((id) => seenOrderIdsRef.current.add(id));
      isInitialMountRef.current = false;
      return;
    }

    const newUnseenOrders = kdsOrders.filter((o) => o.id && !seenOrderIdsRef.current.has(o.id));

    if (newUnseenOrders.length > 0) {
      newUnseenOrders.forEach((o) => seenOrderIdsRef.current.add(o.id));

      if (soundEnabled) {
        const latestOrder = newUnseenOrders[0];
        const isParcel =
          (latestOrder?.orderType || "").toLowerCase().includes("parcel") ||
          (latestOrder?.orderType || "").toLowerCase().includes("takeaway") ||
          (latestOrder?.tableNo || "").toLowerCase().includes("parcel");

        const announcementText = isParcel ? "New Parcel Arrived" : "New Order Received";

        playChime();
        setTimeout(() => speakAnnouncement(announcementText), 300);
      }
    }
  }, [kdsOrdersKey, soundEnabled]);

  // Live timer tick every 10 seconds to update time elapsed
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleItemCheckbox = (orderId, idx) => {
    const key = `${orderId}-${idx}`;
    setItemCheckState((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSendCheckedItemsToWaiter = (order) => {
    const items = order.items || [];
    const tableLabel = order.tableNo ? `Table ${order.tableNo}` : "Takeaway";
    const newlyCheckedIndices = [];

    const updatedItems = items.map((it, idx) => {
      const key = `${order.id}-${idx}`;
      const isCheckedInState = !!itemCheckState[key];
      const currentSt = (it.status || "").toUpperCase();

      if (isCheckedInState || currentSt === "READY" || currentSt === "SERVED") {
        if (isCheckedInState && currentSt !== "READY" && currentSt !== "SERVED") {
          newlyCheckedIndices.push(idx);
        }
        return { ...it, status: currentSt === "SERVED" ? "SERVED" : "READY" };
      }
      return { ...it, status: it.status || "PREPARING" };
    });

    const readyOrServedCount = updatedItems.filter(
      (it) => (it.status || "").toUpperCase() === "READY" || (it.status || "").toUpperCase() === "SERVED"
    ).length;

    if (newlyCheckedIndices.length === 0 && readyOrServedCount === 0) {
      toast.warning("Please check at least 1 item checkbox to send to Waiter Hub");
      return;
    }

    if (newlyCheckedIndices.length === 0) {
      toast.info("Selected item(s) are already sent to Waiter Hub");
      return;
    }

    // Clear checked state for dispatched items
    newlyCheckedIndices.forEach((idx) => {
      const key = `${order.id}-${idx}`;
      setItemCheckState((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    });

    const allReadyOrServed = readyOrServedCount === items.length;
    const finalStatus = allReadyOrServed ? "READY" : "PREPARING";

    updateOrderItemsAndStatus(order.id, updatedItems, finalStatus);

    toast.success(`Sent ${newlyCheckedIndices.length} Ready Item(s) to Waiter Hub!`, {
      description: `${tableLabel} • Waitstaff notified for immediate dish pickup.`
    });
  };

  const handleCloseKDSTicket = (order) => {
    const items = order.items || [];
    const tableLabel = order.tableNo ? `Table ${order.tableNo}` : "Takeaway";

    // Mark remaining items as READY when kitchen manually closes ticket
    const updatedItems = items.map((it) => {
      const st = (it.status || "").toUpperCase();
      if (st !== "SERVED") {
        return { ...it, status: "READY" };
      }
      return it;
    });

    updateOrderItemsAndStatus(order.id, updatedItems, "READY", { kdsClosed: true });

    toast.success(`Ticket #${order.kotNo || order.id} Closed from KDS`, {
      description: `Ticket cleared from KDS for ${tableLabel}. Ready items remain active in Waiter Hub.`
    });
  };

  const handleBumpStatus = (orderId, currentStatus) => {
    const targetOrder = kdsOrders.find((o) => o.id === orderId);
    if (targetOrder) {
      handleCloseKDSTicket(targetOrder);
    }
  };

  function getMinutesElapsed(dateStr) {
    if (!dateStr) return 0;
    const diff = Math.floor((now - new Date(dateStr).getTime()) / 60000);
    return diff > 0 ? diff : 0;
  }

  // Calculate kitchen metrics
  const totalActive = kdsOrders.length;
  const preparingCount = kdsOrders.filter((o) => (o.status || '').toUpperCase() === "PREPARING").length;
  const readyCount = kdsOrders.filter((o) => (o.status || '').toUpperCase() === "READY").length;
  const delayedCount = kdsOrders.filter((o) => getMinutesElapsed(o.createdAt) >= 15).length;
  const parcelCount = kdsOrders.filter((o) =>
    (o.orderType || '').toLowerCase().includes('parcel') ||
    (o.orderType || '').toLowerCase().includes('takeaway') ||
    (o.tableNo || '').toLowerCase().includes('parcel')
  ).length;

  const filteredOrders = kdsOrders.filter((o) => {
    const isParcelOrder =
      (o.orderType || '').toLowerCase().includes('parcel') ||
      (o.orderType || '').toLowerCase().includes('takeaway') ||
      (o.tableNo || '').toLowerCase().includes('parcel');

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "parcel"
        ? isParcelOrder
        : statusFilter === "dinein"
        ? !isParcelOrder
        : statusFilter === "delayed"
        ? getMinutesElapsed(o.createdAt) >= 15
        : (o.status || '').toLowerCase() === statusFilter.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      (o.tableNo || o.tableNumber || "").toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.kotNo || o.id || "").toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.items || []).some((i) => (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  // Item summary across all active tickets
  const itemSummary = kdsOrders.reduce((acc, order) => {
    (order.items || []).forEach((it) => {
      acc[it.name] = (acc[it.name] || 0) + (it.qty || 1);
    });
    return acc;
  }, {});

  const [isDark, setIsDark] = useState(true);

  const topItems = Object.entries(itemSummary).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className={`h-full flex flex-col gap-3 overflow-hidden p-4 rounded-3xl font-sans shadow-2xl transition-colors duration-200 ${
      isDark ? "bg-stone-950 text-stone-100 border border-stone-800" : "bg-stone-100 text-stone-900 border border-stone-300"
    }`}>

      {/* Top KDS Header Bar */}
      <div className={`p-3.5 px-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg transition-colors ${
        isDark ? "bg-stone-900/90 border-stone-800" : "bg-white border-stone-200"
      }`}>
        
        {/* Left Title */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 flex items-center justify-center text-stone-950 shadow-lg shadow-orange-500/25">
            <Flame className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h1 className={`font-black text-lg tracking-tight flex items-center gap-2 ${isDark ? "text-white" : "text-stone-900"}`}>
              SmartServe <span className="text-amber-500">KDS</span>
            </h1>
            <p className={`text-xs font-medium ${isDark ? "text-stone-400" : "text-stone-500"}`}>
              Mode: <span className="text-amber-600 dark:text-amber-300 font-bold">{orderWorkflowMode === "WORKFLOW_1" ? "Cashier Verified" : "Direct Kitchen Dispatch"}</span>
            </p>
          </div>
        </div>

        {/* Center: Search & Filter Tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-48">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table, KOT, item..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 transition-colors ${
                isDark ? "bg-stone-800/80 border-stone-700/70 text-stone-100 placeholder-stone-400" : "bg-stone-50 border-stone-300 text-stone-900 placeholder-stone-400"
              }`}
            />
          </div>

          <div className={`flex items-center gap-1 p-1 rounded-xl border ${
            isDark ? "bg-stone-800/60 border-stone-700/50" : "bg-stone-100 border-stone-300"
          }`}>
            {[
              { id: "all", label: "All", count: totalActive },
              { id: "parcel", label: "📦 Parcel", count: parcelCount },
              { id: "dinein", label: "🍽️ Dine-In", count: totalActive - parcelCount },
              { id: "preparing", label: "Preparing", count: preparingCount },
              { id: "ready", label: "Ready", count: readyCount },
              { id: "delayed", label: "Delayed", count: delayedCount, color: "text-red-400" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-[#FF5B32] text-white shadow-md shadow-[#FF5B32]/30"
                    : isDark ? "text-stone-300 hover:bg-stone-700/60" : "text-stone-600 hover:bg-stone-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : isDark ? "bg-stone-900/60 text-stone-400" : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Alert Toggle Switch */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 px-3 rounded-xl border font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              soundEnabled
                ? isDark ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-sm" : "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                : isDark ? "bg-stone-800/50 text-stone-500 border-stone-700/50 opacity-70" : "bg-stone-100 text-stone-400 border-stone-200 opacity-70"
            }`}
            title="Toggle New Order Audio Alert"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
            <span>{soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF"}</span>
          </button>

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 px-3 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
              isDark
                ? "bg-stone-800 text-amber-300 border-stone-700 hover:bg-stone-700"
                : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
            }`}
            title="Toggle Light / Dark Theme"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">{isDark ? "Dark Theme" : "Light Theme"}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => {
              if (!documentfullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark ? "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700" : "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
            }`}
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Item Quantity Live Summary Bar */}
      {topItems.length > 0 && (
        <div className={`p-2 px-4 rounded-xl border flex items-center justify-between text-xs overflow-x-auto ${
          isDark ? "bg-stone-900/60 border-stone-800/80 text-stone-300" : "bg-white border-stone-200 text-stone-700 shadow-sm"
        }`}>
          <div className="flex items-center gap-2 font-bold text-stone-400 uppercase text-[10px] tracking-wider shrink-0">
            {/* <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" /> */}
            <span>Preparation Queue:</span>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto shrink-0">
            {topItems.map(([itemName, qty]) => (
              <span
                key={itemName}
                className={`px-2.5 py-0.5 rounded-lg border font-semibold flex items-center gap-1.5 ${
                  isDark ? "bg-stone-800/80 border-stone-700/60 text-stone-200" : "bg-stone-100 border-stone-300 text-stone-800"
                }`}
              >
                <span>{itemName}</span>
                <span className="bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono text-xs px-1.5 py-0.2 rounded font-black">
                  x{qty}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KDS Order Cards Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pr-1">
        {filteredOrders.map((order) => {
          const isPreparing = order.status.toUpperCase() === "PREPARING" || order.status.toUpperCase() === "PENDING";
          const isReady = order.status.toUpperCase() === "READY";
          const minutesElapsed = getMinutesElapsed(order.createdAt);
          const isDelayed = minutesElapsed >= 15;

          const isParcel =
            (order.orderType || '').toLowerCase().includes('parcel') ||
            (order.orderType || '').toLowerCase().includes('takeaway') ||
            (order.tableNo || '').toLowerCase().includes('parcel');

          const totalItems = (order.items || []).length;
          const checkedItemsCount = (order.items || []).filter((it, idx) => {
            const st = (it.status || '').toUpperCase();
            return st === "READY" || st === "SERVED" || !!itemCheckState[`${order.id}-${idx}`];
          }).length;
          const isAllChecked = totalItems > 0 && checkedItemsCount === totalItems;

          return (
            <div
              key={order.id}
              className={`rounded-2xl border-2 p-3.5 flex flex-col justify-between space-y-3 shadow-xl transition-all relative overflow-hidden ${
                isParcel
                  ? "bg-purple-950/30 border-purple-500/70 ring-2 ring-purple-500/30"
                  : isDelayed
                  ? "bg-red-950/20 border-red-500/60 ring-2 ring-red-500/20"
                  : isReady
                  ? isDark ? "bg-emerald-950/20 border-emerald-500/50" : "bg-emerald-50 border-emerald-400"
                  : isDark ? "bg-stone-900/90 border-amber-500/40" : "bg-white border-amber-300"
              }`}
            >
              {/* Parcel / Takeaway High-Visibility Chef Banner */}
              {isParcel && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider py-1 px-3 text-center -mx-3.5 -mt-3.5 mb-1 flex items-center justify-center gap-1.5 shadow-md">
                  <span className="text-base">📦</span>
                  <span>PARCEL / TAKEAWAY ORDER — PACKING REQUIRED</span>
                </div>
              )}

              {/* Delayed Flash Top Banner */}
              {!isParcel && isDelayed && (
                <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-wider py-0.5 px-2 text-center -mx-3.5 -mt-3.5 mb-1 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>OVERDUE - PREPARE IMMEDIATELY ({minutesElapsed}m)</span>
                </div>
              )}

              {/* Card Top Header */}
              <div className={`flex items-start justify-between border-b pb-2.5 ${isDark ? "border-stone-800/80" : "border-stone-200"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-black text-lg ${isDark ? "text-white" : "text-stone-900"}`}>
                      {isParcel ? (order.tableNo || "Parcel") : `Table ${order.tableNo || order.tableNumber || "Direct"}`}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                      isDark ? "bg-stone-800 text-stone-400 border-stone-700" : "bg-stone-100 text-stone-600 border-stone-300"
                    }`}>
                      #{order.kotNo || order.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isParcel ? "bg-purple-500/20 text-purple-300 border border-purple-500/40" : "bg-stone-800 text-stone-300"
                    }`}>
                      {isParcel ? "📦 PARCEL / TAKEAWAY" : `🍽️ ${order.orderType || "Dine-In"}`}
                    </span>
                    <span className="text-stone-400">•</span>
                    <div className={`flex items-center gap-1 text-[11px] font-bold ${isDelayed ? "text-red-500 font-black" : isDark ? "text-stone-400" : "text-stone-600"}`}>
                      <Timer className="w-3 h-3" />
                      <span>{minutesElapsed} min ago</span>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isDelayed
                      ? "bg-red-500/20 text-red-300 border border-red-500/50 animate-pulse"
                      : isReady
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  }`}
                >
                  {isDelayed ? "OVERDUE" : order.status}
                </span>
              </div>

              {/* Items Interactive List */}
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1 px-1">
                  <span>Order Items ({totalItems})</span>
                  <span>{checkedItemsCount} / {totalItems} Ready ({totalItems > 0 ? Math.round((checkedItemsCount / totalItems) * 100) : 0}%)</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-stone-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-1.5 transition-all duration-300"
                    style={{ width: `${totalItems > 0 ? (checkedItemsCount / totalItems) * 100 : 0}%` }}
                  />
                </div>

                {(order.items || []).map((it, idx) => {
                  const key = `${order.id}-${idx}`;
                  const itemSt = (it.status || "").toUpperCase();
                  const isReadyOrServed = itemSt === "READY" || itemSt === "SERVED";
                  const isChecked = !!itemCheckState[key] || isReadyOrServed;

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleItemCheckbox(order.id, idx)}
                      className={`flex justify-between items-center p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-emerald-950/40 border-emerald-500/40 text-stone-200"
                          : "bg-stone-950/80 border-stone-800/80 hover:border-amber-500/40 text-stone-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 pr-2 flex-1 min-w-0">
                        {/* Checkbox */}
                        <div
                          className={`w-4.5 h-4.5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                            isChecked
                              ? "bg-emerald-500 border-emerald-500 text-stone-950"
                              : "border-stone-600 bg-stone-900"
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className={`font-bold truncate ${isReadyOrServed ? "line-through text-stone-400" : ""}`}>
                          {it.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-black text-xs px-2 py-0.5 rounded ${isChecked ? "text-emerald-400 bg-emerald-950/60" : "text-amber-400 bg-amber-500/10"}`}>
                          x{it.qty || 1}
                        </span>
                        {isReadyOrServed && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {itemSt === "SERVED" ? "SERVED" : "READY"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Instructions / Notes */}
              {order.notes && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-amber-300 text-xs font-medium">
                  <span className="font-bold">Note:</span> {order.notes}
                </div>
              )}

              {/* Card Action Buttons at Bottom */}
              <div className="space-y-2 pt-1">
                {/* Send Selected Items Button */}
                <button
                  onClick={() => {
                    const newlySelectedCount = (order.items || []).filter((it, idx) => {
                      const st = (it.status || '').toUpperCase();
                      return st !== "READY" && st !== "SERVED" && !!itemCheckState[`${order.id}-${idx}`];
                    }).length;

                    if (newlySelectedCount === 0) {
                      toast.warning("Please select at least 1 item checkbox above to send to Waiter Hub");
                    } else {
                      handleSendCheckedItemsToWaiter(order);
                    }
                  }}
                  className={`w-full py-2.5 rounded-xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    (order.items || []).some((it, idx) => {
                      const st = (it.status || '').toUpperCase();
                      return st !== "READY" && st !== "SERVED" && !!itemCheckState[`${order.id}-${idx}`];
                    })
                      ? "bg-gradient-to-r from-amber-500 to-[#FF5B32] hover:opacity-90 text-stone-950 font-black shadow-md animate-pulse"
                      : "bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-750"
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  {(() => {
                    const newlyCount = (order.items || []).filter((it, idx) => {
                      const st = (it.status || '').toUpperCase();
                      return st !== "READY" && st !== "SERVED" && !!itemCheckState[`${order.id}-${idx}`];
                    }).length;
                    return newlyCount > 0
                      ? `Send Selected ${newlyCount} Item(s) to Waiter →`
                      : "Select Items Above & Send to Waiter →";
                  })()}
                </button>

                {/* Close Ticket from KDS button */}
                <button
                  onClick={() => handleCloseKDSTicket(order)}
                  className="w-full py-2 rounded-xl border border-stone-700 bg-stone-900/80 hover:bg-red-950/40 hover:border-red-500/50 hover:text-red-300 text-stone-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Remove ticket from KDS display (does not close Waiter Hub order)"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Close Ticket from KDS</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredOrders.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-stone-500 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-600 shadow-inner">
              <ChefHat className="w-8 h-8 stroke-1" />
            </div>
            <p className="text-base font-bold text-stone-300">No active kitchen tickets</p>
            <p className="text-xs text-stone-500 max-w-sm text-center">
              {orderWorkflowMode === "WORKFLOW_1"
                ? "Orders approved by Cashier POS will automatically display here for kitchen preparation."
                : "New incoming orders will route directly to this display line."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
