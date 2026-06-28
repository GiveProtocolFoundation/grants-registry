// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// End-to-end adapter test: load fixture snapshots → normalize → persist into
// an in-memory SQLite, then assert idempotency by running the same ingest
// twice and checking row counts and provenance hashes.

import { join } from "node:path";

import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { persistAdapterBatch } from "../../../app/adapters/persist";
import {
  GITCOIN_ADAPTER_NAME,
  GITCOIN_PROGRAM_SLUG,
  gitcoinGrantsAdapter,
} from "../../../app/adapters/gitcoin";
import { programId, sourceRecordId } from "../../../app/db/ids";
import {
  grant,
  grantee,
  program,
  round,
  sourceRecord,
} from "../../../app/db/schema";
import { createTestDb } from "../../../app/db/test-db";

const FIXTURE_DIR = join(__dirname, "fixtures");

describe("gitcoin-grants adapter end-to-end", () => {
  it("ingests fixture snapshots into the canonical schema", async () => {
    const db = createTestDb();
    const batch = await gitcoinGrantsAdapter.ingest({ dataDir: FIXTURE_DIR });
    const result = persistAdapterBatch(db, GITCOIN_ADAPTER_NAME, batch);

    expect(result.programs).toBe(1);
    expect(result.rounds).toBe(2);
    // gr15: 3 projects (ethers-io, wevm, anon-builder-collective-…)
    // gr18: 2 projects (wevm, ethers-io) — wagmi+ethers re-appear
    // → grantees seen: 3 distinct
    expect(result.grantees).toBe(3);
    expect(result.grants).toBe(5);
    expect(result.sourceRecords).toBe(1 + 2 + 3 + 5);

    const programs = db.select().from(program).all();
    expect(programs).toHaveLength(1);
    expect(programs[0].slug).toBe(GITCOIN_PROGRAM_SLUG);
    expect(programs[0].license).toBe("CC-BY-4.0");

    const rounds = db.select().from(round).all();
    expect(rounds.map((r) => r.slug).sort()).toEqual(["gr15", "gr18"]);

    const grants = db.select().from(grant).all();
    expect(grants.length).toBe(5);

    // Provenance: one source_record per program/round/grantee/grant.
    const sources = db.select().from(sourceRecord).all();
    expect(sources.length).toBe(11);
    for (const s of sources) {
      expect(s.adapter).toBe(GITCOIN_ADAPTER_NAME);
      expect(s.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    }

    // Program source row resolves deterministically.
    const programSrc = db
      .select()
      .from(sourceRecord)
      .where(
        eq(
          sourceRecord.id,
          sourceRecordId(GITCOIN_ADAPTER_NAME, "program:gitcoin-grants"),
        ),
      )
      .all();
    expect(programSrc).toHaveLength(1);
    expect(programSrc[0].entityId).toBe(programId(GITCOIN_PROGRAM_SLUG));
  });

  it("is idempotent across re-ingest (row counts and payload hashes stable)", async () => {
    const db = createTestDb();

    const batch1 = await gitcoinGrantsAdapter.ingest({ dataDir: FIXTURE_DIR });
    persistAdapterBatch(db, GITCOIN_ADAPTER_NAME, batch1);
    const hashesBefore = new Map(
      db
        .select()
        .from(sourceRecord)
        .all()
        .map((r) => [r.id, r.payloadHash]),
    );
    const grantCountBefore = db.select().from(grant).all().length;

    // Second run — must not throw, must not inflate row counts, must keep
    // the same payload hashes.
    const batch2 = await gitcoinGrantsAdapter.ingest({ dataDir: FIXTURE_DIR });
    persistAdapterBatch(db, GITCOIN_ADAPTER_NAME, batch2);

    const grantCountAfter = db.select().from(grant).all().length;
    expect(grantCountAfter).toBe(grantCountBefore);
    expect(db.select().from(grantee).all().length).toBe(3);
    expect(db.select().from(round).all().length).toBe(2);
    expect(db.select().from(program).all().length).toBe(1);

    const hashesAfter = new Map(
      db
        .select()
        .from(sourceRecord)
        .all()
        .map((r) => [r.id, r.payloadHash]),
    );
    expect(hashesAfter.size).toBe(hashesBefore.size);
    for (const [id, hash] of hashesBefore) {
      expect(hashesAfter.get(id)).toBe(hash);
    }
  });

  it("flags the unparseable-amount fixture row in coverage", async () => {
    const batch = await gitcoinGrantsAdapter.ingest({ dataDir: FIXTURE_DIR });
    expect(batch.coverage.knownGaps.length).toBeGreaterThan(0);
    expect(batch.coverage.completeness).toBe("best-effort");
    const blankGrant = batch.grants.find((g) =>
      g.sourceKey.endsWith(":blank-amount-row"),
    );
    expect(blankGrant).toBeDefined();
    expect(blankGrant!.amountUsdCents).toBe(0);
    expect(blankGrant!.amountDisclosed).toBe(false);
  });

  it("handles a missing data directory as zero snapshots", async () => {
    const db = createTestDb();
    const batch = await gitcoinGrantsAdapter.ingest({
      dataDir: join(__dirname, "no-such-dir"),
    });
    const result = persistAdapterBatch(db, GITCOIN_ADAPTER_NAME, batch);
    // Program row is always emitted, but no rounds/grants when there are
    // no snapshots.
    expect(result.programs).toBe(1);
    expect(result.rounds).toBe(0);
    expect(result.grants).toBe(0);
  });
});
