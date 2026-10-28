# PreToolUse hook: blocks file edits and branch-changing git commands in the main checkout.
# Agents must work in a linked worktree (see CLAUDE.md, "Parallel work with git worktrees").
# The repo is resolved from the directory each call acts on, not from CLAUDE_PROJECT_DIR. That lets a session
# that has entered a worktree commit there, while the main checkout (its .git is a directory) stays blocked.
# Exit 2 = block the tool call; the stderr message is shown to Claude.

$ErrorActionPreference = 'Stop'
$raw = [Console]::In.ReadToEnd()
try { $payload = $raw | ConvertFrom-Json } catch { exit 0 }

$toolName  = [string]$payload.tool_name
$toolInput = $payload.tool_input
if ($null -eq $toolInput) { exit 0 }

# Relative paths and bare git commands resolve from the session's working directory.
$sessionDir = if ($payload.cwd) { [string]$payload.cwd }
    elseif ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR }
    else { (Get-Location).Path }
$sessionDir = [IO.Path]::GetFullPath($sessionDir).TrimEnd('\')

# Git commands that change the working tree, index or branch state.
$mutatingGit = '\bgit\s+(?:(?:-C|-c)\s+\S+\s+)*(add|commit|checkout|switch|restore|merge|rebase|reset|cherry-pick|revert|stash|am|apply|clean|mv|rm)(\s|$)'

$isEditTool = $toolName -in 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'
$isBash     = $toolName -eq 'Bash'
if (-not ($isEditTool -or $isBash)) { exit 0 }

# Nearest existing directory at or above a path, so a new file in a new folder still resolves to its repo.
function Resolve-ExistingDir([string]$path) {
    $dir = $path
    while ($dir -and -not (Test-Path -LiteralPath $dir -PathType Container)) {
        $parent = Split-Path -Parent $dir
        if ($parent -eq $dir) { return $null }
        $dir = $parent
    }
    if ($dir) { return [IO.Path]::GetFullPath($dir).TrimEnd('\') }
    return $null
}

# The directory this call acts on. Cheap checks first, so git is only queried when a call could change a repo.
$actionDir = $null
$blockedLabel = $null
if ($isEditTool) {
    $filePath = [string]$toolInput.file_path
    if ([string]::IsNullOrWhiteSpace($filePath)) { $filePath = [string]$toolInput.notebook_path }
    if ([string]::IsNullOrWhiteSpace($filePath)) { exit 0 }
    $fullPath = [IO.Path]::GetFullPath([IO.Path]::Combine($sessionDir, $filePath))
    $actionDir = Resolve-ExistingDir (Split-Path -Parent $fullPath)
    $blockedLabel = "'$filePath'"
} else {
    $command = [string]$toolInput.command
    if ($command -notmatch $mutatingGit) { exit 0 }
    $actionDir = $sessionDir
    # A leading "cd <dir> &&" or a "git -C <dir>" moves the directory the git command runs in.
    if ($command -match '^\s*cd\s+"?([^"&;|]+?)"?\s*(&&|;)') {
        $actionDir = Resolve-ExistingDir ([IO.Path]::Combine($actionDir, $matches[1].Trim()))
    }
    if ($actionDir -and $command -match '\bgit\s+-C\s+"?([^"\s;|&]+)"?') {
        $actionDir = Resolve-ExistingDir ([IO.Path]::Combine($actionDir, $matches[1]))
    }
    $blockedLabel = "'$command'"
}
if (-not $actionDir) { exit 0 }

# Main checkout: git-dir and git-common-dir are the same. A linked worktree has its own git-dir.
$gitDirs = & git -C $actionDir rev-parse --path-format=absolute --git-dir --git-common-dir 2>$null
if ($LASTEXITCODE -ne 0 -or $gitDirs.Count -lt 2) { exit 0 }
$gitDir    = [IO.Path]::GetFullPath([string]$gitDirs[0])
$commonDir = [IO.Path]::GetFullPath([string]$gitDirs[1])
if (-not $gitDir.Equals($commonDir, [StringComparison]::OrdinalIgnoreCase)) { exit 0 }

$hint = "Create a worktree and work there: git worktree add ../slay-drip-worktrees/<branch-slug> -b <type>/<branch-slug> main (or use EnterWorktree)."

if ($isEditTool) {
    [Console]::Error.WriteLine("Blocked: $blockedLabel is in the main checkout, which must stay at main for reading and review. $hint")
} else {
    [Console]::Error.WriteLine("Blocked: $blockedLabel changes the main checkout ($actionDir). Changes belong in a worktree. $hint")
}
exit 2
