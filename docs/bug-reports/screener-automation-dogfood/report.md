# Screener Automation Dogfood Bug Report

Date: 2026-06-18

Branch: `bug-report/screener-automation-dogfood`

Source context:

- Parent repo: `/Users/e/.codex/worktrees/3475/vhs`
- Skill submodule: `/Users/e/.codex/worktrees/3475/vhs/.claude/skills/research-monitor`
- Parent dogfood issue file: `docs/competitive-research/supademo-20-tools/watch/research-monitor-dogfood-issues.md`
- Parent watchlist: `docs/competitive-research/supademo-20-tools/watch/watchlist.json`
- Parent Codex automation prompt: `docs/competitive-research/supademo-20-tools/watch/codex-automation-prompt.md`
- Codex automation id: `screener-demo-market-research-monitor`

## Situation

The Research Monitor skill was dogfooded while setting up a weekly Codex automation for Screener's competitive research on interactive demo automation, AI demo agents, and demo sandboxes.

The setup succeeded, but it exposed several failures and configuration challenges. Some are inside the skill or CLI. Others came from Codex automation behavior, but the skill should still encode them because a future agent using this skill will hit the same edges.

## Required Fix Discipline

Every issue below MUST be fixed with strict TDD using Bun's native test runner.

For every failure or configuration challenge:

1. Write a failing Bun test first under `test/`.
2. Run the specific Bun test and verify it fails for the expected reason.
3. Implement the smallest change that makes the test pass.
4. Run the same Bun test and verify it passes.
5. Run the full `bun test` suite.
6. Refactor only after green.
7. Preserve the red/green evidence in the final implementation notes.

Do not merge or mark any issue fixed without a test that failed before the fix. Tests written after implementation do not count.

## Issues

### RM-DOGFOOD-001: Top-level help flag fails

Observed:

```bash
.claude/skills/research-monitor/bin/research-monitor --help
```

returned:

```text
unknown command: --help
```

Expected:

- `research-monitor --help`
- `research-monitor -h`
- `research-monitor help`

should all print the same help text and exit 0.

Required Bun test:

- Add a CLI test that runs the command with `--help`, `-h`, and `help`.
- Verify status 0.
- Verify stdout includes `Commands:`.
- Verify stderr is empty.
- Watch this test fail before changing `src/cli.ts`.

### RM-DOGFOOD-002: Compact context drops fields needed for research judgment

Observed:

`extract-context` omitted:

- `company.status`
- `company.urls`
- `company.notes`
- `discovery.candidate_threshold`

This made unresolved candidates such as Free3 and Hobbes less legible to the LLM and removed the threshold for adding new candidates.

Expected:

The compact context should remain compact but include the fields necessary for research judgment:

- `status`, at least for candidates and unresolved entries;
- `urls`, at least when present;
- `notes`, at least when present;
- `discovery.candidate_threshold`, when present.

Required Bun test:

- Add a fixture with one `active` company, one `candidate` company with `notes`, URLs, and a `candidate_threshold`.
- Verify `extract-context` includes all required fields.
- Verify archived companies remain excluded.
- Watch this test fail before changing `toCompactContext`.

### RM-DOGFOOD-003: No SQLite or run-log command despite workflow guidance

Observed:

`SKILL.md` says to store noisy run logs, rejected candidates, and crawl/search traces in local SQLite or another non-repo state adapter, but the CLI has no `db`, `run-log`, or equivalent command.

Expected:

The CLI should either:

- provide deterministic local SQLite/run-log commands, or
- stop instructing agents to rely on a missing tool and document a concrete fallback.

Required Bun test:

- First write tests for the intended command surface, for example `db init`, `run-log append`, and `run-log list --json`, or for a documented no-DB fallback.
- Verify the command creates only local/noisy state and does not write high-noise logs into repo journal directories.
- Watch tests fail before implementing or changing documentation.

### RM-DOGFOOD-004: No validation for journals or suggested updates

Observed:

The skill workflow asks agents to write journals and suggested watchlist updates, but `validate` only checks `watchlist.json`.

Expected:

The CLI should validate:

- journal structure, including required headings;
- suggested update files, preferably as explicit JSON patch/proposal records;
- basic source-link requirements where practical.

Required Bun test:

- Add tests for `validate-journal --journal <path>` with valid and invalid journal fixtures.
- Add tests for `validate-suggested-update --file <path>` with valid and invalid suggested-update fixtures.
- Watch invalid fixtures fail for precise error messages before implementing validators.

### RM-DOGFOOD-005: No init command for workspace layout

Observed:

