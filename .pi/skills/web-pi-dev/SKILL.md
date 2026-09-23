---
name: web-pi-dev
description: Develop the Web-Pi gateway and web UI over Pi RPC. Use when planning, implementing, reviewing, or debugging gateway/ws/React code in this repo.
---

# Web-Pi dev skill

## Stack
Node 22+, TypeScript, Vite + React + Tailwind (web), `pi --mode rpc` backend.

## RPC rules (never guess)
- Spawn: `pi --mode rpc --no-session` (add `--cwd`, `--name`, `--session-dir` as needed).
- JSONL: one object per line, LF `\n` only. Never use `readline` (splits U+2028/29).
- Correlate by `id`. Events usually have no id (except `bash_execution_update`).
- `prompt` success = accepted, NOT done. Stream until `agent_settled` (not `agent_end`).
- Subscribe before `prompt`. `waitForIdle()` only while streaming.
- Esc behavior: `clear_queue` before `abort`, restore text in editor.
- Read full output from events; `response.data.output` may be truncated (`fullOutputPath`).

## Reconstruct stream
- Key by `contentIndex`. Buffer `text_delta`/`thinking_delta`/`toolcall_delta` live.
- Replace with `text_end`/`thinking_end`/`toolcall_end`, then `message_end.message` (authoritative).
- `tool_execution_start/update/end` keyed by `toolCallId`.

## Guardrails
- Localhost only, allowlisted cwd. Confirm destructive bash/file writes.
- Review unfamiliar `.pi/` content before trust. `export/share` may contain secrets.
- Git: AUTO-COMMIT locally after each important logical change only (not every edit). NEVER push unless user says "push". After commit, ask if they want to push.

## References
See `PLAN.md`, `WORKFLOW.md`, Pi docs `rpc.md` / `rpc-commands.md` / `json.md` / `message-types.md`.
Run scripts relative to this skill directory.
