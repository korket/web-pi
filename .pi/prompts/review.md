---
description: Review staged changes for correctness, security, RPC protocol compliance
argument-hint: "[focus]"
---
<instructions>
Review staged changes with `git diff --cached`. Use tools to inspect files — do not just suggest fixes.
Cite every finding as `path:line`. Preserve uncertainty: flag unknowns instead of guessing.
Finish with a 2-line user-facing summary plus explicit approval state (approve / request changes).
</instructions>
<context>
Staged diff (`git diff --cached`) and trace (`.pi-sessions/trace.jsonl`, if present) go here — long data first.
Focus: ${1:-correctness, security, and RPC protocol compliance}
</context>
<input>
Checklist:
- JSONL LF-only framing, id correlation, agent_settled completion, no readline.
- No re-implemented agent logic; large tool results truncated with full-log path.
- Guardrails: allowlisted cwd, network_access=false default, explicit approval for destructive bash/writes/network/MCP, no secrets in transcript.
- Small atomic diff, typecheck + smoke pass. Recurring feedback → propose AGENTS.md update.
Args: ${@:-correctness, security, error handling}
</input>
<examples>
<example>
Input: /review
Output: gateway/protocol.ts:42 — LF split missing CR strip, breaks on CRLF. web/Transcript.tsx:18 — renders message_end correctly. Verdict: request changes (fix protocol.ts, add trace.jsonl entry).
</example>
</examples>
