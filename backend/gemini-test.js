const { GoogleGenAI } = require('@google/genai');

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('❌ GEMINI_API_KEY not set');
  process.exit(1);
}

console.log(`✓ Key loaded: ${key.substring(0, 15)}...`);

(async () => {
  try {
    const client = new GoogleGenAI({ apiKey: key });
    
    console.log('⏳ Testing Gemini 2.5 Flash Lite...');
    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: [
        { 
          role: 'user', 
          parts: [{ text: 'Say "API working" in 2 words only.' }] 
        }
      ],
      config: { maxOutputTokens: 20 }
    });

    const text = result.text?.trim();
    console.log(`✅ GEMINI API WORKING`);
    console.log(`Response: "${text}"`);
  } catch (e) {
    console.error(`❌ Gemini API Failed:`, e.message);
    process.exit(1);
  }
})();
