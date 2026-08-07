'use client'

import { useState } from 'react'
import { 
  Loader2, 
  Upload, 
  CheckCircle2, 
  Plus, 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Globe, 
  Info,
  Building2,
  FileText,
  Users,
  Award,
  Sparkles,
  ShieldCheck,
  Edit3,
  MapPin,
  Briefcase,
  ExternalLink,
  Trash2
} from 'lucide-react'
import { m, AnimatePresence } from 'framer-motion'
import Toast from './Toast'
import Image from 'next/image'

type FormStep = 'company' | 'legal' | 'team' | 'projects' | 'media' | 'review'
const STEPS: FormStep[] = ['company', 'legal', 'team', 'projects', 'media', 'review']

const STEP_TITLES: Record<FormStep, { title: string; desc: string; icon: React.ComponentType<{ className?: string; size?: number }> }> = {
  company: { title: 'Company Details', desc: 'Basic information about your business.', icon: Building2 },
  legal:   { title: 'Legal Entities', desc: 'Registered operating & RERA entities.', icon: FileText },
  team:    { title: 'Executive Team', desc: 'Key leadership details.', icon: Users },
  projects:{ title: 'Track Record', desc: 'Past delivery performance & scale.', icon: Award },
  media:   { title: 'Brand Identity', desc: 'Logos, tagline, and web presence.', icon: Sparkles },
  review:  { title: 'Review & Submit', desc: 'Verify all details before submitting.', icon: ShieldCheck },
}

