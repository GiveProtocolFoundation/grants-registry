// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";

import {
  GITCOIN_ADAPTER_NAME,
  GITCOIN_PROGRAM_SLUG,
  normalize,
} from "../../../app/adapters/gitcoin";
import type { GitcoinRoundSnapshot } from "../../../app/adapters/gitcoin";

const gr15: GitcoinRoundSnapshot = {
  round: 15,
  closedAt: "2022-09-22T00:00:00Z",
  sourceUrl: "https://gitcoin.co/blog/gitcoin-grants-round-15-recap/",
  projects: [
    {
      upstreamId: "p1",
      projectName: "ethers.js",
      amountUsd: "100",
      githubOrg: "ethers-io",
    },
    {
      upstreamId: "p2",
      projectName: "wagmi",
      amountUsd: "50",
      githubOrg: "wevm",
    },
  ],
};

const gr18: GitcoinRoundSnapshot = {
  round: 18,
  closedAt: "2023-08-29T00:00:00Z",
  sourceUrl: "https://grants.gitcoin.co/gr18",
  projects: [
    {
      upstreamId: "p2-r18",
      projectName: "wagmi",
      amountUsd: "200",
      githubOrg: "wevm",
    },
  ],
};

describe("gitcoin normalize", () => {
  it("emits exactly one program (gitcoin-grants)", () => {
    const batch = normalize([gr15]);
    expect(batch.programs).toHaveLength(1);
    expect(batch.programs[0].slug).toBe(GITCOIN_PROGRAM_SLUG);
    expect(batch.coverage.adapter).toBe(GITCOIN_ADAPTER_NAME);
  });

  it("emits one round per snapshot with meta-filled fields", () => {
    const batch = normalize([gr15, gr18]);
    expect(batch.rounds).toHaveLength(2);
    const r15 = batch.rounds.find((r) => r.slug === "gr15")!;
    expect(r15.programSlug).toBe(GITCOIN_PROGRAM_SLUG);
    expect(r15.name).toMatch(/Round 15/);
    expect(r15.totalPoolUsdCents).toBeGreaterThan(0);
  });

  it("deduplicates grantees by canonical slug across rounds", () => {
    const batch = normalize([gr15, gr18]);
    const slugs = batch.grantees.map((g) => g.slug).sort();
    // wagmi appears in both rounds; only one grantee row.
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(
      [...new Set(["ethers-io", "wevm"].map((s) => s))].sort(),
    );
  });

  it("emits one grant per (round, project) even when grantee repeats", () => {
    const batch = normalize([gr15, gr18]);
    expect(batch.grants).toHaveLength(3);
    const wagmiGrants = batch.grants.filter((g) => g.granteeSlug === "wevm");
    expect(wagmiGrants).toHaveLength(2);
    const rounds = wagmiGrants.map((g) => g.roundSlug).sort();
    expect(rounds).toEqual(["gr15", "gr18"]);
  });

  it("parses USD amounts into cents", () => {
    const batch = normalize([gr15]);
    const ethers = batch.grants.find((g) => g.granteeSlug === "ethers-io")!;
    expect(ethers.amountUsdCents).toBe(10_000);
    expect(ethers.amountDisclosed).toBe(true);
  });

  it("falls back to a slug derived from name+id when no githubOrg", () => {
    const snapshot: GitcoinRoundSnapshot = {
      round: 15,
      closedAt: "2022-09-22T00:00:00Z",
      sourceUrl: "https://example.test",
      projects: [
        {
          upstreamId: "abc123",
          projectName: "Anon DAO",
          amountUsd: "10",
        },
      ],
    };
    const batch = normalize([snapshot]);
    expect(batch.grantees).toHaveLength(1);
    expect(batch.grantees[0].slug).toBe("anon-dao-abc123");
    expect(batch.grantees[0].githubOrg).toBeNull();
  });

  it("records a coverage gap for unparseable amounts and keeps the row", () => {
    const snapshot: GitcoinRoundSnapshot = {
      round: 15,
      closedAt: "2022-09-22T00:00:00Z",
      sourceUrl: "https://example.test",
      projects: [
        {
          upstreamId: "blank",
          projectName: "Mystery",
          amountUsd: "",
          githubOrg: "mystery-org",
        },
      ],
    };
    const batch = normalize([snapshot]);
    expect(batch.grants).toHaveLength(1);
    expect(batch.grants[0].amountUsdCents).toBe(0);
    expect(batch.grants[0].amountDisclosed).toBe(false);
    expect(batch.coverage.completeness).toBe("best-effort");
    expect(batch.coverage.knownGaps).toHaveLength(1);
    expect(batch.coverage.knownGaps[0].field).toBe("grant.amountUsdCents");
    expect(batch.coverage.recordsAttempted).toBe(1);
    expect(batch.coverage.recordsNormalized).toBe(1);
  });

  it("is deterministic — same input → same batch", () => {
    const a = normalize([gr15, gr18]);
    const b = normalize([gr15, gr18]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("includes a stable sourceKey on every entity for provenance", () => {
    const batch = normalize([gr15]);
    expect(batch.programs[0].sourceKey).toBe("program:gitcoin-grants");
    expect(batch.rounds[0].sourceKey).toBe("round:gr15");
    for (const g of batch.grantees) expect(g.sourceKey).toMatch(/^grantee:/);
    for (const g of batch.grants) {
      expect(g.sourceKey).toMatch(/^grant:gr15:/);
    }
  });
});
