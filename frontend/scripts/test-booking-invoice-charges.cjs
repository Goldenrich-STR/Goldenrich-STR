const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const filename = path.resolve(__dirname, '../src/utils/bookingInvoice.js');
const compiled = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, babelrc: false, configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;
const subject = new Module(filename, module);
subject.filename = filename;
subject.paths = module.paths;
subject.require = (name) => name === '../lib/displayLabels'
  ? { formatAddress: () => '' } : name === './bookedUnitPricing' ? (() => { const file = path.resolve(__dirname, '../src/utils/bookedUnitPricing.js'); const child = new Module(file, module); child.paths = module.paths; child._compile(babel.transformSync(fs.readFileSync(file, 'utf8'), { babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code, file); return child.exports; })() : require(name);
subject._compile(compiled, filename);
global.window = { location: { origin: 'https://uat.x-space360.in' } };
const invoice = (fields) => subject.exports.buildCustomerBookingInvoiceHtml({
  base_amount: 10000, total_amount: 12980, gst_amount: 1980,
  extra_charges_total: 1000, ...fields,
}, {}, {}, { showExtraChargeBreakdown: true });
const charge = (html, label) => {
  const row = html.match(new RegExp(`<tr[^>]*>\\s*<td[^>]*>${label}</td>\\s*<td[^>]*>(.*?)</td>`, 's'));
  assert.ok(row, `Missing invoice row: ${label}`);
  return row[1].replace(/<[^>]*>/g, '').trim();
};
assert.equal(charge(invoice({ extra_charges: { platform_fee: 1000 }, service_fee: 1000 }), 'Platform Fee'), '1,000.00');
assert.equal(charge(invoice({ platform_fee: 1000, service_fee: 1000 }), 'Platform Fee'), '1,000.00');
assert.equal(charge(invoice({ service_fee: 1000 }), 'Platform Fee'), '1,000.00');
assert.equal(charge(invoice({ extra_charges: { platform_fee: 0 }, service_fee: 1000 }), 'Platform Fee'), 'NA');
assert.equal(charge(invoice({ extra_charges: { platform_fee: 1000, payment_gateway_charge: 50 }, gateway_fee: 50 }), 'Payment Gateway Charge'), '50.00');
console.log('Booking invoice charge alias regression checks passed (5).');

const legacy = invoice({ base_amount: 580, total_amount: 684.4, paid_amount: 684.4, gst_amount: 104.4, cgst: 52.2, sgst: 52.2, discount_amount: 57420, extra_charges_total: 56840, extra_charges: { platform_fee: 0, cleaning_fee: 0 } });
assert.equal(charge(legacy, 'Cleaning Fee'), 'NA');
assert.equal(charge(legacy, 'CGST'), '52.20');
assert.equal(charge(legacy, 'SGST'), '52.20');
assert.match(legacy, /684\.40/);
console.log('Legacy invoice checks passed: no fabricated cleaning fee and exact paise display.');
