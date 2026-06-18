# Harness Adapter Boundary

Research Monitor adapters are composable. Do not collapse them into one harness-specific object.

```ts
interface SchedulerAdapter {
  create(spec: ScheduleSpec): Promise<ScheduledRunRef>;
  list?(): Promise<ScheduledRunRef[]>;
  pause?(id: string): Promise<void>;
  resume?(id: string): Promise<void>;
}

interface RunnerAdapter {
  run(input: MonitorRunInput): Promise<MonitorRunResult>;
  capabilities(): HarnessCapabilities;
}

interface StateAdapter {
  load(key: string): Promise<MonitorState | null>;
  save(key: string, state: MonitorState): Promise<void>;
}

interface NotifierAdapter {
  publish(result: MonitorRunResult): Promise<void>;
  publishNothingToReport?(summary: QuietRunSummary): Promise<void>;
}
```

Initial target adapters:

| Adapter | Purpose |
| --- | --- |
| `codex-app` | Codex project automations, worktrees, thread heartbeats, Triage output |
| `claude-code` | Claude Routines, desktop scheduled tasks, session loops |
| `generic-cli` | Cron, GitHub Actions, `codex exec`, OpenCode, Goose, Cline, aider, Continue |

Capability descriptors must declare triggers, execution scopes, state stores, outputs, approval behavior, and whether the harness can run unattended.
