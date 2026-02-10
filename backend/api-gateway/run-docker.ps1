# Script to run Docker deployment
Write-Host "Starting Docker Deployment..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Run docker-compose
Write-Host ""
Write-Host "Starting containers with docker-compose..." -ForegroundColor Yellow
docker-compose up
