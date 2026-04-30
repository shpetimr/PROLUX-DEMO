param(
    [switch]$Run,
    [switch]$AllowMerge
)

$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDirectory = Resolve-Path (Join-Path $scriptDirectory "..")
$projectPath = Join-Path $backendDirectory "backend.csproj"

$migrationArgs = @("--migrate-sqlite-to-postgres")

if (-not $Run) {
    $migrationArgs += "--migration-dry-run"
}

if ($AllowMerge) {
    $migrationArgs += "--migration-allow-merge"
}

dotnet run --project $projectPath -- $migrationArgs

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
