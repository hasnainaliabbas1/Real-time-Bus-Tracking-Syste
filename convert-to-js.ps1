$projectPath = $PSScriptRoot
$tsFiles = Get-ChildItem -Path $projectPath -Recurse -Include *.ts,*.tsx

foreach ($file in $tsFiles) {
    # Skip .d.ts files
    if ($file.Name -like "*.d.ts") {
        continue
    }

    # Determine new extension
    $newExt = if ($file.Extension -eq ".tsx") { ".jsx" } else { ".js" }
    $newPath = $file.FullName -replace [regex]::Escape($file.Extension), $newExt
    
    # Read content
    $content = Get-Content -Path $file.FullName -Raw

    # Remove TypeScript specific syntax while preserving React/JSX
    $content = $content -replace '(?<!React\.)<[A-Za-z]+(?:<[^>]+>)?(?=\s*>)', ''  # Remove generic type parameters but keep JSX
    $content = $content -replace ':\s*([A-Za-z][A-Za-z0-9]*(?:\[\])?|\{[^}]+\})(?=[,);=\s])', ''  # Remove type annotations
    $content = $content -replace 'interface\s+[A-Za-z]+\s*\{[^}]+\}\s*', ''  # Remove interfaces
    $content = $content -replace 'type\s+[A-Za-z]+\s*=\s*[^;]+;\s*', ''  # Remove type definitions
    $content = $content -replace 'export\s+type\s+[^;]+;\s*', ''  # Remove exported types
    $content = $content -replace ':\s*React\.FC<[^>]+>', ''  # Remove React.FC type annotations
    $content = $content -replace 'as\s+const', ''  # Remove 'as const' assertions
    
    # Save as new file
    $content | Set-Content -Path $newPath -NoNewline

    Write-Host "Converted $($file.Name) to $(Split-Path $newPath -Leaf)"
}
