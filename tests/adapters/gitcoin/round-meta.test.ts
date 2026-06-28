// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";

import {
  GITCOIN_ROUNDS,
  roundMeta,
  usdAmountToCents,
} from "../../../app/adapters/gitcoin";

describe("gitcoin round metadata", () => {
  it("declares GR15+ coverage", () => {
    const rounds = GITCOIN_ROUNDS.map((r) => r.round);
    expect(rounds).toEqual([...rounds].sort((a, b) => a - b));
    expect(rounds[0]).toBeGreaterThanOrEqual(15);
  });

  it("looks up known rounds and rejects unknown ones", () => {
    const meta = roundMeta(18);
    expect(meta.slug).toBe("gr18");
    expect(() => roundMeta(14)).toThrow(/out-of-scope/);
    expect(() => roundMeta(999)).toThrow(/unknown/);
  });
});

describe("usdAmountToCents", () => {
  it("parses plain decimals", () => {
    expect(usdAmountToCents("0")).toBe(0);
    expect(usdAmountToCents("1")).toBe(100);
    expect(usdAmountToCents("1.5")).toBe(150);
    expect(usdAmountToCents("1234.56")).toBe(123_456);
  });

  it("strips $ and commas", () => {
    expect(usdAmountToCents("$1,234.56")).toBe(123_456);
    expect(usdAmountToCents("$1,000")).toBe(100_000);
  });

  it("rounds half-up at the cent boundary", () => {
    // 1.235 → 1.24
    expect(usdAmountToCents("1.235")).toBe(124);
    // 1.234 → 1.23
    expect(usdAmountToCents("1.234")).toBe(123);
    // banker-rounding trap: 0.1 + 0.2 floats fail this assertion if you
    // route through parseFloat — confirm we don't.
    expect(usdAmountToCents("0.3")).toBe(30);
  });

  it("rejects malformed inputs", () => {
    expect(() => usdAmountToCents("")).toThrow();
    expect(() => usdAmountToCents("abc")).toThrow();
    expect(() => usdAmountToCents("-5")).toThrow(/negative/);
    expect(() => usdAmountToCents("1.2.3")).toThrow();
  });
});
