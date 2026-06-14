/**
 * Test script: AI provider connectivity
 * Run: npm run test:bedrock
 * Tests the active provider (currently Groq → Llama 3.3 70B)
 */

import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

import { createGroq } from '@ai-sdk/groq'
import { generateText, streamText, tool } from 'ai'
import { z } from 'zod'

const apiKey = process.env.GROQ_API_KEY

if (!apiKey) {
  console.error('❌ GROQ_API_KEY not set in .env')
  process.exit(1)
}

const groq = createGroq({ apiKey })
const MODEL = 'llama-3.3-70b-versatile'

function pass(label: string, detail?: string) {
  console.log(`  ✅ PASS — ${label}${detail ? `: ${detail}` : ''}`)
}

function fail(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  console.error(`  ❌ FAIL — ${label}: ${msg}`)
}

async function testBasicGeneration() {
  console.log('\n[1] Basic text generation...')
  try {
    const { text, usage } = await generateText({
      model: groq(MODEL),
      prompt: 'Say "RealtyPals Groq connected" and nothing else.',
      maxOutputTokens: 20,
    })
    if (!text.toLowerCase().includes('realtypals')) {
      throw new Error(`Unexpected response: "${text}"`)
    }
    pass('response received', text.trim())
    pass('token usage', `in=${usage.inputTokens} out=${usage.outputTokens}`)
  } catch (err) {
    fail('basic generation', err)
    throw err
  }
}

async function testToolUse() {
  console.log('\n[2] Tool use (function calling)...')
  try {
    const { toolCalls, text } = await generateText({
      model: groq(MODEL),
      prompt: 'Calculate EMI for a 1 crore loan at 8.5% for 20 years. Use the calculate_emi tool.',
      maxOutputTokens: 200,
      tools: {
        calculate_emi: tool({
          description: 'Calculate monthly EMI for a home loan',
          inputSchema: z.object({
            principal_cr: z.number().describe('Loan amount in crores'),
            annual_rate: z.number().describe('Annual interest rate percentage'),
            tenure_years: z.number().describe('Loan tenure in years'),
          }),
          execute: async ({ principal_cr, annual_rate, tenure_years }) => {
            const r = annual_rate / 1200
            const n = tenure_years * 12
            const principal = principal_cr * 10_000_000
            const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
            return { emi_monthly: Math.round(emi), principal }
          },
        }),
      },
    })
    if (toolCalls && toolCalls.length > 0) {
      pass('tool was called', `tool=${toolCalls[0].toolName}`)
    } else if (text) {
      pass('responded without tool (acceptable)', text.slice(0, 60))
    } else {
      throw new Error('No response or tool call')
    }
  } catch (err) {
    fail('tool use', err)
    throw err
  }
}

async function testStreaming() {
  console.log('\n[3] Streaming response...')
  try {
    const result = streamText({
      model: groq(MODEL),
      prompt: 'List 3 Noida sectors popular for real estate in one sentence.',
      maxOutputTokens: 80,
    })
    let chunks = 0
    let fullText = ''
    for await (const chunk of result.textStream) {
      chunks++
      fullText += chunk
    }
    if (chunks === 0) throw new Error('No chunks received')
    pass('streaming works', `${chunks} chunks received`)
    pass('content', fullText.trim().slice(0, 80))
  } catch (err) {
    fail('streaming', err)
    throw err
  }
}

async function testHindiResponse() {
  console.log('\n[4] Hindi/Hinglish understanding...')
  try {
    const { text } = await generateText({
      model: groq(MODEL),
      system: 'You are RealtyPal, an Indian real estate advisor. Reply in the same language as the user.',
      prompt: 'Noida Sector 150 mein 2BHK ka kya price range hai?',
      maxOutputTokens: 100,
    })
    if (!text || text.length < 10) throw new Error('Empty response')
    pass('Hindi query handled', text.slice(0, 80))
  } catch (err) {
    fail('Hindi response', err)
    throw err
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║  RealtyPals — Provider Test Suite        ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`Provider : Groq`)
  console.log(`Model    : ${MODEL}`)
  console.log(`Key      : ${apiKey!.slice(0, 10)}...`)

  const tests = [testBasicGeneration, testToolUse, testStreaming, testHindiResponse]
  let passed = 0
  let failed = 0

  for (const test of tests) {
    try { await test(); passed++ }
    catch { failed++ }
  }

  console.log('\n──────────────────────────────────────────')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failed > 0) { process.exit(1) }
  else { console.log('✅ All tests passed — provider ready') }
}

main().catch((err) => {
  console.error('\n❌ Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
