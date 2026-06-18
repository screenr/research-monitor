const JOURNAL_HEADINGS = [
  "## Summary",
  "## Company Changes",
  "## New Candidate Companies",
  "## Category Shifts",
  "## Project Implications",
  "## Suggested Watchlist Updates",
  "## Open Questions",
  "## Next Searches",
];

const UPDATE_ACTIONS = new Set([
  "add_company",
  "update_company",
  "pause_company",
  "remove_company",
  "add_query",
  "remove_query",
]);

const CONFIDENCE = new Set(["high", "medium", "low"]);

export function validateJournalText(text: string): void {
  for (const heading of JOURNAL_HEADINGS) {
    if (!text.includes(heading)) {
      throw new Error(`missing journal heading: ${heading}`);
    }
  }
}

export function validateSuggestedUpdate(value: unknown): void {
  if (!isRecord(value) || !Array.isArray(value.suggested_watchlist_updates)) {
    throw new Error("suggested_watchlist_updates must be an array");
  }
  if (value.suggested_watchlist_updates.length === 0) {
    throw new Error("suggested_watchlist_updates must contain at least one update");
  }
  for (const [index, update] of value.suggested_watchlist_updates.entries()) {
    if (!isRecord(update)) {
      throw new Error(`suggested_watchlist_updates[${index}] must be an object`);
    }
    if (typeof update.action !== "string" || !UPDATE_ACTIONS.has(update.action)) {
      throw new Error(`suggested_watchlist_updates[${index}].action is invalid`);
    }
    if (typeof update.reason !== "string" || update.reason.trim() === "") {
      throw new Error(`suggested_watchlist_updates[${index}].reason is required`);
    }
    if (typeof update.confidence !== "string" || !CONFIDENCE.has(update.confidence)) {
      throw new Error(`suggested_watchlist_updates[${index}].confidence is invalid`);
    }
    if (!isRecord(update.data)) {
      throw new Error(`suggested_watchlist_updates[${index}].data must be an object`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
