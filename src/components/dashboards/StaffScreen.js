"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { api } from "@/services/apiClient";
import {
  Users,
  UserCheck,
  Clock,
  Plus,
  Shield,
  Briefcase,
  ChefHat,
  CreditCard,
  Utensils,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  Phone,
  CalendarCheck,
  Activity,
  Timer,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  UserX,
  RefreshCw,
  LogIn,
  LogOut,
  Dot,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  Sun,
  Calendar,
  Trash2
} from "lucide-react";

const ROLE_CONFIG = {
  owner: { label: "Owner", color: "bg-violet-100 text-violet-700 border-violet-200", icon: Shield },
  manager: { label: "Manager", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Briefcase },
  kitchen: { label: "Kitchen", color: "bg-orange-100 text-orange-700 border-orange-200", icon: ChefHat },
  cashier: { label: "Cashier", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CreditCard },
  waiter: { label: "Waiter", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Utensils }
};

export default function StaffScreen() {
  const { store, setStore, getActiveTenant, getActiveBranch, isManagerUnlocked, unlockedManagerPin, verifyManagerPin } = useAuth();
  const tenant = getActiveTenant();
  const branch = getActiveBranch();

  useEffect(() => {
    api.getStaff().then((res) => {
      if (res && res.success && Array.isArray(res.data)) {
        setStore((prev) => ({ ...prev, staff: res.data }));
      }
    }).catch((err) => console.warn("Staff fetch error:", err));
  }, []);

  const staff = store.staff || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    role: "waiter",
    pin: "1234",
    email: "",
    phone: "",
    shiftStart: "09:00",
    shiftEnd: "18:00"
  });
  const [filterRole, setFilterRole] = useState("all");
  const [revealedPins, setRevealedPins] = useState({});

  // ── Tab state
  const [activeTab, setActiveTab] = useState("roster"); // "roster" | "attendance"

  // ── Attendance state
  const [attendanceLog, setAttendanceLog] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [liveClockIns, setLiveClockIns] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceDateRange, setAttendanceDateRange] = useState("today");
  const [attendanceTab, setAttendanceTab] = useState("live"); // "live" | "log" | "summary"
  const [selectedStaffSummaryId, setSelectedStaffSummaryId] = useState(null);
  const [summaryCalMonth, setSummaryCalMonth] = useState(new Date());

  // Mark-absent modal
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [absentForm, setAbsentForm] = useState({ userId: "", staffName: "", staffRole: "", staffId: "", date: new Date().toISOString().split("T")[0], notes: "" });

  // ── Holiday state
  const [holidays, setHolidays] = useState([]);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ title: "", date: new Date().toISOString().split("T")[0], dayOfWeek: "0", isRecurring: false, type: "PUBLIC_HOLIDAY", description: "" });

  // ── Leave Requests state (Owner view)
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [pendingLeaveCount, setPendingLeaveCount] = useState(0);

  // Visibility toggle for PIN fields in modals
  const [showCreatePin, setShowCreatePin] = useState(false);
  const [showEditPin, setShowEditPin] = useState(false);

  // Manager PIN Authorization states for Edit & Delete
  const [editManagerPin, setEditManagerPin] = useState("");
  const [deleteManagerPin, setDeleteManagerPin] = useState("");
  const [showEditManagerPin, setShowEditManagerPin] = useState(false);
  const [showDeleteManagerPin, setShowDeleteManagerPin] = useState(false);

  const [shiftState, setShiftState] = useState({
    "s-1": { status: "On Shift", clockIn: "08:00 AM" },
    "usr-cashier": { status: "On Shift", clockIn: "09:30 AM" }
  });

  const filtered = filterRole === "all" ? staff : staff.filter((s) => s.role === filterRole);

  const toggleShift = (staffId, name) => {
    setShiftState((prev) => {
      const current = prev[staffId];
      if (current && current.status === "On Shift") {
        toast.info(`Clocked Out ${name}`);
        return {
          ...prev,
          [staffId]: { status: "Off Duty", clockIn: "--" }
        };
      } else {
        toast.success(`Clocked In ${name}`);
        return {
          ...prev,
          [staffId]: { status: "On Shift", clockIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        };
      }
    });
  };

  // Edit Full Staff Details Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStaffData, setEditStaffData] = useState(null);

  // Delete Staff Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetDeleteStaff, setTargetDeleteStaff] = useState(null);

  const handleOpenEditModal = (member) => {
    const fallbackMaskedPin = !member.pin && member.pinSet;
    setEditStaffData({
      id: member.id,
      staffId: member.staffId,
      name: member.name || "",
      role: member.role || "waiter",
      email: member.email || "",
      phone: member.phone || "",
      shiftStart: member.shiftStart || "09:00",
      shiftEnd: member.shiftEnd || "18:00",
      pin: member.pin || (fallbackMaskedPin ? "••••" : ""),
      pinMaskedFallback: fallbackMaskedPin,
      salary: member.salary || 15000
    });
    setEditManagerPin("");
    setShowEditPin(false);
    setShowEditManagerPin(false);
    setShowEditModal(true);
  };

  const handleEditStaffSubmit = async (e) => {
    e.preventDefault();
    if (!editStaffData || !editStaffData.name || !editStaffData.email) {
      toast.error("Please enter staff name and email.");
      return;
    }

    const pinToUse = isManagerUnlocked ? (unlockedManagerPin || "UNLOCKED") : editManagerPin;
    if (!isManagerUnlocked && !pinToUse) {
      toast.error("Authorizing Manager PIN is required.");
      return;
    }

    try {
      const updatePayload = {
        ...editStaffData,
        managerPin: pinToUse
      };
      const submittedPin = String(editStaffData.pin || "").trim();
      const isMaskedFallbackUnchanged = editStaffData.pinMaskedFallback && submittedPin === "••••";
      if (!submittedPin || isMaskedFallbackUnchanged) {
        delete updatePayload.pin;
      }
      delete updatePayload.pinMaskedFallback;

      const res = await api.updateStaff(editStaffData.id, updatePayload);
      if (res && res.success) {
        const latest = await api.getStaff();
        if (latest?.success && Array.isArray(latest.data)) {
          setStore((prev) => ({ ...prev, staff: latest.data }));
        } else {
          setStore((prev) => ({
            ...prev,
            staff: (prev.staff || []).map((s) => (s.id === editStaffData.id || s.staffId === editStaffData.staffId ? { ...s, ...res.data } : s))
          }));
        }
        toast.success(`Updated ${editStaffData.name}'s profile successfully`);
        setShowEditModal(false);
      } else {
        toast.error(res?.message || "Failed to update staff member. Authorization denied.");
      }
    } catch (err) {
      toast.error(`Update error: ${err.message}`);
    }
  };

  const handleOpenDeleteModal = (member) => {
    setTargetDeleteStaff(member);
    setDeleteManagerPin("");
    setShowDeleteManagerPin(false);
    setShowDeleteModal(true);
  };

  const handleDeleteStaffConfirm = async (e) => {
    e?.preventDefault();
    if (!targetDeleteStaff) return;

    const pinToUse = isManagerUnlocked ? (unlockedManagerPin || "UNLOCKED") : deleteManagerPin;
    if (!isManagerUnlocked && !pinToUse) {
      toast.error("Authorizing Manager PIN is required to delete staff.");
      return;
    }

    try {
      const res = await api.deleteStaff(targetDeleteStaff.id, { managerPin: pinToUse });
      if (res && res.success) {
        toast.success(`Removed ${targetDeleteStaff.name} from staff roster`);
        setStore((prev) => ({
          ...prev,
          staff: (prev.staff || []).filter((s) => s.id !== targetDeleteStaff.id && s.staffId !== targetDeleteStaff.staffId)
        }));
        setShowDeleteModal(false);
        setTargetDeleteStaff(null);
      } else {
        toast.error(res?.message || "Failed to delete staff member. Authorization denied.");
      }
    } catch (err) {
      toast.error(`Delete error: ${err.message}`);
    }
  };

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) {
      toast.error("Please enter staff name and email.");
      return;
    }
    if (!newStaff.pin || newStaff.pin.length < 4) {
      toast.error("Security PIN must be at least 4 digits.");
      return;
    }

    const payload = {
      branchId: branch?.id || "br-1",
      name: newStaff.name,
      role: newStaff.role,
      email: newStaff.email,
      phone: newStaff.phone || "+91 98765 43210",
      pin: newStaff.pin,
      shiftStart: newStaff.shiftStart || "09:00",
      shiftEnd: newStaff.shiftEnd || "18:00",
      salary: 15000,
      isOnDuty: true
    };

    try {
      const res = await api.createStaff(payload);
      if (res && res.success && res.data) {
        const created = res.data;
        setStore((prev) => ({
          ...prev,
          staff: [created, ...(prev.staff || [])]
        }));
        toast.success(`Added ${created.name} as ${(created.role || '').toUpperCase()}`, {
          description: `Staff ID: ${created.staffId} | SSID: ${created.ssid}`
        });
      } else {
        // Fallback local insertion if server creation returns unexpected error
        const localId = `s-${Date.now()}`;
        const member = { id: localId, staffId: String(100101 + (store.staff || []).length), ...payload };
        setStore((prev) => ({ ...prev, staff: [member, ...(prev.staff || [])] }));
        toast.success(`Added ${newStaff.name} as ${newStaff.role.toUpperCase()}`);
      }
    } catch (err) {
      toast.error(`Creation error: ${err.message}`);
    }

    setNewStaff({ name: "", role: "waiter", pin: "1234", email: "", phone: "", shiftStart: "09:00", shiftEnd: "18:00" });
    setShowAddModal(false);
  };

  const onShiftCount = liveClockIns.length;

  // ── Attendance & Holiday fetch
  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const startDate = attendanceDateRange === "today" ? today : attendanceDateRange === "week" ? weekAgo : monthAgo;

      const [logRes, summaryRes, liveRes, holRes, leaveRes] = await Promise.all([
        api.getAllAttendance({ startDate, endDate: today, limit: 200 }),
        api.getAttendanceSummary({ startDate, endDate: today }),
        api.getActiveClockIns(),
        api.getHolidays(),
        api.getAllLeaveRequests()
      ]);
      if (logRes?.success) setAttendanceLog(logRes.data || []);
      if (summaryRes?.success) setAttendanceSummary(summaryRes.data || []);
      if (liveRes?.success) setLiveClockIns(liveRes.data || []);
      if (holRes?.success) setHolidays(holRes.data || []);
      if (leaveRes?.success) {
        setLeaveRequests(leaveRes.data || []);
        setPendingLeaveCount(leaveRes.pendingCount || 0);
      }
    } catch (e) {
      console.warn("Attendance fetch:", e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "attendance") fetchAttendance();
  }, [activeTab, attendanceDateRange]);

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!newHoliday.title) { toast.error("Holiday title is required."); return; }
    try {
      const res = await api.createHoliday(newHoliday);
      if (res.success) {
        toast.success("✅ Holiday saved!");
        setNewHoliday({ title: "", date: new Date().toISOString().split("T")[0], dayOfWeek: "0", isRecurring: false, type: "PUBLIC_HOLIDAY", description: "" });
        fetchAttendance();
      } else {
        toast.error(res.message || "Failed to save holiday.");
      }
    } catch (err) {
      toast.error("Error creating holiday.");
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      const res = await api.deleteHoliday(id);
      if (res.success) {
        toast.success("Holiday removed.");
        fetchAttendance();
      } else {
        toast.error(res.message || "Failed to delete.");
      }
    } catch (err) {
      toast.error("Error deleting holiday.");
    }
  };

  const handleReviewLeave = async (id, status) => {
    try {
      const res = await api.updateLeaveStatus(id, { status });
      if (res?.success) {
        toast.success(`Leave request ${status.toLowerCase()} cleanly!`);
        fetchAttendance();
      } else {
        toast.error(res?.message || "Failed to update leave status.");
      }
    } catch (e) {
      toast.error("Error updating leave request.");
    }
  };

  const handleMarkAbsent = async () => {
    if (!absentForm.userId || !absentForm.date) {
      toast.error("Please select a staff member and date."); return;
    }
    try {
      const res = await api.markAbsent(absentForm);
      if (res.success) {
        toast.success(`${absentForm.staffName} marked absent for ${absentForm.date}.`);
        setShowAbsentModal(false);
        fetchAttendance();
      } else {
        toast.error(res.message || "Failed to mark absent.");
      }
    } catch (e) {
      toast.error("Server error.");
    }
  };

  const exportAttendanceCSV = () => {
    if (!attendanceLog.length) { toast.info("No records to export."); return; }
    const headers = ["Date","Staff Name","Role","Clock In","Clock Out","Hours Worked","Late?","Late By (min)","Status"];
    const rows = attendanceLog.map(r => [
      r.date,
      r.staffName,
      r.staffRole,
      r.clockIn ? new Date(r.clockIn).toLocaleTimeString() : "",
      r.clockOut ? new Date(r.clockOut).toLocaleTimeString() : "",
      r.hoursWorked || "",
      r.isLate ? "Yes" : "No",
      r.lateByMinutes || 0,
      r.status
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `attendance_${attendanceDateRange}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden font-sans">

      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Staff & Shift Roster</h2>
            <p className="text-xs text-stone-500">{branch?.name || "Main Outlet"} — {staff.length} Staff Members</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
            <UserCheck className="w-3.5 h-3.5" />
            {onShiftCount} Currently On Duty
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-[#FF5B32] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#FF5B32]/30 hover:bg-[#e04d26] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Staff Member
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-2">
        {[
          { id: "roster",     label: "Staff Roster",   icon: Users },
          { id: "attendance", label: "Attendance",      icon: CalendarCheck }
        ].map((tab) => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-stone-900 text-white shadow-sm"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Roster ── */}
      {activeTab === "roster" && (<>
      {/* Role Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {["all", "owner", "manager", "kitchen", "cashier", "waiter"].map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              filterRole === role
                ? "bg-stone-900 text-white shadow-sm"
                : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
            }`}
          >
            {role === "all" ? "All Staff" : ROLE_CONFIG[role]?.label || role}
          </button>
        ))}
      </div>

      {/* Staff Data Table */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-100/70 border-b border-stone-200 text-[11px] font-black text-stone-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Contact Details</th>
                  <th className="px-4 py-3.5">Shift Hours</th>
                  <th className="px-4 py-3.5">Security PIN</th>
                  <th className="px-4 py-3.5">Duty Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs font-medium">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-stone-400 font-bold">
                      No staff members found. Click "Add Staff Member" to register staff.
                    </td>
                  </tr>
                ) : (
                  filtered.map((member, idx) => {
                    const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.waiter;
                    const RoleIcon = roleConfig.icon;
                    const shiftData = shiftState[member.id] || { status: "Off Duty", clockIn: "--" };
                    const isOnShift = shiftData.status === "On Shift";
                    const displayStaffId = member.staffId && !member.staffId.includes("-") ? member.staffId : String(100101 + (idx || 0));
                    const hasPin =
                      member.pinSet === true ||
                      member.initialPinSet === true ||
                      (typeof member.pin === "string" && member.pin.trim().length > 0);
                    const isPinVisible = !!revealedPins[member.id];
                    const staffPinState = hasPin
                      ? (isPinVisible ? (member.pin || "••••") : "••••")
                      : "Not Set";

                    return (
                      <tr key={member.id || idx} className="hover:bg-stone-50/60 transition-colors">
                        {/* Member Name & Avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-400 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
                              {member.name ? member.name.charAt(0) : "S"}
                            </div>
                            <div>
                              <p className="font-bold text-stone-900 leading-tight">{member.name}</p>
                              <p className="text-[11px] text-[#FF5B32] font-black font-mono mt-0.5">Staff ID: {displayStaffId}</p>
                              <p className="text-[11px] text-blue-700 font-black font-mono mt-0.5">SSID: {member.ssid || "N/A"}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 w-fit ${roleConfig.color}`}>
                            <RoleIcon className="w-3.5 h-3.5" />
                            {roleConfig.label}
                          </span>
                        </td>

                        {/* Contact Info */}
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5 text-[11px]">
                            <p className="text-stone-700 font-semibold flex items-center gap-1">
                              <Mail className="w-3 h-3 text-stone-400" /> {member.email}
                            </p>
                            <p className="text-stone-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-stone-400" /> {member.phone || "+91 9876543210"}
                            </p>
                          </div>
                        </td>

                        {/* Shift Hours */}
                        <td className="px-4 py-3.5">
                          <div className="text-[11px]">
                            <p className="font-bold text-stone-800">{member.shiftStart || "09:00"} - {member.shiftEnd || "18:00"}</p>
                            <p className="text-stone-400">Clock-in: {shiftData.clockIn}</p>
                          </div>
                        </td>

                        {/* Security PIN */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-xl w-fit">
                            <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="font-mono font-bold text-stone-880 text-xs">
                              {staffPinState}
                            </span>
                            {hasPin && (
                              <button
                                type="button"
                                onClick={() => setRevealedPins((prev) => ({ ...prev, [member.id]: !prev[member.id] }))}
                                className="text-stone-400 hover:text-stone-700 transition-colors ml-0.5 cursor-pointer"
                                title="Toggle PIN Visibility"
                              >
                                {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Duty Status */}
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 w-fit ${
                            isOnShift ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-stone-100 text-stone-500 border border-stone-200"
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isOnShift ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
                            {shiftData.status}
                          </span>
                        </td>

                        {/* Actions Column */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => toggleShift(member.id, member.name)}
                              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                isOnShift
                                  ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                              }`}
                              title="Toggle Duty Clock Status"
                            >
                              <Clock className="w-3 h-3" />
                              <span>{isOnShift ? "Clock Out" : "Clock In"}</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(member)}
                              className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="Edit Staff Member"
                            >
                              <span>Edit</span>
                            </button>

                            <button
                              onClick={() => handleOpenDeleteModal(member)}
                              className="px-2 py-1.5 rounded-xl text-[11px] font-bold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors cursor-pointer flex items-center gap-1"
                              title="Delete Staff Member"
                            >
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      </>)}

      {/* ── Tab: Attendance ── */}
      {activeTab === "attendance" && (
        <div className="flex-1 overflow-y-auto space-y-4">

          {/* Attendance sub-tab bar + controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div className="flex gap-1.5">
              {[
                { id: "live",     label: "Live Duty Board", icon: Activity },
                { id: "log",      label: "Attendance Log",  icon: CalendarCheck },
                { id: "summary",  label: "Staff Summary",   icon: TrendingUp },
                { id: "leaves",   label: `Leave Requests${pendingLeaveCount > 0 ? ` (${pendingLeaveCount})` : ''}`, icon: Palmtree }
              ].map((t) => {
                const T = t.icon;
                return (
                  <button key={t.id} onClick={() => setAttendanceTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${attendanceTab === t.id ? "bg-[#FF5B32] text-white shadow-sm" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"}`}>
                    <T className="w-3 h-3" /> {t.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              {/* Controls strictly scoped to Attendance Log tab */}
              {attendanceTab === "log" && (<>
                <div className="flex gap-1">
                  {[{ v: "today", l: "Today" }, { v: "week", l: "Week" }, { v: "month", l: "Month" }].map((r) => (
                    <button key={r.v} onClick={() => setAttendanceDateRange(r.v)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${attendanceDateRange === r.v ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-100"}`}>
                      {r.l}
                    </button>
                  ))}
                </div>
                <button onClick={exportAttendanceCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer">
                  <Download className="w-3 h-3" /> Export CSV
                </button>
                <button onClick={() => { setAbsentForm({ userId: "", staffName: "", staffRole: "", staffId: "", date: new Date().toISOString().split("T")[0], notes: "" }); setShowAbsentModal(true); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer">
                  <UserX className="w-3 h-3" /> Mark Absent
                </button>
              </>)}

              <button onClick={fetchAttendance} className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-600 cursor-pointer" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {/* Manage Holidays button */}
              <button onClick={() => setShowHolidayModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 cursor-pointer">
                <Palmtree className="w-3.5 h-3.5 text-amber-600" /> Holiday Settings
              </button>
            </div>
          </div>

          {attendanceLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-3 border-[#FF5B32] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Live Duty Board */}
          {!attendanceLoading && attendanceTab === "live" && (
            <div className="space-y-3">
              <p className="text-xs text-stone-500 font-bold">
                {liveClockIns.length} staff member{liveClockIns.length !== 1 ? "s" : ""} currently on duty
              </p>
              {liveClockIns.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 font-semibold text-sm">
                  No staff currently clocked in.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {liveClockIns.map((r) => {
                    const clockedInAt = new Date(r.clockIn);
                    const elapsed = Math.floor((new Date() - clockedInAt) / 60000);
                    const hrs = Math.floor(elapsed / 60);
                    const mins = elapsed % 60;
                    return (
                      <div key={r.id} className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl p-4 space-y-3 text-white shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-400 flex items-center justify-center text-white font-black text-sm shadow-sm">
                              {r.staffName?.charAt(0) || "S"}
                            </div>
                            <div>
                              <p className="font-bold text-sm leading-tight">{r.staffName}</p>
                              <p className="text-[10px] text-stone-400 capitalize font-medium">{r.staffRole}</p>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            ON DUTY
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="bg-white/10 rounded-xl p-2">
                            <p className="text-[10px] text-stone-400 font-bold">Clocked In</p>
                            <p className="text-sm font-black">{clockedInAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                          <div className="bg-white/10 rounded-xl p-2">
                            <p className="text-[10px] text-stone-400 font-bold">Elapsed</p>
                            <p className="text-sm font-black">{hrs}h {String(mins).padStart(2, "0")}m</p>
                          </div>
                        </div>
                        {r.isLate && (
                          <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> Late by {r.lateByMinutes} min
                          </div>
                        )}
                        {r.scheduledStart && (
                          <p className="text-[10px] text-stone-500 font-medium text-center">
                            Scheduled: {r.scheduledStart} → {r.scheduledEnd || "—"}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Attendance Log Table */}
          {!attendanceLoading && attendanceTab === "log" && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100/70 border-b border-stone-200 text-[11px] font-black text-stone-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Staff Member</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Clock In</th>
                      <th className="px-4 py-3 text-right">Clock Out</th>
                      <th className="px-4 py-3 text-right">Hours</th>
                      <th className="px-4 py-3 text-center">Late</th>
                      <th className="px-4 py-3 text-center">Overtime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {attendanceLog.length === 0 && (
                      <tr><td colSpan={9} className="py-12 text-center text-stone-400 font-semibold">No attendance records for this period.</td></tr>
                    )}
                    {attendanceLog.map((r) => {
                      const statusColors = {
                        PRESENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
                        ABSENT: "bg-rose-100 text-rose-800 border-rose-200",
                        HALF_DAY: "bg-blue-100 text-blue-800 border-blue-200",
                        ON_LEAVE: "bg-violet-100 text-violet-800 border-violet-200",
                        PENDING: "bg-amber-100 text-amber-800 border-amber-200"
                      };
                      return (
                        <tr key={r.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="px-4 py-3 font-bold text-stone-900">
                            {new Date(r.date).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#FF5B32] to-amber-400 flex items-center justify-center text-white font-black text-[10px] shrink-0">
                                {r.staffName?.charAt(0)}
                              </div>
                              <span className="font-bold text-stone-900">{r.staffName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-stone-600 capitalize font-medium">{r.staffRole}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${statusColors[r.status] || statusColors.PENDING}`}>
                              {r.status === "PENDING" ? "Active" : r.status?.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-stone-700 font-bold">
                            {r.clockIn ? new Date(r.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-stone-700 font-bold">
                            {r.clockOut ? new Date(r.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-stone-900">
                            {r.hoursWorked ? `${r.hoursWorked}h` : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {r.isLate
                              ? <span className="text-amber-600 font-black text-[10px] flex items-center justify-center gap-0.5"><AlertTriangle className="w-3 h-3" />+{r.lateByMinutes}m</span>
                              : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-stone-700">
                            {r.overtimeHours > 0 ? <span className="text-blue-600 text-[10px] font-black">+{r.overtimeHours}h</span> : <span className="text-stone-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Redesigned Per-Staff Summary & Deep Audit ── */}
          {!attendanceLoading && attendanceTab === "summary" && (() => {
            if (attendanceSummary.length === 0 && staff.length === 0) {
              return (
                <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 font-semibold text-sm">
                  No attendance records found for this period.
                </div>
              );
            }

            const activeSummaryStaffId = selectedStaffSummaryId || (attendanceSummary[0]?.userId || attendanceSummary[0]?.staffId || staff[0]?.userId || staff[0]?.id);
            const activeStaffMember = staff.find(s => s.userId === activeSummaryStaffId || s.id === activeSummaryStaffId || s.staffId === activeSummaryStaffId) || { name: attendanceSummary[0]?.staffName || "Staff Member", role: attendanceSummary[0]?.staffRole || "cashier" };

            // Calendar math for selected month
            const sumCalYear = summaryCalMonth.getFullYear();
            const sumCalMonthIdx = summaryCalMonth.getMonth();
            const sumDaysInMonth = new Date(sumCalYear, sumCalMonthIdx + 1, 0).getDate();
            const sumFirstDay = new Date(sumCalYear, sumCalMonthIdx, 1).getDay();

            const activeStaffLogs = attendanceLog.filter(r => r.userId === activeSummaryStaffId || r.staffId === activeSummaryStaffId || r.staffName === activeStaffMember.name);
            const staffLogsByDate = {};
            activeStaffLogs.forEach(r => { staffLogsByDate[r.date] = r; });

            const activeStaffApprovedLeaves = leaveRequests.filter(l =>
              (l.userId === activeSummaryStaffId || l.staffId === activeSummaryStaffId || l.staffName === activeStaffMember.name) &&
              l.status === "APPROVED"
            );

            const todayStr = new Date().toISOString().split("T")[0];

            // Build complete daily log for every day of the selected month
            const fullMonthDays = Array.from({ length: sumDaysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${sumCalYear}-${String(sumCalMonthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const rec = staffLogsByDate[dateStr];

              const dayDateObj = new Date(sumCalYear, sumCalMonthIdx, day);
              const dayOfWeekVal = dayDateObj.getDay();
              const holMatch = holidays.find(h => (h.isRecurring && h.dayOfWeek === dayOfWeekVal) || h.date === dateStr);
              const leaveMatch = activeStaffApprovedLeaves.find(l => dateStr >= l.fromDate && dateStr <= l.toDate);

              if (rec) {
                return {
                  date: dateStr,
                  day,
                  status: rec.status,
                  clockIn: rec.clockIn,
                  clockOut: rec.clockOut,
                  hoursWorked: rec.hoursWorked,
                  isLate: rec.isLate,
                  lateByMinutes: rec.lateByMinutes,
                  overtimeHours: rec.overtimeHours || 0,
                  holidayTitle: null,
                  leaveTitle: null
                };
              } else if (leaveMatch) {
                return {
                  date: dateStr,
                  day,
                  status: "ON_LEAVE",
                  clockIn: null,
                  clockOut: null,
                  hoursWorked: null,
                  isLate: false,
                  lateByMinutes: 0,
                  overtimeHours: 0,
                  holidayTitle: null,
                  leaveTitle: `${leaveMatch.leaveType} Leave`
                };
              } else if (holMatch) {
                return {
                  date: dateStr,
                  day,
                  status: "HOLIDAY",
                  clockIn: null,
                  clockOut: null,
                  hoursWorked: null,
                  isLate: false,
                  lateByMinutes: 0,
                  overtimeHours: 0,
                  holidayTitle: holMatch.title,
                  leaveTitle: null
                };
              } else if (dateStr <= todayStr) {
                return {
                  date: dateStr,
                  day,
                  status: "ABSENT",
                  clockIn: null,
                  clockOut: null,
                  hoursWorked: null,
                  isLate: false,
                  lateByMinutes: 0,
                  overtimeHours: 0,
                  holidayTitle: null,
                  leaveTitle: null
                };
              } else {
                return {
                  date: dateStr,
                  day,
                  status: "SCHEDULED",
                  clockIn: null,
                  clockOut: null,
                  hoursWorked: null,
                  isLate: false,
                  lateByMinutes: 0,
                  overtimeHours: 0,
                  holidayTitle: null,
                  leaveTitle: null
                };
              }
            });

            // Calculate monthly stats
            const monthPresent = fullMonthDays.filter(d => d.status === "PRESENT" || d.status === "HALF_DAY" || d.status === "PENDING").length;
            const monthAbsent = fullMonthDays.filter(d => d.status === "ABSENT").length;
            const monthOnLeave = fullMonthDays.filter(d => d.status === "ON_LEAVE").length;
            const monthLate = fullMonthDays.filter(d => d.isLate).length;
            const monthOvertime = fullMonthDays.reduce((acc, d) => acc + (d.overtimeHours || 0), 0);

            const badgeStyles = {
              PRESENT: "bg-emerald-100 text-emerald-800 border-emerald-200",
              ABSENT: "bg-rose-100 text-rose-800 border-rose-200 border",
              HOLIDAY: "bg-amber-100 text-amber-800 border-amber-300 font-bold",
              SCHEDULED: "bg-stone-100 text-stone-500 border-stone-200",
              HALF_DAY: "bg-blue-100 text-blue-800 border-blue-200",
              ON_LEAVE: "bg-violet-100 text-violet-800 border-violet-200 font-bold",
              PENDING: "bg-emerald-100 text-emerald-800 border-emerald-200"
            };

            return (
              <div className="space-y-3">

                {/* 1. Header with Dropdown Selector Only */}
                <div className="bg-white rounded-2xl border border-stone-200 p-3 shadow-sm flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FF5B32] to-amber-400 flex items-center justify-center text-white font-black text-xs shrink-0">
                      {activeStaffMember.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-stone-900 text-xs leading-tight">{activeStaffMember.name}</p>
                      <p className="text-[10px] text-stone-400 capitalize font-medium">{activeStaffMember.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-stone-500">Select Employee:</span>
                    <select
                      className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-bold bg-stone-50 outline-none focus:border-[#FF5B32] cursor-pointer shadow-sm"
                      value={activeSummaryStaffId}
                      onChange={(e) => setSelectedStaffSummaryId(e.target.value)}
                    >
                      {staff.map(s => (
                        <option key={s.id} value={s.userId || s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Compact 4 KPI Metric Cards (Month Scoped & Low Height) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">Days Present</span>
                      <p className="text-lg font-black text-emerald-950 leading-tight">{monthPresent}</p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  </div>

                  <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider block">Days Absent</span>
                      <p className="text-lg font-black text-rose-950 leading-tight">{monthAbsent}</p>
                    </div>
                    <UserX className="w-4 h-4 text-rose-600 shrink-0" />
                  </div>

                  <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-violet-700 uppercase tracking-wider block">Approved Leaves</span>
                      <p className="text-lg font-black text-violet-950 leading-tight">{monthOnLeave}</p>
                    </div>
                    <Palmtree className="w-4 h-4 text-violet-600 shrink-0" />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block">Late Arrivals</span>
                      <p className="text-lg font-black text-amber-950 leading-tight">{monthLate}</p>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  </div>
                </div>

                {/* 3. Deep-Dive Split View: Compact Calendar + Month Timings Audit Log */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">

                  {/* Monthly Attendance Calendar (md:col-span-5) */}
                  <div className="md:col-span-5 bg-white rounded-2xl border border-stone-200 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                        <CalendarCheck className="w-3.5 h-3.5 text-[#FF5B32]" />
                        {summaryCalMonth.toLocaleDateString([], { month: "long", year: "numeric" })} Calendar
                      </h4>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSummaryCalMonth(new Date(sumCalYear, sumCalMonthIdx - 1, 1))} className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 cursor-pointer">
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setSummaryCalMonth(new Date(sumCalYear, sumCalMonthIdx + 1, 1))} className="p-1 rounded-lg hover:bg-stone-100 text-stone-600 cursor-pointer">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {["S","M","T","W","T","F","S"].map((d, i) => (
                        <div key={i} className="text-[10px] font-black text-stone-400 py-0.5">{d}</div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center">
                      {Array.from({ length: sumFirstDay }).map((_, i) => <div key={`sum-empty-${i}`} />)}
                      {fullMonthDays.map((d) => {
                        const calDots = { PRESENT: "bg-emerald-500", HALF_DAY: "bg-blue-500", ABSENT: "bg-rose-500", HOLIDAY: "bg-amber-500", ON_LEAVE: "bg-violet-500", PENDING: "bg-emerald-500" };
                        return (
                          <div
                            key={d.day}
                            title={`${d.date} · Status: ${d.status === "HOLIDAY" ? `Holiday (${d.holidayTitle})` : d.status === "ON_LEAVE" ? `On Leave (${d.leaveTitle})` : d.status}`}
                            className={`h-7 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold ${
                              d.status === "HOLIDAY"
                                ? "bg-amber-50 text-amber-900 border border-amber-300 font-black"
                                : d.status === "ON_LEAVE"
                                ? "bg-violet-50 text-violet-900 border border-violet-300 font-black"
                                : d.status === "ABSENT"
                                ? "bg-rose-50 text-rose-800"
                                : d.status === "PRESENT" || d.status === "HALF_DAY" || d.status === "PENDING"
                                ? "bg-emerald-50 text-emerald-900"
                                : "text-stone-300"
                            }`}
                          >
                            <span>{d.day}</span>
                            {d.status !== "SCHEDULED" && <span className={`w-1.5 h-1.5 rounded-full -mt-0.5 ${calDots[d.status] || "bg-stone-400"}`} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Timings Clock-In & Clock-Out Table (md:col-span-7) */}
                  <div className="md:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-sm p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-black text-xs text-stone-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#FF5B32]" />
                        {activeStaffMember.name}'s Timings &amp; Clock Log ({summaryCalMonth.toLocaleDateString([], { month: "short", year: "numeric" })})
                      </h4>
                      <span className="text-[10px] font-bold text-stone-400">{fullMonthDays.length} Days</span>
                    </div>

                    <div className="overflow-x-auto flex-1 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-stone-100 shadow-sm">
                          <tr className="border-b border-stone-200 text-[10px] font-black text-stone-500 uppercase tracking-wider">
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-2 text-center">Status</th>
                            <th className="py-2 px-2 text-right">Clock In</th>
                            <th className="py-2 px-2 text-right">Clock Out</th>
                            <th className="py-2 px-2 text-right">Hours</th>
                            <th className="py-2 px-2 text-center">Late</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {fullMonthDays.map(d => (
                            <tr key={d.date} className="hover:bg-stone-50 transition-colors">
                              <td className="py-2 px-3 font-bold text-stone-900 whitespace-nowrap">
                                {new Date(d.date).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black ${badgeStyles[d.status] || badgeStyles.SCHEDULED}`}>
                                  {d.status === "HOLIDAY" ? `${d.holidayTitle || "Holiday"}` : d.status === "ON_LEAVE" ? `${d.leaveTitle || "Leave"}` : d.status === "PENDING" ? "Active" : d.status}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-stone-800">
                                {d.clockIn ? new Date(d.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-stone-800">
                                {d.clockOut ? new Date(d.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                              </td>
                              <td className="py-2 px-2 text-right font-bold text-stone-900">
                                {d.hoursWorked ? `${d.hoursWorked}h` : "—"}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {d.isLate
                                  ? <span className="text-amber-600 font-black text-[9px]">+ {d.lateByMinutes}m</span>
                                  : <span className="text-stone-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}

          {/* ── Sub-Tab: Leave Requests Approval (Owner/Manager View) ── */}
          {!attendanceLoading && attendanceTab === "leaves" && (
            <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                    <Palmtree className="w-4 h-4 text-[#FF5B32]" /> Staff Leave Applications & Review
                  </h3>
                  <p className="text-xs text-stone-500">Approve or reject leave requests submitted by staff members</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black">
                    {pendingLeaveCount} Pending Request{pendingLeaveCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {leaveRequests.length === 0 ? (
                <div className="py-12 text-center space-y-2 border-2 border-dashed border-stone-200 rounded-2xl">
                  <Palmtree className="w-8 h-8 text-stone-300 mx-auto" />
                  <p className="text-xs font-bold text-stone-500">No leave requests submitted yet</p>
                  <p className="text-[11px] text-stone-400">When staff members apply for leave from their portal, requests will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 text-[10px] font-black text-stone-400 uppercase tracking-wider bg-stone-50">
                        <th className="py-2.5 px-3">Staff Member</th>
                        <th className="py-2.5 px-3">Leave Type</th>
                        <th className="py-2.5 px-3">Dates</th>
                        <th className="py-2.5 px-3 text-center">Days</th>
                        <th className="py-2.5 px-3">Reason</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Review Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
                      {leaveRequests.map((l) => (
                        <tr key={l.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <p className="font-black text-stone-900">{l.staffName}</p>
                            <p className="text-[10px] text-stone-400 font-bold uppercase">{l.staffRole || 'Staff'}</p>
                          </td>
                          <td className="py-3 px-3 font-bold text-stone-800">
                            {l.leaveType} LEAVE
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-stone-800 whitespace-nowrap">
                            {l.fromDate} → {l.toDate}
                          </td>
                          <td className="py-3 px-3 text-center font-black text-stone-900">
                            {l.totalDays} {l.totalDays === 1 ? 'day' : 'days'}
                          </td>
                          <td className="py-3 px-3 text-stone-500 max-w-[200px] truncate" title={l.reason}>
                            {l.reason || '—'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black ${
                              l.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : l.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border-rose-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse'
                            }`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {l.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleReviewLeave(l.id, 'APPROVED')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReviewLeave(l.id, 'REJECTED')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-stone-400 font-medium">
                                Reviewed by <span className="font-bold text-stone-700">{l.reviewedBy || 'Manager'}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Mark Absent Modal ── */}
      {showAbsentModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-500" /> Mark Staff Absent
              </h3>
              <button onClick={() => setShowAbsentModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Select Staff Member *</label>
                <select
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                  value={absentForm.userId}
                  onChange={(e) => {
                    const selected = staff.find(s => s.userId === e.target.value || s.id === e.target.value);
                    setAbsentForm(prev => ({
                      ...prev,
                      userId: selected?.userId || selected?.id || e.target.value,
                      staffName: selected?.name || "",
                      staffRole: selected?.role || "",
                      staffId: selected?.staffId || ""
                    }));
                  }}
                >
                  <option value="">— Choose staff —</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.userId || s.id}>{s.name} ({s.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Date *</label>
                <input type="date" value={absentForm.date}
                  onChange={(e) => setAbsentForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Notes (optional)</label>
                <input type="text" placeholder="e.g. Personal leave, Sick leave…"
                  value={absentForm.notes}
                  onChange={(e) => setAbsentForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-[#FF5B32]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAbsentModal(false)} className="flex-1 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 cursor-pointer">Cancel</button>
                <button onClick={handleMarkAbsent} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/30 cursor-pointer">Mark Absent</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#FF5B32]" />
                Register New Staff Member
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-stone-400 hover:text-stone-600 text-sm font-bold">✕</button>
            </div>

            <form onSubmit={handleAddStaffSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-600">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newStaff.name}
                  onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-600">Role *</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value }))}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32] bg-white"
                  >
                    {Object.keys(ROLE_CONFIG).map((role) => (
                      <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-600 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-amber-500" /> Security PIN (4-digit) *
                    </span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showCreatePin ? "text" : "password"}
                      maxLength={6}
                      required
                      placeholder="e.g. 1234"
                      value={newStaff.pin}
                      onChange={(e) => setNewStaff((p) => ({ ...p, pin: e.target.value }))}
                      className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-stone-300 text-xs font-mono font-bold outline-none focus:border-[#FF5B32] text-amber-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePin(!showCreatePin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                      title="Toggle PIN Visibility"
                    >
                      {showCreatePin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="staff@restaurant.com"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-600">Shift Start</label>
                  <input
                    type="time"
                    value={newStaff.shiftStart}
                    onChange={(e) => setNewStaff((p) => ({ ...p, shiftStart: e.target.value }))}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600">Shift End</label>
                  <input
                    type="time"
                    value={newStaff.shiftEnd}
                    onChange={(e) => setNewStaff((p) => ({ ...p, shiftEnd: e.target.value }))}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-stone-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100 cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] text-white font-bold text-xs shadow-md shadow-[#FF5B32]/30 hover:bg-[#e04d26] cursor-pointer">Save Staff Member</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Details Modal */}
      {showEditModal && editStaffData && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="font-black text-base text-stone-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Edit Staff Member
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-stone-400 hover:text-stone-600 text-sm font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleEditStaffSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-600">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editStaffData.name}
                  onChange={(e) => setEditStaffData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-600">Role *</label>
                  <select
                    value={editStaffData.role}
                    onChange={(e) => setEditStaffData((p) => ({ ...p, role: e.target.value }))}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32] bg-white"
                  >
                    {Object.keys(ROLE_CONFIG).map((role) => (
                      <option key={role} value={role}>{ROLE_CONFIG[role].label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-600 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-amber-500" /> Security PIN
                    </span>
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showEditPin ? "text" : "password"}
                      maxLength={6}
                      value={editStaffData.pin}
                      onChange={(e) => setEditStaffData((p) => ({ ...p, pin: e.target.value }))}
                      className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-stone-300 text-xs font-mono font-bold outline-none focus:border-[#FF5B32] text-amber-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPin(!showEditPin)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                      title="Toggle PIN Visibility"
                    >
                      {showEditPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editStaffData.email}
                  onChange={(e) => setEditStaffData((p) => ({ ...p, email: e.target.value }))}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600">Phone Number</label>
                <input
                  type="text"
                  value={editStaffData.phone}
                  onChange={(e) => setEditStaffData((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-600">Shift Start</label>
                  <input
                    type="time"
                    value={editStaffData.shiftStart}
                    onChange={(e) => setEditStaffData((p) => ({ ...p, shiftStart: e.target.value }))}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600">Shift End</label>
                  <input
                    type="time"
                    value={editStaffData.shiftEnd}
                    onChange={(e) => setEditStaffData((p) => ({ ...p, shiftEnd: e.target.value }))}
                    className="w-full mt-1 px-3.5 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32]"
                  />
                </div>
              </div>

              {/* Authorizing Manager PIN Field */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-amber-600" /> Authorizing Manager PIN *
                </label>
                {isManagerUnlocked ? (
                  <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Manager Session Unlocked (PIN Prompt Bypassed)
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type={showEditManagerPin ? "text" : "password"}
                      maxLength={6}
                      required
                      placeholder="Enter Manager PIN to confirm changes"
                      value={editManagerPin}
                      onChange={(e) => setEditManagerPin(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-amber-300 bg-amber-50/50 text-xs font-mono font-bold outline-none focus:border-amber-500 text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditManagerPin((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                      title="Toggle PIN Visibility"
                    >
                      {showEditManagerPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-stone-100">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100 cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 cursor-pointer">Update Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Staff Confirmation Modal */}
      {showDeleteModal && targetDeleteStaff && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                ⚠️ Delete Staff Member
              </h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleDeleteStaffConfirm} className="space-y-3">
              <div className="space-y-1 text-stone-700 text-xs font-medium">
                <p>Are you sure you want to delete <strong className="text-stone-900">{targetDeleteStaff.name}</strong> ({targetDeleteStaff.role})?</p>
                <p className="text-stone-500 text-[11px]">This action cannot be undone.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-red-700 mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-red-600" /> Authorizing Manager PIN *
                </label>
                {isManagerUnlocked ? (
                  <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 text-xs font-bold text-emerald-700 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Manager Session Unlocked (PIN Prompt Bypassed)
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type={showDeleteManagerPin ? "text" : "password"}
                      maxLength={6}
                      required
                      placeholder="Enter Manager PIN to confirm delete"
                      value={deleteManagerPin}
                      onChange={(e) => setDeleteManagerPin(e.target.value)}
                      className="w-full px-3.5 py-2.5 pr-9 rounded-xl border border-red-300 bg-red-50/40 text-xs font-mono font-bold outline-none focus:border-red-500 text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeleteManagerPin((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                      title="Toggle PIN Visibility"
                    >
                      {showDeleteManagerPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 font-bold text-xs text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Holiday Management Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-5xl w-full shadow-2xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-stone-900 flex items-center gap-2">
                  <Palmtree className="w-5 h-5 text-amber-500" /> Restaurant Holiday Settings
                </h3>
                <p className="text-xs text-stone-500">Configure weekly off days and special holiday closures for your outlet</p>
              </div>
              <button onClick={() => setShowHolidayModal(false)} className="text-stone-400 hover:text-stone-600 font-bold text-sm cursor-pointer p-1 rounded-lg hover:bg-stone-100">✕</button>
            </div>

            {/* 2-Column Split Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

              {/* Left Column: Quick Presets & Add Form (md:col-span-5) */}
              <div className="md:col-span-5 space-y-4">
                
                {/* Quick Presets Card */}
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                  <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-600" /> Quick Preset Actions
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await api.createHoliday({ title: "Sunday Weekly Off", isRecurring: true, dayOfWeek: 0, type: "WEEKLY_OFF" });
                        if (res.success) { toast.success("✅ Every Sunday set as Weekly Off!"); fetchAttendance(); }
                        else toast.error(res.message || "Failed to set.");
                      } catch (e) { toast.error("Error setting weekly off."); }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                  >
                    <Calendar className="w-4 h-4" /> Mark Every Sunday as Weekly Off
                  </button>
                </div>

                {/* Create Custom Holiday Form */}
                <form onSubmit={handleCreateHoliday} className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <p className="text-xs font-black text-stone-800 uppercase tracking-wider">Add Custom Holiday Rule</p>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">Holiday Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Independence Day, Diwali"
                      value={newHoliday.title}
                      onChange={(e) => setNewHoliday(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32] bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={newHoliday.isRecurring}
                      onChange={(e) => setNewHoliday(p => ({ ...p, isRecurring: e.target.checked }))}
                      className="w-4 h-4 accent-[#FF5B32] rounded cursor-pointer"
                    />
                    <label htmlFor="isRecurring" className="text-xs font-bold text-stone-700 cursor-pointer">
                      Repeats Weekly (Weekly Off)
                    </label>
                  </div>

                  {newHoliday.isRecurring ? (
                    <div>
                      <label className="text-[11px] font-bold text-stone-600 block mb-1">Day of the Week *</label>
                      <select
                        value={newHoliday.dayOfWeek}
                        onChange={(e) => setNewHoliday(p => ({ ...p, dayOfWeek: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32] bg-white"
                      >
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-[11px] font-bold text-stone-600 block mb-1">Date *</label>
                      <input
                        type="date"
                        required
                        value={newHoliday.date}
                        onChange={(e) => setNewHoliday(p => ({ ...p, date: e.target.value }))}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-bold outline-none focus:border-[#FF5B32] bg-white"
                      />
                    </div>
                  )}

                  <button type="submit" className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs shadow-md cursor-pointer transition-colors">
                    Save Holiday Rule
                  </button>
                </form>
              </div>

              {/* Right Column: Active Holidays & Off Days List (md:col-span-7) */}
              <div className="md:col-span-7 bg-stone-50/80 p-4 rounded-2xl border border-stone-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                    <p className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Palmtree className="w-4 h-4 text-amber-500" /> Active Holidays &amp; Off Days ({holidays.length})
                    </p>
                    <span className="text-[10px] text-stone-400 font-bold">Visible to All Staff</span>
                  </div>

                  {holidays.length === 0 ? (
                    <div className="py-12 text-center text-stone-400 text-xs font-semibold space-y-1">
                      <Palmtree className="w-8 h-8 text-stone-300 mx-auto" />
                      <p>No holidays or weekly offs configured yet.</p>
                      <p className="text-[10px] text-stone-400">Click "Mark Every Sunday" or add a holiday to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[320px] overflow-y-auto pt-2">
                      {holidays.map(h => (
                        <div key={h.id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-stone-200 shadow-sm text-xs hover:border-amber-300 transition-colors">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-stone-900">{h.title}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${h.isRecurring ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-purple-100 text-purple-800 border-purple-200"}`}>
                                {h.isRecurring ? "WEEKLY OFF" : "HOLIDAY"}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium">
                              {h.isRecurring
                                ? `Repeats Every ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][h.dayOfWeek]}`
                                : `Date: ${new Date(h.date).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })}`}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer transition-colors"
                            title="Delete Holiday Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-200">
                  <button onClick={() => setShowHolidayModal(false)} className="w-full py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 font-bold text-xs text-stone-700 cursor-pointer transition-colors shadow-sm">
                    Done
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}

