# 🎯 QUICK REFERENCE CARD

## 🔗 Your Deployed API Details

**DEPLOYMENT URL**: `https://honeypot-api.onrender.com` (or your chosen name)

**MAIN ENDPOINT**: `POST /api/conversation`

**API KEY**: `honeypot-guvi-2026-YOUR-SECURE-KEY`

---

## 📥 REQUEST FORMAT

### Headers:
```
Content-Type: application/json
x-api-key: honeypot-guvi-2026-YOUR-SECURE-KEY
```

### Body (Minimal):
```json
{
  "scammerMessage": "Your account will be blocked"
}
```

### Body (Full):
```json
{
  "conversationId": "optional-uuid-for-multi-turn",
  "scammerMessage": "Your account is suspended. Click: bit.ly/xyz",
  "nextIntent": "clarify_procedure",
  "stressScore": 7
}
```

**Parameter Details:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `conversationId` | string | No | auto-generated | Track multi-turn conversation |
| `scammerMessage` | string | **Yes** | - | The scammer's message |
| `nextIntent` | string | No | `maintain_conversation` | Agent behavior |
| `stressScore` | number | No | `5` | Stress level (1-10) |

**Valid nextIntent values:**
- `clarify_procedure` - Ask for procedural details
- `pretend_technical_issue` - Technical delays
- `request_details` - Request scammer info
- `maintain_conversation` - Natural flow

---

## 📤 RESPONSE FORMAT

```json
{
  "conversationId": "uuid-string",
  "reply": "Sir what is the problem? I'm very scared",
  "phase": "OVERWHELM",
  "scamDetected": true,
  "intelSignals": {
    "bankAccounts": [],
    "upiIds": [],
    "phishingLinks": ["bit.ly/xyz"],
    "phoneNumbers": [],
    "employeeIds": [],
    "orgNames": [],
    "suspiciousKeywords": ["suspended", "click"]
  },
  "agentNotes": "High urgency detected. Phase: OVERWHELM. Asked for details.",
  "shouldTerminate": false,
  "terminationReason": ""
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | string | UUID for this conversation |
| `reply` | string | Agent's 1-2 line response |
| `phase` | string | Current phase (SHOCK/PUSHBACK/OVERWHELM/NEAR_COMPLY/EXIT) |
| `scamDetected` | boolean | Whether scam indicators found |
| `intelSignals` | object | Extracted intelligence |
| `agentNotes` | string | Internal notes for logging |
| `shouldTerminate` | boolean | Should end conversation |
| `terminationReason` | string | Why terminating (if true) |

---

## 🧪 QUICK TEST

### PowerShell (Windows):
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "honeypot-guvi-2026-YOUR-KEY"
}

$body = @{
    scammerMessage = "Your account blocked. Share OTP"
    stressScore = 7
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://YOUR-URL.onrender.com/api/conversation" `
  -Method Post -Headers $headers -Body $body | ConvertTo-Json
```

### cURL (Unix/Mac):
```bash
curl -X POST https://YOUR-URL.onrender.com/api/conversation \
  -H "Content-Type: application/json" \
  -H "x-api-key: honeypot-guvi-2026-YOUR-KEY" \
  -d '{"scammerMessage":"Your account blocked","stressScore":7}'
```

---

## 📊 CONVERSATION PHASES

| Phase | Turn Count | Behavior | Example Reply |
|-------|------------|----------|---------------|
| **SHOCK** | 1-2 | Confused, polite | "What happened sir?" |
| **PUSHBACK** | 3-5 | Defensive, questioning | "But I didn't do anything" |
| **OVERWHELM** | 6-10 | Stressed, friction | "Sir OTP not coming" |
| **NEAR_COMPLY** | 8-12 | Almost comply | "Ok sir, but app stuck" |
| **EXIT** | 13+ | Stall, withdraw | "Sir battery dying" |

---

## 🎯 GUVI PLATFORM SUBMISSION

1. **Go to**: Timeline → API Endpoint Submission
2. **Click**: "Test Honeypot Endpoint"
3. **Enter**:
   ```
   x-api-key: honeypot-guvi-2026-YOUR-SECURE-KEY
   Honeypot API Endpoint URL: https://YOUR-URL.onrender.com/api/conversation
   ```
4. **Verify**: Status shows "✅ Active"

---

## 🔍 INTELLIGENCE EXTRACTION

The API automatically extracts:

| Type | Pattern | Example |
|------|---------|---------|
| **Bank Accounts** | 9-18 digits | `1234567890123` |
| **UPI IDs** | name@bank | `scammer@paytm` |
| **Phishing Links** | URLs | `bit.ly/xyz`, `example.com/login` |
| **Phone Numbers** | Indian format | `9876543210`, `+919876543210` |
| **Employee IDs** | EMP/ID/TICKET + number | `EMP12345`, `TICKET99` |
| **Org Names** | Bank names | `HDFC`, `SBI`, `ICICI` |
| **Keywords** | Scam terms | `urgent`, `blocked`, `OTP`, `verify` |

---

## ⚠️ ERROR CODES

| Code | Error | Reason |
|------|-------|--------|
| **401** | Unauthorized | Missing API key |
| **403** | Forbidden | Invalid API key |
| **400** | Bad Request | Missing `scammerMessage` |
| **500** | Server Error | Internal error (check logs) |

---

## 🌐 ENDPOINTS

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/` | No | API info |
| `GET` | `/health` | No | Health check |
| `POST` | `/api/conversation` | Yes | Main conversation |
| `GET` | `/api/conversation/:id` | Yes | Get history |
| `DELETE` | `/api/conversation/:id` | Yes | Delete conversation |

---

## 💡 TIPS

✅ **Use unique API keys** for production vs testing
✅ **Track conversationId** for multi-turn conversations
✅ **Monitor stressScore** to control agent behavior
✅ **Check shouldTerminate** to know when to stop
✅ **Review intelSignals** for extracted data
✅ **Test locally first** before deploying
✅ **Keep service awake** with periodic `/health` pings

---

**🚀 Ready to deploy? See QUICKSTART.md**
