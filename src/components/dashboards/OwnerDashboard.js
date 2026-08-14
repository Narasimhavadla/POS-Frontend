"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  Utensils, 
  Receipt, 
  Users, 
  Clock, 
  AlertCircle, 
  ShoppingBag, 
  DollarSign,
  Plus,
  ArrowUpRight,
  Filter
} from "lucide-react";

export default function OwnerDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  const recentSales = [
    { id: "INV-9021", table: "Table 04", items: "Paneer Butter Masala, Butter Naan x4", total: "₹840.00", payment: "UPI / PhonePe", status: "Paid", time: "2 mins ago" },
    { id: "INV-9020", table: "Table 02", items: "Chicken Biryani, Thums Up", total: "₹450.00", payment: "Cash", status: "Paid", time: "14 mins ago" },
    { id: "INV-9019", table: "Takeaway #12", items: "Cold Coffee, Club Sandwich", total: "₹280.00", payment: "Credit Card", status: "Paid", time: "25 mins ago" },
    { id: "INV-9018", table: "Table 09", items: "Veg Platter, Dal Makhani, Rice", total: "₹1,120.00", payment: "UPI / GPay", status: "Paid", time: "38 mins ago" }
  ];

  const lowStockAlerts = [
    { name: "Cooking Oil (Refined)", current: "4.5 Liters", threshold: "10 Liters", priority: "High" },
    { name: "Basmati Rice (Premium)", current: "12 Kg", threshold: "25 Kg", priority: "Medium" },
    { name: "Fresh Cream", current: "1.2 Liters", threshold: "5 Liters", priority: "High" }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#FF5B32] via-[#E04822] to-[#FF805D] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#FFF2CF] font-bold text-xs uppercase tracking-wider mb-1">
            <Utensils className="w-4 h-4" />
            <span>Outlet: Downtown Bistro & Grill</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Restaurant Owner & Manager Console</h1>
          <p className="text-white/80 text-xs sm:text-sm mt-0.5">
            Real-time outlet performance, menu stock alerts, and cashier settlement control.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 rounded-xl bg-white text-[#FF5B32] font-bold text-xs hover:bg-[#FFF2CF] transition-colors shadow-md">
            + Edit Menu
          </button>
          <button className="px-4 py-2.5 rounded-xl bg-[#FFF2CF] text-[#FF5B32] font-bold text-xs hover:bg-white transition-colors shadow-md">
            Daily Report (PDF)
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs text-stone-500 font-semibold">Today's Total Sales</span>
          <div className="text-2xl font-black text-stone-900 flex items-center justify-between">
            <span>₹1,42,500</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +18.4%
            </span>
          </div>
          <p className="text-[11px] text-stone-400">Cash: ₹38k | UPI/Cards: ₹1.04L</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs text-stone-500 font-semibold">Dine-In Table Occupancy</span>
          <div className="text-2xl font-black text-stone-900">14 / 18 Tables</div>
          <div className="w-full bg-stone-100 rounded-full h-2 mt-2">
            <div className="bg-[#FF5B32] h-2 rounded-full w-3/4"></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs text-stone-500 font-semibold">Live Kitchen KOT Orders</span>
          <div className="text-2xl font-black text-stone-900 flex items-center justify-between">
            <span>8 Active</span>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Avg Prep: 14m
            </span>
          </div>
          <p className="text-[11px] text-stone-400">4 Ready for Serving</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs text-stone-500 font-semibold">Low Inventory Warnings</span>
          <div className="text-2xl font-black text-amber-600">3 Raw Items</div>
          <p className="text-[11px] text-stone-400">Action needed to prevent menu outage</p>
        </div>
      </div>

      {/* Grid Layout: Sales Stream & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 8 Columns: Live Sales Transactions */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Live Completed Billing Invoices</h3>
              <p className="text-xs text-stone-500">Real-time POS settlement feed</p>
            </div>
            <button className="text-xs font-bold text-[#FF5B32] bg-[#FFF2CF] px-3 py-1.5 rounded-xl border border-[#FF5B32]/20">
              View All Invoices
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-100">
                <tr>
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Table / Mode</th>
                  <th className="p-4">Dishes Ordered</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {recentSales.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-stone-900">{inv.id}</td>
                    <td className="p-4 font-bold text-[#FF5B32]">{inv.table}</td>
                    <td className="p-4 text-stone-600 truncate max-w-xs">{inv.items}</td>
                    <td className="p-4 text-right font-black text-stone-900">{inv.total}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[10px] font-bold">
                        {inv.payment}
                      </span>
                    </td>
                    <td className="p-4 text-right text-stone-400">{inv.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4 Columns: Inventory Alerts & Fast Actions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h4 className="font-bold text-stone-900 text-sm">Low Stock Inventory Alerts</h4>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Action Req.
              </span>
            </div>

            <div className="space-y-3">
              {lowStockAlerts.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-stone-900">{item.name}</div>
                    <div className="text-stone-500 text-[10px]">
                      Stock: <span className="font-bold text-amber-700">{item.current}</span> (Min: {item.threshold})
                    </div>
                  </div>
                  <button className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[10px] hover:bg-amber-700">
                    Reorder
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FFF2CF]/80 to-[#FFFBF0] rounded-2xl border border-[#FF5B32]/30 p-5 shadow-sm space-y-3">
            <h4 className="font-black text-stone-900 text-sm">Quick Manager Overrides</h4>
            <p className="text-xs text-stone-600">Authorize bill cancellations, staff discounts, or manager PIN resets.</p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button className="py-2 px-3 rounded-xl bg-white border border-[#FF5B32]/20 font-bold text-xs text-[#FF5B32] hover:bg-[#FF5B32] hover:text-white transition-colors text-center">
                Void KOT
              </button>
              <button className="py-2 px-3 rounded-xl bg-white border border-[#FF5B32]/20 font-bold text-xs text-[#FF5B32] hover:bg-[#FF5B32] hover:text-white transition-colors text-center">
                Manager PIN
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
