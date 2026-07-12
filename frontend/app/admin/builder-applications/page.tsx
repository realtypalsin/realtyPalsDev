'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, XCircle, Search, Building2, User, Phone, Mail } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { toast } from 'sonner'

interface BuilderApplication {
  id: string
  name: string
  email: string
  phone: string
  headquarters: string | null
  status: 'pending' | 'approved' | 'rejected' | 'clarification_requested'
  submitted_at: string
}

export default function BuilderApplicationsPage() {
  const [applications, setApplications] = useState<BuilderApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/builder-applications?status=all`, { headers: adminAuthHeaders() })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch (err) {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleUpdateStatus(id: string, newStatus: string) {
    try {
      const res = await fetch(`${API_BASE}/builder-applications/${id}`, {
        method: 'PATCH',
        headers: { ...adminAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Update failed')
      toast.success(`Application marked as ${newStatus}`)
      load()
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const filtered = applications.filter(a => 
    a.name.toLowerCase().includes(query.toLowerCase()) || 
    a.email.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Builder Registrations</h1>
          <p className="text-sm text-zinc-500 mt-1">{applications.length} total applications</p>
        </div>
      </div>

      <div className="group flex items-center gap-3 px-4 py-3 bg-white border border-zinc-200/80 rounded-xl shadow-sm mb-6 focus-within:border-zinc-300 focus-within:shadow-md transition-all">
        <Search size={16} className="text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by builder name or email..."
          className="flex-1 bg-transparent border-none outline-none text-[14px] text-zinc-900 placeholder:text-zinc-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center px-4 py-3 bg-zinc-50/50 border-b border-zinc-200/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          <div className="w-10 mr-4" /> 
          <div className="flex-1">Company Info</div>
          <div className="w-[200px] hidden md:block">Contact</div>
          <div className="w-[140px] hidden sm:block">Date Submitted</div>
          <div className="w-[120px] hidden sm:block">Status</div>
          <div className="w-[180px]" /> 
        </div>

        <div className="divide-y divide-zinc-100">
          {loading ? (
            <div className="py-16 text-center text-zinc-400 text-sm">Loading applications...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <Building2 size={32} className="text-zinc-200 mb-3" />
              <p className="text-[14px] font-medium text-zinc-900">No applications found</p>
            </div>
          ) : (
            filtered.map((app) => (
              <div key={app.id} className="group flex items-center px-4 py-4 hover:bg-zinc-50/80 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center flex-shrink-0 mr-4">
                  <Building2 size={18} className="text-zinc-400" />
                </div>
                
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-[14px] font-medium text-zinc-900 truncate">{app.name}</p>
                  <p className="text-[12px] text-zinc-500 truncate mt-0.5">{app.headquarters || 'No HQ specified'}</p>
                </div>

                <div className="w-[200px] hidden md:flex flex-col gap-1 pr-4">
                  <div className="flex items-center gap-1.5 text-[12px] text-zinc-600 truncate">
                    <Mail size={12} className="text-zinc-400 shrink-0" />
                    <span className="truncate">{app.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-zinc-600 truncate">
                    <Phone size={12} className="text-zinc-400 shrink-0" />
                    <span className="truncate">{app.phone}</span>
                  </div>
                </div>

                <div className="w-[140px] hidden sm:block text-[13px] text-zinc-500 pr-4">
                  {new Date(app.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>

                <div className="w-[120px] hidden sm:flex items-center pr-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border ${
                    app.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    app.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                    'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    {app.status === 'approved' && <CheckCircle2 size={12} />}
                    {app.status === 'rejected' && <XCircle size={12} />}
                    {app.status === 'pending' && <Clock size={12} />}
                    {app.status.toUpperCase()}
                  </span>
                </div>

                <div className="w-[180px] flex items-center justify-end gap-2">
                  {app.status === 'pending' && (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus(app.id, 'rejected')}
                        className="px-3 py-1.5 text-[12px] font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-zinc-200 hover:border-rose-200 rounded-lg transition-colors"
                      >
                        Reject
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(app.id, 'approved')}
                        className="px-3 py-1.5 text-[12px] font-semibold text-white bg-[#1a1a1a] hover:bg-black rounded-lg transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.2)]"
                      >
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
