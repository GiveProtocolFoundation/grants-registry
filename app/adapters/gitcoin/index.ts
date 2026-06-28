// Copyright 2024 Give Protocol Foundation
// SPDX-License-Identifier: Apache-2.0
//
// Gitcoin Grants adapter — entry point.
//
// Reads round snapshots from `data/sources/gitcoin-grants/*.json` (override
// via `AdapterRunOptions.dataDir`) and produces a canonical `AdapterBatch`.
// Persistence and idempotency are handled by the shared `persistAdapterBatch`
// path: every entity id is content-hashed from upstream keys so re-running
// the adapter against the same input is a no-op at the row level.

import type { Adapter, AdapterBatch, AdapterRunOptions } from "../types";
import { loadSnapshots } from "./load";
import { GITCOIN_ADAPTER_NAME, normalize } from "./normalize";

export const gitcoinGrantsAdapter: Adapter = {
  name: GITCOIN_ADAPTER_NAME,
  async ingest(options: AdapterRunOptions = {}): Promise<AdapterBatch> {
    const snapshots = loadSnapshots(options.dataDir);
    return normalize(snapshots);
  },
};

export { GITCOIN_ADAPTER_NAME, GITCOIN_PROGRAM_SLUG } from "./normalize";
export { GITCOIN_ROUNDS, roundMeta, usdAmountToCents } from "./round-meta";
export { normalize } from "./normalize";
export { loadSnapshots } from "./load";
export type { GitcoinRoundSnapshot, GitcoinProjectRow } from "./types";
