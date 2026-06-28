// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// In-memory SQLite + Drizzle helper for unit tests. Applies the generated
// migrations against a fresh `:memory:` database so tests exercise the same
// DDL we ship.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";
import {
  drizzle,
  type BetterSQLite3Database,
} from "drizzle-orm/better-sqlite3";

const MIGRATIONS_DIR = join(process.cwd(), "app", "db", "migrations");

export function createTestDb(): BetterSQLite3Database {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  applyMigrations(sqlite);
  return drizzle(sqlite);
}

function applyMigrations(sqlite: Database.Database): void {
  if (!existsSync(MIGRATIONS_DIR)) {
    throw new Error(
      `Migrations directory not found at ${MIGRATIONS_DIR}. Run \`npm run db:generate\` first.`,
    );
  }
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    // Drizzle's generated .sql files use `--> statement-breakpoint` between
    // statements. better-sqlite3's `exec` handles multiple statements per call,
    // but we split + filter to skip empty fragments cleanly.
    const statements = sql
      .split(/-->\s*statement-breakpoint/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      sqlite.exec(stmt);
    }
  }
}
