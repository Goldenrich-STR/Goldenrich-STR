import React, { useCallback, useEffect, useState } from 'react';
import { Bell, Headphones, Mail, MessageSquare, Search, Send, ShieldAlert, Download } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { cmsAPI } from '../../services/api';
import { ErrorState, LoadingState, PageHeader, Pagination, Panel, StatusBadge, requestInput, requestReason, showNotice } from './shared';

const phaseSteps = [
  ['Step 1', 'Communication Overview', 'completed'],
  ['Step 2', 'Contact Messages Inbox', 'completed'],
  ['Step 3', 'Notification Center', 'completed'],
  ['Step 4', 'Templates & Channel Rules', 'completed'],
  ['Step 5', 'Delivery Audit & Escalation Integration', 'completed'],
];

const tabs = [
  ['overview', 'Overview'],
  ['contactInbox', 'Contact Inbox'],
  ['notifications', 'Notification Center'],
  ['rules', 'Templates & Rules'],
  ['deliveryAudit', 'Delivery Audit'],
];

const defaultRuleForm = {
  notification_rule_id: '',
  rule_name: '',
  event_name: '',
  channels: ['in_app'],
  recipient_roles: [],
  template: '',
  retry_enabled: true,
  status: 'active',
};

const messageStatuses = [
  ['', 'All'],
  ['pending', 'Pending'],
  ['in-progress', 'In Progress'],
  ['resolved', 'Resolved'],
];

const notificationStatuses = [
  ['', 'All'],
  ['pending', 'Pending'],
  ['sent', 'Sent'],
  ['failed', 'Failed'],
  ['read', 'Read'],
];

const notificationChannels = [
  ['', 'All Channels'],
  ['in_app', 'In App'],
  ['email', 'Email'],
  ['sms', 'SMS'],
  ['whatsapp', 'WhatsApp'],
];

