import type { ChatTopicHandler } from '../handlerContext'

/**
 * The developer track record: delivery scores, handover delay, RERA compliance.
 *
 * Answers 'is this builder safe', which sits behind most builder questions a
 * first-time buyer asks. It reads only the builder rows the router already
 * fetched for this turn — no query of its own.
 *
 * Three fabrications were removed from this block before it moved here, and the
 * shape that produced them is worth remembering: a builder with no construction
 * quality score was graded 'A-Grade'; one with no RERA compliance score was
 * labelled 'Verified', asserting a compliance standing we do not hold about the
 * exact subject the buyer is trying to assess; and one with an unknown
 * delivered count was credited with '5+ Projects'. Every dash in this table is
 * now a real gap, and the table says so in words.
 *
 * It declines a builder-vs-builder message — that is a comparison, and the
 * comparison path owns it.
 */
export const builderReputationHandler: ChatTopicHandler = {
  id: 'builder-reputation',
  description: 'Developer delivery scorecard and track record',

  matches: ctx =>
    ctx.flags.isBuilderReputationQuery === true && ctx.flags.isBuilderCompare !== true,

  handle: async ctx => {
      const topBuilders = ctx.builders
        .filter(b => b.delivery_score && b.delivery_score > 0)
        .sort((a, b) => (b.delivery_score ?? 0) - (a.delivery_score ?? 0))
        .slice(0, 6)

      // Three fabrications removed. A builder with no construction quality
      // score was graded 'A-Grade'; one with no RERA compliance score was
      // labelled 'Verified' — asserting a compliance standing we do not hold,
      // about the exact subject a buyer is trying to assess. And a builder
      // whose delivered count was unknown was credited with '5+ Projects'.
      const builderRows = topBuilders.map(b => {
        const delayStr = b.average_delay_months === 0
          ? 'On time'
          : b.average_delay_months != null ? `${b.average_delay_months} months` : '—'
        const qualStr = b.construction_quality_score ? `${b.construction_quality_score}/100` : '—'
        const reraStr = b.rera_compliance_score ? `${b.rera_compliance_score}/100` : '—'
        const deliveredStr = b.projects_delivered_count != null ? `${b.projects_delivered_count}` : '—'
        return `| **${b.name}** | ${b.delivery_score != null ? `${b.delivery_score}/100` : '—'} | ${delayStr} | ${deliveredStr} | ${qualStr} | ${reraStr} |`
      }).join('\n')

      const topSafeNames = topBuilders.slice(0, 3).map(b => b.name).join(', ')
      // The closing line named `topSafeNames || 'reputable tier-1 builders'`.
      // With no builders on record it recommended prioritising "reputable
      // tier-1 builders" — a recommendation with no referent, on the exact
      // question the buyer asked. It now only names builders we actually
      // scored, and says nothing when there are none.
      const reputationText = `### Developer track record (Noida & Greater Noida)

| Developer | Delivery score | Avg handover delay | Delivered | Construction quality | RERA compliance |
| :--- | :--- | :--- | :--- | :--- | :--- |
${builderRows}

A dash means we have not scored that dimension for the developer — it is not a low score.${topSafeNames ? `\n\n**On this data**, ${topSafeNames} carry the strongest delivery records of those we hold. Delivery history is the best available predictor of handover risk, but it is a record of past projects, not a guarantee about this one.` : ''}`

      const repChips = topBuilders.slice(0, 3).map((b, i) => ({
        id: `chip_b_${i}_${Date.now()}`,
        actionType: 'TEXT_MESSAGE',
        label: `Projects by ${b.name}`,
        icon: 'building',
        analyticsId: `chip_b_${b.id}`,
        priority: i + 1,
        payload: { text: `Show me projects by ${b.name}` }
      }))

      ctx.send('token', { token: reputationText })
      ctx.emitUiState({
        stage: 'RESEARCH',
        thinking: 'Verified developer delivery scorecard from PostgreSQL database:',
        chips: repChips,
        missingFields: [],
        confidence: 'HIGH'
      })
      ctx.setCachedResponse(ctx.message, { token: reputationText, chips: repChips })
      ctx.send('done', {
        sessionId: ctx.sessionId,
        intentState: 'SHORTLISTED',
        intent: ctx.intent,
        responseMode: 'chat',
      })
      ctx.res.end()
      return true
  },
}
