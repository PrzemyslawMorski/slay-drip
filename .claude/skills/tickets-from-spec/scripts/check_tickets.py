#!/usr/bin/env python3
"""Check the tickets generated from one spec against the tickets-from-spec rules.

Usage:
    python .claude/skills/tickets-from-spec/scripts/check_tickets.py docs/specs/S1-02-manual-outfit-creation.md

Reads every docs/specs/<SPEC-ID>.<nn>-*.md next to the spec, plus the spec itself, the
requirements file and the ADR folder under --root (default: current directory).

Exit status is 0 when there are no errors. Warnings do not fail the check.
Owned paths come from references/roles.md. A pattern segment <domain> matches any
backend/internal package except db, ai and eval, which have their own roles.
"""

import argparse
import re
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
ROLES_FILE = SKILL_DIR / "references" / "roles.md"

ISSUE_TYPES = {"Story", "Task", "Spike"}
STATUSES = {"To Do", "In Progress", "In Review", "Done", "Blocked"}
COMPONENTS = {"client", "server", "infra", "ai", "docs"}
BUILD_ROLE_EXEMPT_FROM_COVERS = {"architect", "docs-steward", "infra-engineer"}
REVIEW_ROLES = {"privacy-reviewer", "a11y-reviewer"}

# Sentences copied from the template's instructions. A ticket that still has one of
# them was not filled in properly.
TEMPLATE_RESIDUE = [
    "Write the story in Gherkin form.",
    "Every criterion is a Gherkin `Scenario`",
    "List every link that changes when this ticket can start or finish.",
    "Context and any detail needed to build it.",
    "Open questions, risks, links to discovery notes or design files.",
]

KEY_RE = re.compile(r"\b(S\d+-\d{2}(?:\.\d{2})?)\b")
ADR_RE = re.compile(r"\bADR-(\d{4})\b")
GHERKIN_BLOCK = re.compile(r"^```gherkin\s*\n(.*?)^```\s*$", re.M | re.S)
SCENARIO = re.compile(r"^\s*Scenario(?: Outline)?:\s*(.+?)\s*$", re.M)
DEP_ROW = re.compile(r"^\|\s*(is blocked by|blocks|relates to)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|", re.I)
HEADER_ROW = re.compile(r"^\|\s*\*\*(.+?)\*\*\s*\|\s*(.*?)\s*\|\s*$")


class Report:
    def __init__(self):
        self.errors = []
        self.warnings = []

    def error(self, where, message):
        self.errors.append(f"ERROR {where}: {message}")

    def warn(self, where, message):
        self.warnings.append(f"WARN  {where}: {message}")


def normalise_title(title):
    return re.sub(r"\s+", " ", title).strip()


def split_sections(text):
    """Map each '## Heading' to the text under it, up to the next '## ' heading."""
    sections, heading, buf = {}, None, []
    for line in text.splitlines():
        match = re.match(r"^## (.+?)\s*$", line)
        if match:
            if heading is not None:
                sections[heading] = "\n".join(buf)
            heading, buf = match.group(1), []
        elif heading is not None:
            buf.append(line)
    if heading is not None:
        sections[heading] = "\n".join(buf)
    return sections


def gherkin_scenarios(text):
    titles = []
    for block in GHERKIN_BLOCK.findall(text):
        titles += [normalise_title(t) for t in SCENARIO.findall(block)]
    return titles


def parse_header(text):
    head = text.split("\n## ", 1)[0]
    fields = {}
    for line in head.splitlines():
        match = HEADER_ROW.match(line)
        if match:
            fields[match.group(1).strip()] = match.group(2).strip()
    title = re.search(r"^# (\S+) ·", head, re.M)
    return fields, (title.group(1) if title else None)


def parse_dependencies(section_text):
    return [(m.group(1).lower(), m.group(2), m.group(3)) for m in
            (DEP_ROW.match(line) for line in section_text.splitlines()) if m]


def first_ref(cell):
    """Return ('ticket', key), ('spec', key), ('adr', nnnn) or None for a dependency cell."""
    ticket = re.search(r"\bS\d+-\d{2}\.\d{2}\b", cell)
    if ticket:
        return ("ticket", ticket.group(0))
    spec = re.search(r"\bS\d+-\d{2}\b", cell)
    if spec:
        return ("spec", spec.group(0))
    adr = ADR_RE.search(cell)
    if adr:
        return ("adr", adr.group(1))
    return None


