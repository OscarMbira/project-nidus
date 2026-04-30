#!/usr/bin/env node
/**
 * PMIS test runner entry (Phase 3). Invoked by CI or local: `node test-runner/runner.mjs --run <id>`
 * Full TypeScript adapters: extend with playwright-adapter, vitest-adapter, evidence-uploader.
 */
console.log('test-runner: use SQL v493-498 + apply migrations; then wire processTestRunCompletion in CI.')
