// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Static metadata for Gitcoin Grants rounds we ingest (GR15+).
//
// Sources (round close announcements + public results pages):
//   - GR15: https://gitcoin.co/blog/gitcoin-grants-round-15-recap/
//   - GR16: https://gitcoin.co/blog/gitcoin-grants-round-16-results/
//   - GR17: https://gitcoin.co/blog/gitcoin-grants-round-17-recap/
//   - GR18: https://grants.gitcoin.co/gr18
//   - GR19: https://grants.gitcoin.co/gr19
//   - GR20: https://grants.gitcoin.co/gr20
//
// Pool totals are matching-pool USD distributed (not the announced cap), as
// reported in the round close posts. They are used to populate
// `round.total_pool_usd_cents` and to flag rounds where per-project amounts
// don't sum to the pool (a coverage gap we surface in the README).
//
// New rounds should be appended here; the adapter is otherwise data-driven.

export interface GitcoinRoundMeta {
  /** Round number. */
  round: number;
  /** Slug used in canonical id, e.g. "gr15". */
  slug: string;
  /** Display name on the canonical `round` row. */
  name: string;
  openedAt: string;
  closedAt: string;
  /** Total matching pool distributed, in USD cents. */
  totalPoolUsdCents: number;
  /** Canonical source URL for the round. */
  sourceUrl: string;
}

export const GITCOIN_ROUNDS: ReadonlyArray<GitcoinRoundMeta> = [
  {
    round: 15,
    slug: "gr15",
    name: "Gitcoin Grants Round 15",
    openedAt: "2022-09-07T00:00:00Z",
    closedAt: "2022-09-22T00:00:00Z",
    totalPoolUsdCents: 1_500_000_00, // $1.5M matching pool
    sourceUrl: "https://gitcoin.co/blog/gitcoin-grants-round-15-recap/",
  },
  {
    round: 16,
    slug: "gr16",
    name: "Gitcoin Grants Round 16",
    openedAt: "2023-01-17T00:00:00Z",
    closedAt: "2023-01-31T00:00:00Z",
    totalPoolUsdCents: 1_500_000_00, // $1.5M matching pool
    sourceUrl: "https://gitcoin.co/blog/gitcoin-grants-round-16-results/",
  },
  {
    round: 17,
    slug: "gr17",
    name: "Gitcoin Grants Round 17 (Beta)",
    openedAt: "2023-04-25T00:00:00Z",
    closedAt: "2023-05-09T00:00:00Z",
    totalPoolUsdCents: 800_000_00, // $800k Beta round
    sourceUrl: "https://gitcoin.co/blog/gitcoin-grants-round-17-recap/",
  },
  {
    round: 18,
    slug: "gr18",
    name: "Gitcoin Grants Round 18",
    openedAt: "2023-08-15T00:00:00Z",
    closedAt: "2023-08-29T00:00:00Z",
    totalPoolUsdCents: 600_000_00, // ~$600k across rounds in GR18
    sourceUrl: "https://grants.gitcoin.co/gr18",
  },
  {
    round: 19,
    slug: "gr19",
    name: "Gitcoin Grants Round 19",
    openedAt: "2023-11-15T00:00:00Z",
    closedAt: "2023-11-29T00:00:00Z",
    totalPoolUsdCents: 750_000_00, // ~$750k
    sourceUrl: "https://grants.gitcoin.co/gr19",
  },
  {
    round: 20,
    slug: "gr20",
    name: "Gitcoin Grants Round 20",
    openedAt: "2024-04-23T00:00:00Z",
    closedAt: "2024-05-07T00:00:00Z",
    totalPoolUsdCents: 700_000_00, // ~$700k
    sourceUrl: "https://grants.gitcoin.co/gr20",
  },
] as const;

/** Round metadata lookup. Throws if `round` is not in the GR15+ scope. */
export function roundMeta(round: number): GitcoinRoundMeta {
  const meta = GITCOIN_ROUNDS.find((r) => r.round === round);
  if (!meta) {
    throw new Error(
      `unknown or out-of-scope Gitcoin round: ${round} (supported: ${GITCOIN_ROUNDS.map((r) => r.round).join(", ")})`,
    );
  }
  return meta;
}

/**
 * Parse a USD amount string (e.g. "1234.56", "1,234", "$1234.5") into
 * integer cents. Throws on negative or non-numeric input.
 *
 * Done as fixed-point string parsing rather than `parseFloat` to avoid
 * IEEE-754 rounding (e.g. 0.1 + 0.2). Some upstream rows quote with three
 * fractional digits; we round half-up to two for the canonical cents value.
 */
export function usdAmountToCents(amountUsd: string): number {
  const cleaned = amountUsd.trim().replace(/[$,]/g, "");
  if (cleaned === "") {
    throw new Error(`invalid USD amount: ${JSON.stringify(amountUsd)}`);
  }
  if (cleaned.startsWith("-")) {
    throw new Error(`negative USD amount not allowed: ${amountUsd}`);
  }
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`invalid USD amount: ${JSON.stringify(amountUsd)}`);
  }
  const [whole, frac = ""] = cleaned.split(".");
  // Use 4-digit fractional precision so we can round half-up at the 3rd
  // decimal place deterministically (instead of relying on Math.round on a
  // float). 100ths digit position is fracPadded[1].
  const fracPadded = (frac + "0000").slice(0, 4);
  const fourDp = BigInt(whole) * 10_000n + BigInt(fracPadded);
  // Round half-up at the 2-decimal boundary: divide by 100 (cents → 1/10000),
  // i.e. shift from 4dp to 2dp.
  const rounded = (fourDp + 50n) / 100n;
  // Pool/grant totals are well under 2^53.
  return Number(rounded);
}
