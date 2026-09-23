# Web-Pi — AGENTS.md

> Project guidance for humans + Pi. Keep small. Codex/Pi load this before work.
> Global prefs live in `~/.pi/agent/AGENTS.md`. This file = repo rules only.

## What this is
Codex-like web/desktop UI for Pi, backed by `pi --mode rpc`.
Plan: `PLAN.md`. Workflow: `WORKFLOW.md`. Sources: `SOURCES.md`.

## Working agreements
- `PLAN.md` is source of truth for scope. Don't expand scope without updating it.
- P0 first: gateway + minimal chat. No Tauri, no auth, no multi-user until P1 done.
- Backend: Node 22+, TypeScript. Frontend: Vite + React + Tailwind.
- Never re-implement agent logic — use RPC (`prompt/get_state/get_messages/agent_settled`), `RpcClient` as reference.
- JSONL framing: split stdout ONLY on LF `\n`, strip `\r`. Never use `readline`. `stderr` = logs.
- Completion = `agent_settled`, not `response.success` or `agent_end`.
- Verify with: `pi --mode rpc --no-session` smoke test + `npm run typecheck` (when scaffolded).

## Repo layout
```
PLAN.md WORKFLOW.md AGENTS.md COMMIT.md SOURCES.md README.md
.gitmessage (commit template)
.pi/settings.json
.pi/skills/web-pi-dev/SKILL.md
.pi/prompts/plan.md .pi/prompts/review.md .pi/prompts/commit.md
gateway/ web/  (scaffold in P0)
```

## Commits — Linus way (see COMMIT.md, template .gitmessage)
- Atomic: one logical change per commit. Each commit builds + passes smoke/typecheck (bisectable).
- Subject: `area: imperative verb + what`, <=50 chars, no period, no WIP/fix/update fluff.
- Body: blank line, WHY not WHAT — problem → solution → impact/side-effects. Wrap 72 cols.
- Never mix refactor + feature + whitespace. Split it. Squash garbage/oops before push.
- Bad: `fix stuff`, `WIP`, `update`. Good: `gateway: queue prompt behind active run`.
- Agent policy: AUTO-COMMIT locally after each logical change (`git add -p` → `diff --check` → `/commit`). NEVER `push` unless user explicitly says "push". After every auto-commit, ask: "Committed <sha> <subject> — want me to push?" and stop.

## Pi conventions (this repo)
- Skills: `SKILL.md` with `name` + `description` (what + when). Progressive disclosure — details stay out of context until needed.
- Prompts: `/plan`, `/review` from `.pi/prompts/*.md`. Args via `$1`, `$@`, `${1:-default}`.
- Sessions: persistent JSONL, tree + branches. Use `get_entries{since}` cursor, `get_tree` for branches, `fork/clone` for alternatives. Compact, don't delete.
- Security: Pi tools run as Pi process, no sandbox by default. Localhost only, allowlisted `cwd`. Review `export/share` output (may contain secrets).

## When you correct Pi, update this file
Repeated mistake → add rule. Wrong files read → add routing. Same review feedback twice → codify it.
