import BuilderRegistrationForm from '@/components/BuilderRegistrationForm'

export const metadata = {
  title: 'Builder Registration | RealtyPals',
  description: 'Register your real estate business with RealtyPals',
}

export default function BuilderRegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">Join RealtyPals as a Builder</h1>
          <p className="text-gray-600 text-lg">
            Connect with buyers and manage your projects on India&apos;s trusted real estate advisor
          </p>
        </div>
        <BuilderRegistrationForm />
      </div>
    </div>
  )
}
