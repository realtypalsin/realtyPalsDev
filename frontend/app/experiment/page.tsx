'use client'

import { useState, useRef, useEffect } from 'react'
// Types previously imported from deleted API route — defined locally
interface BuyerAnswers {
  budget: string
  sector: string
  possession: 'ready' | 'within1year' | 'flexible'
  bhk: 2 | 3 | 4
  tradeoff: 'possession' | 'price' | 'location'
}

interface Recommendation {
  project: {
    id: string
    name: string
    builder: string
    sector: string
    bhk: number[]
    priceMinCrore: Record<number, number>
    status: 'ready' | 'under-construction'
    possessionDate: string
    rera: string
    metroProximity: string
  }
  reasoning: string
  tradeoff: string
}

type Step = 'budget' | 'sector' | 'possession' | 'bhk' | 'tradeoff' | 'loading' | 'results' | 'phone' | 'done'

interface Message {
  role: 'ai' | 'user'
  text: string
}

const QUESTIONS: Record<string, string> = {
  budget: "What's your budget? (e.g. '80 lakhs', '1.2 crore', '1.5–2 crore')",
  sector: "Which part of Noida? Or which metro station or area should it be near?",
  possession: "When do you need possession?",
  bhk: "How many bedrooms?",
  tradeoff: "If you had to accept one trade-off, which matters least to you?",
}

