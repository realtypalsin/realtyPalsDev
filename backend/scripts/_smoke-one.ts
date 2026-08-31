import 'dotenv/config'
const ENDPOINT = 'http://localhost:3001/api/v1/chat'
const message = process.argv.slice(2).join(' ')
;(async () => {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ guestToken: `one-${Date.now()}-${Math.random().toString(36).slice(2)}`, action: { type: 'TEXT_MESSAGE', payload: { text: message } } }),
  })
  const reader = res.body!.getReader(); const dec = new TextDecoder()
  let buf = '', text = '', event = ''; let chips: string[] = []
  while (true) { const { done, value } = await reader.read(); if (done) break
    buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('event:')) { event = line.slice(6).trim(); continue }
      if (!line.startsWith('data:')) continue
      let d: any; try { d = JSON.parse(line.slice(5).trim()) } catch { continue }
      if (event === 'token' && typeof d.token === 'string') text += d.token
      if (Array.isArray(d.chips) && d.chips.length) chips = d.chips.map((c: any) => c?.label ?? '').filter(Boolean)
    } }
  console.log(text.trim()); console.log(`\nCHIPS (${chips.length}): ${chips.join(' | ') || '(none)'}`)
})()
