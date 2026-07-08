import PropertyListingForm from '@/components/PropertyListingForm'

export const metadata = {
  title: 'List Your Property | RealtyPals',
  description: 'Submit your real estate project for listing on RealtyPals.',
}

export default function GetListedPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] relative overflow-hidden flex flex-col justify-center py-16 px-4 sm:px-6">
      {/* Decorative gradient blur */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-100/50 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-3xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <h1 className="text-[32px] sm:text-[40px] font-bold text-zinc-900 tracking-tight leading-tight mb-4">
            List Your Project
          </h1>
          <p className="text-[16px] text-zinc-500 font-medium max-w-xl mx-auto leading-relaxed">
            Submit your property details. Our intelligence team will review and approve your listing for the RealtyPals platform.
          </p>
        </div>
        <PropertyListingForm />
      </div>
    </div>
  )
}
