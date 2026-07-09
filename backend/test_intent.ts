import { extractIntent } from './src/lib/ai/intent'

async function run() {
  const intent = await extractIntent('show me 3 bhk flat in sector 78 noida under 3cr', {})
  console.log(JSON.stringify(intent, null, 2))
}

run().catch(console.error).finally(() => process.exit(0))
