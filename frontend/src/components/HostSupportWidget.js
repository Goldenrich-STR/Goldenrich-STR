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
        className="fixed right-4 bottom-4 z-[180] inline-flex items-center gap-2 rounded-full bg-charcoal px-5 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-elevated hover:bg-terracotta transition"
        data-testid="host-raise-ticket-button"
      >
        <Headphones className="w-4 h-4" />
        Raise Ticket
      </button>

      {open && (
        <div className="fixed inset-0 z-[220] bg-charcoal/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-elevated w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-terracotta uppercase tracking-[0.2em] mb-1">Host Support Desk</p>
                <h3 className="text-2xl font-bold text-charcoal">Raise Support Ticket</h3>
                <p className="text-xs text-charcoal-muted mt-1">Create a ticket for payout, booking, listing, calendar, rating or account support.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="w-9 h-9 rounded-full bg-stone flex items-center justify-center text-charcoal-muted hover:text-terracotta transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <form onSubmit={submitTicket} className="space-y-4">
                {notice && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</div>}
                {error && <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}

                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="input-field"
                  placeholder="Short issue title, e.g. payout not received"
                  required
                  minLength={3}
                  maxLength={160}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                    <option value="host_dashboard">Host Dashboard</option>
                    <option value="property_listing">Property Listing</option>
                    <option value="booking_issue">Booking Issue</option>
                    <option value="payout_issue">Payout Issue</option>
                    <option value="calendar_issue">Calendar Issue</option>
                    <option value="rating_review">Rating & Review</option>
                    <option value="account_verification">Account Verification</option>
                  </select>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">
                    <option value="normal">Normal Priority</option>
                    <option value="low">Low Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent Priority</option>
                  </select>
                </div>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="input-field min-h-[150px] resize-y"
                  placeholder="Explain the issue, booking ID, property name, payout reference or screenshot context"
                  required
                  minLength={5}
                  maxLength={2000}
                />
                <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-terracotta px-5 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-charcoal transition disabled:opacity-60">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Ticket
                </button>
              </form>

              <div className="rounded-3xl bg-stone/60 border border-sand-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-charcoal">My Recent Tickets</h4>
                  <button type="button" onClick={loadTickets} className="text-[10px] font-bold uppercase tracking-widest text-terracotta">Refresh</button>
                </div>
                {loadingTickets ? (
                  <div className="py-10 text-center text-xs font-bold text-charcoal-muted uppercase tracking-widest">Loading tickets...</div>
                ) : tickets.length ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {tickets.slice(0, 8).map((ticket) => (
                      <div key={ticket.ticket_id} className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-charcoal break-words">{ticket.subject}</p>
                            <p className="text-[9px] font-bold text-charcoal-muted uppercase tracking-widest mt-1">{ticket.ticket_id}</p>
                          </div>
                          <span className="rounded-full bg-sand-100 px-2 py-1 text-[9px] font-bold uppercase text-charcoal-muted">{ticket.status || 'open'}</span>
                        </div>
                        {ticket.admin_response && <p className="text-xs text-charcoal-muted mt-3">{ticket.admin_response}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <MessageSquare className="w-10 h-10 text-charcoal-muted mx-auto mb-3" />
                    <p className="text-xs font-bold text-charcoal-muted uppercase tracking-widest">No tickets raised yet</p>
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
