import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateWatchlist, type Watchlist } from "../schemas/watchlist";

export async function readWatchlist(path: string): Promise<Watchlist> {
  const text = await readFile(resolve(path), "utf8");
  return validateWatchlist(JSON.parse(text));
}

export async function readText(path: string): Promise<string> {
  return readFile(resolve(path), "utf8");
}
