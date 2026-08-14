"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  X, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  ShieldCheck
} from "lucide-react";

export default function RegisterModal({ isOpen, onClose }) {
  const { registerTenant } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    owner: "",
    email: "",
    phone: "",
    city: "",
    branches: 1,
    plan: "starter"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const newTenant = registerTenant(formData);
      setIsSubmitting(false);
      setRegisteredSuccess(newTenant);
    }, 600);
  };

  const handleClose = () => {
    setRegisteredSuccess(null);
    setFormData({
      name: "",
      owner: "",
      email: "",
      phone: "",
      city: "",
      branches: 1,
      plan: "starter"
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-[#FF5B32]/20 p-6 md:p-8 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-stone-100 hover:bg-[#FF5B32] hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {registeredSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-stone-900">Application Submitted!</h3>
            <p className="text-stone-600 text-sm max-w-md mx-auto">
              Your restaurant <span className="font-bold text-stone-900">{registeredSuccess.name}</span> has been submitted for SuperAdmin approval.
            </p>
            <div className="bg-[#FFF2CF] p-4 rounded-xl text-left text-xs space-y-1.5 border border-[#FF5B32]/20 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Temporary Tenant ID:</span>
                <span className="font-bold font-mono text-stone-900">{registeredSuccess.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Status:</span>
                <span className="font-bold text-amber-600">Pending Approval</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 font-medium">Outlets Requested:</span>
                <span className="font-bold text-stone-900">{registeredSuccess.branches}</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-xl bg-[#FF5B32] text-white font-bold text-sm shadow-md hover:bg-[#E04822] cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-[#FF5B32]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF5B32]">Multi-Tenant SaaS Onboarding</span>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 mb-1">Register Your Restaurant</h2>
            <p className="text-sm text-stone-600 mb-6">
              Start your 14-day free trial of D&K SmartServe POS. No credit card required.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Restaurant / Chain Name *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Royal Spice Bistro"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Owner Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      value={formData.owner}
                      onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                      placeholder="e.g. Vikram Malhotra"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Work Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="owner@restaurant.com"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    City / Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="New Delhi, Mumbai, etc."
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Number of Outlets
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.branches}
                    onChange={(e) => setFormData({ ...formData, branches: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-stone-700 mb-1.5">
                  Select Enterprise Plan
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "starter", name: "Starter POS", price: "₹1,499/mo" },
                    { id: "professional", name: "Pro Multi-Outlet", price: "₹2,999/mo" },
                    { id: "enterprise", name: "Enterprise Franchise", price: "₹5,999/mo" }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, plan: p.id })}
                      className={`p-3 rounded-xl text-left border cursor-pointer transition-all ${
                        formData.plan === p.id
                          ? "bg-[#FFF2CF] border-[#FF5B32] ring-2 ring-[#FF5B32]/30"
                          : "border-stone-200 hover:border-[#FF5B32]/40"
                      }`}
                    >
                      <p className="font-bold text-xs text-stone-900">{p.name}</p>
                      <p className="text-[11px] font-extrabold text-[#FF5B32] mt-0.5">{p.price}</p>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-[#FF5B32] hover:bg-[#E04822] text-white font-bold text-sm shadow-lg shadow-[#FF5B32]/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                {isSubmitting ? "Submitting Registration..." : "Submit Registration Application"}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
