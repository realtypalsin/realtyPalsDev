// Targeted smoke over the shapes this session changed. Live endpoint.
import 'dotenv/config'

const ENDPOINT = process.env.CHAT_ENDPOINT || 'http://localhost:3001/api/v1/chat'

const QUERIES = [
  ['citywide',     'Which is the best project in Noida?'],
  ['citywide',     'What is the cheapest society I can buy right now?'],
  ['posh-sector',  'Where do the richest people in Noida live?'],
  ['entity',       'What do you think of Investors Clinic?'],
  ['entity',       'What do you think of Wealth Clinic?'],
  ['party-cat',    'Which is the best broker in Noida?'],
  ['yield',        'What is the rental yield in Noida?'],
  ['appreciation', 'How much has Godrej Woods appreciated?'],
  ['affordability','I earn 2 lakh a month, what can I afford?'],
  ['meta',         'What have I told you about myself so far?'],
  ['flood',        'Is Sector 135 flood prone?'],
  ['coverage',     'Do you have anything in Gurgaon?'],
]

async function ask(message: string) {
  const t0 = Date.now()
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ guestToken: `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`, action: { type: 'TEXT_MESSAGE', payload: { text: message } } }),
  })
  if (!res.ok || !res.body) return { text: `HTTP ${res.status}`, chips: [] as string[], ms: Date.now() - t0 }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let text = ''
  let chips: string[] = []
  let event = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('event:')) { event = line.slice(6).trim(); continue }
      if (!line.startsWith('data:')) continue
      let d: any
      try { d = JSON.parse(line.slice(5).trim()) } catch { continue }
      if (event === 'token' && typeof d.token === 'string') text += d.token
      if (Array.isArray(d.chips) && d.chips.length) chips = d.chips.map((c: any) => c?.label ?? '').filter(Boolean)
    }
  }
  return { text, chips, ms: Date.now() - t0 }
}

;(async () => {
  for (const [kind, q] of QUERIES) {
    const r = await ask(q)
    console.log('\n' + '='.repeat(78))
    console.log(`[${kind}] ${q}   (${(r.ms / 1000).toFixed(1)}s)`)
    console.log('-'.repeat(78))
    console.log(r.text.trim().slice(0, 1600))
    console.log(`\nCHIPS (${r.chips.length}): ${r.chips.join('  |  ') || '(none)'}`)
  }
})()
