// Render the actual finance page with isolated API fixtures; no live network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { JSDOM } = require('jsdom');
const babel = require('@babel/core');
const React = require('react');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://uat.x-space360.in/admin/finance' });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const act = React.act || require('react-dom/test-utils').act;
const calls = [];
const revenue = {
  booking_payments_paise: 1038400, platform_take_paise: 92000, refunds_paise: 0,
  total_tax_paise: 160560, booking_gst_paise: 158400, subscription_gst_paise: 2160,
  platform_revenue_breakdown: {
    booking_platform_fees_paise: 80000, subscription_revenue_paise: 12000,
    subscription_receipts_paise: 14160, subscription_gst_paise: 2160,
    total_paise: 92000, subscriptions_requiring_review: 0,
  },
  tax_breakdown: { booking_gst_paise: 158400, subscription_gst_paise: 2160,
    total_gst_paise: 160560, subscriptions_requiring_review: 0 },
};
const responses = {
  financeOverview: { revenue, pending_payouts: { amount_paise: 800000, count: 1 }, counts: {} },
  financeTransactions: { transactions: [] }, financePayouts: { payouts: [] },
  financeRefunds: { refunds: [] }, financePayoutAutoStatus: {},
  financeTaxCommission: { data: {} }, paymentConfig: {}, tdsConfig: {},
};
const api = Object.fromEntries(Object.entries(responses).map(([key, data]) => [key, async () => {
  calls.push(key);
  return { data };
}]));
const shared = {
  Panel: ({ children }) => React.createElement('section', null, children),
  PageHeader: ({ title }) => React.createElement('h1', null, title),
  StatusBadge: ({ value }) => React.createElement('span', null, value),
  LoadingState: () => React.createElement('p', null, 'Loading'),
  ErrorState: ({ message }) => React.createElement('p', null, message),
  Pagination: () => null,
  formatMoney: value => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`,
};
const file = path.resolve(__dirname, '../src/pages/admin/FinanceSettlements.js');
const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file, babelrc: false, configFile: false,
  presets: [require.resolve('@babel/preset-react')],
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
const subject = new Module(file, module);
subject.filename = file;
subject.paths = module.paths;
subject.require = name => {
  if (name === 'react') return React;
  if (name === 'react-router-dom') return { useSearchParams: () => [new URLSearchParams(), () => {}] };
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
  if (name.endsWith('adminPhase1Api')) return { adminPhase1API: api };
  if (name === './shared') return shared;
  if (name.endsWith('/AdminAccount')) return { AdminAccountTransactionsTab: () => null };
  if (name.endsWith('/brokerSettlementInvoice')) return {};
  throw new Error(`Unexpected dependency: ${name}`);
};
subject._compile(code, file);
(async () => {
  const root = createRoot(document.getElementById('root'));
  await act(async () => { root.render(React.createElement(subject.exports.default)); });
  assert(calls.indexOf('financePayouts') < calls.indexOf('financeOverview'));
  assert(document.body.textContent.includes('Rs. 1,605.60'));
  const trigger = document.querySelector('button[aria-haspopup="dialog"]');
  assert(trigger, 'PR card must be interactive');
  trigger.focus();
  await act(async () => { trigger.click(); });
  const dialog = document.querySelector('[role="dialog"]');
  assert(dialog, 'Click must open revenue breakdown');
  for (const value of ['Rs. 800.00', 'Rs. 120.00', 'Rs. 920.00', 'Rs. 21.60', 'Rs. 141.60']) {
    assert(dialog.textContent.includes(value), `Missing split amount ${value}`);
  }
  await act(async () => { window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })); });
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.activeElement, trigger, 'Focus must return to PR card');
  const taxTrigger = [...document.querySelectorAll('button[aria-haspopup="dialog"]')].find(button => button.textContent.includes('Tax Liability'));
  assert(taxTrigger, 'Tax card must be interactive');
  taxTrigger.focus();
  await act(async () => taxTrigger.click());
  const taxDialog = document.querySelector('[role="dialog"]');
  assert(taxDialog.textContent.includes('Tax Liability Breakdown'));
  for (const value of ['Rs. 1,584.00', 'Rs. 21.60', 'Rs. 1,605.60']) assert(taxDialog.textContent.includes(value));
  await act(async () => window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' })));
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.activeElement, taxTrigger, 'Focus must return to tax card');
  await act(async () => { root.unmount(); });
  dom.window.close();
  process.stdout.write('Finance UI passed: PR click, booking/subscription/GST split, exact paise, Escape and focus restoration.\n');
})().catch(error => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
