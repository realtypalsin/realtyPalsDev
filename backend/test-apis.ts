// Quick API validation test
import { getCommuteTime } from './src/lib/googleMaps'
import { streamWithGemini } from './src/lib/ai/gemini'

async function testAPIs() {
  console.log('\n🔍 Testing configured APIs...\n')

  // Test Gemini
  if (!process.env.GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY not configured')
  } else {
    try {
      console.log('Testing Gemini...')
      let tokenReceived = false
      await streamWithGemini(
        'You are a test. Respond with "OK".',
        [{ role: 'user', content: 'ping' }],
        (_event, _data) => { tokenReceived = true },
        async () => ({ error: 'no tools' })
      )
      console.log(tokenReceived ? '✅ Gemini API working' : '⚠️ Gemini: no response')
    } catch (e) {
      console.log('❌ Gemini error:', (e as Error).message.slice(0, 100))
    }
  }

  // Test Google Maps
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.log('❌ GOOGLE_MAPS_API_KEY not configured')
  } else {
    try {
      console.log('Testing Google Maps...')
      const result = await getCommuteTime('Sector 62, Noida', 'Sector 18, Noida')
      if (result && result.drive_min > 0) {
        console.log('✅ Google Maps API working')
      } else {
        console.log('⚠️ Maps: returned fallback or null')
      }
    } catch (e) {
      console.log('❌ Maps error:', (e as Error).message)
    }
  }

  // Test Google Places (via getNearbyPlaces)
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.log('❌ GOOGLE_PLACES_API_KEY (uses GOOGLE_MAPS_API_KEY)')
  } else {
    try {
      const { getNearbyPlaces } = await import('./src/lib/googleMaps')
      console.log('Testing Google Places...')
      // Sector 62 Noida coordinates
      const places = await getNearbyPlaces(28.5355, -77.3910, 'school', 5000)
      if (Array.isArray(places)) {
        console.log(places.length > 0 ? '✅ Google Places API working' : '⚠️ Places: no results (may be valid)')
      }
    } catch (e) {
      console.log('❌ Places error:', (e as Error).message)
    }
  }

  console.log('\n✅ API validation complete\n')
}

testAPIs().catch(console.error)
