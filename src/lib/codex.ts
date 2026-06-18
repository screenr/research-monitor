import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface CodexAutomationSpecOptions {
  watchRoot: string;
  cwd: string;
  schedule: string;
  execution: string;
  model: string;
  reasoningEffort: string;
}

export async function buildCodexAutomationSpec(options: CodexAutomationSpecOptions): Promise<Record<string, unknown>> {
  const prompt = await readFile(join(options.watchRoot, "codex-automation-prompt.md"), "utf8");
  return {
    mode: "create",
    kind: "cron",
    name: `research-monitor-${options.schedule}`,
    prompt,
    rrule: renderSchedule(options.schedule),
    cwds: [options.cwd],
    executionEnvironment: options.execution,
    model: options.model,
    reasoningEffort: options.reasoningEffort,
    localEnvironmentConfigPath: options.execution === "worktree" ? null : undefined,
    status: "ACTIVE",
  };
}

function renderSchedule(schedule: string): string {
  if (schedule === "weekly-monday-0900") {
    return "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;BYHOUR=9;BYMINUTE=0";
  }
  throw new Error(`unsupported Codex schedule: ${schedule}`);
}
