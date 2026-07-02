"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/priceAlerts.ts
// GET/POST/DELETE /api/v1/price-alerts
// Ported from frontend/app/api/v1/price-alerts/route.ts
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
const CreateSchema = zod_1.z.object({
    project_id: zod_1.z.string().uuid(),
    project_slug: zod_1.z.string().min(1),
    target_price_cr: zod_1.z.number().positive(),
    guest_token: zod_1.z.string().optional(),
});
// POST /price-alerts — guest_token in body OR verified userId
router.post('/', async (req, res) => {
    let body;
    try {
        body = req.body;
    }
    catch {
        res.status(400).json({ error: 'Invalid JSON' });
        return;
    }
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' });
        return;
    }
    const d = parsed.data;
    const userId = await (0, auth_1.verifyUser)(req);
    if (!userId && !d.guest_token) {
        res.status(401).json({ error: 'Auth required' });
        return;
    }
    const alert = await db_1.prisma.priceAlert.create({
        data: {
            project_id: d.project_id,
            project_slug: d.project_slug,
            target_price_cr: d.target_price_cr,
            user_id: userId ?? undefined,
            guest_token: d.guest_token,
        },
    });
    res.status(201).json({ success: true, id: alert.id });
});
// GET /price-alerts?guest_token= — userId from token OR guest_token from query
router.get('/', async (req, res) => {
    const user_id = await (0, auth_1.verifyUser)(req);
    const guest_token = typeof req.query['guest_token'] === 'string' ? req.query['guest_token'] : undefined;
    if (!user_id && !guest_token) {
        res.status(401).json({ error: 'Auth required' });
        return;
    }
    const alerts = await db_1.prisma.priceAlert.findMany({
        where: {
            ...(user_id ? { user_id } : {}),
            ...(guest_token ? { guest_token } : {}),
            notified: false,
        },
        orderBy: { created_at: 'desc' },
    });
    res.json({ alerts });
});
// DELETE /price-alerts?id= — requires userId (no guest delete)
router.delete('/', async (req, res) => {
    const id = typeof req.query['id'] === 'string' ? req.query['id'] : undefined;
    if (!id) {
        res.status(400).json({ error: 'id required' });
        return;
    }
    const userId = await (0, auth_1.verifyUser)(req);
    if (!userId) {
        res.status(401).json({ error: 'Auth required' });
        return;
    }
    await db_1.prisma.priceAlert.deleteMany({ where: { id, user_id: userId } });
    res.json({ success: true });
});
exports.default = router;
