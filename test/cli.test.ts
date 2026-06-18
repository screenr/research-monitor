import { afterEach, beforeEach, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), "research-monitor-"));
  await mkdir(join(workspace, "prompts"), { recursive: true });
  await writeFile(
    join(workspace, "watchlist.json"),
    JSON.stringify(
      {
        schema_version: 1,
        industry: {
          name: "Interactive demo automation",
          description: "Tools for product demos, walkthroughs, and demo sandboxes",
        },
        companies: [
          {
            id: "arcade",
            name: "Arcade",
            status: "active",
            category: "self-serve recording",
            priority: "high",
            urls: ["https://www.arcade.so"],
            watch_for: ["pricing changes", "AI demo generation"],
          },
        ],
        discovery: {
          enabled: true,
          queries: ["AI product demo agent startup"],
        },
      },
      null,
      2,
    ),
  );
  await writeFile(
    join(workspace, "prompts", "weekly-scan.md"),
    [
      "Monitor {{industry.name}}.",
      "Companies: {{company_names}}.",
      "Discovery queries: {{discovery_queries}}.",
    ].join("\n"),
  );
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

function runCli(args: string[]) {
  return spawnSync("bun", [join(import.meta.dir, "..", "src", "cli.ts"), ...args], {
    cwd: workspace,
    encoding: "utf8",
  });
}

test("validate accepts a valid watchlist", () => {
  const result = runCli(["validate", "--watchlist", "watchlist.json"]);

  expect(result.status).toBe(0);
  expect(result.stdout).toContain("watchlist.json ok");
});

