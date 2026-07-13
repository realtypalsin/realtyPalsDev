'use client'
import { useState } from 'react'
import {  m  } from 'framer-motion'
import {
  FileText, CalendarDays, Percent, ShieldCheck, Download, CheckCircle2,
  TrendingUp, Home, ArrowUpRight, Lock, PhoneCall, HelpCircle, IndianRupee,
  MessageSquare
} from 'lucide-react'
import type { ProjectDetail, UnitTypeSummary } from '@/types/project'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import dynamic from 'next/dynamic'

const PricingCharts = dynamic(() => import('./PricingCharts'), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 animate-pulse rounded-xl flex items-center justify-center"><span className="text-sm text-slate-400">Loading charts...</span></div>
})

export interface ProjectPricingTabProps {
  unitTypes: UnitTypeSummary[]
  detail: (ProjectDetail & { payment_plan?: Record<string, any>; cost_sheet?: Record<string, any> }) | null
  onGoToCosts: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fmt(val: number) {
  return '₹' + val.toLocaleString('en-IN')
}
function pctFmt(val: number, total: number) {
  return ((val / total) * 100).toFixed(1) + '%'
}

// ── Empty State Component ─────────────────────────────────────────────────
function EmptySection({ icon: Icon, title, subtitle, ctaLabel, waUrl }: {
  icon: React.ElementType
  title: string
  subtitle: string
  ctaLabel: string
  waUrl: string | null
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-300" />
      </div>
      <p className="text-[15px] font-semibold text-gray-700">{title}</p>
      <p className="text-[13px] text-gray-400 mt-1.5 max-w-xs">{subtitle}</p>
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold rounded-full text-[13px] transition-all"
        >
          <PhoneCall size={14} />
          {ctaLabel}
        </a>
      )}
    </div>
  )
}

// ── Stat Card Component ────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-blue-600">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[18px] font-black text-gray-900">{value}</p>
        <p className="text-[12px] text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

