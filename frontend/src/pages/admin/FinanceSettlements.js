import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, FileText, PlayCircle, RefreshCcw, Search, TrendingUp, WalletCards, Download, Users, CalendarCheck, IndianRupee, ReceiptText, Hourglass, ShieldCheck, Wallet, Ban } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney, requestInput, requestReason, showNotice, Pagination } from './shared';
import { AdminAccountTransactionsTab } from '../AdminAccount';
import { openBrokerSettlementInvoice } from '../../utils/brokerSettlementInvoice';

const financeSteps = [
  ['Step 1', 'Finance Overview', 'completed'],
  ['Step 2', 'Host Settlement Management', 'completed'],
  ['Step 3', 'Refund & Cancellation Management', 'completed'],
  ['Step 4', 'Tax & Broker Commission', 'completed'],
  ['Step 5', 'Invoices, Reports & Finance Config', 'completed'],
];

const workspaceTabs = [
  ['overview', 'Finance Overview'],
  ['settlements', 'Host Settlements'],
  ['broker_employee_settlements', 'Broker & Employee Settlements'],
  ['refunds', 'Refunds & Cancellations'],
  ['tax_commission', 'Taxes'],
  ['commissions', 'Commissions'],
  ['transactions_ledger', 'Transactions'],
  ['reports_config', 'Invoices & Config'],
];

