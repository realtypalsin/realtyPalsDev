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
    id: 'budget_3bhk',
    title: '2 Crore 3 BHK — Good Deal?',
    primaryPrompt: 'Is 2 crore too much for a 3 BHK in Noida right now?',
    icon: 'CurrencyInr',
    colorClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 group-hover/main:bg-amber-600 group-hover/main:text-white',
    options: [
      {
        label: 'Is 2Cr fair for Sector 75?',
        prompt: 'Is 2 crore a fair price for a 3 BHK in Sector 75 Noida?'
      },
      {
        label: 'Best 3 BHK under 2 Crore',
        prompt: 'Show me the best 3 BHK options in Noida under 2 crore budget.'
      },
      {
        label: 'Price trends for 3 BHK',
        prompt: 'What are current price trends for 3 BHK flats across Noida sectors?'
      }
    ]
  },
  {
    id: 'sec75',
    title: '3 BHK in Sector 75 Noida',
    primaryPrompt: 'Show me 3 BHK apartments available for immediate purchase in Sector 75 Noida.',
    icon: 'Building2',
    colorClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 group-hover/main:bg-blue-600 group-hover/main:text-white',
    options: [
      {
        label: 'Immediate purchase 3 BHK',
        prompt: 'Show me 3 BHK apartments available for immediate purchase in Sector 75 Noida.'
      },
      {
        label: 'Luxury & Penthouse options',
        prompt: 'Which builders offer luxury and penthouse apartments in Sector 75 Noida?'
      },
      {
        label: 'Flats near Metro station',
        prompt: 'Find residential flats in Sector 75 Noida within walking distance to metro station.'
      }
    ]
  },
  {
    id: 'sec78',
    title: 'Luxury Societies in Sector 78',
    primaryPrompt: 'What are the most premium gated communities located in Sector 78 Noida?',
    icon: 'Crown',
    colorClass: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 group-hover/main:bg-purple-600 group-hover/main:text-white',
    options: [
      {
        label: 'Top premium gated societies',
        prompt: 'What are the most premium gated communities located in Sector 78 Noida?'
      },
      {
        label: 'Spacious 3 BHK + Servant',
        prompt: 'Find large 3 BHK apartments with servant rooms in Sector 78 Noida.'
      },
      {
        label: 'Ready 2 & 3 BHK Options',
        prompt: 'Show me ready-to-move 2 BHK and 3 BHK flats available in Sector 78 Noida.'
      }
    ]
  },
  {
    id: 'sec79',
    title: '3 BHK in Sector 79 Noida',
    primaryPrompt: 'Find 3 BHK flats near sports parks and green areas in Sector 79 Noida.',
    icon: 'Trees',
    colorClass: 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 group-hover/main:bg-teal-600 group-hover/main:text-white',
    options: [
      {
        label: 'Flats near sports & parks',
        prompt: 'Find 3 BHK flats near sports parks and green areas in Sector 79 Noida.'
      },
      {
        label: 'Sports City projects',
        prompt: 'What residential projects are part of the Sector 79 Sports City in Noida?'
      },
      {
        label: 'Spacious 4 BHK & Penthouses',
        prompt: 'Show me luxury 4 BHK apartments and penthouses with open views in Sector 79 Noida.'
      }
    ]
  },
  {
    id: 'sec10_gn',
    title: 'Sector 10 Greater Noida West',
    primaryPrompt: 'Show me affordable 2 BHK & 3 BHK apartments in Sector 10 Greater Noida West.',
    icon: 'Layers',
    colorClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 group-hover/main:bg-indigo-600 group-hover/main:text-white',
    options: [
      {
        label: 'Affordable 2 BHK',
        prompt: 'Show me affordable 2 BHK apartments in Sector 10 Greater Noida West.'
      },
      {
        label: 'Under construction 3 BHK',
        prompt: 'Find family-sized 3 BHK flats under construction in Sector 10 Greater Noida West.'
      },
      {
        label: 'Top growth projects',
        prompt: 'Which top builders have ongoing residential projects in Sector 10 Greater Noida West?'
      }
    ]
  },
  {
    id: 'sec12_gn',
    title: 'Sector 12 Greater Noida West',
    primaryPrompt: 'Show me newly launched luxury 3 BHK & 4 BHK projects in Sector 12 Greater Noida West.',
    icon: 'MapPin',
    colorClass: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 group-hover/main:bg-rose-600 group-hover/main:text-white',
    options: [
      {
        label: 'Newly launched luxury 3 BHK',
        prompt: 'Show me newly launched 3 BHK luxury projects in Sector 12 Greater Noida West.'
      },
      {
        label: 'Grand 4.5 BHK & Penthouses',
        prompt: 'Find premium 4.5 BHK suites and luxury penthouses in Sector 12 Greater Noida West.'
      },
      {
        label: 'Top builder projects',
        prompt: 'Which luxury projects from top builders like Ace, Mahagun, and SKA are in Sector 12 Greater Noida West?'
      }
    ]
  }
];
