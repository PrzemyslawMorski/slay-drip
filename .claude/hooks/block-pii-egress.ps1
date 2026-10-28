# PreToolUse hook: blocks tool calls that would send personal data, sensitive identifiers or secrets
# to a third party. Third parties include the Claude API (Agent prompts, Workflow scripts, remote agents),
# web services (WebSearch, WebFetch), MCP servers, publishing (Artifact, PublishPlugin) and outbound
# shell commands (curl, gh, git push, ...).
# Detection is pattern-based. It catches identifiers and secrets, not free-text names or health facts.
# Personal names come from %USERPROFILE%\.claude\pii-denylist.txt, which stays outside the repo (one term per line).
# Exit 2 = block the tool call; the stderr message is shown to Claude. Matched values are never printed.

$ErrorActionPreference = 'Stop'
# Read stdin as bytes and decode UTF-8 explicitly, so non-ASCII names survive the console code page.
$stdin = [Console]::OpenStandardInput()
$buffer = New-Object System.IO.MemoryStream
$stdin.CopyTo($buffer)
$raw = [Text.Encoding]::UTF8.GetString($buffer.ToArray())
try { $payload = $raw | ConvertFrom-Json } catch {
    # Fail closed: an unreadable outbound call is not allowed through.
    [Console]::Error.WriteLine('Blocked: the egress guard could not read this tool call.')
    exit 2
}

$toolName  = [string]$payload.tool_name
$toolInput = $payload.tool_input
if ($null -eq $toolInput) { exit 0 }

$shellTools   = 'Bash', 'PowerShell', 'Monitor'
$outboundTools = 'Agent', 'WebSearch', 'WebFetch', 'Artifact', 'ArtifactData', 'ArtifactComments',
    'SendMessage', 'PushNotification', 'RemoteTrigger', 'PublishPlugin', 'DesignSync', 'CronCreate', 'Workflow'
# Tools that upload the content of a local file, so the file is scanned too.
$fileTools = 'Artifact', 'Workflow', 'PublishPlugin'
$textExtensions = '.html', '.htm', '.md', '.txt', '.json', '.csv', '.svg', '.js', '.ts', '.css', '.yaml', '.yml', '.ps1', '.sh'

$isShell = $toolName -in $shellTools
if (-not ($isShell -or $toolName -in $outboundTools -or $toolName -like 'mcp__*')) { exit 0 }

# Shell commands only matter when they leave the machine or become shared history.
$egressPattern = '(?i)\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm|gh|scw|npm\s+publish|git\s+(?:-\S+\s+)*(?:commit|push|tag|notes)|ssh|scp|sftp|nc|Send-MailMessage)\b|https?://'

function Get-StringLeaves($node) {
    if ($null -eq $node) { return }
    if ($node -is [string]) { $node; return }
    if ($node -is [System.Collections.IDictionary]) {
        foreach ($value in $node.Values) { Get-StringLeaves $value }
        return
    }
    if ($node -is [System.Management.Automation.PSCustomObject]) {
        foreach ($property in $node.PSObject.Properties) { Get-StringLeaves $property.Value }
        return
    }
    if ($node -is [System.Collections.IEnumerable]) {
        foreach ($item in $node) { Get-StringLeaves $item }
    }
}

function Test-Luhn([string]$digits) {
    $sum = 0
    $double = $false
    for ($i = $digits.Length - 1; $i -ge 0; $i--) {
        $n = [int]::Parse([string]$digits[$i])
        if ($double) { $n *= 2; if ($n -gt 9) { $n -= 9 } }
        $sum += $n
        $double = -not $double
    }
    return ($sum % 10 -eq 0)
}

function Test-Iban([string]$iban) {
    $rearranged = $iban.Substring(4) + $iban.Substring(0, 4)
    $remainder = 0
    foreach ($c in $rearranged.ToCharArray()) {
        if ([char]::IsDigit($c)) {
            $remainder = ($remainder * 10 + [int]::Parse([string]$c)) % 97
        } else {
            $remainder = ($remainder * 100 + ([int]$c - 55)) % 97
        }
    }
    return ($remainder -eq 1)
}

# Polish national ID (PESEL): 11 digits, weighted check digit.
function Test-Pesel([string]$pesel) {
    $weights = 1, 3, 7, 9, 1, 3, 7, 9, 1, 3
    $sum = 0
    for ($i = 0; $i -lt 10; $i++) { $sum += [int]::Parse([string]$pesel[$i]) * $weights[$i] }
    return (((10 - ($sum % 10)) % 10) -eq [int]::Parse([string]$pesel[10]))
}

