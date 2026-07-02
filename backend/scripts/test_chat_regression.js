const http = require('http');
const { randomUUID } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sendChatMessage(sessionId, guestToken, message) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            message,
            sessionId,
            guestToken,
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
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

async function runTests() {
    console.log("=== RUNNING REGRESSION TESTS ===");
    let allPassed = true;

    const guestToken = "regression-test-guest";

    // Test 1: Invalid / Deleted Session ID should create a NEW session and save the message
    console.log("\n[Test 1] Invalid Session ID (Deleted/Fake UUID)");
    const fakeSessionId = randomUUID();
    const res1 = await sendChatMessage(fakeSessionId, guestToken, "Hello test 1");
    
    // The response should have a 'done' event with the NEW sessionId.
    const match = res1.data.match(/data: ({"sessionId":"([^"]+)".*})/);
    if (!match) {
        console.error("❌ Test 1 Failed: Did not find 'done' event with sessionId.");
        allPassed = false;
    } else {
        const payload = JSON.parse(match[1]);
        const newSessionId = payload.sessionId;
        console.log(`Received new sessionId: ${newSessionId}`);
        
        if (newSessionId === fakeSessionId) {
            console.error("❌ Test 1 Failed: The backend returned the same invalid sessionId instead of creating a new one!");
            allPassed = false;
        } else {
            // Give DB a moment to persist (it's awaited before res.end() in the endpoint)
            await new Promise(r => setTimeout(r, 500));
            const sessionInDb = await prisma.chatSession.findUnique({ where: { id: newSessionId }, include: { messages: true } });
            if (!sessionInDb) {
                console.error("❌ Test 1 Failed: The new session was not saved to the DB.");
                allPassed = false;
            } else if (sessionInDb.messages.length === 0) {
                console.error("❌ Test 1 Failed: Messages were not saved to the DB.");
                allPassed = false;
            } else {
                console.log("✅ Test 1 Passed: New session created and messages persisted.");
            }
        }
    }

    // Test 2: Concurrent requests with the SAME invalid Session ID
    console.log("\n[Test 2] Concurrent Requests with Invalid Session ID");
    const fakeSessionId2 = randomUUID();
    const req1 = sendChatMessage(fakeSessionId2, guestToken, "Concurrent 1");
    const req2 = sendChatMessage(fakeSessionId2, guestToken, "Concurrent 2");
    
    const [resA, resB] = await Promise.all([req1, req2]);
    const matchA = resA.data.match(/data: ({"sessionId":"([^"]+)".*})/);
    const matchB = resB.data.match(/data: ({"sessionId":"([^"]+)".*})/);
    
    if (matchA && matchB) {
        const idA = JSON.parse(matchA[1]).sessionId;
        const idB = JSON.parse(matchB[1]).sessionId;
        console.log(`Concurrent returned IDs: ${idA}, ${idB}`);
        
        if (idA === idB && idA !== fakeSessionId2) {
            console.log("⚠️ Both concurrent requests returned the same new ID (race condition on insert?), checking DB...");
        } else if (idA !== fakeSessionId2 && idB !== fakeSessionId2) {
            console.log("✅ Concurrency handled by splitting into two valid new sessions (expected fallback behavior).");
        } else {
            console.error("❌ Test 2 Failed: Did not return valid new IDs.");
            allPassed = false;
        }
        
        // Wait and check DB
        await new Promise(r => setTimeout(r, 500));
        const dbA = await prisma.chatSession.findUnique({ where: { id: idA } });
        const dbB = await prisma.chatSession.findUnique({ where: { id: idB } });
        if (dbA && dbB) {
            console.log("✅ Test 2 Passed: Sessions successfully persisted in DB.");
        } else {
            console.error("❌ Test 2 Failed: One or both sessions were not persisted in DB.");
            allPassed = false;
        }
    } else {
        console.error("❌ Test 2 Failed: Did not receive valid done events.");
        allPassed = false;
    }

    if (allPassed) {
        console.log("\n✅ ALL REGRESSION TESTS PASSED. BLOCKER RESOLVED.");
    } else {
        console.log("\n❌ REGRESSION TESTS FAILED. BLOCKER REMAINS.");
    }
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
