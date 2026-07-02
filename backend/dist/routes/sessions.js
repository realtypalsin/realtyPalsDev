"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/sessions.ts
const express_1 = require("express");
const db_1 = require("../lib/db");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
router.get('/re-engagement/latest', async (req, res) => {
    const userId = (await (0, auth_1.verifyUser)(req)) ?? undefined;
    const guestToken = req.query.guestToken;
    if (!userId && !guestToken) {
        res.json({ session: null });
        return;
    }
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const session = await db_1.prisma.chatSession.findFirst({
        where: {
            ...(userId ? { user_id: userId } : { guest_token: guestToken }),
            last_active: { gt: sevenDaysAgo },
            chat_phase: { in: ['GATHERING', 'READY_TO_SEARCH', 'SHORTLISTED', 'ADVISOR'] },
        },
        orderBy: { last_active: 'desc' },
        select: { id: true, title: true, chat_phase: true, last_active: true, last_projects: true },
    });
    res.json({ session });
});
router.post('/migrate', async (req, res) => {
    const userId = await (0, auth_1.verifyUser)(req);
    const { guestToken } = req.body;
    if (!userId || !guestToken) {
        res.status(401).json({ error: 'A valid Authorization token and guestToken are required' });
        return;
    }
    const [sessions, memory] = await Promise.all([
        db_1.prisma.chatSession.updateMany({
            where: { guest_token: guestToken, user_id: null },
            data: { user_id: userId },
        }),
        db_1.prisma.userMemory.findFirst({ where: { guest_token: guestToken } }),
    ]);
    if (memory) {
        const { id: _id, guest_token: _gt, updated_at: _ua, ...memData } = memory;
        await db_1.prisma.userMemory.upsert({
            where: { user_id: userId },
            create: { ...memData, user_id: userId, guest_token: null },
            update: {
                viewed_slugs: memory.viewed_slugs,
                saved_slugs: memory.saved_slugs,
                bhk_preference: memory.bhk_preference,
                budget_max_cr: memory.budget_max_cr,
                sector_preference: memory.sector_preference,
            },
        });
    }
    res.json({ migrated: sessions.count });
});
exports.default = router;