test("help works with help command and top-level flags", () => {
  for (const arg of ["help", "--help", "-h"]) {
    const result = runCli([arg]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Commands:");
    expect(result.stderr).toBe("");
  }
});

test("extract-context emits compact JSON for LLM input", () => {
  const result = runCli(["extract-context", "--watchlist", "watchlist.json"]);

  expect(result.status).toBe(0);
  const payload = JSON.parse(result.stdout);
  expect(payload.industry.name).toBe("Interactive demo automation");
  expect(payload.companies).toEqual([
    {
      id: "arcade",
      name: "Arcade",
      status: "active",
      category: "self-serve recording",
      priority: "high",
      urls: ["https://www.arcade.so"],
      watch_for: ["pricing changes", "AI demo generation"],
    },
  ]);
  expect(payload.discovery.queries).toEqual(["AI product demo agent startup"]);
});

test("extract-context includes research judgment fields and excludes archived companies", async () => {
  await writeFile(
    join(workspace, "watchlist.json"),
    JSON.stringify(
      {
        schema_version: 1,
        industry: { name: "Demo tools" },
        companies: [
          {
            id: "arcade",
            name: "Arcade",
            status: "active",
            category: "recording",
            priority: "high",
            urls: ["https://arcade.so"],
            watch_for: ["pricing"],
          },
          {
            id: "free3",
            name: "Free3",
            status: "candidate",
            category: "agentic demos",
            priority: "medium",
            urls: ["https://free3.ai"],
            notes: "Unresolved candidate from video transcript.",
            watch_for: ["launch evidence"],
          },
          {
            id: "oldco",
            name: "OldCo",
            status: "archived",
            category: "legacy",
            priority: "low",
          },
        ],
        discovery: {
          enabled: true,
          queries: ["AI demo startup"],
          candidate_threshold: "Credible launch, funding, comparison, or customer migration evidence.",
        },
      },
      null,
      2,
    ),
  );

  const result = runCli(["extract-context", "--watchlist", "watchlist.json"]);

  expect(result.status).toBe(0);
  const payload = JSON.parse(result.stdout);
  expect(payload.companies).toEqual([
    {
      id: "arcade",
      name: "Arcade",
      status: "active",
      category: "recording",
      priority: "high",
      urls: ["https://arcade.so"],
      watch_for: ["pricing"],
    },
    {
      id: "free3",
      name: "Free3",
      status: "candidate",
      category: "agentic demos",
      priority: "medium",
      urls: ["https://free3.ai"],
      notes: "Unresolved candidate from video transcript.",
      watch_for: ["launch evidence"],
    },
  ]);
  expect(payload.discovery.candidate_threshold).toBe(
    "Credible launch, funding, comparison, or customer migration evidence.",
  );
});

test("plan-scan renders an editable prompt template", () => {
  const result = runCli([
    "plan-scan",
    "--watchlist",
    "watchlist.json",
    "--prompt",
    "prompts/weekly-scan.md",
  ]);

  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Monitor Interactive demo automation.");
  expect(result.stdout).toContain("Companies: Arcade.");
  expect(result.stdout).toContain("Discovery queries: AI product demo agent startup.");
});

test("validate rejects duplicate company ids", async () => {
  await writeFile(
    join(workspace, "watchlist.json"),
    JSON.stringify(
      {
        schema_version: 1,
        industry: { name: "Demo tools" },
        companies: [
          { id: "arcade", name: "Arcade", status: "active", category: "recording", priority: "high" },
          { id: "arcade", name: "Arcade clone", status: "candidate", category: "recording", priority: "low" },
        ],
      },
      null,
      2,
    ),
  );

  const result = runCli(["validate", "--watchlist", "watchlist.json"]);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("duplicate company id: arcade");
});

test("init creates a watch workspace without overwriting existing files", async () => {
  const result = runCli(["init", "--watch-root", "watch"]);

  expect(result.status).toBe(0);
  expect(await Bun.file(join(workspace, "watch", "watchlist.json")).exists()).toBe(true);
  expect(await Bun.file(join(workspace, "watch", "journals", ".gitkeep")).exists()).toBe(true);
  expect(await Bun.file(join(workspace, "watch", "suggested-updates", ".gitkeep")).exists()).toBe(true);
  expect(await Bun.file(join(workspace, "watch", "codex-automation-prompt.md")).exists()).toBe(true);
  expect(await Bun.file(join(workspace, "watch", "research-monitor-dogfood-issues.md")).exists()).toBe(true);

  await writeFile(join(workspace, "watch", "watchlist.json"), "keep me");
  const second = runCli(["init", "--watch-root", "watch"]);

  expect(second.status).toBe(0);
  expect(await Bun.file(join(workspace, "watch", "watchlist.json")).text()).toBe("keep me");
});

test("validate-journal checks required headings", async () => {
  const validJournal = [
    "# Research Monitor Journal - 2026-06-18",
    "## Summary",
    "## Company Changes",
    "## New Candidate Companies",
    "## Category Shifts",
    "## Project Implications",
    "## Suggested Watchlist Updates",
    "## Open Questions",
    "## Next Searches",
  ].join("\n\n");
  await writeFile(join(workspace, "journal.md"), validJournal);

  const valid = runCli(["validate-journal", "--journal", "journal.md"]);

  expect(valid.status).toBe(0);
  expect(valid.stdout).toContain("journal.md ok");

  await writeFile(join(workspace, "journal.md"), "# Research Monitor Journal\n\n## Summary\n");
  const invalid = runCli(["validate-journal", "--journal", "journal.md"]);

  expect(invalid.status).toBe(1);
  expect(invalid.stderr).toContain("missing journal heading: ## Company Changes");
});

test("validate-suggested-update checks proposed update shape", async () => {
  await writeFile(
    join(workspace, "suggested-update.json"),
    JSON.stringify({
      suggested_watchlist_updates: [
        {
          action: "add_company",
          reason: "New AI demo agent launched with funding evidence.",
          confidence: "medium",
          data: { id: "newco", name: "NewCo" },
        },
      ],
    }),
  );

  const valid = runCli(["validate-suggested-update", "--file", "suggested-update.json"]);

  expect(valid.status).toBe(0);
  expect(valid.stdout).toContain("suggested-update.json ok");

  await writeFile(join(workspace, "suggested-update.json"), JSON.stringify({ suggested_watchlist_updates: [] }));
  const invalid = runCli(["validate-suggested-update", "--file", "suggested-update.json"]);

  expect(invalid.status).toBe(1);
  expect(invalid.stderr).toContain("suggested_watchlist_updates must contain at least one update");
});

test("automation-spec codex emits deterministic Codex automation payload", async () => {
  await mkdir(join(workspace, "watch"), { recursive: true });
  await writeFile(join(workspace, "watch", "watchlist.json"), await Bun.file(join(workspace, "watchlist.json")).text());
  await writeFile(join(workspace, "watch", "codex-automation-prompt.md"), "Run monitor.");

  const result = runCli([
    "automation-spec",
    "codex",
    "--watch-root",
    "watch",
    "--cwd",
    workspace,
    "--schedule",
    "weekly-monday-0900",
    "--execution",
    "worktree",
    "--model",
    "gpt-5.4",
    "--reasoning-effort",
    "medium",
  ]);

  expect(result.status).toBe(0);
  const payload = JSON.parse(result.stdout);
  expect(payload).toMatchObject({
    kind: "cron",
    mode: "create",
    name: "research-monitor-weekly-monday-0900",
    rrule: "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;BYHOUR=9;BYMINUTE=0",
    executionEnvironment: "worktree",
    model: "gpt-5.4",
    reasoningEffort: "medium",
    localEnvironmentConfigPath: null,
  });
  expect(payload.cwds).toEqual([workspace]);
  expect(payload.prompt).toContain("Run monitor.");
});

test("automation-spec codex rejects missing model and reasoning effort", async () => {
  await mkdir(join(workspace, "watch"), { recursive: true });
  await writeFile(join(workspace, "watch", "codex-automation-prompt.md"), "Run monitor.");

  const result = runCli([
    "automation-spec",
    "codex",
    "--watch-root",
    "watch",
    "--cwd",
    workspace,
    "--schedule",
    "weekly-monday-0900",
    "--execution",
    "worktree",
  ]);

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("missing required flag: --model");
});

test("db and eval tuple commands link many typed log rows to one eval tuple", () => {
  const dbPath = join(workspace, ".research-monitor", "research.sqlite");

  expect(runCli(["db", "init", "--db", dbPath]).status).toBe(0);
  expect(
    runCli([
      "run-log",
      "append",
      "--db",
      dbPath,
      "--run-id",
      "run_1",
      "--watch-root",
      "watch",
      "--step",
      "validate",
      "--type",
      "tool_call",
      "--message",
      "research-monitor validate",
      "--metadata",
      '{"tags":["cli"]}',
    ]).status,
  ).toBe(0);
  expect(
    runCli([
      "run-log",
      "append",
      "--db",
      dbPath,
      "--run-id",
      "run_1",
      "--watch-root",
      "watch",
      "--step",
      "validate",
      "--type",
      "stderr",
      "--message",
      "unknown command: --help",
    ]).status,
  ).toBe(0);

  const logs = runCli(["run-log", "list", "--db", dbPath, "--run-id", "run_1", "--json"]);
  expect(logs.status).toBe(0);
  const logRows = JSON.parse(logs.stdout);
  expect(logRows).toHaveLength(2);

  const created = runCli([
    "eval-tuple",
    "create",
    "--db",
    dbPath,
    "--id",
    "eval_help",
    "--run-id",
    "run_1",
    "--research-ask",
    "Run monitor",
    "--research-result",
    "Help failed",
    "--issue",
    "Top-level help flag fails",
    "--correction",
    "Support --help",
    "--log-ids",
    logRows.map((row: { id: string }) => row.id).join(","),
  ]);
  expect(created.status).toBe(0);

  const exported = runCli(["eval-tuple", "export", "--db", dbPath, "--id", "eval_help"]);
  expect(exported.status).toBe(0);
  const tuple = JSON.parse(exported.stdout);
  expect(tuple.log_refs.run_id).toBe("run_1");
  expect(tuple.log_refs.log_ids).toEqual(logRows.map((row: { id: string }) => row.id));
  expect(tuple.log_refs.query).toContain("select * from run_logs where run_id = ?");
});
