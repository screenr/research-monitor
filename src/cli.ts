#!/usr/bin/env bun
import { readText, readWatchlist } from "./lib/files";
import { renderPrompt } from "./lib/template";
import { toCompactContext } from "./schemas/watchlist";

type Command = "validate" | "extract-context" | "plan-scan" | "help";

async function main(argv: string[]): Promise<number> {
  const [command = "help", ...rest] = argv as [Command, ...string[]];
  const flags = parseFlags(rest);

  try {
    if (command === "help" || flags.help === "true") {
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

function helpText(): string {
  return `research-monitor

Commands:
  validate --watchlist <path>
  extract-context --watchlist <path>
  plan-scan --watchlist <path> --prompt <path>
`;
}

if (import.meta.main) {
  const code = await main(process.argv.slice(2));
  process.exit(code);
}
