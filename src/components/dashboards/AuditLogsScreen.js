"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/apiClient";
import { toast } from "sonner";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Users,
  RefreshCw,
  AlertTriangle,
  Clock,
  Trash2,
  Activity,
  CheckCircle2
} from "lucide-react";

const ACTION_BADGE = {
  MANAGER_SESSION_UNLOCK: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  MANAGER_SESSION_UNLOCK: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  MANAGER_SESSION_LOCK:   "bg-amber-50  text-amber-700  border border-amber-200",
  STAFF_UPDATE:           "bg-blue-50   text-blue-700   border border-blue-200",
  STAFF_DELETE:           "bg-red-50    text-red-700    border border-red-200",
  VOID_ORDER:             "bg-rose-50   text-rose-700   border border-rose-200",
  SHIFT_OPEN:             "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold",
  SHIFT_CLOSE:            "bg-purple-50 text-purple-700 border border-purple-200 font-bold",
  SETTINGS_UPDATE:        "bg-violet-50 text-violet-700 border border-violet-200",
  default:                "bg-stone-100 text-stone-700  border border-stone-200"
};

function getBadge(action) {
  if (!action) return ACTION_BADGE.default;
  for (const key of Object.keys(ACTION_BADGE)) {
    if (action.startsWith(key)) return ACTION_BADGE[key];
  }
  if (action.includes("UNLOCK")) return ACTION_BADGE.MANAGER_SESSION_UNLOCK;
  if (action.includes("LOCK"))   return ACTION_BADGE.MANAGER_SESSION_LOCK;
  if (action.includes("DELETE")) return ACTION_BADGE.STAFF_DELETE;
  return ACTION_BADGE.default;
}

