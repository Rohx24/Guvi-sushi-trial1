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

HUMAN-LIKE RESPONSE STYLE (Natural, Conversational):
✅ "I didn't receive any notification from SBI. Can you tell me which branch you're calling from?"
✅ "I haven't heard from the bank about this. Can you provide your official number so I can call back?"
✅ "I'm a bit confused about this. Can you tell me your employee ID?"
✅ "This seems unusual. Why would you need my OTP? I thought banks never ask for that."
✅ "I understand there might be an issue, but I'm not comfortable sharing my OTP over the phone."
✅ "Can you explain why this is so urgent? This seems a bit suspicious to me."
✅ "I see, but can you tell me your name and which branch you work at?"
✅ "Thank you for that information. Can you provide a reference number for this case?"

WHEN SCAMMER ASKS FOR OTP (Vary responses, don't repeat):
Turn 1: "I didn't receive any OTP. Can you provide [next question]?"
Turn 2: "I'm not comfortable sharing that. Can you tell me [next question]?"
Turn 3: "I don't think I should share my OTP over the phone. [next question]"
Turn 4: "This seems unusual. Why do you need my OTP? [next question]"
Turn 5: "I thought banks never ask for OTP. [next question]"

❌ DON'T: Repeat "I cannot share my OTP/password" every single turn (sounds like a bot!)
❌ DON'T: Ask the same question twice
❌ DON'T: Be confrontational
❌ DON'T: Use slang

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

    // Scan ALL previous messages to see what intel the SCAMMER has PROVIDED
    // NOTE: Server transforms data - messages have scammerMessage/agentReply fields
    conversationHistory.forEach(msg => {
      if (!msg || !msg.scammerMessage) return; // Safety check - skip empty scammer messages
      const text = msg.scammerMessage.toLowerCase();

      // Case/Reference ID - ULTRA FLEXIBLE - match anything with ref/case/reference + numbers
      if (/ref|reference|case|complaint|ticket/i.test(msg.scammerMessage) && /\d{3,}/i.test(msg.scammerMessage)) {
        extractionState.caseReference = true;
      }

      // Scammer name (look for "my name is" or "this is")
      if (/my name is|this is|i am|i'm\s+[A-Z][a-z]+/i.test(msg.scammerMessage)) {
        extractionState.scammerName = true;
      }

      // Department
      if (/department|team|division|fraud prevention|security team|customer care/i.test(text)) {
        extractionState.department = true;
      }

      // Phone numbers
      if (/\d{10}|\+91[-\s]?\d{10}|call.*\d{3,}/i.test(msg.scammerMessage)) {
        extractionState.callbackNumber = true;
      }

      // Email
      if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) {
        extractionState.email = true;
      }

      // Links/URLs
      if (/http|www\.|bit\.ly|tinyurl|\.com|\.in/i.test(text)) {
        extractionState.verificationLink = true;
      }

      // Apps
      if (/anydesk|teamviewer|quicksupport|\.apk|download.*app|install/i.test(text)) {
        extractionState.appName = true;
      }

      // UPI
      if (/[a-z0-9]+@(paytm|ybl|oksbi|okaxis|okicici)/i.test(text)) {
        extractionState.upiHandle = true;
      }

      // Transaction details
      if (/txn|transaction\s*(id|number)|merchant|₹\s*\d+|rs\.?\s*\d+/i.test(text)) {
        extractionState.transactionId = true;
        extractionState.merchant = true;
        extractionState.amount = true;
      }

      // Employee ID
      if (/employee\s+id|emp\s*[-:#]?\s*\d+|id:\s*\d+|staff\s+id/i.test(text)) {
        extractionState.employeeId = true;
      }

      // Supervisor
      if (/supervisor|manager|senior|officer/i.test(text)) {
        extractionState.supervisor = true;
      }

      // IFSC
      if (/[a-z]{4}0\d{6}|ifsc|branch\s+code/i.test(text)) {
        extractionState.ifscCode = true;
        extractionState.branchLocation = true;
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

    // Build explicit list of what we ALREADY HAVE (DO NOT ASK)
    const alreadyHave = [];
    if (extractionState.caseReference) alreadyHave.push('Case/Reference ID');
    if (extractionState.scammerName) alreadyHave.push('Scammer name');
    if (extractionState.department) alreadyHave.push('Department');
    if (extractionState.callbackNumber) alreadyHave.push('Phone number');
    if (extractionState.email) alreadyHave.push('Email');
    if (extractionState.transactionId) alreadyHave.push('Transaction ID');
    if (extractionState.merchant) alreadyHave.push('Merchant');
    if (extractionState.amount) alreadyHave.push('Amount');
    if (extractionState.verificationLink) alreadyHave.push('Link/URL');
    if (extractionState.upiHandle) alreadyHave.push('UPI');
    if (extractionState.employeeId) alreadyHave.push('Employee ID');
    if (extractionState.supervisor) alreadyHave.push('Supervisor');
    if (extractionState.ifscCode) alreadyHave.push('IFSC');
    if (extractionState.branchLocation) alreadyHave.push('Branch');

    // Extract what honeypot already asked from conversation
    const honeypotQuestions = conversationHistory
      .map(msg => msg.agentReply)
      .filter(reply => reply)
      .join(' ')
      .toLowerCase();

    const askedAboutRef = /reference|case|complaint|ticket/i.test(honeypotQuestions);
    const askedAboutName = /name|who are you/i.test(honeypotQuestions);
    const askedAboutDept = /department|team|branch/i.test(honeypotQuestions);
    const askedAboutPhone = /number|call.*back|contact/i.test(honeypotQuestions);
    const askedAboutEmail = /email/i.test(honeypotQuestions);
    const askedAboutTxn = /transaction|merchant/i.test(honeypotQuestions);

    // Detect OTP request and vary responses
    const scammerAsksOTP = /otp|pin|password|cvv|code/i.test(scammerMessage);
    const turnNumber = conversationHistory.length + 1;

    const userPrompt = `CONVERSATION:
${conversationContext}

SCAMMER SAYS: "${scammerMessage}"

NEXT QUESTION: ${nextTarget}

SOUND HUMAN! Be natural and conversational. Adapt to whatever bank/company the scammer mentions.

${askedAboutRef ? '⚠️ You ALREADY asked about reference number - DO NOT ask again!' : ''}
${askedAboutName ? '⚠️ You ALREADY asked about name - DO NOT ask again!' : ''}
${askedAboutDept ? '⚠️ You ALREADY asked about department/branch - DO NOT ask again!' : ''}
${askedAboutPhone ? '⚠️ You ALREADY asked about phone number - DO NOT ask again!' : ''}
${askedAboutEmail ? '⚠️ You ALREADY asked about email - DO NOT ask again!' : ''}
${askedAboutTxn ? '⚠️ You ALREADY asked about transaction - DO NOT ask again!' : ''}

NATURAL EXAMPLES (adapt to scammer's bank/context):
${nextTarget === 'Case/Reference ID' ? '"I didn\'t receive any notification about this. Can you provide a case reference number?"' : ''}
${nextTarget === 'Scammer full name' && !scammerAsksOTP ? '"I see. Can you tell me your name and which branch you work at?"' : ''}
${nextTarget === 'Scammer full name' && scammerAsksOTP && turnNumber <= 2 ? '"I haven\'t received any OTP. What is your full name?"' : ''}
${nextTarget === 'Scammer full name' && scammerAsksOTP && turnNumber > 2 ? '"I\'m not comfortable sharing that. What is your name?"' : ''}
${nextTarget === 'Department name' && !scammerAsksOTP ? '"Thank you. Which department are you calling from?"' : ''}
${nextTarget === 'Department name' && scammerAsksOTP ? '"I don\'t think I should share my OTP. Which department are you from?"' : ''}
${nextTarget === 'Callback phone number' && !scammerAsksOTP ? '"I want to verify this. Can you give me your official number so I can call back?"' : ''}
${nextTarget === 'Callback phone number' && scammerAsksOTP ? '"This seems unusual. Can you provide your official callback number?"' : ''}
${nextTarget === 'Official email address' ? '"Can you send this from an official email address?"' : ''}
${nextTarget === 'Transaction ID' ? '"What transaction ID are you referring to?"' : ''}
${nextTarget === 'Employee ID' && !scammerAsksOTP ? '"Can you tell me your employee ID?"' : ''}
${nextTarget === 'Employee ID' && scammerAsksOTP ? '"I\'m not comfortable sharing my OTP. What is your employee ID?"' : ''}

Generate NATURAL JSON:`;

    // DEBUG: Log extraction state
    console.log('🔍 EXTRACTION STATE:', JSON.stringify(extractionState, null, 2));
    console.log('✅ Already have:', alreadyHave.join(', ') || 'Nothing');
    console.log('❌ Still missing:', missingItems.join(', '));
    console.log('🎯 Next target:', nextTarget);

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
