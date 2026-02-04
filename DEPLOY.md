# Agentic Honey-Pot API

## 🚀 Quick Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

This repository contains a honeypot conversation agent API for scam detection.

### Deployment Steps:

1. **Fork this repository** to your GitHub account

2. **Go to [Render Dashboard](https://dashboard.render.com/)**

3. **Click "New +" → "Web Service"**

4. **Connect your GitHub repository**

5. **Configure the service:**
   - **Name**: `honeypot-api` (or your choice)
   - **Region**: Singapore (closest to India)
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

6. **Add Environment Variables:**
   - Click "Advanced" → "Add Environment Variable"
   - Add `API_KEY`: Choose a secure random string (e.g., `honeypot-guvi-2026-abcd1234xyz`)
   - Add `NODE_ENV`: `production`

7. **Click "Create Web Service"**

8. **Wait for deployment** (takes 2-3 minutes)

9. **Your API URL will be:**
   ```
   https://honeypot-api.onrender.com
   ```
   (Replace `honeypot-api` with your chosen service name)

10. **Test your deployed API:**
    ```bash
    curl https://your-service-name.onrender.com/health
    ```

### API Key

**IMPORTANT**: Save your API key! You'll need it to test the endpoint.

Your API key format: `honeypot-guvi-2026-YOUR-SECURE-KEY`

### Testing with GUVI Platform

1. Go to your hackathon timeline page
2. Click "Test Honeypot Endpoint"
3. Enter:
   - **x-api-key**: `your-api-key-from-step-6`
   - **Honeypot API Endpoint URL**: `https://your-service-name.onrender.com/api/conversation`
4. Submit and verify it works!

---

## 🎯 API Documentation

See [README.md](./README.md) for full API documentation.

**Main Endpoint**: `POST /api/conversation`

**Headers**: 
- `Content-Type: application/json`
- `x-api-key: your-api-key`

**Request Body**:
```json
{
  "scammerMessage": "Your account will be blocked. Share OTP now.",
  "nextIntent": "clarify_procedure",
  "stressScore": 7
}
```

**Response**:
```json
{
  "reply": "Sir what is the problem? I'm scared",
  "phase": "OVERWHELM",
  "scamDetected": true,
  "intelSignals": {...},
  "agentNotes": "...",
  "shouldTerminate": false
}
```

---

## 🔧 Local Development

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`
