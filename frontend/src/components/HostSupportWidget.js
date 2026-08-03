import React, { useEffect, useState } from 'react';
import { Headphones, Loader2, MessageSquare, Send, X } from 'lucide-react';
import { supportTicketAPI } from '../services/api';

const initialForm = {
  subject: '',
  category: 'host_dashboard',
  priority: 'normal',
  message: '',
};

const HostSupportWidget = ({ context = 'host_dashboard' }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...initialForm, category: context });
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    loadTickets();
  }, [open]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const response = await supportTicketAPI.getMyTickets();
      setTickets(response.data?.tickets || []);
    } catch (err) {
      console.error('Failed to load host support tickets', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const submitTicket = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');
    setSubmitting(true);
    try {
      await supportTicketAPI.createTicket({
        subject: form.subject,
        category: form.category || context,
        priority: form.priority,
        message: form.message,
      });
      setNotice('Support ticket raised successfully.');
      setForm({ ...initialForm, category: context });
      await loadTickets();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to raise support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-[180] inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:bg-black"
        data-testid="host-raise-ticket-button"
      >
        <Headphones className="w-4 h-4" />
        Raise Ticket
      </button>

      {open && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md">
          <div className="w-full max-w-5xl overflow-y-auto rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] max-h-[90vh]">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Host Support Desk</p>
                <h3 className="text-2xl font-black tracking-[-0.04em] text-slate-950">Raise Support Ticket</h3>
                <p className="mt-1 text-sm text-slate-500">Create a ticket for payout, booking, listing, calendar, rating or account support.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <form onSubmit={submitTicket} className="space-y-4">
                {notice && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</div>}
                {error && <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}

                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="input-field rounded-2xl border-slate-200 bg-slate-50 focus:border-blue-300 focus:ring-blue-100"
                  placeholder="Short issue title, e.g. payout not received"
                  required
                  minLength={3}
                  maxLength={160}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field rounded-2xl border-slate-200 bg-slate-50 focus:border-blue-300 focus:ring-blue-100">
                    <option value="host_dashboard">Host Dashboard</option>
                    <option value="property_listing">Property Listing</option>
                    <option value="booking_issue">Booking Issue</option>
                    <option value="payout_issue">Payout Issue</option>
                    <option value="calendar_issue">Calendar Issue</option>
                    <option value="rating_review">Rating & Review</option>
                    <option value="account_verification">Account Verification</option>
                  </select>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field rounded-2xl border-slate-200 bg-slate-50 focus:border-blue-300 focus:ring-blue-100">
                    <option value="normal">Normal Priority</option>
                    <option value="low">Low Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Priority</option>
                  </select>
                </div>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="input-field min-h-[150px] resize-y rounded-2xl border-slate-200 bg-slate-50 focus:border-blue-300 focus:ring-blue-100"
                  placeholder="Explain the issue, booking ID, property name, payout reference or screenshot context"
                  required
                  minLength={5}
                  maxLength={2000}
                />
                <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3.5 text-xs font-bold uppercase tracking-widest text-white transition hover:bg-black disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Ticket
                </button>
              </form>

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-950">My Recent Tickets</h4>
                  <button type="button" onClick={loadTickets} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-950">Refresh</button>
                </div>
                {loadingTickets ? (
                  <div className="py-10 text-center text-xs font-bold uppercase tracking-widest text-slate-500">Loading tickets...</div>
                ) : tickets.length ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {tickets.slice(0, 8).map((ticket) => (
                      <div key={ticket.ticket_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-950 break-words">{ticket.subject}</p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">{ticket.ticket_id}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase text-slate-500">{ticket.status || 'open'}</span>
                        </div>
                        {ticket.admin_response && <p className="mt-3 text-xs text-slate-500">{ticket.admin_response}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <MessageSquare className="mx-auto mb-3 w-10 h-10 text-slate-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">No tickets raised yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HostSupportWidget;
