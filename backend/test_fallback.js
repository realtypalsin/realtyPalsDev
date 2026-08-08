const https = require('https');

const tests = {
  'Gemini API': {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': process.env.GEMINI_API_KEY || 'test'
    },
    body: { contents: [{ parts: [{ text: 'test' }] }] }
  },
  'OpenAI API': {
    url: 'https://api.openai.com/v1/models',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'test'}`,
      'User-Agent': 'curl/7.64.1'
    }
  },
  'Groq API': {
    url: 'https://api.groq.com/openai/v1/models',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY || 'test'}`,
      'User-Agent': 'curl/7.64.1'
    }
  }
};

console.log('=== API FALLBACK MECHANISM TEST ===\n');
console.log('Primary: Gemini (Google)');
console.log('Fallback 1: OpenAI (GitHub Models API via Azure)');
console.log('Fallback 2: Groq (without tool support)\n');

console.log('=== TESTING API CONNECTIVITY ===\n');

Object.entries(tests).forEach(([name, config]) => {
  const url = new URL(config.url);
  const req = https.request({
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: config.method,
    headers: config.headers,
    timeout: 5000
  }, (res) => {
    console.log(`✓ ${name}: HTTP ${res.statusCode}`);
    if (res.statusCode === 401) console.log(`  → Auth failed (API key issue)`);
    if (res.statusCode === 200) console.log(`  → Available & responsive`);
    if (res.statusCode === 429) console.log(`  → Rate limited`);
  });
  
  req.on('error', (err) => {
    console.log(`✗ ${name}: ${err.code}`);
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.log(`✗ ${name}: Timeout`);
  });
  
  if (config.body) {
    req.write(JSON.stringify(config.body));
  }
  req.end();
});

setTimeout(() => process.exit(0), 6000);
