Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = "c:\VS\dvlp-ksef\web\deploy.zip"
$srcDir = "c:\VS\dvlp-ksef\web"
$excludeDirs = @('node_modules', 'node_modules_pnpm_backup', '.next', '.git', '.vscode', 'coverage', '.turbo')
$excludeFiles = @('.env', '.env.local', '.env.example', 'pnpm-lock.yaml', 'vitest.config.mts', 'tsconfig.tsbuildinfo', 'deploy.zip', 'deploy.tar', '_create_zip.ps1')

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

function Add-ToZip($dir, $relativePath) {
    Get-ChildItem -LiteralPath $dir -Force | ForEach-Object {
        $name = $_.Name
        $rel = if ($relativePath) { "$relativePath/$name" } else { $name }
        
        if ($_.PSIsContainer) {
            if ($name -notin $excludeDirs) {
                Add-ToZip $_.FullName $rel
            }
        } else {
            if ($name -notin $excludeFiles) {
                [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $rel) | Out-Null
            }
        }
    }
}

Add-ToZip $srcDir ''
$zip.Dispose()
$size = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "Created deploy.zip ($size MB)"
