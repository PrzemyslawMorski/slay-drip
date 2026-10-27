# PreToolUse hook: blocks file edits and branch-changing git commands in the main checkout.
# Agents must work in a linked worktree (see CLAUDE.md, "Parallel work with git worktrees").
# The main checkout (CLAUDE_PROJECT_DIR when its .git is a directory) stays at main for reading and review.
# Exit 2 = block the tool call; the stderr message is shown to Claude.

$ErrorActionPreference = 'Stop'
$raw = [Console]::In.ReadToEnd()
try { $payload = $raw | ConvertFrom-Json } catch { exit 0 }

$toolName  = [string]$payload.tool_name
$toolInput = $payload.tool_input
if ($null -eq $toolInput) { exit 0 }

$projectDir = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
$projectDir = [IO.Path]::GetFullPath($projectDir).TrimEnd('\')

# Git commands that change the working tree, index or branch state.
$mutatingGit = '\bgit\s+(?:(?:-C|-c)\s+\S+\s+)*(add|commit|checkout|switch|restore|merge|rebase|reset|cherry-pick|revert|stash|am|apply|clean|mv|rm)(\s|$)'

$isEditTool = $toolName -in 'Edit', 'Write', 'MultiEdit', 'NotebookEdit'
$isBash     = $toolName -eq 'Bash'
if (-not ($isEditTool -or $isBash)) { exit 0 }

# Cheap checks first, so git is only queried when a call could change the repo.
$targetsRepo = $false
if ($isEditTool) {
    $filePath = [string]$toolInput.file_path
    if ([string]::IsNullOrWhiteSpace($filePath)) { $filePath = [string]$toolInput.notebook_path }
    if ([string]::IsNullOrWhiteSpace($filePath)) { exit 0 }
    $fullPath = [IO.Path]::GetFullPath([IO.Path]::Combine($projectDir, $filePath))
    $targetsRepo = $fullPath.StartsWith($projectDir + '\', [StringComparison]::OrdinalIgnoreCase)
} else {
    $command = [string]$toolInput.command
    if ($command -match $mutatingGit) { $targetsRepo = $true }
}
if (-not $targetsRepo) { exit 0 }

# Main checkout: git-dir and git-common-dir are the same. A linked worktree has its own git-dir.
$gitDirs = & git -C $projectDir rev-parse --path-format=absolute --git-dir --git-common-dir 2>$null
if ($LASTEXITCODE -ne 0 -or $gitDirs.Count -lt 2) { exit 0 }
$gitDir    = [IO.Path]::GetFullPath([string]$gitDirs[0])
$commonDir = [IO.Path]::GetFullPath([string]$gitDirs[1])
if (-not $gitDir.Equals($commonDir, [StringComparison]::OrdinalIgnoreCase)) { exit 0 }

$hint = "Create a worktree and work there: git worktree add ../slay-drip-worktrees/<branch-slug> -b <type>/<branch-slug> main (or use EnterWorktree)."

if ($isEditTool) {
    [Console]::Error.WriteLine("Blocked: '$filePath' is in the main checkout, which must stay at main for reading and review. $hint")
} else {
    [Console]::Error.WriteLine("Blocked: '$command' changes the main checkout. Changes belong in a worktree. $hint")
}
exit 2
