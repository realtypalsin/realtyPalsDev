// Minimal in-memory Prisma stand-in for testing.
// Each spec sets return values it needs. No real DB calls.
// Usage: import + inject where the module reads `prisma`, OR use node:test's
// mock.module (node >=20.6) to replace '../db'.

import { mock } from 'node:test'

export function mockPrisma(overrides: Record<string, any> = {}) {
  const model = () => ({
    findMany: mock.fn(async () => []),
    findUnique: mock.fn(async () => null),
    findFirst: mock.fn(async () => null),
    create: mock.fn(async (a: any) => a.data),
    update: mock.fn(async (a: any) => a.data),
    upsert: mock.fn(async (a: any) => a.create ?? a.update),
    delete: mock.fn(async () => ({})),
    deleteMany: mock.fn(async () => ({ count: 0 })),
    count: mock.fn(async () => 0),
    aggregate: mock.fn(async () => ({})),
  })

  return {
    lead: model(),
    callbackRequest: model(),
    siteVisitRequest: model(),
    project: model(),
    builder: model(),
    property: model(),
    chatSession: model(),
    message: model(),
    user: model(),
    shortlist: model(),
    propertyView: model(),
    auditLog: model(),
    priceAlert: model(),
    $queryRaw: mock.fn(async () => [{ '?column?': 1 }]),
    $transaction: mock.fn(async (fns: any) =>
      Array.isArray(fns) ? Promise.all(fns) : fns()
    ),
    ...overrides,
  }
}
