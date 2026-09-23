# Sources — Agentic Engineering (read 2026-09-23)

Fetched as Markdown via curl (append `.md` / `llms.txt` pattern). Full bodies in `/tmp/agentic-docs/` during session; key takeaways distilled into `WORKFLOW.md`.

## OpenAI
- Building Agents track — `https://developers.openai.com/tracks/building-agents.md`
  Core concepts (reasoning vs fast models), Responses API vs Agents SDK, tools, orchestration (multi-step, handoffs, guardrails), best practices.
- Agents overview — `https://platform.openai.com/docs/guides/agents.md`
  Runtime chooser: Agents API (Codex harness) / Agents SDK (own loop) / Responses API (direct) / ChatKit.
- Codex index — `https://developers.openai.com/codex/llms.txt`
  Map to AGENTS.md, approvals, skills, config, app-server, SDK.
- Custom instructions with AGENTS.md — `https://learn.chatgpt.com/docs/agent-configuration/agents-md.md`
  Discovery precedence (global → project root→cwd, closest wins), 32 KiB cap, verify via ask-for-approval never.
- Agent approvals & security — `https://learn.chatgpt.com/docs/agent-approvals-security.md`
  Sandbox + approvals two layers, retired `untrusted`, read-only + on-request pattern.
- Build skills — `https://learn.chatgpt.com/docs/build-skills.md`
  SKILL.md + scripts, progressive disclosure, 2%/8000-char skill-list budget.
- Customization overview — `https://learn.chatgpt.com/docs/customization/overview.md`
  AGENTS.md + memories + skills + MCP + subagents are complementary.
- Building Reliable Agents with Memory and Compaction — cookbook `building_reliable_agents_memory_compaction.md`
  Compaction continues current run, memory improves future runs, memo = human-reviewed truth.
- Prompt engineering — `https://platform.openai.com/docs/guides/prompt-engineering.md`

## Anthropic
- Building Effective Agents — `https://www.anthropic.com/engineering/building-effective-agents`
  Augmented LLM → workflows (chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer) → agents. Simplicity, transparency, ACI design.
- Prompting Best Practices — `https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices.md`
  Be clear/direct (new-employee test), XML structure, examples, thinking calibration, tool-use triggering.

## Pi (local, versioned)
- `~/.pi/agent/install/releases/0.87.1/.../docs/`
  `configuration.md` (agent-dir + project `.pi/` + context files), `skills.md` (Agent Skills spec), `prompt-templates.md` (`/commands`), `extensions.md` (tools/commands/events lifecycle), `rpc.md` + `rpc-commands.md` + `json.md` (JSONL LF-only framing, `agent_settled`), `sessions.md` + `session-format.md` + `message-types.md`, `sdk.md` + `cli-integration.md`, `security.md`, `containerization.md`.
