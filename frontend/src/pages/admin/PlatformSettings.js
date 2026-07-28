import React, { useCallback, useEffect, useState } from 'react';
import { Activity, BellRing, CreditCard, LockKeyhole, Settings, ShieldCheck } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge } from './shared';

const phaseSteps = [
  ['Step 1', 'Platform Settings Overview', 'completed'],
  ['Step 2', 'Security Settings & Access Controls', 'completed'],
  ['Step 3', 'Payment, Tax & Commission Configuration', 'completed'],
  ['Step 4', 'System Notifications & Automation Settings', 'completed'],
  ['Step 5', 'Backup, Maintenance & Operational Logs', 'completed'],
  ['Step 6', 'Phase 8 Testing & Final Hardening', 'pending'],
];

const moduleIcons = {
  security: LockKeyhole,
  payments: CreditCard,
  tax_commission: ShieldCheck,
  notifications: BellRing,
  content: Settings,
  operations: Activity,
};

const tabs = [
  ['overview', 'Overview'],
  ['security', 'Security & Access'],
  ['payments', 'Payment, Tax & Commission'],
  ['automation', 'Notifications & Automation'],
  ['operations', 'Backup & Maintenance'],
];

const defaultSecuritySettings = {
  min_password_length: 8,
  require_uppercase: true,
  require_lowercase: true,
  require_number: true,
  require_special: true,
  password_max_length: 32,
  session_timeout_minutes: 480,
  admin_session_timeout_minutes: 240,
  max_failed_login_attempts: 5,
  lockout_minutes: 30,
  require_admin_reason_for_sensitive_actions: true,
  restrict_inactive_user_login: true,
};

const defaultMaintenanceSettings = {
  maintenance_mode: false,
  maintenance_message: 'Platform maintenance is scheduled. Please try again shortly.',
  backup_frequency: 'daily',
  backup_owner: '',
  last_backup_at: '',
  next_backup_at: '',
  retention_days: 30,
  checklist: [
    { key: 'database_backup', label: 'Database backup verified', status: 'pending' },
    { key: 'media_backup', label: 'Media/object storage backup verified', status: 'pending' },
    { key: 'env_snapshot', label: 'Environment/config snapshot recorded', status: 'pending' },
    { key: 'rollback_plan', label: 'Rollback plan reviewed', status: 'pending' },
  ],
};

const fallbackOverview = {
  business_profile: { brand_name: 'X-Space360', admin_scope: 'central_admin', timezone: 'Asia/Kolkata', currency: 'INR' },
  metrics: {},
  security_settings: defaultSecuritySettings,
  maintenance_settings: defaultMaintenanceSettings,
  payment_config: {},
  pending_operations: {},
  modules: [],
  recent_audits: [],
};

