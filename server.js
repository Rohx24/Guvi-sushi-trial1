/**
 * Agentic Honey-Pot API Server - GUVI Format
 * Handles conversation requests matching GUVI requirements
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const HoneypotAgent = require('./honeypotAgent');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'honeypot-guvi-2026-secure-key';
const GUVI_CALLBACK_URL = 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult';
const CALLBACK_MAX_RETRIES = 3;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------
// Section B: Deterministic Intel Extraction (server-side)
// ---------------------------
const FULL_INTEL_SCHEMA_KEYS = [
    'bankAccounts',
    'accountLast4',
    'complaintIds',
    'employeeIds',
    'phoneNumbers',
    'callbackNumbers',
    'upiIds',
    'phishingLinks',
    'emailAddresses',
    'appNames',
    'transactionIds',
    'merchantNames',
    'amounts',
    'ifscCodes',
    'challanNumbers',
    'trackingIds',
    'consumerNumbers',
    'vehicleNumbers',
    'departmentNames',
    'designations',
    'supervisorNames',
    'scammerNames',
    'orgNames',
    'suspiciousKeywords',
    'branchNames'
];

const ensureIntelSchema = (intel) => {
    const out = (intel && typeof intel === 'object') ? { ...intel } : {};
    for (const key of FULL_INTEL_SCHEMA_KEYS) {
        if (!Array.isArray(out[key])) out[key] = [];
    }
    return out;
};

// ---------------------------
// Section A: Strict per-turn response contract
// Must return EXACTLY: { status: "success", reply: "<string>" }
// ---------------------------
const toStrictTurnPayload = (payload) => ({
    status: 'success',
    reply: String(payload?.reply ?? '')
});

const assertStrictTurnPayload = (payload) => {
    const strict = toStrictTurnPayload(payload);
    const keys = Object.keys(payload && typeof payload === 'object' ? payload : {});
    const extraKeys = keys.filter(k => k !== 'status' && k !== 'reply');
    if (extraKeys.length > 0) {
        console.warn('⚠️ Turn payload contained extra keys; stripping:', extraKeys);
    }
    return strict;
};

// ---------------------------
// Rubric C: Engagement Metrics (server-side truth)
// ---------------------------
const computeEngagementMetrics = (sessionData, sessionEndTs) => {
    const end = Number.isFinite(Number(sessionEndTs)) ? Number(sessionEndTs) : Date.now();
    const start = Number.isFinite(Number(sessionData?.sessionStartTs)) ? Number(sessionData.sessionStartTs) : end;
    const engagementDurationSeconds = Math.max(0, Math.round((end - start) / 1000));
    const totalMessagesExchanged = Array.isArray(sessionData?.messages) ? sessionData.messages.length : 0;
    return { engagementDurationSeconds, totalMessagesExchanged };
};

const normalizeForExtraction = (text) => {
    let t = String(text || '');
    if (!t) return '';
    t = t.replace(/\b(https?)\s*:\s*\/\s*\//gi, '$1://');
    t = t.replace(/\bwww\s*\.\s*/gi, 'www.');
    // "pay. com" => "pay.com", "trafficpolice. gov" => "trafficpolice.gov"
    t = t.replace(/(\b[a-z0-9-]{2,})\s*\.\s*([a-z]{2,10}\b)/gi, '$1.$2');
    t = t.replace(/\s+/g, ' ').trim();
    return t;
};

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

const normalizeIndianPhone = (value) => {
    const digits = onlyDigits(value);
    if (!digits) return null;
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return `+91-${digits}`;
    if (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) return `+91-${digits.slice(2)}`;
    return null;
};

const isLikelyIndianPhoneDigits = (digits) => {
    if (!digits) return false;
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) return true;
    if (digits.length === 12 && /^91[6-9]\d{9}$/.test(digits)) return true;
    return false;
};

const isValidEmail = (value) => /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(String(value || ''));

