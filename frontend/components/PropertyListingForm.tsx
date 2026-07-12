'use client'

import { useState } from 'react'
import { ArrowRight, ArrowLeft, Loader2, Home, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Toast from './Toast'

type FormStep = 'basic' | 'location' | 'details' | 'review'
const STEPS: FormStep[] = ['basic', 'location', 'details', 'review']

const STEP_TITLES: Record<FormStep, { title: string; desc: string }> = {
  basic:   { title: 'Basic Details', desc: 'Project name and developer information.' },
  location:{ title: 'Location', desc: 'Where is this property located?' },
  details: { title: 'Pricing & Config', desc: 'Pricing, area, and configurations.' },
  review:  { title: 'Review Listing', desc: 'Verify details before submitting.' },
}

export default function PropertyListingForm() {
  const [activeStep, setActiveStep] = useState<FormStep>('basic')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [formData, setFormData] = useState({
    title: '', developer: '', city: '', locality: '', price_min: '', price_max: '', configuration: '', status: 'Under Construction'
  })

  const currentIdx = STEPS.indexOf(activeStep)
  const progress = ((currentIdx + 1) / STEPS.length) * 100

  const handleNext = () => {
    if (currentIdx < STEPS.length - 1) setActiveStep(STEPS[currentIdx + 1])
  }

  const handleBack = () => {
    if (currentIdx > 0) setActiveStep(STEPS[currentIdx - 1])
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.city) {
      setToast({ message: 'Please fill in the required fields' })
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitted(true)
    }, 1500)
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full text-center p-8 bg-white/70 backdrop-blur-2xl rounded-[32px] border border-zinc-200/60 shadow-[0_24px_64px_rgba(0,0,0,0.06)]">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" strokeWidth={2.5} />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">Listing Submitted!</h2>
          <p className="text-[15px] text-zinc-500 mb-8 leading-relaxed">Our team will review your property details. Once approved, it will be live on RealtyPals.</p>
          <button onClick={() => window.location.href = '/'} className="px-8 py-3.5 text-[14px] font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-all shadow-sm active:scale-95">
            Return Home
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col">
      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}
      
      {/* Top Progress & Title */}
      <div className="mb-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100/50 border border-zinc-200/50 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          Step {currentIdx + 1} of {STEPS.length}
        </div>
        <h2 className="text-3xl font-bold text-zinc-900 tracking-tight">{STEP_TITLES[activeStep].title}</h2>
        <p className="text-[15px] text-zinc-500">{STEP_TITLES[activeStep].desc}</p>
        
        {/* Sleek Progress Bar */}
        <div className="max-w-xs mx-auto h-1 w-full bg-zinc-100 rounded-full overflow-hidden mt-6">
          <motion.div 
            className="h-full bg-zinc-900 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {/* Main Form Container - Fixed Height */}
      <div className="bg-white rounded-[32px] border border-zinc-200/80 shadow-[0_24px_64px_rgba(0,0,0,0.06)] p-6 md:p-10 min-h-[350px] flex flex-col relative overflow-hidden">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeStep === 'basic' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-zinc-700">Project Name *</label>
                    <input type="text" placeholder="e.g. Elite Residences" value={formData.title} onChange={(e) => setFormData(p => ({...p, title: e.target.value}))} className="w-full bg-zinc-50 border border-zinc-200 text-[14px] px-4 py-3.5 rounded-xl outline-none focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-zinc-700">Developer / Builder Name</label>
                    <input type="text" placeholder="e.g. DLF Limited" value={formData.developer} onChange={(e) => setFormData(p => ({...p, developer: e.target.value}))} className="w-full bg-zinc-50 border border-zinc-200 text-[14px] px-4 py-3.5 rounded-xl outline-none focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-400" />
                  </div>
                </div>
              )}

              {activeStep === 'location' && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-[13px] font-semibold text-zinc-700">City *</label>
                    <input type="text" placeholder="e.g. Mumbai" value={formData.city} onChange={(e) => setFormData(p => ({...p, city: e.target.value}))} className="w-full bg-zinc-50 border border-zinc-200 text-[14px] px-4 py-3.5 rounded-xl outline-none focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-400" />
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-2">
                    <label className="text-[13px] font-semibold text-zinc-700">Locality / Sector</label>
                    <input type="text" placeholder="e.g. Bandra West" value={formData.locality} onChange={(e) => setFormData(p => ({...p, locality: e.target.value}))} className="w-full bg-zinc-50 border border-zinc-200 text-[14px] px-4 py-3.5 rounded-xl outline-none focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-400" />
                  </div>
                </div>
              )}

              {activeStep === 'details' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-2 sm:col-span-1 space-y-2">
                      <label className="text-[13px] font-semibold text-zinc-700">Min Price (₹)</label>
                      <input type="text" placeholder="e.g. 1.5 Cr" value={formData.price_min} onChange={(e) => setFormData(p => ({...p, price_min: e.target.value}))} className="w-full bg-zinc-50 border border-zinc-200 text-[14px] px-4 py-3.5 rounded-xl outline-none focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-400" />
                    </div>
                    <div className="col-span-2 sm:col-span-1 space-y-2">
                      <label className="text-[13px] font-semibold text-zinc-700">Max Price (₹)</label>
                      <input type="text" placeholder="e.g. 3.5 Cr" value={formData.price_max} onChange={(e) => setFormData(p => ({...p, price_max: e.target.value}))} className="w-full bg-zinc-50 border border-zinc-200 text-[14px] px-4 py-3.5 rounded-xl outline-none focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-400" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-semibold text-zinc-700">Configuration</label>
                    <input type="text" placeholder="e.g. 2, 3, 4 BHK Apartments" value={formData.configuration} onChange={(e) => setFormData(p => ({...p, configuration: e.target.value}))} className="w-full bg-zinc-50 border border-zinc-200 text-[14px] px-4 py-3.5 rounded-xl outline-none focus:bg-white focus:border-zinc-400 focus:ring-4 focus:ring-zinc-100 transition-all placeholder:text-zinc-400" />
                  </div>
                </div>
              )}

              {activeStep === 'review' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1 bg-zinc-50 p-5 rounded-2xl border border-zinc-200/60">
                      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Project</p>
                      <p className="text-[15px] font-bold text-zinc-900">{formData.title || 'Not Provided'}</p>
                      <p className="text-[13px] text-zinc-500 mt-0.5">{formData.developer || 'No Developer'}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 bg-zinc-50 p-5 rounded-2xl border border-zinc-200/60">
                      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Location</p>
                      <p className="text-[15px] font-bold text-zinc-900">{formData.city || 'Not Provided'}</p>
                      <p className="text-[13px] text-zinc-500 mt-0.5">{formData.locality}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 rounded-2xl border border-blue-100 bg-blue-50/50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Home size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-blue-900">Ready to Submit Listing</p>
                      <p className="text-[13px] text-blue-700/80 mt-1 leading-relaxed">
                        By submitting this form, your project will be reviewed by our admin team before going live on the marketplace.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-zinc-100">
          <button
            onClick={handleBack}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold transition-all ${currentIdx === 0 ? 'opacity-0 pointer-events-none' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'}`}
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          <button
            onClick={activeStep === 'review' ? handleSubmit : handleNext}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-semibold text-white bg-zinc-900 hover:bg-black transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_14px_rgba(0,0,0,0.1)] active:scale-95"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : activeStep === 'review' ? 'Submit Listing' : 'Continue'}
            {activeStep !== 'review' && !isSubmitting && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
