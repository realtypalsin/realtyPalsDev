import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A buyer asking about a project must be able to act on it.
 *
 * All twelve topic handlers — six extracted, six still inline — answered and
 * ended the response without ever emitting a property card. "Does Ace Divino
 * have a pool?" returned a correct, well-formatted answer about a project the
 * buyer then had no way to save, open or compare; they had to re-ask the
 * question in listing phrasing to make a card appear.
 *
 * The emission lives in the router, once, ahead of the whole lane rather than
 * inside each handler: a card is not something twelve separate branches should
 * each have to remember, and the thirteenth handler gets it for free.
 */

const ROUTER = readFileSync(join(__dirname, '../../../routes/chat-router.ts'), 'utf8')
const HANDLER_DIR = join(__dirname, '../handlers')

describe('the topic lane emits a card for the project it answered about', () => {
  it('cards are emitted before the handler lane runs', () => {
    const cards = ROUTER.indexOf('PROJECT CARDS FOR THE TOPIC LANE')
    const registry = ROUTER.indexOf('TOPIC HANDLER REGISTRY')
    assert.ok(cards !== -1, 'topic-lane card emission not found')
    assert.ok(registry !== -1, 'topic handler registry not found')
    assert.ok(
      cards < registry,
      'cards must be emitted before the handlers run — each one ends the response itself',
    )
  })

  it('the card set is exactly the project that was asked about', () => {
    // The scope rule: never widen to a sector, never append similar projects.
    const start = ROUTER.indexOf('PROJECT CARDS FOR THE TOPIC LANE')
    const block = ROUTER.slice(start, start + 3200)
    assert.match(block, /loadMentionedProjectCards\(\[/, 'must use the scoped card loader')
    assert.match(block, /id: topicCardId/, 'the set must be the single resolved target project')
    assert.match(block, /nearbyResults: \[\]/, 'no nearby projects may ride along')
  })

  it('a card failure never costs the buyer the answer', () => {
    const start = ROUTER.indexOf('PROJECT CARDS FOR THE TOPIC LANE')
    const block = ROUTER.slice(start, start + 3200)
    assert.match(block, /catch/, 'card loading must be wrapped')
    assert.match(block, /CHAT:TOPIC_CARDS/, 'and the failure logged, not swallowed silently')
  })

  it('handlers still do not emit their own cards', () => {
    // If one starts to, this emission needs revisiting — the client replaces
    // its card set per event, so two emissions in a turn means the last wins.
    for (const file of readdirSync(HANDLER_DIR).filter(f => f.endsWith('.ts') && f !== 'index.ts')) {
      const src = readFileSync(join(HANDLER_DIR, file), 'utf8')
      assert.ok(
        !/send\(\s*'properties'/.test(src),
        `${file} emits its own properties event — reconcile with the router's emission`,
      )
    }
  })
})
