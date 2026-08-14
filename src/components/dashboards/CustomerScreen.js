"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Smartphone,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Star,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  ChefHat
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerScreen() {
  const { store, getActiveTenant, getActiveBranch, addOrder, orderWorkflowMode, currencySymbol: globalCurrencySymbol } = useAuth();
  const tenant = getActiveTenant();
  const activeBranch = getActiveBranch();

  const categories = store.categories || [];
  const menuItems = store.menuItems || [];
  const currencySymbol = globalCurrencySymbol || tenant?.currencySymbol || "₹";

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [activeTab, setActiveTab] = useState("menu"); // "menu" | "orders" | "feedback"

  // Active placed order state
  const [placedOrder, setPlacedOrder] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Real-time socket sync for active table order
  useEffect(() => {
    const tableOrders = (store.orders || []).filter(
      (o) => o.status !== "CLOSED" && o.status !== "closed" && o.status !== "voided" && o.status !== "VOIDED"
    );
    if (tableOrders.length > 0) {
      setPlacedOrder(tableOrders[0]);
    }
  }, [store.orders]);

  const filtered = menuItems.filter((item) => {
    const matchesCat = selectedCategory === "all" || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch && item.isAvailable !== false;
  });

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (itemId, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id === itemId) {
            const newQty = i.qty + delta;
            return newQty > 0 ? { ...i, qty: newQty } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.qty, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const newOrder = {
      id: `ORD-${Date.now()}`,
      kotNo: `KOT-${Math.floor(100000 + Math.random() * 900000)}`,
      tenantId: tenant?.id || "tenant-spice-bistro",
      branchId: activeBranch?.id || "br-1",
      tableNo: "T-01",
      orderType: "Dine-In (QR Table)",
      status: orderWorkflowMode === "WORKFLOW_1" ? "PENDING" : "PREPARING",
      paymentStatus: "UNPAID",
      paymentMethod: "UPI",
      items: cart,
      totalAmount: cartTotal,
      createdAt: new Date().toISOString(),
      time: "Just now"
    };

    addOrder(newOrder);
    setPlacedOrder(newOrder);
    setCart([]);
    setShowCart(false);
    setActiveTab("orders");

    // Single required toast message
    toast.success("The order has placed successfully");
  };

  return (
    <div className="h-full overflow-y-auto space-y-4 font-sans pr-1 bg-stone-50 p-4 rounded-3xl">
      
      {/* Top Banner Header */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-orange-500 flex items-center justify-center text-white shadow-md shadow-[#FF5B32]/20">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">QR Self-Ordering Terminal</h2>
            <p className="text-xs text-stone-500">Preview digital customer mobile menu & live status tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-orange-50 text-[#FF5B32] border border-orange-200 text-xs font-black">
            Scanned Table T-01
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-stone-200/60 p-1 rounded-2xl w-fit border border-stone-300">
        <button
          onClick={() => setActiveTab("menu")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === "menu" ? "bg-[#FF5B32] text-white shadow-md shadow-[#FF5B32]/30" : "text-stone-700 hover:text-stone-900"
          }`}
        >
          Digital Menu
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all relative ${
            activeTab === "orders" ? "bg-[#FF5B32] text-white shadow-md shadow-[#FF5B32]/30" : "text-stone-700 hover:text-stone-900"
          }`}
        >
          Track Order
          {placedOrder && (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute top-1 right-1 animate-ping" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("feedback")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === "feedback" ? "bg-[#FF5B32] text-white shadow-md shadow-[#FF5B32]/30" : "text-stone-700 hover:text-stone-900"
          }`}
        >
          Give Feedback
        </button>
      </div>

      {/* MENU TAB */}
      {activeTab === "menu" && (
        <div className="space-y-4">
          
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-stone-200 text-xs font-semibold text-stone-900 placeholder-stone-400 outline-none focus:border-[#FF5B32]"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${
                  selectedCategory === "all" ? "bg-[#FF5B32] text-white border-[#FF5B32]" : "bg-white text-stone-700 border-stone-200"
                }`}
              >
                All
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${
                    selectedCategory === c.id ? "bg-[#FF5B32] text-white border-[#FF5B32]" : "bg-white text-stone-700 border-stone-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {filtered.map((item) => {
              const inCart = cart.find((i) => i.id === item.id);
              const qty = inCart ? inCart.qty : 0;

              return (
                <div key={item.id} className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between space-y-3">
                  <div className="flex gap-3">
                    <img src={item.image} alt={item.name} className="w-18 h-18 rounded-xl object-cover shrink-0 border border-stone-100" />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-sm text-stone-900 truncate">{item.name}</h4>
                      <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">{item.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                    <span className="font-black text-stone-900 text-base">{currencySymbol}{item.price}</span>

                    {qty > 0 ? (
                      <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 px-2 py-1 rounded-xl">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-white border border-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center cursor-pointer shadow-sm">-</button>
                        <span className="font-black text-xs text-[#FF5B32]">{qty}</span>
                        <button onClick={() => addToCart(item)} className="w-6 h-6 rounded bg-[#FF5B32] text-white font-bold text-xs flex items-center justify-center cursor-pointer shadow-sm">+</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="px-4 py-1.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs shadow-md shadow-[#FF5B32]/20 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cart Bottom Bar */}
          {cart.length > 0 && (
            <div className="sticky bottom-4 bg-gradient-to-r from-[#FF5B32] to-orange-500 p-4 rounded-2xl text-white shadow-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold opacity-90">{cart.reduce((a, b) => a + b.qty, 0)} Items in Cart</p>
                <p className="font-black text-lg">{currencySymbol}{cartTotal}</p>
              </div>
              <button
                onClick={handleCheckout}
                className="px-5 py-2.5 rounded-xl bg-white text-[#FF5B32] font-black text-xs shadow-md hover:bg-stone-100 cursor-pointer"
              >
                Place Order Now
              </button>
            </div>
          )}

        </div>
      )}

      {/* TRACK ORDER TAB */}
      {activeTab === "orders" && (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-black text-stone-900 text-base flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#FF5B32]" /> Live Order Tracker
          </h3>

          {placedOrder ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                <div>
                  <h4 className="font-black text-stone-900 text-lg">{placedOrder.kotNo || placedOrder.id}</h4>
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

              {/* Progress Pipeline */}
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

              {/* Items */}
              <div className="space-y-2">
                {(placedOrder.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <span className="font-bold text-stone-900">{it.name} x{it.qty || 1}</span>
                    <span className="font-mono font-bold text-stone-800">{currencySymbol}{it.price * (it.qty || 1)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-100 pt-3 flex justify-between items-center text-xs">
                <span className="font-bold text-stone-500">Total Payable:</span>
                <span className="font-black text-[#FF5B32] text-xl">{currencySymbol}{placedOrder.totalAmount || placedOrder.total || 0}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-stone-500 space-y-2">
              <ChefHat className="w-10 h-10 mx-auto text-stone-400 stroke-1" />
              <p className="text-xs font-bold">No active order for this table</p>
            </div>
          )}
        </div>
      )}

      {/* FEEDBACK TAB */}
      {activeTab === "feedback" && (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <h3 className="font-black text-stone-900 text-base">Dining Experience Feedback</h3>
          {feedbackSubmitted ? (
            <div className="p-6 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
              <p className="font-black text-sm">Thank you for your valuable feedback!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 justify-center py-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    onClick={() => setFeedbackRating(s)}
                    className={`w-8 h-8 cursor-pointer ${s <= feedbackRating ? "fill-amber-400 text-amber-400" : "text-stone-300"}`}
                  />
                ))}
              </div>
              <textarea
                rows={3}
                placeholder="Share your thoughts about food & service..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="w-full p-3 rounded-xl border border-stone-200 text-xs font-medium outline-none focus:border-[#FF5B32]"
              />
              <button
                onClick={() => setFeedbackSubmitted(true)}
                className="w-full py-3 rounded-xl bg-[#FF5B32] text-white font-black text-xs shadow-md"
              >
                Submit Feedback
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
