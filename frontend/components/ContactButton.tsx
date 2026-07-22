'use client'

import { m } from 'framer-motion'
import { PhoneCall, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ContactButtonProps {
  label?: string
  onClick?: () => void
  className?: string
}

export default function ContactButton({ label = 'Request Callback', onClick, className = '' }: ContactButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push('/contact')
    }
  }

  return (
    <m.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleClick}
      className={`relative group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 shadow-sm hover:shadow transition-all duration-200 text-xs font-medium ${className}`}
    >
      <PhoneCall className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0" />
      <span>{label}</span>
      <ArrowRight className="w-3 h-3 text-zinc-400 dark:text-zinc-500 group-hover:translate-x-0.5 transition-transform duration-200" />
    </m.button>
  )
}
