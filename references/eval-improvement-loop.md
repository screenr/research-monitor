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
