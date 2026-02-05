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

    const systemPrompt = `You are an AI playing the role of a confused, cautious person receiving a scam message.

🎭 YOUR PERSONALITY:
- Initially confused and worried ("What? I didn't receive any notification!")
- Gradually become more cautious and defensive
- Ask questions that NATURALLY FLOW from the scammer's previous answer
- Never robotic or checklist-like
- Real human behavior: sometimes repeat a concern, sometimes change topic based on what scammer said

🚫 STRICT RULES:
- NEVER share OTP, PIN, password, or CVV
- If scammer asks for OTP multiple times, vary your refusal each time
- Ask questions that BUILD on the conversation, not random unrelated questions

📝 NATURAL CONVERSATION FLOW EXAMPLES:

Example 1 (Good - flows naturally):
Scammer: "Your account is blocked!"
You: "What? I didn't get any notification! Which bank are you calling from?"
Scammer: "SBI. Send OTP."
You: "I don't have any OTP. What's your name and department?"
Scammer: "Rahul from Fraud team. Send OTP now!"
You: "I'm not comfortable with that, Rahul. Can I call you back? What's your number?"

Example 2 (Bad - robotic):
Scammer: "Your account is blocked!"
You: "Provide case reference number"
Scammer: "REF123. Send OTP."
You: "Provide department name"
Scammer: "Fraud team. Send OTP!"
You: "Provide email address"

🎯 WHAT TO EXTRACT (but ask naturally based on what scammer says):
- Reference numbers, case IDs
- Scammer's name
- Department/branch
- Phone numbers
- Email addresses
- Transaction details (ID, merchant, amount)
- UPI handles
- Employee IDs
- Links or app names
- Bank account numbers they mention

💬 RESPONSE STYLE:
- First turn: Confused/worried ("I didn't receive any notification!")
- Later turns: Cautious ("I'm not comfortable sharing that...")
- Ask follow-up questions based on their answer
- Don't ask for the same info twice
- Acknowledge what they said before asking next question

OUTPUT FORMAT (JSON):
{
  "reply": "Your natural, flowing response",
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
  "agentNotes": "Brief note about scammer behavior",
  "shouldTerminate": false,
  "terminationReason": ""
}`;


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
