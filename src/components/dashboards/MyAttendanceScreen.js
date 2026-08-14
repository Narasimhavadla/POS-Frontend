"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/apiClient";
import { toast } from "sonner";
import {
  Clock, CheckCircle2, XCircle, LogIn, LogOut,
  CalendarDays, TrendingUp, AlertTriangle, Timer,
  ChevronLeft, ChevronRight, X, FileText,
  PlaneTakeoff, Plus, Send, Trash2, CheckCheck, Ban
} from "lucide-react";

const STATUS_CONFIG = {
  PRESENT:  { label: "Present",   color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  ABSENT:   { label: "Absent",    color: "bg-rose-100 text-rose-800 border-rose-200" },
  HALF_DAY: { label: "Half Day",  color: "bg-blue-100 text-blue-800 border-blue-200" },
  ON_LEAVE: { label: "On Leave",  color: "bg-violet-100 text-violet-800 border-violet-200" },
  PENDING:  { label: "Active",    color: "bg-amber-100 text-amber-800 border-amber-200" }
};

const fmtTime = (ts) => ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDate = (d) => new Date(d).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default function MyAttendanceScreen() {
  const { user } = useAuth();

  const [todayRecord, setTodayRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date());
  const [now, setNow] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [activeTab, setActiveTab] = useState("attendance"); // "attendance" | "leaves"

  // Leave request state
  const [myLeaves, setMyLeaves] = useState([]);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: "CASUAL",
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
    reason: ""
  });

  // Modal for clicking a day on calendar
  const [selectedDateDetail, setSelectedDateDetail] = useState(null);

  // Live timer tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [histRes, holRes] = await Promise.all([
        api.getMyAttendance({ limit: 90 }),
        api.getHolidays()
      ]);
      if (histRes?.success) {
        setHistory(histRes.data || []);
        setSummary(histRes.summary || null);

        const today = new Date().toISOString().split("T")[0];
        const todayRec = (histRes.data || []).find(r => r.date === today);
        setTodayRecord(todayRec || null);
      }
      if (holRes?.success) {
        setHolidays(holRes.data || []);
      }
    } catch (e) {
      console.warn("Attendance fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaves = useCallback(async () => {
    setLeaveLoading(true);
    try {
      const res = await api.getMyLeaveRequests();
      if (res?.success) setMyLeaves(res.data || []);
    } catch (e) {
      console.warn("Leave fetch error:", e);
    } finally {
      setLeaveLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); fetchLeaves(); }, [fetchData, fetchLeaves]);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const res = await api.clockIn();
      if (res?.success) { toast.success("✅ Clocked in successfully!"); fetchData(); }
      else toast.error(res?.message || "Failed to clock in.");
    } catch (e) { toast.error("Clock-in failed."); }
    finally { setActionLoading(false); }
  };

  const handleClockOut = async () => {
    setActionLoading(true);
    try {
      const res = await api.clockOut();
      if (res?.success) { toast.success("👋 Clocked out. Have a great day!"); fetchData(); }
      else toast.error(res?.message || "Failed to clock out.");
    } catch (e) { toast.error("Clock-out failed."); }
    finally { setActionLoading(false); }
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.leaveType) {
      toast.error("Please fill all required fields."); return;
    }
    try {
      const res = await api.submitLeaveRequest(leaveForm);
      if (res?.success) {
        toast.success("✅ Leave request submitted successfully!");
        setShowLeaveModal(false);
        setLeaveForm({ leaveType: "CASUAL", fromDate: new Date().toISOString().split("T")[0], toDate: new Date().toISOString().split("T")[0], reason: "" });
        fetchLeaves();
      } else {
        toast.error(res?.message || "Failed to submit leave request.");
      }
    } catch (e) { toast.error("Error submitting leave."); }
  };

  const handleCancelLeave = async (id) => {
    try {
      const res = await api.cancelLeaveRequest(id);
      if (res?.success) { toast.success("Leave request cancelled."); fetchLeaves(); }
      else toast.error(res?.message || "Failed to cancel.");
    } catch (e) { toast.error("Error cancelling leave."); }
  };

  const LEAVE_TYPE_LABELS = {
    CASUAL: "Casual Leave", SICK: "Sick Leave", EARNED: "Earned Leave",
    MATERNITY: "Maternity Leave", PATERNITY: "Paternity Leave",
    UNPAID: "Unpaid Leave", OTHER: "Other"
  };

  const isClockedIn = todayRecord?.clockIn && !todayRecord?.clockOut;
  const isClockedOut = todayRecord?.clockOut;

  const getElapsed = () => {
    if (!todayRecord?.clockIn) return null;
    const from = new Date(todayRecord.clockIn);
    const diff = Math.max(0, now - from);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  // Calendar math
  const calYear = calMonth.getFullYear();
  const calMonthIdx = calMonth.getMonth();
  const daysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate();
  const firstDayOfMonth = new Date(calYear, calMonthIdx, 1).getDay();

  const historyByDate = {};
  history.forEach(r => { historyByDate[r.date] = r; });

  const calDots = {
    PRESENT:  "bg-emerald-500",
    HALF_DAY: "bg-blue-500",
    ABSENT:   "bg-rose-500",
    ON_LEAVE: "bg-violet-500",
    PENDING:  "bg-amber-500"
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#FF5B32] border-t-transparent rounded-full animate-spin" />
          <p className="text-stone-500 text-sm font-bold">Loading attendance…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-stone-50">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF5B32] to-orange-400 flex items-center justify-center shadow-lg shadow-orange-200 text-white">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-stone-900">My Attendance & Leave Portal</h1>
            <p className="text-xs text-stone-500 font-medium">
              {user?.name || user?.username} &bull; {new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Tab Buttons & Apply Leave action */}
        <div className="flex items-center gap-2">
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("attendance")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "attendance" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              My Attendance
            </button>
            <button
              onClick={() => setActiveTab("leaves")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "leaves" ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
              }`}
            >
              <PlaneTakeoff className="w-3.5 h-3.5" />
              My Leaves
              {myLeaves.filter(l => l.status === "PENDING").length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>
          </div>

          {activeTab === "leaves" && (
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-3 py-2 rounded-xl bg-[#FF5B32] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#FF5B32]/20 hover:bg-[#e04d26] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Apply Leave
            </button>
          )}
        </div>
      </div>

      {activeTab === "leaves" ? (
        /* ── MY LEAVES TAB ── */
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <PlaneTakeoff className="w-4 h-4 text-[#FF5B32]" />
                  Leave Request History
                </h3>
                <p className="text-xs text-stone-500">Track and manage your submitted leave applications</p>
              </div>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="px-3 py-1.5 rounded-xl bg-stone-900 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-black transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Request Leave
              </button>
            </div>

            {leaveLoading ? (
              <div className="py-12 text-center text-xs text-stone-400 font-bold">Loading leave history...</div>
            ) : myLeaves.length === 0 ? (
              <div className="py-12 text-center space-y-2 border-2 border-dashed border-stone-200 rounded-2xl">
                <PlaneTakeoff className="w-8 h-8 text-stone-300 mx-auto" />
                <p className="text-xs font-bold text-stone-500">No leave requests found</p>
                <p className="text-[11px] text-stone-400">Click "Request Leave" above to apply for leaves.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-[10px] font-black text-stone-400 uppercase tracking-wider bg-stone-50">
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Dates</th>
                      <th className="py-2.5 px-3 text-center">Days</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Reviewed By</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                    {myLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-stone-900">
                          {LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}
                        </td>
                        <td className="py-3 px-3 font-mono text-stone-800 font-semibold whitespace-nowrap">
                          {l.fromDate} → {l.toDate}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-stone-900">
                          {l.totalDays} {l.totalDays === 1 ? "day" : "days"}
                        </td>
                        <td className="py-3 px-3 text-stone-500 max-w-[200px] truncate" title={l.reason}>
                          {l.reason || "—"}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black ${
                            l.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : l.status === "REJECTED"
                              ? "bg-rose-100 text-rose-800 border-rose-200"
                              : "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                          }`}>
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-stone-500">
                          {l.reviewedBy ? (
                            <div>
                              <p className="font-bold text-stone-800">{l.reviewedBy}</p>
                              {l.reviewNotes && <p className="text-[10px] text-stone-400 italic">"{l.reviewNotes}"</p>}
                            </div>
                          ) : "—"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {l.status === "PENDING" && (
                            <button
                              onClick={() => handleCancelLeave(l.id)}
                              className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── MY ATTENDANCE TAB CONTENT ── */
        <div className="space-y-4">

      {/* Main Grid: Today's Shift Card + Compact Calendar Side-by-Side on larger screens */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

        {/* Left / Today's Shift Card (md:col-span-7) */}
        <div className="md:col-span-7 bg-gradient-to-br from-stone-900 to-stone-800 rounded-3xl p-6 shadow-xl text-white space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-stone-300 uppercase tracking-wider">Today's Shift</p>
            {todayRecord?.isLate && (
              <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Late by {todayRecord.lateByMinutes}m
              </span>
            )}
          </div>

          <div className="text-center py-2">
            <p className="text-4xl font-black font-mono tabular-nums tracking-tight">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            {isClockedIn && (
              <p className="text-emerald-400 text-xs font-bold mt-1 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                On Duty — {getElapsed()}
              </p>
            )}
            {isClockedOut && (
              <p className="text-stone-400 text-xs font-bold mt-1">
                Shift ended · {todayRecord.hoursWorked}h worked
              </p>
            )}
            {!todayRecord && (
              <p className="text-stone-400 text-xs font-bold mt-1">Not clocked in yet</p>
            )}
          </div>

          {!isClockedOut && (
            <button
              onClick={isClockedIn ? handleClockOut : handleClockIn}
              disabled={actionLoading}
              className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-60 ${
                isClockedIn
                  ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30 active:scale-95 text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30 active:scale-95 text-white"
              }`}
            >
              {actionLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isClockedIn ? (
                <><LogOut className="w-4 h-4" /> Clock Out</>
              ) : (
                <><LogIn className="w-4 h-4" /> Clock In</>
              )}
            </button>
          )}

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-stone-400 font-bold">Clock In</p>
              <p className="font-black text-white">{fmtTime(todayRecord?.clockIn)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-stone-400 font-bold">Clock Out</p>
              <p className="font-black text-white">{fmtTime(todayRecord?.clockOut)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <p className="text-stone-400 font-bold">Hours</p>
              <p className="font-black text-white">{isClockedIn ? getElapsed()?.split(" ").slice(0,2).join(" ") : (todayRecord?.hoursWorked ? `${todayRecord.hoursWorked}h` : "—")}</p>
            </div>
          </div>

          {(todayRecord?.scheduledStart || todayRecord?.scheduledEnd) && (
            <p className="text-center text-xs text-stone-400 font-medium">
              Scheduled: {todayRecord.scheduledStart || "—"} → {todayRecord.scheduledEnd || "—"}
            </p>
          )}
        </div>

        {/* Right / Compact Calendar Card (md:col-span-5) */}
        <div className="md:col-span-5 bg-white rounded-3xl border border-stone-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#FF5B32]" />
              {calMonth.toLocaleDateString([], { month: "long", year: "numeric" })}
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCalMonth(new Date(calYear, calMonthIdx - 1, 1))} className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 cursor-pointer">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCalMonth(new Date(calYear, calMonthIdx + 1, 1))} className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 cursor-pointer">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} className="text-[10px] font-black text-stone-400 py-0.5">{d}</div>
            ))}
          </div>

          {/* Compact Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${calYear}-${String(calMonthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const rec = historyByDate[dateStr];
              const isToday = dateStr === new Date().toISOString().split("T")[0];

              // Check for holiday rule match (recurring day of week or specific date)
              const dayDateObj = new Date(calYear, calMonthIdx, day);
              const dayOfWeekVal = dayDateObj.getDay();
              const holMatch = holidays.find(h => (h.isRecurring && h.dayOfWeek === dayOfWeekVal) || h.date === dateStr);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDateDetail({ date: dateStr, record: rec, holiday: holMatch })}
                  className={`h-8 rounded-xl flex flex-col items-center justify-center text-[11px] font-bold transition-all cursor-pointer hover:ring-2 hover:ring-[#FF5B32]/40 ${
                    isToday
                      ? "bg-[#FF5B32] text-white shadow-sm shadow-orange-300"
                      : holMatch
                      ? "bg-amber-50 text-amber-900 border border-amber-300 font-black"
                      : rec
                      ? "bg-stone-100 text-stone-900 hover:bg-stone-200"
                      : "text-stone-400 hover:bg-stone-100"
                  }`}
                >
                  <span>{day}</span>
                  {holMatch ? (
                    <span className="w-1.5 h-1.5 rounded-full -mt-0.5 bg-amber-500" title={holMatch.title} />
                  ) : rec ? (
                    <span className={`w-1.5 h-1.5 rounded-full -mt-0.5 ${calDots[rec.status] || "bg-stone-400"}`} />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-2 gap-y-1 pt-2 border-t border-stone-100 text-[10px] text-stone-500 font-bold justify-center">
            {Object.entries(calDots).map(([s, c]) => (
              <div key={s} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${c}`} />
                {STATUS_CONFIG[s]?.label}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Summary KPI Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Days Present", value: summary.totalDaysPresent, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Total Hours", value: `${summary.totalHours}h`, icon: Timer, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Avg Hrs/Day", value: `${summary.avgHours}h`, icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Late Arrivals", value: summary.lateCount, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" }
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-1.5">
                <div className={`w-8 h-8 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
                <p className="text-xl font-black text-stone-900">{kpi.value}</p>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{kpi.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Attendance Detail Modal (opens when clicking any calendar day) ── */}
      {selectedDateDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#FF5B32]" />
                Attendance Detail
              </h3>
              <button
                onClick={() => setSelectedDateDetail(null)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-stone-500">
                Date: <span className="text-stone-900 font-black">{fmtDate(selectedDateDetail.date)}</span>
              </p>

              {/* Holiday banner if date is a holiday */}
              {selectedDateDetail.holiday && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-0.5">
                  <p className="text-xs font-black flex items-center gap-1.5">
                    🎉 Restaurant Holiday / Weekly Off
                  </p>
                  <p className="text-xs font-bold text-amber-800">{selectedDateDetail.holiday.title}</p>
                </div>
              )}

              {selectedDateDetail.record ? (
                <>
                  {/* Status chip */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-200">
                    <span className="text-xs font-bold text-stone-600">Duty Status</span>
                    <span className={`px-3 py-1 rounded-full border text-xs font-black ${STATUS_CONFIG[selectedDateDetail.record.status]?.color || "bg-stone-100 text-stone-700"}`}>
                      {selectedDateDetail.record.status === "PENDING" ? "Active" : selectedDateDetail.record.status?.replace("_", " ")}
                    </span>
                  </div>

                  {/* Time detail grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-0.5">
                      <p className="text-[10px] font-bold text-stone-400 uppercase">Clock In</p>
                      <p className="text-sm font-black text-stone-900 font-mono">{fmtTime(selectedDateDetail.record.clockIn)}</p>
                    </div>
                    <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-0.5">
                      <p className="text-[10px] font-bold text-stone-400 uppercase">Clock Out</p>
                      <p className="text-sm font-black text-stone-900 font-mono">{fmtTime(selectedDateDetail.record.clockOut)}</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
                    <div className="flex justify-between text-stone-600">
                      <span>Hours Worked:</span>
                      <span className="font-black text-stone-900">{selectedDateDetail.record.hoursWorked ? `${selectedDateDetail.record.hoursWorked} hours` : "In progress…"}</span>
                    </div>
                    {selectedDateDetail.record.isLate && (
                      <div className="flex justify-between text-amber-700 font-bold">
                        <span>Lateness:</span>
                        <span>Late by {selectedDateDetail.record.lateByMinutes} min</span>
                      </div>
                    )}
                    {selectedDateDetail.record.overtimeHours > 0 && (
                      <div className="flex justify-between text-blue-700 font-bold">
                        <span>Overtime:</span>
                        <span>+{selectedDateDetail.record.overtimeHours} hours</span>
                      </div>
                    )}
                    {(selectedDateDetail.record.scheduledStart || selectedDateDetail.record.scheduledEnd) && (
                      <div className="flex justify-between text-stone-500 border-t border-stone-200 pt-1.5">
                        <span>Scheduled Shift:</span>
                        <span className="font-bold">{selectedDateDetail.record.scheduledStart || "—"} → {selectedDateDetail.record.scheduledEnd || "—"}</span>
                      </div>
                    )}
                    {selectedDateDetail.record.notes && (
                      <div className="border-t border-stone-200 pt-1.5 text-stone-600">
                        <span className="font-bold">Note:</span> {selectedDateDetail.record.notes}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-stone-50 border border-stone-200 text-stone-400 text-xs font-semibold">
                  No clock-in record logged for this date.
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedDateDetail(null)}
              className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
        </div>
      )}

      {/* ── APPLY LEAVE MODAL ── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <PlaneTakeoff className="w-5 h-5 text-[#FF5B32]" />
                Apply for Leave
              </h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5B32]"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="EARNED">Earned Leave</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="PATERNITY">Paternity Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={leaveForm.fromDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5B32]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={leaveForm.toDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5B32]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Reason / Note</label>
                <textarea
                  rows={3}
                  placeholder="Explain your reason for leave request..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5B32]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
