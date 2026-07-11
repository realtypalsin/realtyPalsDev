'use client'

import { useState } from 'react'
import { Loader2, Upload, CheckCircle2, Plus, X, ArrowLeft, ArrowRight, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Toast from './Toast'
import Image from 'next/image'

type FormStep = 'company' | 'legal' | 'team' | 'projects' | 'media' | 'review'
const STEPS: FormStep[] = ['company', 'legal', 'team', 'projects', 'media', 'review']

const STEP_TITLES: Record<FormStep, { title: string; desc: string }> = {
  company: { title: 'Company Details', desc: 'Basic information about your business.' },
  legal:   { title: 'Legal Entities', desc: 'Registered operating entities.' },
  team:    { title: 'Executive Team', desc: 'Key leadership details.' },
  projects:{ title: 'Track Record', desc: 'Past delivery performance.' },
  media:   { title: 'Brand Identity', desc: 'Logos and public presence.' },
  review:  { title: 'Review & Submit', desc: 'Verify all details before submitting.' },
}

export default function BuilderRegistrationForm() {
  const [activeStep, setActiveStep] = useState<FormStep>('company')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [applicationId, setApplicationId] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '+91', landline: '', cin: '', website: '', headquarters: '',
    legalEntities: [{ name: '', registration_number: '' }],
    executives: [{ name: '', title: '', experience_years: 0 }],
    projects: [] as string[], delivery_track: '', description: '', logo: null as string | null
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

  const handleNext = () => {
    if (currentIdx < STEPS.length - 1) setActiveStep(STEPS[currentIdx + 1])
  }

  const handleBack = () => {
    if (currentIdx > 0) setActiveStep(STEPS[currentIdx - 1])
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.cin) {
      setToast({ message: 'Please fill in all required fields' })
      return
    }

    const cinRegex = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/
    if (!cinRegex.test(formData.cin.toUpperCase())) {
      setToast({ message: 'Invalid CIN format. Must be 21 characters.' })
      return
    }
    if (!/^\+91\d{10}$/.test(formData.phone)) {
      setToast({ message: 'Phone must be +91 followed by 10 digits.' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setToast({ message: 'Invalid email format.' })
      return
    }

    setIsSubmitting(true)
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/api/v1/builder-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, email: formData.email, phone: formData.phone, landline: formData.landline || undefined, cin: formData.cin.toUpperCase(),
          website: formData.website || undefined, headquarters: formData.headquarters || undefined,
          description: formData.description || undefined, logo_url: formData.logo || undefined,
          legal_entities: formData.legalEntities.filter(e => e.name),
          executives: formData.executives.filter(e => e.name),
          projects: formData.projects, delivery_track: formData.delivery_track || undefined,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setApplicationId(data.application_id)
        setSubmitted(true)
      } else {
        setToast({ message: data.error || 'Failed to submit' })
      }
    } catch {
      setToast({ message: 'Error submitting application' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] relative overflow-hidden font-sans">
        {/* Soft Linear-style background blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-[60vw] h-[60vh] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50vw] h-[50vh] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="max-w-[440px] w-full text-center p-12 bg-white rounded-[24px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.04)] mx-4 relative z-10">
          <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 shadow-sm">
            <CheckCircle2 size={28} strokeWidth={2.5} />
          </div>
          <h2 className="text-[22px] font-semibold text-zinc-900 tracking-tight mb-2">Application Received</h2>
          <p className="text-[14px] text-zinc-500 mb-8 leading-relaxed">Our verification team is reviewing your profile — expect a response within 2–3 business days at your registered email.</p>
          <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200/60 flex flex-col items-center justify-center gap-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Reference ID</span>
            <code className="text-[14px] font-mono font-medium text-zinc-800 tracking-wider">{applicationId}</code>
          </div>
        </motion.div>
      </div>
    )
  }

  // Refined input classes for that Emil Kowalski / Linear feel
  const inputBase = "w-full bg-white border border-black/10 text-zinc-900 text-[14px] px-3.5 py-2.5 rounded-[12px] outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/20 transition-all placeholder:text-zinc-400"
  const labelBase = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-1.5 ml-0.5"

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] relative overflow-hidden p-4 sm:p-8 font-sans selection:bg-blue-100 selection:text-blue-900">
      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}
      
      {/* Refined ambient background */}
      <div className="absolute top-0 right-0 w-[80vw] h-[80vh] bg-gradient-to-bl from-blue-500/5 to-transparent rounded-full blur-[100px] pointer-events-none translate-x-1/3 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-[70vw] h-[70vw] bg-gradient-to-tr from-indigo-500/5 to-transparent rounded-full blur-[100px] pointer-events-none -translate-x-1/4 translate-y-1/4" />

      {/* Main Split Card */}
      <div className="w-full max-w-[1050px] min-h-[720px] md:h-[780px] bg-white rounded-[24px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] relative z-10 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Sidebar: Minimalist Light Theme */}
        <div className="w-full md:w-[340px] bg-zinc-50/50 border-r border-black/[0.04] p-6 md:p-8 flex flex-col shrink-0 justify-center">
          <div>
            <Image src="/images/icons/ExpandedRealtyPalsBlack.png" alt="RealtyPals" width={100} height={24} className="object-contain mb-6 opacity-90" unoptimized />
            
            <h1 className="text-[18px] font-semibold text-zinc-900 tracking-tight leading-snug mb-2">
              Developer Onboarding
            </h1>
            <p className="text-[12px] text-zinc-500 leading-relaxed mb-6">
              Showcase your projects to serious Noida & Greater Noida buyers. Verified builder profiles, direct qualified leads, no broker middle layer. Verification typically takes 2–3 business days.
            </p>

            {/* Value Bullets */}
            <div className="space-y-2 mb-6">
              <div className="flex items-start gap-2.5">
                <span className="text-zinc-900 font-semibold text-[12px]">•</span>
                <p className="text-[12px] text-zinc-600 leading-relaxed">Buyers who&apos;ve already shortlisted — not cold enquiries</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-zinc-900 font-semibold text-[12px]">•</span>
                <p className="text-[12px] text-zinc-600 leading-relaxed">Your RERA-verified profile, presented professionally</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-zinc-900 font-semibold text-[12px]">•</span>
                <p className="text-[12px] text-zinc-600 leading-relaxed">Leads with name, phone, and the exact project</p>
              </div>
            </div>

            {/* Elegant Vertical Stepper */}
            <div className="space-y-4 relative ml-1">
              {/* Connecting line */}
              <div className="absolute left-[11px] top-[24px] bottom-[24px] w-[1px] bg-black/[0.06]" />
              
              {STEPS.map((step, idx) => {
                const isActive = idx === currentIdx
                const isPassed = idx < currentIdx
                return (
                  <div key={step} onClick={() => setActiveStep(step)} className={`flex items-start gap-3 relative z-10 group cursor-pointer ${!isActive && !isPassed ? 'hover:opacity-80' : ''}`}>
                    <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 transition-all duration-300 relative mt-0.5
                      ${isActive ? 'bg-white shadow-sm ring-1 ring-black/10' : isPassed ? 'bg-zinc-100 text-zinc-400' : 'bg-transparent border border-black/10 text-zinc-300 group-hover:border-black/20 group-hover:text-zinc-400'}
                    `}>
                      {isActive && <motion.div layoutId="active-dot" className="w-[6px] h-[6px] bg-blue-600 rounded-full" />}
                      {isPassed && <CheckCircle2 size={10} strokeWidth={3} />}
                    </div>
                    <div>
                      <h3 className={`text-[12px] font-medium transition-colors ${isActive ? 'text-zinc-900' : isPassed ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {STEP_TITLES[step].title}
                      </h3>
                      {isActive && (
                        <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed pr-4">
                          {STEP_TITLES[step].desc}
                        </motion.p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Area: Form Content */}
        <div className="flex-1 flex flex-col relative bg-white">
          <div className="flex-1 p-10 lg:px-16 lg:py-12 overflow-y-auto custom-scrollbar">
            <div className="max-w-[460px] mx-auto mt-4">
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-[24px] font-semibold text-zinc-900 tracking-tight mb-1.5">{STEP_TITLES[activeStep].title}</h2>
                <p className="text-[14px] text-zinc-500">{STEP_TITLES[activeStep].desc}</p>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, filter: 'blur(4px)', y: 8 }}
                  animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                  exit={{ opacity: 0, filter: 'blur(4px)', y: -8 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {activeStep === 'company' && (
                    <div className="space-y-5">
                      <div>
                        <label className={labelBase}>Company Name *</label>
                        <input type="text" placeholder="e.g. DLF Limited" value={formData.name} onChange={(e) => setFormData(p => ({...p, name: e.target.value}))} className={inputBase} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className={labelBase}>Company CIN *</label>
                          <input type="text" placeholder="L70101DL1963GOI..." maxLength={21} value={formData.cin} onChange={(e) => setFormData(p => ({...p, cin: e.target.value.toUpperCase()}))} className={inputBase} />
                        </div>
                        <div>
                          <label className={labelBase}>Phone Number *</label>
                          <input type="tel" placeholder="+919876543210" maxLength={13} value={formData.phone} onChange={(e) => {
                            let val = e.target.value
                            if (!val.startsWith('+91')) val = '+91' + val.replace(/^\+?9?1?/, '')
                            setFormData(p => ({...p, phone: val}))
                          }} className={inputBase} />
                        </div>
                        <div>
                          <label className={labelBase}>Landline (Optional)</label>
                          <input type="tel" placeholder="011-1234567" value={formData.landline} onChange={(e) => setFormData(p => ({...p, landline: e.target.value}))} className={inputBase} />
                        </div>
                        <div>
                          <label className={labelBase}>Official Email *</label>
                          <input type="email" placeholder="contact@builder.com" value={formData.email} onChange={(e) => setFormData(p => ({...p, email: e.target.value}))} className={inputBase} />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 'legal' && (
                    <div className="space-y-4">
                      {formData.legalEntities.map((entity, i) => (
                        <div key={i} className="flex gap-3 relative group items-start bg-zinc-50/50 p-3 rounded-[16px] border border-black/[0.04]">
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className={labelBase}>Entity Name</label>
                              <input type="text" placeholder="Legal Entity Name" value={entity.name} onChange={(e) => { const n = [...formData.legalEntities]; n[i].name = e.target.value; setFormData(p => ({...p, legalEntities: n})) }} className={inputBase} />
                            </div>
                            <div>
                              <label className={labelBase}>RERA Number</label>
                              <input type="text" placeholder="RERA Registration" maxLength={20} value={entity.registration_number} onChange={(e) => { const n = [...formData.legalEntities]; n[i].registration_number = e.target.value.replace(/[^a-zA-Z0-9]/g, ''); setFormData(p => ({...p, legalEntities: n})) }} className={inputBase} />
                            </div>
                          </div>
                          {formData.legalEntities.length > 1 && (
                            <button onClick={() => { const n = formData.legalEntities.filter((_, idx) => idx !== i); setFormData(p => ({...p, legalEntities: n})) }} className="mt-7 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setFormData(prev => ({...prev, legalEntities: [...prev.legalEntities, { name: '', registration_number: '' }]}))} className="w-full py-3.5 rounded-[12px] border border-dashed border-black/[0.12] text-[13px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2">
                        <Plus size={16} /> Add Another Entity
                      </button>
                    </div>
                  )}

                  {activeStep === 'team' && (
                    <div className="space-y-4">
                      {formData.executives.map((exec, i) => (
                        <div key={i} className="flex gap-3 relative group items-start bg-zinc-50/50 p-3 rounded-[16px] border border-black/[0.04]">
                          <div className="flex-1 space-y-3">
                            <div>
                              <label className={labelBase}>Executive Name</label>
                              <input type="text" placeholder="Name" value={exec.name} onChange={(e) => { const n = [...formData.executives]; n[i].name = e.target.value; setFormData(p => ({...p, executives: n})) }} className={inputBase} />
                            </div>
                            <div>
                              <label className={labelBase}>Title</label>
                              <select value={exec.title} onChange={(e) => { const n = [...formData.executives]; n[i].title = e.target.value; setFormData(p => ({...p, executives: n})) }} className={inputBase}>
                                <option value="">Select Title...</option>
                                <option value="CEO">CEO</option>
                                <option value="Managing Director">Managing Director</option>
                                <option value="Director">Director</option>
                                <option value="President">President</option>
                                <option value="Vice President">Vice President</option>
                                <option value="COO">COO</option>
                                <option value="CFO">CFO</option>
                                <option value="Partner">Partner</option>
                                <option value="Proprietor">Proprietor</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                          {formData.executives.length > 1 && (
                            <button onClick={() => { const n = formData.executives.filter((_, idx) => idx !== i); setFormData(p => ({...p, executives: n})) }} className="mt-7 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => setFormData(prev => ({...prev, executives: [...prev.executives, { name: '', title: '', experience_years: 0 }]}))} className="w-full py-3.5 rounded-[12px] border border-dashed border-black/[0.12] text-[13px] font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-all flex items-center justify-center gap-2">
                        <Plus size={16} /> Add Executive
                      </button>
                    </div>
                  )}

                  {activeStep === 'projects' && (
                    <div className="space-y-5">
                      <div>
                        <label className={labelBase}>Notable Projects</label>
                        <textarea placeholder="e.g. DLF Camellias, M3M Golfestate (Comma separated)" value={formData.projects.join(', ')} onChange={(e) => setFormData(p => ({...p, projects: e.target.value.split(',')}))} rows={2} className={`${inputBase} resize-none`} />
                      </div>
                      <div>
                        <label className={labelBase}>Delivery Track Record</label>
                        <textarea placeholder="Describe past delivery performance and total scale..." value={formData.delivery_track} onChange={(e) => setFormData(p => ({...p, delivery_track: e.target.value}))} rows={4} className={`${inputBase} resize-none`} />
                      </div>
                    </div>
                  )}

                  {activeStep === 'media' && (
                    <div className="space-y-6">
                      <div>
                        <label className={labelBase}>Company Logo</label>
                        <div className="relative">
                          <input type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          <div className="border border-dashed border-black/15 bg-zinc-50/50 p-8 rounded-[16px] text-center group hover:bg-zinc-50 transition-all flex flex-col items-center">
                            {formData.logo ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden border border-black/10 shadow-sm mb-3">
                                <img src={formData.logo} alt="Logo preview" className="w-full h-full object-contain bg-white" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 text-zinc-400 shadow-sm border border-black/5 group-hover:text-zinc-900 transition-colors">
                                <Upload size={18} />
                              </div>
                            )}
                            <p className="text-[13px] font-medium text-zinc-800">{formData.logo ? 'Change logo' : 'Click to upload logo'}</p>
                            <p className="text-[12px] text-zinc-500 mt-1">SVG, PNG, or JPG (max 2MB)</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className={labelBase}>Company Website</label>
                        <input type="url" placeholder="https://www.builder.com" value={formData.website} onChange={(e) => setFormData(p => ({...p, website: e.target.value}))} className={inputBase} />
                      </div>
                    </div>
                  )}

                  {activeStep === 'review' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1 bg-zinc-50/80 p-4 rounded-[16px] border border-black/[0.04] shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Company</p>
                          <p className="text-[14px] font-medium text-zinc-900 truncate">{formData.name || 'Not provided'}</p>
                          <p className="text-[12px] text-zinc-500 truncate mt-0.5">{formData.cin || 'No CIN'}</p>
                        </div>
                        <div className="col-span-1 bg-zinc-50/80 p-4 rounded-[16px] border border-black/[0.04] shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Contact</p>
                          <p className="text-[14px] font-medium text-zinc-900 truncate">{formData.email || 'Not provided'}</p>
                          <p className="text-[12px] text-zinc-500 truncate mt-0.5">{formData.phone || 'No Phone'}</p>
                        </div>
                      </div>
                      <div className="bg-blue-50/50 p-4 rounded-[16px] border border-blue-100 flex items-start gap-3">
                         <div className="w-8 h-8 rounded-full bg-blue-100/50 flex items-center justify-center shrink-0">
                           <Globe size={16} className="text-blue-600" />
                         </div>
                         <div>
                           <p className="text-[13px] font-semibold text-blue-900">Final Verification</p>
                           <p className="text-[12px] text-blue-800/80 leading-relaxed mt-1">
                             By submitting this application, you verify that you are an authorized representative of the company. Our compliance team will reach out within 2-3 business days.
                           </p>
                         </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Form Actions (Bottom fixed) */}
          <div className="px-10 lg:px-16 py-6 border-t border-black/[0.04] flex items-center justify-between bg-white/50 backdrop-blur-md mt-auto">
            <button
              onClick={handleBack}
              className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-medium transition-all ${currentIdx === 0 ? 'opacity-0 pointer-events-none' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
            >
              <ArrowLeft size={16} /> Back
            </button>
            
            <button
              onClick={activeStep === 'review' ? handleSubmit : handleNext}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-[12px] text-[13px] font-medium text-white bg-[#18181B] hover:bg-[#27272A] transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] active:scale-[0.98] group"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : activeStep === 'review' ? 'Submit Profile' : 'Continue'}
              {activeStep !== 'review' && !isSubmitting && <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform opacity-70" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
