"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Utensils,
  Coffee,
  Flame,
  Cake,
  Layers
} from "lucide-react";

export default function TableOrderingScreen() {
  const { store, getActiveTenant, getActiveBranch, addOrder, currencySymbol, taxName, taxRate, orderWorkflowMode } = useAuth();
  const tenant = getActiveTenant();
  const branch = getActiveBranch();

  // Selected Table State
  const [selectedTable, setSelectedTable] = useState(null);
  
  // Search & Category Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  // Already submitted items from previous KOTs
  const [alreadySentItems, setAlreadySentItems] = useState([]);

  // Newly added draft cart items in current session
  const [cart, setCart] = useState([]);
  const [orderNotes, setOrderNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tables = (store.tables || []).filter(
    (t) => (!t.tenantId || !tenant?.id || t.tenantId === tenant?.id) && (!t.branchId || t.branchId === branch?.id)
  );

  const menuItems = (store.menuItems || []).filter(
    (m) => (!m.tenantId || !tenant?.id || m.tenantId === tenant?.id) && m.isAvailable !== false
  );

  const categories = (store.categories || []).filter(
    (c) => (!c.tenantId || !tenant?.id || c.tenantId === tenant?.id)
  );

  const orders = store.orders || [];

  const normalizeTbl = (num) => String(num || "").trim().toUpperCase().replace(/^TABLE\s*/, "").replace(/^T-/, "");

  // Filter menu items by category and search
  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "ALL" ||
      String(item.categoryId) === String(selectedCategory) ||
      String(item.category) === String(selectedCategory);
    const matchesSearch =
      !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const findActiveTableOrder = (tableNumber) => {
    const targetNorm = normalizeTbl(tableNumber);
    return (orders || []).find((o) => {
      const oNorm = normalizeTbl(o.tableNo || o.tableNumber);
      if (oNorm !== targetNorm) return false;

      const pStatus = String(o.paymentStatus || "").toUpperCase();
      const st = String(o.status || "").toUpperCase();

      if (pStatus === "PAID") return false;
      if (["CLOSED", "VOIDED", "CANCELLED", "COMPLETED"].includes(st)) return false;

      const items = Array.isArray(o.items)
        ? o.items
        : (typeof o.items === "string" ? JSON.parse(o.items || "[]") : []);

      return items.length > 0;
    });
  };

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setOrderNotes("");
    setCart([]);

    // Sync real active order for this table if already occupied
    const activeOrder = findActiveTableOrder(table.number);

    if (activeOrder && Array.isArray(activeOrder.items) && activeOrder.items.length > 0) {
      setAlreadySentItems(
        activeOrder.items.map((it, idx) => ({
          id: it.id || `sent-${idx}`,
          name: it.name,
          price: parseFloat(it.price) || 0,
          qty: it.qty || it.quantity || 1,
          notes: it.notes || "",
          category: it.category || "General",
          kotNo: it.kotNo || activeOrder.kotNo || "KOT-100001",
          status: it.status || activeOrder.status || "PREPARING",
          isSubmitted: true
        }))
      );
    } else {
      setAlreadySentItems([]);
    }
  };

  const handleAddToCart = (item) => {
    if (!selectedTable) {
      toast.error("Please select a Table first to start taking an order.");
      return;
    }

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((ci) => ci.name === item.name || ci.id === item.id);
      if (existingIdx !== -1) {
        const updated = [...prevCart];
        updated[existingIdx].qty += 1;
        return updated;
      }
      return [
        ...prevCart,
        {
          id: item.id,
          name: item.name,
          price: parseFloat(item.price) || 0,
          qty: 1,
          notes: "",
          category: item.category || "General",
          isSubmitted: false
        }
      ];
    });
  };

  const handleUpdateQty = (itemId, delta) => {
    setCart((prevCart) => {
      return prevCart
        .map((ci) => {
          if (ci.id === itemId || ci.name === itemId) {
            const newQty = ci.qty + delta;
            return newQty > 0 ? { ...ci, qty: newQty } : null;
          }
          return ci;
        })
        .filter(Boolean);
    });
  };

  const handleUpdateItemNotes = (itemId, notes) => {
    setCart((prevCart) => {
      return prevCart.map((ci) => (ci.id === itemId || ci.name === itemId ? { ...ci, notes } : ci));
    });
  };

  // Calculations: combine alreadySent + new cart items
  const alreadySentSubtotal = alreadySentItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const combinedSubtotal = alreadySentSubtotal + cartSubtotal;

  const taxAmount = (combinedSubtotal * (parseFloat(taxRate) || 0)) / 100;
  const grandTotal = combinedSubtotal + taxAmount;

  // Sequential KOT Number Generator
  const getNextKotNo = () => {
    let maxCount = 100000;
    (orders || []).forEach((o) => {
      const kotStr = o.kotNo || o.orderNumber || "";
      const match = String(kotStr).match(/KOT-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxCount) maxCount = num;
      }
      (o.items || []).forEach((it) => {
        if (it.kotNo) {
          const m = String(it.kotNo).match(/KOT-(\d+)/i);
          if (m && m[1]) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxCount) maxCount = n;
          }
        }
      });
    });
    return `KOT-${maxCount + 1}`;
  };

  const handleSubmitTableOrder = async () => {
    if (!selectedTable) {
      toast.error("Please select a table.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Please add at least one NEW item to dispatch.");
      return;
    }

    setIsSubmitting(true);
    try {
      const activeOrder = findActiveTableOrder(selectedTable.number);
      const nextKot = getNextKotNo();

      // Option 1 (WORKFLOW_1) -> PENDING (Cashier Approval) vs Option 2 (WORKFLOW_2) -> PREPARING (Direct KDS)
      const targetStatus = orderWorkflowMode === "WORKFLOW_1" ? "PENDING" : "PREPARING";

      const newlyTaggedItems = cart.map((ci) => ({
        name: ci.name,
        price: ci.price,
        qty: ci.qty,
        status: targetStatus,
        notes: ci.notes || "",
        kotNo: nextKot,
        isSubmitted: true
      }));

      // Combine existing submitted items with newly tagged items
      const combinedItems = [...alreadySentItems, ...newlyTaggedItems];

      const newOrder = {
        id: activeOrder?.id || `ord-${Date.now()}`,
        kotNo: nextKot,
        orderNumber: nextKot,
        tableNo: selectedTable.number || selectedTable.name || `T-${selectedTable.id}`,
        tableNumber: selectedTable.number || selectedTable.name || `T-${selectedTable.id}`,
        tableId: selectedTable.id,
        items: combinedItems,
        notes: orderNotes,
        orderType: "DINE_IN",
        status: targetStatus,
        paymentStatus: "UNPAID",
        totalAmount: grandTotal,
        total: grandTotal,
        subtotal: combinedSubtotal,
        taxAmount: taxAmount,
        tax: taxAmount,
        createdAt: activeOrder?.createdAt || new Date().toISOString()
      };

      addOrder(newOrder);

      if (targetStatus === "PENDING_CONFIRMATION") {
        toast.success(`New items for Table ${selectedTable.number} sent to Cashier (${nextKot})!`);
      } else {
        toast.success(`New KOT (${nextKot}) sent to Kitchen for Table ${selectedTable.number}!`);
      }

      setAlreadySentItems(combinedItems);
      setCart([]);
      setOrderNotes("");
    } catch (err) {
      toast.error(`Order failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-[#FF805D] flex items-center justify-center text-white shadow-md shadow-[#FF5B32]/30">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Table Order Taking</h2>
            <p className="text-xs text-stone-500">Select a floor table, build order cart, and dispatch directly to Kitchen KDS</p>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Table Floorplan + Menu Catalog + Cart Summary */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        
        {/* Left Column: Floorplan Tables & Menu Catalog (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3 overflow-hidden">
          
          {/* Floorplan Tables Selector Bar */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-sm space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-[#FF5B32]" />
                Select Floor Table ({tables.length})
              </h3>
              <span className="text-[11px] font-bold text-stone-400">Click a table to start ordering</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {tables.map((table) => {
                const activeOrder = findActiveTableOrder(table.number);
                const isOccupied = !!activeOrder;
                const isSelected = selectedTable?.id === table.id;

                return (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table)}
                    className={`px-3.5 py-2 rounded-xl border text-left shrink-0 transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? "bg-[#FF5B32] text-white border-[#FF5B32] shadow-md shadow-[#FF5B32]/30 scale-105"
                        : isOccupied
                        ? "bg-amber-50 border-amber-300 text-stone-900 hover:bg-amber-100"
                        : "bg-stone-50 border-stone-200 text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-black text-xs">{table.number}</span>
                      <span className={`text-[10px] font-bold ${isSelected ? "text-amber-100" : "text-stone-500"}`}>
                        {table.seats} Seats
                      </span>
                    </div>

                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected
                          ? "bg-white animate-ping"
                          : isOccupied
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Catalog Grid */}
          <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden p-3 gap-3">
            
            {/* Search & Category Pills */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full scrollbar-none py-0.5">
                <button
                  onClick={() => setSelectedCategory("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  All Items
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                      String(selectedCategory) === String(cat.id)
                        ? "bg-[#FF5B32] text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 pr-1">
              {filteredMenuItems.map((item) => {
                const cartQty = cart.find((ci) => ci.id === item.id)?.qty || 0;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl border border-stone-200 hover:border-stone-300 bg-stone-50/50 hover:bg-white transition-all flex flex-col justify-between gap-2 shadow-xs group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-xs text-stone-900 group-hover:text-[#FF5B32] transition-colors line-clamp-2">
                          {item.name}
                        </h4>
                        {item.isVeg !== undefined && (
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${item.isVeg ? "bg-emerald-500" : "bg-red-500"}`} />
                        )}
                      </div>
                      <p className="text-[11px] font-mono font-black text-amber-700 mt-1">
                        {currencySymbol || "$"}{parseFloat(item.price).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                      {cartQty > 0 ? (
                        <div className="flex items-center gap-1.5 bg-stone-900 text-white rounded-xl px-2 py-1 w-full justify-between">
                          <button
                            onClick={() => handleUpdateQty(item.id, -1)}
                            className="text-stone-300 hover:text-white font-bold p-0.5 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-bold text-xs">{cartQty}</span>
                          <button
                            onClick={() => handleUpdateQty(item.id, 1)}
                            className="text-stone-300 hover:text-white font-bold p-0.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="w-full py-1.5 rounded-xl bg-white border border-stone-300 hover:border-[#FF5B32] hover:bg-[#FF5B32] hover:text-white font-bold text-xs text-stone-700 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary Cart Panel (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden p-3.5 gap-3">
          
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#FF5B32]" />
              <h3 className="font-black text-sm text-stone-900">
                {selectedTable ? `Order for ${selectedTable.number}` : "Table Order Cart"}
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {!selectedTable ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400 space-y-2">
              <UtensilsCrossed className="w-10 h-10 stroke-1 text-stone-300" />
              <p className="font-bold text-xs text-stone-600">No Table Selected</p>
              <p className="text-[11px]">Select a table from the top floorplan bar to start building an order.</p>
            </div>
          ) : alreadySentItems.length === 0 && cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400 space-y-2">
              <ShoppingBag className="w-10 h-10 stroke-1 text-stone-300" />
              <p className="font-bold text-xs text-stone-600">Cart is Empty</p>
              <p className="text-[11px]">Click items from the menu catalog on the left to add dishes to Table {selectedTable.number}.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              
              {/* Previously Submitted Items */}
              {alreadySentItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Active Items (Sent to KDS)
                    </span>
                    <span className="text-[10px] font-bold text-stone-500 font-mono">
                      {currencySymbol || "$"}{alreadySentSubtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {alreadySentItems.map((item, idx) => (
                      <div key={idx} className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-xs text-stone-900">{item.name}</h5>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono font-bold text-stone-600">
                              {currencySymbol || "$"}{item.price.toFixed(2)} x {item.qty}
                            </span>
                            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                              {item.kotNo}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-xs text-emerald-800">
                          {currencySymbol || "$"}{(item.price * item.qty).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Newly Added Draft Items */}
              {cart.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between border-b border-stone-200 pb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" /> New Items to Dispatch
                    </span>
                    <span className="text-[10px] font-bold text-stone-500 font-mono">
                      {currencySymbol || "$"}{cartSubtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-200 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="font-bold text-xs text-stone-900">{item.name}</h5>
                            <p className="text-[11px] font-mono font-bold text-stone-500">
                              {currencySymbol || "$"}{item.price.toFixed(2)} x {item.qty} = <strong className="text-amber-700">{currencySymbol || "$"}{(item.price * item.qty).toFixed(2)}</strong>
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 bg-white border border-stone-300 rounded-lg p-0.5">
                            <button onClick={() => handleUpdateQty(item.id, -1)} className="p-1 text-stone-600 hover:text-stone-900 cursor-pointer">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-black text-xs px-1">{item.qty}</span>
                            <button onClick={() => handleUpdateQty(item.id, 1)} className="p-1 text-stone-600 hover:text-stone-900 cursor-pointer">
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Special Preparation Notes */}
                        <input
                          type="text"
                          placeholder="Preparation notes (e.g. Less Spicy)"
                          value={item.notes || ""}
                          onChange={(e) => handleUpdateItemNotes(item.id, e.target.value)}
                          className="w-full px-2.5 py-1 text-[11px] rounded-lg border border-stone-200 bg-white font-medium outline-none focus:border-[#FF5B32]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Cart Footer & Totals */}
          {selectedTable && (alreadySentItems.length > 0 || cart.length > 0) && (
            <div className="space-y-3 pt-3 border-t border-stone-200 shrink-0">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-bold">{currencySymbol || "$"}{combinedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>{taxName || "Tax"} ({taxRate || 0}%)</span>
                  <span className="font-mono font-bold">{currencySymbol || "$"}{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-stone-900 pt-1.5 border-t border-stone-100">
                  <span>Grand Total</span>
                  <span className="font-mono text-amber-600">{currencySymbol || "$"}{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleSubmitTableOrder}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-[#FF5B32]/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Dispatching..."
                    : cart.length === 0
                    ? "Add New Items to Dispatch KOT"
                    : `Send New Items to Kitchen (${selectedTable.number})`}
                </span>
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
