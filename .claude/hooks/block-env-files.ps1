# PreToolUse hook: blocks any tool call that touches an env file.
# Matches basenames: .env, .env.<anything>, .env*, *.env, .envrc
# Does NOT match source files such as environment.ts or vite-env.d.ts.
# Exit 2 = block the tool call; the stderr message is shown to Claude.

$ErrorActionPreference = 'Stop'
$raw = [Console]::In.ReadToEnd()
try { $payload = $raw | ConvertFrom-Json } catch { exit 0 }

$toolName  = [string]$payload.tool_name
$toolInput = $payload.tool_input
if ($null -eq $toolInput) { exit 0 }

# Collect candidate path-like strings from the call.
$candidates = @()
if ($toolName -eq 'Bash') {
    if ($toolInput.command) {
        $candidates += [regex]::Split([string]$toolInput.command, '[\s''"`;|&<>()=,]+')
    }
} else {
    foreach ($prop in 'file_path', 'notebook_path', 'path', 'glob') {
        if ($toolInput.$prop) { $candidates += [string]$toolInput.$prop }
    }
    # Glob's pattern is a file pattern; Grep's pattern is content regex, so it is excluded.
    if ($toolName -eq 'Glob' -and $toolInput.pattern) { $candidates += [string]$toolInput.pattern }
}

$envName = '(?i)^(\.env([.*].*)?|.*\.env|\.envrc)$'

foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
    $leaf = ($candidate -split '[\\/]')[-1]
    if ($leaf -match $envName) {
        [Console]::Error.WriteLine("Blocked: '$candidate' is an env file. Agents must never read, search, or edit .env files. Ask the user to supply the value instead.")
        exit 2
    }
}

exit 0
