// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Pure normalization: GitcoinRoundSnapshot[] → canonical AdapterBatch.
//
// This module has no I/O. The file/HTTP loader hands it an array of
// already-parsed round snapshots; it returns the canonical batch the shared
// `persistAdapterBatch` knows how to write. Keeping I/O out of here means
// tests can drive every code path with in-memory fixtures.

import { slugify } from "../../db/ids";
import type {
  AdapterBatch,
  CoverageReport,
  NormalizedGrant,
  NormalizedGrantee,
  NormalizedProgram,
  NormalizedRound,
  SchemaGap,
} from "../types";
import { roundMeta, usdAmountToCents } from "./round-meta";
import type { GitcoinProjectRow, GitcoinRoundSnapshot } from "./types";

/** Canonical adapter name. Also used as `source_record.adapter`. */
export const GITCOIN_ADAPTER_NAME = "gitcoin-grants";

/** Canonical program slug for Gitcoin Grants. */
export const GITCOIN_PROGRAM_SLUG = "gitcoin-grants";

const GITCOIN_PROGRAM: NormalizedProgram = {
  slug: GITCOIN_PROGRAM_SLUG,
  name: "Gitcoin Grants",
  url: "https://grants.gitcoin.co",
  license: "CC-BY-4.0",
  sourceUrl: "https://grants.gitcoin.co",
  sourceKey: "program:gitcoin-grants",
  sourcePayload: {
    kind: "program",
    slug: GITCOIN_PROGRAM_SLUG,
    name: "Gitcoin Grants",
  },
};

/**
 * Canonical grantee slug for a Gitcoin project row.
 *
 * We prefer GitHub org when the upstream gives us one (most stable across
 * programs — the same project gets the same slug whether it appears in
 * Gitcoin, RPGF, or EF ESP). Falling back to the project name + upstream id
 * keeps the slug deterministic when no GitHub link is published.
 */
export function granteeSlugFor(project: GitcoinProjectRow): string {
  if (project.githubOrg && project.githubOrg.trim()) {
    return slugify(project.githubOrg);
  }
  const nameSlug = slugify(project.projectName);
  // Suffix with the upstream id so two projects named "DAO" in different
  // rounds don't collide on a single grantee row. Length of the upstream id
  // is bounded by `slugify`'s maxLen.
  return slugify(`${nameSlug} ${project.upstreamId}`);
}

