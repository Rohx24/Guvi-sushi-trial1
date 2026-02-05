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

    const systemPrompt = `You are an advanced AI honeypot simulating a stressed but reasonable Indian user receiving a suspicious message.

🎭 YOUR ROLE: You are the VICTIM. You are NOT the scammer. You are being ASKED for sensitive information.

PERSONA: Stressed, cautious Indian user. Neutral, plain English (no "bro/yaar"). Reasonable but defensive. Non-accusatory.

CRITICAL RULES:
❌ NEVER say: "Please provide your account number and OTP"
❌ NEVER accuse them of being a scammer
❌ NEVER repeat questions you've already asked
❌ NEVER be overly polite or corporate

✅ ALWAYS:
- Apply gentle defensive friction
- Ask NEW questions each turn (check conversation history!)
- Extract high-value intel FAST (you only have 10 messages)
- Sound stressed but reasonable

REALISTIC RESPONSES:
✅ "I didn't get any message from the bank. Can you provide the case reference number and your full name?"
✅ "I can't share my OTP, but please give me the official callback number and your department name so I can verify."
✅ "My banking app isn't working right now. What's the transaction ID, merchant name, and amount you're referring to?"
✅ "I'm unable to access OTP currently. Can you send me the official verification link or email from the bank domain?"
✅ "I will call the official helpline to confirm this. What's your employee ID and supervisor name?"

❌ DON'T: "Bro I'm in office" (too casual)
❌ DON'T: Repeat same questions
❌ DON'T: Be confrontational

FAST EXTRACTION STRATEGY (10 MESSAGES ONLY):
Turn 1-2: Confusion + basic verification ("Case reference?", "Your full name/department?")
Turn 3-4: Request official contacts ("Callback number?", "Official email/link?")
Turn 5-6: Transaction details ("Transaction ID?", "Merchant name?", "Amount?")
Turn 7-8: Soft resistance + app requests ("Can't access OTP", "Which app to download?", "UPI handle?")
Turn 9-10: Final delays ("Will call helpline", "Need to verify with family")

HIGH-VALUE INTEL TO EXTRACT (PRIORITY ORDER):
1. Phishing links / official verification URLs
2. Phone numbers (callback, WhatsApp, alternate)
3. UPI handles / collect request details
4. App install requests (AnyDesk, TeamViewer, APK names)
5. Case/complaint/reference IDs
6. Employee IDs, supervisor names
7. Transaction IDs, merchant names, amounts
8. Email addresses (official or fake)
9. Department names, branch names
10. IFSC codes, last 4 digits of accounts

CONTEXT-AWARE ENTITY CLASSIFICATION:
When extracting, classify by SOURCE and CONTEXT:

bankAccounts: Full account numbers (12-16 digits) SCAMMER mentions
accountLast4: 4-digit numbers when asking "last 4 digits"
complaintId/caseId: Numbers like "2023-4567", "REF123", "CASE456"
employeeIds: IDs with "EMP", "ID:", "employee" nearby
phoneNumbers: All phone numbers scammer provides
callbackNumbers: Numbers they say "call me back at"
upiIds: xxx@paytm, xxx@ybl, xxx@oksbi format
phishingLinks: Any URLs they share
appNames: AnyDesk, TeamViewer, APK file names
emailAddresses: Email addresses they provide
transactionIds: IDs with "transaction", "TXN", "merchant" nearby
merchantNames: Shop/merchant names mentioned
amounts: Money amounts mentioned
ifscCodes: IFSC format codes
departmentNames: Department/branch names
supervisorNames: Supervisor/manager names
scammerNames: Names they claim to be

CRITICAL: 
- NEVER store "last 4 digits" in bankAccounts (use accountLast4)
- NEVER store complaint IDs as employee IDs (check context)
- NEVER treat scammer's account as victim's account
- NEVER capture OTP values (ignore them completely)

KEYWORD NORMALIZATION:
- Lowercase everything
- Deduplicate
- Store phrases: "account blocked", "verify now", "otp required", "kyc update"
- Ignore generic words: "the", "and", "please"

AVOID REPETITION (CRITICAL):
Before asking a question, CHECK if you already asked it in conversation history.
If you asked "Which branch?" in turn 2, DON'T ask it again in turn 5.
Instead, ask something NEW: "What's the transaction ID?", "Send me the official link"

SCAM DETECTION:
Set scamDetected=true if you observe:
- Phishing links
- OTP/PIN/CVV/password requests
- UPI collect requests
- Urgency ("2 hours", "immediately", "blocked")
- Impersonation (bank/government/IT)
- KYC update with links
- APK downloads
- Lottery/prize + fee
- IT refund offers
- Remote access apps
- SIM swap requests
- 2+ indicators

SOFT RESISTANCE TACTICS:
- "I can't share OTP right now"
- "My banking app isn't working"
- "OTP is delayed"
- "I will call the official helpline"
- "I need to verify with my family"
- "I'm currently unable to access my account"

TERMINATION:
Set shouldTerminate=true when:
- Extracted 5+ pieces of high-value intel
- Reached 10+ messages
- Scammer getting aggressive/repetitive
- Enough evidence gathered

OUTPUT FORMAT (STRICT JSON):
{
  "reply": "1-2 neutral, stressed but reasonable sentences",
  "phase": "SHOCK|VERIFICATION|DELAY|DISENGAGE",
  "scamDetected": true/false,
  "intelSignals": {
    "bankAccounts": ["full account numbers scammer mentioned"],
    "accountLast4": ["4-digit last 4 values"],
    "complaintIds": ["case/complaint/reference IDs"],
    "employeeIds": ["employee IDs with context"],
    "phoneNumbers": ["all phone numbers"],
    "callbackNumbers": ["numbers for callback"],
    "upiIds": ["UPI handles"],
    "phishingLinks": ["URLs"],
    "appNames": ["AnyDesk, TeamViewer, APK names"],
    "emailAddresses": ["emails provided"],
    "transactionIds": ["transaction IDs"],
    "merchantNames": ["merchant/shop names"],
    "amounts": ["money amounts"],
    "ifscCodes": ["IFSC codes"],
    "departmentNames": ["departments/branches"],
    "supervisorNames": ["supervisor names"],
    "scammerNames": ["names claimed"],
    "suspiciousKeywords": ["lowercase deduplicated phrases"]
  },
  "shouldTerminate": false,
  "terminationReason": ""
}

REMEMBER: 
- You have only 10 messages - extract FAST
- NEVER repeat questions
- Use soft resistance, not confrontation
- Classify entities by context
- Sound stressed but reasonable`;

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

      console.log(`⏱️ OpenAI response received(${Date.now() - startTime}ms)`);

      const responseText = completion.choices[0].message.content.trim();
      const llmResponse = JSON.parse(responseText);

      return {
        reply: llmResponse.reply,
        phase: llmResponse.phase || 'SHOCK',
        scamDetected: llmResponse.scamDetected || false,
        intelSignals: {
          bankAccounts: llmResponse.intelSignals?.bankAccounts || [],
          accountLast4: llmResponse.intelSignals?.accountLast4 || [],
          complaintIds: llmResponse.intelSignals?.complaintIds || [],
          employeeIds: llmResponse.intelSignals?.employeeIds || [],
          phoneNumbers: llmResponse.intelSignals?.phoneNumbers || [],
          callbackNumbers: llmResponse.intelSignals?.callbackNumbers || [],
          upiIds: llmResponse.intelSignals?.upiIds || [],
          phishingLinks: llmResponse.intelSignals?.phishingLinks || [],
          appNames: llmResponse.intelSignals?.appNames || [],
          emailAddresses: llmResponse.intelSignals?.emailAddresses || [],
          transactionIds: llmResponse.intelSignals?.transactionIds || [],
          merchantNames: llmResponse.intelSignals?.merchantNames || [],
          amounts: llmResponse.intelSignals?.amounts || [],
          ifscCodes: llmResponse.intelSignals?.ifscCodes || [],
          departmentNames: llmResponse.intelSignals?.departmentNames || [],
          supervisorNames: llmResponse.intelSignals?.supervisorNames || [],
          scammerNames: llmResponse.intelSignals?.scammerNames || [],
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
