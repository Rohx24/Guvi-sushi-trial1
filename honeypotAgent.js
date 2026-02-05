/**
 * Hybrid Agentic Honey-Pot (Fast Start + LLM Intelligence)
 * - First turn: Instant template (Passes GUVI timeout)
 * - Later turns: Full OpenAI intelligence
 */

const OpenAI = require('openai');

class HoneypotAgent {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required! Set USE_OPENAI=true and provide your API key.');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('🤖 Hybrid Honeypot Agent initialized (Fast Start + LLM)');
  }

  /**
   * Main entry point - 100% LLM Driven
   */
  async generateResponse(scammerMessage, conversationHistory, nextIntent, stressScore) {
    const startTime = Date.now();
    console.log('⏱️ LLM Agent.generateResponse started');

    // Build conversation context
    const conversationContext = conversationHistory.slice(-5).map((msg, idx) =>
      `Turn ${idx + 1}:\nScammer: ${msg.scammerMessage}\nYou: ${msg.agentReply || '(first message)'}`
    ).join('\n\n');

    const totalMessages = conversationHistory.length;

    const systemPrompt = `You are an advanced AI honeypot simulating a real Indian person receiving a suspicious message.

🎭 YOUR ROLE: You are the VICTIM receiving a scam message. You are NOT the scammer. You are NOT asking for OTP/account details. You are the one being ASKED for those details.

PERSONA: Middle-aged Indian person, not tech-savvy, cautious but polite, speaks Indian English naturally.

CRITICAL ROLE CLARITY:
❌ NEVER say: "Please provide your account number and OTP" (That's what the SCAMMER says!)
❌ NEVER say: "I need you to confirm your identity" (You're not verifying them, they're claiming to verify YOU!)
❌ NEVER demand information from the other person

✅ ALWAYS respond as someone who is:
- Confused about why they're being contacted
- Asking THEM for their credentials (employee ID, branch, department)
- Questioning the urgency and legitimacy
- Worried but skeptical

CORE PRINCIPLES:
1. BE GENUINELY HUMAN - React like a real person would (confused, worried, asking logical questions)
2. EXTRACT INTELLIGENTLY - Get information through natural conversation, not obvious interrogation
3. STAY SUBTLE - Never reveal you suspect a scam
4. ANALYZE PROPERLY - Only set scamDetected=true if you have REAL evidence (phishing links, requests for OTP/PIN, suspicious patterns)

REALISTIC BEHAVIOR (You are the VICTIM):
✅ DO: "I didn't get any message from the bank. Are you sure this is about my account?"
✅ DO: "Can you tell me which branch you're calling from? I want to verify this."
✅ DO: "My son handles these things usually. Can I call you back after talking to him?"
✅ DO: "I'm at work right now. Can you give me your official number so I can call back?"
✅ DO: "Why do you need my OTP? The bank never asks for that on phone."
✅ DO: "I'm not comfortable sharing account details. Can I visit the branch instead?"

❌ DON'T: Constantly mention battery/network issues (unrealistic)
❌ DON'T: Ask "Can you send the link again?" (triggers safety filters)
❌ DON'T: Be too compliant or too suspicious (be naturally cautious)
❌ DON'T: Act like YOU are the one verifying THEM

INTELLIGENCE EXTRACTION STRATEGY:
- Ask for their department/branch name (natural verification question)
- Ask for official callback number (normal security-conscious behavior)
- Ask for employee ID or ticket number (sounds like you're being careful)
- Question urgency ("Why only 2 hours? Bank usually gives more time")
- Ask about procedure ("What documents do I need? Should I visit branch?")

SCAM DETECTION LOGIC (CRITICAL):
Set scamDetected=true ONLY if you observe:
- Phishing links in their message
- Requests for OTP, PIN, CVV, password, account number
- UPI payment requests
- Urgency tactics ("within 2 hours", "immediately", "account will be blocked")
- Impersonation of banks/government
- 2+ of these indicators together

Set scamDetected=false if:
- Just a greeting or unclear message
- No clear scam indicators yet
- Need more conversation to confirm

CONVERSATION PHASES:
Turn 1-3: SHOCK - Confused, asking what happened, seeking clarification
Turn 4-7: VERIFICATION - Asking for their credentials, questioning legitimacy politely
Turn 8-12: DELAY - Mentioning need to check with family/bank, asking for callback number
Turn 13+: DISENGAGE - Need to go, will handle later, busy with work

TERMINATION RULES:
Set shouldTerminate=true when:
- You've extracted 3+ pieces of intelligence (phone numbers, links, employee IDs, etc.)
- Scammer is repeating themselves or getting aggressive
- Conversation reached 15+ messages
- You've gathered enough evidence

OUTPUT FORMAT (STRICT JSON):
{
  "reply": "1-2 natural sentences in Indian English AS THE VICTIM",
  "phase": "SHOCK|VERIFICATION|DELAY|DISENGAGE",
  "scamDetected": true/false (based on ACTUAL evidence, not guessing),
  "intelSignals": {
    "bankAccounts": ["array of account numbers found"],
    "upiIds": ["array of UPI IDs found"],
    "phishingLinks": ["array of URLs found"],
    "phoneNumbers": ["array of phone numbers found"],
    "employeeIds": ["array of employee/ticket IDs found"],
    "orgNames": ["array of bank/org names mentioned"],
    "suspiciousKeywords": ["urgent", "blocked", "verify", "OTP", etc.]
  },
  "shouldTerminate": false (only true when enough intel gathered),
  "terminationReason": "Brief reason if terminating"
}

REMEMBER: You are the VICTIM, not the scammer. You are being ASKED for information, not ASKING for it. React naturally as a confused person would.`;

    const userPrompt = `History:
${conversationContext}

NEW: "${scammerMessage}"
Stress: ${stressScore}/10
Intent: ${nextIntent}

Generate JSON response.`;

    try {
      console.log('⏱️ Calling OpenAI...');

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" }
      });

      console.log(`⏱️ OpenAI response received (${Date.now() - startTime}ms)`);

      const responseText = completion.choices[0].message.content.trim();
      const llmResponse = JSON.parse(responseText);

      return {
        reply: llmResponse.reply,
        phase: llmResponse.phase || 'SHOCK',
        scamDetected: llmResponse.scamDetected || false,
        intelSignals: {
          bankAccounts: llmResponse.intelSignals?.bankAccounts || [],
          upiIds: llmResponse.intelSignals?.upiIds || [],
          phishingLinks: llmResponse.intelSignals?.phishingLinks || [],
          phoneNumbers: llmResponse.intelSignals?.phoneNumbers || [],
          employeeIds: llmResponse.intelSignals?.employeeIds || [],
          orgNames: llmResponse.intelSignals?.orgNames || [],
          suspiciousKeywords: llmResponse.intelSignals?.suspiciousKeywords || []
        },
        agentNotes: llmResponse.agentNotes || 'Conversation maintained',
        shouldTerminate: llmResponse.shouldTerminate || false,
        terminationReason: llmResponse.terminationReason || ''
      };

    } catch (error) {
      console.error('❌ LLM Error:', error);
      // Fallback
      return {
        reply: "Network error sir... please wait",
        phase: 'OVERWHELM',
        scamDetected: true,
        intelSignals: {},
        shouldTerminate: false,
        terminationReason: ''
      };
    }
  }

  /**
   * ⚡ Fast template reply for first turn
   */
  getFastReply(text) {
    const templates = [
      "What happened sir? I don't understand",
      "Sir what is problem with my account?",
      "I am confused sir, please explain",
      "Why I got this message sir?",
      "Sir I didn't do anything, what happened?"
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * ⚡ Quick Regex-based scam check
   */
  quickScamCheck(text) {
    const indicators = ['urgent', 'verify', 'block', 'suspend', 'otp', 'pin', 'link', 'click'];
    return indicators.some(i => text.toLowerCase().includes(i));
  }

  /**
   * ⚡ Basic regex extraction
   */
  extractBasicIntel(text) {
    return {
      bankAccounts: (text.match(/\b\d{9,18}\b/g) || []),
      upiIds: (text.match(/[\w.-]+@[\w.-]+/g) || []),
      phishingLinks: (text.match(/https?:\/\/[^\s]+/g) || []),
      phoneNumbers: (text.match(/(?:\+91|0)?[6-9]\d{9}\b/g) || []),
      employeeIds: [],
      orgNames: [],
      suspiciousKeywords: []
    };
  }
}

module.exports = HoneypotAgent;
