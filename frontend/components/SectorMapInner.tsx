'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { ProjectCard } from '@/types/project'
import { SECTOR_CENTROIDS, NOIDA_CENTER } from './SectorMap'

<<<<<<< HEAD
interface Props {
  properties: ProjectCard[]
=======
interface ExtraMarker {
  name: string
  pos: [number, number]
  category: string
}

interface Props {
  properties: ProjectCard[]
  extraMarkers?: ExtraMarker[]
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
}

const statusLabel = (s: string) =>
  s === 'ready_to_move' ? 'Ready to Move' : s === 'new_launch' ? 'New Launch' : 'Under Construction'

<<<<<<< HEAD
export default function SectorMapInner({ properties }: Props) {
  // Fix Leaflet broken marker icons in Next.js — icons are served from node_modules via public path
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
=======
const CATEGORY_COLORS: Record<string, string> = {
  Transport: '#3B82F6',   // blue
  Education: '#8B5CF6',   // purple
  Healthcare: '#EF4444',  // red
  Lifestyle: '#EC4899',   // pink
  Work: '#14B8A6',        // teal
}

export default function SectorMapInner({ properties, extraMarkers = [] }: Props) {
  // Fix Leaflet broken marker icons in Next.js
  useEffect(() => {
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    })
  }, [])

<<<<<<< HEAD
  // Each property gets a position — lat/lng if available, else sector centroid
=======
  // Each property gets a position
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
  const pins = properties.map((p) => ({
    project: p,
    pos: (p.lat && p.lng)
      ? [p.lat, p.lng] as [number, number]
      : SECTOR_CENTROIDS[p.sector] ?? NOIDA_CENTER,
  }))

<<<<<<< HEAD
  // Map center = average of all pin positions
  const centerLat = pins.reduce((s, p) => s + p.pos[0], 0) / pins.length
  const centerLng = pins.reduce((s, p) => s + p.pos[1], 0) / pins.length

  const bluePin = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;background:#374151;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -24],
  }), [])

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={13}
      style={{ height: '280px', width: '100%', borderRadius: '16px', zIndex: 0 }}
=======
  const centerLat = pins.reduce((s, p) => s + p.pos[0], 0) / pins.length
  const centerLng = pins.reduce((s, p) => s + p.pos[1], 0) / pins.length

  const mainPin = useMemo(() => L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;background:#1F2937;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2.5px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -26],
  }), [])

  // Function to create color-coded pins for extra markers
  const getCategoryPin = (category: string) => {
    const color = CATEGORY_COLORS[category] || '#6B7280'
    return L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 16],
      popupAnchor: [0, -18],
    })
  }

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={14}
      style={{ height: '400px', width: '100%', borderRadius: '16px', zIndex: 0 }}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map(({ project: p, pos }) => (
<<<<<<< HEAD
        <Marker key={p.id} position={pos} icon={bluePin}>
=======
        <Marker key={p.id} position={pos} icon={mainPin}>
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
          <Popup>
            <div style={{ minWidth: '150px', fontFamily: 'sans-serif' }}>
              <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 3px', color: '#111' }}>{p.name}</p>
              <p style={{ color: '#2563EB', fontWeight: 700, fontSize: '12px', margin: '0 0 2px' }}>{p.price_range_label}</p>
              <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>{p.sector} · {statusLabel(p.status)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
<<<<<<< HEAD
=======

      {extraMarkers.map((marker, idx) => (
        <Marker key={`extra-${idx}`} position={marker.pos} icon={getCategoryPin(marker.category)}>
          <Popup>
            <div style={{ fontFamily: 'sans-serif' }}>
              <p style={{ fontWeight: 700, fontSize: '12px', margin: '0 0 2px', color: '#111' }}>{marker.name}</p>
              <p style={{ color: CATEGORY_COLORS[marker.category] || '#6B7280', fontWeight: 600, fontSize: '10px', margin: 0 }}>{marker.category}</p>
            </div>
          </Popup>
        </Marker>
      ))}
>>>>>>> dfb06771676bbc802c0b0a79842c555740c42172
    </MapContainer>
  )
}
