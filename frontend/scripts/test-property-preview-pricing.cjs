const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const file = path.resolve(__dirname, '../src/utils/propertyPreviewPricing.js');
const subject = new Module(file, module);
subject._compile(babel.transformSync(fs.readFileSync(file, 'utf8'), { babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] }).code, file);
const { previewQuoteDates, eventVenuePricePerUnit } = subject.exports;
assert.deepEqual(previewQuoteDates('2026-11-24', '2026-11-24', 'event_venue'), { checkIn: '2026-11-24', checkOut: '2026-11-24' });
assert.equal(previewQuoteDates('2026-11-24', '', 'event_venue').checkOut, '2026-11-24');
assert.equal(previewQuoteDates('2026-11-24', '2026-11-25', 'event_venue').checkOut, '2026-11-25');
assert.equal(previewQuoteDates('2026-11-24', '2026-11-24', 'residential').checkOut, '2026-11-25');
assert.equal(previewQuoteDates('2026-12-31', '', 'residential').checkOut, '2027-01-01');
// Exact observed public API fixture for Callisto, 60 veg guests on one event day.
const quote = { charge_base_amount: 10000, pricing_units: 1, final_nightly_price: 59000,
  base_amount: 58000, subtotal_before_discount: 59000, taxes: 10620, total_amount: 69620,
  charges: [{ key: 'platform_fee', enabled: true, amount: 1000 }, { key: 'cleaning_fee', enabled: false, amount: 0 }] };
assert.equal(eventVenuePricePerUnit(quote, 11000), 11000);
assert.equal(eventVenuePricePerUnit(quote, 11000) + 60 * 800 + quote.taxes, quote.total_amount);
assert.equal(eventVenuePricePerUnit({ ...quote, charge_base_amount: 20000, pricing_units: 2, charges: [{ enabled: true, amount: 2000 }] }, 11000), 11000);
assert.equal(eventVenuePricePerUnit({ ...quote, charges: [{ enabled: true, amount: 0 }] }, 11000), 10000);
assert.equal(eventVenuePricePerUnit(null, 11000), 11000);
const page = fs.readFileSync(path.resolve(__dirname, '../src/pages/PropertyDetail.js'), 'utf8');
babel.parseSync(page, { babelrc: false, configFile: false, sourceType: 'module', parserOpts: { plugins: ['jsx'] } });
assert.match(page, /previewQuoteDates\([\s\S]*?checkIn, checkOut, property\?\.category/);
assert.match(page, /const eventVenueRate = selectedDatePriceReady \? quotedVenueRate : displayPricePerNight/);
assert.doesNotMatch(page, /if \(checkIn && \(!checkOut \|\| checkOut <= checkIn\)\)/);
console.log('Preview passed: same-day and multi-day events, residential rollover, venue-only headline, exact Callisto reconciliation, configured zero fee and JSX parsing.');
