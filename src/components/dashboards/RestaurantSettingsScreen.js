"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/apiClient";
import {
  Settings,
  GitFork,
  CheckCircle2,
  Building2,
  Coins,
  ShieldCheck,
  Save,
  Upload,
  Loader2,
  X,
  ImageOff
} from "lucide-react";

export default function RestaurantSettingsScreen() {
  const {
    orderWorkflowMode,
    setOrderWorkflowMode,
    getActiveTenant,
    getActiveBranch,
    currencySymbol,
    taxName,
    taxRate,
    updateRestaurantSettings,
    verifyManagerPin,
    isManagerUnlocked,
    unlockedManagerPin
  } = useAuth();

  const tenant = getActiveTenant();
  const branch = getActiveBranch();

  const [selectedCurrency, setSelectedCurrency] = React.useState(currencySymbol || "₹");
  const [selectedTaxName, setSelectedTaxName] = React.useState(taxName || "GST");
  const [inputTaxRate, setInputTaxRate] = React.useState(taxRate !== undefined ? taxRate : 5.0);

  // Logo state
  const [logoPreview, setLogoPreview] = React.useState(tenant?.logo || null);
  const [pendingLogoFile, setPendingLogoFile] = React.useState(null);
  const [logoRemoved, setLogoRemoved] = React.useState(false);
  const [uploadError, setUploadError] = React.useState("");

  // PIN modal & save state
  const [showPinModal, setShowPinModal] = React.useState(false);
  const [pinInput, setPinInput] = React.useState("");
  const [pinError, setPinError] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Sync state when active tenant / context changes
  React.useEffect(() => {
    if (tenant?.logo && !pendingLogoFile && !logoRemoved) {
      setLogoPreview(tenant.logo);
    }
  }, [tenant?.logo]);

  React.useEffect(() => {
    setSelectedCurrency(currencySymbol || "₹");
  }, [currencySymbol]);

  React.useEffect(() => {
    setSelectedTaxName(taxName || "GST");
  }, [taxName]);

  React.useEffect(() => {
    setInputTaxRate(taxRate !== undefined ? taxRate : 5.0);
  }, [taxRate]);

  const firstLetter = (tenant?.name || "R").charAt(0).toUpperCase();

  // Local image selection – ONLY updates local preview; NO background API call!
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size must be less than 5MB.");
      return;
    }
    setUploadError("");
    setPendingLogoFile(file);
    setLogoRemoved(false);
    
    // Create immediate local object URL for preview
    const localUrl = URL.createObjectURL(file);
    setLogoPreview(localUrl);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setPendingLogoFile(null);
    setLogoRemoved(true);
    setUploadError("");
  };

  const executeSaveSettings = async (overridePin) => {
    setSaving(true);
    setPinError("");

    try {
      let finalLogoUrl = logoPreview;

      if (pendingLogoFile) {
        const uploadRes = await api.uploadLogo(pendingLogoFile);
        if (uploadRes?.success && uploadRes?.logoUrl) {
          finalLogoUrl = uploadRes.logoUrl;
        } else {
          setPinError(uploadRes?.message || "Failed to upload image to Cloudinary.");
          setSaving(false);
          return;
        }
      } else if (logoRemoved) {
        finalLogoUrl = null;
      }

      const saveRes = await updateRestaurantSettings({
        currency: selectedCurrency,
        currencySymbol: selectedCurrency,
        taxName: selectedTaxName,
        taxRate: parseFloat(inputTaxRate) || 0,
        logo: finalLogoUrl,
        orderWorkflowMode,
        managerPin: overridePin
      });

      if (saveRes?.success === false) {
        setPinError(saveRes?.message || "Failed to save settings. Authorization denied.");
        setSaving(false);
        return;
      }

      setPendingLogoFile(null);
      setLogoRemoved(false);
      setShowPinModal(false);
    } catch (err) {
      console.error("Save settings error:", err);
      setPinError(err.message || "Network error saving settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenSaveModal = () => {
    if (isManagerUnlocked) {
      executeSaveSettings(unlockedManagerPin || "UNLOCKED");
      return;
    }
    setPinInput("");
    setPinError("");
    setShowPinModal(true);
  };

  const handleConfirmSaveWithPin = async (e) => {
    e.preventDefault();
    const cleanPin = pinInput.trim();
    const isValid = await verifyManagerPin(cleanPin);
    if (!isValid) {
      setPinError("Invalid Manager PIN. Authorization denied.");
      return;
    }
    await executeSaveSettings(cleanPin);
  };

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">

      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-stone-800 to-stone-900 flex items-center justify-center text-white shadow-md">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Restaurant Settings</h2>
            <p className="text-xs text-stone-500">Global currency, taxation, order workflows & restaurant profile</p>
          </div>
        </div>
        <button
          onClick={handleOpenSaveModal}
          className="px-4 py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs flex items-center gap-2 shadow-md shadow-[#FF5B32]/30 cursor-pointer transition-all active:scale-95"
        >
          <Save className="w-4 h-4" /> Save Settings
        </button>
      </div>

      {/* Restaurant Logo Card */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
          <Building2 className="w-4 h-4 text-[#FF5B32]" />
          Restaurant Brand Logo
          <span className="ml-auto text-[10px] font-semibold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">Cloudinary Storage</span>
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Logo Preview Container */}
          <div className="relative shrink-0">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Restaurant Logo Preview"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-stone-200 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#FF5B32] to-amber-500 flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-[#FF5B32]/30">
                {firstLetter}
              </div>
            )}
          </div>

          <div className="space-y-2 flex-1 text-center sm:text-left">
            <h4 className="font-bold text-sm text-stone-900">Upload Restaurant Logo</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              Upload your restaurant brand logo (PNG/JPG up to 5MB). Once uploaded, your custom logo will display in the sidebar header and center of your Table QR Standees.
            </p>

            {uploadError && (
              <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
                ⚠ {uploadError}
              </p>
            )}

            {pendingLogoFile && (
              <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 inline-block">
                ★ New image selected: <strong>{pendingLogoFile.name}</strong> (Click Save Settings to apply)
              </p>
            )}

            <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start flex-wrap">
              <label className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 cursor-pointer text-stone-800 font-bold text-xs border border-stone-300 transition-colors flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                {logoPreview ? "Change Logo" : "Choose Image File"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Remove Logo
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Fulfillment Workflow Architecture */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
            <GitFork className="w-4 h-4 text-[#FF5B32]" />
            Order Fulfillment Workflow Architecture
          </h3>
          <p className="text-xs text-stone-500">Select how customer and waiter orders pass through your restaurant</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setOrderWorkflowMode("WORKFLOW_1")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 relative ${
              orderWorkflowMode === "WORKFLOW_1"
                ? "border-[#FF5B32] bg-orange-50/50 shadow-md"
                : "border-stone-200 hover:border-stone-300 bg-stone-50/50"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="font-black text-xs text-stone-900">Option 1: Cashier Verification First</span>
              {orderWorkflowMode === "WORKFLOW_1" && (
                <CheckCircle2 className="w-4 h-4 text-[#FF5B32]" />
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-amber-600">
              Customer → Cashier POS → Kitchen Display (KDS) → Waiter
            </div>
            <p className="text-[11px] text-stone-500">
              Customer QR orders wait in a pending cashier queue. Cashier reviews and approves order items before sending KOT to kitchen. Recommended for Fine Dining & Table-service restaurants.
            </p>
          </div>

          <div
            onClick={() => setOrderWorkflowMode("WORKFLOW_2")}
            className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 relative ${
              orderWorkflowMode === "WORKFLOW_2"
                ? "border-[#FF5B32] bg-orange-50/50 shadow-md"
                : "border-stone-200 hover:border-stone-300 bg-stone-50/50"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="font-black text-xs text-stone-900">Option 2: Direct Kitchen Dispatch</span>
              {orderWorkflowMode === "WORKFLOW_2" && (
                <CheckCircle2 className="w-4 h-4 text-[#FF5B32]" />
              )}
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-600">
              Customer → Kitchen (KDS) → Waiter
            </div>
            <p className="text-[11px] text-stone-500">
              Orders route immediately to Kitchen Display screens without requiring cashier approval. Recommended for Quick Service (QSR) & Fast Food outlets.
            </p>
          </div>
        </div>
      </div>

      {/* Regional Financial & Tax Settings */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
        <h3 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
          <Coins className="w-4 h-4 text-[#FF5B32]" />
          Regional Financial & Tax Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-stone-700">Active Tenant Name</label>
            <input
              type="text"
              readOnly
              value={tenant?.name || "SmartServe Restaurant"}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-stone-50 font-semibold text-stone-800"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700">Active Branch Code</label>
            <input
              type="text"
              readOnly
              value={branch ? `${branch?.name} (${branch?.code})` : "—"}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-stone-50 font-semibold text-stone-800"
            />
          </div>

          <div>
            <label className="font-bold text-stone-700">Global Currency Symbol</label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 font-bold text-stone-900 bg-white outline-none focus:border-[#FF5B32]"
            >
              {[
                { label: "₹ - INR (Indian Rupee)", symbol: "₹" },
                { label: "$ - USD / CAD / AUD (Dollar)", symbol: "$" },
                { label: "€ - EUR (Euro)", symbol: "€" },
                { label: "£ - GBP (British Pound)", symbol: "£" },
                { label: "AED - UAE Dirham", symbol: "AED" },
                { label: "SR - SAR (Saudi Riyal)", symbol: "SR" },
                { label: "¥ - JPY / CNY (Yen / Yuan)", symbol: "¥" },
                { label: "RM - MYR (Malaysian Ringgit)", symbol: "RM" },
                { label: "฿ - THB (Thai Baht)", symbol: "฿" },
                { label: "₱ - PHP (Philippine Peso)", symbol: "₱" },
                { label: "R - ZAR (South African Rand)", symbol: "R" },
                { label: "Fr - CHF (Swiss Franc)", symbol: "Fr" }
              ].map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-stone-700">Tax Type (VAT / GST / Sales Tax)</label>
            <select
              value={selectedTaxName}
              onChange={(e) => setSelectedTaxName(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 font-bold text-stone-900 bg-white outline-none focus:border-[#FF5B32]"
            >
              {["GST", "VAT", "Sales Tax", "Consumption Tax", "Service Tax / SST"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-stone-700">Default Tax Rate (%)</label>
            <div className="relative mt-1">
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={inputTaxRate}
                onChange={(e) => setInputTaxRate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 font-bold text-stone-900 bg-white outline-none focus:border-[#FF5B32] pr-8"
              />
              <span className="absolute right-3 top-2.5 font-bold text-stone-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manager PIN Authorization Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FF5B32]" />
                <h3 className="font-black text-base text-stone-900">Manager Authorization</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-500 font-medium">
              Enter your <strong>Manager PIN</strong> to authorize and save logo, currency, tax, and workflow settings.
            </p>

            <form onSubmit={handleConfirmSaveWithPin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Enter Manager PIN (e.g. 1234)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center tracking-widest text-lg font-black p-3 rounded-xl bg-stone-50 border border-stone-300 outline-none focus:border-[#FF5B32]"
                  autoFocus
                />
                {pinError && <p className="text-[11px] font-bold text-rose-600 mt-1.5 text-center">{pinError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-bold text-xs shadow-md shadow-[#FF5B32]/30 cursor-pointer flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? "Saving..." : "Authorize & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
