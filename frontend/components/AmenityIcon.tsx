'use client';

// Using Font Awesome Kit for premium iconography
// The kit script is loaded in layout.tsx

import {
  Waves, Umbrella, Baby, ThermometerSun, Flame, Droplets,
  Flower2, HeartPulse, Dumbbell, Activity, ShieldPlus,
  Footprints, Bike, Map, MapPin, Search, PlayCircle, Trophy,
  Star, Coffee, UserPlus, Users, Store, Tent, ShoppingBag,
  ShieldCheck, Shield, KeyRound, Zap, Camera, Car, TreePine,
  Wind, Cloud, LayoutGrid, Snowflake, HandPlatter, Hammer, Stethoscope,
  Trees, CloudSun, Briefcase, Cross, Leaf, Gamepad2, Sprout, Video, Popcorn, 
  Glasses, UtensilsCrossed, MonitorPlay, BookOpen, 
  CarFront, Map as MapIcon, BedDouble, CheckSquare
} from 'lucide-react';

export interface AmenityMeta {
  icon: any;
  label: string;
}

export function normalizeAmenityKey(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
}

export function getAmenityMeta(amenityKey: string): AmenityMeta {
  const norm = amenityKey.toLowerCase().trim();

  const label = amenityKey
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  let icon = Star;

  // Keyword matching for robust coverage of 99+ amenities
  if (norm.includes('pool') || norm.includes('swim') || norm.includes('splash') || norm.includes('deck')) icon = Waves;
  else if (norm.includes('steam') || norm.includes('sauna')) icon = Flame;
  else if (norm.includes('jacuzzi') || norm.includes('fountain') || norm.includes('water')) icon = Droplets;
  else if (norm.includes('spa') || norm.includes('massage') || norm.includes('beauty') || norm.includes('salon')) icon = Flower2;
  else if (norm.includes('health') || norm.includes('medical') || norm.includes('clinic') || norm.includes('telemedicine')) icon = HeartPulse;
  else if (norm.includes('gym') || norm.includes('aerobics') || norm.includes('exercise') || norm.includes('fitness')) icon = Dumbbell;
  else if (norm.includes('yoga') || norm.includes('meditation')) icon = Activity;
  else if (norm.includes('jogging') || norm.includes('walking') || norm.includes('trail') || norm.includes('track') || norm.includes('walk')) icon = Footprints;
  else if (norm.includes('cycl') || norm.includes('bike')) icon = Bike;
  else if (norm.includes('tennis') || norm.includes('badminton') || norm.includes('squash') || norm.includes('basketball') || norm.includes('cricket') || norm.includes('volleyball') || norm.includes('skating') || norm.includes('sports') || norm.includes('playfield') || norm.includes('gymnastics') || norm.includes('rock climbing')) icon = Trophy;
  else if (norm.includes('golf')) icon = MapIcon;
  else if (norm.includes('club') || norm.includes('lounge')) icon = Store;
  else if (norm.includes('business') || norm.includes('meeting')) icon = Briefcase;
  else if (norm.includes('amphitheater') || norm.includes('theatre') || norm.includes('stage') || norm.includes('amphitheatre')) icon = Video;
  else if (norm.includes('party') || norm.includes('hall') || norm.includes('banquet') || norm.includes('pavilion') || norm.includes('plaza') || norm.includes('court')) icon = Tent;
  else if (norm.includes('cafe') || norm.includes('restaurant') || norm.includes('coffee') || norm.includes('dining')) icon = Coffee;
  else if (norm.includes('kid') || norm.includes('toddler') || norm.includes('children') || norm.includes('day care') || norm.includes('play school') || norm.includes('sandpit') || norm.includes('creche')) icon = Baby;
  else if (norm.includes('shop') || norm.includes('retail') || norm.includes('store') || norm.includes('market') || norm.includes('arcade')) icon = ShoppingBag;
  else if (norm.includes('secur') || norm.includes('guard')) icon = ShieldCheck;
  else if (norm.includes('concierge') || norm.includes('reception')) icon = KeyRound;
  else if (norm.includes('power')) icon = Zap;
  else if (norm.includes('park') || norm.includes('drop off')) icon = Car;
  else if (norm.includes('garden') || norm.includes('lawn') || norm.includes('green') || norm.includes('tree') || norm.includes('forest') || norm.includes('landscape') || norm.includes('courtyard') || norm.includes('sit out') || norm.includes('alcove')) icon = TreePine;
  else if (norm.includes('view') || norm.includes('terrace')) icon = CloudSun;
  else if (norm.includes('ac ') || norm.includes('air con')) icon = Snowflake;
  else if (norm.includes('kitchen') || norm.includes('barbecue') || norm.includes('bbq')) icon = HandPlatter;
  else if (norm.includes('billiards') || norm.includes('pool table') || norm.includes('snooker') || norm.includes('table tennis') || norm.includes('carrom') || norm.includes('card room')) icon = Gamepad2;
  else if (norm.includes('library') || norm.includes('reading')) icon = BookOpen;
  else if (norm.includes('tv') || norm.includes('screen')) icon = MonitorPlay;
  else if (norm.includes('laundromat') || norm.includes('laundry')) icon = Umbrella;
  
  return { icon, label };

}

