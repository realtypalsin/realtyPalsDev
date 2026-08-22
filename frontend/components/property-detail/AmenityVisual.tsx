'use client'

import React from 'react'
import {
  SwimmingPool,
  Barbell,
  TennisBall,
  Buildings,
  Tree,
  ShieldCheck,
  ChargingStation,
  Baby,
  Sneaker,
  FilmSlate,
  BookOpen,
  Drop,
  FirstAid,
  ShoppingBag,
  Heart,
  Baseball,
  Flag,
  Trophy,
  Star,
  CheckCircle,
  Lock,
  Bicycle,
  Basketball,
  GameController,
  Dog,
  Coffee,
  Waves,
  SunHorizon,
  WifiHigh,
  Wheelchair,
  Fire,
  Car
} from '@phosphor-icons/react'

export interface AmenityVisualConfig {
  icon: React.ComponentType<any>
  bgClass: string
  textClass: string
  category: string
}

export function getAmenityVisual(name: string): AmenityVisualConfig {
  const n = name.toLowerCase()

  // 1. Aquatics & Water
  if (/olympic|swimming|pool|splash|jacuzzi|water/i.test(n)) {
    return {
      icon: SwimmingPool,
      bgClass: 'bg-sky-500/10 dark:bg-sky-500/20 border-sky-500/20',
      textClass: 'text-sky-600 dark:text-sky-400',
      category: 'Aquatics & Wellness'
    }
  }

  // 2. Gym & Fitness
  if (/gym|fitness|workout|technogym|crossfit/i.test(n)) {
    return {
      icon: Barbell,
      bgClass: 'bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/20',
      textClass: 'text-purple-600 dark:text-purple-400',
      category: 'Fitness & Health'
    }
  }

  // 3. Yoga & Meditation
  if (/yoga|meditation|zen|reflexology/i.test(n)) {
    return {
      icon: SunHorizon,
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
      textClass: 'text-amber-600 dark:text-amber-400',
      category: 'Mind & Body'
    }
  }

  // 4. Spa & Wellness (Sauna, Steam, Jacuzzi)
  if (/sauna|steam|spa|massage/i.test(n)) {
    return {
      icon: Fire,
      bgClass: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20',
      textClass: 'text-rose-600 dark:text-rose-400',
      category: 'Spa & Relaxation'
    }
  }

  // 5. Racquet Sports (Tennis, Badminton, Squash)
  if (/tennis|badminton|squash/i.test(n)) {
    return {
      icon: TennisBall,
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      category: 'Racquet Sports'
    }
  }

  // 6. Basketball & Court Games
  if (/basketball|volleyball/i.test(n)) {
    return {
      icon: Basketball,
      bgClass: 'bg-orange-500/10 dark:bg-orange-500/20 border-orange-500/20',
      textClass: 'text-orange-600 dark:text-orange-400',
      category: 'Ball Sports'
    }
  }

  // 7. Indoor Gaming (Snooker, TT, Chess)
  if (/snooker|billiard|table tennis|\btt\b|arcade|gaming|chess/i.test(n)) {
    return {
      icon: GameController,
      bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/20',
      textClass: 'text-indigo-600 dark:text-indigo-400',
      category: 'Indoor Games'
    }
  }

  // 8. Running & Cycling
  if (/jogging|cycling|track|skating/i.test(n)) {
    return {
      icon: Bicycle,
      bgClass: 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/20',
      textClass: 'text-teal-600 dark:text-teal-400',
      category: 'Active Track'
    }
  }

  // 9. Parks & Gardens
  if (/park|garden|green|lawn|landscape|gazebo|flora/i.test(n)) {
    return {
      icon: Tree,
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      category: 'Eco Greens'
    }
  }

  // 10. Kids & Creche
  if (/kid|child|play|creche|daycare|slide|toddler/i.test(n)) {
    return {
      icon: Baby,
      bgClass: 'bg-pink-500/10 dark:bg-pink-500/20 border-pink-500/20',
      textClass: 'text-pink-600 dark:text-pink-400',
      category: 'Kids & Family'
    }
  }

  // 11. Senior Citizens & Plaza
  if (/senior|sitting|plaza|elder/i.test(n)) {
    return {
      icon: Wheelchair,
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
      textClass: 'text-amber-600 dark:text-amber-400',
      category: 'Senior Living'
    }
  }

  // 12. Clubhouse & Lounge
  if (/clubhouse|club|lounge|banquet|party|community/i.test(n)) {
    return {
      icon: Buildings,
      bgClass: 'bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/20',
      textClass: 'text-violet-600 dark:text-violet-400',
      category: 'Clubhouse & Leisure'
    }
  }

  // 13. Mini Theatre & Cinema
  if (/theatre|theater|cinema|screening|av room/i.test(n)) {
    return {
      icon: FilmSlate,
      bgClass: 'bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/20',
      textClass: 'text-rose-600 dark:text-rose-400',
      category: 'Entertainment'
    }
  }

  // 14. Library & Co-working
  if (/library|reading|co-working|coworking|study|business/i.test(n)) {
    return {
      icon: BookOpen,
      bgClass: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/20',
      textClass: 'text-blue-600 dark:text-blue-400',
      category: 'Work & Study'
    }
  }

  // 15. EV Charging
  if (/ev\b|electric vehicle|charging/i.test(n)) {
    return {
      icon: ChargingStation,
      bgClass: 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/20',
      textClass: 'text-teal-600 dark:text-teal-400',
      category: 'Green Mobility'
    }
  }

  // 16. Parking
  if (/parking|basement|garage|valet/i.test(n)) {
    return {
      icon: Car,
      bgClass: 'bg-slate-500/10 dark:bg-slate-500/20 border-slate-500/20',
      textClass: 'text-slate-700 dark:text-slate-300',
      category: 'Parking'
    }
  }

  // 17. Security & CCTV
  if (/security|cctv|intercom|video door|guard|boom barrier|access/i.test(n)) {
    return {
      icon: ShieldCheck,
      bgClass: 'bg-red-500/10 dark:bg-red-500/20 border-red-500/20',
      textClass: 'text-red-600 dark:text-red-400',
      category: 'Multi-Tier Security'
    }
  }

  // 18. Convenience & Medical
  if (/pharmacy|medical|store|grocery|convenience|market/i.test(n)) {
    return {
      icon: FirstAid,
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      category: 'Essentials & Care'
    }
  }

  // 19. Pet Park
  if (/pet|dog/i.test(n)) {
    return {
      icon: Dog,
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
      textClass: 'text-amber-600 dark:text-amber-400',
      category: 'Pet Friendly'
    }
  }

  // 20. Cricket / Batting Net / Pitch
  if (/cricket|pitch|batting|net practice/i.test(n)) {
    return {
      icon: Baseball,
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      category: 'Cricket & Sports'
    }
  }

  // 21. Golf & Putting
  if (/golf|putting/i.test(n)) {
    return {
      icon: Flag,
      bgClass: 'bg-teal-500/10 dark:bg-teal-500/20 border-teal-500/20',
      textClass: 'text-teal-600 dark:text-teal-400',
      category: 'Golf & Leisure'
    }
  }

  // Default Feature
  return {
    icon: Star,
    bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/20',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    category: 'Community Feature'
  }
}

export function AmenityCard({
  name,
  category,
  className = ''
}: {
  name: string
  category?: string
  className?: string
}) {
  const visual = getAmenityVisual(name)
  const Icon = visual.icon

  return (
    <div
      className={`p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#151515] border border-gray-100/90 dark:border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-gray-300 dark:hover:border-white/20 transition-all flex items-start gap-3 group ${className}`}
    >
      <div
        className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105 ${visual.bgClass} ${visual.textClass}`}
      >
        <Icon size={20} weight="duotone" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-[12.5px] sm:text-[13px] font-black text-gray-900 dark:text-white leading-tight line-clamp-2">
          {name}
        </h4>
        <span className="text-[9.5px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider block mt-1">
          {category || visual.category}
        </span>
      </div>
    </div>
  )
}
