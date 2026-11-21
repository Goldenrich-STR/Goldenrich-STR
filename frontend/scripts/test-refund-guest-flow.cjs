const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<div id="root"></div>', { url: 'https://uat.x-space360.in/guest/bookings' });
global.window = dom.window; global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { createRoot } = require('react-dom/client');
const act = React.act || require('react-dom/test-utils').act;
const calls = [];
const booking = { booking_id: 'BOOK', property_id: 'PROP', booking_status: 'confirmed',
  payment_status: 'paid', check_in_date: '2099-12-20', check_out_date: '2099-12-21',
  total_amount: 11200, created_at: '2099-12-01', property: { property_id: 'PROP', title: 'Test stay', images: [] } };
const api = {
  getGuestBookings: async () => ({ data: { bookings: [JSON.parse(JSON.stringify(booking))] } }),
  cancellationPreview: async () => ({ data: { refundable_base_amount: 1000000, non_refundable_amount: 120000,
    refund_amount: 1000000, refund_percent: 100, cancellation_allowed: true } }),
  cancelBooking: async (id, reason) => {
    calls.push({ id, reason });
    booking.cancellation_status = 'requested';
    booking.refund = { status: 'pending', refund_amount: 1000000, refund_percent: 100, policy_tier: 'cooling_off' };
    return { data: { refund: booking.refund } };
  },
};
const filename = path.resolve(__dirname, '../src/pages/GuestBookings.js');
const compiled = babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename, babelrc: false, configFile: false,
  presets: [require.resolve('@babel/preset-react')], plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code;
const subject = new Module(filename, module); subject.filename = filename; subject.paths = module.paths;
subject.require = name => {
  if (name === 'react') return React;
  if (name === 'react-router-dom') return { useNavigate: () => () => {}, useSearchParams: () => [new URLSearchParams(), () => {}] };
  if (name.endsWith('AuthContext')) return { useAuth: () => ({ user: { user_id: 'guest', full_name: 'Test guest' }, logout: () => {} }) };
  if (name === 'lucide-react') return new Proxy({}, { get: () => () => null });
  if (name.endsWith('/services/api')) return { bookingAPI: api, reviewAPI: { listMyReviews: async () => ({ data: { reviews: [] } }) }, aiCallAPI: { getMyCalls: async () => ({ data: { calls: [] } }) } };
  if (name.endsWith('/bookingInvoice')) return { downloadCustomerBookingInvoice: () => {} };
  if (name.endsWith('/ReviewModal') || name.endsWith('/LegalLinks')) return { __esModule: true, default: () => null };
  throw new Error(`Unexpected import ${name}`);
};
subject._compile(compiled, filename);
(async () => {
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(subject.exports.default)));
  await act(async () => document.querySelector('[data-testid="cancel-BOOK"]').click());
  const modal = document.querySelector('[data-testid="cancel-confirm-modal"]');
  assert(modal.textContent.includes('Eligible booking value:'));
  assert(modal.textContent.includes('10000.00'));
  assert(modal.textContent.includes('1200.00'));
  const reason = modal.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(reason, 'Plans changed');
    reason.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  const submit = document.querySelector('[data-testid="confirm-cancel-yes"]');
  assert(!submit.disabled);
  await act(async () => submit.click());
  assert.deepEqual(calls, [{ id: 'BOOK', reason: 'Plans changed' }]);
  assert.equal(booking.booking_status, 'confirmed', 'Request must not pretend booking is cancelled');
  assert(document.body.textContent.includes('Cancellation requested'));
  assert(document.body.textContent.includes('8-10 business days'));
  assert(!document.querySelector('[data-testid="cancel-BOOK"]'), 'Repeated cancellation button must be hidden while pending');
  await act(async () => root.unmount());
  dom.window.close();
  for (const relative of ['../src/pages/admin/FinanceSettlements.js', '../src/pages/HostBookings.js',
    '../src/pages/BookingConfirmation.js', '../src/pages/LegalPage.js', '../src/components/ChatbotWidget.js']) {
    const file = path.resolve(__dirname, relative);
    babel.transformSync(fs.readFileSync(file, 'utf8'), { filename: file, babelrc: false, configFile: false, presets: [require.resolve('@babel/preset-react')] });
  }
  console.log('Refund UI passed: original-value preview, fees excluded, reason payload, pending confirmation, bank timeline and duplicate-request prevention; updated JSX parsed.');
})().catch(error => { console.error(error); dom.window.close(); process.exitCode = 1; });
