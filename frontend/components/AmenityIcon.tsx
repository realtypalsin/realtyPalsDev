'use client';

// Lucide — for non-sport amenities where Lucide has better options
import {
  Zap, Wind, IceCreamCone, Clapperboard, Binoculars,
  Home, Sofa, PartyPopper, CloudSun, Car, ShieldCheck,
  Lightbulb, Sparkles,
} from 'lucide-react';

// Phosphor — comprehensive sports, fitness, wellness, nature icons
import {
  // Sports
  Cricket, CourtBasketball, TennisBall, SoccerBall,
  Volleyball, Hockey, Golf, PingPong, BoxingGlove, Barbell, Bicycle,
  PersonSimpleRun, PersonSimpleBike, PersonSimpleSwim, PersonSimpleTaiChi,
  PersonSimpleHike, PersonSimpleThrow, PersonSimpleWalk,
  // Water / Wellness
  SwimmingPool, BowlSteam, Bathtub, FlowerLotus, Leaf,
  Waves, ThermometerHot, Heartbeat, HandHeart, Sparkle,
  // Nature / Outdoor
  Tree, TreeEvergreen, Flower, Park, Mountains, PicnicTable,
  // Home / Tech / Services
  Elevator, Baby, BabyCarriage, Coffee, ShoppingBag, ShoppingCart,
  Shield, Heart,
} from '@phosphor-icons/react';

export interface AmenityMeta {
  icon: React.ElementType;
  label: string;
  color: string;
  phosphor?: boolean; // drives weight="duotone" on Phosphor icons
}

/**
 * Converts human-readable amenity names to snake_case lookup keys.
 * "Tennis Court" → "tennis_court", "Jogging Track" → "jogging_track"
 */
export function normalizeAmenityKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
}

const P = true; // shorthand: icon is Phosphor (gets weight="duotone")

