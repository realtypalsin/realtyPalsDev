export interface HomeButton {
  label: string;
  prompt: string;
  icon: string; // lucide icon name
  sector: string;
}

export const HOME_BUTTONS: HomeButton[] = [
  // Sector 75
  {
    label: '3 BHK in Sector 75',
    prompt: 'Show me 3 BHK apartments available for immediate purchase in Sector 75.',
    icon: 'Building2',
    sector: '75'
  },
  {
    label: 'Premium Projects in Sector 75',
    prompt: 'Which builders are offering luxury housing options in Sector 75 Noida?',
    icon: 'Crown',
    sector: '75'
  },
  {
    label: 'Flats near Metro in Sector 75',
    prompt: 'Find residential flats in Sector 75 that are within walking distance to the metro.',
    icon: 'Train',
    sector: '75'
  },
  // Sector 76
  {
    label: '2 BHK in Sector 76',
    prompt: 'Show me budget friendly 2 BHK flats available in Sector 76.',
    icon: 'Wallet',
    sector: '76'
  },
  {
    label: 'Sector 76 Resale Flats',
    prompt: 'Are there good resale property deals available in Sector 76 Noida?',
    icon: 'TrendingUp',
    sector: '76'
  },
  {
    label: '3 BHK in Sector 76',
    prompt: 'Find spacious 3 BHK apartments for families in Sector 76.',
    icon: 'Home',
    sector: '76'
  },
  // Sector 77
  {
    label: '3 BHK in Sector 77',
    prompt: 'Show me the most popular 3 BHK housing societies in Sector 77.',
    icon: 'Building2',
    sector: '77'
  },
  {
    label: 'Ready Flats in Sector 77',
    prompt: 'Which completed projects in Sector 77 have ready to move apartments?',
    icon: 'Key',
    sector: '77'
  },
  {
    label: 'Sector 77 Price Trends',
    prompt: 'Are property prices in Sector 77 expected to increase this year?',
    icon: 'BarChart3',
    sector: '77'
  },
  // Sector 78
  {
    label: '4 BHK in Sector 78',
    prompt: 'Find large 4 BHK flats and penthouses available in Sector 78.',
    icon: 'Sofa',
    sector: '78'
  },
  {
    label: 'Luxury Societies in Sector 78',
    prompt: 'What are the most premium gated communities located in Sector 78 Noida?',
    icon: 'Shield',
    sector: '78'
  },
  {
    label: '3 BHK in Sector 78',
    prompt: 'Show me luxury 3 BHK properties available in Sector 78.',
    icon: 'Zap',
    sector: '78'
  },
  // Sector 79
  {
    label: '3 BHK in Sector 79',
    prompt: 'Find 3 BHK flats near sports parks and green areas in Sector 79.',
    icon: 'Trees',
    sector: '79'
  },
  {
    label: 'Sector 79 Sports City',
    prompt: 'What residential projects are part of the Sector 79 sports city?',
    icon: 'Activity',
    sector: '79'
  },
  {
    label: '4 BHK in Sector 79',
    prompt: 'Show me spacious 4 BHK apartments with open views in Sector 79.',
    icon: 'Wind',
    sector: '79'
  },
  // Sector 10 Extension
  {
    label: '2 BHK in Sector 10 Extension',
    prompt: 'Show me affordable 2 BHK apartments in Sector 10 Greater Noida West.',
    icon: 'Wallet',
    sector: '10'
  },
  {
    label: '3 BHK in Sector 10 Extension',
    prompt: 'Find family sized 3 BHK flats under construction in Sector 10.',
    icon: 'Home',
    sector: '10'
  },
  {
    label: 'Sector 10 Commercial Shops',
    prompt: 'Are there retail shops available for purchase in Sector 10 Noida Extension?',
    icon: 'ShoppingCart',
    sector: '10'
  },
  // Sector 12 Extension
  {
    label: '3 BHK in Sector 12 Extension',
    prompt: 'Show me newly launched 3 BHK luxury projects in Sector 12.',
    icon: 'Sparkles',
    sector: '12'
  },
  {
    label: '4 BHK in Sector 12 Extension',
    prompt: 'Find premium 4 BHK flats and luxury apartments in Sector 12 Greater Noida West.',
    icon: 'Crown',
    sector: '12'
  },
  {
    label: 'Sector 12 Villa Projects',
    prompt: 'Are there independent villas available for purchase in Sector 12 Noida Extension?',
    icon: 'Building2',
    sector: '12'
  }
];

export function getSectorButtonGroups() {
  const sectors = ['75', '76', '77', '78', '79', '10', '12'];
  return sectors.map((sector) => ({
    sector,
    buttons: HOME_BUTTONS.filter((btn) => btn.sector === sector)
  }));
}
