# PreToolUse hook: blocks any tool call that touches an env file.
# Matches basenames: .env, .env.<anything>, .env*, *.env, .envrc, and dot-globs such as .en* that would match them.
# Does NOT match source files such as environment.ts or vite-env.d.ts.
# Registered for Bash and PowerShell (same command-text scan) and for the file tools.
# Exit 2 = block the tool call; the stderr message is shown to Claude.

$ErrorActionPreference = 'Stop'
$raw = [Console]::In.ReadToEnd()
try { $payload = $raw | ConvertFrom-Json } catch { exit 0 }

$toolName  = [string]$payload.tool_name
$toolInput = $payload.tool_input
if ($null -eq $toolInput) { exit 0 }

# Collect candidate path-like strings from the call.
$candidates = @()
if ($toolName -in 'Bash', 'PowerShell') {
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
    # A dot-glob such as .en* expands to .env in the shell, so test the wildcard against the env names too.
    $dotGlob = $leaf.StartsWith('.') -and ($leaf -match '[*?]') -and
        ([System.Management.Automation.WildcardPattern]::new($leaf).IsMatch('.env') -or
         [System.Management.Automation.WildcardPattern]::new($leaf).IsMatch('.envrc'))
    if ($leaf -match $envName -or $dotGlob) {
        [Console]::Error.WriteLine("Blocked: '$candidate' is an env file. Agents must never read, search, or edit .env files. Ask the user to supply the value instead.")
        exit 2
    }
}

exit 0
