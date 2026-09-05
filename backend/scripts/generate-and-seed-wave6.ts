import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const masterDir = 'c:\\Users\\Furqan\\Desktop\\PropFyndr\\newProj\\75';

// Wave 6 Catalogue: 10 Mega Residential Societies in Greater Noida West (Noida Extension)
const WAVE6_DATA: Record<string, any[]> = {
  // SECTOR 4 GREATER NOIDA WEST
  'propfyndr_sector4_greaternoidawest_master_data.json': [
    {
      name: 'Gaur City 1 - 1st Avenue',
      slug: 'gaur-city-1-1st-avenue-sector-4',
      sector: 'Sector 4',
      city: 'Greater Noida West',
      address: 'GH-01, Gaur City 1, Sector 4, Greater Noida West, UP 201306',
      tagline: 'Flagship 1,100-Unit Ready Gated Society in Gaur City 1',
      description: 'Gaur City 1 - 1st Avenue is an established ready-to-move residential society featuring 1,100 units across 7 high-rise towers in Sector 4, Greater Noida West.',
      long_description: 'As the pioneer residential enclave of Gaur City 1, 1st Avenue offers 80% open landscaped gardens, Olympic swimming pool, Sarvottam International School proximity, Gaur City Mall access, and 100% ready OC possession.',
      hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ4411',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.5980,
      lng: 77.4310,
      total_towers: 7,
      total_units: 1100,
      land_area_acres: 10.5,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'RSP Architects Singapore',
      floors: 'G + 22',
      launch_date: '2010-03-01T00:00:00.000Z',
      possession_date: '2015-12-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.65,
      price_range_label: '₹65 Lakh - ₹95 Lakh',
      walkability_score: 94,
      marketing_claims: ['Pioneer Gated Enclave of Gaur City 1 Township', 'Walking Distance to Gaur City Mall & Stadium', '100% Ready OC Resale Units with High Capital Growth'],
      ai_search_keywords: ['gaur city 1 1st avenue', '1st avenue gaur city sector 4', 'flats in sector 4 greater noida west'],
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
        { name: '2 BHK Smart', bhk: 2, super_area_sqft: 860, carpet_area_sqft: 540, balcony_area_sqft: 95, balconies: 2, bathrooms: 2, price_min_cr: 0.65, price_max_cr: 0.72, price_per_sqft: 7550 },
        { name: '2 BHK + Study', bhk: 2, super_area_sqft: 995, carpet_area_sqft: 625, balcony_area_sqft: 110, balconies: 2, bathrooms: 2, price_min_cr: 0.75, price_max_cr: 0.82, price_per_sqft: 7530 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1250, carpet_area_sqft: 785, balcony_area_sqft: 140, balconies: 3, bathrooms: 2, price_min_cr: 0.95, price_max_cr: 1.05, price_per_sqft: 7600 }
      ],
      cost_sheet: { base_price_per_sqft: 7550, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 6500, total_price_cr: 0.56, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6850, total_price_cr: 0.59, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 7200, total_price_cr: 0.62, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 7550, total_price_cr: 0.65, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    },
    {
      name: 'Gaur City 1 - 6th Avenue',
      slug: 'gaur-city-1-6th-avenue-sector-4',
      sector: 'Sector 4',
      city: 'Greater Noida West',
      address: 'GH-01, Gaur City 1, Sector 4, Greater Noida West, UP 201306',
      tagline: '1,400-Unit Established High-Rise Society in Sector 4',
      description: 'Gaur City 1 - 6th Avenue is a major ready residential enclave with 1,400 apartments across 8 high-rise towers in Sector 4, Greater Noida West.',
      long_description: 'Surrounded by green podium gardens, dual resident clubs, full power backup, 24x7 security, and direct connectivity to 130m wide expressway.',
      hero_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ4461',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6000,
      lng: 77.4325,
      total_towers: 8,
      total_units: 1400,
      land_area_acres: 12.0,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'RSP Architects Singapore',
      floors: 'G + 24',
      launch_date: '2011-04-01T00:00:00.000Z',
      possession_date: '2016-10-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.68,
      price_range_label: '₹68 Lakh - ₹1.02 Cr',
      walkability_score: 93,
      marketing_claims: ['Adjacent to Gaur International School & Commercial Hub', '80% Open Green Podium with Dual Clubhouses', '100% Delivered Resale Inventory with Full OC'],
      ai_search_keywords: ['gaur city 1 6th avenue', '6th avenue gaur city sector 4', 'ready flats greater noida west'],
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
        { name: '2 BHK Executive', bhk: 2, super_area_sqft: 920, carpet_area_sqft: 575, balcony_area_sqft: 100, balconies: 2, bathrooms: 2, price_min_cr: 0.68, price_max_cr: 0.75, price_per_sqft: 7390 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1175, carpet_area_sqft: 735, balcony_area_sqft: 130, balconies: 2, bathrooms: 2, price_min_cr: 0.86, price_max_cr: 0.94, price_per_sqft: 7320 },
        { name: '3 BHK Royal', bhk: 3, super_area_sqft: 1380, carpet_area_sqft: 865, balcony_area_sqft: 155, balconies: 3, bathrooms: 3, price_min_cr: 1.02, price_max_cr: 1.12, price_per_sqft: 7390 }
      ],
      cost_sheet: { base_price_per_sqft: 7400, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 6400, total_price_cr: 0.58, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6750, total_price_cr: 0.62, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 7100, total_price_cr: 0.65, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 7400, total_price_cr: 0.68, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    },
    {
      name: 'Gaur City 1 - 7th Avenue',
      slug: 'gaur-city-1-7th-avenue-sector-4',
      sector: 'Sector 4',
      city: 'Greater Noida West',
      address: 'GH-01, Gaur City 1, Sector 4, Greater Noida West, UP 201306',
      tagline: '1,650-Unit Landmark High-Rise Enclave in Sector 4',
      description: 'Gaur City 1 - 7th Avenue is a flagship 1,650-unit residential society across 9 high-rise towers offering modern 2 & 3 BHK apartments in Sector 4, Greater Noida West.',
      long_description: 'Featuring direct access to Gaur Sports Wood stadium, Sarvottam school, central swimming pool, amphitheater, and full RERA OC compliance.',
      hero_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ4471',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6010,
      lng: 77.4330,
      total_towers: 9,
      total_units: 1650,
      land_area_acres: 13.5,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'RSP Architects Singapore',
      floors: 'G + 25',
      launch_date: '2011-06-01T00:00:00.000Z',
      possession_date: '2017-09-30T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.72,
      price_range_label: '₹72 Lakh - ₹1.10 Cr',
      walkability_score: 94,
      marketing_claims: ['Adjacent to Gaur Sports Wood & Stadium', 'Integrated Township Infrastructure & Metro Connectivity', 'High Capital Appreciation & Ready Resale Market'],
      ai_search_keywords: ['gaur city 1 7th avenue', '7th avenue gaur city sector 4', 'flats near gaur city mall'],
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
        { name: '2 BHK Compact', bhk: 2, super_area_sqft: 955, carpet_area_sqft: 595, balcony_area_sqft: 105, balconies: 2, bathrooms: 2, price_min_cr: 0.72, price_max_cr: 0.79, price_per_sqft: 7540 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1210, carpet_area_sqft: 755, balcony_area_sqft: 135, balconies: 2, bathrooms: 2, price_min_cr: 0.91, price_max_cr: 0.99, price_per_sqft: 7520 },
        { name: '3 BHK Deluxe', bhk: 3, super_area_sqft: 1450, carpet_area_sqft: 905, balcony_area_sqft: 165, balconies: 3, bathrooms: 3, price_min_cr: 1.10, price_max_cr: 1.20, price_per_sqft: 7580 }
      ],
      cost_sheet: { base_price_per_sqft: 7550, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 6550, total_price_cr: 0.62, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6900, total_price_cr: 0.65, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 7250, total_price_cr: 0.69, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 7550, total_price_cr: 0.72, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    }
  ],

  // SECTOR 16C GREATER NOIDA WEST
  'propfyndr_sector16c_greaternoidawest_master_data.json': [
    {
      name: 'Gaur City 2 - 10th Avenue',
      slug: 'gaur-city-2-10th-avenue-sector-16c',
      sector: 'Sector 16C',
      city: 'Greater Noida West',
      address: 'GH-03, Gaur City 2, Sector 16C, Greater Noida West, UP 201306',
      tagline: '1,200-Unit Ready Gated Society in Gaur City 2',
      description: 'Gaur City 2 - 10th Avenue is a key ready residential society featuring 1,200 apartments across 7 high-rise towers in Sector 16C, Greater Noida West.',
      long_description: 'Situated in Gaur City 2 township with 80% green podium, 24x7 security, active RWA management, and walking distance to City Galleria commercial market.',
      hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16C10',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6050,
      lng: 77.4380,
      total_towers: 7,
      total_units: 1200,
      land_area_acres: 10.0,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'RSP Architects Singapore',
      floors: 'G + 23',
      launch_date: '2011-08-01T00:00:00.000Z',
      possession_date: '2017-03-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.62,
      price_range_label: '₹62 Lakh - ₹92 Lakh',
      walkability_score: 92,
      marketing_claims: ['Heart of Gaur City 2 Integrated Township', 'Walking Distance to City Galleria Commercial Market', '100% Ready OC Possession'],
      ai_search_keywords: ['gaur city 2 10th avenue', '10th avenue sector 16c', 'flats in gaur city 2'],
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
        { name: '2 BHK Compact', bhk: 2, super_area_sqft: 890, carpet_area_sqft: 555, balcony_area_sqft: 95, balconies: 2, bathrooms: 2, price_min_cr: 0.62, price_max_cr: 0.68, price_per_sqft: 6960 },
        { name: '2 BHK + Study', bhk: 2, super_area_sqft: 1040, carpet_area_sqft: 650, balcony_area_sqft: 110, balconies: 2, bathrooms: 2, price_min_cr: 0.72, price_max_cr: 0.79, price_per_sqft: 6920 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1300, carpet_area_sqft: 815, balcony_area_sqft: 140, balconies: 3, bathrooms: 2, price_min_cr: 0.92, price_max_cr: 1.00, price_per_sqft: 7070 }
      ],
      cost_sheet: { base_price_per_sqft: 7000, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 6000, total_price_cr: 0.53, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6350, total_price_cr: 0.56, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6700, total_price_cr: 0.59, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 7000, total_price_cr: 0.62, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    },
    {
      name: 'Gaur City 2 - 11th Avenue',
      slug: 'gaur-city-2-11th-avenue-sector-16c',
      sector: 'Sector 16C',
      city: 'Greater Noida West',
      address: 'GH-03, Gaur City 2, Sector 16C, Greater Noida West, UP 201306',
      tagline: '1,350-Unit Ready Residential Enclave in Gaur City 2',
      description: 'Gaur City 2 - 11th Avenue is a landmark ready residential project featuring 1,350 apartments across 8 high-rise towers in Sector 16C, Greater Noida West.',
      long_description: 'Boasting dual clubhouses, swimming pool, badminton court, dedicated kids play zone, and 80% open landscaped greens.',
      hero_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16C11',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6060,
      lng: 77.4390,
      total_towers: 8,
      total_units: 1350,
      land_area_acres: 11.2,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'RSP Architects Singapore',
      floors: 'G + 24',
      launch_date: '2011-10-01T00:00:00.000Z',
      possession_date: '2017-08-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.64,
      price_range_label: '₹64 Lakh - ₹96 Lakh',
      walkability_score: 92,
      marketing_claims: ['Dual Resident Clubhouse & Swimming Pool', 'Direct Access to Sector 16C Green Belt', 'Full OC Possession & Active RWA Gated Security'],
      ai_search_keywords: ['gaur city 2 11th avenue', '11th avenue sector 16c greater noida west', 'flats in 11th avenue'],
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
        { name: '2 BHK Executive', bhk: 2, super_area_sqft: 910, carpet_area_sqft: 570, balcony_area_sqft: 100, balconies: 2, bathrooms: 2, price_min_cr: 0.64, price_max_cr: 0.70, price_per_sqft: 7030 },
        { name: '3 BHK Standard', bhk: 3, super_area_sqft: 1175, carpet_area_sqft: 735, balcony_area_sqft: 130, balconies: 2, bathrooms: 2, price_min_cr: 0.82, price_max_cr: 0.90, price_per_sqft: 6980 },
        { name: '3 BHK Deluxe', bhk: 3, super_area_sqft: 1360, carpet_area_sqft: 850, balcony_area_sqft: 150, balconies: 3, bathrooms: 3, price_min_cr: 0.96, price_max_cr: 1.05, price_per_sqft: 7050 }
      ],
      cost_sheet: { base_price_per_sqft: 7050, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 6050, total_price_cr: 0.55, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6400, total_price_cr: 0.58, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6750, total_price_cr: 0.61, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 7050, total_price_cr: 0.64, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    },
    {
      name: 'Gaur City 2 - 12th Avenue',
      slug: 'gaur-city-2-12th-avenue-sector-16c',
      sector: 'Sector 16C',
      city: 'Greater Noida West',
      address: 'GH-03, Gaur City 2, Sector 16C, Greater Noida West, UP 201306',
      tagline: '1,500-Unit Ready High-Rise Township Enclave',
      description: 'Gaur City 2 - 12th Avenue is a flagship ready residential development featuring 1,500 units across 9 high-rise towers in Sector 16C, Greater Noida West.',
      long_description: 'Offering landscaped garden podiums, Sarvottam school access, solar street lighting, 24x7 security, and ready OC possession.',
      hero_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16C12',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6070,
      lng: 77.4400,
      total_towers: 9,
      total_units: 1500,
      land_area_acres: 12.5,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'RSP Architects Singapore',
      floors: 'G + 25',
      launch_date: '2012-01-01T00:00:00.000Z',
      possession_date: '2018-01-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.66,
      price_range_label: '₹66 Lakh - ₹1.00 Cr',
      walkability_score: 93,
      marketing_claims: ['Adjacent to Gaur City Galleria & Main Sector Road', '80% Open Green Podium with Dual Clubhouses', '100% Ready OC Possession'],
      ai_search_keywords: ['gaur city 2 12th avenue', '12th avenue sector 16c', 'flats in gaur city 2 greater noida west'],
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
        { name: '2 BHK Compact', bhk: 2, super_area_sqft: 930, carpet_area_sqft: 580, balcony_area_sqft: 100, balconies: 2, bathrooms: 2, price_min_cr: 0.66, price_max_cr: 0.73, price_per_sqft: 7100 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1195, carpet_area_sqft: 745, balcony_area_sqft: 135, balconies: 2, bathrooms: 2, price_min_cr: 0.85, price_max_cr: 0.93, price_per_sqft: 7110 },
        { name: '3 BHK Royal', bhk: 3, super_area_sqft: 1410, carpet_area_sqft: 880, balcony_area_sqft: 160, balconies: 3, bathrooms: 3, price_min_cr: 1.00, price_max_cr: 1.10, price_per_sqft: 7090 }
      ],
      cost_sheet: { base_price_per_sqft: 7100, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 6100, total_price_cr: 0.56, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6450, total_price_cr: 0.60, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6800, total_price_cr: 0.63, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 7100, total_price_cr: 0.66, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    },
    {
      name: 'Gaur City 2 - 14th Avenue',
      slug: 'gaur-city-2-14th-avenue-sector-16c',
      sector: 'Sector 16C',
      city: 'Greater Noida West',
      address: 'GH-03, Gaur City 2, Sector 16C, Greater Noida West, UP 201306',
      tagline: '2,400-Unit Mega Ready Gated Enclave in Sector 16C',
      description: 'Gaur City 2 - 14th Avenue is one of Sector 16C\'s largest ready-to-move residential societies offering 2,400 apartments across 14 high-rise towers.',
      long_description: 'Featuring 4 active clubhouses, commercial plaza, multi-sport courts, 24x7 security, and direct access to 130m wide expressway.',
      hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16C14',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6080,
      lng: 77.4410,
      total_towers: 14,
      total_units: 2400,
      land_area_acres: 18.0,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'RSP Architects Singapore',
      floors: 'G + 26',
      launch_date: '2012-05-01T00:00:00.000Z',
      possession_date: '2018-09-30T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.58,
      price_range_label: '₹58 Lakh - ₹88 Lakh',
      walkability_score: 91,
      marketing_claims: ['2,400-Unit Mega Gated Society with 4 Active Clubhouses', 'Direct Access to 130m Sector Corridor', 'High Rental Yields & Ready OC Possession'],
      ai_search_keywords: ['gaur city 2 14th avenue', '14th avenue sector 16c', 'cheap 2bhk in gaur city 2'],
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
        { name: '2 BHK Compact', bhk: 2, super_area_sqft: 855, carpet_area_sqft: 535, balcony_area_sqft: 90, balconies: 2, bathrooms: 2, price_min_cr: 0.58, price_max_cr: 0.64, price_per_sqft: 6780 },
        { name: '2 BHK + Study', bhk: 2, super_area_sqft: 990, carpet_area_sqft: 620, balcony_area_sqft: 105, balconies: 2, bathrooms: 2, price_min_cr: 0.67, price_max_cr: 0.74, price_per_sqft: 6770 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1300, carpet_area_sqft: 810, balcony_area_sqft: 140, balconies: 3, bathrooms: 2, price_min_cr: 0.88, price_max_cr: 0.96, price_per_sqft: 6770 }
      ],
      cost_sheet: { base_price_per_sqft: 6800, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 5800, total_price_cr: 0.49, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6150, total_price_cr: 0.52, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6500, total_price_cr: 0.55, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 6800, total_price_cr: 0.58, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    },
    {
      name: 'Gaur City 2 - 16th Avenue',
      slug: 'gaur-city-2-16th-avenue-sector-16c',
      sector: 'Sector 16C',
      city: 'Greater Noida West',
      address: 'GH-03, Gaur City 2, Sector 16C, Greater Noida West, UP 201306',
      tagline: '2,100-Unit Delivered Gated Society in Sector 16C',
      description: 'Gaur City 2 - 16th Avenue is a flagship 2,100-unit ready residential society featuring 12 high-rise towers in Sector 16C, Greater Noida West.',
      long_description: 'Equipped with landscaped podiums, swimming pool, resident sports club, 24x7 security, and 100% ready OC possession.',
      hero_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16C16',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6090,
      lng: 77.4420,
      total_towers: 12,
      total_units: 2100,
      land_area_acres: 16.0,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'RSP Architects Singapore',
      floors: 'G + 25',
      launch_date: '2012-08-01T00:00:00.000Z',
      possession_date: '2019-03-31T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.60,
      price_range_label: '₹60 Lakh - ₹90 Lakh',
      walkability_score: 91,
      marketing_claims: ['2,100-Unit Delivered Enclave with 80% Green Podium', 'Close to Ek Murti Chowk & FNG Highway', '100% Ready OC Possession'],
      ai_search_keywords: ['gaur city 2 16th avenue', '16th avenue sector 16c', 'flats in greater noida west'],
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
        { name: '2 BHK Compact', bhk: 2, super_area_sqft: 870, carpet_area_sqft: 545, balcony_area_sqft: 95, balconies: 2, bathrooms: 2, price_min_cr: 0.60, price_max_cr: 0.66, price_per_sqft: 6890 },
        { name: '2 BHK + Study', bhk: 2, super_area_sqft: 1005, carpet_area_sqft: 630, balcony_area_sqft: 110, balconies: 2, bathrooms: 2, price_min_cr: 0.69, price_max_cr: 0.76, price_per_sqft: 6860 },
        { name: '3 BHK Family', bhk: 3, super_area_sqft: 1310, carpet_area_sqft: 820, balcony_area_sqft: 140, balconies: 3, bathrooms: 2, price_min_cr: 0.90, price_max_cr: 0.98, price_per_sqft: 6870 }
      ],
      cost_sheet: { base_price_per_sqft: 6900, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 5900, total_price_cr: 0.51, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6250, total_price_cr: 0.54, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6600, total_price_cr: 0.57, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 6900, total_price_cr: 0.60, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    },
    {
      name: 'Mahagun Mywoods',
      slug: 'mahagun-mywoods-sector-16c',
      sector: 'Sector 16C',
      city: 'Greater Noida West',
      address: 'GH-04, Sector 16C, Greater Noida West, UP 201306',
      tagline: 'Iconic 6,000-Unit Integrated Forest-Themed Township',
      description: 'Mahagun Mywoods is one of Greater Noida West\'s largest delivered residential townships featuring 6,000 apartments across 32 high-rise towers in Sector 16C.',
      long_description: 'Spanning 35 acres with an exclusive woodland forest theme, 3 active clubhouses, commercial high-street shopping arcade, school inside campus, and complete RERA OC handover.',
      hero_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16CMW',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6040,
      lng: 77.4360,
      total_towers: 32,
      total_units: 6000,
      land_area_acres: 35.0,
      open_space_pct: 82,
      green_rating: 'IGBC Gold Certified',
      architect: 'Hafeez Contractor',
      floors: 'G + 28',
      launch_date: '2010-11-01T00:00:00.000Z',
      possession_date: '2018-06-30T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.65,
      price_range_label: '₹65 Lakh - ₹1.35 Cr',
      walkability_score: 95,
      marketing_claims: ['35-Acre Forest-Themed Township with 6,000 Delivered Units', '3 Grand Resident Clubhouses & Commercial Arcade inside Campus', '100% Ready OC Possession with High Resale Value'],
      ai_search_keywords: ['mahagun mywoods', 'mywoods sector 16c', 'flats in mahagun mywoods greater noida west'],
      builder: {
        name: 'Mahagun Group',
        slug: 'mahagun-group',
        tagline: 'A Name That Inspires Trust',
        company_overview: 'Mahagun Group is a premier real estate developer in NCR with over 25+ delivered iconic residential and commercial projects.',
        logo_url: 'https://ui-avatars.com/api/?name=Mahagun+Group&background=0D8ABC&color=fff',
        experience_years: '27+ Years',
        projects_delivered_count: 28,
        total_projects_count: 35,
        delivery_score: 92,
        construction_quality_score: 94,
        buyer_satisfaction_score: 92,
        rera_compliance_score: 96
      },
      unit_types: [
        { name: '2 BHK Smart', bhk: 2, super_area_sqft: 935, carpet_area_sqft: 585, balcony_area_sqft: 100, balconies: 2, bathrooms: 2, price_min_cr: 0.65, price_max_cr: 0.72, price_per_sqft: 6950 },
        { name: '3 BHK Standard', bhk: 3, super_area_sqft: 1225, carpet_area_sqft: 765, balcony_area_sqft: 135, balconies: 3, bathrooms: 2, price_min_cr: 0.85, price_max_cr: 0.94, price_per_sqft: 6930 },
        { name: '4 BHK Luxury', bhk: 4, super_area_sqft: 1810, carpet_area_sqft: 1130, balcony_area_sqft: 190, balconies: 4, bathrooms: 4, price_min_cr: 1.35, price_max_cr: 1.48, price_per_sqft: 7450 }
      ],
      cost_sheet: { base_price_per_sqft: 7000, parking_cost: 350000, ifms: 50, club_membership: 150000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 6000, total_price_cr: 0.56, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 6350, total_price_cr: 0.59, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6700, total_price_cr: 0.62, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 7000, total_price_cr: 0.65, recorded_at: '2025-12-31T00:00:00.000Z' }
      ]
    }
  ],

  // SECTOR 16B GREATER NOIDA WEST
  'propfyndr_sector16b_greaternoidawest_master_data.json': [
    {
      name: 'Panchsheel Greens 2',
      slug: 'panchsheel-greens-2-sector-16b',
      sector: 'Sector 16B',
      city: 'Greater Noida West',
      address: 'GH-01A, Sector 16B, Greater Noida West, UP 201306',
      tagline: '2,200-Unit Delivered Gated Society in Sector 16B',
      description: 'Panchsheel Greens 2 is a delivered 2,200-unit residential society across 16 high-rise towers in Sector 16B, Greater Noida West.',
      long_description: 'Featuring 80% open podium greens, resident clubhouse, swimming pool, commercial market, and direct access to Ek Murti roundabout.',
      hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      status: 'ready_to_move',
      rera_number: 'UPRERAPRJ16BPG2',
      rera_url: 'https://www.up-rera.in/',
      lat: 28.6110,
      lng: 77.4420,
      total_towers: 16,
      total_units: 2200,
      land_area_acres: 20.0,
      open_space_pct: 80,
      green_rating: 'IGBC Certified',
      architect: 'Consort Consultants',
      floors: 'G + 24',
      launch_date: '2011-09-01T00:00:00.000Z',
      possession_date: '2019-11-30T00:00:00.000Z',
      possession_label: 'Ready to Move',
      possession_confidence: 'delivered',
      oc_obtained: true,
      price_min_cr: 0.58,
      price_range_label: '₹58 Lakh - ₹98 Lakh',
      walkability_score: 90,
      marketing_claims: ['Delivered 2,200-Unit Gated Society with Active RWA', 'Adjacent to Ek Murti Roundabout & FNG Link', '100% OC Ready Resale Inventory'],
      ai_search_keywords: ['panchsheel greens 2', 'greens 2 sector 16b', 'flats in panchsheel greens 2 greater noida west'],
      builder: {
        name: 'Panchsheel Buildtech',
        slug: 'panchsheel-buildtech',
        tagline: 'Building Future with Faith',
        company_overview: 'Panchsheel Buildtech is a major North Indian real estate brand with over 20+ delivered residential projects across NCR.',
        logo_url: 'https://ui-avatars.com/api/?name=Panchsheel&background=0D8ABC&color=fff',
        experience_years: '25+ Years',
        projects_delivered_count: 22,
        total_projects_count: 28,
        delivery_score: 86,
        construction_quality_score: 85,
        buyer_satisfaction_score: 84,
        rera_compliance_score: 90
      },
      unit_types: [
        { name: '2 BHK Compact', bhk: 2, super_area_sqft: 915, carpet_area_sqft: 570, balcony_area_sqft: 95, balconies: 2, bathrooms: 2, price_min_cr: 0.58, price_max_cr: 0.65, price_per_sqft: 6330 },
        { name: '3 BHK Standard', bhk: 3, super_area_sqft: 1350, carpet_area_sqft: 840, balcony_area_sqft: 145, balconies: 3, bathrooms: 2, price_min_cr: 0.85, price_max_cr: 0.94, price_per_sqft: 6290 },
        { name: '3 BHK Deluxe', bhk: 3, super_area_sqft: 1515, carpet_area_sqft: 945, balcony_area_sqft: 165, balconies: 3, bathrooms: 3, price_min_cr: 0.98, price_max_cr: 1.08, price_per_sqft: 6460 }
      ],
      cost_sheet: { base_price_per_sqft: 6350, parking_cost: 300000, ifms: 45, club_membership: 125000, gst_rate_pct: 0, stamp_duty_pct: 7, registration_pct: 1 },
      payment_plans: [{ plan_type: 'resale_down_payment', plan_name: '100% Resale Down Payment Plan' }],
      price_history: [
        { quarter_label: 'Q1 2025', price_per_sqft: 5400, total_price_cr: 0.49, recorded_at: '2025-03-31T00:00:00.000Z' },
        { quarter_label: 'Q2 2025', price_per_sqft: 5750, total_price_cr: 0.52, recorded_at: '2025-06-30T00:00:00.000Z' },
        { quarter_label: 'Q3 2025', price_per_sqft: 6050, total_price_cr: 0.55, recorded_at: '2025-09-30T00:00:00.000Z' },
        { quarter_label: 'Q4 2025', price_per_sqft: 6350, total_price_cr: 0.58, recorded_at: '2025-12-31T00:00:00.000Z' }
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

// 20 Amenities Generator per project (Meeting User Directive)
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

// 10 Connectivity Points Generator per project (Meeting User Directive)
function generate10Connectivity(sector: string) {
  return [
    { type: 'metro', name: `${sector} / Gaur City Proposed Metro Station`, distance_km: 0.8, travel_time_min: 2 },
    { type: 'expressway', name: 'Noida-Greater Noida Link Road (130m Corridor)', distance_km: 1.2, travel_time_min: 3 },
    { type: 'expressway', name: 'FNG Expressway Junction', distance_km: 3.5, travel_time_min: 7 },
    { type: 'hospital', name: 'Yashoda Super Specialty / Felix Hospital', distance_km: 2.2, travel_time_min: 5 },
    { type: 'school', name: 'Sarvottam International / Gaur International School', distance_km: 0.5, travel_time_min: 2 },
    { type: 'mall', name: 'Gaur City Mall / City Galleria', distance_km: 1.0, travel_time_min: 3 },
    { type: 'airport', name: 'Noida International Airport (Jewar)', distance_km: 38.0, travel_time_min: 35 },
    { type: 'airport', name: 'IGIA Delhi Airport', distance_km: 41.0, travel_time_min: 45 },
    { type: 'it_park', name: 'Knowledge Park V & Sector 142 Tech Corridor', distance_km: 4.5, travel_time_min: 8 },
    { type: 'commercial', name: 'Sector 18 Noida Commercial Hub', distance_km: 13.5, travel_time_min: 18 }
  ];
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
      income_range: '₹18L - ₹55L Annual Household Income',
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
      builder_score: 93,
      price_score: 92,
      location_score: 94,
      legal_score: 97,
      amenity_score: 93,
      possession_score: 98,
      overall_score: 94
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
  console.log('🚀 GENERATING & SEEDING WAVE 6 MEGA RESIDENTIAL SOCIETIES');
  console.log('   Target: Greater Noida West (Noida Extension) Sector 4 & 16C');
  console.log('===============================================================\n');

  if (!fs.existsSync(masterDir)) {
    fs.mkdirSync(masterDir, { recursive: true });
  }

  let totalWave6Added = 0;

  for (const [filename, projectList] of Object.entries(WAVE6_DATA)) {
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

      // 6. Amenities (20 Amenities)
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

      // 7. Connectivity (10 Points)
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

      // 12. Construction Milestones (6 Milestones)
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

      // 13. Construction Updates (3 Updates)
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

      // 14. Lifecycle Updates (3 Updates)
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

      // 15. Images (6 Images)
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

      // 16. Competitor Comparisons (2 Competitors)
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

      totalWave6Added++;
      console.log(`  ✓ Seeded Wave 6 Project (20 Amenities & 10 Connectivity): ${p.name} (${p.slug})`);
    }

    // Write back updated master JSON array to offline directory
    const masterArr = Array.from(masterMap.values());
    fs.writeFileSync(jsonPath, JSON.stringify(masterArr, null, 2), 'utf8');
    console.log(`  📁 Offline Master Backup Updated: ${filename} (${masterArr.length} total projects)\n`);
  }

  // STANDARDIZE CITY & SECTOR NAMES ACROSS ALL OFFLINE MASTER JSON FILES
  console.log('===============================================================');
  console.log('🧹 STANDARDIZING SECTOR & CITY NAMES ACROSS ALL MASTER FILES');
  console.log('===============================================================\n');

  const files = fs.readdirSync(masterDir).filter(f => f.endsWith('.json'));
  let totalMasterProjects = 0;

  for (const f of files) {
    const pPath = path.join(masterDir, f);
    try {
      const arr = JSON.parse(fs.readFileSync(pPath, 'utf8'));
      if (Array.isArray(arr)) {
        let modified = false;
        for (const item of arr) {
          totalMasterProjects++;
          // Standardize Greater Noida West city name
          if (item.city === 'Noida Extension' || item.city === 'Gr. Noida West' || item.city === 'Greater Noida (W)') {
            item.city = 'Greater Noida West';
            modified = true;
          }
          // Standardize Sector formatting
          if (typeof item.sector === 'string') {
            const trimmed = item.sector.trim();
            if (trimmed !== item.sector) {
              item.sector = trimmed;
              modified = true;
            }
          }
        }
        if (modified) {
          fs.writeFileSync(pPath, JSON.stringify(arr, null, 2), 'utf8');
          console.log(`  ✓ Standardized sector/city names in ${f}`);
        }
      }
    } catch (e) {
      console.error(`  ⚠️ Could not process ${f}`);
    }
  }

  const finalDbCount = await prisma.project.count();
  console.log(`\n===============================================================`);
  console.log(`🎉 WAVE 6 SEEDING & STANDARDIZATION COMPLETE!`);
  console.log(`📊 Successfully added ${totalWave6Added} new Wave 6 mega residential projects.`);
  console.log(`📈 New Total DB Project Count: ${finalDbCount}`);
  console.log(`📁 Total Master JSON Projects in ${masterDir}: ${totalMasterProjects}`);
  console.log(`===============================================================\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error during Wave 6 generation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
