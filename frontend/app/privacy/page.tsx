import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, Server, Cookie, UserCheck, HelpCircle, PhoneCall, Cpu, MapPin } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | RealtyPals',
  description: 'Privacy policy, data protection governance, DPDP Act 2023 compliance, TRAI communication consents, and cookie disclosures for RealtyPals users.',
}

export default function PrivacyPolicy() {
  const lastUpdated = 'August 24, 2026'

  const sections = [
    {
      id: 'collection',
      icon: Eye,
      title: '1. Information We Collect',
      content: (
        <div className="space-y-3">
          <p>
            RealtyPals gathers only the data necessary to deliver personalized property intelligence, conversational assistance, and developer connections under the Digital Personal Data Protection Act, 2023 (DPDP Act):
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-400">
            <li>
              <strong>Direct Interaction &amp; Conversational Data:</strong> Search parameters, shortlisted sectors, BHK configurations, budget constraints, and prompt inputs submitted to our AI advisory engine.
            </li>
            <li>
              <strong>Lead &amp; Site Visit Data:</strong> Full name, mobile number, and email address provided voluntarily when scheduling site inspections, requesting brochures, or asking for developer callbacks.
            </li>
            <li>
              <strong>Technical &amp; Geolocation Data:</strong> IP address, device fingerprints, approximate geolocation (used strictly to recommend nearby micro-markets such as Sector 150, Noida Expressway, or Greater Noida West), and anonymous session tokens via first-party analytics (PostHog).
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'lead-sharing-trai',
      icon: PhoneCall,
      title: '2. Lead Consent, Developer Sharing & TRAI / DND Waiver',
      badge: 'TRAI & DPDP Compliant',
      content: (
        <div className="space-y-3">
          <p>
            When you submit a request for a property callback, site visit, or brochure on RealtyPals:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-400">
            <li>
              <strong>Authorized Third-Party Sharing:</strong> You explicitly authorize RealtyPals to transmit your contact information (name, phone number, email, and property interest) to the concerned UP-RERA registered developer or their authorized UP-RERA registered Channel Partner (Real Estate Agent) to service your inquiry.
            </li>
            <li>
              <strong>Overriding National DND / TRAI Preference:</strong> In accordance with the Telecom Commercial Communications Customer Preference Regulations, 2018 (TRAI TCCR), you agree that this inquiry grants express authorization for developers and channel partners to contact you via Voice Calls, SMS, WhatsApp, and Email, notwithstanding your registration on the National Do Not Call (NDNC / DND) Registry.
            </li>
            <li>
              <strong>Zero Telemarketing Resale:</strong> We enforce strict partner agreements. Your contact details are shared solely with the specific developer/partner relevant to your requested project and are never sold, rented, or distributed to third-party telemarketing agencies or loan aggregators.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'ai-prompt-privacy',
      icon: Cpu,
      title: '3. AI Conversational Engine & Prompt Privacy',
      badge: 'Zero-Retention Model',
      content: (
        <div className="space-y-3">
          <p>
            RealtyPals provides a domain-specific real estate advisory engine powered by enterprise-grade foundation models:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-400">
            <li>
              <strong>No Model Training on User Prompts:</strong> Your conversational queries, financial evaluations, and prompt inputs are processed via zero-data-retention enterprise APIs. Your conversations are <em>never</em> used to train public foundation models (such as Google Gemini, Anthropic Claude, or OpenAI models).
            </li>
            <li>
              <strong>Encrypted Session Continuity:</strong> Chat transcripts are stored encrypted at rest (AES-256) within your authenticated session for your personal review and are purged according to our data retention schedule.
            </li>
            <li>
              <strong>No Unconsented Behavioral Profiling:</strong> We do not sell prompt telemetry to ad-tech networks or data brokers for cross-site behavioral retargeting.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'usage',
      icon: UserCheck,
      title: '4. Purpose & Lawful Grounds of Processing',
      content: (
        <div className="space-y-3">
          <p>We process personal data strictly under lawful grounds of consent and legitimate uses as defined by the DPDP Act 2023:</p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-400">
            <li><strong>Contextual Property Matching:</strong> Generating real-time market evaluations, RERA comparisons, and price benchmark calculations.</li>
            <li><strong>Fulfilling User Inquiries:</strong> Enabling verified developers and RERA channel partners to coordinate site visits and pricing sheets.</li>
            <li><strong>Platform Security &amp; Anomaly Prevention:</strong> Monitoring query volume to prevent denial-of-service, scraping, or automated system abuse.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'processors',
      icon: Server,
      title: '5. Third-Party Infrastructure & Data Security',
      badge: 'Enterprise Security',
      content: (
        <div className="space-y-3">
          <p>
            We partner with industry-leading infrastructure providers operating under strict ISO 27001 / SOC-2 compliance:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">Supabase / PostgreSQL</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Encrypted at rest (AES-256) with strict Row-Level Security (RLS) policies.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">Vercel &amp; Render Cloud</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">TLS 1.3 encryption in transit, automated DDoS mitigation, and edge caching.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">Enterprise AI Inference</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">Stateless AI processing with zero-data-retention compliance agreements.</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
              <span className="font-bold text-slate-900 dark:text-white text-xs block">PostHog Analytics</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">First-party telemetry and UI performance metrics with privacy-preserving IP masking.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'cookies',
      icon: Cookie,
      title: '6. Cookies, Local Storage & Geolocation Preferences',
      content: (
        <div className="space-y-3">
          <p>
            RealtyPals utilizes essential cookies and browser local storage to maintain session continuity, guest token states, and saved property shortlists. 
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-400">
            <li><strong>Essential Cookies:</strong> Required for user authentication, security verification, and session state.</li>
            <li><strong>Geolocation Data:</strong> Used ephemerally to center the search radius to your relevant NCR sub-market (e.g. Noida vs Greater Noida). You can disable location permissions in your browser at any time without disrupting manual search.</li>
            <li><strong>Opt-Out:</strong> You can clear cookies or local storage directly in your browser settings at any time.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'dpdp-rights',
      icon: Shield,
      title: '7. Data Principal Rights (DPDP Act 2023)',
      badge: 'Statutory Rights',
      content: (
        <div className="space-y-3">
          <p>
            Under the Digital Personal Data Protection Act, 2023 (DPDP Act) of India, you hold clear, legally enforceable rights:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-slate-600 dark:text-slate-400">
            <li><strong>Right to Access &amp; Summary:</strong> Request an itemized summary of all personal data, inquiries, and transcripts processed by RealtyPals.</li>
            <li><strong>Right to Correction &amp; Erasure:</strong> Request the immediate rectification of outdated details or the complete permanent erasure of your account, contact details, and search history.</li>
            <li><strong>Right to Consent Withdrawal:</strong> You may revoke consent for developer communications or platform data processing at any time by emailing our Grievance Cell. Upon withdrawal, your data processing will cease within statutory timeframes.</li>
            <li><strong>Right to Nominate:</strong> Nominate an individual to exercise your Data Principal rights in the event of incapacity or demise.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'retention',
      icon: Lock,
      title: '8. Data Retention & Erasure Schedule',
      content: (
        <div className="space-y-3">
          <p>
            Chat transcripts and search queries from unauthenticated guest sessions are automatically expired after 30 days. Registered user profiles and saved property collections remain active until account deletion is initiated. Upon receiving an erasure request, personal identifiers are completely purged from our active databases within 15 days.
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
            We value your trust and are committed to protecting your personal information with complete transparency, enterprise encryption, DPDP Act 2023 compliance, and strict TRAI communication standards.
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

        {/* Statutory Grievance Redressal Officer Card (Mandatory in India) */}
        <div className="mt-10 p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <HelpCircle size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Statutory Grievance Redressal &amp; Privacy Officer
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Designated officer under Section 5 of the Information Technology Rules, 2021 &amp; DPDP Act, 2023
              </p>
            </div>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">Data Protection &amp; Grievance Officer:</span>
              <p>Legal &amp; Compliance Cell</p>
              <p>RealtyPals Technologies Private Limited</p>
              <p className="mt-1 flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <MapPin size={13} className="text-emerald-500 shrink-0" />
                Sector 62, Noida, Gautam Buddh Nagar, UP 201301, India
              </p>
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block mb-1">Official Channels &amp; Turnaround SLA:</span>
              <p>Email: <a href="mailto:privacy@realtypals.in" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">privacy@realtypals.in</a></p>
              <p>Grievance Escalations: <a href="mailto:grievance@realtypals.in" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">grievance@realtypals.in</a></p>
              <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Acknowledgment within 48 hours · Resolution within statutory DPDP timelines
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
