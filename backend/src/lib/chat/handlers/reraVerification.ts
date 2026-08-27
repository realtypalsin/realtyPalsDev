import type { ChatTopicHandler } from '../handlerContext'

/**
 * "How do I verify a project's RERA registration / is this builder in trouble?"
 *
 * Rewritten while being extracted. The previous version handed the buyer a
 * four-step research task — "Visit the official registry at up-rera.in",
 * "Search the builder's name on ibbi.gov.in" — which is exactly what rule 17 of
 * the system prompt forbids ("NEVER instruct or redirect the user to leave the
 * platform"). Because this branch answers deterministically, it never saw the
 * prompt and the rule never applied to it.
 *
 * Sending a buyer to a government portal to do their own title search is also
 * the opposite of the product: we hold RERA number, validity, compliance score,
 * legal flag, NCLT status and registry standing per project, and the detail page
 * now shows all of them. The answer is what we verify on their behalf, and an
 * offer to pull the filing — not a homework list.
 */
export const reraVerificationHandler: ChatTopicHandler = {
  id: 'rera_verification',
  description: 'How RealtyPals verifies RERA registration and builder legal standing',

  matches: ctx => ctx.flags.isReraCheckQuery === true,

  handle: async ctx => {
    const text = `### How we verify a project

Every project on RealtyPals is screened against four records before it is listed, and each one is shown on the project page:

- **UP RERA registration** — the registration number, its validity date, and whether it has lapsed.
- **Promoter standing** — whether the developer carries pending recovery certificates or a revoked registration.
- **Insolvency status** — whether the builder's corporate entity is under an active NCLT process.
- **Registry standing** — whether transfers are clear or under embargo, and why.

Open any project and check the **Verification & risk** panel: what we hold is stated plainly, and anything we do not hold is marked as such rather than assumed clear.

If you want the underlying filing for a specific project, our advisory team can pull the verified documents for you — you should not have to run a title search yourself.`

    const chips = [
      { id: `chip_builders_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Builders with on-time delivery', icon: 'shield-check', analyticsId: 'chip_builders_safe', priority: 1, payload: { text: 'Which builders in Noida have the best on-time delivery record?' } },
      { id: `chip_filing_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Get verified filings', icon: 'file-text', analyticsId: 'chip_rera_filing', priority: 2, payload: { text: 'Can your team pull the verified RERA filings for a project?' } },
      { id: `chip_tax_${Date.now()}`, actionType: 'TEXT_MESSAGE', label: 'Stamp duty & taxes', icon: 'receipt', analyticsId: 'chip_tax_rera', priority: 3, payload: { text: 'How much stamp duty and GST do I pay in UP?' } },
    ]

    ctx.send('token', { token: text })
    ctx.emitUiState({
      stage: 'RESEARCH',
      thinking: 'How we verify RERA registration and legal standing:',
      chips,
      missingFields: [],
      // Describes our own verification process — nothing here is a claim about
      // a specific project, so there is no project data to be uncertain about.
      confidence: 'HIGH',
    })
    ctx.send('done', {
      sessionId: ctx.sessionId,
      intentState: 'SHORTLISTED',
      intent: ctx.intent,
      responseMode: 'chat',
    })
    ctx.res.end()
  },
}
