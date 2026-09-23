---
description: Plan next Web-Pi phase with OpenAI+Anthropic workflow (simple, grounded, gated)
argument-hint: "[phase]"
---
<instructions>
Plan Web-Pi ${1:-P0} per PLAN.md + WORKFLOW.md. Use tools to implement the plan — do not just suggest steps.
Keep the diff small. Simplest pattern first (augmented LLM / chaining / routing before orchestrator-workers).
Long data (PLAN, trace excerpts) goes at the top; your questions and output go last.
After progress, give a 2-line user-facing summary of what changed.
</instructions>
<context>
Phase: ${1:-P0}
Detail: ${@:-P0 gateway + minimal chat}
Relevant docs: PLAN.md §2+§5, WORKFLOW.md §2+§8, .pi-sessions/trace.jsonl (if present)
</context>
<input>
1. State goal + non-goals (P0-P1: no MCP, no subagents).
2. List RPC commands/events needed (prompt, get_state, get_messages, agent_settled, etc.).
3. List guardrails (allowlisted cwd, network_access=false, approvals for destructive ops).
4. Define done: smoke (`pi --mode rpc --no-session`) + typecheck + `/review` with `path:line` cites + trace record.
5. If a correction recurs, update AGENTS.md.
</input>
<examples>
<example>
Input: /plan P0
Output: Goal: ws gateway + minimal chat. Non-goals: no MCP/subagents/auth. RPC: prompt/get_state/agent_settled. Guardrails: allowlist cwd, network off. Done: smoke + typecheck + trace.jsonl entry.
</example>
</examples>
