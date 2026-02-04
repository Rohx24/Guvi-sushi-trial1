# 🚀 DEPLOYMENT QUICKSTART

## Your Honeypot API is ready to deploy! 

### 📋 What You Have:
- ✅ Working Node.js/Express API server
- ✅ Honeypot conversation agent with Indian English responses
- ✅ Intelligence extraction (phone numbers, UPI IDs, phishing links)
- ✅ API key authentication
- ✅ Tested locally (server running on port 3000)

---

## 🎯 OPTION 1: Deploy to Render (RECOMMENDED - 5 minutes)

### Step-by-Step:

1. **Create GitHub Repository:**
   ```powershell
   git init
   git add .
   git commit -m "Honeypot API for GUVI hackathon"
   git branch -M main
   ```
   
   Then create a new repo on GitHub (https://github.com/new) and push:
   ```powershell
   git remote add origin https://github.com/YOUR_USERNAME/honeypot-api.git
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to: https://dashboard.render.com/
   - Click **"New +" → "Web Service"**
   - Click **"Connect GitHub"** and select your repository
   
3. **Configure:**
   - **Name**: `honeypot-api`
   - **Region**: Singapore
   - **Branch**: `main`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**

4. **Environment Variables:**
   Click "Advanced" and add:
   - `API_KEY` = `honeypot-guvi-2026-YOUR-SECURE-KEY` (choose your own secure key)
   - `NODE_ENV` = `production`

5. **Click "Create Web Service"**

6. **Wait 2-3 minutes** for deployment

7. **Your API URL:**
   ```
   https://honeypot-api.onrender.com/api/conversation
   ```

8. **Your API Key:**
   ```
   honeypot-guvi-2026-YOUR-SECURE-KEY
   ```

---

## 🎯 OPTION 2: Deploy to Railway (Alternative - 3 minutes)

1. **Push to GitHub** (same as above)

2. **Deploy:**
   - Go to: https://railway.app/
   - Click **"New Project" → "Deploy from GitHub repo"**
   - Select your repository

3. **Add Environment Variables:**
   - `API_KEY` = `honeypot-guvi-2026-YOUR-SECURE-KEY`
   - `NODE_ENV` = `production`

4. **Your URL:**
   ```
   https://honeypot-api-production.up.railway.app/api/conversation
   ```

---

## 🧪 Test Your Deployed API

### Using PowerShell:
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "honeypot-guvi-2026-YOUR-SECURE-KEY"
}

$body = @{
    scammerMessage = "Your account is blocked. Share OTP now."
    nextIntent = "clarify_procedure"
    stressScore = 7
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://YOUR-DEPLOYED-URL/api/conversation" -Method Post -Headers $headers -Body $body | ConvertTo-Json
```

### Using GUVI Platform:
1. Go to your hackathon Timeline page
2. Click **"Test Honeypot Endpoint"** button
3. Enter:
   - **x-api-key**: `honeypot-guvi-2026-YOUR-SECURE-KEY`
   - **Honeypot API Endpoint URL**: `https://YOUR-DEPLOYED-URL/api/conversation`
4. Click **"Test Honeypot Endpoint"**
5. ✅ Should show "Active" status

---

## 📝 API Quick Reference

### Endpoint:
```
POST /api/conversation
```

### Headers:
```json
{
  "Content-Type": "application/json",
  "x-api-key": "your-api-key"
}
```

### Request:
```json
{
  "scammerMessage": "Your account will be blocked. Click bit.ly/xyz",
  "nextIntent": "clarify_procedure",
  "stressScore": 7
}
```

### Response:
```json
{
  "conversationId": "uuid",
  "reply": "Sir what is the problem? I'm very scared",
  "phase": "OVERWHELM",
  "scamDetected": true,
  "intelSignals": {
    "phishingLinks": ["bit.ly/xyz"],
    "suspiciousKeywords": ["blocked"]
  },
  "agentNotes": "...",
  "shouldTerminate": false
}
```

---

## ⚠️ IMPORTANT NOTES

1. **API Key**: Choose a strong, unique API key (min 20 characters)
2. **Free Tier Limits**: 
   - Render: Service may sleep after 15 min of inactivity (wakes on first request)
   - Railway: 500 hours/month free
3. **Health Check**: Use `/health` endpoint to keep service awake
4. **Logging**: Check Render/Railway logs if you encounter issues

---

## 🆘 Troubleshooting

**Problem**: API not responding
- **Solution**: Check if service is running in Render/Railway dashboard

**Problem**: 401 Unauthorized
- **Solution**: Verify API key in environment variables matches request header

**Problem**: 500 Internal Server Error
- **Solution**: Check deployment logs for errors

---

## ✅ Final Checklist

- [ ] Code pushed to GitHub
- [ ] Deployed to Render or Railway
- [ ] Environment variables set (API_KEY, NODE_ENV)
- [ ] Tested with PowerShell script
- [ ] Submitted to GUVI platform
- [ ] Verified "Active" status on hackathon page

---

**Need help?** Check the server logs in your deployment platform dashboard.

**Good luck with your hackathon! 🎉**
