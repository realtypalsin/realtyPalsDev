'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { ProjectCard } from '@/types/project'
import { SECTOR_CENTROIDS, NOIDA_CENTER } from './SectorMap'

interface Props {
  properties: ProjectCard[]
}

const statusLabel = (s: string) =>
  s === 'ready_to_move' ? 'Ready to Move' : s === 'new_launch' ? 'New Launch' : 'Under Construction'

export default function SectorMapInner({ properties }: Props) {
  // Fix Leaflet broken marker icons in Next.js — icons are served from node_modules via public path
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/leaflet/marker-icon-2x.png',
      iconUrl: '/leaflet/marker-icon.png',
      shadowUrl: '/leaflet/marker-shadow.png',
    })
  }, [])

  // Each property gets a position — lat/lng if available, else sector centroid
  const pins = properties.map((p) => ({
    project: p,
    pos: (p.lat && p.lng)
      ? [p.lat, p.lng] as [number, number]
      : SECTOR_CENTROIDS[p.sector] ?? NOIDA_CENTER,
  }))

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
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map(({ project: p, pos }) => (
        <Marker key={p.id} position={pos} icon={bluePin}>
          <Popup>
            <div style={{ minWidth: '150px', fontFamily: 'sans-serif' }}>
              <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 3px', color: '#111' }}>{p.name}</p>
              <p style={{ color: '#2563EB', fontWeight: 700, fontSize: '12px', margin: '0 0 2px' }}>{p.price_range_label}</p>
              <p style={{ color: '#666', fontSize: '11px', margin: 0 }}>{p.sector} · {statusLabel(p.status)}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
