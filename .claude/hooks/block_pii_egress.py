"""PreToolUse hook: blocks tool calls that would send personal data, sensitive identifiers or secrets to a third party.

Third parties include the Claude API (Agent prompts, Workflow scripts, remote agents), web services (WebSearch,
WebFetch), MCP servers, publishing (Artifact, PublishPlugin) and outbound shell commands (curl, gh, git push, ...).
Detection is pattern-based. It catches identifiers and secrets, not free-text names or health facts.
Personal names come from ~/.claude/pii-denylist.txt, which stays outside the repo (one term per line).
Exit 2 = block the tool call; the stderr message is shown to Claude. Matched values are never printed.
Fails closed: a tool call the guard cannot read or check is blocked.
"""

import json
import os
import re
import sys
from pathlib import Path

SHELL_TOOLS = ("Bash", "PowerShell", "Monitor")
OUTBOUND_TOOLS = (
    "Agent", "WebSearch", "WebFetch", "Artifact", "ArtifactData", "ArtifactComments",
    "SendMessage", "PushNotification", "RemoteTrigger", "PublishPlugin", "DesignSync", "CronCreate", "Workflow",
)
# Tools that upload the content of a local file, so the file is scanned too.
FILE_TOOLS = ("Artifact", "Workflow", "PublishPlugin")
TEXT_EXTENSIONS = (
    ".html", ".htm", ".md", ".txt", ".json", ".csv", ".svg", ".js", ".ts", ".css", ".yaml", ".yml", ".ps1", ".sh",
)

# Shell commands only matter when they leave the machine or become shared history.
EGRESS = re.compile(
    r"(?i)\b(curl|wget|Invoke-WebRequest|Invoke-RestMethod|iwr|irm|gh|scw|npm\s+publish"
    r"|git\s+(?:-\S+\s+)*(?:commit|push|tag|notes)|ssh|scp|sftp|nc|Send-MailMessage)\b|https?://"
)

PLACEHOLDER_EMAIL = re.compile(
    r"(?i)^(noreply@anthropic\.com|.+@(example\.(com|org|net)|users\.noreply\.github\.com))$"
)
EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}")
PHONE = re.compile(r"(?<![\w+])\+\d{1,3}[ .()\-]*\d(?:[ .()\-]*\d){6,12}(?!\w)")
CARD_CANDIDATE = re.compile(r"(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)")
IBAN_CANDIDATE = re.compile(r"(?<![A-Za-z0-9])[A-Z]{2}\d{2}(?: ?[A-Z0-9]){11,30}(?![A-Za-z0-9])")
PESEL_CANDIDATE = re.compile(r"(?<!\d)\d{11}(?!\d)")
IP_OCTET = r"(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)"
IPV4 = re.compile(r"(?<![\d.])(?:" + IP_OCTET + r"\.){3}" + IP_OCTET + r"(?![\d.])")

SECRET_PATTERNS = {
    "private key": r"-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----",
    "AWS access key": r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b",
    "Scaleway access key": r"\bSCW[0-9A-Z]{17}\b",
    "GitHub token": r"\bgh[pousr]_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b",
    "JWT": r"\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}",
    "credentials in URL": r"\b[a-z][a-z0-9+.-]*://[^\s:/@]+:[^\s@/]+@",
    "secret assignment": (
        r"(?i)\b(?:password|passwd|secret|api[_-]?key|access[_-]?key|client[_-]?secret|token)\b"
        r"[\"']?\s*[:=]\s*[\"']?(?!process\.|\$env:|os\.)[^\s\"',;]{8,}"
    ),
    "bearer token": r"(?i)\bbearer\s+[A-Za-z0-9._~+/-]{16,}=*",
}


def get_string_leaves(node):
    if node is None:
        return
    if isinstance(node, str):
        yield node
    elif isinstance(node, dict):
        for value in node.values():
            yield from get_string_leaves(value)
    elif isinstance(node, list):
        for item in node:
            yield from get_string_leaves(item)


def test_luhn(digits: str) -> bool:
    total = 0
    double = False
    for char in reversed(digits):
        n = int(char)
        if double:
            n *= 2
            if n > 9:
                n -= 9
        total += n
        double = not double
    return total % 10 == 0


