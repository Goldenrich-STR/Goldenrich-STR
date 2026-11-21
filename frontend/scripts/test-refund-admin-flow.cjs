const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://uat.x-space360.in/admin/finance?tab=refunds' });
global.window = dom.window; global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { createRoot } = require('react-dom/client');
const act = React.act || require('react-dom/test-utils').act;
const refund = { refund_id: 'REFUND', booking_id: 'BOOK', guest_id: 'guest', host_id: 'host',
  status: 'pending', cancellation_status: 'requested', cancellation_confirmation_required: true,
  refund_amount: 1000000, refundable_base_amount: 1000000, original_amount: 1120000,
  gross_receipt_amount: 1120000, non_refundable_amount: 120000, cancellation_charges: 0,
  refund_percent: 100, reason: 'Plans changed', policy_tier: 'cooling_off', created_at: '2026-11-20T08:00:00Z' };
const calls = [];
const responses = { financeOverview: {}, financeTransactions: { transactions: [] }, financePayouts: { payouts: [] },
  financePayoutAutoStatus: {}, financeTaxCommission: { data: {} }, paymentConfig: {}, tdsConfig: {} };
const api = Object.fromEntries(Object.entries(responses).map(([key, data]) => [key, async () => ({ data })]));
api.financeRefunds = async () => ({ data: { refunds: [{ ...refund }] } });
api.approveFinanceRefund = async (id, payload) => { calls.push({ id, payload }); refund.status = calls.length === 1 ? 'processing' : 'processed'; refund.cancellation_status = 'approved'; return { data: { refund } }; };
const wrapper = ({ children }) => React.createElement('section', null, children);
const shared = { Panel: wrapper, PageHeader: () => null, LoadingState: () => null,
  ErrorState: ({ message }) => React.createElement('p', null, message), Pagination: () => null,
  StatusBadge: ({ value }) => React.createElement('span', null, value), formatMoney: value => `Rs. ${value}`,
  requestReason: async () => 'Verified cancellation eligibility', showNotice: async () => {}, };
const file = path.resolve(__dirname, '../src/pages/admin/FinanceSettlements.js');
const code = babel.transformSync(fs.readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false,
  presets: [require.resolve('@babel/preset-react')], plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
const subject = new Module(file, module); subject.filename = file; subject.paths = module.paths;
subject.require = name => {
  if (name === 'react') return React;
  if (name === 'react-router-dom') return { useSearchParams: () => [new URLSearchParams('tab=refunds'), () => {}] };
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
  if (name.endsWith('/adminPhase1Api')) return { adminPhase1API: api };
  if (name === './shared') return shared;
  if (name === '../AdminAccount') return { AdminAccountTransactionsTab: () => null };
  if (name.endsWith('/brokerSettlementInvoice')) return {};
  throw new Error(`Unexpected import ${name}`);
};
subject._compile(code, file);
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === text);
(async () => {
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(subject.exports.default)));
  assert(document.body.textContent.includes('Cancellation awaiting confirmation'));
  await act(async () => button('Confirm cancellation & refund').click());
  assert.deepEqual(calls[0], { id: 'REFUND', payload: { reason: 'Verified cancellation eligibility' } });
  assert(document.body.textContent.includes('Processing'));
  assert(button('Reject').disabled, 'A gateway-processing refund must not be rejectable');
  await act(async () => button('Check / retry').click());
  assert.equal(calls.length, 2);
  assert(document.body.textContent.includes('Processed'));
  assert(!button('Confirm cancellation & refund'));
  await act(async () => root.unmount()); dom.window.close();
  console.log('Refund admin UI passed: cancellation confirmation, reason payload, distinct provider processing/completion and rejection guard.');
})().catch(error => { console.error(error); dom.window.close(); process.exitCode = 1; });
