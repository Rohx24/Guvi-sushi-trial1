# 🍯 Agentic Honey-Pot API for Scam Detection

An intelligent conversation agent that mimics a stressed Indian user to extract intelligence from scammers while maintaining believability.

## 🚀 Features

- **Realistic Indian English responses**: Natural, emotional, slightly imperfect texting style
- **Multi-phase conversation flow**: SHOCK → PUSHBACK → OVERWHELM → NEAR_COMPLY → EXIT
- **Intelligence extraction**: Automatically extracts phone numbers, UPI IDs, phishing links, employee IDs, org names
- **Safe friction delays**: Never shares real OTP/PIN/CVV, uses technical issues as believable delays
- **Scam detection**: Identifies scam patterns and knows when to terminate
- **API Key authentication**: Secure endpoint access

## 📋 API Endpoints

### Main Conversation Endpoint
```
POST /api/conversation
Headers: x-api-key: your-api-key
```

**Request Body:**
```json
{
  "conversationId": "optional-uuid",
  "scammerMessage": "Your account will be blocked. Share OTP immediately.",
  "nextIntent": "clarify_procedure",
  "stressScore": 7
}
```

**Response:**
```json
{
  "conversationId": "uuid",
  "reply": "Sir what is the problem? I'm very scared sir",
  "phase": "OVERWHELM",
  "scamDetected": true,
  "intelSignals": {
    "bankAccounts": [],
    "upiIds": [],
    "phishingLinks": [],
    "phoneNumbers": [],
    "employeeIds": [],
    "orgNames": [],
    "suspiciousKeywords": ["blocked", "otp", "immediately"]
  },
  "agentNotes": "High urgency detected. Phase: OVERWHELM. Asked for procedure details.",
  "shouldTerminate": false,
  "terminationReason": ""
}
```

### Health Check
```
GET /health
```

### Get Conversation History
```
GET /api/conversation/:conversationId
Headers: x-api-key: your-api-key
```

## 🛠️ Installation

### Local Development

1. **Clone and install:**
```bash
cd c:\Users\sushr\Downloads\guvitry2
npm install
```

2. **Configure environment:**
```bash
# Copy .env.example to .env and update values
cp .env.example .env
```

Edit `.env`:
```
PORT=3000
API_KEY=your-secure-api-key-here
NODE_ENV=development
```

3. **Run the server:**
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## 🌐 Deployment

### Deploy to Render (Recommended - Free Tier)

1. **Push code to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit: Agentic Honey-Pot API"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/honeypot-api.git
git push -u origin main
```

2. **Deploy on Render:**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `honeypot-api`
     - **Region**: Singapore (closest to India)
     - **Branch**: `main`
     - **Runtime**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free
   
3. **Set Environment Variables:**
   - Add `API_KEY`: `your-secure-api-key-here`
   - Add `NODE_ENV`: `production`

4. **Deploy!** Your API URL will be:
   ```
   https://honeypot-api-xxxx.onrender.com
   ```

### Deploy to Railway (Alternative)

1. **Push to GitHub** (same as above)

2. **Deploy on Railway:**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects Node.js
   - Add environment variables:
     - `API_KEY`: `your-secure-api-key-here`
     - `NODE_ENV`: `production`

3. **Your API URL:**
   ```
   https://honeypot-api-production.up.railway.app
   ```

## 🧪 Testing the API

### Using cURL
```bash
curl -X POST https://your-deployed-url.com/api/conversation \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "scammerMessage": "Your HDFC account will be suspended. Click: bit.ly/verify123",
    "nextIntent": "clarify_procedure",
    "stressScore": 6
  }'
```

### Using Postman
1. Create POST request to `/api/conversation`
2. Add header: `x-api-key: your-api-key`
3. Set body to raw JSON
4. Send request

### Test with GUVI Platform
1. Go to the API Endpoint Tester in your hackathon dashboard
2. Enter:
   - **x-api-key**: `your-api-key`
   - **Honeypot API Endpoint URL**: `https://your-deployed-url.com/api/conversation`
3. Click "Test Honeypot Endpoint"

## 📊 Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conversationId` | string | No | UUID to track multi-turn conversations |
| `scammerMessage` | string | Yes | The scammer's message text |
| `nextIntent` | string | No | Desired agent behavior (default: `maintain_conversation`) |
| `stressScore` | number | No | User stress level 1-10 (default: 5) |

### Valid nextIntent values:
- `clarify_procedure` - Ask for procedural details
- `pretend_technical_issue` - Introduce technical delays
- `request_details` - Request scammer credentials
- `maintain_conversation` - Natural flow

## 🔒 Security Features

- ✅ API key authentication required
- ✅ Never shares real OTP/PIN/CVV/passwords
- ✅ Uses safe friction delays only
- ✅ No harassment or illegal instructions
- ✅ Automatic conversation termination when enough intel gathered

## 📝 Response Fields

| Field | Description |
|-------|-------------|
| `reply` | Agent's 1-2 line response in Indian English |
| `phase` | Current conversation stage |
| `scamDetected` | Boolean if scam indicators found |
| `intelSignals` | Extracted intelligence (phone, UPI, links, etc.) |
| `agentNotes` | Internal notes for logging |
| `shouldTerminate` | Boolean if conversation should end |
| `terminationReason` | Reason for termination if applicable |

## 🎯 Agent Behavior

The agent follows these priorities:
1. **Stay believable** - Never reveal it's a honeypot
2. **Delay safely** - Use plausible friction (app errors, network issues)
3. **Extract intel** - Gradually collect scammer details
4. **Maintain consistency** - Track conversation history

## 📞 Support

For issues or questions, check the agent logs or conversation history endpoints.

## 📄 License

MIT License - see LICENSE file for details
