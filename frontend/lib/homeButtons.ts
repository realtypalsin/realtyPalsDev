export interface HomeButtonSubItem {
  label: string;
  prompt: string;
}

export interface HomeButtonGroup {
  id: string;
  title: string;
  primaryPrompt: string;
  icon: string;
  colorClass: string;
  options: HomeButtonSubItem[];
}

export const HOME_BUTTON_GROUPS: HomeButtonGroup[] = [
  {
    id: 'sec75',
    title: '3 BHK in Sector 75 Noida',
    primaryPrompt: 'Show me 3 BHK apartments available for immediate purchase in Sector 75.',
    icon: 'Building2',
    colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 group-hover/main:bg-blue-600 group-hover/main:text-white',
    options: [
      {
        label: 'Immediate purchase 3 BHK',
        prompt: 'Show me 3 BHK apartments available for immediate purchase in Sector 75.'
      },
      {
        label: 'Luxury housing options',
        prompt: 'Which builders are offering luxury housing options in Sector 75 Noida?'
      },
      {
        label: 'Flats near Metro station',
        prompt: 'Find residential flats in Sector 75 that are within walking distance to the metro.'
      }
    ]
  },
  {
    id: 'sec76',
    title: '2 BHK in Sector 76 Noida',
    primaryPrompt: 'Show me budget friendly 2 BHK flats available in Sector 76.',
    icon: 'Home',
    colorClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 group-hover/main:bg-emerald-600 group-hover/main:text-white',
    options: [
      {
        label: 'Budget friendly 2 BHK',
        prompt: 'Show me budget friendly 2 BHK flats available in Sector 76.'
      },
      {
        label: 'Resale property deals',
        prompt: 'Are there good resale property deals available in Sector 76 Noida?'
      },
      {
        label: 'Spacious family 3 BHK',
        prompt: 'Find spacious 3 BHK apartments for families in Sector 76.'
      }
    ]
  },
  {
    id: 'sec77',
    title: '3 BHK in Sector 77 Noida',
    primaryPrompt: 'Show me the most popular 3 BHK housing societies in Sector 77.',
    icon: 'Key',
    colorClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 group-hover/main:bg-amber-600 group-hover/main:text-white',
    options: [
      {
        label: 'Popular housing societies',
        prompt: 'Show me the most popular 3 BHK housing societies in Sector 77.'
      },
      {
        label: 'Ready to move flats',
        prompt: 'Which completed projects in Sector 77 have ready to move apartments?'
      },
      {
        label: 'Price growth & trends',
        prompt: 'Are property prices in Sector 77 expected to increase this year?'
      }
    ]
  },
  {
    id: 'sec78_4bhk',
    title: '4 BHK in Sector 78 Noida',
    primaryPrompt: 'Find large 4 BHK flats and penthouses available in Sector 78.',
    icon: 'Crown',
    colorClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 group-hover/main:bg-purple-600 group-hover/main:text-white',
    options: [
      {
        label: 'Large 4 BHK & Penthouses',
        prompt: 'Find large 4 BHK flats and penthouses available in Sector 78.'
      },
      {
        label: 'Premium gated communities',
        prompt: 'What are the most premium gated communities located in Sector 78 Noida?'
      },
      {
        label: 'Luxury 3 BHK options',
        prompt: 'Show me luxury 3 BHK properties available in Sector 78.'
      }
    ]
  },
  {
    id: 'sec79',
    title: '3 BHK in Sector 79 Noida',
    primaryPrompt: 'Find 3 BHK flats near sports parks and green areas in Sector 79.',
    icon: 'Trees',
    colorClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 group-hover/main:bg-teal-600 group-hover/main:text-white',
    options: [
      {
        label: 'Flats near sports & parks',
        prompt: 'Find 3 BHK flats near sports parks and green areas in Sector 79.'
      },
      {
        label: 'Sports City projects',
        prompt: 'What residential projects are part of the Sector 79 sports city?'
      },
      {
        label: 'Spacious 4 BHK with open view',
        prompt: 'Show me spacious 4 BHK apartments with open views in Sector 79.'
      }
    ]
  },
  {
    id: 'sec78_luxury',
    title: 'Luxury Societies in Sector 78',
    primaryPrompt: 'What are the most premium gated communities located in Sector 78 Noida?',
    icon: 'Shield',
    colorClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 group-hover/main:bg-rose-600 group-hover/main:text-white',
    options: [
      {
        label: 'Top premium gated societies',
        prompt: 'What are the most premium gated communities located in Sector 78 Noida?'
      },
      {
        label: 'Luxury 3 BHK & 4 BHK units',
        prompt: 'Show me luxury 3 BHK and 4 BHK properties available in Sector 78.'
      },
      {
        label: 'Penthouses & high-end amenities',
        prompt: 'Find penthouses with top amenities in Sector 78 Noida.'
      }
    ]
  }
];


