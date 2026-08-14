"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Utensils,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Star,
  Search,
  CheckCircle2,
  Clock,
  ChefHat,
  ChevronRight,
  Flame,
  Check,
  BellRing
} from "lucide-react";
import { toast } from "sonner";

export default function StandaloneMenuPage() {
  const { store, getActiveTenant, getActiveBranch, addOrder, updateTableStatus, orderWorkflowMode, currencySymbol: globalCurrencySymbol } = useAuth();
  const tenant = getActiveTenant();
  const activeBranch = getActiveBranch();

  const categories = store.categories || [];
  const menuItems = store.menuItems || [];
  const currencySymbol = globalCurrencySymbol || tenant?.currencySymbol || "₹";

  // Dynamic Table number from QR Code URL parameter ?table=T-01
  const [tableNumber, setTableNumber] = useState("T-01");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState("menu"); // "menu" | "orders"
  const [isMounted, setIsMounted] = useState(false);

  // Placed Order Tracking
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tbl = params.get("table");
      if (tbl) setTableNumber(tbl.toUpperCase().startsWith("T-") ? tbl.toUpperCase() : `T-${tbl}`);
    }
  }, []);

  // Sync placed order with store live updates (WebSockets / AuthContext)
  useEffect(() => {
    if (!tableNumber) return;
    const normalizeTbl = (num) => String(num || "").trim().toUpperCase().replace(/^TABLE\s*/, "").replace(/^T-/, "");
    const currentTblNorm = normalizeTbl(tableNumber);

    const match = (store.orders || []).find(
      (o) =>
        normalizeTbl(o.tableNo || o.tableNumber) === currentTblNorm &&
        o.status !== "CLOSED" &&
        o.status !== "closed" &&
        o.status !== "voided" &&
        o.status !== "VOIDED"
    );

    if (match) {
      setPlacedOrder(match);
    }
  }, [store.orders, tableNumber]);

  const filtered = menuItems.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && item.isAvailable !== false;
  });

  // Direct Tap-to-Add Cart without any customization modal
  const handleAddToCartDirect = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (index, delta) => {
    setCart((prev) =>
      prev
        .map((item, idx) => {
          if (idx === index) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.qty, 0);

  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    const normalizeTbl = (num) => String(num || "").trim().toUpperCase().replace(/^TABLE\s*/, "").replace(/^T-/, "");
    const targetTableNorm = normalizeTbl(tableNumber);

    // Find any existing unclosed active order for this table
    const existingActiveOrder = (store.orders || []).find(
      (o) =>
        normalizeTbl(o.tableNo || o.tableNumber) === targetTableNorm &&
        o.paymentStatus !== "PAID" &&
        o.paymentStatus !== "paid" &&
        o.status !== "CLOSED" &&
        o.status !== "closed" &&
        o.status !== "voided"
    );

    let mergedItems = [...cart];
    if (existingActiveOrder && existingActiveOrder.items) {
      const existingItems = Array.isArray(existingActiveOrder.items)
        ? existingActiveOrder.items
        : typeof existingActiveOrder.items === "string"
        ? JSON.parse(existingActiveOrder.items || "[]")
        : [];

      mergedItems = [...existingItems];
      cart.forEach((newItem) => {
        const idx = mergedItems.findIndex((ex) => ex.id === newItem.id || ex.name === newItem.name);
        if (idx !== -1) {
          const currentQty = Number(mergedItems[idx].qty || mergedItems[idx].quantity || 1);
          mergedItems[idx] = { ...mergedItems[idx], qty: currentQty + newItem.qty };
        } else {
          mergedItems.push(newItem);
        }
      });
    }

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

    const computedTotal = mergedItems.reduce((acc, i) => acc + Number(i.price || 0) * Number(i.qty || 1), 0);

    const targetOrder = {
      id: existingActiveOrder?.id || `ORD-${Date.now()}`,
      kotNo: existingActiveOrder?.kotNo || getNextKotNo(),
      tenantId: tenant?.id || "tenant-spice-bistro",
      branchId: activeBranch?.id || "br-1",
      tableNo: tableNumber,
      tableNumber: tableNumber,
      orderType: "Dine-In (QR Mobile)",
      status: orderWorkflowMode === "WORKFLOW_1" ? "PENDING" : "PREPARING",
      paymentStatus: "UNPAID",
      paymentMethod: "UPI",
      items: mergedItems,
      totalAmount: computedTotal,
      createdAt: existingActiveOrder?.createdAt || new Date().toISOString(),
      time: "Just now"
    };

    addOrder(targetOrder);

    // Automatically mark the scanned table as occupied
    const matchedTable = (store.tables || []).find((t) => normalizeTbl(t.number) === targetTableNorm);
    if (matchedTable) {
      updateTableStatus(matchedTable.id, "occupied");
    }

    setPlacedOrder(targetOrder);
    setCart([]);
    setShowCart(false);
    setActiveTab("orders");

    // Single required toast message
    toast.success("The order has placed successfully");
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 max-w-md mx-auto flex items-center justify-center font-sans border-x border-stone-200 shadow-xl" suppressHydrationWarning>
        <div className="text-center space-y-3 p-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5B32] flex items-center justify-center text-white mx-auto shadow-lg shadow-[#FF5B32]/30 animate-pulse">
            <Utensils className="w-6 h-6" />
          </div>
          <p className="text-sm text-stone-700 font-bold">Loading Digital Menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 max-w-md mx-auto flex flex-col font-sans border-x border-stone-200 shadow-xl relative" suppressHydrationWarning>
      
      {/* Top Mobile Light Theme Header */}
      <div className="bg-white/95 backdrop-blur-md p-4 border-b border-stone-200 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5B32] to-orange-500 flex items-center justify-center text-white shadow-md shadow-[#FF5B32]/20">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-base text-stone-900 leading-none">
              {tenant?.name || "SmartServe Dining"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#FF5B32] font-black bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">Table {tableNumber}</span>
              {tenant?.ssid && (
                <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono font-bold">
                  {tenant.ssid}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setActiveTab("menu")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              activeTab === "menu" ? "bg-[#FF5B32] text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Menu
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all relative ${
              activeTab === "orders" ? "bg-[#FF5B32] text-white shadow-sm" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Track Order
            {placedOrder && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute top-1 right-1 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* MENU TAB CONTENT */}
      {activeTab === "menu" && (
        <div className="flex-1 flex flex-col pb-24">
          
          {/* Search Bar */}
          <div className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Search dishes, drinks, starters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-xs font-semibold text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#FF5B32] shadow-sm transition-colors"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                selectedCategory === "all"
                  ? "bg-[#FF5B32] text-white border-[#FF5B32] shadow-md shadow-[#FF5B32]/30"
                  : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
              }`}
            >
              All Dishes
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap flex items-center gap-1.5 transition-all border ${
                  selectedCategory === cat.id
                    ? "bg-[#FF5B32] text-white border-[#FF5B32] shadow-md shadow-[#FF5B32]/30"
                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-100"
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Menu Items List - Professional Light Cards */}
          <div className="px-4 space-y-3">
            {filtered.map((item) => {
              const inCartItem = cart.find((i) => i.id === item.id);
              const inCartQty = inCartItem ? inCartItem.qty : 0;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-stone-200 p-3.5 flex gap-3 shadow-sm hover:shadow-md transition-all"
                >
                  <img
                    src={item.image }
                    alt={item.name}
                    className="w-22 h-22 rounded-xl object-cover shrink-0 border border-stone-100"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.dietaryType === "veg" || (item.isVeg === true && item.dietaryType !== "none") ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-700 text-[9px] font-black flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> VEG
                          </span>
                        ) : item.dietaryType === "non-veg" || (item.isVeg === false && item.dietaryType === "non-veg") ? (
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-300 text-rose-700 text-[9px] font-black flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> NON-VEG
                          </span>
                        ) : null}
                        {item.isChefSpecial && (
                          <span className="flex items-center gap-0.5 text-amber-600 text-[10px] font-black">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> Special
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-sm text-stone-900 mt-1 leading-tight">{item.name}</h3>
                      <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{item.description || "Freshly prepared with authentic ingredients"}</p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100">
                      <span className="font-black text-base text-stone-900">
                        {currencySymbol}{item.price}
                      </span>

                      {/* Direct Tap-to-Add Button */}
                      {inCartQty > 0 ? (
                        <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-2 py-1 rounded-xl">
                          <button
                            onClick={() => {
                              const idx = cart.findIndex((i) => i.id === item.id);
                              if (idx !== -1) updateQty(idx, -1);
                            }}
                            className="w-6 h-6 rounded-lg bg-white border border-stone-200 text-stone-800 font-black text-xs flex items-center justify-center cursor-pointer shadow-sm"
                          >
                            -
                          </button>
                          <span className="font-black text-xs text-[#FF5B32]">{inCartQty}</span>
                          <button
                            onClick={() => handleAddToCartDirect(item)}
                            className="w-6 h-6 rounded-lg bg-[#FF5B32] text-white font-black text-xs flex items-center justify-center cursor-pointer shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCartDirect(item)}
                          className="px-4 py-1.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs shadow-md shadow-[#FF5B32]/20 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* LIVE WEBSOCKET ORDER TRACKER TAB */}
      {activeTab === "orders" && (
        <div className="flex-1 p-4 space-y-4">
          <h2 className="font-black text-base text-stone-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#FF5B32]" />
            Live Kitchen Order Tracker
          </h2>

          {placedOrder ? (
            <div className="bg-white border border-stone-200 rounded-3xl p-5 space-y-5 shadow-md">
              <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-black text-stone-900 text-base">{placedOrder.kotNo || placedOrder.id}</h3>
                  <p className="text-xs text-stone-500 font-bold">Table {placedOrder.tableNo} • {placedOrder.time || "Active Order"}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                  placedOrder.status === "READY"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse"
                    : placedOrder.status === "PREPARING"
                    ? "bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"
                    : "bg-blue-100 text-blue-800 border border-blue-300"
                }`}>
                  {placedOrder.status}
                </span>
              </div>

              {/* Visual Order Progress Pipeline */}
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase text-stone-500">
                  <span className={placedOrder.status === "PENDING" ? "text-[#FF5B32]" : "text-emerald-600"}>1. Received</span>
                  <span className={placedOrder.status === "PREPARING" ? "text-[#FF5B32]" : placedOrder.status === "READY" || placedOrder.status === "SERVED" ? "text-emerald-600" : ""}>2. Cooking</span>
                  <span className={placedOrder.status === "READY" ? "text-[#FF5B32]" : placedOrder.status === "SERVED" ? "text-emerald-600" : ""}>3. Ready</span>
                  <span className={placedOrder.status === "SERVED" ? "text-emerald-600" : ""}>4. Served</span>
                </div>
                <div className="w-full h-2 rounded-full bg-stone-200 overflow-hidden flex">
                  <div className={`h-full transition-all duration-500 ${
                    placedOrder.status === "PENDING" ? "w-1/4 bg-[#FF5B32]" :
                    placedOrder.status === "PREPARING" ? "w-2/4 bg-amber-500" :
                    placedOrder.status === "READY" ? "w-3/4 bg-emerald-500" :
                    "w-full bg-emerald-600"
                  }`} />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-stone-400">Ordered Items</p>
                {(placedOrder.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <div>
                      <p className="font-extrabold text-stone-900">{it.name} x{it.qty || 1}</p>
                      {it.notes && <p className="text-[10px] text-stone-500 font-semibold">{it.notes}</p>}
                    </div>
                    <span className="font-mono font-bold text-stone-800">{currencySymbol}{it.price * (it.qty || 1)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-100 pt-3 flex justify-between items-center text-xs">
                <span className="text-stone-500 font-bold">Total Bill:</span>
                <span className="font-black text-[#FF5B32] text-xl">{currencySymbol}{placedOrder.totalAmount || placedOrder.total || 0}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center text-stone-500 space-y-2 shadow-sm">
              <ChefHat className="w-12 h-12 mx-auto stroke-1 text-stone-400" />
              <p className="text-sm font-bold text-stone-900">No active order</p>
              <p className="text-xs">Browse the menu tab to place your food order.</p>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && activeTab === "menu" && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-40">
          <button
            onClick={() => setShowCart(true)}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#FF5B32] to-orange-500 text-white font-black text-xs shadow-xl shadow-[#FF5B32]/30 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white text-[#FF5B32] font-black text-xs flex items-center justify-center">
                {cartCount}
              </span>
              <span>View Cart Items</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-sm">
              <span>{currencySymbol}{cartTotal}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-sm flex items-end justify-center p-0">
          <div className="bg-white border-t border-stone-200 rounded-t-3xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900">Your Order Cart ({cartCount} items)</h3>
              <button onClick={() => setShowCart(false)} className="text-stone-400 hover:text-stone-800 font-bold text-sm">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {cart.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs">
                  <div>
                    <p className="font-bold text-stone-900">{it.name}</p>
                    <p className="font-mono text-stone-500">{currencySymbol}{it.price} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 rounded bg-stone-200 text-stone-900 font-bold flex items-center justify-center">-</button>
                    <span className="font-bold text-stone-900">{it.qty}</span>
                    <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 rounded bg-[#FF5B32] text-white font-bold flex items-center justify-center">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-100 pt-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-stone-500 font-bold">Total Bill:</span>
                <span className="font-black text-xl text-[#FF5B32]">{currencySymbol}{cartTotal}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full py-3.5 rounded-2xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs shadow-xl shadow-[#FF5B32]/30 cursor-pointer"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
