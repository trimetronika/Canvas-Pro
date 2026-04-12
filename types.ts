export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface PlaceSource {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  maps?: {
    sourceId?: string;
    title?: string;
    uri?: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        content?: string;
      }[];
    }[];
  };
}

export type VisitStatus = 'pending' | 'visited' | 'skipped';
export type LeadScore = 'hot' | 'warm' | 'cold';

export interface CanvasStop extends PlaceSource {
  id: string;
  status: VisitStatus;
  notes: string;
  selected: boolean; 
  lat?: number; // Optional
  lng?: number; // Optional
  distance?: number; // Distance from start in KM
  score?: LeadScore; // AI Assessment
  category?: string; // Specific industry/business type
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  absenkuAnalysis?: string;
}

export interface CanvasPlan {
  id: string;
  timestamp: number;
  industries: IndustryOption[];
  industry?: IndustryOption; // Deprecated, kept for backward compatibility
  customQuery?: string; // Added for custom search support
  markdownText: string;
  stops: CanvasStop[];
  isSaved?: boolean;
}

export type IndustryType = 'corporate' | 'industrial' | 'startup' | 'retail' | 'hospitality' | 'outsourcing' | 'education' | 'health' | 'custom' | 'ai-recommendation';

export interface IndustryOption {
  id: string; // Changed to string to support custom IDs
  label: string;
  query: string;
  icon: string;
}

export interface DatabaseItem extends CanvasStop {
  savedAt: number;
  sourcePlanId?: string;
}