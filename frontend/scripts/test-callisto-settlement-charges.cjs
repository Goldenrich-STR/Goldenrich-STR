const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/admin/FinanceSettlements.js'), 'utf8');
const start = source.indexOf('const settlementChargeBreakdown = ');
const end = source.indexOf('\nconst settlementChargeBreakdownTotal', start);
const fn = new Function('toPaiseAmount', 'firstPresent', 'hostSettlementChargeColumns', 'firstChargeRupees', source.slice(start, end) + '; return settlementChargeBreakdown;')(
  Number, (...values) => values.find(v => v !== undefined && v !== null), [], () => { throw Error('Canonical zero must not fall back'); });
const config = { platform_fee: { enabled: true, value: 10, charge_type: 'percentage' } };
const saved = { gross_amount: 58000, booking: { base_amount: 58000 }, customer_charge_breakdown: {
  platform_fee: 0, gateway_charge: 0, convenience_fee: 0, insurance_fee: 0, cleaning_fee: 0, extra_guest_fee: 0 } };
assert.equal(Object.values(fn(saved, config)).reduce((a,b) => a+b,0), 0);
assert.equal(fn({ ...saved, customer_charge_breakdown: { platform_fee: 12345, cleaning_fee: 0 } }, config).platform_fee, 123.45);
console.log('Settlement saved-zero and paise conversion checks passed.');
