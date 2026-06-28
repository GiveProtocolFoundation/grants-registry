#!/usr/bin/env bash
# Local quality gate — mirrors the CI workflow.
# Run this before pushing.
set -euo pipefail

echo "→ typecheck"
npm run typecheck

echo "→ test"
npm run test

echo "→ build"
npm run build

echo "✓ All checks passed"