Setting up the Screener monitor required manual creation of:

- `watch/watchlist.json`
- `watch/journals/`
- `watch/suggested-updates/`
- dogfood issue file
- Codex automation wrapper prompt

Expected:

`research-monitor init` should create the standard watch workspace layout from templates, without overwriting existing files unless explicitly requested.

Required Bun test:

- Add `init` tests in a temporary workspace.
- Verify the expected files and directories are created.
- Verify existing files are not overwritten by default.
- Verify a force flag, if added, is explicit and tested.
- Watch tests fail before implementing `init`.

### RM-DOGFOOD-006: No Codex automation prompt template

Observed:

`prompts/weekly-scan.md` describes the research task, but there is no Codex-specific automation wrapper prompt explaining how to invoke the skill binary, where to write journals, where to write suggested updates, and where to append dogfood issues.

Expected:

The skill should include a Codex automation wrapper template or a command that renders one from watchlist paths and output directories.

Required Bun test:

- Add a test for rendering a Codex automation prompt from a watch workspace.
- Verify it includes explicit binary path instructions, watchlist path, journal path, suggested update path, and dogfood issue path.
- Watch this test fail before adding the template or renderer.

### RM-DOGFOOD-007: Examples assume PATH or skill-directory execution

Observed:

The skill examples use `research-monitor ...` or `bun run src/cli.ts ...`. A Codex automation running from the parent repo root needed:

```bash
.claude/skills/research-monitor/bin/research-monitor ...
```

Expected:

The skill should document how to invoke the binary from:

- the skill repo root;
- a parent repo containing the skill as `.claude/skills/research-monitor`;
- an installed PATH/global package context.

Required Bun test:

- Add a test or fixture that renders instructions for a repo-root invocation.
- Verify the rendered instructions use `.claude/skills/research-monitor/bin/research-monitor`.
- Watch the test fail before updating references/templates.

### RM-DOGFOOD-008: Codex automation RRULE format is stricter than expected

Observed:

Creating a Codex automation failed twice with `automation_update received invalid arguments` before succeeding.

Rejected shapes included schedule strings with full wall-clock fields before explicit model/reasoning metadata was supplied.

Accepted initial create shape:

```text
FREQ=WEEKLY;INTERVAL=1;BYDAY=MO
```

Accepted update shape after creation:

```text
FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;BYHOUR=9;BYMINUTE=0
```

Expected:

The skill's Codex adapter guidance should document known-safe RRULE patterns and the difference between initial creation and later update, or provide a rendering/validation helper for Codex-compatible schedules.

Required Bun test:

- Add unit tests for a Codex schedule renderer/validator.
- Verify weekly schedules include `FREQ=WEEKLY;INTERVAL=1;BYDAY=...`.
- Verify wall-clock fields are emitted only in supported contexts or are handled by a tested adapter path.
- Watch these tests fail before adding schedule normalization logic or docs.

### RM-DOGFOOD-009: Codex cron automation needed explicit model and reasoning effort

Observed:

Cron automation creation failed until `model` and `reasoningEffort` were provided explicitly.

Expected:

The Codex adapter guidance should require or strongly recommend explicit `model` and `reasoningEffort` for automation creation, even if the generic tool schema marks them optional.

Required Bun test:

- Add a test for a Codex automation spec builder.
- Verify it rejects or warns on cron specs without model/reasoning effort.
- Verify the generated spec includes those fields.
- Watch this test fail before implementing the builder or updating guidance.

### RM-DOGFOOD-010: Codex worktree update needed explicit null setup config

Observed:

Updating the automation with wall-clock RRULE fields failed with:

```text
For safety, automations created by the model cannot immediately run a worktree local environment setup script. Use suggested_create or suggested_update so the user can review and approve the setup-capable automation, or set localEnvironmentConfigPath to null.
```

The update succeeded only after setting:

```json
{"localEnvironmentConfigPath": null}
```

Expected:

Codex worktree automation update helpers should explicitly clear `localEnvironmentConfigPath` when no setup config is intended, and docs should explain when to use `suggested_create` or `suggested_update`.

Required Bun test:

- Add a test for Codex worktree update spec generation.
- Verify `localEnvironmentConfigPath: null` is present for no-setup worktree updates.
- Verify setup-capable automations are represented as suggested updates, not immediate updates.
- Watch the test fail before adding helper behavior or guidance.

### RM-DOGFOOD-011: No automation dry-run/spec generator

Observed:

The automation prompt had to be manually copied into the Codex automation tool call. There was no deterministic command to generate the automation spec for review.

