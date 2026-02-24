export type TrademarkRisk = "clear" | "caution" | "conflict";

export interface TrademarkMatch {
  name: string;
  registrationNumber: string;
  status: string;
  source: "USPTO" | "WIPO";
}

export interface TrademarkResult {
  domain: string;
  risk: TrademarkRisk;
  matches: TrademarkMatch[];
  checkedAt: string;
}
