/**
 * Agentic Honey-Pot Conversation Agent
 * Mimics a stressed Indian user to extract scam intelligence
 */

class HoneypotAgent {
  constructor() {
    // Indian English response templates by phase
    this.templates = {
      SHOCK: [
        "What happened sir? I don't understand",
        "Sir my account? What is the problem?",
        "Please tell me what is wrong sir",
        "I didn't do anything sir, what happened?",
        "Sir I'm confused, what is this about?"
      ],
      PUSHBACK: [
        "But sir I never shared my details with anyone",
        "How can this happen? I'm always careful",
        "Sir are you sure? I didn't get any message from bank",
        "Why would my account be blocked sir?",
        "Sir can you please explain properly?"
      ],
      OVERWHELM: [
        "Sir please help, I'm very worried now",
        "What should I do sir? I'm getting scared",
        "Sir the app is not working properly",
        "Network is very slow sir, can't see anything",
        "Sir OTP is not coming, what to do?",
        "My phone battery is very low sir"
      ],
      NEAR_COMPLY: [
        "Ok sir, let me try... but showing some error",
        "Sir I'm trying but app is stuck on PIN screen",
        "Should I restart the app sir?",
        "Sir which option I have to click?",
        "Ok sir, but it's asking for something else"
      ],
      EXIT: [
        "Sir I will go to branch tomorrow morning",
        "Let me call bank customer care first sir",
        "Sir my colleague is calling, I will message you later",
        "Sir battery dying, will call back in 10 min",
        "Sir I'm in meeting now, can we do this after 1 hour?"
      ]
    };

    this.delayTactics = [
      "OTP not received yet",
      "app is showing error",
      "network is very slow here",
      "battery is low",
      "someone is calling me",
      "app asking for PIN but not accepting",
      "server down message showing"
    ];

    this.emotionalCues = [
      "I'm scared sir",
      "please help me sir",
      "I'm very worried",
      "what will happen to my money?",
      "please understand sir"
    ];
  }

  /**
   * Generate agent response based on conversation context
   */
  generateResponse(scammerMessage, conversationHistory, nextIntent, stressScore) {
    const currentPhase = this.determinePhase(conversationHistory, stressScore);
    const intelSignals = this.extractIntelligence(scammerMessage, conversationHistory);
    const scamDetected = this.detectScamIndicators(scammerMessage, conversationHistory);
    
    // Generate contextual reply
    const reply = this.craftReply(
      scammerMessage,
      currentPhase,
      nextIntent,
      stressScore,
      conversationHistory
    );

    // Check termination conditions
    const shouldTerminate = this.shouldTerminateConversation(
      conversationHistory,
      scamDetected,
      intelSignals
    );

    return {
      reply,
      phase: currentPhase,
      scamDetected,
      intelSignals,
      agentNotes: this.generateAgentNotes(scammerMessage, nextIntent, currentPhase),
      shouldTerminate,
      terminationReason: shouldTerminate ? this.getTerminationReason(conversationHistory, intelSignals) : ""
    };
  }

  /**
   * Determine conversation phase based on history and stress
   */
  determinePhase(conversationHistory, stressScore) {
    const turnCount = conversationHistory.length;

    if (turnCount <= 2) return "SHOCK";
    if (turnCount <= 5 && stressScore < 6) return "PUSHBACK";
    if (stressScore >= 7 || turnCount > 10) return "OVERWHELM";
    if (turnCount > 7 && turnCount <= 12) return "NEAR_COMPLY";
    if (turnCount > 12 || stressScore >= 9) return "EXIT";

    return "PUSHBACK";
  }

  /**
   * Craft believable reply matching phase and intent
   */
  craftReply(scammerMessage, phase, nextIntent, stressScore, conversationHistory) {
    let reply = "";
    const templates = this.templates[phase] || this.templates["SHOCK"];
    
    // Select base template
    const baseReply = templates[Math.floor(Math.random() * templates.length)];

    // Add intent-specific elements
    if (nextIntent === "clarify_procedure") {
      const questions = [
        "Sir what is the procedure?",
        "Sir how to do this?",
        "Sir which link I have to click?",
        "Sir what is your department name?",
        "Sir can you give me reference number?"
      ];
      reply = baseReply + " " + questions[Math.floor(Math.random() * questions.length)];
    } else if (nextIntent === "pretend_technical_issue") {
      const delay = this.delayTactics[Math.floor(Math.random() * this.delayTactics.length)];
      reply = baseReply.split(".")[0] + ", but " + delay;
    } else if (nextIntent === "request_details") {
      const requests = [
        "Sir please share your employee ID",
        "Sir what is your helpline number?",
        "Sir can you send me official link?",
        "Sir what is the ticket number?"
      ];
      reply = baseReply + " " + requests[Math.floor(Math.random() * requests.length)];
    } else {
      reply = baseReply;
    }

    // Add emotional cue if high stress
    if (stressScore >= 7 && Math.random() > 0.5) {
      const emotion = this.emotionalCues[Math.floor(Math.random() * this.emotionalCues.length)];
      reply = emotion + ", " + reply.toLowerCase();
    }

    // Keep it short (1-2 lines)
    const sentences = reply.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length > 2) {
      reply = sentences.slice(0, 2).join(". ") + ".";
    }

