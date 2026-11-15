$ErrorActionPreference = "Stop"

$backendRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\Lens_Backend")

$env:APP_ENV = "development"
$env:HTTP_ADDR = "127.0.0.1:8080"
$env:DB_DSN = "postgres://postgres@127.0.0.1:5432/bug_feedback?sslmode=disable"
$env:REDIS_ADDR = "127.0.0.1:6379"
$env:FEEDBACK_SECRET_KEY = "local-dev-feedback-secret-at-least-32-bytes"
$env:ADMIN_API_TOKEN = "local-admin-token"
$env:CORS_ALLOWED_ORIGINS = "http://127.0.0.1:5173,http://127.0.0.1:8081"
$env:S3_ACCESS_KEY = "local-test-access"
$env:S3_SECRET_KEY = "local-test-secret"
$env:S3_BUCKET = "local-test-1250000000"
$env:S3_REGION = "ap-guangzhou"
$env:S3_CDN_URL = "http://127.0.0.1:9000"
$env:S3_BASE_PREFIX = "uploads"

Write-Output "CORS_ALLOWED_ORIGINS=$env:CORS_ALLOWED_ORIGINS"
Set-Location $backendRoot
go run ./cmd/server
