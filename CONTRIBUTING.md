# Contributing

Thanks for considering a contribution to a Give Protocol Foundation project. This document tells you everything you need to land a change.

If anything in here is unclear or wrong, that itself is a contribution worth opening — please file an issue or PR.

## Code of conduct

By participating, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). Violations can be reported per the contact listed there.

## Ways to contribute

- **Report a bug** — open an issue using the bug template.
- **Propose a feature or change** — open an issue first to discuss before writing code, especially for changes that touch the baseline (CI, governance, license).
- **Improve docs** — typo fixes through full rewrites are welcome. No issue required for trivial fixes.
- **Report a security issue** — do *not* open a public issue. Follow [`SECURITY.md`](./SECURITY.md).

## Development setup

Required:

- `git`
- A POSIX shell (`bash`, `zsh`, `dash`, etc.)

Plus the project stack:

- [Node.js](https://nodejs.org/) `>=20`
- [pnpm](https://pnpm.io/) `>=9` (or npm/yarn — pnpm is what CI uses)

```bash
git clone https://github.com/GiveProtocolFoundation/grants-registry.git
cd grants-registry
pnpm install
./scripts/check.sh
pnpm dev   # http://localhost:3000
```

If `check.sh` passes locally, your change has a high chance of passing CI.

## Branching and commits

- Branch off `main`. We do not maintain long-lived feature branches.
- Branch name convention: `<your-handle>/<short-description>`, e.g. `drigobl/fix-readme-typo`.
- Keep commits focused. Squash-on-merge is the default, so commit hygiene inside a PR is less critical than the final PR title and description.
- Commit messages follow the [Conventional Commits](https://www.conventionalcommits.org/) shape:
  - `feat: add dependabot config`
  - `fix: correct license link in README`
  - `docs: clarify branch protection rules`
  - `chore: bump action versions`

## Pull requests

1. Fork the repo (or create a branch directly if you have write access).
2. Make your change. Keep PRs small and reviewable — under ~400 lines diff is a good target.
3. Run `./scripts/check.sh` locally.
4. Open a PR against `main`. Fill in the [PR template](./.github/pull_request_template.md).
5. CI will run automatically. Address any failures.
6. A maintainer will review. Expect questions; the bar is "would an outside contributor reading the diff next month understand it?"
7. Once approved and green, a maintainer merges with squash-and-merge.

We aim to give a first response within a few working days. If a PR has been silent for longer than a week, ping it — that's a process bug on our side.

## Review conventions

- All PRs require **at least one approving review** from a maintainer.
- All required CI checks must be green before merge.
- The author does not merge their own PR unless they are the only maintainer and the change is trivial (typo, doc fix); in that case they note "self-merge: trivial" in the PR description.
- See [`docs/branch-protection.md`](./docs/branch-protection.md) for the enforced rules.

## Style

- Match the surrounding code. If a file uses tabs, use tabs.
- Prefer boring, explicit code over clever code.
- Documentation is part of the change. If your PR changes behavior, update the docs in the same PR.

Linting and formatting rules are enforced by CI once a project picks a language stack. Until then, the baseline enforces only:

- LF line endings, UTF-8 encoding, trim trailing whitespace, final newline (via `.editorconfig`).
- No committed secrets — see [`SECURITY.md`](./SECURITY.md#secret-handling).

## Becoming a maintainer

We add maintainers based on demonstrated trust, not tenure. The path:

1. Land at least 3 non-trivial PRs that were merged with minimal rework.
2. Review at least 3 PRs from other contributors.
3. An existing maintainer nominates you in an issue. Other maintainers have a week to object.
4. If no objections, you get write access and are added to [`README.md`](./README.md#maintainers).

This is intentionally lightweight; the Foundation is small and we add maintainers as needed.

## Licensing of contributions

By submitting a contribution you agree it is licensed under the same terms as the project ([Apache License 2.0](./LICENSE)).

Apache-2.0 includes a contributor patent grant; you do not need to sign a separate CLA.
