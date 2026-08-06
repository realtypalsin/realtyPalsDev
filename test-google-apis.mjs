import fetch from 'node-fetch';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env from frontend directory
const envPath = path.join(process.cwd(), 'frontend', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

console.log('\n🔍 Testing Google APIs...\n');

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  console.log(`GEMINI_API_KEY: ${key ? '***' + key.slice(-8) : 'NOT SET'}`);

  if (!key) {
    console.log('❌ Gemini API key missing\n');
    return false;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'respond with "ok"' }] }]
      })
    });

    const data = await res.json();
    if (data.candidates) {
      console.log('✅ Gemini API: WORKING\n');
      return true;
    } else if (data.error) {
      console.log(`❌ Gemini error: ${data.error.message}\n`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Gemini test failed: ${e.message}\n`);
    return false;
  }
}

async function testMapsAPI() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  console.log(`GOOGLE_MAPS_API_KEY: ${key ? '***' + key.slice(-8) : 'NOT SET'}`);

  if (!key) {
    console.log('❌ Maps API key missing\n');
    return false;
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=Noida&destinations=Delhi&key=${key}`
    );
    const data = await res.json();

    if (data.status === 'OK') {
      const duration = data.rows[0]?.elements[0]?.duration?.text;
      console.log(`✅ Google Maps API: WORKING (Noida→Delhi: ${duration})\n`);
      return true;
    } else if (data.error_message) {
      console.log(`❌ Maps error: ${data.error_message}\n`);
      return false;
    } else {
      console.log(`⚠️ Maps status: ${data.status}\n`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Maps test failed: ${e.message}\n`);
    return false;
  }
}

async function testPlacesAPI() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  console.log(`GOOGLE_PLACES_API_KEY: ${key ? '***' + key.slice(-8) : 'NOT SET'}`);

  if (!key) {
    console.log('❌ Places API key missing\n');
    return false;
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=28.5355,77.3910&radius=5000&type=school&key=${key}`
    );
    const data = await res.json();

    if (data.status === 'OK') {
      const count = data.results?.length || 0;
      console.log(`✅ Google Places API: WORKING (found ${count} schools)\n`);
      return true;
    } else if (data.status === 'ZERO_RESULTS') {
      console.log('✅ Google Places API: WORKING (ZERO_RESULTS status valid)\n');
      return true;
    } else if (data.error_message) {
      console.log(`❌ Places error: ${data.error_message}\n`);
      return false;
    } else {
      console.log(`⚠️ Places status: ${data.status}\n`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Places test failed: ${e.message}\n`);
    return false;
  }
}

async function runTests() {
  const results = await Promise.all([testGemini(), testMapsAPI(), testPlacesAPI()]);
  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`\n${passed === total ? '✅' : '⚠️'} Results: ${passed}/${total} APIs operational\n`);
  process.exit(passed === total ? 0 : 1);
}

runTests().catch(e => {
  console.error('Test error:', e.message);
  process.exit(1);
});
