require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const code = fs.readFileSync('./src/lib/ai/prompts/intent-extraction.ts', 'utf8');
const p1 = code.indexOf('\`') + 1;
const p2 = code.lastIndexOf('\`');
const INTENT_EXTRACTION_PROMPT = code.slice(p1, p2);

async function run() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://models.inference.ai.azure.com',
  });
  
  const msg = 'Best 3 BHK in Noida';
  const prev = {};
  
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: INTENT_EXTRACTION_PROMPT },
      { role: 'user', content: 'Previous intent: ' + JSON.stringify(prev) + '\n\nUser message: ' + msg },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 256,
    temperature: 0.1,
  });
  
  console.log('OpenAI response content:');
  console.log(completion.choices[0].message.content);
}
run().catch(console.error);
