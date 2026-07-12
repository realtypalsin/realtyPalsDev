const http = require('http');

const runTests = async () => {
    console.log("Starting tests (v1)...");
    
    // Test 1: Malformed JSON to a POST endpoint
    try {
        const req = http.request({
            hostname: 'localhost',
            port: 3002,
            path: '/api/v1/admin/projects',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'admin_token=fake'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`POST /api/v1/admin/projects (malformed) -> Status: ${res.statusCode}, Data: ${data.substring(0, 100)}`);
            });
        });
        
        req.on('error', e => console.error(e));
        req.write('{"bad_json:');
        req.end();
    } catch(e) {
        console.error(e);
    }

    // Test 2: Missing auth header on admin route
    try {
        const req2 = http.request({
            hostname: 'localhost',
            port: 3002,
            path: '/api/v1/admin/projects',
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`GET /api/v1/admin/projects (no auth) -> Status: ${res.statusCode}, Data: ${data.substring(0, 100)}`);
            });
        });
        req2.end();
    } catch(e) {}
    
    // Test 3: Test projects endpoint with a crazy ID to see if it 500s
    try {
        const req3 = http.request({
            hostname: 'localhost',
            port: 3002,
            path: '/api/v1/projects/999999999999999999999999999999999999',
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`GET /api/v1/projects/crazy-id -> Status: ${res.statusCode}, Data: ${data.substring(0, 100)}`);
            });
        });
        req3.end();
    } catch(e) {}
};

runTests();
