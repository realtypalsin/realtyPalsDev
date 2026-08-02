import type { ProjectCard } from './project'

export interface NearbyExpansion {
  requestedSector: string
  searchedSectors: string[]
  reason: 'no_results_in_requested_sector'
}

export interface Sector {
  id: string;
  city: string;
  name: string;
  avg_price_low: number;
  avg_price_high: number;
  demand_level: 'low' | 'medium' | 'high';
  supply_level: 'low' | 'medium' | 'high';
  volatility_flag: boolean;
}

export interface PropertyValidation {
  market_range: { low: number; high: number };
  verdict: 'Within market' | 'Slightly high' | 'Aggressive' | 'Market range only';
  risk_flag: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence_level?: string;
  reason_codes: string[];
}

export interface PropertyImage {
  id: string;
  image_url: string;
  image_type: 'exterior' | 'interior' | 'floor_plan' | 'amenity' | 'view';
  caption?: string | null;
  sort_order: number;
}

export interface Property {
  id: string;
  sector_id: string;
  property_type: 'flat' | 'plot';
  bhk: number;
  size_sqft: number;
  price: number;
  price_per_sqft: number;
  builder: string;
  project_name?: string | null;
  image_url?: string | null;
  floor: number | null;
  status: 'under_construction' | 'ready_to_move' | 'new_launch';
  amenities: string[];
  bathrooms?: number | null;
  balconies?: number | null;
  highlights?: string[];
  images?: PropertyImage[];
  sector: Sector;
  score?: number;
  match_score?: number;
  property_index?: number;
  property_reference?: string;
  validation?: PropertyValidation | null;
}

export interface PropertyDetail {
  id: string;
  project_name: string;
  bhk: number;
  size_sqft: number;
  price: number;
  bathrooms?: number;
  balconies?: number;
  status: string;
  builder: string;
  amenities: string[];
  highlights: string[];
  images: { url: string; caption?: string; type: string }[];
}

export type ComponentType =
  | 'property-card' | 'price-chart' | 'emi-calculator' | 'map-view'
  | 'amenities-grid' | 'connectivity-list' | 'builder-card' | 'timeline'
  | 'comparison-table' | 'payment-breakdown' | 'location-scorecard'
  | 'investment-score' | 'floor-plan-gallery' | 'decision-card'
  | 'confidence-badge' | 'risk-meter' | 'possession-timeline'
  | 'society-stats' | 'commute-card' | 'rental-yield-card'
  | 'nearby-projects' | 'reviews-summary' | 'transaction-history'

export type QueryIntent = 'payment' | 'investment' | 'location' | 'timeline' | 'builder' | 'details' | 'compare'

export interface FactValidation {
  fact: string;
  value: unknown;
  source: 'database' | 'google_maps' | 'calculator' | 'estimated' | 'derived';
  confidence: number;
  validated: boolean;
  reason?: string;
  dataAge?: number;
  lastVerifiedAt?: string;
}

export interface ComponentSpec {
  type: ComponentType;
  props: Record<string, any>;
  title?: string;
  description?: string;
}

export interface ComponentResponse {
  summary: string;
  confidence: number;
  components: ComponentSpec[];
  sources: string[];
  intent?: QueryIntent;
  projectId?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  properties?: ProjectCard[];
  exactResults?: ProjectCard[];
  nearbyResults?: ProjectCard[];
  expansion?: NearbyExpansion | null;
  images?: { url: string; caption?: string; type: string }[];
  highlights?: string[];
  amenities?: string[];
  propertyDetail?: PropertyDetail;
  showSectorIntelligence?: boolean;
  showComparisonTable?: boolean;
  comparisonProjects?: ProjectCard[];
  isSearching?: boolean;
  searchingTool?: 'search_properties' | 'search_web' | 'commute' | 'rera';
  userQuery?: string;
  timestamp: string;
  // Response mode — drives which UI components render (mutually exclusive)
  responseMode?: 'search' | 'comparison' | 'chat' | 'components';
  // Component response — verified data pipeline for project details
  componentResponse?: ComponentResponse;
  // Inline thinking UI — tracks which phase the streaming message is in
  streamingPhase?: 'extracting' | 'searching' | 'generating' | null;
  streamingIntent?: Record<string, unknown> | null;
  streamingIntentState?: string | null;
  streamingResultCount?: number | null;
  missingDimension?: 'budget' | 'bhk' | 'location' | null;
  suggestedChips?: Array<{ emoji: string; label: string; msg: string }>;
  intent?: {
    completenessScore?: number;
    bhk?: number;
    budget?: {
      min?: number;
      max?: number;
      flexibility?: string;
    };
    purpose?: string;
    is_general_query?: boolean;
  };
  chips?: unknown[]; // ChipAction[] from backend
}
