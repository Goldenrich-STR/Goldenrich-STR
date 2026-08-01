import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, FileText, PlayCircle, RefreshCcw, Search, TrendingUp, WalletCards } from 'lucide-react';
import { adminPhase1API } from '../../services/adminPhase1Api';
import { ErrorState, LoadingState, PageHeader, Panel, StatusBadge, formatMoney, requestReason } from './shared';
import { AdminAccountTransactionsTab } from '../AdminAccount';

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
  ['refunds', 'Refunds & Cancellations'],
  ['tax_commission', 'Taxes'],
  ['commissions', 'Commissions'],
  ['transactions_ledger', 'Transactions'],
  ['reports_config', 'Invoices & Config'],
];

const paiseToMoney = (value) => formatMoney(Number(value || 0) / 100);
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

const FinanceSettlements = () => {
  const [state, setState] = useState({ loading: true, error: '', overview: null, transactions: [], payouts: [], refunds: [], autoStatus: null, taxCommission: null, paymentConfig: null });
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('overview');
  const [payoutStatus, setPayoutStatus] = useState('');
  const [refundStatus, setRefundStatus] = useState('');
  const [busy, setBusy] = useState('');
  const [policyPreview, setPolicyPreview] = useState(null);

  const load = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true }));
      const [overview, transactions, payouts, refunds, autoStatus, taxCommission, paymentConfig] = await Promise.all([
        adminPhase1API.financeOverview(),
        adminPhase1API.financeTransactions({ q: search, limit: 8 }),
        adminPhase1API.financePayouts({ status: payoutStatus, limit: active === 'settlements' ? 100 : 8 }),
        adminPhase1API.financeRefunds({ status: refundStatus, limit: active === 'refunds' ? 100 : 8 }),
        adminPhase1API.financePayoutAutoStatus(),
        adminPhase1API.financeTaxCommission(),
        adminPhase1API.paymentConfig(),
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
      window.alert(error.response?.data?.detail || 'Payout action failed');
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
      window.alert(error.response?.data?.detail || 'Failed to process payout');
    } finally {
      setBusy('');
    }
  };

  const initiateRefund = async () => {
    const bookingId = window.prompt('Booking ID for refund');
    if (!bookingId) return;
    const reason = await requestReason({ title: 'Refund Reason', description: `Initiating refund for booking ${bookingId}.`, placeholder: 'Add refund reason.', minLength: 3 });
    if (!reason) return;
    const overridePercentRaw = window.prompt('Override percent, blank to use policy');
    const overrideAmountRaw = !overridePercentRaw ? window.prompt('Override amount in INR, blank to use policy') : '';
    const payload = { reason };
    if (overridePercentRaw) payload.override_percent = Number(overridePercentRaw);
    if (overrideAmountRaw) payload.override_amount = Math.round(Number(overrideAmountRaw) * 100);
    try {
      setBusy('refund');
      await adminPhase1API.initiateFinanceRefund(bookingId, payload);
      await load();
    } catch (error) {
      window.alert(error.response?.data?.detail || 'Failed to initiate refund');
    } finally {
      setBusy('');
    }
  };

  const previewRefundPolicy = async () => {
    const check_in_date = window.prompt('Check-in date YYYY-MM-DD');
    if (!check_in_date) return;
    const totalAmount = window.prompt('Total booking amount in INR');
    if (!totalAmount) return;
    try {
      const res = await adminPhase1API.financeRefundPolicyPreview({ check_in_date, total_amount: totalAmount });
      setPolicyPreview(res.data);
    } catch (error) {
      window.alert(error.response?.data?.detail || 'Failed to preview refund policy');
    }
  };

  const exportTransactions = async () => {
    try {
      const res = await adminPhase1API.exportFinanceTransactions({ q: search });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `xspace360-finance-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      window.alert(error.response?.data?.detail || 'Failed to export finance report');
    }
  };

  const shareInvoice = async (transaction) => {
    const channel = window.prompt('Share invoice via whatsapp or email', 'email');
    if (!channel) return;
    try {
      await adminPhase1API.shareFinanceInvoice(transaction.transaction_id, channel);
      window.alert('Invoice share request completed');
    } catch (error) {
      window.alert(error.response?.data?.detail || 'Failed to share invoice');
    }
  };

  const savePaymentConfig = async () => {
    const current = state.paymentConfig || {};
    const platform_fee_percent = window.prompt('Platform fee percent', current.platform_fee_percent ?? 10);
    if (platform_fee_percent === null) return;
    const platform_fee_label = window.prompt('Platform fee label', current.platform_fee_label || 'Premium Service Fee');
    if (platform_fee_label === null) return;
    try {
      await adminPhase1API.updatePaymentConfig({ platform_fee_percent: Number(platform_fee_percent), platform_fee_label });
      await load();
    } catch (error) {
      window.alert(error.response?.data?.detail || 'Failed to update payment config');
    }
  };

  return (
    <div>
      <PageHeader title="Finance & Settlements" description="Central finance overview for revenue, host settlements, refunds, tax liability, broker commission and invoice operations." />
      <Panel className="mb-4 p-3">
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {workspaceTabs.map(([id, label]) => <button key={id} onClick={() => setActive(id)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${active === id ? 'bg-terracotta text-charcoal' : 'bg-slate-100 text-slate-600'}`}>{label}</button>)}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 w-full bg-transparent text-sm outline-none" placeholder="Search transaction, booking, host, property or payment reference" />
        </div>
      </Panel>
      {state.loading ? <LoadingState /> : state.error ? <ErrorState message={state.error} /> : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {cards.map(([label, value, Icon, sub]) => (
              <Panel key={label} className="p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-terracotta/10 text-terracotta"><Icon className="h-4 w-4" /></div>
                <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black">{value}</p>
                <p className="mt-1 text-xs text-slate-500">{sub}</p>
              </Panel>
            ))}
          </div>
          {active === 'overview' ? <div className="space-y-4">
            <AdminAccountTransactionsTab />
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
          </div> : active === 'settlements' ? <SettlementWorkspace payouts={state.payouts} totals={settlementTotals} payoutStatus={payoutStatus} setPayoutStatus={setPayoutStatus} autoStatus={state.autoStatus} busy={busy} onProcess={processOne} onAction={runPayoutAction} /> : active === 'refunds' ? <RefundWorkspace refunds={state.refunds} refundStatus={refundStatus} setRefundStatus={setRefundStatus} busy={busy} onInitiate={initiateRefund} onPreview={previewRefundPolicy} policyPreview={policyPreview} /> : active === 'tax_commission' ? <TaxesWorkspace data={state.taxCommission} /> : active === 'commissions' ? <CommissionWorkspace data={state.taxCommission} payouts={state.payouts} busy={busy} onProcessHost={processOne} /> : active === 'transactions_ledger' ? <AdminAccountTransactionsTab /> : <ReportsConfigWorkspace transactions={state.transactions} paymentConfig={state.paymentConfig} autoStatus={state.autoStatus} onExport={exportTransactions} onShare={shareInvoice} onSavePaymentConfig={savePaymentConfig} />}
          {active !== 'transactions_ledger' && (
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

const Info = ({ label, value }) => <p className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"><span className="font-bold text-slate-500">{label}</span><span className="font-black">{value}</span></p>;

const SettlementWorkspace = ({ payouts, totals, payoutStatus, setPayoutStatus, autoStatus, busy, onProcess, onAction }) => {
  const sample = payouts[0] || {};

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Host Actual Value', paiseToMoney(totals.gross || 0)],
          ['Extra Charges', paiseToMoney(totals.extraCharges || 0)],
          ['TDS Hold', paiseToMoney(totals.tds || 0)],
          ['Net Host Payable', paiseToMoney(totals.net || 0)],
        ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
      </div>
      <Panel className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-black">Settlement Controls</h2>
            <p className="text-xs text-slate-500">Sweep completed bookings, process eligible payouts, or run the auto payout engine manually.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={!!busy} onClick={() => onAction('sweep', 'sweep')} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black disabled:opacity-50"><RefreshCcw className="h-4 w-4" /> Sweep Eligibility</button>
            <button disabled={!!busy} onClick={() => onAction('processEligible', 'batch')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> Process Eligible</button>
            <button disabled={!!busy} onClick={() => onAction('runAuto', 'auto')} className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-3 py-2 text-xs font-black text-white disabled:opacity-50"><PlayCircle className="h-4 w-4" /> Run Auto Engine</button>
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
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Host payout uses only the host-entered booking value before customer GST. Customer-side charges are shown separately so finance can track host settlement, platform commission, broker payout, and RM payout clearly.
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
            <div><h2 className="font-black">Host Settlement Queue</h2><p className="text-xs text-slate-500">Booking-wise payout ledger with broker/RM ownership, extra charges, destination and due date.</p></div>
            <select value={payoutStatus} onChange={(event) => setPayoutStatus(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
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
            <table className="w-full min-w-[1900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>{['Payout / Due', 'Host', 'Property', 'Broker', 'Employee (RM)', 'Booking', 'Host Actual Value', 'Extra Charges', 'TDS Base', 'TDS', 'Net Host Payable', 'Destination', 'Status', 'Action'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((payout) => {
                  const chargesTotal = extraChargeTotal(payout);
                  return (
                    <tr key={payout.payout_id}>
                      <td className="px-4 py-3"><p className="font-mono text-xs font-bold">{payout.payout_id}</p><p className="text-xs text-slate-500">Due: {shortDate(payout.settlement_due_at || payout.eligible_at || payout.created_at)}</p></td>
                      <td className="px-4 py-3"><p className="font-bold">{payout.host?.full_name || payout.host_id}</p><p className="text-xs text-slate-500">{payout.host?.email || '-'}</p></td>
                      <td className="px-4 py-3"><p className="font-semibold">{payout.property?.title || payout.property_id}</p><p className="text-xs text-slate-500">{payout.property?.city || '-'}</p></td>
                      <td className="px-4 py-3"><p className="font-bold">{entityName(payout.broker)}</p><p className="text-xs text-slate-500">Code: {entityCode(payout.broker)}</p></td>
                      <td className="px-4 py-3"><p className="font-bold">{entityName(payout.employee)}</p><p className="text-xs text-slate-500">Code: {entityCode(payout.employee)}</p></td>
                      <td className="px-4 py-3"><p className="font-mono text-xs">{payout.booking_id}</p><p className="text-xs text-slate-500">{shortDate(payout.booking?.check_in_date)} to {shortDate(payout.booking?.check_out_date)}</p></td>
                      <td className="px-4 py-3"><p className="font-black">{paiseToMoney(payout.gross_amount || 0)}</p><p className="text-xs text-slate-500">Host base without GST</p></td>
                      <td className="px-4 py-3">
                        <p className="font-black">{paiseToMoney(chargesTotal)}</p>
                        <p className="text-xs text-slate-500">Total customer-side charges, excluding GST</p>
                      </td>
                      <td className="px-4 py-3"><p>{paiseToMoney(payout.tds_base_amount || payout.gross_amount || 0)}</p><p className="text-xs text-slate-500">{tdsBaseNote(payout)}</p></td>
                      <td className="px-4 py-3"><p>{paiseToMoney(payout.tds_amount || 0)}</p><p className="text-xs text-slate-500">{Number(payout.tds_rate_percent || 0)}%</p></td>
                      <td className="px-4 py-3 font-black">{paiseToMoney(payout.net_amount || 0)}</td>
                      <td className="px-4 py-3"><p className="capitalize">{payout.destination_type || '-'}</p><p className="font-mono text-xs text-slate-500">{payout.destination_ref || '-'}</p></td>
                      <td className="px-4 py-3"><StatusBadge value={payout.status} />{payout.failure_reason && <p className="mt-1 text-xs font-semibold text-red-700">{payout.failure_reason}</p>}</td>
                      <td className="px-4 py-3"><button disabled={busy === payout.payout_id || !['eligible', 'failed'].includes(payout.status)} onClick={() => onProcess(payout)} className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 disabled:opacity-40">Pay / Retry</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!payouts.length && <p className="p-6 text-sm text-slate-500">No payouts in this bucket. Click Sweep Eligibility after paid/completed bookings are available.</p>}
          </div>
        </Panel>
        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <div className="border-b border-slate-200 p-4"><h2 className="font-black">Host-Wise Summary</h2></div>
            <div className="divide-y divide-slate-100">
              {totals.hosts.map((host) => <div key={host.host_id} className="p-3 text-sm"><div className="flex items-start justify-between gap-3"><div><p className="font-black">{host.host?.full_name || host.host_id}</p><p className="text-xs text-slate-500">{host.count} payouts / {host.failed} exceptions</p><p className="mt-1 text-xs text-slate-500">FY gross {paiseToMoney(host.tds_fy_gross_after || host.gross_amount)} / TDS {paiseToMoney(host.tds_amount)}</p></div><p className="font-black">{paiseToMoney(host.net_amount)}</p></div></div>)}
              {!totals.hosts.length && <p className="p-5 text-sm text-slate-500">No host settlement rows found.</p>}
            </div>
          </Panel>
          <Panel className="p-4">
            <h2 className="font-black">Sample Payout Invoice Format</h2>
            <p className="mt-1 text-xs text-slate-500">This is the structure finance can use for host, broker, or RM payout invoices.</p>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 text-xs">
              {[
                ['Payout ID', sample.payout_id || 'pyo_SAMPLE'],
                ['Host', sample.host?.full_name || sample.host_id || 'Host Name'],
                ['Property', sample.property?.title || sample.property_id || 'Property Name'],
                ['Broker', `${entityName(sample.broker)} / ${entityCode(sample.broker)}`],
                ['Employee (RM)', `${entityName(sample.employee)} / ${entityCode(sample.employee)}`],
                ['Host Actual Value', paiseToMoney(sample.gross_amount || 0)],
                ['Extra Charges', paiseToMoney(extraChargeTotal(sample))],
                ['TDS', paiseToMoney(sample.tds_amount || 0)],
                ['Net Payable', paiseToMoney(sample.net_amount || 0)],
                ['Settlement Due', shortDate(sample.settlement_due_at || sample.eligible_at || sample.created_at)],
              ].map(([label, value]) => <div key={label} className="grid grid-cols-[140px_minmax(0,1fr)] border-b border-slate-100 last:border-b-0"><span className="bg-slate-50 px-3 py-2 font-bold text-slate-500">{label}</span><span className="px-3 py-2 font-semibold">{value}</span></div>)}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};

const RefundWorkspace = ({ refunds, refundStatus, setRefundStatus, busy, onInitiate, onPreview, policyPreview }) => {
  const totals = refunds.reduce((acc, row) => {
    acc.original += Number(row.original_amount || 0);
    acc.refund += Number(row.refund_amount || 0);
    if (row.status === 'pending') acc.pending += 1;
    if (row.status === 'failed') acc.failed += 1;
    return acc;
  }, { original: 0, refund: 0, pending: 0, failed: 0 });
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Original Booking Value', formatMoney(totals.original)],
          ['Refund Liability', formatMoney(totals.refund)],
          ['Pending Refunds', totals.pending],
          ['Failed Refunds', totals.failed],
        ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
      </div>
      <Panel className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-black">Refund Controls</h2>
            <p className="text-xs text-slate-500">Preview cancellation policy, initiate approved refunds, and track gateway processing status.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onPreview} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black"><FileText className="h-4 w-4" /> Policy Preview</button>
            <button disabled={busy === 'refund'} onClick={onInitiate} className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-3 py-2 text-xs font-black text-white disabled:opacity-50"><RefreshCcw className="h-4 w-4" /> Initiate Refund</button>
          </div>
        </div>
        {policyPreview && (
          <div className="mt-4 grid gap-2 text-sm md:grid-cols-4">
            <Info label="Check-in" value={policyPreview.check_in_date} />
            <Info label="Policy Tier" value={policyPreview.tier} />
            <Info label="Refund %" value={`${policyPreview.percent}%`} />
            <Info label="Refund" value={formatMoney(policyPreview.refund_paise || 0)} />
          </div>
        )}
      </Panel>
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div><h2 className="font-black">Refund Queue</h2><p className="text-xs text-slate-500">Cancellation refunds with guest, host, policy tier, gateway reference and status.</p></div>
          <select value={refundStatus} onChange={(event) => setRefundStatus(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Refund', 'Booking', 'Guest', 'Host', 'Original', 'Refund', 'Policy', 'Reason', 'Gateway Ref', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {refunds.map((refund) => (
                <tr key={refund.refund_id}>
                  <td className="px-4 py-3"><p className="font-mono text-xs font-bold">{refund.refund_id}</p><p className="text-xs text-slate-500">{String(refund.created_at || '-').slice(0, 10)}</p></td>
                  <td className="px-4 py-3 font-mono text-xs">{refund.booking_id}</td>
                  <td className="px-4 py-3"><p className="font-bold">{refund.guest?.full_name || refund.guest_id}</p><p className="text-xs text-slate-500">{refund.guest?.email || '-'}</p></td>
                  <td className="px-4 py-3"><p className="font-bold">{refund.host?.full_name || refund.host_id}</p><p className="text-xs text-slate-500">{refund.host?.email || '-'}</p></td>
                  <td className="px-4 py-3">{formatMoney(refund.original_amount || 0)}</td>
                  <td className="px-4 py-3 font-black">{formatMoney(refund.refund_amount || 0)}</td>
                  <td className="px-4 py-3"><p className="font-bold">{refund.policy_tier || '-'}</p><p className="text-xs text-slate-500">{refund.refund_percent || 0}%</p></td>
                  <td className="px-4 py-3 max-w-[220px] truncate">{refund.reason || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{refund.razorpay_refund_id || refund.razorpay_payment_id || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge value={refund.status} />{refund.failure_reason && <p className="mt-1 text-xs font-semibold text-red-700">{refund.failure_reason}</p>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!refunds.length && <p className="p-6 text-sm text-slate-500">No refunds found.</p>}
        </div>
      </Panel>
    </div>
  );
};

const TaxesWorkspace = ({ data }) => {
  const summary = data?.summary || {};
  const taxLedger = data?.tax_ledger || [];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Booking GST', formatMoney(summary.booking_gst || 0)],
          ['Subscription GST', formatMoney(summary.subscription_gst || 0)],
          ['Host TDS Hold', formatMoney(summary.tds_hold || 0)],
        ['Total Tax Reserve', formatMoney((summary.booking_gst || 0) + (summary.subscription_gst || 0) + (summary.tds_hold || 0))],
      ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></Panel>)}
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
                {taxLedger.map((row) => <tr key={row.tax_id}><td className="px-4 py-3 font-mono text-xs font-bold">{row.tax_id}</td><td className="px-4 py-3">{row.tax_type}</td><td className="px-4 py-3">{formatMoney(row.taxable_amount || 0)}</td><td className="px-4 py-3">{row.tax_rate}%</td><td className="px-4 py-3 font-black">{formatMoney(row.tax_amount || 0)}</td><td className="px-4 py-3"><StatusBadge value={row.status} /></td></tr>)}
              </tbody>
            </table>
          </div>
      </Panel>
    </div>
  );
};

const CommissionWorkspace = ({ data, payouts, busy, onProcessHost }) => {
  const summary = data?.summary || {};
  const commissions = data?.commissions || [];
  const hostPending = (payouts || []).filter((row) => ['eligible', 'failed', 'needs_destination'].includes(row.status));
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
              {hostPending.map((payout) => (
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
      </Panel>
      <Panel className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-black">Broker Commission Ledger</h2>
          <p className="text-xs text-slate-500">Broker la deycha commission booking-wise track kara.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Commission', 'Broker', 'Booking', 'Property', 'Booking Amount', 'Rate', 'Commission', 'Payment Ref', 'Status'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {commissions.map((row) => (
                <tr key={row.commission_id}>
                  <td className="px-4 py-3"><p className="font-mono text-xs font-bold">{row.commission_id}</p><p className="text-xs text-slate-500">{String(row.created_at || '-').slice(0, 10)}</p></td>
                  <td className="px-4 py-3"><p className="font-bold">{row.broker?.full_name || row.broker_id}</p><p className="text-xs text-slate-500">{row.broker?.email || '-'}</p></td>
                  <td className="px-4 py-3 font-mono text-xs">{row.booking_id}</td>
                  <td className="px-4 py-3">{row.property_id}</td>
                  <td className="px-4 py-3">{formatMoney(row.booking_amount || 0)}</td>
                  <td className="px-4 py-3">{row.commission_percentage || 0}%</td>
                  <td className="px-4 py-3 font-black">{formatMoney(row.commission_amount || 0)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.payment_reference || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge value={row.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!commissions.length && <p className="p-6 text-sm text-slate-500">No broker commission records found.</p>}
        </div>
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
      ].map(([label, value]) => <Panel key={label} className="p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-1 text-2xl font-black capitalize">{value}</p></Panel>)}
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-black">Invoices & Finance Reports</h2>
            <p className="text-xs text-slate-500">Export ledger CSV and share generated invoice references for finance records.</p>
          </div>
          <button onClick={onExport} className="rounded-lg bg-charcoal px-3 py-2 text-xs font-black text-white">Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Invoice', 'Transaction', 'Type', 'Customer', 'Amount', 'Status', 'Share'].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((txn) => (
                <tr key={txn.transaction_id}>
                  <td className="px-4 py-3 font-mono text-xs font-bold">{txn.invoice_no || txn.transaction_id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{txn.transaction_id}</td>
                  <td className="px-4 py-3 capitalize">{String(txn.type || '-').replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">{txn.customer?.full_name || txn.host?.full_name || txn.user_id || txn.host_id || '-'}</td>
                  <td className="px-4 py-3 font-black">{paiseToMoney(txn.amount)}</td>
                  <td className="px-4 py-3"><StatusBadge value={txn.status} /></td>
                  <td className="px-4 py-3"><button onClick={() => onShare(txn)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold">Share</button></td>
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
          <button onClick={onSavePaymentConfig} className="mt-4 w-full rounded-lg bg-terracotta px-3 py-2 text-xs font-black text-charcoal">Update Payment Fee Config</button>
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
