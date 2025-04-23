# Ask user for new Supabase Service Role Key securely
$NewKey = Read-Host "Enter your new Supabase SERVICE_ROLE_KEY" -AsSecureString
$UnsecureKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($NewKey))

# Path to the file you want to update
$SupabaseFilePath = "src\lib\supabase.ts"

# Check if file exists
if (-Not (Test-Path $SupabaseFilePath)) {
    Write-Host "❌ File not found: $SupabaseFilePath" -ForegroundColor Red
    exit 1
}

# Read the file content
$Content = Get-Content $SupabaseFilePath -Raw

# Define regex to match the existing service role key line
$UpdatedContent = $Content -replace '(?<=SUPABASE_SERVICE_ROLE_KEY\s*=\s*["''])([^"'']+)(?=["''])', $UnsecureKey

# Write the updated content back to the file
Set-Content -Path $SupabaseFilePath -Value $UpdatedContent -Force

Write-Host "✅ Supabase service role key updated successfully in $SupabaseFilePath" -ForegroundColor Green

# Ask if you want to restart the dev server
$restart = Read-Host "Do you want to restart the dev server now? (y/n)"
if ($restart -eq "y") {
    Write-Host "🔄 Restarting dev server..."
    Stop-Process -Name "node" -ErrorAction SilentlyContinue
    Start-Process "npm" "run dev" -NoNewWindow
}
