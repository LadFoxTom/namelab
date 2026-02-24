export type ToneFilter = 'playful' | 'professional' | 'bold' | 'calm' | 'techy';
export type StructureFilter = 'invented' | 'compound' | 'portmanteau' | 'suffix' | 'prefix';
export type LengthPreset = 'short' | 'sweet-spot' | 'descriptive' | 'custom';

export interface DomainSuggestion {
  domain: string;
  namingStrategy: string;
  reasoning: string;
  brandabilityScore: number;
  memorabilityScore: number;
  seoScore: number;
  lqsScore?: number;
}

export interface ClaudeResponse {
  industry: string;
  suggestions: DomainSuggestion[];
}

export interface ProviderResult {
  domain: string;
  available: boolean;
  price: number;
  isPremium: boolean;
  registrar: string;
}

export interface AffiliateProvider {
  registrar: string;
  price: number;
  affiliateUrl: string;
  isPremium: boolean;
  available: boolean;
}

export interface DomainResult {
  id: string;
  domain: string;
  reasoning: string;
  namingStrategy: string;
  brandabilityScore: number;
  memorabilityScore: number;
  seoScore: number;
  lqsScore?: number;
  providers: AffiliateProvider[];
  cheapestProvider: {
    registrar: string;
    price: number;
    affiliateUrl: string;
  } | null;
}

export interface GenerateRequest {
  businessIdea: string;
  userId?: string;
  count?: number;
  tlds?: string[];
  includeWords?: string[];
  excludeWords?: string[];
  minLength?: number;
  maxLength?: number;
  tones?: ToneFilter[];
  structures?: StructureFilter[];
  lengthPreset?: LengthPreset;
  minBrandScore?: number;
  minLinguisticScore?: number;
  minSeoScore?: number;
}

export interface StreamEvent {
  type: 'domain' | 'progress' | 'done' | 'error';
  domain?: DomainResult;
  found?: number;
  target?: number;
  elapsed?: number;
  timeLimit?: number;
  iteration?: number;
  message?: string;
}

export interface GenerateResponse {
  success: boolean;
  results?: DomainResult[];
  error?: string;
  message?: string;
}

export interface TrackClickRequest {
  domain: string;
  registrar: string;
  affiliateUrl: string;
  userId?: string;
}

export interface TldVariation {
  domain: string;
  tld: string;
  available: boolean;
  providers: AffiliateProvider[];
  cheapestProvider: {
    registrar: string;
    price: number;
    affiliateUrl: string;
  } | null;
  siteTitle: string | null;
}

export interface TldCheckResponse {
  success: boolean;
  baseName: string;
  variations: TldVariation[];
  error?: string;
}