export default function ExperimentPage() {
  const [step, setStep] = useState<Step>('budget')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      text: "Welcome to RealtyPals. I'll help you find the right home in Noida with 5 quick questions.\n\n" + QUESTIONS.budget
    }
  ])
  const [input, setInput] = useState('')
  const [answers, setAnswers] = useState<Partial<BuyerAnswers>>({})
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [phone, setPhone] = useState('')
  const [phoneSubmitted, setPhoneSubmitted] = useState(false)
  const [fallback, setFallback] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, step])

  function addMessage(role: 'ai' | 'user', text: string) {
    setMessages(prev => [...prev, { role, text }])
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    const value = input.trim()
    setInput('')

    if (step === 'budget') {
      addMessage('user', value)
      setAnswers((prev: Partial<BuyerAnswers>) => ({ ...prev, budget: value }))
      addMessage('ai', QUESTIONS.sector)
      setStep('sector')
    } else if (step === 'sector') {
      addMessage('user', value)
      setAnswers((prev: Partial<BuyerAnswers>) => ({ ...prev, sector: value }))
      addMessage('ai', QUESTIONS.possession)
      setStep('possession')
    }
  }

  function handleChipSelect(value: string) {
    if (step === 'possession') {
      const map: Record<string, BuyerAnswers['possession']> = {
        'Ready now': 'ready',
        'Within 1 year': 'within1year',
        '2+ years is OK': 'flexible',
      }
      addMessage('user', value)
      setAnswers((prev: Partial<BuyerAnswers>) => ({ ...prev, possession: map[value] }))
      addMessage('ai', QUESTIONS.bhk)
      setStep('bhk')
    } else if (step === 'bhk') {
      const bhk = parseInt(value.replace('BHK', '')) as 2 | 3 | 4
      addMessage('user', value)
      setAnswers((prev: Partial<BuyerAnswers>) => ({ ...prev, bhk }))
      addMessage('ai', QUESTIONS.tradeoff)
      setStep('tradeoff')
    } else if (step === 'tradeoff') {
      const map: Record<string, BuyerAnswers['tradeoff']> = {
        'Possession timing': 'possession',
        'Exact price': 'price',
        'Exact location': 'location',
      }
      addMessage('user', value)
      const finalAnswers: BuyerAnswers = {
        budget: answers.budget!,
        sector: answers.sector!,
        possession: answers.possession!,
        bhk: answers.bhk!,
        tradeoff: map[value],
      }
      setAnswers(finalAnswers)
      setStep('loading')
      addMessage('ai', 'Analysing your requirements across our Noida database…')
      fetchRecommendations(finalAnswers)
    }
  }

  async function fetchRecommendations(finalAnswers: BuyerAnswers) {
    try {
      const res = await fetch('/api/experiment/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalAnswers),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!data || !Array.isArray(data.recommendations)) throw new Error('Invalid response')
      if (data.fallback || data.recommendations.length === 0) {
        setFallback(true)
        setMessages(prev => [
          ...prev,
          { role: 'ai', text: "I couldn't find strong matches for those specific filters. Here are the closest options I found — I've relaxed the location filter to give you more options." }
        ])
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'ai', text: `Found ${data.recommendations.length} matches ranked for you:` }
        ])
      }
      setRecommendations(data.recommendations)
      setStep('results')
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'ai', text: 'Something went wrong. Please refresh and try again.' }
      ])
    }
  }

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return

    const payload = {
      phone: phone.trim(),
      timestamp: new Date().toISOString(),
      answers,
    }

    // Try sheet webhook if configured
    const webhookUrl = process.env.NEXT_PUBLIC_SHEET_WEBHOOK_URL
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch {
        // Non-fatal — still show success
      }
    }

    // Always log to console as backup
    console.log('[RealtyPals Lead]', payload)

    setPhoneSubmitted(true)
    setStep('done')
  }

  const chipSets: Record<string, string[]> = {
    possession: ['Ready now', 'Within 1 year', '2+ years is OK'],
    bhk: ['2BHK', '3BHK', '4BHK'],
    tradeoff: ['Possession timing', 'Exact price', 'Exact location'],
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center gap-3 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold">R</div>
        <div>
          <div className="font-semibold text-sm">RealtyPals</div>
          <div className="text-xs text-gray-400">AI Property Advisor · Noida</div>
        </div>
        <div className="ml-auto text-xs text-gray-500 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded">
          Beta
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0">R</div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === 'ai'
                  ? 'bg-gray-800 text-gray-100 rounded-tl-sm'
                  : 'bg-emerald-600 text-white rounded-tr-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {/* Chip options */}
        {(step === 'possession' || step === 'bhk' || step === 'tradeoff') && (
          <div className="flex flex-wrap gap-2 pl-9">
            {chipSets[step].map(opt => (
              <button
                key={opt}
                onClick={() => handleChipSelect(opt)}
                className="px-4 py-2 rounded-full border border-emerald-500/40 text-emerald-400 text-sm hover:bg-emerald-500/20 hover:border-emerald-400 transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Loading spinner */}
        {step === 'loading' && (
          <div className="pl-9 flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            Searching across 10 verified Noida projects…
          </div>
        )}

        {/* Results */}
        {step === 'results' && recommendations.length > 0 && (
          <div className="space-y-3 w-full">
            {recommendations.map((rec, i) => (
              <div key={rec.project.id} className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden">
                {/* Card header */}
                <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-white text-sm leading-tight">
                      {i + 1}. {rec.project.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">{rec.project.builder} · {rec.project.sector}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-emerald-400 font-semibold">
                      {answers.bhk}BHK ₹{rec.project.priceMinCrore[answers.bhk as number] ?? rec.project.priceMinCrore[rec.project.bhk[0]]}cr+
                    </div>
                    <div className={`text-xs mt-0.5 ${rec.project.status === 'ready' ? 'text-green-400' : 'text-amber-400'}`}>
                      {rec.project.status === 'ready' ? '✓ Ready' : `~${rec.project.possessionDate}`}
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="px-4 pb-2 text-xs text-gray-300 leading-relaxed">
                  <span className="text-emerald-400 font-medium">Why: </span>{rec.reasoning}
                </div>
                <div className="px-4 pb-3 text-xs text-gray-400 leading-relaxed">
                  <span className="text-amber-400 font-medium">Trade-off: </span>{rec.tradeoff}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900/40 border-t border-gray-700/50">
                  <div className="text-[10px] text-gray-500">RERA: {rec.project.rera}</div>
                  <div className="text-[10px] text-gray-500 text-right max-w-[55%] truncate">{rec.project.metroProximity}</div>
                </div>
              </div>
            ))}

            {/* CTA */}
            {step === 'results' && !phoneSubmitted && (
              <div className="bg-gray-800 border border-emerald-500/20 rounded-xl p-4 mt-2">
                <p className="text-sm text-gray-200 mb-3 font-medium">Want us to arrange a site visit?</p>
                <form onSubmit={handlePhoneSubmit} className="flex gap-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Your phone number"
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-4 py-2.5 rounded-lg transition-colors font-medium whitespace-nowrap"
                  >
                    Book visit
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="pl-9 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-300">
            Got it. Our team will call you within 24 hours to discuss site visits. Thank you for trying RealtyPals.
          </div>
        )}

        {step === 'results' && recommendations.length === 0 && (
          <div className="pl-9 text-sm text-gray-400">
            No projects match your exact filters. Try a wider budget or flexible possession timeline.
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Text input (only for budget and sector steps) */}
      {(step === 'budget' || step === 'sector') && (
        <div className="border-t border-gray-800 bg-gray-900/80 backdrop-blur px-4 py-3 sticky bottom-0">
          <form onSubmit={handleTextSubmit} className="max-w-2xl mx-auto flex gap-2">
            <input
              autoFocus
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={step === 'budget' ? "e.g. 1.2 crore" : "e.g. Sector 150, near Aqua Line…"}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors"
            >
              →
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
