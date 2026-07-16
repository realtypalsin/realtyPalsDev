'use client'

import { Shield, Eye, TrendingUp, Calendar, Star, CheckCircle, XCircle } from 'lucide-react'

interface Props {
  transparency?: { label: string; ok: boolean; details: string }[]
  social?: {
    most_viewed_config?: string
    most_booked_config?: string
    site_visit_count?: number
    buyer_reviews_summary?: string
  }
}

export default function SocialProofAndTransparency({ transparency, social }: Props) {
  const hasSocialData = social && (
    social.most_viewed_config || social.most_booked_config ||
    social.site_visit_count != null || social.buyer_reviews_summary
  );
  if (!transparency?.length && !hasSocialData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Social Proof */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-[24px] p-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={16} />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">Social Proof</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {social?.most_viewed_config && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <Eye size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Most Viewed</span>
                </div>
                <p className="text-[20px] font-black text-gray-900 dark:text-white">{social.most_viewed_config}</p>
              </div>
            )}
            
            {social?.most_booked_config && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2 text-gray-500">
                  <Star size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Most Booked</span>
                </div>
                <p className="text-[20px] font-black text-gray-900 dark:text-white">{social.most_booked_config}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {social?.site_visit_count != null && (
              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <Calendar className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <p className="text-[12px] font-bold text-gray-900 dark:text-white">Site Visits (Last 30 Days)</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">{social.site_visit_count.toLocaleString()} verified families visited</p>
                </div>
              </div>
            )}
            {social?.buyer_reviews_summary && (
              <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <Star className="text-amber-500 flex-shrink-0 mt-0.5 fill-amber-500" size={16} />
                <div>
                  <p className="text-[12px] font-bold text-gray-900 dark:text-white">Buyer Sentiment</p>
                  <p className="text-[12px] text-gray-600 mt-0.5">{social.buyer_reviews_summary}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transparency Checks */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-[24px] p-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <Shield className="text-emerald-600 dark:text-emerald-400" size={16} />
            </div>
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">Transparency Checks</h3>
          </div>

          <div className="space-y-3">
            {(transparency && transparency.length > 0 ? transparency : []).map((check, i) => (
              <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${check.ok ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10'}`}>
                {check.ok ? (
                  <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={16} />
                ) : (
                  <XCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                )}
                <div>
                  <p className={`text-[13px] font-bold ${check.ok ? 'text-emerald-900 dark:text-emerald-100' : 'text-red-900 dark:text-red-100'}`}>
                    {check.label}
                  </p>
                  <p className={`text-[12px] mt-0.5 ${check.ok ? 'text-emerald-700/80 dark:text-emerald-200/70' : 'text-red-700/80 dark:text-red-200/70'}`}>
                    {check.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
