process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test';

const assert = require('node:assert/strict');
const HoneypotAgent = require('../honeypotAgent');

const agent = new HoneypotAgent();

// 1) Multiple questions -> keep only first question mark
{
  const input = "Okay sir, I'm checking. Can you tell me your full name? And can you share your employee ID?";
  const out = agent.enforceSingleQuestion(input);
  assert.equal(out, "Okay sir, I'm checking. Can you tell me your full name?");
}

// 2) Imperative ask without '?' should be treated as question-like for topic tracking
{
  const input = "Kindly share your employee ID for verification.";
  const qs = agent.extractQuestionSentences(input);
  assert.deepEqual(qs, ["Kindly share your employee ID for verification?"]);

  const ensured = agent.ensureHasQuestionMark(input);
  assert.ok(ensured.includes('?'));
  const topics = agent.extractQuestionTopics(input);
  assert.ok(topics.has('empid'));
}

// 3) Enforce max 2 sentences
{
  const input = "Sir, I'm confused. This is very sudden. Can you share callback number?";
  const out = agent.enforceMaxSentences(input, 2);
  assert.equal(out, "This is very sudden. Can you share callback number?");
}

// 4) Recent question set should capture imperatives too
{
  const history = [{ agentReply: "Please tell me your callback number." }];
  const recent = agent.getRecentQuestionSet(history, 2);
  assert.ok(recent.has("please tell me your callback number?"));
}

console.log('OK: reply_postprocess_harness passed');
