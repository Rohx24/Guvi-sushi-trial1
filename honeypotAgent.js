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

  getHistoryWindow() {
    // Defaults to last 5 turns (token efficient). Set `USE_FULL_HISTORY=true` to send full history.
    if (String(process.env.USE_FULL_HISTORY || '').toLowerCase() === 'true') {
      return 0;
    }

    const parsed = Number(process.env.HISTORY_WINDOW);
    if (!Number.isFinite(parsed)) return 5;
    if (parsed <= 0) return 0;
    return Math.max(1, Math.floor(parsed));
  }

  detectScenario(scammerMessage, conversationContext) {
    const text = `${scammerMessage || ''} ${conversationContext || ''}`.toLowerCase();

    const score = (re) => (re.test(text) ? 1 : 0);

    const scores = {
      lottery: 0,
      delivery: 0,
      traffic: 0,
      electricity: 0,
      apk_remote: 0,
      kyc: 0,
      tax_refund: 0,
      ecommerce: 0,
      bank: 0
    };

    // Prize / lucky draw / rewards
    scores.lottery += score(/\b(lucky draw|luckydraw|lottery|raffle|rewards?\b|reward\s+division|winner|won\b|selected\b|prize\b|jackpot|gift)\b/);
    scores.lottery += score(/\b(processing fee|claim (?:your )?prize|claim (?:your )?reward)\b/);

    // E-commerce / shopping / refund / courier impersonation (Amazon/Flipkart etc.)
    scores.ecommerce += score(/\b(amazon|flipkart|myntra|ajio|meesho|snapdeal|nykaa|zepto|blinkit|swiggy|zomato)\b/);
    scores.ecommerce += score(/\b(order id|order number|order no|invoice|shipment|delivery|refund|return|replacement|cancel(?:lation)?|customer care|support|delivery partner)\b/);

    // Delivery / courier
    scores.delivery += score(/\b(india post|courier|delivery|parcel|package|consignment|tracking|shipment|customs)\b/);
    scores.delivery += score(/\b(address incomplete|delivery fee)\b/);

    // Traffic challan
    scores.traffic += score(/\b(challan|traffic|violation|rto|vehicle number|license)\b/);

    // Electricity bill
    scores.electricity += score(/\b(electricity|power|bill|disconnection|disconnect|meter|consumer number|ca number)\b/);

    // APK / remote access
    scores.apk_remote += score(/\b(anydesk|teamviewer|quicksupport|apk|install|download app|remote access)\b/);

    // KYC / suspension
    scores.kyc += score(/\b(kyc|aadhaar|aadhar|pan|account (?:suspend|suspended|blocked|freeze|frozen)|update kyc)\b/);

    // Tax refund
    scores.tax_refund += score(/\b(income tax|itr|refund|tds|assessment|e-filing)\b/);

    // Bank / OTP / transactions
    scores.bank += score(/\b(bank|account|otp|mpin|pin|password|cvv|ifsc|transaction|debit|credit|refund|upi|fraud|blocked)\b/);

    let best = 'bank';
    let bestScore = -1;
    for (const [k, v] of Object.entries(scores)) {
      if (v > bestScore) {
        best = k;
        bestScore = v;
      }
    }

    // If nothing matched, default to "bank" behavior.
    if (bestScore <= 0) return 'bank';
    return best;
  }

  buildAskedTopicsFromHistory(conversationHistory) {
    const asked = new Set();
    for (const msg of conversationHistory || []) {
      for (const t of this.extractQuestionTopics(msg.agentReply || '')) {
        asked.add(t);
      }
    }
    return asked;
  }

  normalizeNextIntent(nextIntent) {
    const validIntents = new Set([
      'clarify_procedure',
      'pretend_technical_issue',
      'request_details',
      'maintain_conversation'
    ]);

    if (!nextIntent || typeof nextIntent !== 'string') {
      return 'maintain_conversation';
    }

    return validIntents.has(nextIntent) ? nextIntent : 'maintain_conversation';
  }

  normalizeStressScore(stressScore) {
    const parsed = Number(stressScore);
    if (!Number.isFinite(parsed)) {
      return 5;
    }

    const rounded = Math.round(parsed);
    if (rounded < 1) return 1;
    if (rounded > 10) return 10;
    return rounded;
  }

  buildIntentStressControl(intent, stressScore, turnNumber) {
    const intentInstructions = {
      clarify_procedure: [
        'Primary objective: ask for procedure clarity and verification path.',
        'Prioritize process questions over aggressive detail extraction for this turn.',
        'Do not use technical delay unless scammer pushes for OTP/PIN immediately.'
      ],
      pretend_technical_issue: [
        'Primary objective: introduce believable technical friction.',
        'Mention one technical blocker while still asking one new verification question.',
        'Keep scammer engaged; do not abruptly disengage in this turn.'
      ],
      request_details: [
        'Primary objective: collect scammer identity and contact details.',
        'Prioritize callback number, employee ID, official email, and case/reference ID.',
        'Ask one high-value detail that is natural for the current message.'
      ],
      maintain_conversation: [
        'Primary objective: keep conversation natural and believable.',
        'Maintain flow and extract one new detail without topic jump.',
        'Use a neutral verification posture unless urgency is explicit.'
      ]
    };

    let stressGuidance;
    if (stressScore <= 3) {
      stressGuidance = 'Stress level low (1-3): sound calmer, minimal panic language, practical verification tone.';
    } else if (stressScore <= 7) {
      stressGuidance = 'Stress level medium (4-7): sound worried but controlled; continue extracting details.';
    } else {
      stressGuidance = 'Stress level high (8-10): sound visibly stressed, but still coherent and safe; avoid over-dramatic lines.';
    }

    const phaseHint = this.deriveExpectedPhase(intent, stressScore, turnNumber);
    const intentList = (intentInstructions[intent] || intentInstructions.maintain_conversation)
      .map((line, idx) => `${idx + 1}. ${line}`)
      .join('\n');

    return `RUNTIME CONTROL (STRICT):
Intent: ${intent}
StressScore: ${stressScore}
Expected phase hint: ${phaseHint}
${stressGuidance}
Intent rules:
${intentList}`;
  }

  deriveExpectedPhase(intent, stressScore, turnNumber) {
    if (intent === 'pretend_technical_issue') {
      return 'DELAY';
    }
    if (stressScore >= 9 && turnNumber >= 8) {
      return 'DISENGAGE';
    }
    if (stressScore >= 8 && turnNumber <= 2) {
      return 'SHOCK';
    }
    return 'VERIFICATION';
  }

  resolvePhase(modelPhase, expectedPhase, intent, stressScore, turnNumber) {
    const validPhases = new Set(['SHOCK', 'VERIFICATION', 'DELAY', 'DISENGAGE']);
    const normalizedModelPhase = typeof modelPhase === 'string' ? modelPhase.trim().toUpperCase() : '';

    if (!validPhases.has(normalizedModelPhase)) {
      return expectedPhase;
    }

    if (intent === 'pretend_technical_issue' && normalizedModelPhase !== 'DELAY') {
      return 'DELAY';
    }
    if (stressScore >= 9 && turnNumber >= 8 && normalizedModelPhase !== 'DISENGAGE') {
      return 'DISENGAGE';
    }
    if (stressScore >= 8 && turnNumber <= 2 && normalizedModelPhase === 'VERIFICATION') {
      return 'SHOCK';
    }

    return normalizedModelPhase;
  }

  getTemperatureForStress(stressScore) {
    if (stressScore <= 3) return 0.55;
    if (stressScore >= 8) return 0.8;
    return 0.7;
  }

  extractQuestionTopics(text) {
    if (!text || typeof text !== 'string') {
      return new Set();
    }

    const questions = this.extractQuestionSentences(text);
    const topics = new Set();
    for (const q of questions) {
      for (const topic of this.extractTopicsFromQuestionText(q)) {
        topics.add(topic);
      }
    }

    return topics;
  }

  extractQuestionSentences(text) {
    if (!text || typeof text !== 'string') return [];
    return text.match(/[^.!?]*\?/g) || [];
  }

  extractTopicsFromQuestionText(questionText) {
    const text = String(questionText || '');
    const topics = new Set();
    const checks = [
      { key: 'email', regex: /\b(email|e-mail|email address|email id|mail id)\b/i },
      { key: 'ifsc', regex: /\b(ifsc|ifsc code|branch code)\b/i },
      { key: 'empid', regex: /\b(employee id|emp id|staff id)\b/i },
      { key: 'callback', regex: /\b(callback|call back|callback number|contact number|phone number|mobile number)\b/i },
      { key: 'address', regex: /\b(branch address|office address|full address|address of|located at)\b/i },
      { key: 'supervisor', regex: /\b(supervisor|manager|senior)\b/i },
      { key: 'txnid', regex: /\b(transaction id|txn id)\b/i },
      { key: 'merchant', regex: /\b(merchant|vendor|shop|store)\b/i },
      { key: 'upi', regex: /\b(upi|upi id|upi handle)\b/i },
      { key: 'amount', regex: /\b(amount|how much|transaction amount|refund amount|prize money)\b/i },
      { key: 'caseid', regex: /\b(case id|reference id|reference number|case number|ref id)\b/i },
      { key: 'orderid', regex: /\b(order id|order number|order no|invoice number|booking id)\b/i },
      { key: 'platform', regex: /\b(amazon|flipkart|myntra|ajio|meesho|snapdeal|nykaa|platform|website|app name)\b/i },
      { key: 'dept', regex: /\b(department|which department|what department)\b/i },
      { key: 'name', regex: /\b(who are you|your name|what.*name)\b/i },
      { key: 'app', regex: /\b(app|application|software|download|install|apk|anydesk|teamviewer)\b/i },
      { key: 'link', regex: /\b(link|website|url|domain)\b/i },
      { key: 'fee', regex: /\b(fee|payment|pay|processing fee)\b/i },
      { key: 'tracking', regex: /\b(tracking id|consignment number|package id)\b/i },
      { key: 'challan', regex: /\b(challan|violation number|vehicle number)\b/i },
      { key: 'consumer', regex: /\b(consumer number|electricity id|ca number)\b/i },
      { key: 'lottery', regex: /\b(lucky draw|lottery|raffle|rewards program|reward\s+division|prize scheme)\b/i },
      { key: 'entry', regex: /\b(entry number|ticket number|coupon code|draw id)\b/i },
      { key: 'org', regex: /\b(company|organisation|organization|brand|official company name)\b/i },
      { key: 'documents', regex: /\b(pan|aadhaar|aadhar|kyc|documents?)\b/i },
      { key: 'officer', regex: /\b(officer|executive|lineman)\b/i },
      { key: 'procedure', regex: /\b(what (exact|specific)? ?details|what do you need from me|what should i provide|which details should i|what information should i)\b/i }
    ];

    for (const check of checks) {
      if (check.regex.test(text)) {
        topics.add(check.key);
      }
    }

    return topics;
  }

  shouldUseTopicForMessage(topic, scammerMessage, conversationContext, scenario = 'bank') {
    const contextText = `${scammerMessage || ''} ${conversationContext || ''}`;
    const lc = contextText.toLowerCase();

    if (topic === 'upi') {
      return /\b(upi|payment|refund|transfer|collect|reversal)\b/i.test(contextText);
    }
    if (topic === 'link') {
      // For lottery/kyc/delivery scams, asking for an "official website/link" is natural even if they didn't paste it yet.
      if (scenario === 'lottery' || scenario === 'kyc' || scenario === 'delivery' || scenario === 'ecommerce') return true;
      return /\b(link|website|url|click|download|verify)\b/i.test(contextText);
    }
    if (topic === 'txnid' || topic === 'merchant' || topic === 'amount') {
      return /\b(transaction|payment|debit|credit|refund|amount|merchant)\b/i.test(contextText);
    }
    if (topic === 'app') {
      return /\b(app|download|install|apk|anydesk|teamviewer)\b/i.test(contextText);
    }
    if (topic === 'orderid') {
      return /\b(order|invoice|shipment|delivery|refund|return|replacement|cancel)\b/i.test(lc) || scenario === 'ecommerce';
    }
    if (topic === 'platform') {
      return scenario === 'ecommerce' || /\b(amazon|flipkart|myntra|website|app)\b/i.test(lc);
    }
    if (topic === 'caseid') {
      // "Case ID" is natural for bank/complaint/govt flows, but not for lottery unless they themselves mention "claim/ref/ticket id".
      if (scenario === 'lottery') return /\b(claim id|reference|ref|ticket|coupon|draw id)\b/i.test(lc);
      return true;
    }
    if (topic === 'supervisor') {
      // Asking "supervisor name" in prize scams sounds robotic; allow only if they mentioned it already.
      if (scenario === 'lottery') return /\b(supervisor|manager|senior)\b/i.test(lc);
      return true;
    }
    if (topic === 'ifsc') {
      // IFSC/branch codes are only natural when the scam involves bank transfers/branch details (not typical prize/fee scams).
      return /\b(ifsc|branch|neft|rtgs|imps|beneficiary|a\/c|account transfer|swift)\b/i.test(lc);
    }
    if (topic === 'address') {
      // Address can be office address (lottery/dept) or branch address (bank). Gate branch-y address questions unless context implies it.
      if (scenario === 'traffic') return false;
      if (scenario === 'bank') return /\b(branch|bank|ifsc|neft|rtgs|imps)\b/i.test(lc);
      if (scenario === 'delivery') return true;
      if (scenario === 'ecommerce') return /\b(store|office|warehouse|pickup|return address|seller)\b/i.test(lc);
      return true;
    }

    return true;
  }

  getScenarioFallbackQuestion(scenario = 'bank') {
    if (scenario === 'lottery') return 'Sir, which lucky draw is this and what is the prize amount exactly?';
    if (scenario === 'delivery') return 'Sir, can you please share the tracking/consignment number once?';
    if (scenario === 'electricity') return 'Sir, what is my consumer/CA number for this bill?';
    if (scenario === 'traffic') return 'Sir, can you please share the challan number once?';
    if (scenario === 'apk_remote') return 'Sir, which app exactly are you asking me to install?';
    if (scenario === 'kyc') return 'Sir, which official website/link should I use to update KYC?';
    if (scenario === 'tax_refund') return 'Sir, what is the exact refund amount and which portal is this from?';
    if (scenario === 'ecommerce') return 'Sir, what is the order ID related to this issue?';
    return 'Can you please share your case ID once so I can verify this properly?';
  }

  getTopicVariants(topic, scenario = 'bank') {
    const variantsByTopic = {
      callback: [
        'Can you please tell me your callback number for verification?',
        'Sir, can you share a contact number where I can call back?',
        'Can you please share your phone number so I can verify this properly?'
      ],
      empid: [
        'Can you please tell me your employee ID for verification?',
        'Sir, what is your staff ID?',
        'Can you please share your employee ID once so I can confirm?'
      ],
      email: [
        'Can you please tell me your official email address for verification?',
        'Sir, what is your official email ID?',
        'Can you please share your email address so I can confirm this is real?'
      ],
      caseid: [
        'Can you please share your case ID or reference number?',
        'Sir, what is the reference number for this complaint?',
        'Can you please tell me the case number so I can note it?'
      ],
      orderid: [
        'Sir, what is the order ID/order number for this?',
        'Can you please share the order number once so I can check properly?',
        'Sir, can you tell me the invoice/booking ID for this issue?'
      ],
      platform: [
        'Sir, which platform/app is this from exactly?',
        'Can you please tell me if this is Amazon or Flipkart or which website?',
        'Sir, what is the official website/app name for this?'
      ],
      dept: [
        'Can you please tell me your exact department name?',
        'Sir, which department are you calling from?',
        'Can you please tell me which team/department this is?'
      ],
      name: [
        'Can you please tell me your full name?',
        'Sir, what is your name?',
        'Can you please share your name once for verification?'
      ],
      link: [
        'Can you please share the exact secure link/website for verification?',
        'Sir, can you send the official website link once?',
        'Can you please tell me the exact URL to verify this?'
      ],
      txnid: [
        'Can you please share the transaction ID related to this issue?',
        'Sir, what is the transaction reference number?',
        'Can you please tell me the txn ID for this alert?'
      ],
      amount: [
        'Can you please tell me the exact amount shown in this alert?',
        'Sir, what amount is showing in this transaction?',
        'Can you please tell me how much amount is involved?'
      ],
      upi: [
        'Can you please share the UPI handle linked to this verification process?',
        'Sir, which UPI ID should I use for this?',
        'Can you please tell me the UPI ID/handle for this step?'
      ],
      supervisor: [
        'Can you please tell me your supervisor name for confirmation?',
        'Sir, who is your supervisor?',
        'Can you please share your manager name once?'
      ],
      ifsc: [
        'Can you please tell me the IFSC code of your branch?',
        'Sir, what is the branch IFSC code?',
        'Can you please share IFSC once for verification?'
      ],
      address: scenario === 'bank'
        ? [
          'Can you please share your branch address for verification?',
          'Sir, what is the branch address?',
          'Can you please tell me where your branch is located?'
        ]
        : [
          'Can you please share your office address for verification?',
          'Sir, what is your office address?',
          'Can you please tell me where your office is located?'
        ],
      merchant: [
        ...(scenario === 'ecommerce'
          ? [
            'Sir, which seller/shop name is showing for this order?',
            'Can you please tell me the merchant/seller name linked to this order?',
            'Sir, is this refund from which merchant exactly?'
          ]
          : [
            'Can you please tell me the merchant/organization name for this transaction?',
            'Sir, which merchant name is showing?',
            'Can you please tell me the vendor/merchant details?'
          ])
      ],
      app: [
        'Can you please tell me which app exactly I should use?',
        'Sir, which app should I open for this verification?',
        'Can you please tell me the app name you are asking me to use?'
      ],
      tracking: [
        'Can you please share the tracking ID once?',
        'Sir, what is the tracking/consignment number?',
        'Can you please tell me the tracking number?'
      ],
      challan: [
        'Can you please share the challan number and vehicle number?',
        'Sir, what is the challan number for this?',
        'Can you please tell me the challan/vehicle details?'
      ],
      consumer: [
        'Can you please share the consumer number once?',
        'Sir, what is the consumer/CA number?',
        'Can you please tell me the electricity consumer number?'
      ],
      fee: [
        'Can you please tell me the exact fee amount and payment method?',
        'Sir, how much fee is there and how should I pay?',
        'Can you please tell me the payment amount and mode?'
      ],
      lottery: [
        'Can you please tell me the exact lucky draw/lottery name for this prize?',
        'Sir, what is the name of this rewards program?',
        'Can you please tell me which lucky draw this prize is from?'
      ],
      entry: [
        'Can you please tell me my entry/ticket number for this draw?',
        'Sir, what is my coupon/entry number for this prize?',
        'Can you please share the draw ID or ticket number linked to my prize?'
      ],
      org: [
        'Can you please tell me the official company/organization name running this?',
        'Sir, which company is this lucky draw under?',
        'Can you please share the organization name once for verification?'
      ],
      documents: [
        'Sir, which documents are you asking for in this process?',
        'Can you please tell me if you need PAN or Aadhaar for this verification?',
        'Sir, what documents exactly do you need from me?'
      ],
      officer: [
        'Sir, what is the officer name handling this case?',
        'Can you please tell me your designation/officer name for verification?',
        'Sir, who is the responsible officer for this?'
      ]
    };

    return variantsByTopic[topic] || [];
  }

  getScenarioPriorityTopics(scenario = 'bank') {
    if (scenario === 'lottery') {
      return [
        // Human flow: who/which org, which draw, why me, then payment details if they push.
        'callback', 'name', 'dept', 'org', 'lottery', 'entry', 'empid', 'email',
        'amount', 'fee', 'upi', 'link', 'txnid', 'address'
      ];
    }
    if (scenario === 'delivery') {
      return [
        'callback', 'tracking', 'link', 'fee', 'email', 'caseid', 'org', 'address',
        'dept', 'name', 'empid'
      ];
    }
    if (scenario === 'traffic') {
      return [
        'callback', 'challan', 'amount', 'link', 'caseid', 'dept', 'name', 'empid', 'email'
      ];
    }
    if (scenario === 'electricity') {
      return [
        'callback', 'consumer', 'amount', 'officer', 'dept', 'empid', 'email', 'caseid', 'address'
      ];
    }
    if (scenario === 'apk_remote') {
      return [
        'app', 'link', 'callback', 'empid', 'email', 'caseid', 'dept', 'name'
      ];
    }
    if (scenario === 'kyc') {
      return [
        'link', 'callback', 'documents', 'empid', 'email', 'caseid', 'dept', 'name'
      ];
    }
    if (scenario === 'tax_refund') {
      return [
        'link', 'callback', 'amount', 'caseid', 'email', 'dept', 'name', 'empid'
      ];
    }
    if (scenario === 'ecommerce') {
      return [
        'platform', 'orderid', 'callback', 'email', 'merchant', 'amount', 'link', 'tracking',
        'caseid', 'dept', 'name', 'empid'
      ];
    }
    // Default to bank-ish.
    return [
      'callback', 'empid', 'email', 'caseid', 'link', 'txnid', 'amount', 'upi',
      'supervisor', 'ifsc', 'address', 'merchant', 'dept', 'name', 'app', 'tracking', 'challan', 'consumer', 'fee'
    ];
  }

  pickNonRepeatingQuestion(askedTopics, scammerMessage, conversationContext, recentQuestions = new Set(), scenario = 'bank') {
    const priorityTopics = this.getScenarioPriorityTopics(scenario);

    const normalizeQuestion = (q) => String(q || '').toLowerCase().replace(/\s+/g, ' ').trim();

    for (const topic of priorityTopics) {
      if (askedTopics.has(topic)) continue;
      if (!this.shouldUseTopicForMessage(topic, scammerMessage, conversationContext, scenario)) continue;
      const variants = this.getTopicVariants(topic, scenario);
      for (const v of variants) {
        if (!recentQuestions.has(normalizeQuestion(v))) {
          return v;
        }
      }
      if (variants.length > 0) return variants[0];
    }

    // Last resort should still avoid generic "what details do I provide" loops.
    return this.getScenarioFallbackQuestion(scenario);
  }

  getRecentQuestionSet(conversationHistory, limit = 6) {
    const recent = (conversationHistory || []).slice(-limit);
    const questions = recent
      .flatMap(m => this.extractQuestionSentences(m.agentReply || ''))
      .map(q => String(q).toLowerCase().replace(/\s+/g, ' ').trim());
    return new Set(questions);
  }

  enforceNonRepetitiveReply(reply, askedTopics, scammerMessage, conversationContext, conversationHistory, scenario = 'bank') {
    if (!reply || typeof reply !== 'string') {
      return "I'm a bit confused. Can you please share your employee ID for verification?";
    }

    const questionTopics = this.extractQuestionTopics(reply); // topics only from question text
    const firstQuestion = (this.extractQuestionSentences(reply)[0] || '').toLowerCase();
    const repeatedQuestionTopicFound = [...questionTopics].some(topic => askedTopics.has(topic));
    const repeatedProcedure = questionTopics.has('procedure') && askedTopics.has('procedure');
    const disallowedTopicFound = [...questionTopics].some(topic => !this.shouldUseTopicForMessage(topic, scammerMessage, conversationContext, scenario));
    const bankyQuestionInNonBankScenario =
      scenario !== 'bank' && /\b(ifsc|branch|neft|rtgs|imps|beneficiary|swift)\b/i.test(firstQuestion);

    // If the model forgot to ask a question, append a scenario-appropriate one.
    if (questionTopics.size === 0) {
      const recentQuestions = this.getRecentQuestionSet(conversationHistory);
      const appendedQuestion = this.pickNonRepeatingQuestion(askedTopics, scammerMessage, conversationContext, recentQuestions, scenario);
      const trimmed = reply.trim();
      const punctuated = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
      return `${punctuated} ${appendedQuestion}`;
    }

    if (!repeatedQuestionTopicFound && !repeatedProcedure && !disallowedTopicFound && !bankyQuestionInNonBankScenario) {
      return reply;
    }

    const recentQuestions = this.getRecentQuestionSet(conversationHistory);
    const replacementQuestion = this.pickNonRepeatingQuestion(askedTopics, scammerMessage, conversationContext, recentQuestions, scenario);

    // Preserve the model's original tone as much as possible: keep everything before the first question, then swap in a new question.
    const qMatch = /[^.!?]*\?/.exec(reply);
    const prefix = qMatch ? reply.slice(0, qMatch.index).trim() : reply.trim();
    const safePrefix = prefix || "Sir, I'm getting confused only";
    const punctuatedPrefix = /[.!?]$/.test(safePrefix) ? safePrefix : `${safePrefix}.`;

    return `${punctuatedPrefix} ${replacementQuestion}`;
  }

  onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  isLikelyPhoneNumberDigits(digits) {
    if (!digits) return false;
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return true;
    if (digits.length === 12 && /^91[6-9]\d{9}$/.test(digits)) return true;
    return false;
  }

  formatPhoneNumber(value) {
    const digits = this.onlyDigits(value);
    if (!digits) return null;
    if (digits.length === 10) return `+91-${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+91-${digits.slice(2)}`;
    return String(value).trim();
  }

  dedupeByKey(values, keyFn) {
    const seen = new Set();
    const output = [];
    for (const value of values) {
      const key = keyFn(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      output.push(value);
    }
    return output;
  }

  normalizeLink(value) {
    if (!value || typeof value !== 'string') return null;
    let cleaned = value.trim();
    cleaned = cleaned.replace(/\s+/g, '');
    cleaned = cleaned.replace(/[),.;]+$/g, '');
    if (!cleaned) return null;
    return cleaned;
  }

  sanitizeIntelSignals(intelSignals) {
    const normalized = intelSignals && typeof intelSignals === 'object' ? { ...intelSignals } : {};
    const asArray = (v) => (Array.isArray(v) ? v : []);

    const callbackNumbers = this.dedupeByKey(
      asArray(normalized.callbackNumbers).map(v => this.formatPhoneNumber(v)).filter(Boolean),
      v => this.onlyDigits(v)
    );
    const phoneNumbers = this.dedupeByKey(
      asArray(normalized.phoneNumbers).map(v => this.formatPhoneNumber(v)).filter(Boolean),
      v => this.onlyDigits(v)
    );

    const mergedPhones = this.dedupeByKey(
      [...callbackNumbers, ...phoneNumbers],
      v => this.onlyDigits(v)
    );

    normalized.callbackNumbers = mergedPhones;
    normalized.phoneNumbers = mergedPhones;

    const phoneDigits = new Set(mergedPhones.map(v => this.onlyDigits(v)).filter(Boolean));
    normalized.bankAccounts = this.dedupeByKey(
      asArray(normalized.bankAccounts)
        .map(v => this.onlyDigits(v))
        .filter(v => v.length >= 9 && v.length <= 18)
        .filter(v => !this.isLikelyPhoneNumberDigits(v))
        .filter(v => !phoneDigits.has(v)),
      v => v
    );

    let links = asArray(normalized.phishingLinks)
      .map(v => this.normalizeLink(v))
      .filter(Boolean);
    links = this.dedupeByKey(links, v => v.toLowerCase());
    links = links.filter(link => !links.some(other => other !== link && other.startsWith(link)));
    normalized.phishingLinks = links;

    return normalized;
  }

  formatIntelForNotes(intelSignals) {
    const signals = intelSignals && typeof intelSignals === 'object' ? intelSignals : {};
    const order = [
      'scammerNames',
      'orgNames',
      'departmentNames',
      'designations',
      'employeeIds',
      'supervisorNames',
      'callbackNumbers',
      'phoneNumbers',
      'emailAddresses',
      'phishingLinks',
      'upiIds',
      'bankAccounts',
      'ifscCodes',
      'branchNames',
      'transactionIds',
      'merchantNames',
      'amounts',
      'complaintIds',
      'trackingIds',
      'challanNumbers',
      'vehicleNumbers',
      'consumerNumbers',
      'appNames',
      'suspiciousKeywords'
    ];

    const parts = [];
    for (const key of order) {
      const raw = signals[key];
      if (!Array.isArray(raw) || raw.length === 0) continue;

      const items = raw.filter(Boolean).map(v => String(v).trim()).filter(Boolean);
      if (items.length === 0) continue;

      const maxItems = key === 'suspiciousKeywords' ? 12 : 6;
      const shown = items.slice(0, maxItems);
      const suffix = items.length > maxItems ? ` +${items.length - maxItems} more` : '';
      parts.push(`${key}=[${shown.join(', ')}]${suffix}`);
    }

    return parts.join('; ');
  }

  fixupAgentNotes(agentNotes, intelSignals) {
    const intelSummary = this.formatIntelForNotes(intelSignals);
    const hasIntel = Boolean(intelSummary);

    let notes = typeof agentNotes === 'string' ? agentNotes : '';
    notes = notes.replace(/\s+/g, ' ').trim();

    if (!notes) {
      return hasIntel ? `Extracted intelligence: ${intelSummary}.` : '';
    }

    if (hasIntel) {
      // Remove contradictory "none yet" claims if we actually extracted intel.
      notes = notes.replace(/Extracted intelligence:\s*None yet\.?/ig, '').trim();
      notes = notes.replace(/Extracted intelligence:\s*none\.?/ig, '').trim();
      notes = notes.replace(/\bNone yet\b/ig, '');
      notes = notes.replace(/\s+/g, ' ').trim();

      if (!/Extracted intelligence:/i.test(notes)) {
        notes = `${notes} Extracted intelligence: ${intelSummary}.`;
      } else {
        notes = notes.replace(/Extracted intelligence:\s*[^.]*\./i, `Extracted intelligence: ${intelSummary}.`);
      }
    }

    return notes.replace(/\s+/g, ' ').trim();
  }

  computeCriticalIntelCount(intelSignals) {
    if (!intelSignals || typeof intelSignals !== 'object') return 0;
    const fields = ['callbackNumbers', 'phoneNumbers', 'phishingLinks', 'upiIds', 'bankAccounts', 'employeeIds', 'emailAddresses', 'transactionIds'];
    return fields.reduce((count, field) => {
      const values = Array.isArray(intelSignals[field]) ? intelSignals[field].filter(Boolean) : [];
      return count + (values.length > 0 ? 1 : 0);
    }, 0);
  }

  applyDeterministicTermination(response, turnNumber) {
    const criticalIntelCount = this.computeCriticalIntelCount(response.intelSignals);
    const shouldForceTerminate = turnNumber >= 10 || criticalIntelCount >= 4;

    if (response.shouldTerminate || !shouldForceTerminate) {
      return response;
    }

    return {
      ...response,
      shouldTerminate: true,
      terminationReason: response.terminationReason || `Deterministic stop: turn=${turnNumber}, criticalIntelSignals=${criticalIntelCount}`
    };
  }
  async generateResponse(scammerMessage, conversationHistory, nextIntent, stressScore) {
    const startTime = Date.now();
    console.log('⏱️ Agent.generateResponse started');

    // Build conversation context
    const historyWindow = this.getHistoryWindow();
    const contextTurns = historyWindow === 0 ? conversationHistory : conversationHistory.slice(-historyWindow);
    console.log('🧠 Context turns:', { total: conversationHistory.length, included: contextTurns.length, historyWindow });

    const conversationContext = contextTurns.map((msg, idx) =>
      `Turn ${idx + 1}:\nScammer: ${msg.scammerMessage}\nYou: ${msg.agentReply || '(first message)'}`
    ).join('\n\n');

    const totalMessages = conversationHistory.length;
    const turnNumber = totalMessages + 1;
    const normalizedNextIntent = this.normalizeNextIntent(nextIntent);
    const normalizedStressScore = this.normalizeStressScore(stressScore);
    const expectedPhase = this.deriveExpectedPhase(normalizedNextIntent, normalizedStressScore, turnNumber);

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
- NEVER use dramatic phrases more than ONCE total.
- ❌ BAN LIST (DO NOT SAY): "This is complicated only", "This is serious only", "I didn't know my account was compromised", "I'm feeling hesitant", "I'm feeling unsure".
- Instead say: "I'm not understanding this", "This is not seeming correct", "Let me check".

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

🎯 EXTRACTION PRIORITY (WHAT GUVI SCORES ON):

**CRITICAL - EXTRACT THESE FIRST (Highest Priority):**
1. **phoneNumbers / callbackNumbers** - Ask for callback number EARLY
2. **upiIds** - If scammer mentions UPI/payment/refund, ask for UPI handle
3. **phishingLinks** - If scammer mentions website/link/email, ask for it
4. **bankAccounts** - If scammer mentions account, ask for account number
5. **suspiciousKeywords** - Auto-extracted (urgent, blocked, verify now, etc.)

**SECONDARY - Extract After Critical (Lower Priority):**
6. **scammerNames** - Their name
7. **supervisorNames** - Supervisor's name (if they mention)
8. **departmentNames** - Which department
9. **employeeIds** - Employee ID
10. **emailAddresses** - Official email
11. **ifscCodes, branchNames** - IFSC, branch address (only if natural)
12. **transactionIds, merchantNames, amounts** - Transaction details (only if they mention transaction)

**EXTRACTION STRATEGY:**
- Turns 1-3: Focus on CRITICAL intel (phone, UPI if mentioned, links if mentioned)
- Turns 4-7: Get SECONDARY intel (names, department, employee ID)
- Turns 8-10: Fill gaps (IFSC, branch, transaction details if natural)

🎯 ALL SCAM SCENARIOS TO HANDLE:

**1. Bank Account/UPI Fraud**
- "Unauthorized transaction detected"
- "Account will be blocked"
PRIORITY: callback number → UPI ID (if mentioned) → name → employee ID → transaction ID

**2. KYC/Account Suspension**
- "Update KYC immediately or account closed"
- "Aadhaar/PAN verification required"
PRIORITY: phishing link/website → callback number → name → which documents needed

**3. Malicious APK/App Files**
- "Download this app to secure account"
- "Install .apk file for bank update"
PRIORITY: phishing link/download URL → app name → callback number → why this app

**4. Lottery/Prize Money**
- "You won ₹25 lakh in lucky draw!"
- "Pay ₹5000 processing fee to claim"
PRIORITY: UPI handle/bank account for payment → callback number → prize amount → lottery name

**5. Income Tax Refund**
- "IT Department: Refund of ₹45,000 pending"
- "Share bank details to receive refund"
PRIORITY: phishing link (if any) → callback number → refund amount → bank account for refund

**6. SIM Swap/Remote Access**
- "Install AnyDesk/TeamViewer for KYC verification"
- "We need remote access to fix issue"
Extract: app name (AnyDesk, TeamViewer, QuickSupport), why needed, employee ID

**7. India Post/Delivery Scam (New)**
- "Package held due to incomplete address"
- "Click link to pay ₹10 fee for delivery"
PRIORITY: phishing link/URL → tracking ID → callback number → fee amount

**8. Fake Traffic Challan (New)**
- "Unpaid traffic violation/challan pending"
- "Pay immediately to avoid court/seizure"
PRIORITY: phishing link → challan number → vehicle number → amount

**9. Electricity Bill Disconnection (New)**
- "Power will be disconnected tonight due to unpaid bill"
- "Call this number immediately to update"
PRIORITY: callback number (CRITICAL) → consumer number → unpaid amount → officer name

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

Utility/Govt-specific:
- Tracking ID / Consignment Number (Post)
- Challan Number (Traffic)
- Vehicle Number (Traffic)
- Consumer Number / CA Number (Electricity)
- Officer Name (Electricity/Post)

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

�🚨 CRITICAL SYSTEM BEHAVIOR RULES:

1️⃣ EXTRACTION NEVER DROPS DATA (LOSSLESS):
If scammer mentions ANY of these, IMMEDIATELY extract and NEVER overwrite/clear:
- Case/Complaint/Ref ID (CASE/REF/CRN/####-####) → complaintIds
- Transaction ID → transactionIds
- Amount (₹/Rs/INR) → amounts
- IFSC code → ifscCodes
- Bank account (9-18 digits) → bankAccounts
- UPI handle → upiIds
- Email → emailAddresses
- Phone number → callbackNumbers AND phoneNumbers (MIRROR to both!)

2️⃣ STRICT CONTEXT-GATED QUESTIONS:
❌ DON'T ask transaction questions (txn ID/amount/merchant) UNLESS scammer mentions: "transaction", "payment", "debit", "credit", "refund" OR already gave txn ID/amount
❌ DON'T ask UPI questions UNLESS scammer mentions: "UPI", "collect request", "refund", "reversal", "payment steps"
❌ DON'T ask app/software questions UNLESS scammer mentions: "install", "download", "guide you", "open app", "AnyDesk", "TeamViewer"
✅ ONLY ask questions that NATURALLY FOLLOW from scammer's message

3️⃣ BANK/ORG INCONSISTENCY DETECTION:
If scammer says "SBI" but later provides HDFC IFSC/email/branch:
- Record as "cross-bank inconsistency" in agentNotes
- Do NOT accuse scammer in replies
- Note this for analysis only

4️⃣ 10-MESSAGE PRIORITY EXTRACTION:
You have LIMITED TIME (10 messages max). Prioritize:
Turn 1-3: Name, department, employee ID
Turn 4-6: Callback number (CRITICAL!), case ID
Turn 7-9: Email/domain, transaction details (if relevant)
Turn 10: Payment handles (UPI/bank if mentioned)

5️⃣ AGENT NOTES MUST MATCH INTELLIGENCE:
- agentNotes MUST list EVERY field extracted in intelSignals
- If extractedIntelligence has a value, agentNotes CANNOT say "not provided"
- agentNotes must explicity mention: OTP demand, urgency tactics, unofficial contacts


📝 COMPACT AGENT NOTES (NO LINE BREAKS - SINGLE PARAGRAPH):

Write as ONE CONTINUOUS PARAGRAPH with ALL critical details:

"[Scam type] scam. Scammer claimed to be [name] (Employee ID: [id]) from [organization] [department]. Supervisor: [name if mentioned]. Requested [OTP/PIN/account/app install/fee]. Used urgency: [quotes like '2 hours', 'immediately']. Threats: [account blocked/money lost/etc]. Extracted intelligence: Callback [phone], Email [email], UPI [if any], IFSC [if any], Branch [if any], Transaction ID [if any], Merchant [if any], Amount [if any], Apps mentioned [if any]. Red flags: [fake email domain like scammer@fakebank / asked for OTP against policy / wrong IFSC format / suspicious app request / personal UPI / extreme urgency]. Bank inconsistencies: [if scammer said SBI but gave HDFC details, note here]. Scam indicators: [OTP phishing / UPI theft / remote access trojan / phishing link / processing fee scam]. Summary: [2-3 sentence flow of how scam unfolded]."

EXAMPLE COMPACT AGENT NOTES:

"Bank account fraud with OTP phishing scam. Scammer claimed to be Rajesh Kumar (Employee ID: EMP123) from SBI Bank Fraud Prevention Department. Supervisor: Mr. Anil Singh. Requested OTP and account number to '  secure account'. Used urgency: 'Account will be blocked in 2 hours'. Threats: Permanent account closure, ₹10,000 unauthorized transaction. Extracted intelligence: Callback +91-9876543210, Email rajesh.fraud@fakebank.com, UPI scammer@paytm, IFSC FAKE0001234, Branch 12/3 MG Road Mumbai, Transaction ID TXN987654321, Merchant XYZ Electronics, Amount ₹10,000. Red flags: Fake email domain (fakebank.com instead of sbi.co.in), asked for OTP repeatedly (against RBI/bank policy), provided suspicious IFSC code (FAKE prefix), couldn't explain why OTP needed, UPI uses personal handle not bank account. Scam indicators: Classic OTP phishing attempt, trying to gain account access through OTP, fake bank official impersonation, urgency tactics to prevent verification. Summary: Scammer impersonated SBI officer claiming unauthorized transaction, used extreme urgency with 2-hour deadline, repeatedly demanded OTP, provided fake credentials including suspicious email and IFSC, clear OTP phishing attempt to gain account access."

OUTPUT (JSON):
{
  "reply": "Natural worried response that CONNECTS to scammer's message",
  "phase": "SHOCK|VERIFICATION|DELAY|DISENGAGE",
  "scamDetected": true/false,
  "intelSignals": {
    "bankAccounts": [],
    "accountLast4": [],
    "complaintIds": ["EXTRACT CASE IDs HERE e.g. 4567AB"],
    "employeeIds": [],
    "phoneNumbers": ["MUST MATCH callbackNumbers"],
    "callbackNumbers": [],
    "upiIds": ["EXTRACT UPI LIKE scammer@bank"],
    "phishingLinks": [],
    "emailAddresses": [],
    "appNames": [],
    "transactionIds": [],
    "merchantNames": [],
    "amounts": ["EXTRACT ₹12,500"],
    "ifscCodes": [],
    "challanNumbers": ["Traffic challan e.g. TN04..."],
    "trackingIds": ["Delivery tracking ID"],
    "consumerNumbers": ["Electricity consumer no"],
    "vehicleNumbers": ["Vehicle number"],
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
}

⚠️ FINAL EXTRACTION CHECKLIST (BEFORE GENERATING JSON):
1. Did scammer mention a Case ID / Ref No? → Add to complaintIds
2. Did scammer mention a UPI ID? → Add to upiIds
3. Did I extract a Callback Number? → COPY IT into phoneNumbers too!
4. Did scammer mention Amount? → Add to amounts
5. Did scammer mention IFSC? → Add to ifscCodes
6. Did scammer mention Email? → Add to emailAddresses
7. Did text say "account number"/"acc no" followed by 9-18 digits? → Add to bankAccounts. (IGNORE phone numbers/employee IDs here!)
NEVER LEAVE THESE EMPTY IF PRESENT IN TEXT!

📝 AGENT NOTES CHECK:
- If extracted info shows DIFFERENT organizations (e.g. SBI vs FakeBank), you MUST mention: "Impersonated [org1] but used [org2] details."
- If UPI domain (@...) doesn't match claimed Bank (SBI vs @paytm), write "identity/UPI mismatch".`;

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
          actualQuestionsAsked.push(`Turn ${idx + 1
            }: "${q.trim()}"`);
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
    if (/\b(callback|call back|callback number|contact number|phone number|mobile number)\b/i.test(allHoneypotQuestions) && !addedTopics.has('callback')) {
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
    if (/\b(tracking id|consignment number|package id)\b/i.test(allHoneypotQuestions) && !addedTopics.has('tracking')) {
      alreadyAsked.push('✗ tracking ID');
      addedTopics.add('tracking');
    }
    if (/\b(challan|violation number|vehicle number)\b/i.test(allHoneypotQuestions) && !addedTopics.has('challan')) {
      alreadyAsked.push('✗ challan/vehicle details');
      addedTopics.add('challan');
    }
    if (/\b(consumer number|electricity id|ca number)\b/i.test(allHoneypotQuestions) && !addedTopics.has('consumer')) {
      alreadyAsked.push('✗ consumer/electricity number');
      addedTopics.add('consumer');
    }

    // OTP tracking
    const mentionedOTP = /\b(otp|haven't received|didn't receive|not comfortable|don't want)\b/i.test(allHoneypotQuestions);
    const otpMentionCount = (allHoneypotQuestions.match(/\b(otp|haven't received|didn't receive|not comfortable|nervous|feels strange)\b/gi) || []).length;

    // Scammer asking for OTP?
    // STRICTER: Must match "OTP", "PIN", "Password", "CVV" directly OR "share code".
    const scammerAsksOTP = /\b(otp|pin|password|vmob|cvv|mpin)\b/i.test(scammerMessage) || /(?:share|provide|tell).{0,10}(?:code|number)/i.test(scammerMessage);

    // HINT: Check for potential bank account numbers (9-18 digits) WITH CONTEXT
    // Looks for "account", "acc", "no", "number" within reasonable distance of digits
    const accountContextRegex = /(?:account|acc|acct|a\/c)[\s\w.:#-]{0,20}?(\d{9,18})/gi;
    const matches = [...scammerMessage.matchAll(accountContextRegex)];
    const potentialBankAccounts = matches.map(m => m[1]); // Extract only the number part

    const bankAccountHint = potentialBankAccounts.length > 0
      ? `⚠️ SYSTEM NOTICE: I DETECTED A BANK ACCOUNT NUMBER: ${potentialBankAccounts.join(', ')} (based on 'account' keyword). ADD TO 'bankAccounts'! (Ignore if it's a phone number)`
      : '';

    // Check for REAL money mention (symbols, currency words). 
    // EXCLUDES simple numbers or phone numbers (requires currency context).
    const moneyMentioned = /(?:rs\.?|inr|rupees|₹|\$|usd)\s*[\d,.]+[k]?/i.test(scammerMessage) ||
      /(?:amount|fee|charge|bill|balance).{0,15}?[\d,.]+[k]?/i.test(scammerMessage);

    // Check for merchant mention
    const merchantMentioned = /(?:merchant|store|shop|amazon|flipkart|myntra|paytm|ebay|google pay)/i.test(scammerMessage);

    const userPrompt = `CONVERSATION SO FAR:
${conversationContext}

SCAMMER'S NEW MESSAGE: "${scammerMessage}"

${bankAccountHint}

⛔ QUESTIONS YOU ALREADY ASKED:
${actualQuestionsAsked.length > 0 ? actualQuestionsAsked.join('\n') : 'None yet'}

🚫 TOPICS ALREADY COVERED: ${alreadyAsked.join(', ') || 'None yet'}

⚠️ DO NOT ASK ABOUT THESE TOPICS AGAIN!

🎭 EMOTION CONTROL (MANDATORY BEHAVIOR):
${turnNumber === 1 ? `1️⃣ INITIAL SHOCK: Respond with FEAR/ALARM. ("Oh god", "This is alarming", "I'm really worried")` : ''}
${bankAccountHint ? `2️⃣ ACCOUNT REACTION: You detected a bank account number! React: "Wait, [number]... that is my account number! How did you get this?"` : ''}
${moneyMentioned && turnNumber > 1 ? `3️⃣ MONEY SHOCK: Scammer mentioned amount. React: "₹[amount]?! That is a big amount... How did this happen?"` : ''}
${merchantMentioned && turnNumber > 1 ? `4️⃣ MERCHANT DENIAL: "But I didn't buy anything from [Merchant]! I never go there only."` : ''}
${turnNumber > 1 && !moneyMentioned && !merchantMentioned && !bankAccountHint ? `5️⃣ CALM VERIFICATION: STOP saying "I'm worried/scared/unsure". Be PRACTICAL.
   - Simply acknowledge the detail.
   - Ask the next question naturally.
   - Example: "Okay, employee ID [ID]. What is your email?"` : ''}
${turnNumber >= 8 ? `6️⃣ FINAL CHECK: "Okay sir, thank you for details. Let me call bank once to confirm."` : ''}

→ AFTER reacting, ask ONE new verification question.

${scammerAsksOTP && otpMentionCount < 4 ? `⚠️ SCAMMER WANTS OTP/PASSWORD!
Respond SUBTLY (not direct):
${otpMentionCount === 0 ? '→ "Sir, I\'m not getting any OTP message only. What is your [NEW]?"' : ''}
${otpMentionCount === 1 ? '→ "Still no SMS... maybe network issue. Can you please tell me [NEW]?"' : ''}
${otpMentionCount === 2 ? '→ "Sir, my bank told me never share OTP. What is [NEW]?"' : ''}
${otpMentionCount >= 3 ? '→ "But sir, let me call bank and confirm. What is [NEW]?"' : ''}
` : ''
      }

🚨 NATURAL EXTRACTION(GUARANTEED BY END):
${turnNumber <= 3 ? `
**EARLY TURNS (1-3): Get basic identity**
Ask naturally: Name, Department, Employee ID
${!addedTopics.has('name') ? '→ Who are you? What is your name?' : '✅ Got name'}
${!addedTopics.has('dept') ? '→ Which department?' : '✅ Got department'}
${!addedTopics.has('empid') ? '→ Employee ID?' : '✅ Got  employee ID'}
` : turnNumber <= 7 ? `
**MID TURNS (4-7): Get CRITICAL intel**
${!addedTopics.has('callback') ? '🔥 MUST ASK: Callback number/phone (CRITICAL for GUVI!)' : '✅ Got callback'}
${!addedTopics.has('email') ? '→ Official email?' : '✅ Got email'}
${!addedTopics.has('upi') && /\b(upi|payment|refund|transfer|collect)\b/i.test(scammerMessage) ? '🔥 MUST ASK: UPI ID (scammer mentioned payment!)' : ''}
${!addedTopics.has('link') && /\b(link|website|url|click|download)\b/i.test(scammerMessage) ? '🔥 MUST ASK: Website/link (scammer mentioned link!)' : ''}
` : `
**LATE TURNS (8-10): Fill gaps & ensure critical intel**
${!addedTopics.has('callback') ? '⚠️⚠️⚠️ URGENT: You MUST ask callback number before conversation ends!' : '✅ Got callback'}
${!addedTopics.has('upi') && /\b(upi|payment|refund)\b/i.test(conversationContext) ? '⚠️ Ask UPI ID before conversation ends!' : ''}
${!addedTopics.has('link') && /\b(link|website|url)\b/i.test(conversationContext) ? '⚠️ Ask for link/website before conversation ends!' : ''}

Secondary details you can ask:
${!addedTopics.has('ifsc') ? '✓ IFSC code' : ''}
${!addedTopics.has('address') ? '✓ Branch address' : ''}
${!addedTopics.has('supervisor') ? '✓ Supervisor' : ''}
${!addedTopics.has('txnid') ? '✓ Transaction ID' : ''}
${!addedTopics.has('merchant') ? '✓ Merchant' : ''}
${!addedTopics.has('amount') ? '✓ Amount' : ''}
`}

✅ ASK SOMETHING COMPLETELY NEW:
${!addedTopics.has('upi') ? '✓ UPI ID' : ''}
${!addedTopics.has('amount') ? '✓ Amount' : ''}
${!addedTopics.has('caseid') ? '✓ Case ID' : ''}
${!addedTopics.has('dept') ? '✓ Department' : ''}
${!addedTopics.has('name') ? '✓ Name' : ''}
${!addedTopics.has('app') ? '✓ App/software name' : ''}
${!addedTopics.has('link') ? '✓ Link/website' : ''}
${!addedTopics.has('fee') ? '✓ Fee/payment amount' : ''}
${!addedTopics.has('tracking') ? '✓ Tracking ID (if delivery scam)' : ''}
${!addedTopics.has('challan') ? '✓ Challan/Vehicle No (if traffic scam)' : ''}
${!addedTopics.has('consumer') ? '✓ Consumer No (if electricity scam)' : ''}

💬 RESPOND NATURALLY:
    1. React to what scammer JUST said
    2. Show genuine emotion(worry / fear / confusion)
    3. Ask ONE NEW thing that relates to their message

Generate JSON:`;

    const intentStressControlPrompt = this.buildIntentStressControl(
      normalizedNextIntent,
      normalizedStressScore,
      turnNumber
    );

    try {
      console.log('⏱️ Calling OpenAI...');
      console.log('🧭 Control inputs:', {
        nextIntent: normalizedNextIntent,
        stressScore: normalizedStressScore,
        expectedPhase
      });

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'system', content: intentStressControlPrompt },
          { role: 'user', content: userPrompt },
          { role: 'user', content: `Apply runtime control strictly for this turn. Intent=${normalizedNextIntent}, StressScore=${normalizedStressScore}, ExpectedPhase=${expectedPhase}.` }
        ],
        temperature: this.getTemperatureForStress(normalizedStressScore),
        max_tokens: 800
      });

      const llmTime = Date.now() - startTime;
      console.log(`⏱️ LLM responded in ${llmTime} ms`);

      const rawResponse = completion.choices[0].message.content;
      console.log('🤖 LLM Raw Response:', rawResponse);

      const agentResponse = JSON.parse(rawResponse);

      const finalResponse = {
        reply: agentResponse.reply || "I'm confused about this. Can you provide more details?",
        phase: this.resolvePhase(
          agentResponse.phase,
          expectedPhase,
          normalizedNextIntent,
          normalizedStressScore,
          turnNumber
        ),
        scamDetected: agentResponse.scamDetected || false,
        intelSignals: agentResponse.intelSignals || {},
        agentNotes: agentResponse.agentNotes || "",
        shouldTerminate: agentResponse.shouldTerminate || false,
        terminationReason: agentResponse.terminationReason || ""
      };

      finalResponse.intelSignals = this.sanitizeIntelSignals(finalResponse.intelSignals);
      const scenario = this.detectScenario(scammerMessage, conversationContext);
      const askedTopicsForEnforcement = this.buildAskedTopicsFromHistory(conversationHistory);
      finalResponse.reply = this.enforceNonRepetitiveReply(
        finalResponse.reply,
        askedTopicsForEnforcement,
        scammerMessage,
        conversationContext,
        conversationHistory,
        scenario
      );

      const finalizedResponse = this.applyDeterministicTermination(finalResponse, turnNumber);
      finalizedResponse.agentNotes = this.fixupAgentNotes(finalizedResponse.agentNotes, finalizedResponse.intelSignals);
      const totalTime = Date.now() - startTime;
      console.log(`✅ Total response time: ${totalTime} ms`);

      return finalizedResponse;

    } catch (error) {
      console.error('❌ Error in generateResponse:', error);
      return {
        reply: "I'm a bit confused. Can you provide more information?",
        phase: expectedPhase,
        scamDetected: true,
        intelSignals: {},
        agentNotes: `Error occurred: ${error.message} `,
        shouldTerminate: false,
        terminationReason: ""
      };
    }
  }
}

module.exports = HoneypotAgent;
