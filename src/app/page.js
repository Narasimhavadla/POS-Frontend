"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import LoginModal from "@/components/LoginModal";
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  UtensilsCrossed, 
  ChefHat, 
  Receipt, 
  Store, 
  ShieldCheck, 
  Smartphone, 
  TrendingUp, 
  Users, 
  Zap,
  BarChart3,
  Clock,
  LayoutGrid,
  Globe2,
  Package,
  Layers,
  Award,
  PhoneCall,
  ChevronDown,
  Building2,
  PieChart,
  Grid,
  Truck,
  HeartHandshake,
  Star,
  Quote,
  Send,
  Mail,
  User,
  MessageSquare,
  Building,
  Check
} from "lucide-react";

export default function LandingPage() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeModuleTab, setActiveModuleTab] = useState("billing");

  // Contact form state
  const [contactData, setContactData] = useState({
    name: "",
    email: "",
    phone: "",
    restaurantName: "",
    city: "",
    message: ""
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactData({ name: "", email: "", phone: "", restaurantName: "", city: "", message: "" });
      alert("Thank you for reaching out! Our SmartServe POS representative will call you back within 15 minutes.");
    }, 1000);
  };

  const animatedStats = [
    { value: "50,000+", label: "Active Restaurant Outlets", highlight: "+1,200 Onboarded Monthly", icon: Store },
    { value: "3 Seconds", label: "Average Bill Generation", highlight: "99.99% Hardware Speed", icon: Zap },
    { value: "₹450+ Cr", label: "Monthly POS Transactions", highlight: "100% Tax & GST Compliant", icon: TrendingUp },
    { value: "98.5%", label: "Customer Retention Rate", highlight: "Loved by Chefs & Owners", icon: Award }
  ];

  const testimonials = [
    {
      name: "Vikram Malhotra",
      role: "Founder & Director",
      restaurant: "Royal Spice Fine Dine Chain (8 Outlets)",
      city: "New Delhi",
      rating: 5,
      comment: "SmartServe replaced our previous POS within 48 hours! The real-time KDS display reduced kitchen order delays by 35%, and central inventory tracking saved us over ₹2 Lakhs in ingredient wastage.",
      avatarBg: "bg-[#FF5B32]"
    },
    {
      name: "Chef Ananya Roy",
      role: "Head Chef & Operations",
      restaurant: "Bistro 52 & Cloud Kitchen",
      city: "Bengaluru",
      rating: 5,
      comment: "Paperless KOT on KDS screens is a total game changer. Sound notifications keep my line chefs alert, and table orders flow smoothly from waiters without missing items.",
      avatarBg: "bg-emerald-600"
    },
    {
      name: "Rajesh Gadhvi",
      role: "Franchise Owner",
      restaurant: "Urban Chai & Snacks (14 Outlets)",
      city: "Ahmedabad",
      rating: 5,
      comment: "The Tenant Multi-Outlet dashboard allows me to see live revenue across all 14 branches directly from my mobile. It's fast, reliable, and extremely easy for new staff to learn.",
      avatarBg: "bg-amber-600"
    }
  ];

  const modules = [
    {
      id: "billing",
      label: "3-Click Billing & POS",
      icon: Zap,
      title: "Lightning-Fast Billing Designed for Peak Hours",
      desc: "Process dine-in, takeaway, and delivery orders with zero lag. Multi-currency, GST automated tax calculations, split payment, and instant bluetooth/thermal receipt printing.",
      highlights: ["3-second billing workflow", "Offline billing sync", "Split & merged tables", "Custom discounts & coupons"]
    },
    {
      id: "table_ordering",
      label: "Table & Floor Management",
      icon: LayoutGrid,
      title: "Real-Time Visual Floor Plan & Table Ordering",
      desc: "Manage occupied, vacant, reserved, and billing-pending tables at a glance. Captains and waiters send KOT orders directly from tables to the kitchen with zero delay.",
      highlights: ["Interactive floor table grid", "Table split & merge billing", "Captain waiter tablet POS", "Instant KOT dispatch"]
    },
    {
      id: "inventory",
      label: "Inventory & Recipe Management",
      icon: Package,
      title: "Raw Material Tracking & Auto-Stock Deductions",
      desc: "Map dishes to raw ingredients down to the gram. When a Paneer Tikka is sold, paneer, cream, and spices are auto-deducted from your inventory with low-stock alerts.",
      highlights: ["BOM recipe costing", "Purchase Order (PO) creation", "Expiry & wastage tracking", "Multi-outlet transfers"]
    },
    {
      id: "kds",
      label: "Kitchen Display (KDS)",
      icon: ChefHat,
      title: "Paperless Kitchen Order Tickets (KOT)",
      desc: "Send orders straight from waiter tablets to kitchen screens. Color-coded prep timers ensure orders go out hot and fresh with zero lost tickets.",
      highlights: ["Color-coded timer alerts", "Item-wise preparation status", "Kitchen sound notifications", "Kot voiding authorization"]
    },
    {
      id: "analytics",
      label: "80+ Reports & BI Analytics",
      icon: BarChart3,
      title: "Deep Business Intelligence & Outlet Reports",
      desc: "Analyze hourly sales peaks, top-selling dishes, waiter productivity, customer retention rate, and net profit margins from anywhere using mobile or laptop dashboards.",
      highlights: ["Live owner mobile dashboard", "Item sales & profitability matrix", "Tax & GST audit reports", "Staff sales contribution"]
    },
    {
      id: "crm",
      label: "Customer CRM & Loyalty",
      icon: HeartHandshake,
      title: "Automate Customer Retention & Loyalty Rewards",
      desc: "Build your customer database on every visit. Send targeted SMS promos, reward points on repeat visits, and collect instant digital feedback.",
      highlights: ["Automated loyalty points", "SMS marketing campaigns", "Digital Feedback QR", "VIP guest tracking"]
    }
  ];

  const restaurantTypes = [
    { name: "Fine Dine & Bistro", desc: "Table layouts, captain ordering & split billing", icon: UtensilsCrossed },
    { name: "Quick Service (QSR)", desc: "High-speed token numbers & counter POS", icon: Zap },
    { name: "Cafes & Bakeries", desc: "Combo meals, modifier toppings & rapid checkout", icon: Store },
    { name: "Multi-Outlet Chains", desc: "Central kitchen, global menu & franchise reports", icon: Building2 },
    { name: "Bars & Pubs", desc: "Liquor stock tracking & happy hour pricing", icon: Layers },
    { name: "Cloud Kitchens", desc: "Direct multi-brand delivery integrations", icon: Truck }
  ];

  return (
    <div className="min-h-screen bg-[#FFFBF0] text-stone-900 flex flex-col font-sans" suppressHydrationWarning>
      {/* Top Banner (Petpooja Style Announcement) */}
      <div className="bg-gradient-to-r from-[#FF5B32] via-[#E04822] to-[#FF805D] text-white text-xs py-2.5 px-4 text-center font-medium flex items-center justify-center gap-2">
        <span className="bg-[#FFF2CF] text-[#FF5B32] font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase">
          PETPOOJA ALTERNATIVE
        </span>
        <span>India's Most Loved Multi-Tenant POS & Real-Time Kitchen Display System!</span>
        <button 
          onClick={() => setIsLoginOpen(true)}
          className="underline font-bold hover:text-[#FFF2CF] ml-2 flex items-center gap-1"
          suppressHydrationWarning
        >
          <span>Try All 5 Role Demos</span>
          &rarr;
        </button>
      </div>

      {/* Main Navbar */}
      <Navbar />

      {/* Hero Section with Rich Background Image Banner */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 bg-stone-900 text-white min-h-[640px] flex items-center">
        {/* Background Image with Dark Vignette & Brand Gradient Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105 transition-transform duration-1000"
          style={{ backgroundImage: "url('/hero-banner.png')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-900/80 to-[#FF5B32]/30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-stone-950/60"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFF2CF]/10 backdrop-blur-md border border-[#FFF2CF]/30 text-[#FFF2CF] font-bold text-xs shadow-lg">
                <Award className="w-4 h-4 text-[#FF5B32]" />
                <span>Trusted by 50,000+ Restaurants & Food Outlets</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-white drop-shadow-md">
                One POS Platform to <br className="hidden sm:block" />
                <span className="text-[#FF5B32]">
                  Power Your Entire
                </span> Restaurant
              </h1>

              <p className="text-lg text-stone-200 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal drop-shadow">
                From 3-click fast counter billing and real-time floor table ordering to central kitchen inventory and paperless KDS screens — manage your restaurant operations seamlessly with SmartServe.
              </p>

              {/* Call to Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#FF5B32] hover:bg-[#E04822] text-white font-bold text-base shadow-xl shadow-[#FF5B32]/40 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 group"
                >
                  <span>Request Free Live Demo</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <a
                  href="#contact-section"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl border-2 border-white/30 hover:border-[#FF5B32] text-white bg-white/10 backdrop-blur-md font-bold text-base hover:bg-white/20 transition-all text-center"
                >
                  Contact Sales Team
                </a>
              </div>

              {/* Key Trust Stats (Petpooja Style) */}
              <div className="pt-8 grid grid-cols-3 gap-4 border-t border-white/15 max-w-lg mx-auto lg:mx-0">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#FF5B32]">3 Sec</div>
                  <div className="text-xs text-stone-300 font-semibold mt-0.5">Average Bill Speed</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#FFF2CF]">80+</div>
                  <div className="text-xs text-stone-300 font-semibold mt-0.5">Business BI Reports</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-[#FF5B32]">99.9%</div>
                  <div className="text-xs text-stone-300 font-semibold mt-0.5">Offline Sync Uptime</div>
                </div>
              </div>
            </div>

            {/* Hero Right Mockup Card with Glassmorphism */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#FFF2CF] rounded-full filter blur-3xl opacity-30"></div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#FF5B32] rounded-full filter blur-3xl opacity-30"></div>

                <div className="relative bg-white/95 backdrop-blur-xl text-stone-900 rounded-3xl p-6 shadow-2xl border-2 border-[#FF5B32]/40 space-y-6">

                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FFF2CF] flex items-center justify-center text-[#FF5B32] font-bold">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm">Table #04 • Dine-In</h4>
                        <p className="text-xs text-stone-500">Order #ORD-8821 • Captain: Rahul</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      KOT Sent to KDS
                    </span>
                  </div>

                  {/* Order Items Mock */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                      <div>
                        <div className="font-bold text-stone-800">2x Paneer Butter Masala</div>
                        <div className="text-stone-400 text-[10px]">Extra Spice • Chef Notes</div>
                      </div>
                      <div className="font-bold text-stone-900">₹640.00</div>
                    </div>
                    <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                      <div>
                        <div className="font-bold text-stone-800">4x Butter Naan</div>
                        <div className="text-stone-400 text-[10px]">Hot Piping</div>
                      </div>
                      <div className="font-bold text-stone-900">₹160.00</div>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="bg-[#FFF2CF]/60 rounded-2xl p-4 space-y-2 border border-[#FF5B32]/20">
                    <div className="flex justify-between text-xs text-stone-600">
                      <span>Subtotal</span>
                      <span>₹800.00</span>
                    </div>
                    <div className="flex justify-between text-xs text-stone-600">
                      <span>GST (5%)</span>
                      <span>₹40.00</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-stone-900 pt-2 border-t border-[#FF5B32]/20">
                      <span>Total Amount</span>
                      <span className="text-[#FF5B32]">₹840.00</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => setIsLoginOpen(true)}
                    className="w-full py-3 rounded-xl bg-[#FF5B32] hover:bg-[#E04822] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>Test Waiter POS Billing &rarr;</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* NEW SECTION 1: ANIMATED STAT CARDS */}
      <section className="py-16 bg-[#FFF2CF]/40 border-y border-[#FF5B32]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="px-3 py-1 rounded-full bg-white text-[#FF5B32] text-xs font-bold uppercase tracking-wider border border-[#FF5B32]/20">
              Impact & Metrics
            </span>
            <h2 className="text-3xl font-black text-stone-900 mt-2">
              Driven by Scale, Speed & Precision
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {animatedStats.map((stat, idx) => {
              const IconComponent = stat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white p-6 rounded-3xl border border-[#FF5B32]/20 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group space-y-3 relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF2CF] text-[#FF5B32] flex items-center justify-center font-bold group-hover:bg-[#FF5B32] group-hover:text-white transition-colors">
                    <IconComponent className="w-6 h-6 animate-pulse-subtle" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-stone-900 group-hover:text-[#FF5B32] transition-colors tracking-tight animate-count-up">
                      {stat.value}
                    </div>
                    <div className="text-sm font-bold text-stone-700 mt-0.5">{stat.label}</div>
                  </div>
                  <div className="text-xs text-stone-500 font-semibold bg-[#FFF2CF]/60 px-3 py-1 rounded-full border border-[#FF5B32]/10 inline-block">
                    {stat.highlight}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Petpooja-Style Restaurant Types Showcase */}
      <section className="py-16 bg-white border-b border-[#FF5B32]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="px-3 py-1 rounded-full bg-[#FFF2CF] text-[#FF5B32] text-xs font-bold uppercase tracking-wider">
              Tailored Solutions
            </span>
            <h2 className="text-3xl font-black text-stone-900">
              Built for Every Type of Food Business
            </h2>
            <p className="text-stone-600 text-sm">
              Whether you run a single QSR outlet or a nationwide 50+ restaurant franchise, SmartServe adapts to your exact workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurantTypes.map((type, index) => {
              const IconComp = type.icon;
              return (
                <div 
                  key={index}
                  className="p-6 rounded-2xl bg-[#FFFBF0] border border-stone-200/80 hover:border-[#FF5B32] hover:shadow-lg transition-all space-y-3 group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#FFF2CF] text-[#FF5B32] flex items-center justify-center font-bold group-hover:bg-[#FF5B32] group-hover:text-white transition-colors">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-stone-900 text-lg">{type.name}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{type.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interactive Core Modules Tabbed Section */}
      <section id="modules-overview" className="py-20 bg-[#FFFBF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full bg-[#FFF2CF] text-[#FF5B32] text-xs font-bold uppercase tracking-wider">
              Complete POS Ecosystem
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900">
              Everything Your Restaurant Needs Under One Roof
            </h2>
            <p className="text-stone-600 text-base">
              Click through our core modules to see how SmartServe automates operations from front desk to central kitchen.
            </p>
          </div>

          {/* Module Nav Tabs */}
          <div className="flex flex-wrap justify-center gap-2 border-b border-stone-200 pb-4">
            {modules.map((mod) => {
              const IconComp = mod.icon;
              const isActive = activeModuleTab === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModuleTab(mod.id)}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                    isActive
                      ? "bg-[#FF5B32] text-white shadow-lg shadow-[#FF5B32]/30 scale-105"
                      : "bg-white text-stone-700 hover:bg-[#FFF2CF] border border-stone-200"
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{mod.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Module Details Display */}
          {modules.map((mod) => {
            if (mod.id !== activeModuleTab) return null;
            const IconComp = mod.icon;

            return (
              <div 
                key={mod.id}
                className="bg-white rounded-3xl p-8 sm:p-12 border-2 border-[#FF5B32]/20 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center animate-fade-in"
              >
                <div className="lg:col-span-7 space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF2CF] text-[#FF5B32] flex items-center justify-center font-bold">
                    <IconComp className="w-7 h-7" />
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-stone-900">
                    {mod.title}
                  </h3>

                  <p className="text-stone-600 text-base leading-relaxed">
                    {mod.desc}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {mod.highlights.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-stone-800 bg-[#FFF2CF]/40 p-3 rounded-xl border border-[#FF5B32]/10">
                        <CheckCircle2 className="w-4 h-4 text-[#FF5B32] flex-shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsLoginOpen(true)}
                    className="mt-4 px-6 py-3 rounded-xl bg-[#FF5B32] hover:bg-[#E04822] text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center gap-2"
                  >
                    <span>Launch {mod.label} Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="lg:col-span-5 bg-gradient-to-br from-[#FFF2CF]/80 to-[#FFFBF0] rounded-2xl p-6 border border-[#FF5B32]/30 space-y-4">
                  <div className="text-xs font-bold uppercase text-[#FF5B32]">Module Live Snapshot</div>
                  <div className="bg-white rounded-xl p-4 shadow-sm space-y-3 text-xs border border-stone-200">
                    <div className="flex justify-between font-bold border-b pb-2">
                      <span>Module ID</span>
                      <span className="font-mono text-[#FF5B32]">MOD-{mod.id.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Execution Speed</span>
                      <span className="font-bold text-emerald-600">&lt; 100ms API</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Multi-Tenant Status</span>
                      <span className="font-bold text-stone-900">Active & Synced</span>
                    </div>
                  </div>
                  <div className="text-[11px] text-stone-500 italic text-center">
                    Click any role in demo login to test full live interactive dashboard.
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </section>

      {/* NEW SECTION 2: TESTIMONIALS */}
      <section className="py-20 bg-white border-y border-[#FF5B32]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full bg-[#FFF2CF] text-[#FF5B32] text-xs font-bold uppercase tracking-wider">
              Client Success Stories
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900">
              Trusted by Top Chefs & Restaurant Owners
            </h2>
            <p className="text-stone-600 text-base">
              See how SmartServe POS streamlines billing, kitchen KDS prep, and multi-outlet inventory management across India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div 
                key={idx}
                className="bg-[#FFFBF0] rounded-3xl p-8 border border-[#FF5B32]/20 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6 relative"
              >
                <Quote className="w-10 h-10 text-[#FF5B32]/20 absolute top-6 right-6" />

                <div className="space-y-4">
                  {/* Rating Stars */}
                  <div className="flex gap-1 text-amber-500">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>

                  <p className="text-stone-700 text-sm leading-relaxed italic">
                    "{t.comment}"
                  </p>
                </div>

                {/* Author Info */}
                <div className="flex items-center gap-3 pt-4 border-t border-stone-200/60">
                  <div className={`w-11 h-11 rounded-2xl ${t.avatarBg} text-white font-black flex items-center justify-center text-base shadow-md`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{t.name}</h4>
                    <p className="text-xs text-[#FF5B32] font-semibold">{t.role}</p>
                    <p className="text-[11px] text-stone-500">{t.restaurant} • {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* NEW SECTION 3: CONTACT FORM */}
      <section id="contact-section" className="py-20 bg-gradient-to-b from-[#FFFBF0] via-[#FFF2CF]/30 to-[#FFFBF0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl border-2 border-[#FF5B32]/20 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left 5 Columns: Info & Contact Banner */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#FF5B32] to-[#E04822] p-8 sm:p-12 text-white flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full bg-[#FFF2CF] text-[#FF5B32] text-xs font-bold uppercase tracking-wider inline-block">
                  Talk to POS Experts
                </span>
                <h3 className="text-3xl font-black leading-tight">
                  Get a Personalized Demo & Customized Pricing Quote
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Have questions about menu migration, hardware compatibility, or multi-tenant setup? Fill out the form and our team will get in touch immediately.
                </p>
              </div>

              <div className="space-y-4 text-xs font-medium border-t border-white/20 pt-6">
                <div className="flex items-center gap-3">
                  <PhoneCall className="w-5 h-5 text-[#FFF2CF]" />
                  <span>Sales Helpline: +91 (800) 456-7890</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#FFF2CF]" />
                  <span>Support Email: sales@smartserve.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-[#FFF2CF]" />
                  <span>HQ: D&K SmartServe Product Division, Cyber City</span>
                </div>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 text-xs text-white/90 backdrop-blur-sm">
                ⚡ <span className="font-bold text-[#FFF2CF]">Instant Callback:</span> We typically respond within 15 minutes during operating hours.
              </div>
            </div>

            {/* Right 7 Columns: Interactive Contact Form */}
            <div className="lg:col-span-7 p-8 sm:p-12">
              <form onSubmit={handleContactSubmit} className="space-y-5">
                <div>
                  <h3 className="text-2xl font-bold text-stone-900">Request SmartServe POS Call Back</h3>
                  <p className="text-xs text-stone-500 mt-1">Free 14-Day Trial • Zero Setup Fee • No Credit Card Required</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                      Your Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={contactData.name}
                        onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                      Mobile Number *
                    </label>
                    <div className="relative">
                      <PhoneCall className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="tel"
                        required
                        value={contactData.phone}
                        onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                      Restaurant Name *
                    </label>
                    <div className="relative">
                      <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={contactData.restaurantName}
                        onChange={(e) => setContactData({ ...contactData, restaurantName: e.target.value })}
                        placeholder="e.g. Tasty Bites Cafe"
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={contactData.city}
                      onChange={(e) => setContactData({ ...contactData, city: e.target.value })}
                      placeholder="e.g. Mumbai / Delhi / Hyderabad"
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="email"
                      value={contactData.email}
                      onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                      placeholder="owner@restaurant.com"
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-stone-700 mb-1">
                    Message / Outlets Count
                  </label>
                  <textarea
                    rows={3}
                    value={contactData.message}
                    onChange={(e) => setContactData({ ...contactData, message: e.target.value })}
                    placeholder="Tell us about your restaurant setup or specific features needed..."
                    className="w-full p-3 text-sm rounded-xl border border-stone-300 focus:outline-none focus:border-[#FF5B32] focus:ring-2 focus:ring-[#FF5B32]/20 font-medium resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={contactSubmitted}
                  className="w-full py-4 rounded-2xl bg-[#FF5B32] hover:bg-[#E04822] text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-[#FF5B32]/30 flex items-center justify-center gap-2 transition-all group"
                >
                  {contactSubmitted ? (
                    <>
                      <Check className="w-5 h-5 animate-bounce" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      <span>Submit & Book Free Demo</span>
                    </>
                  )}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <footer className="mt-auto bg-stone-900 text-white pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="bg-gradient-to-r from-[#FF5B32] to-[#E04822] rounded-3xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl sm:text-3xl font-black">Transform Your Restaurant Operations Today</h3>
              <p className="text-white/80 text-sm">Instant setup • Zero hardware lock-in • 24/7 Priority Support</p>
            </div>
            <button
              onClick={() => setIsLoginOpen(true)}
              className="px-8 py-4 rounded-2xl bg-[#FFF2CF] text-[#FF5B32] font-black text-sm hover:bg-white transition-colors shadow-lg flex-shrink-0"
            >
              Test Free Live Demo
            </button>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-400 border-t border-stone-800 pt-8">
            <div className="flex items-center gap-2" suppressHydrationWarning>
              <span className="font-bold text-white">D&K SmartServe POS</span>
              <span>© {new Date().getFullYear()} All Rights Reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#contact-section" className="hover:text-white">Contact Sales</a>
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
            </div>
          </div>

        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
    </div>
  );
}
