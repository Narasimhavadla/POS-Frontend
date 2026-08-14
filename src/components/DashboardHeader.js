"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  MapPin,
  Lock,
  Unlock,
  LogOut,
  Shield,
  Maximize2,
  Minimize2,
  ChevronRight
} from "lucide-react";

export default function DashboardHeader() {
  const {
    store,
    user,
    activeRole,
    logout,
    updateActiveBranchId,
    isManagerUnlocked,
    unlockManagerSession,
    lockManagerSession,
    getActiveTenant
  } = useAuth();

  const [pinInput, setPinInput] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinError, setPinError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!user) return;
    window.history.pushState(null, "", window.location.href);

    const blockBack = () => {
      window.history.pushState(null, "", window.location.href);
    };

    window.addEventListener("popstate", blockBack);
    return () => window.removeEventListener("popstate", blockBack);
  }, [user]);

  const handleUnlockPin = async (e) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    const success = await unlockManagerSession(cleanPin);
    if (success) {
      setShowPinModal(false);
      setPinInput("");
      setPinError("");
    } else {
      setPinError("Invalid Manager PIN. Authorization denied.");
    }
  };

  const activeTenant = getActiveTenant();
  const activeTenantBranches = (store.branches || []).filter((b) => b.tenantId === activeTenant?.id);
  const activeBranch = activeTenantBranches.find((b) => b.id === store.activeBranchId) || activeTenantBranches[0];

  const restaurantName = activeTenant?.name || user?.tenantName || "SmartServe Restaurant";
  const tenantSsid = activeTenant?.ssid || user?.tenantSsid || "SS554108";
  const branchName = activeBranch?.name || null;
  const branchCode = activeBranch?.code || null;
  const hasMultipleBranches = activeTenantBranches.length > 1;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-stone-200 shadow-sm px-4 sm:px-6 py-2.5">
      <div className="flex items-center justify-between gap-4">
        
        {/* Left Side: D&K SmartServe Brand & Branch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/SS-logo.jpeg"
              alt="D&K SmartServe"
              className="w-9 h-9 rounded-xl object-cover border border-stone-200 shadow-sm shrink-0"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
            <div className="flex flex-col">
              <h2 className="font-black text-sm text-stone-900 leading-tight tracking-tight truncate max-w-[200px] sm:max-w-[280px]">
                D&K <span className="text-[#FF5B32]">SmartServe</span>
              </h2>
              {activeRole === "superadmin" ? (
                <span className="text-[10px] font-bold text-[#FF5B32] uppercase tracking-wider">Super Admin Portal</span>
              ) : (
                <span className="text-[10px] font-extrabold text-[#FF5B32] uppercase tracking-wider">Restaurant Terminal</span>
              )}
            </div>
          </div>

          {branchName && activeRole !== "superadmin" && (
            <>
              <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
              {hasMultipleBranches ? (
                <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl text-xs">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5B32]" />
                  <select
                    value={store.activeBranchId || ""}
                    onChange={(e) => updateActiveBranchId(e.target.value)}
                    className="bg-transparent font-bold text-stone-800 outline-none cursor-pointer text-xs"
                  >
                    {activeTenantBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl text-xs">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5B32]" />
                  <span className="font-bold text-stone-800">
                    {branchName}{branchCode ? ` (${branchCode})` : ""}
                  </span>
                </div>
              )}
            </>
          )}

          {tenantSsid && activeRole !== "superadmin" && (
            <div className="flex items-center gap-1 bg-[#FFF2CF]/90 border border-[#FF5B32]/30 px-2 py-0.5 rounded-full text-xs font-mono font-bold text-[#FF5B32] shadow-sm shrink-0" title="Tenant Unique SSID">
              <span className="text-[10px] text-stone-500 font-sans font-normal">SSID:</span>
              <span className="text-xs font-black">{tenantSsid}</span>
            </div>
          )}
        </div>

        {/* Right Side: Manager PIN Unlock, Fullscreen, Logout */}
        <div className="flex items-center gap-2">
          {activeRole !== "superadmin" && (
            <>
              {isManagerUnlocked ? (
                <button
                  onClick={lockManagerSession}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Manager Unlocked</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowPinModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 font-bold text-xs hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden md:inline">Unlock Manager PIN</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
                setIsFullscreen(true);
              } else {
                document.exitFullscreen().catch(() => {});
                setIsFullscreen(false);
              }
            }}
            className="px-3 py-1.5 rounded-xl border border-stone-300 hover:border-[#FF5B32] hover:bg-[#FFF2CF]/40 text-stone-700 hover:text-[#FF5B32] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Toggle Fullscreen Mode"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>

          <button
            onClick={logout}
            className="px-3 py-1.5 rounded-xl border border-stone-300 hover:border-red-500 hover:bg-red-50 text-stone-700 hover:text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>

      </div>

      {/* Manager PIN Unlock Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#FF5B32]">
                <Shield className="w-6 h-6" />
                <h3 className="font-black text-lg text-stone-900">Manager Security Override</h3>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-stone-500">
              Enter Manager PIN (Default test PIN: <span className="font-mono font-bold text-stone-800">1234</span> or <span className="font-mono font-bold text-stone-800">9999</span>) to unlock override controls.
            </p>
            <form onSubmit={handleUnlockPin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter 4-digit PIN"
                autoFocus
                className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 rounded-2xl border border-stone-300 focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 outline-none"
              />
              {pinError && <p className="text-xs text-red-500 text-center font-bold">{pinError}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-bold text-xs shadow-md shadow-[#FF5B32]/30"
                >
                  Unlock Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
