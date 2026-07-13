'use client'

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { renderToString } from 'react-dom/server'
import 'leaflet/dist/leaflet.css'

export function Map({
  center,
  zoom = 11,
  children,
  className = 'h-full w-full rounded-[16px] z-0 relative',
}: {
  center: [number, number]
  zoom?: number
  children?: React.ReactNode
  className?: string
}) {
  // the user's example passed [-73.98, 40.74] (lng, lat). Leaflet expects [lat, lng].
  const centerLat = center[1] || 28.5355
  const centerLng = center[0] || 77.3910

  return (
    <div className={className}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit', zIndex: 0 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {children}
      </MapContainer>
    </div>
  )
}

export function MapMarker({
  longitude,
  latitude,
  children,
}: {
  longitude: number
  latitude: number
  children: React.ReactNode
}) {
  const [icon, setIcon] = useState<L.DivIcon | null>(null)
  
  // Find MarkerContent and MarkerPopup in children
  let markerContent: React.ReactNode = null
  let markerPopup: React.ReactNode = null

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      if ((child.type as any).displayName === 'MarkerContent') {
        markerContent = child
      } else if ((child.type as any).displayName === 'MarkerPopup') {
        markerPopup = child
      }
    }
  })

  useEffect(() => {
    if (markerContent) {
      const htmlString = renderToString(<>{markerContent}</>)
      const newIcon = L.divIcon({
        className: 'custom-map-marker',
        html: htmlString,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      })
      setIcon(newIcon)
    }
  }, [markerContent])

  if (!icon) return null

  return (
    <Marker position={[latitude, longitude]} icon={icon}>
      {markerPopup && <Popup>{markerPopup}</Popup>}
    </Marker>
  )
}

export function MarkerContent({ children }: { children: React.ReactNode }) {
  return <div className="relative flex items-center justify-center h-full w-full">{children}</div>
}
MarkerContent.displayName = 'MarkerContent'

export function MarkerLabel({
  children,
  position = 'bottom',
}: {
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}) {
  const positionClasses = {
    top: 'bottom-full mb-1',
    bottom: 'top-full mt-1',
    left: 'right-full mr-1',
    right: 'left-full ml-1',
  }
  return (
    <div
      className={`absolute ${positionClasses[position]} whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-bold shadow-md text-slate-800 border border-slate-100 z-50`}
    >
      {children}
    </div>
  )
}
MarkerLabel.displayName = 'MarkerLabel'

export function MarkerPopup({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`custom-popup-content ${className}`}>{children}</div>
}
MarkerPopup.displayName = 'MarkerPopup'