def load_roles(path):
    roles, current = {}, None
    for line in path.read_text(encoding="utf-8").splitlines():
        heading = re.match(r"^### `([a-z-]+)`", line)
        if heading:
            current = heading.group(1)
            roles[current] = {"owns": [], "read_only": False}
        elif current and line.startswith("- **Owns:**"):
            roles[current]["owns"] = re.findall(r"`([^`]+)`", line)
            roles[current]["read_only"] = "read-only" in line
    return roles


def owned_regex(token):
    parts = re.split(r"(<domain>)", token)
    body = ""
    for part in parts:
        if part == "<domain>":
            body += r"(?!(?:db|ai|eval)/)[^/]+"
        else:
            body += re.escape(part)
    if token.endswith("/"):
        body += r".*"
    return re.compile(body)


def is_owned(role_info, path):
    return any(owned_regex(token).fullmatch(path) for token in role_info["owns"])


def files_to_change(notes_text):
    """Return the paths listed under '**Files to change:**' in the agent brief, or None."""
    lines = notes_text.splitlines()
    for index, line in enumerate(lines):
        if line.strip().startswith("- **Files to change:**"):
            if "None" in line and "read-only" in line:
                return []
            paths = []
            for following in lines[index + 1:]:
                if not following.startswith("  - "):
                    break
                tokens = re.findall(r"`([^`]+)`", following)
                paths.append(tokens[0] if tokens else following.strip())
            return paths
    return None


def covers_titles(notes_text):
    for line in notes_text.splitlines():
        if line.strip().startswith("- **Covers scenarios:**"):
            return re.findall(r"`([^`]+)`", line)
    return None


