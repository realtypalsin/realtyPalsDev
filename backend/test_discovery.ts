import { discoverProjects } from './src/lib/discovery/projects'

async function run() {
  const result = await discoverProjects({
    builderName: "Ace"
  } as any)
  console.log('Exact:', result.exactResults.map(r => r.name))
  console.log('Nearby:', result.nearbyResults.map(r => r.name))
  console.log('Not found:', result.notFoundNames)
}

run().catch(console.error).finally(() => process.exit(0))