export function getMappedAmenities(amenities: string[], max = 6): AmenityMeta[] {
  const seen = new Set<string>();
  return amenities
    .map((a) => getAmenityMeta(a))
    .filter((meta) => {
      if (seen.has(meta.label)) return false;
      seen.add(meta.label);
      return true;
    })
    .slice(0, max);
}

type AmenitySize = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap = {
  sm: { tile: 'w-9 h-9',   size: 14, label: 'text-[9px]' },
  md: { tile: 'w-12 h-12', size: 18, label: 'text-[10px]' },
  lg: { tile: 'w-16 h-16', size: 24, label: 'text-xs' },
  xl: { tile: 'w-20 h-20', size: 32, label: 'text-sm' },
};

interface AmenityIconProps {
  amenity: string;
  size?: AmenitySize;
  showLabel?: boolean;
}

export default function AmenityIcon({ amenity, size = 'md', showLabel = true }: AmenityIconProps) {
  const meta = getAmenityMeta(amenity);
  const s = sizeMap[size];
  return (
    <div className="flex flex-col items-center gap-1.5 group" title={meta.label}>
      <div className={`${s.tile} bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors group-hover:border-gray-400 group-hover:bg-white dark:group-hover:bg-gray-700`}>
        <meta.icon size={s.size} strokeWidth={1.5} className="text-gray-700 dark:text-gray-200" />
      </div>
      {showLabel && (
        <span className={`${s.label} font-medium text-gray-500 dark:text-gray-400 text-center leading-tight max-w-[4.5rem] truncate transition-colors group-hover:text-gray-900 dark:group-hover:text-gray-100`}>

          {meta.label}
        </span>
      )}
    </div>
  );
}

export function AmenityGrid({
  amenities,
  max = 6,
  size = 'md',
  showLabel = true,
  cols = 'grid-cols-3 sm:grid-cols-6',
}: {
  amenities: string[];
  max?: number;
  size?: AmenitySize;
  showLabel?: boolean;
  cols?: string;
}) {
  const mapped = getMappedAmenities(amenities, max);
  if (mapped.length === 0) return null;

  return (
    <div className={`grid ${cols} gap-3`}>
      {mapped.map((meta, idx) => {
        const s = sizeMap[size];
        return (
          <div key={idx} className="flex flex-col items-center gap-1.5 group" title={meta.label}>
            <div className={`${s.tile} bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-colors group-hover:border-gray-400 group-hover:bg-white dark:group-hover:bg-gray-700`}>
              <meta.icon size={s.size} strokeWidth={1.5} className="text-gray-700 dark:text-gray-200" />
            </div>
            {showLabel && (
              <span className={`${s.label} font-medium text-gray-500 dark:text-gray-400 text-center leading-tight max-w-[4.5rem] truncate transition-colors group-hover:text-gray-900 dark:group-hover:text-gray-100`}>

                {meta.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
