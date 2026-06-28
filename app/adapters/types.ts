// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Adapter contract.
//
// An adapter knows how to fetch upstream records for one grants program and
// normalize them into the canonical schema (program / round / grantee / grant)
// plus a `source_record` row per upstream record for provenance.
//
// Design notes:
//   - Adapters are pure functions of their input source (a fixture directory
//     or a remote endpoint). They return a normalized batch; persistence is
//     centralized so we can re-use the same upsert path across adapters.
//   - Every normalized entity carries the `sourceKey` it was derived from so
//     the persistence layer can write the provenance row.
//   - `coverage` reports the adapter's *self-declared* completeness so the
//     dataset metadata + README can flag partial coverage without us having
//     to guess after the fact.

export type Adapter = {
  /** Stable adapter name. Used as `source_record.adapter`. */
  readonly name: string;
  /** Run the adapter and return its normalized batch + coverage report. */
  ingest(options?: AdapterRunOptions): Promise<AdapterBatch>;
};

export type AdapterRunOptions = {
  /**
   * Override the directory the adapter reads source fixtures from. Used in
   * tests to point at a small synthetic dataset.
   */
  dataDir?: string;
};

export type AdapterBatch = {
  programs: NormalizedProgram[];
  rounds: NormalizedRound[];
  grantees: NormalizedGrantee[];
  grants: NormalizedGrant[];
  coverage: CoverageReport;
};

/**
 * Self-reported coverage and known gaps for a single adapter run. Persisted
 * into `data/<adapter>/coverage.json` and surfaced in dataset metadata so
 * downstream consumers can tell which fields are partial.
 */
export type CoverageReport = {
  adapter: string;
  /**
   * Free-form completeness label, intentionally coarse. One of:
   *   "complete"     — adapter believes it has all public records
   *   "best-effort"  — adapter ingested what it could; gaps expected
   *   "partial"      — adapter only covers a documented subset
   */
  completeness: "complete" | "best-effort" | "partial";
  /** Total upstream records the adapter attempted to ingest. */
  recordsAttempted: number;
  /** Successfully normalized records. */
  recordsNormalized: number;
  /**
   * Known schema gaps that callers should be aware of. Each gap names the
   * canonical field and explains why it is missing or imputed for this
   * adapter's slice of the dataset.
   */
  knownGaps: SchemaGap[];
  /** Free-form notes for human consumers (rendered in README + metadata). */
  notes: string[];
};

export type SchemaGap = {
  /** Dotted canonical path, e.g. "grant.amountUsdCents" or "round". */
  field: string;
  /**
   * One of:
   *   "missing"  — field is null/zero for some/all rows
   *   "imputed"  — field is filled with an adapter-provided placeholder
   *   "absent"   — the entire concept is absent upstream (e.g. ESP has no rounds)
   */
  kind: "missing" | "imputed" | "absent";
  /** Short, human-readable explanation surfaced in dataset metadata. */
  reason: string;
};

// ---- normalized shapes (pre-id) -------------------------------------------
//
// Adapters return canonical-schema-shaped objects without ids. The persistence
// layer derives ids deterministically from the slug fields below before
// upserting.

export type NormalizedProgram = {
  slug: string;
  name: string;
  url?: string | null;
  license?: string | null;
  sourceUrl?: string | null;
  sourceKey: string;
  sourcePayload: unknown;
};

export type NormalizedRound = {
  programSlug: string;
  slug: string;
  name: string;
  openedAt?: string | null;
  closedAt?: string | null;
  totalPoolUsdCents?: number | null;
  sourceUrl?: string | null;
  sourceKey: string;
  sourcePayload: unknown;
};

export type NormalizedGrantee = {
  slug: string;
  name: string;
  githubOrg?: string | null;
  website?: string | null;
  social?: Record<string, string> | null;
  sourceKey: string;
  sourcePayload: unknown;
};

export type NormalizedGrant = {
  programSlug: string;
  roundSlug: string;
  granteeSlug: string;
  /**
   * Required by the canonical schema. Adapters whose upstream does not
   * disclose amounts MUST set this to 0 AND record a "missing" gap on
   * `grant.amountUsdCents` so the dataset metadata flags it.
   */
  amountUsdCents: number;
  /**
   * Whether the upstream actually disclosed an amount. Persisted into the
   * source_record payload so consumers can distinguish "we know it was zero"
   * from "we don't know what it was".
   */
  amountDisclosed: boolean;
  currencyNative?: string | null;
  amountNative?: string | null;
  awardedAt?: string | null;
  sourceUrl?: string | null;
  sourceKey: string;
  sourcePayload: unknown;
};
