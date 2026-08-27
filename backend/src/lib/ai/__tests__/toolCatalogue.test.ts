import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NEUTRAL_TOOLS, toOpenAITools, toGeminiTools } from '../tools'

// The model can only call what the catalogue advertises, and only gets an answer
// for what the router handles. Those two lists drifted: best_value_projects,
// fastest_possession_projects and best_for_families_projects were advertised but
// never implemented (their descriptions still carried a "Phase 5:" prefix), so a
// buyer asking for "best value in Sector 150" got "temporarily unavailable" from
// a tool that had never existed. This keeps them in step.

// Handlers used to live inline in chat-router.ts and now sit in their own
// module. Both are read, so the check holds wherever a handler is written and
// this test does not have to be edited again when one moves.
const HANDLER_SOURCES = [
  '../../../routes/chat-router.ts',
  '../tools/handlers.ts',
].map(rel => readFileSync(join(__dirname, rel), 'utf8')).join('\n')

function handledToolNames(): Set<string> {
  return new Set([...HANDLER_SOURCES.matchAll(/name === '([a-z_]+)'/g)].map(m => m[1]))
}

function advertisedToolNames(): Set<string> {
  return new Set(NEUTRAL_TOOLS.map(t => t.name))
}

describe('tool catalogue', () => {
  it('advertises nothing the router cannot answer', () => {
    const unhandled = [...advertisedToolNames()].filter(n => !handledToolNames().has(n))
    assert.deepEqual(
      unhandled,
      [],
      'These tools are offered to the model but have no handler, so calling one ' +
        'returns "Tool not recognized" and the buyer is told the data is unavailable ' +
        'when it may well exist. Either implement the handler or remove the definition.',
    )
  })

  it('gives every tool a description that says when to call it', () => {
    for (const tool of NEUTRAL_TOOLS) {
      assert.ok(tool.description && tool.description.length > 40, `${tool.name}: description too thin to route on`)
      assert.ok(
        !/^Phase \d/i.test(tool.description),
        `${tool.name}: description starts with a phase marker — that prefix marked the three tools that were advertised without ever being built`,
      )
    }
  })

  it('gives every tool a valid JSON-Schema parameter object', () => {
    for (const tool of NEUTRAL_TOOLS) {
      assert.equal(tool.parameters.type, 'object', tool.name)
      assert.ok(tool.parameters.properties, `${tool.name}: no properties`)
      for (const required of tool.parameters.required ?? []) {
        assert.ok(
          required in tool.parameters.properties,
          `${tool.name}: requires "${required}" but never declares it`,
        )
      }
    }
  })

  it('converts cleanly for both providers', () => {
    const openai = toOpenAITools()
    assert.equal(openai.length, NEUTRAL_TOOLS.length)
    assert.ok(openai.every(t => t.type === 'function' && t.function?.name))

    const [gemini] = toGeminiTools()
    assert.ok(gemini.functionDeclarations, 'Gemini wrapper missing functionDeclarations')
    assert.equal(gemini.functionDeclarations.length, NEUTRAL_TOOLS.length)
  })

  it('has no duplicate tool names', () => {
    const names = NEUTRAL_TOOLS.map(t => t.name)
    assert.equal(new Set(names).size, names.length, `duplicate tool name in the catalogue: ${names.join(', ')}`)
  })
})
