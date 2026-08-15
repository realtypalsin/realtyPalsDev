import http from 'http'

interface MessageTurn {
  userQuery: string
  expectedForbiddenInChips?: string[]
}

interface TestScenario {
  title: string
  turns: MessageTurn[]
}

const scenarios: TestScenario[] = [
  {
    title: 'Scenario 1: Relocating with 3BHK Specified (The Exact Bug Reported)',
    turns: [
      {
        userQuery: 'I am relocating to Noida with my wife and 2 kids. Looking for a 3BHK in an established sector with great schools and green spaces.',
        expectedForbiddenInChips: ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '1 bhk', '2 bhk', '3 bhk', '4 bhk'],
      },
      {
        userQuery: 'Commute to Connaught Place in Delhi every day. Schools are top priority.',
        expectedForbiddenInChips: ['1 BHK', '2 BHK'],
      }
    ]
  },
  {
    title: 'Scenario 2: Young Tech Professional Budgeted Starter Flat',
    turns: [
      {
        userQuery: 'I am 26, budget is strictly 65 Lakhs max. I need a ready flat with OC near metro.',
        expectedForbiddenInChips: ['1 BHK', '2 BHK', '3 BHK', '4 BHK'],
      },
      {
        userQuery: 'How is Sector 16C in Greater Noida West for my budget?',
      }
    ]
  },
  {
    title: 'Scenario 3: Legal & UP RERA Due Diligence Inquirer',
    turns: [
      {
        userQuery: 'Is it true that 70% of builder money must be in escrow? How does Form-7 prevent delays?',
      },
      {
        userQuery: 'What happens if a builder fails the CA audit under UP RERA?',
      }
    ]
  },
  {
    title: 'Scenario 4: High-Yield Commercial vs Residential Investor',
    turns: [
      {
        userQuery: 'I have 1.5 Cr cash. Compare rental yield between high-street commercial retail and residential 3BHK.',
        expectedForbiddenInChips: ['1 BHK', '2 BHK'],
      },
      {
        userQuery: 'What are the GST and stamp duty differences between residential and commercial?',
      }
    ]
  },
  {
    title: 'Scenario 5: Sector 75 vs Sector 76 Price Arbitrage',
    turns: [
      {
        userQuery: 'Why is Sector 75 priced at 13,000/sqft while Sector 76 right next to it is 10,500/sqft?',
      },
      {
        userQuery: 'Does Sector 76 have 40 MLD Ganga water supply or groundwater?',
      }
    ]
  }
]

async function sendChatRequest(
  sessionId: string,
  guestToken: string,
  message: string
): Promise<{ text: string; chips: any[] }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      message,
      sessionId,
      guestToken,
      action: { type: 'TEXT_MESSAGE', payload: { message } },
    })

    const req = http.request(
      'http://localhost:3001/api/v1/chat',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Accept': 'text/event-stream',
        },
      },
      (res) => {
        let buffer = ''
        let fullText = ''
        let chips: any[] = []
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
                  fullText += (data.token || '')
                }
                if (currentEvent === 'ui_state' && data.chips) {
                  chips = data.chips
                } else if (currentEvent === 'chips' && data.chips) {
                  chips = data.chips
                } else if (data.chips && Array.isArray(data.chips) && data.chips.length > 0) {
                  chips = data.chips
                }
              } catch {}
            }
          }
        })

        res.on('end', () => {
          resolve({ text: fullText.trim(), chips })
        })
      }
    )

    req.on('error', (e) => reject(e))
    req.write(postData)
    req.end()
  })
}

async function runTestSuite() {
  console.log('🏛️  RUNNING COMPREHENSIVE BRIDGE & INTENT INTEGRATION TEST SUITE 🏛️\n')

  let totalTests = 0
  let passedTests = 0

  for (const scenario of scenarios) {
    console.log('================================================================================')
    console.log(`💬 SCENARIO: ${scenario.title}`)
    console.log('================================================================================\n')

    const sessionId = `test_sess_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const guestToken = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`

    for (let i = 0; i < scenario.turns.length; i++) {
      const turn = scenario.turns[i]
      totalTests++
      console.log(`▶ [TURN ${i + 1}/${scenario.turns.length}] USER: "${turn.userQuery}"\n`)

      const start = Date.now()
      try {
        const response = await sendChatRequest(sessionId, guestToken, turn.userQuery)
        const duration = Date.now() - start

        console.log(`🤖 AI RESPONSE (${duration}ms):`)
        console.log(response.text.substring(0, 300) + (response.text.length > 300 ? '...\n[full text received]' : ''))
        console.log('\n🏷️ DYNAMIC BRIDGE CHIPS:')
        
        let turnPassed = true
        if (response.chips.length === 0) {
          console.log('   ❌ [NO CHIPS GENERATED]')
          turnPassed = false
        } else {
          for (const c of response.chips) {
            const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2B50}\u{FE0F}]/u.test(c.label)
            const isForbidden = turn.expectedForbiddenInChips?.some(f => c.label.toLowerCase().includes(f.toLowerCase()))

            if (hasEmoji) {
              console.log(`   • [${c.label}] ❌ [EMOJI DETECTED]`)
              turnPassed = false
            } else if (isForbidden) {
              console.log(`   • [${c.label}] ❌ [FORBIDDEN REDUNDANT CHIP]`)
              turnPassed = false
            } else {
              console.log(`   • [${c.label}] ✅ [CLEAN / RELEVANT BRIDGE]`)
            }
          }
        }

        if (turnPassed) {
          passedTests++
          console.log(`\n✨ TURN ${i + 1} RESULT: PASS`)
        } else {
          console.log(`\n⚠️ TURN ${i + 1} RESULT: FAIL`)
        }
      } catch (err: any) {
        console.error('❌ Request error:', err.message)
      }
      console.log('\n--------------------------------------------------------------------------------\n')
    }
  }

  console.log('================================================================================')
  console.log(`📊 FINAL TEST SUMMARY: ${passedTests}/${totalTests} TURNS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`)
  console.log('================================================================================')
}

runTestSuite().catch(console.error)
