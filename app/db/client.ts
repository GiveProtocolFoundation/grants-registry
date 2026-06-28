import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const DEFAULT_URL = "./data/grants.sqlite";

export function createDb(url: string = process.env.DATABASE_URL ?? DEFAULT_URL) {
  const sqlite = new Database(url);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite);
}