Expected:

The CLI should produce a structured automation spec for harnesses it supports, beginning with Codex:

```bash
research-monitor automation-spec codex --watch-root <path> --schedule weekly-monday-0900 --execution worktree
```

Required Bun test:

- Add tests for `automation-spec codex`.
- Verify JSON output includes prompt, RRULE, model, reasoning effort, cwd, execution environment, and no-setup worktree behavior.
- Verify the command is deterministic and suitable for snapshot-style assertions.
- Watch tests fail before implementing the command.

### RM-DOGFOOD-012: Eval tuples are not linked to structured run logs

Observed:

The failure-capture guidance asks agents to capture an eval tuple, and the workflow says noisy run logs should live in SQLite, but there is no deterministic link between a local eval tuple and the log rows that explain what happened.

This would force future eval reviewers to rely on copied prose, screenshots, or unstructured context instead of replayable metadata from the actual monitor run.

Expected:

The local SQLite schema should support one eval tuple referencing many typed log rows. The eval tuple JSON should remain compact and high-signal, but it must be aware of the relevant SQLite logs through stable references.

Recommended shape:

```sql
create table monitor_runs (
  id text primary key,
  watch_root text not null,
  harness text,
  model text,
  started_at text not null,
  completed_at text,
  status text not null,
  metadata_json text not null default '{}'
);

create table run_logs (
  id text primary key,
  run_id text not null references monitor_runs(id),
  step text not null,
  type text not null,
  message text,
  metadata_json text not null default '{}',
  created_at text not null
);

create table eval_tuples (
  id text primary key,
  run_id text references monitor_runs(id),
  research_ask text not null,
  research_result text not null,
  issue text not null,
  correction text not null,
  metadata_json text not null default '{}',
  created_at text not null
);

create table eval_tuple_logs (
  eval_tuple_id text not null references eval_tuples(id),
  run_log_id text not null references run_logs(id),
  primary key (eval_tuple_id, run_log_id)
);
```

The exported eval tuple JSON should include either explicit log row IDs or a deterministic SQL query, for example:

```json
{
  "id": "eval_2026_06_18_help_flag",
  "research_ask": "...",
  "research_result": "...",
  "issue": "...",
  "correction": "...",
  "log_refs": {
    "sqlite_db": ".research-monitor/research.sqlite",
    "run_id": "run_2026_06_18_screener",
    "log_ids": ["log_help_failure", "log_cli_stderr"],
    "query": "select * from run_logs where run_id = ? and type in ('tool_call','stderr','error')"
  }
}
```

Log rows should include:

- `step`, such as `validate`, `extract-context`, `plan-scan`, `external-search`, `journal-write`, `automation-spec`, `capture-failure`;
- `type`, such as `tool_call`, `tool_result`, `stdout`, `stderr`, `error`, `search_query`, `source_candidate`, `source_rejected`, `llm_decision`, `artifact_write`, `harness_event`;
- `metadata_json`, for structured fields that differ by step.

Tags can start inside `metadata_json` as `tags: []` to avoid premature schema churn. If tag filtering becomes common, add a normalized `run_log_tags(run_log_id, tag)` table later.

Required Bun test:

- Add tests for `db init` creating `monitor_runs`, `run_logs`, `eval_tuples`, and `eval_tuple_logs`.
- Add tests for appending multiple typed log rows to one run.
- Add tests for creating an eval tuple linked to multiple log rows.
- Add tests for exporting an eval tuple JSON that includes `log_refs` with either stable `log_ids` or a deterministic SQL query.
- Verify noisy log content stays in SQLite and is not copied wholesale into repo journal files.
- Watch these tests fail before implementing the SQLite schema and failure-capture commands.

## Regression Evidence To Preserve

Use these as fixtures or comments in tests:

- `unknown command: --help`
- `automation_update received invalid arguments`
- `For safety, automations created by the model cannot immediately run a worktree local environment setup script...`
- Accepted automation TOML fields:
  - `rrule = "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;BYHOUR=9;BYMINUTE=0"`
  - `model = "gpt-5.4"`
  - `reasoning_effort = "medium"`
  - `execution_environment = "worktree"`
- Eval tuple `log_refs` should preserve the relationship between a compact eval case and many typed SQLite log rows.

## Suggested Implementation Order

1. `--help` behavior.
2. Compact context field coverage.
3. Codex automation spec generation and schedule normalization.
4. Workspace `init`.
5. Journal and suggested-update validators.
6. SQLite schema, run-log commands, and eval tuple log references.

This order fixes the highest-friction automation setup failures first.
