# PreToolUse hook: blocks recursive deletes such as rm -rf, in Bash and in PowerShell.
# Covers rm with a recursive flag in any order or spelling (-rf, -fr, -r -f, --recursive, /bin/rm -Rf),
# PowerShell Remove-Item -Recurse (and its rm/ri/rmdir/rd/del aliases), and cmd-style rd/rmdir/del /s.
# Single-file deletes are allowed. Exit 2 = block the tool call; the stderr message is shown to Claude.

$ErrorActionPreference = 'Stop'
$raw = [Console]::In.ReadToEnd()
try { $payload = $raw | ConvertFrom-Json } catch { exit 0 }

$toolInput = $payload.tool_input
if ($null -eq $toolInput -or -not $toolInput.command) { exit 0 }
$command = [string]$toolInput.command

# Message text is prose, not a delete: a commit message or PR body may name the command.
# Quoted heredocs (<<'EOF') and unexpanded -m / --title / --body values are removed before the scan.
# Values with $ or a backtick are kept, because they can run commands.
$command = [regex]::Replace($command, '(?s)<<\s*''(\w+)''\r?\n.*?\r?\n\s*\1\b', ' ')
$command = [regex]::Replace($command, '(?<=\s)(?:-m|--message|--title|--body)(?:\s+|=)"[^"$`]*"', ' ')

$patterns = @(
    '(?<![\w-])(?:[\w./\\-]*[/\\])?rm\s+(?:-\S+\s+)*(?:-[a-zA-Z]*[rR][a-zA-Z]*\b|--recursive\b)',
    '(?i)(?<![\w-])(?:remove-item|rm|ri|rmdir|rd|del|erase)\s+(?:[^;|&\n]*\s)?-(?:recurse|r)\b',
    '(?i)(?<![\w-])(?:rd|rmdir|del|erase)\s+(?:[^;|&\n]*\s)?/s\b'
)

foreach ($pattern in $patterns) {
    $match = [regex]::Match($command, $pattern)
    if ($match.Success) {
        [Console]::Error.WriteLine("Blocked: '$($match.Value.Trim())' is a recursive delete. Agents must not run rm -rf or other recursive deletes. Delete the named files one at a time, or ask the user to run it.")
        exit 2
    }
}

exit 0
