import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Server, Cookie, UserCheck, HelpCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | RealtyPals',
  description: 'Privacy policy, data protection governance, DPDP Act compliance, and cookie disclosures for RealtyPals users.',
}

export default function PrivacyPolicy() {
  const lastUpdated = 'August 16, 2026'

  const sections = [
    {
      id: 'collection',
      icon: Eye,
      title: '1. Information We Collect',
      content: (
        <div className="space-y-3">
          <p>
            RealtyPals gathers information necessary to deliver personalized property intelligence, conversational assistance, and developer connections under the Digital Personal Data Protection Act, 2023 (DPDP Act):
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-400">
            <li>
              <strong>Direct Interaction Data:</strong> Search parameters, budget preferences, shortlisted sectors, lifestyle criteria, and conversation transcripts submitted to our conversational AI advisor.
            </li>
            <li>
              <strong>Lead &amp; Site Visit Data:</strong> Full name, mobile number, and email address provided voluntarily when scheduling site inspections or requesting developer callbacks.
            </li>
            <li>
              <strong>Technical &amp; Telemetry Data:</strong> IP address, device fingerprints, browser version, page interaction metrics, and anonymous session IDs gathered via secure analytics instrumentation (PostHog).
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'usage',
      icon: UserCheck,
      title: '2. Purpose & Lawful Processing of Data',
      content: (
        <div className="space-y-3">
          <p>We process your data strictly under lawful grounds of consent and legitimate uses for the following objectives:</p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-400">
            <li><strong>Contextual Property Matching:</strong> Tailoring real-time AI recommendations and financial evaluations based on your stated preferences.</li>
            <li><strong>Facilitating Site Inquiries:</strong> Transmitting buyer contact information to verified developer sales desks only upon explicit user request.</li>
            <li><strong>Platform Security &amp; Optimization:</strong> Monitoring latency, preventing automated query abuse, and improving machine learning accuracy across real estate domain semantics.</li>
          </ul>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            We never sell, rent, or monetize your personal data to third-party telemarketers or unauthorized advertising networks.
          </p>
        </div>
      ),
    },
    {
      id: 'processors',
      icon: Server,
      title: '3. Third-Party Data Processors & Infrastructure',
      badge: 'Enterprise Security',
      content: (
        <div className="space-y-3">
          <p>
            We partner with enterprise-grade infrastructure providers operating under strict confidentiality and security commitments:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">Supabase / PostgreSQL</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Encrypted at rest (AES-256) data storage and session management with row-level security.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">Vercel Inc.</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Global edge CDN delivery, TLS 1.3 encryption in transit, and DDoS mitigation.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">Anthropic &amp; Groq Cloud</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Stateless AI inference (prompts are processed ephemerally and never retained to train foundation models).</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">PostHog Analytics</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">First-party telemetry and UI performance analytics with privacy-preserving IP masking.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'cookies',
      icon: Cookie,
      title: '4. Cookies & Local Storage Governance',
      content: (
        <div className="space-y-3">
          <p>
            RealtyPals utilizes essential cookies and browser local storage to maintain session continuity, guest token states, and saved properties. You can adjust or clear cookie preferences through your browser settings at any time without impacting core search functionality.
          </p>
        </div>
      ),
    },
    {
      id: 'dpdp-rights',
      icon: Shield,
      title: '5. Data Principal Rights (DPDP Act 2023)',
      badge: 'Statutory Rights',
      content: (
        <div className="space-y-3">
          <p>
            Under the Digital Personal Data Protection Act, 2023 (DPDP Act) of India, you hold enforceable rights as a Data Principal:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-400">
            <li><strong>Right to Access &amp; Summary:</strong> Request a comprehensive summary of your personal data processed by RealtyPals.</li>
            <li><strong>Right to Correction &amp; Erasure:</strong> Request immediate rectification of inaccurate data or complete deletion of your session history and saved preferences.</li>
            <li><strong>Right to Nominate:</strong> Nominate an authorized representative in accordance with DPDP rules.</li>
            <li><strong>Right to Grievance Redressal:</strong> Submit inquiries or grievances directly to our Data Protection Officer at <a href="mailto:privacy@realtypals.in" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">privacy@realtypals.in</a> with standard response turnaround within statutory timelines.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'retention',
      icon: Lock,
      title: '6. Data Retention & Security Controls',
      content: (
        <div className="space-y-3">
          <p>
            We enforce strict administrative, physical, and technical safeguards. Chat transcripts are retained for a maximum of 90 days for operational continuity and quality calibration, after which they are purged. Registered user profiles remain active until account termination is initiated.
          </p>
        </div>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] text-slate-800 dark:text-slate-200 transition-colors">
      {/* Header Banner */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            Last Updated: {lastUpdated}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Hero */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 mb-4">
            <Lock size={13} /> DPDP Act 2023 Governance
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
            We value your trust and are committed to protecting your personal information with full transparency, robust encryption, and strict regulatory adherence.
          </p>
        </div>

        {/* Section Cards */}
        <div className="space-y-6">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <section
                key={section.id}
                id={section.id}
                className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Icon size={18} />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {section.title}
                    </h2>
                  </div>
                  {section.badge && (
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                      {section.badge}
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {section.content}
                </div>
              </section>
            )
          })}
        </div>

        {/* DPO Contact Card */}
        <div className="mt-10 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Data Protection &amp; Grievance Officer
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exercise your DPDP data erasure or access rights via email.
              </p>
            </div>
          </div>
          <a
            href="mailto:privacy@realtypals.in"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold tracking-wide shadow-sm transition-all"
          >
            Email Privacy Officer
          </a>
        </div>
      </main>
    </div>
  )
}

