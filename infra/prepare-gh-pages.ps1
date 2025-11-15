Param()
$root = (Get-Location).ProviderPath
$src = Join-Path $root "frontend\public"
$dst = Join-Path $root "docs"
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
Copy-Item -Path $src -Destination $dst -Recurse
Write-Host "Copied frontend/public -> docs (ready for GitHub Pages)"
