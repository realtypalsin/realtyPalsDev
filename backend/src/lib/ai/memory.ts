// backend/src/lib/ai/memory.ts
import { prisma } from '../db'
import type { Intent } from '../discovery'

export interface MemoryContext {
  bhk_preference?: number | null
  budget_max_cr?: number | null
  sector_preference?: string | null
  purpose?: string | null
  viewed_slugs: string[]
}

export async function getMemory(userId?: string, guestToken?: string): Promise<MemoryContext | null> {
  if (!userId && !guestToken) return null
  try {
    const mem = await prisma.userMemory.findFirst({
      where: userId ? { user_id: userId } : { guest_token: guestToken },
    })
    if (!mem) return null
    return {
      bhk_preference: mem.bhk_preference,
      budget_max_cr: mem.budget_max_cr,
      sector_preference: mem.sector_preference,
      purpose: mem.purpose,
      viewed_slugs: (mem.viewed_slugs as string[]) ?? [],
    }
  } catch {
    return null
  }
}

export async function upsertMemory(
  userId: string | undefined,
  guestToken: string | undefined,
  intent: Intent,
  viewedSlugs: string[]
): Promise<void> {
  if (!userId && !guestToken) return

  const where = userId ? { user_id: userId } : { guest_token: guestToken }
  const existing = await prisma.userMemory.findFirst({ where })
  const merged = [...new Set([...(existing?.viewed_slugs as string[] ?? []), ...viewedSlugs])]

  const data: Record<string, unknown> = { viewed_slugs: merged }
  if (intent.bhk?.length) data.bhk_preference = intent.bhk[0]
  if (intent.budgetMin !== undefined) data.budget_min_cr = intent.budgetMin
  if (intent.budgetMax !== undefined) data.budget_max_cr = intent.budgetMax
  if (intent.sector && /^Sector \d{1,3}$/i.test(intent.sector) && intent.sector.length <= 15) {
    data.sector_preference = intent.sector
  }
  if (intent.purpose) data.purpose = intent.purpose

  try {
    if (existing) {
      await prisma.userMemory.update({ where: { id: existing.id }, data })
    } else {
      const createData = {
        ...data,
        ...(userId ? { user_id: userId } : { guest_token: guestToken }),
      }
      await prisma.userMemory.create({ data: createData as Parameters<typeof prisma.userMemory.create>[0]['data'] })
    }
  } catch (err) {
    console.warn('[memory] upsert failed:', (err as Error).message)
  }
}
