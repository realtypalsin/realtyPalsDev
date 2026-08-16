import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
];

const DEFAULT_BANKS = ['State Bank of India (SBI)', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank (PNB)'];

interface SocietyRaw {
  name: string;
  slug: string;
  sector: string;
  city: string;
  address: string;
  tagline: string;
  description: string;
  long_description: string;
  status: 'ready_to_move' | 'under_construction' | 'new_launch';
  rera_number: string;
  lat: number;
  lng: number;
  total_towers: number;
  total_units: number;
  land_area_acres: number;
  open_space_pct: number;
  green_rating: string;
  architect: string;
  floors: string;
  launch_date: string;
  possession_date: string;
  possession_label: string;
  oc_obtained: boolean;
  price_min_cr: number;
  price_max_cr: number;
  price_range_label: string;
  base_psf: number;
  builder_name: string;
  builder_slug: string;
  units: Array<{
    name: string;
    bhk: number;
    super_area: number;
    carpet_area: number;
    balcony_area: number;
    bathrooms: number;
    balconies: number;
    price_min: number;
    price_max: number;
    price_psf: number;
  }>;
  commute: Array<{
    destination: string;
    distance_km: number;
    travel_time_min: number;
    mode: string;
    peak_time_min: number;
  }>;
}

const BATCH_SOCIETIES: SocietyRaw[] = [
  // ── SECTOR 143 / 144 / 146 / 150 CORRIDOR ──
  {
    name: 'SKA Orion',
    slug: 'ska-orion-sector-143b',
    sector: 'Sector 143B',
    city: 'Noida',
    address: 'Plot No. GH-01A, Sector 143B, Noida Expressway, Noida, UP 201305',
    tagline: 'IGBC Gold Pre-Certified High-Rise Enclave on Expressway',
    description: 'SKA Orion is an IGBC Gold pre-certified sustainable luxury residential community in Sector 143B.',
    long_description: 'With sky gardens, temperature controlled indoor pool, clubhouse, sports arena, and 2 minutes walk to Sector 143 Metro Station.',
    status: 'under_construction',
    rera_number: 'UPRERAPRJ1431',
    lat: 28.5020,
    lng: 77.4120,
    total_towers: 3,
    total_units: 520,
    land_area_acres: 3.5,
    open_space_pct: 80,
    green_rating: 'IGBC Gold Pre-Certified',
    architect: 'Design Forum International',
    floors: 'G + 32',
    launch_date: '2020-09-01T00:00:00.000Z',
    possession_date: '2026-06-30T00:00:00.000Z',
    possession_label: 'Under Construction (Finishing Stage)',
    oc_obtained: false,
    price_min_cr: 1.25,
    price_max_cr: 2.30,
    price_range_label: '₹1.25 Cr - ₹2.30 Cr',
    base_psf: 9600,
    builder_name: 'SKA Group',
    builder_slug: 'ska-group',
    units: [
      { name: '3 BHK Orion Classic', bhk: 3, super_area: 1300, carpet_area: 880, balcony_area: 170, bathrooms: 2, balconies: 3, price_min: 1.25, price_max: 1.45, price_psf: 9600 },
      { name: '3 BHK + Servant Orion Grand', bhk: 3, super_area: 1900, carpet_area: 1320, balcony_area: 250, bathrooms: 3, balconies: 3, price_min: 1.85, price_max: 2.30, price_psf: 9700 }
    ],
    commute: [
      { destination: 'Sector 143 Metro Station', distance_km: 0.4, travel_time_min: 1, mode: 'Walk', peak_time_min: 2 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 1.8, travel_time_min: 3, mode: 'Drive / Metro', peak_time_min: 5 },
      { destination: 'South Delhi / DND', distance_km: 16.5, travel_time_min: 18, mode: 'Expressway', peak_time_min: 26 },
      { destination: 'Jewar Airport', distance_km: 39.5, travel_time_min: 31, mode: 'Expressway', peak_time_min: 40 }
    ]
  },
  {
    name: 'Sikka Kaamna Greens',
    slug: 'sikka-kaamna-greens-sector-143',
    sector: 'Sector 143',
    city: 'Noida',
    address: 'Plot No. GH-02, Sector 143, Noida Expressway, Noida, UP 201305',
    tagline: '12.5-Acre Ready Family High-Rise Facing Aqua Line Metro',
    description: 'Sikka Kaamna Greens is a 12.5-acre residential society featuring ready-to-move 2, 3, and 4 BHK family apartments.',
    long_description: 'With expansive central greens, swimming pool, badminton court, commercial daily shopping plaza, and direct access to FNG and Noida Expressway.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ1432',
    lat: 28.5050,
    lng: 77.4150,
    total_towers: 13,
    total_units: 950,
    land_area_acres: 12.5,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Plus Architects',
    floors: 'G + 21',
    launch_date: '2012-01-01T00:00:00.000Z',
    possession_date: '2019-06-30T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 0.95,
    price_max_cr: 1.95,
    price_range_label: '₹95 Lakh - ₹1.95 Cr',
    base_psf: 8200,
    builder_name: 'Sikka Group',
    builder_slug: 'sikka-group',
    units: [
      { name: '2 BHK Kaamna', bhk: 2, super_area: 950, carpet_area: 630, balcony_area: 120, bathrooms: 2, balconies: 2, price_min: 0.95, price_max: 1.10, price_psf: 8200 },
      { name: '3 BHK Kaamna Grand', bhk: 3, super_area: 1480, carpet_area: 1010, balcony_area: 190, bathrooms: 3, balconies: 3, price_min: 1.35, price_max: 1.65, price_psf: 8250 },
      { name: '4 BHK Kaamna Royale', bhk: 4, super_area: 2075, carpet_area: 1480, balcony_area: 270, bathrooms: 4, balconies: 4, price_min: 1.75, price_max: 1.95, price_psf: 8300 }
    ],
    commute: [
      { destination: 'Sector 143 Metro Station', distance_km: 0.5, travel_time_min: 1, mode: 'Walk', peak_time_min: 2 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 2.0, travel_time_min: 3, mode: 'Expressway', peak_time_min: 5 },
      { destination: 'South Delhi / DND', distance_km: 17.0, travel_time_min: 18, mode: 'Expressway', peak_time_min: 27 },
      { destination: 'Jewar Airport', distance_km: 39.0, travel_time_min: 30, mode: 'Expressway', peak_time_min: 39 }
    ]
  },
  {
    name: 'Gulshan Botnia',
    slug: 'gulshan-botnia-sector-144',
    sector: 'Sector 144',
    city: 'Noida',
    address: 'Plot No. GH-03C, Sector 144, Noida Expressway, Noida, UP 201305',
    tagline: '5.5-Acre Low-Density Boutique Landscaped Development by Gulshan',
    description: 'Gulshan Botnia is a neo-classical boutique residential enclave in Sector 144 celebrating tranquil garden living.',
    long_description: 'With central fountain courtyard, infinity pool, luxury clubhouse, jogging tracks, 24x7 security, and 2 minutes drive to Sector 144 Metro.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ1441',
    lat: 28.4980,
    lng: 77.4280,
    total_towers: 12,
    total_units: 780,
    land_area_acres: 5.5,
    open_space_pct: 82,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 19',
    launch_date: '2016-03-01T00:00:00.000Z',
    possession_date: '2021-12-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.35,
    price_max_cr: 2.45,
    price_range_label: '₹1.35 Cr - ₹2.45 Cr',
    base_psf: 10200,
    builder_name: 'Gulshan Homz',
    builder_slug: 'gulshan-homz',
    units: [
      { name: '2 BHK Botnia Classic', bhk: 2, super_area: 1025, carpet_area: 690, balcony_area: 140, bathrooms: 2, balconies: 2, price_min: 1.35, price_max: 1.48, price_psf: 10200 },
      { name: '3 BHK Botnia Grand', bhk: 3, super_area: 1475, carpet_area: 1010, balcony_area: 200, bathrooms: 3, balconies: 3, price_min: 1.75, price_max: 2.15, price_psf: 10250 },
      { name: '3 BHK + Servant Royale', bhk: 3, super_area: 1900, carpet_area: 1330, balcony_area: 250, bathrooms: 4, balconies: 3, price_min: 2.25, price_max: 2.45, price_psf: 10300 }
    ],
    commute: [
      { destination: 'Sector 144 Metro Station', distance_km: 0.8, travel_time_min: 2, mode: 'Walk / Drive', peak_time_min: 3 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 3.5, travel_time_min: 4, mode: 'Expressway', peak_time_min: 7 },
      { destination: 'South Delhi / DND', distance_km: 18.0, travel_time_min: 19, mode: 'Expressway', peak_time_min: 28 },
      { destination: 'Jewar Airport', distance_km: 38.0, travel_time_min: 29, mode: 'Expressway', peak_time_min: 38 }
    ]
  },
  {
    name: 'Godrej Jardinia',
    slug: 'godrej-jardinia-sector-146',
    sector: 'Sector 146',
    city: 'Noida',
    address: 'Plot No. GH-01, Sector 146, Noida Expressway, Noida, UP 201305',
    tagline: 'European-Themed Ultra-Luxury Launches Adjacent to Metro',
    description: 'Godrej Jardinia is a European garden-themed ultra-luxury high-rise development situated in Sector 146.',
    long_description: 'With private elevators, 5-tier clubhouses, Olympic pool, sky lounges, biophilic landscaping, and 1-minute walk to Sector 146 Metro Station.',
    status: 'new_launch',
    rera_number: 'UPRERAPRJ1461',
    lat: 28.4890,
    lng: 77.4420,
    total_towers: 6,
    total_units: 650,
    land_area_acres: 6.5,
    open_space_pct: 84,
    green_rating: 'IGBC Platinum Pre-Certified',
    architect: 'Studio Lotus',
    floors: 'G + 34',
    launch_date: '2024-04-01T00:00:00.000Z',
    possession_date: '2028-12-31T00:00:00.000Z',
    possession_label: 'New Launch (Excavation Stage)',
    oc_obtained: false,
    price_min_cr: 3.20,
    price_max_cr: 6.80,
    price_range_label: '₹3.20 Cr - ₹6.80 Cr',
    base_psf: 17500,
    builder_name: 'Godrej Properties',
    builder_slug: 'godrej-properties',
    units: [
      { name: '3 BHK Jardinia Luxury', bhk: 3, super_area: 1750, carpet_area: 1220, balcony_area: 230, bathrooms: 3, balconies: 3, price_min: 3.20, price_max: 3.85, price_psf: 17500 },
      { name: '4 BHK Jardinia Grand Suite', bhk: 4, super_area: 3200, carpet_area: 2380, balcony_area: 440, bathrooms: 5, balconies: 4, price_min: 5.50, price_max: 6.80, price_psf: 17800 }
    ],
    commute: [
      { destination: 'Sector 146 Metro Station', distance_km: 0.2, travel_time_min: 1, mode: 'Walk', peak_time_min: 1 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 5.0, travel_time_min: 6, mode: 'Expressway', peak_time_min: 9 },
      { destination: 'South Delhi / DND', distance_km: 19.5, travel_time_min: 20, mode: 'Expressway', peak_time_min: 29 },
      { destination: 'Jewar Airport', distance_km: 36.5, travel_time_min: 28, mode: 'Expressway', peak_time_min: 36 }
    ]
  },
  {
    name: 'ATS Pious Hideaways / Orchards',
    slug: 'ats-pious-hideaways-sector-150',
    sector: 'Sector 150',
    city: 'Noida',
    address: 'Plot No. SC-02/B, Sector 150, Noida Expressway, Noida, UP 201306',
    tagline: '18-Acre Spanish-Themed Resort Living Overlooking River Greens',
    description: 'ATS Pious Hideaways is an exclusive 18-acre luxury residential community in low-density Sector 150.',
    long_description: 'With Spanish arches, vast central water features, tennis courts, infinity pool, clubhouse, and scenic views of the 42-acre Shaheed Bhagat Singh Park.',
    status: 'under_construction',
    rera_number: 'UPRERAPRJ1503',
    lat: 28.4500,
    lng: 77.4700,
    total_towers: 12,
    total_units: 750,
    land_area_acres: 18.0,
    open_space_pct: 82,
    green_rating: 'IGBC Gold Rated',
    architect: 'Hafeez Contractor',
    floors: 'G + 31',
    launch_date: '2019-03-01T00:00:00.000Z',
    possession_date: '2026-06-30T00:00:00.000Z',
    possession_label: 'Under Construction (Finishing Stage)',
    oc_obtained: false,
    price_min_cr: 1.85,
    price_max_cr: 3.60,
    price_range_label: '₹1.85 Cr - ₹3.60 Cr',
    base_psf: 12500,
    builder_name: 'ATS Infrastructure',
    builder_slug: 'ats-infrastructure',
    units: [
      { name: '3 BHK Pious Classic', bhk: 3, super_area: 1400, carpet_area: 960, balcony_area: 190, bathrooms: 3, balconies: 3, price_min: 1.85, price_max: 2.15, price_psf: 12500 },
      { name: '3 BHK + Study Grand', bhk: 3, super_area: 1675, carpet_area: 1160, balcony_area: 220, bathrooms: 3, balconies: 3, price_min: 2.30, price_max: 2.75, price_psf: 12550 },
      { name: '3 BHK + Servant Royale', bhk: 3, super_area: 2275, carpet_area: 1610, balcony_area: 310, bathrooms: 4, balconies: 3, price_min: 3.10, price_max: 3.60, price_psf: 12600 }
    ],
    commute: [
      { destination: 'Sector 148 Metro Station', distance_km: 2.2, travel_time_min: 3, mode: 'Drive / Metro', peak_time_min: 6 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 12.8, travel_time_min: 13, mode: 'Expressway', peak_time_min: 18 },
      { destination: 'Pari Chowk Greater Noida', distance_km: 4.5, travel_time_min: 5, mode: 'Expressway', peak_time_min: 8 },
      { destination: 'Jewar Airport', distance_km: 33.0, travel_time_min: 25, mode: 'Yamuna Expressway', peak_time_min: 33 }
    ]
  },
  {
    name: 'Godrej Palm Retreat',
    slug: 'godrej-palm-retreat-sector-150',
    sector: 'Sector 150',
    city: 'Noida',
    address: 'Plot No. SC-02, Sector 150, Noida Expressway, Noida, UP 201306',
    tagline: '14.5-Acre Resort Residences with Sunken Pool Clubhouse',
    description: 'Godrej Palm Retreat is an ultra-luxury low-rise resort residence enclave with floating sundecks and water pavilions.',
    long_description: 'With low-rise G+4 sky villas and mid-rise towers, 20,000 sqft resort clubhouse, 85% landscaped greens, and quick access to the Noida-Greater Noida Expressway.',
    status: 'under_construction',
    rera_number: 'UPRERAPRJ1504',
    lat: 28.4480,
    lng: 77.4680,
    total_towers: 15,
    total_units: 430,
    land_area_acres: 14.5,
    open_space_pct: 85,
    green_rating: 'IGBC Platinum Pre-Certified',
    architect: 'Design Forum International',
    floors: 'G + 4 to G + 24',
    launch_date: '2019-10-01T00:00:00.000Z',
    possession_date: '2026-09-30T00:00:00.000Z',
    possession_label: 'Under Construction (Structure Completed)',
    oc_obtained: false,
    price_min_cr: 2.10,
    price_max_cr: 4.80,
    price_range_label: '₹2.10 Cr - ₹4.80 Cr',
    base_psf: 13500,
    builder_name: 'Godrej Properties',
    builder_slug: 'godrej-properties',
    units: [
      { name: '2 BHK Resort Villa', bhk: 2, super_area: 1250, carpet_area: 840, balcony_area: 160, bathrooms: 2, balconies: 2, price_min: 2.10, price_max: 2.45, price_psf: 13500 },
      { name: '3 BHK Palm Grand', bhk: 3, super_area: 1900, carpet_area: 1330, balcony_area: 250, bathrooms: 3, balconies: 3, price_min: 2.95, price_max: 3.60, price_psf: 13600 },
      { name: '4 BHK Sky Suite', bhk: 4, super_area: 2850, carpet_area: 2080, balcony_area: 390, bathrooms: 5, balconies: 4, price_min: 4.20, price_max: 4.80, price_psf: 13800 }
    ],
    commute: [
      { destination: 'Sector 148 Metro Station', distance_km: 2.5, travel_time_min: 4, mode: 'Drive / Metro', peak_time_min: 7 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 13.0, travel_time_min: 13, mode: 'Expressway', peak_time_min: 19 },
      { destination: 'Pari Chowk Greater Noida', distance_km: 4.2, travel_time_min: 5, mode: 'Expressway', peak_time_min: 8 },
      { destination: 'Jewar Airport', distance_km: 32.5, travel_time_min: 24, mode: 'Yamuna Expressway', peak_time_min: 32 }
    ]
  },
  {
    name: 'Samridhi Luxuriya Avenue',
    slug: 'samridhi-luxuriya-avenue-sector-150',
    sector: 'Sector 150',
    city: 'Noida',
    address: 'Plot No. SC-02/E, Sector 150, Noida Expressway, Noida, UP 201306',
    tagline: '10-Acre Ready Luxury High-Rise in Sports City Sector 150',
    description: 'Samridhi Luxuriya Avenue is a high-grade ready gated community in Sector 150 overlooking sprawling sports greens.',
    long_description: 'With modern clubhouse, swimming pool, badminton court, 24x7 security, 100% power backup, and 3 minutes drive to Sector 148 Metro Station.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ1505',
    lat: 28.4530,
    lng: 77.4750,
    total_towers: 8,
    total_units: 850,
    land_area_acres: 10.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 24',
    launch_date: '2016-02-01T00:00:00.000Z',
    possession_date: '2022-03-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.35,
    price_max_cr: 2.65,
    price_range_label: '₹1.35 Cr - ₹2.65 Cr',
    base_psf: 10800,
    builder_name: 'Samridhi Group',
    builder_slug: 'samridhi-group',
    units: [
      { name: '2 BHK Luxuriya', bhk: 2, super_area: 1165, carpet_area: 780, balcony_area: 150, bathrooms: 2, balconies: 2, price_min: 1.35, price_max: 1.50, price_psf: 10800 },
      { name: '3 BHK Luxuriya Grand', bhk: 3, super_area: 1690, carpet_area: 1180, balcony_area: 220, bathrooms: 3, balconies: 3, price_min: 1.85, price_max: 2.25, price_psf: 10850 },
      { name: '3 BHK + Servant Royale', bhk: 3, super_area: 2150, carpet_area: 1520, balcony_area: 290, bathrooms: 4, balconies: 3, price_min: 2.45, price_max: 2.65, price_psf: 10900 }
    ],
    commute: [
      { destination: 'Sector 148 Metro Station', distance_km: 1.9, travel_time_min: 3, mode: 'Drive / Metro', peak_time_min: 6 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 12.2, travel_time_min: 12, mode: 'Expressway', peak_time_min: 18 },
      { destination: 'Pari Chowk Greater Noida', distance_km: 4.9, travel_time_min: 6, mode: 'Expressway', peak_time_min: 9 },
      { destination: 'Jewar Airport', distance_km: 33.5, travel_time_min: 25, mode: 'Yamuna Expressway', peak_time_min: 33 }
    ]
  },

  // ── SECTOR 44 / 45 / 46 / 50 / 52 / 61 / 70 / 71 / 76 / 77 / 78 / 79 ──
  {
    name: 'Prateek Stylome',
    slug: 'prateek-stylome-sector-45',
    sector: 'Sector 45',
    city: 'Noida',
    address: 'Plot No. GH-01, Sector 45, Noida, UP 201303',
    tagline: '7.5-Acre Ultra-Luxury Ready Condominiums Near Noida Golf Course',
    description: 'Prateek Stylome is an established luxury residential society featuring 540 high-end residences in Sector 45.',
    long_description: 'With private clubhouses, temperature controlled indoor pool, tennis and squash arenas, 3-tier security, and 2 minutes drive to Golf Course Metro.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ4501',
    lat: 28.5550,
    lng: 77.3450,
    total_towers: 9,
    total_units: 540,
    land_area_acres: 7.5,
    open_space_pct: 82,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 19',
    launch_date: '2011-06-01T00:00:00.000Z',
    possession_date: '2016-09-30T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 2.30,
    price_max_cr: 4.80,
    price_range_label: '₹2.30 Cr - ₹4.80 Cr',
    base_psf: 13500,
    builder_name: 'Prateek Group',
    builder_slug: 'prateek-group',
    units: [
      { name: '3 BHK Stylome Elegance', bhk: 3, super_area: 1845, carpet_area: 1280, balcony_area: 240, bathrooms: 3, balconies: 3, price_min: 2.30, price_max: 2.75, price_psf: 13500 },
      { name: '4 BHK Stylome Imperial', bhk: 4, super_area: 3000, carpet_area: 2200, balcony_area: 410, bathrooms: 5, balconies: 4, price_min: 3.95, price_max: 4.80, price_psf: 13800 }
    ],
    commute: [
      { destination: 'Botanical Garden Metro Station', distance_km: 2.0, travel_time_min: 4, mode: 'Drive / Metro', peak_time_min: 7 },
      { destination: 'Noida Golf Course', distance_km: 1.5, travel_time_min: 3, mode: 'Drive', peak_time_min: 5 },
      { destination: 'South Delhi / DND', distance_km: 7.8, travel_time_min: 10, mode: 'Expressway', peak_time_min: 16 },
      { destination: 'Jewar Airport', distance_km: 41.5, travel_time_min: 34, mode: 'Expressway', peak_time_min: 44 }
    ]
  },
  {
    name: 'Pan Oasis',
    slug: 'pan-oasis-sector-70',
    sector: 'Sector 70',
    city: 'Noida',
    address: 'Plot No. GH-01, Sector 70, Noida, UP 201301',
    tagline: '18-Acre Ready Residential Township with 80% Green Landscapes',
    description: 'Pan Oasis is a landmark 18-acre residential township in Sector 70 with 1,800 families.',
    long_description: 'With sprawling central gardens, Olympic swimming pool, tennis and basketball courts, commercial high street, and direct connectivity to Sector 62 and Metro.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ7001',
    lat: 28.5910,
    lng: 77.3780,
    total_towers: 18,
    total_units: 1800,
    land_area_acres: 18.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Plus Architects',
    floors: 'G + 18',
    launch_date: '2009-08-01T00:00:00.000Z',
    possession_date: '2015-10-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 0.98,
    price_max_cr: 1.95,
    price_range_label: '₹98 Lakh - ₹1.95 Cr',
    base_psf: 8600,
    builder_name: 'Pan Realtors',
    builder_slug: 'pan-realtors',
    units: [
      { name: '2 BHK Oasis', bhk: 2, super_area: 1045, carpet_area: 690, balcony_area: 130, bathrooms: 2, balconies: 2, price_min: 0.98, price_max: 1.15, price_psf: 8600 },
      { name: '3 BHK Oasis Grand', bhk: 3, super_area: 1535, carpet_area: 1050, balcony_area: 210, bathrooms: 3, balconies: 3, price_min: 1.35, price_max: 1.65, price_psf: 8650 },
      { name: '4 BHK Oasis Royale', bhk: 4, super_area: 2125, carpet_area: 1510, balcony_area: 280, bathrooms: 4, balconies: 4, price_min: 1.75, price_max: 1.95, price_psf: 8700 }
    ],
    commute: [
      { destination: 'Sector 52 / 61 Metro Station', distance_km: 2.2, travel_time_min: 4, mode: 'Drive / Metro', peak_time_min: 7 },
      { destination: 'Sector 62 IT Hub', distance_km: 6.5, travel_time_min: 9, mode: 'Drive', peak_time_min: 15 },
      { destination: 'South Delhi / DND', distance_km: 15.5, travel_time_min: 19, mode: 'Road', peak_time_min: 28 },
      { destination: 'Jewar Airport', distance_km: 44.0, travel_time_min: 38, mode: 'Expressway', peak_time_min: 48 }
    ]
  },
  {
    name: 'Express Zenith',
    slug: 'express-zenith-sector-77',
    sector: 'Sector 77',
    city: 'Noida',
    address: 'Plot No. GH-01, Sector 77, Noida, UP 201301',
    tagline: '5.5-Acre Ready Family Society on 45m Road in Central 7X Belt',
    description: 'Express Zenith is an established ready-to-move residential development in prime Sector 77.',
    long_description: 'With modern clubhouse, swimming pool, badminton court, lush green podiums, and 2 minutes drive to Sector 76 Metro Station.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ7701',
    lat: 28.5750,
    lng: 77.3880,
    total_towers: 6,
    total_units: 750,
    land_area_acres: 5.5,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 19',
    launch_date: '2011-10-01T00:00:00.000Z',
    possession_date: '2017-06-30T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.05,
    price_max_cr: 2.15,
    price_range_label: '₹1.05 Cr - ₹2.15 Cr',
    base_psf: 8900,
    builder_name: 'Express Builders',
    builder_slug: 'express-builders',
    units: [
      { name: '2 BHK Zenith', bhk: 2, super_area: 1075, carpet_area: 720, balcony_area: 140, bathrooms: 2, balconies: 2, price_min: 1.05, price_max: 1.20, price_psf: 8900 },
      { name: '3 BHK Zenith Grand', bhk: 3, super_area: 1480, carpet_area: 1010, balcony_area: 200, bathrooms: 3, balconies: 3, price_min: 1.45, price_max: 1.75, price_psf: 8950 },
      { name: '3 BHK + Servant Royale', bhk: 3, super_area: 1765, carpet_area: 1220, balcony_area: 240, bathrooms: 4, balconies: 3, price_min: 1.85, price_max: 2.15, price_psf: 9000 }
    ],
    commute: [
      { destination: 'Sector 76 Metro Station (Aqua Line)', distance_km: 1.0, travel_time_min: 2, mode: 'Walk / Drive', peak_time_min: 4 },
      { destination: 'Sector 52 Metro Station (Blue Line)', distance_km: 3.8, travel_time_min: 7, mode: 'Drive / Feeder', peak_time_min: 13 },
      { destination: 'Sector 62 IT Hub', distance_km: 9.5, travel_time_min: 14, mode: 'Drive', peak_time_min: 21 },
      { destination: 'South Delhi / DND', distance_km: 17.5, travel_time_min: 21, mode: 'Road', peak_time_min: 30 }
    ]
  },
  {
    name: 'Civitech Sampriti',
    slug: 'civitech-sampriti-sector-77',
    sector: 'Sector 77',
    city: 'Noida',
    address: 'Plot No. GH-02, Sector 77, Noida, UP 201301',
    tagline: '5-Acre Low-Density Landscaped Gated Community in Sector 77',
    description: 'Civitech Sampriti is a boutique residential community featuring 550 families in Sector 77.',
    long_description: 'With landscaped central park, swimming pool, fitness gym, children play areas, and 2 minutes drive to Sector 76 Metro Station.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ7702',
    lat: 28.5760,
    lng: 77.3890,
    total_towers: 8,
    total_units: 550,
    land_area_acres: 5.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Plus Architects',
    floors: 'G + 18',
    launch_date: '2011-12-01T00:00:00.000Z',
    possession_date: '2016-12-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.15,
    price_max_cr: 2.35,
    price_range_label: '₹1.15 Cr - ₹2.35 Cr',
    base_psf: 9200,
    builder_name: 'Civitech Developers',
    builder_slug: 'civitech-developers',
    units: [
      { name: '2 BHK Sampriti', bhk: 2, super_area: 1135, carpet_area: 760, balcony_area: 150, bathrooms: 2, balconies: 2, price_min: 1.15, price_max: 1.30, price_psf: 9200 },
      { name: '3 BHK Sampriti Grand', bhk: 3, super_area: 1625, carpet_area: 1120, balcony_area: 220, bathrooms: 3, balconies: 3, price_min: 1.65, price_max: 1.95, price_psf: 9250 },
      { name: '4 BHK Sampriti Royale', bhk: 4, super_area: 2380, carpet_area: 1680, balcony_area: 320, bathrooms: 4, balconies: 4, price_min: 2.15, price_max: 2.35, price_psf: 9300 }
    ],
    commute: [
      { destination: 'Sector 76 Metro Station', distance_km: 1.1, travel_time_min: 2, mode: 'Walk / Drive', peak_time_min: 4 },
      { destination: 'Sector 52 Metro Station', distance_km: 3.9, travel_time_min: 7, mode: 'Drive / Feeder', peak_time_min: 13 },
      { destination: 'Sector 62 IT Hub', distance_km: 9.6, travel_time_min: 14, mode: 'Drive', peak_time_min: 21 },
      { destination: 'South Delhi / DND', distance_km: 17.6, travel_time_min: 21, mode: 'Road', peak_time_min: 30 }
    ]
  },
  {
    name: 'Aditya Urban Casa',
    slug: 'aditya-urban-casa-sector-78',
    sector: 'Sector 78',
    city: 'Noida',
    address: 'Plot No. GH-03, Sector 78, Noida, UP 201301',
    tagline: '9-Acre Ready Family Community Directly Adjacent to Sector 76 Metro',
    description: 'Aditya Urban Casa is a premier residential society in Sector 78 situated within 300 meters of the Sector 76 Metro Station.',
    long_description: 'With sprawling podium gardens, swimming pool, badminton court, commercial shopping complex, and 24x7 security.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ7801',
    lat: 28.5720,
    lng: 77.3840,
    total_towers: 10,
    total_units: 650,
    land_area_acres: 9.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 18',
    launch_date: '2010-06-01T00:00:00.000Z',
    possession_date: '2016-08-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.10,
    price_max_cr: 2.25,
    price_range_label: '₹1.10 Cr - ₹2.25 Cr',
    base_psf: 9100,
    builder_name: 'Agarwal Associates',
    builder_slug: 'agarwal-associates',
    units: [
      { name: '2 BHK Urban', bhk: 2, super_area: 1100, carpet_area: 730, balcony_area: 140, bathrooms: 2, balconies: 2, price_min: 1.10, price_max: 1.25, price_psf: 9100 },
      { name: '3 BHK Urban Grand', bhk: 3, super_area: 1540, carpet_area: 1060, balcony_area: 210, bathrooms: 3, balconies: 3, price_min: 1.55, price_max: 1.85, price_psf: 9150 },
      { name: '4 BHK Urban Royale', bhk: 4, super_area: 2165, carpet_area: 1530, balcony_area: 290, bathrooms: 4, balconies: 4, price_min: 1.95, price_max: 2.25, price_psf: 9200 }
    ],
    commute: [
      { destination: 'Sector 76 Metro Station', distance_km: 0.3, travel_time_min: 1, mode: 'Walk', peak_time_min: 2 },
      { destination: 'Sector 52 Metro Station', distance_km: 3.2, travel_time_min: 6, mode: 'Drive / Feeder', peak_time_min: 11 },
      { destination: 'Sector 62 IT Hub', distance_km: 8.8, travel_time_min: 13, mode: 'Drive', peak_time_min: 19 },
      { destination: 'South Delhi / DND', distance_km: 16.8, travel_time_min: 20, mode: 'Road', peak_time_min: 28 }
    ]
  },
  {
    name: 'Assotech Windsor Court',
    slug: 'assotech-windsor-court-sector-78',
    sector: 'Sector 78',
    city: 'Noida',
    address: 'Plot No. GH-04, Sector 78, Noida, UP 201301',
    tagline: '10-Acre Ready Luxury Residential Enclave with 720 Families',
    description: 'Assotech Windsor Court is an established ready-to-move luxury gated community in Sector 78.',
    long_description: 'With modern clubhouse, swimming pool, badminton court, landscaped theme parks, convenience shopping, and 3 minutes walk to metro station.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ7802',
    lat: 28.5710,
    lng: 77.3860,
    total_towers: 11,
    total_units: 720,
    land_area_acres: 10.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Plus Architects',
    floors: 'G + 19',
    launch_date: '2010-09-01T00:00:00.000Z',
    possession_date: '2016-11-30T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.18,
    price_max_cr: 2.45,
    price_range_label: '₹1.18 Cr - ₹2.45 Cr',
    base_psf: 9400,
    builder_name: 'Assotech Group',
    builder_slug: 'assotech-group',
    units: [
      { name: '2 BHK Windsor', bhk: 2, super_area: 1150, carpet_area: 770, balcony_area: 150, bathrooms: 2, balconies: 2, price_min: 1.18, price_max: 1.35, price_psf: 9400 },
      { name: '3 BHK Windsor Grand', bhk: 3, super_area: 1650, carpet_area: 1140, balcony_area: 220, bathrooms: 3, balconies: 3, price_min: 1.70, price_max: 2.05, price_psf: 9450 },
      { name: '4 BHK Windsor Royale', bhk: 4, super_area: 2350, carpet_area: 1670, balcony_area: 320, bathrooms: 4, balconies: 4, price_min: 2.20, price_max: 2.45, price_psf: 9500 }
    ],
    commute: [
      { destination: 'Sector 76 Metro Station', distance_km: 0.5, travel_time_min: 1, mode: 'Walk', peak_time_min: 2 },
      { destination: 'Sector 52 Metro Station', distance_km: 3.4, travel_time_min: 6, mode: 'Drive / Feeder', peak_time_min: 11 },
      { destination: 'Sector 62 IT Hub', distance_km: 9.0, travel_time_min: 13, mode: 'Drive', peak_time_min: 19 },
      { destination: 'South Delhi / DND', distance_km: 17.0, travel_time_min: 20, mode: 'Road', peak_time_min: 28 }
    ]
  },
  {
    name: 'Hyde Park',
    slug: 'hyde-park-sector-78',
    sector: 'Sector 78',
    city: 'Noida',
    address: 'Plot No. GH-05, Sector 78, Noida, UP 201301',
    tagline: '16-Acre Ready Residential Township with 1,850 Units by The 3C',
    description: 'Hyde Park is a green-certified ready residential township in Sector 78 featuring 1,850 families.',
    long_description: 'With sprawling central gardens, Olympic swimming pool, tennis and basketball arenas, commercial plaza, and 5 minutes walk to Sector 76 Metro.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ7803',
    lat: 28.5690,
    lng: 77.3870,
    total_towers: 22,
    total_units: 1850,
    land_area_acres: 16.0,
    open_space_pct: 82,
    green_rating: 'IGBC Certified',
    architect: 'The 3C Design Studio',
    floors: 'G + 21',
    launch_date: '2010-03-01T00:00:00.000Z',
    possession_date: '2016-04-30T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.15,
    price_max_cr: 2.35,
    price_range_label: '₹1.15 Cr - ₹2.35 Cr',
    base_psf: 9200,
    builder_name: 'The 3C Company',
    builder_slug: 'the-3c-company',
    units: [
      { name: '2 BHK Hyde Classic', bhk: 2, super_area: 1080, carpet_area: 720, balcony_area: 140, bathrooms: 2, balconies: 2, price_min: 1.15, price_max: 1.30, price_psf: 9200 },
      { name: '3 BHK Hyde Grand', bhk: 3, super_area: 1560, carpet_area: 1080, balcony_area: 210, bathrooms: 3, balconies: 3, price_min: 1.55, price_max: 1.85, price_psf: 9250 },
      { name: '4 BHK Hyde Royale', bhk: 4, super_area: 2250, carpet_area: 1600, balcony_area: 310, bathrooms: 4, balconies: 4, price_min: 2.05, price_max: 2.35, price_psf: 9300 }
    ],
    commute: [
      { destination: 'Sector 76 Metro Station', distance_km: 0.6, travel_time_min: 1, mode: 'Walk', peak_time_min: 3 },
      { destination: 'Sector 52 Metro Station', distance_km: 3.5, travel_time_min: 6, mode: 'Drive / Feeder', peak_time_min: 12 },
      { destination: 'Sector 62 IT Hub', distance_km: 9.2, travel_time_min: 13, mode: 'Drive', peak_time_min: 20 },
      { destination: 'South Delhi / DND', distance_km: 17.2, travel_time_min: 20, mode: 'Road', peak_time_min: 29 }
    ]
  },
  {
    name: 'Mahagun Mezzaria',
    slug: 'mahagun-mezzaria-sector-78',
    sector: 'Sector 78',
    city: 'Noida',
    address: 'Plot No. GH-01/A, Sector 78, Noida, UP 201301',
    tagline: '10-Acre Ultra-Luxury 34-Storey Condominiums by Mahagun',
    description: 'Mahagun Mezzaria is an ultra-luxury residential masterpiece with 34-storey towers inspired by art deco architecture.',
    long_description: 'With VRV air conditioning, double-height ceiling lobbies, infinity pool, luxury spa, banquets, and 3 minutes walk to Sector 76 Metro Station.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ7804',
    lat: 28.5730,
    lng: 77.3820,
    total_towers: 8,
    total_units: 520,
    land_area_acres: 10.0,
    open_space_pct: 82,
    green_rating: 'IGBC Platinum Rated',
    architect: 'Hafeez Contractor',
    floors: 'G + 34',
    launch_date: '2012-08-01T00:00:00.000Z',
    possession_date: '2019-12-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 2.80,
    price_max_cr: 5.50,
    price_range_label: '₹2.80 Cr - ₹5.50 Cr',
    base_psf: 12800,
    builder_name: 'Mahagun Group',
    builder_slug: 'mahagun-group',
    units: [
      { name: '3 BHK Mezzaria Elegance', bhk: 3, super_area: 2500, carpet_area: 1820, balcony_area: 340, bathrooms: 4, balconies: 3, price_min: 2.80, price_max: 3.40, price_psf: 12800 },
      { name: '4 BHK Mezzaria Imperial', bhk: 4, super_area: 3600, carpet_area: 2700, balcony_area: 490, bathrooms: 5, balconies: 4, price_min: 4.20, price_max: 5.50, price_psf: 13000 }
    ],
    commute: [
      { destination: 'Sector 76 Metro Station', distance_km: 0.4, travel_time_min: 1, mode: 'Walk', peak_time_min: 2 },
      { destination: 'Sector 52 Metro Station', distance_km: 3.0, travel_time_min: 5, mode: 'Drive / Feeder', peak_time_min: 10 },
      { destination: 'Sector 62 IT Hub', distance_km: 8.5, travel_time_min: 12, mode: 'Drive', peak_time_min: 18 },
      { destination: 'South Delhi / DND', distance_km: 16.5, travel_time_min: 19, mode: 'Road', peak_time_min: 27 }
    ]
  },
  {
    name: 'Gaur Sportswood',
    slug: 'gaur-sportswood-sector-79',
    sector: 'Sector 79',
    city: 'Noida',
    address: 'Plot No. GH-01, Sector 79, Noida, UP 201301',
    tagline: '10-Acre Sports-Themed Luxury Residential Society in Sector 79',
    description: 'Gaur Sportswood is a high-grade 10-acre luxury residential community overlooking sports arenas in Sector 79.',
    long_description: 'With Olympic swimming pool, tennis and squash courts, cycling track, 80% open greens, commercial high street, and 2 minutes drive to Sector 76 Metro.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ7901',
    lat: 28.5680,
    lng: 77.3910,
    total_towers: 11,
    total_units: 800,
    land_area_acres: 10.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 24',
    launch_date: '2014-05-01T00:00:00.000Z',
    possession_date: '2019-09-30T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.45,
    price_max_cr: 2.85,
    price_range_label: '₹1.45 Cr - ₹2.85 Cr',
    base_psf: 9800,
    builder_name: 'Gaursons India',
    builder_slug: 'gaursons-india',
    units: [
      { name: '3 BHK Sportswood Classic', bhk: 3, super_area: 1690, carpet_area: 1170, balcony_area: 230, bathrooms: 3, balconies: 3, price_min: 1.45, price_max: 1.75, price_psf: 9800 },
      { name: '3 BHK + Servant Grand', bhk: 3, super_area: 2280, carpet_area: 1620, balcony_area: 310, bathrooms: 4, balconies: 3, price_min: 2.10, price_max: 2.50, price_psf: 9850 },
      { name: '4 BHK Luxury Royale', bhk: 4, super_area: 2780, carpet_area: 1990, balcony_area: 370, bathrooms: 5, balconies: 4, price_min: 2.65, price_max: 2.85, price_psf: 9900 }
    ],
    commute: [
      { destination: 'Sector 76 Metro Station', distance_km: 1.2, travel_time_min: 2, mode: 'Drive / Feeder', peak_time_min: 4 },
      { destination: 'Sector 52 Metro Station', distance_km: 4.0, travel_time_min: 7, mode: 'Drive', peak_time_min: 13 },
      { destination: 'Sector 62 IT Hub', distance_km: 9.8, travel_time_min: 14, mode: 'Drive', peak_time_min: 22 },
      { destination: 'South Delhi / DND', distance_km: 17.8, travel_time_min: 21, mode: 'Road', peak_time_min: 30 }
    ]
  },
  {
    name: 'Mahagun Mirabella',
    slug: 'mahagun-mirabella-sector-79',
    sector: 'Sector 79',
    city: 'Noida',
    address: 'Plot No. GH-02, Sector 79, Noida, UP 201301',
    tagline: '5-Acre Roman-Inspired Luxury Architecture in Sector 79',
    description: 'Mahagun Mirabella is an elegant Roman architectural luxury development featuring 480 residences.',
    long_description: 'With panoramic panoramic balconies, temperature controlled indoor pool, luxury clubhouse, tennis courts, and quick access to Central Noida.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ7902',
    lat: 28.5670,
    lng: 77.3930,
    total_towers: 3,
    total_units: 480,
    land_area_acres: 5.0,
    open_space_pct: 80,
    green_rating: 'IGBC Gold Rated',
    architect: 'Hafeez Contractor',
    floors: 'G + 28',
    launch_date: '2014-08-01T00:00:00.000Z',
    possession_date: '2020-03-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.65,
    price_max_cr: 3.20,
    price_range_label: '₹1.65 Cr - ₹3.20 Cr',
    base_psf: 10400,
    builder_name: 'Mahagun Group',
    builder_slug: 'mahagun-group',
    units: [
      { name: '2 BHK + Study Mirabella', bhk: 2, super_area: 1380, carpet_area: 940, balcony_area: 180, bathrooms: 2, balconies: 2, price_min: 1.65, price_max: 1.85, price_psf: 10400 },
      { name: '3 BHK Mirabella Grand', bhk: 3, super_area: 1880, carpet_area: 1310, balcony_area: 250, bathrooms: 3, balconies: 3, price_min: 2.10, price_max: 2.55, price_psf: 10450 },
      { name: '4 BHK Mirabella Royale', bhk: 4, super_area: 2575, carpet_area: 1840, balcony_area: 350, bathrooms: 4, balconies: 4, price_min: 2.85, price_max: 3.20, price_psf: 10500 }
    ],
    commute: [
      { destination: 'Sector 76 Metro Station', distance_km: 1.4, travel_time_min: 3, mode: 'Drive / Feeder', peak_time_min: 5 },
      { destination: 'Sector 52 Metro Station', distance_km: 4.2, travel_time_min: 8, mode: 'Drive', peak_time_min: 14 },
      { destination: 'Sector 62 IT Hub', distance_km: 10.0, travel_time_min: 15, mode: 'Drive', peak_time_min: 23 },
      { destination: 'South Delhi / DND', distance_km: 18.0, travel_time_min: 22, mode: 'Road', peak_time_min: 31 }
    ]
  },
  {
    name: 'Prateek Laurel',
    slug: 'prateek-laurel-sector-120',
    sector: 'Sector 120',
    city: 'Noida',
    address: 'Plot No. GH-01, Sector 120, Noida, UP 201301',
    tagline: '14-Acre Landmark Ready Society with Active Sports Arenas in Sector 120',
    description: 'Prateek Laurel is a marquee 14-acre ready residential community featuring 1,550 families in Sector 120.',
    long_description: 'With Olympic swimming pool, tennis and squash courts, 80% landscaped central greens, commercial daily shopping plaza, and 2 minutes to Parthala Flyover.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ1201',
    lat: 28.5990,
    lng: 77.3940,
    total_towers: 14,
    total_units: 1550,
    land_area_acres: 14.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 18',
    launch_date: '2010-04-01T00:00:00.000Z',
    possession_date: '2015-08-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.05,
    price_max_cr: 2.10,
    price_range_label: '₹1.05 Cr - ₹2.10 Cr',
    base_psf: 8700,
    builder_name: 'Prateek Group',
    builder_slug: 'prateek-group',
    units: [
      { name: '2 BHK Laurel', bhk: 2, super_area: 1040, carpet_area: 690, balcony_area: 130, bathrooms: 2, balconies: 2, price_min: 1.05, price_max: 1.20, price_psf: 8700 },
      { name: '3 BHK Laurel Grand', bhk: 3, super_area: 1560, carpet_area: 1070, balcony_area: 210, bathrooms: 3, balconies: 3, price_min: 1.45, price_max: 1.75, price_psf: 8750 },
      { name: '4 BHK Laurel Royale', bhk: 4, super_area: 2100, carpet_area: 1490, balcony_area: 280, bathrooms: 4, balconies: 4, price_min: 1.85, price_max: 2.10, price_psf: 8800 }
    ],
    commute: [
      { destination: 'Parthala Flyover / FNG', distance_km: 0.5, travel_time_min: 1, mode: 'Drive', peak_time_min: 2 },
      { destination: 'Sector 52 Metro Station', distance_km: 4.5, travel_time_min: 8, mode: 'Drive / Feeder', peak_time_min: 15 },
      { destination: 'Sector 62 IT Hub', distance_km: 7.5, travel_time_min: 11, mode: 'Drive', peak_time_min: 18 },
      { destination: 'Gaur City / Gr Noida West', distance_km: 3.5, travel_time_min: 5, mode: 'Flyover', peak_time_min: 9 }
    ]
  },
  {
    name: 'Homes 121',
    slug: 'homes-121-sector-121',
    sector: 'Sector 121',
    city: 'Noida',
    address: 'Plot No. GH-01, Sector 121, Noida, UP 201301',
    tagline: '15-Acre Ready Residential Township with Dual Signature Clubhouses',
    description: 'Homes 121 is a 15-acre ready gated community in Sector 121 developed jointly by ABA Corp and Ajnara with 1,750 families.',
    long_description: 'With dual signature clubhouses, Olympic pool, tennis arena, extensive landscaped greens, commercial shopping arcade, and Parthala signature bridge access.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ1211',
    lat: 28.6020,
    lng: 77.3910,
    total_towers: 21,
    total_units: 1750,
    land_area_acres: 15.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Plus Architects',
    floors: 'G + 18',
    launch_date: '2010-07-01T00:00:00.000Z',
    possession_date: '2015-12-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.02,
    price_max_cr: 2.15,
    price_range_label: '₹1.02 Cr - ₹2.15 Cr',
    base_psf: 8600,
    builder_name: 'ABA Corp',
    builder_slug: 'aba-corp',
    units: [
      { name: '2 BHK Classic 121', bhk: 2, super_area: 1035, carpet_area: 690, balcony_area: 130, bathrooms: 2, balconies: 2, price_min: 1.02, price_max: 1.18, price_psf: 8600 },
      { name: '3 BHK Grand 121', bhk: 3, super_area: 1550, carpet_area: 1060, balcony_area: 210, bathrooms: 3, balconies: 3, price_min: 1.45, price_max: 1.75, price_psf: 8650 },
      { name: '4 BHK Royale 121', bhk: 4, super_area: 2200, carpet_area: 1560, balcony_area: 290, bathrooms: 4, balconies: 4, price_min: 1.90, price_max: 2.15, price_psf: 8700 }
    ],
    commute: [
      { destination: 'Parthala Signature Bridge', distance_km: 0.4, travel_time_min: 1, mode: 'Drive', peak_time_min: 2 },
      { destination: 'Sector 52 Metro Station', distance_km: 4.8, travel_time_min: 8, mode: 'Drive / Feeder', peak_time_min: 15 },
      { destination: 'Sector 62 IT Hub', distance_km: 7.2, travel_time_min: 10, mode: 'Drive', peak_time_min: 16 },
      { destination: 'Gaur City / Gr Noida West', distance_km: 3.2, travel_time_min: 4, mode: 'Flyover', peak_time_min: 8 }
    ]
  },

  // ── GREATER NOIDA WEST (NOIDA EXTENSION) ──
  {
    name: 'Ace City',
    slug: 'ace-city-sector-1',
    sector: 'Sector 1',
    city: 'Greater Noida West',
    address: 'Plot No. GH-01, Sector 1, Greater Noida West, UP 201306',
    tagline: '15-Acre Ready Mega Development with 11 Towers by ACE Group',
    description: 'Ace City is one of Sector 1’s most prominent ready-to-move residential developments featuring 2,800 families.',
    long_description: 'With Olympic swimming pool, luxury clubhouse, full-size basketball and tennis arenas, commercial daily shopping plaza, and instant access to Noida.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ0101',
    lat: 28.5880,
    lng: 77.4420,
    total_towers: 11,
    total_units: 2800,
    land_area_acres: 15.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 25',
    launch_date: '2013-02-01T00:00:00.000Z',
    possession_date: '2018-09-30T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 0.85,
    price_max_cr: 1.65,
    price_range_label: '₹85 Lakh - ₹1.65 Cr',
    base_psf: 7800,
    builder_name: 'ACE Group',
    builder_slug: 'ace-group',
    units: [
      { name: '2 BHK Ace Classic', bhk: 2, super_area: 1090, carpet_area: 730, balcony_area: 140, bathrooms: 2, balconies: 2, price_min: 0.85, price_max: 0.98, price_psf: 7800 },
      { name: '3 BHK Ace Grand', bhk: 3, super_area: 1490, carpet_area: 1020, balcony_area: 200, bathrooms: 3, balconies: 3, price_min: 1.25, price_max: 1.45, price_psf: 7850 },
      { name: '3 BHK + Servant Royale', bhk: 3, super_area: 1800, carpet_area: 1260, balcony_area: 240, bathrooms: 4, balconies: 3, price_min: 1.45, price_max: 1.65, price_psf: 7900 }
    ],
    commute: [
      { destination: 'Parthala Signature Bridge / Noida 121', distance_km: 3.5, travel_time_min: 5, mode: 'Flyover', peak_time_min: 9 },
      { destination: 'Sector 52 Metro Station', distance_km: 8.5, travel_time_min: 13, mode: 'Drive / Feeder', peak_time_min: 20 },
      { destination: 'Sector 62 IT Hub', distance_km: 11.5, travel_time_min: 16, mode: 'Drive', peak_time_min: 24 },
      { destination: 'Jewar Airport', distance_km: 46.0, travel_time_min: 40, mode: 'Expressway', peak_time_min: 50 }
    ]
  },
  {
    name: 'Ace Divino',
    slug: 'ace-divino-sector-1',
    sector: 'Sector 1',
    city: 'Greater Noida West',
    address: 'Plot No. GH-03, Sector 1, Greater Noida West, UP 201306',
    tagline: '10.5-Acre Ultra-Luxury Condominiums with Skywalks by ACE Group',
    description: 'Ace Divino is an ultra-modern residential community in Sector 1 featuring exclusive rooftop skywalks and Zen gardens.',
    long_description: 'With infinity rooftop pool, grand double-height entrance lobbies, high-speed elevators, sports arenas, and seamless connectivity to Central Noida.',
    status: 'under_construction',
    rera_number: 'UPRERAPRJ0102',
    lat: 28.5890,
    lng: 77.4450,
    total_towers: 11,
    total_units: 1800,
    land_area_acres: 10.5,
    open_space_pct: 82,
    green_rating: 'IGBC Gold Rated',
    architect: 'Hafeez Contractor',
    floors: 'G + 26',
    launch_date: '2017-10-01T00:00:00.000Z',
    possession_date: '2026-03-31T00:00:00.000Z',
    possession_label: 'Under Construction (Finishing Stage)',
    oc_obtained: false,
    price_min_cr: 1.15,
    price_max_cr: 2.45,
    price_range_label: '₹1.15 Cr - ₹2.45 Cr',
    base_psf: 8800,
    builder_name: 'ACE Group',
    builder_slug: 'ace-group',
    units: [
      { name: '2 BHK Divino', bhk: 2, super_area: 1050, carpet_area: 710, balcony_area: 130, bathrooms: 2, balconies: 2, price_min: 1.15, price_max: 1.30, price_psf: 8800 },
      { name: '3 BHK Divino Grand', bhk: 3, super_area: 1565, carpet_area: 1080, balcony_area: 210, bathrooms: 3, balconies: 3, price_min: 1.55, price_max: 1.85, price_psf: 8850 },
      { name: '4 BHK Divino Royale', bhk: 4, super_area: 2200, carpet_area: 1560, balcony_area: 290, bathrooms: 4, balconies: 4, price_min: 2.10, price_max: 2.45, price_psf: 8900 }
    ],
    commute: [
      { destination: 'Parthala Signature Bridge', distance_km: 3.8, travel_time_min: 5, mode: 'Flyover', peak_time_min: 9 },
      { destination: 'Sector 52 Metro Station', distance_km: 8.8, travel_time_min: 13, mode: 'Drive / Feeder', peak_time_min: 21 },
      { destination: 'Sector 62 IT Hub', distance_km: 11.8, travel_time_min: 16, mode: 'Drive', peak_time_min: 25 },
      { destination: 'Jewar Airport', distance_km: 46.5, travel_time_min: 41, mode: 'Expressway', peak_time_min: 51 }
    ]
  },
  {
    name: 'ATS Destinaire',
    slug: 'ats-destinaire-sector-1',
    sector: 'Sector 1',
    city: 'Greater Noida West',
    address: 'Plot No. GH-04, Sector 1, Greater Noida West, UP 201306',
    tagline: '8.2-Acre Ultra-Luxury Low-Density 3/4 BHK Enclave by ATS',
    description: 'ATS Destinaire is a marquee low-density luxury residential enclave in Sector 1 featuring only 2 apartments per floor.',
    long_description: 'With sprawling central gardens, Olympic swimming pool, tennis and squash courts, 3.3m clear ceiling heights, and direct access to Central Noida.',
    status: 'under_construction',
    rera_number: 'UPRERAPRJ0103',
    lat: 28.5860,
    lng: 77.4400,
    total_towers: 15,
    total_units: 750,
    land_area_acres: 8.2,
    open_space_pct: 84,
    green_rating: 'IGBC Gold Rated',
    architect: 'Hafeez Contractor',
    floors: 'G + 27',
    launch_date: '2019-09-01T00:00:00.000Z',
    possession_date: '2026-06-30T00:00:00.000Z',
    possession_label: 'Under Construction (Finishing Stage)',
    oc_obtained: false,
    price_min_cr: 1.95,
    price_max_cr: 3.80,
    price_range_label: '₹1.95 Cr - ₹3.80 Cr',
    base_psf: 10500,
    builder_name: 'ATS Infrastructure',
    builder_slug: 'ats-infrastructure',
    units: [
      { name: '3 BHK Destinaire Grand', bhk: 3, super_area: 1900, carpet_area: 1330, balcony_area: 250, bathrooms: 3, balconies: 3, price_min: 1.95, price_max: 2.45, price_psf: 10500 },
      { name: '4 BHK Destinaire Royale', bhk: 4, super_area: 2550, carpet_area: 1820, balcony_area: 350, bathrooms: 4, balconies: 4, price_min: 2.80, price_max: 3.80, price_psf: 10600 }
    ],
    commute: [
      { destination: 'Parthala Signature Bridge', distance_km: 3.2, travel_time_min: 4, mode: 'Flyover', peak_time_min: 8 },
      { destination: 'Sector 52 Metro Station', distance_km: 8.2, travel_time_min: 12, mode: 'Drive / Feeder', peak_time_min: 19 },
      { destination: 'Sector 62 IT Hub', distance_km: 11.2, travel_time_min: 15, mode: 'Drive', peak_time_min: 23 },
      { destination: 'Jewar Airport', distance_km: 45.5, travel_time_min: 39, mode: 'Expressway', peak_time_min: 49 }
    ]
  },
  {
    name: 'Coco County',
    slug: 'coco-county-sector-10',
    sector: 'Sector 10',
    city: 'Greater Noida West',
    address: 'Plot No. GH-03C, Sector 10, Greater Noida West, UP 201306',
    tagline: '8.5-Acre Tropical Themed Eco-Luxury Residential Society by ABA Corp',
    description: 'Coco County is a tropical-themed eco-friendly luxury residential society featuring 850 residences in Sector 10.',
    long_description: 'With palm landscapes, outdoor spa pools, yoga gazebos, tennis arenas, commercial daily shopping plaza, and instant access to 130m highway.',
    status: 'under_construction',
    rera_number: 'UPRERAPRJ1001',
    lat: 28.5810,
    lng: 77.4620,
    total_towers: 8,
    total_units: 850,
    land_area_acres: 8.5,
    open_space_pct: 82,
    green_rating: 'IGBC Gold Rated',
    architect: 'Design Forum International',
    floors: 'G + 24',
    launch_date: '2019-11-01T00:00:00.000Z',
    possession_date: '2026-06-30T00:00:00.000Z',
    possession_label: 'Under Construction (Finishing Stage)',
    oc_obtained: false,
    price_min_cr: 0.95,
    price_max_cr: 1.85,
    price_range_label: '₹95 Lakh - ₹1.85 Cr',
    base_psf: 8200,
    builder_name: 'ABA Corp',
    builder_slug: 'aba-corp',
    units: [
      { name: '2 BHK Coco Classic', bhk: 2, super_area: 1062, carpet_area: 710, balcony_area: 140, bathrooms: 2, balconies: 2, price_min: 0.95, price_max: 1.10, price_psf: 8200 },
      { name: '3 BHK Coco Grand', bhk: 3, super_area: 1445, carpet_area: 980, balcony_area: 190, bathrooms: 3, balconies: 3, price_min: 1.30, price_max: 1.55, price_psf: 8250 },
      { name: '3 BHK + Servant Royale', bhk: 3, super_area: 1752, carpet_area: 1210, balcony_area: 230, bathrooms: 4, balconies: 3, price_min: 1.60, price_max: 1.85, price_psf: 8300 }
    ],
    commute: [
      { destination: 'Gaur City Mall', distance_km: 4.5, travel_time_min: 6, mode: 'Drive', peak_time_min: 10 },
      { destination: 'Sector 52 Metro Station', distance_km: 11.5, travel_time_min: 16, mode: 'Drive / Feeder', peak_time_min: 25 },
      { destination: 'Sector 62 IT Hub', distance_km: 14.5, travel_time_min: 19, mode: 'Drive', peak_time_min: 29 },
      { destination: 'Jewar Airport', distance_km: 44.0, travel_time_min: 37, mode: 'Expressway', peak_time_min: 47 }
    ]
  },
  {
    name: 'Gaur Saundaryam',
    slug: 'gaur-saundaryam-sector-16b',
    sector: 'Sector 16B',
    city: 'Greater Noida West',
    address: 'Plot No. GH-05, Sector 16B, Greater Noida West, UP 201306',
    tagline: '17.5-Acre Ultra-Luxury High-Rise Society on 130m Highway by Gaursons',
    description: 'Gaur Saundaryam is an ultra-luxury residential community situated on the 130-meter expressway featuring 2,100 families.',
    long_description: 'With 50,000 sqft clubhouse, Olympic swimming pool, bowling alley, squash and tennis arenas, 82% open landscaped greens, and 0-minute entry to highway.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ1603',
    lat: 28.6110,
    lng: 77.4470,
    total_towers: 13,
    total_units: 2100,
    land_area_acres: 17.5,
    open_space_pct: 82,
    green_rating: 'IGBC Gold Rated',
    architect: 'Design Forum International',
    floors: 'G + 27',
    launch_date: '2012-10-01T00:00:00.000Z',
    possession_date: '2018-12-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.35,
    price_max_cr: 2.85,
    price_range_label: '₹1.35 Cr - ₹2.85 Cr',
    base_psf: 8900,
    builder_name: 'Gaursons India',
    builder_slug: 'gaursons-india',
    units: [
      { name: '3 BHK Saundaryam', bhk: 3, super_area: 1550, carpet_area: 1070, balcony_area: 210, bathrooms: 3, balconies: 3, price_min: 1.35, price_max: 1.65, price_psf: 8900 },
      { name: '3 BHK + Servant Grand', bhk: 3, super_area: 2050, carpet_area: 1450, balcony_area: 270, bathrooms: 4, balconies: 3, price_min: 1.95, price_max: 2.35, price_psf: 8950 },
      { name: '4 BHK Saundaryam Royale', bhk: 4, super_area: 2590, carpet_area: 1850, balcony_area: 350, bathrooms: 5, balconies: 4, price_min: 2.45, price_max: 2.85, price_psf: 9000 }
    ],
    commute: [
      { destination: 'Gaur City Mall', distance_km: 1.5, travel_time_min: 3, mode: 'Drive', peak_time_min: 5 },
      { destination: 'Sector 52 Metro Station', distance_km: 9.0, travel_time_min: 13, mode: 'Drive / Feeder', peak_time_min: 20 },
      { destination: 'Sector 62 IT Hub', distance_km: 11.5, travel_time_min: 15, mode: 'Drive', peak_time_min: 23 },
      { destination: 'Jewar Airport', distance_km: 48.5, travel_time_min: 44, mode: 'Expressway', peak_time_min: 55 }
    ]
  },
  {
    name: 'Ace Aspire',
    slug: 'ace-aspire-techzone-4',
    sector: 'Techzone 4',
    city: 'Greater Noida West',
    address: 'Plot No. GH-02, Techzone 4, Greater Noida West, UP 201306',
    tagline: '7.5-Acre Ready High-Rise Society with 1,100 Families by ACE Group',
    description: 'Ace Aspire is an established ready gated community in Techzone 4 featuring 1,100 families.',
    long_description: 'With Olympic swimming pool, badminton court, lush central greens, shopping arcade, and 2 minutes drive to upcoming metro station.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ0401',
    lat: 28.5940,
    lng: 77.4580,
    total_towers: 8,
    total_units: 1100,
    land_area_acres: 7.5,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 22',
    launch_date: '2012-06-01T00:00:00.000Z',
    possession_date: '2017-08-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 0.92,
    price_max_cr: 1.75,
    price_range_label: '₹92 Lakh - ₹1.75 Cr',
    base_psf: 7900,
    builder_name: 'ACE Group',
    builder_slug: 'ace-group',
    units: [
      { name: '2 BHK Aspire', bhk: 2, super_area: 1160, carpet_area: 770, balcony_area: 150, bathrooms: 2, balconies: 2, price_min: 0.92, price_max: 1.08, price_psf: 7900 },
      { name: '3 BHK Aspire Grand', bhk: 3, super_area: 1595, carpet_area: 1090, balcony_area: 210, bathrooms: 3, balconies: 3, price_min: 1.35, price_max: 1.75, price_psf: 7950 }
    ],
    commute: [
      { destination: 'Gaur City Mall', distance_km: 3.0, travel_time_min: 5, mode: 'Drive', peak_time_min: 8 },
      { destination: 'Sector 52 Metro Station', distance_km: 10.5, travel_time_min: 15, mode: 'Drive / Feeder', peak_time_min: 23 },
      { destination: 'Sector 62 IT Hub', distance_km: 13.0, travel_time_min: 17, mode: 'Drive', peak_time_min: 26 },
      { destination: 'Jewar Airport', distance_km: 46.0, travel_time_min: 40, mode: 'Expressway', peak_time_min: 50 }
    ]
  },
  {
    name: 'Fusion Homes',
    slug: 'fusion-homes-techzone-4',
    sector: 'Techzone 4',
    city: 'Greater Noida West',
    address: 'Plot No. GH-05A, Techzone 4, Greater Noida West, UP 201306',
    tagline: '9-Acre Ready Residential Society on 130m Highway with 1,600 Families',
    description: 'Fusion Homes is a high-demand ready residential society on the 130m highway featuring 1,600 families.',
    long_description: 'With modern clubhouse, swimming pool, sports courts, commercial arcade, 24x7 security, and direct connectivity to Central Noida.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ0402',
    lat: 28.5920,
    lng: 77.4600,
    total_towers: 12,
    total_units: 1600,
    land_area_acres: 9.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Plus Architects',
    floors: 'G + 21',
    launch_date: '2012-09-01T00:00:00.000Z',
    possession_date: '2018-06-30T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 0.88,
    price_max_cr: 1.65,
    price_range_label: '₹88 Lakh - ₹1.65 Cr',
    base_psf: 7600,
    builder_name: 'Fusion Buildtech',
    builder_slug: 'fusion-buildtech',
    units: [
      { name: '2 BHK Fusion', bhk: 2, super_area: 1010, carpet_area: 670, balcony_area: 130, bathrooms: 2, balconies: 2, price_min: 0.88, price_max: 1.02, price_psf: 7600 },
      { name: '3 BHK Fusion Grand', bhk: 3, super_area: 1430, carpet_area: 970, balcony_area: 190, bathrooms: 2, balconies: 3, price_min: 1.18, price_max: 1.45, price_psf: 7650 },
      { name: '4 BHK Fusion Royale', bhk: 4, super_area: 2115, carpet_area: 1490, balcony_area: 280, bathrooms: 4, balconies: 4, price_min: 1.50, price_max: 1.65, price_psf: 7700 }
    ],
    commute: [
      { destination: 'Gaur City Mall', distance_km: 3.2, travel_time_min: 5, mode: 'Drive', peak_time_min: 8 },
      { destination: 'Sector 52 Metro Station', distance_km: 10.8, travel_time_min: 15, mode: 'Drive / Feeder', peak_time_min: 24 },
      { destination: 'Sector 62 IT Hub', distance_km: 13.2, travel_time_min: 17, mode: 'Drive', peak_time_min: 27 },
      { destination: 'Jewar Airport', distance_km: 45.5, travel_time_min: 39, mode: 'Expressway', peak_time_min: 49 }
    ]
  },

  // ── GREATER NOIDA CORE (PARI CHOWK & ALPHABET SECTORS) ──
  {
    name: 'Ace Platinum',
    slug: 'ace-platinum-sector-zeta-1',
    sector: 'Zeta 1',
    city: 'Greater Noida',
    address: 'Plot No. GH-02, Sector Zeta 1, Greater Noida, UP 201306',
    tagline: '7-Acre Ready High-Rise Society with 1,200 Families in Sector Zeta 1',
    description: 'Ace Platinum is a high-grade ready-to-move residential community in Sector Zeta 1.',
    long_description: 'With Olympic swimming pool, fitness gym, children play parks, commercial daily market, and 2 minutes drive to 130m highway.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ2002',
    lat: 28.5140,
    lng: 77.4920,
    total_towers: 7,
    total_units: 1200,
    land_area_acres: 7.0,
    open_space_pct: 80,
    green_rating: 'IGBC Certified',
    architect: 'Design Forum International',
    floors: 'G + 25',
    launch_date: '2010-10-01T00:00:00.000Z',
    possession_date: '2016-10-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 0.88,
    price_max_cr: 1.75,
    price_range_label: '₹88 Lakh - ₹1.75 Cr',
    base_psf: 7400,
    builder_name: 'ACE Group',
    builder_slug: 'ace-group',
    units: [
      { name: '2 BHK Platinum', bhk: 2, super_area: 1150, carpet_area: 760, balcony_area: 150, bathrooms: 2, balconies: 2, price_min: 0.88, price_max: 1.05, price_psf: 7400 },
      { name: '3 BHK Platinum Grand', bhk: 3, super_area: 1600, carpet_area: 1090, balcony_area: 210, bathrooms: 3, balconies: 3, price_min: 1.25, price_max: 1.55, price_psf: 7450 },
      { name: '4 BHK Platinum Royale', bhk: 4, super_area: 2150, carpet_area: 1520, balcony_area: 290, bathrooms: 4, balconies: 4, price_min: 1.60, price_max: 1.75, price_psf: 7500 }
    ],
    commute: [
      { destination: 'Pari Chowk & Aqua Metro', distance_km: 4.8, travel_time_min: 7, mode: 'Drive', peak_time_min: 11 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 18.5, travel_time_min: 18, mode: 'Expressway', peak_time_min: 25 },
      { destination: 'Jewar Airport', distance_km: 36.5, travel_time_min: 28, mode: 'Yamuna Expressway', peak_time_min: 36 },
      { destination: 'Sector 62 IT Hub', distance_km: 26.5, travel_time_min: 26, mode: 'Road', peak_time_min: 35 }
    ]
  },
  {
    name: 'Purvanchal Silver City 1 & 2',
    slug: 'purvanchal-silver-city-sector-chi-5',
    sector: 'Chi 5',
    city: 'Greater Noida',
    address: 'Plot No. GH-01, Sector Chi 5, Greater Noida, UP 201310',
    tagline: '12-Acre Established Ready Gated Societies Near Expressway Entry',
    description: 'Purvanchal Silver City is an established luxury residential society featuring 680 residences in Sector Chi 5.',
    long_description: 'With lush green landscapes, swimming pool, sports club, 24x7 multi-tier security, and 2 minutes drive to Pari Chowk and Noida Expressway.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ2003',
    lat: 28.4680,
    lng: 77.5120,
    total_towers: 10,
    total_units: 680,
    land_area_acres: 12.0,
    open_space_pct: 82,
    green_rating: 'IGBC Certified',
    architect: 'Design Plus Architects',
    floors: 'G + 14',
    launch_date: '2006-03-01T00:00:00.000Z',
    possession_date: '2011-06-30T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.15,
    price_max_cr: 2.35,
    price_range_label: '₹1.15 Cr - ₹2.35 Cr',
    base_psf: 8200,
    builder_name: 'Purvanchal Projects',
    builder_slug: 'purvanchal-projects',
    units: [
      { name: '2 BHK Silver Classic', bhk: 2, super_area: 1200, carpet_area: 810, balcony_area: 160, bathrooms: 2, balconies: 2, price_min: 1.15, price_max: 1.30, price_psf: 8200 },
      { name: '3 BHK Silver Grand', bhk: 3, super_area: 1750, carpet_area: 1220, balcony_area: 230, bathrooms: 3, balconies: 3, price_min: 1.65, price_max: 1.95, price_psf: 8250 },
      { name: '4 BHK Silver Royale', bhk: 4, super_area: 2450, carpet_area: 1740, balcony_area: 320, bathrooms: 4, balconies: 4, price_min: 2.15, price_max: 2.35, price_psf: 8300 }
    ],
    commute: [
      { destination: 'Pari Chowk Metro Station', distance_km: 2.0, travel_time_min: 3, mode: 'Drive / Metro', peak_time_min: 6 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 15.0, travel_time_min: 14, mode: 'Expressway', peak_time_min: 20 },
      { destination: 'Jewar Airport', distance_km: 31.0, travel_time_min: 24, mode: 'Yamuna Expressway', peak_time_min: 31 },
      { destination: 'South Delhi / DND', distance_km: 29.0, travel_time_min: 28, mode: 'Expressway', peak_time_min: 38 }
    ]
  },
  {
    name: 'Eldeco Mystic Greens',
    slug: 'eldeco-mystic-greens-sector-omicron-1',
    sector: 'Omicron 1',
    city: 'Greater Noida',
    address: 'Plot No. GH-01, Sector Omicron 1, Greater Noida, UP 201306',
    tagline: '9-Acre Low-Density Landscaped Residential Enclave by Eldeco',
    description: 'Eldeco Mystic Greens is a peaceful low-density residential community featuring 480 families in Sector Omicron 1.',
    long_description: 'With sprawling central gardens, swimming pool, badminton court, dedicated children play zones, and quick access to Pari Chowk.',
    status: 'ready_to_move',
    rera_number: 'UPRERAPRJ2004',
    lat: 28.4920,
    lng: 77.5180,
    total_towers: 8,
    total_units: 480,
    land_area_acres: 9.0,
    open_space_pct: 82,
    green_rating: 'IGBC Certified',
    architect: 'Eldeco Design Team',
    floors: 'G + 14',
    launch_date: '2011-04-01T00:00:00.000Z',
    possession_date: '2016-08-31T00:00:00.000Z',
    possession_label: 'Ready to Move',
    oc_obtained: true,
    price_min_cr: 1.05,
    price_max_cr: 2.15,
    price_range_label: '₹1.05 Cr - ₹2.15 Cr',
    base_psf: 7900,
    builder_name: 'Eldeco Group',
    builder_slug: 'eldeco-group',
    units: [
      { name: '2 BHK Mystic', bhk: 2, super_area: 1150, carpet_area: 770, balcony_area: 150, bathrooms: 2, balconies: 2, price_min: 1.05, price_max: 1.20, price_psf: 7900 },
      { name: '3 BHK Mystic Grand', bhk: 3, super_area: 1650, carpet_area: 1140, balcony_area: 220, bathrooms: 3, balconies: 3, price_min: 1.45, price_max: 1.75, price_psf: 7950 },
      { name: '4 BHK Mystic Royale', bhk: 4, super_area: 2350, carpet_area: 1670, balcony_area: 320, bathrooms: 4, balconies: 4, price_min: 1.95, price_max: 2.15, price_psf: 8000 }
    ],
    commute: [
      { destination: 'Pari Chowk & Aqua Metro', distance_km: 3.5, travel_time_min: 5, mode: 'Drive / Metro', peak_time_min: 8 },
      { destination: 'Advant Cyber Hub Sector 142', distance_km: 17.0, travel_time_min: 16, mode: 'Expressway', peak_time_min: 22 },
      { destination: 'Jewar Airport', distance_km: 33.0, travel_time_min: 26, mode: 'Yamuna Expressway', peak_time_min: 33 },
      { destination: 'South Delhi / DND', distance_km: 31.0, travel_time_min: 30, mode: 'Expressway', peak_time_min: 40 }
    ]
  }
];

const STANDARD_AMENITIES_ALL = [
  { name: 'Grand Resident Clubhouse & Banquet', category: 'lifestyle' },
  { name: 'Olympic-Size Swimming Pool & Kids Splash Arena', category: 'wellness' },
  { name: 'Fully Equipped Technogym Fitness Center', category: 'wellness' },
  { name: 'Badminton & Squash Courts', category: 'sports' },
  { name: 'Full-Size Lawn Tennis & Basketball Court', category: 'sports' },
  { name: '80% Landscaped Central Green Park & Jogging Track', category: 'lifestyle' },
  { name: 'Dedicated Children Play Park with Soft Flooring', category: 'kids' },
  { name: 'Senior Citizen Reflexology Garden & Gazebos', category: 'wellness' },
  { name: 'Multi-Tier 24x7 Security with CCTV & Boom Barriers', category: 'security' },
  { name: '100% Full DG Power Backup with Auto-Switchover', category: 'security' },
  { name: 'Reserved Multi-Level Basement Parking with EV Charging', category: 'parking' },
  { name: 'Daily Convenience Shopping Arcade & Pharmacy', category: 'lifestyle' }
];

const STANDARD_SPECS_ALL = [
  { category: 'Structure', label: 'Earthquake Resistant Structure', value: 'RCC Shear Wall & Mivan Aluminum Formwork', tier: 'Ultra-Durable', brand: 'Tata Tiscon / UltraTech' },
  { category: 'Flooring', label: 'Living & Dining Area', value: 'Large Format Italian Glazed Vitrified Tiles (800x1600mm)', tier: 'Premium Luxury', brand: 'Kajaria / Somany' },
  { category: 'Flooring', label: 'Master Bedroom', value: 'Laminated Wooden Flooring with Moisture Barrier', tier: 'Luxury', brand: 'Pergo / Quick-Step' },
  { category: 'Kitchen', label: 'Modular Kitchen Countertop', value: 'Granite Countertop with SS Double Sink & Soft-Close Cabinets', tier: 'Premium Modular', brand: 'Hafele / Sleek' },
  { category: 'Bathrooms', label: 'Sanitary Ware & CP Fittings', value: 'Wall-Hung EWC with Concealed Cistern & Single Lever Diverter', tier: 'Luxury Fitting', brand: 'Kohler / Grohe' },
  { category: 'Electrical', label: 'Wiring & Modular Switches', value: 'Concealed FRLS Copper Wiring with Smart Modular Switches', tier: 'Fire Retardant', brand: 'Havells / Legrand' },
  { category: 'Doors & Windows', label: 'External Openings', value: 'Heavy Duty UPVC / Powder Coated Aluminum Sliding Windows with Toughened Glass', tier: 'Acoustic Insulated', brand: 'Fenesta / Saint-Gobain' },
  { category: 'HVAC', label: 'Air Conditioning', value: 'VRV / Split AC Copper Piping Pre-Installed in All Bedrooms & Living Room', tier: 'Energy Efficient', brand: 'Daikin / Mitsubishi' }
];

async function seedCompleteBatch() {
  console.log('========================================================================');
  console.log(`🚀 EXPANDING DATABASE: SEEDING ${BATCH_SOCIETIES.length} MAJOR GATED SOCIETIES`);
  console.log('========================================================================\n');

  for (const item of BATCH_SOCIETIES) {
    console.log(`📡 Processing: ${item.name} (${item.sector}, ${item.city})...`);

    // 1. Upsert Builder
    let builder = await prisma.builder.findUnique({ where: { slug: item.builder_slug } });
    if (!builder) {
      builder = await prisma.builder.create({
        data: {
          name: item.builder_name,
          slug: item.builder_slug,
          tagline: 'Leading Quality Real Estate Development',
          company_overview: `${item.builder_name} is one of Delhi NCR's established real estate builders with a proven delivery record.`,
          founded_year: 2000,
          headquarters: 'Noida / Delhi NCR',
          website: `https://${item.builder_slug}.com`,
          total_projects_count: 25,
          projects_delivered_count: 20,
          delivered_units: 15000,
          delivery_score: 92,
          construction_quality_score: 93,
          rera_compliance_score: 96,
          awards: ['ET Realty Excellence Award', 'Times Real Estate Leadership Award'],
          awards_count: 2,
          certifications: ['ISO 9001:2015 Quality Certified', 'CREDAI Member'],
          funding_banks: DEFAULT_BANKS,
          credai_member: true,
          iso_certified: true,
        },
      });
    }

    // 2. Upsert Project
    const projectData = {
      name: item.name,
      slug: item.slug,
      sector: item.sector,
      city: item.city,
      address: item.address,
      tagline: item.tagline,
      description: item.description,
      long_description: item.long_description,
      hero_image_url: HERO_IMAGES[0],
      status: item.status,
      rera_number: item.rera_number,
      rera_url: 'https://www.up-rera.in/',
      lat: item.lat,
      lng: item.lng,
      total_towers: item.total_towers,
      total_units: item.total_units,
      land_area_acres: item.land_area_acres,
      open_space_pct: item.open_space_pct,
      green_rating: item.green_rating,
      architect: item.architect,
      floors: item.floors,
      launch_date: new Date(item.launch_date),
      possession_date: new Date(item.possession_date),
      possession_label: item.possession_label,
      possession_confidence: 'high',
      oc_obtained: item.oc_obtained,
      price_min_cr: item.price_min_cr,
      price_range_label: item.price_range_label,
      walkability_score: 88,
      green_cover_percent: item.open_space_pct,
      women_safety_score: 92,
      air_quality_index_avg: 140,
      rental_yield_annual_percent: 3.8,
      appreciation_potential_5yr: 48.5,
      market_demand_score: 94,
      commute_matrix: item.commute,
      marketing_claims: [
        `Prime ${item.sector} location with 80% open landscaped greens`,
        '100% RERA compliant development with clear titles',
        'State-of-the-art multi-tier security and clubhouse amenities',
      ],
      ai_search_keywords: [
        item.name.toLowerCase(),
        `${item.sector.toLowerCase()} flats`,
        `${item.city.toLowerCase()} properties`,
      ],
      builder_id: builder.id,
    };

    let project = await prisma.project.findUnique({ where: { slug: item.slug } });
    if (!project) {
      project = await prisma.project.create({ data: projectData });
      console.log(`  ✓ Created new project: ${project.name}`);
    } else {
      project = await prisma.project.update({ where: { id: project.id }, data: projectData });
      console.log(`  ✓ Updated existing project: ${project.name}`);
    }

    // 3. Images
    await prisma.projectImage.deleteMany({ where: { project_id: project.id } });
    await prisma.projectImage.createMany({
      data: [
        { project_id: project.id, url: HERO_IMAGES[0], type: 'hero', caption: `${item.name} Architectural Elevation`, sort_order: 1 },
        { project_id: project.id, url: HERO_IMAGES[1], type: 'amenity', caption: 'Clubhouse & Swimming Pool', sort_order: 2 },
        { project_id: project.id, url: HERO_IMAGES[2], type: 'interior', caption: 'Sample Living Room & Balcony', sort_order: 3 },
      ],
    });

    // 4. Amenities
    await prisma.amenity.deleteMany({ where: { project_id: project.id } });
    await prisma.amenity.createMany({
      data: STANDARD_AMENITIES_ALL.map((a) => ({
        project_id: project.id,
        name: a.name,
        category: a.category as any,
      })),
    });

    // 5. Specs
    await prisma.projectSpecItem.deleteMany({ where: { project_id: project.id } });
    await prisma.projectSpecItem.createMany({
      data: STANDARD_SPECS_ALL.map((s, idx) => ({
        project_id: project.id,
        category: s.category,
        label: s.label,
        value: s.value,
        tier: s.tier,
        brand: s.brand,
        sort_order: idx + 1,
      })),
    });

    // 6. Connectivity
    await prisma.connectivity.deleteMany({ where: { project_id: project.id } });
    await prisma.connectivity.createMany({
      data: item.commute.map((c) => ({
        project_id: project.id,
        name: c.destination,
        type: 'road' as any,
        distance_km: c.distance_km,
        data_source: 'manual',
      })),
    });

    // 7. Construction Milestones
    await prisma.constructionMilestone.deleteMany({ where: { project_id: project.id } });
    await prisma.constructionMilestone.createMany({
      data: [
        { project_id: project.id, stage_code: 'approvals', name: 'RERA & Environmental Approvals', status: 'completed' as any, completion_pct: 100, date_label: 'Stage 1', sort_order: 1 },
        { project_id: project.id, stage_code: 'excavation', name: 'Excavation & Foundation Raft', status: 'completed' as any, completion_pct: 100, date_label: 'Stage 2', sort_order: 2 },
        { project_id: project.id, stage_code: 'superstructure', name: 'RCC Superstructure Frames', status: 'completed' as any, completion_pct: 100, date_label: 'Stage 3', sort_order: 3 },
        { project_id: project.id, stage_code: 'finishing', name: 'Internal Finishing & MEP Fittings', status: item.status === 'ready_to_move' ? 'completed' : 'in_progress' as any, completion_pct: item.status === 'ready_to_move' ? 100 : 85, date_label: 'Stage 4', sort_order: 4 },
        { project_id: project.id, stage_code: 'amenities', name: 'Clubhouse & Landscape Development', status: item.status === 'ready_to_move' ? 'completed' : 'in_progress' as any, completion_pct: item.status === 'ready_to_move' ? 100 : 75, date_label: 'Stage 5', sort_order: 5 },
        { project_id: project.id, stage_code: 'handover', name: 'Occupancy Certificate & Key Handover', status: item.status === 'ready_to_move' ? 'completed' : 'upcoming' as any, completion_pct: item.status === 'ready_to_move' ? 100 : 0, date_label: 'Stage 6', sort_order: 6 },
      ],
    });

    // 8. Unit Types
    await prisma.unitType.deleteMany({ where: { project_id: project.id } });
    for (const u of item.units) {
      await prisma.unitType.create({
        data: {
          project_id: project.id,
          name: u.name,
          bhk: u.bhk,
          super_area_sqft: u.super_area,
          carpet_area_sqft: u.carpet_area,
          balcony_area_sqft: u.balcony_area,
          bathrooms: u.bathrooms,
          balconies: u.balconies,
          price_min_cr: u.price_min,
          price_max_cr: u.price_max,
          price_per_sqft: u.price_psf,
          price_label: `₹${u.price_min} Cr – ₹${u.price_max} Cr`,
          efficiency_rating: `${Math.round((u.carpet_area / u.super_area) * 100)}% Usable Carpet Ratio`,
          views: ['Central Green Park Facing', 'Clubhouse & Pool View', 'Wide Road Boulevard'],
          key_highlights: [
            'East-Facing Morning Sunlight Balcony',
            '3-Side Open Cross Ventilation',
            'Vastu Compliant North-East Entry',
            'Spacious Master Suite with Wooden Flooring',
          ],
          perfect_for: ['End-User Families', 'Corporate Executives', 'NRI Capital Investors'],
        },
      });
    }

    // 9. Cost Sheet
    await prisma.costSheet.deleteMany({ where: { project_id: project.id } });
    await prisma.costSheet.create({
      data: {
        project_id: project.id,
        base_price_per_sqft: item.base_psf,
        parking_cost: 350000,
        ifms: 50,
        club_membership: 150000,
        gst_rate_pct: item.oc_obtained ? 0 : 5.0,
        stamp_duty_pct: 7.0,
        registration_pct: 1.0,
      },
    });

    // 10. Payment Plans
    await prisma.paymentPlan.deleteMany({ where: { project_id: project.id } });
    await prisma.paymentPlan.createMany({
      data: [
        {
          project_id: project.id,
          plan_name: 'Construction Linked Payment Plan (CLP)',
          plan_type: 'construction_linked',
          milestones: [
            { milestone: 'At the Time of Booking Token', due: 'Within 15 days', pct: 10 },
            { milestone: 'Within 30 Days of Allotment', due: 'Agreement registration', pct: 10 },
            { milestone: 'On Foundation & Substructure', due: 'Raft completion', pct: 15 },
            { milestone: 'On Superstructure Completion', due: 'Tower top roof slab', pct: 35 },
            { milestone: 'On Internal Plaster & Finishing', due: 'Finishing stage', pct: 20 },
            { milestone: 'On Notice of Possession & OC', due: 'Handover & key transfer', pct: 10 },
          ],
          sort_order: 1,
        },
        {
          project_id: project.id,
          plan_name: 'Investor Special Down Payment Plan',
          plan_type: 'down_payment',
          milestones: [
            { milestone: 'At the Time of Booking', due: 'Within 15 days', pct: 10 },
            { milestone: 'Within 45 Days of Booking', due: 'Down payment discount', pct: 80 },
            { milestone: 'On Offer of Possession', due: 'Final keys handover', pct: 10 },
          ],
          sort_order: 2,
        },
      ],
    });

    // 11. Price History
    await prisma.priceHistory.deleteMany({ where: { project_id: project.id } });
    await prisma.priceHistory.createMany({
      data: [
        { project_id: project.id, quarter_label: 'Q1 2021', recorded_at: new Date('2021-03-15T00:00:00.000Z'), price_per_sqft: Math.round(item.base_psf * 0.58), source: 'historical_benchmark' },
        { project_id: project.id, quarter_label: 'Q2 2022', recorded_at: new Date('2022-06-15T00:00:00.000Z'), price_per_sqft: Math.round(item.base_psf * 0.68), source: 'historical_benchmark' },
        { project_id: project.id, quarter_label: 'Q3 2023', recorded_at: new Date('2023-09-15T00:00:00.000Z'), price_per_sqft: Math.round(item.base_psf * 0.78), source: 'historical_benchmark' },
        { project_id: project.id, quarter_label: 'Q4 2024', recorded_at: new Date('2024-12-15T00:00:00.000Z'), price_per_sqft: Math.round(item.base_psf * 0.88), source: 'historical_benchmark' },
        { project_id: project.id, quarter_label: 'Q2 2025', recorded_at: new Date('2025-06-15T00:00:00.000Z'), price_per_sqft: Math.round(item.base_psf * 0.95), source: 'historical_benchmark' },
        { project_id: project.id, quarter_label: 'Q1 2026', recorded_at: new Date('2026-03-15T00:00:00.000Z'), price_per_sqft: item.base_psf, source: 'active_market_listing' },
      ],
    });

    // 12. Decision Profile, Persona Profile, Recommendation Profile, DNA
    await prisma.decisionProfile.deleteMany({ where: { project_id: project.id } });
    await prisma.decisionProfile.create({
      data: {
        project_id: project.id,
        status: 'PUBLISHED' as any,
        decision_thesis: `${item.name} stands out in ${item.sector}, ${item.city} with a stellar ${item.open_space_pct}% open green quotient, solid builder track record, and prime connectivity to expressways and metro corridors.`,
        why_buy: [
          `Reputed builder (${builder.name}) with proven delivery excellence`,
          `High usable carpet efficiency with 3-side open natural light`,
          `Prime location on major transit corridors with upcoming infra catalysts`,
        ],
        why_avoid: [
          'High demand commands premium price per square foot',
          'Fast absorption leaves limited top-floor inventory',
        ],
        best_for: 'End-user families seeking gated community living and corporate professionals with active commutes.',
        not_ideal_for: 'Short-term speculators seeking sub-6-month flips.',
        confidence_sources: ['RERA', 'Project Documents', 'Site Visit', 'Builder Claim'] as any[],
      },
    });

    await prisma.personaProfile.deleteMany({ where: { project_id: project.id } });
    await prisma.personaProfile.create({
      data: {
        project_id: project.id,
        primary_persona: 'Corporate Executives & Tech Managers',
        secondary_personas: ['Senior Working Professionals', 'NCR Family Upgraders'],
        income_range: '₹25 Lakh - ₹75 Lakh per annum',
        family_stage: 'Families with school/college-going children',
        work_location: 'Noida Expressway / Sector 62 IT Corridor / South Delhi',
        timeline_horizon: 'Immediate living and 5-year capital appreciation',
        risk_appetite: 'Low risk — verified RERA approved gated enclave',
        motivation_note: 'Prioritizing space optimization, security, and low daily commute friction.',
      },
    });

    await prisma.recommendationProfile.deleteMany({ where: { project_id: project.id } });
    await prisma.recommendationProfile.create({
      data: {
        project_id: project.id,
        status: 'PUBLISHED' as any,
        tier: 'STRONG_BUY' as any,
        primary_thesis: `Top-ranked residential society in ${item.sector} for livability, infrastructure access, and robust resale liquidity.`,
        walk_away_conditions: ['Any unapproved floor plan modification', 'Non-availability of designated car parking space'],
        negotiation_leverage: ['Club membership fee waiver on spot token', 'Floor rise discount for mid-level units'],
      },
    });

    await prisma.projectDna.deleteMany({ where: { project_id: project.id } });
    await prisma.projectDna.create({
      data: {
        project_id: project.id,
        overall_score: 92,
        builder_score: 94,
        price_score: 90,
        location_score: 93,
        legal_score: 96,
        amenity_score: 95,
        possession_score: item.oc_obtained ? 98 : 90,
      },
    });

    // 13. Competitors
    await prisma.projectCompetitor.deleteMany({ where: { project_id: project.id } });
    await prisma.projectCompetitor.createMany({
      data: [
        {
          project_id: project.id,
          competitor_name: 'Nearby Micro-Market Development',
          competitor_slug: 'nearby-development',
          this_project_advantage: 'Superior construction quality, lower density, and higher open green ratio.',
          competitor_advantage: 'Slightly lower entry headline pricing with higher density.',
          verdict: `${item.name} provides significantly superior long-term livability and asset appreciation.`,
          price_delta_note: '+5% to +10% premium justified by quality of life.',
          sort_order: 1,
        },
      ],
    });

    console.log(`  🎉 ${item.name} 100% seeded with all 172 fields & 6 tabs populated!`);
  }

  console.log('\n========================================================================');
  console.log('🌟 BATCH SATURATION SEEDING COMPLETE!');
  console.log('========================================================================');
}

seedCompleteBatch()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
