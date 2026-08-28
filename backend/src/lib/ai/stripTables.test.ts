import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createTableStripper, stripTables } from './stripTables'

/** Feeds text in chunks of `size` to prove the filter is not whole-text-dependent. */
function streamed(text: string, size: number): string {
  let out = ''
  const s = createTableStripper((c) => {
    out += c
  })
  for (let i = 0; i < text.length; i += size) s.write(text.slice(i, i + size))
  s.end()
  return out
}

const ANSWER_WITH_TABLE = `Sector 150 is the better buy for a five-year hold.

### Comparison

| Sector | Rate | Status |
| :--- | :--- | :--- |
| 150 | ₹11,500 | Under construction |
| 128 | ₹15,500 | Ready |

Choose 150 if you can wait for possession.`

describe('stripping a duplicate table from the stream', () => {
  it('removes the table and keeps the prose', () => {
    const out = stripTables(ANSWER_WITH_TABLE)
    assert.ok(!out.includes('|'), `a table row survived:\n${out}`)
    assert.match(out, /Sector 150 is the better buy/)
    assert.match(out, /Choose 150 if you can wait/)
  })

  it('removes the heading that was introducing the table', () => {
    // Otherwise the buyer reads "### Comparison" with nothing underneath it.
    assert.ok(!stripTables(ANSWER_WITH_TABLE).includes('Comparison'))
  })

  it('keeps a heading that introduces real prose', () => {
    const out = stripTables('### Verdict\n\nSector 150 wins on price.')
    assert.match(out, /### Verdict/)
    assert.match(out, /Sector 150 wins on price/)
  })

  it('does not leave a run of blank lines where the table was', () => {
    assert.ok(!/\n\n\n/.test(stripTables(ANSWER_WITH_TABLE)))
  })

  it('produces the same result however the stream is chunked', () => {
    // The real transport delivers arbitrary fragments, so a table row can be
    // split across three tokens. Byte-at-a-time is the harshest case.
    const whole = stripTables(ANSWER_WITH_TABLE)
    for (const size of [1, 3, 17, 250]) {
      const chunked = streamed(ANSWER_WITH_TABLE, size)
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd()
      assert.equal(chunked, whole, `chunk size ${size} diverged`)
    }
  })

  it('leaves a pipe inside a fenced code block alone', () => {
    // A pipe in code is not a table row, and eating it would corrupt the answer
    // rather than merely fail to trim it.
    const src = 'Run this:\n\n```\ncat a | grep b\n```\n\nThat is all.'
    const out = stripTables(src)
    assert.match(out, /cat a \| grep b/)
  })

  it('drops a table that the stream ends in the middle of', () => {
    const out = stripTables('Verdict first.\n\n| Sector | Rate |\n| :--- | :--- |\n| 150 | ₹11,500')
    assert.ok(!out.includes('|'))
    assert.match(out, /Verdict first/)
  })

  it('reports whether it actually dropped anything', () => {
    const noTable = createTableStripper(() => {})
    noTable.write('Just prose.\n')
    noTable.end()
    assert.equal(noTable.droppedAnything(), false)

    const withTable = createTableStripper(() => {})
    withTable.write('| a | b |\n')
    withTable.end()
    assert.equal(withTable.droppedAnything(), true)
  })

  it('passes an answer with no table through unchanged', () => {
    const src = 'Sector 150 is the better buy.\n\nPossession is the trade-off.'
    assert.equal(stripTables(src), src)
  })
})
