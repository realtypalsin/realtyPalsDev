import { z } from 'zod';

const BodySchema = z.object({
  action: z.discriminatedUnion('type', [
    z.object({ type: z.literal('TEXT_MESSAGE'), payload: z.object({ text: z.string() }) }),
    z.object({ type: z.literal('INTENT_PATCH'), payload: z.record(z.unknown()) }),
  ]),
});

const payload = {
  action: {
    type: 'TEXT_MESSAGE',
    payload: {
      actionPrefix: 'List key amenities for',
      projects: [{ id: '1', name: 'ATS Homekraft' }],
      text: 'List key amenities for ATS Homekraft',
    },
  },
};

const result = BodySchema.safeParse(payload);
console.log('Result:', result.success);
if (!result.success) {
  console.log(result.error);
}
