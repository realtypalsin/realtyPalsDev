import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mistralReplyCeiling, MISTRAL_MAX_TOKENS } from './mistral'

describe('mistral reply ceiling', () => {
  it('clamps a profile that asks for more than the leg may spend', () => {
    assert.equal(mistralReplyCeiling(1800), MISTRAL_MAX_TOKENS)
    assert.equal(mistralReplyCeiling(3000), MISTRAL_MAX_TOKENS)
  })

  it('never raises a profile that asks for less', () => {
    // A head term gets a small ceiling from inferenceProfile on purpose; the
    // clamp must not hand it a bigger budget than the profile chose.
    assert.equal(mistralReplyCeiling(300), 300)
    assert.equal(mistralReplyCeiling(900), 900)
  })

  it('has a ceiling above the longest complete reply the corpus produced', () => {
    // 900 was tried and truncated two answers, one mid-table-row: markdown
    // tables tokenize far denser than prose, so 900 tokens came out around
    // 2,400 characters. The longest complete reply observed was 3,658.
    assert.ok(MISTRAL_MAX_TOKENS >= 1400, `ceiling ${MISTRAL_MAX_TOKENS} truncates real answers`)
  })

  it('still bounds a runaway generation', () => {
    assert.ok(MISTRAL_MAX_TOKENS <= 2000, `ceiling ${MISTRAL_MAX_TOKENS} is not a bound`)
  })
})
