---
description: Stage and commit one atomic change, Linus style (WHY not WHAT)
argument-hint: "[area]"
---
Commit ONE logical change in ${1:-this area} per COMMIT.md + .gitmessage.

1. `git status --short`, `git add -p` (hunk-by-hunk), `git diff --check`.
2. Reject if mixed (refactor+feature+whitespace) or vague (fix stuff/WIP). Split first.
3. Subject: `area: imperative + what`, <=50 chars, no period.
4. Body: WHY — problem → why this approach → impact/risks. 72-col wrap.
5. Verify each commit builds: typecheck + `pi --mode rpc --no-session` smoke.
6. `git commit` locally (template applies, AUTO-RUN — no ask needed), then `git log --oneline -3`.
7. NEVER `git push`. After commit, ask: "Committed <sha> <subject> — want me to push?" and stop.

Args: ${@:-atomic change}
