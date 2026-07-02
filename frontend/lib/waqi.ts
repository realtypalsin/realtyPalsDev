// Fetches AQI via server-side route — keeps GOOGLE_MAPS_API_KEY off the client bundle.
import { API_BASE } from '@/lib/env'

export interface AqiResult {
  aqi: number
  label: string
  color: string
  dominantPollutant: string | null
  station: string
}

export async function getAqi(
  lat?: number | null,
  lng?: number | null,
  _cityFallback = 'noida',
): Promise<AqiResult | null> {
  if (!lat || !lng) return null

  try {
    const res = await fetch(`${API_BASE}/aqi?lat=${lat}&lng=${lng}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.aqi) return null
    return data as AqiResult
  } catch {
    return null
  }
}
