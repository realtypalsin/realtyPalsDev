import fetch from 'node-fetch';

const geminiKey = 'AQ.Ab8RN6LWqsD6HzdRsihIlqYCSiqr70wY_irci_ObgPN9DkWYqg';
const mapsKey = 'AIzaSyAyhOG90kHv9ARJ9wKpNXXn-8EvUDfII4U';
const placesKey = 'AIzaSyAyhOG90kHv9ARJ9wKpNXXn-8EvUDfII4U';

console.log('\n🔍 Testing Google APIs...\n');

async function testGemini() {
  console.log('Testing Gemini API...');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'ping' }]
        }]
      })
    });

    const data = await res.json();
    if (res.status === 200 && data.candidates) {
      console.log('✅ Gemini API: WORKING\n');
      return true;
    } else if (data.error) {
      console.log(`❌ Gemini error: ${data.error.message}\n`);
      return false;
    } else {
      console.log(`⚠️ Gemini status ${res.status}: ${JSON.stringify(data).slice(0, 100)}\n`);
      return false;
    }
  } catch (e) {
    console.log(`❌ Gemini test failed: ${e.message}\n`);
    return false;
  }
}

async function testMapsAPI() {
  console.log('Testing Google Maps API...');
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?origins=Noida&destinations=Delhi&key=${mapsKey}`);
    const data = await res.json();

    if (data.status === 'OK') {
      const duration = data.rows[0].elements[0].duration.text;
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
  console.log('Testing Google Places API...');
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=28.5355,77.3910&radius=5000&type=school&key=${placesKey}`);
    const data = await res.json();

    if (data.status === 'OK') {
      const count = data.results?.length || 0;
      console.log(`✅ Google Places API: WORKING (found ${count} schools)\n`);
      return true;
    } else if (data.status === 'ZERO_RESULTS') {
      console.log(`✅ Google Places API: WORKING (ZERO_RESULTS is valid)\n`);
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
}

runTests().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
