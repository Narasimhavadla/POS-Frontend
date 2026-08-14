"use client";

import React from "react";
import { 
  ShieldAlert, 
  Server, 
  Users, 
  Activity, 
  Key, 
  Database, 
  FileText,
  Search,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

export default function SuperAdminDashboard() {
  const tenants = [
    { id: "TNT-001", name: "Royal Spice Group", plan: "Enterprise Chain", status: "Healthy", dbStatus: "Connected (PostgreSQL)", activeOutlets: 6 },
    { id: "TNT-002", name: "Urban Cafe Co.", plan: "Professional", status: "Healthy", dbStatus: "Connected (PostgreSQL)", activeOutlets: 2 },
    { id: "TNT-003", name: "Tandoori Nights", plan: "Starter POS", status: "Warning (High Load)", dbStatus: "Connected (PostgreSQL)", activeOutlets: 1 },
    { id: "TNT-004", name: "Bistro 52", plan: "Enterprise Chain", status: "Healthy", dbStatus: "Connected (PostgreSQL)", activeOutlets: 4 }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-stone-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-stone-800">
        <div>
          <div className="flex items-center gap-2 text-[#FF5B32] font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Platform Master Super-Admin Controls</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">System Infrastructure & License Console</h1>
          <p className="text-stone-400 text-xs sm:text-sm mt-0.5">
            Global Cloud Monitoring • 4 Active Tenants • 13 Restaurant Instances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            All API Systems Operational
          </span>
        </div>
      </div>

      {/* System Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Server CPU Load</span>
            <Server className="w-4 h-4 text-[#FF5B32]" />
          </div>
          <div className="text-2xl font-black text-stone-900">24% Avg</div>
          <div className="w-full bg-stone-100 rounded-full h-2">
            <div className="bg-[#FF5B32] h-2 rounded-full w-1/4"></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Database Connections</span>
            <Database className="w-4 h-4 text-[#FF5B32]" />
          </div>
          <div className="text-2xl font-black text-stone-900">142 Active Pool</div>
          <p className="text-[11px] text-emerald-600 font-bold">Latency: 12ms (Normal)</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Platform Subscription ARR</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">₹18.4 Lakhs</div>
          <p className="text-[11px] text-stone-400">+12% MRR growth this month</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold">
            <span>Active Tenant Licences</span>
            <Key className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">4 / 10 Max</div>
          <p className="text-[11px] text-stone-400">All licenses in compliance</p>
        </div>
      </div>

      {/* Tenants Platform Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">Tenant Organizations Management</h3>
            <p className="text-xs text-stone-500">Live health monitoring & database instance provisioning</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-xl bg-[#FFF2CF] text-[#FF5B32] font-bold text-xs hover:bg-[#FF5B32] hover:text-white transition-colors">
              + Provision New Tenant
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-100">
              <tr>
                <th className="p-4">Tenant ID & Name</th>
                <th className="p-4">Subscription Plan</th>
                <th className="p-4">System Status</th>
                <th className="p-4">Database Routing</th>
                <th className="p-4 text-center">Outlets</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-stone-900 text-sm">{t.name}</div>
                    <div className="text-[10px] text-stone-400 font-mono">{t.id}</div>
                  </td>
                  <td className="p-4 font-semibold text-stone-700">{t.plan}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 ${
                      t.status.includes("Healthy") 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {t.status.includes("Healthy") ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-[11px] text-stone-500">{t.dbStatus}</td>
                  <td className="p-4 text-center font-bold">{t.activeOutlets} Outlets</td>
                  <td className="p-4 text-right space-x-2">
                    <button className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 font-bold hover:bg-stone-200">
                      Audit Logs
                    </button>
                    <button className="px-2.5 py-1 rounded-lg bg-[#FF5B32] text-white font-bold hover:bg-[#E04822]">
                      Configure
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
