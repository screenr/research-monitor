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

test("extract-context emits compact JSON for LLM input", () => {
  const result = runCli(["extract-context", "--watchlist", "watchlist.json"]);

  expect(result.status).toBe(0);
  const payload = JSON.parse(result.stdout);
  expect(payload.industry.name).toBe("Interactive demo automation");
  expect(payload.companies).toEqual([
    {
      id: "arcade",
      name: "Arcade",
      category: "self-serve recording",
      priority: "high",
      watch_for: ["pricing changes", "AI demo generation"],
    },
  ]);
  expect(payload.discovery.queries).toEqual(["AI product demo agent startup"]);
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
