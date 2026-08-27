import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A buyer asking two things in one message must get two answers.
 *
 * Found in browser QA: "Does ACE Divino have a swimming pool, and what is its
 * RERA number?" returned a full, correct amenities answer and said nothing at
 * all about RERA. The amenity branch matched first, wrote its response and
 * returned, so the second half of the question vanished with no
 * acknowledgement — leaving the buyer to conclude we do not hold RERA data for
 * a project whose RERA number is sitting in the row we just read.
 *
 * The fix is not a new branch. Every fact those narrow branches serve is
 * already in the generic grounded answer's facts block, so a multi-topic
 * message simply declines the shortcut and lets the generic path answer all
 * parts at once — which it does, from the database, scoped to the one project.
 */

const ROUTER = readFileSync(join(__dirname, '../../../routes/chat-router.ts'), 'utf8')
const HANDLER_DIR = join(__dirname, '../handlers')

describe('multi-topic questions bypass the single-topic shortcuts', () => {
  it('the router counts how many topics one message asks about', () => {
    assert.match(ROUTER, /const topicFlagCount = \[/, 'topicFlagCount should be computed')
    assert.match(ROUTER, /const singleTopic = topicFlagCount <= 1/, 'singleTopic should derive from it')
  })

  it('a project-specific RERA question counts as a topic', () => {
    // isReraCheckQuery is deliberately builder-level — it requires ZERO named
    // projects — so "what is X's RERA number" matches no flag at all and a
    // compound question containing it would still look single-topic.
    assert.match(ROUTER, /const isReraFactQuery = .*\/rera\/i\.test\(message\)/)
    // It must read the same project source the branches themselves use:
    // intent.projectNames is still empty at this point on a drilldown, where
    // the name arrives via targetProjectId. Keying off projectNames made this
    // flag silently false on exactly the turns it exists for.
    assert.match(
      ROUTER,
      /isReraFactQuery = \/rera\/i\.test\(message\) && Boolean\(activeProjectName\)/,
      'isReraFactQuery must key off activeProjectName, not intent.projectNames',
    )
  })

  it('the amenity handler declines a multi-topic message', () => {
    // The branch has since moved out of the router into its own handler, so the
    // gate lives in the matcher rather than an inline guard. Same rule, and it
    // now reads as a condition on the handler instead of a condition buried in
    // a 4,000-line function.
    const src = readFileSync(join(HANDLER_DIR, 'amenityLifestyle.ts'), 'utf8')
    assert.match(
      src,
      /ctx\.flags\.singleTopic === true/,
      'the amenity shortcut must not fire when the buyer asked about more than one topic',
    )
  })

  it('singleTopic reaches the extracted handlers', () => {
    const start = ROUTER.indexOf('flags: {')
    assert.ok(start !== -1, 'handler flags block not found')
    // Sized to the whole flags object rather than a fixed window: every
    // extraction adds a flag, and a window that fitted yesterday silently stops
    // covering the field it was written to check.
    const end = ROUTER.indexOf('},', start)
    const flags = ROUTER.slice(start, end === -1 ? start + 2000 : end)
    assert.match(flags, /\bsingleTopic,/, 'singleTopic must be passed to the handler registry')
  })

  it('every fact-only handler gates on it', () => {
    // These three answer purely from columns the generic facts block already
    // carries, so they are safe to skip. The tax/outflow handlers are NOT in
    // this list on purpose: they carry computed statutory figures the generic
    // path does not have, so they keep answering even in a compound message.
    for (const file of ['connectivity.ts', 'possessionStatus.ts', 'unitConfiguration.ts']) {
      const src = readFileSync(join(HANDLER_DIR, file), 'utf8')
      assert.match(
        src,
        /ctx\.flags\.singleTopic === true/,
        `${file} should decline multi-topic messages`,
      )
    }
  })
})
