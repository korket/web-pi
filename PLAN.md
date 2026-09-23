# Web-Pi — Codex-like Web UI for Pi

> Goal: ChatGPT Codex-like desktop/web interface powered by Pi (`pi --mode rpc`).

Location: `C:\Users\Mikansei\Documents\Web-Pi`
Pi docs: `~/.pi/agent/install/releases/.../docs/{rpc.md,rpc-commands.md,json.md,sdk.md,sessions.md}`

## 1. Architecture

```
[React WebUI / Tauri Desktop] <-- WebSocket --> [Node Gateway] <-- JSONL stdin/stdout --> pi --mode rpc (1 per session)
```

- RPC = long-lived, bidirectional, isolated. Same agent/tools/sessions as TUI.
- Do NOT re-implement agent. Do NOT use `print/json` (one-shot only).
- Reference client: `examples/rpc-client.ts` + `RpcClient` in `@earendil-works/pi-coding-agent`.
- Later wrap same web UI in Tauri/Electron for desktop with zero logic change.

## 2. Backend Gateway (Node.js, trimmed P0)

`gateway/` — uses exported `RpcClient` from `@earendil-works/pi-coding-agent`. No hand-rolled JSONL codec (LF/CRLF, U+2028/29, backpressure, fast-completion race already handled there).

- Bind `127.0.0.1` only + required token + strict CORS (no remote bind in P0). Any-site-can-drive-Pi = RCE.
- `POST /api/sessions` -> spawn ONE `pi --mode rpc --no-session --cwd <validated> --name <name>` for P0 (N processes come in P1). Validate `cwd`: normalize, resolve symlinks, prefix-match allowlist (Windows case-insensitive). Reject traversal.
- P0 RPC allowlist only: `new_session`, `get_state`, `get_messages`, `get_entries`, `prompt` (`promptAndWait`), `abort`, `clear_queue`. No fork/clone/tree/export/extension_ui yet.
- Lifecycle: subscribe before `prompt` (`promptAndWait` does this), completion = `agent_settled` (not `response.success` / `agent_end`). Esc = `clear_queue` then `abort`.
- Shutdown: `stdin.close()` → SIGKILL fallback on timeout. Cap processes, reap zombies, `pi --version` pin check at startup with clear error.
- Trace: append every command/response/event to `.pi-sessions/trace.jsonl`, rotate at ~10MB. No trace = failed run.
- Reconnect: client sends `lastEntryId`; gateway replies `get_state` + `get_messages` + `get_entries{since: cursor}` snapshot, then live events. `message_end` authoritative over buffered deltas.

### RPC mapping

| UI need | Command / Event |
|---------|-----------------|
| chat stream | `prompt` + `message_update{text_delta/thinking_delta/toolcall_*}` -> `message_end` (authoritative) |
| stop | `abort` + `clear_queue` (Esc behavior) |
| steer while running | `steer` / `follow_up`, `streamingBehavior: steer\|followUp` |
| tool cards | `tool_execution_start/update/end` keyed by `toolCallId` |
| shell | `bash` + `bash_execution_update{id}` |
| state | `get_state`, `get_messages`, `get_entries{since}`, `get_tree`, `get_session_stats`, `get_last_assistant_text` |
| sessions | `new_session`, `switch_session`, `fork`, `clone`, `set_session_name` |
| header | `get_available_models`/`set_model`, `get_available_thinking_levels`/`set_thinking_level`, `compact`, `get_commands`, `export_html` |
| dialogs | `extension_ui_request/response` (docs/rpc-extension-ui.md) |

## 3. Frontend (P0 minimal, Codex parity later)

P0 web = Vite + minimal React, no Tailwind-weight, NO xterm.js, NO Monaco. Two views + one lib:

```
web/
  components/Composer.tsx      # multiline, Enter send, abort button
  components/Transcript.tsx    # user bubbles, assistant markdown-pre, tool start/end rows
  lib/reconstruct.ts           # contentIndex delta buffer -> partial, replaced by message_end
  lib/reconstruct.test.ts      # fixtures from json.md shapes (text_delta, toolCallId, message_end)
gateway/
  pi-manager.ts  # spawn x1, cwd validation, version check, shutdown, trace writer
  ws.ts          # token auth, cursor resync, event relay (wraps RpcClient)
```

- Render `text_delta/thinking_delta` live keyed by `contentIndex`, replace with `text_end` then `message_end.message`. Tool rows keyed by `toolCallId` (plain rows in P0, cards in P1).
- Deferred to P1: sidebar, abort/steer/followUp full, tool cards, models picker, markdown rich, stats.
- Deferred to P2: xterm.js terminal, Monaco diff, images, `/commands` palette, tree/fork/clone, compact view, thinking view, cost/context footer, export_html.
- Deferred to P3: Tauri wrapper, open-in-editor, notifications, extension_ui dialogs.

## 4. Security (sandbox + approvals, Codex model)

Pi tools run as Pi process, no sandbox by default (see security.md).
Gateway must enforce both layers:

- Sandbox (CAN): localhost only, allowlisted `cwd` root (e.g. `~/projects`), no arbitrary path, auth token. `network_access=false` default — enable per-domain explicitly, never globally for agent phase.
- Approvals (ASK): destructive `bash` / file writes / outside-workspace edits / network / MCP tools with side effects = explicit UI approval. Read-only chat/plan needs no approval. Destructive always pauses for human, even if sandbox would allow it.
- Review `export/share` (contains secrets/file contents) before rendering.
- Remote/multi-user: one container per workspace (containerization.md), secrets setup-phase only, kill on disconnect.
- Non-goals P0-P1: no MCP, no subagents. Memories = AGENTS.md update loop only.

## 5. Phases (trimmed)

- P0 (1-2d): gateway on `RpcClient` (127.0.0.1 + token + allowlist + trace rotation, 1 process) + minimal web (Composer + Transcript-pre + reconstruct + unit tests). RPC allowlist only. Non-goals: no images, no model/thinking switch, no steer/followUp (abort only), no extension_ui, no multi-session, no xterm/Monaco. Done = smoke + typecheck + reconstruct tests + `/review` with `path:line` cites + trace entry + reconnect-resync demo.
- P1 (1wk): N processes, sidebar/history, full abort/steer/followUp, tool cards, model picker, markdown rich, stats, eval checklist.
- P2 (1wk): images, `/commands`, tree/fork/clone, compact, thinking view, cost/context footer, export_html, xterm.js + Monaco.
- P3 (3d): Tauri wrapper, open-in-editor, notifications, extension_ui dialogs.
- P4: remote auth, containers, multi-workspace, MCP/subagents revisit, session JSONL persistence hardening.

## 6. Next step

Scaffold P0: `npm init -y`, `RpcClient` dep, `gateway/pi-manager.ts` + `ws.ts`, minimal `web/` + `reconstruct.test.ts`, `pi --mode rpc --no-session` smoke. Then `/review`.