def test_iban(iban: str) -> bool:
    rearranged = iban[4:] + iban[:4]
    remainder = 0
    for char in rearranged:
        if char.isdecimal():
            remainder = (remainder * 10 + int(char)) % 97
        else:
            remainder = (remainder * 100 + (ord(char) - 55)) % 97
    return remainder == 1


def test_pesel(pesel: str) -> bool:
    # Polish national ID: 11 digits, weighted check digit.
    weights = (1, 3, 7, 9, 1, 3, 7, 9, 1, 3)
    total = sum(int(pesel[i]) * weights[i] for i in range(10))
    return (10 - total % 10) % 10 == int(pesel[10])


def find_sensitive(text: str) -> set[str]:
    found: set[str] = set()

    # Email addresses, except placeholders and the repo's commit co-author address.
    for match in EMAIL.finditer(text):
        if not PLACEHOLDER_EMAIL.search(match.group(0)):
            found.add("email address")

    # International phone numbers (+ prefix only).
    if PHONE.search(text):
        found.add("phone number")

    # Payment cards: 13 to 19 digits that pass the Luhn check.
    for match in CARD_CANDIDATE.finditer(text):
        digits = re.sub(r"[ -]", "", match.group(0))
        if 13 <= len(digits) <= 19 and test_luhn(digits):
            found.add("payment card number")

    # IBANs: two letters, two check digits, then alphanumerics, with the mod-97 check.
    for match in IBAN_CANDIDATE.finditer(text):
        iban = match.group(0).replace(" ", "")
        if 15 <= len(iban) <= 34 and test_iban(iban):
            found.add("bank account (IBAN)")

    # National ID numbers (PESEL) with a valid check digit.
    for match in PESEL_CANDIDATE.finditer(text):
        if test_pesel(match.group(0)):
            found.add("national ID number (PESEL)")

    # IPv4 addresses, excluding loopback and unspecified.
    for match in IPV4.finditer(text):
        if not re.match(r"^(0|127)\.", match.group(0)):
            found.add("IP address")

    # Secrets and credentials.
    for name, pattern in SECRET_PATTERNS.items():
        if re.search(pattern, text):
            found.add(name)

    # Personal names and identifiers from the user's own list, outside the repo.
    denylist = Path.home() / ".claude" / "pii-denylist.txt"
    if denylist.is_file():
        for line in denylist.read_text(encoding="utf-8-sig").splitlines():
            term = line.strip()
            if not term or term.startswith("#"):
                continue
            pattern = r"(?i)(?<![^\W_])" + re.escape(term) + r"(?![^\W_])"
            if re.search(pattern, text):
                found.add("personal identifier")

    return found


def collect_texts(tool_name: str, tool_input) -> list[str] | None:
    """Return the text that would leave the machine, or None when the call has nothing to scan."""
    if tool_name in SHELL_TOOLS:
        command = str(tool_input.get("command") or "") if isinstance(tool_input, dict) else ""
        if not EGRESS.search(command):
            return None
        return [command]

    texts = list(get_string_leaves(tool_input))
    if tool_name in FILE_TOOLS:
        for value in list(texts):
            extension = os.path.splitext(value)[1].lower()
            if extension in TEXT_EXTENSIONS and os.path.isfile(value):
                texts.append(Path(value).read_text(encoding="utf-8", errors="replace"))
    return texts


def main() -> int:
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8"))
    except ValueError:
        # Fail closed: an unreadable outbound call is not allowed through.
        print("Blocked: the egress guard could not read this tool call.", file=sys.stderr)
        return 2
    if not isinstance(payload, dict):
        return 0

    tool_name = str(payload.get("tool_name", ""))
    tool_input = payload.get("tool_input")
    if tool_input is None:
        return 0
    if not (tool_name in SHELL_TOOLS or tool_name in OUTBOUND_TOOLS or tool_name.startswith("mcp__")):
        return 0

    texts = collect_texts(tool_name, tool_input)
    if texts is None:
        return 0

    categories: set[str] = set()
    for text in texts:
        if text:
            categories |= find_sensitive(text)

    if categories:
        print(
            f"Blocked: {tool_name} would send possible {', '.join(sorted(categories))} to a third party. "
            "Replace each value with an opaque placeholder (for example [email-1]) or ask the user to supply it. "
            "Matched values are not shown.",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    try:
        code = main()
    except Exception:
        # Fail closed: a check that errors must not let the call through.
        print("Blocked: the egress guard hit an error on this tool call.", file=sys.stderr)
        code = 2
    sys.exit(code)
