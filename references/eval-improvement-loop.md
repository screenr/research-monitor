# Eval Improvement Loop

When a monitor disappoints the user, capture a case before changing the skill.

Minimum tuple:

```json
{
  "research_ask": "",
  "research_result": "",
  "issue": "",
  "correction": "",
  "metadata": {
    "harness": "",
    "model": "",
    "used_subagents": false,
    "subagent_kind": null,
    "project_size": null,
    "context_percent_used_at_start": null
  }
}
```

Then add or update an entry in `evals/evals.json` so future skill changes can be checked against the failure.

When local SQLite logs are available, keep noisy evidence in `.research-monitor/research.sqlite` and export eval tuples with `log_refs` instead of copying full logs into JSON. One eval tuple can reference many typed log rows through `eval_tuple_logs`.
