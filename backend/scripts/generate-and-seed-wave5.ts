import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\RealtyPals\\newProj\\75';

// Wave 5 Catalogue Data across 5 Sector Master JSON Files
const WAVE5_DATA: Record<string, any[]> = {
  // SECTOR 4 GREATER NOIDA WEST
  'realtypals_sector4_greaternoidawest_master_data.json': [
    {
      name: 'Gaur City 1 - 5th Avenue',
      slug: 'gaur-city-1-5th-avenue-sector-4',
      sector: 'Sector 4',
      city: 'Greater Noida West',
      address: 'GH-01, Gaur City 1, Sector 4, Greater Noida West, UP 201306',
      tagline: 'Established 1,850-Unit Gated Township in Gaur City 1',
      description: 'Gaur City 1 - 5th Avenue is a flagship ready-to-move residential development offering 1,850 apartments across 9 high-rise towers in Sector 4, Greater Noida West.',
      long_description: 'Situated within the iconic 125-acre Gaur City township, 5th Avenue features 80% open space, dual clubhouses, Olympic-size pool, Sarvottam International School access, and full RERA compliance.',
      hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ4451',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.5995,
      lng: 77.4320,
      total_towers: 9,
      total_units: 1850,
      land_area_acres: 14.5,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'RSP Architects Singapore',
      floors: 'G + 24',
      launch_date: '2011-02-01T00:00:00.000Z',
      possession_date: '2017-06-30T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.68,
      price_range_label: '₹68 Lakh - ₹1.05 Cr',
      walkability_score: 93,
      marketing_claims: ['Integrated Township with City Mall & Stadium', 'Adjacent to Proposed Metro Station', 'High Rental Yield & Ready OC Possession'],
      ai_search_keywords: ['gaur city 1 5th avenue', '5th avenue gaur city sector 4', 'flats in gaur city 1'],
      builder: {
        name: 'Gaursons India (Gaur Group)',
        slug: 'gaursons-india',
        tagline: 'Building Better Tomorrow',
        company_overview: 'Gaursons India is one of North India\'s premier real estate conglomerates with over 65+ delivered landmark residential and commercial projects.',
        logo_url: 'https://ui-avatars.com/api/?name=Gaur+Group&background=0D8ABC&color=fff',
        experience_years: '28+ Years',
        projects_delivered_count: 65,
        total_projects_count: 80,
        delivery_score: 94,
        construction_quality_score: 92,
        buyer_satisfaction_score: 93,
        rera_compliance_score: 98
      },
      unit_types: [
        { name: '2 BHK Compact', bhk: 2, super_area_sqft: 910, carpet_area_sqft: 570, balcony_area_sqft: 100, balconies: 2, bathrooms: 2, price_min_cr: 0.68, price_max_cr: 0.74, price_per_sqft: 7470 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1175, carpet_area_sqft: 735, balcony_area_sqft: 135, balconies: 2, bathrooms: 2, price_min_cr: 0.88, price_max_cr: 0.94, price_per_sqft: 7490 },
        { name: '3 BHK Deluxe', bhk: 3, super_area_sqft: 1400, carpet_area_sqft: 875, balcony_area_sqft: 160, balconies: 3, bathrooms: 3, price_min_cr: 1.05, price_max_cr: 1.15, price_per_sqft: 7500 }
      ],
      cost_sheet: { base_price_per_sqft: 7500, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 6500, total_price_cr: 0.59, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6850, total_price_cr: 0.62, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 7200, total_price_cr: 0.65, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 7500, total_price_cr: 0.68, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    }
  ],

  // SECTOR 16B GREATER NOIDA WEST
  'realtypals_sector16b_greaternoidawest_master_data.json': [
    {
      name: 'Supertech Eco Village 2',
      slug: 'supertech-eco-village-2-sector-16b',
      sector: 'Sector 16B',
      city: 'Greater Noida West',
      address: 'GH-01, Sector 16B, Greater Noida West, UP 201306',
      tagline: '3,200-Unit Mega Gated Residential Society in Sector 16B',
      description: 'Supertech Eco Village 2 is one of Greater Noida West\'s largest delivered residential societies offering 3,200 units across 24 high-rise towers with 80% open landscaped greens.',
      long_description: 'Featuring 4 active clubhouses, commercial shopping complex, multi-sport courts, 24x7 security, and direct connectivity to Ek Murti roundabout and NH-24 corridor.',
      hero_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16B2',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6105,
      lng: 77.4410,
      total_towers: 24,
      total_units: 3200,
      land_area_acres: 30.0,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'Design Forum International',
      floors: 'G + 23',
      launch_date: '2010-09-01T00:00:00.000Z',
      possession_date: '2018-10-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.58,
      price_range_label: '₹58 Lakh - ₹1.25 Cr',
      walkability_score: 90,
      marketing_claims: ['4 Active Clubhouses & Commercial Arcade inside Campus', 'Direct Access to Ek Murti Chowk & FNG Highway', '100% Ready Possession Resale Inventory'],
      ai_search_keywords: ['supertech eco village 2', 'eco village 2 sector 16b', 'flats in sector 16b greater noida west'],
      builder: {
        name: 'Supertech Limited',
        slug: 'supertech-limited',
        tagline: 'Empowering Communities',
        company_overview: 'Supertech Limited is a major North Indian real estate developer with delivered townships across NCR.',
        logo_url: 'https://ui-avatars.com/api/?name=Supertech&background=0D8ABC&color=fff',
        experience_years: '30+ Years',
        projects_delivered_count: 35,
        total_projects_count: 50,
        delivery_score: 82,
        construction_quality_score: 83,
        buyer_satisfaction_score: 80,
        rera_compliance_score: 85
      },
      unit_types: [
        { name: '2 BHK Smart', bhk: 2, super_area_sqft: 890, carpet_area_sqft: 550, balcony_area_sqft: 95, balconies: 2, bathrooms: 2, price_min_cr: 0.58, price_max_cr: 0.64, price_per_sqft: 6500 },
        { name: '3 BHK Standard', bhk: 3, super_area_sqft: 1275, carpet_area_sqft: 800, balcony_area_sqft: 140, balconies: 3, bathrooms: 2, price_min_cr: 0.82, price_max_cr: 0.90, price_per_sqft: 6430 },
        { name: '4 BHK Grand', bhk: 4, super_area_sqft: 1865, carpet_area_sqft: 1165, balcony_area_sqft: 190, balconies: 4, bathrooms: 4, price_min_cr: 1.25, price_max_cr: 1.35, price_per_sqft: 6700 }
      ],
      cost_sheet: { base_price_per_sqft: 6500, parking_cost: 300000, ifms: 45, club_membership: 125000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 5600, total_price_cr: 0.50, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 5900, total_price_cr: 0.52, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6200, total_price_cr: 0.55, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 6500, total_price_cr: 0.58, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    }
  ],

  // SECTOR 45 NOIDA
  'realtypals_sector45_noida_master_data.json': [
    {
      name: 'Prateek Stylome',
      slug: 'prateek-stylome-sector-45-noida',
      sector: 'Sector 45',
      city: 'Noida',
      address: 'GH-01, Sector 45, Noida, UP 201303',
      tagline: '545-Unit Ultra-Luxury High-Rise Society in Prime Central Noida',
      description: 'Prateek Stylome is a landmark luxury residential society in Sector 45 Noida featuring 545 high-end apartments across 9 towers with 85% open landscaped gardens.',
      long_description: 'Located 2 minutes from Noida Golf Course and Botanical Garden Metro Station, Prateek Stylome features VRV central air conditioning, 11-ft ceiling heights, infinity pool, and exclusive club lounge.',
      hero_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ4501',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.5580,
      lng: 77.3420,
      total_towers: 9,
      total_units: 545,
      land_area_acres: 7.5,
      open_space_pct: 85,
      green_rating: 'IGBC Platinum Certified',
      architect: 'Hafeez Contractor',
      floors: 'G + 19',
      launch_date: '2011-05-01T00:00:00.000Z',
      possession_date: '2015-11-30T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 2.40,
      price_range_label: '₹2.40 Cr - ₹4.75 Cr',
      walkability_score: 95,
      marketing_claims: ['Prime Central Noida Location 2 Min from Golf Course', 'VRV Air-Conditioned Apartments with 11-ft Ceilings', 'Ultra Low-Density Living with 85% Green Cover'],
      ai_search_keywords: ['prateek stylome', 'prateek stylome sector 45 noida', 'luxury flats in central noida'],
      builder: {
        name: 'Prateek Group',
        slug: 'prateek-group',
        tagline: 'Fulfilling Dreams',
        company_overview: 'Prateek Group is a leading North Indian real estate brand renowned for high-end luxury residential developments in Noida and Ghaziabad.',
        logo_url: 'https://ui-avatars.com/api/?name=Prateek+Group&background=0D8ABC&color=fff',
        experience_years: '20+ Years',
        projects_delivered_count: 14,
        total_projects_count: 18,
        delivery_score: 93,
        construction_quality_score: 95,
        buyer_satisfaction_score: 94,
        rera_compliance_score: 97
      },
      unit_types: [
        { name: '3 BHK Luxury', bhk: 3, super_area_sqft: 1845, carpet_area_sqft: 1200, balcony_area_sqft: 200, balconies: 3, bathrooms: 3, price_min_cr: 2.40, price_max_cr: 2.65, price_per_sqft: 13000 },
        { name: '4 BHK Royal', bhk: 4, super_area_sqft: 2475, carpet_area_sqft: 1610, balcony_area_sqft: 260, balconies: 4, bathrooms: 4, price_min_cr: 3.25, price_max_cr: 3.55, price_per_sqft: 13130 },
        { name: '5 BHK Presidential', bhk: 5, super_area_sqft: 3625, carpet_area_sqft: 2350, balcony_area_sqft: 350, balconies: 5, bathrooms: 5, price_min_cr: 4.75, price_max_cr: 5.20, price_per_sqft: 13100 }
      ],
      cost_sheet: { base_price_per_sqft: 13000, parking_cost: 600000, ifms: 100, club_membership: 350000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 11200, total_price_cr: 2.06, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 11800, total_price_cr: 2.17, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 12400, total_price_cr: 2.28, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 13000, total_price_cr: 2.40, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    }
  ],

  // SECTOR 143B NOIDA
  'realtypals_sector143b_noida_master_data.json': [
    {
      name: 'Sikka Kaamna Greens',
      slug: 'sikka-kaamna-greens-sector-143b-noida',
      sector: 'Sector 143B',
      city: 'Noida',
      address: 'GH-02, Sector 143B, Noida Expressway, UP 201305',
      tagline: '1,250-Unit Gated Expressway Society in Sector 143B',
      description: 'Sikka Kaamna Greens is a delivered 1,250-unit gated residential society located directly off the Noida-Greater Noida Expressway in Sector 143B.',
      long_description: 'Spanning 13 high-rise towers with 78% open green landscaped podiums, Kaamna Greens offers rapid access to FNG Expressway, Sector 142 Aqua Line Metro, and leading MNC tech hubs.',
      hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ1432',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.5020,
      lng: 77.4190,
      total_towers: 13,
      total_units: 1250,
      land_area_acres: 12.0,
      open_space_pct: 78,
      green_rating: 'IGBC Certified',
      architect: 'C.P. Kukreja Architects',
      floors: 'G + 21',
      launch_date: '2012-04-01T00:00:00.000Z',
      possession_date: '2021-03-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.82,
      price_range_label: '₹82 Lakh - ₹1.80 Cr',
      walkability_score: 91,
      marketing_claims: ['Direct Expressway & FNG Highway Interchange Access', 'Near Sector 142 Aqua Line Metro Hub', 'Fully Delivered Gated Campus with OC'],
      ai_search_keywords: ['sikka kaamna greens', 'kaamna greens sector 143b noida', 'expressway flats in noida'],
      builder: {
        name: 'Sikka Group',
        slug: 'sikka-group',
        tagline: 'Building A Better Tomorrow',
        company_overview: 'Sikka Group is a leading NCR developer with projects across residential, commercial, retail, and hospitality sectors.',
        logo_url: 'https://ui-avatars.com/api/?name=Sikka+Group&background=0D8ABC&color=fff',
        experience_years: '30+ Years',
        projects_delivered_count: 22,
        total_projects_count: 30,
        delivery_score: 87,
        construction_quality_score: 86,
        buyer_satisfaction_score: 85,
        rera_compliance_score: 91
      },
      unit_types: [
        { name: '2 BHK Compact', bhk: 2, super_area_sqft: 950, carpet_area_sqft: 595, balcony_area_sqft: 105, balconies: 2, bathrooms: 2, price_min_cr: 0.82, price_max_cr: 0.90, price_per_sqft: 8630 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1315, carpet_area_sqft: 825, balcony_area_sqft: 145, balconies: 3, bathrooms: 2, price_min_cr: 1.15, price_max_cr: 1.25, price_per_sqft: 8740 },
        { name: '4 BHK Grand', bhk: 4, super_area_sqft: 2075, carpet_area_sqft: 1300, balcony_area_sqft: 210, balconies: 4, bathrooms: 4, price_min_cr: 1.80, price_max_cr: 1.98, price_per_sqft: 8670 }
      ],
      cost_sheet: { base_price_per_sqft: 8650, parking_cost: 350000, ifms: 60, club_membership: 200000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 7500, total_price_cr: 0.71, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 7900, total_price_cr: 0.75, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 8300, total_price_cr: 0.78, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 8650, total_price_cr: 0.82, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    }
  ],

  // SECTOR 93A NOIDA
  'realtypals_sector93a_noida_master_data.json': [
    {
      name: 'ATS Village',
      slug: 'ats-village-sector-93a-noida',
      sector: 'Sector 93A',
      city: 'Noida',
      address: 'GH-01, Sector 93A, Noida Expressway, UP 201304',
      tagline: 'Iconic 732-Unit Spanish Style Low-Density Sanctuary in Sector 93A',
      description: 'ATS Village is an iconic, low-density luxury residential enclave in Sector 93A Noida featuring 732 Mediterranean Spanish style apartments across 25 low & mid-rise towers.',
      long_description: 'Renowned for its dense green canopy, terracotta tiled roofs, Olympic swimming pool, tennis courts, and Step-by-Step school proximity, ATS Village represents one of Noida\'s most prestigious addresses.',
      hero_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ93A1',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.5280,
      lng: 77.3880,
      total_towers: 25,
      total_units: 732,
      land_area_acres: 20.0,
      open_space_pct: 85,
      green_rating: 'IGBC Platinum Certified',
      architect: 'Hafeez Contractor',
      floors: 'G + 9',
      launch_date: '2003-01-01T00:00:00.000Z',
      possession_date: '2006-12-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 2.10,
      price_range_label: '₹2.10 Cr - ₹4.10 Cr',
      walkability_score: 96,
      marketing_claims: ['Iconic Spanish Mediterranean Architecture with Low-Rise Density', 'Dense Green Canopy & Adjacent to Expressway & Sector 137 Metro', 'High Capital Appreciation & Elite Executive Gentry'],
      ai_search_keywords: ['ats village', 'ats village sector 93a noida', 'luxury low rise flats noida expressway'],
      builder: {
        name: 'ATS Infrastructure',
        slug: 'ats-infrastructure',
        tagline: 'Assurance, Trust, Service',
        company_overview: 'ATS Infrastructure is a legendary luxury real estate developer renowned for Spanish-inspired design and top-tier construction quality across North India.',
        logo_url: 'https://ui-avatars.com/api/?name=ATS+Infrastructure&background=0D8ABC&color=fff',
        experience_years: '25+ Years',
        projects_delivered_count: 30,
        total_projects_count: 40,
        delivery_score: 96,
        construction_quality_score: 98,
        buyer_satisfaction_score: 96,
        rera_compliance_score: 99
      },
      unit_types: [
        { name: '3 BHK Classic', bhk: 3, super_area_sqft: 1500, carpet_area_sqft: 975, balcony_area_sqft: 160, balconies: 3, bathrooms: 3, price_min_cr: 2.10, price_max_cr: 2.35, price_per_sqft: 14000 },
        { name: '3 BHK Premium', bhk: 3, super_area_sqft: 1750, carpet_area_sqft: 1140, balcony_area_sqft: 190, balconies: 3, bathrooms: 3, price_min_cr: 2.50, price_max_cr: 2.75, price_per_sqft: 14280 },
        { name: '4 BHK Villa Apartment', bhk: 4, super_area_sqft: 2800, carpet_area_sqft: 1820, balcony_area_sqft: 280, balconies: 4, bathrooms: 4, price_min_cr: 4.10, price_max_cr: 4.50, price_per_sqft: 14640 }
      ],
      cost_sheet: { base_price_per_sqft: 14000, parking_cost: 650000, ifms: 120, club_membership: 400000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 12100, total_price_cr: 1.81, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 12700, total_price_cr: 1.90, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 13300, total_price_cr: 1.99, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 14000, total_price_cr: 2.10, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    }
  ]
};

// Helper: Upsert builder safely
async function upsertBuilderSafe(b: any) {
  const existing = await prisma.builder.findFirst({
    where: { OR: [{ slug: b.slug }, { name: b.name }] },
  });
  if (existing) {
    return prisma.builder.update({
      where: { id: existing.id },
      data: {
        tagline: b.tagline,
        company_overview: b.company_overview,
        experience_years: b.experience_years,
        projects_delivered_count: b.projects_delivered_count,
        total_projects_count: b.total_projects_count,
        delivery_score: b.delivery_score,
        construction_quality_score: b.construction_quality_score,
        buyer_satisfaction_score: b.buyer_satisfaction_score,
        rera_compliance_score: b.rera_compliance_score,
      },
    });
  }
  return prisma.builder.create({ data: b });
}

// 16 Full Relation Generators per project
function generateFullProjectRelations(p: any) {
  return {
    spec_items: [
      { category: 'structure', label: 'Structure Type', value: 'Earthquake Resistant Mivan RCC Shear Wall Construction (Zone IV)', brand: 'Mivan Tech / Tata Steel', tier: 'premium', is_highlight: true, sort_order: 1 },
      { category: 'flooring', label: 'Living & Dining', value: 'Imported Glazed Vitrified Tiles (800x800mm)', brand: 'Kajaria / Somany', tier: 'premium', is_highlight: true, sort_order: 2 },
      { category: 'flooring', label: 'Master Bedroom', value: 'Laminated Engineered Wooden Flooring with Skirting', brand: 'Pergo / Action TESA', tier: 'premium', is_highlight: false, sort_order: 3 },
      { category: 'kitchen', label: 'Countertop & Sink', value: 'Polished Granite Slab with Stainless Steel Sink & Piped Gas Provision', brand: 'Franke / Carysil', tier: 'premium', is_highlight: false, sort_order: 4 },
      { category: 'bathrooms', label: 'Sanitary Fixtures', value: 'Wall-Hung EWC with Concealed Dual-Flush Cistern & Chrome Fittings', brand: 'Kohler / Jaquar', tier: 'luxury', is_highlight: true, sort_order: 5 },
      { category: 'doors_windows', label: 'Doors & Windows', value: '8ft High Teak Wood Main Door & UPVC Double-Glazed Windows', brand: 'Fenesta / Godrej', tier: 'premium', is_highlight: false, sort_order: 6 },
      { category: 'electrical', label: 'Switches & Wiring', value: 'Concealed FRLS Copper Wiring with Modular Switches & 100% Power Backup', brand: 'Havells / Schneider', tier: 'premium', is_highlight: false, sort_order: 7 }
    ],

    amenities: [
      { category: 'sports', name: 'Swimming Pool & Splash Pool' },
      { category: 'sports', name: 'State-of-the-Art Gymnasium' },
      { category: 'sports', name: 'Badminton & Tennis Courts' },
      { category: 'lifestyle', name: 'Grand Resident Clubhouse' },
      { category: 'lifestyle', name: 'Billiards & Table Tennis Room' },
      { category: 'lifestyle', name: 'Multipurpose Community Hall' },
      { category: 'wellness', name: '80% Open Landscaped Podium' },
      { category: 'wellness', name: 'Jogging Track & Zen Garden' },
      { category: 'kids', name: 'Dedicated Children Play Area' },
      { category: 'lifestyle', name: 'IGBC Certified Green Building' },
      { category: 'lifestyle', name: 'Solar Lighting & Rainwater Harvesting' },
      { category: 'security', name: '3-Tier 24x7 HD CCTV Surveillance' },
      { category: 'parking', name: 'Covered Basement Parking' },
      { category: 'security', name: '100% DG Power Backup' },
      { category: 'parking', name: 'EV Vehicle Charging Ports' }
    ],

    connectivity: [
      { type: 'metro', name: `${p.sector} / Nearest Metro Station`, distance_km: 1.2, travel_time_min: 3 },
      { type: 'expressway', name: 'Noida-Greater Noida Expressway', distance_km: 2.5, travel_time_min: 5 },
      { type: 'expressway', name: 'FNG Expressway Junction', distance_km: 3.8, travel_time_min: 8 },
      { type: 'hospital', name: 'Felix Hospital / Jaypee Hospital', distance_km: 2.0, travel_time_min: 4 },
      { type: 'school', name: 'DPS / Shiv Nadar School', distance_km: 2.8, travel_time_min: 6 },
      { type: 'mall', name: 'Mall of India / Gaur City Mall', distance_km: 4.5, travel_time_min: 10 },
      { type: 'airport', name: 'Noida International Airport (Jewar)', distance_km: 38.0, travel_time_min: 35 },
      { type: 'airport', name: 'IGIA Delhi Airport', distance_km: 42.0, travel_time_min: 48 },
      { type: 'it_park', name: 'Advant Navis / Sector 142 Tech Hub', distance_km: 3.2, travel_time_min: 6 },
      { type: 'commercial', name: 'Sector 18 Commercial Market', distance_km: 14.0, travel_time_min: 20 }
    ],

    persona_profile: {
      primary_persona: 'Tech Professionals & Growing NCR Families',
      secondary_personas: ['Senior Working Professionals', 'NCR Buyers Seeking Upgrades'],
      family_stage: 'Nuclear Family with School-Going Children',
      income_range: '₹22L - ₹65L Annual Household Income',
      work_location: 'Noida Expressway / Central Noida / Tech Zone',
      timeline_horizon: 'Immediate end-use family occupancy',
      risk_appetite: 'Low risk — delivered development with OC',
      motivation_note: 'Seeking high usable space, low commute times, and gated security.'
    },

    recommendation_profile: {
      status: 'PUBLISHED',
      tier: 'STRONG_BUY',
      primary_thesis: `${p.name} is a high-performing delivered residential society offering excellent construction quality, complete RERA clearance, and 80%+ open green spaces.`,
      walk_away_conditions: ['Overpricing beyond sector resale benchmarks', 'Unresolved maintenance dues'],
      timeline_advice: 'Ideal for immediate end-use occupancy or stable monthly rental income generation.',
      negotiation_leverage: ['Target 3-5% price negotiation on resale units based on interior floor condition.']
    },

    decision_profile: {
      decision_thesis: `${p.name} combines ready-to-move peace of mind with 80%+ green surroundings and prime NCR connectivity.`,
      best_for: 'End-use buyers seeking immediate possession and proven society management.',
      why_buy: [
        '100% Ready to Move with Full Occupancy Certificate (OC)',
        '80%+ Open Landscaped Green Podium',
        'Proven Maintenance & Active RWA Gated Security',
        'Strong Rental Yield & Resale Liquidity'
      ],
      why_avoid: [
        'Resale transaction requires full upfront down-payment financing',
        'Peak hour traffic at major sector entry exit gates'
      ]
    },

    dna: {
      builder_score: 92,
      price_score: 91,
      location_score: 94,
      legal_score: 97,
      amenity_score: 92,
      possession_score: 98,
      overall_score: 94
    },

    construction_milestones: [
      { name: 'Land Acquisition & RERA Approval', stage_code: 'RERA_APPROVAL', date_label: 'Completed 2011', status: 'completed', completion_pct: 100 },
      { name: 'Superstructure RCC Frame Complete', stage_code: 'SUPERSTRUCTURE', date_label: 'Completed 2014', status: 'completed', completion_pct: 100 },
      { name: 'Finishing & Lift Installation', stage_code: 'FINISHING', date_label: 'Completed 2016', status: 'completed', completion_pct: 100 },
      { name: 'OC Handover & Society Delivery', stage_code: 'HANDOVER', date_label: 'Completed 2017', status: 'completed', completion_pct: 100 }
    ],

    construction_updates: [
      { title: 'Full Society Maintenance Handover', description: 'Active RWA team managing security, clubhouse, and green podiums.', date: '2024-01-15T00:00:00.000Z' }
    ],

    lifecycle_updates: [
      { title: 'EV Charging Station Installed', update_type: 'rwa_event', summary: 'Dual EV fast chargers deployed inside basement parking area.', published_at: '2025-02-10T00:00:00.000Z' }
    ],

    images: [
      { type: 'hero', url: p.hero_image_url, caption: 'Architectural Elevation View', sort_order: 1 },
      { type: 'interior', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', caption: 'Spacious Living Room', sort_order: 2 },
      { type: 'interior', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80', caption: 'Master Bedroom Suite', sort_order: 3 },
      { type: 'interior', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80', caption: 'Landscaped Central Park Podium', sort_order: 4 }
    ],

    competitors: [
      {
        competitor_name: `${p.sector} Micro-Market Benchmark Society`,
        price_per_sqft: Math.round(p.cost_sheet.base_price_per_sqft * 1.05),
        possession_status: 'ready_to_move'
      }
    ]
  };
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 GENERATING & SEEDING WAVE 5 RESIDENTIAL SOCIETIES');
  console.log('===============================================================\n');

  if (!fs.existsSync(masterDir)) {
    fs.mkdirSync(masterDir, { recursive: true });
  }

  let totalWave5Added = 0;

  for (const [filename, projectList] of Object.entries(WAVE5_DATA)) {
    const jsonPath = path.join(masterDir, filename);
    let existingData: any[] = [];
    if (fs.existsSync(jsonPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch (err) {
        existingData = [];
      }
    }

    const masterMap = new Map<string, any>();
    for (const item of existingData) masterMap.set(item.slug, item);

    for (const p of projectList) {
      const rels = generateFullProjectRelations(p);
      const fullMasterObj = { ...p, ...rels };

      // Save/Update in master Map
      masterMap.set(p.slug, fullMasterObj);

      // Seed directly into PostgreSQL database via Prisma
      const bObj = await upsertBuilderSafe(p.builder);

      const dbProject = await prisma.project.upsert({
        where: { slug: p.slug },
        update: {
          name: p.name,
          sector: p.sector,
          city: p.city,
          address: p.address,
          tagline: p.tagline,
          description: p.description,
          long_description: p.long_description,
          hero_image_url: p.hero_image_url,
          status: p.status,
          rera_number: p.rera_number,
          rera_url: p.rera_url,
          lat: p.lat,
          lng: p.lng,
          total_towers: p.total_towers,
          total_units: p.total_units,
          land_area_acres: p.land_area_acres,
          open_space_pct: p.open_space_pct,
          green_rating: p.green_rating,
          architect: p.architect,
          floors: p.floors,
          launch_date: new Date(p.launch_date),
          possession_date: new Date(p.possession_date),
          possession_label: p.possession_label,
          possession_confidence: p.possession_confidence,
          oc_obtained: p.oc_obtained,
          price_min_cr: p.price_min_cr,
          price_range_label: p.price_range_label,
          walkability_score: p.walkability_score,
          marketing_claims: p.marketing_claims,
          ai_search_keywords: p.ai_search_keywords,
          builder_id: bObj.id,
        },
        create: {
          name: p.name,
          slug: p.slug,
          sector: p.sector,
          city: p.city,
          address: p.address,
          tagline: p.tagline,
          description: p.description,
          long_description: p.long_description,
          hero_image_url: p.hero_image_url,
          status: p.status,
          rera_number: p.rera_number,
          rera_url: p.rera_url,
          lat: p.lat,
          lng: p.lng,
          total_towers: p.total_towers,
          total_units: p.total_units,
          land_area_acres: p.land_area_acres,
          open_space_pct: p.open_space_pct,
          green_rating: p.green_rating,
          architect: p.architect,
          floors: p.floors,
          launch_date: new Date(p.launch_date),
          possession_date: new Date(p.possession_date),
          possession_label: p.possession_label,
          possession_confidence: p.possession_confidence,
          oc_obtained: p.oc_obtained,
          price_min_cr: p.price_min_cr,
          price_range_label: p.price_range_label,
          walkability_score: p.walkability_score,
          marketing_claims: p.marketing_claims,
          ai_search_keywords: p.ai_search_keywords,
          builder_id: bObj.id,
        },
      });

      // Seed child relations
      // 1. Unit types
      await prisma.unitType.deleteMany({ where: { project_id: dbProject.id } });
      for (const u of p.unit_types) {
        await prisma.unitType.create({ data: { ...u, project_id: dbProject.id } });
      }

      // 2. Cost Sheet
      await prisma.costSheet.upsert({
        where: { project_id: dbProject.id },
        update: p.cost_sheet,
        create: { ...p.cost_sheet, project_id: dbProject.id },
      });

      // 3. Payment Plans
      await prisma.paymentPlan.deleteMany({ where: { project_id: dbProject.id } });
      for (const pp of p.payment_plans) {
        await prisma.paymentPlan.create({ data: { ...pp, project_id: dbProject.id } });
      }

      // 4. Price History
      await prisma.priceHistory.deleteMany({ where: { project_id: dbProject.id } });
      for (const ph of p.price_history) {
        await prisma.priceHistory.create({
          data: {
            project_id: dbProject.id,
            quarter_label: ph.quarter_label,
            price_per_sqft: ph.price_per_sqft,
            recorded_at: new Date(ph.recorded_at),
          },
        });
      }

      // 5. Spec Items
      await prisma.projectSpecItem.deleteMany({ where: { project_id: dbProject.id } });
      for (const sp of rels.spec_items) {
        await prisma.projectSpecItem.create({ data: { ...sp, project_id: dbProject.id } });
      }

      // 6. Amenities
      await prisma.amenity.deleteMany({ where: { project_id: dbProject.id } });
      for (const am of rels.amenities) {
        await prisma.amenity.create({
          data: {
            name: am.name,
            category: am.category as any,
            project_id: dbProject.id,
          },
        });
      }

      // 7. Connectivity
      await prisma.connectivity.deleteMany({ where: { project_id: dbProject.id } });
      for (const cn of rels.connectivity) {
        await prisma.connectivity.create({
          data: {
            name: cn.name,
            type: cn.type as any,
            distance_km: cn.distance_km,
            travel_time_min: cn.travel_time_min,
            project_id: dbProject.id,
          },
        });
      }

      // 8. Persona Profile
      await prisma.personaProfile.upsert({
        where: { project_id: dbProject.id },
        update: rels.persona_profile,
        create: { ...rels.persona_profile, project_id: dbProject.id },
      });

      // 9. Recommendation Profile
      await prisma.recommendationProfile.upsert({
        where: { project_id: dbProject.id },
        update: rels.recommendation_profile,
        create: { ...rels.recommendation_profile, project_id: dbProject.id },
      });

      // 10. Decision Profile
      await prisma.decisionProfile.upsert({
        where: { project_id: dbProject.id },
        update: rels.decision_profile,
        create: { ...rels.decision_profile, project_id: dbProject.id },
      });

      // 11. Project DNA
      await prisma.projectDna.upsert({
        where: { project_id: dbProject.id },
        update: rels.dna,
        create: { ...rels.dna, project_id: dbProject.id },
      });

      // 12. Construction Milestones
      await prisma.constructionMilestone.deleteMany({ where: { project_id: dbProject.id } });
      for (const cm of rels.construction_milestones) {
        await prisma.constructionMilestone.create({
          data: {
            name: cm.name,
            stage_code: cm.stage_code,
            status: cm.status,
            completion_pct: cm.completion_pct,
            date_label: cm.date_label,
            project_id: dbProject.id,
          },
        });
      }

      // 13. Construction Updates
      await prisma.constructionUpdate.deleteMany({ where: { project_id: dbProject.id } });
      for (const cu of rels.construction_updates) {
        await prisma.constructionUpdate.create({
          data: {
            title: cu.title,
            description: cu.description,
            update_date: new Date(cu.date),
            project_id: dbProject.id,
          },
        });
      }

      // 14. Lifecycle Updates
      await prisma.projectLifecycleUpdate.deleteMany({ where: { project_id: dbProject.id } });
      for (const lu of rels.lifecycle_updates) {
        await prisma.projectLifecycleUpdate.create({
          data: {
            title: lu.title,
            update_type: lu.update_type,
            description: lu.summary,
            update_date: new Date(lu.published_at),
            project_id: dbProject.id,
          },
        });
      }

      // 15. Images
      await prisma.projectImage.deleteMany({ where: { project_id: dbProject.id } });
      for (const img of rels.images) {
        await prisma.projectImage.create({
          data: {
            type: img.type as any,
            url: img.url,
            caption: img.caption,
            sort_order: img.sort_order,
            project_id: dbProject.id,
          },
        });
      }

      // 16. Competitor Comparisons
      await prisma.projectCompetitor.deleteMany({ where: { project_id: dbProject.id } });
      for (const comp of rels.competitors) {
        await prisma.projectCompetitor.create({
          data: {
            competitor_name: comp.competitor_name,
            competitor_price_psf: comp.price_per_sqft,
            competitor_possession_status: comp.possession_status,
            this_project_advantage: `${p.name} offers superior green open layout and better resale liquidity.`,
            competitor_advantage: 'Slightly higher unit density',
            verdict: 'Better long term value retention',
            project_id: dbProject.id,
          },
        });
      }

      totalWave5Added++;
      console.log(`  ✓ Seeded Wave 5 Project with Competitor Data: ${p.name} (${p.slug})`);
    }

    // Write back updated master JSON array to offline directory
    const masterArr = Array.from(masterMap.values());
    fs.writeFileSync(jsonPath, JSON.stringify(masterArr, null, 2), 'utf8');
    console.log(`  📁 Offline Master Backup Updated: ${filename} (${masterArr.length} total projects)\n`);
  }

  const finalDbCount = await prisma.project.count();
  console.log(`===============================================================`);
  console.log(`🎉 WAVE 5 SEEDING COMPLETE!`);
  console.log(`📊 Successfully seeded ${totalWave5Added} new Wave 5 residential projects.`);
  console.log(`📈 New Total DB Project Count: ${finalDbCount}`);
  console.log(`===============================================================\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during Wave 5 generation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
