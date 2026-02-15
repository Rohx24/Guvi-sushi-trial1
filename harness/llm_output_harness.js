const assert = require('node:assert/strict');
const { extractFirstJsonValue, stripCodeFences } = require('../llmJson');

const samples = [
  {
    name: 'valid-json',
    input: '{"reply":"Hi sir, please tell me your employee ID?","phase":"VERIFICATION","scamDetected":true,"intelSignals":{},"agentNotes":"","shouldTerminate":false,"terminationReason":""}',
    expectReply: 'Hi sir, please tell me your employee ID?',
  },
  {
    name: 'json-fenced',
    input: '```json\n{"reply":"Okay sir. Can you share callback number?","phase":"VERIFICATION","scamDetected":true,"intelSignals":{}}\n```',
    expectReply: 'Okay sir. Can you share callback number?',
  },
  {
    name: 'json-plus-commentary',
    input: 'Sure, here is the JSON:\n\n{"reply":"Sir, which website link is this?","phase":"VERIFICATION","scamDetected":true,"intelSignals":{}}\n\nStay safe!',
    expectReply: 'Sir, which website link is this?',
  },
  {
    name: 'multiple-objects-first-one',
    input: '{"reply":"First","phase":"VERIFICATION","scamDetected":true,"intelSignals":{}} trailing {"reply":"Second"}',
    expectReply: 'First',
  },
  {
    name: 'non-json-text',
    input: 'Sir I am confused only, please tell me your employee ID',
    expectNull: true,
  },
];

for (const s of samples) {
  const parsed = extractFirstJsonValue(s.input);
  if (s.expectNull) {
    assert.equal(parsed, null, `${s.name}: expected null`);
    continue;
  }
  assert.ok(parsed && typeof parsed === 'object', `${s.name}: expected object`);
  assert.equal(parsed.reply, s.expectReply, `${s.name}: reply mismatch`);
}

// Fence stripping sanity check
assert.equal(stripCodeFences('```json\n{"a":1}\n```'), '{"a":1}');

console.log('OK: llm_output_harness passed');

