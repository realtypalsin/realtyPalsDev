'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, Upload } from 'lucide-react'
import Toast from './Toast'

type FormStep = 'company' | 'legal' | 'team' | 'projects' | 'media' | 'review'

interface FormData {
  name: string
  email: string
  phone: string
  cin: string
  website: string
  headquarters: string
  legalEntities: Array<{ name: string; registration_number: string }>
  executives: Array<{ name: string; title: string; experience_years: number }>
  projects: string[]
  delivery_track: string
  description: string
  logo: string | null
}

export default function BuilderRegistrationForm() {
  const [step, setStep] = useState<FormStep>('company')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [applicationId, setApplicationId] = useState<string>('')

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    cin: '',
    website: '',
    headquarters: '',
    legalEntities: [{ name: '', registration_number: '' }],
    executives: [{ name: '', title: '', experience_years: 0 }],
    projects: [],
    delivery_track: '',
    description: '',
    logo: null,
  })

  const handleInputChange = (field: keyof FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLegalEntityChange = (index: number, field: string, value: string) => {
    const updated = [...formData.legalEntities]
    updated[index] = { ...updated[index], [field]: value }
    setFormData(prev => ({ ...prev, legalEntities: updated }))
  }

  const handleExecutiveChange = (index: number, field: string, value: string | number) => {
    const updated = [...formData.executives]
    updated[index] = { ...updated[index], [field]: value }
    setFormData(prev => ({ ...prev, executives: updated }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, logo: event.target?.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleNext = () => {
    const steps: FormStep[] = ['company', 'legal', 'team', 'projects', 'media', 'review']
    const currentIdx = steps.indexOf(step)
    if (currentIdx < steps.length - 1) {
      setStep(steps[currentIdx + 1])
    }
  }

  const handleBack = () => {
    const steps: FormStep[] = ['company', 'legal', 'team', 'projects', 'media', 'review']
    const currentIdx = steps.indexOf(step)
    if (currentIdx > 0) {
      setStep(steps[currentIdx - 1])
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone || !formData.cin) {
      setToast({ message: 'Please fill in all required fields' })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/builder-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cin: formData.cin,
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
        setApplicationId(data.application_id)
        setSubmitted(true)
      } else {
        setToast({ message: data.error || 'Failed to submit application' })
      }
    } catch (error) {
      setToast({ message: 'Error submitting application' })
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="mb-6 text-5xl">✓</div>
        <h2 className="text-2xl font-semibold mb-2">Application Submitted</h2>
        <p className="text-gray-600 mb-1">Application ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{applicationId}</code></p>
        <p className="text-gray-600">Our team will review your application and contact you soon.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}

      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {['company', 'legal', 'team', 'projects', 'media', 'review'].map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-2 mx-1 rounded-full ${
                ['company', 'legal', 'team', 'projects', 'media', 'review'].indexOf(step) >= i
                  ? 'bg-blue-500'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-600">
          Step {['company', 'legal', 'team', 'projects', 'media', 'review'].indexOf(step) + 1} of 6
        </p>
      </div>

      {step === 'company' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Company Information</h2>
          <input
            type="text"
            placeholder="Company Name *"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="email"
            placeholder="Email Address *"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="tel"
            placeholder="Phone Number *"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Company CIN (Registration Number) *"
            value={formData.cin}
            onChange={(e) => handleInputChange('cin', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="url"
            placeholder="Website (optional)"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="text"
            placeholder="Headquarters (optional)"
            value={formData.headquarters}
            onChange={(e) => handleInputChange('headquarters', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      )}

      {step === 'legal' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Legal Information</h2>
          {formData.legalEntities.map((entity, idx) => (
            <div key={idx} className="border p-4 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="Entity Name"
                value={entity.name}
                onChange={(e) => handleLegalEntityChange(idx, 'name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Registration Number (optional)"
                value={entity.registration_number}
                onChange={(e) => handleLegalEntityChange(idx, 'registration_number', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFormData(prev => ({
              ...prev,
              legalEntities: [...prev.legalEntities, { name: '', registration_number: '' }]
            }))}
            className="text-blue-500 text-sm"
          >
            + Add Entity
          </button>
        </div>
      )}

      {step === 'team' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Team & Executives</h2>
          {formData.executives.map((exec, idx) => (
            <div key={idx} className="border p-4 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="Name"
                value={exec.name}
                onChange={(e) => handleExecutiveChange(idx, 'name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Title (optional)"
                value={exec.title}
                onChange={(e) => handleExecutiveChange(idx, 'title', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
              <input
                type="number"
                placeholder="Years of Experience"
                value={exec.experience_years}
                onChange={(e) => handleExecutiveChange(idx, 'experience_years', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setFormData(prev => ({
              ...prev,
              executives: [...prev.executives, { name: '', title: '', experience_years: 0 }]
            }))}
            className="text-blue-500 text-sm"
          >
            + Add Executive
          </button>
        </div>
      )}

      {step === 'projects' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Projects & Track Record</h2>
          <textarea
            placeholder="Project Names (comma-separated)"
            value={formData.projects.join(', ')}
            onChange={(e) => handleInputChange('projects', e.target.value.split(',').map(p => p.trim()))}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <textarea
            placeholder="Delivery Track Record (describe your past projects)"
            value={formData.delivery_track}
            onChange={(e) => handleInputChange('delivery_track', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      )}

      {step === 'media' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Media & Branding</h2>
          <div className="border-2 border-dashed p-6 rounded-lg text-center">
            {formData.logo ? (
              <div>
                <img src={formData.logo} alt="Logo preview" className="h-24 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Logo uploaded</p>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <label className="cursor-pointer">
                  <span className="text-blue-500">Click to upload</span> or drag logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
          <textarea
            placeholder="Company Description (brief bio, mission, values)"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Review Application</h2>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
            <p><strong>Company:</strong> {formData.name}</p>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Phone:</strong> {formData.phone}</p>
            <p><strong>CIN:</strong> {formData.cin}</p>
            <p><strong>Website:</strong> {formData.website || '—'}</p>
            <p><strong>Legal Entities:</strong> {formData.legalEntities.filter(e => e.name).length}</p>
            <p><strong>Executives:</strong> {formData.executives.filter(e => e.name).length}</p>
            <p><strong>Projects:</strong> {formData.projects.length}</p>
          </div>
          <p className="text-sm text-gray-600">
            Please review your application. Once submitted, our team will contact you within 2-3 business days.
          </p>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button
          onClick={handleBack}
          disabled={step === 'company'}
          className="px-4 py-2 border rounded-lg disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={step === 'review' ? handleSubmit : handleNext}
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              {step === 'review' ? 'Submit Application' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
