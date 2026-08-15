// backend/scripts/run-stress-test-suite.ts
import http from 'http'

interface ChatResponse {
  tokens: string[]
  fullText: string
  chips: any[]
  intent: any
  intentState: string
  sessionId: string
}

function sendChatMessage(
  message: string,
  sessionId?: string,
  chatHistory: { role: string; content: string }[] = [],
  guestToken: string = 'guest_stress_test_suite_runner'
): Promise<ChatResponse> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      message,
      sessionId,
      guestToken,
      action: { type: 'TEXT_MESSAGE', payload: { message } },
      chatHistory,
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

const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2B50}\u{FE0F}]/gu

async function runSession(sessionName: string, queries: string[]) {
  console.log(`\n================================================================================`)
  console.log(`💬 SESSION: ${sessionName}`)
  console.log(`================================================================================`)

  const history: { role: string; content: string }[] = []
  let currentSessionId: string | undefined = undefined
  const sessionGuestToken = `guest_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`

  for (let turn = 0; turn < queries.length; turn++) {
    const query = queries[turn]
    console.log(`\n▶ [TURN ${turn + 1}/${queries.length}] USER: "${query}"`)
    const t0 = Date.now()
    
    const resp = await sendChatMessage(query, currentSessionId, history, sessionGuestToken)
    const elapsed = Date.now() - t0
    currentSessionId = resp.sessionId

    // Add to history
    history.push({ role: 'user', content: query })
    history.push({ role: 'assistant', content: resp.fullText })

    console.log(`\n🤖 AI RESPONSE (${elapsed}ms):`)
    console.log(resp.fullText.trim())

    console.log(`\n🏷️ DYNAMIC CHIPS (${resp.chips.length}):`)
    if (resp.chips.length === 0) {
      console.log('   (No chips returned)')
    } else {
      resp.chips.forEach(c => {
        const hasEmoji = emojiRegex.test(c.label) || emojiRegex.test(c.icon || '')
        const emojiFlag = hasEmoji ? '❌ [CONTAINS EMOJI]' : '✅ [CLEAN/PREMIUM]'
        console.log(`   • [${c.label}] ${emojiFlag}`)
      })
    }
    console.log(`📊 State: ${resp.intentState}`)
    console.log(`--------------------------------------------------------------------------------`)
  }
}

async function main() {
  console.log('🏛️  STARTING MULTI-PERSONA STRESS TEST SUITE ACROSS 5 CONVERSATIONS 🏛️\n')

  // Session 1: The Long-Form Relocator & Research Journey
  await runSession('Session 1: The Relocator & Family Research Journey', [
    'I am relocating to Noida with my wife and 2 kids. Looking for a 3BHK in an established sector with great schools and green spaces.',
    'Tell me more about Central Noida vs Expressway. What are the key differences for daily living?',
    'What about water supply and power backup? I heard some societies face groundwater TDS issues.',
    'What are the extra on-road costs like stamp duty, registry, and GST for a 1.5 Cr flat in UP?',
  ])

  // Session 2: The Yield & Commercial Investor
  await runSession('Session 2: The Hardcore Yield & Commercial Investor', [
    'I have ₹2 Cr in liquid capital. I want high rental cashflow in Noida/Greater Noida.',
    'What kind of commercial retail yields can I expect compared to residential 2BHKs?',
    'How does the Jewar Airport opening and the new UP FAR 4.0 policy affect commercial property values?',
  ])

  // Session 3: The Boundary-Testing / Skeptic Buyer
  await runSession('Session 3: The Skeptic Buyer & Legal Due Diligence', [
    'Is Noida even a safe place to buy property? All I hear is builder fraud and stalled projects.',
    'How do I verify if a project has UP RERA Form-7 compliance and a locked escrow account?',
    'Why are registry prices different from the circle rates? How do authorities calculate circle rates?',
  ])

  // Session 4: Direct Project Drill-Down & Financial Calculation
  await runSession('Session 4: Direct Project Comparison & Loan Planning', [
    'Tell me about ATS Pristine in Sector 150. What is its density and quality rating?',
    'What is the difference between carpet area and super area for flats in Noida?',
    'What would the monthly EMI be if I take a 75 lakh loan at 8.5% interest for 20 years?',
  ])

  // Session 5: The Budget-Stretched First-Time 20s Tech Professional
  await runSession('Session 5: The 20s Tech Achiever (Rent vs Buy & Starter Homes)', [
    'I am 27, earning 1.5L/month, currently renting in Sector 137. I want to stop paying rent and buy my first home with a 70 Lakh budget.',
    'Where in Greater Noida West can I get a decent 2BHK within 70 Lakhs?',
    'What are the maintenance costs and operational expenses I should prepare for?',
  ])

  console.log('\n================================================================================')
  console.log('🎉 ALL 5 MULTI-TURN STRESS SESSIONS COMPLETED SUCCESSFULLY!')
  console.log('================================================================================')
}

main().catch(err => {
  console.error('❌ STRESS TEST FAILED:', err)
  process.exit(1)
})
