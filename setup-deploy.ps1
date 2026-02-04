# Git Setup and Deploy Helper Script

Write-Host "🚀 Honeypot API - Git Setup & Deploy Helper" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""

# Check if git is initialized
if (Test-Path ".git") {
    Write-Host "✅ Git repository already initialized" -ForegroundColor Green
} else {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "✅ Git initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Current Files:" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "=" * 60
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. CREATE GITHUB REPOSITORY:" -ForegroundColor Cyan
Write-Host "   Go to: https://github.com/new" -ForegroundColor White
Write-Host "   Repository name: honeypot-api" -ForegroundColor White
Write-Host "   Keep it PUBLIC" -ForegroundColor White
Write-Host ""

Write-Host "2. RUN THESE COMMANDS:" -ForegroundColor Cyan
Write-Host "   git add ." -ForegroundColor White
Write-Host "   git commit -m ""Honeypot API for GUVI hackathon""" -ForegroundColor White
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/honeypot-api.git" -ForegroundColor White
Write-Host "   git push -u origin main" -ForegroundColor White
Write-Host ""

Write-Host "3. DEPLOY TO RENDER:" -ForegroundColor Cyan
Write-Host "   Go to: https://dashboard.render.com/" -ForegroundColor White
Write-Host "   Click: New + → Web Service" -ForegroundColor White
Write-Host "   Connect your GitHub repo" -ForegroundColor White
Write-Host "   Configure:" -ForegroundColor White
Write-Host "     - Name: honeypot-api" -ForegroundColor Gray
Write-Host "     - Region: Singapore" -ForegroundColor Gray
Write-Host "     - Build: npm install" -ForegroundColor Gray
Write-Host "     - Start: npm start" -ForegroundColor Gray
Write-Host "     - Free tier" -ForegroundColor Gray
Write-Host "   Add Environment Variables:" -ForegroundColor White
Write-Host "     - API_KEY = honeypot-guvi-2026-[your-secure-key]" -ForegroundColor Gray
Write-Host "     - NODE_ENV = production" -ForegroundColor Gray
Write-Host ""

Write-Host "4. TEST ON GUVI PLATFORM:" -ForegroundColor Cyan
Write-Host "   x-api-key: [your API key from step 3]" -ForegroundColor White
Write-Host "   URL: https://honeypot-api.onrender.com/api/conversation" -ForegroundColor White
Write-Host ""

Write-Host "=" * 60
Write-Host ""

# Offer to stage files
$stage = Read-Host "Do you want to stage all files now? (y/n)"
if ($stage -eq "y" -or $stage -eq "Y") {
    git add .
    Write-Host "✅ Files staged" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next, run:" -ForegroundColor Yellow
    Write-Host "  git commit -m ""Initial commit: Honeypot API""" -ForegroundColor White
}

Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  - QUICKSTART.md  : Quick deployment guide" -ForegroundColor White
Write-Host "  - SUMMARY.md     : Complete implementation details" -ForegroundColor White
Write-Host "  - README.md      : Full API documentation" -ForegroundColor White

Write-Host ""
Write-Host "✨ Server is running on http://localhost:3000" -ForegroundColor Green
Write-Host "   Test it with: powershell -File test-api.ps1" -ForegroundColor Gray
Write-Host ""
