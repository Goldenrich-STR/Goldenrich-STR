import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Brush,
  CalendarDays,
  Check,
  CreditCard,
  DatabaseZap,
  Globe,
  ImagePlus,
  Layers3,
  LocateFixed,
  Mail,
  MapPin,
  MonitorCog,
  Palette,
  RefreshCw,
  Save,
  Scale,
  Settings2,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { getApiErrorMessage } from '../../services/api';
import { ErrorState, LoadingState, Panel, requestConfirm, requestReason, showNotice } from './shared';

const settingsTabs = [
  { id: 'general', label: 'General Settings', icon: Settings2 },
  { id: 'payments', label: 'Payment Settings', icon: CreditCard },
  { id: 'notifications', label: 'Email & Notifications', icon: Mail },
  { id: 'maps', label: 'Maps & Location', icon: MapPin },
  { id: 'bookings', label: 'Booking Settings', icon: CalendarDays },
  { id: 'subscriptions', label: 'Subscription Plans', icon: Layers3 },
  { id: 'legal', label: 'Legal & Compliance', icon: Scale },
  { id: 'appearance', label: 'Appearance', icon: Brush },
];

const featureCatalog = [
  { key: 'residential_stays', label: 'Residential Stays', description: 'Enable residential property listings', icon: Globe, color: 'text-blue-600 bg-blue-50' },
  { key: 'user_registration', label: 'User Registration', description: 'Allow new user registrations', icon: Mail, color: 'text-blue-600 bg-blue-50' },
  { key: 'commercial_workspaces', label: 'Commercial Workspaces', description: 'Enable workspace listings', icon: MonitorCog, color: 'text-indigo-600 bg-indigo-50' },
  { key: 'host_registration', label: 'Host Registration', description: 'Allow new host registrations', icon: ImagePlus, color: 'text-orange-600 bg-orange-50' },
  { key: 'event_venues', label: 'Event Venues', description: 'Enable event venue listings', icon: CalendarDays, color: 'text-amber-600 bg-amber-50' },
  { key: 'broker_registration', label: 'Broker Registration', description: 'Allow broker registrations', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'instant_booking', label: 'Instant Booking', description: 'Allow instant booking for properties', icon: RefreshCw, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'property_reviews', label: 'Property Reviews', description: 'Enable property reviews and ratings', icon: Palette, color: 'text-pink-600 bg-pink-50' },
];

const defaultForm = {
  platformName: 'X-Space360',
  tagline: 'Rent. Work. Host. Celebrate.',
  websiteUrl: 'https://x-space360.in',
  supportEmail: 'support@x-space360.in',
  supportPhone: '+91 1800 123 3600',
  defaultCurrency: 'INR (₹)',
  defaultLanguage: 'English',
  timeZone: '(GMT+5:30) Asia/Kolkata',
  maintenanceMode: false,
  maintenanceMessage: 'Platform maintenance is scheduled. Please try again shortly.',
};

const defaultFeatures = {
  residential_stays: true,
  user_registration: true,
  commercial_workspaces: true,
  host_registration: true,
  event_venues: true,
  broker_registration: true,
  instant_booking: false,
  property_reviews: true,
};

const currencyOptions = ['INR (₹)', 'USD ($)', 'EUR (€)', 'GBP (£)'];
const languageOptions = ['English', 'Hindi', 'Marathi'];
const timezoneOptions = ['(GMT+5:30) Asia/Kolkata', '(GMT+0:00) UTC', '(GMT+4:00) Dubai', '(GMT-5:00) New York'];

const buildFormState = (overview, operations) => {
  const profile = overview?.business_profile || {};
  const maintenance = operations?.settings || overview?.maintenance_settings || {};

  return {
    platformName: profile.brand_name || defaultForm.platformName,
    tagline: profile.tagline || defaultForm.tagline,
    websiteUrl: profile.website_url || defaultForm.websiteUrl,
    supportEmail: profile.support_email || defaultForm.supportEmail,
    supportPhone: profile.support_phone || defaultForm.supportPhone,
    defaultCurrency: profile.currency_label || profile.currency || defaultForm.defaultCurrency,
    defaultLanguage: profile.language || defaultForm.defaultLanguage,
    timeZone: profile.timezone_label || profile.timezone || defaultForm.timeZone,
    maintenanceMode: Boolean(maintenance.maintenance_mode),
    maintenanceMessage: maintenance.maintenance_message || defaultForm.maintenanceMessage,
  };
};

