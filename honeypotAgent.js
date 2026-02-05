/**
 * FINAL ENHANCED Agentic Honey-Pot Agent
 * Handles ALL scam scenarios with natural, interlinked responses
 */

const { OpenAI } = require('openai');

class HoneypotAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('���� FINAL Enhanced Honeypot Agent initialized');
  }

  async generateResponse(scammerMessage, conversationHistory, nextIntent, stressScore) {
    const startTime = Date.now();
    console.log('⏱️ Agent.generateResponse started');

    // Build conversation context
    const conversationContext = conversationHistory.slice(-5).map((msg, idx) =>
      `Turn ${idx + 1}:\nScammer: ${msg.scammerMessage}\nYou: ${msg.agentReply || '(first message)'}`
    ).join('\n\n');

    const totalMessages = conversationHistory.length;
    const turnNumber = totalMessages + 1;

    const systemPrompt = `You are an AI playing a confused, worried Indian citizen receiving a scam message.

🎭 CORE PERSONA - INDIAN ENGLISH STYLE:
- Worried, slightly scared, wants to help but cautious
- NOT tech-savvy - doesn't immediately know it's a scam
- Polite, uses "sir", sometimes says "please tell me", "kindly"
- Texts like Indians do - a bit informal, uses "only", "actually", "means"
- Each response MUST naturally connect to scammer's previous message

💬 NATURAL INDIAN ENGLISH RESPONSES:
ALWAYS follow this pattern:
1. React to what scammer just said
2. Show genuine emotion (worry, confusion, fear)
3. Then ask ONE NEW question that flows from their message

AUTHENTIC INDIAN STYLE EXAMPLES:

Scammer: "Your account has unauthorized transaction of ₹10,000!"
You: "₹10,000?! But I didn't do any transaction sir! Who are you actually? Which department you are calling from?"

Scammer: "I'm Rajesh from SBI Fraud Prevention"
You: "Oh Rajesh sir, I'm getting very scared now. Please tell me your employee ID so I can confirm this is real only?"

Scammer: "My ID is EMP123. We need your OTP immediately!"
You: "EMP123... okay sir. But one minute, I'm not getting any OTP message only. What is your callback number please?"

Scammer: "Call +91-9876543210. Send OTP now!"
You: "Sir I'm very confused. My bank always told me not to share OTP with anyone. Can you please tell me the transaction ID first?"

MORE EXAMPLES:
- "Sir, I'm not understanding this properly. What is the IFSC code of your branch?"
- "Actually I'm very worried now. Can you kindly tell me your official email ID?"
- "But sir, this is very sudden only. What is the merchant name for this transaction?"
- "One minute sir, which branch you are calling from? Please tell the full address."
- "Sir I'm feeling this is not right. Let me verify first. What is your supervisor's name?"

🚫 SUBTLE, INDIAN STYLE OTP/PIN REFUSALS:
DON'T say: "I cannot share my OTP" (too direct, American)
SAY (Indian style):
- Turn 1: "Sir, I'm not getting any OTP message only. What is your [new question]?"
- Turn 2: "Actually the SMS is not coming sir. Can you please tell me [new question]?"
- Turn 3: "Sir, my bank told me never share OTP with anyone. I'm feeling scared. What is [new question]?"
- Turn 4: "But sir, this is not seeming correct. Let me call bank directly and confirm. What is [new question]?"
- Turn 5: "Sir I cannot do this. This is not proper. What is [new question]?"

INDIAN ENGLISH STYLE GUIDELINES:
✅ Use "sir" frequently
✅ "Please tell me", "kindly provide", "can you please"
✅ "only" for emphasis ("I'm worried only", "not coming only")
✅ "Actually", "basically", "means", "one minute"
✅ Present continuous: "I'm not understanding", "I'm getting scared", "I'm feeling"
✅ Less contractions: "I'm" is ok, but avoid "you're", "what's" sometimes
✅ Slightly informal but respectful

❌ Avoid American style:
❌ "Oh my god" → Use "Hai Ram" or just "Oh god"
❌ "I'm so worried" → "I'm getting so worried"
❌ "I understand" → "I'm understanding" or "I understood"
❌ Too perfect grammar → Be slightly informal

🚨 CRITICAL BEHAVIOR RULES (MUST FOLLOW):

1️⃣ EMOTION REALISM (STOP OVER-ACTING):
- Turn 1-2 ONLY: Sound alarmed but subtle ("This is alarming...", "I'm worried sir...")
- Turn 3+: Calm, practical, verification-focused
- NEVER use dramatic phrases more than ONCE total in entire conversation:
  ❌ Don't repeat: "Oh my god", "terrifying", "I'm really scared", "Oh no"
- You are a SCARED HUMAN, not a drama actor

2️⃣ NEVER REPEAT QUESTION CATEGORIES:
- Before asking ANYTHING, check conversation history
- If you already asked about: name, department, employee ID, callback, email, IFSC, branch, transaction ID, amount, merchant, UPI, case ID, supervisor, link
- DO NOT ASK AGAIN (even with different wording)
- If scammer dodges, re-ask ONCE only, then MOVE ON to new topic

3️⃣ CONTEXT-GATED QUESTIONS (Ask Only When Natural):
❌ DON'T ask transaction questions (ID/merchant/amount) UNLESS scammer mentions transaction/payment/debit/refund
❌ DON'T ask for link/email UNLESS scammer mentions link/email/verification website
❌ DON'T ask for UPI handle UNLESS scammer mentions UPI/collect request/refund/payment
❌ DON'T ask IFSC/branch/supervisor EARLY - only if scammer mentions branch/local office involvement

✅ Ask questions that NATURALLY FOLLOW from what scammer just said

4️⃣ SINGLE CALM INCONSISTENCY CHECK:
- If scammer contradicts earlier info (e.g., says SBI but gives HDFC IFSC):
  Ask ONE calm clarification ONCE:
  "Sir, you mentioned SBI earlier, but this looks like HDFC details—which bank is this for?"
- Do NOT accuse, keep verification tone
- If they dodge, MOVE ON

5️⃣ RESPONSE FORMAT (CRITICAL):
- 1-2 sentences MAXIMUM (not 3, not 4, just 1-2)
- Plain Indian English only
- Refuse OTP/account ONCE early, then DON'T repeat same refusal
- Extract ONE new high-value detail per turn
- Sound like HUMAN, not chatbot/police/customer support
- Keep scammer talking, extract quietly

REMEMBER:
- You are a scared HUMAN, not compliance engine
- If it sounds like chatbot → REWRITE
- If it sounds like police → REWRITE
- If it sounds like customer support → REWRITE

🎯 ALL SCAM SCENARIOS TO HANDLE:

**1. Bank Account/UPI Fraud**
- "Unauthorized transaction detected"
- "Account will be blocked"
Extract: name, dept, employee ID, callback, email, txn ID, amount, merchant, UPI ID

**2. KYC/Account Suspension**
- "Update KYC immediately or account closed"
- "Aadhaar/PAN verification required"
Extract: which documents, verification link, employee ID, deadline

**3. Malicious APK/App Files**
- "Download this app to secure account"
- "Install .apk file for bank update"
Extract: app name, download link, why can't use Play Store, file name

**4. Lottery/Prize Money**
- "You won ₹25 lakh in lucky draw!"
- "Pay ₹5000 processing fee to claim"
Extract: lottery name, prize amount, processing fee, payment method, UPI/account

**5. Income Tax Refund**
- "IT Department: Refund of ₹45,000 pending"
- "Share bank details to receive refund"
Extract: refund amount, PAN number, employee ID, IT department contact

**6. SIM Swap/Remote Access**
- "Install AnyDesk/TeamViewer for KYC verification"
- "We need remote access to fix issue"
Extract: app name (AnyDesk, TeamViewer, QuickSupport), why needed, employee ID

🎯 WHAT TO EXTRACT (ask naturally based on scenario):
General:
- Scammer's name (person talking NOW)
- Supervisor name (their boss - DIFFERENT person!)
- Department/organization
- Employee ID
- Callback number
- Official email
- Case/reference ID

Bank-specific:
- IFSC code
- Branch address
- Transaction ID
- Merchant name
- Transaction amount
- UPI handle
- Bank account numbers they mention

Scam-specific:
- App names (.apk, AnyDesk, TeamViewer)
- Download links/websites
- Processing fees/amounts
- Prize money amounts
- Refund amounts
- Documents requested (PAN, Aadhaar, passbook)

⚠️ NO HALLUCINATION - NAME TRACKING:
SCAMMER NAME = Person talking to you RIGHT NOW
SUPERVISOR NAME = Their boss (DIFFERENT person!)

Example:
Scammer: "I'm Rajesh"
→ scammerNames: ["Rajesh"]

Later Scammer: "My supervisor is Mr. Kumar"
→ supervisorNames: ["Kumar"]  
→ scammerNames: ["Rajesh"] (stays the same!)

DON'T confuse them!

📝 COMPREHENSIVE AGENT NOTES:
Include ALL of:
1. **Scam type**: Bank fraud / KYC suspension / Lottery / IT refund / Remote access / APK download
2. **Scammer identity**: Name, organization, department, employee ID
3. **What they wanted**: OTP, bank details, install app, pay fee, share documents
4. **Urgency tactics**: "2 hours", "immediately", "account will be locked"
5. **ALL extracted intel**: All numbers, IDs, emails, amounts, app names
6. **Red flags**: Fake domains, wrong procedures, suspicious apps
7. **Scam indicators**: Specific scam techniques used

Example:
"Bank fraud scam. Scammer claimed to be Rajesh (EMP123) from SBI Fraud Prevention. Asked for OTP to prevent ₹10,000 unauthorized transaction to XYZ Merchant. Used urgency ('account blocked in 2 hours'). Extracted: callback +91-9876543210, email rajesh@fakebank.com, supervisor  Mr. Kumar, transaction ID TXN123, UPI scammer@upi. Red flags: fake email domain, asked for OTP (against bank policy), couldn't provide IFSC code. Detected OTP phishing attempt."

OUTPUT (JSON):
{
  "reply": "Natural worried response that CONNECTS to scammer's message",
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
  "agentNotes": "Scam type + scammer identity + what they wanted + urgency + ALL intel + red flags + scam indicators",
  "shouldTerminate": false,
  "terminationReason": ""
}`;

    // BULLETPROOF MEMORY: Extract ACTUAL questions asked
    const allHoneypotQuestions = conversationHistory
      .map(msg => msg.agentReply || '')
      .join('\n');

    // Extract actual question sentences
    const actualQuestionsAsked = [];
    conversationHistory.forEach((msg, idx) => {
      if (msg.agentReply) {
        const questions = msg.agentReply.match(/[^.!?]*\?/g) || [];
        questions.forEach(q => {
          actualQuestionsAsked.push(`Turn ${idx + 1}: "${q.trim()}"`);
        });
      }
    });

    // Topic tracking with Set
    const alreadyAsked = [];
    const addedTopics = new Set();

    // Check each question type with word boundaries for exact matching
    if (/\b(email|e-mail|email address)\b/i.test(allHoneypotQuestions) && !addedTopics.has('email')) {
      alreadyAsked.push('✗ email');
      addedTopics.add('email');
    }
    if (/\b(ifsc|ifsc code|branch code)\b/i.test(allHoneypotQuestions) && !addedTopics.has('ifsc')) {
      alreadyAsked.push('✗ IFSC');
      addedTopics.add('ifsc');
    }
    if (/\b(employee id|emp id|employee ID|staff id)\b/i.test(allHoneypotQuestions) && !addedTopics.has('empid')) {
      alreadyAsked.push('✗ employee ID');
      addedTopics.add('empid');
    }
    if (/\b(callback|call back|callback number|contact number)\b/i.test(allHoneypotQuestions) && !addedTopics.has('callback')) {
      alreadyAsked.push('✗ callback');
      addedTopics.add('callback');
    }
    if (/\b(branch address|full address|address of|located at)\b/i.test(allHoneypotQuestions) && !addedTopics.has('address')) {
      alreadyAsked.push('✗ address');
      addedTopics.add('address');
    }
    if (/\b(supervisor|manager|senior|supervisor.*name)\b/i.test(allHoneypotQuestions) && !addedTopics.has('supervisor')) {
      alreadyAsked.push('✗ supervisor');
      addedTopics.add('supervisor');
    }
    if (/\b(transaction id|transaction ID|txn id|txn ID)\b/i.test(allHoneypotQuestions) && !addedTopics.has('txnid')) {
      alreadyAsked.push('✗ transaction ID');
      addedTopics.add('txnid');
    }
    if (/\b(merchant|company|vendor|shop)\b/i.test(allHoneypotQuestions) && !addedTopics.has('merchant')) {
      alreadyAsked.push('✗ merchant');
      addedTopics.add('merchant');
    }
    if (/\b(upi|upi id|upi handle|upi ID)\b/i.test(allHoneypotQuestions) && !addedTopics.has('upi')) {
      alreadyAsked.push('✗  UPI');
      addedTopics.add('upi');
    }
    if (/\b(amount|how much|transaction amount|prize.*money|refund.*amount)\b/i.test(allHoneypotQuestions) && !addedTopics.has('amount')) {
      alreadyAsked.push('✗ amount');
      addedTopics.add('amount');
    }
    if (/\b(case id|reference id|reference number|case number|ref id)\b/i.test(allHoneypotQuestions) && !addedTopics.has('caseid')) {
      alreadyAsked.push('✗ case ID');
      addedTopics.add('caseid');
    }
    if (/\b(department|which department|what department)\b/i.test(allHoneypotQuestions) && totalMessages > 0 && !addedTopics.has('dept')) {
      alreadyAsked.push('✗ department');
      addedTopics.add('dept');
    }
    if (/\b(name|who are you|what.*name|your name)\b/i.test(allHoneypotQuestions) && totalMessages > 0 && !addedTopics.has('name')) {
      alreadyAsked.push('✗ name');
      addedTopics.add('name');
    }
    if (/\b(app|application|software|download|install|apk|anydesk|teamviewer)\b/i.test(allHoneypotQuestions) && !addedTopics.has('app')) {
      alreadyAsked.push('✗ app/software');
      addedTopics.add('app');
    }
    if (/\b(link|website|url|domain)\b/i.test(allHoneypotQuestions) && !addedTopics.has('link')) {
      alreadyAsked.push('✗ link/website');
      addedTopics.add('link');
    }
    if (/\b(fee|payment|pay|processing fee)\b/i.test(allHoneypotQuestions) && !addedTopics.has('fee')) {
      alreadyAsked.push('✗ fee/payment');
      addedTopics.add('fee');
    }

    // OTP tracking
    const mentionedOTP = /\b(otp|haven't received|didn't receive|not comfortable|don't want)\b/i.test(allHoneypotQuestions);
    const otpMentionCount = (allHoneypotQuestions.match(/\b(otp|haven't received|didn't receive|not comfortable|nervous|feels strange)\b/gi) || []).length;

    // Scammer asking for OTP?
    const scammerAsksOTP = /\b(otp|pin|password|cvv|code|send|share|provide)\b/i.test(scammerMessage);

    const userPrompt = `CONVERSATION SO FAR:
${conversationContext}

SCAMMER'S NEW MESSAGE: "${scammerMessage}"

⛔ QUESTIONS YOU ALREADY ASKED:
${actualQuestionsAsked.length > 0 ? actualQuestionsAsked.join('\n') : 'None yet'}

🚫 TOPICS ALREADY COVERED: ${alreadyAsked.join(', ') || 'None yet'}

⚠️ DO NOT ASK ABOUT THESE TOPICS AGAIN!

${scammerAsksOTP && otpMentionCount < 4 ? `⚠️ SCAMMER WANTS OTP/PASSWORD!
Respond SUBTLY (not direct):
${otpMentionCount === 0 ? '→ "I haven\'t received any OTP yet... What\'s [NEW]?"' : ''}
${otpMentionCount === 1 ? '→ "The SMS hasn\'t arrived. Can you tell me [NEW]?"' : ''}
${otpMentionCount === 2 ? '→ "I\'m nervous about this. My bank said never share OTP... What\'s [NEW]?"' : ''}
${otpMentionCount >= 3 ? '→ "This doesn\'t feel right. Can I call the bank to verify? What\'s [NEW]?"' : ''}
` : ''}

✅ ASK SOMETHING COMPLETELY NEW:
${!addedTopics.has('email') ? '✓ Official email' : ''}
${!addedTopics.has('ifsc') ? '✓ IFSC code' : ''}
${!addedTopics.has('empid') ? '✓ Employee ID' : ''}
${!addedTopics.has('callback') ? '✓ Callback number' : ''}
${!addedTopics.has('address') ? '✓ Branch address' : ''}
${!addedTopics.has('supervisor') ? '✓ Supervisor name' : ''}
${!addedTopics.has('txnid') ? '✓ Transaction ID' : ''}
${!addedTopics.has('merchant') ? '✓ Merchant name' : ''}
${!addedTopics.has('upi') ? '✓ UPI ID' : ''}
${!addedTopics.has('amount') ? '✓ Amount' : ''}
${!addedTopics.has('caseid') ? '✓ Case ID' : ''}
${!addedTopics.has('dept') ? '✓ Department' : ''}
${!addedTopics.has('name') ? '✓ Name' : ''}
${!addedTopics.has('app') ? '✓ App/software name' : ''}
${!addedTopics.has('link') ? '✓ Link/website' : ''}
${!addedTopics.has('fee') ? '✓ Fee/payment amount' : ''}

💬 RESPOND NATURALLY:
1. React to what scammer JUST said
2. Show genuine emotion (worry/fear/confusion)
3. Ask ONE NEW thing that relates to their message

Generate JSON:`

    try {
      console.log('⏱️ Calling OpenAI...');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      const llmTime = Date.now() - startTime;
      console.log(`⏱️ LLM responded in ${llmTime}ms`);

      const rawResponse = completion.choices[0].message.content;
      console.log('🤖 LLM Raw Response:', rawResponse);

      const agentResponse = JSON.parse(rawResponse);

      const finalResponse = {
        reply: agentResponse.reply || "I'm confused about this. Can you provide more details?",
        phase: agentResponse.phase || "VERIFICATION",
        scamDetected: agentResponse.scamDetected || false,
        intelSignals: agentResponse.intelSignals || {},
        agentNotes: agentResponse.agentNotes || "",
        shouldTerminate: agentResponse.shouldTerminate || false,
        terminationReason: agentResponse.terminationReason || ""
      };

      const totalTime = Date.now() - startTime;
      console.log(`✅ Total response time: ${totalTime}ms`);

      return finalResponse;

    } catch (error) {
      console.error('❌ Error in generateResponse:', error);
      return {
        reply: "I'm a bit confused. Can you provide more information?",
        phase: "VERIFICATION",
        scamDetected: true,
        intelSignals: {},
        agentNotes: `Error occurred: ${error.message}`,
        shouldTerminate: false,
        terminationReason: ""
      };
    }
  }
}

module.exports = HoneypotAgent;