const paiseToMoney = (value) => formatMoney(Number(value || 0) / 100);
const formatRoundedMoney = (value) => formatMoney(Math.round(Number(value || 0)));
const paiseToRoundedMoney = (value) => formatRoundedMoney(Number(value || 0) / 100);
const entityName = (entity, fallback = 'NA') => entity?.full_name || entity?.name || entity?.user_id || entity?.uid || fallback;
const entityCode = (entity) => entity?.employee_code || entity?.lg_code || entity?.uid || entity?.user_id || 'NA';
const shortDate = (value) => (value ? String(value).slice(0, 10) : '-');
const chargeLineItems = (charges = {}) => [
  ['Platform fee', charges.platform_fee],
  ['Gateway charge', charges.gateway_charge],
  ['Convenience fee', charges.convenience_fee],
  ['Insurance fee', charges.insurance_fee],
  ['Cleaning fee', charges.cleaning_fee],
  ['Extra guest fee', charges.extra_guest_fee],
  ['Company charge', charges.company_charge],
  ['Customer GST', charges.customer_gst],
].filter(([, value]) => Number(value || 0) > 0);
const extraChargeLineItems = (charges = {}) => chargeLineItems(charges).filter(([label]) => label !== 'Customer GST');
const extraChargeTotal = (source = {}) => {
  const explicitTotal = Number(source.total_extra_charges_amount || 0);
  if (explicitTotal > 0) return explicitTotal;
  const charges = source.customer_charge_breakdown || source || {};
  return extraChargeLineItems(charges).reduce((total, [, value]) => total + Number(value || 0), 0);
};
const tdsBaseNote = (payout = {}) => (Number(payout.tds_base_amount || 0) > 0 ? 'Host actual value only' : 'No TDS base');
const rupeesToPaise = (value) => Math.round(Number(value || 0) * 100);
const firstPresent = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
const firstUseful = (...values) => values.find((value) => {
  if (value === undefined || value === null) return false;
  const text = String(value).trim();
  return text && !['NA', 'N/A', '-'].includes(text.toUpperCase());
});
const invoiceFinancialYearLabel = (value) => {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const year = safeDate.getFullYear();
  const startYear = safeDate.getMonth() + 1 >= 4 ? year : year - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
};
const bookingInvoiceSuffix = (...values) => {
  const value = firstUseful(...values);
  if (!value) return null;
  const compact = String(value).replace(/[^a-z0-9]/gi, '').toUpperCase();
  return compact ? compact.slice(-5) : null;
};
const customerTaxInvoiceNo = ({ invoiceCandidates = [], bookingIdCandidates = [], dateCandidates = [] } = {}) => {
  const cleanInvoices = invoiceCandidates.map((value) => firstUseful(value)).filter(Boolean).map((value) => String(value).trim());
  const explicitStrc = cleanInvoices.find((value) => value.toUpperCase().startsWith('STRC/'));
  if (explicitStrc) return explicitStrc;
  const suffix = bookingInvoiceSuffix(...bookingIdCandidates);
  if (suffix) return `STRC/${invoiceFinancialYearLabel(firstUseful(...dateCandidates))}/${suffix}`;
  const fallback = cleanInvoices[0];
  if (!fallback) return 'NA';
  return fallback.toUpperCase().startsWith('STRB/') ? `STRC/${fallback.split('/').slice(1).join('/')}` : fallback;
};
const containsText = (value, needle) => !needle || String(value || '').toLowerCase().includes(String(needle).trim().toLowerCase());
const compactKey = (value) => String(value || '').trim().toLowerCase();
const entityIdentity = (entity = {}) => [
  entity.user_id,
  entity.uid,
  entity.id,
  entity.employee_code,
  entity.lg_code,
  entity.full_name,
  entity.name,
].map(compactKey).filter(Boolean);
const isEmployeeLikeEntity = (entity = {}) => {
  const roleText = `${entity.role || ''} ${entity.admin_role_key || ''} ${entity.designation || ''} ${entity.user_type || ''}`.toLowerCase();
  const codeText = `${entity.employee_code || ''} ${entity.lg_code || ''} ${entity.uid || ''} ${entity.user_id || ''}`.toLowerCase();
  return roleText.includes('employee') || roleText.includes('rm') || roleText.includes('relationship') || codeText.includes('-emp');
};
const resolvePayoutBroker = (payout = {}) => {
  const broker = payout.broker || {};
  const employee = payout.employee || {};
  const brokerIds = entityIdentity(broker);
  if (!brokerIds.length) return null;
  const employeeIds = new Set(entityIdentity(employee));
  const sameAsEmployee = brokerIds.some((value) => employeeIds.has(value));
  if (sameAsEmployee || isEmployeeLikeEntity(broker)) return null;
  return broker;
};
const uniqueFilterOptions = (items, getOption) => {
  const byValue = new Map();
  (items || []).forEach((item) => {
    const option = getOption(item);
    const value = String(option?.value || '').trim();
    const label = String(option?.label || value).trim();
    if (!value || !label || ['NA', 'N/A', 'NA - NA'].includes(label.toUpperCase()) || byValue.has(value)) return;
    byValue.set(value, { value, label });
  });
  return Array.from(byValue.values()).sort((a, b) => a.label.localeCompare(b.label));
};
const FilterSelect = ({ label, value, onChange, options, placeholder }) => (
  <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
    {label}
    <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none">
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
);
const withinDateRange = (value, from, to) => {
  if (!from && !to) return true;
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  if (from) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    if (date < start) return false;
  }
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
};
const csvEscape = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const downloadCsvFile = (filename, headers, rows) => {
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
const partnerTdsRate = (tdsConfig, role) => {
  const roleConfig = (tdsConfig?.roles || []).find((item) => String(item.role || '').toLowerCase() === role);
  return Number(roleConfig?.rate_percent ?? roleConfig?.tds_rate_percent ?? tdsConfig?.default_rate_percent ?? 1);
};
const partnerTdsRule = (tdsConfig, role) => {
  const config = tdsConfig?.data || tdsConfig || {};
  const rules = config.configurations || config.roles || [];
  const rule = (rules || []).find((item) => String(item.role || '').toLowerCase() === role) || {};
  return {
    is_enabled: rule.is_enabled ?? rule.enabled ?? true,
    rate_percent: Number(rule.standard_rate ?? rule.rate_percent ?? rule.tds_rate_percent ?? config.default_rate_percent ?? 1),
    missing_pan_rate: Number(rule.missing_pan_rate ?? rule.missing_pan_rate_percent ?? rule.standard_rate ?? 1),
    thresholds: rule.thresholds || {},
    rounding_method: String(rule.rounding_method || 'NEAREST_RUPEE').toUpperCase(),
    effective_from: rule.effective_from || '',
    effective_to: rule.effective_to || '',
  };
};
const dateWithinRule = (value, rule) => {
  if (!value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  if (rule.effective_from) {
    const start = new Date(rule.effective_from);
    start.setHours(0, 0, 0, 0);
    if (!Number.isNaN(start.getTime()) && date < start) return false;
  }
  if (rule.effective_to) {
    const end = new Date(rule.effective_to);
    end.setHours(23, 59, 59, 999);
    if (!Number.isNaN(end.getTime()) && date > end) return false;
  }
  return true;
};
const roundTdsAmount = (value, method) => {
  if (method === 'TWO_DECIMAL') return Math.round(Number(value || 0));
  if (method === 'FLOOR') return Math.floor(Number(value || 0) / 100) * 100;
  if (method === 'CEIL') return Math.ceil(Number(value || 0) / 100) * 100;
  return Math.round(Number(value || 0) / 100) * 100;
};
const commissionRuleRate = (paymentConfig, role) => {
  const rules = paymentConfig?.commission_rules || {};
  const rule = rules[role] || (role === 'employee' ? (rules.rm || rules.relationship_manager || {}) : {});
  return rule.enabled ? Number(rule.value ?? rule.percent ?? 0) : 0;
};
const commissionRuleEnabled = (paymentConfig, role) => {
  const rules = paymentConfig?.commission_rules || {};
  const rule = rules[role] || (role === 'employee' ? (rules.rm || rules.relationship_manager || {}) : {});
  return Boolean(rule?.enabled);
};
const partnerCommissionFromPlatformFee = (platformFeePaise, ratePercent) => Math.round(Number(platformFeePaise || 0) * (Number(ratePercent || 0) / 100));
const toPaiseAmount = (value, referenceAmount = 0) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const reference = Number(referenceAmount || 0);
  const referencePaise = reference > 100000 ? reference : (reference > 0 ? rupeesToPaise(reference) : 0);
  const referenceRupees = referencePaise / 100;

  if (referenceRupees >= 500 && amount < 100) return rupeesToPaise(amount * 100);
  if (referencePaise && amount > referenceRupees * 2 && amount <= referencePaise * 2) return Math.round(amount);
  if (Math.abs(amount) >= 100000) return Math.round(amount);
  return rupeesToPaise(amount);
};
const moneyFromMixed = (value, referenceAmount = 0) => toPaiseAmount(value, referenceAmount);
const hasMappedValue = (value) => {
  const text = String(value || '').trim().toLowerCase();
  return Boolean(text && !['na', 'n/a', '-', 'null', 'undefined'].includes(text));
};
const configEnabled = (value, fallback = false) => {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const text = String(value ?? '').trim().toLowerCase();
  if (['true', 'enabled', 'active', 'yes', '1'].includes(text)) return true;
  if (['false', 'disabled', 'inactive', 'no', '0'].includes(text)) return false;
  return fallback;
};
const camelKey = (key = '') => key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
const getChargeRule = (paymentConfig = {}, key) => {
  const camel = camelKey(key);
  const charges = paymentConfig?.charges || {};
  return charges[key] || charges[camel] || paymentConfig?.[key] || paymentConfig?.[camel] || {};
};
const ruleValue = (rule = {}) => Number(firstPresent(rule.value, rule.amount, rule.rate, rule.percent, rule.percentage, 0) || 0);
const ruleType = (rule = {}, fallback = 'fixed') => String(firstPresent(rule.charge_type, rule.type, rule.mode, fallback) || fallback).toLowerCase();
const normalisePlatformContext = (context) => {
  const value = String(context || '').toLowerCase();
  if (value.includes('broker')) return 'broker_mapped';
  if (value.includes('branch') || value.includes('bm')) return 'branch_manager_mapped';
  if (value.includes('rm') || value.includes('employee')) return 'rm_mapped';
  return '';
};
const platformFeeRuleForContext = (paymentConfig = {}, context = '') => {
  const normalised = normalisePlatformContext(context);
  const aliases = normalised === 'broker_mapped'
    ? ['broker_mapped', 'brokerMapped', 'broker', 'broker_mapped_property', 'brokerMappedProperty', 'broker_mapped_property_value', 'brokerMappedPropertyValue', 'broker_platform_fee', 'brokerPlatformFee', 'broker_mapped_fee', 'brokerMappedFee', 'broker_mapped_property_fee', 'brokerMappedPropertyFee', 'broker_rate', 'brokerRate', 'broker_percentage', 'brokerPercentage', 'broker_mapped_rate', 'brokerMappedRate', 'broker_mapped_percentage', 'brokerMappedPercentage']
    : normalised === 'rm_mapped'
      ? ['rm_mapped', 'rmMapped', 'rm', 'employee', 'employee_mapped', 'employeeMapped', 'rm_mapped_property', 'rmMappedProperty', 'rm_mapped_property_value', 'rmMappedPropertyValue', 'rm_platform_fee', 'rmPlatformFee', 'rm_mapped_fee', 'rmMappedFee', 'employee_mapped_fee', 'employeeMappedFee', 'rm_rate', 'rmRate', 'employee_rate', 'employeeRate', 'rm_percentage', 'rmPercentage', 'employee_percentage', 'employeePercentage', 'rm_mapped_rate', 'rmMappedRate', 'rm_mapped_percentage', 'rmMappedPercentage']
      : [];
  const containers = [
    paymentConfig.platform_fee_overrides,
    paymentConfig.platformFeeOverrides,
    paymentConfig.platform_fee_rules,
    paymentConfig.platformFeeRules,
    paymentConfig.platform_fee?.rules,
    paymentConfig.platformFee?.rules,
    paymentConfig.platform_fee?.mapped_rules,
    paymentConfig.platformFee?.mappedRules,
    paymentConfig.charges?.platform_fee_overrides,
    paymentConfig.charges?.platformFeeOverrides,
    paymentConfig.charges?.platform_fee?.rules,
    paymentConfig.charges?.platformFee?.rules,
    paymentConfig.charges?.platform_fee?.mapped_rules,
    paymentConfig.charges?.platformFee?.mappedRules,
    paymentConfig.platform_fee,
    paymentConfig.platformFee,
    paymentConfig.charges?.platform_fee,
    paymentConfig.charges?.platformFee,
  ].filter(Boolean);

  for (const container of containers) {
    for (const alias of aliases) {
      const mappedRule = container?.[alias];
      if (mappedRule !== undefined && mappedRule !== null && mappedRule !== '') {
        return typeof mappedRule === 'object'
          ? mappedRule
          : { enabled: true, value: mappedRule, charge_type: 'percentage' };
      }
    }
  }

  if (normalised === 'broker_mapped') {
    return {
      enabled: firstPresent(paymentConfig.broker_mapped_enabled, paymentConfig.brokerMappedEnabled, paymentConfig.broker_mapped_property_enabled, paymentConfig.brokerMappedPropertyEnabled, paymentConfig.broker_platform_fee_enabled, paymentConfig.brokerPlatformFeeEnabled, paymentConfig.broker_mapped_fee_enabled, paymentConfig.brokerMappedFeeEnabled),
      value: firstPresent(paymentConfig.broker_mapped_value, paymentConfig.brokerMappedValue, paymentConfig.broker_mapped_property_value, paymentConfig.brokerMappedPropertyValue, paymentConfig.broker_platform_fee, paymentConfig.brokerPlatformFee, paymentConfig.broker_mapped_fee, paymentConfig.brokerMappedFee, paymentConfig.broker_mapped_rate, paymentConfig.brokerMappedRate, paymentConfig.broker_mapped_percentage, paymentConfig.brokerMappedPercentage, paymentConfig.broker_rate, paymentConfig.brokerRate, paymentConfig.broker_percentage, paymentConfig.brokerPercentage),
      charge_type: 'percentage',
    };
  }
  if (normalised === 'rm_mapped') {
    return {
      enabled: firstPresent(paymentConfig.rm_mapped_enabled, paymentConfig.rmMappedEnabled, paymentConfig.rm_mapped_property_enabled, paymentConfig.rmMappedPropertyEnabled, paymentConfig.employee_mapped_enabled, paymentConfig.employeeMappedEnabled, paymentConfig.rm_platform_fee_enabled, paymentConfig.rmPlatformFeeEnabled, paymentConfig.rm_mapped_fee_enabled, paymentConfig.rmMappedFeeEnabled, paymentConfig.employee_mapped_fee_enabled, paymentConfig.employeeMappedFeeEnabled),
      value: firstPresent(paymentConfig.rm_mapped_value, paymentConfig.rmMappedValue, paymentConfig.rm_mapped_property_value, paymentConfig.rmMappedPropertyValue, paymentConfig.employee_mapped_value, paymentConfig.employeeMappedValue, paymentConfig.rm_platform_fee, paymentConfig.rmPlatformFee, paymentConfig.rm_mapped_fee, paymentConfig.rmMappedFee, paymentConfig.employee_mapped_fee, paymentConfig.employeeMappedFee, paymentConfig.rm_mapped_rate, paymentConfig.rmMappedRate, paymentConfig.rm_mapped_percentage, paymentConfig.rmMappedPercentage, paymentConfig.rm_rate, paymentConfig.rmRate, paymentConfig.rm_percentage, paymentConfig.rmPercentage, paymentConfig.employee_rate, paymentConfig.employeeRate, paymentConfig.employee_percentage, paymentConfig.employeePercentage),
      charge_type: 'percentage',
    };
  }
  return {};
};
const inferPlatformContext = (txn = {}) => {
  const sources = [
    txn,
    txn.booking,
    txn.property,
    txn.transaction,
    txn.booking?.property,
    txn.transaction?.property,
    txn.payout,
    txn.refund,
  ].filter(Boolean);
  const roleKeys = [
    'platform_fee_context', 'platformFeeContext', 'platform_context', 'platformContext',
    'first_verification_role', 'firstVerificationRole', 'primary_verification_role', 'primaryVerificationRole',
    'verification_role', 'verificationRole', 'mapped_role', 'mappedRole',
    'mapping_role', 'mappingRole', 'assignment_role', 'assignmentRole',
    'commission_role', 'commissionRole', 'platform_fee_role', 'platformFeeRole',
    'first_approval_role', 'firstApprovalRole', 'verification_owner_role', 'verificationOwnerRole',
  ];
  for (const source of sources) {
    for (const key of roleKeys) {
      const explicit = normalisePlatformContext(source?.[key]);
      if (explicit) return explicit;
    }
  }

  const hasAnyMappedValue = (objects, keys) => objects
    .filter(Boolean)
    .some((source) => keys.some((key) => hasMappedValue(source?.[key])));

  const brokerObjects = [
    txn.broker,
    txn.booking?.broker,
    txn.property?.broker,
    txn.transaction?.broker,
    txn.managed_broker,
    txn.booking?.managed_broker,
    txn.property?.managed_broker,
  ];
  const brokerKeys = [
    'broker_id', 'broker_code', 'broker_lg_code', 'broker_name', 'broker_user_id',
    'broker_employee_code', 'managed_by_broker_id', 'managedByBrokerId',
    'mapped_broker_id', 'assigned_broker_id', 'first_broker_id',
    'brokerCode', 'brokerName', 'brokerLgCode', 'managed_broker_code',
    'managedByBrokerCode', 'lg_code',
  ];
  const entityKeys = ['user_id', 'uid', 'id', 'code', 'employee_code', 'employeeCode', 'broker_code', 'brokerCode', 'lg_code', 'lgCode', 'full_name', 'name', 'display_name', 'displayName'];
  if (hasAnyMappedValue(sources, brokerKeys) || hasAnyMappedValue(brokerObjects, entityKeys)) return 'broker_mapped';

  const rmObjects = [
    txn.employee,
    txn.rm,
    txn.booking?.employee,
    txn.booking?.rm,
    txn.property?.employee,
    txn.property?.rm,
    txn.transaction?.employee,
    txn.transaction?.rm,
  ];
  const rmKeys = [
    'rm_id', 'rm_code', 'rm_name', 'employee_id', 'employee_code', 'employee_name',
    'employee_user_id', 'mapped_rm_id', 'assigned_rm_id', 'first_rm_id',
    'relationship_manager_id', 'relationship_manager_code', 'relationship_manager_name',
    'rm_employee_code', 'employee_rm_code', 'rm_employee_name', 'employee_rm_name',
    'rm_lg_code', 'rm_user_id', 'mapped_employee_id', 'assigned_employee_id',
    'rmCode', 'rmName', 'employeeCode', 'employeeName', 'relationshipManagerId',
    'relationshipManagerCode', 'relationshipManagerName',
  ];
  return (hasAnyMappedValue(sources, rmKeys) || hasAnyMappedValue(rmObjects, entityKeys)) ? 'rm_mapped' : '';
};
const configuredChargePaise = (paymentConfig = {}, key, basePaise = 0) => {
  const rule = getChargeRule(paymentConfig, key);
  if (!configEnabled(firstPresent(rule.enabled, rule.is_enabled, rule.active, rule.status), false)) return 0;
  const value = ruleValue(rule);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const normalisedBasePaise = toPaiseAmount(basePaise);
  const type = ruleType(rule);
  if (type.includes('percent')) return Math.round(Number(normalisedBasePaise || 0) * (value / 100));
  return rupeesToPaise(value);
};
const platformRulePaiseForContext = (paymentConfig = {}, context = '', basePaise = 0) => {
  const platformRule = platformFeeRuleForContext(paymentConfig, context);
  const value = ruleValue(platformRule);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!configEnabled(firstPresent(platformRule.enabled, platformRule.is_enabled, platformRule.active, platformRule.status), true)) return 0;
  const normalisedBasePaise = toPaiseAmount(basePaise);
  const platformType = ruleType(platformRule, 'percentage');
  if (platformType.includes('percent')) return Math.round(Number(normalisedBasePaise || 0) * (value / 100));
  return rupeesToPaise(value);
};
const platformFeePaiseFromTransaction = (txn = {}, basePaise = 0, paymentConfig = {}) => {
  for (const candidate of chargeSources(txn)) {
    const explicit = firstPresent(
      candidate?.platform_fee,
      candidate?.platform_fee_amount,
      candidate?.platform_charge,
      candidate?.platform_charge_amount,
      candidate?.platformFee,
      candidate?.platformFeeAmount,
      candidate?.platformCharge,
      candidate?.platformChargeAmount
    );
    const explicitPaise = moneyFromMixed(explicit, basePaise);
    if (explicitPaise > 0) return explicitPaise;
  }

  const context = platformFeeContextFromTransaction(txn);
  return platformRulePaiseForContext(paymentConfig, context, basePaise);
};
const explicitPlatformFeePaiseFromTransaction = (txn = {}, basePaise = 0) => {
  for (const candidate of chargeSources(txn)) {
    const explicit = firstPresent(
      candidate?.platform_fee,
      candidate?.platform_fee_amount,
      candidate?.platform_charge,
      candidate?.platform_charge_amount,
      candidate?.platformFee,
      candidate?.platformFeeAmount,
      candidate?.platformCharge,
      candidate?.platformChargeAmount
    );
    const explicitPaise = moneyFromMixed(explicit, basePaise);
    if (explicitPaise > 0) return explicitPaise;
  }
  return 0;
};
const partnerPlatformFeePaise = (txn = {}, basePaise = 0, paymentConfig = {}, context = '') => {
  return platformRulePaiseForContext(paymentConfig, context, basePaise)
    || explicitPlatformFeePaiseFromTransaction(txn, basePaise);
};
const hostSettlementChargeColumns = [
  ['platform_fee', 'Platform Fee'],
  ['payment_gateway_charge', 'Payment Gateway Charge'],
  ['convenience_fee', 'Convenience Fee'],
  ['insurance_fee', 'Insurance Fee'],
  ['cleaning_fee', 'Cleaning Fee'],
  ['extra_guest_fee', 'Extra Guest Fee'],
];
const firstPositiveNumber = (...values) => {
  for (const value of values) {
    const amount = Number(value || 0);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return 0;
};
const chargeToRupees = (value, referenceAmount = 0) => {
  return toPaiseAmount(value, referenceAmount) / 100;
};
const chargeSources = (source = {}) => [
  source.customer_charge_breakdown,
  source.customerChargeBreakdown,
  source.charge_breakdown,
  source.chargeBreakdown,
  source.extra_charges,
  source.extraCharges,
  source.customer_charges,
  source.customerCharges,
  source.charges,
  source.fees,
  source.pricing,
  source.payment_breakdown,
  source.paymentBreakdown,
  source.price_summary,
  source.priceSummary,
  source.booking?.customer_charge_breakdown,
  source.booking?.customerChargeBreakdown,
  source.booking?.charge_breakdown,
  source.booking?.chargeBreakdown,
  source.booking?.extra_charges,
  source.booking?.extraCharges,
  source.booking?.customer_charges,
  source.booking?.customerCharges,
  source.booking?.charges,
  source.booking?.fees,
  source.booking?.pricing,
  source.booking?.payment_breakdown,
  source.booking?.paymentBreakdown,
  source.booking?.price_summary,
  source.booking?.priceSummary,
  source.transaction?.customer_charge_breakdown,
  source.transaction?.customerChargeBreakdown,
  source.transaction?.charge_breakdown,
  source.transaction?.chargeBreakdown,
  source.transaction?.extra_charges,
  source.transaction?.extraCharges,
  source.transaction?.customer_charges,
  source.transaction?.customerCharges,
  source.transaction?.charges,
  source.transaction?.fees,
  source.transaction?.pricing,
  source.transaction?.payment_breakdown,
  source.transaction?.paymentBreakdown,
  source.transaction?.price_summary,
  source.transaction?.priceSummary,
  source.property?.customer_charge_breakdown,
  source.property?.charge_breakdown,
  source.property?.extra_charges,
  source.property?.charges,
  source.property?.fees,
  source.booking,
  source.transaction,
  source.property,
  source.booking?.property,
  source.transaction?.property,
  source,
].filter(Boolean);
const firstChargeRupees = (source, keys, referenceAmount = 0) => {
  for (const candidate of chargeSources(source)) {
    const amount = firstPositiveNumber(...keys.map((key) => candidate?.[key]));
    if (amount > 0) return chargeToRupees(amount, referenceAmount);
  }
  return 0;
};
const settlementChargeBreakdown = (payout = {}, paymentConfig = {}) => {
  const basePaise = toPaiseAmount(firstPresent(payout.gross_amount, payout.tds_base_amount, payout.booking?.host_base_amount, payout.booking?.base_amount, 0));
  const explicitPlatform = firstChargeRupees(payout, ['platform_fee', 'platform_charge', 'platform_fee_amount', 'platform_charge_amount', 'platformFee', 'platformFeeAmount', 'platformCharge', 'platformChargeAmount'], basePaise);
  return {
    platform_fee: explicitPlatform || (platformFeePaiseFromTransaction(payout, basePaise, paymentConfig) / 100),
    payment_gateway_charge: firstChargeRupees(payout, ['payment_gateway_charge', 'payment_gateway_fee', 'gateway_charge', 'gateway_fee', 'paymentGatewayCharge', 'paymentGatewayFee', 'gatewayCharge', 'gatewayFee'], basePaise) || (configuredChargePaise(paymentConfig, 'payment_gateway_charge', basePaise) / 100),
    convenience_fee: firstChargeRupees(payout, ['convenience_fee', 'convenience_charge', 'convenienceFee', 'convenienceCharge'], basePaise) || (configuredChargePaise(paymentConfig, 'convenience_fee', basePaise) / 100),
    insurance_fee: firstChargeRupees(payout, ['insurance_fee', 'insurance_charge', 'insuranceFee', 'insuranceCharge', 'protection_fee', 'protectionFee'], basePaise) || (configuredChargePaise(paymentConfig, 'insurance_fee', basePaise) / 100),
    cleaning_fee: firstChargeRupees(payout, ['cleaning_fee', 'cleaning_charge', 'cleaningFee', 'cleaningCharge'], basePaise) || (configuredChargePaise(paymentConfig, 'cleaning_fee', basePaise) / 100),
    extra_guest_fee: firstChargeRupees(payout, ['extra_guest_fee', 'extra_guest_charge', 'extra_person_fee', 'extra_person_charge', 'extraGuestFee', 'extraGuestCharge', 'extraPersonFee', 'extraPersonCharge'], basePaise) || (configuredChargePaise(paymentConfig, 'extra_guest_fee', basePaise) / 100),
  };
};
const settlementChargeBreakdownTotal = (payout = {}, paymentConfig = {}) =>
  Object.values(settlementChargeBreakdown(payout, paymentConfig)).reduce((total, value) => total + Number(value || 0), 0);
const chargeDisplay = (value) => (Number(value || 0) > 0 ? formatRoundedMoney(value) : 'NA');
const platformFeeContextFromTransaction = (txn = {}) => {
  for (const candidate of chargeSources(txn)) {
    const explicit = normalisePlatformContext(firstPresent(
      candidate?.platform_fee_context,
      candidate?.platformFeeContext,
      candidate?.platform_context,
      candidate?.platformContext,
      candidate?.mapping_type,
      candidate?.mappingType,
      candidate?.partner_type,
      candidate?.partnerType,
      candidate?.first_verification_role,
      candidate?.firstVerificationRole,
      candidate?.primary_verification_role,
      candidate?.primaryVerificationRole
    ));
    if (explicit) return explicit;
  }
  return inferPlatformContext(txn);
};
const gstSplitFromAmount = (amountPaise, stateText = '') => {
  const amount = Number(amountPaise || 0);
  if (amount <= 0) return { cgst: 0, sgst: 0, igst: 0, total: 0 };
  const sameState = !stateText || String(stateText).toLowerCase().includes('maharashtra');
  const gst = Math.round(amount * 0.18);
  if (!sameState) return { cgst: 0, sgst: 0, igst: gst, total: gst };
  return { cgst: Math.round(gst / 2), sgst: gst - Math.round(gst / 2), igst: 0, total: gst };
};
const settleStatus = (status) => {
  const value = String(status || '').toLowerCase();
  if (['paid', 'processed', 'settled'].includes(value)) return 'paid';
  if (['approved', 'processing'].includes(value)) return 'approved';
  if (value === 'rejected') return 'rejected';
  return 'pending';
};

const FinanceSettlements = () => {
  const [state, setState] = useState({ loading: true, error: '', overview: null, transactions: [], payouts: [], refunds: [], autoStatus: null, taxCommission: null, paymentConfig: null, tdsConfig: null });
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('overview');
  const [payoutStatus, setPayoutStatus] = useState('');
  const [refundStatus, setRefundStatus] = useState('');
  const [busy, setBusy] = useState('');
  const [policyPreview, setPolicyPreview] = useState(null);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const transactionLimit = ['broker_employee_settlements', 'transactions_ledger'].includes(active) ? 300 : 8;
      const [overview, transactions, payouts, refunds, autoStatus, taxCommission, paymentConfig, tdsConfig] = await Promise.all([
        adminPhase1API.financeOverview(),
        adminPhase1API.financeTransactions({ q: search, limit: transactionLimit }),
        adminPhase1API.financePayouts({ status: payoutStatus, limit: active === 'settlements' ? 100 : 8 }),
        adminPhase1API.financeRefunds({ status: refundStatus, limit: active === 'refunds' ? 100 : 8 }),
        adminPhase1API.financePayoutAutoStatus(),
        adminPhase1API.financeTaxCommission(),
        adminPhase1API.paymentConfig(),
        adminPhase1API.tdsConfig(),
      ]);
      setState({
        loading: false,
        error: '',
        overview: overview.data,
        transactions: transactions.data.transactions || [],
        payouts: payouts.data.payouts || [],
        refunds: refunds.data.refunds || [],
        autoStatus: autoStatus.data,
        taxCommission: taxCommission.data.data,
        paymentConfig: paymentConfig.data,
        tdsConfig: tdsConfig.data,
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.response?.data?.detail || 'Failed to load finance overview' }));
    }
  }, [active, payoutStatus, refundStatus, search]);

  useEffect(() => { load(); }, [load]);

  const cards = useMemo(() => {
    const revenue = state.overview?.revenue || {};
    const pending = state.overview?.pending_payouts || {};
    return [
      ['Gross Booking Value', paiseToMoney(revenue.booking_payments_paise), TrendingUp, 'Booking payments collected'],
      ['Platform Revenue', paiseToMoney(revenue.platform_take_paise), CreditCard, 'Estimated platform take'],
      ['Pending Payout', paiseToMoney(pending.amount_paise), WalletCards, `${pending.count || 0} host payouts pending`],
      ['Refund Amount', paiseToMoney(revenue.refunds_paise), RefreshCcw, `${state.overview?.counts?.refunds || 0} refunds issued`],
      ['Tax Liability', paiseToMoney(revenue.total_tax_paise), FileText, 'Estimated tax reserve'],
    ];
  }, [state.overview]);

  const settlementTotals = useMemo(() => {
    const sum = (fn) => (state.payouts || []).reduce((total, item) => total + Number(fn(item) || 0), 0);
    const hostMap = new Map();
    (state.payouts || []).forEach((payout) => {
      const key = payout.host_id || 'unknown';
      const row = hostMap.get(key) || { host_id: key, host: payout.host || {}, count: 0, net_amount: 0, gross_amount: 0, tds_amount: 0, tds_fy_gross_after: 0, failed: 0 };
      row.count += 1;
      row.net_amount += Number(payout.net_amount || 0);
      row.gross_amount += Number(payout.gross_amount || 0);
      row.tds_amount += Number(payout.tds_amount || 0);
      row.tds_fy_gross_after = Math.max(row.tds_fy_gross_after, Number(payout.tds_fy_gross_after || 0));
      if (payout.status === 'failed' || payout.status === 'needs_destination') row.failed += 1;
      hostMap.set(key, row);
    });
    return {
      gross: sum((item) => item.gross_amount),
      extraCharges: sum((item) => extraChargeTotal(item)),
      tds: sum((item) => item.tds_amount),
      net: sum((item) => item.net_amount),
      hosts: Array.from(hostMap.values()),
    };
  }, [state.payouts]);

  const runPayoutAction = async (action, label) => {
    try {
      setBusy(label);
      if (action === 'sweep') await adminPhase1API.sweepFinancePayoutEligibility();
      if (action === 'processEligible') await adminPhase1API.processEligibleFinancePayouts();
      if (action === 'runAuto') await adminPhase1API.runAutoFinancePayouts();
      await load();
    } catch (error) {
      await showNotice({ title: 'Payout Action Failed', description: error.response?.data?.detail || 'Payout action failed', eyebrow: 'Action Failed' });
    } finally {
      setBusy('');
    }
  };

  const processOne = async (payout) => {
    try {
      setBusy(payout.payout_id);
      await adminPhase1API.processFinancePayout(payout.payout_id, { notes: 'Processed from Central Admin finance settlement workspace' });
      await load();
    } catch (error) {
      await showNotice({ title: 'Payout Failed', description: error.response?.data?.detail || 'Failed to process payout', eyebrow: 'Action Failed' });
    } finally {
      setBusy('');
    }
  };

  const initiateRefund = async () => {
    const bookingId = await requestInput({
      title: 'Initiate Refund',
      description: 'Enter the booking ID for the refund request.',
      label: 'Booking ID',
      placeholder: 'e.g. BKD63900D1B44C49',
      confirmLabel: 'Continue',
    });
    if (!bookingId) return;
    const reason = await requestReason({ title: 'Refund Reason', description: `Initiating refund for booking ${bookingId}.`, placeholder: 'Add refund reason.', minLength: 3 });
    if (!reason) return;
    const overridePercentRaw = await requestInput({
      title: 'Override Percentage',
      description: 'Leave blank to use the default refund policy.',
      label: 'Override Percent',
      placeholder: 'e.g. 35',
      confirmLabel: 'Continue',
      inputType: 'number',
      allowEmpty: true,
    });
    if (overridePercentRaw === null) return;
    const overrideAmountRaw = !String(overridePercentRaw || '').trim() ? await requestInput({
      title: 'Override Amount',
      description: 'Optional fixed refund amount in INR. Leave blank to use policy.',
      label: 'Override Amount (INR)',
      placeholder: 'e.g. 2500',
      confirmLabel: 'Continue',
      inputType: 'number',
      allowEmpty: true,
    }) : '';
    if (overrideAmountRaw === null) return;
    const payload = { reason };
    if (overridePercentRaw) payload.override_percent = Number(overridePercentRaw);
    if (overrideAmountRaw) payload.override_amount = Math.round(Number(overrideAmountRaw) * 100);
    try {
      setBusy('refund');
      await adminPhase1API.initiateFinanceRefund(bookingId, payload);
      await load();
    } catch (error) {
      await showNotice({ title: 'Refund Request Failed', description: error.response?.data?.detail || 'Failed to create refund request', eyebrow: 'Action Failed' });
    } finally {
      setBusy('');
    }
  };

  const approveRefund = async (refund) => {
    if (!refund?.refund_id) return;
    const confirmed = window.confirm(`Approve and process refund ${refund.refund_id}?`);
    if (!confirmed) return;
    try {
      setBusy(`approve-refund-${refund.refund_id}`);
      await adminPhase1API.approveFinanceRefund(refund.refund_id, {
        reason: 'Approved from Finance Refund Queue',
      });
      await load();
    } catch (error) {
      await showNotice({ title: 'Refund Approval Failed', description: error.response?.data?.detail || 'Failed to approve refund', eyebrow: 'Action Failed' });
    } finally {
      setBusy('');
    }
  };

  const rejectRefund = async (refund) => {
    if (!refund?.refund_id) return;
    const reason = await requestReason({
      title: 'Reject Refund',
      description: `Reject refund request ${refund.refund_id}.`,
      placeholder: 'Add rejection reason.',
      minLength: 3,
    });
    if (!reason) return;
    try {
      setBusy(`reject-refund-${refund.refund_id}`);
      await adminPhase1API.rejectFinanceRefund(refund.refund_id, { reason });
      await load();
    } catch (error) {
      await showNotice({ title: 'Refund Rejection Failed', description: error.response?.data?.detail || 'Failed to reject refund', eyebrow: 'Action Failed' });
    } finally {
      setBusy('');
    }
  };

  const previewRefundPolicy = async () => {
    const check_in_date = await requestInput({
      title: 'Refund Policy Preview',
      description: 'Enter the check-in date to preview refund policy.',
      label: 'Check-in Date',
      placeholder: 'YYYY-MM-DD',
      confirmLabel: 'Continue',
    });
    if (!check_in_date) return;
    const totalAmount = await requestInput({
      title: 'Refund Policy Preview',
      description: 'Enter the total booking amount in INR.',
      label: 'Total Amount (INR)',
      placeholder: 'e.g. 18500',
      confirmLabel: 'Preview Policy',
      inputType: 'number',
    });
    if (!totalAmount) return;
    try {
      const res = await adminPhase1API.financeRefundPolicyPreview({ check_in_date, total_amount: totalAmount });
      setPolicyPreview(res.data);
    } catch (error) {
      await showNotice({ title: 'Preview Failed', description: error.response?.data?.detail || 'Failed to preview refund policy', eyebrow: 'Action Failed' });
    }
  };

  const exportTransactions = async () => {
    let headers = [];
    let rows = [];
    let filename = `finance_${active}_${new Date().toISOString().slice(0, 10)}.csv`;

    const escapeCsv = (val) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    if (active === 'settlements') {
      headers = ['Payout ID', 'Host ID', 'Host Name', 'Property ID', 'Booking ID', 'Gross Amount', 'TDS Amount', 'Net Amount', 'Status', 'Payout Ref', 'Created At'];
      rows = state.payouts.map(p => [
        p.payout_id || '',
        p.host_id || '',
        p.host?.full_name || '',
        p.property_id || '',
        p.booking_id || '',
        p.gross_amount || 0,
        p.tds_amount || 0,
        p.net_amount || 0,
        p.status || '',
        p.payout_reference || '',
        p.created_at || '',
      ]);
    } else if (active === 'refunds') {
      headers = ['Refund ID', 'Booking ID', 'Refund Amount', 'Policy Tier', 'Refund %', 'Reason', 'Transaction ID', 'Status'];
      rows = state.refunds.map(r => [
        r.refund_id || '',
        r.booking_id || '',
        r.refund_amount || 0,
        r.policy_tier || '',
        r.refund_percent || 0,
        r.reason || '',
        r.razorpay_refund_id || r.razorpay_payment_id || '',
        r.status || '',
      ]);
    } else if (active === 'tax_commission') {
      headers = ['Tax ID', 'Type', 'Taxable Amount', 'Rate', 'Tax Amount', 'Status'];
      rows = (state.taxCommission?.tax_ledger || []).map(r => [
        r.tax_id || '',
        r.tax_type || '',
        r.taxable_amount || 0,
        r.tax_rate || 0,
        r.tax_amount || 0,
        r.status || '',
      ]);
    } else if (active === 'broker_employee_settlements') {
      const partnerRows = buildPartnerSettlementRows(state.taxCommission, state.transactions, state.tdsConfig, state.paymentConfig);
      headers = ['Settlement ID', 'Role', 'Name', 'Code', 'Booking ID', 'Property ID', 'Property Name', 'Platform Fee', 'Commission %', 'Commission Amount', 'CGST', 'SGST', 'IGST', 'TDS Rate', 'TDS Amount', 'Net Payable', 'Status'];
      rows = partnerRows.map(r => [
        r.settlement_id,
        r.role_label,
        r.name,
        r.code,
        r.booking_id,
        r.property_id,
        r.property_name,
        r.platform_fee_amount,
        r.commission_percent,
        r.commission_amount,
        r.commission_cgst,
        r.commission_sgst,
        r.commission_igst,
        r.tds_rate_percent,
        r.tds_amount,
        r.net_amount,
        r.status,
      ]);
    } else if (active === 'commissions') {
      headers = ['Commission ID', 'Broker Name', 'Broker ID', 'Booking ID', 'Property ID', 'Booking Amount', 'Rate %', 'Commission Amount', 'Payment Ref', 'Status'];
      rows = (state.taxCommission?.commissions || []).map(r => [
        r.commission_id || '',
        r.broker?.full_name || '',
        r.broker_id || '',
        r.booking_id || '',
        r.property_id || '',
        r.booking_amount || 0,
        r.commission_percentage || 0,
        r.commission_amount || 0,
        r.payment_reference || '',
        r.status || '',
      ]);
    } else {
      try {
        const res = await adminPhase1API.exportFinanceTransactions({ q: search });
        const blob = new Blob([res.data], { type: 'text/csv' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `xspace360-finance-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(href);
      } catch (error) {
        await showNotice({ title: 'Export Failed', description: error.response?.data?.detail || 'Failed to export finance report', eyebrow: 'Action Failed' });
      }
      return;
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

  const shareInvoice = async (transaction) => {
    const channel = await requestInput({
      title: 'Share Invoice',
      description: 'Choose invoice delivery channel.',
      label: 'Channel',
      defaultValue: 'email',
      placeholder: 'email or whatsapp',
      confirmLabel: 'Share Invoice',
    });
    if (!channel) return;
    try {
      await adminPhase1API.shareFinanceInvoice(transaction.transaction_id, channel);
      await showNotice({ title: 'Invoice Shared', description: 'Invoice share request completed successfully.', eyebrow: 'Completed' });
    } catch (error) {
      await showNotice({ title: 'Share Failed', description: error.response?.data?.detail || 'Failed to share invoice', eyebrow: 'Action Failed' });
    }
  };

  const savePaymentConfig = async () => {
    const current = state.paymentConfig || {};
    const platform_fee_percent = await requestInput({
      title: 'Platform Fee Configuration',
      description: 'Update the platform fee percentage.',
      label: 'Platform Fee Percent',
      defaultValue: String(current.platform_fee_percent ?? 10),
      inputType: 'number',
      confirmLabel: 'Continue',
    });
    if (platform_fee_percent === null) return;
    const platform_fee_label = await requestInput({
      title: 'Platform Fee Configuration',
      description: 'Update the label shown for platform fee.',
      label: 'Platform Fee Label',
      defaultValue: current.platform_fee_label || 'Premium Service Fee',
      confirmLabel: 'Save Configuration',
    });
    if (platform_fee_label === null) return;
    try {
      await adminPhase1API.updatePaymentConfig({ platform_fee_percent: Number(platform_fee_percent), platform_fee_label });
      await load();
    } catch (error) {
      await showNotice({ title: 'Config Save Failed', description: error.response?.data?.detail || 'Failed to update payment config', eyebrow: 'Action Failed' });
    }
  };

  return (
    <div>
      <PageHeader
        title="Finance & Settlements"
        description="Central finance overview for revenue, host settlements, refunds, tax liability, broker commission and invoice operations."
        action={
          <button onClick={exportTransactions} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(5,150,105,0.22)] transition hover:bg-emerald-700">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {workspaceTabs.map(([id, label]) => <button key={id} onClick={() => setActive(id)} className={`whitespace-nowrap rounded-2xl px-4 py-2.5 text-sm font-bold transition ${active === id ? 'bg-[#e8f0ff] text-[#2f6df6] shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'}`}>{label}</button>)}
        </div>
        {active !== 'overview' && <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-inner">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 w-full bg-transparent text-sm font-medium outline-none" placeholder="Search transaction, booking, host, property or payment reference" />
        </div>}
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="space-y-5">
          {!['refunds', 'broker_employee_settlements'].includes(active) && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {cards.map(([label, value, Icon, sub]) => (
                <Panel key={label} className="p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#2f6df6]"><Icon className="h-5 w-5" /></div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <p className="mt-2 text-[18px] font-black text-slate-950 md:text-[20px]">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{sub}</p>
                </Panel>
              ))}
            </div>
          )}
          {active === 'overview' ? <div className="space-y-4">
            <AdminAccountTransactionsTab hideFilters limit={5} />
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel className="p-4">
                <h2 className="font-black">Phase 3 Steps</h2>
                <div className="mt-3 space-y-2">
                  {financeSteps.map(([step, label, status]) => <div key={step} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span><b>{step}</b> {label}</span><StatusBadge value={status} /></div>)}
                </div>
              </Panel>
              <Panel className="p-4">
                <h2 className="font-black">Payout Engine</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  <Info label="Auto Payout" value={state.autoStatus?.auto_payout_enabled ? 'Enabled' : 'Disabled'} />
                  <Info label="Eligible" value={state.autoStatus?.pending_eligible || 0} />
                  <Info label="Processing" value={state.autoStatus?.processing || 0} />
                  <Info label="Failed" value={state.autoStatus?.failed || 0} />
                  <Info label="Mode" value={state.autoStatus?.payouts_are_mock ? 'Mock' : 'Live'} />
                </div>
              </Panel>
            </div>
          </div> : active === 'settlements' ? <SettlementWorkspace payouts={state.payouts} totals={settlementTotals} payoutStatus={payoutStatus} setPayoutStatus={setPayoutStatus} autoStatus={state.autoStatus} busy={busy} onProcess={processOne} onAction={runPayoutAction} paymentConfig={state.paymentConfig} /> : active === 'broker_employee_settlements' ? <BrokerEmployeeSettlementWorkspace data={state.taxCommission} transactions={state.transactions} tdsConfig={state.tdsConfig} paymentConfig={state.paymentConfig} /> : active === 'refunds' ? <RefundWorkspace refunds={state.refunds} refundStatus={refundStatus} setRefundStatus={setRefundStatus} busy={busy} onInitiate={initiateRefund} onPreview={previewRefundPolicy} policyPreview={policyPreview} onApproveRefund={approveRefund} onRejectRefund={rejectRefund} paymentConfig={state.paymentConfig} /> : active === 'tax_commission' ? <TaxesWorkspace data={state.taxCommission} /> : active === 'commissions' ? <CommissionWorkspace data={state.taxCommission} payouts={state.payouts} busy={busy} onProcessHost={processOne} /> : active === 'transactions_ledger' ? <AdminAccountTransactionsTab /> : <ReportsConfigWorkspace transactions={state.transactions} paymentConfig={state.paymentConfig} autoStatus={state.autoStatus} onExport={exportTransactions} onShare={shareInvoice} onSavePaymentConfig={savePaymentConfig} />}
          {!['transactions_ledger', 'settlements', 'broker_employee_settlements'].includes(active) && (
            <div className="grid gap-4 lg:grid-cols-2">
              <QueuePanel title="Payout Queue" rows={state.payouts} idKey="payout_id" amountKey="net_amount" />
              <QueuePanel title="Refund Queue" rows={state.refunds} idKey="refund_id" amountKey="refund_amount" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Info = ({ label, value }) => <p className="flex justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5"><span className="font-bold text-slate-500">{label}</span><span className="font-black text-slate-950">{value}</span></p>;

const statusAmountBucket = (status) => {
  if (['approved', 'processing'].includes(status)) return 'approved_amount';
  if (['processed', 'paid', 'success', 'completed'].includes(status)) return 'paid_amount';
  if (['cancelled', 'rejected'].includes(status)) return 'failed_amount';
  return 'pending_amount';
};

const buildHostSummaryRows = (payouts = [], paymentConfig = {}) => {
  const grouped = new Map();
  payouts.forEach((payout) => {
    const id = payout.host_id || payout.host?.user_id || payout.host?.uid || payout.host?.email || payout.host?.phone;
    if (!id) return;
    if (!grouped.has(id)) {
      grouped.set(id, {
        id,
        name: payout.host?.full_name || payout.host?.name || id,
        code: payout.host?.host_code || payout.host?.employee_code || payout.host?.uid || id,
        rows_count: 0,
        bookings: new Set(),
        properties: new Set(),
        gross_amount: 0,
        extra_charges: 0,
        tds_amount: 0,
        net_amount: 0,
        pending_amount: 0,
        approved_amount: 0,
        paid_amount: 0,
        failed_amount: 0,
        latest_at: '',
        destination_type: payout.destination_type || '',
        destination_ref: payout.destination_ref || '',
        decision_status: payout.settlement_decision_status || '',
      });
    }
    const row = grouped.get(id);
    const dateValue = payout.settlement_due_at || payout.eligible_at || payout.created_at || '';
    const net = Number(payout.net_amount || 0);
    const status = settleStatus(payout.status);
    row.rows_count += 1;
    row.bookings.add(payout.booking_id || payout.booking?.booking_id || `row-${row.rows_count}`);
    row.properties.add(payout.property_id || payout.property?.property_id || payout.property?.title || 'NA');
    row.gross_amount += Number(payout.gross_amount || 0);
    row.extra_charges += settlementChargeBreakdownTotal(payout, paymentConfig);
    row.tds_amount += Number(payout.tds_amount || 0);
    row.net_amount += net;
    row[statusAmountBucket(status)] += net;
    if (!row.destination_type && payout.destination_type) row.destination_type = payout.destination_type;
    if (!row.destination_ref && payout.destination_ref) row.destination_ref = payout.destination_ref;
    if (payout.settlement_decision_status) row.decision_status = payout.settlement_decision_status;
    if (!row.latest_at || new Date(dateValue || 0) > new Date(row.latest_at || 0)) row.latest_at = dateValue;
  });
  return Array.from(grouped.values()).map((row) => ({
    ...row,
    booking_count: row.bookings.size,
    property_count: row.properties.size,
  })).sort((a, b) => Number(b.net_amount || 0) - Number(a.net_amount || 0));
};

const settlementActionNotice = () => {};

const SettlementSummaryTable = ({ title, rows, emptyText, codeLabel, showCodeColumn = true, showHostIdUnderName = false, amountLabel = 'Net Payable', baseLabel = 'Gross Amount', baseMoney = paiseToMoney, amountMoney = paiseToMoney, taxMoney = paiseToMoney, extraColumn, showTds = true, showDestination = false, showPaid = true, showLatestDate = true, showActions = false, onApprove = settlementActionNotice, onReject = settlementActionNotice }) => (
  <Panel className="overflow-hidden">
    <div className="border-b border-slate-200 p-4">
      <h2 className="font-black">{title}</h2>
      <p className="text-xs text-slate-500">Grouped totals after current filters.</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1240px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>{['Name', ...(showCodeColumn ? [codeLabel] : []), 'Bookings', 'Properties', baseLabel, ...(extraColumn ? [extraColumn.label] : []), ...(showTds ? ['TDS'] : []), amountLabel, ...(showDestination ? ['Destination'] : []), 'Pending', 'Approved', ...(showPaid ? ['Paid'] : []), ...(showLatestDate ? ['Latest Date'] : []), ...(showActions ? ['Action'] : [])].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3">
                <p className="font-bold">{row.name}</p>
                {showHostIdUnderName && <p className="font-mono text-xs text-slate-500">{row.id}</p>}
              </td>
              {showCodeColumn && <td className="px-4 py-3 font-mono text-xs">{row.code}</td>}
              <td className="px-4 py-3 font-black">{row.booking_count}</td>
              <td className="px-4 py-3 font-black">{row.property_count}</td>
              <td className="px-4 py-3 font-black">{baseMoney(row.gross_amount || 0)}</td>
              {extraColumn && <td className="px-4 py-3">{extraColumn.money(row[extraColumn.key] || 0)}</td>}
              {showTds && <td className="px-4 py-3 text-red-700">{taxMoney(row.tds_amount || 0)}</td>}
              <td className="px-4 py-3 font-black">{amountMoney(row.net_amount || 0)}</td>
              {showDestination && <td className="px-4 py-3"><p className="capitalize">{row.destination_type || '-'}</p><p className="font-mono text-xs text-slate-500">{row.destination_ref || '-'}</p></td>}
              <td className="px-4 py-3">{amountMoney(row.pending_amount || 0)}</td>
              <td className="px-4 py-3">{amountMoney(row.approved_amount || 0)}</td>
              {showPaid && <td className="px-4 py-3">{amountMoney(row.paid_amount || 0)}</td>}
              {showLatestDate && <td className="px-4 py-3">{shortDate(row.latest_at)}</td>}
              {showActions && (
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={row.decision_status === 'approved'} onClick={() => onApprove(row)} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 disabled:opacity-50">Approve</button>
                    <button type="button" disabled={row.decision_status === 'rejected'} onClick={() => onReject(row)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 disabled:opacity-50">Reject</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="p-6 text-sm text-slate-500">{emptyText}</p>}
    </div>
  </Panel>
);

const SettlementWorkspace = ({ payouts, totals, payoutStatus, setPayoutStatus, autoStatus, busy, onProcess, onAction, paymentConfig }) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ from: '', to: '', host: '', broker: '', employee: '', branchManager: '' });
  const [hostDecisions, setHostDecisions] = useState({});
  const decisionPayouts = useMemo(() => (payouts || []).map((payout) => {
    const hostId = payout.host_id || payout.host?.user_id || payout.host?.uid || payout.host?.email || payout.host?.phone;
    const decision = hostDecisions[hostId];
    return decision ? { ...payout, status: decision, settlement_decision_status: decision } : payout;
  }), [payouts, hostDecisions]);
  const filteredPayouts = useMemo(() => decisionPayouts.filter((payout) => {
    const payoutDate = payout.settlement_due_at || payout.eligible_at || payout.created_at;
    const hostText = `${payout.host?.full_name || ''} ${payout.host?.email || ''} ${payout.host?.phone || ''} ${payout.host_id || ''}`;
    const displayBroker = resolvePayoutBroker(payout);
    const brokerText = displayBroker ? `${entityName(displayBroker, '')} ${entityCode(displayBroker)}` : '';
    const employeeText = `${entityName(payout.employee, '')} ${entityCode(payout.employee)}`;
    const branchText = `${entityName(payout.branch_manager, '')} ${entityCode(payout.branch_manager)}`;
    return withinDateRange(payoutDate, filters.from, filters.to)
      && containsText(hostText, filters.host)
      && containsText(brokerText, filters.broker)
      && containsText(employeeText, filters.employee)
      && containsText(branchText, filters.branchManager);
  }), [decisionPayouts, filters]);
  const filteredTotals = useMemo(() => filteredPayouts.reduce((acc, item) => {
    acc.gross += Number(item.gross_amount || 0);
    acc.extraCharges += settlementChargeBreakdownTotal(item, paymentConfig);
    acc.tds += Number(item.tds_amount || 0);
    acc.net += Number(item.net_amount || 0);
    return acc;
  }, { gross: 0, extraCharges: 0, tds: 0, net: 0 }), [filteredPayouts, paymentConfig]);
  const hostSummaryRows = useMemo(() => buildHostSummaryRows(filteredPayouts, paymentConfig), [filteredPayouts, paymentConfig]);
  const dropdownOptions = useMemo(() => ({
    hosts: uniqueFilterOptions(payouts, (payout) => {
      const name = payout.host?.full_name || payout.host_id;
      const value = `${payout.host?.full_name || ''} ${payout.host?.email || ''} ${payout.host?.phone || ''} ${payout.host_id || ''}`;
      return { value, label: `${name}${payout.host?.phone ? ` - ${payout.host.phone}` : ''}` };
    }),
    brokers: uniqueFilterOptions(payouts, (payout) => {
      const displayBroker = resolvePayoutBroker(payout);
      return {
        value: displayBroker ? `${entityName(displayBroker, '')} ${entityCode(displayBroker)}` : '',
        label: displayBroker ? `${entityName(displayBroker)} - ${entityCode(displayBroker)}` : '',
      };
    }),
    employees: uniqueFilterOptions(payouts, (payout) => ({
      value: `${entityName(payout.employee, '')} ${entityCode(payout.employee)}`,
      label: `${entityName(payout.employee)} - ${entityCode(payout.employee)}`,
    })),
    branchManagers: uniqueFilterOptions(payouts, (payout) => ({
      value: `${entityName(payout.branch_manager, '')} ${entityCode(payout.branch_manager)}`,
      label: `${entityName(payout.branch_manager)} - ${entityCode(payout.branch_manager)}`,
    })),
  }), [payouts]);
  useEffect(() => { setPage(1); }, [filteredPayouts.length, payoutStatus]);
  const rows = filteredPayouts.slice((page - 1) * 10, page * 10);
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => setFilters({ from: '', to: '', host: '', broker: '', employee: '', branchManager: '' });
  const updateHostDecision = (row, status) => {
    setHostDecisions((current) => ({ ...current, [row.id]: status }));
    showNotice(`${row.name} settlement ${status === 'approved' ? 'approved' : 'rejected'}.`, status === 'approved' ? 'success' : 'warning');
  };
  const detailStatus = (payout) => {
    const status = settleStatus(payout.status);
    if (status === 'approved' || status === 'paid') return 'approved';
    if (status === 'rejected') return 'rejected';
    return 'pending';
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Host Actual Value', paiseToMoney(filteredTotals.gross || 0)],
          ['Extra Charges', formatRoundedMoney(filteredTotals.extraCharges || 0)],
          ['TDS Hold', paiseToMoney(filteredTotals.tds || 0)],
          ['Net Host Payable', paiseToMoney(filteredTotals.net || 0)],
        ].map(([label, value]) => <Panel key={label} className="p-5"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 text-[20px] font-black text-slate-950">{value}</p></Panel>)}
      </div>
      <Panel className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-black">Settlement Controls</h2>
            <p className="text-xs text-slate-500">Sweep completed bookings, process eligible payouts, or run the auto payout engine manually.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={!!busy} onClick={() => onAction('sweep', 'sweep')} className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-3.5 py-2.5 text-xs font-black text-slate-700 disabled:opacity-50"><RefreshCcw className="h-4 w-4" /> Sweep Eligibility</button>
            <button disabled={!!busy} onClick={() => onAction('processEligible', 'batch')} className="inline-flex items-center gap-1 rounded-2xl bg-[#eef5ff] px-3.5 py-2.5 text-xs font-black text-[#2f6df6] disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Process Eligible</button>
            <button disabled={!!busy} onClick={() => onAction('runAuto', 'auto')} className="inline-flex items-center gap-1 rounded-2xl bg-[#2f6df6] px-3.5 py-2.5 text-xs font-black text-white disabled:opacity-50"><PlayCircle className="h-4 w-4" /> Run Auto Engine</button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm md:grid-cols-6">
          <Info label="Auto" value={autoStatus?.auto_payout_enabled ? 'Enabled' : 'Disabled'} />
          <Info label="Pending" value={autoStatus?.pending || 0} />
          <Info label="Eligible" value={autoStatus?.pending_eligible || 0} />
          <Info label="Processing" value={autoStatus?.processing || 0} />
          <Info label="Failed" value={autoStatus?.failed || 0} />
          <Info label="Mode" value={autoStatus?.payouts_are_mock ? 'Mock' : 'Live'} />
        </div>
        <div className="mt-4 rounded-[22px] border border-[#cfe0ff] bg-[#f5f9ff] p-4 text-sm text-slate-700">
          Host payout uses only the host-entered booking value before customer GST. Customer-side charges are shown separately so finance can track host settlement, platform commission, broker payout, and RM payout clearly.
        </div>
      </Panel>
      <Panel className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-black">Search & Filter Host Settlements</h2>
            <p className="text-xs text-slate-500">Filter payout rows by date, host, broker, RM and branch manager.</p>
          </div>
          <button onClick={clearFilters} className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Clear Filters</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">From Date<input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-semibold normal-case tracking-normal outline-none" /></label>
          <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">To Date<input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-semibold normal-case tracking-normal outline-none" /></label>
          <FilterSelect label="Host" value={filters.host} onChange={(value) => updateFilter('host', value)} options={dropdownOptions.hosts} placeholder="All Hosts" />
          <FilterSelect label="Broker" value={filters.broker} onChange={(value) => updateFilter('broker', value)} options={dropdownOptions.brokers} placeholder="All Brokers" />
          <FilterSelect label="RM / Employee" value={filters.employee} onChange={(value) => updateFilter('employee', value)} options={dropdownOptions.employees} placeholder="All RM / Employees" />
          <FilterSelect label="Branch Manager" value={filters.branchManager} onChange={(value) => updateFilter('branchManager', value)} options={dropdownOptions.branchManagers} placeholder="All Branch Managers" />
        </div>
      </Panel>
      <SettlementSummaryTable
        title="Host Wise Settlement"
        rows={hostSummaryRows}
        emptyText="No host settlement totals found."
        codeLabel="Host Code"
        showCodeColumn={false}
        showHostIdUnderName
        baseLabel="Host Actual Value"
        amountLabel="Net Host Payable"
        extraColumn={{ key: 'extra_charges', label: 'Extra Charges', money: formatRoundedMoney }}
        showDestination
        showPaid={false}
        showLatestDate={false}
        showActions
        onApprove={(row) => updateHostDecision(row, 'approved')}
        onReject={(row) => updateHostDecision(row, 'rejected')}
      />
      <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div><h2 className="font-black">Host Booking / Property Details</h2><p className="text-xs text-slate-500">{filteredPayouts.length} filtered payout rows with broker/RM ownership and due date.</p></div>
            <select value={payoutStatus} onChange={(event) => setPayoutStatus(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="eligible">Eligible</option>
              <option value="needs_destination">Needs Destination</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[2200px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>{['Payout / Due', 'Host', 'Property', 'Broker', 'Employee (RM)', 'Booking', 'Host Actual Value', ...hostSettlementChargeColumns.map(([, label]) => label), 'TDS Base', 'TDS', 'Net Host Payable', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((payout) => {
                  const chargeBreakdown = settlementChargeBreakdown(payout, paymentConfig);
                  const displayBroker = resolvePayoutBroker(payout);
                  return (
                    <tr key={payout.payout_id}>
                      <td className="px-4 py-3"><p className="font-mono text-xs font-bold">{payout.payout_id}</p><p className="text-xs text-slate-500">Due: {shortDate(payout.settlement_due_at || payout.eligible_at || payout.created_at)}</p></td>
                      <td className="px-4 py-3"><p className="font-bold">{payout.host?.full_name || payout.host_id}</p><p className="text-xs text-slate-500">{payout.host?.email || '-'}</p></td>
                      <td className="px-4 py-3"><p className="font-semibold">{payout.property?.title || payout.property_id}</p><p className="text-xs text-slate-500">{payout.property?.city || '-'}</p></td>
                      <td className="px-4 py-3"><p className="font-bold">{entityName(displayBroker)}</p><p className="text-xs text-slate-500">Code: {displayBroker ? entityCode(displayBroker) : 'NA'}</p></td>
                      <td className="px-4 py-3"><p className="font-bold">{entityName(payout.employee)}</p><p className="text-xs text-slate-500">Code: {entityCode(payout.employee)}</p></td>
                      <td className="px-4 py-3"><p className="font-mono text-xs">{payout.booking_id}</p><p className="text-xs text-slate-500">{shortDate(payout.booking?.check_in_date)} to {shortDate(payout.booking?.check_out_date)}</p></td>
                      <td className="px-4 py-3"><p className="font-black">{paiseToMoney(payout.gross_amount || 0)}</p><p className="text-xs text-slate-500">Host base without GST</p></td>
                      {hostSettlementChargeColumns.map(([key]) => (
                        <td key={key} className="px-4 py-3 font-semibold">{chargeDisplay(chargeBreakdown[key])}</td>
                      ))}
                      <td className="px-4 py-3"><p>{paiseToMoney(payout.tds_base_amount || payout.gross_amount || 0)}</p><p className="text-xs text-slate-500">{tdsBaseNote(payout)}</p></td>
                      <td className="px-4 py-3"><p>{paiseToMoney(payout.tds_amount || 0)}</p><p className="text-xs text-slate-500">{Number(payout.tds_rate_percent || 0)}%</p></td>
                      <td className="px-4 py-3 font-black">{paiseToMoney(payout.net_amount || 0)}</td>
                      <td className="px-4 py-3"><StatusBadge value={detailStatus(payout)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredPayouts.length && <p className="p-6 text-sm text-slate-500">No payouts match the current filters. Clear filters and check again.</p>}
          </div>
          <Pagination currentPage={page} totalItems={filteredPayouts.length} itemsPerPage={10} onPageChange={setPage} />
        </Panel>
    </div>
  );
};

const RefundWorkspace = ({ refunds, refundStatus, setRefundStatus, busy, onInitiate, onPreview, policyPreview, onApproveRefund, onRejectRefund, paymentConfig = {} }) => {
  const [page, setPage] = useState(1);
  const [dateFilters, setDateFilters] = useState({ from: '', to: '' });
  const displayValue = (value) => firstPresent(value, 'NA');
  const displayDate = (value) => (firstPresent(value) ? shortDate(value) : 'NA');
  const displayPercent = (value) => (firstPresent(value) ? `${Number(value || 0)}%` : 'NA');
  const refundAmountValue = (refund, keys, fallback = undefined) => {
    const value = firstPresent(...keys.map((key) => refund?.[key]), fallback);
    return value === undefined || value === null ? undefined : Number(value || 0);
  };
  const gstRefundedAmount = (refund) => {
    const direct = refundAmountValue(refund, ['gst_refunded', 'gst_refund_amount', 'tax_refunded', 'tax_refund_amount']);
    if (direct !== undefined) return direct;
    return Number(refund.cgst_refund_amount || 0) + Number(refund.sgst_refund_amount || 0) + Number(refund.igst_refund_amount || 0);
  };
  const cancellationChargesAmount = (refund) => {
    const direct = refundAmountValue(refund, ['cancellation_charges', 'cancellation_charge_amount', 'penalty_amount', 'deduction_amount']);
    if (direct !== undefined) return direct;
    const original = Number(refund.refundable_base_amount || refund.refund_base_amount || 0);
    const refundTotal = Number(refund.refund_amount || 0);
    return original > refundTotal ? original - refundTotal : 0;
  };
  const cancellationPercent = (refund) => firstPresent(
    refund.cancellation_percent,
    refund.cancellation_percentage,
    refund.penalty_percent,
    refund.refund_percent !== undefined && refund.refund_percent !== null ? Math.max(0, 100 - Number(refund.refund_percent || 0)) : undefined
  );
  const roundedPaiseToMoney = (value) => formatMoney(Math.round(Number(value || 0) / 100));
  const roundedRupeesValue = (value) => Math.round(Number(value || 0) / 100);
  const normaliseChargeToPaise = (value, grossReceipt = 0) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const grossAmount = Number(grossReceipt || 0);
    const grossRupees = grossAmount > 10000 ? grossAmount / 100 : grossAmount;
    if (grossRupees >= 500 && amount < 100) return Math.round(amount * 10000);
    if (grossRupees && amount <= Math.max(grossRupees * 2, 10000)) return Math.round(amount * 100);
    return Math.round(amount);
  };
  const isApprovedRefund = (refundOrStatus) => {
    const value = String(typeof refundOrStatus === 'string' ? refundOrStatus : refundOrStatus?.status || '').toLowerCase();
    return ['approved', 'processed', 'completed', 'success', 'refunded'].includes(value);
  };
  const refundReferenceForDisplay = (refund) => (
    isApprovedRefund(refund)
      ? displayValue(refund.bank_neft_ref || refund.neft_reference || refund.bank_reference || refund.utr || refund.razorpay_refund_id || refund.gateway_refund_id)
      : 'NA'
  );
  const refundSettlementDateForDisplay = (refund) => (
    isApprovedRefund(refund)
      ? displayDate(refund.refund_completed_at || refund.completed_at || refund.processed_at || refund.refunded_at || refund.approved_at)
      : 'NA'
  );
  const optionalMoney = (value) => (Number(value || 0) > 0 ? roundedPaiseToMoney(value) : 'NA');
  const refundChargeBreakdown = (refund, grossReceipt, refundableBase, config = {}) => {
    const breakdown = refund.customer_charge_breakdown || refund.booking?.customer_charge_breakdown || refund.transaction?.customer_charge_breakdown || {};
    const valueFor = (...keys) => keys.reduce((amount, key) => {
      if (amount > 0) return amount;
      return normaliseChargeToPaise(breakdown[key] ?? refund[key] ?? refund.booking?.[key] ?? refund.transaction?.[key], grossReceipt);
    }, 0);
    const chargeBase = refundableBase || grossReceipt || 0;
    const platformFee = valueFor('platform_fee', 'platform_fee_amount', 'platform_charge', 'platform_charge_amount') || platformFeePaiseFromTransaction(refund, chargeBase, config);
    const gatewayCharge = valueFor('gateway_charge', 'payment_gateway_charge', 'gateway_charge_amount', 'payment_gateway_charge_amount') || configuredChargePaise(config, 'payment_gateway_charge', chargeBase);
    const convenienceFee = valueFor('convenience_fee', 'platform_convenience_fee', 'convenience_charge') || configuredChargePaise(config, 'convenience_fee', chargeBase);
    const insuranceFee = valueFor('insurance_fee', 'protection_fee', 'insurance_charge') || configuredChargePaise(config, 'insurance_fee', chargeBase);
    const cleaningFee = valueFor('cleaning_fee', 'cleaning_charge') || configuredChargePaise(config, 'cleaning_fee', chargeBase);
    const extraGuestFee = valueFor('extra_guest_fee', 'extra_guest_charge', 'extra_person_fee', 'extra_person_charge') || configuredChargePaise(config, 'extra_guest_fee', chargeBase);
    const customerGst = valueFor('customer_gst', 'gst_amount', 'tax_amount', 'taxes');
    const totalDifference = Number(refund.non_refundable_difference_amount || Math.max(0, Number(grossReceipt || 0) - Number(refundableBase || 0)));
    return {
      platformFee,
      gatewayCharge,
      convenienceFee,
      insuranceFee,
      cleaningFee,
      extraGuestFee,
      customerGst,
      totalDifference,
    };
  };
  const refundEffectiveDate = (refund) => firstPresent(refund.refund_completed_at, refund.completed_at, refund.processed_at, refund.refunded_at, refund.created_at);
  const refundReportDate = (refund) => firstPresent(refund.refund_requested_at, refund.created_at, refund.cancelled_at, refund.refund_completed_at, refund.completed_at, refund.processed_at, refund.refunded_at);
  const originalInvoiceNoForRefund = (refund) => {
    const invoice = refund.invoice || refund.original_invoice || refund.booking?.invoice || refund.transaction?.invoice || {};
    return customerTaxInvoiceNo({
      invoiceCandidates: [
        refund.original_invoice_no,
        refund.tax_invoice_no,
        refund.invoice_no,
        invoice.tax_invoice_no,
        invoice.invoice_no,
        invoice.invoice_number,
        refund.booking?.tax_invoice_no,
        refund.booking?.customer_invoice_no,
        refund.booking?.booking_invoice_no,
        refund.booking?.invoice_no,
        refund.booking?.invoice_number,
        refund.transaction?.tax_invoice_no,
        refund.transaction?.invoice_no,
        refund.transaction?.invoice_number,
      ],
      bookingIdCandidates: [
        refund.booking_id,
        refund.booking?.booking_id,
        refund.booking?.id,
        refund.transaction?.booking_id,
        invoice.booking_id,
        invoice.id,
      ],
      dateCandidates: [
        refund.original_invoice_date,
        refund.invoice_date,
        invoice.invoice_date,
        invoice.created_at,
        refund.booking?.invoice_date,
        refund.booking?.created_at,
        refund.transaction?.invoice_date,
        refund.transaction?.created_at,
        refund.created_at,
      ],
    });
  };
  const displayTransactionInvoiceNo = (txn = {}) => {
    if (['booking_payment', 'refund'].includes(txn.type)) {
      const invoiceNo = customerTaxInvoiceNo({
        invoiceCandidates: [
          txn.customer_invoice_no,
          txn.tax_invoice_no,
          txn.booking_invoice_no,
          txn.invoice_no,
          txn.invoice_number,
          txn.booking?.customer_invoice_no,
          txn.booking?.tax_invoice_no,
          txn.booking?.booking_invoice_no,
          txn.booking?.invoice_no,
          txn.booking?.invoice_number,
        ],
        bookingIdCandidates: [
          txn.booking_id,
          txn.booking?.booking_id,
          txn.booking?.id,
          txn.id,
          txn.transaction_id,
        ],
        dateCandidates: [
          txn.invoice_date,
          txn.booking?.invoice_date,
          txn.created_at,
          txn.booking?.created_at,
        ],
      });
      if (invoiceNo !== 'NA') return invoiceNo;
    }
    return firstPresent(txn.invoice_no, txn.invoice_number, txn.transaction_id) || 'NA';
  };
  const accountingDate = (value) => {
    const raw = firstPresent(value);
    if (!raw) return 'NA';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
  };
  const financialYearLabel = (value) => {
    const date = value ? new Date(value) : new Date();
    const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
    const month = Number.isNaN(date.getTime()) ? new Date().getMonth() + 1 : date.getMonth() + 1;
    const startYear = month >= 4 ? year : year - 1;
    return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
  };
  const generatedCreditNoteNo = (refund, index) => {
    const existing = firstPresent(refund.credit_note_no, refund.credit_note_number, refund.cn_no);
    if (existing) return existing;
    return `STRC/CN/${financialYearLabel(refundEffectiveDate(refund))}/${String(index + 1).padStart(4, '0')}`;
  };
  const filteredRefunds = useMemo(() => refunds.filter((refund) => withinDateRange(refundReportDate(refund), dateFilters.from, dateFilters.to)), [refunds, dateFilters.from, dateFilters.to]);
  useEffect(() => { setPage(1); }, [filteredRefunds.length, dateFilters.from, dateFilters.to]);
  const rows = filteredRefunds.slice((page - 1) * 10, page * 10);
  const exportRefundCsv = () => {
    const headers = [
      'Refund ID',
      'Booking ID',
      'Customer Name',
      'Customer GSTIN',
      'Original Invoice No',
      'Original Invoice Date',
      'Gross Receipt Amount - Customer Paid (Rs.)',
      'Refundable Booking Value - Host Base (Rs.)',
      'Platform Fee (Rs.)',
      'Payment Gateway Charge (Rs.)',
      'Convenience Fee (Rs.)',
      'Insurance Fee (Rs.)',
      'Cleaning Fee (Rs.)',
      'Extra Guest Fee (Rs.)',
      'GST / Tax Collected (Rs.)',
      'Total Customer Charges / Difference (Rs.)',
      'Cancellation Deduction Rate',
      'Cancellation Deduction (Rs.)',
      'Refund Amount (Rs.)',
      'Bank / UTR / NEFT Ref',
      'Refund Requested Date',
      'Refund Settlement Date',
      'Refund Status',
    ];
    const csvRows = filteredRefunds.map((refund) => {
      const refundableBase = refundAmountValue(refund, ['refundable_base_amount', 'refund_base_amount', 'taxable_refund_amount'], Math.max(0, Number(refund.refund_amount || 0) + Number(cancellationChargesAmount(refund) || 0)));
      const grossReceipt = refundAmountValue(refund, ['gross_receipt_amount', 'original_amount_paid', 'original_amount'], 0);
      const charges = refundChargeBreakdown(refund, grossReceipt, refundableBase, paymentConfig);
      return [
        displayValue(refund.refund_id),
        displayValue(refund.booking_id),
        displayValue(refund.customer_name || refund.guest?.full_name || refund.guest_name || refund.guest_id),
        displayValue(refund.customer_gstin || refund.guest?.gstin || refund.gstin || refund.booking?.customer_gstin),
        originalInvoiceNoForRefund(refund),
        displayDate(refund.original_invoice_date || refund.invoice_date || refund.invoice?.invoice_date || refund.transaction?.invoice_date),
        roundedRupeesValue(grossReceipt),
        roundedRupeesValue(refundableBase),
        charges.platformFee ? roundedRupeesValue(charges.platformFee) : 'NA',
        charges.gatewayCharge ? roundedRupeesValue(charges.gatewayCharge) : 'NA',
        charges.convenienceFee ? roundedRupeesValue(charges.convenienceFee) : 'NA',
        charges.insuranceFee ? roundedRupeesValue(charges.insuranceFee) : 'NA',
        charges.cleaningFee ? roundedRupeesValue(charges.cleaningFee) : 'NA',
        charges.extraGuestFee ? roundedRupeesValue(charges.extraGuestFee) : 'NA',
        charges.customerGst ? roundedRupeesValue(charges.customerGst) : 'NA',
        roundedRupeesValue(charges.totalDifference),
        displayPercent(cancellationPercent(refund)),
        roundedRupeesValue(cancellationChargesAmount(refund)),
        roundedRupeesValue(refund.refund_amount || 0),
        refundReferenceForDisplay(refund),
        displayDate(refund.refund_requested_at || refund.created_at),
        refundSettlementDateForDisplay(refund),
        refundStatusLabel(refund.status),
      ];
    });
    if (!csvRows.length) {
      showNotice('No refund records available for the selected filters.', 'error');
      return;
    }
    downloadCsvFile(`refund-register-${dateFilters.from || 'all'}-to-${dateFilters.to || 'all'}.csv`, headers, csvRows);
  };
  const buildCreditNoteHtml = (refund, index) => {
    const cancellationCharge = cancellationChargesAmount(refund);
    const taxableValue = refundAmountValue(refund, ['net_taxable_value_credited', 'taxable_refund_amount'], Number(refund.refund_amount || 0));
    const cgst = refundAmountValue(refund, ['cgst_reversed', 'cgst_refund_amount'], 0);
    const sgst = refundAmountValue(refund, ['sgst_reversed', 'sgst_refund_amount'], 0);
    const gross = refundAmountValue(refund, ['gross_amount', 'refundable_base_amount', 'refund_base_amount', 'original_taxable_value', 'taxable_value', 'original_base_amount'], Math.max(0, Number(taxableValue || 0) + Number(cancellationCharge || 0)));
    const invoice = refund.invoice || refund.original_invoice || refund.booking?.invoice || refund.transaction?.invoice || {};
    const property = refund.property || refund.booking?.property || refund.transaction?.property || {};
    const propertyName = displayValue(refund.property_name || refund.booking?.property_name || property.property_name || property.title || property.name || refund.property_id);
    const stay = displayValue(refund.stay_nights || refund.booking?.nights || refund.booking?.stay_nights || refund.booking?.number_of_nights || 1);
    const roomType = displayValue(refund.room_type || refund.booking?.room_type || property.configuration || property.bhk);
    const originalInvoiceNo = originalInvoiceNoForRefund(refund);
    const originalInvoiceDate = accountingDate(refund.original_invoice_date || refund.invoice_date || invoice.invoice_date || invoice.created_at || refund.transaction?.invoice_date);
    return `<!doctype html><html><head><title>${generatedCreditNoteNo(refund, index)} - Credit Note</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#111}
        .page{width:900px;margin:20px auto}.title{text-align:center;font-size:24px;font-weight:800;margin-bottom:18px}
        table{width:100%;border-collapse:collapse;font-size:14px}td,th{border:1px solid #111;padding:7px;vertical-align:top}
        .bold{font-weight:800}.company-title{font-size:20px;font-weight:900}.toolbar{display:flex;justify-content:flex-end;gap:10px;margin:12px auto;width:900px}
        .toolbar button{border:0;border-radius:8px;padding:10px 16px;font-weight:800;cursor:pointer}.print{background:#00875a;color:#fff}.close{background:#f3f4f6}
        @media print{.toolbar{display:none}.page{margin:0;width:100%}}
      </style></head><body>
      <div class="toolbar"><button class="print" onclick="window.print()">Print / Download PDF</button><button class="close" onclick="window.close()">Close</button></div>
      <div class="page">
        <div class="title">CREDIT NOTE</div>
        <table>
          <tr>
            <td style="width:50%"><span class="bold">Guest Name:</span><br>${displayValue(refund.customer_name || refund.guest?.full_name || refund.guest_name || refund.guest_id)}<br>
              Contact No. ${displayValue(refund.customer_phone || refund.guest?.phone)}<br>Email: ${displayValue(refund.customer_email || refund.guest?.email)}<br>
              GSTIN: ${displayValue(refund.customer_gstin || refund.guest?.gstin || refund.gstin || refund.booking?.customer_gstin)} [Optional]<br>
              Property / Hotel- ${propertyName}<br>Booking Status - Booking Confirmed<br>Room Type - ${roomType}</td>
            <td>Credit Note No.: ${generatedCreditNoteNo(refund, index)}<br>Credit Note Date: ${accountingDate(refund.credit_note_date || refundEffectiveDate(refund))}<br><br>
              Original Invoice No - ${originalInvoiceNo}<br>Original Invoice Date- ${originalInvoiceDate}<br><br>
              <span class="bold">Booking Refund</span><br>Booking ID: ${displayValue(refund.booking_id)}<br>
              Payment Ref.: ${displayValue(refund.payment_ref || refund.razorpay_payment_id || refund.booking?.payment_id)}<br>
              Booked on - ${accountingDate(refund.booking_date || refund.booking?.created_at || refund.created_at)}</td>
          </tr>
          <tr><td colspan="2" class="bold">DETAILS</td></tr>
          <tr>
            <td><span class="bold">Property Owner Details:</span><br>${displayValue(refund.property_owner_name || refund.host?.full_name)}<br>
              Property: ${propertyName}<br>${displayValue(refund.property_address || property.address || property.location)}<br>
              Contact No. ${displayValue(refund.property_owner_contact || refund.host?.phone)}</td>
            <td><span class="company-title">X-SPACE360</span><br>(Golden Rich Financial & Real Estate Solutions Pvt. Ltd.)<br>
              Office No-804, Royal Avaan Avenue, Opp. Bhosla School Gate,<br>Jehan Circle, Gangapur Road Nashik-422013<br>
              GSTIN/UIN: 27AAKCG1285C1ZP<br>State Name : Maharashtra, Code : 27<br>Contact : 9225586001<br>
              Mail-finance.director@goldenrichproperties.com</td>
          </tr>
          <tr><td class="bold">Check-in</td><td>${displayValue(refund.check_in_date || refund.booking?.check_in_date)}</td></tr>
          <tr><td class="bold">Check-out</td><td>${displayValue(refund.check_out_date || refund.booking?.check_out_date)}</td></tr>
          <tr><td class="bold">Stay</td><td>${stay} Night(s)</td></tr>
          <tr><td class="bold">No of Guest</td><td>${displayValue(refund.guest_count || refund.booking?.number_of_guests || refund.booking?.guests)}</td></tr>
          <tr><td class="bold">Payment Mode / Status</td><td>${displayValue(refund.payment_mode || refund.booking?.payment_method || 'Online Payment')} / ${displayValue(refund.payment_status || refund.booking?.payment_status || 'Paid')}</td></tr>
          <tr><td colspan="2" class="bold">Price Summary</td></tr>
          <tr><td class="bold">Description</td><td class="bold">Amount (Rs.)</td></tr>
          <tr><td>Accommodation / Property Booking - ${propertyName}<br>Stay: ${stay} Night | Room: ${roomType}</td><td>${paiseToMoney(gross)}</td></tr>
          <tr><td>Cancellation Charges As per Refund Policy</td><td>${paiseToMoney(cancellationCharge)}</td></tr>
          <tr><td>Taxable Value</td><td>${paiseToMoney(taxableValue)}</td></tr>
          <tr><td>CGST</td><td>${paiseToMoney(cgst)}</td></tr>
          <tr><td>SGST</td><td>${paiseToMoney(sgst)}</td></tr>
          <tr><td>Total Price</td><td>${paiseToMoney(refund.refund_amount || 0)}</td></tr>
          <tr><td colspan="2"><span class="bold">Amount Paid by Online Payment:</span> ${paiseToMoney(refund.refund_amount || 0)}</td></tr>
        </table>
      </div></body></html>`;
  };
  const openCreditNote = (refund, index, autoPrint = false) => {
    const win = window.open('', '_blank', 'width=980,height=900');
    if (!win) {
      showNotice('Please allow pop-ups to view the credit note.', 'error');
      return;
    }
    win.document.write(buildCreditNoteHtml(refund, index));
    win.document.close();
    if (autoPrint) win.onload = () => win.print();
  };
  const refundStatusLabel = (status) => {
    const value = String(status || '').toLowerCase();
    if (['approved', 'processed', 'completed', 'success', 'refunded'].includes(value)) return 'Approved';
    if (value === 'rejected') return 'Rejected';
    if (value === 'failed') return 'Failed';
    if (['pending', 'initiated', 'processing'].includes(value)) return 'Pending';
    return displayValue(status);
  };
  const refundTableHeaders = [
    'Refund ID',
    'Booking ID',
    'Customer Name',
    'Customer GSTIN',
    'Original Invoice No',
    'Original Invoice Date',
    'Gross Receipt Amount - Customer Paid (Rs.)',
    'Refundable Booking Value - Host Base (Rs.)',
    'Platform Fee (Rs.)',
    'Payment Gateway Charge (Rs.)',
    'Convenience Fee (Rs.)',
    'Insurance Fee (Rs.)',
    'Cleaning Fee (Rs.)',
    'Extra Guest Fee (Rs.)',
    'GST / Tax Collected (Rs.)',
    'Total Difference (Rs.)',
    'Cancellation Deduction Rate',
    'Cancellation Deduction (Rs.)',
    'Refund Amount (Rs.)',
    'Bank / UTR / NEFT Ref',
    'Refund Requested Date',
    'Refund Settlement Date',
    'Refund Status',
    'Actions',
  ];
  const creditNoteHeaders = [
    'Credit Note Date',
    'Credit Note No',
    'Guest Name',
    'Property Name',
    'Broker',
    'RM / Employee',
    'Customer GSTIN Number',
    'Property Type',
    'Gross Amount',
    'Cancellation Charges',
    'Net Taxable Value',
    'IGST',
    'CGST',
    'SGST',
    'Total Credit Note Amt.',
    'Original Invoice No',
    'Original Invoice Date',
    'Refund Mode',
    'Refund Payment Status',
    'Reason for Credit Note',
    'Invoice Detail',
  ];
  const creditNotes = useMemo(() => filteredRefunds
    .filter((refund) => isApprovedRefund(refund))
    .sort((a, b) => String(refundEffectiveDate(a) || '').localeCompare(String(refundEffectiveDate(b) || ''))),
  [filteredRefunds]);

  const totals = filteredRefunds.reduce((acc, row) => {
    const status = String(row.status || '').toLowerCase();
    const amount = Number(row.refund_amount || 0);
    acc.total += amount;
    if (isApprovedRefund(status)) acc.paid += amount;
    if (['pending', 'initiated', 'processing'].includes(status)) acc.pending += amount;
    if (['failed', 'rejected'].includes(status)) acc.failed += amount;
    return acc;
  }, { total: 0, paid: 0, pending: 0, failed: 0 });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['Total Refund Amount', paiseToMoney(totals.total)],
          ['Paid Refund Amount', paiseToMoney(totals.paid)],
          ['Pending Refund Amount', paiseToMoney(totals.pending)],
          ['Failed Refund Amount', paiseToMoney(totals.failed)],
        ].map(([label, value]) => <Panel key={label} className="p-5"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 text-[20px] font-black text-slate-950">{value}</p></Panel>)}
      </div>
      <Panel className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-black">Refund Controls</h2>
            <p className="text-xs text-slate-500">Preview cancellation policy, initiate approved refunds, and track gateway processing status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onPreview} className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-3.5 py-2.5 text-xs font-black text-slate-700"><FileText className="h-4 w-4" /> Policy Preview</button>
            <button disabled={busy === 'refund'} onClick={onInitiate} className="inline-flex items-center gap-1 rounded-2xl bg-[#2f6df6] px-3.5 py-2.5 text-xs font-black text-white disabled:opacity-50"><RefreshCcw className="h-4 w-4" /> Initiate Refund</button>
          </div>
        </div>
        {policyPreview && (
          <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
            <Info label="Check-in" value={policyPreview.check_in_date} />
            <Info label="Policy Tier" value={policyPreview.tier} />
            <Info label="Refund %" value={`${policyPreview.percent}%`} />
            <Info label="Refund" value={paiseToMoney(policyPreview.refund_paise || 0)} />
          </div>
        )}
      </Panel>
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div><h2 className="font-black">Refund Queue</h2><p className="text-xs text-slate-500">Gross receipt is the guest-paid amount. Refundable booking value is host base only. The difference is split into platform/customer charges and GST.</p></div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
              From Date
              <input type="date" value={dateFilters.from} onChange={(event) => setDateFilters((prev) => ({ ...prev, from: event.target.value }))} className="mt-1 h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-700 shadow-sm" />
            </label>
            <label className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
              To Date
              <input type="date" value={dateFilters.to} onChange={(event) => setDateFilters((prev) => ({ ...prev, to: event.target.value }))} className="mt-1 h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-slate-700 shadow-sm" />
            </label>
            <select value={refundStatus} onChange={(event) => setRefundStatus(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
            <button type="button" onClick={() => setDateFilters({ from: '', to: '' })} className="h-11 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700">Clear Dates</button>
            <button type="button" onClick={exportRefundCsv} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs font-black text-white"><Download className="h-4 w-4" /> Export CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[3200px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{refundTableHeaders.map((h) => <th key={h} className="px-4 py-3 align-top">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((refund) => {
                const refundableBase = refundAmountValue(refund, ['refundable_base_amount', 'refund_base_amount', 'taxable_refund_amount'], Math.max(0, Number(refund.refund_amount || 0) + Number(cancellationChargesAmount(refund) || 0)));
                const grossReceipt = refundAmountValue(refund, ['gross_receipt_amount', 'original_amount_paid', 'original_amount'], 0);
                const charges = refundChargeBreakdown(refund, grossReceipt, refundableBase, paymentConfig);
                const canReviewRefund = ['pending', 'initiated', 'processing'].includes(String(refund.status || '').toLowerCase());
                const invoice = refund.invoice || refund.original_invoice || refund.booking?.invoice || refund.transaction?.invoice || {};
                return (
                  <tr key={refund.refund_id}>
                    <td className="px-4 py-3 font-mono text-xs font-bold">{displayValue(refund.refund_id)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{displayValue(refund.booking_id)}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{displayValue(refund.customer_name || refund.guest?.full_name || refund.guest_name || refund.guest_id)}</p>
                      <p className="text-xs text-slate-500">{displayValue(refund.customer_email || refund.guest?.email)}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{displayValue(refund.customer_gstin || refund.guest?.gstin || refund.gstin || refund.booking?.customer_gstin)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{originalInvoiceNoForRefund(refund)}</td>
                    <td className="px-4 py-3">{displayDate(refund.original_invoice_date || refund.invoice_date || invoice.invoice_date || invoice.created_at || refund.transaction?.invoice_date)}</td>
                    <td className="px-4 py-3 font-semibold">{roundedPaiseToMoney(grossReceipt || 0)}</td>
                    <td className="px-4 py-3">{roundedPaiseToMoney(refundableBase || 0)}</td>
                    <td className="px-4 py-3">{optionalMoney(charges.platformFee)}</td>
                    <td className="px-4 py-3">{optionalMoney(charges.gatewayCharge)}</td>
                    <td className="px-4 py-3">{optionalMoney(charges.convenienceFee)}</td>
                    <td className="px-4 py-3">{optionalMoney(charges.insuranceFee)}</td>
                    <td className="px-4 py-3">{optionalMoney(charges.cleaningFee)}</td>
                    <td className="px-4 py-3">{optionalMoney(charges.extraGuestFee)}</td>
                    <td className="px-4 py-3">{optionalMoney(charges.customerGst)}</td>
                    <td className="px-4 py-3 font-black">{roundedPaiseToMoney(charges.totalDifference)}</td>
                    <td className="px-4 py-3">{displayPercent(cancellationPercent(refund))}</td>
                    <td className="px-4 py-3">{roundedPaiseToMoney(cancellationChargesAmount(refund))}</td>
                    <td className="px-4 py-3 font-black">{roundedPaiseToMoney(refund.refund_amount || 0)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{refundReferenceForDisplay(refund)}</td>
                    <td className="px-4 py-3">{displayDate(refund.refund_requested_at || refund.created_at)}</td>
                    <td className="px-4 py-3">{refundSettlementDateForDisplay(refund)}</td>
                    <td className="px-4 py-3"><StatusBadge value={refundStatusLabel(refund.status)} />{refund.failure_reason && <p className="mt-1 text-xs font-semibold text-red-700">{refund.failure_reason}</p>}</td>
                    <td className="px-4 py-3">
                      {canReviewRefund ? (
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={busy === `approve-refund-${refund.refund_id}`} onClick={() => onApproveRefund(refund)} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white disabled:opacity-50">Approve</button>
                          <button type="button" disabled={busy === `reject-refund-${refund.refund_id}`} onClick={() => onRejectRefund(refund)} className="rounded-xl bg-red-50 px-3 py-1.5 text-xs font-black text-red-700 disabled:opacity-50">Reject</button>
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredRefunds.length && <p className="p-6 text-sm text-slate-500">No refunds found.</p>}
        </div>
        <Pagination currentPage={page} totalItems={filteredRefunds.length} itemsPerPage={10} onPageChange={setPage} />
      </Panel>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Credit Note Dashboard</h2>
          <p className="text-xs text-slate-500">Credit notes generated against approved customer cancellation refunds with settlement status.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[2100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{creditNoteHeaders.map((h) => <th key={h} className="px-4 py-3 align-top">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {creditNotes.map((refund, index) => {
                const invoice = refund.invoice || refund.original_invoice || refund.booking?.invoice || refund.transaction?.invoice || {};
                const cgstReversed = refundAmountValue(refund, ['cgst_reversed', 'cgst_refund_amount'], 0);
                const sgstReversed = refundAmountValue(refund, ['sgst_reversed', 'sgst_refund_amount'], 0);
                const igstReversed = refundAmountValue(refund, ['igst_reversed', 'igst_refund_amount'], 0);
                const cancellationCharge = cancellationChargesAmount(refund);
                const netTaxableCredited = refundAmountValue(refund, ['net_taxable_value_credited', 'taxable_refund_amount'], Number(refund.refund_amount || 0));
                const grossAmount = refundAmountValue(refund, ['gross_amount', 'refundable_base_amount', 'refund_base_amount', 'original_taxable_value', 'taxable_value', 'original_base_amount'], Math.max(0, Number(netTaxableCredited || 0) + Number(cancellationCharge || 0)));
                const property = refund.property || refund.booking?.property || refund.transaction?.property || {};
                const originalInvoiceNo = originalInvoiceNoForRefund(refund);
                const brokerName = displayValue(
                  refund.broker_name,
                  refund.broker?.full_name
                );
                const brokerCode = displayValue(
                  refund.broker_code,
                  refund.broker?.broker_code,
                  refund.broker?.lg_code,
                  refund.broker?.employee_code,
                  refund.broker?.user_id
                );
                const rmName = displayValue(
                  refund.rm_name,
                  refund.employee_name,
                  refund.rm?.full_name,
                  refund.employee?.full_name
                );
                const rmCode = displayValue(
                  refund.rm_code,
                  refund.employee_code,
                  refund.rm?.employee_code,
                  refund.employee?.employee_code,
                  refund.rm?.user_id,
                  refund.employee?.user_id
                );
                return (
                  <tr key={`${refund.refund_id}-credit-note`}>
                    <td className="px-4 py-3">{accountingDate(refund.credit_note_date || refundEffectiveDate(refund))}</td>
                    <td className="px-4 py-3 font-mono text-xs font-bold">{generatedCreditNoteNo(refund, index)}</td>
                    <td className="px-4 py-3 font-bold">{displayValue(refund.customer_name || refund.guest?.full_name || refund.guest_name || refund.guest_id)}</td>
                    <td className="px-4 py-3 font-bold">{displayValue(refund.property_name || refund.booking?.property_name || refund.transaction?.property_name || property.property_name || property.title || property.name || refund.property_id)}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{brokerName}</p>
                      <p className="font-mono text-xs text-slate-500">{brokerCode}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold">{rmName}</p>
                      <p className="font-mono text-xs text-slate-500">{rmCode}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{displayValue(refund.customer_gstin || refund.guest?.gstin || refund.gstin || refund.booking?.customer_gstin)}</td>
                    <td className="px-4 py-3">{displayValue(refund.property_type || property.property_type || property.type || refund.booking?.property_type)}</td>
                    <td className="px-4 py-3">{paiseToMoney(grossAmount || 0)}</td>
                    <td className="px-4 py-3">{paiseToMoney(cancellationCharge || 0)}</td>
                    <td className="px-4 py-3">{paiseToMoney(netTaxableCredited || 0)}</td>
                    <td className="px-4 py-3">{paiseToMoney(igstReversed || 0)}</td>
                    <td className="px-4 py-3">{paiseToMoney(cgstReversed || 0)}</td>
                    <td className="px-4 py-3">{paiseToMoney(sgstReversed || 0)}</td>
                    <td className="px-4 py-3 font-black">{paiseToMoney(refund.refund_amount || 0)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{originalInvoiceNo}</td>
                    <td className="px-4 py-3">{accountingDate(refund.original_invoice_date || refund.invoice_date || invoice.invoice_date || invoice.created_at || refund.transaction?.invoice_date)}</td>
                    <td className="px-4 py-3">{displayValue(refund.refund_mode || refund.payment_mode || refund.refund_method || refund.transaction?.payment_method)}</td>
                    <td className="px-4 py-3"><StatusBadge value={refundStatusLabel(refund.status)} /></td>
                    <td className="max-w-[260px] px-4 py-3">{displayValue(refund.credit_note_reason || refund.reason || refund.policy_tier)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 text-xs font-black uppercase text-slate-700">
                        <button type="button" onClick={() => openCreditNote(refund, index)} className="rounded-xl border border-slate-200 px-2.5 py-1">View</button>
                        <button type="button" onClick={() => openCreditNote(refund, index, true)} className="rounded-xl border border-slate-200 px-2.5 py-1">Download</button>
                        <button type="button" onClick={() => showNotice('Credit note is sent automatically to the customer after refund processing.', 'success')} className="rounded-xl border border-slate-200 px-2.5 py-1">Send</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!creditNotes.length && <p className="p-6 text-sm text-slate-500">No credit notes found.</p>}
        </div>
      </Panel>
    </div>
  );
};

const buildPartnerSettlementRows = (data, transactions = [], tdsConfig, paymentConfig = {}) => {
  const config = tdsConfig?.data || tdsConfig || {};
  const brokerTdsRule = partnerTdsRule(config, 'broker');
  const employeeTdsRule = partnerTdsRule(config, 'employee');
  const branchManagerTdsRule = partnerTdsRule(config, 'branch_manager');
  const rows = [];
  const nestedSources = (txn = {}) => [
    txn,
    txn.booking,
    txn.property,
    txn.host,
    txn.user,
    txn.owner,
    txn.transaction,
    txn.booking?.property,
    txn.booking?.host,
    txn.booking?.owner,
    txn.property?.host,
    txn.property?.owner,
  ].filter(Boolean);
  const firstMappedValue = (objects, keys) => {
    for (const source of objects.filter(Boolean)) {
      for (const key of keys) {
        if (hasMappedValue(source?.[key])) return source[key];
      }
    }
    return '';
  };
  const partnerIdentity = (txn = {}, role = 'employee') => {
    const sources = nestedSources(txn);
    if (role === 'broker') {
      const brokerObjects = [txn.broker, txn.booking?.broker, txn.property?.broker, txn.host?.broker, txn.owner?.broker, txn.managed_broker].filter(Boolean);
      const id = firstMappedValue(brokerObjects, ['user_id', 'uid', 'id', 'broker_id', 'broker_code', 'lg_code', 'code'])
        || firstMappedValue(sources, ['broker_id', 'broker_user_id', 'broker_code', 'broker_lg_code', 'mapped_broker_id', 'assigned_broker_id', 'managed_by_broker_id', 'managedByBrokerId', 'first_broker_id']);
      const object = brokerObjects.find((item) => hasMappedValue(item?.user_id) || hasMappedValue(item?.uid) || hasMappedValue(item?.id) || hasMappedValue(item?.broker_id) || hasMappedValue(item?.broker_code) || hasMappedValue(item?.lg_code)) || {};
      const code = firstMappedValue([object, ...sources], ['lg_code', 'lgCode', 'broker_lg_code', 'broker_code', 'brokerCode', 'code', 'employee_code']) || id;
      const name = firstMappedValue([object, ...sources], ['full_name', 'name', 'display_name', 'broker_name', 'brokerName']) || id;
      return { id, code, name, object };
    }
    if (role === 'branch_manager') {
      const bmObjects = [txn.branch_manager, txn.booking?.branch_manager, txn.property?.branch_manager, txn.host?.branch_manager].filter(Boolean);
      const id = firstMappedValue(bmObjects, ['user_id', 'uid', 'id', 'employee_code', 'code'])
        || firstMappedValue(sources, ['branch_manager_id', 'branch_manager_code', 'bm_id', 'bm_code', 'assigned_branch_manager_id']);
      const object = bmObjects.find((item) => hasMappedValue(item?.user_id) || hasMappedValue(item?.uid) || hasMappedValue(item?.id) || hasMappedValue(item?.employee_code)) || {};
      const code = firstMappedValue([object, ...sources], ['employee_code', 'employeeCode', 'branch_manager_code', 'bm_code', 'code']) || id;
      const name = firstMappedValue([object, ...sources], ['full_name', 'name', 'display_name', 'branch_manager_name', 'bm_name']) || id;
      return { id, code, name, object };
    }
    const employeeObjects = [txn.employee, txn.rm, txn.booking?.employee, txn.booking?.rm, txn.property?.employee, txn.property?.rm, txn.host?.employee, txn.host?.rm].filter(Boolean);
    const id = firstMappedValue(employeeObjects, ['user_id', 'uid', 'id', 'employee_code', 'code'])
      || firstMappedValue(sources, ['employee_id', 'employee_user_id', 'rm_id', 'rm_user_id', 'relationship_manager_id', 'mapped_rm_id', 'assigned_rm_id', 'mapped_employee_id', 'assigned_employee_id', 'employee_code', 'rm_code']);
    const object = employeeObjects.find((item) => hasMappedValue(item?.user_id) || hasMappedValue(item?.uid) || hasMappedValue(item?.id) || hasMappedValue(item?.employee_code)) || {};
    const code = firstMappedValue([object, ...sources], ['employee_code', 'employeeCode', 'rm_code', 'relationship_manager_code', 'code']) || id;
    const name = firstMappedValue([object, ...sources], ['full_name', 'name', 'display_name', 'employee_name', 'rm_name', 'relationship_manager_name']) || id;
    return { id, code, name, object };
  };
  const settlementContext = (txn = {}) => {
    const brokerInfo = partnerIdentity(txn, 'broker');
    const employeeInfo = partnerIdentity(txn, 'employee');
    const brokerId = String(brokerInfo.id || '').trim();
    const employeeId = String(employeeInfo.id || '').trim();
    if (brokerId && brokerId !== employeeId && !isEmployeeLikeEntity(brokerInfo.object)) return 'broker_mapped';
    if (employeeId) return 'rm_mapped';
    return platformFeeContextFromTransaction(txn);
  };

  const addRow = ({
    role,
    id,
    name,
    code,
    bookingId,
    propertyId,
    propertyName,
    grossAmount,
    platformFeeAmount,
    commissionPercent,
    commissionGst,
    status,
    source,
    createdAt,
    hostName,
    brokerName,
    employeeName,
    branchManagerName,
  }) => {
    const safeId = id || code || name;
    const gross = Number(grossAmount || 0);
    if (!safeId || !gross || gross <= 0) return;
    const gst = commissionGst || gstSplitFromAmount(gross);
    rows.push({
      settlement_id: `SET-${role.toUpperCase()}-${String(safeId).replace(/[^a-zA-Z0-9]/g, '').slice(-8) || 'NA'}-${String(bookingId || rows.length + 1).replace(/[^a-zA-Z0-9]/g, '').slice(-6)}`,
      role,
      role_label: role === 'broker' ? 'Broker' : role === 'branch_manager' ? 'Branch Manager' : 'Employee / RM',
      id: safeId,
      name: name || safeId,
      code: code || safeId,
      booking_id: bookingId || 'NA',
      property_id: propertyId || 'NA',
      property_name: propertyName || propertyId || 'NA',
      platform_fee_amount: Number(platformFeeAmount || 0),
      commission_percent: Number(commissionPercent || 0),
      commission_amount: gross,
      gross_amount: gross,
      commission_cgst: Number(gst.cgst || 0),
      commission_sgst: Number(gst.sgst || 0),
      commission_igst: Number(gst.igst || 0),
      commission_gst_total: Number(gst.total || 0),
      tds_rate_percent: 0,
      tds_amount: 0,
      net_amount: gross,
      tds_threshold_crossed: false,
      status: settleStatus(status),
      source,
      latest_at: createdAt || '',
      host_search: hostName || '',
      broker_search: brokerName || '',
      employee_search: employeeName || '',
      branch_manager_search: branchManagerName || '',
    });
  };

  (data?.commissions || []).forEach((row) => {
    const broker = row.broker || {};
    const grossAmount = rupeesToPaise(row.commission_amount);
    addRow({
      role: 'broker',
      id: row.broker_id || broker.user_id || broker.uid,
      name: broker.full_name || row.broker_name || row.broker_id,
      code: broker.lg_code || broker.employee_code || broker.uid || row.broker_id,
      bookingId: row.booking_id,
      propertyId: row.property_id,
      propertyName: row.property?.title || row.property_name || row.property_id,
      grossAmount,
      platformFeeAmount: rupeesToPaise(row.platform_fee_amount || row.platform_fee || 0),
      commissionPercent: commissionRuleRate(paymentConfig, 'broker'),
      commissionGst: gstSplitFromAmount(grossAmount),
      status: row.payment_status || row.status,
      source: 'Commission ledger',
      createdAt: row.created_at,
      brokerName: `${broker.full_name || ''} ${row.broker_id || ''} ${broker.lg_code || ''} ${broker.employee_code || ''}`,
    });
  });

  (transactions || []).forEach((txn) => {
    if (txn.type && txn.type !== 'booking_payment') return;

    const bookingStatusText = String(firstPresent(
      txn.booking?.status,
      txn.booking_status,
      txn.status,
      txn.booking?.payment_status,
      txn.payment_status
    ) || '').toLowerCase();
    const cancelledAt = firstPresent(txn.booking?.cancelled_at, txn.cancelled_at, txn.booking?.cancellation_date, txn.cancellation_date);
    const isCancelledBooking = Boolean(cancelledAt) || ['cancelled', 'canceled', 'refund_initiated', 'refunded'].some((status) => bookingStatusText.includes(status));
    if (isCancelledBooking) return;

    const checkInStr = txn.booking?.check_in_date || txn.check_in_date;
    if (!checkInStr) return;
    const checkInDate = new Date(checkInStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(checkInDate.getTime()) || checkInDate > today) return;

    const breakdown = txn.booking_invoice_breakdown || txn.invoice_breakdown || {};
    const baseRupees = Number(
      breakdown.base_amount ??
      breakdown.gross ??
      txn.booking?.host_actual_value ??
      txn.booking?.base_amount ??
      0
    );
    const basePaise = rupeesToPaise(baseRupees);
    const platformFeeContext = settlementContext(txn);
    const platformFeePaise = partnerPlatformFeePaise(txn, basePaise, paymentConfig, platformFeeContext);
    if (platformFeePaise <= 0) return;
    const hostText = `${txn.host?.full_name || ''} ${txn.host?.email || ''} ${txn.host?.phone || ''} ${txn.host_id || ''}`;
    const propertyId = txn.property_id || txn.booking?.property_id || txn.property?.property_id;
    const propertyName = txn.property?.title || txn.property?.property_name || txn.property?.name || propertyId;

    const brokerInfo = partnerIdentity(txn, 'broker');
    const employeeInfo = partnerIdentity(txn, 'employee');
    const branchManagerInfo = partnerIdentity(txn, 'branch_manager');
    const brokerText = `${brokerInfo.name || ''} ${brokerInfo.code || ''}`;
    const employeeText = `${employeeInfo.name || ''} ${employeeInfo.code || ''}`;
    const branchText = `${branchManagerInfo.name || ''} ${branchManagerInfo.code || ''}`;
    const hasBrokerSettlement = Boolean(brokerInfo.id) && !isEmployeeLikeEntity(brokerInfo.object);
    const brokerAmount = firstPresent(
      txn.broker_commission_amount,
      txn.broker_commission,
      txn.booking?.broker_commission_amount,
      txn.booking?.broker_commission
    );
    const brokerRate = commissionRuleRate(paymentConfig, 'broker');
    const brokerConfigured = commissionRuleEnabled(paymentConfig, 'broker');
    const isBrokerFirst = platformFeeContext === 'broker_mapped' && hasBrokerSettlement;
    const brokerAmountPaise = brokerConfigured
      ? partnerCommissionFromPlatformFee(platformFeePaise, brokerRate)
      : moneyFromMixed(brokerAmount, platformFeePaise);
    if (hasBrokerSettlement && isBrokerFirst && brokerConfigured && brokerAmountPaise > 0) {
      addRow({
        role: 'broker',
        id: brokerInfo.id,
        name: brokerInfo.name,
        code: brokerInfo.code,
        bookingId: txn.booking_id || txn.booking?.booking_id,
        propertyId,
        propertyName,
        grossAmount: brokerAmountPaise,
        platformFeeAmount: platformFeePaise,
        commissionPercent: brokerRate,
        commissionGst: { cgst: 0, sgst: 0, igst: 0, total: 0 },
        status: txn.broker_commission_status || 'pending',
        source: brokerConfigured ? 'Calculated from configured rate' : 'Transaction ledger',
        createdAt: txn.created_at,
        hostName: hostText,
        brokerName: brokerText,
        branchManagerName: branchText,
      });
    }

    const employeeAmount = firstPresent(
      txn.employee_commission_amount,
      txn.employee_commission,
      txn.rm_commission_amount,
      txn.rm_commission,
      txn.booking?.employee_commission_amount,
      txn.booking?.rm_commission_amount
    );
    const employeeRate = commissionRuleRate(paymentConfig, 'employee');
    const employeeConfigured = commissionRuleEnabled(paymentConfig, 'employee');
    const isEmployeeFirst = platformFeeContext === 'rm_mapped' && Boolean(employeeInfo.id);
    const employeeAmountPaise = employeeConfigured
      ? partnerCommissionFromPlatformFee(platformFeePaise, employeeRate)
      : moneyFromMixed(employeeAmount, platformFeePaise);
    if (isEmployeeFirst && employeeInfo.id && employeeConfigured && employeeAmountPaise > 0) {
      addRow({
        role: 'employee',
        id: employeeInfo.id,
        name: employeeInfo.name,
        code: employeeInfo.code,
        bookingId: txn.booking_id || txn.booking?.booking_id,
        propertyId,
        propertyName,
        grossAmount: employeeAmountPaise,
        platformFeeAmount: platformFeePaise,
        commissionPercent: employeeRate,
        commissionGst: { cgst: 0, sgst: 0, igst: 0, total: 0 },
        status: txn.employee_commission_status || 'pending',
        source: employeeConfigured ? 'Calculated from configured rate' : 'Transaction ledger',
        createdAt: txn.created_at,
        hostName: hostText,
        employeeName: employeeText,
        branchManagerName: branchText,
      });
    }

    const branchManagerRate = commissionRuleRate(paymentConfig, 'branch_manager');
    const branchManagerConfigured = commissionRuleEnabled(paymentConfig, 'branch_manager');
    const branchManagerAmount = firstPresent(
      txn.branch_manager_commission_amount,
      txn.branch_manager_commission,
      txn.booking?.branch_manager_commission_amount,
      txn.booking?.branch_manager_commission
    );
    const branchManagerAmountPaise = branchManagerConfigured
      ? partnerCommissionFromPlatformFee(platformFeePaise, branchManagerRate)
      : moneyFromMixed(branchManagerAmount, platformFeePaise);
    const isBranchManagerOnly = platformFeeContext === 'branch_manager_mapped' || (!brokerInfo.id && !employeeInfo.id && branchManagerInfo.id);
    if (isBranchManagerOnly && branchManagerInfo.id && branchManagerConfigured && branchManagerAmountPaise > 0) {
      addRow({
        role: 'branch_manager',
        id: branchManagerInfo.id,
        name: branchManagerInfo.name,
        code: branchManagerInfo.code,
        bookingId: txn.booking_id || txn.booking?.booking_id,
        propertyId,
        propertyName,
        grossAmount: branchManagerAmountPaise,
        platformFeeAmount: platformFeePaise,
        commissionPercent: branchManagerRate,
        commissionGst: { cgst: 0, sgst: 0, igst: 0, total: 0 },
        status: txn.branch_manager_commission_status || 'pending',
        source: branchManagerConfigured ? 'Calculated from configured rate' : 'Transaction ledger',
        createdAt: txn.created_at,
        hostName: hostText,
        branchManagerName: branchText,
      });
    }
  });

  const ascendingRows = [...rows].sort((a, b) => new Date(a.latest_at || 0) - new Date(b.latest_at || 0));
  const grossByPayee = new Map();
  ascendingRows.forEach((row) => {
    if (row.role === 'employee' || row.role === 'branch_manager') {
      row.commission_cgst = 0;
      row.commission_sgst = 0;
      row.commission_igst = 0;
      row.commission_gst_total = 0;
      row.tds_rate_percent = 0;
      row.tds_amount = 0;
      row.net_amount = Number(row.gross_amount || 0);
      row.tds_threshold_amount = 0;
      row.tds_fy_gross_before = 0;
      row.tds_fy_gross_after = 0;
      row.tds_threshold_crossed = false;
      row.tds_note = 'Not applicable';
      return;
    }
    const rule = row.role === 'broker' ? brokerTdsRule : row.role === 'branch_manager' ? (branchManagerTdsRule || employeeTdsRule) : employeeTdsRule;
    const threshold = Number(rule.thresholds?.individual_huf ?? rule.thresholds?.other_entity ?? 0) * 100;
    const key = `${row.role}:${row.id}`;
    const priorGross = grossByPayee.get(key) || 0;
    const projectedGross = priorGross + Number(row.gross_amount || 0);
    const active = Boolean(rule.is_enabled) && dateWithinRule(row.latest_at, rule);
    const thresholdCrossed = threshold <= 0 || projectedGross > threshold;
    const tdsRate = active && thresholdCrossed ? Number(rule.rate_percent || 0) : 0;
    const rawTds = Number(row.gross_amount || 0) * (tdsRate / 100);
    const tds = roundTdsAmount(rawTds, rule.rounding_method);

    row.tds_rate_percent = tdsRate;
    row.tds_amount = tds;
    row.net_amount = Math.max(0, Number(row.gross_amount || 0) - Number(row.commission_gst_total || 0) - tds);
    row.tds_threshold_amount = threshold;
    row.tds_fy_gross_before = priorGross;
    row.tds_fy_gross_after = projectedGross;
    row.tds_threshold_crossed = thresholdCrossed;
    row.tds_note = !active ? 'TDS disabled or outside effective date' : (thresholdCrossed ? 'Threshold crossed' : 'Threshold not crossed');
    grossByPayee.set(key, projectedGross);
  });

  return ascendingRows.sort((a, b) => new Date(b.latest_at || 0) - new Date(a.latest_at || 0));
};

const buildPartnerSummaryRows = (rows = []) => {
  const grouped = new Map();
  rows.forEach((item) => {
    const id = item.id || item.code || item.name;
    if (!id) return;
    if (!grouped.has(id)) {
      grouped.set(id, {
        id,
        role: item.role,
        name: item.name || id,
        code: item.code || id,
        bookings: new Set(),
        properties: new Set(),
        gross_amount: 0,
        commission_gst_total: 0,
        tds_amount: 0,
        net_amount: 0,
        pending_amount: 0,
        approved_amount: 0,
        paid_amount: 0,
        failed_amount: 0,
        latest_at: '',
        decision_status: item.decision_status || '',
      });
    }
    const row = grouped.get(id);
    const status = settleStatus(item.status);
    const net = Number(item.net_amount || 0);
    row.bookings.add(item.booking_id || `row-${row.bookings.size + 1}`);
    row.properties.add(item.property_id || item.property_name || 'NA');
    row.gross_amount += Number(item.gross_amount || item.commission_amount || 0);
    row.commission_gst_total += Number(item.commission_gst_total || 0);
    row.tds_amount += Number(item.tds_amount || 0);
    row.net_amount += net;
    row[statusAmountBucket(status)] += net;
    if (item.decision_status) row.decision_status = item.decision_status;
    if (!row.latest_at || new Date(item.latest_at || 0) > new Date(row.latest_at || 0)) row.latest_at = item.latest_at || '';
  });
  return Array.from(grouped.values()).map((row) => ({
    ...row,
    booking_count: row.bookings.size,
    property_count: row.properties.size,
  })).sort((a, b) => Number(b.net_amount || 0) - Number(a.net_amount || 0));
};

const PartnerSettlementTable = ({ title, rows, emptyText, codeLabel, compactPayout = false, hideSource = false, showInvoice = false }) => {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [rows.length]);
  const pageRows = rows.slice((page - 1) * 10, page * 10);
  const headers = compactPayout
    ? ['Settlement ID', 'Name', codeLabel, 'Booking ID', 'Property', 'Platform Fee', 'Comm. %', 'Comm. Amount', 'Net Payable', 'Status']
    : ['Settlement ID', 'Name', codeLabel, 'Booking ID', 'Property', 'Platform Fee', 'Comm. %', 'Comm. Amount', 'CGST', 'SGST', 'IGST', 'TDS Rate', 'TDS', 'Net Payable', ...(hideSource ? [] : ['Source']), 'Status', ...(showInvoice ? ['Invoice'] : [])];
  return (
    <Panel className="overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <h2 className="font-black">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className={`w-full ${compactPayout ? 'min-w-[1180px]' : 'min-w-[1760px]'} text-left text-sm`}>
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>{headers.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.map((row) => (
              <tr key={row.settlement_id}>
                <td className="px-4 py-3"><p className="font-mono text-xs font-bold">{row.settlement_id}</p><p className="text-xs text-slate-500">{shortDate(row.latest_at)}</p></td>
                <td className="px-4 py-3 font-bold">{row.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                <td className="px-4 py-3 font-mono text-xs">{row.booking_id}</td>
                <td className="px-4 py-3"><p className="font-bold">{row.property_name}</p><p className="font-mono text-xs text-slate-500">{row.property_id}</p></td>
                <td className="px-4 py-3">{formatRoundedMoney(row.platform_fee_amount || 0)}</td>
                <td className="px-4 py-3 font-bold">{row.commission_percent ? `${row.commission_percent}%` : '-'}</td>
                <td className="px-4 py-3 font-black">{formatRoundedMoney(row.commission_amount || row.gross_amount || 0)}</td>
                {!compactPayout && <td className="px-4 py-3">{formatRoundedMoney(row.commission_cgst || 0)}</td>}
                {!compactPayout && <td className="px-4 py-3">{formatRoundedMoney(row.commission_sgst || 0)}</td>}
                {!compactPayout && <td className="px-4 py-3">{formatRoundedMoney(row.commission_igst || 0)}</td>}
                {!compactPayout && <td className="px-4 py-3"><p>{row.tds_rate_percent || 0}%</p><p className="text-xs text-slate-500">{row.tds_note || '-'}</p></td>}
                {!compactPayout && <td className="px-4 py-3 text-red-700"><p>{formatRoundedMoney(row.tds_amount || 0)}</p><p className="text-xs text-slate-500">FY: {formatRoundedMoney(row.tds_fy_gross_after || 0)}</p></td>}
                <td className="px-4 py-3 font-black">{formatRoundedMoney(row.net_amount || 0)}</td>
                {!compactPayout && !hideSource && <td className="px-4 py-3 text-xs font-semibold text-slate-500">{row.source}</td>}
                <td className="px-4 py-3"><StatusBadge value={row.status} /></td>
                {showInvoice && (
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={!['approved', 'paid', 'processed', 'success', 'completed'].includes(settleStatus(row.status))}
                      onClick={() => openBrokerSettlementInvoice(row)}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-40"
                    >
                      Invoice
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="p-6 text-sm text-slate-500">{emptyText}</p>}
      </div>
      <Pagination currentPage={page} totalItems={rows.length} itemsPerPage={10} onPageChange={setPage} />
    </Panel>
  );
};

const BrokerEmployeeSettlementWorkspace = ({ data, transactions, tdsConfig, paymentConfig }) => {
  const [filters, setFilters] = useState({ from: '', to: '', host: '', broker: '', employee: '', branchManager: '' });
  const [partnerDecisions, setPartnerDecisions] = useState({});
  const rows = useMemo(() => buildPartnerSettlementRows(data, transactions, tdsConfig, paymentConfig), [data, transactions, tdsConfig, paymentConfig]);
  const decisionRows = useMemo(() => rows.map((row) => {
    const key = `${row.role}:${row.id}`;
    const decision = partnerDecisions[key];
    return decision ? { ...row, status: decision, decision_status: decision } : row;
  }), [rows, partnerDecisions]);
  const filteredRows = useMemo(() => decisionRows.filter((row) => (
    withinDateRange(row.latest_at, filters.from, filters.to)
    && containsText(row.host_search, filters.host)
    && containsText(`${row.name} ${row.code} ${row.broker_search}`, filters.broker)
    && containsText(`${row.name} ${row.code} ${row.employee_search}`, filters.employee)
    && containsText(row.branch_manager_search, filters.branchManager)
  )), [decisionRows, filters]);
  const brokerRows = filteredRows.filter((row) => row.role === 'broker');
  const employeeRows = filteredRows.filter((row) => row.role === 'employee');
  const branchManagerRows = filteredRows.filter((row) => row.role === 'branch_manager');
  const brokerSummaryRows = useMemo(() => buildPartnerSummaryRows(brokerRows), [brokerRows]);
  const employeeSummaryRows = useMemo(() => buildPartnerSummaryRows(employeeRows), [employeeRows]);
  const branchManagerSummaryRows = useMemo(() => buildPartnerSummaryRows(branchManagerRows), [branchManagerRows]);
  const totals = filteredRows.reduce((acc, row) => {
    const grossAmount = Number(row.gross_amount || 0);
    const netAmount = Number(row.net_amount || 0);
    acc.gross += grossAmount;
    acc.gst += Number(row.commission_gst_total || 0);
    acc.tds += Number(row.tds_amount || 0);
    acc.net += netAmount;
    if (row.role === 'broker') {
      acc.brokers.add(row.id);
      acc.brokerCommission += grossAmount;
    }
    if (row.role === 'employee') {
      acc.employees.add(row.id);
      acc.employeeCommission += grossAmount;
    }
    if (row.role === 'branch_manager') acc.branchManagers.add(row.id);
    if (['pending', 'eligible', 'needs_destination', 'hold', 'failed'].includes(row.status)) acc.pending += netAmount;
    if (['approved', 'processing'].includes(row.status)) acc.approved += netAmount;
    if (['processed', 'paid', 'success', 'completed'].includes(row.status)) acc.paid += netAmount;
    if (['failed', 'hold', 'cancelled', 'rejected'].includes(row.status)) acc.failed += netAmount;
    acc.bookings.add(row.booking_id);
    acc.properties.add(row.property_id);
    return acc;
  }, { gross: 0, gst: 0, tds: 0, net: 0, brokerCommission: 0, employeeCommission: 0, pending: 0, approved: 0, paid: 0, failed: 0, brokers: new Set(), employees: new Set(), branchManagers: new Set(), bookings: new Set(), properties: new Set() });
  const activeRmEmployees = totals.employees.size + totals.branchManagers.size;
  const kpiCards = [
    { label: 'Total Brokers', value: totals.brokers.size, note: 'Active brokers', accent: 'border-l-slate-800', Icon: Users },
    { label: 'Total RM / Employees', value: activeRmEmployees, note: `${totals.employees.size} RM / ${totals.branchManagers.size} branch managers`, accent: 'border-l-emerald-600', Icon: Users },
    { label: 'Total Bookings', value: totals.bookings.size, note: 'Partner-sourced bookings', accent: 'border-l-slate-800', Icon: CalendarCheck },
    { label: 'Gross Booking Value', value: formatMoney(totals.gross), note: 'Total commission base', accent: 'border-l-amber-600', Icon: IndianRupee },
    { label: 'Total Broker Commission', value: formatMoney(totals.brokerCommission), note: 'GST on commission', accent: 'border-l-amber-600', Icon: ReceiptText },
    { label: 'Total RM / Employee Commission', value: formatMoney(totals.employeeCommission), note: 'GST on commission', accent: 'border-l-emerald-600', Icon: ReceiptText },
    { label: 'TDS Deducted', value: formatMoney(totals.tds), note: 'Sec 194H @ configured rate', accent: 'border-l-amber-600', Icon: ReceiptText },
    { label: 'Total GST', value: formatMoney(totals.gst), note: 'GST on commission', accent: 'border-l-amber-600', Icon: ReceiptText },
    { label: 'Pending Payout', value: formatMoney(totals.pending), note: 'Waiting for approval', accent: 'border-l-amber-600', Icon: Hourglass },
    { label: 'Approved Payout', value: formatMoney(totals.approved), note: 'Ready for payment', accent: 'border-l-slate-800', Icon: ShieldCheck },
    { label: 'Paid Payout', value: formatMoney(totals.paid), note: 'Payment completed', accent: 'border-l-emerald-600', Icon: Wallet },
    { label: 'Failed / Hold Payout', value: formatMoney(totals.failed), note: 'Retry or review needed', accent: 'border-l-red-600', Icon: Ban },
    { label: 'Net Payout', value: formatMoney(totals.net), note: 'Final payable amount', accent: 'border-l-slate-800', Icon: IndianRupee },
  ];
  const dropdownOptions = useMemo(() => ({
    hosts: uniqueFilterOptions(rows, (row) => ({ value: row.host_search, label: row.host_search })),
    brokers: uniqueFilterOptions(rows.filter((row) => row.role === 'broker'), (row) => ({ value: `${row.name} ${row.code} ${row.broker_search}`, label: `${row.name} - ${row.code}` })),
    employees: uniqueFilterOptions(rows.filter((row) => row.role === 'employee'), (row) => ({ value: `${row.name} ${row.code} ${row.employee_search}`, label: `${row.name} - ${row.code}` })),
    branchManagers: uniqueFilterOptions(rows, (row) => ({ value: row.branch_manager_search, label: row.branch_manager_search })),
  }), [rows]);
  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const clearFilters = () => setFilters({ from: '', to: '', host: '', broker: '', employee: '', branchManager: '' });
  const updatePartnerDecision = (row, status) => {
    setPartnerDecisions((current) => ({ ...current, [`${row.role}:${row.id}`]: status }));
    showNotice(`${row.name} settlement ${status === 'approved' ? 'approved' : 'rejected'}.`, status === 'approved' ? 'success' : 'warning');
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
        {kpiCards.map(({ label, value, note, accent, Icon }) => (
          <Panel key={label} className={`min-h-[118px] border-l-4 ${accent} p-4 shadow-sm`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
                <p className="mt-2 text-[22px] font-black text-slate-950">{value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{note}</p>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <Icon size={18} />
              </span>
            </div>
          </Panel>
        ))}
      </div>
      <Panel className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-black">Search & Filter Broker / Employee Settlements</h2>
            <p className="text-xs text-slate-500">Filter partner payouts by date, host, broker, RM and branch manager.</p>
          </div>
          <button onClick={clearFilters} className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">Clear Filters</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">From Date<input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-semibold normal-case tracking-normal outline-none" /></label>
          <label className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">To Date<input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm font-semibold normal-case tracking-normal outline-none" /></label>
          <FilterSelect label="Host" value={filters.host} onChange={(value) => updateFilter('host', value)} options={dropdownOptions.hosts} placeholder="All Hosts" />
          <FilterSelect label="Broker" value={filters.broker} onChange={(value) => updateFilter('broker', value)} options={dropdownOptions.brokers} placeholder="All Brokers" />
          <FilterSelect label="RM / Employee" value={filters.employee} onChange={(value) => updateFilter('employee', value)} options={dropdownOptions.employees} placeholder="All RM / Employees" />
          <FilterSelect label="Branch Manager" value={filters.branchManager} onChange={(value) => updateFilter('branchManager', value)} options={dropdownOptions.branchManagers} placeholder="All Branch Managers" />
        </div>
      </Panel>
      <SettlementSummaryTable
        title="Broker Wise Settlement"
        rows={brokerSummaryRows}
        emptyText="No broker settlement totals found."
        codeLabel="Broker Code"
        baseLabel="Comm. Amount"
        amountLabel="Net Payable"
        baseMoney={formatRoundedMoney}
        amountMoney={formatRoundedMoney}
        taxMoney={formatRoundedMoney}
        extraColumn={{ key: 'commission_gst_total', label: 'GST', money: formatRoundedMoney }}
        showPaid={false}
        showLatestDate={false}
        showActions
        onApprove={(row) => updatePartnerDecision(row, 'approved')}
        onReject={(row) => updatePartnerDecision(row, 'rejected')}
      />
      <PartnerSettlementTable title="Broker Booking / Property Details" rows={brokerRows} emptyText="No broker settlement records found." codeLabel="Broker Code" hideSource showInvoice />
      <SettlementSummaryTable
        title="Employee / RM Wise Settlement"
        rows={employeeSummaryRows}
        emptyText="No employee settlement totals found."
        codeLabel="Employee / RM Code"
        baseLabel="Comm. Amount"
        amountLabel="Net Payable"
        baseMoney={formatRoundedMoney}
        amountMoney={formatRoundedMoney}
        taxMoney={formatRoundedMoney}
        showTds={false}
        showPaid={false}
        showLatestDate={false}
        showActions
        onApprove={(row) => updatePartnerDecision(row, 'approved')}
        onReject={(row) => updatePartnerDecision(row, 'rejected')}
      />
      <PartnerSettlementTable title="Employee / RM Booking / Property Details" rows={employeeRows} emptyText="No employee settlement records found." codeLabel="Employee / RM Code" compactPayout />
      <SettlementSummaryTable
        title="Branch Manager Wise Settlement"
        rows={branchManagerSummaryRows}
        emptyText="No branch manager settlement totals found."
        codeLabel="Branch Manager Code"
        baseLabel="Comm. Amount"
        amountLabel="Net Payable"
        baseMoney={formatRoundedMoney}
        amountMoney={formatRoundedMoney}
        taxMoney={formatRoundedMoney}
        showTds={false}
        showPaid={false}
        showLatestDate={false}
        showActions
        onApprove={(row) => updatePartnerDecision(row, 'approved')}
        onReject={(row) => updatePartnerDecision(row, 'rejected')}
      />
      <PartnerSettlementTable title="Branch Manager Booking / Property Details" rows={branchManagerRows} emptyText="No branch manager settlement records found." codeLabel="Branch Manager Code" compactPayout />
    </div>
  );
};

const TaxesWorkspace = ({ data }) => {
  const summary = data?.summary || {};
  const taxLedger = data?.tax_ledger || [];
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [taxLedger.length]);
  const rows = taxLedger.slice((page - 1) * 10, page * 10);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Booking GST', formatMoney(summary.booking_gst || 0)],
          ['Subscription GST', formatMoney(summary.subscription_gst || 0)],
          ['Host TDS Hold', formatMoney(summary.tds_hold || 0)],
        ['Total Tax Reserve', formatMoney((summary.booking_gst || 0) + (summary.subscription_gst || 0) + (summary.tds_hold || 0))],
      ].map(([label, value]) => <Panel key={label} className="p-5"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 text-[20px] font-black text-slate-950">{value}</p></Panel>)}
      </div>
      <Panel className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-black">Tax Ledger</h2>
            <p className="text-xs text-slate-500">GST and TDS reserve calculated from existing successful transactions and payout holds.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Tax ID', 'Type', 'Taxable Amount', 'Rate', 'Tax Amount', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => <tr key={row.tax_id}><td className="px-4 py-3 font-mono text-xs font-bold">{row.tax_id}</td><td className="px-4 py-3">{row.tax_type}</td><td className="px-4 py-3">{formatMoney(row.taxable_amount || 0)}</td><td className="px-4 py-3">{row.tax_rate}%</td><td className="px-4 py-3 font-black">{formatMoney(row.tax_amount || 0)}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td></tr>)}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalItems={taxLedger.length} itemsPerPage={10} onPageChange={setPage} />
      </Panel>
    </div>
  );
};

const CommissionWorkspace = ({ data, payouts, busy, onProcessHost }) => {
  const summary = data?.summary || {};
  const commissions = data?.commissions || [];
  const hostPending = (payouts || []).filter((row) => ['eligible', 'failed', 'needs_destination'].includes(row.status));

  const [pageHost, setPageHost] = useState(1);
  const [pageBroker, setPageBroker] = useState(1);
  useEffect(() => { setPageHost(1); }, [hostPending.length]);
  useEffect(() => { setPageBroker(1); }, [commissions.length]);
  const rowsHost = hostPending.slice((pageHost - 1) * 10, pageHost * 10);
  const rowsBroker = commissions.slice((pageBroker - 1) * 10, pageBroker * 10);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Platform Commission', formatMoney(summary.platform_commission || 0)],
          ['Broker Commission Total', formatMoney(summary.broker_commission_total || 0)],
          ['Broker Commission Paid', formatMoney(summary.broker_commission_paid || 0)],
          ['Broker Commission Pending', formatMoney(summary.broker_commission_pending || 0)],
        ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
      </div>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Host Commission / Settlement Payable</h2>
          <p className="text-xs text-slate-500">Host la payable amount process karnyasathi eligible payout queue.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Host', 'Booking', 'Gross', 'Platform Commission', 'TDS', 'Host Payable', 'Status', 'Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rowsHost.map((payout) => (
                <tr key={payout.payout_id}>
                  <td className="px-4 py-3 font-bold">{payout.host?.full_name || payout.host_id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{payout.booking_id}</td>
                  <td className="px-4 py-3">{formatMoney(payout.gross_amount || 0)}</td>
                  <td className="px-4 py-3">{formatMoney(payout.platform_fee || 0)}</td>
                  <td className="px-4 py-3">{formatMoney(payout.tds_amount || 0)}</td>
                  <td className="px-4 py-3 font-black">{formatMoney(payout.net_amount || 0)}</td>
                  <td className="px-4 py-3"><StatusBadge value={payout.status} /></td>
                  <td className="px-4 py-3"><button disabled={busy === payout.payout_id || payout.status === 'needs_destination'} onClick={() => onProcessHost(payout)} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 disabled:opacity-40">Pay Host</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!hostPending.length && <p className="p-6 text-sm text-slate-500">No host commission/payable rows pending.</p>}
        </div>
        <Pagination currentPage={pageHost} totalItems={hostPending.length} itemsPerPage={10} onPageChange={setPageHost} />
      </Panel>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Broker Commission Ledger</h2>
          <p className="text-xs text-slate-500">Track broker commission payable booking-wise.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Commission', 'Broker', 'Booking', 'Property', 'Booking Amount', 'Rate', 'Commission', 'Payment Ref', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rowsBroker.map((row) => (
                <tr key={row.commission_id}>
                  <td className="px-4 py-3"><p className="font-mono text-xs font-bold">{row.commission_id}</p><p className="text-xs text-slate-500">{String(row.created_at || '-').slice(0, 10)}</p></td>
                  <td className="px-4 py-3"><p className="font-bold">{row.broker?.full_name || row.broker_id}</p><p className="text-xs text-slate-500">{row.broker?.email || '-'}</p></td>
                  <td className="px-4 py-3 font-mono text-xs">{row.booking_id}</td>
                  <td className="px-4 py-3">{row.property_id}</td>
                  <td className="px-4 py-3">{formatRoundedMoney(row.booking_amount || 0)}</td>
                  <td className="px-4 py-3">{row.commission_percentage || 0}%</td>
                  <td className="px-4 py-3 font-black">{formatRoundedMoney(row.commission_amount || 0)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.payment_reference || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge value={row.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!commissions.length && <p className="p-6 text-sm text-slate-500">No broker commission records found.</p>}
        </div>
        <Pagination currentPage={pageBroker} totalItems={commissions.length} itemsPerPage={10} onPageChange={setPageBroker} />
      </Panel>
    </div>
  );
};

const ReportsConfigWorkspace = ({ transactions, paymentConfig, autoStatus, onExport, onShare, onSavePaymentConfig }) => (
  <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {[
        ['Gateway', paymentConfig?.provider || 'razorpay'],
        ['Mode', paymentConfig?.is_mock ? 'Mock' : 'Live'],
        ['Platform Fee', `${paymentConfig?.platform_fee_percent ?? '-'}%`],
        ['Payout Batch Limit', autoStatus?.batch_limit || '-'],
        ].map(([label, value]) => <Panel key={label} className="p-5"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-2 text-[20px] font-black capitalize text-slate-950">{value}</p></Panel>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-black">Invoices & Finance Reports</h2>
            <p className="text-xs text-slate-500">Export ledger CSV and share generated invoice references for finance records.</p>
          </div>
          <button onClick={onExport} className="rounded-2xl bg-[#2f6df6] px-3.5 py-2.5 text-xs font-black text-white">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Invoice', 'Transaction', 'Type', 'Customer', 'Amount', 'Status', 'Share'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((txn) => (
                <tr key={txn.transaction_id}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{displayTransactionInvoiceNo(txn)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{txn.transaction_id}</td>
                  <td className="px-4 py-3 capitalize">{String(txn.type || '-').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{txn.customer?.full_name || txn.host?.full_name || txn.user_id || txn.host_id || '-'}</td>
                  <td className="px-4 py-3 font-black">{paiseToMoney(txn.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge value={txn.status} /></td>
                  <td className="px-4 py-3"><button onClick={() => onShare(txn)} className="rounded-xl bg-[#eef5ff] px-2.5 py-1.5 text-xs font-bold text-[#2f6df6]">Share</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!transactions.length && <p className="p-6 text-sm text-slate-500">No invoice records found.</p>}
        </div>
      </Panel>
      <div className="space-y-4">
        <Panel className="p-4">
          <h2 className="font-black">Finance Configuration</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <Info label="Payment Provider" value={paymentConfig?.provider || 'razorpay'} />
            <Info label="Currency" value={paymentConfig?.currency || 'INR'} />
            <Info label="Razorpay Mode" value={paymentConfig?.is_mock ? 'Mock' : 'Live'} />
            <Info label="Platform Fee Label" value={paymentConfig?.platform_fee_label || '-'} />
            <Info label="Platform Fee Percent" value={`${paymentConfig?.platform_fee_percent ?? '-'}%`} />
          </div>
          <button onClick={onSavePaymentConfig} className="mt-4 w-full rounded-2xl bg-[#2f6df6] px-3 py-2.5 text-xs font-black text-white">Update Payment Fee Config</button>
        </Panel>
        <Panel className="p-4">
          <h2 className="font-black">Payout Configuration</h2>
          <div className="mt-3 grid gap-2 text-sm">
            <Info label="Auto Payout" value={autoStatus?.auto_payout_enabled ? 'Enabled' : 'Disabled'} />
            <Info label="Sweep Interval" value={`${autoStatus?.interval_seconds || 0}s`} />
            <Info label="Batch Limit" value={autoStatus?.batch_limit || 0} />
            <Info label="Mode" value={autoStatus?.payouts_are_mock ? 'Mock' : 'Live'} />
          </div>
        </Panel>
      </div>
    </div>
  </div>
);

const QueuePanel = ({ title, rows, idKey, amountKey }) => (
  <Panel className="overflow-hidden">
    <div className="border-b border-slate-200 p-4"><h2 className="font-black">{title}</h2></div>
    <div className="divide-y divide-slate-100">
      {rows.slice(0, 6).map((row) => <div key={row[idKey]} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 p-3 text-sm"><span className="font-mono text-xs font-bold">{row[idKey]}</span><span className="font-bold">{formatMoney(row[amountKey] || 0)}</span><StatusBadge value={row.status} /></div>)}
      {!rows.length && <p className="p-5 text-sm text-slate-500">No records found.</p>}
    </div>
  </Panel>
);

export default FinanceSettlements;

