---
description: Stage and commit one atomic change, Linus style (WHY not WHAT)
argument-hint: "[area]"
---
<instructions>
Commit ONE important logical change per COMMIT.md + .gitmessage. Use tools to stage and commit — do not just output a message.
Trivial/WIP hunks stay in the working tree. Never push.
</instructions>
<context>
`git status --short` and `git diff` output go here — long data first.
Area: ${1:-this area}
</context>
<input>
1. `git status --short`, `git add -p` (hunk-by-hunk), `git diff --check`.
2. Reject if mixed (refactor+feature+whitespace) or vague (fix stuff/WIP). Split first.
3. Subject: `area: imperative + what`, <=50 chars, no period.
4. Body: WHY — problem → why this approach → impact/risks. 72-col wrap.
5. Verify: typecheck + `pi --mode rpc --no-session` smoke; append RPC trace to `.pi-sessions/trace.jsonl` when applicable.
6. `git commit` locally (AUTO-RUN for important changes only), then `git log --oneline -3`.
7. NEVER `git push`. After commit, ask: "Committed <sha> <subject> — want me to push?" and stop.
Args: ${@:-atomic change}
</input>
<examples>
<example>
Input: /commit gateway
Output: stages gateway/protocol.ts LF-fix hunk only, commits "gateway: strip CR on LF split", skips unrelated web hunk, asks "Committed a1b2c3d gateway: strip CR on LF split — want me to push?"
</example>
</examples>
