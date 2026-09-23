---
description: Review staged changes for correctness, security, RPC protocol compliance
argument-hint: "[focus]"
---
Review staged changes. Focus on ${1:-correctness, security, and RPC protocol compliance}.

Checklist:
- JSONL LF-only framing, id correlation, agent_settled completion, no readline.
- No re-implemented agent logic; tools truncated with full-log path.
- Guardrails: allowlist cwd, approvals for destructive ops, no secrets in transcript.
- Small diff, typecheck passes. Recurring feedback → propose AGENTS.md update.

Args: ${@:-correctness, security, error handling}