$secretPatterns = [ordered]@{
    'private key'         = '-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----'
    'AWS access key'      = '\b(?:AKIA|ASIA)[0-9A-Z]{16}\b'
    'Scaleway access key' = '\bSCW[0-9A-Z]{17}\b'
    'GitHub token'        = '\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b'
    'JWT'                 = '\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}'
    'credentials in URL'  = '\b[a-z][a-z0-9+.-]*://[^\s:/@]+:[^\s@/]+@'
    'secret assignment'   = '(?i)\b(?:password|passwd|secret|api[_-]?key|access[_-]?key|client[_-]?secret|token)\b["'']?\s*[:=]\s*["'']?(?!process\.|\$env:|os\.)[^\s"'',;]{8,}'
    'bearer token'        = '(?i)\bbearer\s+[A-Za-z0-9._~+/-]{16,}=*'
}

function Find-Sensitive([string]$text) {
    $found = New-Object System.Collections.Generic.HashSet[string]

    # Email addresses, except placeholders and the repo's commit co-author address.
    foreach ($m in [regex]::Matches($text, '[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}')) {
        if ($m.Value -notmatch '(?i)^(noreply@anthropic\.com|.+@(example\.(com|org|net)|users\.noreply\.github\.com))$') {
            [void]$found.Add('email address')
        }
    }

    # International phone numbers (+ prefix only).
    if ([regex]::IsMatch($text, '(?<![\w+])\+\d{1,3}[ .()\-]*\d(?:[ .()\-]*\d){6,12}(?!\w)')) {
        [void]$found.Add('phone number')
    }

    # Payment cards: 13 to 19 digits that pass the Luhn check.
    foreach ($m in [regex]::Matches($text, '(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)')) {
        $digits = $m.Value -replace '[ -]', ''
        if ($digits.Length -ge 13 -and $digits.Length -le 19 -and (Test-Luhn $digits)) {
            [void]$found.Add('payment card number')
        }
    }

    # IBANs: two letters, two check digits, then alphanumerics, with the mod-97 check.
    foreach ($m in [regex]::Matches($text, '(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}(?![A-Za-z0-9])')) {
        $iban = $m.Value -replace ' ', ''
        if ($iban.Length -ge 15 -and $iban.Length -le 34 -and (Test-Iban $iban)) {
            [void]$found.Add('bank account (IBAN)')
        }
    }

    # National ID numbers (PESEL) with a valid check digit.
    foreach ($m in [regex]::Matches($text, '(?<!\d)\d{11}(?!\d)')) {
        if (Test-Pesel $m.Value) { [void]$found.Add('national ID number (PESEL)') }
    }

    # IPv4 addresses, excluding loopback and unspecified.
    $ipOctet = '(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)'
    foreach ($m in [regex]::Matches($text, "(?<![\d.])(?:$ipOctet\.){3}$ipOctet(?![\d.])")) {
        if ($m.Value -notmatch '^(0|127)\.') { [void]$found.Add('IP address') }
    }

    # Secrets and credentials.
    foreach ($name in $secretPatterns.Keys) {
        if ([regex]::IsMatch($text, $secretPatterns[$name])) { [void]$found.Add($name) }
    }

    # Personal names and identifiers from the user's own list, outside the repo.
    $denylistPath = Join-Path $env:USERPROFILE '.claude\pii-denylist.txt'
    if (Test-Path -LiteralPath $denylistPath -PathType Leaf) {
        foreach ($line in (Get-Content -LiteralPath $denylistPath -Encoding UTF8)) {
            $term = $line.Trim()
            if ($term -eq '' -or $term.StartsWith('#')) { continue }
            $pattern = '(?i)(?<![\p{L}\p{N}])' + [regex]::Escape($term) + '(?![\p{L}\p{N}])'
            if ([regex]::IsMatch($text, $pattern)) { [void]$found.Add('personal identifier') }
        }
    }

    return @($found)
}

# Collect the text that would leave the machine.
$texts = @()
if ($isShell) {
    $command = [string]$toolInput.command
    if ($command -notmatch $egressPattern) { exit 0 }
    $texts += $command
} else {
    $texts += @(Get-StringLeaves $toolInput)
    if ($toolName -in $fileTools) {
        foreach ($value in @(Get-StringLeaves $toolInput)) {
            $extension = [IO.Path]::GetExtension($value).ToLowerInvariant()
            if ($extension -in $textExtensions -and (Test-Path -LiteralPath $value -PathType Leaf)) {
                $texts += Get-Content -LiteralPath $value -Raw -Encoding UTF8
            }
        }
    }
}

$categories = @()
foreach ($text in $texts) {
    if ([string]::IsNullOrEmpty($text)) { continue }
    $categories += Find-Sensitive $text
}
$categories = @($categories | Sort-Object -Unique)

if ($categories.Count -gt 0) {
    $list = $categories -join ', '
    [Console]::Error.WriteLine("Blocked: $toolName would send possible $list to a third party. Replace each value with an opaque placeholder (for example [email-1]) or ask the user to supply it. Matched values are not shown.")
    exit 2
}

exit 0
