const http = require('http');

const data = JSON.stringify({
  message: 'show me a 3bhk in sector 78 noida',
  guestToken: 'guest-test-123'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let fullResponse = '';
  res.on('data', (chunk) => {
    process.stdout.write(chunk.toString());
  });
  
  res.on('end', () => {
    console.log('\n\n--- DONE ---');
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
