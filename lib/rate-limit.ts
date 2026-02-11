import { prisma } from "./prisma";

export type UserTier = "free" | "pro";

export async function getUserTier(userId: string | null): Promise<UserTier> {
  if (!userId) return "free";

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (subscription?.status === "active") {
      return "pro";
    }
  } catch {
    // DB not available, default to free
  }

  return "free";
}

export async function checkRateLimit(
  _userId: string | null
): Promise<{ allowed: boolean; remaining: number }> {
  // No rate limiting - free to generate
  return { allowed: true, remaining: Infinity };
}
