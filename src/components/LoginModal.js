"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  X, 
  KeyRound, 
  User, 
  Check,
  ArrowRight,
  Utensils
} from "lucide-react";

export default function LoginModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [pinOrPass, setPinOrPass] = useState("");
  const [loginState, setLoginState] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setLoginState("loading");

    const result = await login(usernameOrEmail, pinOrPass);
    if (result && result.success) {
      setLoginState("success");
      setTimeout(() => {
        onClose();
        setLoginState(null);
        router.push("/dashboard");
      }, 500);
    } else {
      setLoginState(null);
      setErrorMessage(result?.message || "Invalid username/email or password.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" suppressHydrationWarning>
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-[#FF5B32]/20 flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-100 hover:bg-[#FF5B32] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 p-8 text-white text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF5B32] to-[#FF805D] flex items-center justify-center shadow-lg shadow-[#FF5B32]/30 mb-4 mx-auto">
            <Utensils className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">
            D&K <span className="text-[#FF5B32]">SmartServe</span>
          </span>
          <p className="text-sm text-stone-400 mt-1">
            Sign in with User SSID + PIN (or initial owner username/password)
          </p>
        </div>

        <div className="p-6 space-y-4">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-stone-700 mb-1.5">
                User SSID / Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-semibold text-stone-900"
                  placeholder="SS100001 or owner username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-stone-700 mb-1.5">
                PIN / Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="password"
                  value={pinOrPass}
                  onChange={(e) => setPinOrPass(e.target.value)}
                  required
                  maxLength={20}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium text-stone-900"
                  placeholder="POS PIN or initial password"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-red-600 text-center font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={loginState === "loading" || loginState === "success"}
              className="w-full py-3.5 px-4 rounded-xl bg-[#FF5B32] hover:bg-[#E04822] text-white font-bold text-sm shadow-lg shadow-[#FF5B32]/30 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60"
            >
              {loginState === "success" ? (
                <>
                  <Check className="w-5 h-5 animate-bounce" />
                  <span>Launching Dashboard...</span>
                </>
              ) : loginState === "loading" ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In & Open Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[10px] text-stone-400 uppercase tracking-wider font-semibold pt-1">
            Protected by SmartServe Enterprise RBAC • v2.4.0
          </p>
        </div>
      </div>
    </div>
  );
}
