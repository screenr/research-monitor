---
name: research-monitor
description: Use when setting up, running, or improving recurring external research monitors for companies, industries, markets, competitors, technologies, or signals across Codex, Claude, CLI, CI, or hosted agent harnesses.
---

# Research Monitor

Use this skill to turn an industry watch brief into repeatable research runs with durable state, deterministic validation, editable prompts, and harness-specific scheduling adapters.

## Workflow

1. Locate or create a watch workspace in the target project.
2. Run `research-monitor validate --watchlist <path>` before asking an LLM to interpret the config.
3. Run `research-monitor extract-context --watchlist <path>` and feed the JSON output to the model instead of making it parse the full watchlist.
4. Render the run prompt with `research-monitor plan-scan --watchlist <path> --prompt <prompt-path>`.
5. Perform external research, cite sources, and write only high-signal output to repo journals.
6. Validate journals and suggested updates before treating them as durable research output.
7. Store noisy run logs, rejected candidates, and crawl/search traces in local SQLite with `db`, `run-log`, and `eval-tuple` commands.
8. Propose watchlist updates as explicit JSON patches or suggested-update files; do not silently rewrite strategy unless the user asked for autonomous updates.

## Harness Adapters

Use the adapter boundary in `references/harness-adapters.md` when mapping this skill to Codex Automations, Claude Routines, GitHub Actions, cron, or hosted agent products. Keep scheduling, execution, state, and notification concerns separate.

## Failure Capture

When the user says the monitor missed something, produced noise, used the wrong granularity, or otherwise failed, offer to capture an eval tuple. Use `references/eval-improvement-loop.md` and write a pending case under `evals/pending/` or to the configured eval registry service.

## Commands

Run commands through Bun while developing:

```bash
bun run src/cli.ts validate --watchlist watchlist.json
bun run src/cli.ts extract-context --watchlist watchlist.json
bun run src/cli.ts plan-scan --watchlist watchlist.json --prompt prompts/weekly-scan.md
bun run src/cli.ts init --watch-root watch
bun run src/cli.ts validate-journal --journal watch/journals/2026-06-18.md
bun run src/cli.ts validate-suggested-update --file watch/suggested-updates/example.json
bun run src/cli.ts automation-spec codex --watch-root watch --cwd "$PWD" --schedule weekly-monday-0900 --execution worktree --model gpt-5.4 --reasoning-effort medium
```

After compiling, use `bin/research-monitor` with the same arguments.
