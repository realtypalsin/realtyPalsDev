// backend/scripts/live-chat-test-eval.ts
import http from 'http'

interface ChatResponse {
  tokens: string[]
  fullText: string
  chips: any[]
  intent: any
  intentState: string
  sessionId: string
}

function sendChatMessage(message: string, sessionId?: string): Promise<ChatResponse> {
  return new Promise((resolve, reject) => {
    // The route reads the question from action.payload.text — BodySchema keeps
    // text/query/label and drops everything else, including a top-level
    // `message`. Sending `payload: { message }` posted an empty question on
    // every call, so every result this script has ever produced was the
    // server's reply to "".
    const payload = JSON.stringify({
      sessionId,
      action: { type: 'TEXT_MESSAGE', payload: { text: message } },
    })

    const req = http.request(
      'http://localhost:3001/api/v1/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Accept': 'text/event-stream',
        },
      },
      (res) => {
        let buffer = ''
        const tokens: string[] = []
        let chips: any[] = []
        let intent: any = {}
        let intentState = ''
        let resSessionId = sessionId || ''

        let currentEvent = 'message'
        res.on('data', (chunk) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith('event: ')) {
              currentEvent = trimmed.slice(7).trim()
            } else if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6))
                if (currentEvent === 'token' || data.token) {
                  tokens.push(data.token || '')
                } else if (currentEvent === 'chips' || data.chips) {
                  chips = data.chips || []
                } else if (currentEvent === 'done' || data.intent) {
                  intent = data.intent
                  intentState = data.intentState
                  if (data.sessionId) resSessionId = data.sessionId
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        })

        res.on('end', () => {
          resolve({
            tokens,
            fullText: tokens.join(''),
            chips,
            intent,
            intentState,
            sessionId: resSessionId,
          })
        })
      }
    )

    req.on('error', (err) => reject(err))
    req.write(payload)
    req.end()
  })
}

async function runLiveEvaluation() {
  console.log('================================================================================')
  console.log('🏛️  REAL ESTATE CHATBOT LIVE EVALUATION (CLAUDE-LEVEL CONSULTATIVE FIDUCIARY) 🏛️')
  console.log('================================================================================\n')

  const testCases = [
    {
      id: 1,
      persona: 'The Relocator / City-Switcher',
      query: 'I am moving to Noida. I am looking to purchase a flat in Noida. Tell me some good areas in Noida, just like someone who is relocating.',
      evalCriteria: [
        'Does NOT say "Which project are you asking about?" (No project hijacking)',
        'Welcomes and orients user across 2-3 distinct micro-markets (Expressway, Central, Gr. Noida West)',
        'Asks a progressive follow-up question (Commute hub / Family priority)',
        'Offers relevant corridor / commute quick-reply chips',
      ],
    },
    {
      id: 2,
      persona: 'The Young Achiever (Rent vs Buy)',
      query: 'I am 26, working in tech in Sector 137, and paying ₹45k rent. I have ₹25 lakhs saved. Does it make sense to buy a flat in Noida right now or keep renting?',
      evalCriteria: [
        'Analyzes financial trade-off (EMI outgo vs Rent inflation vs Equity)',
        'Considers down payment and hidden on-road costs',
        'Suggests actionable next steps without pushy sales tone',
      ],
    },
    {
      id: 3,
      persona: 'The Multi-Gen Family Purchaser (Space vs Budget)',
      query: 'I am looking for a spacious 3 BHK in Sector 75 for my family. My budget is around 1.3 Crore. Show me what you have.',
      evalCriteria: [
        'Challenges the ₹1.3 Cr budget in Sector 75 mathematically (avg ₹13,700/sqft vs space)',
        'Suggests adjacent value sector arbitrage (Sector 76 for 1300-1400 sqft)',
        'Mentions livability factors like Ganga water or maintenance OpEx',
      ],
    },
    {
      id: 4,
      persona: 'The Yield-Focused Investor',
      query: 'I have ₹1.5 Cr to invest in Noida. Should I buy a residential 2BHK in Sector 75 or look at commercial retail for rental yield?',
      evalCriteria: [
        'Compares residential rental yield (2.5-3.5%) vs commercial retail yield (6-8%)',
        'Cites macro catalysts (Jewar Airport 2026, FAR 4.0 policy)',
        'Provides yield-oriented action chips',
      ],
    },
    {
      id: 5,
      persona: 'The Overseas NRI Capital Allocator',
      query: 'I live in Dubai and want to buy in Sector 79. I have heard about builder delays and stalled projects in Noida. How can I ensure my money is 100% safe?',
      evalCriteria: [
        'Explains UP RERA Form-7 70% escrow account statutory safeguards',
        'Explains Noida Authority Tripartite Sale Agreement at 10% booking',
        'Explains remote registration via Special Power of Attorney (SPA)',
      ],
    },
    {
      id: 6,
      persona: 'The Market Evaluator / Valuation Skeptic',
      query: 'Why is Sector 75 so much more expensive per sqft than Sector 76 when they are right next to each other on the metro line?',
      evalCriteria: [
        'Explains urban planning and developer asset mix differences',
        'Highlights carpet area vs super area loading transparency',
        'Provides price delta and circle rate insights',
      ],
    },
  ]

  const results: any[] = []

  for (const tc of testCases) {
    console.log(`--------------------------------------------------------------------------------`)
    console.log(`▶ [TEST ${tc.id}] PERSONA: ${tc.persona}`)
    console.log(`💬 User Query: "${tc.query}"`)
    console.log(`⏳ Sending query to chatbot...`)

    const startTime = Date.now()
    try {
      const resp = await sendChatMessage(tc.query)
      const durationMs = Date.now() - startTime

      console.log(`\n🤖 AI Response (${durationMs}ms):`)
      console.log(resp.fullText.trim())
      console.log(`\n🏷️ Generated Chips (${resp.chips.length}):`)
      resp.chips.forEach((c) => console.log(`   • [${c.icon ? c.icon + ' ' : ''}${c.label}]`))
      console.log(`\n📊 Intent State: ${resp.intentState}`)

      // Evaluation scoring
      const hasProjectHijack = resp.fullText.toLowerCase().includes('which project') || resp.fullText.toLowerCase().includes('project name')
      const passed = !hasProjectHijack && resp.fullText.length > 50

      results.push({
        id: tc.id,
        persona: tc.persona,
        durationMs,
        textLength: resp.fullText.length,
        chipCount: resp.chips.length,
        passed,
        fullText: resp.fullText,
        chips: resp.chips.map(c => c.label),
      })
    } catch (err: any) {
      console.error(`❌ Error executing test ${tc.id}:`, err.message)
      results.push({
        id: tc.id,
        persona: tc.persona,
        passed: false,
        error: err.message,
      })
    }
    console.log(`\n`)
  }

  console.log('================================================================================')
  console.log('📈 FINAL EVALUATION REPORT & SCORECARD')
  console.log('================================================================================')
  results.forEach((r) => {
    const status = r.passed ? '✅ PASS' : '❌ FAIL'
    console.log(`Test ${r.id} [${status}] - ${r.persona} (${r.durationMs || 0}ms) | Chips: ${r.chipCount || 0}`)
  })
}

runLiveEvaluation()