/** Normalize one round into program-relative canonical rows. */
function normalizeRound(
  snapshot: GitcoinRoundSnapshot,
  attempted: { count: number },
  normalized: { count: number },
  gaps: SchemaGap[],
): {
  round: NormalizedRound;
  grantees: NormalizedGrantee[];
  grants: NormalizedGrant[];
} {
  const meta = roundMeta(snapshot.round);

  // Trust the meta defaults but let snapshots override (e.g. corrected dates
  // or per-snapshot pool totals).
  const round: NormalizedRound = {
    programSlug: GITCOIN_PROGRAM_SLUG,
    slug: meta.slug,
    name: meta.name,
    openedAt: snapshot.openedAt ?? meta.openedAt,
    closedAt: snapshot.closedAt ?? meta.closedAt,
    totalPoolUsdCents: snapshot.totalPoolUsdCents ?? meta.totalPoolUsdCents,
    sourceUrl: snapshot.sourceUrl,
    sourceKey: `round:${meta.slug}`,
    sourcePayload: {
      kind: "round",
      round: snapshot.round,
      sourceUrl: snapshot.sourceUrl,
      openedAt: snapshot.openedAt ?? meta.openedAt,
      closedAt: snapshot.closedAt ?? meta.closedAt,
      totalPoolUsdCents:
        snapshot.totalPoolUsdCents ?? meta.totalPoolUsdCents,
    },
  };

  const grantees: NormalizedGrantee[] = [];
  const grants: NormalizedGrant[] = [];
  const seenGrantees = new Set<string>();

  for (const project of snapshot.projects) {
    attempted.count += 1;

    let amountUsdCents: number;
    let amountDisclosed: boolean;
    try {
      amountUsdCents = usdAmountToCents(project.amountUsd);
      amountDisclosed = true;
    } catch {
      // Upstream sometimes leaves the amount blank for rows that only
      // received a token allocation later. Record zero + a gap rather than
      // dropping the project entirely.
      amountUsdCents = 0;
      amountDisclosed = false;
      gaps.push({
        field: "grant.amountUsdCents",
        kind: "missing",
        reason: `round=${snapshot.round} project=${project.upstreamId} amount=${JSON.stringify(project.amountUsd)} could not be parsed`,
      });
    }

    const granteeSlug = granteeSlugFor(project);

    if (!seenGrantees.has(granteeSlug)) {
      seenGrantees.add(granteeSlug);
      const social: Record<string, string> = {};
      if (project.twitter) social.twitter = project.twitter;
      grantees.push({
        slug: granteeSlug,
        name: project.projectName,
        githubOrg: project.githubOrg ?? null,
        website: project.website ?? null,
        social: Object.keys(social).length > 0 ? social : null,
        sourceKey: `grantee:${granteeSlug}`,
        sourcePayload: {
          kind: "grantee",
          slug: granteeSlug,
          name: project.projectName,
          githubOrg: project.githubOrg ?? null,
          website: project.website ?? null,
          twitter: project.twitter ?? null,
          firstSeenRound: snapshot.round,
        },
      });
    }

    grants.push({
      programSlug: GITCOIN_PROGRAM_SLUG,
      roundSlug: meta.slug,
      granteeSlug,
      amountUsdCents,
      amountDisclosed,
      currencyNative: null,
      amountNative: null,
      awardedAt: snapshot.closedAt ?? meta.closedAt,
      sourceUrl: project.projectUrl ?? snapshot.sourceUrl,
      sourceKey: `grant:${meta.slug}:${project.upstreamId}`,
      sourcePayload: {
        kind: "grant",
        round: snapshot.round,
        upstreamId: project.upstreamId,
        projectName: project.projectName,
        amountUsd: project.amountUsd,
        projectUrl: project.projectUrl ?? null,
      },
    });

    normalized.count += 1;
  }

  return { round, grantees, grants };
}

/**
 * Normalize a list of round snapshots into a single AdapterBatch.
 *
 * Snapshots may come in any order. Duplicate grantees across rounds are
 * de-duplicated by slug (first occurrence wins for the grantee row; later
 * occurrences still emit their own grant row).
 */
export function normalize(snapshots: GitcoinRoundSnapshot[]): AdapterBatch {
  const attempted = { count: 0 };
  const normalized = { count: 0 };
  const gaps: SchemaGap[] = [];

  const programs: NormalizedProgram[] = [GITCOIN_PROGRAM];
  const rounds: NormalizedRound[] = [];
  const grantees: NormalizedGrantee[] = [];
  const grants: NormalizedGrant[] = [];
  const seenGrantees = new Set<string>();

  for (const snapshot of snapshots) {
    const out = normalizeRound(snapshot, attempted, normalized, gaps);
    rounds.push(out.round);
    for (const g of out.grantees) {
      if (seenGrantees.has(g.slug)) continue;
      seenGrantees.add(g.slug);
      grantees.push(g);
    }
    for (const g of out.grants) grants.push(g);
  }

  const coverage: CoverageReport = {
    adapter: GITCOIN_ADAPTER_NAME,
    completeness: gaps.length === 0 ? "complete" : "best-effort",
    recordsAttempted: attempted.count,
    recordsNormalized: normalized.count,
    knownGaps: gaps,
    notes: [
      "Coverage scope: GR15 and later. Earlier rounds excluded by design.",
      "Per-project USD amounts are the matching-pool distribution as published in the round close announcements.",
    ],
  };

  return { programs, rounds, grantees, grants, coverage };
}
