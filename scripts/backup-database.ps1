# Nexus HMS - Automated Database Backup Script (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\backup-database.ps1

$ErrorActionPreference = "Stop"

$DB_HOST = "localhost"
$DB_PORT = "5433"
$DB_NAME = "hotel_management"
$DB_USER = "postgres"
$BACKUP_DIR = "$PSScriptRoot\..\backups"
$RETENTION_DAYS = 30

$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR\nexus_hms_backup_$TIMESTAMP.sql"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "📦 NEXUS HMS - AUTOMATED DATABASE BACKUP ROUTINE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Target Database: $DB_NAME"
Write-Host "Target Host:     $DB_HOST:$DB_PORT"
Write-Host "Backup Location: $BACKUP_FILE"

# Create backup directory if it does not exist
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Write-Host "Created backup folder: $BACKUP_DIR" -ForegroundColor Green
}

# Run pg_dump
try {
    $env:PGPASSWORD = "admin"
    & pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F p -f $BACKUP_FILE
    Write-Host "✅ Database backup created successfully: $BACKUP_FILE" -ForegroundColor Green
    
    # Calculate file size
    $fileSize = (Get-Item $BACKUP_FILE).Length / 1MB
    Write-Host ("Backup File Size: {0:N2} MB" -f $fileSize) -ForegroundColor Yellow
}
catch {
    Write-Host "❌ Database backup failed: $_" -ForegroundColor Red
    exit 1
}

# Retention cleanup: Remove backups older than $RETENTION_DAYS
$cutOffDate = (Get-Date).AddDays(-$RETENTION_DAYS)
Get-ChildItem -Path $BACKUP_DIR -Filter "*.sql" | Where-Object { $_.LastWriteTime -lt $cutOffDate } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Purged archived backup older than $RETENTION_DAYS days: $($_.Name)" -ForegroundColor DarkGray
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🎉 BACKUP ROUTINE FINISHED SUCCESSFULLY" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
