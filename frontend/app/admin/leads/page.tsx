'use client'

import { useEffect, useState } from 'react'
import { Phone, Mail } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { API_BASE } from '@/lib/env'
import { adminAuthHeaders } from '@/lib/authedFetch'
import { Skeleton } from '@/components/ui/skeleton'

interface Lead {
  id: string
  name: string
  phone: string
  email?: string
  lead_type: 'callback_requested' | 'site_visit_requested'
  project_id: string
  project_name: string
  status: 'new' | 'contacted' | 'qualified' | 'lost'
  created_at: string
  follow_up_date?: string
  notes?: string
}

export default function BuilderLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'qualified'>('all')
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null)

  useEffect(() => {
    fetchLeads()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const fetchLeads = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/leads?status=${filter}`, { headers: adminAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
      }
    } catch {
      console.error('Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders()
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus as any } : l))
        setToast({ message: 'Lead status updated', type: 'success' })
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast({ message: `Failed to update lead: ${res.statusText}`, type: 'error' })
        setTimeout(() => setToast(null), 5000)
      }
    } catch (err) {
      console.error('Update failed:', err)
      setToast({ message: 'Error updating lead status', type: 'error' })
      setTimeout(() => setToast(null), 5000)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      case 'contacted':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
      case 'qualified':
        return 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'lost':
        return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-400'
      default:
        return ''
    }
  }

  const getLeadTypeLabel = (type: string) => {
    return type === 'callback_requested' ? 'Callback Request' : 'Site Visit Request'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Leads</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Track and manage buyer inquiries</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'new', 'contacted', 'qualified'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Project</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-16 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No leads found</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800 border-b dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Contact</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Project</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{lead.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                          <Phone className="w-4 h-4" />
                          {lead.phone}
                        </a>
                        {lead.email && (
                          <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                            <Mail className="w-4 h-4" />
                            {lead.email}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{lead.project_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {getLeadTypeLabel(lead.lead_type)}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={lead.status}
                        onChange={e => updateLeadStatus(lead.id, e.target.value)}
                        className={`px-3 py-1 rounded text-sm font-medium border-0 cursor-pointer ${getStatusColor(lead.status)}`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="lost">Lost</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4">
                      <button className="px-3 py-1 text-sm border dark:border-slate-700 rounded hover:bg-gray-50 dark:hover:bg-slate-800">
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg text-white text-sm font-medium shadow-lg transition-opacity ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
