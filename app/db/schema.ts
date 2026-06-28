// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Canonical schema for the public-goods grants registry (Wedge C v0).
// See GIV-43 plan and GIV-47 ticket for design notes.
//
// Entities:
//   program  — a grants program (e.g. Optimism RPGF, Gitcoin Grants).
//   round    — a discrete funding round within a program.
//   grantee  — a recipient project/team. Distinct from a grant.
//   grant    — an award: a (round, grantee) pair with amount + provenance.
//   source_record — raw provenance, one row per upstream record we ingested.
//
// Identifier strategy: deterministic content-hash slug IDs (see ./ids.ts) so
// re-ingest is idempotent and IDs are stable across rebuilds.
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ---- program ---------------------------------------------------------------

export const program = sqliteTable(
  "program",
  {
    // Content-hash slug id, e.g. "optimism-rpgf-3f9a".
    id: text("id").primaryKey(),
    // Human slug used in URLs, e.g. "optimism-rpgf". Unique.
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    url: text("url"),
    // SPDX or short license string covering upstream data redistribution.
    license: text("license"),
    sourceUrl: text("source_url"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => ({
    programSlugUnique: uniqueIndex("program_slug_unique").on(t.slug),
  }),
);

// ---- round -----------------------------------------------------------------

export const round = sqliteTable(
  "round",
  {
    id: text("id").primaryKey(),
    programId: text("program_id")
      .notNull()
      .references(() => program.id, { onDelete: "cascade" }),
    // Human slug unique within a program, e.g. "rpgf3".
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    // ISO 8601 strings; SQLite stores text. Optional because some programs
    // do not publish exact open/close timestamps.
    openedAt: text("opened_at"),
    closedAt: text("closed_at"),
    // Total pool in USD, stored as integer cents to avoid float drift.
    totalPoolUsdCents: integer("total_pool_usd_cents"),
    sourceUrl: text("source_url"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => ({
    roundProgramSlugUnique: uniqueIndex("round_program_slug_unique").on(
      t.programId,
      t.slug,
    ),
    roundProgramIdx: index("round_program_idx").on(t.programId),
  }),
);

// ---- grantee ---------------------------------------------------------------

export const grantee = sqliteTable(
  "grantee",
  {
    id: text("id").primaryKey(),
    // Stable slug derived from canonical name + first source signature.
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    githubOrg: text("github_org"),
    website: text("website"),
    // Free-form social handles as a JSON blob, e.g. {"twitter":"@x"}.
    social: text("social"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => ({
    granteeSlugUnique: uniqueIndex("grantee_slug_unique").on(t.slug),
  }),
);

// ---- grant -----------------------------------------------------------------

export const grant = sqliteTable(
  "grant",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id")
      .notNull()
      .references(() => round.id, { onDelete: "cascade" }),
    granteeId: text("grantee_id")
      .notNull()
      .references(() => grantee.id, { onDelete: "cascade" }),
    // USD amount in integer cents. Required: every grant must normalize to USD
    // so the search/UI can filter and sort on a common axis.
    amountUsdCents: integer("amount_usd_cents").notNull(),
    // Native currency record, optional. e.g. ETH, OP, DAI.
    currencyNative: text("currency_native"),
    // Native amount as a string to preserve precision for large/small values.
    amountNative: text("amount_native"),
    // ISO 8601 award date.
    awardedAt: text("awarded_at"),
    sourceUrl: text("source_url"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => ({
    grantRoundGranteeUnique: uniqueIndex("grant_round_grantee_unique").on(
      t.roundId,
      t.granteeId,
    ),
    grantRoundIdx: index("grant_round_idx").on(t.roundId),
    grantGranteeIdx: index("grant_grantee_idx").on(t.granteeId),
  }),
);

// ---- source_record ---------------------------------------------------------
//
// Provenance: one row per upstream record we observed during ingest. Lets us
// reproduce any normalized row from raw source, and audit changes over time.
// Adapters MUST write a source_record before normalizing into program/round/
// grantee/grant so we can always answer "where did this come from?".

export const sourceRecord = sqliteTable(
  "source_record",
  {
    id: text("id").primaryKey(),
    // Which adapter wrote this, e.g. "optimism-rpgf", "gitcoin-grants".
    adapter: text("adapter").notNull(),
    // Which canonical entity this record produced; helps querying provenance
    // by entity type. One of: "program", "round", "grantee", "grant".
    entityKind: text("entity_kind").notNull(),
    // Optional: the canonical id this record contributed to. May be null if
    // the row was rejected or is awaiting normalization.
    entityId: text("entity_id"),
    // Stable upstream identifier (URL, hash, or composite key) used to detect
    // re-ingest of the same source row.
    sourceKey: text("source_key").notNull(),
    sourceUrl: text("source_url"),
    // SHA-256 of the canonical-JSON payload, hex encoded. Used to detect
    // upstream changes without diffing the payload itself.
    payloadHash: text("payload_hash").notNull(),
    // Raw payload as JSON text. SQLite stores this efficiently and we can
    // re-derive normalized rows from it.
    payload: text("payload").notNull(),
    fetchedAt: text("fetched_at")
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  },
  (t) => ({
    // Same upstream row from the same adapter is unique. Re-ingest updates
    // payload_hash + payload via upsert, keeping a single provenance row.
    sourceAdapterKeyUnique: uniqueIndex("source_adapter_key_unique").on(
      t.adapter,
      t.sourceKey,
    ),
    sourceEntityIdx: index("source_entity_idx").on(t.entityKind, t.entityId),
  }),
);

// ---- type exports ----------------------------------------------------------

export type Program = typeof program.$inferSelect;
export type NewProgram = typeof program.$inferInsert;
export type Round = typeof round.$inferSelect;
export type NewRound = typeof round.$inferInsert;
export type Grantee = typeof grantee.$inferSelect;
export type NewGrantee = typeof grantee.$inferInsert;
export type Grant = typeof grant.$inferSelect;
export type NewGrant = typeof grant.$inferInsert;
export type SourceRecord = typeof sourceRecord.$inferSelect;
export type NewSourceRecord = typeof sourceRecord.$inferInsert;
