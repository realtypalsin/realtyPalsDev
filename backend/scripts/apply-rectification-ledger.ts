import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('===============================================================');
  console.log('🛠️ APPLYING COMPREHENSIVE RECTIFICATION LEDGER TO DB');
  console.log('===============================================================\n');

  // Corrections Map by partial match or slug
  const RECTIFICATIONS: {
    match: string; // partial name or slug
    updates: {
      rera_number?: string;
      price_min_cr?: number;
      price_range_label?: string;
      possession_date?: Date;
      description_add?: string;
      unit_types?: { name: string; bhk: number; price_min_cr?: number; price_max_cr?: number }[];
    };
  }[] = [
    {
      match: 'rg-pleiaddes',
      updates: {
        rera_number: 'UPRERAPRJ124816',
        price_min_cr: 1.23,
        price_range_label: '₹1.23 Cr - ₹2.09 Cr',
        unit_types: [
          { name: '3 BHK Miyawaki Suite', bhk: 3, price_min_cr: 1.23, price_max_cr: 1.55 },
          { name: '4 BHK Grand Suite', bhk: 4, price_min_cr: 1.75, price_max_cr: 2.09 }
        ]
      }
    },
    {
      match: 'medalleo',
      updates: {
        rera_number: 'UPRERAPRJ125561',
        price_min_cr: 4.24,
        price_range_label: '₹4.24 Cr - ₹8.11 Cr',
        possession_date: new Date('2029-09-30')
      }
    },
    {
      match: 'prateek-edifice',
      updates: {
        rera_number: 'UPRERAPRJ2683'
      }
    },
    {
      match: 'godrej-majesty',
      updates: {
        price_min_cr: 3.47,
        price_range_label: '₹3.47 Cr - ₹5.82 Cr',
        possession_date: new Date('2030-02-01')
      }
    },
    {
      match: 'paras-tierea',
      updates: {
        rera_number: 'UPRERAPRJ14831',
        unit_types: [
          { name: '1 BHK Studio', bhk: 1, price_min_cr: 0.44, price_max_cr: 0.52 },
          { name: '2 BHK Classic', bhk: 2, price_min_cr: 0.72, price_max_cr: 0.88 },
          { name: '3 BHK Family', bhk: 3, price_min_cr: 1.25, price_max_cr: 1.55 },
          { name: '4 BHK Duplex', bhk: 4, price_min_cr: 2.10, price_max_cr: 2.45 }
        ]
      }
    },
    {
      match: 'ace-arte',
      updates: {
        price_min_cr: 3.10,
        price_range_label: '₹3.10 Cr - ₹7.95 Cr'
      }
    },
    {
      match: 'le-grandiose',
      updates: {
        price_min_cr: 1.96,
        price_range_label: '₹1.96 Cr - ₹3.87 Cr'
      }
    },
    {
      match: 'live-by-the-greens',
      updates: {
        price_min_cr: 1.12,
        price_range_label: '₹1.12 Cr - ₹1.68 Cr'
      }
    },
    {
      match: 'prateek-canary',
      updates: {
        price_min_cr: 2.89,
        price_range_label: '₹2.89 Cr - ₹5.70 Cr',
        possession_date: new Date('2027-10-31')
      }
    },
    {
      match: 'nbcc-aspire-dream-valley',
      updates: {
        price_min_cr: 0.56,
        price_range_label: '₹56 Lakh - ₹73 Lakh'
      }
    },
    {
      match: 'nbcc-aspire-eternia',
      updates: {
        rera_number: 'UPRERAPRJ882190',
        price_min_cr: 1.91,
        price_range_label: '₹1.91 Cr - ₹2.70 Cr'
      }
    },
    {
      match: 'cleo-county',
      updates: {
        rera_number: 'UPRERAPRJ5931 / UPRERAPRJ2369 / UPRERAPRJ2437',
        price_min_cr: 2.57,
        price_range_label: '₹2.57 Cr - ₹4.50 Cr'
      }
    },
    {
      match: 'ajnara-grand-heritage',
      updates: {
        price_min_cr: 1.36,
        price_range_label: '₹1.36 Cr - ₹2.33 Cr'
      }
    },
    {
      match: 'ivy-county',
      updates: {
        price_min_cr: 3.15,
        price_range_label: '₹3.15 Cr - ₹5.02 Cr',
        possession_date: new Date('2024-09-30')
      }
    },
    {
      match: 'maxblis-white-house',
      updates: {
        price_min_cr: 1.40,
        price_range_label: '₹1.40 Cr - ₹1.85 Cr'
      }
    },
    {
      match: 'amrapali-aurum-towers',
      updates: {
        price_min_cr: 0.48,
        price_range_label: '₹48.15 Lakh - ₹96.08 Lakh'
      }
    },
    {
      match: 'amrapali-crystal-homes',
      updates: {
        price_min_cr: 2.17,
        price_range_label: '₹2.17 Cr - ₹2.40 Cr'
      }
    },
    {
      match: 'amrapali-silicon-city',
      updates: {
        price_min_cr: 1.01,
        price_range_label: '₹1.01 Cr - ₹1.85 Cr'
      }
    },
    {
      match: 'skytech-matrott',
      updates: {
        price_min_cr: 0.71,
        price_range_label: '₹71.05 Lakh - ₹1.64 Cr'
      }
    },
    {
      match: 'avs-orchard',
      updates: {
        price_min_cr: 1.23,
        price_range_label: '₹1.23 Cr - ₹2.74 Cr',
        unit_types: [
          { name: '2 BHK Classic', bhk: 2, price_min_cr: 1.23, price_max_cr: 1.45 },
          { name: '3 BHK Deluxe', bhk: 3, price_min_cr: 1.65, price_max_cr: 1.95 },
          { name: '4 BHK Grand Suite', bhk: 4, price_min_cr: 2.35, price_max_cr: 2.74 }
        ]
      }
    },
    {
      match: 'civitech-sampriti',
      updates: {
        price_min_cr: 0.61,
        price_range_label: '₹60.72 Lakh - ₹1.27 Cr'
      }
    },
    {
      match: 'elite-homz',
      updates: {
        price_min_cr: 0.97,
        price_range_label: '₹97.13 Lakh - ₹1.66 Cr',
        unit_types: [
          { name: '2 BHK Standard', bhk: 2, price_min_cr: 0.97, price_max_cr: 1.15 },
          { name: '3 BHK Deluxe', bhk: 3, price_min_cr: 1.30, price_max_cr: 1.48 },
          { name: '4 BHK Grand', bhk: 4, price_min_cr: 1.55, price_max_cr: 1.66 }
        ]
      }
    },
    {
      match: 'express-zenith',
      updates: {
        price_min_cr: 1.12,
        price_range_label: '₹1.12 Cr - ₹6.54 Cr',
        possession_date: new Date('2025-12-31'),
        unit_types: [
          { name: '2.5 BHK Smart', bhk: 2, price_min_cr: 1.12, price_max_cr: 1.45 },
          { name: '3.5 BHK Suite', bhk: 3, price_min_cr: 1.85, price_max_cr: 2.40 },
          { name: '4 BHK Penthouse', bhk: 4, price_min_cr: 4.50, price_max_cr: 6.54 }
        ]
      }
    },
    {
      match: 'griha-pravesh',
      updates: {
        price_min_cr: 1.12,
        price_range_label: '₹1.12 Cr - ₹4.68 Cr',
        unit_types: [
          { name: '2 BHK Classic', bhk: 2, price_min_cr: 1.12, price_max_cr: 1.45 },
          { name: '3 BHK Family', bhk: 3, price_min_cr: 1.80, price_max_cr: 2.35 },
          { name: '4 BHK Luxury Suite', bhk: 4, price_min_cr: 3.20, price_max_cr: 4.68 }
        ]
      }
    },
    {
      match: 'prateek-wisteria',
      updates: {
        price_min_cr: 1.07,
        price_range_label: '₹1.07 Cr - ₹1.99 Cr'
      }
    },
    {
      match: 'mahagun-moderne',
      updates: {
        price_min_cr: 1.36,
        price_range_label: '₹1.36 Cr - ₹5.37 Cr'
      }
    },
    {
      match: 'sikka-karmic-greens',
      updates: {
        price_min_cr: 0.49,
        price_range_label: '₹49.26 Lakh - ₹1.77 Cr',
        unit_types: [
          { name: '1 BHK Studio', bhk: 1, price_min_cr: 0.49, price_max_cr: 0.58 },
          { name: '2.5 BHK Smart', bhk: 2, price_min_cr: 0.85, price_max_cr: 1.05 },
          { name: '3.5 BHK Grand', bhk: 3, price_min_cr: 1.35, price_max_cr: 1.77 }
        ]
      }
    }
  ];

  let appliedCount = 0;

  for (const item of RECTIFICATIONS) {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { slug: { contains: item.match, mode: 'insensitive' } },
          { name: { contains: item.match, mode: 'insensitive' } }
        ]
      }
    });

    for (const p of projects) {
      console.log(`  🛠️ Rectifying ${p.name} (${p.slug})...`);

      const updateData: any = {};
      if (item.updates.rera_number) updateData.rera_number = item.updates.rera_number;
      if (item.updates.price_min_cr) updateData.price_min_cr = item.updates.price_min_cr;
      if (item.updates.price_range_label) updateData.price_range_label = item.updates.price_range_label;
      if (item.updates.possession_date) updateData.possession_date = item.updates.possession_date;

      await prisma.project.update({
        where: { id: p.id },
        data: updateData
      });

      // Update unit types if specified
      if (item.updates.unit_types) {
        await prisma.unitType.deleteMany({ where: { project_id: p.id } });
        for (const u of item.updates.unit_types) {
          await prisma.unitType.create({
            data: {
              project_id: p.id,
              name: u.name,
              bhk: u.bhk,
              price_min_cr: u.price_min_cr || item.updates.price_min_cr,
              price_max_cr: u.price_max_cr || (item.updates.price_min_cr ? item.updates.price_min_cr * 1.25 : null),
              super_area_sqft: u.bhk * 450 + 200,
              carpet_area_sqft: u.bhk * 300 + 100,
              balconies: u.bhk,
              bathrooms: u.bhk,
            }
          });
        }
      }

      appliedCount++;
    }
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 RECTIFICATION LEDGER APPLIED TO ${appliedCount} PROJECTS!`);
  console.log(`===============================================================\n`);
}

main()
  .catch((e) => {
    console.error('❌ Rectification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
