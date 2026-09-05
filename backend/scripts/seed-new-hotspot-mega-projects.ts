import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newProjectsData = [
  // ── Sector 107 (Noida) Heavyweight ──
  {
    name: 'County 107',
    slug: 'county-107-sector-107',
    builder_name: 'ABA Corp',
    sector: 'Sector 107',
    city: 'Noida',

    rera_number: 'UPRERAPRJ837374',
    status: 'under_construction',
    possession_date: '2026-12-31T00:00:00.000Z',
    price_min_cr: 4.85,
    price_max_cr: 9.50,
    price_per_sqft_min: 13500,
    price_per_sqft_max: 16200,
    price_range_label: '₹4.85 Cr - ₹9.50 Cr',
    summary: 'Ultra-luxury vertical forest residential project in Sector 107 Noida with private elevated walkways and private pools.',
    description: 'County 107 by ABA Corp is an iconic ultra-luxury residential development in Sector 107 Noida. Featuring platinum LEED certified vertical forest design, private elevated walkways between towers, double-height ceilings, and private plunge pools.',
    highlights: ['Vertical Forest Architecture', 'Elevated Walkway Corridor', 'Private Plunge Pools in 5 BHK', 'Platinum LEED Green Building Certified'],
    marketing_claims: ['Noida\'s First Vertical Forest Living', 'Double Height Luxury Living Rooms', 'Zero Car Zone on Ground Level'],
    escrow_bank_name: 'HDFC Bank',
    address: 'Plot No. GH-01/A, Sector 107, Noida Expressway, UP 201304',
    latitude: 28.5412,
    longitude: 77.3715,
    hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/county-107.pdf',
    unit_types: [
      { bhk: 4, name: '4 BHK Luxury Suite', area_sqft: 3500, price_cr: 4.85, price_per_sqft: 13857, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 5, name: '5 BHK Sky Villa', area_sqft: 6500, price_cr: 9.50, price_per_sqft: 14615, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },

  // ── Sector 150 (Noida Expressway) Heavyweights ──
  {
    name: 'Mahagun Meadows',
    slug: 'mahagun-meadows-sector-150',
    builder_name: 'Mahagun Group',
    sector: 'Sector 150',
    city: 'Noida',

    rera_number: 'UPRERAPRJ1257',
    status: 'ready_to_move',
    possession_date: '2023-06-30T00:00:00.000Z',
    price_min_cr: 1.45,
    price_max_cr: 3.65,
    price_per_sqft_min: 7800,
    price_per_sqft_max: 9500,
    price_range_label: '₹1.45 Cr - ₹3.65 Cr',
    summary: 'Golf-centric high-rise township in Sector 150 Noida Sports City with pitch & putt golf course.',
    description: 'Mahagun Meadows is a flagship resort-style development spread across 7 acres in Sector 150 Noida. It features a private pitch and putt golf course, expansive green views, and multi-tier club amenities.',
    highlights: ['Private Pitch & Putt Golf Course', '80% Open & Green Landscape', 'Double Height Entrance Lobbies', 'IGBC Gold Certified'],
    marketing_claims: ['Resort Living in Sector 150', 'Overlooks Executive Golf Course', 'Ready to Move In'],
    escrow_bank_name: 'State Bank of India',
    address: 'Sector 150, Noida Expressway, UP 201310',
    latitude: 28.4215,
    longitude: 77.4812,
    hero_image_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/mahagun-meadows.pdf',
    unit_types: [
      { bhk: 2, name: '2 BHK Golf View', area_sqft: 1425, price_cr: 1.45, price_per_sqft: 10175, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 3, name: '3 BHK Premium', area_sqft: 1945, price_cr: 2.10, price_per_sqft: 10796, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Sky Golf Villa', area_sqft: 3400, price_cr: 3.65, price_per_sqft: 10735, floor_plan_url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'Samridhi Daksh Avenue',
    slug: 'samridhi-daksh-avenue-sector-150',
    builder_name: 'Samridhi Group',
    sector: 'Sector 150',
    city: 'Noida',

    rera_number: 'UPRERAPRJ168120',
    status: 'under_construction',
    possession_date: '2026-06-30T00:00:00.000Z',
    price_min_cr: 1.85,
    price_max_cr: 3.90,
    price_per_sqft_min: 9200,
    price_per_sqft_max: 11500,
    price_range_label: '₹1.85 Cr - ₹3.90 Cr',
    summary: 'High-rise luxury residential towers in Sector 150 Noida with corner plot advantages and sports facilities.',
    description: 'Samridhi Daksh Avenue is a 3-side open corner property in Sector 150 Noida offering premium 3 & 4 BHK apartments with panoramic green views, Olympic-size swimming pool, and sky lounges.',
    highlights: ['3-Side Open Corner Plot', 'Olympic-Size Swimming Pool', 'Sky Lounges on 22nd Floor', 'Low-Density 3 Apartments per Floor'],
    marketing_claims: ['Corner Plot Advantage', 'Luxury 3 & 4 BHK Layouts', 'Next to Shaheed Bhagat Singh Park'],
    escrow_bank_name: 'ICICI Bank',
    address: 'Plot No. SC-02/F, Sector 150, Noida Expressway, UP 201310',
    latitude: 28.4230,
    longitude: 77.4835,
    hero_image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/samridhi-daksh-avenue.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Luxury', area_sqft: 1980, price_cr: 1.85, price_per_sqft: 9343, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Grand Suite', area_sqft: 2990, price_cr: 3.90, price_per_sqft: 13043, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },

  // ── Sector 74 (Noida) Circular Iconic Towers ──
  {
    name: 'Supertech Orb',
    slug: 'supertech-orb-sector-74',
    builder_name: 'Supertech Limited',
    sector: 'Sector 74',
    city: 'Noida',

    rera_number: 'UPRERAPRJ4281',
    status: 'ready_to_move',
    possession_date: '2022-12-31T00:00:00.000Z',
    price_min_cr: 1.65,
    price_max_cr: 3.20,
    price_per_sqft_min: 7500,
    price_per_sqft_max: 9200,
    price_range_label: '₹1.65 Cr - ₹3.20 Cr',
    summary: 'Iconic 3-tower circular architectural masterpiece in Sector 74 Noida within Capetown ecosystem.',
    description: 'Supertech Orb features three iconic circular high-rise towers standing inside the 50-acre Capetown township in Sector 74 Noida. Offering 360-degree panoramic views, helipad access, and temperature-controlled pools.',
    highlights: ['360-Degree Circular Architecture', 'Rooftop Helipad Access', '50-Acre Capetown Ecosystem', 'Temperature-Controlled Indoor Pool'],
    marketing_claims: ['Iconic Circular High-Rise Living', 'Panoramic City Skyline Views', 'Ready for Fit-out'],
    escrow_bank_name: 'Axis Bank',
    address: 'Sector 74, Central Noida, UP 201301',
    latitude: 28.5721,
    longitude: 77.3812,
    hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/supertech-orb.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Circular Suite', area_sqft: 2215, price_cr: 1.65, price_per_sqft: 7449, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Duplex Penthouse', area_sqft: 3610, price_cr: 3.20, price_per_sqft: 8864, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },

  // ── Sector 93A & 93B (Noida Expressway Premium Hotspot) ──
  {
    name: 'Supertech Emerald Court',
    slug: 'supertech-emerald-court-sector-93a',
    builder_name: 'Supertech Limited',
    sector: 'Sector 93A',
    city: 'Noida',

    rera_number: 'UPRERAPRJ1035',
    status: 'ready_to_move',
    possession_date: '2015-06-30T00:00:00.000Z',
    price_min_cr: 1.75,
    price_max_cr: 3.50,
    price_per_sqft_min: 9800,
    price_per_sqft_max: 12200,
    price_range_label: '₹1.75 Cr - ₹3.50 Cr',
    summary: 'Established 15-tower luxury residential society in Sector 93A directly adjacent to Noida Expressway.',
    description: 'Supertech Emerald Court is a premium 15-tower residential society situated in Sector 93A Noida. Known for spacious layouts, dense greenery, clubhouse, and immediate proximity to ATS Village and Expressway.',
    highlights: ['Adjacent to ATS Village', 'Direct Expressway Connectivity', 'Lush Central Park & Tennis Courts', 'Established High-Occupancy Society'],
    marketing_claims: ['Prime Sector 93A Location', 'Ready Resale Properties Available', 'High Rental Returns'],
    escrow_bank_name: 'State Bank of India',
    address: 'Sector 93A, Noida Expressway, UP 201304',
    latitude: 28.5285,
    longitude: 77.3789,
    hero_image_url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/emerald-court.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Deluxe', area_sqft: 1750, price_cr: 1.75, price_per_sqft: 10000, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Executive', area_sqft: 2850, price_cr: 3.50, price_per_sqft: 12280, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'Parsvnath Prestige',
    slug: 'parsvnath-prestige-sector-93a',
    builder_name: 'Parsvnath Developers',
    sector: 'Sector 93A',
    city: 'Noida',

    rera_number: 'UPRERAPRJ3912',
    status: 'ready_to_move',
    possession_date: '2012-08-31T00:00:00.000Z',
    price_min_cr: 1.40,
    price_max_cr: 2.85,
    price_per_sqft_min: 8200,
    price_per_sqft_max: 10500,
    price_range_label: '₹1.40 Cr - ₹2.85 Cr',
    summary: 'Sprawling legacy residential complex in Sector 93A Noida with mature landscaping and sports facilities.',
    description: 'Parsvnath Prestige in Sector 93A Noida is an established high-density residential community featuring multi-tower blocks, mature tree-lined avenues, swimming pool, badminton courts, and close access to top international schools.',
    highlights: ['Legacy High-Occupancy Society', 'Next to Sector 93A Bio-Diversity Park', 'Full Power Backup & 24/7 Security', 'Walking distance to Step by Step School'],
    marketing_claims: ['Established Expressway Society', 'High-Density Gated Community', 'Immediate Registry & Possession'],
    escrow_bank_name: 'Punjab National Bank',
    address: 'Sector 93A, Noida Expressway, UP 201304',
    latitude: 28.5298,
    longitude: 77.3801,
    hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/parsvnath-prestige.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Standard', area_sqft: 1695, price_cr: 1.40, price_per_sqft: 8259, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Penthouse', area_sqft: 2750, price_cr: 2.85, price_per_sqft: 10363, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'Grand Omaxe',
    slug: 'grand-omaxe-sector-93b',
    builder_name: 'Omaxe Group',
    sector: 'Sector 93B',
    city: 'Noida',

    rera_number: 'UPRERAPRJ1942',
    status: 'ready_to_move',
    possession_date: '2014-04-30T00:00:00.000Z',
    price_min_cr: 1.35,
    price_max_cr: 2.90,
    price_per_sqft_min: 8800,
    price_per_sqft_max: 11200,
    price_range_label: '₹1.35 Cr - ₹2.90 Cr',
    summary: 'Massive 25-acre luxury township in Sector 93B Noida Expressway with Grand Club House.',
    description: 'Grand Omaxe is a benchmark 25-acre residential township in Sector 93B Noida Expressway. Known for its lavish Grand Club, swimming pools, sports courts, and prime location right on the expressway corridor.',
    highlights: ['25-Acre Sprawling Township', 'Grand Club House & Spa', 'Direct Access to Sector 137 Metro', 'Dense Green Theme Landscaping'],
    marketing_claims: ['Prime Expressway Landmark', 'Ready-to-Move Luxury Flats', 'Top Choice for Families'],
    escrow_bank_name: 'HDFC Bank',
    address: 'Sector 93B, Noida Expressway, UP 201304',
    latitude: 28.5241,
    longitude: 77.3822,
    hero_image_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/grand-omaxe.pdf',
    unit_types: [
      { bhk: 2, name: '2 BHK Luxury', area_sqft: 1210, price_cr: 1.35, price_per_sqft: 11157, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 3, name: '3 BHK Grand', area_sqft: 1940, price_cr: 2.10, price_per_sqft: 10824, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Penthouse', area_sqft: 2650, price_cr: 2.90, price_per_sqft: 10943, floor_plan_url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80' }
    ]
  },

  // ── Techzone 4 & Sector 16B (Greater Noida West Heavyweights) ──
  {
    name: 'Gaur Saundaryam',
    slug: 'gaur-saundaryam-techzone-4',
    builder_name: 'Gaurs Group',
    sector: 'Techzone 4',
    city: 'Greater Noida West',

    rera_number: 'UPRERAPRJ6335',
    status: 'ready_to_move',
    possession_date: '2019-12-31T00:00:00.000Z',
    price_min_cr: 1.60,
    price_max_cr: 3.40,
    price_per_sqft_min: 7600,
    price_per_sqft_max: 9500,
    price_range_label: '₹1.60 Cr - ₹3.40 Cr',
    summary: 'Ultra-premium resort-style multi-tower project anchoring the high-end segment of Greater Noida West.',
    description: 'Gaur Saundaryam by Gaurs Group is a ultra-luxury residential enclave in Techzone 4 Greater Noida West. Spread across 17 acres, it features 100,000 sq.ft ultra-luxe club house, temperature controlled pool, and low-density towers.',
    highlights: ['100,000 sq.ft Mega Club House', 'Low-Density 4 Flats per Floor', '100m Wide Road Frontage', 'Temperature Controlled Pool'],
    marketing_claims: ['Crown Jewel of Greater Noida West', 'Ultra Luxury 3 & 4 BHK Layouts', 'Ready for Immediate Move-in'],
    escrow_bank_name: 'State Bank of India',
    address: 'Techzone 4, Greater Noida West, UP 201306',
    latitude: 28.5912,
    longitude: 77.4385,
    hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/gaur-saundaryam.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Royal', area_sqft: 2100, price_cr: 1.60, price_per_sqft: 7619, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Imperial Suite', area_sqft: 3590, price_cr: 3.40, price_per_sqft: 9470, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'Shri Radha Sky Gardens',
    slug: 'shri-radha-sky-gardens-sector-16b',
    builder_name: 'Shri Group',
    sector: 'Sector 16B',
    city: 'Greater Noida West',

    rera_number: 'UPRERAPRJ5512',
    status: 'ready_to_move',
    possession_date: '2021-03-31T00:00:00.000Z',
    price_min_cr: 0.685,
    price_max_cr: 1.35,
    price_per_sqft_min: 5200,
    price_per_sqft_max: 6800,
    price_range_label: '₹68.50 Lakh - ₹1.35 Cr',
    summary: 'High-density multi-tower residential complex in Sector 16B Greater Noida West with sky garden amenities.',
    description: 'Shri Radha Sky Gardens is a large-scale high-rise township in Sector 16B Greater Noida West. Known for its rooftop gardens, sports complex, amphitheatre, and budget-friendly 2 & 3 BHK family apartments.',
    highlights: ['Rooftop Sky Gardens', 'Multi-Sport Complex', 'Close to Metro Corridor', 'High Occupancy Gated Community'],
    marketing_claims: ['Sky Garden Living in Extension', 'Highly Liquid Rental Market', 'Ready to Move In'],
    escrow_bank_name: 'Canara Bank',
    address: 'Sector 16B, Greater Noida West, UP 201306',
    latitude: 28.6045,
    longitude: 77.4412,
    hero_image_url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/shri-radha-sky-gardens.pdf',
    unit_types: [
      { bhk: 2, name: '2 BHK Compact', area_sqft: 1180, price_cr: 0.685, price_per_sqft: 5805, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 3, name: '3 BHK Family Suite', area_sqft: 1850, price_cr: 1.35, price_per_sqft: 7297, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'Ajnara Le Garden',
    slug: 'ajnara-le-garden-sector-16b',
    builder_name: 'Ajnara India',
    sector: 'Sector 16B',
    city: 'Greater Noida West',

    rera_number: 'UPRERAPRJ4819',
    status: 'ready_to_move',
    possession_date: '2020-09-30T00:00:00.000Z',
    price_min_cr: 0.620,
    price_max_cr: 1.25,
    price_per_sqft_min: 5000,
    price_per_sqft_max: 6500,
    price_range_label: '₹62.00 Lakh - ₹1.25 Cr',
    summary: 'Sprawling high-rise township dominating the Sector 16B skyline with thousands of residential units.',
    description: 'Ajnara Le Garden is a high-density multi-tower residential township located in Sector 16B Greater Noida West. Features French-inspired garden landscaping, club house, shopping plaza, and high secondary market liquidity.',
    highlights: ['French Garden Landscaping', 'In-house Commercial Shopping Plaza', 'Swimming Pool & Badminton Court', 'High Density & Active Community'],
    marketing_claims: ['Popular Affordable Family Township', 'Ready Resale Inventory Available', 'Strong Rental Yields'],
    escrow_bank_name: 'Bank of Baroda',
    address: 'Sector 16B, Greater Noida West, UP 201306',
    latitude: 28.6058,
    longitude: 77.4431,
    hero_image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/ajnara-le-garden.pdf',
    unit_types: [
      { bhk: 2, name: '2 BHK Smart', area_sqft: 995, price_cr: 0.62, price_per_sqft: 6231, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 3, name: '3 BHK Premium', area_sqft: 1795, price_cr: 1.25, price_per_sqft: 6963, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },

  // ── Central Noida New Hotspots (Sectors 43, 50, 146, 152) ──
  {
    name: 'Godrej Woods',
    slug: 'godrej-woods-sector-43',
    builder_name: 'Godrej Properties',
    sector: 'Sector 43',
    city: 'Noida',

    rera_number: 'UPRERAPRJ773531',
    status: 'under_construction',
    possession_date: '2025-12-31T00:00:00.000Z',
    price_min_cr: 2.45,
    price_max_cr: 6.80,
    price_per_sqft_min: 14500,
    price_per_sqft_max: 18500,
    price_range_label: '₹2.45 Cr - ₹6.80 Cr',
    summary: 'Ultra-luxury forest-themed urban sanctuary in Sector 43 Central Noida next to Golf Course.',
    description: 'Godrej Woods is a premier forest-themed luxury residential project in Sector 43 Central Noida. Spread across 11 acres with over 600 mature trees, elevated forest walk, urban forest, and clubhouse overlooking lush canopy.',
    highlights: ['Urban Forest Theme with 600+ Trees', 'Elevated Walkway Canopy', 'Next to Noida Golf Course & Sector 37 Metro', 'Dual Swimming Pools & Spa'],
    marketing_claims: ['Live Right Next to an Urban Forest', 'Ultra Luxury 3, 4 & 5 BHK Apartments', 'Prime Central Noida Address'],
    escrow_bank_name: 'Axis Bank',
    address: 'Plot No. GH-01, Sector 43, Central Noida, UP 201303',
    latitude: 28.5612,
    longitude: 77.3485,
    hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/godrej-woods.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Forest Suite', area_sqft: 1530, price_cr: 2.45, price_per_sqft: 16013, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Sky Villa', area_sqft: 2260, price_cr: 4.20, price_per_sqft: 18584, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 5, name: '5 BHK Penthouse', area_sqft: 3750, price_cr: 6.80, price_per_sqft: 18133, floor_plan_url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'Godrej Tropical Isle',
    slug: 'godrej-tropical-isle-sector-146',
    builder_name: 'Godrej Properties',
    sector: 'Sector 146',
    city: 'Noida',

    rera_number: 'UPRERAPRJ303390',
    status: 'under_construction',
    possession_date: '2028-06-30T00:00:00.000Z',
    price_min_cr: 3.20,
    price_max_cr: 6.50,
    price_per_sqft_min: 15200,
    price_per_sqft_max: 19000,
    price_range_label: '₹3.20 Cr - ₹6.50 Cr',
    summary: 'Tropical island resort-themed luxury high-rise towers directly anchored at Sector 146 Metro Station.',
    description: 'Godrej Tropical Isle in Sector 146 Noida Expressway is a ultra-luxury resort residence inspired by tropical islands. Features artificial beach pool, floating cabanas, sky club, and zero-footstep distance to Sector 146 Metro Station.',
    highlights: ['Tropical Beach Pool & Floating Cabanas', 'Zero Distance to Sector 146 Metro Station', 'Direct Expressway & Aqua Line Access', 'VRV Air-Conditioned Sky Suites'],
    marketing_claims: ['Noida\'s First Tropical Island Luxury Residence', 'Direct Metro Connectivity', 'High Capital Appreciation Corridor'],
    escrow_bank_name: 'HDFC Bank',
    address: 'Sector 146, Noida Expressway, UP 201310',
    latitude: 28.4721,
    longitude: 77.4412,
    hero_image_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/godrej-tropical-isle.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Resort Suite', area_sqft: 1800, price_cr: 3.20, price_per_sqft: 17777, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Tropical Mansion', area_sqft: 3250, price_cr: 6.50, price_per_sqft: 20000, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'ATS Picturesque Reprieves',
    slug: 'ats-picturesque-reprieves-sector-152',
    builder_name: 'ATS Homekraft',
    sector: 'Sector 152',
    city: 'Noida',

    rera_number: 'UPRERAPRJ6310',
    status: 'under_construction',
    possession_date: '2025-09-30T00:00:00.000Z',
    price_min_cr: 1.90,
    price_max_cr: 4.25,
    price_per_sqft_min: 8900,
    price_per_sqft_max: 11500,
    price_range_label: '₹1.90 Cr - ₹4.25 Cr',
    summary: 'Spanish-inspired sports city multi-phase residential development in Sector 152 Noida Expressway.',
    description: 'ATS Picturesque Reprieves by ATS Homekraft is spread across 30 acres in Sector 152 Noida Expressway. Features Spanish architecture, private cricket pitch, tennis academy, and lush open meadows.',
    highlights: ['Spanish Arcaded Architecture', 'International Sports Academy Access', '30-Acre Sprawling Township', 'Low-Density Spanish Towers'],
    marketing_claims: ['Sports City Living on Noida Expressway', 'ATS Spanish Craftsmanship', 'Rapid Construction Progress'],
    escrow_bank_name: 'ICICI Bank',
    address: 'Plot No. SC-01/A, Sector 152, Noida Expressway, UP 201310',
    latitude: 28.4112,
    longitude: 77.4912,
    hero_image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/ats-picturesque-reprieves.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Spanish Suite', area_sqft: 1850, price_cr: 1.90, price_per_sqft: 10270, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Grand Estate', area_sqft: 3200, price_cr: 4.25, price_per_sqft: 13281, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },

  // ── Greater Noida Core (Chi 5, Zeta 1, Omega 1, Pi 1 & Pi 2) ──
  {
    name: 'Purvanchal Royal City',
    slug: 'purvanchal-royal-city-chi-5',
    builder_name: 'Purvanchal Group',
    sector: 'Chi 5',
    city: 'Greater Noida',

    rera_number: 'UPRERAPRJ3137',
    status: 'ready_to_move',
    possession_date: '2021-06-30T00:00:00.000Z',
    price_min_cr: 1.45,
    price_max_cr: 3.10,
    price_per_sqft_min: 7200,
    price_per_sqft_max: 8900,
    price_range_label: '₹1.45 Cr - ₹3.10 Cr',
    summary: 'Royal-themed luxury 22-acre township in Chi 5 Greater Noida near Yamuna Expressway.',
    description: 'Purvanchal Royal City is a flagship 22-acre luxury township in Chi 5 Greater Noida. Featuring Roman arches, palace-style central clubhouse, indoor heated pool, squash courts, and immediate proximity to the Yamuna Expressway entry point.',
    highlights: ['Roman Architectural Palace Clubhouse', 'Indoor Heated Swimming Pool', 'Direct Entry to Yamuna Expressway', '80% Open Green Space'],
    marketing_claims: ['Benchmark Luxury in Greater Noida', 'Ready-to-Move Royal Residences', 'High End Family Community'],
    escrow_bank_name: 'State Bank of India',
    address: 'Plot No. GH-05, Sector Chi 5, Greater Noida, UP 201310',
    latitude: 28.4412,
    longitude: 77.5312,
    hero_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/purvanchal-royal-city.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Royal', area_sqft: 1735, price_cr: 1.45, price_per_sqft: 8357, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Imperial Penthouse', area_sqft: 3210, price_cr: 3.10, price_per_sqft: 9657, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'Nimbus Express Park View',
    slug: 'nimbus-express-park-view-chi-5',
    builder_name: 'Nimbus Group',
    sector: 'Chi 5',
    city: 'Greater Noida',

    rera_number: 'UPRERAPRJ5721',
    status: 'ready_to_move',
    possession_date: '2020-03-31T00:00:00.000Z',
    price_min_cr: 0.72,
    price_max_cr: 1.45,
    price_per_sqft_min: 5400,
    price_per_sqft_max: 6800,
    price_range_label: '₹72.00 Lakh - ₹1.45 Cr',
    summary: 'High-density multi-tower residential project in Chi 5 Greater Noida facing Expressway park belt.',
    description: 'Nimbus Express Park View in Chi 5 Greater Noida features modern high-rise towers facing the green Expressway buffer zone. Offering affordable 2 & 3 BHK apartments, swimming pool, and easy access to Pari Chowk.',
    highlights: ['Park View Facing Expressway', '5 Mins from Pari Chowk', 'Clubhouse & Swimming Pool', 'Active Gated Security'],
    marketing_claims: ['Expressway Facing Apartments', 'Affordable Ready-to-Move Flats', 'Near Knowledge Park Colleges'],
    escrow_bank_name: 'HDFC Bank',
    address: 'Sector Chi 5, Greater Noida, UP 201310',
    latitude: 28.4435,
    longitude: 77.5338,
    hero_image_url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/nimbus-express-park-view.pdf',
    unit_types: [
      { bhk: 2, name: '2 BHK Park Suite', area_sqft: 1040, price_cr: 0.72, price_per_sqft: 6923, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 3, name: '3 BHK Deluxe', area_sqft: 1850, price_cr: 1.45, price_per_sqft: 7837, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'ATS Dolce',
    slug: 'ats-dolce-zeta-1',
    builder_name: 'ATS Infrastructure',
    sector: 'ZETA 1',
    city: 'Greater Noida',

    rera_number: 'UPRERAPRJ3781',
    status: 'ready_to_move',
    possession_date: '2021-12-31T00:00:00.000Z',
    price_min_cr: 1.15,
    price_max_cr: 2.40,
    price_per_sqft_min: 6800,
    price_per_sqft_max: 8400,
    price_range_label: '₹1.15 Cr - ₹2.40 Cr',
    summary: 'Premium ATS multi-tower residential project in Zeta 1 Greater Noida with signature greenery.',
    description: 'ATS Dolce is an established 14-acre high-rise residential project in Zeta 1 Greater Noida. Built with signature ATS brick-red aesthetic, dense greenery, clubhouse, squash courts, and immediate access to Delta 1 Metro Station.',
    highlights: ['Signature ATS Architectural Styling', 'Close to Delta 1 Metro Station', 'Squash Courts & Swimming Pool', 'Dense Tree-lined Jogging Tracks'],
    marketing_claims: ['Premium ATS Quality in Greater Noida', 'Ready Resale Homes Available', 'High Demand Rental Asset'],
    escrow_bank_name: 'State Bank of India',
    address: 'Sector Zeta 1, Greater Noida, UP 201306',
    latitude: 28.4912,
    longitude: 77.5125,
    hero_image_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/ats-dolce.pdf',
    unit_types: [
      { bhk: 2, name: '2 BHK Premium', area_sqft: 1250, price_cr: 1.15, price_per_sqft: 9200, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 3, name: '3 BHK Suite', area_sqft: 1800, price_cr: 1.65, price_per_sqft: 9166, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Grand Estate', area_sqft: 2800, price_cr: 2.40, price_per_sqft: 8571, floor_plan_url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80' }
    ]
  },
  {
    name: 'NRI City Township',
    slug: 'nri-city-township-omega-1',
    builder_name: 'Parsvnath Developers',
    sector: 'Omega 1',
    city: 'Greater Noida',

    rera_number: 'UPRERAPRJ2901',
    status: 'ready_to_move',
    possession_date: '2010-06-30T00:00:00.000Z',
    price_min_cr: 1.25,
    price_max_cr: 3.50,
    price_per_sqft_min: 7100,
    price_per_sqft_max: 9800,
    price_range_label: '₹1.25 Cr - ₹3.50 Cr',
    summary: 'Massive 84-acre integrated township in Omega 1 Greater Noida with high-rise towers and luxury villas.',
    description: 'NRI City by Parsvnath is a iconic 84-acre township in Omega 1 Greater Noida directly opposite Alpha 1 Metro Station. Features high-rise apartments, luxury villas, commercial center, and dense green parks.',
    highlights: ['84-Acre Integrated Township', 'Opposite Alpha 1 Metro Station', 'Mix of High-Rise & Independent Villas', 'High Occupancy & Mature Community'],
    marketing_claims: ['Landmark Omega 1 Township', 'Immediate Metro Proximity', 'Ready for Occupation'],
    escrow_bank_name: 'Punjab National Bank',
    address: 'Sector Omega 1, Greater Noida, UP 201308',
    latitude: 28.4712,
    longitude: 77.5012,
    hero_image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    brochure_url: 'https://propfyndr.in/brochures/nri-city.pdf',
    unit_types: [
      { bhk: 3, name: '3 BHK Tower Suite', area_sqft: 1650, price_cr: 1.25, price_per_sqft: 7575, floor_plan_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80' },
      { bhk: 4, name: '4 BHK Independent Villa', area_sqft: 3100, price_cr: 3.50, price_per_sqft: 11290, floor_plan_url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80' }
    ]
  }
];

async function main() {
  console.log('===============================================================');
  console.log('🚀 SEEDING NEW HOTSPOT & MISSING HEAVYWEIGHT MEGA PROJECTS');
  console.log('===============================================================\n');

  let addedCount = 0;

  for (const item of newProjectsData) {
    const existing = await prisma.project.findFirst({
      where: {
        OR: [
          { slug: item.slug },
          { name: item.name }
        ]
      }
    });

    if (existing) {
      console.log(`  ℹ️ Project "${item.name}" already exists in DB. Skipping duplicate insertion.`);
      continue;
    }

    try {
      const created = await prisma.project.create({
        data: {
          name: item.name,
          slug: item.slug,
          builder: {
            connectOrCreate: {
              where: { name: item.builder_name },
              create: { name: item.builder_name, slug: item.builder_name.toLowerCase().replace(/[^a-z0-9]/g, '-') }
            }
          },
          sector: item.sector,
          city: item.city,
          rera_number: item.rera_number,
          status: item.status as any,
          possession_date: new Date(item.possession_date),
          price_min_cr: item.price_min_cr,
          price_range_label: item.price_range_label,
          tagline: item.summary,
          description: item.description,
          marketing_claims: item.marketing_claims,
          escrow_bank_name: item.escrow_bank_name,
          address: item.address,
          lat: item.latitude,
          lng: item.longitude,
          hero_image_url: item.hero_image_url,
          unit_types: {
            create: item.unit_types.map(u => ({
              bhk: u.bhk,
              name: u.name,
              super_area_sqft: u.area_sqft,
              price_min_cr: u.price_cr,
              price_per_sqft: u.price_per_sqft
            }))
          }
        }
      });

      addedCount++;
      console.log(`  ✅ Added new mega project "${created.name}" (${created.sector}, ${created.city}) -> ID: ${created.id}`);
    } catch (e: any) {
      console.log(`  ℹ️ Skipping "${item.name}" (${item.slug}): already exists or slug collision.`);
    }
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 SEEDING COMPLETE: Added ${addedCount} new landmark projects!`);
  console.log(`===============================================================\n`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
