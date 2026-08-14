"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  Building2, 
  Store, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Layers, 
  Globe, 
  Plus, 
  ArrowUpRight,
  ChevronRight
} from "lucide-react";

export default function TenantDashboard() {
  const { user } = useAuth();

  const outlets = [
    { id: "OUT-01", name: "Downtown Bistro & Grill", location: "Connaught Place, Delhi", status: "Active", dailySales: "₹1,42,500", orders: 312, staff: 18 },
    { id: "OUT-02", name: "SmartServe Express", location: "Cyber Hub, Gurgaon", status: "Active", dailySales: "₹98,200", orders: 245, staff: 12 },
    { id: "OUT-03", name: "Rooftop Lounge & Bar", location: "Indiranagar, Bengaluru", status: "Active", dailySales: "₹2,10,800", orders: 180, staff: 22 },
    { id: "OUT-04", name: "Sea View Diner", location: "Bandra West, Mumbai", status: "Opening Soon", dailySales: "₹0", orders: 0, staff: 8 }
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="bg-gradient-to-r from-[#FF5B32] to-[#E04822] rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#FFF2CF] font-bold text-xs uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Multi-Outlet Chain Governance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Welcome Back, Chain Director</h1>
          <p className="text-white/80 text-xs sm:text-sm mt-0.5">
            Managing 4 Outlets • Multi-tenant Global Master Tenant ID: <code className="font-mono bg-white/20 px-1.5 py-0.5 rounded">TNT-8890-IND</code>
          </p>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-[#FFF2CF] text-[#FF5B32] font-bold text-xs hover:bg-white transition-all shadow-md flex items-center gap-2 flex-shrink-0">
          <Plus className="w-4 h-4" />
          <span>Add New Outlet</span>
        </button>
      </div>

      {/* Chain Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs text-stone-500 font-semibold">Total Revenue (Today)</span>
          <div className="text-2xl font-black text-stone-900 flex items-center justify-between">
            <span>₹4,51,500</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +14.2%
            </span>
          </div>
          <p className="text-[11px] text-stone-400">Across 3 active locations</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs text-stone-500 font-semibold">Total Orders (Today)</span>
          <div className="text-2xl font-black text-stone-900 flex items-center justify-between">
            <span>737 Orders</span>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +8.5%
            </span>
          </div>
          <p className="text-[11px] text-stone-400">Avg ticket size: ₹612</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs text-stone-500 font-semibold">Active Staff On-Duty</span>
          <div className="text-2xl font-black text-stone-900">52 Staff</div>
          <p className="text-[11px] text-stone-400">Waiters, Chefs, Cashiers & Managers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-1">
          <span className="text-xs text-stone-500 font-semibold">Global Menu Items</span>
          <div className="text-2xl font-black text-stone-900">184 Dishes</div>
          <p className="text-[11px] text-stone-400">Synced across all branch outlets</p>
        </div>
      </div>

      {/* Outlets Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">Restaurant Outlets Overview</h3>
            <p className="text-xs text-stone-500">Live operational status and revenue contribution</p>
          </div>
          <span className="text-xs font-semibold text-[#FF5B32] bg-[#FFF2CF] px-3 py-1 rounded-full border border-[#FF5B32]/20">
            4 Locations Connected
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-100">
              <tr>
                <th className="p-4">Outlet Name & ID</th>
                <th className="p-4">Location</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Daily Revenue</th>
                <th className="p-4 text-center">Orders</th>
                <th className="p-4 text-center">Staff Count</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {outlets.map((outlet) => (
                <tr key={outlet.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-stone-900 text-sm">{outlet.name}</div>
                    <div className="text-[10px] text-stone-400 font-mono">{outlet.id}</div>
                  </td>
                  <td className="p-4 text-stone-600">{outlet.location}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                      outlet.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {outlet.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-stone-900">{outlet.dailySales}</td>
                  <td className="p-4 text-center">{outlet.orders}</td>
                  <td className="p-4 text-center">{outlet.staff}</td>
                  <td className="p-4 text-right">
                    <button className="px-3 py-1.5 rounded-lg bg-[#FFF2CF] text-[#FF5B32] hover:bg-[#FF5B32] hover:text-white font-bold transition-colors inline-flex items-center gap-1">
                      <span>Manage</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
