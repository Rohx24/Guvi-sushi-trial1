# Test Honeypot API with PowerShell

Write-Host "🧪 Testing Honeypot API..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
$healthResponse = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
$healthResponse | ConvertTo-Json
Write-Host ""

# Test 2: Main Conversation Endpoint
Write-Host "Test 2: Conversation Endpoint (SHOCK phase)" -ForegroundColor Yellow

$headers = @{
    "Content-Type" = "application/json"
    "x-api-key" = "honeypot-guvi-2026-secure-key"
}

$body = @{
    scammerMessage = "URGENT: Your HDFC account will be blocked in 24 hours. Click here: bit.ly/hdfc-verify123"
    nextIntent = "clarify_procedure"
    stressScore = 6
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/conversation" -Method Post -Headers $headers -Body $body
    Write-Host "✅ Success!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    $_.Exception.Message
}

Write-Host ""
Write-Host "Test 3: Conversation with Intelligence Extraction" -ForegroundColor Yellow

$body2 = @{
    scammerMessage = "Call our helpline 9876543210 or send to paytm.merchant@paytm. Ref: EMP12345"
    nextIntent = "request_details"
    stressScore = 8
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/conversation" -Method Post -Headers $headers -Body $body2
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Reply: $($response2.reply)" -ForegroundColor Cyan
    Write-Host "Phase: $($response2.phase)" -ForegroundColor Cyan
    Write-Host "Scam Detected: $($response2.scamDetected)" -ForegroundColor Cyan
    Write-Host "Intel Signals:" -ForegroundColor Cyan
    $response2.intelSignals | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    $_.Exception.Message
}

Write-Host ""
Write-Host "✅ All tests completed!" -ForegroundColor Green
