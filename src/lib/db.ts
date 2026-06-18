import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { Database } from "bun:sqlite";

export function initDb(path: string): void {
  const dir = dirname(path);
  if (dir !== ".") {
    mkdirSync(dir, { recursive: true });
  }
  const db = openDb(path);
  db.exec(`
    create table if not exists monitor_runs (
      id text primary key,
      watch_root text not null,
      harness text,
      model text,
      started_at text not null,
      completed_at text,
      status text not null,
      metadata_json text not null default '{}'
    );

    create table if not exists run_logs (
      id text primary key,
      run_id text not null references monitor_runs(id),
      step text not null,
      type text not null,
      message text,
      metadata_json text not null default '{}',
      created_at text not null
    );

    create table if not exists eval_tuples (
      id text primary key,
      run_id text references monitor_runs(id),
      research_ask text not null,
      research_result text not null,
      issue text not null,
      correction text not null,
      metadata_json text not null default '{}',
      created_at text not null
    );

    create table if not exists eval_tuple_logs (
      eval_tuple_id text not null references eval_tuples(id),
      run_log_id text not null references run_logs(id),
      primary key (eval_tuple_id, run_log_id)
    );
  `);
  db.close();
}

export interface AppendLogInput {
  dbPath: string;
  runId: string;
  watchRoot: string;
  step: string;
  type: string;
  message?: string;
  metadata?: string;
}

export function appendLog(input: AppendLogInput): string {
  initDb(input.dbPath);
  const db = openDb(input.dbPath);
  const now = new Date().toISOString();
  db.query(
    `insert into monitor_runs (id, watch_root, started_at, status, metadata_json)
     values (?, ?, ?, 'running', '{}')
     on conflict(id) do nothing`,
  ).run(input.runId, input.watchRoot, now);
  const id = `log_${randomUUID()}`;
  db.query(
    `insert into run_logs (id, run_id, step, type, message, metadata_json, created_at)
     values (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.runId, input.step, input.type, input.message ?? null, normalizeJson(input.metadata), now);
  db.close();
  return id;
}

export function listLogs(dbPath: string, runId: string): Array<Record<string, unknown>> {
  const db = openDb(dbPath);
  const rows = db
    .query(`select id, run_id, step, type, message, metadata_json, created_at from run_logs where run_id = ? order by created_at, id`)
    .all(runId) as Array<Record<string, unknown>>;
  db.close();
  return rows.map((row) => ({ ...row, metadata: JSON.parse(String(row.metadata_json)) }));
}

export interface CreateEvalTupleInput {
  dbPath: string;
  id: string;
  runId: string;
  researchAsk: string;
  researchResult: string;
  issue: string;
  correction: string;
  logIds: string[];
}

export function createEvalTuple(input: CreateEvalTupleInput): void {
  initDb(input.dbPath);
  const db = openDb(input.dbPath);
  db.query(
    `insert into eval_tuples
      (id, run_id, research_ask, research_result, issue, correction, metadata_json, created_at)
     values (?, ?, ?, ?, ?, ?, '{}', ?)`,
  ).run(
    input.id,
    input.runId,
    input.researchAsk,
    input.researchResult,
    input.issue,
    input.correction,
    new Date().toISOString(),
  );
  const link = db.query(`insert into eval_tuple_logs (eval_tuple_id, run_log_id) values (?, ?)`);
  for (const logId of input.logIds) {
    link.run(input.id, logId);
  }
  db.close();
}

export function exportEvalTuple(dbPath: string, id: string): Record<string, unknown> {
  const db = openDb(dbPath);
  const tuple = db
    .query(`select id, run_id, research_ask, research_result, issue, correction, metadata_json, created_at from eval_tuples where id = ?`)
    .get(id) as Record<string, unknown> | null;
  if (!tuple) {
    db.close();
    throw new Error(`eval tuple not found: ${id}`);
  }
  const links = db
    .query(`select run_log_id from eval_tuple_logs where eval_tuple_id = ? order by rowid`)
    .all(id) as Array<{ run_log_id: string }>;
  db.close();
  return {
    id: tuple.id,
    research_ask: tuple.research_ask,
    research_result: tuple.research_result,
    issue: tuple.issue,
    correction: tuple.correction,
    metadata: JSON.parse(String(tuple.metadata_json)),
    log_refs: {
      sqlite_db: dbPath,
      run_id: tuple.run_id,
      log_ids: links.map((link) => link.run_log_id),
      query: "select * from run_logs where run_id = ? and id in (?)",
    },
  };
}

function openDb(path: string): Database {
  return new Database(path, { create: true });
}

function normalizeJson(value: string | undefined): string {
  if (!value) {
    return "{}";
  }
  JSON.parse(value);
  return value;
}
