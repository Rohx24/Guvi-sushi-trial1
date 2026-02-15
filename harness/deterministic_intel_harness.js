// Deterministic intel extraction harness (Section B)
// Usage: node guvi2/harness/deterministic_intel_harness.js

process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-key';

const HoneypotAgent = require('../honeypotAgent');

const agent = new HoneypotAgent();

const samples = [
  'Call +91-9887766554',
  'Pay at http://echallan-pay. com/verify',
  'UPI: scammer@paytm',
  'Account no 123456789012',
  'Challan TC123456 vehicle KA01AB1234',
  'Email help@traffic-police.in'
];

for (const text of samples) {
  const deterministic = agent.extractIntelDeterministic(text);
  const merged = agent.mergeIntelSignals(
    {
      // Simulate some existing LLM-provided intel to prove union/merge.
      phishingLinks: ['http://example.com'],
      phoneNumbers: ['+91 9887766554']
    },
    deterministic
  );
  const sanitized = agent.sanitizeIntelSignals(merged);

  console.log('\n=== INPUT ===');
  console.log(text);
  console.log('--- deterministic ---');
  console.log(JSON.stringify(deterministic, null, 2));
  console.log('--- merged+santized ---');
  console.log(JSON.stringify(sanitized, null, 2));
}

