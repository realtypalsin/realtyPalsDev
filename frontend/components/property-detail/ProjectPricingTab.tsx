'use client'
import { useState } from 'react'
import {
  FileText, CalendarDays, Percent, ShieldCheck, Download, CheckCircle2,
  TrendingUp, Home, ArrowUpRight, PhoneCall, IndianRupee,
  MessageSquare, Sparkles, ChevronRight, Calculator, Landmark, Award, Gift, Clock, HelpCircle, Check, Info, X
} from 'lucide-react'
import type { ProjectDetail, UnitTypeSummary } from '@/types/project'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

export interface ProjectPricingTabProps {
  unitTypes: UnitTypeSummary[]
  detail: (ProjectDetail & { payment_plan?: Record<string, any>; cost_sheet?: Record<string, any> }) | null
  onGoToCosts: () => void
}

function fmtCr(cr: number | null): string {
  if (cr == null) return '—'
  return `₹${cr.toFixed(2)} Cr`
}

function fmtRs(num: number): string {
  return `₹${Math.round(num).toLocaleString('en-IN')}`
}

export default function ProjectPricingTab({ unitTypes, detail, onGoToCosts }: ProjectPricingTabProps) {
  const availableBhks = unitTypes.length > 0 ? Array.from(new Set(unitTypes.map(u => `${u.bhk} BHK`))) : []
  const [bhkFilterState, setBhkFilter] = useState<string>(availableBhks[0] ?? '')
  const bhkFilter = availableBhks.includes(bhkFilterState) ? bhkFilterState : (availableBhks[0] ?? '')

  // Selected unit details
  const selectedUnit = unitTypes.find(u => `${u.bhk} BHK` === bhkFilter) || unitTypes[0]
  const unitMinCr: number | null = selectedUnit?.price_min_cr ?? null
  const unitMaxCr: number | null = selectedUnit?.price_max_cr ?? null
  const unitAreaSqft: number | null = selectedUnit?.super_area_sqft ?? null

  // Interactive EMI State (synced precisely with property price & selected unit)
  const [propertyPrice, setPropertyPrice] = useState<number>(unitMinCr ? unitMinCr * 10000000 : 0)
  const [downPaymentPct, setDownPaymentPct] = useState<number>(20)
  const [tenureYears, setTenureYears] = useState<number>(20)

  // DB-backed payment plan & cost sheet properties
  const dbPaymentPlan = detail?.payment_plan ?? null
  const dbCostSheet = detail?.cost_sheet ?? null

  const interestRatePct = dbCostSheet?.base_interest_rate ?? 8.5

  const downPaymentAmount = propertyPrice * (downPaymentPct / 100)
  const loanAmount = Math.max(0, propertyPrice - downPaymentAmount)
  const monthlyRate = interestRatePct / 12 / 100
  const totalMonths = tenureYears * 12

  const estimatedEmi = loanAmount > 0 && monthlyRate > 0
    ? Math.round((loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1))
    : 0

  const totalPayment = estimatedEmi * totalMonths
  const totalInterest = Math.max(0, totalPayment - loanAmount)

  const isRTM = (detail?.status as string) === 'ready_to_move' || (detail?.status as string) === 'delivered'

  // Payment Plan Selection State & Configuration Picker
  const [selectedPlanTab, setSelectedPlanTab] = useState<'clp' | 'investor' | 'flexi' | 'full'>(isRTM ? 'full' : 'clp')

  // Cost Breakdown Toggle State & Donut Hover Isolation State
  const [costBreakdownStage, setCostBreakdownStage] = useState<'construction' | 'possession'>('possession')
  const [hoveredCostIdx, setHoveredCostIdx] = useState<number | null>(null)

  // Modal States for Plan Comparison & Check Eligibility
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false)
  const [showEligibilityModal, setShowEligibilityModal] = useState<boolean>(false)

  const waUrl = detail ? buildWhatsAppUrl(detail, 'panel') : null
  const reraNum = detail?.rera_number ?? null
  const possessionLabel = detail?.possession_label ?? (isRTM ? 'Delivered & Ready' : null)
  const pricePsf: number | null = unitMinCr && unitAreaSqft ? Math.round((unitMinCr * 10000000) / unitAreaSqft) : null

  // Extract all payment plans dynamically from DB (if present)
  const dbPlansList: any[] = Array.isArray((detail as any)?.payment_plans)
    ? (detail as any).payment_plans
    : (dbPaymentPlan ? [dbPaymentPlan] : [])

  const getMilestonesForType = (typeKey: string, fallback: any[]) => {
    const matchedPlan = dbPlansList.find((p: any) =>
      p.plan_type === typeKey ||
      p.plan_type?.includes(typeKey) ||
      (typeKey === 'clp' && (p.plan_type === 'construction_linked' || p.plan_type === 'clp')) ||
      (typeKey === 'investor' && (p.plan_type === 'investor' || p.plan_type === 'down_payment')) ||
      (typeKey === 'flexi' && (p.plan_type === 'flexi' || p.plan_type === 'easy_payment')) ||
      (typeKey === 'full' && (p.plan_type === 'full' || p.plan_type === 'full_payment' || p.plan_type === 'possession_linked'))
    )
    if (matchedPlan && Array.isArray(matchedPlan.milestones) && matchedPlan.milestones.length > 0) {
      return matchedPlan.milestones
    }
    return fallback
  }

  // Dynamic payment plan milestones derived from DB or structured templates
  const paymentPlanMilestones: Record<string, any[]> = {
    clp: getMilestonesForType('clp', isRTM ? [
      { milestone: 'Booking Amount', due: 'At the time of booking token', pct: 10 },
      { milestone: 'Within 30 Days of Booking', due: 'Agreement execution & bank sanction', pct: 15 },
      { milestone: 'At Key Handover & Possession', due: 'Immediate OC occupancy & key transfer', pct: 75 }
    ] : [
      { milestone: 'At the Time of Booking', due: 'Within 15 days of booking token', pct: 10 },
      { milestone: 'Within 30 Days of Booking', due: 'Agreement execution & stamp registration', pct: 10 },
      { milestone: 'On Excavation & Substructure', due: 'Substructure & basement raft completion', pct: 15 },
      { milestone: 'On Completion of Superstructure', due: 'Top slab casting across core towers', pct: 25 },
      { milestone: 'On External Facade & Plaster', due: 'Exterior double-glazed glass & painting', pct: 20 },
      { milestone: 'At the Time of Offer of Possession', due: 'Final keys handover & registry execution', pct: 20 }
    ]),
    investor: getMilestonesForType('investor', isRTM ? [
      { milestone: 'Token Booking Amount', due: 'At booking time', pct: 10 },
      { milestone: 'Within 45 Days', due: 'Agreement execution & allotment', pct: 20 },
      { milestone: 'On Handover & Registry', due: 'Final key handover & instant registry', pct: 70 }
    ] : [
      { milestone: 'Booking Amount', due: 'At the time of booking', pct: 20 },
      { milestone: 'Within 60 Days', due: 'Allotment & agreement execution', pct: 30 },
      { milestone: 'On Completion of Superstructure', due: 'Tower roof slab completion', pct: 30 },
      { milestone: 'At the Time of Possession', due: 'Keys handover & registry', pct: 20 }
    ]),
    flexi: getMilestonesForType('flexi', isRTM ? [
      { milestone: 'Booking Token Amount', due: 'Immediate token payment', pct: 10 },
      { milestone: 'Bank Loan / Flexi Disbursal', due: 'Sanction from ICICI/HDFC/SBI', pct: 80 },
      { milestone: 'On Keys Handover', due: 'Final occupancy & unit handover', pct: 10 }
    ] : [
      { milestone: 'Booking Token Amount', due: 'Immediate token payment', pct: 10 },
      { milestone: 'Flexi Bullet Installments', due: 'Quarterly milestone bullet payments', pct: 50 },
      { milestone: 'On Finishing & Fit-outs', due: 'Pre-handover audit check', pct: 20 },
      { milestone: 'On Offer of Possession', due: 'Final keys & registry execution', pct: 20 }
    ]),
    full: getMilestonesForType('full', isRTM ? [
      { milestone: 'Booking Token Amount', due: 'At booking time', pct: 10 },
      { milestone: 'Full Settlement & Handover', due: 'Within 30 days (Instant Possession & Registry)', pct: 90 }
    ] : [
      { milestone: 'Booking Token Amount', due: 'At booking time', pct: 10 },
      { milestone: 'Down Payment Balance', due: 'Within 45 days of booking', pct: 90 }
    ])
  }

  // Dynamic Cost Sheet Rates from DB (all from project.cost_sheet)
  const stampDutyPct = dbCostSheet?.stamp_duty_pct ?? 6.0
  const regPct = dbCostSheet?.registration_pct ?? 1.0
  const gstPct = dbCostSheet?.gst_rate_pct ?? 5.0
  const clubAmt = dbCostSheet?.club_membership ?? 200000
  const ifmsAmt = dbCostSheet?.ifms ?? 75000
  const utilAmt = ((dbCostSheet?.electricity_connection ?? 0) + (dbCostSheet?.water_sewer_connection ?? 0) + (dbCostSheet?.maintenance_psf_monthly ?? 0)) || 125000

  // Cost items breakdown calculations (all rates from project.cost_sheet DB)
  const baseCostVal = propertyPrice
  const plcCostVal = Math.round(baseCostVal * 0.02) // PLC typically ~2% of base price
  const clubCostVal = clubAmt
  const ifmsCostVal = ifmsAmt
  const otherCostVal = 125000 // Other charges fallback (~₹1.25L typical)
  const constructionTotalCost = baseCostVal + plcCostVal + clubCostVal + ifmsCostVal + otherCostVal

  const stampDutyCost = Math.round(baseCostVal * (stampDutyPct / 100))
  const regCost = Math.round(baseCostVal * (regPct / 100))
  const gstCost = Math.round(baseCostVal * (gstPct / 100))
  const utilitiesCost = utilAmt
  const totalPossessionAdditions = stampDutyCost + regCost + gstCost + utilitiesCost
  const grandTotalAtPossession = constructionTotalCost + totalPossessionAdditions

  // Adaptive breakdown components based on Stage Toggle (At Booking vs At Possession)
  const breakdownComponents = !unitAreaSqft ? [] : costBreakdownStage === 'construction' ? [
    { id: 'base', name: `Base Price (${unitAreaSqft.toLocaleString('en-IN')} sq.ft)`, amount: baseCostVal, pct: ((baseCostVal / constructionTotalCost) * 100).toFixed(1) + '%', color: 'bg-[#2563EB]', stroke: '#2563EB' },
    { id: 'plc', name: 'PLC Charges', amount: plcCostVal, pct: ((plcCostVal / constructionTotalCost) * 100).toFixed(1) + '%', color: 'bg-indigo-500', stroke: '#6366F1' },
    { id: 'club', name: 'Club Membership', amount: clubCostVal, pct: ((clubCostVal / constructionTotalCost) * 100).toFixed(1) + '%', color: 'bg-amber-400', stroke: '#FBBF24' },
    { id: 'ifms', name: 'IFMS (Advance)', amount: ifmsCostVal, pct: ((ifmsCostVal / constructionTotalCost) * 100).toFixed(1) + '%', color: 'bg-orange-500', stroke: '#F97316' },
    { id: 'other', name: 'Other Charges', amount: otherCostVal, pct: ((otherCostVal / constructionTotalCost) * 100).toFixed(1) + '%', color: 'bg-pink-500', stroke: '#EC4899' }
  ] : [
    { id: 'base', name: `Base Price (${unitAreaSqft.toLocaleString('en-IN')} sq.ft)`, amount: baseCostVal, pct: ((baseCostVal / grandTotalAtPossession) * 100).toFixed(1) + '%', color: 'bg-[#2563EB]', stroke: '#2563EB' },
    { id: 'plc', name: 'PLC Charges', amount: plcCostVal, pct: ((plcCostVal / grandTotalAtPossession) * 100).toFixed(1) + '%', color: 'bg-indigo-500', stroke: '#6366F1' },
    { id: 'club', name: 'Club Membership', amount: clubCostVal, pct: ((clubCostVal / grandTotalAtPossession) * 100).toFixed(1) + '%', color: 'bg-amber-400', stroke: '#FBBF24' },
    { id: 'ifms', name: 'IFMS (Advance)', amount: ifmsCostVal, pct: ((ifmsCostVal / grandTotalAtPossession) * 100).toFixed(1) + '%', color: 'bg-orange-500', stroke: '#F97316' },
    { id: 'other', name: 'Other Charges', amount: otherCostVal, pct: ((otherCostVal / grandTotalAtPossession) * 100).toFixed(1) + '%', color: 'bg-pink-500', stroke: '#EC4899' },
    { id: 'stamp', name: `Stamp Duty (${stampDutyPct}%)`, amount: stampDutyCost, pct: ((stampDutyCost / grandTotalAtPossession) * 100).toFixed(1) + '%', color: 'bg-emerald-500', stroke: '#10B981' },
    { id: 'reg', name: `Registration (${regPct}%)`, amount: regCost, pct: ((regCost / grandTotalAtPossession) * 100).toFixed(1) + '%', color: 'bg-teal-500', stroke: '#14B8A6' },
    { id: 'gst', name: `GST (${gstPct}%)`, amount: gstCost, pct: ((gstCost / grandTotalAtPossession) * 100).toFixed(1) + '%', color: 'bg-purple-500', stroke: '#A855F7' },
    { id: 'util', name: 'Utilities & Charges', amount: utilitiesCost, pct: ((utilitiesCost / grandTotalAtPossession) * 100).toFixed(1) + '%', color: 'bg-rose-500', stroke: '#F43F5E' }
  ]

  const activeTotalVal = costBreakdownStage === 'construction' ? constructionTotalCost : grandTotalAtPossession

  const downloadScheduleCSV = () => {
    const activeMilestones = paymentPlanMilestones[selectedPlanTab]
    const headers = ['Milestone', 'Description', 'Percentage Due']
    const rows = activeMilestones.map((m: any) => [m.milestone || m.label || '', m.desc || '', m.pct || ''])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n')
    const link = document.createElement('a')
    link.setAttribute('href', encodeURI(csvContent))
    link.setAttribute('download', `payment_plan_${selectedPlanTab}_${detail?.name?.replace(/\s+/g, '_') ?? 'project'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-6 md:space-y-8 bg-[#F7F9FB] dark:bg-[#0f0e0d] text-gray-900 dark:text-gray-100 font-sans">

      {/* ── 1. PRICING & INVESTMENT HEADER ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        
        {/* Header Title & RERA Pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-white/5">
          <div>
            <h1 className="text-[24px] font-black text-gray-900 dark:text-white tracking-tight">Pricing & Investment</h1>
            <p className="text-[13px] text-gray-500 font-medium mt-0.5">Transparent pricing, flexible plans and complete cost breakdown.</p>
          </div>

          {reraNum && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-[11.5px] font-extrabold self-start sm:self-auto">
              <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" />
              <span>RERA verified · {reraNum}</span>
            </div>
          )}
        </div>

        {/* 4 Stat Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="p-3 sm:p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <IndianRupee size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] sm:text-[18px] font-black text-gray-900 dark:text-white leading-tight truncate">{fmtCr(unitMinCr)}</p>
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold mt-0.5 leading-tight line-clamp-1 sm:line-clamp-none">Starting Price (All Incl.)</p>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] sm:text-[18px] font-black text-gray-900 dark:text-white leading-tight truncate">₹{pricePsf ? pricePsf.toLocaleString('en-IN') : '—'}/sqft</p>
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold mt-0.5 leading-tight line-clamp-1 sm:line-clamp-none">Avg. Price per sq.ft</p>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <CalendarDays size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] sm:text-[18px] font-black text-gray-900 dark:text-white leading-tight truncate">{possessionLabel}</p>
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold mt-0.5 leading-tight line-clamp-1 sm:line-clamp-none">Expected Possession</p>
            </div>
          </div>

          <div className="p-3 sm:p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Percent size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] sm:text-[18px] font-black text-gray-900 dark:text-white leading-tight truncate">10%</p>
              <p className="text-[10px] sm:text-[11px] text-gray-400 font-bold mt-0.5 leading-tight line-clamp-1 sm:line-clamp-none">Booking Amount</p>
            </div>
          </div>
        </div>

        {/* Configuration Selector Pills & View Price List */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[12.5px] font-extrabold text-gray-700 dark:text-gray-300 mr-2 flex-shrink-0">Select Configuration</span>
            {availableBhks.map((bhk) => (
              <button
                key={bhk}
                onClick={() => {
                  setBhkFilter(bhk)
                  const unit = unitTypes.find(u => `${u.bhk} BHK` === bhk)
                  if (unit?.price_min_cr) setPropertyPrice(unit.price_min_cr * 10000000)
                }}
                className={`text-[12px] font-extrabold px-4 py-2 rounded-full transition-all whitespace-nowrap ${
                  bhkFilter === bhk
                    ? 'bg-[#111827] text-white dark:bg-white dark:text-gray-900 shadow-md'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200/60'
                }`}
              >
                {bhk}
              </button>
            ))}
          </div>

          <button
            onClick={downloadScheduleCSV}
            className="text-[12px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Download size={14} /> View Price List
          </button>
        </div>

      </div>

      {/* ── 2. EMI CALCULATOR & AFFORDABILITY (Left Sliders + Right Bar Chart & Eligibility Card) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Interactive Calculator Controls & Amortization Bar Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
          <div>
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">EMI Calculator & Affordability</h2>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">Plan your home loan with our interactive calculator.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            
            {/* Sliders Input Area */}
            <div className="md:col-span-5 space-y-5">
              
              {/* Property Price Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11.5px] font-extrabold">
                  <span className="text-gray-500">Property Price</span>
                  <span className="text-gray-900 dark:text-white font-black">{fmtRs(propertyPrice)}</span>
                </div>
                <input
                  type="range"
                  min={Math.max(1000000, Math.min(propertyPrice * 0.4, 5000000))}
                  max={Math.max(60000000, Math.round(propertyPrice * 1.8))}
                  step={200000}
                  value={propertyPrice}
                  onChange={(e) => setPropertyPrice(Number(e.target.value))}
                  className="w-full accent-blue-600 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                  <span>{fmtRs(Math.max(1000000, Math.min(propertyPrice * 0.4, 5000000)))}</span>
                  <span>{fmtRs(Math.max(60000000, Math.round(propertyPrice * 1.8)))}</span>
                </div>
              </div>

              {/* Down Payment Pct Slider & Quick Pills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11.5px] font-extrabold">
                  <span className="text-gray-500">Down Payment</span>
                  <span className="text-gray-900 dark:text-white font-black">{fmtRs(downPaymentAmount)} ({downPaymentPct}%)</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {[10, 20, 30, 40].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setDownPaymentPct(pct)}
                      className={`py-1.5 text-[11px] font-extrabold rounded-lg border transition-all ${
                        downPaymentPct === pct
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-gray-50 dark:bg-white/5 text-gray-600 border-gray-200/60 dark:border-white/5'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Loan Tenure Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11.5px] font-extrabold">
                  <span className="text-gray-500">Loan Tenure</span>
                  <span className="text-gray-900 dark:text-white font-black">{tenureYears} Years</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  step={5}
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                  <span>5 yrs</span>
                  <span>10 yrs</span>
                  <span>15 yrs</span>
                  <span>25 yrs</span>
                </div>
              </div>

            </div>

            {/* Estimated EMI Summary & Amortization Bar Visualization */}
            <div className="md:col-span-7 bg-gray-50/60 dark:bg-white/5 rounded-2xl p-5 border border-gray-100 dark:border-white/5 space-y-5">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Estimated EMI</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-[28px] font-black text-gray-900 dark:text-white">{fmtRs(estimatedEmi)}</span>
                  <span className="text-[12px] text-gray-400 font-semibold">/ month</span>
                </div>
                <p className="text-[10.5px] text-gray-400 font-medium mt-0.5">@ 8.5% p.a. interest rate</p>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200/60 dark:border-white/5">
                <div>
                  <p className="text-[9.5px] text-gray-400 font-black uppercase">Loan Amount</p>
                  <p className="text-[13px] font-black text-gray-900 dark:text-white mt-0.5">{fmtRs(loanAmount)}</p>
                </div>
                <div>
                  <p className="text-[9.5px] text-gray-400 font-black uppercase">Total Interest</p>
                  <p className="text-[13px] font-black text-gray-900 dark:text-white mt-0.5">{fmtRs(totalInterest)}</p>
                </div>
                <div>
                  <p className="text-[9.5px] text-gray-400 font-black uppercase">Total Payment</p>
                  <p className="text-[13px] font-black text-gray-900 dark:text-white mt-0.5">{fmtRs(totalPayment)}</p>
                </div>
              </div>

              {/* Stacked Amortization Bar Chart */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-600" /> Principal</span>
                  <span className="flex items-center gap-1 text-purple-400"><span className="w-2 h-2 rounded-full bg-purple-400" /> Interest</span>
                </div>
                <div className="h-20 w-full flex items-end justify-between gap-1 pt-2">
                  {Array.from({ length: 15 }).map((_, i) => {
                    const principalH = Math.min(80, 20 + i * 4)
                    const interestH = Math.max(10, 60 - i * 3)
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end h-full group relative">
                        <div style={{ height: `${interestH}%` }} className="bg-purple-300 dark:bg-purple-900/60 rounded-t-sm w-full transition-all group-hover:bg-purple-500" />
                        <div style={{ height: `${principalH}%` }} className="bg-blue-600 w-full rounded-b-sm transition-all group-hover:bg-blue-700" />
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-[9.5px] text-gray-400 font-bold pt-1">
                  <span>Year 1</span>
                  <span>Year 5</span>
                  <span>Year 10</span>
                  <span>Year 15</span>
                  <span>Year {tenureYears}</span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Right Loan Eligibility Side Card */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4 text-center flex flex-col justify-between h-full">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <Landmark size={22} />
            </div>
            <div>
              <h3 className="text-[16px] font-black text-gray-900 dark:text-white">Loan Eligibility</h3>
              <p className="text-[11.5px] text-gray-500 font-medium">You may be eligible for a loan of</p>
              <p className="text-[24px] font-black text-gray-900 dark:text-white mt-1">₹1.6 - ₹2.0 Cr</p>
            </div>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-black mx-auto">
              <CheckCircle2 size={13} /> Looks good!
            </span>
          </div>

          <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-white/5">
            <button
              onClick={() => setShowEligibilityModal(true)}
              className="w-full py-3 bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-black rounded-xl text-[12.5px] shadow-sm hover:opacity-95 transition-opacity"
            >
              Check Eligibility
            </button>
            <p className="text-[10px] text-gray-400 font-semibold">Powered by our lending partners</p>
          </div>
        </div>

      </div>

      {/* ── 3. PAYMENT PLANS (Full-width milestones with exact ₹ amounts) ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        
        {/* Header & Inline Configuration Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-white/5">
          <div>
            <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">Payment Plans</h2>
            <p className="text-[12px] text-gray-500 font-medium mt-0.5">Flexible plans tailored to your cash flow and investment goals.</p>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl self-start sm:self-auto">
            {availableBhks.map((bhk) => (
              <button
                key={bhk}
                onClick={() => {
                  setBhkFilter(bhk)
                  const unit = unitTypes.find(u => `${u.bhk} BHK` === bhk)
                  if (unit?.price_min_cr) setPropertyPrice(unit.price_min_cr * 10000000)
                }}
                className={`text-[11.5px] font-black px-3.5 py-1.5 rounded-xl transition-all ${
                  bhkFilter === bhk ? 'bg-white dark:bg-white/20 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {bhk}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Payment Plan Variant Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: 'clp', name: 'Construction Linked', tag: 'Most Popular', icon: Landmark },
            { id: 'investor', name: 'Investor Plan', tag: 'Better Returns', icon: TrendingUp },
            { id: 'flexi', name: 'Flexi Plan', tag: 'Lower Initial Outgo', icon: Percent },
            { id: 'full', name: 'Full Payment', tag: 'Max Discount', icon: Award }
          ].map((plan) => {
            const isSelected = selectedPlanTab === plan.id
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanTab(plan.id as any)}
                className={`p-4 rounded-2xl cursor-pointer transition-all space-y-2.5 ${
                  isSelected
                    ? 'bg-[#111827] text-white dark:bg-white dark:text-gray-900 shadow-md ring-2 ring-blue-500'
                    : 'bg-gray-50/70 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/5 hover:border-gray-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20 text-white dark:bg-black/10 dark:text-gray-900' : 'bg-white dark:bg-white/10 text-gray-500'}`}>
                  <Icon size={16} />
                </div>
                <div>
                  <h4 className="text-[13.5px] font-black leading-tight">{plan.name}</h4>
                  <p className={`text-[10.5px] font-bold mt-0.5 ${isSelected ? 'text-blue-300 dark:text-blue-600' : 'text-gray-400'}`}>{plan.tag}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Milestone Schedule List with Exact ₹ Amounts + Why Choose Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch pt-2">
          
          {/* Milestone Schedule Items with Exact ₹ Amounts */}
          <div className="md:col-span-8 space-y-3">
            {(paymentPlanMilestones[selectedPlanTab] || []).map((item: any, idx: number) => {
              const milestoneTitle = item.milestone || item.name || item.label || item.stage || item.phase || `Stage ${idx + 1}`
              const milestoneDesc = item.due || item.desc || item.description || (item.done ? 'Completed stage' : 'As per schedule')

              const rawPctVal = item.pct != null
                ? (typeof item.pct === 'number' ? item.pct : parseFloat(String(item.pct).replace('%', '').trim()))
                : (item.percentage != null ? parseFloat(String(item.percentage)) : 0)

              const pctVal = isNaN(rawPctVal) ? 0 : rawPctVal
              const basePrice = propertyPrice > 0 ? propertyPrice : (unitMinCr ? unitMinCr * 10000000 : 0)

              const milestoneAmt = (item.amt && item.amt > 0)
                ? item.amt
                : (item.amount && item.amount > 0)
                ? item.amount
                : (basePrice * (pctVal / 100))

              return (
                <div key={idx} className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center text-[12px] font-black flex-shrink-0">
                      ₹
                    </div>
                    <div>
                      <h5 className="text-[13.5px] font-extrabold text-gray-900 dark:text-white leading-tight">{milestoneTitle}</h5>
                      {milestoneDesc && <p className="text-[11px] text-gray-400 font-semibold">{milestoneDesc}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-[14px] font-black text-gray-900 dark:text-white">{fmtRs(milestoneAmt)}</span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[11.5px] font-black border border-blue-100 dark:border-blue-800/40">
                      {pctVal > 0 ? `${pctVal}%` : (item.pct ? String(item.pct) : '--')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Why Choose Checklist Box */}
          <div className="md:col-span-4 p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-[13.5px] font-black text-emerald-950 dark:text-emerald-200">Why choose this plan?</h4>
              <ul className="space-y-2 text-[11.5px] font-bold text-emerald-900 dark:text-emerald-300">
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600 flex-shrink-0" /> Most preferred by home buyers</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600 flex-shrink-0" /> Pay as construction progresses</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600 flex-shrink-0" /> Lower initial financial burden</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-emerald-600 flex-shrink-0" /> Aligned with project milestones</li>
              </ul>
            </div>

            <button
              onClick={downloadScheduleCSV}
              className="w-full py-2.5 bg-white dark:bg-white/10 text-gray-800 dark:text-gray-200 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-[12px] font-black shadow-sm hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-all mt-2"
            >
              <Download size={14} /> Download Schedule
            </button>
          </div>

        </div>

        {/* Plan Comparison Summary Strip (Positioned directly below payment plans) */}
        <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[13px] font-black text-gray-900 dark:text-white uppercase tracking-wider">Plan Comparison Strip</h4>
            <button onClick={() => setShowCompareModal(true)} className="text-[12px] font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              Compare All Plans <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Percent, title: 'Lowest Outgo', val: 'Flexi Plan', color: 'text-blue-600 bg-blue-50' },
              { icon: TrendingUp, title: 'Best for ROI', val: 'Investor Plan', color: 'text-emerald-600 bg-emerald-50' },
              { icon: Award, title: 'Max Discount', val: 'Full Payment', color: 'text-amber-600 bg-amber-50' },
              { icon: Landmark, title: 'Most Popular', val: 'Construction Linked', color: 'text-purple-600 bg-purple-50' }
            ].map((comp, i) => {
              const Icon = comp.icon
              return (
                <div key={i} className="p-3 rounded-xl bg-gray-50/70 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${comp.color}`}>
                    <Icon size={15} />
                  </div>
                  <div>
                    <p className="text-[9.5px] text-gray-400 font-bold uppercase">{comp.title}</p>
                    <p className="text-[12px] font-black text-gray-900 dark:text-white leading-tight">{comp.val}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* ── 4. COST BREAKDOWN (Full-width detailed itemized list) ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-6">
        <div>
          <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">Cost Breakdown</h2>
          <p className="text-[12px] text-gray-500 font-medium mt-0.5">See exactly what you&apos;re paying for. Hover items to isolate components.</p>
        </div>

        {/* Stage Toggle Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setCostBreakdownStage('construction')}
            className={`text-[12px] font-extrabold px-5 py-2 rounded-full transition-all ${
              costBreakdownStage === 'construction'
                ? 'bg-[#111827] text-white dark:bg-white dark:text-gray-900 shadow-md'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'
            }`}
          >
            At Booking / During Construction
          </button>
          <button
            onClick={() => setCostBreakdownStage('possession')}
            className={`text-[12px] font-extrabold px-5 py-2 rounded-full transition-all ${
              costBreakdownStage === 'possession'
                ? 'bg-[#111827] text-white dark:bg-white dark:text-gray-900 shadow-md'
                : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'
            }`}
          >
            At Possession
          </button>
        </div>

        {/* Main Donut + Expanded Full Width Itemized Breakdown Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
          
          {/* Donut Chart Visual with Segment Isolation */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-4">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#E5E7EB" strokeWidth="10" />
                {(() => {
                  const CIRCUMFERENCE = 314.159
                  let accumulatedOffset = 0
                  return breakdownComponents.map((item, i) => {
                    const ratio = item.amount / activeTotalVal
                    const strokeLen = ratio * CIRCUMFERENCE
                    const gapLen = CIRCUMFERENCE - strokeLen
                    const currentOffset = accumulatedOffset
                    accumulatedOffset += strokeLen
                    const isIsolated = hoveredCostIdx === i

                    return (
                      <circle
                        key={item.id}
                        cx="60" cy="60" r="50"
                        fill="none"
                        stroke={item.stroke}
                        strokeWidth={isIsolated ? "15" : "10"}
                        strokeDasharray={`${strokeLen} ${gapLen}`}
                        strokeDashoffset={-currentOffset}
                        opacity={hoveredCostIdx === null || isIsolated ? 1 : 0.3}
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setHoveredCostIdx(i)}
                        onMouseLeave={() => setHoveredCostIdx(null)}
                      />
                    )
                  })
                })()}
              </svg>
              <div className="absolute flex flex-col items-center text-center space-y-0.5 pointer-events-none p-2">
                <span className="text-[9.5px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                  {hoveredCostIdx !== null ? breakdownComponents[hoveredCostIdx].name.split(' (')[0] : (costBreakdownStage === 'construction' ? 'Total (Till Possession)' : 'Total at Possession')}
                </span>
                <span className="text-[19px] font-black text-gray-900 dark:text-white leading-tight mt-1">
                  {hoveredCostIdx !== null ? fmtRs(breakdownComponents[hoveredCostIdx].amount) : fmtRs(activeTotalVal)}
                </span>
              </div>
            </div>
          </div>

          {/* Full-Width Detailed Itemized Table (lg:col-span-8) */}
          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black text-gray-400 uppercase tracking-wider px-3 pb-2 border-b border-gray-100 dark:border-white/5">
              <span>Cost Component</span>
              <div className="flex items-center gap-12">
                <span>Amount (₹)</span>
                <span className="w-16 text-right">% Share</span>
              </div>
            </div>

            {breakdownComponents.map((item, i) => (
              <div
                key={item.id}
                onMouseEnter={() => setHoveredCostIdx(i)}
                onMouseLeave={() => setHoveredCostIdx(null)}
                className={`flex items-center justify-between text-[13px] px-3 py-3 rounded-xl transition-all cursor-pointer border ${
                  hoveredCostIdx === i ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-800/40 font-extrabold shadow-sm' : 'border-transparent hover:bg-gray-50/80 dark:hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${item.color} shadow-sm`} />
                  <span className="font-extrabold text-gray-800 dark:text-gray-200">{item.name}</span>
                </div>
                <div className="flex items-center gap-12">
                  <span className="font-black text-gray-900 dark:text-white">{fmtRs(item.amount)}</span>
                  <span className="text-[12px] font-extrabold text-gray-500 dark:text-gray-400 w-16 text-right">{item.pct}</span>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between text-[14px] font-black p-3.5 bg-gray-50/80 dark:bg-white/5 rounded-xl border border-gray-200/60 dark:border-white/10 mt-3">
              <span className="text-gray-900 dark:text-white">
                {costBreakdownStage === 'construction' ? 'Total (Till Possession)' : 'Grand Total (All Inclusive at Possession)'}
              </span>
              <div className="flex items-center gap-12">
                <span className="text-gray-900 dark:text-white text-[15px]">{fmtRs(activeTotalVal)}</span>
                <span className="text-gray-900 dark:text-white w-16 text-right">100%</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 5. CURRENT OFFERS & BENEFITS ── */}
      <div className="bg-white dark:bg-[#111] ring-1 ring-inset ring-black/5 dark:ring-white/10 rounded-[24px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div>
          <h2 className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">Current Offers & Benefits</h2>
          <p className="text-[12px] text-gray-500 font-medium mt-0.5">Limited time offers from builder and our trusted partners.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { tag: 'Builder Offer', title: 'Up to ₹5 Lakh', desc: 'Early booking discount', icon: Gift, bg: 'bg-rose-50 text-rose-600' },
            { tag: 'Bank Offer', title: '0.25% Lower Rate', desc: 'With HDFC / ICICI', icon: Landmark, bg: 'bg-blue-50 text-blue-600' },
            { tag: 'Partner Offer', title: 'Free Club Membership', desc: 'Via our channel partners', icon: Sparkles, bg: 'bg-amber-50 text-amber-600' },
            { tag: 'Festival Offer', title: 'Valid till 31st Dec', desc: 'Limited period only', icon: CalendarDays, bg: 'bg-purple-50 text-purple-600' }
          ].map((offer, i) => {
            const Icon = offer.icon
            return (
              <div key={i} className="p-4 rounded-2xl bg-gray-50/60 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${offer.bg}`}>
                  <Icon size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                    {offer.tag}
                  </span>
                  <h4 className="text-[14px] font-black text-gray-900 dark:text-white mt-1 leading-tight">{offer.title}</h4>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">{offer.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 6. READY TO BOOK CTA BANNER ── */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-black dark:from-[#1c1815] dark:to-[#0f0e0d] text-white rounded-[24px] p-6 md:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <h3 className="text-[20px] md:text-[24px] font-black tracking-tight">Ready to book your dream home?</h3>
          <p className="text-[13px] text-gray-300 font-medium">Get the best price, flexible plans and expert guidance from our relationship manager.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            onClick={onGoToCosts}
            className="px-6 py-3.5 bg-white text-gray-900 hover:bg-gray-100 font-black rounded-2xl text-[13px] transition-all shadow-lg hover:scale-105 flex items-center gap-2 whitespace-nowrap"
          >
            <CalendarDays size={17} />
            Book Site Visit
          </button>

          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 border border-white/20 hover:border-white text-white font-black rounded-2xl text-[13px] transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <PhoneCall size={17} />
              Talk to an Advisor
            </a>
          )}
        </div>
      </div>

      <p className="text-center text-[10.5px] text-gray-400 font-medium pt-1">
        ⓘ All prices are in Indian Rupees (₹). Amounts are indicative and subject to change without prior notice. Taxes and registration charges are additional.
      </p>

      {/* ── PLAN COMPARISON MODAL ── */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151515] rounded-[24px] max-w-2xl w-full p-6 shadow-2xl space-y-6 relative border border-gray-200 dark:border-white/10">
            <button
              onClick={() => setShowCompareModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900"
            >
              <X size={16} />
            </button>
            <div>
              <h3 className="text-[20px] font-black text-gray-900 dark:text-white">Compare All Payment Plans</h3>
              <p className="text-[12px] text-gray-500 font-medium">Detailed breakdown across all payment options for {bhkFilter}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-gray-400 uppercase text-[10px] font-black">
                    <th className="pb-3">Plan Variant</th>
                    <th className="pb-3">Booking Amt</th>
                    <th className="pb-3">Construction Stages</th>
                    <th className="pb-3">On Possession</th>
                    <th className="pb-3 text-right">Best Suited For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-extrabold">
                  <tr>
                    <td className="py-3 text-blue-600">Construction Linked</td>
                    <td className="py-3">10%</td>
                    <td className="py-3">65%</td>
                    <td className="py-3">25%</td>
                    <td className="py-3 text-right text-gray-500">Most Home Buyers</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-emerald-600">Investor Plan</td>
                    <td className="py-3">20%</td>
                    <td className="py-3">60%</td>
                    <td className="py-3">20%</td>
                    <td className="py-3 text-right text-gray-500">Higher Capital Growth</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-purple-600">Flexi Plan</td>
                    <td className="py-3">10%</td>
                    <td className="py-3">70%</td>
                    <td className="py-3">20%</td>
                    <td className="py-3 text-right text-gray-500">Lower Initial Outgo</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-amber-600">Full Payment</td>
                    <td className="py-3">10%</td>
                    <td className="py-3">90% (in 45 days)</td>
                    <td className="py-3">0%</td>
                    <td className="py-3 text-right text-gray-500">Max Discount Buyers</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-6 py-2.5 bg-gray-900 text-white font-black rounded-xl text-[12px]"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CHECK ELIGIBILITY MODAL ── */}
      {showEligibilityModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#151515] rounded-[24px] max-w-md w-full p-6 shadow-2xl space-y-6 relative border border-gray-200 dark:border-white/10">
            <button
              onClick={() => setShowEligibilityModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900"
            >
              <X size={16} />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Landmark size={24} />
              </div>
              <h3 className="text-[20px] font-black text-gray-900 dark:text-white">Loan Pre-Approval</h3>
              <p className="text-[12px] text-gray-500 font-medium">Calculate instant pre-approval terms with our banking partners (HDFC, ICICI, SBI).</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 space-y-2 text-[12.5px] font-extrabold">
              <div className="flex justify-between">
                <span className="text-gray-500">Selected Unit</span>
                <span>{bhkFilter} {unitAreaSqft ? `(${unitAreaSqft} sq.ft)` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Property Price</span>
                <span>{fmtRs(propertyPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estimated EMI</span>
                <span className="text-blue-600">{fmtRs(estimatedEmi)}/mo</span>
              </div>
            </div>

            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-blue-600 text-white font-black rounded-xl text-[13px] flex items-center justify-center gap-2 shadow-md hover:bg-blue-700 transition-colors"
              >
                <PhoneCall size={16} /> Get Bank Pre-Approval Call
              </a>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
