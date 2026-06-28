// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Seed fixtures for unit tests and local dev. These are NOT production data;
// they exist to exercise the schema + slug-id system end to end.
//
// To use in tests:
//   const db = createTestDb();
//   await seedFixtures(db);

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import {
  granteeId,
  grantId,
  payloadHash,
  programId,
  roundId,
  sourceRecordId,
} from "./ids";
import { grant, grantee, program, round, sourceRecord } from "./schema";

export const FIXTURE_PROGRAMS = [
  {
    slug: "optimism-rpgf",
    name: "Optimism Retroactive Public Goods Funding",
    url: "https://app.optimism.io/retropgf",
    license: "CC-BY-4.0",
    sourceUrl: "https://vote.optimism.io/retropgf/3",
  },
  {
    slug: "gitcoin-grants",
    name: "Gitcoin Grants",
    url: "https://grants.gitcoin.co",
    license: "CC-BY-4.0",
    sourceUrl: "https://grants.gitcoin.co",
  },
] as const;

export const FIXTURE_ROUNDS = [
  {
    programSlug: "optimism-rpgf",
    slug: "rpgf3",
    name: "RetroPGF Round 3",
    openedAt: "2023-10-01T00:00:00Z",
    closedAt: "2024-01-11T00:00:00Z",
    totalPoolUsdCents: 30_000_000_00, // $30M
    sourceUrl: "https://vote.optimism.io/retropgf/3",
  },
  {
    programSlug: "gitcoin-grants",
    slug: "gr18",
    name: "Gitcoin Grants Round 18",
    openedAt: "2023-08-15T00:00:00Z",
    closedAt: "2023-08-29T00:00:00Z",
    totalPoolUsdCents: 600_000_00, // $600k
    sourceUrl: "https://grants.gitcoin.co/gr18",
  },
] as const;

export const FIXTURE_GRANTEES = [
  {
    slug: "ethers-js",
    name: "ethers.js",
    githubOrg: "ethers-io",
    website: "https://ethers.org",
  },
  {
    slug: "wagmi",
    name: "wagmi",
    githubOrg: "wevm",
    website: "https://wagmi.sh",
  },
] as const;

// (program slug, round slug, grantee slug, amount USD cents)
export const FIXTURE_GRANTS = [
  {
    programSlug: "optimism-rpgf",
    roundSlug: "rpgf3",
    granteeSlug: "ethers-js",
    amountUsdCents: 150_000_00,
    awardedAt: "2024-01-11T00:00:00Z",
    sourceUrl: "https://vote.optimism.io/retropgf/3/project/ethers-js",
  },
  {
    programSlug: "gitcoin-grants",
    roundSlug: "gr18",
    granteeSlug: "wagmi",
    amountUsdCents: 25_000_00,
    awardedAt: "2023-08-29T00:00:00Z",
    sourceUrl: "https://grants.gitcoin.co/gr18/wagmi",
  },
] as const;

/**
 * Insert all fixtures, returning the resolved canonical ids so tests can
 * assert against them without re-deriving slugs.
 */
export function seedFixtures(db: BetterSQLite3Database) {
  const programs = FIXTURE_PROGRAMS.map((p) => ({
    ...p,
    id: programId(p.slug),
  }));
  for (const p of programs) {
    db.insert(program).values(p).run();
    const provId = sourceRecordId("fixtures", `program:${p.slug}`);
    const payload = { kind: "program", value: p };
    db.insert(sourceRecord)
      .values({
        id: provId,
        adapter: "fixtures",
        entityKind: "program",
        entityId: p.id,
        sourceKey: `program:${p.slug}`,
        sourceUrl: p.sourceUrl,
        payloadHash: payloadHash(payload),
        payload: JSON.stringify(payload),
      })
      .run();
  }

  const programIdBySlug = new Map(programs.map((p) => [p.slug, p.id]));

  const rounds = FIXTURE_ROUNDS.map((r) => {
    const pid = programIdBySlug.get(r.programSlug);
    if (!pid)
      throw new Error(`fixture round refs unknown program ${r.programSlug}`);
    return {
      id: roundId(pid, r.slug),
      programId: pid,
      slug: r.slug,
      name: r.name,
      openedAt: r.openedAt,
      closedAt: r.closedAt,
      totalPoolUsdCents: r.totalPoolUsdCents,
      sourceUrl: r.sourceUrl,
    };
  });
  for (const r of rounds) {
    db.insert(round).values(r).run();
  }
  const roundIdByKey = new Map(
    rounds.map((r, i) => [
      `${FIXTURE_ROUNDS[i].programSlug}/${FIXTURE_ROUNDS[i].slug}`,
      r.id,
    ]),
  );

  const grantees = FIXTURE_GRANTEES.map((g) => ({
    ...g,
    id: granteeId(g.slug),
    social: null,
  }));
  for (const g of grantees) {
    db.insert(grantee).values(g).run();
  }
  const granteeIdBySlug = new Map(grantees.map((g) => [g.slug, g.id]));

  const grants = FIXTURE_GRANTS.map((g) => {
    const rid = roundIdByKey.get(`${g.programSlug}/${g.roundSlug}`);
    const gid = granteeIdBySlug.get(g.granteeSlug);
    if (!rid)
      throw new Error(`fixture grant refs unknown round ${g.roundSlug}`);
    if (!gid)
      throw new Error(`fixture grant refs unknown grantee ${g.granteeSlug}`);
    return {
      id: grantId(rid, gid),
      roundId: rid,
      granteeId: gid,
      amountUsdCents: g.amountUsdCents,
      currencyNative: null,
      amountNative: null,
      awardedAt: g.awardedAt,
      sourceUrl: g.sourceUrl,
    };
  });
  for (const g of grants) {
    db.insert(grant).values(g).run();
  }

  return {
    programs,
    rounds,
    grantees,
    grants,
  };
}