export default function BuilderRegistrationForm() {
  const [activeStep, setActiveStep] = useState<FormStep>('company')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [applicationId, setApplicationId] = useState<string>('')
  const [stepErrors, setStepErrors] = useState<Record<string, string[]>>({})

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+91',
    landline: '',
    cin: '',
    website: '',
    headquarters: '',
    legalEntities: [{ name: '', registration_number: '', state: '' }],
    executives: [{ name: '', title: '', experience_years: '', linkedin: '' }],
    projects: [] as string[],
    projectInput: '',
    completed_projects_count: '',
    sqft_delivered: '',
    delivery_track: '',
    description: '',
    tagline: '',
    logo: null as string | null,
    authorizedConfirmation: true
  })

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setToast({ message: 'Logo must be less than 2MB' })
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, logo: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const currentIdx = STEPS.indexOf(activeStep)

  const validateStep = (step: FormStep): string[] => {
    const errors: string[] = []
    if (step === 'company') {
      if (!formData.name.trim()) errors.push('Company name is required')
      if (!formData.email.trim()) errors.push('Official email is required')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.push('Please enter a valid email address')
      if (!formData.phone.trim() || !/^\+91\d{10}$/.test(formData.phone)) errors.push('Phone number must be +91 followed by 10 digits')
      if (!formData.cin.trim()) errors.push('Company CIN is required')
      if (!/^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/i.test(formData.cin.trim())) errors.push('Invalid 21-character CIN format')
    }
    if (step === 'legal') {
      const hasValidLegal = formData.legalEntities.some(e => e.name?.trim() && e.registration_number?.trim())
      if (!hasValidLegal) errors.push('Please add at least one legal entity with RERA registration number')
    }
    if (step === 'team') {
      const hasValidExec = formData.executives.some(e => e.name?.trim() && e.title?.trim())
      if (!hasValidExec) errors.push('Please add at least one executive team member')
    }
    return errors
  }

  const handleNext = () => {
    const errors = validateStep(activeStep)
    if (errors.length > 0) {
      setStepErrors({ ...stepErrors, [activeStep]: errors })
      setToast({ message: errors[0] })
      return
    }
    setStepErrors({ ...stepErrors, [activeStep]: [] })
    if (currentIdx < STEPS.length - 1) setActiveStep(STEPS[currentIdx + 1])
  }

  const handleBack = () => {
    if (currentIdx > 0) setActiveStep(STEPS[currentIdx - 1])
  }

  const handleAddProject = () => {
    if (!formData.projectInput.trim()) return
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, prev.projectInput.trim()],
      projectInput: ''
    }))
  }

  const handleRemoveProject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    const companyErrors = validateStep('company')
    if (companyErrors.length > 0) {
      setActiveStep('company')
      setToast({ message: companyErrors[0] })
      return
    }

    if (!formData.authorizedConfirmation) {
      setToast({ message: 'Please confirm authorization to submit' })
      return
    }

    setIsSubmitting(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/v1/builder-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, 
          email: formData.email, 
          phone: formData.phone, 
          landline: formData.landline || undefined, 
          cin: formData.cin.toUpperCase(),
          website: formData.website || undefined, 
          headquarters: formData.headquarters || undefined,
          description: formData.description || undefined, 
          logo_url: formData.logo || undefined,
          legal_entities: formData.legalEntities.filter(e => e.name),
          executives: formData.executives.filter(e => e.name),
          projects: formData.projects, 
          delivery_track: formData.delivery_track || undefined,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setApplicationId(data.application_id || `APP-${Math.floor(100000 + Math.random() * 900000)}`)
        setSubmitted(true)
      } else {
        setToast({ message: data.error || 'Failed to submit application' })
      }
    } catch {
      setToast({ message: 'Error connecting to registration service' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const [infoTooltip, setInfoTooltip] = useState<string | null>(null)

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vh] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50vw] h-[50vh] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <m.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="max-w-[460px] w-full text-center p-10 sm:p-12 bg-white rounded-[28px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] mx-4 relative z-10">
          <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-sm">
            <CheckCircle2 size={32} strokeWidth={2.2} />
          </div>
          <h2 className="text-[22px] font-bold text-zinc-900 tracking-tight mb-2">Application Received</h2>
          <p className="text-[14px] text-zinc-500 mb-8 leading-relaxed">
            Our verification team is reviewing your developer profile — expect a response within 2–3 business days at your registered email (<span className="font-semibold text-zinc-800">{formData.email}</span>).
          </p>
          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/60 flex flex-col items-center justify-center gap-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reference Application ID</span>
            <code className="text-[15px] font-mono font-bold text-blue-600 tracking-wider">{applicationId}</code>
          </div>
        </m.div>
      </div>
    )
  }

  // Regex Patterns
  const cinRegex = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/i
  const phoneRegex = /^\+91\d{10}$/
  const landlineRegex = /^0\d{2,4}-\d{6,8}$/
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const getInputStyle = (val: string, regex?: RegExp) => {
    const base = "w-full bg-white text-zinc-900 text-[14px] px-3.5 py-2.5 rounded-[12px] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:ring-[3px] transition-all placeholder:text-zinc-400 border "
    if (!val || !regex) return base + "border-black/10 focus:border-blue-500 focus:ring-blue-500/20"
    return regex.test(val)
      ? base + "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/20"
      : base + "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
  }

  const inputBase = "w-full bg-white border border-black/10 text-zinc-900 text-[14px] px-3.5 py-2.5 rounded-[12px] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/20 transition-all placeholder:text-zinc-400"
  const labelBase = "block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-0.5"

  const renderLabel = (text: string, tooltip?: string) => (
    <div className="flex items-center gap-1.5 mb-1.5 ml-0.5 relative">
      <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">{text}</label>
      {tooltip && (
        <div 
          className="relative flex items-center justify-center cursor-pointer text-zinc-400 hover:text-zinc-700 transition-colors"
          onMouseEnter={() => setInfoTooltip(text)}
          onMouseLeave={() => setInfoTooltip(null)}
          onClick={() => setInfoTooltip(infoTooltip === text ? null : text)}
        >
          <Info size={14} />
          {infoTooltip === text && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 p-2.5 bg-zinc-900 text-white text-[11px] font-medium rounded-xl shadow-xl z-50 text-center leading-relaxed pointer-events-none">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-900" />
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); activeStep === 'review' ? handleSubmit() : handleNext() }} className="min-h-screen flex items-center justify-center bg-[#FAFAFA] relative overflow-hidden p-4 sm:p-8 font-sans selection:bg-blue-100 selection:text-blue-900">
      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}

      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 w-[80vw] h-[80vh] bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-[70vw] h-[70vw] bg-gradient-to-tr from-indigo-500/5 to-transparent rounded-full blur-[100px] pointer-events-none -translate-x-1/4 translate-y-1/4" />

      {/* Main Split Card */}
      <div className="w-full max-w-[1060px] min-h-[720px] md:h-[780px] bg-white rounded-[28px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] relative z-10 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Sidebar Stepper */}
        <div className="w-full md:w-[340px] bg-zinc-50/70 border-r border-black/[0.04] p-6 md:p-8 flex flex-col shrink-0 justify-between">
          <div>
            <Image src="/images/icons/ExpandedRealtyPalsBlack.png" alt="RealtyPals" width={105} height={26} className="object-contain mb-6 opacity-90" unoptimized />
            
            <h1 className="text-[19px] font-bold text-zinc-900 tracking-tight leading-snug mb-1.5">
              Developer Onboarding
            </h1>
            <p className="text-[12px] text-zinc-500 leading-relaxed mb-6">
              Showcase your projects to serious buyers. Verified developer profile, direct qualified inquiries.
            </p>

            {/* Step Navigation Menu */}
            <div className="space-y-2 relative ml-0.5">
              <div className="absolute left-[11px] top-[20px] bottom-[20px] w-[1px] bg-black/[0.08]" />
              
              {STEPS.map((step, idx) => {
                const isActive = idx === currentIdx
                const isPassed = idx < currentIdx
                const IconComponent = STEP_TITLES[step].icon

                return (
                  <div 
                    key={step} 
                    onClick={() => setActiveStep(step)} 
                    className={`flex items-center gap-3 p-2 rounded-xl transition-all duration-200 cursor-pointer relative z-10 group ${
                      isActive ? 'bg-white shadow-xs border border-black/5' : 'hover:bg-zinc-100/60'
                    }`}
                  >
                    <div className={`w-[24px] h-[24px] rounded-full flex items-center justify-center shrink-0 transition-all duration-300 relative ${
                      isActive 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : isPassed 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-zinc-200/80 text-zinc-400 group-hover:text-zinc-600'
                    }`}>
                      {isPassed ? <CheckCircle2 size={12} strokeWidth={3} /> : <IconComponent size={12} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className={`text-[12px] font-bold transition-colors truncate ${
                        isActive ? 'text-zinc-900' : isPassed ? 'text-zinc-700' : 'text-zinc-400'
                      }`}>
                        {STEP_TITLES[step].title}
                      </h3>
                      {isActive && (
                        <p className="text-[10.5px] text-zinc-500 truncate font-medium">
                          {STEP_TITLES[step].desc}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Left Footer Info */}
          <div className="pt-6 border-t border-black/[0.04]">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>RERA Verification Standard</span>
            </div>
          </div>
        </div>

        {/* Right Area: Form Content */}
        <div className="flex-1 flex flex-col relative bg-white">
          <div className="flex-1 p-8 sm:p-10 lg:px-14 lg:py-10 overflow-y-auto custom-scrollbar">
            <div className="max-w-[480px] mx-auto">
              
              {/* Step Title Header */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold mb-2">
                  <span>Step {currentIdx + 1} of {STEPS.length}</span>
                </div>
                <h2 className="text-[22px] font-bold text-zinc-900 tracking-tight">{STEP_TITLES[activeStep].title}</h2>
                <p className="text-[13px] text-zinc-500">{STEP_TITLES[activeStep].desc}</p>
              </div>

              <AnimatePresence mode="wait">
                <m.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* TAB 1: COMPANY DETAILS */}
                  {activeStep === 'company' && (
                    <div className="space-y-4">
                      <div>
                        <label className={labelBase}>Company Name *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. DLF Limited" 
                          value={formData.name} 
                          onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} 
                          className={getInputStyle(formData.name)} 
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          {renderLabel("Company CIN *", "Must be a 21-character alphanumeric code (e.g., L70101DL1963GOI002484)")}
                          <input 
                            type="text" 
                            placeholder="L70101DL1963GOI..." 
                            maxLength={21} 
                            value={formData.cin} 
                            onChange={(e) => setFormData(p => ({...p, cin: e.target.value.toUpperCase()}))} 
                            className={getInputStyle(formData.cin, cinRegex)} 
                          />
                        </div>

                        <div>
                          {renderLabel("Phone Number *", "Format: +91 followed by 10 digits")}
                          <input 
                            type="tel" 
                            placeholder="+919876543210" 
                            maxLength={13} 
                            value={formData.phone} 
                            onChange={(e) => {
                              let val = e.target.value
                              if (!val.startsWith('+91')) val = '+91' + val.replace(/^\+?9?1?/, '')
                              setFormData(p => ({...p, phone: val}))
                            }} 
                            className={getInputStyle(formData.phone, phoneRegex)} 
                          />
                        </div>

                        <div>
                          {renderLabel("Landline (Optional)", "Format: STD-Number (e.g., 011-1234567)")}
                          <input 
                            type="tel" 
                            placeholder="011-1234567" 
                            value={formData.landline} 
                            onChange={(e) => setFormData(p => ({...p, landline: e.target.value}))} 
                            className={getInputStyle(formData.landline, landlineRegex)} 
                          />
                        </div>

                        <div>
                          {renderLabel("Official Email *", "Must be a valid business email")}
                          <input 
                            type="email" 
                            placeholder="contact@builder.com" 
                            value={formData.email} 
                            onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} 
                            className={getInputStyle(formData.email, emailRegex)} 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className={labelBase}>Headquarters City</label>
                          <input 
                            type="text" 
                            placeholder="e.g. Noida / Gurgaon" 
                            value={formData.headquarters} 
                            onChange={(e) => setFormData(p => ({...p, headquarters: e.target.value}))} 
                            className={inputBase} 
                          />
                        </div>
                        <div>
                          <label className={labelBase}>Official Website</label>
                          <input 
                            type="url" 
                            placeholder="https://www.builder.com" 
                            value={formData.website} 
                            onChange={(e) => setFormData(p => ({...p, website: e.target.value}))} 
                            className={inputBase} 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: LEGAL ENTITIES */}
                  {activeStep === 'legal' && (
                    <div className="space-y-4">
                      {formData.legalEntities.map((entity, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-zinc-50 border border-black/5 space-y-3 relative group">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                              Legal Entity #{i + 1}
                            </span>
                            {formData.legalEntities.length > 1 && (
                              <button 
                                onClick={() => {
                                  const n = formData.legalEntities.filter((_, idx) => idx !== i)
                                  setFormData(p => ({...p, legalEntities: n}))
                                }} 
                                className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                              <label className={labelBase}>Registered Entity Name *</label>
                              <input 
                                type="text" 
                                placeholder="e.g. DLF Home Developers Ltd" 
                                value={entity.name} 
                                onChange={(e) => { 
                                  const n = [...formData.legalEntities]
                                  n[i].name = e.target.value
                                  setFormData(p => ({...p, legalEntities: n})) 
                                }} 
                                className={inputBase} 
                              />
                            </div>

                            <div>
                              <label className={labelBase}>RERA Registration # *</label>
                              <input 
                                type="text" 
                                placeholder="e.g. UPRERAPRJ12345" 
                                value={entity.registration_number} 
                                onChange={(e) => { 
                                  const n = [...formData.legalEntities]
                                  n[i].registration_number = e.target.value.toUpperCase()
                                  setFormData(p => ({...p, legalEntities: n})) 
                                }} 
                                className={inputBase} 
                              />
                            </div>

                            <div>
                              <label className={labelBase}>Operating State</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Uttar Pradesh" 
                                value={entity.state || ''} 
                                onChange={(e) => { 
                                  const n = [...formData.legalEntities]
                                  n[i].state = e.target.value
                                  setFormData(p => ({...p, legalEntities: n})) 
                                }} 
                                className={inputBase} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button 
                        onClick={() => setFormData(prev => ({
                          ...prev, 
                          legalEntities: [...prev.legalEntities, { name: '', registration_number: '', state: '' }]
                        }))} 
                        className="w-full py-3 rounded-2xl border border-dashed border-black/15 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={15} /> Add Another Legal Entity
                      </button>
                    </div>
                  )}

                  {/* TAB 3: EXECUTIVE TEAM */}
                  {activeStep === 'team' && (
                    <div className="space-y-4">
                      {formData.executives.map((exec, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-zinc-50 border border-black/5 space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                              Leader #{i + 1}
                            </span>
                            {formData.executives.length > 1 && (
                              <button 
                                onClick={() => {
                                  const n = formData.executives.filter((_, idx) => idx !== i)
                                  setFormData(p => ({...p, executives: n}))
                                }} 
                                className="text-zinc-400 hover:text-rose-600 transition-colors p-1"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className={labelBase}>Executive Name *</label>
                              <input 
                                type="text" 
                                placeholder="e.g. Rajiv Singh" 
                                value={exec.name} 
                                onChange={(e) => { 
                                  const n = [...formData.executives]
                                  n[i].name = e.target.value
                                  setFormData(p => ({...p, executives: n})) 
                                }} 
                                className={inputBase} 
                              />
                            </div>

                            <div>
                              <label className={labelBase}>Title / Designation *</label>
                              <select 
                                value={exec.title} 
                                onChange={(e) => { 
                                  const n = [...formData.executives]
                                  n[i].title = e.target.value
                                  setFormData(p => ({...p, executives: n})) 
                                }} 
                                className={inputBase}
                              >
                                <option value="">Select Title...</option>
                                <option value="Chairman">Chairman</option>
                                <option value="Managing Director">Managing Director</option>
                                <option value="CEO">CEO</option>
                                <option value="Director">Director</option>
                                <option value="President">President</option>
                                <option value="Vice President">Vice President</option>
                                <option value="COO">COO</option>
                                <option value="CFO">CFO</option>
                              </select>
                            </div>

                            <div>
                              <label className={labelBase}>Experience (Years)</label>
                              <input 
                                type="number" 
                                placeholder="e.g. 15" 
                                value={exec.experience_years || ''} 
                                onChange={(e) => { 
                                  const n = [...formData.executives]
                                  n[i].experience_years = e.target.value
                                  setFormData(p => ({...p, executives: n})) 
                                }} 
                                className={inputBase} 
                              />
                            </div>

                            <div>
                              <label className={labelBase}>LinkedIn Profile</label>
                              <input 
                                type="url" 
                                placeholder="https://linkedin.com/in/..." 
                                value={exec.linkedin || ''} 
                                onChange={(e) => { 
                                  const n = [...formData.executives]
                                  n[i].linkedin = e.target.value
                                  setFormData(p => ({...p, executives: n})) 
                                }} 
                                className={inputBase} 
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button 
                        onClick={() => setFormData(prev => ({
                          ...prev, 
                          executives: [...prev.executives, { name: '', title: '', experience_years: '', linkedin: '' }]
                        }))} 
                        className="w-full py-3 rounded-2xl border border-dashed border-black/15 text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus size={15} /> Add Executive Member
                      </button>
                    </div>
                  )}

                  {/* TAB 4: TRACK RECORD */}
                  {activeStep === 'projects' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelBase}>Completed Projects Count</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 25+ Delivered" 
                            value={formData.completed_projects_count} 
                            onChange={(e) => setFormData(p => ({...p, completed_projects_count: e.target.value}))} 
                            className={inputBase} 
                          />
                        </div>

                        <div>
                          <label className={labelBase}>Total Sq.Ft Delivered</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 10 Million Sq.Ft" 
                            value={formData.sqft_delivered} 
                            onChange={(e) => setFormData(p => ({...p, sqft_delivered: e.target.value}))} 
                            className={inputBase} 
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelBase}>Flagship / Notable Projects</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Type project name and press Add..." 
                            value={formData.projectInput} 
                            onChange={(e) => setFormData(p => ({...p, projectInput: e.target.value}))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddProject(); } }}
                            className={inputBase} 
                          />
                          <button
                            type="button"
                            onClick={handleAddProject}
                            className="px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors"
                          >
                            Add
                          </button>
                        </div>

                        {formData.projects.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            {formData.projects.map((proj, idx) => (
                              <span 
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 text-zinc-800 text-xs font-bold border border-zinc-200"
                              >
                                <span>{proj}</span>
                                <button onClick={() => handleRemoveProject(idx)} className="text-zinc-400 hover:text-zinc-700">
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className={labelBase}>Delivery Record Summary</label>
                        <textarea 
                          placeholder="Describe your track record of timely delivery, construction quality, and customer satisfaction..." 
                          value={formData.delivery_track} 
                          onChange={(e) => setFormData(p => ({...p, delivery_track: e.target.value}))} 
                          rows={3} 
                          className={`${inputBase} resize-none`} 
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 5: BRAND IDENTITY */}
                  {activeStep === 'media' && (
                    <div className="space-y-4">
                      <div>
                        <label className={labelBase}>Company Logo</label>
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, image/svg+xml" 
                            onChange={handleLogoUpload} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                          />
                          <div className="border border-dashed border-black/15 bg-zinc-50/50 p-6 rounded-2xl text-center group hover:bg-zinc-50 transition-all flex flex-col items-center">
                            {formData.logo ? (
                              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-black/10 shadow-sm mb-3 relative bg-white p-2">
                                <Image src={formData.logo} alt="Logo preview" width={80} height={80} className="w-full h-full object-contain" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 text-zinc-400 shadow-sm border border-black/5 group-hover:text-zinc-900 transition-colors">
                                <Upload size={18} />
                              </div>
                            )}
                            <p className="text-[13px] font-bold text-zinc-800">
                              {formData.logo ? 'Click to change logo' : 'Click or drag logo to upload'}
                            </p>
                            <p className="text-[11px] text-zinc-400 mt-0.5">SVG, PNG, or JPG (max 2MB)</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={labelBase}>Corporate Tagline / Slogan</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Building Trust, Delivering Excellence" 
                          value={formData.tagline} 
                          onChange={(e) => setFormData(p => ({...p, tagline: e.target.value}))} 
                          className={inputBase} 
                        />
                      </div>

                      <div>
                        <label className={labelBase}>Company Bio & Overview</label>
                        <textarea 
                          placeholder="Brief description of your real estate business, vision, and core philosophy..." 
                          value={formData.description} 
                          onChange={(e) => setFormData(p => ({...p, description: e.target.value}))} 
                          rows={3} 
                          className={`${inputBase} resize-none`} 
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB 6: REVIEW & SUBMIT */}
                  {activeStep === 'review' && (
                    <div className="space-y-4">
                      {/* Summary Card: Company */}
                      <div className="p-4 rounded-2xl bg-zinc-50 border border-black/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Company</span>
                          <button onClick={() => setActiveStep('company')} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                            <Edit3 size={12} /> Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-zinc-400 block text-[10px]">Name</span>
                            <span className="font-bold text-zinc-900 truncate block">{formData.name || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px]">CIN</span>
                            <span className="font-mono font-bold text-zinc-900 truncate block">{formData.cin || 'Not provided'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px]">Phone</span>
                            <span className="font-mono font-bold text-zinc-900 truncate block">{formData.phone}</span>
                          </div>
                          <div>
                            <span className="text-zinc-400 block text-[10px]">Email</span>
                            <span className="font-bold text-zinc-900 truncate block">{formData.email || 'Not provided'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Summary Card: Legal */}
                      <div className="p-4 rounded-2xl bg-zinc-50 border border-black/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Legal Entities</span>
                          <button onClick={() => setActiveStep('legal')} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                            <Edit3 size={12} /> Edit
                          </button>
                        </div>
                        <div className="space-y-1">
                          {formData.legalEntities.filter(e => e.name).map((e, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs font-medium text-zinc-800">
                              <span>{e.name}</span>
                              <span className="font-mono text-zinc-500 text-[11px]">{e.registration_number}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary Card: Team */}
                      <div className="p-4 rounded-2xl bg-zinc-50 border border-black/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Leadership</span>
                          <button onClick={() => setActiveStep('team')} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                            <Edit3 size={12} /> Edit
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {formData.executives.filter(e => e.name).map((e, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-black/5 text-xs font-semibold text-zinc-800">
                              {e.name} <span className="text-zinc-400 font-normal">({e.title})</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Authorization Confirmation */}
                      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                        <input 
                          type="checkbox" 
                          id="confirm-auth"
                          checked={formData.authorizedConfirmation}
                          onChange={(e) => setFormData(p => ({...p, authorizedConfirmation: e.target.checked}))}
                          className="mt-1 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="confirm-auth" className="text-xs text-blue-900 font-medium leading-relaxed cursor-pointer select-none">
                          I certify that I am an authorized representative of <strong>{formData.name || 'this developer company'}</strong> and that all details provided are accurate for RERA verification.
                        </label>
                      </div>
                    </div>
                  )}
                </m.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Form Action Controls (Bottom Bar) */}
          <div className="px-8 sm:px-14 py-5 border-t border-black/[0.04] flex items-center justify-between bg-white mt-auto">
            <button
              onClick={handleBack}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                currentIdx === 0 ? 'opacity-0 pointer-events-none' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <ArrowLeft size={16} /> Back
            </button>
            
            <button
              onClick={activeStep === 'review' ? handleSubmit : handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-black transition-all shadow-md active:scale-[0.98] group"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : activeStep === 'review' ? (
                <>
                  <ShieldCheck size={16} />
                  <span>Submit Profile</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform opacity-70" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