const isValidUpiId = (value) => {
    const v = String(value || '').trim();
    if (!/^[a-z0-9][a-z0-9._-]{1,48}@[a-z0-9]{2,20}$/i.test(v)) return false;
    const domain = v.split('@')[1] || '';
    if (domain.includes('.')) return false;
    if (['com', 'in', 'org', 'net', 'gov', 'edu', 'co'].includes(domain.toLowerCase())) return false;
    return true;
};

const isValidHttpUrl = (value) => /^https?:\/\/[^\s"'<>]+$/i.test(String(value || '').trim());

const VALID_TLDS = new Set(['com', 'in', 'co', 'org', 'net', 'gov', 'edu', 'io', 'me', 'info']);

const isValidDomainOrDomainPath = (value) => {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return false;
    if (v.includes('@')) return false;

    const candidate = v.replace(/^www\./, '');
    const host = candidate.split('/')[0] || '';
    if (!host || host.length > 253) return false;
    if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,10}$/.test(host)) return false;

    const tld = host.split('.').pop();
    if (!tld || !VALID_TLDS.has(tld)) return false;
    return true;
};

const normalizeLinkStrict = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const cleaned = raw.replace(/\s+/g, '').replace(/[),.;]+$/g, '');
    if (!cleaned) return null;

    if (isValidHttpUrl(cleaned)) {
        try {
            const u = new URL(cleaned);
            const host = (u.hostname || '').toLowerCase();
            const tld = host.split('.').pop();
            if (!tld || !VALID_TLDS.has(tld)) return null;
            return cleaned;
        } catch {
            return null;
        }
    }

    if (isValidDomainOrDomainPath(cleaned)) return cleaned;
    return null;
};

const sanitizeIntelStrict = (intel) => {
    const out = ensureIntelSchema(intel);

    // Phones: normalize + mirror.
    const phones = [];
    for (const v of [...out.phoneNumbers, ...out.callbackNumbers]) {
        const n = normalizeIndianPhone(v);
        if (n) phones.push(n);
    }
    const seenDigits = new Set();
    const mergedPhones = [];
    for (const p of phones) {
        const d = onlyDigits(p);
        if (!d || seenDigits.has(d)) continue;
        seenDigits.add(d);
        mergedPhones.push(p);
    }
    out.phoneNumbers = mergedPhones;
    out.callbackNumbers = mergedPhones;

    // Emails
    out.emailAddresses = [...new Set(out.emailAddresses.filter(isValidEmail).map(v => String(v).trim().toLowerCase()))];

    // UPI
    out.upiIds = [...new Set(out.upiIds.filter(isValidUpiId).map(v => String(v).trim().toLowerCase()))];

    // Links
    const links = [];
    for (const v of out.phishingLinks) {
        const n = normalizeLinkStrict(v);
        if (n) links.push(n);
    }
    out.phishingLinks = [...new Set(links.map(v => v.toLowerCase()))];

    // Bank accounts: digits only, 9-18, not phone-like.
    const phoneDigits = new Set(mergedPhones.map(p => onlyDigits(p)).filter(Boolean));
    out.bankAccounts = [...new Set(out.bankAccounts
        .map(v => onlyDigits(v))
        .filter(v => v.length >= 9 && v.length <= 18)
        .filter(v => !isLikelyIndianPhoneDigits(v))
        .filter(v => !phoneDigits.has(v))
    )];

    // Basic cleanup for other fields (keep lossless but dedupe).
    const dedupeLower = (arr) => [...new Set((Array.isArray(arr) ? arr : []).map(v => String(v).trim()).filter(Boolean).map(v => v.toLowerCase()))];
    out.challanNumbers = dedupeLower(out.challanNumbers);
    out.vehicleNumbers = dedupeLower(out.vehicleNumbers);
    out.trackingIds = dedupeLower(out.trackingIds);
    out.consumerNumbers = dedupeLower(out.consumerNumbers);

    return out;
};

