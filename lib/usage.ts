import { eq, sql } from "drizzle-orm"

import { db } from "@/db"
import { usageEntries, type NewUsageEntry, type UsageKind } from "@/db/schema"

// Usage is retained as telemetry, but it no longer gates any feature.
export const usageLimits: Record<UsageKind, number> = {
  ai: Number.POSITIVE_INFINITY,
  sandbox: Number.POSITIVE_INFINITY,
}

export async function getUsage(userId: string) {
  const rows = await db
    .select({
      kind: usageEntries.kind,
      amount: sql`sum(${usageEntries.amount})`.mapWith(Number),
    })
    .from(usageEntries)
    .where(eq(usageEntries.userId, userId))
    .groupBy(usageEntries.kind)

  const used: Record<UsageKind, number> = { ai: 0, sandbox: 0 }
  for (const row of rows) used[row.kind] = row.amount

  return {
    period: null,
    used,
    remaining: {
      ai: Math.max(0, usageLimits.ai - used.ai),
      sandbox: Math.max(0, usageLimits.sandbox - used.sandbox),
    },
  }
}

export type Usage = NonNullable<Awaited<ReturnType<typeof getUsage>>>

// Adds to the ledger. An entry whose key is already there is left out.
export async function recordUsage(entries: NewUsageEntry[]) {
  if (entries.length === 0) return

  await db
    .insert(usageEntries)
    .values(entries)
    .onConflictDoNothing({ target: usageEntries.idempotencyKey })
}
