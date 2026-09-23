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

## 2. Backend Gateway (Node.js)

`gateway/`

- `POST /api/sessions` -> spawn: `pi --mode rpc --session-dir <allowed> --cwd <project> --name <name>`
- Manage N processes, correlate by `id`: `{"id":"req-1","type":"get_state"}`
- JSONL framing: split stdout ONLY on LF `\n`, strip `\r`, never use `readline` (breaks on U+2028/29). Read continuously, honor backpressure. stderr = logs only.
- Lifecycle: subscribe before `prompt`, wait for `agent_settled` (not just `response.success` or `agent_end`).
- Shutdown: `stdin.close()`.

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

## 3. Frontend (Codex parity)

Stack: Vite + React + Tailwind + xterm.js + Monaco diff + react-markdown.

- Left: session list/search/rename/delete, cwd/project picker (`sessionFile/sessionId/sessionName/messageCount`).
- Center: streaming transcript — user bubbles, assistant markdown, collapsible thinking, tool cards, queue badges (`steering/followUp`). Buffer `delta` live, replace with `message_end.message`.
- Composer: multiline, Enter send / Alt+Enter follow-up, images (`ImageContent{data,mimeType}`), `/` palette, model/thinking dropdown, context % bar.
- Right: Diff/Files (tool `details`), Terminal (bash stream), Stats (tokens/cost/contextUsage), Tree/Branches (fork/clone).

```
web/
  components/SessionSidebar.tsx
  components/Transcript.tsx
  components/ToolCard.tsx
  components/Composer.tsx
  components/Inspectors.tsx
  lib/reconstruct.ts  # contentIndex + delta buffer -> partial
gateway/
  pi-manager.ts  # spawn/track
  protocol.ts    # LF codec, id map, waitForIdle
  ws.ts          # session.subscribe -> socket
```

## 4. Security (sandbox + approvals, Codex model)

Pi tools run as Pi process, no sandbox by default (see security.md).
Gateway must enforce both layers:

- Sandbox (CAN): localhost only, allowlisted `cwd` root (e.g. `~/projects`), no arbitrary path, auth token. `network_access=false` default — enable per-domain explicitly, never globally for agent phase.
- Approvals (ASK): destructive `bash` / file writes / outside-workspace edits / network / MCP tools with side effects = explicit UI approval. Read-only chat/plan needs no approval. Destructive always pauses for human, even if sandbox would allow it.
- Review `export/share` (contains secrets/file contents) before rendering.
- Remote/multi-user: one container per workspace (containerization.md), secrets setup-phase only, kill on disconnect.
- Non-goals P0-P1: no MCP, no subagents. Memories = AGENTS.md update loop only.

## 5. Phases

- P0 (1-2d): Node ws server + spawn rpc, React chat `promptAndWait` + `text_delta` -> `agent_settled`.
- P1 (1wk): sidebar, history, abort/steer/followUp, tool cards, models, markdown.
- P2 (1wk): images, `/commands`, tree/fork/clone, compact, thinking view, cost/context footer, export_html.
- P3 (3d): Tauri wrapper, open-in-editor, notifications, extension_ui dialogs.
- P4: auth, allowlist, containers, multi-workspace, session JSONL persistence (session-format.md, message-types.md).

## 6. Next step

Scaffold P0: `gateway/` + `web/` in this folder, `npm init`, `pi --mode rpc --no-session` smoke test.
