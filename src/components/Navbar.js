"use client";

import React, { useState } from "react";
import { Utensils, LogIn, Sparkles, ChevronDown, Menu, X, Building2 } from "lucide-react";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";

export default function Navbar() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#FF5B32]/15 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF5B32] to-[#FF805D] flex items-center justify-center shadow-lg shadow-[#FF5B32]/30">
                <Utensils className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-1.5">
                  D&K <span className="text-[#FF5B32]">SmartServe</span>
                </span>
                <span className="block text-[10px] font-bold text-stone-500 tracking-widest uppercase -mt-1">
                  Next-Gen Restaurant POS
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-semibold text-stone-700 hover:text-[#FF5B32] transition-colors">
                Features
              </a>
              <a href="#solutions" className="text-sm font-semibold text-stone-700 hover:text-[#FF5B32] transition-colors">
                Solutions
              </a>
              <a href="#kds-pos" className="text-sm font-semibold text-stone-700 hover:text-[#FF5B32] transition-colors">
                POS & KDS
              </a>
              <a href="#pricing" className="text-sm font-semibold text-stone-700 hover:text-[#FF5B32] transition-colors">
                Pricing
              </a>
            </div>

            {/* Right Action Controls */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setIsRegisterOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-800 bg-stone-50 hover:bg-stone-100 font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-sm cursor-pointer"
                suppressHydrationWarning
              >
                <Building2 className="w-4 h-4 text-[#FF5B32]" />
                <span>Register Restaurant</span>
              </button>

              <button
                onClick={() => setIsLoginOpen(true)}
                className="px-5 py-2.5 rounded-xl border-2 border-[#FF5B32] text-[#FF5B32] bg-[#FFF2CF]/40 font-bold text-sm hover:bg-[#FF5B32] hover:text-white transition-all duration-200 flex items-center gap-2 shadow-sm cursor-pointer"
                suppressHydrationWarning
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </button>
            </div>

            {/* Mobile menu trigger */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setIsRegisterOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-[#FF5B32] text-[#FF5B32] font-bold text-xs"
              >
                Register
              </button>
              <button
                onClick={() => setIsLoginOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#FF5B32] text-white text-xs font-bold"
              >
                Login
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-stone-700 hover:bg-[#FFF2CF]"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-stone-200 px-4 pt-2 pb-4 space-y-3">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-stone-700 py-2"
            >
              Features
            </a>
            <a 
              href="#pricing" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-semibold text-stone-700 py-2"
            >
              Pricing
            </a>
            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsRegisterOpen(true);
                }}
                className="w-full py-2.5 rounded-xl border border-stone-300 font-bold text-sm text-stone-800"
              >
                Register Restaurant
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsLoginOpen(true);
                }}
                className="w-full py-3 rounded-xl bg-[#FF5B32] text-white font-bold text-sm text-center"
              >
                Login to SmartServe
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Interactive Login & Registration Modals */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <RegisterModal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
    </>
  );
}
