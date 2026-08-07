import { prisma } from '../db'

export interface BuilderReputation {
  delivered_units: number | null
  litigation_count: number | null
  credai_member: boolean | null
  legal_flag: string | null
}

// In-memory cache as fallback when Redis unavailable
const memCache = new Map<string, { data: BuilderReputation; expiresAt: number }>()

const BUILDER_CACHE_TTL = 3600 // 1h
const BUILDER_CACHE_PREFIX = 'builder:reputation:'

async function getCached<T>(key: string): Promise<T | null> {
  // Check memory cache first
  const cached = memCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T
  }
  if (cached) {
    memCache.delete(key)
  }
  return null
}

async function setCached<T>(key: string, value: T | null, ttl: number): Promise<void> {
  if (value === null) {
    memCache.delete(key)
  } else {
    memCache.set(key, {
      data: value as any,
      expiresAt: Date.now() + ttl * 1000,
    })
  }
}

export async function getBuilderReputations(
  builderIds: string[]
): Promise<Map<string, BuilderReputation>> {
  if (builderIds.length === 0) return new Map()

  const uniqueIds = [...new Set(builderIds)]
  const result = new Map<string, BuilderReputation>()
  const missingIds: string[] = []

  // Check cache for each builder individually
  for (const id of uniqueIds) {
    const cached = await getCached<BuilderReputation>(`${BUILDER_CACHE_PREFIX}${id}`)
    if (cached) {
      result.set(id, cached)
    } else {
      missingIds.push(id)
    }
  }

  // Fetch missing builders
  if (missingIds.length > 0) {
    const builders = await prisma.builder.findMany({
      where: { id: { in: missingIds } },
      select: {
        id: true,
        delivered_units: true,
        litigation_count: true,
        credai_member: true,
        legal_flag: true,
      },
    })

    // Cache each builder individually, then add to result
    for (const builder of builders) {
      const rep: BuilderReputation = {
        delivered_units: builder.delivered_units,
        litigation_count: builder.litigation_count,
        credai_member: builder.credai_member,
        legal_flag: builder.legal_flag,
      }
      await setCached(`${BUILDER_CACHE_PREFIX}${builder.id}`, rep, BUILDER_CACHE_TTL)
      result.set(builder.id, rep)
    }
  }

  return result
}

export async function invalidateBuilderCache(builderId: string): Promise<void> {
  // Call this when a builder's legal_flag or other critical field is updated
  await setCached(`${BUILDER_CACHE_PREFIX}${builderId}`, null, 0)
}