function fmtExpiresAt(expiresAt) {
  if (!expiresAt) return "Unknown";
  const d = new Date(expiresAt);
  if (isNaN(d.getTime()) || d.getTime() < Date.now()) return "Expired";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function AuditLogsScreen() {
  const { activeRole, isManagerUnlocked, lockManagerSession, getActiveBranch } = useAuth();
  const branch = getActiveBranch();

  // ── Access guard ────────────────────────────────────────────────────────────
  const isAllowed = activeRole === "manager" || activeRole === "owner";

  // ── State ────────────────────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs]         = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loadingLogs, setLoadingLogs]       = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingId, setRevokingId]         = useState(null);
  const [revokingAll, setRevokingAll]       = useState(false);
  const [filterAction, setFilterAction]     = useState("all");
  const [lastRefreshed, setLastRefreshed]   = useState(null);


  // ── Data fetchers ────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(() => {
    setLoadingLogs(true);
    api.getAuditLogs()
      .then(res => { if (res?.success) setAuditLogs(res.data || []); })
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }, []);

  const fetchSessions = useCallback(() => {
    setLoadingSessions(true);
    api.getActiveSessions()
      .then(res => { if (res?.success) setActiveSessions(res.data || []); })
      .catch(() => {})
      .finally(() => { setLoadingSessions(false); setLastRefreshed(new Date()); });
  }, []);

  // Fetch once on mount — no background polling. Use the refresh button to reload.
  useEffect(() => {
    if (!isAllowed) return;
    fetchLogs();
    fetchSessions();
  }, [isAllowed, fetchLogs, fetchSessions]);

  // ── Computed stats ────────────────────────────────────────────────────────────
  const last24h = Date.now() - 24 * 60 * 60 * 1000;
  const failedAttempts = auditLogs.filter(l =>
    l.action === "MANAGER_SESSION_UNLOCK" &&
    (typeof l.details === "object" ? l.details?.status === "FAILED" : String(l.details || "").includes("FAILED")) &&
    new Date(l.createdAt).getTime() >= last24h
  ).length;

  // ── Session actions ───────────────────────────────────────────────────────────
  const handleRevoke = async (sessionId) => {
    setRevokingId(sessionId);
    const res = await api.revokeManagerSession(sessionId).catch(() => null);
    if (res?.success) {
      toast.success("Session revoked — that terminal is now locked.");
      setActiveSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    } else {
      toast.error(res?.message || "Failed to revoke session.");
    }
    setRevokingId(null);
  };

  const handleRevokeAll = async () => {
    if (!confirm("Revoke ALL active manager sessions? All unlocked terminals will be force-locked.")) return;
    setRevokingAll(true);
    const res = await api.revokeAllManagerSessions().catch(() => null);
    if (res?.success) {
      toast.success(`${res.data?.revokedCount || 0} session(s) force-locked.`);
      setActiveSessions([]);
      lockManagerSession(true); // also lock self silently
    } else {
      toast.error(res?.message || "Failed to revoke all sessions.");
    }
    setRevokingAll(false);
  };

  // ── Access Denied ─────────────────────────────────────────────────────────────
  if (!isAllowed) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <ShieldX className="w-12 h-12 text-stone-300 mx-auto" />
          <h2 className="font-black text-base text-stone-700">Access Restricted</h2>
          <p className="text-xs text-stone-400 max-w-xs">
            Audit Logs & Session Management is only accessible to Manager and Owner roles.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden font-sans">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-500 flex items-center justify-center text-white shadow-md shadow-[#FF5B32]/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Audit Logs & PIN Sessions</h2>
            <p className="text-xs text-stone-500">
              {branch?.name || "Main Outlet"} — Security Monitor &amp; Session Control
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isManagerUnlocked && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Manager Unlocked
            </div>
          )}
          <button
            onClick={() => { fetchLogs(); fetchSessions(); }}
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors cursor-pointer"
            title="Refresh All"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">

        {/* Active Sessions */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div>
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Active Sessions</span>
            <div className="mt-2 flex items-center gap-2">
              {activeSessions.length > 0 ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <h4 className="text-2xl font-black text-emerald-700">{activeSessions.length}</h4>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-300 shrink-0" />
                  <h4 className="text-2xl font-black text-stone-400">0</h4>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {activeSessions.length > 0 ? "Terminal(s) with unlocked manager access." : "All terminals are locked."}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-black text-[#FF5B32] uppercase mt-2">
            <Users className="w-3 h-3" /> Live Terminal View
          </div>
        </div>

        {/* Failed Auth Attempts (last 24h) */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div>
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Failed PIN Attempts (24h)</span>
            <div className="mt-2 flex items-center gap-2">
              {failedAttempts > 0 ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <h4 className="text-2xl font-black text-red-600">{failedAttempts}</h4>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <h4 className="text-2xl font-black text-stone-400">0</h4>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {failedAttempts > 0 ? "Suspicious PIN probe detected — review logs." : "No failed attempts in the last 24 hours."}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-black uppercase mt-2" style={{ color: failedAttempts > 0 ? "#ef4444" : "#10b981" }}>
            <ShieldAlert className="w-3 h-3" /> {failedAttempts > 0 ? "Threat Alert" : "All Clear"}
          </div>
        </div>

        {/* Security Policy */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between min-h-[130px]">
          <div>
            <span className="text-[10px] font-black uppercase text-stone-400 tracking-wider">Security Policy</span>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              All critical manager actions are logged. Unlocked sessions expire after <strong>30 minutes</strong>.
              Owners can force-revoke any session instantly.
            </p>
          </div>
          <div className="text-[10px] text-stone-400 font-mono mt-2">
            Terminal: {branch?.name || "Main POS"}
          </div>
        </div>
      </div>

      {/* ── Active Sessions Panel ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm shrink-0">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-black text-xs text-stone-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Unlocked Sessions
            {lastRefreshed && (
              <span className="font-normal text-stone-400 text-[10px]">
                · updated {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchSessions(); fetchLogs(); }}
              disabled={loadingSessions}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh sessions"
            >
              <RefreshCw className={`w-3 h-3 ${loadingSessions ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {activeSessions.length > 0 && (
              <button
                onClick={handleRevokeAll}
                disabled={revokingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] shadow-md shadow-red-500/25 disabled:opacity-50 transition-all cursor-pointer"
              >
                <ShieldX className="w-3.5 h-3.5" />
                {revokingAll ? "Revoking…" : "🔴 Revoke ALL Sessions"}
              </button>
            )}
          </div>
        </div>

        <div className="p-3">
          {loadingSessions ? (
            <p className="text-xs text-stone-400 font-bold text-center py-4">Loading sessions…</p>
          ) : activeSessions.length === 0 ? (
            <div className="flex items-center gap-2 py-4 justify-center text-xs text-stone-400 font-bold">
              <Lock className="w-4 h-4" /> No active sessions — all terminals are locked.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {activeSessions.map(s => {
                return (
                  <div
                    key={s.sessionId}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-sm shrink-0">
                        {(s.staffName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-stone-900 truncate">{s.staffName}</p>
                        <p className="text-[10px] text-stone-500 capitalize">{s.staffRole}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-stone-400">Unlocked</p>
                        <p className="text-[11px] font-bold text-stone-700">
                          {new Date(s.unlockedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700">
                        <Clock className="w-3 h-3" />
                        Expires {fmtExpiresAt(s.expiresAt)}
                      </div>
                      <button
                        onClick={() => handleRevoke(s.sessionId)}
                        disabled={revokingId === s.sessionId}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 font-bold text-[11px] transition-colors disabled:opacity-50 cursor-pointer"
                        title="Force Revoke This Session"
                      >
                        <Trash2 className="w-3 h-3" />
                        {revokingId === s.sessionId ? "…" : "Revoke"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Logs Table ──────────────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden min-h-[220px]">
        <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <h3 className="font-black text-xs text-stone-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#FF5B32]" />
            Manager PIN Activity Log
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-xs font-bold text-stone-600 outline-none focus:border-stone-400"
            >
              <option value="all">All Actions</option>
              <option value="MANAGER_SESSION_UNLOCK">Session Unlocks</option>
              <option value="MANAGER_SESSION_LOCK">Session Locks</option>
              <option value="SETTINGS_UPDATE">Settings Changes</option>
              <option value="STAFF_CREATE">Staff Creations</option>
              <option value="STAFF_UPDATE">Staff Updates</option>
              <option value="STAFF_DELETE">Staff Deletions</option>
              <option value="VOID_ORDER">Voids / Discounts</option>
            </select>
            <button
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingLogs ? (
            <div className="p-8 text-center text-xs text-stone-500 font-bold">Loading activity logs…</div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-400 font-bold">No activity logs recorded yet.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-[10px] font-black text-stone-500 uppercase tracking-wider sticky top-0">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-[11px] font-medium">
                {auditLogs
                  .filter(l => filterAction === "all" || l.action === filterAction)
                  .map(log => {
                    const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown";
                    const d = log.details || {};
                    const actor  = d.user || d.performedBy || "System";
                    const role   = d.role || "—";
                    const status = d.status || "—";
                    const badge  = getBadge(log.action);

                    const statusColor =
                      status === "SUCCESS"       ? "text-emerald-600 font-bold" :
                      status === "FAILED"        ? "text-red-600 font-bold" :
                      status === "EXPIRED"       ? "text-amber-600 font-bold" :
                      status === "FORCE_REVOKED" ? "text-red-700 font-black" :
                      status === "ALL_FORCE_REVOKED" ? "text-red-700 font-black" :
                      "text-stone-500";

                    // Remaining detail keys
                    const extras = Object.entries(d)
                      .filter(([k]) => !["user", "performedBy", "role", "status", "pinUsed"].includes(k))
                      .map(([, v]) => v)
                      .join(" ");

                    return (
                      <tr key={log.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-4 py-3 text-stone-400 font-mono text-[10px] whitespace-nowrap">{dateStr}</td>
                        <td className="px-4 py-3 font-bold text-stone-900">{actor}</td>
                        <td className="px-4 py-3 text-stone-500 capitalize">{role}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${badge}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className={`px-4 py-3 ${statusColor}`}>{status}</td>
                        <td className="px-4 py-3 text-stone-400 max-w-[180px] truncate" title={extras}>{extras || "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
