"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemory = getMemory;
exports.upsertMemory = upsertMemory;
// backend/src/lib/ai/memory.ts
const db_1 = require("../db");
async function getMemory(userId, guestToken) {
    if (!userId && !guestToken)
        return null;
    try {
        const mem = await db_1.prisma.userMemory.findFirst({
            where: userId ? { user_id: userId } : { guest_token: guestToken },
        });
        if (!mem)
            return null;
        return {
            bhk_preference: mem.bhk_preference,
            budget_max_cr: mem.budget_max_cr,
            sector_preference: mem.sector_preference,
            purpose: mem.purpose,
            viewed_slugs: mem.viewed_slugs ?? [],
        };
    }
    catch {
        return null;
    }
}
async function upsertMemory(userId, guestToken, intent, viewedSlugs) {
    if (!userId && !guestToken)
        return;
    const where = userId ? { user_id: userId } : { guest_token: guestToken };
    const existing = await db_1.prisma.userMemory.findFirst({ where });
    const merged = [...new Set([...(existing?.viewed_slugs ?? []), ...viewedSlugs])];
    const data = { viewed_slugs: merged };
    if (intent.bhk?.length)
        data.bhk_preference = intent.bhk[0];
    if (intent.budgetMin !== undefined)
        data.budget_min_cr = intent.budgetMin;
    if (intent.budgetMax !== undefined)
        data.budget_max_cr = intent.budgetMax;
    if (intent.sector)
        data.sector_preference = intent.sector;
    if (intent.purpose)
        data.purpose = intent.purpose;
    try {
        if (existing) {
            await db_1.prisma.userMemory.update({ where: { id: existing.id }, data });
        }
        else {
            const createData = {
                ...data,
                ...(userId ? { user_id: userId } : { guest_token: guestToken }),
            };
            await db_1.prisma.userMemory.create({ data: createData });
        }
    }
    catch (err) {
        console.warn('[memory] upsert failed:', err.message);
    }
}
