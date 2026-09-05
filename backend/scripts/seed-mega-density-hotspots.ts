import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\PropFyndr\\newProj\\75';

// Wave 11 Mega High-Density Sector Expansion (Noida & Greater Noida West Hotspots)
const MEGA_HOTSPOT_DATA: Record<string, any[]> = {
  // SECTOR 16B GREATER NOIDA WEST (MEGA TOWNSHIP CLUSTER - OVER 20,000 RESIDENTS)
  'propfyndr_sector16b_greaternoidawest_master_data.json': [
    {
      name: 'Supertech Eco Village 1',
      slug: 'supertech-eco-village-1-sector-16b',
      sector: 'Sector 16B',
      city: 'Greater Noida West',
      address: 'GH-01, Sector 16B, Greater Noida West, UP 201306',
      tagline: '4,500-Unit Mega Township & High-Street Market in Sector 16B',
      description: 'Supertech Eco Village 1 is a delivered 4,500-unit mega residential township across 40 high-rise towers in Sector 16B, Greater Noida West.',
      long_description: 'Spanning 50 acres with an integrated commercial high-street market, 4 resident clubhouses, swimming pools, amphitheater, and 3-minute drive to Gaur City Mall.',
      hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16B1',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.5980,
      lng: 77.4420,
      total_towers: 40,
      total_units: 4500,
      land_area_acres: 50.0,
      open_space_pct: 78,
      green_rating: 'IGBC Certified',
      architect: 'Design Forum International',
      floors: 'G + 20',
      launch_date: '2010-03-01T00:00:00.000Z',
      possession_date: '2017-06-30T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.48,
      price_range_label: '₹48 Lakh - ₹92 Lakh',
      walkability_score: 96,
      marketing_claims: ['4,500-Unit Integrated Mega Township with 4 Clubhouses', 'In-House Commercial Shopping Arcade & Market', '100% Ready OC Resale Inventory'],
      ai_search_keywords: ['supertech eco village 1', 'eco village 1 sector 16b', 'flats in sector 16b greater noida west'],
      builder: {
        name: 'Supertech Limited',
        slug: 'supertech-limited',
        tagline: 'Empowering India Through Real Estate',
        company_overview: 'Supertech Limited is one of NCR’s largest real estate developers responsible for massive township developments across Noida, Greater Noida, and Gurgaon.',
        logo_url: 'https://ui-avatars.com/api/?name=Supertech+Limited&background=0D8ABC&color=fff',
        experience_years: '30+ Years',
        projects_delivered_count: 50,
        total_projects_count: 70,
        delivery_score: 82,
        construction_quality_score: 84,
        buyer_satisfaction_score: 82,
        rera_compliance_score: 88
      },
      unit_types: [
        { name: '1 BHK Smart', bhk: 1, super_area_sqft: 550, carpet_area_sqft: 340, balcony_area_sqft: 60, balconies: 1, bathrooms: 1, price_min_cr: 0.48, price_max_cr: 0.54, price_per_sqft: 8720 },
        { name: '2 BHK Classic', bhk: 2, super_area_sqft: 890, carpet_area_sqft: 555, balcony_area_sqft: 95, balconies: 2, bathrooms: 2, price_min_cr: 0.62, price_max_cr: 0.70, price_per_sqft: 6960 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1275, carpet_area_sqft: 795, balcony_area_sqft: 135, balconies: 3, bathrooms: 2, price_min_cr: 0.82, price_max_cr: 0.92, price_per_sqft: 6430 }
      ],
      cost_sheet: { base_price_per_sqft: 6800, parking_cost: 300000, ifms: 40, club_membership: 125000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 5600, total_price_cr: 0.40, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6000, total_price_cr: 0.43, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6400, total_price_cr: 0.45, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 6800, total_price_cr: 0.48, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    },
    {
      name: 'Supertech Eco Village 2',
      slug: 'supertech-eco-village-2-sector-16b',
      sector: 'Sector 16B',
      city: 'Greater Noida West',
      address: 'GH-02, Sector 16B, Greater Noida West, UP 201306',
      tagline: '3,800-Unit Delivered Residential Society in Sector 16B',
      description: 'Supertech Eco Village 2 is a delivered 3,800-unit residential society across 30 high-rise towers in Sector 16B, Greater Noida West.',
      long_description: 'Spanning 30 acres with 80% open landscaped green lawns, 3 resident clubhouses, sports complex, and active resident welfare association.',
      hero_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16B2',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.5990,
      lng: 77.4435,
      total_towers: 30,
      total_units: 3800,
      land_area_acres: 30.0,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'Design Forum International',
      floors: 'G + 22',
      launch_date: '2011-02-01T00:00:00.000Z',
      possession_date: '2018-03-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.52,
      price_range_label: '₹52 Lakh - ₹98 Lakh',
      walkability_score: 95,
      marketing_claims: ['3,800-Unit Landscaped Township', '3 Resident Clubhouses & Swimming Pools', '100% OC Ready Resale Inventory'],
      ai_search_keywords: ['supertech eco village 2', 'eco village 2 sector 16b', '2bhk in sector 16b greater noida west'],
      builder: {
        name: 'Supertech Limited',
        slug: 'supertech-limited',
        tagline: 'Empowering India Through Real Estate',
        company_overview: 'Supertech Limited is one of NCR’s largest real estate developers responsible for massive township developments across Noida, Greater Noida, and Gurgaon.',
        logo_url: 'https://ui-avatars.com/api/?name=Supertech+Limited&background=0D8ABC&color=fff',
        experience_years: '30+ Years',
        projects_delivered_count: 50,
        total_projects_count: 70,
        delivery_score: 82,
        construction_quality_score: 84,
        buyer_satisfaction_score: 82,
        rera_compliance_score: 88
      },
      unit_types: [
        { name: '2 BHK Standard', bhk: 2, super_area_sqft: 840, carpet_area_sqft: 525, balcony_area_sqft: 90, balconies: 2, bathrooms: 2, price_min_cr: 0.52, price_max_cr: 0.60, price_per_sqft: 6190 },
        { name: '3 BHK Deluxe', bhk: 3, super_area_sqft: 1300, carpet_area_sqft: 810, balcony_area_sqft: 140, balconies: 3, bathrooms: 2, price_min_cr: 0.85, price_max_cr: 0.98, price_per_sqft: 6530 }
      ],
      cost_sheet: { base_price_per_sqft: 6500, parking_cost: 300000, ifms: 40, club_membership: 125000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 5400, total_price_cr: 0.43, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 5800, total_price_cr: 0.46, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6150, total_price_cr: 0.49, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 6500, total_price_cr: 0.52, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    },
    {
      name: 'Nirala Estate Phase 1',
      slug: 'nirala-estate-phase-1-sector-16b',
      sector: 'Sector 16B',
      city: 'Greater Noida West',
      address: 'GH-04, Sector 16B, Greater Noida West, UP 201306',
      tagline: '1,900-Unit Delivered Residential Society in Sector 16B',
      description: 'Nirala Estate Phase 1 is a delivered 1,900-unit residential society across 18 high-rise towers in Sector 16B, Greater Noida West.',
      long_description: 'Spanning 25 acres with 80% open podium green lawns, grand entrance gate, resort-style swimming pool, and active resident welfare association.',
      hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16B4',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6010,
      lng: 77.4450,
      total_towers: 18,
      total_units: 1900,
      land_area_acres: 25.0,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'SKAT Architects',
      floors: 'G + 20',
      launch_date: '2012-04-01T00:00:00.000Z',
      possession_date: '2019-06-30T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.65,
      price_range_label: '₹65 Lakh - ₹1.25 Cr',
      walkability_score: 95,
      marketing_claims: ['1,900-Unit Delivered Premium Society in Sector 16B', '80% Open Green Podium & Resort Pool', '100% OC Ready Resale Inventory'],
      ai_search_keywords: ['nirala estate phase 1', 'nirala estate sector 16b', 'flats in nirala estate'],
      builder: {
        name: 'Nirala World',
        slug: 'nirala-world',
        tagline: 'Building Trust, Delivering Excellence',
        company_overview: 'Nirala World is a reputable real estate developer in Greater Noida West known for timely delivery and solid construction quality.',
        logo_url: 'https://ui-avatars.com/api/?name=Nirala+World&background=0D8ABC&color=fff',
        experience_years: '20+ Years',
        projects_delivered_count: 12,
        total_projects_count: 18,
        delivery_score: 92,
        construction_quality_score: 94,
        buyer_satisfaction_score: 92,
        rera_compliance_score: 96
      },
      unit_types: [
        { name: '2 BHK Luxury', bhk: 2, super_area_sqft: 955, carpet_area_sqft: 595, balcony_area_sqft: 100, balconies: 2, bathrooms: 2, price_min_cr: 0.65, price_max_cr: 0.72, price_per_sqft: 6800 },
        { name: '3 BHK Grand', bhk: 3, super_area_sqft: 1470, carpet_area_sqft: 920, balcony_area_sqft: 150, balconies: 3, bathrooms: 3, price_min_cr: 1.05, price_max_cr: 1.25, price_per_sqft: 7140 }
      ],
      cost_sheet: { base_price_per_sqft: 7000, parking_cost: 350000, ifms: 45, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 5800, total_price_cr: 0.53, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6200, total_price_cr: 0.57, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6600, total_price_cr: 0.61, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 7000, total_price_cr: 0.65, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    }
  ],

  // SECTOR 120 & 121 CENTRAL NOIDA (HIGH DENSITY DELIVERED RESIDENTIAL CLUSTER)
  'propfyndr_sector120_noida_master_data.json': [
    {
      name: 'Amrapali Zodiac',
      slug: 'amrapali-zodiac-sector-120-noida',
      sector: 'Sector 120',
      city: 'Noida',
      address: 'GH-01, Sector 120, Central Noida, UP 201301',
      tagline: '2,200-Unit Landmark Residential Township in Sector 120',
      description: 'Amrapali Zodiac is a delivered 2,200-unit residential society across 22 high-rise towers in Sector 120, Central Noida.',
      long_description: 'Spanning 22 acres along Central Noida 60m sector road, featuring 80% open landscaped green lawns, commercial market, sports facilities, and 5-minute drive to Sector 62 IT Hub.',
      hero_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ1201',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.5860,
      lng: 77.3820,
      total_towers: 22,
      total_units: 2200,
      land_area_acres: 22.0,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'Consort Consultants',
      floors: 'G + 22',
      launch_date: '2008-05-01T00:00:00.000Z',
      possession_date: '2016-09-30T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.75,
      price_range_label: '₹75 Lakh - ₹1.55 Cr',
      walkability_score: 95,
      marketing_claims: ['2,200-Unit Delivered Landmark Society in Central Noida', 'NBCC Completed with Full OC Registry', '80% Open Green Podium & High-Street Market'],
      ai_search_keywords: ['amrapali zodiac sector 120', 'zodiac noida sector 120', 'flats in sector 120 noida'],
      builder: {
        name: 'NBCC / Amrapali Group',
        slug: 'amrapali-group',
        tagline: 'Building Homes for Tomorrow',
        company_overview: 'Amrapali Group developments were completed and handed over under the direct supervision of NBCC India and Supreme Court of India.',
        logo_url: 'https://ui-avatars.com/api/?name=Amrapali+Group&background=0D8ABC&color=fff',
        experience_years: '25+ Years',
        projects_delivered_count: 40,
        total_projects_count: 50,
        delivery_score: 85,
        construction_quality_score: 88,
        buyer_satisfaction_score: 85,
        rera_compliance_score: 95
      },
      unit_types: [
        { name: '2 BHK Standard', bhk: 2, super_area_sqft: 950, carpet_area_sqft: 590, balcony_area_sqft: 95, balconies: 2, bathrooms: 2, price_min_cr: 0.75, price_max_cr: 0.85, price_per_sqft: 7890 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1425, carpet_area_sqft: 890, balcony_area_sqft: 145, balconies: 3, bathrooms: 3, price_min_cr: 1.15, price_max_cr: 1.35, price_per_sqft: 8070 }
      ],
      cost_sheet: { base_price_per_sqft: 8000, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 6700, total_price_cr: 0.63, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 7100, total_price_cr: 0.67, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 7550, total_price_cr: 0.71, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 8000, total_price_cr: 0.75, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    }
  ],

  'propfyndr_sector121_noida_master_data.json': [
    {
      name: 'Cleo County',
      slug: 'cleo-county-sector-121-noida',
      sector: 'Sector 121',
      city: 'Noida',
      address: 'GH-01, Sector 121, Central Noida, UP 201307',
      tagline: '2,600-Unit Ultra-Luxury Egyptian Theme Landmark in Sector 121',
      description: 'Cleo County is a delivered 2,600-unit ultra-luxury residential township across 24 high-rise towers in Sector 121, Central Noida.',
      long_description: 'Spanning 25 acres of Egyptian architectural theme with India’s first indoor temperature-controlled swimming pool, 5-star resident club, cascades, tennis courts, and walking distance to FNG Expressway.',
      hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ1211',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.5900,
      lng: 77.3880,
      total_towers: 24,
      total_units: 2600,
      land_area_acres: 25.0,
      open_space_pct: 82,
      green_rating: 'IGBC Gold Certified',
      architect: 'Design Forum International',
      floors: 'G + 28',
      launch_date: '2012-06-01T00:00:00.000Z',
      possession_date: '2019-12-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 1.45,
      price_range_label: '₹1.45 Cr - ₹3.10 Cr',
      walkability_score: 97,
      marketing_claims: ['Egyptian Architectural Theme & 5-Star Resort Amenities', 'India’s 1st Indoor Temperature-Controlled Pool in Society', '100% OC Ready Resale Inventory'],
      ai_search_keywords: ['cleo county sector 121', 'cleo county noida', 'flats in cleo county noida'],
      builder: {
        name: 'ABA Corp',
        slug: 'aba-corp',
        tagline: 'Creating Landmark Spaces',
        company_overview: 'ABA Corp is a premier luxury real estate developer renowned for thematic mega-projects like Cleo County, Orange County, and Cherry County.',
        logo_url: 'https://ui-avatars.com/api/?name=ABA+Corp&background=0D8ABC&color=fff',
        experience_years: '25+ Years',
        projects_delivered_count: 15,
        total_projects_count: 20,
        delivery_score: 96,
        construction_quality_score: 98,
        buyer_satisfaction_score: 96,
        rera_compliance_score: 98
      },
      unit_types: [
        { name: '3 BHK Classic', bhk: 3, super_area_sqft: 1350, carpet_area_sqft: 845, balcony_area_sqft: 135, balconies: 3, bathrooms: 3, price_min_cr: 1.45, price_max_cr: 1.62, price_per_sqft: 10740 },
        { name: '3 BHK Grand', bhk: 3, super_area_sqft: 1820, carpet_area_sqft: 1140, balcony_area_sqft: 180, balconies: 3, bathrooms: 3, price_min_cr: 1.95, price_max_cr: 2.15, price_per_sqft: 10710 },
        { name: '4 BHK Luxury Suite', bhk: 4, super_area_sqft: 2448, carpet_area_sqft: 1530, balcony_area_sqft: 240, balconies: 4, bathrooms: 4, price_min_cr: 2.70, price_max_cr: 3.10, price_per_sqft: 11020 }
      ],
      cost_sheet: { base_price_per_sqft: 10800, parking_cost: 500000, ifms: 80, club_membership: 250000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 9100, total_price_cr: 1.22, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 9650, total_price_cr: 1.30, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 10200, total_price_cr: 1.37, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 10800, total_price_cr: 1.45, recorded_at: '2025-12-31T00:00:00.000Z' }
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

// 20 Amenities Generator
function generate20Amenities() {
  return [
    { category: 'sports', name: 'Swimming Pool & Splash Pool' },
    { category: 'sports', name: 'State-of-the-Art Gymnasium' },
    { category: 'sports', name: 'Badminton Court' },
    { category: 'sports', name: 'Lawn Tennis Court' },
    { category: 'sports', name: 'Half Basketball Court' },
    { category: 'lifestyle', name: 'Grand Resident Clubhouse' },
    { category: 'lifestyle', name: 'Billiards & Table Tennis Room' },
    { category: 'lifestyle', name: 'Multipurpose Community Hall' },
    { category: 'lifestyle', name: 'Amphitheater & Open-Air Stage' },
    { category: 'wellness', name: '80% Open Landscaped Podium' },
    { category: 'wellness', name: 'Jogging & Walking Track' },
    { category: 'wellness', name: 'Yoga & Meditation Deck' },
    { category: 'wellness', name: 'Aroma Zen Garden' },
    { category: 'kids', name: 'Dedicated Children Play Zone' },
    { category: 'kids', name: 'Creche & Daycare Facility' },
    { category: 'security', name: '3-Tier 24x7 HD CCTV Surveillance' },
    { category: 'security', name: '100% DG Power Backup' },
    { category: 'security', name: 'Intercom & Video Door Phone' },
    { category: 'parking', name: 'Covered Multi-Level Basement Parking' },
    { category: 'parking', name: 'EV Vehicle Fast Charging Station' }
  ];
}

// 10 Connectivity Nodes
function generate10Connectivity(sector: string) {
  return [
    { type: 'metro', name: `${sector} / Nearest Aqua Line Metro Hub`, distance_km: 0.8, travel_time_min: 2 },
    { type: 'expressway', name: 'Noida-Greater Noida Expressway Corridor', distance_km: 1.2, travel_time_min: 3 },
    { type: 'expressway', name: 'FNG Expressway Junction Interchange', distance_km: 2.8, travel_time_min: 5 },
    { type: 'hospital', name: 'Yashoda Super Specialty / Jaypee Hospital', distance_km: 1.8, travel_time_min: 4 },
    { type: 'school', name: 'DPS / Genesis Global / Shiv Nadar School', distance_km: 0.7, travel_time_min: 2 },
    { type: 'mall', name: 'Starling Mall / Mall of India Hub', distance_km: 1.5, travel_time_min: 4 },
    { type: 'airport', name: 'Noida International Airport (Jewar)', distance_km: 35.0, travel_time_min: 32 },
    { type: 'airport', name: 'IGIA Delhi Airport', distance_km: 38.0, travel_time_min: 42 },
    { type: 'it_park', name: 'Advant Navis / Sector 142 Tech Corridor', distance_km: 2.5, travel_time_min: 5 },
    { type: 'commercial', name: 'Sector 18 Commercial Market', distance_km: 11.0, travel_time_min: 15 }
  ];
}

// 16 Full Relation Generators
function generateFullProjectRelations(p: any) {
  return {
    spec_items: [
      { category: 'structure', label: 'Structure Type', value: 'Earthquake Resistant Mivan RCC Shear Wall Construction (Zone IV)', brand: 'Mivan Tech / Tata Steel', tier: 'premium', is_highlight: true, sort_order: 1 },
      { category: 'flooring', label: 'Living & Dining', value: 'Imported Glazed Vitrified Tiles (800x800mm)', brand: 'Kajaria / Somany', tier: 'premium', is_highlight: true, sort_order: 2 },
      { category: 'flooring', label: 'Master Bedroom', value: 'Laminated Engineered Wooden Flooring with Skirting', brand: 'Pergo / Action TESA', tier: 'premium', is_highlight: false, sort_order: 3 },
      { category: 'kitchen', label: 'Countertop & Sink', value: 'Polished Granite Slab with Stainless Steel Sink & Piped Gas Provision', brand: 'Franke / Carysil', tier: 'premium', is_highlight: false, sort_order: 4 },
      { category: 'bathrooms', label: 'Sanitary Fixtures', value: 'Wall-Hung EWC with Concealed Dual-Flush Cistern & Chrome Fittings', brand: 'Kohler / Jaquar', tier: 'luxury', is_highlight: true, sort_order: 5 },
      { category: 'doors_windows', label: 'Doors & Windows', value: '8ft High Teak Wood Main Door & UPVC Double-Glazed Windows', brand: 'Fenesta / Godrej', tier: 'premium', is_highlight: false, sort_order: 6 },
      { category: 'electrical', label: 'Switches & Wiring', value: 'Concealed FRLS Copper Wiring with Modular Switches & 100% Power Backup', brand: 'Havells / Schneider', tier: 'premium', is_highlight: false, sort_order: 7 },
      { category: 'painting', label: 'Internal Wall Paint', value: 'Smooth Acrylic Emulsion Paint with POP Punning Finish', brand: 'Asian Paints / Berger', tier: 'premium', is_highlight: false, sort_order: 8 },
      { category: 'plumbing', label: 'Water Supply Piping', value: 'CPVC & UPVC Concealed Piping for Hot & Cold Water Lines', brand: 'Supreme / Astral', tier: 'premium', is_highlight: false, sort_order: 9 },
      { category: 'security', label: 'Safety & Automation', value: 'Video Door Phone with Biometric Main Door Lock Access', brand: 'Godrej / Yale', tier: 'luxury', is_highlight: true, sort_order: 10 }
    ],

    amenities: generate20Amenities(),
    connectivity: generate10Connectivity(p.sector),

    persona_profile: {
      primary_persona: 'Tech Professionals & Growing NCR Families',
      secondary_personas: ['Senior Working Professionals', 'NCR Buyers Seeking Upgrades'],
      family_stage: 'Nuclear Family with School-Going Children',
      income_range: '₹25L - ₹80L Annual Household Income',
      work_location: 'Noida Expressway / Central Noida / Tech Zone',
      timeline_horizon: 'Immediate end-use family occupancy',
      risk_appetite: 'Low risk — delivered development with OC',
      motivation_note: 'Seeking high usable space, low commute times, and gated security.'
    },

    recommendation_profile: {
      status: 'PUBLISHED',
      tier: 'STRONG_BUY',
      primary_thesis: `${p.name} is a high-performing residential society offering excellent construction quality, complete RERA clearance, and 80%+ open green spaces.`,
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
      builder_score: 95,
      price_score: 94,
      location_score: 96,
      legal_score: 98,
      amenity_score: 95,
      possession_score: 97,
      overall_score: 96
    },

    construction_milestones: [
      { name: 'Land Acquisition & RERA Approval', stage_code: 'RERA_APPROVAL', date_label: 'Completed 2011', status: 'completed', completion_pct: 100 },
      { name: 'Excavation & Foundation Complete', stage_code: 'FOUNDATION', date_label: 'Completed 2012', status: 'completed', completion_pct: 100 },
      { name: 'Superstructure RCC Frame Complete', stage_code: 'SUPERSTRUCTURE', date_label: 'Completed 2014', status: 'completed', completion_pct: 100 },
      { name: 'Brickwork & External Plaster', stage_code: 'BRICKWORK', date_label: 'Completed 2015', status: 'completed', completion_pct: 100 },
      { name: 'Finishing & Lift Installation', stage_code: 'FINISHING', date_label: 'Completed 2016', status: 'completed', completion_pct: 100 },
      { name: 'OC Handover & Society Delivery', stage_code: 'HANDOVER', date_label: 'Completed 2017', status: 'completed', completion_pct: 100 }
    ],

    construction_updates: [
      { title: 'Full Society Maintenance Handover', description: 'Active RWA team managing security, clubhouse, and green podiums.', date: '2024-01-15T00:00:00.000Z' },
      { title: 'Podium Garden Refurbishment Complete', description: 'Upgraded landscaping, zen garden, and children play equipment.', date: '2024-08-20T00:00:00.000Z' },
      { title: 'Clubhouse Gymnasium Upgrade', description: 'Installed new commercial grade cardio and strength equipment.', date: '2025-01-10T00:00:00.000Z' }
    ],

    lifecycle_updates: [
      { title: 'EV Fast Charging Station Installed', update_type: 'rwa_event', summary: 'Dual EV fast chargers deployed inside basement parking area.', published_at: '2025-02-10T00:00:00.000Z' },
      { title: 'Solar Street Lighting System Activated', update_type: 'infrastructure_update', summary: '100% solar lighting operational across all perimeter roads.', published_at: '2025-05-15T00:00:00.000Z' },
      { title: '3-Tier RFID Boom Barriers Upgraded', update_type: 'security_upgrade', summary: 'Automated RFID entry barriers installed for resident vehicles.', published_at: '2025-09-01T00:00:00.000Z' }
    ],

    images: [
      { type: 'hero', url: p.hero_image_url, caption: 'Architectural Elevation View', sort_order: 1 },
      { type: 'interior', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', caption: 'Spacious Living Room', sort_order: 2 },
      { type: 'interior', url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80', caption: 'Master Bedroom Suite', sort_order: 3 },
      { type: 'interior', url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80', caption: 'Landscaped Central Park Podium', sort_order: 4 },
      { type: 'amenity', url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1200&q=80', caption: 'Resident Swimming Pool', sort_order: 5 },
      { type: 'amenity', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80', caption: 'Modern Resident Gymnasium', sort_order: 6 }
    ],

    competitors: [
      {
        competitor_name: `${p.sector} Micro-Market Benchmark Society`,
        price_per_sqft: Math.round(p.cost_sheet.base_price_per_sqft * 1.05),
        possession_status: 'ready_to_move'
      },
      {
        competitor_name: `${p.sector} Secondary Ready Enclave`,
        price_per_sqft: Math.round(p.cost_sheet.base_price_per_sqft * 0.96),
        possession_status: 'ready_to_move'
      }
    ]
  };
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 SEEDING MEGA HOTSPOT SOCIETIES INTO DB');
  console.log('   Target Sectors: Sector 16B Gr Noida West, Sector 120/121 Central Noida');
  console.log('===============================================================\n');

  if (!fs.existsSync(masterDir)) {
    fs.mkdirSync(masterDir, { recursive: true });
  }

  let totalAdded = 0;

  for (const [filename, projectList] of Object.entries(MEGA_HOTSPOT_DATA)) {
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

      masterMap.set(p.slug, fullMasterObj);

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

      // Child relation upserts
      await prisma.unitType.deleteMany({ where: { project_id: dbProject.id } });
      for (const u of p.unit_types) {
        await prisma.unitType.create({ data: { ...u, project_id: dbProject.id } });
      }

      await prisma.costSheet.upsert({
        where: { project_id: dbProject.id },
        update: p.cost_sheet,
        create: { ...p.cost_sheet, project_id: dbProject.id },
      });

      await prisma.paymentPlan.deleteMany({ where: { project_id: dbProject.id } });
      for (const pp of p.payment_plans) {
        await prisma.paymentPlan.create({ data: { ...pp, project_id: dbProject.id } });
      }

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

      await (prisma as any).projectSpecItem.deleteMany({ where: { project_id: dbProject.id } });
      for (const sp of rels.spec_items) {
        await (prisma as any).projectSpecItem.create({ data: { ...sp, project_id: dbProject.id } });
      }

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

      await prisma.personaProfile.upsert({
        where: { project_id: dbProject.id },
        update: rels.persona_profile as any,
        create: { ...rels.persona_profile, project_id: dbProject.id } as any,
      });

      await prisma.recommendationProfile.upsert({
        where: { project_id: dbProject.id },
        update: rels.recommendation_profile as any,
        create: { ...rels.recommendation_profile, project_id: dbProject.id } as any,
      });

      await prisma.decisionProfile.upsert({
        where: { project_id: dbProject.id },
        update: rels.decision_profile as any,
        create: { ...rels.decision_profile, project_id: dbProject.id } as any,
      });

      await prisma.projectDna.upsert({
        where: { project_id: dbProject.id },
        update: rels.dna as any,
        create: { ...rels.dna, project_id: dbProject.id } as any,
      });

      await prisma.constructionMilestone.deleteMany({ where: { project_id: dbProject.id } });
      for (const cm of rels.construction_milestones) {
        await prisma.constructionMilestone.create({
          data: {
            name: cm.name,
            stage_code: cm.stage_code,
            status: cm.status as any,
            completion_pct: cm.completion_pct,
            date_label: cm.date_label,
            project_id: dbProject.id,
          },
        });
      }

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

      totalAdded++;
      console.log(`  ✓ Seeded Mega Hotspot Project: ${p.name} (${p.slug})`);
    }

    const masterArr = Array.from(masterMap.values());
    fs.writeFileSync(jsonPath, JSON.stringify(masterArr, null, 2), 'utf8');
    console.log(`  📁 Master File Updated: ${filename} -> ${masterArr.length} total projects\n`);
  }

  const finalDbCount = await prisma.project.count();
  console.log(`===============================================================`);
  console.log(`🎉 MEGA HOTSPOT EXPANSION COMPLETE!`);
  console.log(`📊 Added ${totalAdded} new landmark projects.`);
  console.log(`📈 New Total DB Project Count: ${finalDbCount}`);
  console.log(`===============================================================\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during mega hotspot seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
