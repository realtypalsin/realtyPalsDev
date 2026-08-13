// Canonical spec definitions for project specifications
export type SpecCategory =
  | 'structure'
  | 'flooring'
  | 'kitchen'
  | 'bathrooms'
  | 'doors_windows'
  | 'electrical'
  | 'plumbing'
  | 'lifts'
  | 'security'
  | 'sustainability'
  | 'parking'

export interface SpecDef {
  label: string
  category: SpecCategory
  icon: string
  decisionCritical: boolean
  unitScoped: boolean
  tierGuide?: Record<'luxury' | 'premium' | 'standard', string[]>
}

export const SPEC_DICTIONARY: Record<string, SpecDef> = {
  // STRUCTURE & SAFETY
  structure_type: {
    label: 'Structure Type',
    category: 'structure',
    icon: '🏗️',
    decisionCritical: true,
    unitScoped: false,
    tierGuide: {
      luxury: ['RCC Frame', 'Mivan Technology', 'Post-Tensioned'],
      premium: ['RCC Framing', 'Precast Technology'],
      standard: ['RCC Frame', 'Block & Beam'],
    },
  },
  seismic_zone: {
    label: 'Seismic Zone',
    category: 'structure',
    icon: '⚠️',
    decisionCritical: true,
    unitScoped: false,
  },
  fire_sprinklers: {
    label: 'Fire Sprinkler System',
    category: 'structure',
    icon: '🔥',
    decisionCritical: true,
    unitScoped: false,
  },

  // FLOORING
  living_room_flooring: {
    label: 'Living Room Flooring',
    category: 'flooring',
    icon: '🏠',
    decisionCritical: true,
    unitScoped: true,
    tierGuide: {
      luxury: ['Italian Marble', 'Portuguese Marble', 'Granite'],
      premium: ['Vitrified Tiles', 'Granite'],
      standard: ['Vitrified Tiles', 'Ceramic Tiles'],
    },
  },
  bedroom_flooring: {
    label: 'Bedroom Flooring',
    category: 'flooring',
    icon: '🛏️',
    decisionCritical: true,
    unitScoped: true,
    tierGuide: {
      luxury: ['Italian Marble', 'Laminate Flooring'],
      premium: ['Vitrified Tiles', 'Ceramic'],
      standard: ['Vitrified Tiles', 'Ceramic Tiles'],
    },
  },
  kitchen_flooring: {
    label: 'Kitchen Flooring',
    category: 'flooring',
    icon: '🍳',
    decisionCritical: true,
    unitScoped: true,
  },
  bathroom_flooring: {
    label: 'Bathroom Flooring',
    category: 'flooring',
    icon: '🚿',
    decisionCritical: true,
    unitScoped: true,
    tierGuide: {
      luxury: ['Anti-Slip Marble', 'Natural Stone'],
      premium: ['Anti-Skid Vitrified', 'Ceramic'],
      standard: ['Anti-Skid Tiles', 'Ceramic'],
    },
  },
  balcony_flooring: {
    label: 'Balcony Flooring',
    category: 'flooring',
    icon: '🌳',
    decisionCritical: false,
    unitScoped: true,
  },

  // KITCHEN
  modular_kitchen: {
    label: 'Modular Kitchen',
    category: 'kitchen',
    icon: '🍴',
    decisionCritical: true,
    unitScoped: true,
  },
  kitchen_counter: {
    label: 'Kitchen Counter Material',
    category: 'kitchen',
    icon: '🔪',
    decisionCritical: true,
    unitScoped: true,
    tierGuide: {
      luxury: ['Granite', 'Quartz'],
      premium: ['Granite', 'Laminate'],
      standard: ['Laminate', 'Stainless Steel'],
    },
  },
  sink_material: {
    label: 'Sink Material',
    category: 'kitchen',
    icon: '🚰',
    decisionCritical: false,
    unitScoped: true,
    tierGuide: {
      luxury: ['Stainless Steel Grade 304', 'Composite'],
      premium: ['Stainless Steel'],
      standard: ['Stainless Steel', 'Ceramic'],
    },
  },
  gas_connection: {
    label: 'Piped Gas Connection',
    category: 'kitchen',
    icon: '🔥',
    decisionCritical: true,
    unitScoped: true,
  },

  // BATHROOMS
  sanitaryware_brand: {
    label: 'Sanitaryware Brand',
    category: 'bathrooms',
    icon: '🚽',
    decisionCritical: true,
    unitScoped: true,
    tierGuide: {
      luxury: ['Kohler', 'Grohe', 'Duravit', 'Toto'],
      premium: ['Jaquar', 'American Standard', 'Roca'],
      standard: ['Hindware', 'Cera', 'Parryware', 'Jaguar'],
    },
  },
  cp_fittings_brand: {
    label: 'CP Fittings Brand',
    category: 'bathrooms',
    icon: '🚿',
    decisionCritical: true,
    unitScoped: true,
    tierGuide: {
      luxury: ['Grohe', 'Hansgrohe', 'Kohler'],
      premium: ['Jaquar', 'Roca', 'Hindware Premium'],
      standard: ['Hindware', 'Cera', 'Parryware'],
    },
  },
  shower_partition: {
    label: 'Shower Partition',
    category: 'bathrooms',
    icon: '🛁',
    decisionCritical: false,
    unitScoped: true,
    tierGuide: {
      luxury: ['Toughened Glass', 'Frameless Glass'],
      premium: ['Toughened Glass', 'Semi-Frameless'],
      standard: ['Glass Partition', 'Tiled'],
    },
  },

  // DOORS & WINDOWS
  main_door_material: {
    label: 'Main Door Material',
    category: 'doors_windows',
    icon: '🚪',
    decisionCritical: true,
    unitScoped: true,
    tierGuide: {
      luxury: ['Teak Wood', 'Engineered Wood', 'High-Grade Plywood'],
      premium: ['Hardwood', 'Engineered Wood'],
      standard: ['Plywood', 'Engineered Wood'],
    },
  },
  windows_glazing: {
    label: 'Window Glazing',
    category: 'doors_windows',
    icon: '🪟',
    decisionCritical: true,
    unitScoped: true,
    tierGuide: {
      luxury: ['Double-Glazed Low-E', 'Triple-Glazed'],
      premium: ['Double-Glazed', 'DGU'],
      standard: ['Single-Pane', 'DGU available'],
    },
  },
  window_frame: {
    label: 'Window Frame Material',
    category: 'doors_windows',
    icon: '🔲',
    decisionCritical: true,
    unitScoped: true,
    tierGuide: {
      luxury: ['Aluminum + Thermal Break', 'Wooden'],
      premium: ['UPVC', 'Aluminum'],
      standard: ['UPVC', 'Aluminum'],
    },
  },

  // ELECTRICAL
  wiring_brand: {
    label: 'Electrical Wiring Brand',
    category: 'electrical',
    icon: '⚡',
    decisionCritical: true,
    unitScoped: false,
    tierGuide: {
      luxury: ['Polycab', 'Havells', 'Finolex'],
      premium: ['Polycab', 'Havells', 'Finolex'],
      standard: ['Polycab', 'Havells', 'Local'],
    },
  },
  switch_brand: {
    label: 'Switch Brand',
    category: 'electrical',
    icon: '🔌',
    decisionCritical: false,
    unitScoped: false,
    tierGuide: {
      luxury: ['Schneider', 'Legrand', 'Siemens'],
      premium: ['Schneider', 'Legrand', 'Philips'],
      standard: ['Anchor', 'Schneider', 'Philips'],
    },
  },
  power_backup_kva: {
    label: 'Power Backup (DG Capacity)',
    category: 'electrical',
    icon: '🔋',
    decisionCritical: true,
    unitScoped: false,
  },
  ac_points: {
    label: 'AC Points Provision',
    category: 'electrical',
    icon: '❄️',
    decisionCritical: true,
    unitScoped: true,
  },
  ev_charging: {
    label: 'EV Charging Points',
    category: 'electrical',
    icon: '🔌',
    decisionCritical: false,
    unitScoped: true,
  },

  // PLUMBING
  pipe_material: {
    label: 'Plumbing Pipe Material',
    category: 'plumbing',
    icon: '🚰',
    decisionCritical: true,
    unitScoped: false,
    tierGuide: {
      luxury: ['CPVC', 'PEX', 'Stainless Steel'],
      premium: ['CPVC', 'UPVC'],
      standard: ['CPVC', 'UPVC', 'GI'],
    },
  },
  water_source: {
    label: 'Water Source',
    category: 'plumbing',
    icon: '💧',
    decisionCritical: true,
    unitScoped: false,
  },
  stp_facility: {
    label: 'Sewage Treatment Plant',
    category: 'plumbing',
    icon: '♻️',
    decisionCritical: true,
    unitScoped: false,
  },
  rainwater_harvesting: {
    label: 'Rainwater Harvesting',
    category: 'plumbing',
    icon: '🌧️',
    decisionCritical: false,
    unitScoped: false,
  },

  // LIFTS
  lift_brand: {
    label: 'Lift Brand',
    category: 'lifts',
    icon: '🛗',
    decisionCritical: true,
    unitScoped: false,
    tierGuide: {
      luxury: ['Otis', 'Schindler', 'Kone'],
      premium: ['Otis', 'Kone', 'Hyundai'],
      standard: ['Hyundai', 'Johnson', 'Bharat'],
    },
  },
  lifts_per_core: {
    label: 'Lifts per Core',
    category: 'lifts',
    icon: '📊',
    decisionCritical: true,
    unitScoped: false,
  },
  service_lift: {
    label: 'Service Lift',
    category: 'lifts',
    icon: '📦',
    decisionCritical: false,
    unitScoped: false,
  },

  // SECURITY
  cctv_coverage: {
    label: 'CCTV Coverage',
    category: 'security',
    icon: '📹',
    decisionCritical: true,
    unitScoped: false,
  },
  security_type: {
    label: 'Security Type',
    category: 'security',
    icon: '🔐',
    decisionCritical: true,
    unitScoped: false,
  },
  access_control: {
    label: 'Access Control System',
    category: 'security',
    icon: '🔑',
    decisionCritical: false,
    unitScoped: false,
  },

  // SUSTAINABILITY
  green_certification: {
    label: 'Green Certification',
    category: 'sustainability',
    icon: '🌿',
    decisionCritical: false,
    unitScoped: false,
  },
  solar_power: {
    label: 'Solar Power System',
    category: 'sustainability',
    icon: '☀️',
    decisionCritical: false,
    unitScoped: false,
  },
  led_common_areas: {
    label: 'LED in Common Areas',
    category: 'sustainability',
    icon: '💡',
    decisionCritical: false,
    unitScoped: false,
  },

  // PARKING
  parking_type: {
    label: 'Parking Type',
    category: 'parking',
    icon: '🅿️',
    decisionCritical: true,
    unitScoped: false,
    tierGuide: {
      luxury: ['Basement', 'Covered Podium'],
      premium: ['Basement', 'Stilt'],
      standard: ['Stilt', 'Open', 'Podium'],
    },
  },
  covered_parking_ratio: {
    label: 'Covered Parking Ratio',
    category: 'parking',
    icon: '🚗',
    decisionCritical: true,
    unitScoped: true,
  },
}

export function getCategoryIcon(category: SpecCategory): string {
  const categoryMap: Record<SpecCategory, string> = {
    structure: '🏗️',
    flooring: '🏠',
    kitchen: '🍴',
    bathrooms: '🚿',
    doors_windows: '🚪',
    electrical: '⚡',
    plumbing: '🚰',
    lifts: '🛗',
    security: '🔐',
    sustainability: '🌿',
    parking: '🅿️',
  }
  return categoryMap[category] || '📋'
}

export function getCategory(label: string): SpecCategory | null {
  const spec = SPEC_DICTIONARY[label.toLowerCase().replace(/\s+/g, '_')]
  return spec?.category || null
}

export function getTierFromBrand(label: string, brand: string): string | null {
  const spec = SPEC_DICTIONARY[label.toLowerCase().replace(/\s+/g, '_')]
  if (!spec?.tierGuide || !brand) return null

  for (const [tier, brands] of Object.entries(spec.tierGuide)) {
    if (brands.some(b => brand.toLowerCase().includes(b.toLowerCase()))) {
      return tier
    }
  }
  return null
}
