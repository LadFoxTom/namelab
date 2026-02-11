export interface DomainSuggestion {
  domain: string;
  namingStrategy: string;
  reasoning: string;
  brandabilityScore: number;
  memorabilityScore: number;
  seoScore: number;
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
