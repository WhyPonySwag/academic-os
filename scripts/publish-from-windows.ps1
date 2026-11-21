# Publishes only application source files from a local ACADEMIC OS checkout.
# Never uploads the original Git history, SQLite, backups or incoming documents.
[CmdletBinding()]
param(
    [string]$Project = (Join-Path $env:USERPROFILE "Projects\AcademicOS\academic-os"),
    [string]$Storage = "D:\AcademicOS-Data"
)

$ErrorActionPreference = "Stop"
$repoUrl = "https://github.com/WhyPonySwag/academic-os.git"
$remoteBranch = "main"

if (-not (Test-Path -LiteralPath (Join-Path $Project "package.json"))) {
    throw "Application package.json was not found at $Project"
}
if (-not (Test-Path -LiteralPath $Storage)) {
    throw "Storage directory $Storage is unavailable"
}
if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
    throw "Git for Windows is required"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$stage = Join-Path $Storage "publisher\source-$stamp"
$clone = Join-Path $stage "repository"
New-Item -ItemType Directory -Force -Path $stage | Out-Null

# Only these root entries may be published.
$rootDirectories = @("src", "public", "tests")
$rootFiles = @(
    "components.json", "package.json", "package-lock.json",
    "tsconfig.json", "next.config.ts", "next.config.mjs",
    "eslint.config.mjs", "eslint.config.js",
    "playwright.config.ts", "postcss.config.mjs", "postcss.config.js",
    "tailwind.config.ts", "tailwind.config.js"
)

$included = New-Object 'System.Collections.Generic.List[object]'
foreach ($directory in $rootDirectories) {
    $dirPath = Join-Path $Project $directory
    if (-not (Test-Path -LiteralPath $dirPath)) { continue }
    Get-ChildItem -LiteralPath $dirPath -File -Recurse -Force |
        ForEach-Object {
            if ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) { return }
            $relative = $_.FullName.Substring($Project.Length + 1).Replace('\','/')
            $included.Add([PSCustomObject]@{ File = $_; Relative = $relative })
        }
}
foreach ($name in $rootFiles) {
    $filePath = Join-Path $Project $name
    if (Test-Path -LiteralPath $filePath -PathType Leaf) {
        $file = Get-Item -LiteralPath $filePath
        if (-not ($file.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            $included.Add([PSCustomObject]@{ File = $file; Relative = $name })
        }
    }
}

# Fail closed on personal data paths, huge files and likely credentials.
$forbiddenPath = '(?i)(^|/)(data|_incoming|_backups|_reports|_exports|uploads|private|node_modules|\.next|test-results|playwright-report|\.git)(/|$)|(^|/)\.env(\.|$)|\.(db|sqlite|sqlite3|pem|p12|pfx|jks)$|\.db-(wal|shm)$'
$secretPattern = '(?i)github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{25,}|sk-[A-Za-z0-9_-]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----'
$textExtensions = @(".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".json", ".md", ".txt", ".yml", ".yaml", ".html", ".svg")
$violations = New-Object 'System.Collections.Generic.List[string]'
$total = 0L

foreach ($entry in $included) {
    $file = $entry.File
    $name = $entry.Relative
    if ($name -match $forbiddenPath) {
        $violations.Add("Forbidden path: $name")
        continue
    }
    if ($file.Length -gt 20MB) {
        $violations.Add("File exceeds 20 MB: $name")
        continue
    }
    $total += $file.Length
    if ($total -gt 200MB) {
        $violations.Add("Total selected source exceeds 200 MB")
        break
    }
    if ([IO.Path]::GetExtension($name).ToLowerInvariant() -in $textExtensions) {
        try {
            $content = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
            if ($content -match $secretPattern) {
                $violations.Add("Possible secret detected in: $name")
            }
        } catch {
            $violations.Add("Cannot examine text file: $name")
        }
    }
}

if ($violations.Count -gt 0) {
    $violations | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    throw "Publication stopped. No files were pushed."
}
if ($included.Count -lt 5) {
    throw "Not enough application source files found. No files were pushed."
}

Write-Host "Source selected: $($included.Count) files; $([math]::Round($total / 1MB, 2)) MB"
Write-Host "Cloning public repository into staging on D..."

& git.exe clone --depth 1 --branch $remoteBranch $repoUrl $clone
if ($LASTEXITCODE -ne 0) { throw "Git clone failed. No local project files were changed." }

foreach ($entry in $included) {
    $destination = Join-Path $clone ($entry.Relative.Replace('/', '\'))
    $parent = Split-Path -Parent $destination
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    Copy-Item -LiteralPath $entry.File.FullName -Destination $destination -Force

    $sourceHash = (Get-FileHash -LiteralPath $entry.File.FullName -Algorithm SHA256).Hash
    $copyHash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash
    if ($sourceHash -ne $copyHash) {
        throw "Source changed during copying: $($entry.Relative). No push performed."
    }
}

& git.exe -C $clone add -A
if ($LASTEXITCODE -ne 0) { throw "Staging failed. Nothing was pushed." }

$status = & git.exe -C $clone diff --cached --name-only
if ($LASTEXITCODE -ne 0) { throw "Failed to inspect staged changes." }
if (-not $status) {
    Write-Host "Repository is already up to date. No push needed."
    return
}

Write-Host "Files staged for publication:"
$status | ForEach-Object { Write-Host "  $_" }

$author = (& git.exe -C $Project config user.name)
$email = (& git.exe -C $Project config user.email)
if (-not $author) { $author = "Academic OS" }
if (-not $email) { $email = "academic-os@localhost" }
& git.exe -C $clone -c "user.name=$author" -c "user.email=$email" commit -m "Import ACADEMIC OS application sources"
if ($LASTEXITCODE -ne 0) { throw "Commit failed. No push performed." }

Write-Host "Publishing to GitHub..."
& git.exe -C $clone push origin $remoteBranch
if ($LASTEXITCODE -ne 0) {
    throw "Push failed. Check GitHub authentication. Staging retained at $clone"
}
Write-Host "GitHub source publication completed: https://github.com/WhyPonySwag/academic-os" -ForegroundColor Green
Write-Host "The original project directory, database and Git history were not modified."