const CommunicationCenter = () => {
  const [active, setActive] = useState('overview');
  const [messageStatus, setMessageStatus] = useState('');
  const [notificationStatus, setNotificationStatus] = useState('');
  const [notificationChannel, setNotificationChannel] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [selectedNotificationId, setSelectedNotificationId] = useState('');
  const [ruleForm, setRuleForm] = useState(defaultRuleForm);
  const [state, setState] = useState({ loading: true, error: '', metrics: {}, recent_notifications: [], recent_contact_messages: [], recent_support_tickets: [], contact_messages: [], notifications: [], notification_rules: [], delivery_audit: { metrics: {}, failed_notifications: [], recent_audits: [], active_escalations: [], charts: {} }, charts: {} });

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [overviewRes, messagesRes, notificationsRes, rulesRes, deliveryAuditRes] = await Promise.all([
        adminPhase1API.communicationOverview(),
        cmsAPI.getContactMessages(messageStatus ? { status: messageStatus } : {}),
        adminPhase1API.communicationNotifications({ search, status: notificationStatus, channel: notificationChannel }),
        adminPhase1API.notificationRules(),
        adminPhase1API.communicationDeliveryAudit(),
      ]);
      const messages = messagesRes.data.messages || [];
      const notifications = notificationsRes.data.data.notifications || [];
      setState({ loading: false, error: '', ...overviewRes.data.data, contact_messages: messages, notifications, notification_rules: rulesRes.data.data.rules || [], delivery_audit: deliveryAuditRes.data.data });
      setSelectedMessageId((current) => current || messages[0]?._id || messages[0]?.message_id || '');
      setSelectedNotificationId((current) => current || notifications[0]?.notification_id || '');
    } catch (error) {
      setState({ loading: false, error: error.response?.data?.detail || 'Failed to load Communication Center', metrics: {}, recent_notifications: [], recent_contact_messages: [], recent_support_tickets: [], contact_messages: [], notifications: [], notification_rules: [], delivery_audit: { metrics: {}, failed_notifications: [], recent_audits: [], active_escalations: [], charts: {} }, charts: {} });
    }
  }, [messageStatus, notificationChannel, notificationStatus, search]);

  useEffect(() => { load(); }, [load]);

  const filteredMessages = state.contact_messages.filter((message) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [message.name, message.full_name, message.email, message.phone, message.subject, message.category, message.message].some((value) => String(value || '').toLowerCase().includes(term));
  });
  const selectedMessage = filteredMessages.find((message) => (message._id || message.message_id) === selectedMessageId) || filteredMessages[0];
  const selectedNotification = state.notifications.find((notification) => notification.notification_id === selectedNotificationId) || state.notifications[0];

  const updateMessage = async (message, status) => {
    if (!message) return;
    const notes = await requestReason({ title: 'Contact Message Notes', description: `Marking message as ${status}.`, defaultValue: message.admin_notes || '', placeholder: 'Add admin notes.', minLength: 1, confirmLabel: 'Save Notes' });
    if (notes === null) return;
    await cmsAPI.updateContactMessage(message._id || message.message_id, { status, admin_notes: notes });
    await load();
  };

  const sendTestNotification = async () => {
    const userId = await requestInput({
      title: 'Send Test Notification',
      description: 'Enter the recipient user ID.',
      label: 'User ID',
      placeholder: 'e.g. user_guest_123',
      confirmLabel: 'Continue',
    });
    if (!userId) return;
    const channelsText = await requestInput({
      title: 'Send Test Notification',
      description: 'Comma separated channels: in_app, email, sms, whatsapp',
      label: 'Channels',
      defaultValue: 'in_app,email',
      placeholder: 'in_app,email',
      confirmLabel: 'Continue',
    });
    if (!channelsText) return;
    const title = await requestInput({
      title: 'Send Test Notification',
      description: 'Enter the notification title.',
      label: 'Title',
      defaultValue: 'X-Space360 Test Notification',
      confirmLabel: 'Continue',
    });
    if (!title) return;
    const message = await requestInput({
      title: 'Send Test Notification',
      description: 'Enter the notification message.',
      label: 'Message',
      defaultValue: 'This is a test notification from Communication Center.',
      inputType: 'textarea',
      confirmLabel: 'Continue',
    });
    if (!message) return;
    const reason = await requestReason({ title: 'Test Notification Reason', description: 'This test notification will be audited.', defaultValue: 'Admin notification test', placeholder: 'Add test reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.sendCommunicationTest({ user_id: userId.trim(), channels: channelsText.split(',').map((item) => item.trim()).filter(Boolean), title, message, reason });
    await load();
  };

  const saveRule = async () => {
    if (!ruleForm.rule_name.trim() || !ruleForm.event_name.trim()) {
      await showNotice({
        title: 'Missing Required Fields',
        description: 'Rule name and event name are required.',
        eyebrow: 'Validation Error',
      });
      return;
    }
    const payload = { ...ruleForm, rule_name: ruleForm.rule_name.trim(), event_name: ruleForm.event_name.trim(), template: ruleForm.template.trim() };
    if (ruleForm.notification_rule_id) {
      await adminPhase1API.updateNotificationRule(ruleForm.notification_rule_id, payload);
    } else {
      await adminPhase1API.createNotificationRule(payload);
    }
    setRuleForm(defaultRuleForm);
    await load();
  };

  const editRule = (rule) => setRuleForm({ ...defaultRuleForm, ...rule });

  const changeRuleStatus = async (rule) => {
    const nextStatus = rule.status === 'active' ? 'inactive' : 'active';
    const reason = await requestReason({ title: 'Notification Rule Reason', description: `Rule will be marked ${nextStatus}.`, defaultValue: `${nextStatus === 'active' ? 'Enabled' : 'Disabled'} notification rule`, placeholder: 'Add rule status reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.updateNotificationRuleStatus(rule.notification_rule_id, { status: nextStatus, reason });
    await load();
  };

  const handleExportCSV = () => {
    let headers = [];
    let rows = [];
    let filename = `communication_${active}_${new Date().toISOString().slice(0, 10)}.csv`;

    const escapeCsv = (val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    if (active === 'overview') {
      headers = ['Category', 'Title/Subject', 'Channel/Priority', 'Recipient/Contact', 'Status', 'Created At'];
      const notifs = (state.recent_notifications || []).map(r => ['Notification', r.title || r.type || '', r.channel || '', r.recipient || r.user_id || '', r.status || 'pending', r.created_at || '']);
      const msgs = (state.recent_contact_messages || []).map(r => ['Contact Message', r.subject || r.category || '', '', r.email || r.phone || '', r.status || 'pending', r.created_at || '']);
      const tix = (state.recent_support_tickets || []).map(r => ['Support Ticket', r.ticket_id || '', r.priority || 'medium', r.user_id || '', r.status || 'open', r.created_at || '']);
      rows = [...notifs, ...msgs, ...tix];
    } else if (active === 'contactInbox') {
      headers = ['Name', 'Email', 'Phone', 'Subject', 'Category', 'Status', 'Message', 'Admin Notes', 'Created At'];
      rows = filteredMessages.map(m => [m.name || m.full_name || '', m.email || '', m.phone || '', m.subject || '', m.category || '', m.status || 'pending', m.message || '', m.admin_notes || '', m.created_at || '']);
    } else if (active === 'notifications') {
      headers = ['Notification ID', 'Title', 'Type', 'Channel', 'Recipient/User ID', 'Message', 'Status', 'Created At'];
      rows = state.notifications.map(n => [n.notification_id || '', n.title || '', n.type || '', n.channel || '', n.recipient || n.user_id || '', n.message || '', n.status || 'pending', n.created_at || '']);
    } else if (active === 'rules') {
      headers = ['Rule ID', 'Rule Name', 'Event Name', 'Channels', 'Recipient Roles', 'Template text', 'Retry Enabled', 'Status'];
      rows = state.notification_rules.map(r => [r.notification_rule_id || '', r.rule_name || '', r.event_name || '', (r.channels || []).join('; '), (r.recipient_roles || []).join('; '), r.template || '', r.retry_enabled === false ? 'No' : 'Yes', r.status || 'active']);
    } else if (active === 'deliveryAudit') {
      headers = ['Type', 'Title/Action', 'Channel/User', 'Recipient/Record ID', 'Status/Reason', 'Created At'];
      const failed = (state.delivery_audit?.failed_notifications || []).map(r => ['Failed Delivery', r.title || '', r.channel || '', r.recipient || r.user_id || '', r.type || 'failed', r.created_at || '']);
      const audits = (state.delivery_audit?.recent_audits || []).map(r => ['Audit Log', r.action || '', r.user_id || '', r.record_id || '', r.reason || '', r.created_at || '']);
      rows = [...failed, ...audits];
    }

    if (!rows.length) {
      showNotice({ title: 'Export Empty', description: `No records in the ${active} tab to export.`, eyebrow: 'Action Aborted' });
      return;
    }

    const csvContent = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Communication Center"
        description="Monitor platform messages, notifications, channel health and support communication queues."
        action={
          <button onClick={handleExportCSV} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setActive(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${active === id ? 'bg-charcoal text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}
        </div>
        {active !== 'overview' && (
          <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 w-full bg-transparent text-sm outline-none" placeholder={active === 'notifications' ? 'Search title, message, recipient, user or type' : 'Search name, email, phone, subject or message'} />
            </div>
            {active === 'notifications' ? <div className="grid grid-cols-2 gap-2"><select value={notificationStatus} onChange={(event) => setNotificationStatus(event.target.value)} className="h-12 rounded-lg border border-slate-200 px-3 text-sm">{notificationStatuses.map(([id, label]) => <option key={label} value={id}>{label}</option>)}</select><select value={notificationChannel} onChange={(event) => setNotificationChannel(event.target.value)} className="h-12 rounded-lg border border-slate-200 px-3 text-sm">{notificationChannels.map(([id, label]) => <option key={label} value={id}>{label}</option>)}</select></div> : <select value={messageStatus} onChange={(event) => setMessageStatus(event.target.value)} className="h-12 rounded-lg border border-slate-200 px-3 text-sm">{messageStatuses.map(([id, label]) => <option key={label} value={id}>{label}</option>)}</select>}
          </div>
        )}
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {[
              ['Total Notifications', state.metrics.notifications_total || 0, Bell],
              ['Failed Delivery', state.metrics.notifications_failed || 0, ShieldAlert],
              ['Unread In-app', state.metrics.notifications_unread || 0, MessageSquare],
              ['Pending Contacts', state.metrics.contact_messages_pending || 0, Mail],
              ['Open Tickets', state.metrics.support_tickets_open || 0, Headphones],
            ].map(([label, value, Icon]) => <Panel key={label} className="p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef4ff] text-[#2563eb]"><Icon className="h-4 w-4" /></div><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
          </div>
          {active === 'overview' ? <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <RecentNotifications rows={state.recent_notifications} />
              <RecentMessages rows={state.recent_contact_messages} />
              <RecentTickets rows={state.recent_support_tickets} />
            </div>
            <div className="space-y-4">
              <Panel className="p-4">
                <h2 className="font-black">Phase 6 Steps</h2>
                <div className="mt-3 space-y-2">{phaseSteps.map(([step, label, status]) => <div key={step} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><b>{step}</b> {label}</span><StatusBadge value={status} /></div>)}</div>
              </Panel>
              <MiniChart title="Channel Distribution" rows={state.charts.channel_distribution || []} />
              <MiniChart title="Notification Status" rows={state.charts.notification_status || []} />
            </div>
          </div> : active === 'contactInbox' ? <ContactInbox messages={filteredMessages} selected={selectedMessage} selectedId={selectedMessageId} setSelectedId={setSelectedMessageId} onUpdate={updateMessage} /> : active === 'notifications' ? <NotificationCenter notifications={state.notifications} selected={selectedNotification} selectedId={selectedNotificationId} setSelectedId={setSelectedNotificationId} onSendTest={sendTestNotification} /> : active === 'rules' ? <TemplateRules rules={state.notification_rules} form={ruleForm} setForm={setRuleForm} onSave={saveRule} onEdit={editRule} onStatus={changeRuleStatus} /> : <DeliveryAudit data={state.delivery_audit} />}
        </div>
      )}
    </div>
  );
};

const RecentNotifications = ({ rows }) => (
  <Panel className="overflow-hidden">
    <SectionHeader title="Recent Notifications" description="Latest in-app, email, SMS and WhatsApp notification records." />
    <DataTable headers={['Title', 'Channel', 'Recipient', 'Status', 'Created']} rows={rows.slice(0, 8).map((row) => [
      <span className="font-bold">{row.title || row.type || '-'}</span>,
      row.channel || '-',
      row.recipient || row.user_id || '-',
      <StatusBadge value={row.status || 'pending'} />,
      row.created_at ? String(row.created_at).slice(0, 16).replace('T', ' ') : '-',
    ])} empty="No notifications found." />
  </Panel>
);

const RecentMessages = ({ rows }) => (
  <Panel className="overflow-hidden">
    <SectionHeader title="Recent Contact Messages" description="Website contact and support messages submitted by users." />
    <DataTable headers={['Name', 'Contact', 'Subject', 'Status', 'Created']} rows={rows.slice(0, 8).map((row) => [
      <span className="font-bold">{row.name || row.full_name || '-'}</span>,
      row.email || row.phone || '-',
      row.subject || row.category || '-',
      <StatusBadge value={row.status || 'pending'} />,
      row.created_at ? String(row.created_at).slice(0, 16).replace('T', ' ') : '-',
    ])} empty="No contact messages found." />
  </Panel>
);

const RecentTickets = ({ rows }) => (
  <Panel className="overflow-hidden">
    <SectionHeader title="Recent Support Tickets" description="Support ticket communication queue for follow-up and escalation." />
    <DataTable headers={['Ticket', 'User', 'Priority', 'Status', 'Created']} rows={rows.slice(0, 8).map((row) => [
      <span className="font-bold">{row.ticket_id || row._id || '-'}</span>,
      row.user_id || row.email || '-',
      row.priority || 'medium',
      <StatusBadge value={row.status || 'open'} />,
      row.created_at ? String(row.created_at).slice(0, 16).replace('T', ' ') : '-',
    ])} empty="No support tickets found." />
  </Panel>
);

const ContactInbox = ({ messages, selected, selectedId, setSelectedId, onUpdate }) => {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [messages.length]);
  const rows = messages.slice((page - 1) * 10, page * 10);

  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Contact Messages</h2>
          <p className="text-xs text-slate-500">Website contact requests and support inquiries.</p>
        </div>
        <div className="max-h-[680px] overflow-y-auto p-3">
          {rows.map((message) => {
            const id = message._id || message.message_id;
            return (
              <button key={id} onClick={() => setSelectedId(id)} className={`mb-2 w-full rounded-lg border p-3 text-left text-sm ${selectedId === id ? 'border-terracotta bg-terracotta/10' : 'border-slate-200 bg-slate-50 hover:border-terracotta'}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black">{message.name || message.full_name || 'Unknown'}</span>
                  <StatusBadge value={message.status || 'pending'} />
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{message.subject || message.category || 'General inquiry'}</p>
                <p className="mt-1 text-xs text-slate-400">{message.created_at ? String(message.created_at).slice(0, 16).replace('T', ' ') : '-'}</p>
              </button>
            );
          })}
          {!messages.length && <p className="p-3 text-sm text-slate-500">No contact messages found.</p>}
        </div>
        <Pagination currentPage={page} totalItems={messages.length} itemsPerPage={10} onPageChange={setPage} />
      </Panel>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-black">{selected?.subject || selected?.category || 'Message Detail'}</h2>
            <p className="text-xs text-slate-500">{selected?.email || selected?.phone || 'No contact selected'}</p>
          </div>
          {selected && <StatusBadge value={selected.status || 'pending'} />}
        </div>
        {selected ? (
          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Detail label="Name" value={selected.name || selected.full_name || '-'} />
                <Detail label="Email" value={selected.email || '-'} />
                <Detail label="Phone" value={selected.phone || '-'} />
                <Detail label="Created" value={selected.created_at ? String(selected.created_at).slice(0, 16).replace('T', ' ') : '-'} />
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Message</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selected.message || '-'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Admin Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selected.admin_notes || '-'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <button onClick={() => onUpdate(selected, 'pending')} className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">Mark Pending</button>
              <button onClick={() => onUpdate(selected, 'in-progress')} className="w-full rounded-lg bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">Mark In Progress</button>
              <button onClick={() => onUpdate(selected, 'resolved')} className="w-full rounded-lg bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">Mark Resolved</button>
              {selected.email && <a href={`mailto:${selected.email}`} className="block w-full rounded-lg bg-charcoal px-3 py-2 text-center text-sm font-bold text-white">Reply by Email</a>}
            </div>
          </div>
        ) : <p className="p-6 text-sm text-slate-500">Select a contact message.</p>}
      </Panel>
    </div>
  );
};

const NotificationCenter = ({ notifications, selected, selectedId, setSelectedId, onSendTest }) => {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [notifications.length]);
  const rows = notifications.slice((page - 1) * 10, page * 10);

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-black">Notifications</h2>
            <p className="text-xs text-slate-500">Delivery records across in-app, email, SMS and WhatsApp.</p>
          </div>
          <button onClick={onSendTest} className="rounded-lg bg-charcoal px-3 py-2 text-xs font-bold text-white">Send Test</button>
        </div>
        <div className="max-h-[700px] overflow-y-auto p-3">
          {rows.map((notification) => (
            <button key={notification.notification_id} onClick={() => setSelectedId(notification.notification_id)} className={`mb-2 w-full rounded-lg border p-3 text-left text-sm ${selectedId === notification.notification_id ? 'border-terracotta bg-terracotta/10' : 'border-slate-200 bg-slate-50 hover:border-terracotta'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-black">{notification.title || notification.type || '-'}</span>
                <StatusBadge value={notification.status || 'pending'} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{notification.channel || '-'} / {notification.recipient || notification.user_id || '-'}</p>
              <p className="mt-1 text-xs text-slate-400">{notification.created_at ? String(notification.created_at).slice(0, 16).replace('T', ' ') : '-'}</p>
            </button>
          ))}
          {!notifications.length && <p className="p-3 text-sm text-slate-500">No notifications found.</p>}
        </div>
        <Pagination currentPage={page} totalItems={notifications.length} itemsPerPage={10} onPageChange={setPage} />
      </Panel>
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-black">{selected?.title || 'Notification Detail'}</h2>
            <p className="text-xs text-slate-500">{selected?.notification_id || 'No notification selected'}</p>
          </div>
          {selected && <StatusBadge value={selected.status || 'pending'} />}
        </div>
        {selected ? (
          <div className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Detail label="Type" value={selected.type || '-'} />
              <Detail label="Channel" value={selected.channel || '-'} />
              <Detail label="Recipient" value={selected.recipient || selected.user_id || '-'} />
              <Detail label="Created" value={selected.created_at ? String(selected.created_at).slice(0, 16).replace('T', ' ') : '-'} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selected.message || '-'}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <JsonBlock title="Payload Data" value={selected.data} />
              <JsonBlock title="Provider Response" value={selected.provider_response} />
            </div>
          </div>
        ) : <p className="p-6 text-sm text-slate-500">Select a notification.</p>}
      </Panel>
    </div>
  );
};

const TemplateRules = ({ rules, form, setForm, onSave, onEdit, onStatus }) => {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [rules.length]);
  const rows = rules.slice((page - 1) * 10, page * 10);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const setCsvField = (field, value) => setField(field, value.split(',').map((item) => item.trim()).filter(Boolean));
  return (
    <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Panel className="p-4">
        <h2 className="font-black">{form.notification_rule_id ? 'Edit Rule' : 'Create Rule'}</h2>
        <div className="mt-4 space-y-3">
          <input value={form.rule_name} onChange={(event) => setField('rule_name', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Rule name" />
          <input value={form.event_name} onChange={(event) => setField('event_name', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Event name" />
          <input value={(form.channels || []).join(', ')} onChange={(event) => setCsvField('channels', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Channels: in_app, email, sms, whatsapp" />
          <input value={(form.recipient_roles || []).join(', ')} onChange={(event) => setCsvField('recipient_roles', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none" placeholder="Recipient roles: admin, host, broker" />
          <textarea value={form.template} onChange={(event) => setField('template', event.target.value)} className="min-h-36 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="Template text with placeholders like {{name}}, {{booking_id}}" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.status} onChange={(event) => setField('status', event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold">
              <input type="checkbox" checked={form.retry_enabled !== false} onChange={(event) => setField('retry_enabled', event.target.checked)} />
              Retry
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={onSave} className="flex-1 rounded-lg bg-charcoal px-3 py-2 text-sm font-bold text-white">{form.notification_rule_id ? 'Save Rule' : 'Create Rule'}</button>
            {form.notification_rule_id && <button onClick={() => setForm(defaultRuleForm)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">Clear</button>}
          </div>
        </div>
      </Panel>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Templates & Channel Rules</h2>
          <p className="text-xs text-slate-500">Reusable notification rules for events, channels, recipients and retry behavior.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Rule', 'Event', 'Channels', 'Recipients', 'Retry', 'Status', 'Actions'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((rule) => (
                <tr key={rule.notification_rule_id}>
                  <td className="px-4 py-3"><p className="font-black">{rule.rule_name}</p><p className="font-mono text-xs text-slate-500">{rule.notification_rule_id}</p></td>
                  <td className="px-4 py-3">{rule.event_name}</td>
                  <td className="px-4 py-3">{(rule.channels || []).join(', ') || '-'}</td>
                  <td className="px-4 py-3">{(rule.recipient_roles || []).join(', ') || '-'}</td>
                  <td className="px-4 py-3">{rule.retry_enabled === false ? 'No' : 'Yes'}</td>
                  <td className="px-4 py-3"><StatusBadge value={rule.status || 'active'} /></td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1"><button onClick={() => onEdit(rule)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">Edit</button><button onClick={() => onStatus(rule)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{rule.status === 'active' ? 'Disable' : 'Enable'}</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rules.length && <p className="p-6 text-sm text-slate-500">No notification rules found.</p>}
        </div>
        <Pagination currentPage={page} totalItems={rules.length} itemsPerPage={10} onPageChange={setPage} />
      </Panel>
    </div>
  );
};

const DeliveryAudit = ({ data }) => (
  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Failed', data.metrics?.failed_notifications || 0],
          ['Sent', data.metrics?.sent_notifications || 0],
          ['Pending', data.metrics?.pending_notifications || 0],
          ['Audits', data.metrics?.communication_audits || 0],
          ['Escalations', data.metrics?.active_escalations || 0],
        ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
      </div>
      <Panel className="overflow-hidden">
        <SectionHeader title="Failed Deliveries" description="Notifications that require retry review or provider follow-up." />
        <DataTable headers={['Title', 'Channel', 'Recipient', 'Type', 'Created']} rows={(data.failed_notifications || []).slice(0, 12).map((row) => [
          <span className="font-bold">{row.title || '-'}</span>,
          row.channel || '-',
          row.recipient || row.user_id || '-',
          row.type || '-',
          row.created_at ? String(row.created_at).slice(0, 16).replace('T', ' ') : '-',
        ])} empty="No failed deliveries found." />
      </Panel>
      <Panel className="overflow-hidden">
        <SectionHeader title="Communication Audit Logs" description="Admin communication actions and channel-rule changes." />
        <DataTable headers={['Time', 'User', 'Action', 'Record', 'Reason']} rows={(data.recent_audits || []).slice(0, 12).map((row) => [
          row.created_at ? String(row.created_at).slice(0, 16).replace('T', ' ') : '-',
          row.user_id || '-',
          <StatusBadge value={row.action || 'audit'} />,
          row.record_id || '-',
          row.reason || '-',
        ])} empty="No communication audit events found." />
      </Panel>
    </div>
    <div className="space-y-4">
      <MiniChart title="Failed By Channel" rows={data.charts?.failed_by_channel || []} />
      <MiniChart title="Delivery By Status" rows={data.charts?.delivery_by_status || []} />
      <Panel className="p-4">
        <h2 className="font-black">Escalation Integration</h2>
        <div className="mt-3 space-y-2">
          {(data.active_escalations || []).slice(0, 8).map((item) => <div key={item.instance_id || item.record_id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-bold">{item.title || item.record_id}</span><StatusBadge value={item.status || 'active'} /></div><p className="mt-1 text-xs text-slate-500">{item.process_name || '-'} / {item.task_type || '-'}</p></div>)}
          {!data.active_escalations?.length && <p className="text-sm text-slate-500">No active escalation items found.</p>}
        </div>
      </Panel>
    </div>
  </div>
);

const JsonBlock = ({ title, value }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-950 p-4">
    <p className="mb-2 text-xs font-bold uppercase text-slate-400">{title}</p>
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-100">{JSON.stringify(value || {}, null, 2)}</pre>
  </div>
);

const Detail = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
    <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
  </div>
);

const SectionHeader = ({ title, description }) => (
  <div className="border-b border-slate-200 p-4">
    <div className="flex items-center gap-2"><Send className="h-4 w-4 text-terracotta" /><h2 className="font-black">{title}</h2></div>
    <p className="text-xs text-slate-500">{description}</p>
  </div>
);

const DataTable = ({ headers, rows, empty }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[860px] text-left text-sm">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody>
    </table>
    {!rows.length && <p className="p-6 text-sm text-slate-500">{empty}</p>}
  </div>
);

const MiniChart = ({ title, rows }) => (
  <Panel className="p-4">
    <h2 className="font-black">{title}</h2>
    <div className="mt-3 space-y-2">{rows.slice(0, 6).map((row) => <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-bold">{row.label}</span><span>{row.count}</span></div>)}</div>
    {!rows.length && <p className="mt-3 text-sm text-slate-500">No data found.</p>}
  </Panel>
);

export default CommunicationCenter;
