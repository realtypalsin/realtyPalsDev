// WAQI — World Air Quality Index free API
// Register for a real token at https://aqicn.org/api/
// "demo" token works for testing but has limited station coverage.

export interface AqiResult {
  aqi: number
  label: string
  color: string         // Tailwind text-color class
  dominantPollutant: string | null
  station: string
}

function aqiLabel(aqi: number): { label: string; color: string } {
  if (aqi <= 50)  return { label: 'Good',                           color: 'text-green-600' }
  if (aqi <= 100) return { label: 'Moderate',                       color: 'text-yellow-600' }
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: 'text-orange-500' }
  if (aqi <= 200) return { label: 'Unhealthy',                      color: 'text-red-600' }
  if (aqi <= 300) return { label: 'Very Unhealthy',                 color: 'text-purple-600' }
  return               { label: 'Hazardous',                        color: 'text-red-900' }
}

export async function getAqi(
  lat?: number | null,
  lng?: number | null,
  cityFallback = 'noida',
): Promise<AqiResult | null> {
  const token = process.env.WAQI_TOKEN || 'demo'
  const endpoint = lat && lng
    ? `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${token}`
    : `https://api.waqi.info/feed/${encodeURIComponent(cityFallback)}/?token=${token}`

  try {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null

    const data = (await res.json()) as {
      status: string
      data?: {
        aqi: number | '-'
        dominantpol?: string
        city?: { name?: string }
      }
    }

    if (data.status !== 'ok' || !data.data || data.data.aqi === '-') return null

    const aqi = Number(data.data.aqi)
    if (isNaN(aqi)) return null

    const { label, color } = aqiLabel(aqi)
    return {
      aqi,
      label,
      color,
      dominantPollutant: data.data.dominantpol ?? null,
      station: data.data.city?.name ?? cityFallback,
    }
  } catch {
    return null
  }
}
