import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getBaseSystemPrompt, splitSystemPrompt } from '../base'
import { classifyShape } from '../../inferenceProfile'

const build = (msg: string) =>
  getBaseSystemPrompt({}, undefined, undefined, 'GATHERING', 'DISCOVERY', msg, true)

describe('per-answer output contract', () => {
  it('tells a head term to answer in a couple of sentences, without a table', () => {
    // 62% of real demand. The old prompt mandated tables unconditionally and
    // carried 1,600 tokens of advisory playbooks, so "2 bhk in noida" was
    // answered at the length of an investment brief. Output is ~2/3 of a turn's
    // cost, so this is the expensive end of getting the format wrong.
    const p = build('2 bhk in noida')
    assert.match(p, /search phrase, not a question/)
    assert.match(p, /No table/)
  })

  it('gives a comparison its table and its verdict', () => {
    const p = build('sector 150 vs sector 128 noida')
    assert.match(p, /comparison or a multi-constraint brief/)
    assert.match(p, /one table holding the options side by side/)
  })

  it('makes a judgement question commit rather than summarise', () => {
    const p = build('is sector 150 good for investment')
    assert.match(p, /Commit in the first sentence/)
  })

  it('no longer mandates a table on every answer', () => {
    // The rule that used to sit in HARD RULES: "ALWAYS use clean GitHub
    // Flavored Markdown tables for any pricing comparisons, micro-market
    // benchmarks, budget evaluations..." — an unconditional mandate for the
    // most token-expensive format we can emit.
    const p = build('2 bhk in noida')
    assert.ok(
      !/ALWAYS use clean GitHub Flavored Markdown tables/.test(p),
      'the unconditional table mandate is back in the prompt',
    )
  })

  it('sits in the per-turn tail, leaving the cacheable head untouched', () => {
    // The contract varies per question, so it must not land in the prefix that
    // Gemini's implicit cache is matching — that cache is worth ~70% of the
    // input bill and is far more valuable than these few hundred tokens.
    const a = build('2 bhk in noida')
    const b = build('sector 150 vs sector 128 noida')
    assert.equal(
      splitSystemPrompt(a).head,
      splitSystemPrompt(b).head,
      'two different questions produced different cacheable heads',
    )
    assert.notEqual(splitSystemPrompt(a).tail, splitSystemPrompt(b).tail)
  })

  it('agrees with the shape the inference profile billed for', () => {
    // The contract duplicates classifyShape's regexes to avoid an import cycle.
    // If they drift, the model is told to write a comparison while the turn was
    // budgeted as a lookup — truncation, or a lookup paying for reasoning.
    const cases: Array<[string, RegExp]> = [
      ['2 bhk in noida', /search phrase/],
      ['which noida sectors have the best metro connectivity', /question with an answer/],
      ['is sector 150 good for investment', /judgement question/],
      ['sector 150 vs sector 128 noida', /comparison or a multi-constraint brief/],
    ]
    const expected: Record<string, string> = {
      lookup: 'search phrase',
      factual: 'question with an answer',
      advisory: 'judgement question',
      reasoning: 'comparison or a multi-constraint brief',
    }
    for (const [q, re] of cases) {
      assert.match(build(q), re, q)
      assert.match(build(q), new RegExp(expected[classifyShape(q)]), `${q} disagrees with classifyShape`)
    }
  })
})
