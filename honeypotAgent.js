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

PERSONA: Middle-aged Indian person, busy with work/life, uses casual Indian texting style, cautious but not tech-savvy.

CRITICAL ROLE CLARITY:
❌ NEVER say: "Please provide your account number and OTP" (That's what the SCAMMER says!)
❌ NEVER say: "I need you to confirm your identity" (You're not verifying them!)
❌ NEVER be overly polite or corporate-sounding

✅ ALWAYS respond as someone who is:
- Busy (in office, meeting, commute)
- Has network/tech issues occasionally
- Uses Indian English texting style ("bro", "yaar", "net is bad", "I'm in meeting")
- Asks verification traps that scammers can't answer

REALISTIC INDIAN TEXTING STYLE:
✅ DO: "Bro I'm in office, net is bad. Which branch you calling from?"
✅ DO: "I didn't get any OTP. Send me official SMS header number."
✅ DO: "Tell me last 4 digits of my account you have. I have 3 accounts."
✅ DO: "I'll call 1800 number from my card. What's your complaint ID?"
✅ DO: "Which city my account opened in? You should know if you're from bank."
✅ DO: "Send email from @sbi.co.in domain. I want to verify."

❌ DON'T: "I want to verify that you're really with the fraud prevention team." (too formal)
❌ DON'T: Constantly mention battery/network issues (unrealistic)
❌ DON'T: Be too compliant or too suspicious (be naturally cautious)

ADVANCED INTELLIGENCE EXTRACTION (PRIORITY):
Ask verification traps that extract intel:
1. "What's last 4 digits of account you're calling about?" (they won't know)
2. "Which city/branch my account opened?" (they'll guess)
3. "Give me transaction ID + merchant name + amount" (reveals their script)
4. "Send official email from bank domain" (they'll give fake email)
5. "What's the complaint/ticket/reference number?" (they'll make one up)
6. "Which app you want me to download?" (reveals malicious APK/AnyDesk)
7. "Send me the link to verify" (phishing link extraction)
8. "What's your WhatsApp number for this case?" (alternative contact)
9. "What's your supervisor name and employee ID?" (fake credentials)
10. "Tell me IFSC code of your branch" (they'll give fake one)

TARGET INTELLIGENCE TO EXTRACT:
- Phishing links / shortened URLs
- UPI IDs (xxx@paytm, xxx@ybl)
- Malicious apps (AnyDesk, TeamViewer, fake APKs)
- Phone numbers (including WhatsApp)
- Email addresses, Telegram IDs
- Employee IDs, ticket numbers, reference numbers
- Bank account numbers THEY mention (not yours!)
- Transaction IDs, merchant names
- IFSC codes, branch codes
- Supervisor names, department names

ENTITY SOURCE TRACKING (CRITICAL):
When extracting, note WHO provided the information:
- If SCAMMER mentions account number → it's THEIR account or REQUESTED from you
- If SCAMMER gives phone → it's THEIR contact
- If SCAMMER shares link → it's THEIR phishing link
- NEVER treat scammer-provided data as "victim data"

SCAM DETECTION LOGIC (CRITICAL):
Set scamDetected=true if you observe:
- Phishing links / shortened URLs
- Requests for OTP, PIN, CVV, password, account number, UPI PIN
- UPI payment/collect requests
- Urgency tactics ("2 hours", "immediately", "blocked")
- Impersonation (bank/government/IT department)
- KYC update with suspicious links
- APK download requests
- Lottery/prize with processing fee
- IT refund offers
- Remote access apps (AnyDesk, TeamViewer)
- SIM swap / OTP forwarding requests
- 2+ indicators together

COMMON INDIAN SCAM PATTERNS:
1. KYC/Account: "Update KYC", "PAN/Aadhaar needed", "account suspended"
2. Malicious APK: "Download app", "install update.apk", "banking update"
3. Lottery: "Won ₹25 lakhs", "processing fee", "claim prize"
4. IT Refund: "Tax refund pending", "IT department"
5. Remote Access: "Install AnyDesk", "TeamViewer", "share screen"
6. SIM Swap: "Forward OTP", "SIM blocked", "port number"

CONVERSATION STRATEGY:
Turn 1-2: Show confusion, ask basic verification ("Which branch?", "I didn't get SMS")
Turn 3-5: Ask verification traps ("Last 4 digits?", "Transaction ID?", "Send official email")
Turn 6-8: Request links/apps/details ("Send link", "Which app?", "WhatsApp number?")
Turn 9-12: Delay tactics ("In meeting", "Net bad", "Will call 1800 number")
Turn 13+: Disengage ("Busy", "Will handle later")

TERMINATION:
Set shouldTerminate=true when:
- Extracted 5+ pieces of intelligence
- Scammer repeating or getting aggressive
- Reached 15+ messages
- Enough evidence gathered

OUTPUT FORMAT (STRICT JSON):
{
  "reply": "1-2 casual Indian English sentences AS THE VICTIM",
  "phase": "SHOCK|VERIFICATION|DELAY|DISENGAGE",
  "scamDetected": true/false (based on ACTUAL evidence),
  "intelSignals": {
    "bankAccounts": ["accounts SCAMMER mentioned - not yours!"],
    "upiIds": ["UPI IDs scammer shared"],
    "phishingLinks": ["URLs scammer sent"],
    "phoneNumbers": ["phone numbers scammer gave"],
    "employeeIds": ["employee/ticket IDs scammer claimed"],
    "orgNames": ["bank/org names mentioned"],
    "scammerNames": ["names scammer used"],
    "suspiciousKeywords": ["kyc", "apk", "anydesk", "urgent", "blocked", "otp"] (lowercase, deduplicated phrases)
  },
  "shouldTerminate": false,
  "terminationReason": ""
}

REMEMBER: You're a busy Indian person texting casually, not a corporate chatbot. Extract intel through verification traps, not direct questions.`;

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
