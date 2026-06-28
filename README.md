# grants-registry

Canonical open dataset + queryable web UI for public-goods grants across programs (Optimism RPGF, Gitcoin Grants, Ethereum Foundation ESP, and more).

Live at **[grants.giveprotocol.org](https://grants.giveprotocol.org)** (v0 target).

## Scope (v0)

- **Read-only.** No user accounts, no submission flow.
- **Snapshot-based.** Nightly ingest rebuilds the dataset from source.
- **≥3 programs ingested:** Optimism RPGF (rounds 1–4), Gitcoin Grants (GR15+), EF ESP (best-effort).
- **Stable citation URLs:** `/grants/<program>/<round>/<grantee>`
- **Downloadable snapshots:** CSV + Parquet published nightly.

Not in v0: analytics dashboard, user submissions, streaming updates.

## Tech stack

| Layer | Choice |
|---|---|
| Web framework | [Remix](https://remix.run) v2 |
| ORM + migrations | [Drizzle ORM](https://orm.drizzle.team) |
| Database | SQLite (better-sqlite3) via WAL |
| Styling | Tailwind CSS v3 |
| Testing | Vitest + happy-dom |
| Build | Vite |

## Licenses

- **Code** (`app/`, `scripts/`, config files): [Apache-2.0](./LICENSE)
- **Data** (`data/`): [CC BY 4.0](./data/LICENSE)

## Quick start

```bash
node --version  # requires Node >= 20
npm install
npm run db:migrate
npm run dev     # http://localhost:5173
```

## Development

```bash
npm run typecheck      # TypeScript
npm run test           # Vitest
npm run build          # Production build
```

## Data sources

See [docs/SOURCES.md](./docs/SOURCES.md) for per-program provenance and license details.

### Coverage status

| Program | Coverage | Notes |
|---|---|---|
| Optimism RPGF | _scoped (in progress)_ | Rounds 1–4 (see GIV-48). |
| Gitcoin Grants | `complete` for snapshotted rounds, `best-effort` if any rows have undisclosed amounts | GR15+. Adapter at `app/adapters/gitcoin/`. Snapshots live under `data/sources/gitcoin-grants/`. |
| **EF ESP** | **best-effort (partial)** | Curated from public ESP blog posts. **Amounts are usually undisclosed** and ESP has no formal rounds; we synthesize pseudo-rounds. See [data/ef-esp/README.md](./data/ef-esp/README.md). |

> ⚠️ The EF ESP slice is intentionally partial. Treat undisclosed amounts as **unknown**, not zero. Every undisclosed grant carries `amount_disclosed: false` in its `source_record` payload.

## Contributing

Issues and PRs welcome. CLA: by submitting a PR you agree to license your contribution under Apache-2.0 (code) or CC BY 4.0 (data).

---

A [Give Protocol Foundation](https://giveprotocol.org) project.
