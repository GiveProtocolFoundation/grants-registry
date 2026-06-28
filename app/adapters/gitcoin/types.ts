// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Public, source-shaped input types for the Gitcoin Grants adapter.
//
// Coverage scope: GR15 and later. Earlier rounds had a different schema and
// far less consistent reporting; we cite them in `docs/SOURCES.md` as out of
// scope for v0.
//
// Source shape rationale: we accept a pre-fetched JSON snapshot per round
// (`data/sources/gitcoin/gr{N}.json`) rather than scraping live endpoints so
// the data is reviewable alongside code and re-ingest is deterministic. The
// snapshot shape mirrors the fields Gitcoin publishes in its public results
// pages and Allo / Grants Stack indexer payloads.

/**
 * One funded project in a Gitcoin round, as exposed by the upstream snapshot.
 *
 * Required fields are kept to the minimum that the upstream consistently
 * publishes from GR15 onward. Optional fields are filled when available.
 */
export interface GitcoinProjectRow {
  /**
   * Upstream-stable id for this project within this round. For Allo-era
   * rounds this is the application id; for legacy rounds it's the project
   * slug. Used as the natural key for `source_record.source_key`.
   */
  upstreamId: string;
  /** Display name of the project / team. */
  projectName: string;
  /**
   * Total awarded for this project in the round, in USD. Stored as a string
   * to preserve the upstream representation (some snapshots quote with
   * fractional cents). Parsed into integer cents during normalization.
   */
  amountUsd: string;
  /** Optional grantee website. */
  website?: string;
  /** Optional GitHub org/login. */
  githubOrg?: string;
  /** Optional Twitter / X handle (without the leading @). */
  twitter?: string;
  /** Optional permanent project page on Gitcoin / Grants Stack. */
  projectUrl?: string;
}

/**
 * A snapshot of one Gitcoin round. Round-level metadata is required so the
 * adapter can produce a complete `round` row without external lookups.
 */
export interface GitcoinRoundSnapshot {
  /** Round number, e.g. 15, 16, 17, 18, 19, 20. */
  round: number;
  /** Round open date ISO 8601, optional but recommended. */
  openedAt?: string;
  /** Round close date ISO 8601. Used as `grant.awarded_at` for all projects. */
  closedAt: string;
  /** Source URL the snapshot was pulled from. */
  sourceUrl: string;
  /**
   * Total matching pool distributed in this round, in USD cents. Optional
   * because some rounds publish only per-project amounts.
   */
  totalPoolUsdCents?: number;
  /** Funded projects. */
  projects: GitcoinProjectRow[];
}

/**
 * Summary returned after running the adapter. Used by the CLI and tests to
 * assert idempotency and coverage.
 */
export interface GitcoinIngestResult {
  /** Canonical id of the Gitcoin Grants program row. */
  programId: string;
  /** Per-round counts after ingest, keyed by round number. */
  perRound: Record<
    number,
    {
      roundId: string;
      projectsIngested: number;
      sourceRecordsWritten: number;
    }
  >;
}
