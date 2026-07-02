"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/leads.ts
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../lib/db");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
// GET /count — must be registered BEFORE any /:id route to avoid param collision.
router.get('/count', async (req, res) => {
    const userId = await (0, auth_1.verifyUser)(req);
    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const count = await db_1.prisma.siteVisitRequest.count({
        where: { created_at: { gte: startOfDay } },
    });
    res.json({ count });
});
const CallbackSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    phone: zod_1.z.string().min(10),
    projectName: zod_1.z.string().optional(),
    projectSlug: zod_1.z.string().optional(),
    guestToken: zod_1.z.string().optional(),
});
const SiteVisitSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    phone: zod_1.z.string().min(10),
    projectSlug: zod_1.z.string().min(1),
    projectName: zod_1.z.string(),
    visitDate: zod_1.z.string(),
    timeSlot: zod_1.z.string(),
    guestToken: zod_1.z.string().optional(),
});
router.post('/callback', async (req, res) => {
    const userId = (await (0, auth_1.verifyUser)(req)) ?? undefined;
    const parsed = CallbackSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request' });
        return;
    }
    const { name, phone, projectName, projectSlug, guestToken } = parsed.data;
    const cb = await db_1.prisma.callbackRequest.create({
        data: { name, phone, project_name: projectName, project_slug: projectSlug, user_id: userId, guest_token: guestToken },
    });
    fireWebhook('callback_requested', { name, phone, projectName }).catch((e) => console.error('[leads] webhook failed:', e));
    res.status(201).json({ callback: cb });
});
router.post('/site-visit', async (req, res) => {
    const parsed = SiteVisitSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: 'Invalid request' });
        return;
    }
    const { name, phone, projectSlug, projectName, visitDate, timeSlot } = parsed.data;
    if (visitDate) {
        const visitMs = new Date(visitDate).getTime();
        if (isNaN(visitMs) || visitMs <= Date.now()) {
            res.status(400).json({ error: 'Visit date must be in the future' });
            return;
        }
    }
    const project = await db_1.prisma.project.findUnique({ where: { slug: projectSlug }, select: { id: true } });
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    const sv = await db_1.prisma.siteVisitRequest.create({
        data: {
            project_id: project.id,
            project_slug: projectSlug,
            project_name: projectName,
            name, phone,
            visit_date: new Date(visitDate),
            time_slot: timeSlot,
        },
    });
    fireWebhook('site_visit_requested', { name, phone, projectName, visitDate, timeSlot }).catch((e) => console.error('[leads] webhook failed:', e));
    res.status(201).json({ siteVisit: sv });
});
async function fireWebhook(event, data) {
    const url = process.env.WEBHOOK_URL;
    if (!url)
        return;
    const body = JSON.stringify({ event, data, ts: Date.now() });
    // Sign the payload so the receiver can verify it actually came from us.
    const secret = process.env.WEBHOOK_SECRET;
    const headers = { 'Content-Type': 'application/json' };
    if (secret) {
        const { createHmac } = await Promise.resolve().then(() => __importStar(require('crypto')));
        headers['X-Signature'] = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    }
    // One retry on failure — leads are the revenue event; don't drop them silently.
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) });
            if (res.ok)
                return;
        }
        catch (e) {
            if (attempt === 1)
                throw e;
        }
        await new Promise((r) => setTimeout(r, 500));
    }
}
exports.default = router;
