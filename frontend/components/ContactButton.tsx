'use client'

import { m } from 'framer-motion'
import { Phone, ArrowRight } from '@phosphor-icons/react'
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
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={handleClick}
      className={`relative group inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20 backdrop-blur-md" />
      <div className="absolute inset-0 border border-violet-200/50 dark:border-violet-700/50 rounded-2xl group-hover:border-violet-300 dark:group-hover:border-violet-600 transition-colors" />
      
      <span className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300">
        <Phone weight="fill" size={12} />
      </span>
      
      <span className="relative z-10 text-[13px] font-semibold text-violet-700 dark:text-violet-300">
        {label}
      </span>
      
      <ArrowRight weight="bold" size={12} className="relative z-10 ml-1 text-violet-400 dark:text-violet-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
    </m.button>
  )
}
