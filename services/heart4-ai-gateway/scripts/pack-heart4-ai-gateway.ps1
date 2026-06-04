# สร้าง zip สำหรับ VM — รันจาก repo: npm run pack:ai-gateway
# Output: <repo-parent>/heart4-ai-gateway-pack.zip (อยู่นอก repo กัน Turbopack)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
if (-not (Test-Path (Join-Path $root "package.json"))) {
  throw "Expected repo root at $root"
}

$packParent = Split-Path -Parent $root
$outDir = Join-Path $packParent "heart4-ai-gateway-pack"
$zipPath = Join-Path $packParent "heart4-ai-gateway-pack.zip"

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$libSrc = Join-Path $root "src\lib"
$libDst = Join-Path $outDir "src\lib"
$excludeFiles = @(
  "heart4roomsExport.ts",
  "heart4roomsExportJobs.ts",
  "heart4roomsExportEmbed.ts",
  "heart4roomsExportImageOptions.ts",
  "fetchHeart4RoomsSurveysForExport.ts",
  "adminAiRagStore.ts",
  "adminAiEmbeddings.ts",
  "adminAiLlmBackend.ts",
  "adminAiOpenChat.ts",
  "adminAiChat.ts",
  "adminAiVmGateway.ts",
  "vmClient.ts",
  "gatewayProxyConfig.ts"
)
if (Test-Path $libDst) { Remove-Item $libDst -Recurse -Force }
New-Item -ItemType Directory -Path (Split-Path $libDst) -Force | Out-Null
$xf = ($excludeFiles | ForEach-Object { "/XF"; $_ }) -join " "
Invoke-Expression "robocopy `"$libSrc`" `"$libDst`" /E /NFL /NDL /NJH /NJS /nc /ns /np $xf" | Out-Null

$svc = Join-Path $root "services\heart4-ai-gateway"
New-Item -ItemType Directory -Path (Join-Path $outDir "scripts") -Force | Out-Null
Copy-Item (Join-Path $svc "scripts\run-heart4-ai-gateway.ts") (Join-Path $outDir "scripts\") -Force

$dataDir = Join-Path $outDir "data"
New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
$harvest = Join-Path $root "data\harvest-stats-2568-2569.json"
if (Test-Path $harvest) { Copy-Item $harvest $dataDir -Force }

Copy-Item (Join-Path $svc "README.md") (Join-Path $outDir "README-VM.txt") -Force -ErrorAction SilentlyContinue

Copy-Item (Join-Path $svc "package.json") (Join-Path $outDir "package.json") -Force
$tsconfigPack = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*.ts", "scripts/**/*.ts"]
}
'@
Set-Content (Join-Path $outDir "tsconfig.json") $tsconfigPack -Encoding utf8
Copy-Item (Join-Path $svc "vm-stubs\supabaseAdmin.ts") (Join-Path $outDir "src\lib\supabaseAdmin.ts") -Force
Copy-Item (Join-Path $svc "vm-stubs\env.ts") (Join-Path $outDir "src\lib\env.ts") -Force

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $outDir "*") -DestinationPath $zipPath -Force

$mb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Host "Created: $zipPath ($mb MB)"
Write-Host "Copy zip to VM -> extract to C:\heart4-ai\gateway\"