def personas(requirements_text):
    return [p.strip().lower() for p in re.findall(r"Primary persona:\s*the\s+([^.*\n]+)", requirements_text)]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("spec", help="path to the spec file, for example docs/specs/S1-02-....md")
    parser.add_argument("--root", default=".", help="repository root (default: current directory)")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    spec_path = Path(args.spec)
    if not spec_path.is_absolute():
        spec_path = (root / spec_path).resolve()
    report = Report()

    if not spec_path.is_file():
        print(f"ERROR: spec not found: {spec_path}")
        return 1

    spec_match = re.match(r"^(S\d+-\d{2})-.+\.md$", spec_path.name)
    if not spec_match:
        print(f"ERROR: spec file name must look like S<session>-<nn>-<slug>.md: {spec_path.name}")
        return 1
    spec_key = spec_match.group(1)
    specs_dir = spec_path.parent
    spec_text = spec_path.read_text(encoding="utf-8")

    roles = load_roles(ROLES_FILE)
    requirements_path = root / "docs" / "requirements.md"
    persona_names = personas(requirements_path.read_text(encoding="utf-8")) if requirements_path.is_file() else []
    if not persona_names:
        report.warn("docs/requirements.md", "no 'Primary persona:' line found, persona check skipped")

    ticket_re = re.compile(rf"^{re.escape(spec_key)}\.(\d{{2}})-[a-z0-9-]+\.md$")
    ticket_files = sorted(p for p in specs_dir.iterdir() if ticket_re.match(p.name))
    if not ticket_files:
        report.error(spec_path.name, "no ticket files found, expected S<n>-<nn>.<nn>-<slug>.md next to the spec")

    spec_scenarios = gherkin_scenarios(spec_text)
    for title in {t for t in spec_scenarios if spec_scenarios.count(t) > 1}:
        report.error(spec_path.name, f"duplicate scenario title in spec: '{title}'")

    tickets = {}
    for path in ticket_files:
        text = path.read_text(encoding="utf-8")
        fields, title_key = parse_header(text)
        sections = split_sections(text)
        key = fields.get("Key", title_key or "")
        where = path.name
        ticket = {
            "path": path, "key": key, "text": text, "fields": fields, "sections": sections,
            "role": None, "deps": [], "scenarios": [], "acceptance_scenarios": [],
        }
        tickets[key] = ticket

        if not key.startswith(spec_key + "."):
            report.error(where, f"Key '{key}' does not start with the spec ID '{spec_key}.'")
        if not path.name.startswith(f"{key}-"):
            report.error(where, f"file name does not start with the key '{key}'")
        if title_key != key:
            report.error(where, f"title key '{title_key}' does not match the Key field '{key}'")

        for field, value in fields.items():
            if "<" in value and ">" in value:
                report.error(where, f"placeholder left in header field '{field}': {value}")
        for residue in TEMPLATE_RESIDUE:
            if residue in text:
                report.error(where, f"template instruction left in file: '{residue}'")

        issue = fields.get("Issue type", "")
        if issue not in ISSUE_TYPES:
            report.error(where, f"Issue type must be Story, Task or Spike at breakdown time, found '{issue}'")
        status = fields.get("Status", "")
        if status not in STATUSES:
            report.error(where, f"Status '{status}' is not one of {sorted(STATUSES)}")

        labels = fields.get("Labels", "")
        role_labels = re.findall(r"role:([a-z-]+)", labels)
        if len(role_labels) != 1:
            report.error(where, f"exactly one role:<id> label is required, found {len(role_labels)}")
            role = None
        else:
            role = role_labels[0]
            if role not in roles:
                report.error(where, f"role '{role}' is not defined in references/roles.md")
                role = None
        ticket["role"] = role
        if f"spec:{spec_key}" not in labels:
            report.error(where, f"label spec:{spec_key} is missing")

        points = fields.get("Story points", "")
        if issue == "Spike":
            if not points.startswith("N/A"):
                report.error(where, "a Spike is time-boxed, so Story points must read 'N/A: time-boxed spike, ...'")
        elif points not in {"1", "2", "3"}:
            report.error(where, f"Story points must be 1, 2 or 3 (split the ticket instead), found '{points}'")

        components = {c.strip() for c in re.split(r"[,|]", fields.get("Components", "")) if c.strip()}
        if not components or not components <= COMPONENTS:
            report.error(where, f"Components must be from {sorted(COMPONENTS)}, found '{fields.get('Components', '')}'")
        if not fields.get("Epic") or "<" in fields.get("Epic", ""):
            report.error(where, "Epic is empty or still a placeholder")

        persona_line = re.search(r"^\s*As an? (.+)$", sections.get("User story", ""), re.M)
        if not persona_line:
            report.error(where, "User story has no 'As a <persona>' line")
        elif persona_names and not any(p in persona_line.group(1).lower() for p in persona_names):
            report.error(where, f"persona in 'As a' does not match requirements ({persona_names}): '{persona_line.group(1)}'")

        acceptance = sections.get("Acceptance criteria", "")
        if "- [ ]" in acceptance:
            report.error(where, "Acceptance criteria use checkboxes; they must be Gherkin Scenarios")
        acceptance_titles = gherkin_scenarios(acceptance)
        ticket["acceptance_scenarios"] = acceptance_titles
        ticket["scenarios"] = acceptance_titles
        if not 1 <= len(acceptance_titles) <= 3:
            report.error(where, f"{len(acceptance_titles)} scenarios; a ticket needs 1 to 3 (split it)")
        for title in {t for t in acceptance_titles if acceptance_titles.count(t) > 1}:
            report.error(where, f"scenario title repeated in ticket: '{title}'")

        dod = sections.get("Definition of done", "")
        if dod.count("- [ ]") != 5:
            report.warn(where, f"Definition of done has {dod.count('- [ ]')} checkboxes, the template has 5")

        notes = sections.get("Notes", "")
        if "**Agent brief**" not in notes:
            report.error(where, "Notes has no '**Agent brief**' block")
        if role and role in roles:
            role_info = roles[role]
            paths = files_to_change(notes)
            if paths is None:
                report.error(where, "agent brief has no '**Files to change:**' line")
            elif role_info["read_only"]:
                if paths:
                    report.error(where, f"read-only role '{role}' must write 'Files to change: None (read-only)'")
            else:
                if not 1 <= len(paths) <= 5:
                    report.error(where, f"Files to change lists {len(paths)} paths; it needs 1 to 5")
                for path_text in paths:
                    normalised = path_text.replace("\\", "/")
                    if not is_owned(role_info, normalised):
                        report.error(where, f"'{normalised}' is not owned by role '{role}' (see roles.md)")
            covers = covers_titles(notes)
            if covers is None:
                if role not in BUILD_ROLE_EXEMPT_FROM_COVERS and role not in REVIEW_ROLES and role != "acceptance-author":
                    report.warn(where, "agent brief has no '**Covers scenarios:**' line")
            else:
                for title in covers:
                    if normalise_title(title) not in acceptance_titles:
                        report.error(where, f"Covers scenarios lists '{title}', which is not in this ticket's Gherkin")

        deps_text = sections.get("Dependencies", "")
        ticket["deps"] = parse_dependencies(deps_text)
        if not ticket["deps"] and "None: can start now." not in deps_text:
            report.warn(where, "Dependencies has no rows and no 'None: can start now.' line")
        for relation, cell, dep_status in ticket["deps"]:
            if relation == "is blocked by" and "Proposed" in dep_status and status != "Blocked":
                report.error(where, f"blocked by a Proposed item ('{cell}') but Status is '{status}', expected Blocked")

    keys = set(tickets)
    dependency_edges = {}
    for key, ticket in tickets.items():
        where = ticket["path"].name
        for relation, cell, dep_status in ticket["deps"]:
            ref = first_ref(cell)
            if ref is None:
                report.warn(where, f"dependency '{cell}' is not a ticket, spec or ADR reference")
                continue
            kind, value = ref
            if kind == "ticket":
                if value not in keys:
                    report.error(where, f"dependency {value} is not a ticket in this batch")
                    continue
                if relation == "is blocked by":
                    dependency_edges.setdefault(key, set()).add(value)
                    if key not in {k for r, c, _ in tickets[value]["deps"] for k in KEY_RE.findall(c) if r == "blocks"}:
                        report.error(where, f"is blocked by {value}, but {value} does not list 'blocks {key}'")
                elif relation == "blocks":
                    if key not in {k for r, c, _ in tickets[value]["deps"] for k in KEY_RE.findall(c) if r == "is blocked by"}:
                        report.error(where, f"blocks {value}, but {value} does not list 'is blocked by {key}'")
            elif kind == "spec":
                if not list(specs_dir.glob(f"{value}-*.md")):
                    report.error(where, f"dependency spec {value} has no file in {specs_dir.name}/")
            elif kind == "adr":
                if not list((root / "docs" / "adr").glob(f"{value}-*.md")):
                    report.error(where, f"dependency ADR-{value} has no file in docs/adr/")

    # Cycle check and dispatch waves (Kahn-style levels over 'is blocked by' edges).
    level = {}
    visiting = set()

    def compute(key):
        if key in level:
            return level[key]
        if key in visiting:
            report.error(key, "dependency cycle through this ticket")
            return 0
        visiting.add(key)
        level[key] = 1 + max((compute(d) for d in dependency_edges.get(key, ())), default=0)
        visiting.discard(key)
        return level[key]

    for key in tickets:
        compute(key)

    # Coverage: every spec scenario must be owned by exactly one acceptance-author ticket
    # and be turned green by at least one build ticket.
    for title in dict.fromkeys(spec_scenarios):
        acceptance_owners = [k for k, t in tickets.items()
                             if t["role"] == "acceptance-author" and title in t["acceptance_scenarios"]]
        if len(acceptance_owners) == 0:
            report.error(spec_path.name, f"scenario not in any acceptance-author ticket: '{title}'")
        elif len(acceptance_owners) > 1:
            report.error(spec_path.name, f"scenario in {len(acceptance_owners)} acceptance-author tickets: '{title}'")
        build_owners = [k for k, t in tickets.items()
                        if t["role"] not in {"acceptance-author", None} | REVIEW_ROLES
                        and title in t["acceptance_scenarios"]]
        if not build_owners:
            report.error(spec_path.name, f"no implementation ticket makes this scenario pass: '{title}'")

    # The spec's Tickets section must list exactly the ticket files.
    spec_sections = split_sections(spec_text)
    if "Tickets" not in spec_sections:
        report.error(spec_path.name, "spec has no '## Tickets' section; add the table from the breakdown")
    else:
        listed = set()
        for line in spec_sections["Tickets"].splitlines():
            if line.startswith("|") and not line.startswith("| Key") and not line.startswith("| ---"):
                first_cell = line.split("|")[1] if line.count("|") > 2 else ""
                listed.update(re.findall(r"\bS\d+-\d{2}\.\d{2}\b", first_cell))
        for key in sorted(keys - listed):
            report.error(spec_path.name, f"ticket {key} is missing from the '## Tickets' table")
        for key in sorted(listed - keys):
            report.error(spec_path.name, f"'## Tickets' lists {key}, which has no ticket file")

    print(f"Spec {spec_key}: {len(tickets)} ticket(s), {len(spec_scenarios)} scenario(s) in the spec")
    if level:
        print("Dispatch waves (tickets in one wave can run in parallel, each in its own worktree):")
        for wave in sorted(set(level.values())):
            members = sorted(k for k, v in level.items() if v == wave)
            detail = ", ".join(f"{k} [{tickets[k]['role']}]" for k in members)
            print(f"  wave {wave}: {detail}")
    for line in report.errors + report.warnings:
        print(line)
    status = "FAILED" if report.errors else "PASSED"
    print(f"Result: {status} ({len(report.errors)} error(s), {len(report.warnings)} warning(s))")
    return 1 if report.errors else 0


if __name__ == "__main__":
    sys.exit(main())
