"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Utensils,
  CheckCircle2,
  Clock,
  BellRing,
  Users,
  Flame,
  Check
} from "lucide-react";

export default function WaiterDashboard() {
  const { store, getActiveTenant, getActiveBranch, updateOrderStatus, updateOrderItemStatus } = useAuth();
  const tenant = getActiveTenant();
  const branch = getActiveBranch();

  const tables = (store.tables || []).filter(
    (t) => (!t.tenantId || !tenant?.id || t.tenantId === tenant?.id) && (!t.branchId || t.branchId === branch?.id)
  );

  const orders = (store.orders || []).filter(
    (o) =>
      (!o.tenantId || !tenant?.id || o.tenantId === tenant?.id) &&
      (!o.branchId || o.branchId === branch?.id) &&
      o.status !== "CLOSED" && o.status !== "closed" && o.status !== "voided" && o.status !== "VOIDED"
  );

  // Group ready items by order / table so multiple items appear in a single card
  const groupedPickupCards = [];

  orders.forEach((order) => {
    const readyItems = [];

    (order.items || []).forEach((it, idx) => {
      const itemSt = (it.status || "").toUpperCase();
      // Only items explicitly marked READY by KDS will appear for waiter pickup
      if (itemSt === "READY") {
        readyItems.push({
          item: it,
          itemIndex: idx
        });
      }
    });

    if (readyItems.length > 0) {
      groupedPickupCards.push({
        order,
        orderId: order.id,
        kotNo: order.kotNo || order.orderNumber || order.id,
        tableNo: order.tableNo || order.tableNumber || "T-01",
        readyItems
      });
    }
  });

  const totalReadyItemsCount = groupedPickupCards.reduce((sum, card) => sum + card.readyItems.length, 0);

  const handleMarkItemServed = (orderId, itemIndex) => {
    updateOrderItemStatus(orderId, itemIndex, "SERVED");
  };

  const handleMarkAllItemsInCardServed = (card) => {
    card.readyItems.forEach(({ itemIndex }) => {
      updateOrderItemStatus(card.orderId, itemIndex, "SERVED");
    });
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden font-sans">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Waiter Service Hub</h2>
            <p className="text-xs text-stone-500">{branch?.name || "HQ Outlet"} — Real-Time Dish Pickup & Table Tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700 flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
            {totalReadyItemsCount} Item(s) Ready across {groupedPickupCards.length} Table(s)
          </div>
        </div>
      </div>

      {/* Ready Orders Pick-up Alert Cards */}
      {groupedPickupCards.length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
            <BellRing className="w-4 h-4 text-emerald-600 animate-bounce" />
            <span>KITCHEN DISH READY ALERTS — Pick up and serve now!</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {groupedPickupCards.map((card, i) => {
              const isParcel =
                card.order?.orderType === "Parcel" ||
                String(card.tableNo).toLowerCase().includes("parcel") ||
                String(card.tableNo).startsWith("P-");

              return (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border shadow-md space-y-3 flex flex-col justify-between transition-all ${
                    isParcel
                      ? "bg-purple-50/80 border-2 border-purple-300 shadow-purple-600/10"
                      : "bg-white border-emerald-200"
                  }`}
                >
                  <div className="flex justify-between items-start border-b border-stone-100 pb-2.5">
                    <div>
                      <h4 className={`font-black text-base ${isParcel ? "text-purple-950 flex items-center gap-1.5" : "text-stone-900"}`}>
                        {isParcel ? `📦 ${card.tableNo.startsWith("P-") ? card.tableNo : `Parcel ${card.tableNo}`}` : `Table ${card.tableNo}`}
                      </h4>
                      <p className={`text-xs font-bold ${isParcel ? "text-purple-700" : "text-stone-500"}`}>{card.kotNo}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isParcel
                          ? "bg-purple-600 text-white shadow-xs"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {card.readyItems.length} ITEM(S) READY
                    </span>
                  </div>

                  {/* List of all ready items for this order/table */}
                  <div className="space-y-2 flex-1">
                    {card.readyItems.map(({ item, itemIndex }) => (
                      <div
                        key={itemIndex}
                        className={`p-2.5 rounded-xl border flex items-center justify-between ${
                          isParcel
                            ? "bg-white border-purple-200"
                            : "bg-stone-50 border-stone-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                          <span className="font-bold text-xs text-stone-900 truncate">{item.name}</span>
                          <span
                            className={`font-mono font-black text-xs px-2 py-0.5 rounded shrink-0 ${
                              isParcel
                                ? "bg-purple-100 text-purple-900"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            x{item.qty || 1}
                          </span>
                        </div>

                        <button
                          onClick={() => handleMarkItemServed(card.orderId, itemIndex)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase flex items-center gap-1 shadow-sm transition-colors cursor-pointer shrink-0 text-white ${
                            isParcel
                              ? "bg-purple-600 hover:bg-purple-700"
                              : "bg-emerald-600 hover:bg-emerald-700"
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" /> Served
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer: Mark All Items Served */}
                  <button
                    onClick={() => handleMarkAllItemsInCardServed(card)}
                    className={`w-full py-2.5 rounded-xl text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer mt-1 ${
                      isParcel
                        ? "bg-purple-600 hover:bg-purple-700 shadow-purple-600/30"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" /> Mark All {card.readyItems.length} Items Served
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floorplan Tables Grid */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <h3 className="font-black text-xs uppercase tracking-wider text-stone-400">Assigned Floor Tables</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {tables.map((table) => {
            const normalizeTbl = (num) => String(num || "").trim().toUpperCase().replace(/^TABLE\s*/, "").replace(/^T-/, "");
            const activeOrder = orders.find(
              (o) =>
                normalizeTbl(o.tableNo || o.tableNumber) === normalizeTbl(table.number) &&
                o.paymentStatus !== "PAID" &&
                o.paymentStatus !== "paid" &&
                o.status !== "CLOSED" &&
                o.status !== "closed" &&
                o.status !== "voided" &&
                o.status !== "VOIDED"
            );

            const isOccupied = !!activeOrder;

            return (
              <div
                key={table.id}
                className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-sm ${
                  isOccupied
                    ? "bg-amber-50/70 border-amber-300"
                    : "bg-white border-stone-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-black text-base text-stone-900">{table.number}</h4>
                  <span className={`w-2.5 h-2.5 rounded-full ${isOccupied ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] text-stone-500 font-semibold">{table.zone}</p>
                  <p className="text-xs font-bold text-stone-700">{table.seats} Seats</p>
                  {activeOrder ? (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 uppercase">
                      {activeOrder.status}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Available
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