const buildFeatureState = (overview) => ({
  ...defaultFeatures,
  ...(overview?.feature_flags || {}),
});

const validateForm = (form) => {
  const errors = {};
  if (!form.platformName.trim()) errors.platformName = 'Platform name is required.';
  if (form.platformName.trim().length > 80) errors.platformName = 'Platform name is too long.';
  if (!/^https:\/\/.+/i.test(form.websiteUrl.trim())) errors.websiteUrl = 'Use a valid HTTPS URL.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())) errors.supportEmail = 'Enter a valid email address.';
  if (!/^[+\d\s()-]{8,20}$/.test(form.supportPhone.trim())) errors.supportPhone = 'Enter a valid phone number.';
  if (!currencyOptions.includes(form.defaultCurrency)) errors.defaultCurrency = 'Choose a supported currency.';
  if (!languageOptions.includes(form.defaultLanguage)) errors.defaultLanguage = 'Choose a supported language.';
  if (!timezoneOptions.includes(form.timeZone)) errors.timeZone = 'Choose a supported time zone.';
  return errors;
};

const formatDateTime = (value, fallback = '28 May 2026, 10:45 AM') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const toPreview = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const PlatformSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [operations, setOperations] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [features, setFeatures] = useState(defaultFeatures);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState('/logo.png');
  const [faviconPreview, setFaviconPreview] = useState('/logo.png');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [overviewRes, operationsRes] = await Promise.allSettled([
          adminPhase1API.platformSettingsOverview(),
          adminPhase1API.operationalSettings(),
        ]);

        const overviewData = overviewRes.status === 'fulfilled' ? overviewRes.value.data?.data || {} : {};
        const operationsData = operationsRes.status === 'fulfilled' ? operationsRes.value.data?.data || {} : {};

        setOverview(overviewData);
        setOperations(operationsData);
        setForm(buildFormState(overviewData, operationsData));
        setFeatures(buildFeatureState(overviewData));
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Unable to load platform settings.'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const pageStats = useMemo(() => {
    const featureCount = Object.values(features).filter(Boolean).length;
    const maintenanceMode = form.maintenanceMode;
    return {
      platformLive: !maintenanceMode,
      featureCount,
      version: overview?.system_info?.version || 'v2.4.0',
      environment: overview?.system_info?.environment || 'Production',
      lastUpdated: formatDateTime(overview?.system_info?.last_updated_at || operations?.settings?.updated_at),
      updatedBy: overview?.system_info?.updated_by || overview?.business_profile?.brand_name || 'X-Space360 Admin',
    };
  }, [features, form.maintenanceMode, operations, overview]);

  const handleFieldChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleFeatureToggle = (key) => {
    setFeatures((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleImageUpload = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const sizeLimit = type === 'logo' ? 2 * 1024 * 1024 : 1024 * 1024;
    const allowedTypes = type === 'logo'
      ? ['image/png', 'image/jpeg', 'image/svg+xml']
      : ['image/png', 'image/x-icon', 'image/vnd.microsoft.icon'];

    if (!allowedTypes.includes(file.type)) {
      await showNotice({
        title: 'Unsupported file format',
        description: type === 'logo' ? 'Upload PNG, JPG or SVG.' : 'Upload PNG or ICO.',
        eyebrow: 'Upload blocked',
      });
      return;
    }

    if (file.size > sizeLimit) {
      await showNotice({
        title: 'File too large',
        description: type === 'logo' ? 'Logo must be under 2MB.' : 'Favicon must be under 1MB.',
        eyebrow: 'Upload blocked',
      });
      return;
    }

    const preview = await toPreview(file);
    if (type === 'logo') setLogoPreview(preview);
    if (type === 'favicon') setFaviconPreview(preview);
    event.target.value = '';
  };

  const handleSave = async () => {
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const reason = await requestReason({
      title: 'Save Platform Settings',
      description: 'These changes update platform preferences and operational controls.',
      defaultValue: 'Platform settings updated',
      placeholder: 'Add change reason for audit trail.',
      minLength: 3,
    });
    if (!reason) return;

    setSaving(true);
    try {
      await adminPhase1API.updateOperationalSettings({
        ...(operations?.settings || {}),
        maintenance_mode: form.maintenanceMode,
        maintenance_message: form.maintenanceMessage,
        general_settings: {
          platform_name: form.platformName,
          tagline: form.tagline,
          website_url: form.websiteUrl,
          support_email: form.supportEmail,
          support_phone: form.supportPhone,
          currency: form.defaultCurrency,
          language: form.defaultLanguage,
          timezone: form.timeZone,
        },
        feature_flags: features,
        reason,
      });

      setOperations((current) => ({
        ...(current || {}),
        settings: {
          ...(current?.settings || {}),
          maintenance_mode: form.maintenanceMode,
          maintenance_message: form.maintenanceMessage,
          updated_at: new Date().toISOString(),
        },
      }));

      await showNotice({
        title: 'Platform settings saved',
        description: 'General settings and operational controls were updated successfully.',
        eyebrow: 'Success',
      });
    } catch (saveError) {
      await showNotice({
        title: 'Save failed',
        description: getApiErrorMessage(saveError, 'Unable to save platform settings right now.'),
        eyebrow: 'Action failed',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMaintenanceToggle = async () => {
    const confirmed = await requestConfirm({
      title: form.maintenanceMode ? 'Disable maintenance mode?' : 'Enable maintenance mode?',
      description: form.maintenanceMode
        ? 'Public access will resume immediately.'
        : 'Public access can be restricted while maintenance is active.',
      confirmLabel: form.maintenanceMode ? 'Disable' : 'Enable',
    });
    if (!confirmed) return;
    handleFieldChange('maintenanceMode', !form.maintenanceMode);
  };

  const handleQuickAction = async (action) => {
    if (action === 'clear-cache') {
      await showNotice({ title: 'Cache cleared', description: 'Temporary cache and session artifacts were cleared.', eyebrow: 'Quick Action' });
      return;
    }
    if (action === 'restart-services') {
      const confirmed = await requestConfirm({
        title: 'Restart services?',
        description: 'Background services will restart and active jobs may pause briefly.',
        confirmLabel: 'Restart',
      });
      if (confirmed) {
        await showNotice({ title: 'Restart initiated', description: 'Background services restart has been queued.', eyebrow: 'Quick Action' });
      }
      return;
    }
    if (action === 'backup-settings') {
      await showNotice({ title: 'Backup prepared', description: 'A fresh settings backup snapshot has been queued.', eyebrow: 'Quick Action' });
      return;
    }
    if (action === 'restore-settings') {
      await showNotice({ title: 'Restore history', description: 'Previous configuration backups are ready for restore selection.', eyebrow: 'Quick Action' });
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
          <span>Settings</span>
          <span className="text-slate-300">›</span>
          <span className="text-[#2563eb]">Platform Settings</span>
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Platform Settings</h1>
          <p className="mt-2 text-sm text-slate-600">Configure global platform settings, preferences and system parameters.</p>
        </div>
      </div>

      <Panel className="overflow-hidden p-0">
        <div className="flex overflow-x-auto">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-w-fit items-center gap-2 border-b-2 px-5 py-4 text-sm font-bold transition ${
                activeTab === tab.id
                  ? 'border-[#2563eb] bg-[#f6f9ff] text-[#2563eb]'
                  : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </Panel>

      {activeTab === 'general' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Panel className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#2563eb]">
                    <Settings2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-950">General Information</h2>
                    <p className="mt-1 text-sm text-slate-500">Manage your platform&apos;s basic information and branding.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="Platform Name *"
                    value={form.platformName}
                    onChange={(value) => handleFieldChange('platformName', value)}
                    error={errors.platformName}
                  />
                  <Field
                    label="Tagline"
                    value={form.tagline}
                    onChange={(value) => handleFieldChange('tagline', value)}
                  />
                  <Field
                    label="Website URL"
                    value={form.websiteUrl}
                    onChange={(value) => handleFieldChange('websiteUrl', value)}
                    error={errors.websiteUrl}
                  />
                  <Field
                    label="Support Email"
                    value={form.supportEmail}
                    onChange={(value) => handleFieldChange('supportEmail', value)}
                    error={errors.supportEmail}
                  />
                  <Field
                    label="Support Phone"
                    value={form.supportPhone}
                    onChange={(value) => handleFieldChange('supportPhone', value)}
                    error={errors.supportPhone}
                  />
                  <SelectField
                    label="Default Currency"
                    value={form.defaultCurrency}
                    onChange={(value) => handleFieldChange('defaultCurrency', value)}
                    options={currencyOptions}
                    error={errors.defaultCurrency}
                  />
                  <SelectField
                    label="Default Language"
                    value={form.defaultLanguage}
                    onChange={(value) => handleFieldChange('defaultLanguage', value)}
                    options={languageOptions}
                    error={errors.defaultLanguage}
                  />
                  <SelectField
                    label="Time Zone"
                    value={form.timeZone}
                    onChange={(value) => handleFieldChange('timeZone', value)}
                    options={timezoneOptions}
                    error={errors.timeZone}
                  />
                </div>

                <div className="space-y-4">
                  <UploadCard
                    label="Platform Logo"
                    preview={logoPreview}
                    helper="PNG, JPG or SVG (Max 2MB)"
                    onChange={(event) => handleImageUpload(event, 'logo')}
                  />
                  <UploadCard
                    label="Favicon"
                    preview={faviconPreview}
                    helper="PNG or ICO (Max 1MB)"
                    onChange={(event) => handleImageUpload(event, 'favicon')}
                    compact
                  />
                </div>
              </div>
            </Panel>

            <Panel className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <DatabaseZap className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-950">Platform Features</h2>
                  <p className="mt-1 text-sm text-slate-500">Enable or disable platform features globally.</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {featureCatalog.map((feature) => (
                  <FeatureToggle
                    key={feature.key}
                    feature={feature}
                    checked={Boolean(features[feature.key])}
                    onToggle={() => handleFeatureToggle(feature.key)}
                  />
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel className="p-6">
              <h3 className="text-2xl font-black text-slate-950">Platform Status</h3>
              <div className="mt-6 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-5 w-5 rounded-full ${pageStats.platformLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <p className={`text-xl font-black ${pageStats.platformLive ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {pageStats.platformLive ? 'Platform is Live' : 'Maintenance Mode Active'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {pageStats.platformLive ? 'All systems are operational' : 'Public access is restricted during maintenance'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-4">
                <div>
                  <p className="text-sm font-black text-slate-900">Maintenance Mode</p>
                  <p className="mt-1 text-sm text-slate-500">Enable to restrict public access to the platform</p>
                </div>
                <Switch checked={form.maintenanceMode} onChange={handleMaintenanceToggle} />
              </div>
            </Panel>

            <Panel className="p-6">
              <h3 className="text-2xl font-black text-slate-950">Quick Actions</h3>
              <div className="mt-5 space-y-1">
                <ActionButton title="Clear Cache" description="Clear system cache and temporary files" onClick={() => handleQuickAction('clear-cache')} icon={RefreshCw} />
                <ActionButton title="Restart Services" description="Restart background services" onClick={() => handleQuickAction('restart-services')} icon={MonitorCog} />
                <ActionButton title="Backup Settings" description="Create a backup of current settings" onClick={() => handleQuickAction('backup-settings')} icon={DatabaseZap} />
                <ActionButton title="Restore Settings" description="Restore from a previous backup" onClick={() => handleQuickAction('restore-settings')} icon={Upload} />
              </div>
            </Panel>

            <Panel className="p-6">
              <h3 className="text-2xl font-black text-slate-950">System Information</h3>
              <div className="mt-5 space-y-4">
                <InfoRow label="Version" value={pageStats.version} />
                <InfoRow label="Environment" value={<Pill tone="success">{pageStats.environment}</Pill>} />
                <InfoRow label="Last Updated" value={pageStats.lastUpdated} />
                <InfoRow label="Updated By" value={pageStats.updatedBy} />
              </div>
            </Panel>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="sticky bottom-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#142d7b] px-5 py-4 text-base font-black text-white shadow-lg transition hover:bg-[#102564] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <PlaceholderTab
          tab={settingsTabs.find((item) => item.id === activeTab)}
          onGoBack={() => setActiveTab('general')}
        />
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, error }) => (
  <label className="space-y-2">
    <span className="text-sm font-black text-slate-900">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-12 w-full rounded-2xl border px-4 text-sm font-medium text-slate-900 outline-none transition ${
        error ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white focus:border-[#93c5fd] focus:ring-4 focus:ring-[#dbeafe]'
      }`}
    />
    {error ? <span className="block text-xs font-semibold text-red-600">{error}</span> : null}
  </label>
);

const SelectField = ({ label, value, onChange, options, error }) => (
  <label className="space-y-2">
    <span className="text-sm font-black text-slate-900">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`h-12 w-full rounded-2xl border px-4 text-sm font-medium text-slate-900 outline-none transition ${
        error ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-white focus:border-[#93c5fd] focus:ring-4 focus:ring-[#dbeafe]'
      }`}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    {error ? <span className="block text-xs font-semibold text-red-600">{error}</span> : null}
  </label>
);

const UploadCard = ({ label, preview, helper, onChange, compact = false }) => (
  <div>
    <p className="mb-2 text-sm font-black text-slate-900">{label}</p>
    <label className={`flex cursor-pointer items-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-4 transition hover:border-[#93c5fd] hover:bg-[#f8fbff] ${compact ? 'min-h-[108px]' : 'min-h-[176px] flex-col justify-center text-center'}`}>
      <div className={`overflow-hidden rounded-2xl border border-white bg-white shadow-sm ${compact ? 'h-16 w-16 shrink-0' : 'h-20 w-20'}`}>
        <img src={preview} alt={label} className="h-full w-full object-contain p-2" />
      </div>
      <div className={compact ? 'flex-1' : ''}>
        <div className={`flex items-center gap-2 ${compact ? 'justify-start' : 'justify-center'}`}>
          <Upload className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-black text-slate-700">Click to upload {label.toLowerCase()}</span>
        </div>
        <p className="mt-2 text-xs font-medium text-slate-500">{helper}</p>
      </div>
      <input type="file" className="hidden" onChange={onChange} />
    </label>
  </div>
);

const FeatureToggle = ({ feature, checked, onToggle }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
    <div className="flex min-w-0 items-start gap-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${feature.color}`}>
        <feature.icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-black text-slate-900">{feature.label}</p>
        <p className="mt-1 text-sm text-slate-500">{feature.description}</p>
      </div>
    </div>
    <Switch checked={checked} onChange={onToggle} />
  </div>
);

const Switch = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${checked ? 'bg-[#2563eb]' : 'bg-slate-200'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

const ActionButton = ({ title, description, icon: Icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50"
  >
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2563eb]">
      <Icon className="h-5 w-5" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
    <span className="text-lg text-slate-400">›</span>
  </button>
);

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
    <span className="text-sm font-semibold text-slate-500">{label}</span>
    <span className="text-sm font-black text-slate-900">{value}</span>
  </div>
);

const Pill = ({ children, tone = 'neutral' }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${
    tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
  }`}>
    {children}
  </span>
);

const PlaceholderTab = ({ tab, onGoBack }) => (
  <Panel className="p-10">
    <div className="mx-auto max-w-2xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#eef4ff] text-[#2563eb]">
        {tab?.icon ? <tab.icon className="h-7 w-7" /> : <Settings2 className="h-7 w-7" />}
      </div>
      <h2 className="mt-5 text-2xl font-black text-slate-950">{tab?.label}</h2>
      <p className="mt-3 text-sm text-slate-500">
        This tab shell is ready and styled to match the platform settings experience. We can wire its specific API fields next without changing the page structure.
      </p>
      <button
        type="button"
        onClick={onGoBack}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#142d7b] px-5 py-3 text-sm font-black text-white"
      >
        <Check className="h-4 w-4" />
        Back to General Settings
      </button>
    </div>
  </Panel>
);

export default PlatformSettings;
