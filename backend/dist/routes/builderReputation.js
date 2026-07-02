"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/builderReputation.ts
// GET /builder-reputation?name=
// No auth required.
const express_1 = require("express");
const zod_1 = require("zod");
const builderReputation_1 = require("../lib/ai/builderReputation");
const cache_1 = require("../lib/cache");
const router = (0, express_1.Router)();
const Schema = zod_1.z.object({ name: zod_1.z.string().min(2) });
router.get('/', async (req, res) => {
    const parsed = Schema.safeParse({ name: req.query['name'] });
    if (!parsed.success) {
        res.status(400).json({ error: 'name required (min 2 chars)' });
        return;
    }
    const { name } = parsed.data;
    const cacheKey = `builder-rep:${name.toLowerCase()}`;
    const cached = await (0, cache_1.getCached)(cacheKey);
    if (cached) {
        res.json(cached);
        return;
    }
    const report = await (0, builderReputation_1.getBuilderReputation)(name);
    // Cache for 24 hours — builder reputation doesn't change hourly
    await (0, cache_1.setCached)(cacheKey, report, 60 * 60 * 24);
    res.json(report);
});
exports.default = router;
