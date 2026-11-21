const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const file = path.resolve(__dirname, '../src/utils/listingWizardSteps.js');
const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
  filename: file, babelrc: false, configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
}).code;
const subject = new Module(file, module);
subject._compile(code, file);
const navigate = subject.exports.listingWizardNavigation;
const steps = ['basics', 'location', 'pricing', 'amenities', 'photos', 'subscription', 'review'].map(key => ({ key }));
const freePhotos = navigate(steps, 4, false);
assert.equal(freePhotos.visibleSteps.length, 6);
assert(!freePhotos.visibleSteps.some(item => item.key === 'subscription'));
assert.equal(freePhotos.nextIndex, 6, 'Photos must go directly to review');
const freeReview = navigate(steps, freePhotos.nextIndex, false);
assert.equal(freeReview.position, 5, 'Review must show step 6 of 6');
assert.equal(freeReview.previousIndex, 4, 'Back must go directly to photos');
assert.equal(freeReview.nextIndex, 6, 'No step after review');
const resumedSubscription = navigate(steps, 5, false);
assert.equal(resumedSubscription.currentIndex, 6, 'Old saved subscription step must resume at review');
assert.equal(navigate(steps, 6, true).currentIndex, 6, 'Saved review must stay review after enabling');
assert.equal(navigate(steps, 4, true).nextIndex, 5);
assert.equal(navigate(steps, 5, true).nextIndex, 6);
assert.equal(navigate(steps, 6, true).previousIndex, 5);
assert.equal(navigate(steps, 0, true).visibleSteps.length, 7);
assert.equal(navigate(steps, NaN, false).currentIndex, 0);
assert.equal(navigate(steps, 999, false).currentIndex, 6);
assert.equal(navigate(steps, -10, false).previousIndex, 0);
// Parse the complete integration, including JSX, as part of the check.
const wizard = path.resolve(__dirname, '../src/pages/HostListProperty.js');
babel.transformSync(fs.readFileSync(wizard, 'utf8'), {
  filename: wizard, babelrc: false, configFile: false, presets: [require.resolve('@babel/preset-react')],
});
console.log('Wizard steps passed: OFF hides subscription, Photos/Review Next/Back, 6/7 counts, saved draft and toggle transitions.');
