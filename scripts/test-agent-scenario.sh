#!/bin/bash
# Run agent scenario tests. Forwards to the TypeScript tool.
# Usage: ./scripts/test-agent-scenario.sh run <scenario> <framework> [--provider stripe] [options]
# Example: ./scripts/test-agent-scenario.sh run receive-webhooks express

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"
exec npx tsx tools/agent-scenario-tester/src/index.ts "$@"
