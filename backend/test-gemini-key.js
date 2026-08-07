require('dotenv').config()
const https = require('https')

const apiKey = process.env.GEMINI_API_KEY

console.log('Testing Gemini API key...')
console.log('Key:', apiKey ? `${apiKey.slice(0, 8)}...` : 'NOT FOUND')

if (!apiKey) {
  console.error('ERROR: GEMINI_API_KEY is not defined in .env')
  process.exit(1)
}

// 1. First test: List models endpoint
const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`

https.get(listUrl, (res) => {
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    console.log(`\n[List Models] HTTP Status: ${res.statusCode}`)
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data)
        const models = json.models ? json.models.map(m => m.name) : []
        console.log('Success! Available models (first 5):', models.slice(0, 5))
        testGenerateContent(models[0] || 'models/gemini-1.5-flash')
      } catch (e) {
        console.error('Failed to parse models response JSON:', e.message)
      }
    } else {
      console.error('Failed response:', data)
    }
  })
}).on('error', (err) => {
  console.error('Network Error:', err.message)
})

function testGenerateContent(modelName) {
  const modelId = modelName.replace('models/', '')
  console.log(`\n[Generate Content Test] Pinging model ${modelId}...`)
  
  const postData = JSON.stringify({
    contents: [{ parts: [{ text: 'Hello, respond with "OK" if working.' }] }]
  })

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }

  const req = https.request(options, (res) => {
    let data = ''
    res.on('data', chunk => data += chunk)
    res.on('end', () => {
      console.log(`[Generate Content] HTTP Status: ${res.statusCode}`)
      if (res.statusCode === 200) {
        console.log('RESPONSE:', data)
        console.log('\n>>> SUCCESS: GEMINI API KEY IS WORKING! <<<')
      } else {
        console.error('ERROR RESPONSE:', data)
        console.log('\n>>> FAILURE: GEMINI API KEY RETURNED ERROR <<<')
      }
    })
  })

  req.on('error', (err) => {
    console.error('Request Error:', err.message)
  })

  req.write(postData)
  req.end()
}
