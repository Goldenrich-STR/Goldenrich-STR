import React, { useCallback, useEffect, useState } from 'react';
import { Activity, BellRing, CreditCard, LockKeyhole, Pencil, Plus, Power, Settings, ShieldCheck, Trash2 } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { getApiErrorMessage } from '../../services/api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, requestConfirm, requestInput, requestReason, showNotice } from './shared';
import { PricingEngineTab } from '../AdminAccount';

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
  ['pricing', 'Pricing Engine'],
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
  tds_config: null,
  pending_operations: {},
  modules: [],
  recent_audits: [],
};

const PlatformSettings = () => {
  const [active, setActive] = useState('overview');
  const [state, setState] = useState({ loading: true, error: '', data: null, paymentConfig: null, taxCommission: null, bookingTaxSlabs: [], tdsConfig: null, subscriptionPlans: [], notificationRules: [], escalationRules: [], activeEscalations: [], communication: null, operations: null });
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingTds, setSavingTds] = useState(false);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [overviewRes, paymentRes, taxCommissionRes, bookingTaxSlabsRes, tdsRes, plansRes, notificationRulesRes, escalationRulesRes, activeEscalationsRes, communicationRes, operationsRes] = await Promise.allSettled([
        adminPhase1API.platformSettingsOverview(),
        adminPhase1API.paymentConfig(),
        adminPhase1API.financeTaxCommission(),
        adminPhase1API.bookingTaxSlabs(),
        adminPhase1API.tdsConfig(),
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
        bookingTaxSlabs: bookingTaxSlabsRes.status === 'fulfilled' ? bookingTaxSlabsRes.value.data.data.slabs || [] : [],
        tdsConfig: tdsRes.status === 'fulfilled' ? tdsRes.value.data.data.config : overviewData.tds_config || null,
        subscriptionPlans: plansRes.status === 'fulfilled' ? plansRes.value.data.data.plans || [] : [],
        notificationRules: notificationRulesRes.status === 'fulfilled' ? notificationRulesRes.value.data.data.rules || [] : [],
        escalationRules: escalationRulesRes.status === 'fulfilled' ? escalationRulesRes.value.data.data.rules || [] : [],
        activeEscalations: activeEscalationsRes.status === 'fulfilled' ? activeEscalationsRes.value.data.data.instances || [] : [],
        communication: communicationRes.status === 'fulfilled' ? communicationRes.value.data.data : null,
        operations: operationsData,
      });
    } catch (error) {
      setState({ loading: false, error: '', data: fallbackOverview, paymentConfig: null, taxCommission: null, bookingTaxSlabs: [], tdsConfig: null, subscriptionPlans: [], notificationRules: [], escalationRules: [], activeEscalations: [], communication: null, operations: { settings: defaultMaintenanceSettings, readiness: {}, collection_counts: [], operational_logs: [] } });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const data = state.data || {};
  const metrics = data.metrics || {};
  const profile = data.business_profile || {};
  const pending = data.pending_operations || {};
  const security = data.security_settings || {};

  const saveSecuritySetting = async (key, value) => {
    const reason = await requestReason({ title: 'Security Audit Reason', description: `Updating ${key.replace(/_/g, ' ')}.`, defaultValue: `Updated ${key.replace(/_/g, ' ')}`, placeholder: 'Add security audit reason.', minLength: 3 });
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
    const reason = await requestReason({ title: 'Configuration Audit Reason', description: 'Payment, tax and commission configuration will be updated.', defaultValue: 'Payment, tax and commission configuration updated', placeholder: 'Add configuration audit reason.', minLength: 3 });
    if (!reason) return;
    setSavingPayment(true);
    try {
      await adminPhase1API.updatePaymentConfig({ ...current, ...updates, reason });
      await load();
    } finally {
      setSavingPayment(false);
    }
  };

  const saveBookingTaxSlab = async (payload, slabId = null) => {
    const reason = await requestInput({
      title: 'Tax Slab Audit Reason',
      description: slabId ? 'Booking tax slab will be updated.' : 'New booking tax slab will be created.',
      label: 'Reason',
      defaultValue: slabId ? 'Booking tax slab updated' : 'Booking tax slab created',
      confirmLabel: 'Save Tax Slab',
    });
    if (!reason) return;
    setSavingPayment(true);
    try {
      const body = { ...payload, reason };
      if (slabId) {
        await adminPhase1API.updateBookingTaxSlab(slabId, body);
      } else {
        await adminPhase1API.createBookingTaxSlab(body);
      }
      await load();
    } finally {
      setSavingPayment(false);
    }
  };

  const saveTdsConfig = async (payload) => {
    if (payload.is_enabled) {
      const confirmed = await requestConfirm({
        title: 'Activate TDS Configuration',
        description: 'Activate these role-wise TDS configurations for future payout and commission calculations?',
        confirmLabel: 'Activate',
      });
      if (!confirmed) return;
    }
    const reason = await requestInput({
      title: 'TDS Audit Reason',
      description: 'TDS configuration changes will be saved in audit history.',
      label: 'Reason',
      defaultValue: 'TDS configuration updated',
      confirmLabel: 'Save TDS Config',
    });
    if (!reason) return;
    setSavingTds(true);
    try {
      await adminPhase1API.updateTdsConfig({ ...payload, reason });
      await load();
    } catch (error) {
      await showNotice({
        title: 'TDS Save Failed',
        description: getApiErrorMessage(error, 'Unable to save TDS configuration. Please check the backend and try again.'),
        eyebrow: 'Action Failed',
      });
    } finally {
      setSavingTds(false);
    }
  };

  const toggleBookingTaxSlab = async (slab) => {
    const nextState = !slab.is_active;
    const reason = await requestInput({
      title: 'Tax Slab Audit Reason',
      description: `Booking tax slab will be ${nextState ? 'enabled' : 'disabled'}.`,
      label: 'Reason',
      defaultValue: nextState ? 'Booking tax slab enabled' : 'Booking tax slab disabled',
      confirmLabel: 'Save Status',
    });
    if (!reason) return;
    setSavingPayment(true);
    try {
      await adminPhase1API.updateBookingTaxSlabStatus(slab.slab_id, { is_active: nextState, reason });
      await load();
    } finally {
      setSavingPayment(false);
    }
  };

  const deleteBookingTaxSlab = async (slab) => {
    const confirmed = await requestConfirm({
      title: 'Delete Booking Tax Slab',
      description: 'Delete this booking tax slab? This action will be recorded in audit history.',
      confirmLabel: 'Delete Slab',
      tone: 'danger',
    });
    if (!confirmed) return;
    const reason = await requestInput({
      title: 'Tax Slab Audit Reason',
      description: 'Add a reason before deleting this tax slab.',
      label: 'Reason',
      defaultValue: 'Booking tax slab deleted',
      confirmLabel: 'Delete Slab',
    });
    if (!reason) return;
    setSavingPayment(true);
    try {
      await adminPhase1API.deleteBookingTaxSlab(slab.slab_id, { reason });
      await load();
    } finally {
      setSavingPayment(false);
    }
  };

  const toggleNotificationRule = async (rule) => {
    const nextStatus = rule.status === 'active' ? 'inactive' : 'active';
    const reason = await requestReason({ title: 'Automation Audit Reason', description: `Notification rule will be marked ${nextStatus}.`, defaultValue: `Notification rule marked ${nextStatus}`, placeholder: 'Add automation audit reason.', minLength: 3 });
    if (!reason) return;
    await adminPhase1API.updateNotificationRuleStatus(rule.notification_rule_id, { status: nextStatus, reason });
    await load();
  };

  const saveOperations = async (updates) => {
    const current = state.operations?.settings || data.maintenance_settings || {};
    const reason = await requestReason({ title: 'Operations Audit Reason', description: 'Backup, maintenance or operational settings will be updated.', defaultValue: 'Backup, maintenance and operational settings updated', placeholder: 'Add operations audit reason.', minLength: 3 });
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
        active === 'pricing' ? <PricingEngineTab /> : active === 'security' ? <SecurityAccess settings={security} metrics={metrics} saving={savingSecurity} onSave={saveSecuritySetting} /> : active === 'payments' ? <PaymentTaxCommission paymentConfig={state.paymentConfig} taxCommission={state.taxCommission} bookingTaxSlabs={state.bookingTaxSlabs} tdsConfig={state.tdsConfig} plans={state.subscriptionPlans} saving={savingPayment} savingTds={savingTds} onSave={savePaymentConfig} onSaveTds={saveTdsConfig} onSaveTaxSlab={saveBookingTaxSlab} onToggleTaxSlab={toggleBookingTaxSlab} onDeleteTaxSlab={deleteBookingTaxSlab} /> : active === 'automation' ? <AutomationSettings notificationRules={state.notificationRules} escalationRules={state.escalationRules} activeEscalations={state.activeEscalations} communication={state.communication} onToggleRule={toggleNotificationRule} /> : active === 'operations' ? <OperationalControls data={state.operations} fallbackSettings={data.maintenance_settings} onSave={saveOperations} /> : <div className="space-y-5">
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef4ff] text-[#2563eb]"><Icon className="h-5 w-5" /></div>
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

const paymentChargeDefinitions = [
  ['platform_fee', 'Platform Fee', 'Percentage fee applied on host-entered booking amount.'],
  ['payment_gateway_charge', 'Payment Gateway Charge', 'Gateway cost collected during booking checkout.'],
  ['convenience_fee', 'Convenience Fee', 'Operational convenience charge for customer checkout.'],
  ['insurance_fee', 'Insurance Fee', 'Insurance or protection charge when enabled.'],
  ['cleaning_fee', 'Cleaning Fee', 'Cleaning charge shown in booking pricing.'],
  ['extra_guest_fee', 'Extra Guest Fee', 'Additional guest or staff charge when configured.'],
];

const hostPayoutDefinitions = [
  ['platform_commission', 'Platform Commission', 'Commission deducted before host payout.'],
  ['gateway_charge', 'Gateway Charges', 'Payment gateway deduction before payout.'],
];

const commissionRuleDefinitions = [
  ['broker', 'Broker Commission', 'Commission percentage for broker-first mapped bookings.'],
  ['employee', 'RM / Employee Commission', 'Commission percentage for RM-first mapped bookings.'],
  ['branch_manager', 'Branch Manager Commission', 'Commission percentage for branch manager oversight.'],
];

const chargeTypeOptions = [
  ['percentage', 'Percentage (%)'],
  ['fixed', 'Fixed Amount (Rs.)'],
];

const defaultCharge = (key, existing = {}) => ({
  enabled: key === 'platform_fee' ? existing.enabled !== false : Boolean(existing.enabled),
  charge_type: existing.charge_type || existing.type || (key === 'platform_fee' ? 'percentage' : 'fixed'),
  value: existing.value ?? existing.percent ?? 0,
  label: existing.label || paymentChargeDefinitions.find(([chargeKey]) => chargeKey === key)?.[1] || key,
});

const defaultPlatformFeeOverride = (key, existing = {}, fallbackValue = 0) => ({
  enabled: Boolean(existing.enabled),
  charge_type: 'percentage',
  value: existing.value ?? existing.percent ?? fallbackValue,
  label: existing.label || (key === 'broker_mapped' ? 'Broker Mapped Platform Fee' : 'RM Mapped Platform Fee'),
});

const defaultPayoutCharge = (key, existing = {}) => ({
  enabled: key === 'platform_commission' ? existing.enabled !== false : Boolean(existing.enabled),
  charge_type: existing.charge_type || existing.type || 'percentage',
  value: existing.value ?? 0,
  label: existing.label || hostPayoutDefinitions.find(([chargeKey]) => chargeKey === key)?.[1] || key,
});

const defaultCommissionRule = (key, existing = {}) => ({
  enabled: Boolean(existing.enabled),
  charge_type: 'percentage',
  value: existing.value ?? existing.percent ?? 0,
  label: existing.label || commissionRuleDefinitions.find(([ruleKey]) => ruleKey === key)?.[1] || key,
});

const currentFyStart = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-04-01`;
};

const buildTdsDraft = (config = {}) => ({
  role: config.role || 'host',
  role_label: config.role_label || ({ host: 'Host', broker: 'Broker', employee: 'Employee' }[config.role || 'host'] || 'Host'),
  is_enabled: config.is_enabled !== false,
  provision_code: config.provision_code || 'Section 194-O',
  standard_rate: config.standard_rate ?? 0.10,
  calculation_base: 'GROSS_BOOKING_VALUE',
  effective_from: (config.effective_from || currentFyStart()).slice(0, 10),
  effective_to: config.effective_to ? String(config.effective_to).slice(0, 10) : '',
  rounding_method: config.rounding_method || 'NEAREST_RUPEE',
  thresholds: {
    individual_huf: config.thresholds?.individual_huf ?? 500000,
    other_entity: config.thresholds?.other_entity ?? 0,
  },
  pan_aadhaar_required: config.pan_aadhaar_required !== false,
  missing_pan_rate: config.missing_pan_rate ?? 20,
});

const tdsRoleOptions = [
  ['host', 'Host'],
  ['broker', 'Broker'],
  ['employee', 'Employee'],
];

const tdsCalculationBaseLabels = {
  host: 'Gross Booking Value',
  broker: 'Broker Commission Value',
  employee: 'Employee Commission Value',
};

const buildPaymentDraft = (paymentConfig = {}) => {
  const rawCharges = paymentConfig.charges || {};
  const rawPayout = paymentConfig.host_payout || {};
  const platformCharge = {
    ...rawCharges.platform_fee,
    enabled: false,
    value: 0,
    label: rawCharges.platform_fee?.label || paymentConfig.platform_fee_label || 'Platform Fee',
  };
  const rawOverrides = paymentConfig.platform_fee_overrides || {};
  const platformValue = 0;

  return {
    charges: Object.fromEntries(paymentChargeDefinitions.map(([key]) => [
      key,
      defaultCharge(key, key === 'platform_fee' ? platformCharge : rawCharges[key]),
    ])),
    platform_fee_overrides: {
      broker_mapped: defaultPlatformFeeOverride('broker_mapped', rawOverrides.broker_mapped, platformValue),
      rm_mapped: defaultPlatformFeeOverride('rm_mapped', rawOverrides.rm_mapped, platformValue),
    },
    host_payout: Object.fromEntries(hostPayoutDefinitions.map(([key]) => [
      key,
      defaultPayoutCharge(key, rawPayout[key]),
    ])),
    commission_rules: Object.fromEntries(commissionRuleDefinitions.map(([key]) => [
      key,
      defaultCommissionRule(key, paymentConfig.commission_rules?.[key]),
    ])),
  };
};

const ConfigChargeRow = ({ title, description, value, typeOptions = chargeTypeOptions, onChange, forceEnabled }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="font-black text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
        <input
          type="checkbox"
          checked={forceEnabled ? true : Boolean(value.enabled)}
          disabled={forceEnabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
          className="h-4 w-4 accent-emerald-700"
        />
        {forceEnabled ? 'Required' : value.enabled ? 'Enabled' : 'Disabled'}
      </label>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
      <select
        value={value.charge_type || value.discount_type || 'percentage'}
        onChange={(event) => onChange(value.discount_type !== undefined ? { discount_type: event.target.value } : { charge_type: event.target.value })}
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-gold"
      >
        {typeOptions.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value.value ?? value.default_value ?? 0}
        onChange={(event) => onChange(value.discount_type !== undefined ? { default_value: event.target.value } : { value: event.target.value })}
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
        placeholder="Value"
      />
    </div>
  </div>
);

const PlatformFeeRuleInputs = ({ overrides, onChange }) => (
  <div className="mt-4 grid gap-3 md:grid-cols-2">
    {[
      ['broker_mapped', 'Broker Mapped Property (%)', 'Applies this platform fee percentage to broker-mapped properties only.'],
      ['rm_mapped', 'RM Mapped Property (%)', 'Applies this platform fee percentage to RM or employee-mapped properties only.'],
    ].map(([key, title, help]) => {
      const row = overrides[key] || {};
      return (
        <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wide text-slate-500">
            <span>{title}</span>
            <span className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean(row.enabled)}
                onChange={(event) => onChange(key, { enabled: event.target.checked })}
                className="h-4 w-4 accent-emerald-700"
              />
              {row.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={row.value ?? 0}
            onChange={(event) => onChange(key, { value: event.target.value })}
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-gold"
            placeholder="Percentage"
          />
          <p className="mt-2 text-xs leading-5 text-slate-500">{help}</p>
        </div>
      );
    })}
  </div>
);

const PaymentTaxCommission = ({
  paymentConfig,
  taxCommission,
  bookingTaxSlabs = [],
  tdsConfig,
  plans,
  saving,
  savingTds,
  onSave,
  onSaveTds,
  onSaveTaxSlab,
  onToggleTaxSlab,
  onDeleteTaxSlab,
}) => {
  const summary = taxCommission?.summary || {};
  const taxLedger = taxCommission?.tax_ledger || [];
  const [draft, setDraft] = useState(() => buildPaymentDraft(paymentConfig || {}));
  const [editingSlab, setEditingSlab] = useState(null);

  useEffect(() => {
    setDraft(buildPaymentDraft(paymentConfig || {}));
  }, [paymentConfig]);

  const updateCharge = (key, patch) => {
    setDraft((current) => ({
      ...current,
      charges: {
        ...current.charges,
        [key]: { ...current.charges[key], ...patch },
      },
    }));
  };

  const updatePlatformFeeOverride = (key, patch) => {
    setDraft((current) => ({
      ...current,
      platform_fee_overrides: {
        ...current.platform_fee_overrides,
        [key]: {
          ...current.platform_fee_overrides[key],
          ...patch,
          charge_type: 'percentage',
        },
      },
    }));
  };

  const updatePayout = (key, patch) => {
    setDraft((current) => ({
      ...current,
      host_payout: {
        ...current.host_payout,
        [key]: { ...current.host_payout[key], ...patch },
      },
    }));
  };

  const updateCommissionRule = (key, patch) => {
    setDraft((current) => ({
      ...current,
      commission_rules: {
        ...current.commission_rules,
        [key]: {
          ...current.commission_rules[key],
          ...patch,
          charge_type: 'percentage',
        },
      },
    }));
  };

  const validateConfig = () => {
    const rows = [
      ...Object.values(draft.charges),
      ...Object.values(draft.platform_fee_overrides || {}),
      ...Object.values(draft.host_payout),
      ...Object.values(draft.commission_rules || {}),
    ];
    for (const row of rows) {
      const value = Number(row.value ?? row.default_value ?? 0);
      if (Number.isNaN(value) || value < 0) return 'Configuration values cannot be negative.';
      const type = row.charge_type || row.discount_type;
      if (type === 'percentage' && value > 100) return 'Percentage values must be between 0 and 100.';
    }
    return '';
  };

  const saveConfig = () => {
    const error = validateConfig();
    if (error) {
      showNotice({ title: 'Validation Error', description: error, eyebrow: 'Validation Error' });
      return;
    }
    const platformFee = draft.charges.platform_fee || {};
    const normalizedCharges = {
      ...draft.charges,
      platform_fee: {
        ...platformFee,
        enabled: false,
        charge_type: 'percentage',
        value: 0,
        label: platformFee.label || 'Platform Fee',
      },
    };
    onSave({
      platform_fee_percent: 0,
      platform_fee_label: platformFee.label || 'Platform Fee',
      charges: normalizedCharges,
      platform_fee_overrides: Object.fromEntries(Object.entries(draft.platform_fee_overrides || {}).map(([key, value]) => [
        key,
        { ...value, enabled: Boolean(value.enabled), charge_type: 'percentage' },
      ])),
      host_payout: draft.host_payout,
      commission_rules: Object.fromEntries(Object.entries(draft.commission_rules || {}).map(([key, value]) => [
        key,
        { ...value, enabled: Boolean(value.enabled), charge_type: 'percentage' },
      ])),
    });
  };

  const displayAmount = (value) => {
    if (value === null || value === undefined || value === '') return 'Unlimited';
    return money(value);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          ['Payment Configuration', 'Mapped platform fee'],
          ['Booking GST Slabs', `${bookingTaxSlabs.filter((slab) => slab.is_active !== false).length} active`],
          ['Commission Configuration', `${Object.values(draft.commission_rules || {}).filter((row) => row.enabled).length} active`],
          ['TDS Configuration', `${tdsConfig?.configurations?.length || 1} role rule(s)`],
          ['Subscription Tax', `${plans.length} plans`],
        ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 break-words text-xl font-black">{value}</p></Panel>)}
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-black">Payment Configuration</h2>
            <p className="mt-1 text-xs text-slate-500">Booking checkout charges are read dynamically from this configuration.</p>
          </div>
          <button
            disabled={saving}
            onClick={saveConfig}
            className="rounded-xl bg-charcoal px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {paymentChargeDefinitions.map(([key, title, description]) => (
            <div key={key}>
              {key === 'platform_fee' ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-900">{title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Configure separate platform fee percentages for broker-mapped and RM-mapped properties.
                      </p>
                    </div>
                    <span className="text-xs font-black uppercase tracking-wide text-emerald-700">Mapped Rules</span>
                  </div>
                  <PlatformFeeRuleInputs
                    overrides={draft.platform_fee_overrides || {}}
                    onChange={updatePlatformFeeOverride}
                  />
                </div>
              ) : (
                <ConfigChargeRow
                  title={title}
                  description={description}
                  value={draft.charges[key]}
                  onChange={(patch) => updateCharge(key, patch)}
                />
              )}
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-4">
            <div>
              <h2 className="font-black">Booking Tax Slab Configuration</h2>
              <p className="mt-1 text-xs text-slate-500">Booking GST is calculated from the matching active taxable amount slab.</p>
            </div>
            <button
              disabled={saving}
              onClick={() => setEditingSlab({ __new: true })}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white shadow-sm disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Add Tax Slab
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {['From Amount', 'To Amount', 'GST Percentage', 'Status', 'Actions'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookingTaxSlabs.map((slab) => (
                  <tr key={slab.slab_id}>
                    <td className="px-4 py-3 font-bold">{displayAmount(slab.from_amount)}</td>
                    <td className="px-4 py-3 font-bold">{displayAmount(slab.to_amount)}</td>
                    <td className="px-4 py-3">{slab.gst_percent}%</td>
                    <td className="px-4 py-3"><StatusBadge value={slab.is_active === false ? 'inactive' : 'active'} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button disabled={saving} onClick={() => setEditingSlab(slab)} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-60"><Pencil className="h-3.5 w-3.5" /> Edit</button>
                        <button disabled={saving} onClick={() => onToggleTaxSlab(slab)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60"><Power className="h-3.5 w-3.5" /> {slab.is_active === false ? 'Enable' : 'Disable'}</button>
                        <button disabled={saving} onClick={() => onDeleteTaxSlab(slab)} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!bookingTaxSlabs.length && <p className="p-6 text-sm text-slate-500">No booking tax slabs configured. Checkout will use the fallback GST rate until a slab is added.</p>}
          </div>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-black">Host Payout Configuration</h2>
          <p className="mt-1 text-xs text-slate-500">Deductions used by host settlement calculations.</p>
          <div className="mt-4 space-y-3">
            {hostPayoutDefinitions.map(([key, title, description]) => (
              <ConfigChargeRow
                key={key}
                title={title}
                description={description}
                value={draft.host_payout[key]}
                onChange={(patch) => updatePayout(key, patch)}
              />
            ))}
          </div>
        </Panel>
      </div>

      <Panel className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <h2 className="font-black">Commission Configuration</h2>
            <p className="mt-1 text-xs text-slate-500">Configure booking-wise commission percentages for broker, RM/employee and branch manager settlements.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">Percentage Rules</span>
            <button
              disabled={saving}
              onClick={saveConfig}
              className="rounded-xl bg-charcoal px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Commission'}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {commissionRuleDefinitions.map(([key, title, description]) => (
            <ConfigChargeRow
              key={key}
              title={title}
              description={description}
              value={draft.commission_rules[key]}
              typeOptions={[['percentage', 'Percentage (%)']]}
              onChange={(patch) => updateCommissionRule(key, patch)}
            />
          ))}
        </div>
      </Panel>

      <TdsConfigurationPanel config={tdsConfig} saving={savingTds} onSave={onSaveTds} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Subscription Plan Tax</h2>
            <p className="text-xs text-slate-500">Subscription tax remains separate from booking tax slab rules.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {plans.slice(0, 8).map((plan) => <div key={plan.plan_id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_100px_100px] md:items-center"><div><p className="font-black">{plan.name || plan.plan_name || plan.plan_id}</p><p className="text-xs text-slate-500">{plan.plan_id}</p></div><span>{plan.tax_percent ?? 18}% tax</span><StatusBadge value={plan.is_active === false ? 'inactive' : 'active'} /></div>)}
            {!plans.length && <p className="p-4 text-sm text-slate-500">No subscription plans found.</p>}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Tax Ledger Preview</h2>
            <p className="text-xs text-slate-500">Estimated tax and commission liabilities from finance records.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Tax ID', 'Type', 'Taxable', 'Rate', 'Amount', 'Status'].map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {taxLedger.map((row) => <tr key={row.tax_id}><td className="px-4 py-3 font-mono text-xs">{row.tax_id}</td><td className="px-4 py-3">{row.tax_type}</td><td className="px-4 py-3">{money(row.taxable_amount || 0)}</td><td className="px-4 py-3">{row.tax_rate}%</td><td className="px-4 py-3 font-black">{money(row.tax_amount || 0)}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td></tr>)}
              </tbody>
            </table>
            {!taxLedger.length && <p className="p-6 text-sm text-slate-500">No tax ledger data found.</p>}
          </div>
        </Panel>
      </div>

      {editingSlab && (
        <TaxSlabModal
          slab={editingSlab.__new ? null : editingSlab}
          saving={saving}
          onClose={() => setEditingSlab(null)}
          onSave={async (payload, slabId) => {
            await onSaveTaxSlab(payload, slabId);
            setEditingSlab(null);
          }}
        />
      )}
    </div>
  );
};

const TdsConfigurationPanel = ({ config, saving, onSave }) => {
  const buildDrafts = (source = {}) => {
    const configs = Array.isArray(source.configurations) && source.configurations.length
      ? source.configurations
      : [source];
    const byRole = new Map(configs.map((item) => [item.role || 'host', buildTdsDraft(item)]));
    if (!byRole.has('host')) byRole.set('host', buildTdsDraft({ role: 'host' }));
    return Array.from(byRole.values());
  };

  const [drafts, setDrafts] = useState(() => buildDrafts(config || {}));

  useEffect(() => {
    setDrafts(buildDrafts(config || {}));
  }, [config]);

  const updateDraft = (index, patch) => setDrafts((current) => current.map((item, idx) => (
    idx === index ? { ...item, ...patch } : item
  )));
  const updateThreshold = (index, key, value) => setDrafts((current) => current.map((item, idx) => (
    idx === index ? { ...item, thresholds: { ...item.thresholds, [key]: value } } : item
  )));
  const usedRoles = drafts.map((item) => item.role);
  const nextRole = tdsRoleOptions.find(([role]) => !usedRoles.includes(role))?.[0];

  const addConfiguration = () => {
    if (!nextRole) {
      window.alert('TDS configuration is already added for Host, Broker and Employee.');
      return;
    }
    setDrafts((current) => [...current, buildTdsDraft({ role: nextRole })]);
  };

  const removeConfiguration = (index) => {
    setDrafts((current) => {
      const item = current[index];
      if (item?.role === 'host') {
        window.alert('Host TDS configuration is required.');
        return current;
      }
      return current.filter((_, idx) => idx !== index);
    });
  };

  const submit = async () => {
    try {
      const seen = new Set();
      const configurations = drafts.map((draft) => {
        const standardRate = Number(draft.standard_rate);
        const missingPanRate = Number(draft.missing_pan_rate);
        const individualThreshold = Number(draft.thresholds.individual_huf);
        const otherThreshold = Number(draft.thresholds.other_entity);
        if (seen.has(draft.role)) {
          throw new Error('Each role can have only one active TDS configuration.');
        }
        seen.add(draft.role);
        if (!draft.effective_from) {
          throw new Error('Effective From date is required.');
        }
        if ([standardRate, missingPanRate, individualThreshold, otherThreshold].some((value) => Number.isNaN(value) || value < 0)) {
          throw new Error('TDS rates and thresholds cannot be negative.');
        }
        if (draft.effective_to && draft.effective_from > draft.effective_to) {
          throw new Error('Effective To must be after Effective From.');
        }
        return {
          ...draft,
          role_label: tdsRoleOptions.find(([role]) => role === draft.role)?.[1] || draft.role,
          standard_rate: standardRate,
          missing_pan_rate: missingPanRate,
          thresholds: {
            individual_huf: individualThreshold,
            other_entity: otherThreshold,
          },
          effective_to: draft.effective_to || null,
        };
      });
      onSave({
        ...configurations.find((item) => item.role === 'host'),
        configurations,
      });
    } catch (error) {
      await showNotice({
        title: 'Validation Error',
        description: error.message || 'Unable to save TDS configuration.',
        eyebrow: 'Validation Error',
      });
      return;
    }
  };

  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="font-black">TDS Configuration</h2>
          <p className="mt-1 text-xs text-slate-500">Role-wise TDS rules for host payouts and broker/employee commission payouts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={saving || !nextRole}
            onClick={addConfiguration}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add Configuration
          </button>
          <button
            disabled={saving}
            onClick={submit}
            className="rounded-xl bg-charcoal px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save TDS Configuration'}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {drafts.map((draft, index) => (
          <div key={`${draft.role}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-gold">{draft.role_label || draft.role}</p>
                <h3 className="text-lg font-black">{draft.role_label || draft.role} TDS Rule</h3>
              </div>
              {draft.role !== 'host' && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => removeConfiguration(index)}
                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Apply To Role</span>
                <select
                  value={draft.role}
                  disabled={draft.role === 'host'}
                  onChange={(event) => {
                    const role = event.target.value;
                    if (usedRoles.includes(role)) {
                      window.alert('Configuration already exists for this role.');
                      return;
                    }
                    updateDraft(index, {
                      role,
                      role_label: tdsRoleOptions.find(([value]) => value === role)?.[1] || role,
                    });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {tdsRoleOptions.map(([role, label]) => <option key={role} value={role}>{label}</option>)}
                </select>
              </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Status</span>
          <select
            value={draft.is_enabled ? 'enabled' : 'disabled'}
            onChange={(event) => updateDraft(index, { is_enabled: event.target.value === 'enabled' })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
          >
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Provision Code</span>
          <input
            value={draft.provision_code}
            onChange={(event) => updateDraft(index, { provision_code: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Calculation Base</span>
          <input
            value={tdsCalculationBaseLabels[draft.role] || 'Gross Value'}
            disabled
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 font-bold text-slate-500"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Standard Rate (%)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.standard_rate}
            onChange={(event) => updateDraft(index, { standard_rate: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Missing PAN Rate (%)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.missing_pan_rate}
            onChange={(event) => updateDraft(index, { missing_pan_rate: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Rounding Method</span>
          <select
            value={draft.rounding_method}
            onChange={(event) => updateDraft(index, { rounding_method: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
          >
            <option value="NEAREST_RUPEE">Nearest Rupee</option>
            <option value="TWO_DECIMAL">Two Decimal</option>
            <option value="FLOOR">Floor</option>
            <option value="CEIL">Ceil</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Effective From</span>
          <input
            type="date"
            value={draft.effective_from}
            onChange={(event) => updateDraft(index, { effective_from: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Effective To</span>
          <input
            type="date"
            value={draft.effective_to}
            onChange={(event) => updateDraft(index, { effective_to: event.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
          />
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            checked={draft.pan_aadhaar_required}
            onChange={(event) => updateDraft(index, { pan_aadhaar_required: event.target.checked })}
            className="h-4 w-4 accent-emerald-700"
          />
          <span className="text-sm font-bold">PAN/Aadhaar required for standard TDS rate</span>
        </label>
            </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Individual / HUF FY Threshold</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.thresholds.individual_huf}
            onChange={(event) => updateThreshold(index, 'individual_huf', event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
          />
          <p className="text-xs text-slate-500">Resident Individual/HUF TDS starts after this financial-year gross value.</p>
        </label>
        <label className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500">Other Entity FY Threshold</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.thresholds.other_entity}
            onChange={(event) => updateThreshold(index, 'other_entity', event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold"
          />
          <p className="text-xs text-slate-500">Company, LLP, partnership and other entities normally use zero threshold.</p>
        </label>
      </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};

const TaxSlabModal = ({ slab, saving, onClose, onSave }) => {
  const [draft, setDraft] = useState({
    from_amount: slab?.from_amount ?? '',
    to_amount: slab?.to_amount ?? '',
    unlimited: slab?.to_amount === null || slab?.to_amount === undefined,
    gst_percent: slab?.gst_percent ?? '',
    is_active: slab?.is_active ?? true,
  });

  const submit = async (event) => {
    event.preventDefault();
    const fromAmount = Number(draft.from_amount);
    const toAmount = draft.unlimited ? null : Number(draft.to_amount);
    const gstPercent = Number(draft.gst_percent);
    if (Number.isNaN(fromAmount) || fromAmount < 0) {
      await showNotice({ title: 'Validation Error', description: 'From Amount must be zero or more.', eyebrow: 'Validation Error' });
      return;
    }
    if (!draft.unlimited && (Number.isNaN(toAmount) || fromAmount >= toAmount)) {
      await showNotice({ title: 'Validation Error', description: 'From Amount must be less than To Amount.', eyebrow: 'Validation Error' });
      return;
    }
    if (Number.isNaN(gstPercent) || gstPercent < 0) {
      await showNotice({ title: 'Validation Error', description: 'GST percentage cannot be negative.', eyebrow: 'Validation Error' });
      return;
    }
    await onSave({
      from_amount: fromAmount,
      to_amount: toAmount,
      gst_percent: gstPercent,
      is_active: Boolean(draft.is_active),
    }, slab?.slab_id || null);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-charcoal/50 p-4">
      <form onSubmit={submit} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-black">{slab ? 'Edit Tax Slab' : 'Add Tax Slab'}</h3>
            <p className="mt-1 text-sm text-slate-500">Configure booking GST amount ranges.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">Close</button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">From Amount</span>
            <input type="number" min="0" step="0.01" value={draft.from_amount} onChange={(event) => setDraft((current) => ({ ...current, from_amount: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold" required />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">To Amount</span>
            <input type="number" min="0" step="0.01" value={draft.to_amount} disabled={draft.unlimited} onChange={(event) => setDraft((current) => ({ ...current, to_amount: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold disabled:opacity-50" />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">GST Percentage</span>
            <input type="number" min="0" step="0.01" value={draft.gst_percent} onChange={(event) => setDraft((current) => ({ ...current, gst_percent: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-gold" required />
          </label>
          <div className="grid gap-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold">
              <input type="checkbox" checked={draft.unlimited} onChange={(event) => setDraft((current) => ({ ...current, unlimited: event.target.checked, to_amount: event.target.checked ? '' : current.to_amount }))} />
              Maximum Amount Unlimited
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold">
              <input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))} />
              Active
            </label>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700">Cancel</button>
          <button disabled={saving} type="submit" className="rounded-xl bg-charcoal px-5 py-3 text-sm font-black text-white disabled:opacity-60">{saving ? 'Saving...' : 'Save Tax Slab'}</button>
        </div>
      </form>
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
  const updateSchedule = async () => {
    const backupFrequency = await requestInput({
      title: 'Backup Schedule',
      description: 'Allowed values: hourly, daily, weekly, monthly.',
      label: 'Backup Frequency',
      defaultValue: settings.backup_frequency || 'daily',
      confirmLabel: 'Continue',
    });
    if (!backupFrequency) return;
    const backupOwner = await requestInput({
      title: 'Backup Schedule',
      description: 'Enter backup owner name or user ID.',
      label: 'Backup Owner',
      defaultValue: settings.backup_owner || '',
      confirmLabel: 'Continue',
      allowEmpty: true,
    });
    if (backupOwner === null) return;
    const retentionDays = await requestInput({
      title: 'Backup Schedule',
      description: 'Enter retention period in days.',
      label: 'Retention Days',
      defaultValue: String(settings.retention_days || 30),
      inputType: 'number',
      confirmLabel: 'Continue',
    });
    if (retentionDays === null) return;
    const nextBackupAt = await requestInput({
      title: 'Backup Schedule',
      description: 'Optional next backup date/time.',
      label: 'Next Backup At',
      defaultValue: settings.next_backup_at || '',
      placeholder: '2026-08-02T02:00',
      confirmLabel: 'Save Schedule',
      allowEmpty: true,
    });
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
            <button
              onClick={async () => {
                const message = await requestInput({
                  title: 'Maintenance Message',
                  description: 'Update the message shown during maintenance mode.',
                  label: 'Message',
                  defaultValue: settings.maintenance_message || '',
                  inputType: 'textarea',
                  confirmLabel: 'Save Message',
                  allowEmpty: true,
                });
                if (message !== null) onSave({ maintenance_message: message });
              }}
              className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-black text-slate-700"
            >
              Edit Message
            </button>
            <button onClick={updateSchedule} className="w-full rounded-lg bg-charcoal px-3 py-2 text-sm font-black text-white">Edit Backup Schedule</button>
            <button onClick={markBackupComplete} className="w-full rounded-lg bg-[#eef4ff] px-3 py-2 text-sm font-black text-[#2563eb]">Mark Backup Verified</button>
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
      <input type="number" value={draft} onChange={(event) => setDraft(Number(event.target.value))} className="h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#93c5fd] focus:ring-2 focus:ring-[#dbeafe]" />
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
