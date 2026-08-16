'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'

export default function CookiesBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Check if user has already made a choice
    const cookieConsent = localStorage.getItem('cookies-consent')
    if (!cookieConsent) {
      setShowBanner(true)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookies-consent', 'accepted')
    localStorage.setItem('cookies-consent-date', new Date().toISOString())
    setShowBanner(false)
  }

  const handleReject = () => {
    localStorage.setItem('cookies-consent', 'rejected')
    localStorage.setItem('cookies-consent-date', new Date().toISOString())
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-slate-800 text-white shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">Cookie Settings</h3>
            <p className="text-sm text-slate-300 mb-4">
              We use cookies to enhance your experience and analyze site performance. By clicking &quot;Accept All&quot;, you consent to our use of cookies.{' '}
              <Link href="/privacy" className="underline hover:text-white">
                Learn more
              </Link>
            </p>
          </div>

          <button
            onClick={() => setShowBanner(false)}
            className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
            aria-label="Close cookies banner"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={handleAccept}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Accept All
          </button>
          <button
            onClick={handleReject}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Reject
          </button>
          <Link
            href="/privacy"
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors text-sm text-center"
          >
            Customize
          </Link>
        </div>
      </div>
    </div>
  )
}
