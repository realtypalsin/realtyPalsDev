import 'dotenv/config'
import { webSearch } from '../src/lib/web'
async function main() {
  const r = await webSearch('Investors Clinic Noida real estate', 4, { restrictDomains: false })
  console.log('LEN', r.length)
  console.log(r.slice(0, 1500))
}
main()