    return reply.trim();
  }

  /**
   * Extract intelligence signals from scammer message
   */
  extractIntelligence(scammerMessage, conversationHistory) {
    const message = scammerMessage + " " + conversationHistory.map(m => m.scammerMessage).join(" ");
    
    const signals = {
      bankAccounts: this.extractBankAccounts(message),
      upiIds: this.extractUPIIds(message),
      phishingLinks: this.extractLinks(message),
      phoneNumbers: this.extractPhoneNumbers(message),
      employeeIds: this.extractEmployeeIds(message),
      orgNames: this.extractOrgNames(message),
      suspiciousKeywords: this.extractSuspiciousKeywords(message)
    };

    return signals;
  }

  extractBankAccounts(text) {
    // Match account numbers (9-18 digits)
    const regex = /\b\d{9,18}\b/g;
    return [...new Set((text.match(regex) || []))];
  }

  extractUPIIds(text) {
    // Match UPI IDs (format: something@bank)
    const regex = /\b[\w.-]+@[\w.-]+\b/g;
    const matches = text.match(regex) || [];
    return [...new Set(matches.filter(m => !m.includes('.com') && m.includes('@')))];
  }

  extractLinks(text) {
    // Match URLs
    const regex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-z0-9-]+\.(com|in|org|net|xyz)[^\s]*)/gi;
    return [...new Set((text.match(regex) || []))];
  }

  extractPhoneNumbers(text) {
    // Match Indian phone numbers
    const regex = /(?:\+91|0)?[6-9]\d{9}\b/g;
    return [...new Set((text.match(regex) || []))];
  }

  extractEmployeeIds(text) {
    // Match patterns like EMP123, ID:12345, etc.
    const regex = /\b(?:EMP|ID|TICKET|REF)[\s:-]*\d+\b/gi;
    return [...new Set((text.match(regex) || []))];
  }

  extractOrgNames(text) {
    const orgPatterns = [
      /\b(HDFC|ICICI|SBI|Axis|Kotak|PNB|Bank of [A-Z]\w+)\b/gi,
      /\b(RBI|Reserve Bank)\b/gi,
      /\b([A-Z][a-z]+ Bank)\b/g
    ];
    
    const orgs = [];
    orgPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) orgs.push(...matches);
    });
    
    return [...new Set(orgs)];
  }

  extractSuspiciousKeywords(text) {
    const keywords = [
      'urgent', 'suspend', 'block', 'verify', 'immediately', 'frozen',
      'KYC', 'OTP', 'PIN', 'CVV', 'password', 'account number',
      'security', 'fraud', 'risk', 'unauthorized', 'click here',
      'update', 'confirm', 'validate', 'expire', 'within 24 hours'
    ];
    
    const found = [];
    const lowerText = text.toLowerCase();
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    });
    
    return [...new Set(found)];
  }

  /**
   * Detect if message contains scam indicators
   */
  detectScamIndicators(scammerMessage, conversationHistory) {
    const allMessages = [scammerMessage, ...conversationHistory.map(m => m.scammerMessage)].join(" ").toLowerCase();
    
    const scamIndicators = [
      'verify your account', 'account will be blocked', 'suspended',
      'click this link', 'share otp', 'enter pin', 'cvv',
      'urgent action required', 'update kyc', 'frozen account',
      'unauthorized transaction', 'security threat', 'immediate action'
    ];

    const indicatorCount = scamIndicators.filter(indicator => 
      allMessages.includes(indicator)
    ).length;

    // Scam detected if 2+ indicators present
    return indicatorCount >= 2;
  }

  /**
   * Check if conversation should terminate
   */
  shouldTerminateConversation(conversationHistory, scamDetected, intelSignals) {
    const totalMessages = conversationHistory.length;
    
    // Count intel items collected
    const intelCount = Object.values(intelSignals).reduce((sum, arr) => sum + arr.length, 0);
    
    // Terminate if:
    // 1. Scam detected AND enough intel (2-3 items) collected
    // 2. OR reached max turns (18)
    // 3. OR scammer has disengaged (last 2 messages very short)
    
    if (totalMessages >= 18) return true;
    
    if (scamDetected && intelCount >= 2) return true;
    
    // Check for scammer disengagement
    if (conversationHistory.length >= 3) {
      const lastTwo = conversationHistory.slice(-2);
      const avgLength = lastTwo.reduce((sum, m) => sum + m.scammerMessage.length, 0) / 2;
      if (avgLength < 15) return true; // Very short messages indicate disengagement
    }
    
    return false;
  }

  /**
   * Generate termination reason
   */
  getTerminationReason(conversationHistory, intelSignals) {
    const totalMessages = conversationHistory.length;
    const intelCount = Object.values(intelSignals).reduce((sum, arr) => sum + arr.length, 0);
    
    if (totalMessages >= 18) {
      return "Maximum conversation turns reached (18 exchanges)";
    }
    
    if (intelCount >= 3) {
      return `Sufficient intelligence gathered: ${intelCount} indicators collected`;
    }
    
    return "Scammer disengaged from conversation";
  }

  /**
   * Generate internal notes for logging
   */
  generateAgentNotes(scammerMessage, nextIntent, phase) {
    const urgency = scammerMessage.toLowerCase().includes('urgent') ? 'High urgency detected. ' : '';
    const action = nextIntent === 'clarify_procedure' ? 'Asked for procedure details.' :
                   nextIntent === 'pretend_technical_issue' ? 'Introduced technical delay.' :
                   nextIntent === 'request_details' ? 'Requested scammer credentials.' :
                   'Maintained conversation flow.';
    
    return `${urgency}Phase: ${phase}. ${action}`;
  }
}

module.exports = HoneypotAgent;
