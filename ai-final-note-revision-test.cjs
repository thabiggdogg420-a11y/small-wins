'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const PackCost = require('./public/pack-cost.js');
const AICheckpoint = require('./public/ai-checkpoint.js');

// Execute the production controller and its actual registered DOM handlers.
function harness() {
  const nodes = {};
  const downloads = [];
  let yes = true;
  function node(id) {
    return nodes[id] ??= {
      value: '', checked: false, textContent: '', hidden: false, disabled: false,
      style: {}, handlers: {},
      addEventListener(type, handler) { this.handlers[type] = handler; },
      focus() {}, select() {}, querySelector() { return { focus() {} }; }
    };
  }
  vm.runInNewContext(fs.readFileSync('public/ai-pack.js', 'utf8'), {
    document: { getElementById: node, createElement: () => ({ click() {} }) },
    PackCost, AICheckpoint, navigator: {},
    Blob: class { constructor(parts) { downloads.push(parts.join('')); } },
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    setTimeout: f => f(), confirm: () => yes
  });
  const fire = (id, type) => {
    assert.equal(typeof node(id).handlers[type], 'function', `${id} has a ${type} handler`);
    node(id).handlers[type]({ type, target: node(id) });
  };
  const input = (id, value, type = 'input') => { node(id).value = value; fire(id, type); };
  const click = id => fire(id, 'click');
  const review = (id, checked = true) => { node(id).checked = checked; fire(id, 'change'); };
  function prepare() {
    input('answer1', 'SIMULATED FIRST: A 4.20, B 7.50');
    input('costA1', '4.20'); input('costB1', '7.50'); click('compare1');
    input('finding', 'error', 'change'); input('reason', 'A needs two packs.');
    click('build-followup'); input('answer2', 'SIMULATED FOLLOW-UP: A 8.40, B 7.50');
    input('correction-check', 'Two packs times 4.20 is 8.40.');
    review('followup-reviewed'); click('continue');
    for (const [id, value] of Object.entries(changed)) input(id, value);
    click('compare3'); input('final-check', note);
  }
  return { node, input, click, review, prepare, downloads, setYes: value => yes = value };
}
const note = 'I checked two packs at 5.60 = 11.20 and three at 3.75 = 11.25. A is lower by 0.05.';
const changed = {
  'own-prompt': 'Compare whole-pack costs for 14 items: A 8 for 5.60, B 5 for 3.75.',
  answer3: 'SIMULATED CHANGED: A 11.20, B 11.25.', costA3: '11.20', costB3: '11.25', help: 'own'
};

// This is the independently reported v65 failure, before any new review UI is used.
{
  const h = harness(); h.prepare();
  h.input('own-prompt', changed['own-prompt'] + ' Use one currency.');
  assert.equal(h.node('final-check').value, note, 'Editing the changed prompt preserves the final note draft');
  assert.equal(h.node('final').hidden, true);
  assert.equal(h.node('record').disabled, true);
  h.click('compare3');
  assert.equal(h.node('final-check').value, note, 'Revealing arithmetic must not erase the retained note');
  assert.equal(h.node('record').disabled, true, 'Arithmetic alone does not approve a retained note');
}

console.log('Final-note revision: reported changed-prompt regression passed');

function blocked(h, label) {
  assert.equal(h.node('record').disabled, true, label + ': download disabled');
  const count = h.downloads.length; h.click('record');
  assert.equal(h.downloads.length, count, label + ': record handler also blocks export');
}
function approved(h) {
  h.review('final-reviewed');
  assert.equal(h.node('final-reviewed').checked, true);
  assert.equal(h.node('record').disabled, false);
  const count = h.downloads.length; h.click('record');
  assert.equal(h.downloads.length, count + 1);
  return JSON.parse(h.downloads.at(-1));
}
function recover(h) {
  h.click('compare1'); h.click('build-followup');
  h.review('followup-reviewed'); h.click('continue'); h.click('compare3');
}

