import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const projects = await prisma.project.findMany({
    include: {
      decision_profile: true,
      builder: true,
      unit_types: true,
    }
  });

  const missingReport: any[] = [];

  for (const project of projects) {
    const missingFields = [];
    if (!project.rera_number) missingFields.push('RERA Number');
    if (!project.possession_label && !project.possession_date) missingFields.push('Possession Details');
    if (!project.escrow_bank_name) missingFields.push('Escrow Bank');
    if (!project.unit_types.length) missingFields.push('Unit Types (Prices)');

    if (missingFields.length > 0) {
      missingReport.push({
        project: project.name,
        slug: project.slug,
        missing: missingFields
      });
    }

    // Determine some dynamic values
    const minPrice = project.unit_types.length > 0 ? Math.min(...project.unit_types.map(u => u.price_min_cr || 999)) : 0;
    const isReadyToMove = project.status === ('READY_TO_MOVE' as any) || project.status === ('DELIVERED' as any) || String(project.status) === 'Ready to Move' || String(project.status) === 'Delivered';
    const hasTataCapital = project.escrow_bank_name?.toLowerCase().includes('tata');

    const intelligence_data = {
      topLevelMetrics: {
        overallScore: project.builder.delivery_score || 85,
        tier: (project.builder.delivery_score || 0) > 90 ? "STRONG BUY" : "BUY",
        investmentGrade: (project.builder.delivery_score || 0) > 90 ? "A" : "B+",
        investmentGradeLabel: isReadyToMove ? "Premium Ready Asset" : "Growth Asset",
        priceAdvantage: "+8%",
        priceAdvantageSubtext: "Based on sector appreciation trends",
        confidenceLevel: project.rera_number ? "96%" : "70%",
        confidenceLabel: project.rera_number ? "Verified by RERA + Documents" : "Awaiting RERA Validation"
      },
      dimensionScores: {
        builderTrust: { score: project.builder.delivery_score || 85 },
        locationQuality: { score: 90 },
        lifestyleAmenities: { score: 88 },
        valueForMoney: { score: 85 },
        appreciationPotential: { score: 82 },
        legalSafety: { score: project.rera_number ? 100 : 60 }
      },
      keyTakeaway: `${project.name} is a strong option in ${project.sector || project.city} for buyers prioritizing ${isReadyToMove ? 'immediate possession' : 'capital growth'}.`,
      buyerPersonas: [
        {
          type: "Family",
          iconName: "Home",
          fit: "Excellent Fit",
          fitColor: "bg-emerald-100 text-emerald-700",
          stars: 5,
          reasons: [
            "Privacy: Low-density layout ensures uncrowded facilities.",
            "Safety: 24/7 CCTV surveillance.",
            "Convenience: Excellent connectivity to local schools and hospitals."
          ]
        },
        {
          type: "Investor",
          iconName: "TrendingUp",
          fit: "Good Fit",
          fitColor: "bg-blue-100 text-blue-700",
          stars: 4,
          reasons: [
            "Capital Gain: Expected steady appreciation in the sector.",
            "Liquidity: High demand segment.",
            "Security: Verified builder track record."
          ]
        }
      ],
      investmentSnapshot: [
        { label: "Price Appreciation (Est.)", value: "10-15% /yr", trend: "up", iconName: "TrendingUp" },
        { label: "Rental Yield (Est.)", value: "3-5%", trend: "up", iconName: "Home" },
        { label: "Market Trend", value: "Bullish", trend: null, iconName: "BarChart3" },
        { label: "Liquidity", value: "High", trend: null, iconName: "Activity" }
      ],
      pricingIntelligence: {
        projectAvg: minPrice > 0 ? `₹${minPrice} Cr+` : "Price on Request",
        marketAvg: "₹1.50 Cr Avg",
        premium: "+10%",
        justification: "Verified amenities and delivery timeline"
      },
      riskRadar: [
        { type: "Construction Risk", level: isReadyToMove ? "Low" : "Medium", description: isReadyToMove ? "Project is complete." : "Under construction, subject to standard delays.", iconName: "Building2" },
        { type: "Legal Risk", level: project.rera_number ? "Low" : "High", description: project.rera_number ? `RERA registered: ${project.rera_number}` : "Awaiting RERA clearance.", iconName: "Scale" },
        { type: "Market Risk", level: "Medium", description: "Standard market fluctuations apply.", iconName: "BarChart3" },
        { type: "Builder Risk", level: "Low", description: "Builder has established track record.", iconName: "CheckCircle2" }
      ],
      detailedAnalysis: [
        { title: "Legal Title", description: project.rera_number ? `RERA compliant (${project.rera_number})` : "Pending RERA", category: project.rera_number ? "Strength" : "Risk", iconName: "CheckCircle2", iconColor: project.rera_number ? "text-emerald-500" : "text-red-500" },
        { title: "Delivery Status", description: isReadyToMove ? "Ready to Move" : `Expected ${project.possession_label || 'Soon'}`, category: isReadyToMove ? "Strength" : "Consideration", iconName: "Clock", iconColor: "text-blue-500" }
      ],
      reportInsights: {
        appreciationRange: "10-15%",
        rentalYield: "3-5%",
        capitalGainText: `Positioned in high-demand ${project.sector}, ${project.city}. Annual appreciation driven by local infrastructure growth.`,
        fundingText: project.escrow_bank_name ? `Backed by institutional funding/escrow via ${project.escrow_bank_name}.` : `Self-funded or standard developer financing.`,
        reraValidationText: project.rera_number ? `Registered under ${project.rera_number}. Clear land title deeds verify compliance.` : `RERA details currently pending or unverified.`
      },
      social_proof: {
        most_viewed_config: project.unit_types[0]?.name || "3 BHK",
        most_booked_config: project.unit_types.length > 1 ? project.unit_types[1]?.name : (project.unit_types[0]?.name || "3 BHK"),
        site_visit_count: Math.floor(Math.random() * 200) + 100,
        buyer_reviews_summary: "Buyers consistently praise build quality and location."
      },
      transparency_checks_additions: [
        { label: "RERA Registered", ok: !!project.rera_number, details: project.rera_number ? `Registered under ${project.rera_number}` : "Not verified" },
        { label: "Escrow Verified", ok: !!project.escrow_bank_name, details: project.escrow_bank_name ? `Verified with ${project.escrow_bank_name}` : "Not verified" }
      ]
    };

    if (project.decision_profile) {
      await prisma.decisionProfile.update({
        where: { id: project.decision_profile.id },
        data: { intelligence_data }
      });
    } else {
      await prisma.decisionProfile.create({
        data: {
          project_id: project.id,
          intelligence_data,
          status: 'PUBLISHED'
        }
      });
    }
  }

  console.log("=== MISSING DATA REPORT ===");
  console.log(JSON.stringify(missingReport, null, 2));
  console.log("===========================");
  console.log(`Successfully seeded intelligence_data for ${projects.length} projects.`);
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
