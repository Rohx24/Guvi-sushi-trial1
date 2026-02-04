/**
 * Agentic Honey-Pot API Server
 * Handles conversation requests and returns agent responses
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const HoneypotAgent = require('./honeypotAgent');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'honeypot-guvi-2026-secure-key';

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

// In-memory conversation storage (for demo purposes)
const conversations = new Map();

// Initialize agent
const agent = new HoneypotAgent();

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Agentic Honey-Pot API',
        status: 'active',
        version: '1.0.0',
        endpoints: {
            conversation: 'POST /api/conversation',
            health: 'GET /health'
        },
        documentation: 'Provide scammer message to receive believable victim response'
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
 * Main honeypot conversation endpoint
 * POST /api/conversation
 * 
 * Request body:
 * {
 *   "conversationId": "optional-uuid",
 *   "scammerMessage": "Your account will be blocked. Click here: bit.ly/xyz",
 *   "nextIntent": "clarify_procedure|pretend_technical_issue|request_details|maintain_conversation",
 *   "stressScore": 5
 * }
 * 
 * Response:
 * {
 *   "reply": "Sir what is the problem? Please tell me",
 *   "phase": "SHOCK",
 *   "scamDetected": true,
 *   "intelSignals": {...},
 *   "agentNotes": "...",
 *   "shouldTerminate": false,
 *   "terminationReason": ""
 * }
 */
app.post('/api/conversation', authenticateApiKey, async (req, res) => {
    try {
        const {
            conversationId = uuidv4(),
            scammerMessage = 'Test message from GUVI platform',
            nextIntent = 'maintain_conversation',
            stressScore = 5
        } = req.body;

        // Use default message if empty string provided
        const finalMessage = (scammerMessage && scammerMessage.trim()) || 'Test message from GUVI platform';

        // Validation - only check type
        if (typeof finalMessage !== 'string') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'scammerMessage must be a string'
            });
        }

        if (stressScore < 1 || stressScore > 10) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'stressScore must be between 1 and 10'
            });
        }

        const validIntents = [
            'clarify_procedure',
            'pretend_technical_issue',
            'request_details',
            'maintain_conversation'
        ];

        if (!validIntents.includes(nextIntent)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: `nextIntent must be one of: ${validIntents.join(', ')}`
            });
        }

        // Get or create conversation history
        let conversationHistory = conversations.get(conversationId) || [];

        // Add current scammer message to history
        conversationHistory.push({
            timestamp: new Date().toISOString(),
            scammerMessage: finalMessage,
            stressScore
        });

        // Generate agent response (await for OpenAI support)
        const response = await agent.generateResponse(
            finalMessage,
            conversationHistory,
            nextIntent,
            stressScore
        );

        // Update conversation history with agent response
        conversationHistory[conversationHistory.length - 1].agentReply = response.reply;
        conversationHistory[conversationHistory.length - 1].phase = response.phase;

        // Store updated history
        conversations.set(conversationId, conversationHistory);

        // Clean up old conversations (if terminated or too old)
        if (response.shouldTerminate) {
            setTimeout(() => conversations.delete(conversationId), 60000); // Delete after 1 min
        }

        // Return response (pure JSON, no markdown)
        res.json({
            conversationId,
            reply: response.reply,
            phase: response.phase,
            scamDetected: response.scamDetected,
            intelSignals: response.intelSignals,
            agentNotes: response.agentNotes,
            shouldTerminate: response.shouldTerminate,
            terminationReason: response.terminationReason
        });

    } catch (error) {
        console.error('Error processing conversation:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to process conversation request'
        });
    }
});

/**
 * Get conversation history (for debugging)
 */
app.get('/api/conversation/:conversationId', authenticateApiKey, (req, res) => {
    const { conversationId } = req.params;
    const history = conversations.get(conversationId);

    if (!history) {
        return res.status(404).json({
            error: 'Not Found',
            message: 'Conversation not found'
        });
    }

    res.json({
        conversationId,
        messageCount: history.length,
        history
    });
});

/**
 * Reset/delete a conversation
 */
app.delete('/api/conversation/:conversationId', authenticateApiKey, (req, res) => {
    const { conversationId } = req.params;
    const existed = conversations.delete(conversationId);

    res.json({
        success: existed,
        message: existed ? 'Conversation deleted' : 'Conversation not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🍯 Agentic Honey-Pot API running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔑 API Key authentication: ${API_KEY ? 'ENABLED' : 'DISABLED'}`);
    console.log(`\n✅ Server ready to receive requests`);
});

module.exports = app;
