require('dotenv').config();
const { z } = require('zod');
const Groq = require('groq-sdk');
const IntentSchema = z.object({
  bhk: z.array(z.number()).optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  possession: z.enum(['immediate', '1year', '2year', '3year+']).optional(),
  sector: z.string().optional(),
  areaMin: z.number().optional(),
  areaMax: z.number().optional(),
  purpose: z.enum(['endUse', 'investment']).optional(),
  builderName: z.string().optional(),
  lifestyleKeywords: z.array(z.string()).optional(),
  projectNames: z.array(z.string()).optional(),
  riskProfile: z.enum(['nri', 'retiree', 'risk_averse', 'first_time_buyer']).optional(),
  is_comparison_query: z.boolean().optional(),
})

function mergeIntent(previous, update) {
  const freshProjectLookup = (update.projectNames?.length ?? 0) > 0 && update.sector === undefined
  return {
    ...previous,
    projectNames: undefined,
    is_comparison_query: undefined,
    ...(freshProjectLookup ? { sector: undefined, lifestyleKeywords: undefined } : {}),
    ...Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined)),
  }
}

const fs = require('fs');
const code = fs.readFileSync('./src/lib/ai/prompts/intent-extraction.ts', 'utf8');
const p1 = code.indexOf('\`') + 1;
const p2 = code.lastIndexOf('\`');
const INTENT_EXTRACTION_PROMPT = code.slice(p1, p2);

async function run() {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const msg = 'Best 3 BHK in Noida';
  const prev = {};
  
  console.log('1. Raw extracted intent');
  
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: INTENT_EXTRACTION_PROMPT },
      { role: 'user', content: 'Previous intent: ' + JSON.stringify(prev) + '\n\nUser message: ' + msg },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 256,
    temperature: 0.1,
  });
  
  const raw = completion.choices[0].message.content;
  console.log(raw);
  
  console.log('\n2. Normalized intent');
  const match = raw.match(/\{[\s\S]*\}/);
  const str = match ? match[0] : '{}';
  const parsed = JSON.parse(str);
  const result = IntentSchema.safeParse(parsed);
  if (result.success) {
    console.log(result.data);
    console.log('\n3. Merged conversation intent');
    const merged = mergeIntent(prev, result.data);
    console.log(merged);
  } else {
    console.log('Schema error:', result.error);
  }
}
run().catch(console.error);
