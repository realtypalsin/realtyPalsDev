#!/usr/bin/env node

import { runEvaluation } from './harness'
import { EVAL_CONFIG } from '../config/eval'
import goldenTests from './golden.json'
import type { EvalCallHandler } from './harness'

/**
 * Production eval runner: measures chat quality against golden test set.
 *
 * Usage:
 *   npx tsx src/lib/eval/eval-runner.ts [--endpoint http://localhost:3000]
 *
 * Outputs JSON metrics to stdout, fails if thresholds breached.
 */

const argv = process.argv.slice(2)
const endpointArg = argv.find((arg) => arg.startsWith('--endpoint='))
const endpoint = endpointArg ? endpointArg.split('=')[1] : 'http://localhost:3000'

async function runEval() {
  console.log(`[EVAL] Starting evaluation against ${endpoint}`)
  console.log(`[EVAL] Thresholds:`)
  console.log(`  - Hallucination rate: < ${EVAL_CONFIG.MIN_HALLUCINATION_RATE * 100}%`)
  console.log(`  - Precision@5: >= ${EVAL_CONFIG.MIN_PRECISION_AT_K[5] * 100}%`)
  console.log(`  - Recall@10: >= ${EVAL_CONFIG.MIN_RECALL_AT_K[10] * 100}%`)
  console.log(`  - False positive rate: < ${EVAL_CONFIG.GUARDRAIL_FALSE_POSITIVE_THRESHOLD * 100}%`)
  console.log(``)

  const handler: EvalCallHandler = async (query: string) => {
    try {
      const response = await fetch(`${endpoint}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eval-test-token',
        },
        body: JSON.stringify({
          action: { type: 'TEXT_MESSAGE', payload: { text: query } },
          sessionId: null,
          intent: {},
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const text = await response.text()

      // Parse streaming or JSON response
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        return parseSSEResponse(text)
      } else {
        try {
          const json = JSON.parse(text)
          return json.response || json.content || ''
        } catch {
          return text
        }
      }
    } catch (err) {
      console.error(
        `[EVAL:ERROR] Query failed: "${query.slice(0, 50)}..."`,
        err instanceof Error ? err.message : 'unknown',
      )
      throw err
    }
  }

  const result = await runEvaluation(goldenTests as any, handler)

  console.log(`[EVAL:RESULTS]`)
  console.log(JSON.stringify(result, null, 2))
  console.log(``)

  // Check thresholds
  const failures: string[] = []

  if (result.hallucination_rate > EVAL_CONFIG.MIN_HALLUCINATION_RATE) {
    failures.push(`Hallucination rate ${(result.hallucination_rate * 100).toFixed(1)}% exceeds ${EVAL_CONFIG.MIN_HALLUCINATION_RATE * 100}%`)
  }

  if (result.discoveryPrecisionAt5 < EVAL_CONFIG.MIN_PRECISION_AT_K[5]) {
    failures.push(`Precision@5 ${(result.discoveryPrecisionAt5 * 100).toFixed(1)}% below ${EVAL_CONFIG.MIN_PRECISION_AT_K[5] * 100}%`)
  }

  if (result.discoveryRecallAt10 < EVAL_CONFIG.MIN_RECALL_AT_K[10]) {
    failures.push(`Recall@10 ${(result.discoveryRecallAt10 * 100).toFixed(1)}% below ${EVAL_CONFIG.MIN_RECALL_AT_K[10] * 100}%`)
  }

  if (result.guardrailFalsePositives > EVAL_CONFIG.GUARDRAIL_FALSE_POSITIVE_THRESHOLD) {
    failures.push(`False positives ${result.guardrailFalsePositives} exceed ${EVAL_CONFIG.GUARDRAIL_FALSE_POSITIVE_THRESHOLD}`)
  }

  if (failures.length > 0) {
    console.log(`[EVAL:FAILED]`)
    failures.forEach((f) => console.log(`  ✗ ${f}`))
    process.exit(1)
  } else {
    console.log(`[EVAL:PASSED] All thresholds met`)
    process.exit(0)
  }
}

function parseSSEResponse(sseText: string): string {
  const lines = sseText.split('\n')
  let content = ''

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const json = JSON.parse(line.slice(6))
        if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
          content += json.delta.text || ''
        }
      } catch {
        // skip
      }
    }
  }

  return content
}

runEval().catch((err) => {
  console.error('[EVAL:FATAL]', err instanceof Error ? err.message : err)
  process.exit(1)
})
