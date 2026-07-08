import { extractIntent } from './src/lib/ai/intent'

async function run() {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    console.log("WARN CATCHED:", ...args);
    originalWarn(...args);
  };
  const intent = await extractIntent('show me ace', {})
  console.log(intent)
}

run().catch(console.error).finally(() => process.exit(0))
