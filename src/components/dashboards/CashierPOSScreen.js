"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/apiClient";
import { toast } from "sonner";
import {
  CreditCard,
  FileText,
  Lock,
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  Printer,
  Utensils,
  Building2,
  DollarSign,
  AlertTriangle,
  Receipt,
  Sparkles,
  Shield,
  Clock,
  BellRing,
  Check,
  Send,
  Flame
} from "lucide-react";

export default function CashierPOSScreen() {
  const {
    user,
    store,
    setStore,
    getActiveTenant,
    getActiveBranch,
    updateOrderStatus,
    updateOrderItemsAndStatus,
    addOrder,
    updateTableStatus,
    orderWorkflowMode,
    currencySymbol: globalCurrency,
    taxName: globalTaxName,
    taxRate: globalTaxRate,
    isManagerUnlocked
  } = useAuth();

  const tenant = getActiveTenant();
  const activeBranch = getActiveBranch();
  const currencySymbol = globalCurrency || tenant?.currencySymbol || "₹";
  const taxName = globalTaxName || "GST";
  const currentTaxRate = globalTaxRate !== undefined ? globalTaxRate : 5.0;

  const categories = (store.categories || []).filter((c) => c.tenantId === tenant?.id);
  const menuItems = (store.menuItems || []).filter((m) => m.tenantId === tenant?.id && m.isAvailable !== false);
  const tables = (store.tables || []).filter(
    (t) => t.tenantId === tenant?.id && (!t.branchId || t.branchId === activeBranch?.id)
  );

  const activeOrders = (store.orders || []).filter(
    (o) =>
      (!o.tenantId || !tenant?.id || o.tenantId === tenant?.id || o.tenantId === "tenant-spice-bistro") &&
      o.paymentStatus !== "PAID" &&
      o.paymentStatus !== "paid" &&
      o.status !== "CLOSED" &&
      o.status !== "closed" &&
      o.status !== "voided" &&
      o.status !== "VOIDED"
  );

  const activeParcelOrders = activeOrders.filter(
    (o) => o.orderType === "Parcel" || (o.tableNo && String(o.tableNo).startsWith("Parcel"))
  );

  // Orders awaiting Cashier Approval (for Workflow: Customer/Waiter -> Cashier Approval -> KDS)
  const pendingApprovalOrders = orderWorkflowMode === "WORKFLOW_2" ? [] : activeOrders.filter((o) => {
    const mainSt = String(o.status || "").toUpperCase();
    if (["PENDING", "PENDING_CONFIRMATION", "WAITING_APPROVAL"].includes(mainSt)) return true;

    const items = Array.isArray(o.items)
      ? o.items
      : (typeof o.items === "string" ? JSON.parse(o.items || "[]") : []);

    return items.some((it) => {
      const st = String(it.status || "").toUpperCase();
      return st === "PENDING_CONFIRMATION" || st === "PENDING" || st === "WAITING_APPROVAL";
    });
  });

  const [selectedTableNumber, setSelectedTableNumber] = useState(tables[0]?.number || "T-01");
  const [selectedCatId, setSelectedCatId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("UPI");
  const [appliedDiscountPercent, setAppliedDiscountPercent] = useState(0);
  const [voidReasonInput, setVoidReasonInput] = useState("");

  // View Toggle: POS Billing vs Pending Approvals
  const [posTab, setPosTab] = useState("billing"); // "billing" | "approvals"

  // Track previous count of pending approval orders to prevent duplicate initial/re-render toasts
  const prevPendingCountRef = useRef(0);

  // Auto-highlight or notify when a new pending order arrives under Workflow 1
  useEffect(() => {
    if (orderWorkflowMode === "WORKFLOW_1" && pendingApprovalOrders.length > 0 && posTab !== "approvals") {
      if (pendingApprovalOrders.length > prevPendingCountRef.current) {
        toast.info(`🔔 ${pendingApprovalOrders.length} New QR Order(s) Awaiting Cashier Verification!`, {
          action: {
            label: "View Approvals",
            onClick: () => setPosTab("approvals")
          }
        });
      }
    }
    prevPendingCountRef.current = pendingApprovalOrders.length;
  }, [pendingApprovalOrders.length, orderWorkflowMode, posTab]);

  // Modals
  const [showAddDishModal, setShowAddDishModal] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [newDishCatId, setNewDishCatId] = useState(categories[0]?.id || "cat-starters");
  const [newDishPrice, setNewDishPrice] = useState("280");
  const [newDishDesc, setNewDishDesc] = useState("");
  const [newDishIsVeg, setNewDishIsVeg] = useState(true);

  // ─── Shift Drawer State (backend-connected) ───────────────────────────────────
  const [activeShift, setActiveShift] = useState(null);   // ShiftDrawer record from backend
  const [shiftLoading, setShiftLoading] = useState(false);
  const [openingFloatInput, setOpeningFloatInput] = useState("");  // input when starting shift
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [actualCashInput, setActualCashInput] = useState("");
  const [zReport, setZReport] = useState(null);

  // Convenience aliases used in the modal
  const shiftActive = !!activeShift;
  const openingFloat = activeShift?.openingFloat ?? 0;

  // Split & Receipt modals
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [receiptOrder, setReceiptOrder] = useState(null);

  // Manager PIN Override & Custom Discount modal states
  const [pinConfig, setPinConfig] = useState({ isOpen: false, title: "", onSuccess: null });
  const [enteredPin, setEnteredPin] = useState("");
  const [showCustomDiscountModal, setShowCustomDiscountModal] = useState(false);
  const [customDiscountValue, setCustomDiscountValue] = useState("");
  const [customDiscountPin, setCustomDiscountPin] = useState("");

  const verifyManagerPin = async (pinToVerify) => {
    if (!pinToVerify || String(pinToVerify).trim() === "") return false;
    try {
      const res = await api.verifyManagerPin(String(pinToVerify).trim());
      return !!(res && res.success);
    } catch (err) {
      return false;
    }
  };

  const normalizeTable = (num) => String(num || "").trim().toUpperCase().replace(/^TABLE\s*/, "").replace(/^T-/, "");

  const currentLiveOrder = activeOrders.find(
    (o) => normalizeTable(o.tableNo || o.tableNumber) === normalizeTable(selectedTableNumber)
  );

  const rawOrderItems = currentLiveOrder
    ? Array.isArray(currentLiveOrder.items)
      ? currentLiveOrder.items
      : typeof currentLiveOrder.items === "string"
      ? (JSON.parse(currentLiveOrder.items || "[]"))
      : []
    : [];

  const tableCart = rawOrderItems.map((it) => ({
    id: it.id || it.menuItemId || it.name,
    name: it.name,
    price: Number(it.price || it.unitPrice || it.finalPrice || 0),
    qty: Number(it.qty || it.quantity || 1)
  }));

  const rawSubtotal = tableCart.reduce((sum, i) => sum + (i.price * i.qty), 0);
  const discountAmount = Math.round((rawSubtotal * appliedDiscountPercent) / 100);
  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const taxGST = Math.round((subtotal * currentTaxRate) / 100);
  const totalPayable = subtotal + taxGST;

  const filteredItems = menuItems.filter((i) => {
    const matchesCat = selectedCatId === "all" || i.categoryId === selectedCatId;
    const matchesSearch = !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Live timer tick every 1000ms (1 second) to compute exact processing duration
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load active shift from backend on mount
  useEffect(() => {
    api.getActiveShift().then((res) => {
      if (res.success && res.data) setActiveShift(res.data);
    }).catch(() => {});
  }, []);

  const handleOpenShift = async () => {
    const float = parseFloat(openingFloatInput) || 0;
    setShiftLoading(true);
    try {
      const res = await api.openShift({ openingFloat: float, branchId: activeBranch?.id });
      if (res.success) {
        setActiveShift(res.data);
        setZReport(null);
        toast.success(`Shift opened with ${currencySymbol}${float.toFixed(2)} float.`);
      } else {
        toast.error(res.message || "Failed to open shift.");
      }
    } catch (e) {
      toast.error("Could not reach server.");
    } finally {
      setShiftLoading(false);
      setOpeningFloatInput("");
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    const counted = parseFloat(actualCashInput);
    setShiftLoading(true);
    try {
      const res = await api.closeShift(activeShift.id, { actualCash: isNaN(counted) ? null : counted });
      if (res.success) {
        setZReport(res.data);
        setActiveShift(null);
        toast.success("Shift closed. Z-Report generated.");
      } else {
        toast.error(res.message || "Failed to close shift.");
      }
    } catch (e) {
      toast.error("Could not reach server.");
    } finally {
      setShiftLoading(false);
      setActualCashInput("");
    }
  };

  const getOrderElapsedInfo = (createdAtStr) => {
    if (!createdAtStr) return null;
    const diffMs = Math.max(0, now - new Date(createdAtStr).getTime());
    const totalSec = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const formatted =
      mins >= 60
        ? `${Math.floor(mins / 60)}h ${mins % 60}m`
        : `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
    return { formatted, mins, secs, totalSec };
  };

  // Parcel / Takeaway Order Mode & View Mode State ("tables" | "parcels")
  const [orderViewMode, setOrderViewMode] = useState("tables");
  const [isParcelMode, setIsParcelMode] = useState(false);
  const [parcelCustomerName, setParcelCustomerName] = useState("");

  const getNextParcelId = () => {
    let maxCount = 0;
    (store.orders || []).forEach((o) => {
      const tNo = o.tableNo || o.tableNumber || o.orderNumber || "";
      const match = String(tNo).match(/P-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxCount) maxCount = num;
      }
    });
    return `P-${String(maxCount + 1).padStart(6, '0')}`;
  };

  const handleStartParcelOrder = () => {
    setIsParcelMode(true);
    setOrderViewMode("parcels");
    const parcelId = getNextParcelId();
    setSelectedTableNumber(parcelId);
  };

  const handleSendParcelToKDS = () => {
    if (!currentLiveOrder && tableCart.length === 0) return;
    const targetOrder = currentLiveOrder || {
      id: `ORD-${Date.now()}`,
      kotNo: getNextKotNo(),
      tenantId: tenant?.id || "tenant-spice-bistro",
      branchId: activeBranch?.id || "br-1",
      tableNo: selectedTableNumber,
      orderType: "Parcel",
      items: tableCart,
      totalAmount: totalPayable,
      status: "PREPARING",
      createdAt: new Date().toISOString()
    };

    const targetId = targetOrder.id;

    // Send status update to PREPARING so KDS picks it up
    api.updateOrderStatus(targetId, {
      status: "PREPARING",
      orderType: "Parcel",
      tableNo: selectedTableNumber,
      kotNo: targetOrder.kotNo,
      items: tableCart
    }).then(() => {
      toast.success(`Parcel Order ${targetOrder.kotNo || selectedTableNumber} Sent to Kitchen!`, {
        description: "Kitchen Display (KDS) has received the order for preparation."
      });
    }).catch((e) => console.warn("Send to KDS error:", e.message));

    setStore((prev) => {
      const orders = [...(prev.orders || [])];
      const idx = orders.findIndex((o) => o.id === targetId || (o.tableNo && normalizeTable(o.tableNo) === normalizeTable(selectedTableNumber)));
      if (idx !== -1) {
        orders[idx] = { ...orders[idx], status: "PREPARING", items: tableCart };
      } else {
        orders.unshift({ ...targetOrder, status: "PREPARING" });
      }
      return { ...prev, orders };
    });
  };

  const getNextKotNo = () => {
    const tenantOrders = (store.orders || []).filter((o) => !o.tenantId || o.tenantId === tenant?.id);
    let maxNum = 100000;
    tenantOrders.forEach((o) => {
      const kotStr = o.kotNo || o.orderNumber;
      if (kotStr) {
        const match = String(kotStr).match(/KOT-(\d+)/i);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });
    return `KOT-${maxNum + 1}`;
  };

  const handleAddItemToCart = (item) => {
    let targetOrder = currentLiveOrder;
    const isParcel = isParcelMode || selectedTableNumber.startsWith("Parcel");

    if (!targetOrder) {
      targetOrder = {
        id: `ORD-${Date.now()}`,
        kotNo: getNextKotNo(),
        tenantId: tenant?.id || "tenant-spice-bistro",
        branchId: activeBranch?.id || "br-1",
        tableNo: selectedTableNumber,
        tableNumber: selectedTableNumber,
        orderType: isParcel ? "Parcel" : "Dine-In",
        status: targetOrder?.status === "PREPARING" ? "PREPARING" : "DRAFT",
        paymentMethod: selectedPaymentMethod,
        items: [],
        totalAmount: 0,
        createdAt: new Date().toISOString()
      };
    }

    const existingRaw = targetOrder?.items;
    const currentItems = Array.isArray(existingRaw)
      ? existingRaw
      : typeof existingRaw === "string"
      ? (JSON.parse(existingRaw || "[]"))
      : [];

    const updatedItems = [...currentItems];
    const existingIdx = updatedItems.findIndex((i) => i.id === item.id || i.name === item.name);
    if (existingIdx !== -1) {
      const currentQty = Number(updatedItems[existingIdx].qty || updatedItems[existingIdx].quantity || 1);
      updatedItems[existingIdx] = {
        ...updatedItems[existingIdx],
        qty: currentQty + 1
      };
    } else {
      updatedItems.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    }

    const newSub = updatedItems.reduce((s, x) => s + Number(x.price || 0) * Number(x.qty || 1), 0);
    const newTax = Math.round(newSub * 0.05);
    const newTotal = newSub + newTax;

    const savedOrder = {
      ...targetOrder,
      items: updatedItems,
      totalAmount: newTotal
    };

    addOrder(savedOrder);

    if (!isParcel) {
      const matchedTable = tables.find((t) => normalizeTable(t.number) === normalizeTable(selectedTableNumber));
      if (matchedTable) {
        updateTableStatus(matchedTable.id, "occupied");
      }
    }
  };

  const handleApproveOrder = (orderId) => {
    const targetOrder = activeOrders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const rawItems = Array.isArray(targetOrder.items)
      ? targetOrder.items
      : (typeof targetOrder.items === "string" ? JSON.parse(targetOrder.items || "[]") : []);

    const updatedItems = rawItems.map((it) => {
      const st = String(it.status || "").toUpperCase();
      if (st === "PENDING_CONFIRMATION" || st === "PENDING" || st === "WAITING_APPROVAL" || !st) {
        return { ...it, status: "PREPARING" };
      }
      return it;
    });

    updateOrderItemsAndStatus(targetOrder.id, updatedItems, "PREPARING");

    const matchedTable = tables.find((t) => normalizeTable(t.number) === normalizeTable(targetOrder.tableNo || targetOrder.tableNumber));
    if (matchedTable) {
      updateTableStatus(matchedTable.id, "occupied");
    }
    setSelectedTableNumber(targetOrder.tableNo || targetOrder.tableNumber);
    toast.success(`Approved newly added items for Table ${targetOrder.tableNo || targetOrder.tableNumber}! Sent to Kitchen KDS.`);
  };

  const handleQtyChange = (itemId, delta) => {
    if (!currentLiveOrder) return;
    const raw = currentLiveOrder.items;
    const itemsList = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
      ? (JSON.parse(raw || "[]"))
      : [];

    const items = [...itemsList];
    const index = items.findIndex((i) => i.id === itemId || i.name === itemId || i.menuItemId === itemId);
    if (index !== -1) {
      const currentQty = Number(items[index].qty || items[index].quantity || 1);
      if (currentQty + delta > 0) {
        items[index] = { ...items[index], qty: currentQty + delta };
      } else {
        items.splice(index, 1);
      }
      const newSub = items.reduce((s, x) => s + Number(x.price || 0) * Number(x.qty || 1), 0);
      const newTotal = newSub + Math.round(newSub * 0.05);

      addOrder({
        ...currentLiveOrder,
        items,
        totalAmount: newTotal
      });
    }
  };

  const handleCreateDishFromPOS = () => {
    if (!newDishName || !newDishPrice) return;
    const newDish = {
      id: `item-${Date.now()}`,
      tenantId: tenant.id,
      categoryId: newDishCatId,
      name: newDishName,
      price: parseFloat(newDishPrice) || 0,
      description: newDishDesc || "Fresh chef preparation.",
      isVeg: newDishIsVeg,
      isChefSpecial: true,
      isAvailable: true,
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80"
    };

    setStore((prev) => ({
      ...prev,
      menuItems: [...(prev.menuItems || []), newDish]
    }));

    api.createMenuItem(newDish).catch((e) => console.warn("Backend dish creation fallback:", e.message));

    setNewDishName("");
    setNewDishPrice("280");
    setNewDishDesc("");
    setShowAddDishModal(false);
  };

  const handleCancelDraftOrder = () => {
    if (!currentLiveOrder && tableCart.length === 0) return;

    const targetId = currentLiveOrder?.id;
    const isUnsubmittedDraft = !currentLiveOrder || currentLiveOrder.status === "DRAFT" || currentLiveOrder.status === "PENDING_CONFIRMATION" || tableCart.length === 0;

    if (targetId) {
      api.updateOrderStatus(targetId, {
        status: "CANCELLED",
        paymentStatus: "VOIDED",
        tableNo: selectedTableNumber,
        voidReason: "Draft order cancelled by Cashier"
      }).catch((e) => console.warn("Cancel draft backend error:", e.message));

      setStore((prev) => {
        const orders = (prev.orders || []).filter(
          (o) => !(o.id === targetId || (o.tableNo && normalizeTable(o.tableNo) === normalizeTable(selectedTableNumber) && (o.status === "DRAFT" || o.status === "PENDING_CONFIRMATION" || (o.items && o.items.length === 0))))
        );
        return { ...prev, orders };
      });
    }

    const matchedTable = tables.find((t) => normalizeTable(t.number) === normalizeTable(selectedTableNumber));
    if (matchedTable) {
      updateTableStatus(matchedTable.id, "vacant");
    }

    setAppliedDiscountPercent(0);
    toast.success(`Cancelled Draft Order for Table ${selectedTableNumber}`);
  };

  const handleRequestVoidOrder = () => {
    if (!currentLiveOrder && tableCart.length === 0) return;

    // If order is an unsent/draft order, allow immediate cancellation without PIN
    if (!currentLiveOrder || currentLiveOrder.status === "DRAFT" || currentLiveOrder.status === "PENDING_CONFIRMATION") {
      handleCancelDraftOrder();
      return;
    }

    setVoidReasonInput("");
    setPinConfig({
      isOpen: true,
      title: `Void Order for Table ${selectedTableNumber}`,
      isVoidAction: true,
      onSuccess: (enteredReason) => {
        const orderReason = enteredReason || voidReasonInput || "Manager void authorization";
        const orderToVoid = currentLiveOrder || {
          id: `ORD-${Date.now()}`,
          kotNo: getNextKotNo(),
          tenantId: tenant.id,
          branchId: activeBranch.id,
          tableNo: selectedTableNumber,
          orderType: "Dine-In",
          items: tableCart,
          totalAmount: totalPayable,
          status: "VOIDED",
          paymentStatus: "VOIDED",
          voidReason: orderReason,
          createdAt: new Date().toISOString()
        };

        const targetId = orderToVoid.id;

        // Single backend API call — the backend sets status + paymentStatus to VOIDED,
        // frees the table, and broadcasts via socket to all clients
        api.updateOrderStatus(targetId, {
          status: "VOIDED",
          paymentStatus: "VOIDED",
          tableNo: selectedTableNumber,
          kotNo: orderToVoid.kotNo,
          orderNumber: orderToVoid.orderNumber || orderToVoid.kotNo,
          voidReason: orderReason
        }).catch((e) => console.warn("Void order backend error:", e.message));

        // Immediately update local store (single source of truth update)
        setStore((prev) => {
          const orders = [...(prev.orders || [])];
          const existingIdx = orders.findIndex(
            (o) => o.id === targetId || o.kotNo === orderToVoid.kotNo || (o.tableNo && normalizeTable(o.tableNo) === normalizeTable(selectedTableNumber) && o.status !== "CLOSED" && o.status !== "VOIDED")
          );
          if (existingIdx !== -1) {
            orders[existingIdx] = { ...orders[existingIdx], status: "VOIDED", paymentStatus: "VOIDED", voidReason: orderReason };
          } else {
            orders.unshift({ ...orderToVoid, status: "VOIDED", paymentStatus: "VOIDED", voidReason: orderReason });
          }
          return { ...prev, orders };
        });

        const matchedTable = tables.find((t) => normalizeTable(t.number) === normalizeTable(selectedTableNumber));
        if (matchedTable) {
          updateTableStatus(matchedTable.id, "vacant");
        }

        toast.success(`Voided Order for Table ${selectedTableNumber}`, {
          description: `Reason: ${orderReason}`
        });
      }
    });
  };

  const handleProcessCheckout = () => {
    if (tableCart.length === 0) return;

    const finalOrder = {
      ...(currentLiveOrder || {}),
      id: currentLiveOrder?.id || `ORD-${Date.now()}`,
      kotNo: currentLiveOrder?.kotNo || getNextKotNo(),
      tenantId: tenant.id,
      branchId: activeBranch.id,
      tableNo: selectedTableNumber,
      orderType: "Dine-In",
      paymentMethod: selectedPaymentMethod,
      paymentStatus: "PAID",
      status: "CLOSED",
      items: tableCart,
      totalAmount: totalPayable,
      createdAt: currentLiveOrder?.createdAt || new Date().toISOString()
    };

    if (currentLiveOrder) {
      updateOrderStatus(currentLiveOrder.id, "CLOSED", selectedPaymentMethod, {
        total: totalPayable,
        subtotal: subtotal,
        tax: taxGST
      });
    } else {
      api.createPosOrder(finalOrder).catch((e) => console.warn("Checkout order save:", e.message));
    }

    setStore((prev) => {
      const existingIdx = (prev.orders || []).findIndex((o) => o.id === finalOrder.id);
      let orders;
      if (existingIdx !== -1) {
        orders = [...prev.orders];
        orders[existingIdx] = { ...orders[existingIdx], status: "CLOSED", paymentStatus: "PAID", paymentMethod: selectedPaymentMethod };
      } else {
        orders = [finalOrder, ...(prev.orders || [])];
      }
      return { ...prev, orders };
    });

    const matchedTable = tables.find((t) => normalizeTable(t.number) === normalizeTable(selectedTableNumber));
    if (matchedTable) {
      updateTableStatus(matchedTable.id, "vacant");
    }

    setAppliedDiscountPercent(0);
    setReceiptOrder({ ...finalOrder, subtotal, discountAmount, taxGST, totalPayable });
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden select-none">

      {/* POS Header Bar */}
      <div className="bg-white px-5 py-3.5 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#FF5B32]" />
              Touch Billing Terminal ({activeBranch?.name})
            </h2>
            {/* Z-Report & Shift Drawer feature temporarily commented for next version release */}
            {/* {shiftActive ? (
              <button
                onClick={() => setShowShiftModal(true)}
                className="px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1.5 hover:scale-105 transition-transform"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Shift Active (Float: {currencySymbol}{openingFloat})
              </button>
            ) : (
              <button
                onClick={() => setShowShiftModal(true)}
                className="px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-300 hover:scale-105 transition-transform"
              >
                ⚠️ No Active Shift (Start Drawer)
              </button>
            )} */}
          </div>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            Workflow: <strong className="text-[#FF5B32]">{orderWorkflowMode === "WORKFLOW_1" ? "Customer → Cashier Approval → Kitchen → Waiter" : "Direct KDS Dispatch"}</strong>
          </p>
        </div>

        {/* View Switcher Tabs: POS Billing vs Pending Approvals */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setPosTab("billing")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                posTab === "billing" ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Touch Billing Grid
            </button>
            <button
              onClick={() => setPosTab("approvals")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 relative ${
                posTab === "approvals" ? "bg-[#FF5B32] text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <BellRing className="w-3.5 h-3.5" />
              Pending Approvals
              {pendingApprovalOrders.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] animate-pulse">
                  {pendingApprovalOrders.length}
                </span>
              )}
            </button>
          </div>

          {/* Z-Report button temporarily commented for next version release */}
          {/* <button
            onClick={() => setShowShiftModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-extrabold border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-500" /> Z-Report
          </button> */}
        </div>
      </div>

      {/* WORKFLOW 1: QUICK NOTIFICATION BANNER */}
      {orderWorkflowMode === "WORKFLOW_1" && pendingApprovalOrders.length > 0 && posTab === "billing" && (
        <div
          onClick={() => setPosTab("approvals")}
          className="bg-amber-100/90 border border-amber-300 px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
            <BellRing className="w-4 h-4 text-amber-600 animate-bounce" />
            <span>{pendingApprovalOrders.length} CUSTOMER ORDER(S) AWAITING CASHIER APPROVAL</span>
          </div>
          <button className="px-3 py-1 rounded-lg bg-amber-900 text-amber-100 font-bold text-xs">
            View & Approve Orders →
          </button>
        </div>
      )}

      {/* DEDICATED PENDING APPROVALS SCREEN TAB */}
      {posTab === "approvals" && (
        <div className="flex-1 bg-white p-5 rounded-3xl border border-stone-200 shadow-sm flex flex-col space-y-4 overflow-hidden">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-black text-lg text-stone-900 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-[#FF5B32]" />
                Customer Orders Requiring Cashier Approval ({pendingApprovalOrders.length})
              </h3>
              <p className="text-xs text-stone-500">
                Workflow Mode: Cashier verifies and approves customer orders before dispatching KOT tickets to Kitchen Display Systems.
              </p>
            </div>
            <button
              onClick={() => setPosTab("billing")}
              className="px-4 py-2 rounded-xl border border-stone-300 font-bold text-xs text-stone-700 hover:bg-stone-100"
            >
              Back to POS Billing →
            </button>
          </div>

          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-1">
            {pendingApprovalOrders.map((ord) => {
              const parsedItems = Array.isArray(ord.items)
                ? ord.items
                : typeof ord.items === "string"
                ? JSON.parse(ord.items)
                : [];

              // Filter to show ONLY items requiring Cashier Verification (e.g. status === "PENDING_CONFIRMATION" or "PENDING" or matching kotNo)
              const pendingItemsOnly = parsedItems.filter((it) => {
                const st = String(it.status || "").toUpperCase();
                return (
                  st === "PENDING_CONFIRMATION" ||
                  st === "PENDING" ||
                  st === "" ||
                  (it.kotNo && ord.kotNo && String(it.kotNo) === String(ord.kotNo))
                );
              });

              const displayItems = pendingItemsOnly.length > 0 ? pendingItemsOnly : parsedItems;

              const pendingItemsTotal = displayItems.reduce((sum, item) => {
                const price = Number(item.price ?? item.unitPrice ?? item.priceAmount ?? item.amount ?? 0);
                const qty = Number(item.qty ?? item.quantity ?? 1);
                return sum + (price * qty);
              }, 0);

              return (
                <div key={ord.id} className="bg-stone-50 p-4.5 rounded-2xl border-2 border-amber-300 shadow-md flex flex-col justify-between space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-base text-stone-900">Table {ord.tableNo || ord.tableNumber}</h4>
                      <p className="text-xs text-stone-500 font-semibold">
                        {ord.orderNumber && ord.orderNumber.startsWith("KOT-") ? ord.orderNumber : ord.kotNo && ord.kotNo.startsWith("KOT-") ? ord.kotNo : `KOT-${String(ord.id || "1001").replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase()}`} • {ord.orderType || "Dine-In (QR)"}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                      Awaiting Approval
                    </span>
                  </div>

                  <div className="space-y-2 py-2.5 border-y border-stone-200 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase text-amber-700">Newly Added Items For Approval:</p>
                      <span className="text-[10px] font-mono font-bold text-stone-500">
                        {displayItems.length} {displayItems.length === 1 ? "Item" : "Items"}
                      </span>
                    </div>
                    {displayItems.map((it, idx) => {
                      const itemQty = Number(it.qty ?? it.quantity ?? 1);
                      const itemUnitPrice = Number(it.price ?? it.unitPrice ?? it.priceAmount ?? it.amount ?? 0);
                      const itemSubtotal = itemUnitPrice * itemQty;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs font-bold text-stone-800 bg-white p-2 rounded-xl border border-stone-200">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#FF5B32] font-black">x{itemQty}</span>
                            <span>{it.name}</span>
                          </div>
                          <span className="text-stone-700 font-mono font-bold">
                            {currencySymbol}{itemSubtotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">New Items Total</p>
                      <p className="text-lg font-black text-amber-600 font-mono">
                        {currencySymbol}{pendingItemsTotal.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleApproveOrder(ord.id)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Approve & Dispatch KDS
                    </button>
                  </div>
                </div>
              );
            })}

            {pendingApprovalOrders.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-stone-400 space-y-2">
                <CheckCircle2 className="w-12 h-12 stroke-1 text-emerald-500" />
                <p className="text-base font-black text-stone-800">All customer orders approved!</p>
                <p className="text-xs text-stone-500">No pending orders waiting for cashier validation right now.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POS BILLING GRID TAB */}
      {posTab === "billing" && (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          
          {/* CATALOG LEFT: Floorplan Tables + Search + Categories + Dishes */}
          <div className="flex-1 flex flex-col gap-3 overflow-hidden">

            {/* Floorplan Tables & Parcel Mode Bar */}
            <div className="bg-stone-50/70 p-3 rounded-3xl border border-stone-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between px-1 gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* SEGMENTED CONTROL VIEW CHIP */}
                  <div className="bg-stone-200/80 p-1 rounded-2xl flex items-center gap-1 border border-stone-300/80 shadow-inner">
                    <button
                      onClick={() => setOrderViewMode("tables")}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        orderViewMode === "tables"
                          ? "bg-white text-stone-900 shadow-md font-black"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      <span>🍽️ Dine-In Tables</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-700 text-[10px] font-bold">
                        {tables.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setOrderViewMode("parcels")}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        orderViewMode === "parcels"
                          ? "bg-purple-600 text-white shadow-md font-black"
                          : "text-stone-600 hover:text-stone-900"
                      }`}
                    >
                      <span>📦 Parcel Orders</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        orderViewMode === "parcels" ? "bg-purple-800 text-white" : "bg-purple-100 text-purple-800"
                      }`}>
                        {activeParcelOrders.length}
                      </span>
                    </button>
                  </div>

                  <button
                    onClick={handleStartParcelOrder}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                      selectedTableNumber.startsWith("Parcel")
                        ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/30 scale-105"
                        : "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                    }`}
                  >
                    <span>📦</span>
                    <span>+ New Parcel Order</span>
                  </button>
                </div>
                <span className="text-[10px] font-bold text-stone-500 whitespace-nowrap">
                  {orderViewMode === "tables" ? `${tables.length} Tables` : `${activeParcelOrders.length} Parcel Orders`}
                </span>
              </div>

              {/* DINE-IN TABLES GRID VIEW */}
              {orderViewMode === "tables" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-0.5">
                  {tables.map((t) => {
                    const hasOrder = activeOrders.find(
                      (o) => normalizeTable(o.tableNo || o.tableNumber) === normalizeTable(t.number)
                    );
                    const isSelected = selectedTableNumber === t.number;
                    const elapsedInfo = hasOrder ? getOrderElapsedInfo(hasOrder.createdAt) : null;

                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setIsParcelMode(false);
                          setSelectedTableNumber(t.number);
                        }}
                        className={`w-full p-2.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-[#FF5B32] text-white border-[#FF5B32] shadow-md font-black scale-[1.02]"
                            : hasOrder
                            ? "bg-amber-50 border-amber-300 text-amber-900 font-extrabold shadow-xs"
                            : t.status === "cleaning"
                            ? "bg-purple-50/90 border-purple-300 text-purple-950 font-extrabold"
                            : "bg-white border-stone-200 hover:border-stone-400 text-stone-800"
                        }`}
                      >
                        <div className="flex justify-between items-center gap-1">
                          <p className="text-xs font-black tracking-tight">{t.number}</p>
                          {hasOrder ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                                hasOrder.status === "PENDING" || hasOrder.status === "pending"
                                  ? "bg-amber-400 text-stone-950"
                                  : hasOrder.status === "PREPARING" || hasOrder.status === "preparing"
                                  ? "bg-blue-500 text-white"
                                  : hasOrder.status === "READY" || hasOrder.status === "ready"
                                  ? "bg-emerald-400 text-stone-950"
                                  : "bg-[#FF5B32] text-white"
                              }`}
                            >
                              {hasOrder.status}
                            </span>
                          ) : t.status === "cleaning" ? (
                            <span className="px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 text-[8px] font-black uppercase">
                              Cleaning 🧹
                            </span>
                          ) : null}
                        </div>

                        <p className={`text-[11px] font-black mt-1 ${isSelected ? "text-white" : t.status === "cleaning" ? "text-purple-700" : "text-[#FF5B32]"}`}>
                          {hasOrder ? `${currencySymbol}${Number(hasOrder.totalAmount ?? hasOrder.total ?? 0).toFixed(2)}` : t.status === "cleaning" ? "Cleaning" : "Vacant"}
                        </p>

                        {/* Live Processing Timer Badge */}
                        {elapsedInfo && (
                          <div
                            className={`mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center justify-between border ${
                              isSelected
                                ? "bg-white/20 text-white border-white/30"
                                : elapsedInfo.mins >= 15
                                ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                : "bg-emerald-50 text-emerald-800 border-emerald-300"
                            }`}
                            title="Live processing duration since order was placed by customer/waiter"
                          >
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{elapsedInfo.formatted}</span>
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* PARCEL ORDERS GRID VIEW */}
              {orderViewMode === "parcels" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-0.5">
                  {activeParcelOrders.map((pOrd) => {
                    const pTbl = pOrd.tableNo || pOrd.tableNumber || "Parcel";
                    const isSelected = selectedTableNumber === pTbl;
                    const elapsedInfo = getOrderElapsedInfo(pOrd.createdAt);
                    const pTotal = Number(pOrd.totalAmount || pOrd.total || 0);

                    return (
                      <button
                        key={pOrd.id}
                        onClick={() => {
                          setIsParcelMode(true);
                          setSelectedTableNumber(pTbl);
                        }}
                        className={`w-full p-2.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-purple-700 text-white border-purple-700 shadow-md font-black scale-[1.02]"
                            : "bg-purple-50/90 border-purple-300 text-purple-950 hover:border-purple-400 shadow-xs"
                        }`}
                      >
                        <div className="flex justify-between items-center gap-1">
                          <p className="text-xs font-black tracking-tight truncate">📦 {pTbl}</p>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                              pOrd.status === "PREPARING" || pOrd.status === "preparing"
                                ? "bg-amber-400 text-stone-950"
                                : pOrd.status === "READY" || pOrd.status === "ready"
                                ? "bg-emerald-400 text-stone-950"
                                : "bg-purple-200 text-purple-950"
                            }`}
                          >
                            {pOrd.status || "DRAFT"}
                          </span>
                        </div>

                        <p className={`text-[11px] font-black mt-1 ${isSelected ? "text-white" : "text-purple-700"}`}>
                          {currencySymbol}{pTotal.toFixed(2)}
                        </p>

                        {elapsedInfo && (
                          <div
                            className={`mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center justify-between border ${
                              isSelected
                                ? "bg-white/20 text-white border-white/30"
                                : "bg-purple-100/80 text-purple-900 border-purple-200"
                            }`}
                          >
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{elapsedInfo.formatted}</span>
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {activeParcelOrders.length === 0 && (
                    <div className="col-span-full py-8 text-center text-stone-400 space-y-1">
                      <p className="text-xs font-bold">No active parcel orders right now.</p>
                      <button
                        onClick={handleStartParcelOrder}
                        className="text-xs font-black text-purple-600 hover:underline"
                      >
                        + Click here to create a new parcel order
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
              
              {/* Search Input Bar */}
              <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-stone-200 shadow-sm">
                <Search className="w-4 h-4 text-stone-400 ml-2" />
                <input
                  type="text"
                  placeholder="Search dishes by name (e.g. Paneer, Butter Chicken, Naan)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-stone-800 outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="mr-2 text-xs font-bold text-stone-400 hover:text-stone-700">
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCatId("all")}
                  className={`px-4 py-2 rounded-full text-xs font-black border transition-all cursor-pointer ${
                    selectedCatId === "all"
                      ? "bg-stone-900 text-white border-stone-900 shadow-md"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCatId(c.id)}
                    className={`px-4 py-2 rounded-full text-xs font-black border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      selectedCatId === c.id
                        ? "bg-stone-900 text-white border-stone-900 shadow-md"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>

              {/* Touch Dishes Grid (5 items per row) */}
              <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5 pr-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItemToCart(item)}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200 text-left transition-all duration-150 hover:scale-[1.02] hover:border-[#FF5B32] active:scale-95 cursor-pointer flex flex-col justify-between shadow-sm group"
                  >
                    <div className="relative mb-2.5 w-full h-24 rounded-xl overflow-hidden border border-stone-100 bg-gradient-to-br from-[#FF5B32] via-orange-500 to-amber-500 flex items-center justify-center p-2 text-center group">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform absolute inset-0"
                        />
                      ) : (
                        <div className="text-center px-1 z-0">
                          <span className="text-white font-black text-xs drop-shadow-md leading-snug line-clamp-3">
                            {item.name}
                          </span>
                        </div>
                      )}
                      {(item.dietaryType === "veg" || item.isVeg === true) && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white shadow-md bg-emerald-600/95 backdrop-blur-md z-10">
                          🌿 VEG
                        </span>
                      )}
                      {(item.dietaryType === "non-veg" || (item.isVeg === false && item.dietaryType === "non-veg")) && (
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white shadow-md bg-red-600/95 backdrop-blur-md z-10">
                          🍗 NON-VEG
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-stone-900 truncate group-hover:text-[#FF5B32] transition-colors">
                        {item.name}
                      </p>
                      <p className="text-sm font-black mt-1 text-[#FF5B32] font-mono">
                        {currencySymbol}{Number(item.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

            </div>

            {/* CART RIGHT PANE — ENLARGED billing section */}
            <div className="w-full lg:w-[430px] xl:w-[460px] bg-white p-5 rounded-3xl border border-stone-200 flex flex-col justify-between space-y-4 shadow-xl overflow-hidden">
              
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center mb-3 pb-3 border-b border-stone-200">
                  <div>
                    <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
                      {selectedTableNumber.startsWith("Parcel") ? (
                        <span className="text-purple-600 font-black flex items-center gap-1.5">
                          <span>📦</span> {selectedTableNumber}
                        </span>
                      ) : (
                        <span>Table {selectedTableNumber} Billing</span>
                      )}
                    </h3>
                    {currentLiveOrder && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono text-[#FF5B32] font-extrabold">Status: {currentLiveOrder.status}</span>
                        <span className="text-stone-300">•</span>
                        {getOrderElapsedInfo(currentLiveOrder.createdAt) && (
                          <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{getOrderElapsedInfo(currentLiveOrder.createdAt).formatted}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {(!currentLiveOrder || currentLiveOrder.status === "DRAFT" || currentLiveOrder.status === "PENDING_CONFIRMATION" || tableCart.length === 0) ? (
                    <button
                      onClick={handleCancelDraftOrder}
                      disabled={!currentLiveOrder && tableCart.length === 0}
                      className="px-3 py-1 rounded-xl text-xs font-extrabold text-amber-800 border border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all cursor-pointer flex items-center gap-1 shadow-sm disabled:opacity-40"
                    >
                      Cancel Draft ✕
                    </button>
                  ) : (
                    <button
                      onClick={handleRequestVoidOrder}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-rose-600 border border-rose-300 bg-rose-50 hover:bg-rose-600 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <Lock className="w-3.5 h-3.5" /> VOID
                    </button>
                  )}
                </div>

                {/* Items List — Enlarged Touch Cards */}
                <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                  {tableCart.length === 0 ? (
                    <div className="py-14 text-center space-y-3 text-stone-400">
                      <Utensils className="w-12 h-12 mx-auto stroke-1 text-stone-300" />
                      <p className="text-xs italic font-semibold">Table billing cart is empty.<br />Tap dishes from menu to add or cancel draft.</p>
                      {currentLiveOrder && (
                        <button
                          onClick={handleCancelDraftOrder}
                          className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 hover:bg-amber-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          Cancel Draft Order ✕
                        </button>
                      )}
                    </div>
                  ) : (
                    tableCart.map((it, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-stone-50/80 border border-stone-200/80 flex justify-between items-center shadow-xs hover:border-stone-300 transition-colors">
                        <div className="flex-1 pr-3">
                          <p className="text-sm font-black text-stone-900 leading-tight">{it.name}</p>
                          <p className="text-xs font-black text-[#FF5B32] mt-1 font-mono">
                            {currencySymbol}{(it.price * it.qty).toFixed(2)} <span className="text-[11px] font-normal text-stone-400">({currencySymbol}{it.price} each)</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-stone-200 shadow-sm">
                          <button
                            onClick={() => handleQtyChange(it.id || it.name, -1)}
                            className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-100 text-stone-800 text-sm font-black flex items-center justify-center cursor-pointer hover:bg-stone-200 active:scale-90 transition-transform"
                          >
                            -
                          </button>
                          <span className="text-sm font-black text-stone-900 min-w-[20px] text-center font-mono">{it.qty}</span>
                          <button
                            onClick={() => handleQtyChange(it.id || it.name, 1)}
                            className="w-8 h-8 rounded-lg border border-stone-200 bg-stone-100 text-stone-800 text-sm font-black flex items-center justify-center cursor-pointer hover:bg-stone-200 active:scale-90 transition-transform"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Controls & Totals Box */}
              <div className="space-y-3 pt-3 border-t border-stone-200">
                
                {/* Discount Selector */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">DISCOUNT:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setAppliedDiscountPercent(0)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                        appliedDiscountPercent === 0 ? "bg-[#FF5B32] text-white shadow" : "border border-stone-300 text-stone-700 bg-stone-50 hover:bg-stone-100"
                      }`}
                    >
                      None
                    </button>
                    <button
                      onClick={() => setAppliedDiscountPercent(10)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                        appliedDiscountPercent === 10 ? "bg-[#FF5B32] text-white shadow" : "border border-stone-300 text-stone-700 bg-stone-50 hover:bg-stone-100"
                      }`}
                    >
                      10%
                    </button>
                    <button
                      onClick={() => {
                        setEnteredPin("");
                        setPinConfig({
                          isOpen: true,
                          title: "Authorize 20% Manager Discount",
                          onSuccess: () => setAppliedDiscountPercent(20)
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                        appliedDiscountPercent === 20 ? "bg-[#FF5B32] text-white shadow" : "border border-stone-300 text-stone-700 bg-stone-50 hover:bg-stone-100"
                      }`}
                    >
                      20% 🔒
                    </button>
                    <button
                      onClick={() => {
                        setCustomDiscountValue("");
                        setCustomDiscountPin("");
                        setShowCustomDiscountModal(true);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black cursor-pointer transition-all ${
                        appliedDiscountPercent > 0 && appliedDiscountPercent !== 10 && appliedDiscountPercent !== 20
                          ? "bg-purple-600 text-white shadow"
                          : "border border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100"
                      }`}
                    >
                      {appliedDiscountPercent > 0 && appliedDiscountPercent !== 10 && appliedDiscountPercent !== 20
                        ? `${appliedDiscountPercent}% Custom`
                        : "Custom % 🔒"}
                    </button>
                  </div>
                </div>

                {/* Settlement Mode */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block mb-1">
                    SETTLEMENT MODE
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {["UPI", "Cash", "Card"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setSelectedPaymentMethod(mode)}
                        className={`py-2.5 rounded-xl text-xs font-extrabold cursor-pointer border transition-all ${
                          selectedPaymentMethod === mode
                            ? "bg-[#FF5B32] text-white border-[#FF5B32] shadow-md"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total Calculation Box — Prominent Banner */}
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-1.5 text-xs font-medium">
                  <div className="flex justify-between text-stone-500">
                    <span>Raw Subtotal</span>
                    <span className="font-bold text-stone-800 font-mono">{currencySymbol}{rawSubtotal.toFixed(2)}</span>
                  </div>
                  {appliedDiscountPercent > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Discount ({appliedDiscountPercent}%)</span>
                      <span className="font-mono">-{currencySymbol}{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-stone-500">
                    <span>{taxName} ({currentTaxRate}%)</span>
                    <span className="font-bold text-stone-800 font-mono">{currencySymbol}{taxGST.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-stone-200 pt-2 mt-1 flex justify-between items-center">
                    <span className="text-base font-black text-stone-900">Total Payable</span>
                    <span className="text-xl font-black text-[#FF5B32] font-mono">{currencySymbol}{totalPayable.toFixed(2)}</span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex gap-2 pt-1 flex-wrap sm:flex-nowrap">
                  {(!currentLiveOrder || currentLiveOrder.status === "DRAFT" || currentLiveOrder.status === "PENDING_CONFIRMATION" || tableCart.length === 0) ? (
                    <button
                      onClick={handleCancelDraftOrder}
                      disabled={!currentLiveOrder && tableCart.length === 0}
                      className="py-3.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-black transition-all disabled:opacity-40 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                      title="Cancel this unsubmitted draft order"
                    >
                      Cancel Draft ✕
                    </button>
                  ) : (
                    <button
                      onClick={handleRequestVoidOrder}
                      disabled={!currentLiveOrder && tableCart.length === 0}
                      className="py-3.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition-all disabled:opacity-40 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                      title="Requires Manager Security PIN Override"
                    >
                      <Lock className="w-4 h-4 text-rose-600" /> Void 🔒
                    </button>
                  )}

                  {(isParcelMode || selectedTableNumber.startsWith("Parcel")) && (
                    <button
                      onClick={handleSendParcelToKDS}
                      disabled={tableCart.length === 0 || currentLiveOrder?.status === "PREPARING" || currentLiveOrder?.status === "READY"}
                      className={`py-3.5 px-4 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 shrink-0 border ${
                        currentLiveOrder?.status === "PREPARING" || currentLiveOrder?.status === "READY"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 opacity-90"
                          : "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-amber-500/30"
                      }`}
                    >
                      <Flame className="w-4 h-4" />
                      {currentLiveOrder?.status === "PREPARING" || currentLiveOrder?.status === "READY"
                        ? "Sent to KDS ✓"
                        : "Send to KDS 🔥"}
                    </button>
                  )}

                  <button
                    onClick={handleProcessCheckout}
                    disabled={tableCart.length === 0}
                    className="flex-1 py-3.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white text-sm font-black transition-all disabled:opacity-40 shadow-lg shadow-[#FF5B32]/30 cursor-pointer flex items-center justify-center gap-2 tracking-wide min-w-[140px]"
                  >
                    <Printer className="w-5 h-5" /> Close & Print Bill
                  </button>
                </div>

              </div>

          </div>
        </div>
      )}

      {/* Add New Dish Modal */}
      {showAddDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-stone-200">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900">+ Create New Dish ({tenant?.name})</h3>
                <p className="text-xs text-[#FF5B32] font-bold">Adds directly to live POS menu</p>
              </div>
              <button onClick={() => setShowAddDishModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Dish Name (e.g. Malai Paneer Tikka)"
                value={newDishName}
                onChange={(e) => setNewDishName(e.target.value)}
                className="w-full p-3 rounded-xl border border-stone-300 text-xs outline-none focus:border-[#FF5B32]"
              />

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-stone-400">Select Category:</label>
                <select
                  value={newDishCatId}
                  onChange={(e) => setNewDishCatId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-300 text-xs outline-none bg-white cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <input
                type="number"
                placeholder={`Price (${currencySymbol})`}
                value={newDishPrice}
                onChange={(e) => setNewDishPrice(e.target.value)}
                className="w-full p-3 rounded-xl border border-stone-300 text-xs outline-none focus:border-[#FF5B32]"
              />

              <textarea
                placeholder="Description & Recipe Notes..."
                value={newDishDesc}
                onChange={(e) => setNewDishDesc(e.target.value)}
                rows={2}
                className="w-full p-3 rounded-xl border border-stone-300 text-xs outline-none focus:border-[#FF5B32]"
              />

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-stone-700">Dietary Tag:</label>
                <button
                  type="button"
                  onClick={() => setNewDishIsVeg(!newDishIsVeg)}
                  className={`px-3 py-1 rounded-lg text-xs font-black border ${
                    newDishIsVeg ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-rose-50 text-rose-700 border-rose-300"
                  }`}
                >
                  {newDishIsVeg ? "VEGETARIAN 🌿" : "NON-VEG 🍗"}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddDishModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDishFromPOS}
                className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white text-xs font-black shadow-md shadow-[#FF5B32]/30"
              >
                Create Dish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Discount Modal */}
      {showCustomDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-purple-600">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-black text-base text-stone-900">Custom Manager Discount</h3>
              </div>
              <button
                onClick={() => {
                  setShowCustomDiscountModal(false);
                  setCustomDiscountValue("");
                  setCustomDiscountPin("");
                }}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="Enter discount % (e.g. 15)"
                  value={customDiscountValue}
                  onChange={(e) => setCustomDiscountValue(e.target.value)}
                  className="w-full p-3 rounded-xl border border-stone-300 text-sm font-bold outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-stone-400 block mb-1">
                  Manager Security PIN
                </label>
                <input
                  type="password"
                  maxLength={10}
                  placeholder="Enter Manager PIN"
                  value={customDiscountPin}
                  onChange={(e) => setCustomDiscountPin(e.target.value)}
                  className="w-full text-center text-xl tracking-[0.3em] font-mono py-2.5 rounded-xl border border-stone-300 outline-none focus:border-purple-600"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCustomDiscountModal(false);
                  setCustomDiscountValue("");
                  setCustomDiscountPin("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const discNum = Number(customDiscountValue);
                  if (isNaN(discNum) || discNum <= 0 || discNum > 100) {
                    toast.error("Please enter a valid discount percentage between 1% and 100%.");
                    return;
                  }
                  if (!isManagerUnlocked && !(await verifyManagerPin(customDiscountPin))) {
                    toast.error("Invalid Manager PIN. Security Override Denied!");
                    return;
                  }
                  setAppliedDiscountPercent(discNum);
                  setShowCustomDiscountModal(false);
                  setCustomDiscountValue("");
                  setCustomDiscountPin("");
                  toast.success(`Authorized & Applied ${discNum}% Manager Custom Discount!`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md shadow-purple-600/30"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager PIN Override Modal */}
      {pinConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-[#FF5B32]">
                <Shield className="w-5 h-5" />
                <h3 className="font-black text-base text-stone-900">Manager Security Override</h3>
              </div>
              <button onClick={() => { setPinConfig({ isOpen: false, title: "", onSuccess: null }); setEnteredPin(""); }} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>

            <p className="text-xs text-stone-700 font-bold">{pinConfig.title}</p>
            <p className="text-[11px] text-stone-400 font-medium">Enter real Manager Security PIN to authorize action.</p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!isManagerUnlocked && !(await verifyManagerPin(enteredPin))) {
                  toast.error("Invalid Manager PIN. Security Override Denied!");
                  return;
                }
                if (pinConfig.onSuccess) pinConfig.onSuccess(voidReasonInput);
                setPinConfig({ isOpen: false, title: "", onSuccess: null, isVoidAction: false });
                setEnteredPin("");
                setVoidReasonInput("");
                toast.success("Manager PIN verified successfully!");
              }}
              className="space-y-3"
            >
              {pinConfig.isVoidAction && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-stone-600 flex justify-between">
                    <span>Reason for Voiding Order</span>
                    <span className="text-stone-400 font-medium italic">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={voidReasonInput}
                    onChange={(e) => setVoidReasonInput(e.target.value)}
                    placeholder="e.g. Customer cancelled, Wrong table..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none focus:border-[#FF5B32]"
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {["Customer Cancelled", "Wrong Table", "Billing Error"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setVoidReasonInput(preset)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                          voidReasonInput === preset
                            ? "bg-rose-100 text-rose-700 border-rose-300"
                            : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600">Manager Security PIN</label>
                <input
                  type="password"
                  maxLength={10}
                  value={enteredPin}
                  onChange={(e) => setEnteredPin(e.target.value)}
                  placeholder="Enter PIN"
                  autoFocus
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 rounded-2xl border border-stone-300 outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setPinConfig({ isOpen: false, title: "", onSuccess: null, isVoidAction: false }); setEnteredPin(""); setVoidReasonInput(""); }}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] text-white font-bold text-xs shadow-md shadow-[#FF5B32]/30"
                >
                  Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Shift Drawer & Z-Report Modal — COMMENTED FOR NEXT VERSION RELEASE ──── */}
      {/* {showShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" /> Shift Drawer Management
              </h3>
              <button onClick={() => setShowShiftModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>
            -- Shift info, open/close actions, and Z-Report summary all preserved here --
          </div>
        </div>
      )} */}



      {/* Printable Receipt Modal */}
      {receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#FF5B32]" /> Itemized Customer Receipt
              </h3>
              <button onClick={() => setReceiptOrder(null)} className="text-stone-400 hover:text-stone-600 font-bold text-sm">✕</button>
            </div>

            {/* Receipt Box */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 font-mono text-xs text-stone-800">
              <div className="text-center pb-2 border-b border-dashed border-stone-300">
                <p className="font-black text-sm text-stone-900">{tenant?.name}</p>
                <p className="text-[10px] text-stone-500">{activeBranch?.name} ({activeBranch?.code})</p>
                <p className="text-[10px] text-stone-500 mt-1">Receipt #{receiptOrder.id} • Table {receiptOrder.tableNo}</p>
              </div>

              <div className="space-y-1.5">
                {(receiptOrder.items || []).map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{it.name} x{it.qty}</span>
                    <span className="font-bold">{currencySymbol}{(it.price * it.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-stone-300 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{receiptOrder.subtotal?.toFixed(2)}</span>
                </div>
                {receiptOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount</span>
                    <span>-{currencySymbol}{receiptOrder.discountAmount?.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-500">
                  <span>{taxName} ({currentTaxRate}%)</span>
                  <span>{currencySymbol}{receiptOrder.taxGST?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-stone-900 pt-1 border-t border-stone-300">
                  <span>TOTAL PAID ({receiptOrder.paymentMethod})</span>
                  <span className="text-[#FF5B32]">{currencySymbol}{receiptOrder.totalPayable?.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-[10px] text-center text-stone-400 pt-2">Thank you for dining with us!</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setReceiptOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  setReceiptOrder(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] text-white font-bold text-xs shadow-md shadow-[#FF5B32]/30 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