// Every changed-task input/change path, including edit-and-revert, keeps prose
// but invalidates both readiness and the exact final review.
for (const field of Object.keys(changed)) for (const event of ['input', 'change']) {
  const h = harness(); h.prepare(); const first = approved(h).firstChangedAttempt;
  const original = h.node(field).value;
  h.input(field, field === 'help' ? 'help' : original + ' revised', event);
  h.input(field, original, event);
  assert.equal(h.node('final-check').value, note, `${field}/${event}: note retained`);
  assert.equal(h.node('final').hidden, true);
  assert.equal(h.node('final-reviewed').checked, false);
  assert.equal(h.node('record-status').textContent, '');
  assert.match(h.node('final-status').textContent, /kept as a draft/);
  blocked(h, field + '/' + event);
  h.review('final-reviewed'); assert.equal(h.node('final-reviewed').checked, false);
  h.click('compare3'); blocked(h, 'reveal without review');
  assert.match(h.node('final-status').textContent, /Retained draft note/);
  const record = approved(h);
  assert.equal(record.finalCheck, note);
  assert.deepEqual(record.firstChangedAttempt, first, 'First raw attempt never changes');
  assert.equal(record.templateOrAnswerHelp, true, 'Repeated reveal retains assistance');
  h.click('compare3'); blocked(h, 'repeated reveal resets final review');
  assert.equal(h.node('final-check').value, note); approved(h);
}

const upstream = ['answer1', 'costA1', 'costB1', 'finding', 'reason', 'answer2', 'correction-check'];
for (const field of upstream) for (const event of ['input', 'change']) {
  const h = harness(); h.prepare(); approved(h);
  const original = h.node(field).value;
  h.input(field, field === 'finding' ? 'unsure' : original + ' revised', event);
  h.input(field, original, event);
  assert.equal(h.node('final-check').value, note, `${field}/${event}: note retained`);
  assert.equal(h.node('followup-reviewed').checked, false);
  assert.equal(h.node('final-reviewed').checked, false);
  assert.equal(h.node('step3').hidden, true);
  blocked(h, field + '/' + event);
  h.click('compare3'); assert.equal(h.node('final').hidden, true);
  h.review('final-reviewed'); assert.equal(h.node('final-reviewed').checked, false);
  recover(h); blocked(h, 'fresh upstream checks without final review');
  assert.equal(h.node('final-check').value, note);
  assert.equal(approved(h).finalCheck, note);
}

for (const event of ['input', 'change']) {
  const h = harness(); h.prepare(); approved(h);
  h.input('final-check', note + ' Revised.', event); h.input('final-check', note, event);
  assert.equal(h.node('final').hidden, false, 'Note edits do not erase the arithmetic');
  assert.equal(h.node('final-reviewed').checked, false);
  blocked(h, 'note edit/revert'); approved(h);
  h.input('final-check', '   ', event); h.review('final-reviewed');
  assert.equal(h.node('final-reviewed').checked, false); blocked(h, 'empty note');
}

for (const action of ['compare1', 'build-followup', 'earlier', 'revoke-followup', 'reapprove-followup']) {
  const h = harness(); h.prepare(); approved(h);
  if (action === 'revoke-followup') h.review('followup-reviewed', false);
  else if (action === 'reapprove-followup') h.review('followup-reviewed');
  else h.click(action);
  assert.equal(h.node('final-check').value, note, action + ': draft retained');
  assert.equal(h.node('final-reviewed').checked, false);
  blocked(h, action); recover(h); blocked(h, action + ' recovered without final review');
  assert.equal(approved(h).finalCheck, note);
}
{
  const h = harness(); h.prepare(); approved(h); h.review('final-reviewed', false);
  assert.equal(h.node('final-check').value, note); blocked(h, 'revoked final review');
  assert.doesNotMatch(h.node('final-status').textContent, /Current final note reviewed/);
  approved(h);
}

// Exact snapshots protect the download handler even if a value changes without
// a DOM event. Earlier approvals must not bless a different current context.
for (const field of [...upstream, ...Object.keys(changed), 'followup', 'final-check']) {
  const h = harness(); h.prepare(); approved(h);
  h.node(field).value += ' changed without event';
  const count = h.downloads.length; h.click('record');
  assert.equal(h.downloads.length, count, field + ': exact snapshot blocks download');
  if (field !== 'final-check') {
    h.review('final-reviewed');
    assert.equal(h.node('final-reviewed').checked, false, field + ': stale context cannot be reviewed');
    blocked(h, 'programmatic ' + field);
  }
}

