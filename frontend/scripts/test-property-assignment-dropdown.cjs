const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://uat.x-space360.in/admin/properties' });
global.window = dom.window; global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { createRoot } = require('react-dom/client');
const act = React.act || require('react-dom/test-utils').act;
function compile(relative, dependencies) {
  const file = path.resolve(__dirname, relative);
  const { code } = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file, babelrc: false, configFile: false,
    presets: [require.resolve('@babel/preset-react')],
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const subject = new Module(file, module);
  subject.filename = file; subject.paths = module.paths;
  subject.require = name => dependencies[name] || (name.startsWith('.') ? compile(path.relative(__dirname, path.resolve(path.dirname(file), name + '.js')), dependencies) : require(name));
  subject._compile(code, file); return subject.exports;
}
const shared = compile('../src/pages/admin/shared.js', {});
let role = 'rm', fail = false, empty = false;
const saves = [], notices = [];
const api = {
  propertyOperations: async () => ({ data: { data: { properties: [{ property_id: 'property-test', title: 'Test property', assigned_rm: 'RM-CODE', subscription_listing_exempt: true, subscription_status: 'trial' }] } } }),
  crmAssignees: async () => {
    if (fail) throw new Error('Offline');
    const user = (id, code) => ({ user_id: id, full_name: `${id} name`, employee_code: code });
    return { data: { data: empty ? {} : {
      brokers: [user('broker-id', 'BROKER-CODE')],
      relationship_managers: [user('rm-id', 'RM-CODE')],
      telecallers: [user('tc-id', 'TC-CODE')],
    } } };
  },
  assignPropertyTeam: async (id, payload) => { saves.push({ id, payload }); },
};
const pageExports = compile('../src/pages/admin/PropertyOperations.js', {
  'react-router-dom': { useNavigate: () => () => {} },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  '../../services/adminPhase1Api': { adminPhase1API: api },
  './shared': { ...shared, requestChoice: async () => role,
    requestReason: async () => 'UAT assignment test',
    showNotice: async (notice) => { notices.push(notice); } },
});
const Page = pageExports.default;
const subscriptionLabel = pageExports.propertySubscriptionLabel;
assert.equal(subscriptionLabel({ subscription_listing_exempt: true, subscription_status: 'trial' }), '-');
assert.equal(subscriptionLabel({ subscription_status: 'active' }), 'active');
assert.equal(subscriptionLabel({ subscription_status: 'trial', subscription_id: 'real-trial' }), 'trial');
assert.equal(subscriptionLabel({ subscription_status: 'expired' }), 'expired');
assert.equal(subscriptionLabel({ subscription_listing_exempt: true, subscription_status: 'active' }), 'active');
const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text);
(async () => {
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(Page)));
  assert(!document.querySelector('tbody').textContent.includes('trial'), 'Free listing must not display the model default trial');
  for (const [type, id, label] of [['rm', 'rm-id', 'RM-CODE'], ['broker', 'broker-id', 'BROKER-CODE'], ['telecaller', 'tc-id', 'TC-CODE']]) {
    role = type;
    await act(async () => button('Assign').click());
    const select = [...document.querySelectorAll('select')].find(el => [...el.options].some(option => option.value === id));
    assert(select, `${type} dropdown must show name/code`);
    assert(select.textContent.includes(label));
    assert.equal(select.options.length, 2, 'Only requested role must be shown');
    if (type === 'rm') assert.equal(select.value, id, 'Existing code must resolve to user ID');
    await act(async () => { select.value = id; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
    await act(async () => button('Continue').click());
    assert.deepEqual(saves.at(-1), { id: 'property-test', payload: { [`${type}_id`]: id, reason: 'UAT assignment test' } });
  }
  await act(async () => button('Assign').click());
  await act(async () => button('Cancel').click());
  assert.equal(saves.length, 3, 'Cancel must not save');
  empty = true;
  await act(async () => button('Assign').click());
  assert(notices.at(-1).title.includes('No Telecaller'));
  fail = true;
  await act(async () => button('Assign').click());
  assert.equal(notices.at(-1).title, 'Could not load team members');
  assert.equal(saves.length, 3, 'Empty/failed loads must not save');
  await act(async () => root.unmount()); dom.window.close();
  console.log('Property assignment passed: all 3 role dropdowns, code preselection, payloads, cancel, empty and failed loads.');
})().catch(error => { console.error(error); process.exitCode = 1; });
