const http = require('http');
const { randomUUID } = require('crypto');

const runTests = async () => {
    console.log("Starting test for invalid sessionId data corruption...");
    
    const fakeSessionId = randomUUID();
    console.log("Fake Session ID:", fakeSessionId);

    const postData = JSON.stringify({
        message: "Hello",
        sessionId: fakeSessionId,
        guestToken: "test-guest-token-123",
        intent: {}
    });

    const req = http.request({
        hostname: 'localhost',
        port: 3002,
        path: '/api/v1/chat',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`POST /api/v1/chat -> Status: ${res.statusCode}`);
            // Check if there's any error in the stream
            console.log(data);
        });
    });
    
    req.on('error', e => console.error(e));
    req.write(postData);
    req.end();
};

runTests();
