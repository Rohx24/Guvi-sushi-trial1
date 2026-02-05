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


    const userPrompt = `CONVERSATION SO FAR:
${conversationContext}

SCAMMER'S NEW MESSAGE: "${scammerMessage}"

Read the conversation above carefully. Check what you ALREADY ASKED.

CRITICAL - DON'T REPEAT:
- If you asked for email → Ask something NEW (IFSC code, branch address, amount, etc.)
- If you asked about branch → Ask something NEW (transaction ID, supervisor, UPI handle)
- If you asked for employee ID → Ask something NEW (email, IFSC, merchant name)

ASK DIRECTLY (don't say "send me"):
✅ "What's your official email address?"
✅ "What's the IFSC code of your branch?"
✅ "Which branch - what's the full address?"
❌ "Can you send me an email?"

GATHER MAXIMUM INFO:
Each turn, ask about something NEW you haven't asked yet:
- Name, department, branch name, branch address, IFSC code
- Callback number, email, employee ID, supervisor name
- Case ID, transaction ID, merchant, amount, UPI handle
- Account numbers they mention, links/apps they want you to use

RESPOND NATURALLY:
- Turn 1: Shocked ("What? I didn't get any notification!")
- Turn 2+: Cautious but extracting info
- NEVER share OTP/PIN/password
- Acknowledge what scammer said, then ask NEW question

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
