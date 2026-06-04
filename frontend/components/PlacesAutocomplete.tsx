'use client'

/**
 * Google Places Autocomplete input.
 * Loads the Maps JS API (Places library) once per session.
 * Falls back to a plain text input when the API key is missing.
 */
import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onEnter?: () => void
}

let placesLoaded = false
let placesLoading = false
const callbacks: Array<() => void> = []

function loadPlacesAPI(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (placesLoaded) { resolve(); return }
    callbacks.push(resolve)
    if (placesLoading) return
    placesLoading = true

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en&region=IN`
    script.async = true
    script.onload = () => {
      placesLoaded = true
      placesLoading = false
      callbacks.forEach((cb) => cb())
      callbacks.length = 0
    }
    document.head.appendChild(script)
  })
}

export default function PlacesAutocomplete({ value, onChange, placeholder, className, onEnter }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    if (!apiKey || !inputRef.current) return

    loadPlacesAPI(apiKey).then(() => {
      if (!inputRef.current || autocompleteRef.current) return
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'name'],
        types: ['geocode', 'establishment'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        const addr = place.formatted_address ?? place.name ?? ''
        if (addr) onChange(addr)
      })
      autocompleteRef.current = ac
    })
  }, [apiKey])

  return (
    <div className="relative flex-1">
      <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter() } }}
        placeholder={placeholder ?? 'Search location...'}
        className={className ?? 'w-full border border-gray-200 bg-white rounded-lg pl-8 pr-3 py-2.5 text-sm focus:outline-none focus:border-blue-400'}
        autoComplete="off"
      />
    </div>
  )
}
