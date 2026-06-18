import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function initWorkspace(watchRoot: string): Promise<void> {
  await mkdir(join(watchRoot, "journals"), { recursive: true });
  await mkdir(join(watchRoot, "suggested-updates"), { recursive: true });
  await writeIfMissing(join(watchRoot, "journals", ".gitkeep"), "");
  await writeIfMissing(join(watchRoot, "suggested-updates", ".gitkeep"), "");
  await writeIfMissing(join(watchRoot, "watchlist.json"), watchlistTemplate());
  await writeIfMissing(join(watchRoot, "codex-automation-prompt.md"), codexPromptTemplate());
  await writeIfMissing(join(watchRoot, "research-monitor-dogfood-issues.md"), dogfoodTemplate());
}

async function writeIfMissing(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  if (await Bun.file(path).exists()) {
    return;
  }
  await writeFile(path, content);
}

function watchlistTemplate(): string {
  return `${JSON.stringify(
    {
      schema_version: 1,
      industry: {
        name: "Example industry",
        description: "Short description of the market being monitored",
      },
      companies: [],
      discovery: {
        enabled: true,
        queries: [],
        candidate_threshold:
          "Mentioned in funding, launch, comparison, acquisition, or credible customer migration context",
      },
    },
    null,
    2,
  )}\n`;
}

function codexPromptTemplate(): string {
  return `Use $research-monitor to run this external research monitor.

Each run:

1. Run .claude/skills/research-monitor/bin/research-monitor validate --watchlist <watch-root>/watchlist.json.
2. Run .claude/skills/research-monitor/bin/research-monitor extract-context --watchlist <watch-root>/watchlist.json.
3. Run .claude/skills/research-monitor/bin/research-monitor plan-scan --watchlist <watch-root>/watchlist.json --prompt .claude/skills/research-monitor/prompts/weekly-scan.md.
4. Write a dated journal under <watch-root>/journals/YYYY-MM-DD.md.
5. Write suggested watchlist changes under <watch-root>/suggested-updates/.
6. Keep low-signal logs in SQLite, not repo journals.
`;
}

function dogfoodTemplate(): string {
  return `# Research Monitor Dogfood Issues

Append issues that make the skill, CLI, prompt, or adapter harder to use.
`;
}
