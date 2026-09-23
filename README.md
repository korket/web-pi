# Web-Pi

Codex-like web/desktop UI for Pi, backed by `pi --mode rpc`.

## Docs
- `PLAN.md` — architecture + phases (source of truth for scope)
- `WORKFLOW.md` — OpenAI + Anthropic agentic workflow distilled for Pi
- `AGENTS.md` — repo working agreements (loaded by Pi/Codex before work)
- `SOURCES.md` — which upstream docs were read
- `.pi/skills/web-pi-dev/SKILL.md` — dev skill (`/skill:web-pi-dev`)
- `.pi/prompts/plan.md`, `.pi/prompts/review.md` — `/plan`, `/review`

## Quickstart (once P0 scaffolded)
```bash
cd "C:\Users\Mikansei\Documents\Web-Pi"
pi --mode rpc --no-session   # smoke test
npm run typecheck
```

## Workflow
`/plan P0` → implement small diff → smoke + typecheck → `/review` → codify recurring fixes in `AGENTS.md`.