{
  const h = harness(); h.prepare(); const firstRecord = approved(h);
  h.click('save-checkpoint'); const checkpoint = h.downloads.at(-1);
  const parsed = AICheckpoint.parse(checkpoint);
  assert.equal(parsed.version, 1);
  assert.deepEqual(Object.keys(parsed.entries), Object.keys(AICheckpoint.limits));
  assert.equal(parsed.entries['final-check'], note);
  assert.doesNotMatch(checkpoint, /final-reviewed|finalReviewed|followup-reviewed|followReviewed/);
  h.setYes(false); h.click('restart');
  assert.equal(h.node('final-check').value, note);
  assert.equal(h.node('final-reviewed').checked, true, 'Cancelled clear keeps approval');
  approved(h);
  const importedNote = 'IMPORTED FICTIONAL CHECK: A is lower by 0.05; nothing was sent.';
  const replacement = JSON.parse(checkpoint); replacement.entries['final-check'] = importedNote;
  h.node('checkpoint-text').value = JSON.stringify(replacement); h.click('restore-checkpoint');
  assert.equal(h.node('final-check').value, note, 'Cancelled restore preserves current draft');
  assert.equal(h.node('final-reviewed').checked, true, 'Cancelled restore preserves approval');
  h.node('checkpoint-text').value = '{bad'; h.click('restore-checkpoint');
  assert.equal(h.node('final-check').value, note, 'Invalid checkpoint preserves current draft');
  assert.equal(h.node('final-reviewed').checked, true);
  h.setYes(true); h.node('checkpoint-text').value = JSON.stringify(replacement); h.click('restore-checkpoint');
  assert.equal(h.node('final-check').value, importedNote, 'Restore replaces, never merges final note');
  assert.equal(h.node('followup-reviewed').checked, false);
  assert.equal(h.node('final-reviewed').checked, false);
  blocked(h, 'restored note'); h.review('final-reviewed');
  assert.equal(h.node('final-reviewed').checked, false);
  h.click('compare1'); h.click('build-followup'); h.click('continue');
  assert.equal(h.node('step3').hidden, true, 'Restore still requires exact follow-up review');
  h.review('followup-reviewed'); h.click('continue');
  h.review('final-reviewed'); assert.equal(h.node('final-reviewed').checked, false, 'Restore requires changed-task check');
  h.click('compare3'); blocked(h, 'restored checks without final review');
  const record = approved(h);
  assert.equal(record.finalCheck, importedNote);
  assert.deepEqual(record.firstChangedAttempt, firstRecord.firstChangedAttempt);
  assert.equal(record.templateOrAnswerHelp, true);
  replacement.entries['final-check'] = '';
  h.node('checkpoint-text').value = JSON.stringify(replacement); h.click('restore-checkpoint');
  assert.equal(h.node('final-check').value, '', 'An imported empty note replaces the old note');
  recover(h); h.review('final-reviewed'); blocked(h, 'empty restored note');
  h.input('final-check', note); approved(h); h.click('restart');
  for (const id of Object.keys(AICheckpoint.limits)) assert.equal(h.node(id).value, '', 'Confirmed clear removes ' + id);
  assert.equal(h.node('final-reviewed').checked, false);
  assert.equal(h.node('followup-reviewed').checked, false);
  assert.equal(h.node('final-status').textContent, '');
  blocked(h, 'confirmed clear');
}

const html = fs.readFileSync('public/ai-pack.html', 'utf8');
assert.match(html, /<input id="final-reviewed" type="checkbox">I checked my final note/);
assert.equal((html.match(/id="final-reviewed"/g) || []).length, 1);
assert.match(html, /id="final-status" role="status"/);
assert.doesNotMatch(fs.readFileSync('public/ai-checkpoint.js', 'utf8'), /final-reviewed|finalReviewed/);
console.log('Final-note revision: all actual input/change paths, edit/revert/recheck/reopen/revoke, exact review, export, cancellation, reset and version-1 checkpoint replacement passed');
