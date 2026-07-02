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
  showSectorIntelligence?: boolean;
  showComparisonTable?: boolean;
  comparisonProjects?: ProjectCard[];
  isSearching?: boolean;
  userQuery?: string;
  timestamp: string;
  // Response mode — drives which UI components render (mutually exclusive)
  responseMode?: 'search' | 'comparison' | 'chat'
  // Inline thinking UI — tracks which phase the streaming message is in
  streamingPhase?: 'extracting' | 'searching' | 'generating' | null;
  streamingIntent?: Record<string, unknown> | null;
  streamingIntentState?: string | null;
  streamingResultCount?: number | null;
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
}
