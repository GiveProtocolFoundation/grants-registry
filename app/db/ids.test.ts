// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";

import {
  granteeId,
  grantId,
  payloadHash,
  programId,
  roundId,
  slugify,
  sourceRecordId,
} from "./ids";

describe("slugify", () => {
  it("kebab-cases ascii", () => {
    expect(slugify("Optimism RPGF")).toBe("optimism-rpgf");
  });

  it("strips diacritics", () => {
    expect(slugify("Café Société")).toBe("cafe-societe");
  });

  it("collapses repeated separators", () => {
    expect(slugify("foo   bar---baz")).toBe("foo-bar-baz");
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify("--hello world--")).toBe("hello-world");
  });

  it("caps length without trailing dash", () => {
    const s = slugify("a".repeat(60) + " end", 10);
    expect(s.length).toBeLessThanOrEqual(10);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("content-hash slug ids", () => {
  it("programId is deterministic", () => {
    expect(programId("optimism-rpgf")).toBe(programId("optimism-rpgf"));
  });

  it("programId differs by slug", () => {
    expect(programId("optimism-rpgf")).not.toBe(programId("gitcoin-grants"));
  });

  it("programId has slug prefix + 6-hex hash suffix", () => {
    const id = programId("optimism-rpgf");
    expect(id).toMatch(/^optimism-rpgf-[0-9a-f]{6}$/);
  });

  it("roundId is deterministic given same program id", () => {
    const pid = programId("optimism-rpgf");
    expect(roundId(pid, "rpgf3")).toBe(roundId(pid, "rpgf3"));
  });

  it("roundId differs across programs even with the same round slug", () => {
    const a = roundId(programId("optimism-rpgf"), "round-1");
    const b = roundId(programId("gitcoin-grants"), "round-1");
    expect(a).not.toBe(b);
  });

  it("granteeId is program-agnostic and deterministic", () => {
    expect(granteeId("ethers-js")).toBe(granteeId("ethers-js"));
    expect(granteeId("ethers-js")).not.toBe(granteeId("wagmi"));
  });

  it("grantId is deterministic and differs by grantee", () => {
    const rid = roundId(programId("optimism-rpgf"), "rpgf3");
    const a = grantId(rid, granteeId("ethers-js"));
    const b = grantId(rid, granteeId("wagmi"));
    expect(a).toBe(grantId(rid, granteeId("ethers-js")));
    expect(a).not.toBe(b);
  });

  it("sourceRecordId is deterministic per (adapter, sourceKey)", () => {
    expect(sourceRecordId("optimism-rpgf", "project/foo")).toBe(
      sourceRecordId("optimism-rpgf", "project/foo"),
    );
    expect(sourceRecordId("optimism-rpgf", "project/foo")).not.toBe(
      sourceRecordId("gitcoin-grants", "project/foo"),
    );
  });
});

describe("payloadHash", () => {
  it("is invariant under key order", () => {
    const a = payloadHash({ a: 1, b: 2, c: [1, 2, 3] });
    const b = payloadHash({ c: [1, 2, 3], b: 2, a: 1 });
    expect(a).toBe(b);
  });

  it("differs when values change", () => {
    expect(payloadHash({ a: 1 })).not.toBe(payloadHash({ a: 2 }));
  });

  it("handles nested objects", () => {
    const a = payloadHash({ x: { y: { z: 1 } } });
    const b = payloadHash({ x: { y: { z: 1 } } });
    expect(a).toBe(b);
  });

  it("produces a 64-char sha256 hex digest", () => {
    expect(payloadHash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/);
  });
});
