# Web-Pi Workflow — OpenAI + Anthropic distilled for Pi

Synthesized from OpenAI `Building Agents` track, Codex `AGENTS.md / Skills / Approvals`, OpenAI `Memory+Compaction` cookbook, Anthropic `Building Effective Agents` + `Prompting Best Practices`. Adapted to Pi RPC.

## 1. Definition
Agent = instructions (should do) + guardrails (should NOT do) + tools (can do) + memory.
If it only answers, it's a chatbot. If it acts on systems via tools, it's an agent.
Web-Pi itself is NOT a new agent — it's a UI over the Pi agent.

## 2. Choose the right pattern (Anthropic spectrum)
Use the SIMPLEST that works. Don't add scaffolding until measured.

1. **Augmented LLM** — prompt + tools + retrieval. Covers 80% (chat, file read/edit, bash).
2. **Workflow** (deterministic path):
   - `prompt chaining` — plan → implement → review, each step gated.
   - `routing` — skill/command router (`/skill:name`, `/review`) decides path.
   - `parallelization` — independent tool calls in one block (respect Pi parallel tool calls).
   - `orchestrator-workers` — gateway fans out, Pi runs subtasks (P4 only).
   - `evaluator-optimizer` — implement → `review` → fix loop (max N iterations).
3. **Autonomous agent** — open-ended Pi run with `abort/steer` human control. Use only with approvals + sandbox.

Web-Pi P0-P1 = (1) + chaining + routing only.

## 3. OpenAI primitives mapping
| OpenAI | Pi / Web-Pi |
|---|---|
| models (reasoning vs fast) | `get_available_models`/`set_model`, `set_thinking_level`. Fast for chat, reasoning for plan/code. Don't just swap model — re-prompt. |
| tools | Pi tools via `tool_execution_*`. Truncate large results, point to full log path. |
| state/memory | Session JSONL tree + `get_entries{since}` + `SessionManager`. Compaction summary carries forward state; memory carries lessons across runs. |
| orchestration | Gateway owns loop: `prompt` → stream `message_update` → `agent_settled`. `steer` interrupts current turn, `follow_up` queues after. |
| guardrails | Allowlisted `cwd`, approval before destructive bash, input filters, `clear_queue`+`abort` for Esc. Default network-off mindset (Codex) — enable explicitly. |

## 4. Context engineering (the main job)
- **Progressive disclosure:** system prompt gets `name+description+path` only. Full `SKILL.md` loads on selection. Codex budgets ~2%/8k chars for skill list — keep descriptions tight: what + when.
- **Ground in files:** prefer `get_messages`/`get_entries` + tool `details` over re-asking model.
- **Reconstruct correctly:** buffer `text_delta/thinking_delta` by `contentIndex` for live view, replace with `text_end`/`message_end.message` (authoritative). `usage` may be 0 until done.
- **Compact, don't drop:** manual `compact` + auto-compaction. Summary + `firstKeptEntryId` + `tokensBefore/After`. Post-compaction tokens null until next response — expected.
- **Branch, don't overwrite:** `/tree` to move, `/fork` for separate work, `/clone` for copy. Abandoned branches summarized, not deleted.

## 5. Instructions that work (Anthropic + Codex)
- Be the new-employee test: if a colleague with minimal context would be confused, Pi will be too. Clear, direct, explicit > vague.
- Layer: global `~/.pi/agent/AGENTS.md` (tone, prefs) → repo `AGENTS.md` (build/test, conventions) → subdir files (closest wins). Skip empties, cap ~32KiB.
- Codify recurring feedback into `AGENTS.md` / skill, pair with linter/typecheck/pre-commit so rules enforce themselves.
- Skills need: `name` (kebab, ≤64), `description` (what + when, ≤1024), scripts relative to skill dir, `allowed-tools`/`disable-model-invocation` when needed.

## 6. Safety (Codex approvals model)
Two layers: **sandbox** (what it CAN touch) + **approvals** (when it must ASK).
- v1: `read-only`-like default. Destructive `bash`/file writes require explicit user action in UI.
- Never trust project `.pi/` blindly — review skills/prompts/extensions before trust (they run as Pi process).
- `export_html/share` may leak prompts, file contents, outputs — review before render/upload.
- Remote/multi-user later: container per workspace, kill on disconnect, secrets never in transcript.

## 7. Reliability loop (trace → eval → fix)
From OpenAI improvement-loop + memory cookbook:
1. Human reviews memo/diff (memo is source of truth, cite evidence as `path:line`, preserve uncertainty — don't flatten to false confidence).
2. Turn feedback into repeatable check (`/review` prompt or eval script). Focused evals per goal, not one giant score.
3. Fix `AGENTS.md`/skill/prompt, re-run.
4. Memory: current run uses compaction; future runs reuse lessons via updated skill/AGENTS.md — don't replay full history.
5. Trace everything: gateway appends every RPC record (commands, responses, events) to `.pi-sessions/trace.jsonl`. No trace = no debug. Review trace when a run misbehaves before changing prompts.

## 8. Dev loop for this repo
```
plan (/plan) → implement (small diff) → typecheck + rpc smoke → review (/review) → update AGENTS.md if correction → compact when long
```
- One phase at a time (P0 → P1 → P2). Ask before new deps.
- Prefer `RpcClient.promptAndWait()` (subscribes before prompt, avoids fast-completion race). Separate calls: subscribe → `prompt()` → `waitForIdle()` only while streaming.
- Extension UI: `tui` has full UI; RPC forwards dialogs/notifications only, no custom components. Guard with `ctx.mode`/`hasUI`.
