# API Gateway Test Script
Write-Host "Testing API Gateway Endpoints..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8080/api/v1"

# Test 1: Health Check
Write-Host "1. Testing GET /api/v1/health" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "Health Check Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
    Write-Host ""
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# Test 2: Metadata Stocks
Write-Host "2. Testing GET /api/v1/metadata/stocks" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/metadata/stocks?limit=5" -Method Get
    Write-Host "Stocks Metadata Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
    Write-Host ""
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "All tests completed!" -ForegroundColor Cyan
