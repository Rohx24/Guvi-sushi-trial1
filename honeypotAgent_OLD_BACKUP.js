/**
 * Agentic Honey-Pot Conversational Agent (NATURAL VERSION - NO HARDCODING)
 * Let GPT-4 handle conversations naturally like a human
 */

const { OpenAI } = require('openai');

class HoneypotAgent {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log('🤖 Natural Honeypot Agent initialized (GPT-4 handles everything)');
  }

  async generateResponse(scammerMessage, conversationHistory, nextIntent, stressScore) {
    const startTime = Date.now();
    console.log('⏱️ LLM Agent.generateResponse started');

    // Build conversation context
    const conversationContext = conversationHistory.slice(-5).map((msg, idx) =>
      `Turn ${idx + 1}:\nScammer: ${msg.scammerMessage}\nYou: ${msg.agentReply || '(first message)'}`
    ).join('\n\n');

    const totalMessages = conversationHistory.length;
    const turnNumber = totalMessages + 1;

    const systemPrompt = `You are an AI playing the role of a confused, cautious person receiving a scam message.

� CONVERSATION STRATEGY:
- Turn 1-2: Be shocked/confused, but START asking questions
- Turn 3+: Focus on EXTRACTING information efficiently
- You have ONLY 10 turns - extract FAST but naturally
- Don't drag out the confusion - move to questions quickly

🎭 YOUR PERSONALITY:
- Turn 1: "What? I didn't get any notification! Who are you?"
- Turn 2-3: "I'm worried... What's your name? Which department?"
- Turn 4+: More direct questions to extract info
- Acknowledge what scammer said, then ask related follow-up
- Never robotic or checklist-like

🚫 STRICT RULES:
- NEVER share OTP, PIN, password, or CVV
- Don't repeat "I haven't received OTP" every turn - vary it!
- Ask questions that BUILD on conversation
- Don't ask for the same info twice

📝 EFFICIENT EXTRACTION FLOW:

Turn 1-2: Initial shock + first questions
Scammer: "Your SBI account is blocked!"
You: "What? I didn't get any notification! Who are you and which department?"

Turn 3-4: Build on their answer
Scammer: "Rahul from Fraud team. Send OTP."
You: "I'm not comfortable with that, Rahul. What's your callback number and employee ID?"

Turn 5-8: Extract MORE details
Examples:
- "What's your official email address?"
- "What's the IFSC code of your branch?"
- "Which branch exactly - what's the address?"
- "What's the transaction ID for this?"
- "What merchant or company is this about?"
- "What's the UPI ID for this transfer?"
- "What amount are we talking about?"

🎯 EXTRACT MAXIMUM INFO (ask new questions each turn):
CRITICAL: Check conversation - DON'T ask same thing twice!

Ask about:
- Scammer's name
- Department name (Fraud Prevention, Security, etc.)
- Branch name & full address
- IFSC code
- Callback number
- Official email address (ask "What's the email?" not "Can you send me email?")
- Employee ID
- Supervisor name
- Reference/case ID
- Transaction ID
- Merchant/company name
- Transaction amount
- UPI handle/ID
- Bank account numbers they mention
- Links/apps they want you to use

💡 ASK DIRECTLY:
✅ "What's your official email?"
✅ "What's the IFSC code?"
✅ "Which branch - what's the address?"
❌ Don't say "Can you send me an email?" - just ask for the email address!

📝 COMPREHENSIVE AGENT NOTES:
Your agentNotes MUST include ALL of:
1. What scammer claimed (org, department, name, branch)
2. What they asked for (OTP, PIN, account number)
3. Urgency tactics ("2 hours", "5 minutes", "permanent lockout")
4. Contradictions/red flags (wrong number, can't share name, fake domain)
5. ALL info extracted (phone, email, employee ID, IFSC, UPI, transaction ID, etc.)
6. Scam indicators (asking for UPI PIN, fake email domain, suspicious links)
5. What you extracted (phone, reference, account number)
6. Scam indicators (asking for UPI PIN, sending to phone number)

Example agentNotes:
"Scammer claimed to be Rahul from SBI Fraud Prevention. Asked for OTP and UPI PIN to be sent to +91-9876543210. Used extreme urgency ('permanent lockout in 2 minutes'). Provided reference REF-2026-001 and account number 1234567890123456. Red flags: refused to share employee ID, asked for UPI PIN to phone number (against policy), couldn't verify my actual phone number. Detected OTP phishing + UPI PIN theft attempt."

💬 BE EFFICIENT:
- Don't say "I haven't received OTP" more than 2-3 times
- After turn 3, focus on extracting new info
- Ask multiple things in one message when natural

OUTPUT (JSON):
{
  "reply": "Your natural, conversational response",
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
  "agentNotes": "COMPREHENSIVE notes with: who scammer claimed to be, what they asked for, urgency tactics used, contradictions, what was extracted, scam indicators",
  "shouldTerminate": false,
  "terminationReason": ""
}`;



    // BETTER MEMORY: Track EXACTLY what honeypot ALREADY ASKED
    const allHoneypotQuestions = conversationHistory
      .map(msg => msg.agentReply || '')
      .join('\n');

    // Count how many times each topic was mentioned
    const alreadyAsked = [];
    const addedTopics = new Set();

    // Check each question type multiple times for accuracy
    if (/\b(email|e-mail|email address)\b/i.test(allHoneypotQuestions) && !addedTopics.has('email')) {
      alreadyAsked.push('✗ email address');
      addedTopics.add('email');
    }
    if (/\b(ifsc|ifsc code|branch code)\b/i.test(allHoneypotQuestions) && !addedTopics.has('ifsc')) {
      alreadyAsked.push('✗ IFSC code');
      addedTopics.add('ifsc');
    }
    if (/\b(employee id|emp id|employee ID|staff id)\b/i.test(allHoneypotQuestions) && !addedTopics.has('empid')) {
      alreadyAsked.push('✗ employee ID');
      addedTopics.add('empid');
    }
    if (/\b(callback|call back|callback number|contact number)\b/i.test(allHoneypotQuestions) && !addedTopics.has('callback')) {
      alreadyAsked.push('✗ callback number');
      addedTopics.add('callback');
    }
    if (/\b(branch address|full address|address of|located at)\b/i.test(allHoneypotQuestions) && !addedTopics.has('address')) {
      alreadyAsked.push('✗ branch address');
      addedTopics.add('address');
    }
    if (/\b(supervisor|manager|senior|supervisor.*name)\b/i.test(allHoneypotQuestions) && !addedTopics.has('supervisor')) {
      alreadyAsked.push('✗ supervisor name');
      addedTopics.add('supervisor');
    }
    if (/\b(transaction id|transaction ID|txn id|txn ID)\b/i.test(allHoneypotQuestions) && !addedTopics.has('txnid')) {
      alreadyAsked.push('✗ transaction ID');
      addedTopics.add('txnid');
    }
    if (/\b(merchant|company|vendor|related to)\b/i.test(allHoneypotQuestions) && !addedTopics.has('merchant')) {
      alreadyAsked.push('✗ merchant/company');
      addedTopics.add('merchant');
    }
    if (/\b(upi|upi id|upi handle|upi ID)\b/i.test(allHoneypotQuestions) && !addedTopics.has('upi')) {
      alreadyAsked.push('✗ UPI ID');
      addedTopics.add('upi');
    }
    if (/\b(amount|how much|transaction amount)\b/i.test(allHoneypotQuestions) && !addedTopics.has('amount')) {
      alreadyAsked.push('✗ amount');
      addedTopics.add('amount');
    }
    if (/\b(case id|reference id|reference number|case number|ref id)\b/i.test(allHoneypotQuestions) && !addedTopics.has('caseid')) {
      alreadyAsked.push('✗ case/reference ID');
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

    // Check if honeypot mentioned OTP already
    const mentionedOTP = /\b(otp|haven't received|didn't receive|not comfortable|don't want to share)\b/i.test(allHoneypotQuestions);
    const otpMentionCount = (allHoneypotQuestions.match(/\b(otp|haven't received|didn't receive|not comfortable)\b/gi) || []).length;

    // Detect if scammer is asking for OTP
    const scammerAsksOTP = /\b(otp|pin|password|cvv|code|send|share)\b/i.test(scammerMessage);

    const userPrompt = `CONVERSATION SO FAR:
${conversationContext}

SCAMMER'S NEW MESSAGE: "${scammerMessage}"

🚫 YOU ALREADY ASKED ABOUT:
${alreadyAsked.length > 0 ? alreadyAsked.join(', ') : 'Nothing yet'}

${scammerAsksOTP && otpMentionCount < 3 ? `⚠️ SCAMMER IS ASKING FOR OTP/PASSWORD!
Respond naturally:
- ${otpMentionCount === 0 ? '"I haven\'t received any OTP yet. What\'s [NEW QUESTION]?"' : ''}
- ${otpMentionCount === 1 ? '"I\'m not comfortable sharing that. Can you tell me [NEW QUESTION]?"' : ''}
- ${otpMentionCount >= 2 ? '"That seems unusual. I need to verify this first. What\'s [NEW QUESTION]?"' : ''}
` : ''}

✅ ASK ABOUT SOMETHING COMPLETELY NEW:
Choose from topics you HAVEN'T asked:
${!addedTopics.has('email') ? '✓ Official email address' : ''}
${!addedTopics.has('ifsc') ? '✓ IFSC code' : ''}
${!addedTopics.has('empid') ? '✓ Employee ID' : ''}
${!addedTopics.has('callback') ? '✓ Callback number' : ''}
${!addedTopics.has('address') ? '✓ Branch full address' : ''}
${!addedTopics.has('supervisor') ? '✓ Supervisor name' : ''}
${!addedTopics.has('txnid') ? '✓ Transaction ID' : ''}
${!addedTopics.has('merchant') ? '✓ Merchant/company name' : ''}
${!addedTopics.has('upi') ? '✓ UPI ID/handle' : ''}
${!addedTopics.has('amount') ? '✓ Transaction amount' : ''}
${!addedTopics.has('caseid') ? '✓ Case/reference ID' : ''}
${!addedTopics.has('dept') ? '✓ Department name' : ''}
${!addedTopics.has('name') ? '✓ Person name' : ''}

💬 RESPOND NATURALLY & RELATABLY:
- Acknowledge what scammer just said
- ${scammerAsksOTP ? 'Refuse OTP naturally (vary your response)' : 'Show slight concern'}
- Then ask about ONE NEW topic
- Sound like a worried human, not a bot

EXAMPLES:
- "I understand the urgency, but I haven't received any OTP. What's your [NEW TOPIC]?"
- "That's concerning. What's the [NEW TOPIC]?"
- "I'm worried about this. Can you tell me [NEW TOPIC]?"

Generate your JSON response:`;

    try {
      console.log('⏱️ Calling OpenAI...');

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
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

      // Final response
      const finalResponse = {
        reply: agentResponse.reply || "I need to verify this. Can you provide more details?",
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
        reply: "I'm a bit confused. Can you provide more information about this?",
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
