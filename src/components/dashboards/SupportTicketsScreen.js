"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/services/apiClient";
import { Ticket, Plus, MessageSquare, Send, Clock, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SupportTicketsScreen() {
  const { getActiveTenant } = useAuth();
  const tenant = getActiveTenant();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Ticket Modal State
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("MEDIUM");

  // Selected Ticket Dialog
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await api.getTickets();
      if (res.success && Array.isArray(res.data)) {
        setTickets(res.data);
      }
    } catch (e) {
      console.warn("Failed to load support tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.error("Please enter a subject and message");
      return;
    }

    try {
      const res = await api.createTicket({ subject, message, priority });
      if (res.success) {
        toast.success("Support ticket created under SSID #" + (tenant?.ssid || "982145"));
        setShowModal(false);
        setSubject("");
        setMessage("");
        loadTickets();
      } else {
        toast.error("Failed to submit ticket: " + res.message);
      }
    } catch (err) {
      toast.error("Error creating ticket: " + err.message);
    }
  };

  const handleSendReply = async () => {
    if (!activeTicket || !replyMessage.trim()) return;
    try {
      const res = await api.replyTicket(activeTicket.id, replyMessage.trim());
      if (res.success) {
        toast.success("Reply added to ticket #" + activeTicket.id);
        setReplyMessage("");
        setActiveTicket(res.data);
        loadTickets();
      }
    } catch (e) {
      toast.error("Failed to add reply: " + e.message);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-base text-stone-900">Restaurant Support & Help Desk</h2>
            <p className="text-xs text-stone-500">
              Submit tickets directly to SuperAdmin (Restaurant SSID:{" "}
              <span className="font-mono font-bold text-[#FF5B32]">{tenant?.ssid || "982145"}</span>)
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#FF5B32] hover:bg-[#e04d26] text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#FF5B32]/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Raise Support Ticket
        </button>
      </div>

      {/* Main Grid: Tickets List Left, Active Ticket Discussion Right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        
        {/* Tickets List Column */}
        <div className="lg:col-span-1 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col overflow-hidden">
          <h3 className="font-black text-sm text-stone-900 mb-3 border-b border-stone-100 pb-2">
            Ticket History ({tickets.length})
          </h3>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {tickets.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <Ticket className="w-10 h-10 mx-auto stroke-1 text-stone-300" />
                <p className="text-xs italic font-medium">No support tickets raised yet.</p>
              </div>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTicket(t)}
                  className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    activeTicket?.id === t.id
                      ? "bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-sm"
                      : "bg-stone-50/60 border-stone-200 hover:border-stone-400 text-stone-800"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono font-bold text-stone-500">#{t.id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        t.status === "OPEN"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : t.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-900 border border-blue-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs font-black text-stone-900 truncate">{t.subject}</p>
                  <p className="text-[10px] text-stone-500 truncate mt-0.5">{t.message}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Selected Ticket Discussion Column */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between overflow-hidden">
          {activeTicket ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="border-b border-stone-100 pb-3 mb-3 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-stone-400">#{activeTicket.id}</span>
                    <span className="text-xs font-mono font-bold text-[#FF5B32] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      SSID: {activeTicket.ssid}
                    </span>
                  </div>
                  <h3 className="font-black text-base text-stone-900 mt-1">{activeTicket.subject}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-stone-100 text-stone-700">
                  Priority: {activeTicket.priority}
                </span>
              </div>

              {/* Thread Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 py-2">
                {/* Initial Query */}
                <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-1">
                  <div className="flex justify-between text-[10px] text-purple-700 font-bold">
                    <span>You ({tenant?.name || "Restaurant Owner"})</span>
                    <span>{new Date(activeTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-stone-800 font-semibold">{activeTicket.message}</p>
                </div>

                {/* Responses */}
                {(() => {
                  let responses = [];
                  if (activeTicket.responsesJson) {
                    try {
                      responses = typeof activeTicket.responsesJson === "string" ? JSON.parse(activeTicket.responsesJson) : activeTicket.responsesJson;
                    } catch (e) {}
                  }
                  return responses.map((resp, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl text-xs space-y-1 ${
                        resp.senderRole === "superadmin"
                          ? "bg-amber-50 border border-amber-200 ml-4"
                          : "bg-stone-50 border border-stone-200 mr-4"
                      }`}
                    >
                      <div className="flex justify-between text-[10px] font-bold text-stone-600">
                        <span>{resp.senderRole === "superadmin" ? "🛡️ SuperAdmin Support" : resp.senderName}</span>
                        <span>{new Date(resp.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-stone-800 font-medium">{resp.message}</p>
                    </div>
                  ));
                })()}
              </div>

              {/* Reply Input Box */}
              <div className="pt-3 border-t border-stone-100 flex gap-2">
                <input
                  type="text"
                  placeholder="Type your response to support..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-[#FF5B32]"
                />
                <button
                  onClick={handleSendReply}
                  className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-black text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Reply
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 space-y-2 py-20">
              <MessageSquare className="w-12 h-12 stroke-1 text-stone-300" />
              <p className="text-sm font-black text-stone-700">Select a ticket to view thread discussion</p>
              <p className="text-xs text-stone-500">Or click "+ Raise Support Ticket" to create a new request.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateTicket} className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-black text-base text-stone-900">Raise Support Ticket</h3>
                <p className="text-xs text-stone-500">SSID Code: {tenant?.ssid || "982145"}</p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-stone-400 font-bold hover:text-stone-700">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold text-stone-800">
              <div>
                <label className="block mb-1 font-bold text-stone-700">Issue Subject</label>
                <input
                  type="text"
                  placeholder="e.g., KDS display latency or Printer config issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 outline-none focus:border-[#FF5B32]"
                  required
                />
              </div>

              <div>
                <label className="block mb-1 font-bold text-stone-700">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 outline-none bg-white font-bold"
                >
                  <option value="LOW">LOW — General Question</option>
                  <option value="MEDIUM">MEDIUM — Feature Request / Configuration</option>
                  <option value="HIGH">HIGH — Urgent Operational Issue</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-bold text-stone-700">Detailed Message</label>
                <textarea
                  rows={4}
                  placeholder="Describe what help you need from the platform support team..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 outline-none focus:border-[#FF5B32]"
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF5B32] text-white font-black text-xs hover:bg-[#e04d26] shadow-md shadow-[#FF5B32]/30"
              >
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
