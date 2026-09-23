---
description: Plan next Web-Pi phase with OpenAI+Anthropic workflow (simple, grounded, gated)
argument-hint: "[phase]"
---
Plan Web-Pi ${1:-P0} per PLAN.md + WORKFLOW.md.

1. State goal + non-goals (simplest pattern: augmented LLM / chaining / routing first).
2. List RPC commands/events needed (prompt, get_state, get_messages, agent_settled, etc.).
3. List guardrails (allowlist cwd, approvals for destructive ops).
4. Define done: smoke test (`pi --mode rpc --no-session`) + typecheck + review.
5. Keep diff small. Update AGENTS.md if a correction recurs.

Context: ${@:-P0 gateway + minimal chat}
