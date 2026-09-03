import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeOutput } from '../sanitizeOutput'
import { assertReadsAsProse } from './readsAsProse'

describe('guarantees we cannot make', () => {
  it('softens the RERA delivery guarantee', () => {
    // Measured in production, on a question about Godrej Woods' registration.
    // Every delayed and litigated project in our own rows is RERA registered,
    // which refutes the sentence outright.
    const r = sanitizeOutput(
      'This provides buyers with complete regulatory transparency and guaranteed adherence to delivery timelines under UP RERA.',
    )
    assert.equal(r.softenedOverPromises, 1)
    assert.ok(!/guarantee/i.test(r.text), r.text)
    assert.ok(/on record with the authority/i.test(r.text), r.text)
    assertReadsAsProse(r.text)
  })

  it('softens a promised return and a zero-risk claim', () => {
    const a = sanitizeOutput('This assures a 12% rental yield over five years.')
    assert.equal(a.softenedOverPromises, 1)
    assert.ok(!/assures/i.test(a.text), a.text)
    // This is the assertion that was missing. The verb-phrase version produced
    // 'This is no guarantee of a over five years.' and the test passed, because
    // it only checked that the banned word was gone.
    assert.ok(!/of a over/i.test(a.text), a.text)
    assertReadsAsProse(a.text)

    const b = sanitizeOutput('A ready-to-move flat with OC is a zero risk purchase.')
    assert.equal(b.softenedOverPromises, 1)
    assert.ok(/lower risk/i.test(b.text), b.text)
  })

  it('leaves an honest sentence untouched', () => {
    const text = 'Possession is scheduled for June 2025, and the developer has slipped 8.5 months on average.'
    const r = sanitizeOutput(text)
    assert.equal(r.softenedOverPromises, 0)
    assert.equal(r.text, text)
  })
})

describe('the off-platform referral rewrite', () => {
  it('never splices into the middle of a word', () => {
    // Measured live: "For under-construction propertYou can follow this
    // project's verified RERA standing…" — the match began inside a word
    // because an upstream trim had removed the sentence terminator.
    const truncated = 'For under-construction propert, verify the RERA portal listing first'
    const out = sanitizeOutput(truncated).text
    assert.ok(!/propertYou/.test(out), out)
  })

  it('still rewrites a referral that opens a sentence', () => {
    const out = sanitizeOutput('Prices are firm. Always verify current status on the RERA portal before booking.').text
    assert.ok(!/rera\s+portal/i.test(out), out)
    assert.ok(/project page/.test(out), out)
  })
})

