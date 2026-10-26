'use strict';
// A release-blocking evidence check, not an aesthetic approval.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const audit = fs.readFileSync(path.join(root, 'DESIGN_SOURCES.md'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const required = [
  'Taste-Skill', 'Designeer', 'ART_APPROVED=false',
  'G0', 'G1', 'G2', 'G3', 'G4', 'Git baseline',
  'focus-audit-390.png', 'focus-audit-1440.png',
  'UNVERIFIED', 'BLOCKED'
];
function verify(a = audit, h = html) {
  for (const item of required) assert.ok(a.includes(item), 'Missing audit evidence: ' + item);
  for (const id of ['clock','toggle','reset','taskList','weekly']) {
    assert.ok(h.includes('id="'+id+'"'), 'Missing actual component: '+id);
  }
  assert.ok(!/ART_APPROVED=true/.test(a), 'Visual approval cannot be self-declared');
}
verify();
if (process.argv.includes('--self-test')) {
  for (const item of ['G1','focus-audit-390.png','ART_APPROVED=false']) {
    assert.throws(() => verify(audit.split(item).join('REMOVED')), /Missing audit evidence|Visual approval/);
  }
  assert.throws(() => verify(audit,html.replace('id="clock"','id="removed"')), /Missing actual component/);
  console.log('PASS negative evidence tests (4/4)');
}
console.log('PASS Focus Deck design evidence gate (documentation only; visual human approval still blocked)');