// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Deterministic content-hash slug IDs.
//
// Goals:
//   1. Idempotent ingest. Running the same adapter against unchanged source
//      data yields the same ids, so we can upsert without churn.
//   2. Human-readable slugs in URLs (`/grants/<program>/<round>/<grantee>`).
//   3. Collision-resistant via a short content hash suffix.
//
// Shape: `<base-slug>-<hash6>` where:
//   - base-slug is the kebab-cased natural key (e.g. "optimism-rpgf").
//   - hash6 is the first 6 hex chars of SHA-256(canonical-key-string).
//
// 6 hex chars = 24 bits = ~16M values. For our domain (a few thousand grants
// per program) this is comfortably collision-resistant. If we ever hit one
// the unique index on `slug` will surface it loudly.

import { createHash } from "node:crypto";

const HASH_LEN = 6;

/**
 * Slugify a free-form string into kebab-case ASCII.
 *
 * - Lowercases.
 * - Strips diacritics.
 * - Replaces any run of non [a-z0-9] with a single dash.
 * - Trims leading/trailing dashes.
 * - Collapses repeated dashes.
 * - Caps length so the final id is bounded.
 */
export function slugify(input: string, maxLen = 48): string {
  const ascii = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const kebab = ascii
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (kebab.length <= maxLen) return kebab;
  return kebab.slice(0, maxLen).replace(/-$/, "");
}

/**
 * Hash the canonical natural-key parts into a short hex suffix.
 *
 * Parts are joined with a NUL separator (which cannot appear in user input we
 * accept) to avoid ambiguity between e.g. ("foo","bar") and ("fo","obar").
 */
export function contentHash(
  parts: ReadonlyArray<string>,
  len = HASH_LEN,
): string {
  const h = createHash("sha256");
  h.update(parts.join("\u0000"));
  return h.digest("hex").slice(0, len);
}

function compose(base: string, parts: ReadonlyArray<string>): string {
  const slug = slugify(base);
  const hash = contentHash(parts);
  return slug ? `${slug}-${hash}` : hash;
}

// ---- per-entity id helpers -------------------------------------------------
//
// The natural key for each entity is documented inline. Adapters MUST pass
// stable upstream-derived parts so the resulting id is deterministic.

/** Program id: keyed on program slug. */
export function programId(slug: string): string {
  const s = slugify(slug);
  return compose(s, ["program", s]);
}

/** Round id: keyed on (programId, round slug). */
export function roundId(programIdValue: string, roundSlug: string): string {
  const s = slugify(roundSlug);
  return compose(s, ["round", programIdValue, s]);
}

/**
 * Grantee id: keyed on canonical grantee slug. We deliberately do NOT key on
 * (programId, slug) because the same grantee can receive grants across many
 * programs and we want one grantee row per project.
 */
export function granteeId(canonicalSlug: string): string {
  const s = slugify(canonicalSlug);
  return compose(s, ["grantee", s]);
}

/** Grant id: keyed on (roundId, granteeId). One grant per (round, grantee). */
export function grantId(roundIdValue: string, granteeIdValue: string): string {
  // Use a short readable base (grantee slug fragment) plus the full hash so
  // the grant id is recognizable in URLs while still unique.
  const granteeBase = granteeIdValue.replace(/-[^-]+$/, "");
  return compose(granteeBase, ["grant", roundIdValue, granteeIdValue]);
}

/**
 * Source record id: keyed on (adapter, sourceKey). One provenance row per
 * upstream record per adapter. Re-ingest produces the same id, enabling
 * upsert-by-id semantics.
 */
export function sourceRecordId(adapter: string, sourceKey: string): string {
  return compose(slugify(adapter), ["source", adapter, sourceKey]);
}

/**
 * Stable hex digest of a JSON-serializable payload, used as `payload_hash`
 * on `source_record`. Keys are sorted recursively so the hash is invariant
 * under key ordering changes from the adapter.
 */
export function payloadHash(payload: unknown): string {
  const canonical = canonicalJson(payload);
  return createHash("sha256").update(canonical).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`,
  );
  return `{${parts.join(",")}}`;
}
