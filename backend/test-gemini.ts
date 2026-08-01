import { GoogleGenAI } from '@google/genai';

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('❌ GEMINI_API_KEY not found in environment');
  process.exit(1);
}

console.log('✓ GEMINI_API_KEY is set');
console.log(`✓ Key starts with: ${key.substring(0, 10)}...`);

(async () => {
  try {
    const client = new GoogleGenAI({ apiKey: key });
    const res = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [{ role: 'user', parts: [{ text: 'Say "Gemini working" in 2 words.' }] }],
      config: { maxOutputTokens: 20, temperature: 0.1 },
    });
    console.log('✓ Gemini API test successful');
    console.log(`✓ Response: "${res.text}"`);
  } catch (e: any) {
    console.error('❌ Gemini API test failed:', e.message);
    process.exit(1);
  }
})();