describe('claims about the buyer\'s own money', () => {
  it('removes an assurance we cannot possibly make', () => {
    // Measured on the grievance drill, to a buyer who said a rep had taken
    // their booking token and stopped answering. We have no record of that
    // booking and no visibility into the builder's account.
    const r = sanitizeOutput(
      'I completely understand your frustration. Please rest assured that your funds are securely processed through official builder channels. A manager will call you today.',
    )
    assert.ok(r.softenedOverPromises >= 1)
    assert.ok(!/securely processed/i.test(r.text), r.text)
    assert.ok(/can't see the status of your payment/i.test(r.text), r.text)
    // The surrounding sentences survive.
    assert.ok(/understand your frustration/i.test(r.text), r.text)
    assert.ok(/manager will call you today/i.test(r.text), r.text)
  })

  it('softens confirms and protects, not just guarantees', () => {
    const a = sanitizeOutput('This confirms full legal compliance and regulatory transparency for your investment.')
    assert.equal(a.softenedOverPromises, 1)
    assert.ok(!/confirms full legal compliance/i.test(a.text), a.text)

    const b = sanitizeOutput('This minimizes legal risks and protects your capital from title disputes.')
    assert.equal(b.softenedOverPromises, 1)
    assert.ok(!/protects your capital/i.test(b.text), b.text)
    assertReadsAsProse(a.text)
    assertReadsAsProse(b.text)
  })

  it('leaves an honest statement about a refund process alone', () => {
    const text = 'Token refunds follow the builder\'s cancellation policy, and a relationship manager can walk you through it.'
    const r = sanitizeOutput(text)
    assert.equal(r.softenedOverPromises, 0)
    assert.equal(r.text, text)
  })
})

describe('the referral rewrite never welds onto a word', () => {
  it('leaves the referral alone rather than splicing mid-word', () => {
    // The stream tail hold is 180 chars and the referral sentence is longer, so
    // part of it reaches the buyer before the rest is rewritten. Measured live:
    // "…always verify current staYou can follow this project's…"
    const fragment = 'sta, always verify current status on the RERA portal before booking'
    const out = sanitizeOutput(fragment).text
    assert.ok(!/[a-z]You can follow/.test(out), out)
  })

  it('still rewrites when the preceding character is whitespace', () => {
    const out = sanitizeOutput('Prices are firm.\nAlways verify on the RERA portal first.').text
    assert.ok(/project page/.test(out), out)
    assert.ok(!/rera\s+portal/i.test(out), out)
  })
})

describe('the money guard does not eat honest payment prose', () => {
  it('leaves a payment-plan explanation alone', () => {
    // Observed: the first version fired here and appended the grievance line to
    // a paragraph about construction-linked versus down-payment cash flow.
    const text =
      'Take the down-payment plan if you have the cash idle; take construction-linked if you are still saving. ' +
      'The payment is processed at each construction milestone, and the booking amount is refundable per the builder policy.'
    const r = sanitizeOutput(text)
    assert.equal(r.softenedOverPromises, 0, r.text)
    assert.equal(r.text, text)
  })

  it('still catches a claim about this buyer\'s own money', () => {
    const r = sanitizeOutput('I understand. Rest assured your token is safe with the developer. A manager will call.')
    assert.ok(r.softenedOverPromises >= 1)
    assert.ok(!/token is safe/i.test(r.text), r.text)
  })

  it('does not weld the replacement onto the previous sentence', () => {
    const r = sanitizeOutput('You are still saving. Your funds are secure with us. Anything else matters less.')
    assert.ok(!/saving\.I can't/.test(r.text), r.text)
    assert.ok(!/[a-z]\.I can't/.test(r.text), r.text)
  })
})

describe('the sentence-level rewriter produces sentences', () => {
  // Each input here produced broken or clumsy output from the verb-phrase
  // version. The assertion is on the whole result, not on a missing word.
  const CASES = [
    'This ensures regulatory oversight tracking while construction progresses.',
    'The RERA number is UPRERAPRJ4510. This is on record and ensures full compliance for your investment.',
    'This confirms full legal compliance and regulatory transparency for your investment.',
    'This minimizes legal risks and protects your capital from title disputes.',
    'This assures a 12% rental yield over five years.',
    'Registration guarantees on-time delivery and protects your investment from delay.',
  ]

  for (const input of CASES) {
    it(`rewrites cleanly: "${input.slice(0, 46)}…"`, () => {
      const r = sanitizeOutput(input)
      assert.ok(r.softenedOverPromises >= 1, `nothing softened: ${r.text}`)
      assertReadsAsProse(r.text)
      // Every sentence in the result ends in a terminator.
      for (const sentence of r.text.split(/(?<=[.!?])\s+/).filter(s => s.trim())) {
        assert.ok(/[.!?]$/.test(sentence.trim()), `unterminated sentence: "${sentence}" in ${r.text}`)
      }
    })
  }

  it('leaves an honest possession statement alone', () => {
    // `possession` is in the claim pattern, so this guards the over-correction:
    // a possession DATE is a fact, only a possession GUARANTEE is a claim.
    const text = 'The project is RERA registered under UPRERAPRJ4510 and possession is targeted for Q4 2026.'
    const r = sanitizeOutput(text)
    assert.equal(r.softenedOverPromises, 0, r.text)
    assert.equal(r.text, text)
  })
})

describe('capital protection, active and passive', () => {
  it('catches the passive form that reached a buyer', () => {
    // Said about an Amrapali project — a builder whose RERA registrations the
    // Supreme Court cancelled in 2019, with the projects handed to NBCC.
    const r = sanitizeOutput('Your capital is protected from insolvency risks and ownership rights are fully secure.')
    assert.ok(r.softenedOverPromises >= 1, r.text)
    assert.ok(!/capital is protected/i.test(r.text), r.text)
    assertReadsAsProse(r.text)
  })

  it('still catches the active form', () => {
    const r = sanitizeOutput('This protects your capital from title disputes.')
    assert.ok(r.softenedOverPromises >= 1, r.text)
    assert.ok(!/protects your capital/i.test(r.text), r.text)
  })

  it('leaves an honest statement about escrow alone', () => {
    const text = 'Payments go into a RERA escrow account, which the authority can audit.'
    const r = sanitizeOutput(text)
    assert.equal(r.softenedOverPromises, 0, r.text)
    assert.equal(r.text, text)
  })
})

describe('a second ask hidden behind "or"', () => {
  it('trims an either/or across two different slots', () => {
    // Measured live. Area and budget are separate slots, so this is two
    // questions wearing one question mark — the form a mark count cannot see.
    const r = sanitizeOutput('Are you looking in a specific area like Sector 137, or do you have a budget in mind?')
    assert.equal(r.trimmedQuestions, 1, r.text)
    assert.ok(!/budget in mind/i.test(r.text), r.text)
    assert.ok(/specific area/i.test(r.text), r.text)
    assert.ok(r.text.trim().endsWith('?'), r.text)
  })

  it('leaves an either/or between two options of the same slot', () => {
    // One decision, two answers. Cutting this leaves a worse question.
    const text = 'Do you want expressway connectivity, or closer to the metro?'
    const r = sanitizeOutput(text)
    assert.equal(r.trimmedQuestions, 0, r.text)
    assert.equal(r.text, text)
  })
})

describe('filler openers', () => {
  it('removes the interjection and keeps the answer', () => {
    const r = sanitizeOutput('Great! Noida offers a mix of ready-to-move and upcoming projects.')
    assert.equal(r.strippedFiller, 1)
    assert.equal(r.text.trim(), 'Noida offers a mix of ready-to-move and upcoming projects.')
  })

  it('leaves "great" alone inside a sentence', () => {
    const text = 'Sector 150 is a great location for families.'
    const r = sanitizeOutput(text)
    assert.equal(r.strippedFiller, 0)
    assert.equal(r.text, text)
  })
})
