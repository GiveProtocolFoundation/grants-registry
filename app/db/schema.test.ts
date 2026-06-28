// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { seedFixtures } from "./fixtures";
import { granteeId, programId, roundId, sourceRecordId } from "./ids";
import { grant, grantee, program, round, sourceRecord } from "./schema";
import { createTestDb } from "./test-db";

describe("schema migrations + fixtures", () => {
  it("applies migrations and seeds programs/rounds/grantees/grants", () => {
    const db = createTestDb();
    const { programs, rounds, grantees, grants } = seedFixtures(db);

    const fetchedPrograms = db.select().from(program).all();
    expect(fetchedPrograms).toHaveLength(programs.length);

    const fetchedRounds = db.select().from(round).all();
    expect(fetchedRounds).toHaveLength(rounds.length);

    const fetchedGrantees = db.select().from(grantee).all();
    expect(fetchedGrantees).toHaveLength(grantees.length);

    const fetchedGrants = db.select().from(grant).all();
    expect(fetchedGrants).toHaveLength(grants.length);
  });

  it("records provenance in source_record", () => {
    const db = createTestDb();
    seedFixtures(db);
    const records = db.select().from(sourceRecord).all();
    expect(records.length).toBeGreaterThan(0);
    for (const r of records) {
      expect(r.adapter).toBe("fixtures");
      expect(r.entityKind).toBe("program");
      expect(r.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("uses deterministic ids derived from canonical slugs", () => {
    const db = createTestDb();
    seedFixtures(db);

    const expectedProgramId = programId("optimism-rpgf");
    const fetched = db
      .select()
      .from(program)
      .where(eq(program.id, expectedProgramId))
      .all();
    expect(fetched).toHaveLength(1);
    expect(fetched[0].slug).toBe("optimism-rpgf");
  });

  it("links round → program and grant → round + grantee", () => {
    const db = createTestDb();
    seedFixtures(db);

    const pid = programId("optimism-rpgf");
    const rid = roundId(pid, "rpgf3");
    const gid = granteeId("ethers-js");

    const fetchedRounds = db
      .select()
      .from(round)
      .where(eq(round.id, rid))
      .all();
    expect(fetchedRounds).toHaveLength(1);
    expect(fetchedRounds[0].programId).toBe(pid);

    const fetchedGrants = db
      .select()
      .from(grant)
      .where(eq(grant.roundId, rid))
      .all();
    expect(fetchedGrants).toHaveLength(1);
    expect(fetchedGrants[0].granteeId).toBe(gid);
    expect(fetchedGrants[0].amountUsdCents).toBe(150_000_00);
  });

  it("re-seed is rejected by unique constraint (idempotent ids surface duplicates)", () => {
    const db = createTestDb();
    seedFixtures(db);
    expect(() => seedFixtures(db)).toThrow();
  });

  it("source_record (adapter, source_key) is unique", () => {
    const db = createTestDb();
    seedFixtures(db);
    const id = sourceRecordId("fixtures", "program:optimism-rpgf");
    const rows = db
      .select()
      .from(sourceRecord)
      .where(eq(sourceRecord.id, id))
      .all();
    expect(rows).toHaveLength(1);
  });
});
