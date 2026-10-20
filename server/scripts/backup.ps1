# Back up the database on Windows (PowerShell):  cd server ; .\scripts\backup.ps1
# Restore:  Get-Content backups\<file>.sql | docker compose exec -T db psql -U p2050 p2050
Set-Location (Join-Path $PSScriptRoot "..")
New-Item -ItemType Directory -Force -Path backups | Out-Null
$f = "backups\p2050-$(Get-Date -Format yyyyMMdd-HHmm).sql"
docker compose exec -T db pg_dump -U p2050 p2050 | Out-File -Encoding utf8 $f
Write-Output "saved $f"
