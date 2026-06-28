// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Shared persistence path for adapter batches. Derives canonical content-hash
// ids and upserts into the canonical tables. Always writes a `source_record`
// row per upstream record so we can answer "where did this come from?".

import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import {
  granteeId,
  grantId,
  payloadHash,
  programId,
  roundId,
  sourceRecordId,
} from "../db/ids";
import { grant, grantee, program, round, sourceRecord } from "../db/schema";
import type { AdapterBatch } from "./types";

export type PersistResult = {
  programs: number;
  rounds: number;
  grantees: number;
  grants: number;
  sourceRecords: number;
};

/**
 * Persist a normalized adapter batch. The same batch can be replayed against
 * an empty database without error because every id is derived from upstream
 * keys (re-ingest = same id = INSERT OR REPLACE).
 */
export function persistAdapterBatch(
  db: BetterSQLite3Database,
  adapterName: string,
  batch: AdapterBatch,
): PersistResult {
  const result: PersistResult = {
    programs: 0,
    rounds: 0,
    grantees: 0,
    grants: 0,
    sourceRecords: 0,
  };

  // ---- programs ----------------------------------------------------------
  const programIdBySlug = new Map<string, string>();
  for (const p of batch.programs) {
    const id = programId(p.slug);
    programIdBySlug.set(p.slug, id);

    db.insert(program)
      .values({
        id,
        slug: p.slug,
        name: p.name,
        url: p.url ?? null,
        license: p.license ?? null,
        sourceUrl: p.sourceUrl ?? null,
      })
      .onConflictDoUpdate({
        target: program.id,
        set: {
          name: p.name,
          url: p.url ?? null,
          license: p.license ?? null,
          sourceUrl: p.sourceUrl ?? null,
        },
      })
      .run();
    writeSource(db, adapterName, "program", id, p.sourceKey, p.sourceUrl, p.sourcePayload);
    result.programs += 1;
    result.sourceRecords += 1;
  }

  // ---- rounds ------------------------------------------------------------
  const roundIdByKey = new Map<string, string>();
  for (const r of batch.rounds) {
    const pid = programIdBySlug.get(r.programSlug);
    if (!pid) {
      throw new Error(
        `adapter ${adapterName} produced round ${r.slug} for unknown program ${r.programSlug}`,
      );
    }
    const id = roundId(pid, r.slug);
    roundIdByKey.set(`${r.programSlug}/${r.slug}`, id);

    db.insert(round)
      .values({
        id,
        programId: pid,
        slug: r.slug,
        name: r.name,
        openedAt: r.openedAt ?? null,
        closedAt: r.closedAt ?? null,
        totalPoolUsdCents: r.totalPoolUsdCents ?? null,
        sourceUrl: r.sourceUrl ?? null,
      })
      .onConflictDoUpdate({
        target: round.id,
        set: {
          name: r.name,
          openedAt: r.openedAt ?? null,
          closedAt: r.closedAt ?? null,
          totalPoolUsdCents: r.totalPoolUsdCents ?? null,
          sourceUrl: r.sourceUrl ?? null,
        },
      })
      .run();
    writeSource(db, adapterName, "round", id, r.sourceKey, r.sourceUrl, r.sourcePayload);
    result.rounds += 1;
    result.sourceRecords += 1;
  }

  // ---- grantees ----------------------------------------------------------
  const granteeIdBySlug = new Map<string, string>();
  for (const g of batch.grantees) {
    const id = granteeId(g.slug);
    granteeIdBySlug.set(g.slug, id);

    db.insert(grantee)
      .values({
        id,
        slug: g.slug,
        name: g.name,
        githubOrg: g.githubOrg ?? null,
        website: g.website ?? null,
        social: g.social ? JSON.stringify(g.social) : null,
      })
      .onConflictDoUpdate({
        target: grantee.id,
        set: {
          name: g.name,
          githubOrg: g.githubOrg ?? null,
          website: g.website ?? null,
          social: g.social ? JSON.stringify(g.social) : null,
        },
      })
      .run();
    writeSource(db, adapterName, "grantee", id, g.sourceKey, null, g.sourcePayload);
    result.grantees += 1;
    result.sourceRecords += 1;
  }

  // ---- grants ------------------------------------------------------------
  for (const g of batch.grants) {
    const rid = roundIdByKey.get(`${g.programSlug}/${g.roundSlug}`);
    if (!rid) {
      throw new Error(
        `adapter ${adapterName} produced grant for unknown round ${g.programSlug}/${g.roundSlug}`,
      );
    }
    const gid = granteeIdBySlug.get(g.granteeSlug);
    if (!gid) {
      throw new Error(
        `adapter ${adapterName} produced grant for unknown grantee ${g.granteeSlug}`,
      );
    }
    const id = grantId(rid, gid);
    db.insert(grant)
      .values({
        id,
        roundId: rid,
        granteeId: gid,
        amountUsdCents: g.amountUsdCents,
        currencyNative: g.currencyNative ?? null,
        amountNative: g.amountNative ?? null,
        awardedAt: g.awardedAt ?? null,
        sourceUrl: g.sourceUrl ?? null,
      })
      .onConflictDoUpdate({
        target: grant.id,
        set: {
          amountUsdCents: g.amountUsdCents,
          currencyNative: g.currencyNative ?? null,
          amountNative: g.amountNative ?? null,
          awardedAt: g.awardedAt ?? null,
          sourceUrl: g.sourceUrl ?? null,
        },
      })
      .run();
    // Embed the disclosure flag in the provenance payload so downstream
    // consumers can distinguish "we know it was zero" from "amount not
    // disclosed upstream".
    const payload = {
      ...((g.sourcePayload as Record<string, unknown>) ?? {}),
      amount_disclosed: g.amountDisclosed,
    };
    writeSource(db, adapterName, "grant", id, g.sourceKey, g.sourceUrl, payload);
    result.grants += 1;
    result.sourceRecords += 1;
  }

  return result;
}

function writeSource(
  db: BetterSQLite3Database,
  adapter: string,
  entityKind: "program" | "round" | "grantee" | "grant",
  entityId: string,
  sourceKey: string,
  sourceUrl: string | null | undefined,
  payload: unknown,
): void {
  const id = sourceRecordId(adapter, sourceKey);
  const payloadJson = JSON.stringify(payload ?? {});
  db.insert(sourceRecord)
    .values({
      id,
      adapter,
      entityKind,
      entityId,
      sourceKey,
      sourceUrl: sourceUrl ?? null,
      payloadHash: payloadHash(payload ?? {}),
      payload: payloadJson,
    })
    .onConflictDoUpdate({
      target: sourceRecord.id,
      set: {
        entityKind,
        entityId,
        sourceUrl: sourceUrl ?? null,
        payloadHash: payloadHash(payload ?? {}),
        payload: payloadJson,
      },
    })
    .run();
}
