import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeOutput } from '../sanitizeOutput'

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
    assert.ok(/disclosure obligation/i.test(r.text), r.text)
  })

  it('softens a promised return and a zero-risk claim', () => {
    const a = sanitizeOutput('This assures a 12% rental yield over five years.')
    assert.equal(a.softenedOverPromises, 1)
    assert.ok(!/assures/i.test(a.text), a.text)

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
