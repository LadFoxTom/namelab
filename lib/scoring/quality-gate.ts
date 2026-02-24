export interface QualityGateResult {
  passed: boolean;
  reason?: string;
}

const SCAM_PATTERNS = ["secure", "verify", "wallet", "login"];

export function qualityGate(domainName: string): QualityGateResult {
  const name = domainName.split(".")[0].toLowerCase();

  // Reject names <3 or >18 chars (relaxed from 4-14)
  if (name.length < 3) {
    return { passed: false, reason: `Too short (${name.length} chars, min 3)` };
  }
  if (name.length > 18) {
    return { passed: false, reason: `Too long (${name.length} chars, max 18)` };
  }

  // Reject triple repeated chars
  if (/(.)\1\1/.test(name)) {
    return { passed: false, reason: "Triple repeated character detected" };
  }

  // Reject 5+ consecutive consonants (relaxed from 4+)
  if (/[^aeiou]{5,}/.test(name)) {
    return { passed: false, reason: "5+ consecutive consonants" };
  }

  // Reject scam patterns (only at start or end of name)
  for (const scam of SCAM_PATTERNS) {
    if (name.startsWith(scam) || name.endsWith(scam)) {
      return { passed: false, reason: `Scam pattern "${scam}"` };
    }
  }

  return { passed: true };
}
