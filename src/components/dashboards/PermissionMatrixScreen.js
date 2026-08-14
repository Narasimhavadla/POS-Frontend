"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  ShieldCheck,
  Check,
  X,
  CreditCard,
  ChefHat,
  Utensils,
  Briefcase,
  Sparkles,
  Lock,
  Save,
  RotateCcw
} from "lucide-react";

const PERMISSION_KEYS = [
  { key: "pos", label: "View POS Terminal (Cashier Register)", category: "Operations" },
  { key: "kds", label: "View KDS (Kitchen Display System)", category: "Operations" },
  { key: "waiter", label: "View Waiters Hub (Table Service & Orders)", category: "Operations" },
  { key: "table_ordering", label: "Take Table Orders (Waiter / Table POS)", category: "Operations" },
  { key: "orders", label: "Tables & QR Management", category: "Operations" },
  { key: "order_history", label: "Orders History (View Past Restaurant Orders)", category: "Operations" },
  { key: "menu_builder", label: "Menu Builder (Create/Edit/Delete Dishes & Categories)", category: "Catalog" },
  { key: "inventory", label: "View & Edit Raw Stock Inventory", category: "Management" },
  { key: "reports", label: "View Financial & Sales Reports", category: "Management" },
  { key: "staff", label: "Manage Staff & Shift Roster", category: "Administration" },
  { key: "settings", label: "Modify Restaurant Settings (Tax, Printing & Info)", category: "Administration" }
];

const ROLES = [
  { key: "cashier", label: "Cashier", icon: CreditCard, color: "bg-emerald-100 text-emerald-800" },
  { key: "waiter", label: "Waiter", icon: Utensils, color: "bg-[#FFF2CF] text-[#FF5B32]" },
  { key: "kitchen", label: "Kitchen Staff", icon: ChefHat, color: "bg-orange-100 text-orange-800" },
  { key: "manager", label: "Manager", icon: Briefcase, color: "bg-blue-100 text-blue-800" }
];

export default function PermissionMatrixScreen() {
  const { permissionsMatrix, savePermissionsMatrix } = useAuth();
  const [draftMatrix, setDraftMatrix] = useState(permissionsMatrix || {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (permissionsMatrix) {
      setDraftMatrix(permissionsMatrix);
    }
  }, [JSON.stringify(permissionsMatrix)]);

  const handleTogglePermission = (roleKey, permKey) => {
    setDraftMatrix((prev) => {
      const currentRoleObj = prev[roleKey] || {};
      const currentValue = !!currentRoleObj[permKey];
      return {
        ...prev,
        [roleKey]: {
          ...currentRoleObj,
          [permKey]: !currentValue
        }
      };
    });
  };

  const hasUnsavedChanges = JSON.stringify(draftMatrix) !== JSON.stringify(permissionsMatrix || {});

  const handleResetChanges = () => {
    setDraftMatrix(permissionsMatrix || {});
    toast.info("Reset draft permissions to active settings.");
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    const result = await savePermissionsMatrix(draftMatrix);
    setIsSaving(false);
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">RBAC Permission Matrix</h2>
            <p className="text-xs text-stone-500">Configure role-based access control & feature permissions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Unsaved Changes
            </div>
          )}

          {hasUnsavedChanges && (
            <button
              onClick={handleResetChanges}
              disabled={isSaving}
              className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Discard
            </button>
          )}

          <button
            onClick={handleSavePermissions}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50 ${
              hasUnsavedChanges
                ? "bg-[#FF5B32] hover:bg-[#e04d26] shadow-[#FF5B32]/30"
                : "bg-stone-400 cursor-not-allowed"
            }`}
          >
            {isSaving ? (
              <span>Saving Changes…</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Permission Matrix</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Permission Grid Matrix */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="text-left px-5 py-4 font-black text-stone-500 uppercase tracking-wider w-1/3">
                Feature / Access Module
              </th>
              {ROLES.map((role) => {
                const RoleIcon = role.icon;
                return (
                  <th key={role.key} className="text-center px-4 py-4 font-black text-stone-700 uppercase tracking-wider">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 ${role.color}`}>
                        <RoleIcon className="w-3.5 h-3.5" />
                        <span>{role.label}</span>
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {PERMISSION_KEYS.map((perm) => (
              <tr key={perm.key} className="hover:bg-stone-50/60 transition-colors">
                {/* Module Name */}
                <td className="px-5 py-3.5">
                  <span className="font-bold text-stone-900 text-xs">{perm.label}</span>
                  <span className="block text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                    {perm.category}
                  </span>
                </td>

                {/* Role Toggles */}
                {ROLES.map((role) => {
                  const isEnabled = draftMatrix[role.key]?.[perm.key] || false;
                  return (
                    <td key={role.key} className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleTogglePermission(role.key, perm.key)}
                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 inline-block cursor-pointer ${
                          isEnabled ? "bg-[#FF5B32]" : "bg-stone-300"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full bg-white shadow-md block transform transition-transform ${
                            isEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

