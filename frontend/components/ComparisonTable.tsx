'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { Trophy, MapPin } from 'lucide-react'
import { SealCheck, Buildings } from '@phosphor-icons/react'
import type { ProjectCard } from '@/types/project'

interface Props {
  left: ProjectCard
  right: ProjectCard
}

interface CompRow {
  label: string
  leftVal: string
  rightVal: string
  leftWins?: boolean
  rightWins?: boolean
}

function buildRows(left: ProjectCard, right: ProjectCard): CompRow[] {
  const rows: CompRow[] = []

  const lPrice = left.price_min_cr ?? 0
  const rPrice = right.price_min_cr ?? 0
  rows.push({
    label: 'Starting Price',
    leftVal: left.price_range_label,
    rightVal: right.price_range_label,
    leftWins: lPrice > 0 && rPrice > 0 && lPrice <= rPrice,
    rightWins: lPrice > 0 && rPrice > 0 && rPrice < lPrice,
  })

  const statusLabel = (s: string) =>
    s === 'ready_to_move' ? 'Ready to Move' : s === 'new_launch' ? 'New Launch' : 'Under Construction'
  rows.push({
    label: 'Status',
    leftVal: statusLabel(left.status),
    rightVal: statusLabel(right.status),
    leftWins: left.status === 'ready_to_move',
    rightWins: right.status === 'ready_to_move' && left.status !== 'ready_to_move',
  })

  rows.push({
    label: 'Possession',
    leftVal: left.possession_label ?? (left.status === 'ready_to_move' ? 'Now' : 'TBD'),
    rightVal: right.possession_label ?? (right.status === 'ready_to_move' ? 'Now' : 'TBD'),
  })

  rows.push({
    label: 'RERA',
    leftVal: left.rera_number ? '✓ Verified' : '—',
    rightVal: right.rera_number ? '✓ Verified' : '—',
    leftWins: !!left.rera_number && !right.rera_number,
    rightWins: !!right.rera_number && !left.rera_number,
  })

  // Price per sqft comparison
  const lSqft = left.unit_types.find(u => u.price_min_cr && u.super_area_sqft)
  const rSqft = right.unit_types.find(u => u.price_min_cr && u.super_area_sqft)
  if (lSqft && rSqft && lSqft.super_area_sqft && rSqft.super_area_sqft) {
    const lPsf = Math.round((lSqft.price_min_cr! * 1e7) / lSqft.super_area_sqft)
    const rPsf = Math.round((rSqft.price_min_cr! * 1e7) / rSqft.super_area_sqft)
    rows.push({
      label: '₹/sqft',
      leftVal: `₹${(lPsf / 1000).toFixed(1)}K`,
      rightVal: `₹${(rPsf / 1000).toFixed(1)}K`,
      leftWins: lPsf < rPsf,
      rightWins: rPsf < lPsf,
    })
  }

  return rows
}

interface MiniCardProps {
  project: ProjectCard
}

function MiniCard({ project }: MiniCardProps) {
  const isRTM = project.status === 'ready_to_move'
  return (
    <div className="flex-1 min-w-0 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
      <div className="relative h-32 bg-gray-100">
        {project.hero_image_url ? (
          <Image src={project.hero_image_url} alt={project.name} fill unoptimized className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
            <Buildings size={32} className="text-blue-200" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {project.rera_number && (
          <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-white bg-blue-600/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md">
            <SealCheck size={9} weight="fill" />
            RERA
          </div>
        )}
        <div className={`absolute bottom-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm ${
          isRTM ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-white'
        }`}>
          {isRTM ? '✓ Ready' : (project.possession_label ?? 'UC')}
        </div>
      </div>
      <div className="p-3">
        <h4 className="text-[13px] font-bold text-gray-900 leading-snug line-clamp-1">{project.name}</h4>
        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
          <MapPin size={8} />
          {project.builder.name} · {project.sector}
        </p>
        <p className="text-[16px] font-black text-gray-900 mt-1.5 leading-none">{project.price_range_label}</p>
      </div>
    </div>
  )
}

export default function ComparisonTable({ left, right }: Props) {
  const rows = buildRows(left, right)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full rounded-2xl border border-blue-100 bg-blue-50/30 p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Trophy size={14} className="text-amber-500" />
        <span className="text-[12px] font-bold text-gray-700 uppercase tracking-wide">Property Comparison</span>
      </div>

      <div className="flex gap-3 items-stretch">
        <MiniCard project={left} />
        <div className="flex items-center justify-center w-8 flex-shrink-0">
          <span className="text-[11px] font-black text-gray-300">VS</span>
        </div>
        <MiniCard project={right} />
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-xl overflow-hidden flex items-stretch border border-gray-100 dark:border-gray-700">
            <div className={`flex-1 px-3 py-2.5 flex items-center gap-1.5 ${
              row.leftWins ? 'bg-emerald-50 dark:bg-emerald-900/20' : row.rightWins ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
            }`}>
              {row.leftWins && <span className="text-emerald-500 text-[10px] flex-shrink-0">✓</span>}
              <span className={`text-[11px] font-bold truncate ${row.leftWins ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {row.leftVal}
              </span>
            </div>
            <div className="flex items-center justify-center px-2 bg-gray-50 dark:bg-gray-900 border-x border-gray-100 dark:border-gray-700 flex-shrink-0">
              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase whitespace-nowrap">{row.label}</span>
            </div>
            <div className={`flex-1 px-3 py-2.5 flex items-center justify-end gap-1.5 ${
              row.rightWins ? 'bg-emerald-50 dark:bg-emerald-900/20' : row.leftWins ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-800'
            }`}>
              <span className={`text-[11px] font-bold truncate ${row.rightWins ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {row.rightVal}
              </span>
              {row.rightWins && <span className="text-emerald-500 text-[10px] flex-shrink-0">✓</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold text-gray-400 uppercase mb-1">Amenities</p>
          <div className="flex flex-wrap gap-1">
            {left.top_amenities.slice(0, 4).map(a => (
              <span key={a.name} className="text-[9px] bg-white border border-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{a.name}</span>
            ))}
          </div>
        </div>
        <div className="w-px bg-gray-100 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold text-gray-400 uppercase mb-1 text-right">Amenities</p>
          <div className="flex flex-wrap gap-1 justify-end">
            {right.top_amenities.slice(0, 4).map(a => (
              <span key={a.name} className="text-[9px] bg-white border border-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{a.name}</span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