const AMENITY_MAP: Record<string, AmenityMeta> = {
  // ─── Pool / Water ───────────────────────────────────────────
  swimming_pool:               { icon: SwimmingPool,        label: 'Swimming Pool',       color: 'bg-blue-50',     phosphor: P },
  lap_pool:                    { icon: SwimmingPool,        label: 'Lap Pool',             color: 'bg-blue-50',     phosphor: P },
  kids_pool:                   { icon: PersonSimpleSwim,    label: 'Kids Pool',            color: 'bg-blue-50',     phosphor: P },
  hydrotherapy:                { icon: Bathtub,             label: 'Hydrotherapy',         color: 'bg-blue-50',     phosphor: P },
  private_pool:                { icon: SwimmingPool,        label: 'Private Pool',         color: 'bg-blue-50',     phosphor: P },
  infinity_pool:               { icon: Waves,               label: 'Infinity Pool',        color: 'bg-blue-50',     phosphor: P },
  temperature_controlled_pool: { icon: ThermometerHot,      label: 'Temperature Pool',     color: 'bg-blue-50',     phosphor: P },
  steam_sauna:                 { icon: BowlSteam,           label: 'Steam & Sauna',        color: 'bg-orange-50',   phosphor: P },
  jacuzzi:                     { icon: Bathtub,             label: 'Jacuzzi',              color: 'bg-blue-50',     phosphor: P },
  spa:                         { icon: FlowerLotus,         label: 'Spa',                  color: 'bg-purple-50',   phosphor: P },
  health_club:                 { icon: Heartbeat,           label: 'Health Club',          color: 'bg-red-50',      phosphor: P },

  // ─── Fitness ─────────────────────────────────────────────────
  gym:                         { icon: Barbell,             label: 'Gym & Fitness',        color: 'bg-violet-50',   phosphor: P },
  gymnasium:                   { icon: Barbell,             label: 'Gymnasium',            color: 'bg-violet-50',   phosphor: P },
  yoga_area:                   { icon: PersonSimpleTaiChi,  label: 'Yoga Area',            color: 'bg-purple-50',   phosphor: P },
  yoga_room:                   { icon: PersonSimpleTaiChi,  label: 'Yoga Room',            color: 'bg-purple-50',   phosphor: P },
  yoga_deck:                   { icon: PersonSimpleTaiChi,  label: 'Yoga Deck',            color: 'bg-purple-50',   phosphor: P },
  yoga_center:                 { icon: PersonSimpleTaiChi,  label: 'Yoga Center',          color: 'bg-purple-50',   phosphor: P },
  meditation_pavilion:         { icon: FlowerLotus,         label: 'Meditation',           color: 'bg-purple-50',   phosphor: P },
  meditation_garden:           { icon: FlowerLotus,         label: 'Meditation Garden',    color: 'bg-purple-50',   phosphor: P },
  aerobics:                    { icon: PersonSimpleWalk,    label: 'Aerobics',             color: 'bg-violet-50',   phosphor: P },
  zumba:                       { icon: PersonSimpleWalk,    label: 'Zumba',                color: 'bg-violet-50',   phosphor: P },

  // ─── Sports — one distinct icon per activity ─────────────────
  jogging_track:               { icon: PersonSimpleRun,     label: 'Jogging Track',        color: 'bg-green-50',    phosphor: P },
  running_track:               { icon: PersonSimpleRun,     label: 'Running Track',        color: 'bg-green-50',    phosphor: P },
  cycling_track:               { icon: PersonSimpleBike,    label: 'Cycling Track',        color: 'bg-green-50',    phosphor: P },
  bicycle_track:               { icon: Bicycle,             label: 'Bicycle Track',        color: 'bg-green-50',    phosphor: P },
  walking_trail:               { icon: PersonSimpleHike,    label: 'Walking Trail',        color: 'bg-green-50',    phosphor: P },
  trekking_trail:              { icon: PersonSimpleHike,    label: 'Trekking Trail',       color: 'bg-green-50',    phosphor: P },
  cricket_pitch:               { icon: Cricket,             label: 'Cricket Pitch',        color: 'bg-green-50',    phosphor: P },
  cricket_stadium:             { icon: Cricket,             label: 'Cricket Stadium',      color: 'bg-green-50',    phosphor: P },
  cricket_net:                 { icon: Cricket,             label: 'Cricket Nets',         color: 'bg-green-50',    phosphor: P },
  cricket_academy:             { icon: Cricket,             label: 'Cricket Academy',      color: 'bg-green-50',    phosphor: P },
  tennis_court:                { icon: TennisBall,          label: 'Tennis Court',         color: 'bg-yellow-50',   phosphor: P },
  lawn_tennis:                 { icon: TennisBall,          label: 'Lawn Tennis',          color: 'bg-yellow-50',   phosphor: P },
  basketball_court:            { icon: CourtBasketball,     label: 'Basketball Court',     color: 'bg-orange-50',   phosphor: P },
  football_ground:             { icon: SoccerBall,          label: 'Football Ground',      color: 'bg-green-50',    phosphor: P },
  soccer_ground:               { icon: SoccerBall,          label: 'Soccer Ground',        color: 'bg-green-50',    phosphor: P },
  badminton_court:             { icon: PersonSimpleThrow,   label: 'Badminton Court',      color: 'bg-teal-50',     phosphor: P },
  squash_court:                { icon: PersonSimpleThrow,   label: 'Squash Court',         color: 'bg-teal-50',     phosphor: P },
  volleyball_court:            { icon: Volleyball,          label: 'Volleyball Court',     color: 'bg-green-50',    phosphor: P },
  table_tennis:                { icon: PingPong,            label: 'Table Tennis',         color: 'bg-green-50',    phosphor: P },
  ping_pong:                   { icon: PingPong,            label: 'Ping Pong',            color: 'bg-green-50',    phosphor: P },
  hockey:                      { icon: Hockey,              label: 'Hockey',               color: 'bg-green-50',    phosphor: P },
  boxing:                      { icon: BoxingGlove,         label: 'Boxing',               color: 'bg-red-50',      phosphor: P },
  skating_rink:                { icon: IceCreamCone,        label: 'Skating Rink',         color: 'bg-purple-50'   },
  sports_courts:               { icon: Volleyball,          label: 'Sports Courts',        color: 'bg-green-50',    phosphor: P },
  multipurpose_sports:         { icon: Volleyball,          label: 'Sports Area',          color: 'bg-green-50',    phosphor: P },

  // ─── Golf ─────────────────────────────────────────────────
  golf_course:                 { icon: Golf,                label: 'Golf Course',          color: 'bg-emerald-50',  phosphor: P },
  golf_facing:                 { icon: Golf,                label: 'Golf View',            color: 'bg-emerald-50',  phosphor: P },
  golf_course_access:          { icon: Golf,                label: 'Golf Access',          color: 'bg-emerald-50',  phosphor: P },
  golf_view:                   { icon: Golf,                label: 'Golf View',            color: 'bg-emerald-50',  phosphor: P },
  pitch_and_putt_golf:         { icon: Golf,                label: 'Golf',                 color: 'bg-emerald-50',  phosphor: P },

  // ─── Clubhouse / Lounge ─────────────────────────────────────
  resort_style_clubhouse:      { icon: Sofa,                label: 'Resort Clubhouse',     color: 'bg-amber-50'    },
  clubhouse:                   { icon: Sofa,                label: 'Clubhouse',            color: 'bg-amber-50'    },
  club_house:                  { icon: Sofa,                label: 'Club House',           color: 'bg-amber-50'    },
  luxury_club:                 { icon: Sparkle,             label: 'Luxury Club',          color: 'bg-amber-50',   phosphor: P },
  luxury_lobby:                { icon: Sparkles,            label: 'Luxury Lobby',         color: 'bg-amber-50'   },
  sky_lounge:                  { icon: CloudSun,            label: 'Sky Lounge',           color: 'bg-sky-50'      },
  business_center:             { icon: Sofa,                label: 'Business Center',      color: 'bg-amber-50'    },

  // ─── Entertainment ──────────────────────────────────────────
  floating_restaurant:         { icon: Coffee,              label: 'Restaurant',           color: 'bg-rose-50',    phosphor: P },
  amphitheatre:                { icon: Clapperboard,        label: 'Amphitheatre',         color: 'bg-purple-50'   },
  mini_theater:                { icon: Clapperboard,        label: 'Mini Theater',         color: 'bg-purple-50'   },
  cafe:                        { icon: Coffee,              label: 'Café & Lounge',        color: 'bg-rose-50',    phosphor: P },
  multipurpose_hall:           { icon: PartyPopper,         label: 'Multipurpose Hall',    color: 'bg-pink-50'     },
  party_hall:                  { icon: PartyPopper,         label: 'Party Hall',           color: 'bg-pink-50'     },
  banquet_hall:                { icon: PartyPopper,         label: 'Banquet Hall',         color: 'bg-pink-50'     },
  sitting_plaza:               { icon: PicnicTable,         label: 'Sitting Plaza',        color: 'bg-amber-50',   phosphor: P },

  // ─── Kids / Family ──────────────────────────────────────────
  kids_play_area:              { icon: BabyCarriage,        label: 'Kids Play Area',       color: 'bg-pink-50',    phosphor: P },
  children_play_area:          { icon: BabyCarriage,        label: 'Kids Play Area',       color: 'bg-pink-50',    phosphor: P },
  child_development_center:    { icon: Baby,                label: 'Kids Center',          color: 'bg-pink-50',    phosphor: P },
  landscaped_play_zones:       { icon: BabyCarriage,        label: 'Play Zones',           color: 'bg-pink-50',    phosphor: P },
  private_party_deck:          { icon: PartyPopper,         label: 'Party Deck',           color: 'bg-pink-50'     },
  creche:                      { icon: Baby,                label: 'Crèche',               color: 'bg-pink-50',    phosphor: P },

  // ─── Shopping ───────────────────────────────────────────────
  shopping_center:             { icon: ShoppingBag,         label: 'Shopping Center',      color: 'bg-teal-50',    phosphor: P },
  shopping_arcade:             { icon: ShoppingBag,         label: 'Shopping Arcade',      color: 'bg-teal-50',    phosphor: P },
  convenience_store:           { icon: ShoppingCart,        label: 'Convenience Store',    color: 'bg-teal-50',    phosphor: P },
  convenient_shopping:         { icon: ShoppingCart,        label: 'Shopping',             color: 'bg-teal-50',    phosphor: P },
  feature_mall:                { icon: ShoppingBag,         label: 'Feature Mall',         color: 'bg-teal-50',    phosphor: P },
  retail_zone:                 { icon: ShoppingBag,         label: 'Retail Zone',          color: 'bg-teal-50',    phosphor: P },

  // ─── Security / Service ─────────────────────────────────────
  security:                    { icon: ShieldCheck,         label: '24/7 Security',        color: 'bg-slate-50'    },
  concierge:                   { icon: HandHeart,           label: 'Concierge',            color: 'bg-slate-50',   phosphor: P },
  concierge_service:           { icon: HandHeart,           label: 'Concierge Service',    color: 'bg-slate-50',   phosphor: P },
  smart_home_automation:       { icon: Lightbulb,           label: 'Smart Home',           color: 'bg-indigo-50'   },

  // ─── Tech / Infra ───────────────────────────────────────────
  power_backup:                { icon: Zap,                 label: 'Power Backup',         color: 'bg-yellow-50'   },
  private_elevator:            { icon: Elevator,            label: 'Private Elevator',     color: 'bg-slate-50',   phosphor: P },
  automated_lighting:          { icon: Lightbulb,           label: 'Smart Lighting',       color: 'bg-yellow-50'   },
  high_speed_lifts:            { icon: Elevator,            label: 'High-Speed Lifts',     color: 'bg-slate-50',   phosphor: P },
  health_wellness_clinic:      { icon: Heartbeat,           label: 'Wellness Clinic',      color: 'bg-red-50',     phosphor: P },
  electric_charging_station:   { icon: Zap,                 label: 'EV Charging',          color: 'bg-yellow-50'   },
  intercom:                    { icon: Shield,              label: 'Intercom',             color: 'bg-slate-50',   phosphor: P },

  // ─── Parking ────────────────────────────────────────────────
  parking:                     { icon: Car,                 label: 'Parking',              color: 'bg-gray-50',    phosphor: P },
  dedicated_parking:           { icon: Car,                 label: 'Dedicated Parking',    color: 'bg-gray-50',    phosphor: P },

  // ─── Garden / Outdoor ───────────────────────────────────────
  organic_garden:              { icon: Leaf,                label: 'Organic Garden',       color: 'bg-emerald-50', phosphor: P },
  private_garden:              { icon: Park,                label: 'Private Garden',       color: 'bg-emerald-50', phosphor: P },
  orchard_gardens:             { icon: Tree,                label: 'Orchard Gardens',      color: 'bg-emerald-50', phosphor: P },
  forest_groves:               { icon: TreeEvergreen,       label: 'Forest Grove',         color: 'bg-emerald-50', phosphor: P },
  sculpture_garden:            { icon: Flower,              label: 'Sculpture Garden',     color: 'bg-emerald-50', phosphor: P },
  landscaped_greens:           { icon: Park,                label: 'Landscaped Greens',    color: 'bg-emerald-50', phosphor: P },
  landscape_garden:            { icon: Park,                label: 'Landscape Garden',     color: 'bg-emerald-50', phosphor: P },

  // ─── View / Open Space ──────────────────────────────────────
  panoramic_view:              { icon: Binoculars,          label: 'Panoramic View',       color: 'bg-sky-50'      },
  three_side_open:             { icon: Mountains,           label: 'Three-Side Open',      color: 'bg-sky-50',     phosphor: P },
  private_terrace:             { icon: CloudSun,            label: 'Private Terrace',      color: 'bg-sky-50'      },
  low_density:                 { icon: Mountains,           label: 'Low Density',          color: 'bg-emerald-50', phosphor: P },
  open_sky_deck:               { icon: CloudSun,            label: 'Sky Deck',             color: 'bg-sky-50'      },

  // ─── Interior / Luxury ──────────────────────────────────────
  marazzo_flooring:            { icon: Home,                label: 'Premium Flooring',     color: 'bg-amber-50'    },
  luxury_interiors:            { icon: Sparkle,             label: 'Luxury Interiors',     color: 'bg-amber-50',   phosphor: P },
  ac_units:                    { icon: Wind,                label: 'AC Units',             color: 'bg-sky-50'      },
  modular_kitchen:             { icon: Home,                label: 'Modular Kitchen',      color: 'bg-amber-50'    },
  vitrified_tiles:             { icon: Home,                label: 'Premium Flooring',     color: 'bg-amber-50'    },
  wooden_flooring:             { icon: Home,                label: 'Wooden Flooring',      color: 'bg-amber-50'    },
  granite_counter:             { icon: Home,                label: 'Granite Counter',      color: 'bg-amber-50'    },
  branded_fittings:            { icon: Sparkle,             label: 'Branded Fittings',     color: 'bg-amber-50',   phosphor: P },

  // ─── Health / Medical ───────────────────────────────────────
  clinic:                      { icon: Heart,               label: 'Clinic',               color: 'bg-red-50',     phosphor: P },
  pharmacy:                    { icon: Heart,               label: 'Pharmacy',             color: 'bg-red-50',     phosphor: P },
  first_aid:                   { icon: Heart,               label: 'First Aid',            color: 'bg-red-50',     phosphor: P },
};

