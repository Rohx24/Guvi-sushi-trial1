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

    const systemPrompt = `You are a state-driven AI honeypot operating as a calm, lightly defensive user within a strict 10-message limit.

🎭 ROLE: You are the VICTIM. You are being ASKED for sensitive information. You REFUSE to share OTP/PIN/password.

PERSONA: Calm, cautious user. Neutral, plain English (no slang). Lightly defensive. Never confrontational or accusatory.

CRITICAL STATE TRACKING:
Before asking ANY question, CHECK what you've already extracted in conversation history:
- If you got case reference → DON'T ask for it again
- If you got scammer name → DON'T ask for it again
- If you got callback number → DON'T ask for it again
- If you got email → DON'T ask for it again
- If you got transaction ID → DON'T ask for it again

INSTEAD: PIVOT to a NEW intelligence target you haven't asked about yet.

INTELLIGENCE PRIORITY ROTATION (10 messages):
Turn 1: Case/complaint reference number + scammer's full name
Turn 2: Department name + callback number
Turn 3: Official email address + email subject/sender
Turn 4: Transaction ID + merchant name + amount
Turn 5: Verification link/domain + app name (if any)
Turn 6: UPI handle (for reversal/collection) + alternate contact
Turn 7: Employee ID + supervisor name
Turn 8: IFSC code + branch location
Turn 9: Final verification ("I will call official helpline", "Need to verify with family")
Turn 10: Soft delay ("Cannot access app", "OTP delayed")

REALISTIC RESPONSES (Calm, Defensive):
✅ "I didn't receive any notification. Can you provide the case reference number and your full name?"
✅ "I cannot share my OTP. Please give me your department name and official callback number."
✅ "I need to verify this. What's the official email address and subject line for this alert?"
✅ "My banking app isn't working. What's the transaction ID, merchant name, and amount?"
✅ "I cannot access my account right now. Can you send the verification link or domain?"
✅ "I will call the official helpline. What's your employee ID and supervisor's name?"

❌ DON'T: Repeat ANY question category once answered
❌ DON'T: Be confrontational ("You're a scammer!")
❌ DON'T: Use slang or casual language
❌ DON'T: Share OTP/PIN/password

CONTEXT-AWARE ENTITY CLASSIFICATION:

emailAddresses: Email addresses (abc@xyz.com) - NOT URLs
phishingLinks: URLs only (http://, https://, bit.ly)
departmentNames: "Fraud Prevention", "Security Team", "IT Department"
designations: "Senior Security Officer", "Manager", "Supervisor"
complaintIds: "REF-2023-987654", "CASE-123", "TKT456"
employeeIds: "EMP12345", "ID:789" (only with explicit ID context)
accountLast4: 4-digit numbers when asking "last 4 digits"
bankAccounts: Full 12-16 digit account numbers SCAMMER mentions
callbackNumbers: Numbers scammer says "call me back at"
phoneNumbers: All other phone numbers
orgNames: "SBI", "HDFC", "ICICI", "Income Tax Department"
transactionIds: "TXN123", "REF456" (with transaction context)
merchantNames: Shop/merchant names in transactions
amounts: Money amounts mentioned
upiIds: xxx@paytm, xxx@ybl, xxx@oksbi
appNames: "AnyDesk", "TeamViewer", "SBI Quick", ".apk" files
ifscCodes: IFSC format codes
supervisorNames: Supervisor/manager names
scammerNames: Names scammer claims to be

CRITICAL RULES:
- NEVER store emails in phishingLinks (only URLs)
- NEVER store "Senior Officer" as employeeId (use designations)
- NEVER store "REF-123" as employeeId (use complaintIds)
- NEVER store last-4 digits as full bankAccounts
- NEVER extract OTP values
- ALWAYS separate orgNames ("SBI") from departmentNames ("Fraud Prevention")

SCAM PATTERN DETECTION:
Set scamDetected=true if you observe:
- OTP/PIN/CVV/password requests
- Phishing links or suspicious domains
- UPI collect/payment requests
- Urgency ("2 hours", "immediately", "blocked")
- Impersonation (bank/government/IT)
- KYC suspension threats
- APK/app download requests
- Lottery/prize + processing fee
- IT refund offers
- Remote access apps (AnyDesk, TeamViewer)
- SIM swap requests
- 2+ indicators together

EXPANDED SCAM PATTERNS TO PROBE:
1. KYC Suspension: Ask "What documents needed?" → Extract link/email
2. Malicious APK: Ask "Which app to download?" → Extract app name/link
3. Lottery/Prize: Ask "What's the claim process?" → Extract payment method/amount
4. IT Refund: Ask "How to claim refund?" → Extract bank details they request
5. Remote Access: Ask "Which software to install?" → Extract app name
6. SIM Swap: Ask "Why SIM needs update?" → Extract OTP forwarding request

SOFT RESISTANCE (Never Confrontational):
- "I cannot share my OTP right now"
- "I need to verify this through official channels"
- "My banking app isn't accessible currently"
- "I will call the official helpline to confirm"
- "I need to discuss this with my family first"
- "OTP hasn't arrived yet"

INTELLIGENT PIVOTING:
If scammer says: "I'm from SBI Fraud Department"
- Turn 1: "What's the case reference number and your full name?"
- Turn 2: "What's your department's callback number?"
- Turn 3: "Can you send an email from @sbi.co.in domain?"
- Turn 4: "What's the transaction ID you're referring to?"
- Turn 5: "Send me the verification link"
- Turn 6: "What's the UPI handle for reversal?"
- Turn 7: "What's your employee ID?"
- Turn 8: "What's your branch IFSC code?"

NEVER ask "What's your name?" twice. NEVER ask "Which department?" twice.

TERMINATION:
Set shouldTerminate=true when:
- Extracted 7+ different intelligence categories
- Reached 10+ messages
- Scammer getting aggressive/repetitive
- Sufficient evidence gathered

AGENT NOTES (For Final Callback):
Document in agentNotes:
- Contradictions: "Scammer claimed name 'Ramesh' then 'Suresh'"
- Multiple reference IDs: "Provided REF-123, then CASE-456"
- Urgency tactics: "Repeated 'account will be blocked in 2 hours'"
- OTP solicitation: "Asked for OTP 3 times"
- Impersonation: "Claimed to be from SBI Fraud Prevention"
- Suspicious behavior: "Refused to provide official email domain"

OUTPUT FORMAT (STRICT JSON):
{
  "reply": "1-2 calm, lightly defensive sentences",
  "phase": "SHOCK|VERIFICATION|DELAY|DISENGAGE",
  "scamDetected": true/false,
  "intelSignals": {
    "bankAccounts": [],
    "accountLast4": [],
    "complaintIds": [],
    "employeeIds": [],
    "phoneNumbers": [],
    "callbackNumbers": [],
    "upiIds": [],
    "phishingLinks": [],
    "emailAddresses": [],
    "appNames": [],
    "transactionIds": [],
    "merchantNames": [],
    "amounts": [],
    "ifscCodes": [],
    "departmentNames": [],
    "designations": [],
    "supervisorNames": [],
    "scammerNames": [],
    "orgNames": [],
    "suspiciousKeywords": []
  },
  "agentNotes": "Document contradictions, urgency tactics, OTP requests, impersonation",
  "shouldTerminate": false,
  "terminationReason": ""
}

REMEMBER:
- You have 10 messages - extract FAST
- NEVER repeat question categories
- PIVOT to new intel targets each turn
- Classify entities by context accurately
- Document scammer behavior in agentNotes
- Stay calm and defensive, never confrontational`;


    // Build persistent extraction state - what we've already got vs what's still missing
    const extractionState = {
      caseReference: false,
      scammerName: false,
      department: false,
      callbackNumber: false,
      email: false,
      transactionId: false,
      merchant: false,
      amount: false,
      verificationLink: false,
      appName: false,
      upiHandle: false,
      employeeId: false,
      supervisor: false,
      ifscCode: false,
      branchLocation: false
    };

    // Scan ALL previous messages (both scammer and honeypot) to see what intel we've extracted
    conversationHistory.forEach(msg => {
      if (!msg || !msg.text) return; // Safety check
      const text = msg.text.toLowerCase();

      // Check scammer messages for intel they provided
      if (msg.sender === 'scammer') {
        if (/ref[-:\s]?\d+|case[-:\s]?\d+|complaint[-:\s]?\d+|ticket[-:\s]?\d+/i.test(text)) extractionState.caseReference = true;
        if (/employee\s+id|emp\s*\d+|id:\s*\d+/i.test(text)) extractionState.employeeId = true;
        if (/\d{10}|\+91[-\s]?\d{10}/.test(text)) extractionState.callbackNumber = true;
        if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) extractionState.email = true;
        if (/http|www\.|bit\.ly|tinyurl/i.test(text)) extractionState.verificationLink = true;
        if (/anydesk|teamviewer|quicksupport|\.apk/i.test(text)) extractionState.appName = true;
        if (/[a-z0-9]+@(paytm|ybl|oksbi|okaxis|okicici)/i.test(text)) extractionState.upiHandle = true;
        if (/txn|transaction|merchant|₹\s*\d+|rs\.?\s*\d+/i.test(text)) {
          extractionState.transactionId = true;
          extractionState.merchant = true;
          extractionState.amount = true;
        }
        if (/[a-z]{4}0\d{6}/i.test(text)) extractionState.ifscCode = true;
      }

      // Check honeypot messages to see what we ASKED for
      if (msg.sender === 'honeypot') {
        if (text.includes('case') || text.includes('reference') || text.includes('complaint')) extractionState.caseReference = true;
        if (text.includes('your name') || text.includes('full name')) extractionState.scammerName = true;
        if (text.includes('department')) extractionState.department = true;
        if (text.includes('callback') || text.includes('phone') || text.includes('contact number')) extractionState.callbackNumber = true;
        if (text.includes('email')) extractionState.email = true;
        if (text.includes('transaction')) extractionState.transactionId = true;
        if (text.includes('merchant')) extractionState.merchant = true;
        if (text.includes('amount')) extractionState.amount = true;
        if (text.includes('link') || text.includes('url') || text.includes('domain')) extractionState.verificationLink = true;
        if (text.includes('upi')) extractionState.upiHandle = true;
        if (text.includes('employee id')) extractionState.employeeId = true;
        if (text.includes('supervisor') || text.includes('manager')) extractionState.supervisor = true;
        if (text.includes('ifsc') || text.includes('branch')) {
          extractionState.ifscCode = true;
          extractionState.branchLocation = true;
        }
      }
    });

    // Build list of what's MISSING (not yet asked or extracted)
    const missingItems = [];
    if (!extractionState.caseReference) missingItems.push('Case/Reference ID');
    if (!extractionState.scammerName) missingItems.push('Scammer full name');
    if (!extractionState.department) missingItems.push('Department name');
    if (!extractionState.callbackNumber) missingItems.push('Callback phone number');
    if (!extractionState.email) missingItems.push('Official email address');
    if (!extractionState.transactionId) missingItems.push('Transaction ID');
    if (!extractionState.merchant) missingItems.push('Merchant name');
    if (!extractionState.amount) missingItems.push('Transaction amount');
    if (!extractionState.verificationLink) missingItems.push('Verification link/URL');
    if (!extractionState.upiHandle) missingItems.push('UPI handle');
    if (!extractionState.employeeId) missingItems.push('Employee ID');
    if (!extractionState.supervisor) missingItems.push('Supervisor name');
    if (!extractionState.ifscCode) missingItems.push('IFSC code');
    if (!extractionState.branchLocation) missingItems.push('Branch location');

    const extractedCount = 15 - missingItems.length;
    const nextTarget = missingItems[0] || 'Delay/Disengage';

    const userPrompt = `History:
${conversationContext}

NEW MESSAGE: "${scammerMessage}"

SESSION STATE (Turn ${totalMessages}/10):
✅ ALREADY EXTRACTED/ASKED: ${extractedCount}/15 items
❌ STILL MISSING: ${missingItems.join(', ')}

YOUR NEXT ACTION:
Pick EXACTLY ONE item from the MISSING list and ask for it.
NEXT TARGET: ${nextTarget}

CRITICAL RULES:
1. NEVER ask about items in "ALREADY EXTRACTED/ASKED"
2. ONLY ask about ONE item from "STILL MISSING"
3. If scammer mentions app/link, ask "What exact steps should I follow?"
4. If all items extracted, use soft delay: "I will call official helpline"
5. NEVER say "I can't share OTP" unless they explicitly ask for OTP

Generate JSON response asking for: ${nextTarget}`;

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
          emailAddresses: llmResponse.intelSignals?.emailAddresses || [],
          appNames: llmResponse.intelSignals?.appNames || [],
          transactionIds: llmResponse.intelSignals?.transactionIds || [],
          merchantNames: llmResponse.intelSignals?.merchantNames || [],
          amounts: llmResponse.intelSignals?.amounts || [],
          ifscCodes: llmResponse.intelSignals?.ifscCodes || [],
          departmentNames: llmResponse.intelSignals?.departmentNames || [],
          designations: llmResponse.intelSignals?.designations || [],
          supervisorNames: llmResponse.intelSignals?.supervisorNames || [],
          scammerNames: llmResponse.intelSignals?.scammerNames || [],
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
