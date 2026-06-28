// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Filesystem loader for Gitcoin round snapshots.
//
// Convention: `<dataDir>/<adapter>/<roundSlug>.json` holds the snapshot for
// one round. The default `dataDir` is `data/sources/`. Tests pass a fixture
// directory via `AdapterRunOptions.dataDir`.

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { GITCOIN_ADAPTER_NAME } from "./normalize";
import type { GitcoinRoundSnapshot } from "./types";

const DEFAULT_DATA_DIR = "data/sources";

/**
 * Read every `<dataDir>/gitcoin-grants/*.json` snapshot. Missing directory is
 * treated as zero snapshots so a fresh checkout doesn't crash before fixtures
 * are populated.
 */
export function loadSnapshots(dataDir?: string): GitcoinRoundSnapshot[] {
  const root = join(dataDir ?? DEFAULT_DATA_DIR, GITCOIN_ADAPTER_NAME);
  if (!existsSync(root)) return [];

  const files = readdirSync(root)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const out: GitcoinRoundSnapshot[] = [];
  for (const file of files) {
    const raw = readFileSync(join(root, file), "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(
        `failed to parse ${join(root, file)}: ${(err as Error).message}`,
      );
    }
    out.push(asSnapshot(parsed, file));
  }
  return out;
}

/** Minimal runtime validation so a malformed file fails loudly, not silently. */
function asSnapshot(value: unknown, file: string): GitcoinRoundSnapshot {
  if (!value || typeof value !== "object") {
    throw new Error(`${file}: snapshot must be an object`);
  }
  const v = value as Record<string, unknown>;
  if (typeof v.round !== "number")
    throw new Error(`${file}: snapshot.round must be a number`);
  if (typeof v.closedAt !== "string")
    throw new Error(`${file}: snapshot.closedAt must be a string`);
  if (typeof v.sourceUrl !== "string")
    throw new Error(`${file}: snapshot.sourceUrl must be a string`);
  if (!Array.isArray(v.projects))
    throw new Error(`${file}: snapshot.projects must be an array`);

  // We don't deep-validate every project field — the normalizer accepts the
  // optional/required surface and will throw if required fields are missing.
  return value as GitcoinRoundSnapshot;
}
