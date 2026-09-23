# Commit Convention — Linus Torvalds way

> From Linux kernel `SubmittingPatches` + Linus rants, adapted for Web-Pi.
> Goal: history is documentation. Each commit reviewable, bisectable, revertable.

## 1. Atomic commits
- One logical change = one commit. If you can't describe it in one subject line, split it.
- NEVER mix in one commit: feature + refactor + cleanup + whitespace + unrelated fix.
- Order: cleanup → refactor → feature. Refactor must be behavior-preserving, feature adds behavior.
- Each commit must build + pass `typecheck` + RPC smoke. `git bisect` must land on a working tree.
- No `WIP`, `oops`, `fixup!` in history pushed/shared. Squash locally with `git rebase -i` first.

## 2. Message format
```
area: imperative short description (<=50 chars, no period)

Body explaining WHY, not WHAT. Problem context, why this approach,
alternatives rejected, side effects. Wrap at 72 cols.

(optional) Tested: <smoke + typecheck commands + result>
```

Rules:
- Subject: `area:` prefix = `gateway`, `web`, `docs`, `pi`, `build`. Imperative: `add`, `fix`, `split`, `remove`, `handle` — not `added/fixes/updates`.
- Good: `gateway: queue prompt behind active run`
- Bad: `fix stuff`, `update code`, `WIP gateway`, `gateway: fixed things.`
- Body answers: What problem? Why this fix (not another)? What breaks/risks? The diff shows WHAT — don't repeat it.
- Keep subject <=50, hard max 72. Body lines <=72.
- One blank line between subject/body/footer. No trailing period in subject.

Example:
```
gateway: serialize prompt while agent streams

Prompt arriving mid-run raced waitForIdle and dropped fast
completions. Subscribe before prompt, then route via steer/
followUp so agent_settled stays authoritative.

Tested: pi --mode rpc --no-session smoke + npm run typecheck
```

## 3. Taste (Linus)
- Good taste = eliminate special cases. If code needs `if/else` for one quirk, restructure data so quirk disappears.
- Functions do one thing, < ~50 lines, names say what they do. No clever tricks.
- Data structures first — dumb code operating on clean data beats clever code.
- Delete dead code outright. Don't comment it out, don't keep `old_` fallbacks.

## 4. Review brutality (applied kindly here)
- Review code, not person. `This is wrong because X` > `LGTM`.
- No excuses in messages (`sorry, quick hack`). If it's a hack, say WHY it's safe/temporary and what follows.
- NAK whitespace-only churn inside functional diffs. NAK drive-by unrelated fixes.
- Author must defend every line: `git add -p` + read full `git diff --check` before commit.

## 5. Commands + push policy
```bash
git add -p                    # stage hunk-by-hunk
git diff --check              # no whitespace errors
git status --short
git commit                    # uses .gitmessage template, AUTO-RUN locally
git log --oneline -10
git rebase -i main            # squash/cleanup before share
```

- Agent AUTO-COMMITS locally after each important logical change only (done task, green checkpoint, docs/policy change). Not every hunk — batch trivial/WIP in working tree; if a revert would not matter, don't commit yet.
- Agent NEVER runs `git push` unless user explicitly says `push`. No `--force`, no push on commit.
- After every auto-commit, agent must ask: `Committed <sha> <subject> — want me to push?` and wait.

Template active via: `git config commit.template .gitmessage`