const mergeIntelSignals = (base, extra) => {
    const out = ensureIntelSchema(base);
    const e = ensureIntelSchema(extra);

    for (const key of FULL_INTEL_SCHEMA_KEYS) {
        if (!Array.isArray(out[key])) out[key] = [];
        if (!Array.isArray(e[key])) continue;
        out[key] = [...out[key], ...e[key]];
    }

    // Defer strict sanitize to clean + dedupe.
    return sanitizeIntelStrict(out);
};

const extractDeterministicIntel = (text) => {
    const t = normalizeForExtraction(text);
    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    const tNoEmails = t.replace(emailRegex, ' ');
    const tForContext = tNoEmails
        .replace(/\bhttps?:\/\/[^\s"'<>]+/gi, ' ')
        .replace(/\bwww\.[^\s"'<>]+/gi, ' ')
        .replace(/\b(?:[a-z0-9][a-z0-9-]{0,61}\.)+[a-z]{2,10}\b(?:\/[^\s"'<>]*)?/gi, ' ');
    const intel = ensureIntelSchema({});

    // Phones
    const phoneCandidates = [];
    for (const m of t.match(/\+?91[\s-]?[6-9]\d{9}\b/g) || []) phoneCandidates.push(m);
    for (const m of t.match(/\b[6-9]\d{9}\b/g) || []) phoneCandidates.push(m);
    const normalizedPhones = [];
    for (const p of phoneCandidates) {
        const n = normalizeIndianPhone(p);
        if (n) normalizedPhones.push(n);
    }
    intel.phoneNumbers = [...new Set(normalizedPhones)];
    intel.callbackNumbers = intel.phoneNumbers;

    // Emails
    for (const m of t.match(emailRegex) || []) {
        if (isValidEmail(m)) intel.emailAddresses.push(String(m).trim().toLowerCase());
    }
    intel.emailAddresses = [...new Set(intel.emailAddresses)];

    // UPI
    const upiRe = /\b[a-z0-9][a-z0-9._-]{1,48}@[a-z0-9]{2,20}\b/gi;
    for (let m; (m = upiRe.exec(tNoEmails)) !== null;) {
        const raw = m[0];
        const nextCh = tNoEmails[m.index + raw.length] || '';
        if (nextCh === '-' || nextCh === '.') continue; // avoid prefix matches of emails like help@traffic-police.in
        if (isValidUpiId(raw)) intel.upiIds.push(String(raw).trim().toLowerCase());
    }
    intel.upiIds = [...new Set(intel.upiIds)];

    // Links: http(s) + domains
    const links = [];
    for (const m of t.match(/\bhttps?:\/\/[^\s"'<>]+/gi) || []) links.push(m);
    for (const m of tNoEmails.match(/\bwww\.[^\s"'<>]+/gi) || []) links.push(m);
    for (const m of tNoEmails.match(/\b(?:[a-z0-9][a-z0-9-]{0,61}\.)+[a-z]{2,10}\b(?:\/[^\s"'<>]*)?/gi) || []) links.push(m);

    const normalizedLinks = [];
    for (const c of links) {
        const normalized = normalizeLinkStrict(c);
        if (normalized) normalizedLinks.push(normalized.toLowerCase());
    }
    const strippedFromFull = new Set(
        normalizedLinks
            .filter(l => l.startsWith('http://') || l.startsWith('https://'))
            .map(l => l.replace(/^https?:\/\//i, '').replace(/^www\./i, ''))
            .filter(Boolean)
    );
    for (const l of normalizedLinks) {
        const stripped = l.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
        if (!l.startsWith('http://') && !l.startsWith('https://') && strippedFromFull.has(stripped)) continue;
        intel.phishingLinks.push(l);
    }
    intel.phishingLinks = [...new Set(intel.phishingLinks)];

    // Bank accounts (context-gated)
    const accountContextRegex = /(?:account|acc|acct|a\s*\/\s*c|a\/c)\s*(?:no|number|#|:)?[\s\w.:#-]{0,20}?(\d{9,18})/gi;
    for (const m of t.matchAll(accountContextRegex)) {
        const digits = onlyDigits(m[1]);
        if (!digits) continue;
        if (isLikelyIndianPhoneDigits(digits)) continue;
        intel.bankAccounts.push(digits);
    }
    intel.bankAccounts = [...new Set(intel.bankAccounts)];

    // Challan numbers
    const challanCtxRegex = /\b(?:challan|e-?challan|violation)\b(?:\s+(?:no|number|id)\b)?\s*(?:is|:)?\s*([A-Z0-9-]{3,24})\b/gi;
    for (const m of tForContext.matchAll(challanCtxRegex)) intel.challanNumbers.push(String(m[1] || '').trim());
    if (/\bchallan\b/i.test(tForContext)) {
        for (const m of t.match(/\b(?:TC|CHL|CHAL)\d{3,}\b/gi) || []) intel.challanNumbers.push(m);
    }
    intel.challanNumbers = [...new Set(intel.challanNumbers.map(v => v.toLowerCase()))];

    // Vehicle numbers
    for (const m of t.match(/\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{3,4}\b/g) || []) {
        intel.vehicleNumbers.push(m.replace(/\s+/g, '').toUpperCase());
    }
    const vehicleCtxRegex = /\bvehicle(?:\s*number|\s*no|\s*no\.)?\s*(?:is|:|-)?\s*([A-Z]{3}\d{4})\b/gi;
    for (const m of t.matchAll(vehicleCtxRegex)) intel.vehicleNumbers.push(String(m[1]).toUpperCase());
    intel.vehicleNumbers = [...new Set(intel.vehicleNumbers.map(v => v.toLowerCase()))];

    // Tracking IDs
    const trackingRegex = /\b(?:tracking|consignment|awb|waybill)\s*(?:id|no|number)?\s*(?:is|:|-)?\s*([A-Z0-9-]{5,30})\b/gi;
    for (const m of t.matchAll(trackingRegex)) intel.trackingIds.push(String(m[1] || '').trim());
    intel.trackingIds = [...new Set(intel.trackingIds.map(v => v.toLowerCase()))];

    // Consumer numbers (electricity)
    const consumerRegex = /\b(?:consumer|ca|service)\s*(?:no|number|id)?\s*(?:is|:|-)?\s*([A-Z0-9]{4,24})\b/gi;
    for (const m of t.matchAll(consumerRegex)) {
        const v = String(m[1] || '').trim();
        const digits = onlyDigits(v);
        if (digits && isLikelyIndianPhoneDigits(digits)) continue;
        intel.consumerNumbers.push(v);
    }
    intel.consumerNumbers = [...new Set(intel.consumerNumbers.map(v => v.toLowerCase()))];

    return sanitizeIntelStrict(intel);
};

const sendFinalResultToGuvi = async (payload) => {
    for (let attempt = 1; attempt <= CALLBACK_MAX_RETRIES; attempt++) {
        try {
            await axios.post(GUVI_CALLBACK_URL, payload, {
                timeout: 5000,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                }
            });
            console.log(`✅ Successfully sent final result to GUVI (attempt ${attempt})`);
            return true;
        } catch (error) {
            const status = error.response?.status;
            const body = error.response?.data;
            console.error(`❌ GUVI callback failed (attempt ${attempt}/${CALLBACK_MAX_RETRIES})`, {
                status: status || 'no-status',
                body: body || 'no-body',
                message: error.message
            });

            if (attempt < CALLBACK_MAX_RETRIES) {
                await sleep(300 * attempt);
            }
        }
    }

    return false;
};

// Middleware
app.use(cors());
app.use(express.json());

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
        return res.status(401).json({
            error: 'Missing API key',
            message: 'Please provide x-api-key header'
        });
    }

    if (apiKey !== API_KEY) {
        return res.status(403).json({
            error: 'Invalid API key',
            message: 'The provided API key is invalid'
        });
    }

    next();
};

// In-memory conversation storage (sessionId -> conversation data)
const sessions = new Map();

// Local deterministic extraction self-test (does not run unless explicitly enabled)
// Usage: DETERMINISTIC_INTEL_SELFTEST=true node server.js
if (String(process.env.DETERMINISTIC_INTEL_SELFTEST || '').toLowerCase() === 'true') {
    const samples = [
        'Call +91-9887766554',
        'Pay at http://echallan-pay. com/verify',
        'UPI scammer@paytm',
        'Account no 123456789012',
        'Challan TC123456 vehicle KA01AB1234',
        'Email help@traffic-police.in'
    ];
    for (const s of samples) {
        console.log('\n=== SAMPLE ===');
        console.log(s);
        console.log(JSON.stringify(extractDeterministicIntel(s), null, 2));
    }
    process.exit(0);
}

// Engagement metrics self-test (no OpenAI key required)
// Usage: ENGAGEMENT_METRICS_SELFTEST=true node server.js
if (String(process.env.ENGAGEMENT_METRICS_SELFTEST || '').toLowerCase() === 'true') {
    // Use synchronous sleep so we can exit before OpenAI client instantiation.
    const sleepSync = (ms) => {
        const sab = new SharedArrayBuffer(4);
        const ia = new Int32Array(sab);
        Atomics.wait(ia, 0, 0, ms);
    };

    try {
        const sessionData = { sessionStartTs: Date.now(), messages: [] };
        sessionData.messages.push({ scammer: '1', agent: 'a' });
        sleepSync(1200);
        sessionData.messages.push({ scammer: '2', agent: 'b' });
        sessionData.messages.push({ scammer: '3', agent: 'c' });

        const metrics = computeEngagementMetrics(sessionData, Date.now());
        console.log('Engagement metrics self-test:', metrics);

        if (metrics.engagementDurationSeconds !== 1) {
            throw new Error(`Expected engagementDurationSeconds=1, got ${metrics.engagementDurationSeconds}`);
        }
        if (metrics.totalMessagesExchanged !== 3) {
            throw new Error(`Expected totalMessagesExchanged=3, got ${metrics.totalMessagesExchanged}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Engagement metrics self-test failed:', err.message);
        process.exit(1);
    }
}

// Initialize agent
const agent = new HoneypotAgent();

const normalizeConversationHistoryToTurns = (conversationHistory) => {
    const history = Array.isArray(conversationHistory) ? conversationHistory : [];
    if (history.length === 0) return [];

    // If already in turn format, preserve it.
    const looksLikeTurnFormat = history.some(m => typeof m === 'object' && m && ('scammerMessage' in m || 'agentReply' in m));
    if (looksLikeTurnFormat) {
        return history
            .map(m => ({
                timestamp: m.timestamp,
                scammerMessage: m.scammerMessage || '',
                agentReply: m.agentReply || ''
            }))
            .filter(t => (t.scammerMessage || t.agentReply));
    }

    // Otherwise expect message-list format: [{sender,text,timestamp}, ...]
    const turns = [];
    let current = null;
    for (const msg of history) {
        const sender = msg?.sender;
        const text = msg?.text ?? '';
        const ts = msg?.timestamp;
        if (!sender) continue;

        if (sender === 'scammer') {
            if (current && (current.scammerMessage || current.agentReply)) {
                turns.push(current);
            }
            current = { timestamp: ts, scammerMessage: String(text || ''), agentReply: '' };
            continue;
        }

        if (sender === 'user') {
            if (!current) {
                turns.push({ timestamp: ts, scammerMessage: '', agentReply: String(text || '') });
                continue;
            }
            current.agentReply = String(text || '');
            turns.push(current);
            current = null;
        }
    }

    if (current && (current.scammerMessage || current.agentReply)) {
        turns.push(current);
    }

    return turns;
};

const buildTurnsFromSessionMessages = (sessionData) => {
    const msgs = Array.isArray(sessionData?.messages) ? sessionData.messages : [];
    return msgs
        .map(m => ({
            timestamp: m.timestamp,
            scammerMessage: m.scammer || '',
            agentReply: m.agent || ''
        }))
        .filter(t => (t.scammerMessage || t.agentReply));
};

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Agentic Honey-Pot API (GUVI Format)',
        status: 'active',
        version: '2.0.0',
        endpoints: {
            conversation: 'POST /api/conversation',
            health: 'GET /health'
        },
        documentation: 'GUVI Hackathon - Agentic Honeypot for Scam Detection'
    });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

/**
 * Main honeypot conversation endpoint (GUVI Format)
 * POST /api/conversation
 */
app.post('/api/conversation', authenticateApiKey, async (req, res) => {
    try {
        console.log('📥 Incoming GUVI request:', JSON.stringify(req.body, null, 2));

        const {
            sessionId = `generated-${Date.now()}`, // Auto-generate if missing
            message = { text: "Hello", sender: "scammer" }, // Default if missing
            conversationHistory = [],
            metadata = {}
        } = req.body || {};

        console.log('✅ Step 1: Request parsed. SessionId:', sessionId);

        // REMOVED STRICT VALIDATION
        // We now accept whatever GUVI sends to avoid 400 errors

        // Log if fields were missing
        if (!req.body.sessionId) console.log('⚠️ Warning: sessionId was missing, auto-generated.');
        if (!req.body.message) console.log('⚠️ Warning: message was missing, using default.');

        // Get or create session data
        let sessionData = sessions.get(sessionId) || {
            sessionId,
            sessionStartTs: Date.now(),
            messages: [],
            finalOutput: null,
            scamDetected: false,
            intelligence: ensureIntelSchema({})
        };
        sessionData.intelligence = ensureIntelSchema(sessionData.intelligence);

        // Build conversation history for agent (TURN format), preferring server-side memory when available.
        const historyFromReq = normalizeConversationHistoryToTurns(conversationHistory);
        const historyFromSession = buildTurnsFromSessionMessages(sessionData);
        const baseHistory = historyFromSession.length >= historyFromReq.length ? historyFromSession : historyFromReq;
        const agentHistory = baseHistory.map(t => ({ ...t, stressScore: 5 }));

        // If GUVI sent a longer history (e.g., server restart) backfill session memory so we don't repeat questions.
        if ((sessionData.messages || []).length < baseHistory.length) {
            sessionData.messages = baseHistory.map(t => ({
                scammer: t.scammerMessage || '',
                agent: t.agentReply || '',
                timestamp: t.timestamp || new Date().toISOString()
            }));
        }

        // Calculate stress score based on conversation length and urgency
        const computedStressScore = Math.min(10, 5 + Math.floor(agentHistory.length / 2));
        const incomingStressScore = req.body?.stressScore ?? metadata?.stressScore;
        const stressScore = incomingStressScore ?? computedStressScore;

        // Determine next intent based on conversation
        const computedNextIntent = agentHistory.length === 0 ? 'clarify_procedure' :
            agentHistory.length < 3 ? 'request_details' :
                agentHistory.length < 6 ? 'pretend_technical_issue' :
                    'maintain_conversation';
        const incomingNextIntent = req.body?.nextIntent ?? metadata?.nextIntent;
        const nextIntent = incomingNextIntent || computedNextIntent;

        // Deterministic intel extraction from the current scammer message (lossless union).
        const deterministicIntel = extractDeterministicIntel(message.text);
        sessionData.intelligence = mergeIntelSignals(sessionData.intelligence, deterministicIntel);

        // Generate agent response
        console.log('🤖 Calling agent.generateResponse with:', { text: message.text, historyLength: agentHistory.length, nextIntent, stressScore });
        const response = await agent.generateResponse(
            message.text,
            agentHistory,
            nextIntent,
            stressScore
        );
        console.log('✅ Agent response received:', response.reply);

        // Merge LLM intel + deterministic intel (lossless), then sanitize strictly to avoid polluted links like "SBI.Your".
        if (response.intelSignals && typeof response.intelSignals === 'object') {
            sessionData.intelligence = mergeIntelSignals(sessionData.intelligence, response.intelSignals);
        }
        // Re-run strict sanitize and then agent sanitize (formatting + mirroring) for safety.
        sessionData.intelligence = sanitizeIntelStrict(sessionData.intelligence);
        sessionData.intelligence = ensureIntelSchema(agent.sanitizeIntelSignals(sessionData.intelligence));

        // Update scam detection
        if (response.scamDetected) {
            sessionData.scamDetected = true;
        }

        // Add current exchange to session
        sessionData.messages.push({
            scammer: message.text,
            agent: response.reply,
            timestamp: message.timestamp || new Date().toISOString()
        });

        // Store updated session
        sessions.set(sessionId, sessionData);

        // Check if should terminate and send final result
        if (response.shouldTerminate || sessionData.messages.length >= 10) {
            console.log('🎯 Conversation ending, sending final result to GUVI...');

            // Send final result to GUVI callback
            try {
                const sessionEndTs = Date.now();
                const engagementMetrics = computeEngagementMetrics(sessionData, sessionEndTs);

                const finalOutput = agent.mapFinalOutput(
                    {
                        ...response,
                        scamDetected: sessionData.scamDetected,
                        intelSignals: sessionData.intelligence
                    },
                    conversationHistory,
                    sessionData.sessionStartTs,
                    sessionEndTs
                );

                // Rubric C: enforce server-side engagement metrics (do not use request conversationHistory length).
                finalOutput.engagementMetrics = engagementMetrics;

                sessionData.finalOutput = finalOutput;
                sessions.set(sessionId, sessionData);

                console.log('📊 Final engagementMetrics:', finalOutput.engagementMetrics);
                console.log('📤 Sending to GUVI:', JSON.stringify(finalOutput, null, 2));

                await sendFinalResultToGuvi(finalOutput);
            } catch (callbackError) {
                console.error('❌ Failed to send callback to GUVI:', callbackError.message);
                // Don't fail the main response if callback fails
            }

            // Clean up session after sending (keep finalOutput available briefly for /api/final/:sessionId).
            setTimeout(() => sessions.delete(sessionId), 10 * 60 * 1000);
        }

        // Return strict per-turn output contract
        const turnPayload = assertStrictTurnPayload(agent.mapTurnResponse(response));
        console.log('📤 Sending response to GUVI:', turnPayload);
        res.json(turnPayload);
        console.log('✅ Response sent successfully!');

    } catch (error) {
        console.error('❌ ERROR in conversation handler:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        // Strict output contract: always return {status, reply} for the conversation endpoint.
        res.json(assertStrictTurnPayload({
            status: 'success',
            reply: "I'm a bit confused. Can you provide more information?"
        }));
    }
});

/**
 * Get session data (for debugging)
 */
app.get('/api/session/:sessionId', authenticateApiKey, (req, res) => {
    const { sessionId } = req.params;
    const sessionData = sessions.get(sessionId);

    if (!sessionData) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Session not found'
        });
    }

    res.json(sessionData);
});

/**
 * Get final output (strict schema) for a session.
 */
app.get('/api/final/:sessionId', authenticateApiKey, (req, res) => {
    const { sessionId } = req.params;
    const sessionData = sessions.get(sessionId);
    const finalOutput = sessionData?.finalOutput;

    if (!finalOutput) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Final output not found'
        });
    }

    res.json(finalOutput);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        status: 'error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🍯 Agentic Honey-Pot API (GUVI Format) running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔑 API Key authentication: ${API_KEY ? 'ENABLED' : 'DISABLED'}`);
    console.log(`\n✅ Server ready to receive GUVI requests`);
});

module.exports = app;
