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

  const result = spawnSync('node', ['--require', 'tsx/cjs', '--test', ...testFiles], {
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
