export interface QualityGateResult {
  passed: boolean;
  reason?: string;
}

const FILLER_PREFIXES = ["get", "my", "the", "best", "top", "go"];
const SCAM_PATTERNS = ["secure", "verify", "wallet", "pay", "bank", "login"];

export function qualityGate(domainName: string): QualityGateResult {
  const name = domainName.split(".")[0].toLowerCase();

  // Reject names <4 or >14 chars
  if (name.length < 4) {
    return { passed: false, reason: `Too short (${name.length} chars, min 4)` };
  }
  if (name.length > 14) {
    return { passed: false, reason: `Too long (${name.length} chars, max 14)` };
  }

  // Reject triple repeated chars
  if (/(.)\1\1/.test(name)) {
    return { passed: false, reason: "Triple repeated character detected" };
  }

  // Reject 4+ consecutive consonants
  if (/[^aeiou]{4,}/.test(name)) {
    return { passed: false, reason: "4+ consecutive consonants" };
  }

  // Reject filler word prefixes
  for (const filler of FILLER_PREFIXES) {
    if (name.startsWith(filler) && name.length > filler.length) {
      return { passed: false, reason: `Filler prefix "${filler}"` };
    }
  }

  // Reject scam patterns (only at start or end of name to avoid false positives)
  for (const scam of SCAM_PATTERNS) {
    if (name.startsWith(scam) || name.endsWith(scam)) {
      return { passed: false, reason: `Scam pattern "${scam}"` };
    }
  }

  return { passed: true };
}
