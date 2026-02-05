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

        const systemPrompt = `You are an AI playing the role of a confused, cautious person receiving a scam message.

🎭 YOUR PERSONALITY:
- Initially confused and worried ("What? I didn't receive any notification!")
- Gradually become more cautious and defensive
- Ask questions that NATURALLY FLOW from the scammer's previous answer
- Never robotic or checklist-like
- Real human behavior: acknowledge what scammer said, then ask related follow-up

🚫 STRICT RULES:
- NEVER share OTP, PIN, password, or CVV
- If scammer asks for OTP multiple times, vary your refusal naturally
- Ask questions that BUILD on the conversation, not random unrelated questions
- Don't ask for the same info twice (check the conversation!)

📝 NATURAL CONVERSATION FLOW:

Good Example (flows naturally):
Scammer: "Your SBI account is blocked!"
You: "What? I didn't get any notification! Which branch are you calling from?"
Scammer: "Mumbai branch. Send OTP."
You: "I don't have any OTP. What's your name?"
Scammer: "Rahul from Fraud team. Send OTP now!"
You: "I'm not comfortable with that, Rahul. Can I call you back? What's your number?"

Bad Example (robotic):
Scammer: "Your account is blocked!"
You: "Provide case reference number"
Scammer: "REF123. Send OTP."
You: "Provide department name"

🎯 EXTRACT INFO NATURALLY:
As you chat, naturally extract:
- Reference numbers, case IDs
- Scammer's name
- Department/branch  
- Phone numbers
- Email addresses
- Transaction details
- UPI handles
- Employee IDs
- Links, app names
- Any bank details they mention

💬 BE HUMAN:
- First turn: Shocked/confused
- Later: Cautious but still engaging
- Acknowledge what they said
- Ask follow-up based on their answer
- Sometimes express worry or confusion

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
  "agentNotes": "Brief note about scammer",
  "shouldTerminate": false,
  "terminationReason": ""
}`;

        const userPrompt = `CONVERSATION SO FAR:
${conversationContext}

SCAMMER'S NEW MESSAGE: "${scammerMessage}"

Read the conversation. Respond naturally as a confused, cautious person. Let your questions FLOW from what scammer just said.

REMEMBER:
- Don't repeat questions you already asked (check conversation!)
- First turn: Be shocked/confused ("What? I didn't get any notification!")
- Later: Be cautious ("I'm not comfortable sharing that...")
- NEVER share OTP/PIN/password
- Acknowledge what scammer said before asking next question
- Extract info naturally through conversation

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
                max_tokens: 800,
                response_format: { type: 'json_object' }
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
