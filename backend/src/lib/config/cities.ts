// City configuration — centralized source of truth for supported cities
// Post-pilot: migrate to a DB table for dynamic city management

export const SUPPORTED_CITIES = ['Noida', 'Greater Noida', 'Greater Noida West'] as const
export const DEFAULT_CITY = 'Noida'
export const PILOT_SCOPE_LABEL = 'Noida & Greater Noida'

export type SupportedCity = typeof SUPPORTED_CITIES[number]

export function isValidCity(city: string | undefined): city is SupportedCity {
  return city !== undefined && SUPPORTED_CITIES.includes(city as any)
}
