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

  /**
   * Handlers allowed to emit their own card set, and why.
   *
   * The client replaces its card set per event, so a second emission in a turn
   * wins outright. That is a bug when the later set is narrower than the
   * router's and correct when it is genuinely better — which is the case for a
   * citywide amenity search: the router emitted at most the one focused
   * project, and the buyer asked which societies have a pool. The shortlist is
   * the answer, so it should be the card set.
   *
   * An entry here is a claim that the handler's set supersedes the router's.
   * Anything not listed must not emit, or a project-detail answer silently
   * loses its card to a handler that had less to show.
   */
  const MAY_SUPERSEDE_ROUTER_CARDS: Record<string, string> = {
    'amenityLifestyle.ts':
      'a citywide amenity search answers with a shortlist of societies, which is a wider and more relevant set than the single focused project',
    'commuteShortlist.ts':
      'the buyer named their workplace, so the answer is a commute-ranked shortlist across a residential belt — the whole point of the turn is that set of cards, and no single project is in focus yet',
  }

  it('only declared handlers emit their own cards', () => {
    for (const file of readdirSync(HANDLER_DIR).filter(f => f.endsWith('.ts') && f !== 'index.ts')) {
      const src = readFileSync(join(HANDLER_DIR, file), 'utf8')
      if (!/send\(\s*'properties'/.test(src)) continue
      assert.ok(
        file in MAY_SUPERSEDE_ROUTER_CARDS,
        `${file} emits its own properties event — reconcile with the router's emission, or declare why it supersedes it`,
      )
    }
  })

  it('a superseding handler replaces the set rather than widening it', () => {
    // The scope rule still holds for these: exact results only, nothing nearby
    // riding along, same as the router's own emission.
    for (const file of Object.keys(MAY_SUPERSEDE_ROUTER_CARDS)) {
      const src = readFileSync(join(HANDLER_DIR, file), 'utf8')
      const at = src.search(/send\(\s*'properties'/)
      assert.ok(at !== -1, `${file} is declared as a card emitter but emits none`)
      assert.match(src.slice(at, at + 400), /nearbyResults: \[\]/, `${file} lets nearby projects ride along`)
    }
  })

  it('each card-emission exemption carries a stated reason', () => {
    for (const [file, reason] of Object.entries(MAY_SUPERSEDE_ROUTER_CARDS)) {
      assert.ok(reason && reason.length > 20, `${file} is exempted without a real reason`)
    }
  })
})
