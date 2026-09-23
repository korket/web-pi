# Web-Pi

Codex-like web/desktop UI for Pi, backed by `pi --mode rpc`.

## Docs
- `PLAN.md` — architecture + phases (source of truth for scope)
- `WORKFLOW.md` — OpenAI + Anthropic agentic workflow distilled for Pi
- `AGENTS.md` — repo working agreements (loaded by Pi/Codex before work)
- `SOURCES.md` — which upstream docs were read
- `.pi/skills/web-pi-dev/SKILL.md` — dev skill (`/skill:web-pi-dev`)
- `.pi/prompts/plan.md`, `.pi/prompts/review.md` — `/plan`, `/review`

## Quickstart
```bash
cd "C:\Users\Mikansei\Documents\Web-Pi"
npm install
npm run smoke        # pi --mode rpc get_state round-trip
npm test             # validate + reconstruct unit tests
npm run typecheck
npm run e2e          # boot gateway, WS create + resync + allowlist + trace
npm run dev:gateway  # ws://127.0.0.1:7717, prints token (WEBPI_TOKEN to pin)
npm run dev:web      # http://localhost:5173, paste token, New session, chat
```

## Workflow
`/plan P0` → implement small diff → smoke + typecheck → `/review` → codify recurring fixes in `AGENTS.md`.
