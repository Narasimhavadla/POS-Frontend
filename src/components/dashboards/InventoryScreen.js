"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Plus,
  RefreshCw,
  Package,
  ShoppingCart
} from "lucide-react";

const STATUS_CONFIG = {
  Optimal: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
    iconColor: "text-emerald-500"
  },
  "Low Stock": {
    bg: "bg-amber-50",
    border: "border-amber-300",
    badge: "bg-amber-100 text-amber-800",
    icon: AlertTriangle,
    iconColor: "text-amber-500"
  },
  Critical: {
    bg: "bg-red-50",
    border: "border-red-300",
    badge: "bg-red-100 text-red-700",
    icon: TrendingDown,
    iconColor: "text-red-500"
  }
};

export default function InventoryScreen() {
  const { store, getActiveTenant } = useAuth();
  const tenant = getActiveTenant();

  const ingredients = store.ingredients || [];

  const [filterStatus, setFilterStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIngredient, setNewIngredient] = useState({ name: "", stock: "", unit: "kg", minLevel: "" });

  const filtered = filterStatus === "all" ? ingredients : ingredients.filter((i) => i.status === filterStatus);

  const counts = {
    all: ingredients.length,
    Optimal: ingredients.filter((i) => i.status === "Optimal").length,
    "Low Stock": ingredients.filter((i) => i.status === "Low Stock").length,
    Critical: ingredients.filter((i) => i.status === "Critical").length
  };

  const menuItemsCount = (store.menuItems || []).filter((m) => m.tenantId === tenant?.id).length;

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">

      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/30">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Inventory & Raw Stock</h2>
            <p className="text-xs text-stone-500">{ingredients.length} Raw Materials · {menuItemsCount} Menu Items</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-[#FF5B32] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#FF5B32]/30 hover:bg-[#e04d26] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Ingredient
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Items", value: counts.all, icon: Package, color: "bg-stone-50 border-stone-200 text-stone-800" },
          { label: "Optimal", value: counts.Optimal, icon: CheckCircle2, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Low Stock", value: counts["Low Stock"], icon: AlertTriangle, color: "bg-amber-50 border-amber-300 text-amber-700" },
          { label: "Critical", value: counts.Critical, icon: TrendingDown, color: "bg-red-50 border-red-200 text-red-700" }
        ].map((kpi) => {
          const KpiIcon = kpi.icon;
          return (
            <div key={kpi.label} className={`p-4 rounded-2xl border ${kpi.color} flex items-center gap-3`}>
              <KpiIcon className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-2xl font-black">{kpi.value}</p>
                <p className="text-xs font-semibold opacity-70">{kpi.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl w-fit border border-stone-200">
        {["all", "Optimal", "Low Stock", "Critical"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterStatus === s ? "bg-[#FF5B32] text-white shadow-sm" : "text-stone-600 hover:bg-stone-200/60"
            }`}
          >
            {s === "all" ? "All" : s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Ingredients Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Ingredient</th>
                <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Current Stock</th>
                <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Min Level</th>
                <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 font-black text-stone-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((ingredient) => {
                const config = STATUS_CONFIG[ingredient.status] || STATUS_CONFIG["Optimal"];
                const StatusIcon = config.icon;
                return (
                  <tr key={ingredient.id} className={`${ingredient.status === "Critical" ? "bg-red-50/30" : ingredient.status === "Low Stock" ? "bg-amber-50/30" : ""} hover:bg-stone-50/50 transition-colors`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${config.iconColor}`} />
                        <span className="font-bold text-stone-900">{ingredient.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-stone-700">{ingredient.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-stone-500">{ingredient.minLevel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${config.badge}`}>
                        {ingredient.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-[#FF5B32] hover:text-white text-stone-700 font-bold text-[11px] transition-all">
                        <ShoppingCart className="w-3 h-3" />
                        Reorder
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-10 text-center text-stone-400">
              <Package className="w-12 h-12 mx-auto stroke-1 mb-2" />
              <p className="text-sm font-bold text-stone-600">No ingredients found</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#FF5B32]" />
                Add New Ingredient
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600 text-sm font-bold">✕</button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Ingredient Name", key: "name", placeholder: "e.g. Basmati Rice" },
                { label: "Current Stock", key: "stock", placeholder: "e.g. 25.0 kg" },
                { label: "Minimum Level", key: "minLevel", placeholder: "e.g. 5.0 kg" }
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-bold text-stone-600">{field.label}</label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={newIngredient[field.key]}
                    onChange={(e) => setNewIngredient((p) => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none focus:border-[#FF5B32]"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] text-white font-bold text-xs shadow-md shadow-[#FF5B32]/30"
              >
                Add to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
