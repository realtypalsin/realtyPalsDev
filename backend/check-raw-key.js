require('dotenv').config()
const fs = require('fs')

const rawEnv = fs.readFileSync('.env', 'utf8')
const match = rawEnv.match(/GEMINI_API_KEY=(.*)/)
if (match) {
  const val = match[1].trim()
  console.log('Raw key from file:', JSON.stringify(val))
  console.log('Length:', val.length)
}
