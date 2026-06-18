#!/usr/bin/env bun
import { readText, readWatchlist } from "./lib/files";
import { renderPrompt } from "./lib/template";
import { toCompactContext } from "./schemas/watchlist";
import { initWorkspace } from "./lib/init";
import { validateJournalText, validateSuggestedUpdate } from "./lib/validators";
import { buildCodexAutomationSpec } from "./lib/codex";
import { appendLog, createEvalTuple, exportEvalTuple, initDb, listLogs } from "./lib/db";

type Command =
  | "validate"
  | "extract-context"
  | "plan-scan"
  | "init"
  | "validate-journal"
  | "validate-suggested-update"
  | "automation-spec"
  | "db"
  | "run-log"
  | "eval-tuple"
  | "help"
  | "--help"
  | "-h";

async function main(argv: string[]): Promise<number> {
  const [command = "help", ...rest] = argv as [Command, ...string[]];
  const flags = parseFlags(rest);

  try {
    if (command === "help" || command === "--help" || command === "-h" || flags.help === "true" || flags.h === "true") {
      process.stdout.write(helpText());
      return 0;
    }

    if (command === "validate") {
      const watchlistPath = requireFlag(flags, "watchlist");
      await readWatchlist(watchlistPath);
      process.stdout.write(`${watchlistPath} ok\n`);
      return 0;
    }

    if (command === "extract-context") {
      const watchlist = await readWatchlist(requireFlag(flags, "watchlist"));
      process.stdout.write(`${JSON.stringify(toCompactContext(watchlist), null, 2)}\n`);
      return 0;
    }

    if (command === "plan-scan") {
      const watchlist = await readWatchlist(requireFlag(flags, "watchlist"));
      const template = await readText(requireFlag(flags, "prompt"));
      process.stdout.write(renderPrompt(template, toCompactContext(watchlist)));
      return 0;
    }

    if (command === "init") {
      const watchRoot = requireFlag(flags, "watch-root");
      await initWorkspace(watchRoot);
      process.stdout.write(`${watchRoot} initialized\n`);
      return 0;
    }

    if (command === "validate-journal") {
      const journalPath = requireFlag(flags, "journal");
      validateJournalText(await readText(journalPath));
      process.stdout.write(`${journalPath} ok\n`);
      return 0;
    }

    if (command === "validate-suggested-update") {
      const filePath = requireFlag(flags, "file");
      validateSuggestedUpdate(JSON.parse(await readText(filePath)));
      process.stdout.write(`${filePath} ok\n`);
      return 0;
    }

    if (command === "automation-spec") {
      const [adapter] = positional(rest);
      if (adapter !== "codex") {
        throw new Error(`unsupported automation adapter: ${adapter ?? ""}`);
      }
      const spec = await buildCodexAutomationSpec({
        watchRoot: requireFlag(flags, "watch-root"),
        cwd: requireFlag(flags, "cwd"),
        schedule: requireFlag(flags, "schedule"),
        execution: requireFlag(flags, "execution"),
        model: requireFlag(flags, "model"),
        reasoningEffort: requireFlag(flags, "reasoning-effort"),
      });
      process.stdout.write(`${JSON.stringify(spec, null, 2)}\n`);
      return 0;
    }

    if (command === "db") {
      const [subcommand] = positional(rest);
      if (subcommand !== "init") {
        throw new Error(`unknown db command: ${subcommand ?? ""}`);
      }
      const dbPath = requireFlag(flags, "db");
      initDb(dbPath);
      process.stdout.write(`${dbPath} ok\n`);
      return 0;
    }

    if (command === "run-log") {
      const [subcommand] = positional(rest);
      if (subcommand === "append") {
        const id = appendLog({
          dbPath: requireFlag(flags, "db"),
          runId: requireFlag(flags, "run-id"),
          watchRoot: requireFlag(flags, "watch-root"),
          step: requireFlag(flags, "step"),
          type: requireFlag(flags, "type"),
          message: flags.message,
          metadata: flags.metadata,
        });
        process.stdout.write(`${id}\n`);
        return 0;
      }
      if (subcommand === "list") {
        const rows = listLogs(requireFlag(flags, "db"), requireFlag(flags, "run-id"));
        process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
        return 0;
      }
      throw new Error(`unknown run-log command: ${subcommand ?? ""}`);
    }

    if (command === "eval-tuple") {
      const [subcommand] = positional(rest);
      if (subcommand === "create") {
        createEvalTuple({
          dbPath: requireFlag(flags, "db"),
          id: requireFlag(flags, "id"),
          runId: requireFlag(flags, "run-id"),
          researchAsk: requireFlag(flags, "research-ask"),
          researchResult: requireFlag(flags, "research-result"),
          issue: requireFlag(flags, "issue"),
          correction: requireFlag(flags, "correction"),
          logIds: requireFlag(flags, "log-ids").split(",").filter(Boolean),
        });
        process.stdout.write(`${flags.id} ok\n`);
        return 0;
      }
      if (subcommand === "export") {
        const tuple = exportEvalTuple(requireFlag(flags, "db"), requireFlag(flags, "id"));
        process.stdout.write(`${JSON.stringify(tuple, null, 2)}\n`);
        return 0;
      }
      throw new Error(`unknown eval-tuple command: ${subcommand ?? ""}`);
    }

    throw new Error(`unknown command: ${command}`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = args[index + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = "true";
    } else {
      flags[key] = next;
      index += 1;
    }
  }
  return flags;
}

function requireFlag(flags: Record<string, string>, name: string): string {
  const value = flags[name];
  if (!value || value === "true") {
    throw new Error(`missing required flag: --${name}`);
  }
  return value;
}

function positional(args: string[]): string[] {
  return args.filter((arg) => !arg.startsWith("--"));
}

function helpText(): string {
  return `research-monitor

Commands:
  validate --watchlist <path>
  extract-context --watchlist <path>
  plan-scan --watchlist <path> --prompt <path>
  init --watch-root <path>
  validate-journal --journal <path>
  validate-suggested-update --file <path>
  automation-spec codex --watch-root <path> --cwd <path> --schedule weekly-monday-0900 --execution worktree --model <model> --reasoning-effort <effort>
  db init --db <path>
  run-log append --db <path> --run-id <id> --watch-root <path> --step <step> --type <type> [--message <text>] [--metadata <json>]
  run-log list --db <path> --run-id <id> --json
  eval-tuple create --db <path> --id <id> --run-id <id> --research-ask <text> --research-result <text> --issue <text> --correction <text> --log-ids <ids>
  eval-tuple export --db <path> --id <id>
`;
}

if (import.meta.main) {
  const code = await main(process.argv.slice(2));
  process.exit(code);
}
