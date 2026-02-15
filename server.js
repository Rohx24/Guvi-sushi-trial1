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
const GUVI_CALLBACK_URL = 'https://guvi-honeypot-tester.onrender.com/';
const CALLBACK_MAX_RETRIES = 3;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
            messages: [],
            scamDetected: false,
            intelligence: {
                bankAccounts: [],
                upiIds: [],
                phishingLinks: [],
                phoneNumbers: [],
                employeeIds: [],
                orgNames: [],
                suspiciousKeywords: []
            }
        };

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

        // Generate agent response
        console.log('🤖 Calling agent.generateResponse with:', { text: message.text, historyLength: agentHistory.length, nextIntent, stressScore });
        const response = await agent.generateResponse(
            message.text,
            agentHistory,
            nextIntent,
            stressScore
        );
        console.log('✅ Agent response received:', response.reply);

        // Update session intelligence
        if (response.intelSignals) {
            Object.keys(response.intelSignals).forEach(key => {
                if (Array.isArray(response.intelSignals[key])) {
                    sessionData.intelligence[key] = [
                        ...new Set([
                            ...sessionData.intelligence[key] || [],
                            ...response.intelSignals[key]
                        ])
                    ];
                }
            });
        }

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
                const finalPayload = {
                    sessionId: sessionId,
                    scamDetected: sessionData.scamDetected,
                    totalMessagesExchanged: sessionData.messages.length,
                    extractedIntelligence: sessionData.intelligence,
                    agentNotes: response.agentNotes || 'Conversation completed'
                };

                console.log('📤 Sending to GUVI:', JSON.stringify(finalPayload, null, 2));

                await sendFinalResultToGuvi(finalPayload);
            } catch (callbackError) {
                console.error('❌ Failed to send callback to GUVI:', callbackError.message);
                // Don't fail the main response if callback fails
            }

            // Clean up session after sending
            setTimeout(() => sessions.delete(sessionId), 60000);
        }

        // Return GUVI expected format (Strict Spec Compliance)
        console.log('📤 Sending response to GUVI:', { status: 'success', reply: response.reply });
        res.json({
            status: 'success',
            reply: response.reply
        });
        console.log('✅ Response sent successfully!');

    } catch (error) {
        console.error('❌ ERROR in conversation handler:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            status: 'error',
            message: 'Failed to process conversation request'
        });
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