export default function ProjectPricingTab({ unitTypes, detail, onGoToCosts }: ProjectPricingTabProps) {
  const availableBhks = unitTypes.length > 0 ? Array.from(new Set(unitTypes.map(u => `${u.bhk} BHK`))) : []
  const [bhkFilterState, setBhkFilter] = useState<string>(availableBhks[0] ?? '')
  const bhkFilter = availableBhks.includes(bhkFilterState) ? bhkFilterState : (availableBhks[0] ?? '')

  const [activePlanId, setActivePlanId] = useState<string>('0')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const waUrl = detail ? buildWhatsAppUrl(detail, 'panel') : null

  // ── Derive from real DB data ─────────────────────────────────────────────
  const withPrice = unitTypes.filter(u => u.price_min_cr != null)
  const lowestEntry = withPrice.length > 0 ? withPrice.reduce((a, b) => (a.price_min_cr! < b.price_min_cr! ? a : b)) : null
  const startingPriceCr = lowestEntry?.price_min_cr != null ? `₹${lowestEntry.price_min_cr.toFixed(2)} Cr` : '--'

  const selectedUnit = unitTypes.find(u => `${u.bhk} BHK` === bhkFilter) || unitTypes[0]
  const basePriceCr = selectedUnit?.price_min_cr ?? null
  const basePrice = basePriceCr != null ? basePriceCr * 10000000 : null
  const area = selectedUnit?.super_area_sqft ?? null
  const pricePerSqft = basePrice != null && area != null && area > 0
    ? `₹${Math.round(basePrice / area).toLocaleString('en-IN')}/sqft`
    : '--'

  // Possession from DB
  const d = detail as any
  const possessionLabel = d?.possession_label
    ?? (d?.possession_date ? new Date(d.possession_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null)
    ?? '--'

  // RERA
  const reraNum = detail?.rera_number ?? null

  // Payment plan from DB (paymentPlan is loaded via getPaymentPlan and passed as detail.payment_plan)
  const dbPaymentPlan = detail?.payment_plan ?? null
  const dbMilestones: any[] = dbPaymentPlan?.milestones ?? []
  const hasPaymentPlan = dbMilestones.length > 0
  const planName = dbPaymentPlan?.plan_name ?? 'Payment Schedule'
  // Derive booking amount % from first milestone if available
  const firstMilestone = dbMilestones[0] as any | undefined
  const bookingAmtPct = firstMilestone?.pct != null ? `${firstMilestone.pct}%` : null

  // Cost sheet from DB
  const dbCostSheet = detail?.cost_sheet ?? null
  const hasCostSheet = dbCostSheet != null

  // Compute cost breakdown from real cost sheet data
  const gstPct = dbCostSheet?.gst_rate_pct ?? null
  const stampDutyPct = dbCostSheet?.stamp_duty_pct ?? null
  const regPct = dbCostSheet?.registration_pct ?? null
  const plcCharges: any[] = dbCostSheet?.plc_charges ?? []
  const parkingCost = dbCostSheet?.parking_cost ?? null
  const ifms = dbCostSheet?.ifms ?? null
  const clubMembership = dbCostSheet?.club_membership ?? null
  const otherCharges: any[] = dbCostSheet?.other_charges ?? []

  // Donut chart breakdown — only when we have base price
  let breakdownData: { name: string; amount: string; pct: string; color: string; stroke: string }[] = []
  let total = 0
  if (basePrice != null) {
    let plcTotal = 0
    if (plcCharges.length > 0) {
      plcTotal = plcCharges.reduce((sum, p) => sum + ((p.amount_per_sqft ?? 0) * (area ?? 0)), 0)
    }
    const parkingAmt = parkingCost ?? 0
    const clubAmt = clubMembership ?? 0
    const ifmsAmt = ifms ?? 0
    const otherAmt = otherCharges.reduce((s, o) => s + (o.amount ?? 0), 0)
    total = basePrice + plcTotal + parkingAmt + clubAmt + ifmsAmt + otherAmt
    const entries = [
      { name: `Base Price${area ? ` (${area} sq.ft)` : ''}`, amount: basePrice, color: 'bg-purple-500', stroke: '#a855f7' },
      ...(plcTotal > 0 ? [{ name: 'PLC Charges', amount: plcTotal, color: 'bg-blue-500', stroke: '#3b82f6' }] : []),
      ...(parkingAmt > 0 ? [{ name: 'Parking', amount: parkingAmt, color: 'bg-emerald-500', stroke: '#10b981' }] : []),
      ...(clubAmt > 0 ? [{ name: 'Club Membership', amount: clubAmt, color: 'bg-amber-400', stroke: '#fbbf24' }] : []),
      ...(ifmsAmt > 0 ? [{ name: 'IFMS', amount: ifmsAmt, color: 'bg-pink-400', stroke: '#f472b6' }] : []),
      ...(otherAmt > 0 ? [{ name: 'Other Charges', amount: otherAmt, color: 'bg-pink-500', stroke: '#ec4899' }] : []),
    ].filter(e => e.amount > 0)
    breakdownData = entries.map(e => ({
      name: e.name,
      amount: fmt(e.amount),
      pct: pctFmt(e.amount, total),
      color: e.color,
      stroke: e.stroke,
    }))
  }

  // Investment insights from intelligence_data
  const investmentInsights = (detail as any)?.decision_profile?.intelligence_data?.investment_insights ?? null

  // Donut chart math
  const radius = 50
  const circ = 2 * Math.PI * radius
  let accumulatedPercent = 0
  const chartSegments = breakdownData.map((item) => {
    const percentage = parseFloat(item.pct)
    const currentAccumulated = accumulatedPercent
    accumulatedPercent += percentage
    return { ...item, accumulatedPercent: currentAccumulated }
  })

  const activePlanIndex = parseInt(activePlanId, 10)

  // Download CSV for current plan milestones
  const downloadCSV = () => {
    const headers = ['Milestone', 'Percentage Due', 'Amount (INR)', 'Due Date']
    const rows = dbMilestones.map((m: any) => [m.milestone, m.pct, m.amt ?? '', m.due ?? ''])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `payment_schedule_${detail?.name?.replace(/\s+/g, '_') ?? 'project'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 md:space-y-10 py-4">

      {/* 1. Pricing Overview */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[28px] p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-black/5 dark:border-white/5 pb-4">
          <div>
            <h2 className="text-[18px] font-black font-sans tracking-tight text-gray-900 dark:text-white leading-none">Pricing &amp; Investment</h2>
            <p className="text-[13px] text-gray-500 mt-2">Transparent pricing, flexible plans and complete cost breakdown.</p>
          </div>
          {reraNum && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 border border-blue-100 rounded-full">
              <ShieldCheck size={16} className="text-blue-600" />
              <span className="text-[13px] font-medium text-gray-700">RERA verified · {reraNum}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={IndianRupee} value={startingPriceCr} label="Starting Price" />
          <StatCard icon={TrendingUp} value={pricePerSqft} label="Price per sq.ft" />
          <StatCard icon={CalendarDays} value={possessionLabel} label="Possession" />
          {bookingAmtPct && <StatCard icon={Percent} value={bookingAmtPct} label="Booking Amount" />}
        </div>

        <PricingCharts 
          priceHistory={investmentInsights?.price_history}
          unitPriceCr={lowestEntry?.price_min_cr || undefined}
          otherCharges={otherCharges}
        />

        {/* BHK filter — only shown when there are unit types */}
        {availableBhks.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {availableBhks.map(bhk => (
              <button
                key={bhk}
                onClick={() => setBhkFilter(bhk)}
                className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all ${bhkFilter === bhk ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              >
                {bhk}
              </button>
            ))}
          </div>
        )}

        {/* Payment Plans — from DB or empty state */}
        <div className="mt-10">
          <div className="mb-6">
            <h3 className="text-[18px] font-bold text-gray-900">Payment Plans</h3>
            <p className="text-[13px] text-gray-500 mt-0.5">Flexible plans tailored to your cash flow and investment goals.</p>
          </div>

          {!hasPaymentPlan ? (
            <EmptySection
              icon={FileText}
              title="Payment plans available on request"
              subtitle="Our advisor will walk you through available payment structures including CLP, Flexi, and Subvention options."
              ctaLabel="Talk to Advisor"
              waUrl={waUrl}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-[12px] text-gray-400 font-bold uppercase tracking-wider">
                      <th className="pb-4 font-bold">Milestone</th>
                      <th className="pb-4 text-center">%</th>
                      {dbMilestones[0]?.amt && <th className="pb-4 text-center">Amount</th>}
                      <th className="pb-4 text-right pr-4">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dbMilestones.map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="py-4 flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${row.done ? 'border-emerald-500' : 'border-gray-200'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${row.done ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          </div>
                          <span className={`text-[14px] font-bold ${row.done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{row.milestone || row.label || '--'}</span>
                        </td>
                        <td className="py-4 text-center text-[14px] font-bold text-gray-600">{row.pct ?? '--'}</td>
                        {dbMilestones[0]?.amt && <td className="py-4 text-center text-[14px] font-black text-gray-900">{row.amt ?? '--'}</td>}
                        <td className="py-4 text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <span className={`text-[13px] font-medium ${row.done ? 'text-gray-400' : 'text-gray-900'}`}>{row.due ?? '--'}</span>
                            {row.done && <CheckCircle2 size={16} className="text-emerald-500" />}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-center mt-6 pt-6 border-t border-gray-100 gap-3">
                <button
                  onClick={downloadCSV}
                  className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-[13px] shadow-sm flex items-center gap-2 hover:bg-gray-50"
                >
                  <Download size={14} />
                  Download Schedule
                </button>
              </div>
            </>
          )}

          <div className="mt-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center text-indigo-600">
                <MessageSquare size={20} />
              </div>
              <div>
                <p className="text-[15px] font-bold text-gray-900">Need a custom payment plan?</p>
                <p className="text-[13px] text-gray-500">Configure custom slabs or home loan options with our advisor.</p>
              </div>
            </div>
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-[13px] shadow-sm flex items-center gap-2 hover:bg-gray-50"
              >
                <PhoneCall size={14} />
                Talk to Advisor
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2. Cost Breakdown — only when we have cost sheet + price data */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[28px] p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-black/5 dark:border-white/5 pb-4">
          <div>
            <h2 className="text-[18px] font-black font-sans tracking-tight text-gray-900 dark:text-white leading-none">Cost Breakdown</h2>
            <p className="text-[13px] text-gray-500 mt-2">
              {hasCostSheet && basePrice != null
                ? 'Interactive chart. Hover entries to isolate cost components.'
                : 'Detailed cost breakdown available upon inquiry.'}
            </p>
          </div>
          {availableBhks.length > 1 && hasCostSheet && basePrice != null && (
            <div className="flex flex-wrap bg-gray-100 p-1 rounded-full gap-1">
              {availableBhks.map(bhk => (
                <button
                  key={bhk}
                  onClick={() => setBhkFilter(bhk)}
                  className={`px-6 py-2 rounded-full text-[13px] font-bold transition-all ${bhkFilter === bhk ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {bhk}
                </button>
              ))}
            </div>
          )}
        </div>

        {!hasCostSheet || basePrice == null ? (
          <EmptySection
            icon={IndianRupee}
            title="Cost breakdown available on request"
            subtitle="Our advisor will share a detailed cost sheet including base price, PLC, registration, and all applicable charges."
            ctaLabel="Get Cost Sheet"
            waUrl={waUrl}
          />
        ) : (
          <>
            <div className="flex flex-col lg:flex-row gap-10 items-center">
              {/* Donut Chart */}
              <div className="relative w-64 h-64 flex-shrink-0 flex items-center justify-center">
                <svg width="240" height="240" viewBox="0 0 120 120" className="transform -rotate-90">
                  {chartSegments.map((segment, index) => {
                    const isHovered = hoveredIndex === index
                    return (
                      <circle
                        key={index}
                        cx="60" cy="60"
                        r={isHovered ? 52 : 50}
                        pathLength="100"
                        fill="transparent"
                        stroke={segment.stroke}
                        strokeWidth={isHovered ? 12 : 10}
                        strokeDasharray={`${parseFloat(segment.pct)} 100`}
                        strokeDashoffset={-segment.accumulatedPercent}
                        style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    )
                  })}
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    {hoveredIndex !== null ? breakdownData[hoveredIndex].name.split(' (')[0] : 'Total Value'}
                  </p>
                  <p className="text-[20px] font-black text-gray-900 mt-1">
                    {hoveredIndex !== null ? breakdownData[hoveredIndex].amount : fmt(total)}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 w-full">
                <div className="flex items-center text-[12px] text-gray-400 font-bold uppercase tracking-wider mb-4 px-2">
                  <div className="flex-[2]">Cost Component</div>
                  <div className="flex-1 text-right">Amount (₹)</div>
                  <div className="w-20 text-right">% of Total</div>
                </div>
                <div className="space-y-3">
                  {breakdownData.map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center text-[14px] px-2 py-3 rounded-xl transition-all border ${hoveredIndex === i ? 'bg-gray-50 border-gray-200' : 'border-transparent'}`}
                      onMouseEnter={() => setHoveredIndex(i)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <div className="flex-[2] flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                        <span className="font-semibold text-gray-800">{item.name}</span>
                      </div>
                      <div className="flex-1 text-right font-black text-gray-900">{item.amount}</div>
                      <div className="w-20 text-right text-gray-500 font-medium">{item.pct}</div>
                    </div>
                  ))}
                  <div className="flex items-center text-[16px] px-2 py-4 bg-gray-50/50 rounded-xl mt-2 border border-transparent">
                    <div className="flex-[2] font-black text-gray-900">Total</div>
                    <div className="flex-1 text-right font-black text-gray-900">{fmt(total)}</div>
                    <div className="w-20 text-right font-black text-gray-900">100%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center gap-3 text-[13px] text-gray-500">
              <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-[10px] font-bold">i</div>
              All amounts are indicative. Taxes and registration charges are additional. Actual figures confirmed at time of booking.
            </div>
          </>
        )}
      </div>

      {/* 3. Additional Charges — from cost sheet rates */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[28px] p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="mb-8 border-b border-black/5 dark:border-white/5 pb-4">
          <h2 className="text-[18px] font-black font-sans tracking-tight text-gray-900 dark:text-white leading-none">Additional Charges</h2>
          <p className="text-[13px] text-gray-500 mt-2">Government taxes and one-time charges for complete transparency.</p>
        </div>

        {!hasCostSheet ? (
          <EmptySection
            icon={FileText}
            title="Charges available on inquiry"
            subtitle="Our advisor will share a complete breakdown of stamp duty, registration, GST, and other applicable charges."
            ctaLabel="Ask an Advisor"
            waUrl={waUrl}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                stampDutyPct != null && {
                  name: `Stamp Duty (${stampDutyPct}%)`,
                  desc: 'As per government norms',
                  value: basePrice != null ? fmt(Math.round(basePrice * stampDutyPct / 100)) : '--',
                  icon: FileText, color: 'text-emerald-500 bg-emerald-50'
                },
                regPct != null && {
                  name: `Registration (${regPct}%)`,
                  desc: 'As per government norms',
                  value: basePrice != null ? fmt(Math.round(basePrice * regPct / 100)) : '--',
                  icon: FileText, color: 'text-blue-500 bg-blue-50'
                },
                gstPct != null && {
                  name: `GST (${gstPct}%) *`,
                  desc: 'On base price (under-construction)',
                  value: basePrice != null ? fmt(Math.round(basePrice * gstPct / 100)) : '--',
                  icon: Percent, color: 'text-purple-500 bg-purple-50'
                },
                ...otherCharges.map((c: any) => ({
                  name: c.label ?? 'Other Charge',
                  desc: c.description ?? '',
                  value: c.amount != null ? fmt(c.amount) : '--',
                  icon: Home, color: 'text-amber-600 bg-amber-50'
                })),
              ].filter(Boolean).map((charge: any, i) => {
                const Icon = charge.icon
                return (
                  <div key={i} className="border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${charge.color}`}>
                        <Icon size={18} />
                      </div>
                      <p className="text-[13px] font-semibold text-gray-700">{charge.name}</p>
                    </div>
                    <p className="text-[18px] font-black text-gray-900">{charge.value}</p>
                    <p className="text-[12px] text-gray-400 mt-1">{charge.desc}</p>
                  </div>
                )
              })}

              {/* Always show advisor CTA card */}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-gray-100 rounded-2xl p-5 flex flex-col justify-center items-center text-center cursor-pointer hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FileText size={18} />
                  </div>
                  <p className="text-[14px] font-bold text-gray-900">View All Charges</p>
                  <p className="text-[12px] text-gray-400 mt-1">Complete list of all applicable charges</p>
                </a>
              )}
            </div>
            {gstPct != null && (
              <p className="text-[11px] text-gray-400 mt-6">*GST is applicable on under-construction properties as per government guidelines.</p>
            )}
          </>
        )}
      </div>

      {/* 4. Investment Insights — from intelligence_data or empty state */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[28px] p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all duration-300">
        <div className="mb-8 border-b border-black/5 dark:border-white/5 pb-4">
          <h2 className="text-[18px] font-black font-sans tracking-tight text-gray-900 dark:text-white leading-none">Investment Insights</h2>
          <p className="text-[13px] text-gray-500 mt-2">Understand the investment potential of {detail?.name ?? 'this project'}.</p>
        </div>

        {!investmentInsights ? (
          <EmptySection
            icon={TrendingUp}
            title="Investment analysis available on request"
            subtitle="Ask our advisor for market appreciation data, rental yield estimates, and liquidity analysis for this project."
            ctaLabel="Request Market Report"
            waUrl={waUrl}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { name: 'Price Appreciation', val: investmentInsights.appreciation_annual ?? '--', desc: investmentInsights.appreciation_desc ?? 'Annual growth estimate', icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50' },
                { name: 'Rental Yield', val: investmentInsights.rental_yield ?? '--', desc: investmentInsights.rental_desc ?? 'Expected annual rental yield', icon: Home, color: 'text-blue-500 bg-blue-50' },
                { name: 'Market Trend', val: investmentInsights.market_trend ?? '--', desc: investmentInsights.market_desc ?? '', icon: TrendingUp, color: 'text-purple-500 bg-purple-50' },
                { name: 'Liquidity Score', val: investmentInsights.liquidity_score ?? '--', desc: investmentInsights.liquidity_desc ?? '', icon: ArrowUpRight, color: 'text-amber-500 bg-amber-50' },
              ].map((insight, i) => {
                const Icon = insight.icon
                return (
                  <div key={i} className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${insight.color}`}>
                        <Icon size={18} />
                      </div>
                      <p className="text-[13px] font-semibold text-gray-700">{insight.name}</p>
                    </div>
                    <p className="text-[20px] font-black text-gray-900">{insight.val}</p>
                    {insight.desc && <p className="text-[12px] text-gray-400 mt-1">{insight.desc}</p>}
                  </div>
                )
              })}
            </div>

            {waUrl && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100/50 text-blue-600 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-[15px] font-bold text-gray-900">Explore Full Investment Report</p>
                    <p className="text-[13px] text-gray-600 mt-0.5">{detail?.name ?? 'This project'} is analysed for growth potential, risk, and exit liquidity.</p>
                  </div>
                </div>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-900 font-bold rounded-xl text-[13px] shadow-sm flex items-center gap-2 hover:bg-gray-50"
                >
                  <TrendingUp size={14} />
                  View Market Report
                </a>
              </div>
            )}
          </>
        )}
      </div>

      {/* CTA Footer */}
      <div className="bg-gradient-to-r from-pink-50 via-white to-orange-50 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-pink-100/50">
        <div>
          <h3 className="text-[20px] font-black text-gray-900 tracking-tight">Ready to book {detail?.name ?? 'this project'}?</h3>
          <p className="text-[14px] text-gray-600 mt-1 max-w-md">Our relationship manager will help you choose the best plan and guide you through the process.</p>
        </div>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-8 py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-full text-[14px] transition-all flex items-center gap-2"
          >
            <PhoneCall size={16} />
            Talk to an Advisor
          </a>
        )}
      </div>

      <p className="text-center text-[11px] text-gray-400 pt-2 pb-6">All prices are in Indian Rupees (₹). Subject to change without prior notice.</p>
    </div>
  )
}
