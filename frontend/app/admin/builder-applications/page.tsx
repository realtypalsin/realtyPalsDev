'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, XCircle, Search, Building2, Phone, Mail, Eye, MapPin, Calendar, ExternalLink, Users } from 'lucide-react'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface BuilderApplication {
  id: string
  name: string
  email: string
  phone: string
  headquarters: string | null
  status: 'pending' | 'approved' | 'rejected' | 'clarification_requested' | 'new'
  submitted_at: string
  cin?: string
  website?: string
  description?: string
  delivery_track?: string
  executives?: any
  legal_entities?: any
  projects?: string[]
}

export default function BuilderApplicationsPage() {
  const [applications, setApplications] = useState<BuilderApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedApp, setSelectedApp] = useState<BuilderApplication | null>(null)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/builder-applications?status=all`, { headers: adminAuthHeaders() })
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
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
      
      // Optimistic update
      setApplications(apps => apps.map(a => a.id === id ? { ...a, status: newStatus as any } : a))
      if (selectedApp?.id === id) {
        setSelectedApp(prev => prev ? { ...prev, status: newStatus as any } : null)
      }
    } catch {
      toast.error('Failed to update status')
    }
  }

  const filtered = applications.filter(a => {
    const matchesQuery = a.name.toLowerCase().includes(query.toLowerCase()) || a.email.toLowerCase().includes(query.toLowerCase())
    const matchesFilter = filter === 'all' || a.status === filter
    return matchesQuery && matchesFilter
  })

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Builder Registrations</h1>
          <p className="text-slate-500 mt-2 text-sm">Review, approve, and manage developer onboarding requests.</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex bg-slate-100/50 p-1 rounded-xl">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 text-[13px] font-medium rounded-lg transition-all capitalize ${
                filter === status 
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        
        <div className="flex-1 max-w-md group flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search size={16} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by builder name or email..."
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 gap-4 items-center px-6 py-4 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="col-span-4">Company Info</div>
          <div className="col-span-3">Contact</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 items-center px-6 py-4">
                  <div className="col-span-4 flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="min-w-0 space-y-2 w-full">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <div className="col-span-3 flex flex-col gap-2">
                    <Skeleton className="h-3 w-3/4 rounded" />
                    <Skeleton className="h-3 w-2/3 rounded" />
                  </div>
                  <div className="col-span-2">
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                  <div className="col-span-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Building2 size={24} className="text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">No applications found</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">Try adjusting your filters or search query to find what you&apos;re looking for.</p>
            </div>
          ) : (
            filtered.map((app) => (
              <div 
                key={app.id} 
                onClick={() => setSelectedApp(app)}
                className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-slate-50 transition-colors group cursor-pointer border-l-2 border-transparent hover:border-blue-500"
              >
                
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-slate-900 truncate">{app.name}</p>
                    <p className="text-[12px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {app.headquarters || 'No HQ specified'}
                    </p>
                  </div>
                </div>

                <div className="col-span-3 flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[12px] text-slate-600 truncate">
                    <Mail size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{app.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-slate-600 truncate">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <span className="truncate">{app.phone}</span>
                  </div>
                </div>

                <div className="col-span-2 text-[13px] text-slate-500 flex items-center gap-1.5">
                  <Calendar size={12} className="text-slate-400" />
                  {format(new Date(app.submitted_at), 'MMM d, yyyy')}
                </div>

                <div className="col-span-2 flex items-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border ${
                    app.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    app.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {app.status === 'approved' && <CheckCircle2 size={12} />}
                    {app.status === 'rejected' && <XCircle size={12} />}
                    {app.status === 'pending' && <Clock size={12} />}
                    {app.status.toUpperCase()}
                  </span>
                </div>

                <div className="col-span-1 flex items-center justify-end">
                  <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedApp(null)}
          />
          <div className="bg-white shadow-2xl rounded-3xl w-full max-w-5xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 border border-slate-200">
            
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-md sticky top-0 z-20">
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Application Review</h3>
                <p className="text-sm text-slate-500 mt-1">Review builder details before making a decision.</p>
              </div>
              <button 
                onClick={() => setSelectedApp(null)}
                className="p-2 bg-white hover:bg-slate-100 text-slate-500 rounded-full transition-colors border border-slate-200 shadow-sm"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30">
              
              {/* Profile Header */}
              <div className="p-8 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 flex items-center justify-center shadow-sm">
                    <Building2 size={32} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="text-3xl font-bold text-slate-900 tracking-tight">{selectedApp.name}</h4>
                    <p className="text-slate-500 mt-2 flex items-center gap-2 text-sm font-medium">
                      <MapPin size={16} className="text-slate-400" /> {selectedApp.headquarters || 'No headquarters provided'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid Layout for Meta & Details */}
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Card 1: Contact */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Mail size={16} />
                      </div>
                      Contact Details
                    </div>
                    <div className="space-y-4">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Email Address</span>
                        <span className="text-sm font-medium text-slate-700 break-all">{selectedApp.email}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Phone Number</span>
                        <span className="text-sm font-medium text-slate-700">{selectedApp.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Application Meta */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Calendar size={16} />
                      </div>
                      Application Status
                    </div>
                    <div className="space-y-4">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Submitted On</span>
                        <span className="text-sm font-medium text-slate-700">{format(new Date(selectedApp.submitted_at), 'PPP')}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Current State</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide border ${
                          selectedApp.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          selectedApp.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {selectedApp.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Company Profile */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Building2 size={16} />
                      </div>
                      Company Profile
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedApp.cin && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">CIN Number</span>
                          <span className="text-sm font-medium text-slate-700">{selectedApp.cin}</span>
                        </div>
                      )}
                      {selectedApp.website && (
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Website</span>
                          <a href={selectedApp.website.startsWith('http') ? selectedApp.website : `https://${selectedApp.website}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                            {selectedApp.website} <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                      {selectedApp.description && (
                        <div className="col-span-2">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">{selectedApp.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card 4: Track Record */}
                  {(selectedApp.delivery_track || selectedApp.projects) && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                          <CheckCircle2 size={16} />
                        </div>
                        Track Record
                      </div>
                      <div className="space-y-4">
                        {selectedApp.delivery_track && (
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Delivery History</span>
                            <p className="text-sm text-slate-600 leading-relaxed">{selectedApp.delivery_track}</p>
                          </div>
                        )}
                        {selectedApp.projects && selectedApp.projects.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Notable Projects</span>
                            <div className="flex flex-wrap gap-2">
                              {selectedApp.projects.map((proj: string, i: number) => (
                                <span key={i} className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md text-xs font-medium text-slate-600">
                                  {proj}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Card 5: Executives */}
                  {selectedApp.executives && selectedApp.executives.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm md:col-span-2">
                      <div className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Users size={16} />
                        </div>
                        Key Executives
                      </div>
                      <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedApp.executives.map((exec: any, i: number) => (
                          <li key={i} className="flex flex-col bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="text-sm font-bold text-slate-900">{exec.name || exec.Name || exec}</span>
                            <span className="text-xs font-medium text-slate-500">{exec.title || exec.Title || 'Executive'}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-6 bg-white border-t border-slate-100 shrink-0">
              {selectedApp.status === 'pending' || selectedApp.status === 'new' ? (
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-900">Decision Required</h4>
                    <p className="text-[13px] text-slate-500 mt-0.5">Approve to grant dashboard access.</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                      className="px-6 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 font-semibold rounded-xl transition-all shadow-sm"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedApp.id, 'approved')}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Approve Builder
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-slate-900">Application Processed</h4>
                    <p className="text-[13px] text-slate-500 mt-0.5">Currently marked as {selectedApp.status}.</p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedApp.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                    {selectedApp.status === 'approved' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
