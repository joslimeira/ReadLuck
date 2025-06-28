# Script para criar instalador e versão portátil do ReadLuck para Windows
Write-Host "=== ReadLuck Windows Build Script ===" -ForegroundColor Green
Write-Host "Este script criará uma versão portátil e tentará criar um instalador"
Write-Host ""

# Verificar se estamos no diretório correto
if (!(Test-Path "package.json")) {
    Write-Host "ERRO: Execute este script no diretório raiz do projeto ReadLuck" -ForegroundColor Red
    exit 1
}

# Passo 1: Criar versão portátil com electron-packager
Write-Host "Passo 1: Criando versão portátil..." -ForegroundColor Cyan
& npx electron-packager . ReadLuck --platform=win32 --arch=x64 --out=dist --overwrite

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Versão portátil criada com sucesso!" -ForegroundColor Green
} else {
    Write-Host "✗ Erro ao criar versão portátil" -ForegroundColor Red
    exit 1
}

# Verificar se a versão portátil foi criada
if (!(Test-Path "dist\ReadLuck-win32-x64\ReadLuck.exe")) {
    Write-Host "✗ Arquivo ReadLuck.exe não encontrado" -ForegroundColor Red
    exit 1
}

# Passo 2: Criar arquivo ZIP da versão portátil
Write-Host "\nPasso 2: Criando arquivo ZIP da versão portátil..." -ForegroundColor Cyan
$zipPath = "dist\ReadLuck-Portable-v1.0.0.zip"
Compress-Archive -Path "dist\ReadLuck-win32-x64\*" -DestinationPath $zipPath -Force
Write-Host "✓ Arquivo ZIP criado: $zipPath" -ForegroundColor Green

# Passo 3: Verificar NSIS e criar instalador
Write-Host "\nPasso 3: Verificando NSIS..." -ForegroundColor Cyan

$nsisPath = $null
$nsisLocations = @(
    "${env:ProgramFiles}\NSIS\makensis.exe",
    "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
    "C:\Program Files\NSIS\makensis.exe",
    "C:\Program Files (x86)\NSIS\makensis.exe"
)

foreach ($location in $nsisLocations) {
    if (Test-Path $location) {
        $nsisPath = $location
        break
    }
}

if ($nsisPath) {
    Write-Host "✓ NSIS encontrado em: $nsisPath" -ForegroundColor Green
    & "$nsisPath" "ReadLuck-Installer.nsi"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Instalador NSIS criado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠ Erro ao criar instalador NSIS" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ NSIS não encontrado" -ForegroundColor Yellow
    Write-Host "Para criar um instalador:" -ForegroundColor Yellow
    Write-Host "1. Baixe NSIS em: https://nsis.sourceforge.io/Download" -ForegroundColor Yellow
    Write-Host "2. Instale o NSIS" -ForegroundColor Yellow
    Write-Host "3. Execute: makensis ReadLuck-Installer.nsi" -ForegroundColor Yellow
}

# Mostrar resumo
Write-Host "\n=== RESUMO ===" -ForegroundColor Green
if (Test-Path "dist\ReadLuck-win32-x64") {
    Write-Host "✓ Versão Portátil: dist\ReadLuck-win32-x64\" -ForegroundColor Green
}
if (Test-Path "dist\ReadLuck-Portable-v1.0.0.zip") {
    Write-Host "✓ ZIP Portátil: dist\ReadLuck-Portable-v1.0.0.zip" -ForegroundColor Green
}
$installerFiles = Get-ChildItem -Path "." -Filter "ReadLuck-Setup-*.exe" -ErrorAction SilentlyContinue
if ($installerFiles) {
    foreach ($installer in $installerFiles) {
        Write-Host "✓ Instalador: $($installer.Name)" -ForegroundColor Green
    }
}

Write-Host "\nBuild concluído!" -ForegroundColor Green