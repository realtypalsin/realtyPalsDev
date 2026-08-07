require('dotenv').config()
const { GoogleGenAI } = require('@google/genai')

const apiKey = process.env.GEMINI_API_KEY

console.log('Testing Gemini API key via @google/genai SDK...')
console.log('Key prefix:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT FOUND')

if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY is not defined in .env')
  process.exit(1)
}

async function runTest() {
  try {
    const ai = new GoogleGenAI({ apiKey })
    
    console.log('\n--- 1. Testing client.models.list() ---')
    try {
      const response = await ai.models.list()
      console.log('client.models.list() succeeded!')
      const modelNames = []
      for await (const m of response) {
        modelNames.push(m.name)
      }
      console.log('Models found (first 5):', modelNames.slice(0, 5))
    } catch (listErr) {
      console.error('client.models.list() error:', listErr.message || listErr)
    }

    console.log('\n--- 2. Testing generateContent with gemini-2.5-flash ---')
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Say hello in 3 words'
      })
      console.log('gemini-2.5-flash SUCCESS!')
      console.log('Response text:', res.text)
    } catch (err2_5) {
      console.error('gemini-2.5-flash error:', err2_5.message || err2_5)
    }

    console.log('\n--- 3. Testing generateContent with gemini-1.5-flash ---')
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: 'Say hello in 3 words'
      })
      console.log('gemini-1.5-flash SUCCESS!')
      console.log('Response text:', res.text)
    } catch (err1_5) {
      console.error('gemini-1.5-flash error:', err1_5.message || err1_5)
    }

    console.log('\n--- 4. Testing generateContent with gemini-2.0-flash ---')
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: 'Say hello in 3 words'
      })
      console.log('gemini-2.0-flash SUCCESS!')
      console.log('Response text:', res.text)
    } catch (err2_0) {
      console.error('gemini-2.0-flash error:', err2_0.message || err2_0)
    }

  } catch (err) {
    console.error('General Error:', err)
  }
}

runTest()