export function getAmenityMeta(amenityKey: string): AmenityMeta {
  const normalized = normalizeAmenityKey(amenityKey);
  if (AMENITY_MAP[normalized]) return AMENITY_MAP[normalized];
  if (AMENITY_MAP[amenityKey]) return AMENITY_MAP[amenityKey];

  const label = amenityKey
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return { icon: Sparkle, label, color: 'bg-gray-50', phosphor: P };
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
  const IconComp = meta.icon as any;

  return (
    <div className="flex flex-col items-center gap-1" title={meta.label}>
      <div className={`${s.tile} ${meta.color} rounded-xl flex items-center justify-center transition-colors hover:brightness-95`}>
        <IconComp
          size={s.size}
          className="text-gray-600"
          {...(meta.phosphor ? { weight: 'duotone' } : { strokeWidth: 1.8 })}
        />
      </div>
      {showLabel && (
        <span className={`${s.label} text-gray-500 text-center leading-tight max-w-[4.5rem] truncate`}>
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
        const IconComp = meta.icon as any;
        const s = sizeMap[size];
        return (
          <div key={idx} className="flex flex-col items-center gap-1" title={meta.label}>
            <div className={`${s.tile} ${meta.color} rounded-xl flex items-center justify-center hover:brightness-95 transition-colors`}>
              <IconComp
                size={s.size}
                className="text-gray-600"
                {...(meta.phosphor ? { weight: 'duotone' } : { strokeWidth: 1.8 })}
              />
            </div>
            {showLabel && (
              <span className={`${s.label} text-gray-500 text-center leading-tight max-w-[4.5rem] truncate`}>
                {meta.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
