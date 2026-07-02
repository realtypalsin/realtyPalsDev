"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/saved.ts
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const auth_1 = require("../lib/auth");
const projectRepository_1 = require("../lib/projectRepository");
const router = (0, express_1.Router)();
const SaveBodySchema = zod_1.z.object({
    project_id: zod_1.z.string().min(1),
});
router.get('/', async (req, res) => {
    const userId = await (0, auth_1.verifyUser)(req);
    if (!userId) {
        res.status(401).json({ error: 'Auth required' });
        return;
    }
    try {
        const saved = await db_1.prisma.savedProperty.findMany({
            where: { user_id: userId },
            include: {
                project: {
                    include: {
                        builder: { select: { name: true, slug: true } },
                        unit_types: { orderBy: { bhk: 'asc' } },
                        amenities: true,
                        connectivity: true,
                        images: { orderBy: { sort_order: 'asc' } },
                    },
                },
            },
            orderBy: { saved_at: 'desc' },
            take: 20,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const projects = saved.map((s) => (0, projectRepository_1.toProjectCard)(s.project));
        res.json({ projects, count: projects.length });
    }
    catch (err) {
        console.error('[GET /saved]', err);
        res.status(500).json({ error: 'Failed to fetch saved' });
    }
});
router.post('/', async (req, res) => {
    const userId = await (0, auth_1.verifyUser)(req);
    if (!userId) {
        res.status(401).json({ error: 'Auth required' });
        return;
    }
    const parsed = SaveBodySchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'project_id required' });
        return;
    }
    const { project_id } = parsed.data;
    try {
        await db_1.prisma.savedProperty.upsert({
            where: { user_id_project_id: { user_id: userId, project_id } },
            create: { user_id: userId, project_id },
            update: {},
        });
        res.status(201).json({ ok: true });
    }
    catch (err) {
        console.error('[POST /saved]', err);
        res.status(500).json({ error: 'Failed to save' });
    }
});
// :id param represents project_id (the foreign key), NOT the saved record's internal id.
router.delete('/:id', async (req, res) => {
    const userId = await (0, auth_1.verifyUser)(req);
    if (!userId) {
        res.status(401).json({ error: 'Auth required' });
        return;
    }
    await db_1.prisma.savedProperty.deleteMany({
        where: { user_id: userId, project_id: req.params.id },
    });
    res.json({ ok: true });
});
exports.default = router;
