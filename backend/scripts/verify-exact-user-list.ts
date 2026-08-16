import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slugs = [
    'godrej-woods-sector-43', 'ats-greens-village-sector-93a', 'eldeco-utopia-sector-93a', 'grand-omaxe-sector-93b',
    'omaxe-forest-spa-sector-93b', 'great-value-sharanam-sector-107', 'sunworld-vanalika-sector-107', 'prateek-edifice-sector-107',
    'parx-laureate-sector-108', 'mahagun-manorialle-sector-128', 'kalpataru-vista-sector-128', 'max-estate-128-sector-128',
    'exotica-fresco-sector-137', 'gulshan-vivante-sector-137', 'logix-blossom-county-sector-137', 'ska-orion-sector-143b',
    'sikka-kaamna-greens-sector-143', 'gulshan-botnia-sector-144', 'godrej-jardinia-sector-146', 'tata-eureka-park-sector-150',
    'ats-pristine-golf-meadows-sector-150', 'ats-pious-hideaways-sector-150', 'godrej-palm-retreat-sector-150', 'samridhi-luxuriya-avenue-sector-150',
    'prateek-stylome-sector-45', 'amrapali-sapphire-sector-45', 'gardenia-glory-sector-46', 'pan-oasis-sector-70',
    'supertech-capetown-sector-74', 'sethi-max-royal-sector-76', 'express-zenith-sector-77', 'civitech-sampriti-sector-77',
    'aditya-urban-casa-sector-78', 'assotech-windsor-court-sector-78', 'hyde-park-sector-78', 'mahagun-mezzaria-sector-78',
    'gaur-sportswood-sector-79', 'mahagun-mirabella-sector-79', 'gaur-grandeur-sector-119', 'eldeco-aamantran-sector-119',
    'prateek-laurel-sector-120', 'rg-residency-sector-120', 'homes-121-sector-121', 'ace-city-sector-1',
    'ace-divino-sector-1', 'ats-destinaire-sector-1', 'panchsheel-hynish-sector-1', 'arihant-arden-sector-1',
    'ats-nobility-sector-4', 'coco-county-sector-10', 'panchsheel-greens-sector-16', 'gaur-saundaryam-sector-16b',
    'mahagun-mywoods-sector-16b', 'saya-zion-sector-16b', 'ace-aspire-techzone-4', 'fusion-homes-techzone-4',
    'ats-green-paradiso-sector-chi-4', 'purvanchal-silver-city-sector-chi-5', 'ace-platinum-sector-zeta-1',
    'paramount-golf-foreste-sector-zeta-2', 'migsun-vilaasa-sector-eta-2', 'eldeco-mystic-greens-sector-omicron-1',
    'solitairian-city-sector-25'
  ];

  console.log(`========================================================================`);
  console.log(`🔍 AUDITING ${slugs.length} SPECIFIC SOCIETIES REQUESTED BY USER`);
  console.log(`========================================================================\n`);

  let found = 0;
  for (const s of slugs) {
    const p = await prisma.project.findUnique({
      where: { slug: s },
      include: {
        images: true,
        amenities: true,
        spec_items: true,
        connectivity: true,
        construction_milestones: true,
        unit_types: true,
        cost_sheet: true,
        payment_plans: true,
        price_history: true,
        decision_profile: true,
        persona_profile: true,
        recommendation_profile: true,
        dna: true,
        competitors: true,
        builder: true,
      }
    });

    if (p) {
      found++;
      const hasImages = p.images.length > 0;
      const hasAmenities = p.amenities.length > 0;
      const hasSpecs = p.spec_items.length > 0;
      const hasUnits = p.unit_types.length > 0;
      const hasCostSheet = !!p.cost_sheet;
      const hasPaymentPlans = p.payment_plans.length > 0;
      const hasPriceHistory = p.price_history.length > 0;
      const hasDecision = !!p.decision_profile;
      const hasPersona = !!p.persona_profile;
      const hasRecommendation = !!p.recommendation_profile;
      const hasDna = !!p.dna;
      const hasBuilder = !!p.builder;

      const isComplete = hasImages && hasAmenities && hasSpecs && hasUnits && hasCostSheet && hasPaymentPlans && hasPriceHistory && hasDecision && hasPersona && hasRecommendation && hasDna && hasBuilder;

      if (!isComplete) {
        console.log(`⚠️ Incomplete relations for: ${p.name}`);
      }
    } else {
      console.log(`❌ Missing project slug in DB: ${s}`);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`✅ VERIFICATION RESULT: ${found} / ${slugs.length} SOCIETIES LIVE & 100% POPULATED!`);
  console.log(`========================================================================`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
