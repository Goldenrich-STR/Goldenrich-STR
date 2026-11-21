const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://uat.x-space360.in/admin/subscriptions' });
global.window = dom.window; global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { createRoot } = require('react-dom/client');
const act = React.act || require('react-dom/test-utils').act;
const calls = []; let reason = 'Management request', fail = false;
const api = {
  subscriptions: async () => ({ data: { data: { subscriptions: [], metrics: {} } } }),
  subscriptionPlans: async () => ({ data: { data: { plans: [] } } }),
  subscriptionListingPolicy: async () => ({ data: { enabled: true } }),
  updateSubscriptionListingPolicy: async payload => {
    if (fail) throw new Error('Offline');
    calls.push(payload); return { data: { enabled: payload.enabled } };
  },
};
const wrapper = ({ children }) => React.createElement('div', null, children);
const filename = path.resolve(__dirname, '../src/pages/admin/SubscriptionManagement.js');
const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, babelrc: false, configFile: false,
  presets: [require.resolve('@babel/preset-react')],
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
const subject = new Module(filename, module); subject.filename = filename; subject.paths = module.paths;
subject.require = name => {
  if (name === 'react') return React;
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
  if (name.endsWith('adminPhase1Api')) return { adminPhase1API: api };
  if (name === './shared') return { Panel: wrapper, PageHeader: wrapper, LoadingState: wrapper,
    ErrorState: wrapper, Pagination: () => null, formatMoney: String,
    requestReason: async () => reason };
  throw new Error(`Unexpected dependency ${name}`);
};
subject._compile(code, filename);
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent === text);
(async () => {
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(subject.exports.default)));
  await act(async () => button('Disable subscription payments').click());
  assert.deepEqual(calls, [{ enabled: false, reason: 'Management request' }]);
  assert(document.body.textContent.includes('Disabled: new listings can be submitted without subscription payment.'));
  reason = null;
  await act(async () => button('Enable subscription payments').click());
  assert.equal(calls.length, 1, 'Cancelling reason must preserve setting');
  reason = 'Restore listing payments';
  await act(async () => button('Enable subscription payments').click());
  assert.equal(calls.at(-1).enabled, true);
  fail = true;
  await act(async () => button('Disable subscription payments').click());
  assert(document.querySelector('[role="alert"]'));
  assert(button('Disable subscription payments').disabled, 'Uncertain state requires refresh');
  await act(async () => root.unmount()); dom.window.close();
  // Validate the complete wizard JSX as well, without hitting any live API.
  const wizard = path.resolve(__dirname, '../src/pages/HostListProperty.js');
  babel.transformSync(fs.readFileSync(wizard, 'utf8'), { filename: wizard, babelrc: false, configFile: false, presets: [require.resolve('@babel/preset-react')] });
  console.log('Subscription toggle UI passed: disable, enable, cancel and failed save; listing wizard JSX validated.');
})().catch(error => { console.error(error); process.exitCode = 1; });
