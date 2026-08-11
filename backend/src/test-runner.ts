import { glob } from 'glob'
import { spawnSync } from 'child_process'
import path from 'path'

async function runTests() {
  const testFiles = await glob('src/**/*.test.ts', {
    absolute: true,
    cwd: process.cwd(),
  })

  if (testFiles.length === 0) {
    console.error('No test files found')
    process.exit(1)
  }

  // Run tests with concurrency limit to prevent DB connection pool exhaustion
  // Default Node test runner runs 4 tests in parallel; we reduce to 1 for DB tests
  const result = spawnSync('node', [
    '--require', 'tsx/cjs',
    '--test',
    '--test-concurrency=1',  // Sequential execution to prevent DB connection exhaustion
    ...testFiles
  ], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: 'test' },
  })

  process.exit(result.status ?? 1)
}

runTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