const PlatformSettings = () => {
  const [active, setActive] = useState('overview');
  const [state, setState] = useState({ loading: true, error: '', data: null, paymentConfig: null, taxCommission: null, subscriptionPlans: [], notificationRules: [], escalationRules: [], activeEscalations: [], communication: null, operations: null });
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [overviewRes, paymentRes, taxCommissionRes, plansRes, notificationRulesRes, escalationRulesRes, activeEscalationsRes, communicationRes, operationsRes] = await Promise.allSettled([
        adminPhase1API.platformSettingsOverview(),
        adminPhase1API.paymentConfig(),
        adminPhase1API.financeTaxCommission(),
        adminPhase1API.subscriptionPlans(),
        adminPhase1API.notificationRules(),
        adminPhase1API.escalationRules(),
        adminPhase1API.activeEscalations(),
        adminPhase1API.communicationOverview(),
        adminPhase1API.operationalSettings(),
      ]);
      const overviewData = overviewRes.status === 'fulfilled' ? overviewRes.value.data.data : fallbackOverview;
      const operationsData = operationsRes.status === 'fulfilled' ? operationsRes.value.data.data : {
        settings: overviewData.maintenance_settings || defaultMaintenanceSettings,
        readiness: {},
        collection_counts: [],
        operational_logs: overviewData.recent_audits || [],
      };
      setState({
        loading: false,
        error: '',
        data: overviewData,
        paymentConfig: paymentRes.status === 'fulfilled' ? paymentRes.value.data : null,
        taxCommission: taxCommissionRes.status === 'fulfilled' ? taxCommissionRes.value.data.data : null,
        subscriptionPlans: plansRes.status === 'fulfilled' ? plansRes.value.data.data.plans || [] : [],
        notificationRules: notificationRulesRes.status === 'fulfilled' ? notificationRulesRes.value.data.data.rules || [] : [],
        escalationRules: escalationRulesRes.status === 'fulfilled' ? escalationRulesRes.value.data.data.rules || [] : [],
        activeEscalations: activeEscalationsRes.status === 'fulfilled' ? activeEscalationsRes.value.data.data.instances || [] : [],
        communication: communicationRes.status === 'fulfilled' ? communicationRes.value.data.data : null,
        operations: operationsData,
      });
    } catch (error) {
      setState({ loading: false, error: '', data: fallbackOverview, paymentConfig: null, taxCommission: null, subscriptionPlans: [], notificationRules: [], escalationRules: [], activeEscalations: [], communication: null, operations: { settings: defaultMaintenanceSettings, readiness: {}, collection_counts: [], operational_logs: [] } });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const data = state.data || {};
  const metrics = data.metrics || {};
  const profile = data.business_profile || {};
  const pending = data.pending_operations || {};
  const security = data.security_settings || {};

  const saveSecuritySetting = async (key, value) => {
    const reason = window.prompt('Security audit reason', `Updated ${key.replace(/_/g, ' ')}`);
    if (!reason) return;
    setSavingSecurity(true);
    try {
      await adminPhase1API.updateSecuritySettings({ ...security, [key]: value, reason });
      await load();
    } finally {
      setSavingSecurity(false);
    }
  };

  const savePaymentConfig = async (updates) => {
    const current = state.paymentConfig || {};
    const reason = window.prompt('Configuration audit reason', 'Payment, tax and commission configuration updated');
    if (!reason) return;
    setSavingPayment(true);
    try {
      await adminPhase1API.updatePaymentConfig({ ...current, ...updates, reason });
      await load();
    } finally {
      setSavingPayment(false);
    }
  };

  const toggleNotificationRule = async (rule) => {
    const nextStatus = rule.status === 'active' ? 'inactive' : 'active';
    const reason = window.prompt('Automation audit reason', `Notification rule marked ${nextStatus}`);
    if (!reason) return;
    await adminPhase1API.updateNotificationRuleStatus(rule.notification_rule_id, { status: nextStatus, reason });
    await load();
  };

  const saveOperations = async (updates) => {
    const current = state.operations?.settings || data.maintenance_settings || {};
    const reason = window.prompt('Operations audit reason', 'Backup, maintenance and operational settings updated');
    if (!reason) return;
    await adminPhase1API.updateOperationalSettings({ ...current, ...updates, reason });
    await load();
  };

  return (
    <div>
      <PageHeader title="Platform Settings" description="Central control surface for brand profile, security posture, payment configuration, automation readiness and operational health." />
      <Panel className="mb-4 p-3">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(([id, label]) => <button key={id} onClick={() => setActive(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${active === id ? 'bg-charcoal text-white' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        active === 'security' ? <SecurityAccess settings={security} metrics={metrics} saving={savingSecurity} onSave={saveSecuritySetting} /> : active === 'payments' ? <PaymentTaxCommission paymentConfig={state.paymentConfig} taxCommission={state.taxCommission} plans={state.subscriptionPlans} saving={savingPayment} onSave={savePaymentConfig} /> : active === 'automation' ? <AutomationSettings notificationRules={state.notificationRules} escalationRules={state.escalationRules} activeEscalations={state.activeEscalations} communication={state.communication} onToggleRule={toggleNotificationRule} /> : active === 'operations' ? <OperationalControls data={state.operations} fallbackSettings={data.maintenance_settings} onSave={saveOperations} /> : <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            {[
              ['Active Users', metrics.active_users || 0],
              ['Active Admins', metrics.active_admins || 0],
              ['Admin Roles', metrics.active_roles || 0],
              ['Escalations', metrics.active_escalations || 0],
              ['Notification Rules', metrics.active_notifications || 0],
              ['CMS Sections', metrics.active_cms_sections || 0],
            ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></Panel>)}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-black">Business Profile</h2>
                  <p className="mt-1 text-sm text-slate-500">Brand and platform defaults currently active for the admin panel.</p>
                </div>
                <StatusBadge value={data.payment_config?.is_mock ? 'sandbox' : 'live'} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Info label="Brand" value={profile.brand_name || 'X-Space360'} />
                <Info label="Admin Scope" value={profile.admin_scope || 'central_admin'} />
                <Info label="Timezone" value={profile.timezone || 'Asia/Kolkata'} />
                <Info label="Currency" value={profile.currency || 'INR'} />
              </div>
            </Panel>

            <Panel className="p-4">
              <h2 className="font-black">Phase 8 Steps</h2>
              <div className="mt-3 space-y-2">
                {phaseSteps.map(([step, label, status]) => <div key={step} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><b>{step}</b> {label}</span><StatusBadge value={status} /></div>)}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {(data.modules || []).map((item) => {
              const Icon = moduleIcons[item.key] || Settings;
              return (
                <Panel key={item.key} className="p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta"><Icon className="h-5 w-5" /></div>
                    <StatusBadge value={item.status} />
                  </div>
                  <h3 className="font-black">{item.label}</h3>
                  <p className="mt-1 text-sm text-slate-500">{item.value}</p>
                </Panel>
              );
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Panel className="p-4">
              <h2 className="font-black">Operational Queue</h2>
              <div className="mt-3 space-y-2">
                {Object.entries(pending).map(([key, value]) => <div key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-bold capitalize">{key.replace(/_/g, ' ')}</span><span>{value}</span></div>)}
              </div>
            </Panel>
            <Panel className="overflow-hidden">
              <div className="border-b border-slate-200 p-4">
                <h2 className="font-black">Recent Platform Activity</h2>
                <p className="text-xs text-slate-500">Latest admin actions from audit logs.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Time', 'Module', 'Action', 'Record', 'User'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.recent_audits || []).map((log) => <tr key={log.audit_id || `${log.record_id}-${log.created_at}`}><td className="px-4 py-3">{log.created_at ? String(log.created_at).slice(0, 16).replace('T', ' ') : '-'}</td><td className="px-4 py-3">{log.module || '-'}</td><td className="px-4 py-3">{log.action || '-'}</td><td className="px-4 py-3 font-mono text-xs">{log.record_id || 'system'}</td><td className="px-4 py-3">{log.user_id || '-'}</td></tr>)}
                  </tbody>
                </table>
                {!data.recent_audits?.length && <p className="p-6 text-sm text-slate-500">No audit activity found.</p>}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
};

const SecurityAccess = ({ settings, metrics, saving, onSave }) => {
  const booleanRows = [
    ['require_uppercase', 'Uppercase Required'],
    ['require_lowercase', 'Lowercase Required'],
    ['require_number', 'Number Required'],
    ['require_special', 'Special Character Required'],
    ['require_admin_reason_for_sensitive_actions', 'Reason Required For Sensitive Actions'],
    ['restrict_inactive_user_login', 'Restrict Inactive User Login'],
  ];
  const numericRows = [
    ['min_password_length', 'Minimum Password Length'],
    ['password_max_length', 'Maximum Password Length'],
    ['session_timeout_minutes', 'User Session Timeout'],
    ['admin_session_timeout_minutes', 'Admin Session Timeout'],
    ['max_failed_login_attempts', 'Failed Login Attempts'],
    ['lockout_minutes', 'Lockout Minutes'],
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Active Admins', metrics.active_admins || 0],
          ['Admin Roles', metrics.active_roles || 0],
          ['Password Baseline', `${settings.min_password_length || 8}-${settings.password_max_length || 32} chars`],
          ['Admin Session', `${settings.admin_session_timeout_minutes || 240} min`],
        ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></Panel>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Password & Session Policy</h2>
            <p className="text-xs text-slate-500">Settings are stored with audit history for controlled rollout.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {numericRows.map(([key, label]) => <SettingNumber key={key} label={label} value={settings[key]} disabled={saving} onSave={(value) => onSave(key, value)} />)}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-black">Access Controls</h2>
          <div className="mt-3 space-y-2">
            {booleanRows.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-bold">{label}</span>
                <button disabled={saving} onClick={() => onSave(key, !settings[key])} className={`rounded-lg px-3 py-1 text-xs font-black ${settings[key] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'} disabled:opacity-60`}>{settings[key] ? 'On' : 'Off'}</button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Security Readiness</h2>
          <p className="text-xs text-slate-500">Policy checks used by admin onboarding, password reset and access review workflows.</p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <Readiness label="Strong Password Rule" ok={settings.min_password_length >= 8 && settings.require_uppercase && settings.require_lowercase && settings.require_number && settings.require_special} />
          <Readiness label="Admin Session Limit" ok={(settings.admin_session_timeout_minutes || 999) <= 240} />
          <Readiness label="Login Lockout" ok={(settings.max_failed_login_attempts || 99) <= 5 && (settings.lockout_minutes || 0) >= 15} />
          <Readiness label="Sensitive Action Reason" ok={settings.require_admin_reason_for_sensitive_actions} />
        </div>
      </Panel>
    </div>
  );
};

const PaymentTaxCommission = ({ paymentConfig, taxCommission, plans, saving, onSave }) => {
  const summary = taxCommission?.summary || {};
  const taxLedger = taxCommission?.tax_ledger || [];
  const commissions = taxCommission?.commissions || [];
  const updateFee = () => {
    const percent = window.prompt('Platform fee percent', paymentConfig?.platform_fee_percent ?? 10);
    if (percent === null) return;
    const label = window.prompt('Platform fee label', paymentConfig?.platform_fee_label || 'Premium Service Fee');
    if (label === null) return;
    onSave({ platform_fee_percent: Number(percent), platform_fee_label: label });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {[
          ['Gateway', paymentConfig?.provider || 'razorpay'],
          ['Mode', paymentConfig?.is_mock ? 'Mock' : 'Live'],
          ['Currency', paymentConfig?.currency || 'INR'],
          ['Platform Fee', `${paymentConfig?.platform_fee_percent ?? 10}%`],
          ['Booking GST', money(summary.booking_gst || 0)],
          ['Broker Pending', money(summary.broker_commission_pending || 0)],
        ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 break-words text-xl font-black">{value}</p></Panel>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black">Payment Configuration</h2>
              <p className="mt-1 text-xs text-slate-500">Booking fee label and platform commission percent used in checkout pricing.</p>
            </div>
            <button disabled={saving} onClick={updateFee} className="rounded-lg bg-charcoal px-3 py-2 text-xs font-black text-white disabled:opacity-60">{saving ? 'Saving...' : 'Edit'}</button>
          </div>
          <div className="mt-4 grid gap-3">
            <Info label="Provider" value={paymentConfig?.provider || 'razorpay'} />
            <Info label="Key Mode" value={paymentConfig?.is_mock ? 'Mock / Sandbox' : 'Live'} />
            <Info label="Platform Fee Label" value={paymentConfig?.platform_fee_label || 'Premium Service Fee'} />
            <Info label="Platform Fee Percent" value={`${paymentConfig?.platform_fee_percent ?? 10}%`} />
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Tax Ledger Preview</h2>
            <p className="text-xs text-slate-500">Estimated tax and commission liabilities from finance records.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Tax ID', 'Type', 'Taxable', 'Rate', 'Amount', 'Status'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {taxLedger.map((row) => <tr key={row.tax_id}><td className="px-4 py-3 font-mono text-xs">{row.tax_id}</td><td className="px-4 py-3">{row.tax_type}</td><td className="px-4 py-3">{money(row.taxable_amount || 0)}</td><td className="px-4 py-3">{row.tax_rate}%</td><td className="px-4 py-3 font-black">{money(row.tax_amount || 0)}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td></tr>)}
              </tbody>
            </table>
            {!taxLedger.length && <p className="p-6 text-sm text-slate-500">No tax ledger data found.</p>}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Subscription Plan Tax</h2>
            <p className="text-xs text-slate-500">Current subscription pricing tax configuration.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {plans.slice(0, 8).map((plan) => <div key={plan.plan_id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_100px_100px] md:items-center"><div><p className="font-black">{plan.name || plan.plan_name || plan.plan_id}</p><p className="text-xs text-slate-500">{plan.plan_id}</p></div><span>{plan.tax_percent ?? 18}% tax</span><StatusBadge value={plan.is_active === false ? 'inactive' : 'active'} /></div>)}
            {!plans.length && <p className="p-4 text-sm text-slate-500">No subscription plans found.</p>}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Broker Commission Preview</h2>
            <p className="text-xs text-slate-500">Latest broker commission rows for payout readiness.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {commissions.slice(0, 8).map((row) => <div key={row.commission_id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_120px_110px] md:items-center"><div><p className="font-black">{row.broker?.full_name || row.broker_id || '-'}</p><p className="text-xs text-slate-500">{row.booking_id || row.commission_id}</p></div><span>{money(row.commission_amount || 0)}</span><StatusBadge value={row.payment_status || 'pending'} /></div>)}
            {!commissions.length && <p className="p-4 text-sm text-slate-500">No commission rows found.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
};

const AutomationSettings = ({ notificationRules, escalationRules, activeEscalations, communication, onToggleRule }) => {
  const metrics = communication?.metrics || {};
  const activeNotificationRules = notificationRules.filter((rule) => rule.status === 'active').length;
  const activeEscalationRules = escalationRules.filter((rule) => rule.status === 'active').length;
  const channels = Array.from(new Set(notificationRules.flatMap((rule) => rule.channels || [])));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {[
          ['Notification Rules', notificationRules.length],
          ['Active Rules', activeNotificationRules],
          ['Escalation Rules', escalationRules.length],
          ['Active Escalations', activeEscalations.length],
          ['Channels', channels.length],
          ['Failed Delivery', metrics.notifications_failed || 0],
        ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></Panel>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Notification Automation Rules</h2>
            <p className="text-xs text-slate-500">Platform-level templates, channels, recipients and retry controls.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {notificationRules.map((rule) => (
              <div key={rule.notification_rule_id} className="grid gap-3 p-4 text-sm xl:grid-cols-[1fr_170px_100px] xl:items-center">
                <div>
                  <p className="font-black">{rule.rule_name}</p>
                  <p className="text-xs text-slate-500">{rule.event_name}</p>
                  <p className="mt-1 text-xs text-slate-400">{(rule.channels || []).join(', ') || 'no channels'} / {(rule.recipient_roles || []).join(', ') || 'no recipients'}</p>
                </div>
                <StatusBadge value={rule.retry_enabled === false ? 'retry_off' : 'retry_on'} />
                <button onClick={() => onToggleRule(rule)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{rule.status === 'active' ? 'Disable' : 'Enable'}</button>
              </div>
            ))}
            {!notificationRules.length && <p className="p-4 text-sm text-slate-500">No notification rules found.</p>}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-black">Channel Readiness</h2>
          <div className="mt-3 grid gap-2">
            {['in_app', 'email', 'sms', 'whatsapp', 'push', 'ai_voice_call'].map((channel) => <div key={channel} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-bold">{channel.replace(/_/g, ' ')}</span><StatusBadge value={channels.includes(channel) ? 'configured' : 'not_configured'} /></div>)}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Escalation Automation</h2>
            <p className="text-xs text-slate-500">Rules that connect SLA breach, reminders and owner routing.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {escalationRules.slice(0, 10).map((rule) => <div key={rule.rule_id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_120px_110px] md:items-center"><div><p className="font-black">{rule.rule_name}</p><p className="text-xs text-slate-500">{rule.process_name} / {rule.task_type}</p></div><span>{rule.sla_duration_hours || 0}h SLA</span><StatusBadge value={rule.status} /></div>)}
            {!escalationRules.length && <p className="p-4 text-sm text-slate-500">No escalation rules found.</p>}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Active Automation Queue</h2>
            <p className="text-xs text-slate-500">Open escalations and derived SLA risks.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {activeEscalations.slice(0, 10).map((item) => <div key={item.instance_id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_110px_110px] md:items-center"><div><p className="font-black">{item.title || item.record_id}</p><p className="text-xs text-slate-500">{item.process_name} / {item.record_id}</p></div><span>{Math.round(item.age_hours || 0)}h age</span><StatusBadge value={item.status || item.priority} /></div>)}
            {!activeEscalations.length && <p className="p-4 text-sm text-slate-500">No active automation queue found.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
};

const OperationalControls = ({ data, fallbackSettings, onSave }) => {
  const settings = data?.settings || fallbackSettings || {};
  const readiness = data?.readiness || {};
  const checklist = settings.checklist || [];
  const toggleMaintenance = () => onSave({ maintenance_mode: !settings.maintenance_mode });
  const updateSchedule = () => {
    const backupFrequency = window.prompt('Backup frequency: hourly, daily, weekly, monthly', settings.backup_frequency || 'daily');
    if (!backupFrequency) return;
    const backupOwner = window.prompt('Backup owner', settings.backup_owner || '');
    if (backupOwner === null) return;
    const retentionDays = window.prompt('Retention days', settings.retention_days || 30);
    if (retentionDays === null) return;
    const nextBackupAt = window.prompt('Next backup date/time', settings.next_backup_at || '');
    if (nextBackupAt === null) return;
    onSave({ backup_frequency: backupFrequency, backup_owner: backupOwner, retention_days: Number(retentionDays), next_backup_at: nextBackupAt });
  };
  const updateChecklist = (item) => {
    const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
    onSave({ checklist: checklist.map((entry) => entry.key === item.key ? { ...entry, status: nextStatus } : entry) });
  };
  const markBackupComplete = () => onSave({ last_backup_at: new Date().toISOString(), checklist: checklist.map((item) => ({ ...item, status: 'completed' })) });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Maintenance', settings.maintenance_mode ? 'On' : 'Off'],
          ['Backup Frequency', settings.backup_frequency || 'daily'],
          ['Readiness', `${readiness.readiness_percent || 0}%`],
          ['Retention', `${settings.retention_days || 30} days`],
          ['Collections', data?.collection_counts?.length || 0],
        ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></Panel>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black">Maintenance Controls</h2>
              <p className="mt-1 text-xs text-slate-500">Operational switch and maintenance message stored with audit trail.</p>
            </div>
            <StatusBadge value={settings.maintenance_mode ? 'maintenance' : 'ready'} />
          </div>
          <div className="mt-4 space-y-3">
            <button onClick={toggleMaintenance} className={`w-full rounded-lg px-3 py-2 text-sm font-black ${settings.maintenance_mode ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{settings.maintenance_mode ? 'Turn Maintenance Off' : 'Turn Maintenance On'}</button>
            <button onClick={() => { const message = window.prompt('Maintenance message', settings.maintenance_message || ''); if (message !== null) onSave({ maintenance_message: message }); }} className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">Edit Message</button>
            <button onClick={updateSchedule} className="w-full rounded-lg bg-charcoal px-3 py-2 text-sm font-black text-white">Edit Backup Schedule</button>
            <button onClick={markBackupComplete} className="w-full rounded-lg bg-terracotta/10 px-3 py-2 text-sm font-black text-charcoal">Mark Backup Verified</button>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{settings.maintenance_message || '-'}</div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Backup Readiness Checklist</h2>
            <p className="text-xs text-slate-500">Checklist state for maintenance windows and rollback readiness.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {checklist.map((item) => <div key={item.key} className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_120px_110px] md:items-center"><span className="font-bold">{item.label}</span><StatusBadge value={item.status || 'pending'} /><button onClick={() => updateChecklist(item)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">{item.status === 'completed' ? 'Reset' : 'Complete'}</button></div>)}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel className="p-4">
          <h2 className="font-black">Data Footprint</h2>
          <div className="mt-3 space-y-2">
            {(data?.collection_counts || []).map((row) => <div key={row.collection} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="font-bold">{row.collection}</span><span>{row.count}</span></div>)}
          </div>
        </Panel>
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Operational Logs</h2>
            <p className="text-xs text-slate-500">Recent system, settings, audit, support and communication activity.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Time', 'Module', 'Action', 'Record', 'User', 'Status'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.operational_logs || []).map((log) => <tr key={log.audit_id || `${log.record_id}-${log.created_at}`}><td className="px-4 py-3">{log.created_at ? String(log.created_at).slice(0, 16).replace('T', ' ') : '-'}</td><td className="px-4 py-3">{log.module || '-'}</td><td className="px-4 py-3">{log.action || '-'}</td><td className="px-4 py-3 font-mono text-xs">{log.record_id || 'system'}</td><td className="px-4 py-3">{log.user_id || '-'}</td><td className="px-4 py-3"><StatusBadge value={log.status || 'success'} /></td></tr>)}
              </tbody>
            </table>
            {!data?.operational_logs?.length && <p className="p-6 text-sm text-slate-500">No operational logs found.</p>}
          </div>
        </Panel>
      </div>
    </div>
  );
};

const SettingNumber = ({ label, value, disabled, onSave }) => {
  const [draft, setDraft] = useState(value || 0);
  useEffect(() => { setDraft(value || 0); }, [value]);
  return (
    <div className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_150px_90px] md:items-center">
      <span className="font-bold">{label}</span>
      <input type="number" value={draft} onChange={(event) => setDraft(Number(event.target.value))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-terracotta" />
      <button disabled={disabled} onClick={() => onSave(Number(draft))} className="rounded-lg bg-charcoal px-3 py-2 text-xs font-black text-white disabled:opacity-60">Save</button>
    </div>
  );
};

const Readiness = ({ label, ok }) => (
  <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
    <div className="mt-2"><StatusBadge value={ok ? 'ready' : 'needs_review'} /></div>
  </div>
);

const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const Info = ({ label, value }) => (
  <div className="rounded-lg bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
    <p className="mt-1 break-words text-sm font-black text-slate-800">{value}</p>
  </div>
);

export default PlatformSettings;
