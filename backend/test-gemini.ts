import { GoogleGenAI } from '@google/genai';

const keysToTest = [
  { envName: 'GEMINI_API_KEY', key: process.env.GEMINI_API_KEY },
  { envName: 'GEMINI_API_KEY1', key: process.env.GEMINI_API_KEY1 },
];

(async () => {
  for (const { envName, key } of keysToTest) {
    console.log(`\n--- Testing ${envName} ---`);
    if (!key) {
      console.error(`❌ ${envName} not found in environment`);
      continue;
    }
    console.log(`✓ ${envName} is configured (${key.substring(0, 14)}...)`);
    try {
      const client = new GoogleGenAI({ apiKey: key });
      const modelName = process.env.GEMINI_MAIN_MODEL || 'gemini-3.6-flash';
      console.log(`⏳ Testing Gemini API with model: ${modelName}...`);
      const res = await client.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: 'Say "Ping test successful" in 3 words.' }] }],
        config: { maxOutputTokens: 20, temperature: 0.1 },
      });
      const outputText = res.candidates?.[0]?.content?.parts?.[0]?.text || res.text;
      console.log(`✅ ${envName} PING SUCCESSFUL!`);
      console.log(`✓ Response text: "${outputText?.trim()}"`);
    } catch (e: any) {
      console.error(`❌ ${envName} test failed:`, e.message);
    }
  }
})();
