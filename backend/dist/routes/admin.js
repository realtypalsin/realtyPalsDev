"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const express_1 = require("express");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const db_1 = require("../lib/db");
const adminAuth_1 = require("../lib/adminAuth");
const cache_1 = require("../lib/cache");
const db_2 = require("../lib/db");
const request_1 = require("../lib/request");
const supabase_1 = require("../lib/supabase");
const completeness_1 = require("../lib/completeness");
const router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// Multer — memory storage, 10 MB limit
// ---------------------------------------------------------------------------
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
function sha256(value) {
    return (0, crypto_1.createHash)('sha256').update(value).digest();
}
// ---------------------------------------------------------------------------
// POST /auth — login (no admin token required)
// ---------------------------------------------------------------------------
router.post('/auth', async (req, res) => {
    const { password } = (req.body ?? {});
    const adminPassword = process.env.ADMIN_PASSWORD ?? '';
    const ip = (0, request_1.clientIp)(req);
    const { allowed } = await (0, cache_1.checkRateLimit)(`admin:login:${ip}`, 5, 900);
    if (!allowed) {
        console.log(`[admin] login rate-limited ip=${ip}`);
        res.status(429).json({ error: 'Too many attempts. Try again later.' });
        return;
    }
    const inputHash = sha256(password ?? '');
    const expectedHash = sha256(adminPassword);
    const match = inputHash.length === expectedHash.length
        && (0, crypto_1.timingSafeEqual)(inputHash, expectedHash);
    if (!adminPassword || !match) {
        console.log(`[admin] login failed ip=${ip}`);
        res.status(401).json({ error: 'Invalid password' });
        return;
    }
    const userAgent = req.headers['user-agent'] ?? '';
    let token;
    try {
        token = await (0, adminAuth_1.createAdminSession)(ip, userAgent);
    }
    catch (err) {
        console.error(`[admin] login failed: session persistence error ip=${ip}`, err);
        res.status(503).json({ error: 'Authentication service temporarily unavailable' });
        return;
    }
    console.log(`[admin] login success ip=${ip}`);
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('admin_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: isProduction,
        path: '/',
    });
    res.json({ ok: true });
});
// ---------------------------------------------------------------------------
// DELETE /auth — logout (no admin token required)
// ---------------------------------------------------------------------------
router.delete('/auth', async (req, res) => {
    const token = req.cookies?.admin_token;
    if (token) {
        await (0, adminAuth_1.destroyAdminSession)(token);
        console.log(`[admin] logout ip=${(0, request_1.clientIp)(req)}`);
    }
    res.clearCookie('admin_token', { path: '/' });
    res.json({ ok: true });
});
// ---------------------------------------------------------------------------
// All routes below require admin token
// ---------------------------------------------------------------------------
router.use(adminAuth_1.requireAdmin);
// ---------------------------------------------------------------------------
// GET /stats
// ---------------------------------------------------------------------------
router.get('/stats', async (_req, res) => {
    const [projects, sessions, leads, callbacks] = await Promise.all([
        db_1.prisma.project.count(),
        db_1.prisma.chatSession.count(),
        db_1.prisma.siteVisitRequest.count(),
        db_1.prisma.callbackRequest.count(),
    ]);
    res.json({ projects, sessions, leads, callbacks });
});
// ---------------------------------------------------------------------------
// GET /leads
// ---------------------------------------------------------------------------
router.get('/leads', async (_req, res) => {
    const [siteVisits, callbacks] = await Promise.all([
        db_1.prisma.siteVisitRequest.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
        db_1.prisma.callbackRequest.findMany({ orderBy: { created_at: 'desc' }, take: 50 }),
    ]);
    res.json({ siteVisits, callbacks });
});
// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------
const ProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    slug: zod_1.z.string().min(2),
    builder_id: zod_1.z.string().uuid(),
    sector: zod_1.z.string().min(1),
    city: zod_1.z.string().default('Noida'),
    status: zod_1.z.enum(['under_construction', 'ready_to_move', 'new_launch']),
    tagline: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    lat: zod_1.z.number().optional(),
    lng: zod_1.z.number().optional(),
    rera_number: zod_1.z.string().optional(),
    rera_url: zod_1.z.string().optional(),
    total_units: zod_1.z.number().int().optional(),
    total_towers: zod_1.z.number().int().optional(),
    land_area_acres: zod_1.z.number().optional(),
    possession_label: zod_1.z.string().optional(),
    possession_date: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    long_description: zod_1.z.string().optional(),
    design_theme: zod_1.z.string().optional(),
    architect: zod_1.z.string().optional(),
    hero_image_url: zod_1.z.string().optional(),
    marketing_claims: zod_1.z.array(zod_1.z.string()).optional(),
    ai_search_keywords: zod_1.z.array(zod_1.z.string()).optional(),
});
const ProjectPatchSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    status: zod_1.z.enum(['under_construction', 'ready_to_move', 'new_launch']).optional(),
    tagline: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    lat: zod_1.z.number().optional(),
    lng: zod_1.z.number().optional(),
    rera_number: zod_1.z.string().optional(),
    rera_url: zod_1.z.string().optional(),
    total_units: zod_1.z.number().int().optional(),
    total_towers: zod_1.z.number().int().optional(),
    land_area_acres: zod_1.z.number().optional(),
    possession_label: zod_1.z.string().optional(),
    possession_date: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    long_description: zod_1.z.string().optional(),
    design_theme: zod_1.z.string().optional(),
    architect: zod_1.z.string().optional(),
    hero_image_url: zod_1.z.string().optional(),
    marketing_claims: zod_1.z.array(zod_1.z.string()).optional(),
    ai_search_keywords: zod_1.z.array(zod_1.z.string()).optional(),
});
const BuilderSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    slug: zod_1.z.string().min(2),
    tagline: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    founded_year: zod_1.z.number().int().optional(),
    headquarters: zod_1.z.string().optional(),
    website: zod_1.z.string().optional(),
    credai_member: zod_1.z.boolean().optional(),
    delivered_units: zod_1.z.number().int().optional(),
    delivered_projects: zod_1.z.array(zod_1.z.string()).optional(),
    ongoing_projects: zod_1.z.array(zod_1.z.string()).optional(),
    awards: zod_1.z.array(zod_1.z.string()).optional(),
});
const BuilderPatchSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).optional(),
    slug: zod_1.z.string().min(2).optional(),
    founded_year: zod_1.z.number().int().nullable().optional(),
    headquarters: zod_1.z.string().nullable().optional(),
    website: zod_1.z.string().nullable().optional(),
    credai_member: zod_1.z.boolean().optional(),
});
// ── Intelligence Zod Schemas ──────────────────────────────────────────
const IntelligenceStatusEnum = zod_1.z.enum(['DRAFT', 'IN_REVIEW', 'PUBLISHED']);
// Accepts YYYY-MM-DD from date inputs or full ISO datetime strings
const dateField = zod_1.z
    .string()
    .nullable()
    .optional()
    .transform(v => {
    if (!v)
        return v;
    // date-only → append UTC midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(v))
        return `${v}T00:00:00.000Z`;
    return v;
});
const DnaPatchSchema = zod_1.z.object({
    builder_track_record_score: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    builder_track_record_label: zod_1.z.string().nullable().optional(),
    price_position_score: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    price_position_label: zod_1.z.string().nullable().optional(),
    locality_score: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    locality_label: zod_1.z.string().nullable().optional(),
    rera_compliance_score: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    rera_compliance_label: zod_1.z.string().nullable().optional(),
    amenity_depth_score: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    amenity_depth_label: zod_1.z.string().nullable().optional(),
    possession_certainty_score: zod_1.z.number().int().min(0).max(100).nullable().optional(),
    possession_certainty_label: zod_1.z.string().nullable().optional(),
    last_verified_at: dateField,
    verified_by: zod_1.z.string().nullable().optional(),
});
const ConfidenceSourceEnum = zod_1.z.enum(['RERA', 'Project Documents', 'Site Visit', 'Builder Claim', 'Estimated']);
const DecisionProfilePatchSchema = zod_1.z.object({
    status: IntelligenceStatusEnum.optional(),
    decision_thesis: zod_1.z.string().nullable().optional(),
    why_buy: zod_1.z.array(zod_1.z.string()).max(3).optional(),
    why_avoid: zod_1.z.array(zod_1.z.string()).max(3).optional(),
    best_for: zod_1.z.string().nullable().optional(),
    not_ideal_for: zod_1.z.string().nullable().optional(),
    confidence_sources: zod_1.z.array(ConfidenceSourceEnum).optional(),
    recommendation_notes: zod_1.z.string().nullable().optional(),
    advisor_notes: zod_1.z.string().nullable().optional(),
    last_verified_at: dateField,
    verified_by: zod_1.z.string().nullable().optional(),
});
const PersonaEnum = zod_1.z.enum(['FAMILY', 'PROFESSIONAL', 'INVESTOR', 'NRI', 'UPGRADER', 'RETIREE']);
const PersonaProfilePatchSchema = zod_1.z.object({
    primary_persona: PersonaEnum.nullable().optional(),
    secondary_personas: zod_1.z.array(PersonaEnum).optional(),
    income_range: zod_1.z.string().nullable().optional(),
    family_stage: zod_1.z.string().nullable().optional(),
    work_location: zod_1.z.string().nullable().optional(),
    risk_appetite: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).nullable().optional(),
    timeline_horizon: zod_1.z.string().nullable().optional(),
    motivation_note: zod_1.z.string().nullable().optional(),
    last_verified_at: dateField,
    verified_by: zod_1.z.string().nullable().optional(),
});
const RecommendationProfilePatchSchema = zod_1.z.object({
    status: IntelligenceStatusEnum.optional(),
    tier: zod_1.z.enum(['STRONG_BUY', 'BUY', 'HOLD', 'WATCH', 'AVOID']).nullable().optional(),
    primary_thesis: zod_1.z.string().nullable().optional(),
    end_use_thesis: zod_1.z.string().nullable().optional(),
    investment_thesis: zod_1.z.string().nullable().optional(),
    family_thesis: zod_1.z.string().nullable().optional(),
    investor_thesis: zod_1.z.string().nullable().optional(),
    luxury_thesis: zod_1.z.string().nullable().optional(),
    risk_thesis: zod_1.z.string().nullable().optional(),
    walk_away_conditions: zod_1.z.array(zod_1.z.string()).max(3).optional(),
    timeline_advice: zod_1.z.string().nullable().optional(),
    negotiation_leverage: zod_1.z.array(zod_1.z.string()).max(3).optional(),
    internal_confidence: zod_1.z.enum(['VERIFIED', 'PARTIAL', 'ESTIMATED']).nullable().optional(),
    admin_notes: zod_1.z.string().nullable().optional(),
    last_verified_at: dateField,
    verified_by: zod_1.z.string().nullable().optional(),
});
const CompetitorCreateSchema = zod_1.z.object({
    competitor_project_id: zod_1.z.string().uuid().nullable().optional(),
    competitor_name: zod_1.z.string().min(1),
    competitor_slug: zod_1.z.string().nullable().optional(),
    this_project_advantage: zod_1.z.string().nullable().optional(),
    competitor_advantage: zod_1.z.string().nullable().optional(),
    verdict: zod_1.z.string().nullable().optional(),
    price_delta_note: zod_1.z.string().nullable().optional(),
    sort_order: zod_1.z.number().int().default(0),
});
const CompetitorPatchSchema = CompetitorCreateSchema.omit({ competitor_name: true }).extend({
    competitor_name: zod_1.z.string().min(1).optional(),
});
const UnitCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    bhk: zod_1.z.number().int().min(0),
    super_area_sqft: zod_1.z.number().int().nullable().optional(),
    carpet_area_sqft: zod_1.z.number().int().nullable().optional(),
    balcony_area_sqft: zod_1.z.number().int().nullable().optional(),
    bathrooms: zod_1.z.number().int().nullable().optional(),
    price_min_cr: zod_1.z.number().nullable().optional(),
    price_max_cr: zod_1.z.number().nullable().optional(),
    price_label: zod_1.z.string().nullable().optional(),
    price_is_estimated: zod_1.z.boolean().optional(),
});
const UnitPatchSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    bhk: zod_1.z.number().int().min(0).optional(),
    super_area_sqft: zod_1.z.number().int().nullable().optional(),
    carpet_area_sqft: zod_1.z.number().int().nullable().optional(),
    balcony_area_sqft: zod_1.z.number().int().nullable().optional(),
    bathrooms: zod_1.z.number().int().nullable().optional(),
    price_min_cr: zod_1.z.number().nullable().optional(),
    price_max_cr: zod_1.z.number().nullable().optional(),
    price_label: zod_1.z.string().nullable().optional(),
    price_is_estimated: zod_1.z.boolean().optional(),
});
// ---------------------------------------------------------------------------
// GET /projects
// ---------------------------------------------------------------------------
router.get('/projects', async (req, res) => {
    const search = req.query.q ?? '';
    const projects = await db_1.prisma.project.findMany({
        where: search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sector: { contains: search, mode: 'insensitive' } },
                ],
            }
            : undefined,
        include: {
            builder: { select: { id: true, name: true } },
            unit_types: { select: { id: true, bhk: true, price_min_cr: true, price_max_cr: true } },
            images: { select: { id: true, url: true, type: true }, orderBy: { sort_order: 'asc' }, take: 3 },
        },
        orderBy: { name: 'asc' },
    });
    res.json({ projects });
});
// ---------------------------------------------------------------------------
// POST /projects
// ---------------------------------------------------------------------------
router.post('/projects', async (req, res) => {
    const parsed = ProjectSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    const d = parsed.data;
    const project = await db_1.prisma.project.create({
        data: {
            name: d.name,
            slug: d.slug,
            builder_id: d.builder_id,
            sector: d.sector,
            city: d.city,
            status: d.status,
            tagline: d.tagline,
            address: d.address,
            lat: d.lat,
            lng: d.lng,
            rera_number: d.rera_number,
            rera_url: d.rera_url,
            total_units: d.total_units,
            total_towers: d.total_towers,
            land_area_acres: d.land_area_acres,
            possession_label: d.possession_label,
            possession_date: d.possession_date ? new Date(d.possession_date) : undefined,
            description: d.description,
            long_description: d.long_description,
            design_theme: d.design_theme,
            architect: d.architect,
            hero_image_url: d.hero_image_url,
            marketing_claims: d.marketing_claims ?? [],
            ai_search_keywords: d.ai_search_keywords ?? [],
        },
    });
    res.status(201).json({ project });
});
// ---------------------------------------------------------------------------
// GET /projects/:id
// ---------------------------------------------------------------------------
router.get('/projects/:id', async (req, res) => {
    const project = await db_1.prisma.project.findUnique({
        where: { id: req.params.id },
        include: {
            builder: true,
            unit_types: { orderBy: { bhk: 'asc' } },
            images: { orderBy: { sort_order: 'asc' } },
            amenities: true,
            connectivity: true,
            dna: true,
            decision_profile: true,
            persona_profile: true,
            recommendation_profile: true,
            competitors: { orderBy: { sort_order: 'asc' } },
        },
    });
    if (!project) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    res.json({ project });
});
// ---------------------------------------------------------------------------
// GET /projects/:id/completeness
// ---------------------------------------------------------------------------
router.get('/projects/:id/completeness', async (req, res) => {
    const project = await db_1.prisma.project.findUnique({
        where: { id: req.params.id },
        include: {
            builder: true,
            unit_types: { select: { id: true, price_min_cr: true, super_area_sqft: true, carpet_area_sqft: true } },
            images: { select: { type: true } },
            amenities: { select: { id: true } },
            connectivity: { select: { id: true } },
            dna: { select: {
                    builder_track_record_score: true,
                    price_position_score: true,
                    locality_score: true,
                    rera_compliance_score: true,
                    amenity_depth_score: true,
                    possession_certainty_score: true,
                } },
            decision_profile: { select: { decision_thesis: true, why_buy: true, why_avoid: true } },
            persona_profile: { select: { primary_persona: true } },
            recommendation_profile: { select: { tier: true } },
            competitors: { select: { id: true } },
        },
    });
    if (!project) {
        res.status(404).json({ error: 'Not found' });
        return;
    }
    // ProjectDocument has no @relation on Project — query separately
    const docs = await db_1.prisma.projectDocument.findMany({
        where: { project_id: req.params.id },
        select: { doc_type: true },
    });
    const result = (0, completeness_1.computeCompleteness)({ ...project, documents: docs });
    res.json(result);
});
// ---------------------------------------------------------------------------
// PATCH /projects/:id
// ---------------------------------------------------------------------------
router.patch('/projects/:id', async (req, res) => {
    const parsed = ProjectPatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    const d = parsed.data;
    try {
        const updated = await db_1.prisma.project.update({
            where: { id: req.params.id },
            data: {
                ...d,
                possession_date: d.possession_date ? new Date(d.possession_date) : undefined,
            },
        });
        res.json({ project: updated });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin]', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// DELETE /projects/:id
// ---------------------------------------------------------------------------
router.delete('/projects/:id', async (req, res) => {
    try {
        await db_1.prisma.project.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin]', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// PATCH /projects/:id/dna
// ---------------------------------------------------------------------------
router.patch('/projects/:id/dna', async (req, res) => {
    const parsed = DnaPatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    try {
        const before = await db_1.prisma.projectDna.findUnique({ where: { project_id: req.params.id } });
        const dna = await db_1.prisma.projectDna.upsert({
            where: { project_id: req.params.id },
            create: { project_id: req.params.id, ...parsed.data },
            update: parsed.data,
        });
        await db_1.prisma.intelligenceAudit.create({
            data: {
                project_id: req.params.id,
                section: 'dna',
                action: before ? 'update' : 'create',
                before_data: before ?? undefined,
                after_data: dna,
            },
        });
        res.json({ dna });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin] dna patch', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// PATCH /projects/:id/decision-profile
// ---------------------------------------------------------------------------
router.patch('/projects/:id/decision-profile', async (req, res) => {
    const parsed = DecisionProfilePatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    const d = parsed.data;
    const data = {
        ...d,
        why_buy: d.why_buy?.filter(s => s.trim()) ?? undefined,
        why_avoid: d.why_avoid?.filter(s => s.trim()) ?? undefined,
    };
    try {
        const before = await db_1.prisma.decisionProfile.findUnique({ where: { project_id: req.params.id } });
        const profile = await db_1.prisma.decisionProfile.upsert({
            where: { project_id: req.params.id },
            create: { project_id: req.params.id, ...data },
            update: data,
        });
        await db_1.prisma.intelligenceAudit.create({
            data: {
                project_id: req.params.id,
                section: 'decision_profile',
                action: before ? 'update' : 'create',
                before_data: before ?? undefined,
                after_data: profile,
            },
        });
        res.json({ profile });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin] decision-profile patch', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// PATCH /projects/:id/persona-profile
// ---------------------------------------------------------------------------
router.patch('/projects/:id/persona-profile', async (req, res) => {
    const parsed = PersonaProfilePatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    try {
        const before = await db_1.prisma.personaProfile.findUnique({ where: { project_id: req.params.id } });
        const profile = await db_1.prisma.personaProfile.upsert({
            where: { project_id: req.params.id },
            create: { project_id: req.params.id, ...parsed.data },
            update: parsed.data,
        });
        await db_1.prisma.intelligenceAudit.create({
            data: {
                project_id: req.params.id,
                section: 'persona_profile',
                action: before ? 'update' : 'create',
                before_data: before ?? undefined,
                after_data: profile,
            },
        });
        res.json({ profile });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin] persona-profile patch', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// PATCH /projects/:id/recommendation-profile
// ---------------------------------------------------------------------------
router.patch('/projects/:id/recommendation-profile', async (req, res) => {
    const parsed = RecommendationProfilePatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    const d = parsed.data;
    const data = {
        ...d,
        walk_away_conditions: d.walk_away_conditions?.filter(s => s.trim()) ?? undefined,
        negotiation_leverage: d.negotiation_leverage?.filter(s => s.trim()) ?? undefined,
    };
    try {
        const before = await db_1.prisma.recommendationProfile.findUnique({ where: { project_id: req.params.id } });
        const profile = await db_1.prisma.recommendationProfile.upsert({
            where: { project_id: req.params.id },
            create: { project_id: req.params.id, ...data },
            update: data,
        });
        await db_1.prisma.intelligenceAudit.create({
            data: {
                project_id: req.params.id,
                section: 'recommendation_profile',
                action: before ? 'update' : 'create',
                before_data: before ?? undefined,
                after_data: profile,
            },
        });
        res.json({ profile });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin] recommendation-profile patch', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// POST /projects/:id/competitors
// ---------------------------------------------------------------------------
router.post('/projects/:id/competitors', async (req, res) => {
    const parsed = CompetitorCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    if (parsed.data.competitor_project_id === req.params.id) {
        res.status(400).json({ error: 'Project cannot compete with itself' });
        return;
    }
    const competitor = await db_1.prisma.projectCompetitor.create({
        data: { project_id: req.params.id, ...parsed.data },
    });
    await db_1.prisma.intelligenceAudit.create({
        data: {
            project_id: req.params.id,
            section: 'competitor',
            action: 'create',
            after_data: competitor,
        },
    });
    res.status(201).json({ competitor });
});
// ---------------------------------------------------------------------------
// PATCH /competitors/:competitorId
// ---------------------------------------------------------------------------
router.patch('/competitors/:competitorId', async (req, res) => {
    const parsed = CompetitorPatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    try {
        const before = await db_1.prisma.projectCompetitor.findUnique({ where: { id: req.params.competitorId } });
        const competitor = await db_1.prisma.projectCompetitor.update({
            where: { id: req.params.competitorId },
            data: parsed.data,
        });
        await db_1.prisma.intelligenceAudit.create({
            data: {
                project_id: competitor.project_id,
                section: 'competitor',
                action: 'update',
                before_data: before ?? undefined,
                after_data: competitor,
            },
        });
        res.json({ competitor });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin] competitor patch', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// DELETE /competitors/:competitorId
// ---------------------------------------------------------------------------
router.delete('/competitors/:competitorId', async (req, res) => {
    try {
        const before = await db_1.prisma.projectCompetitor.findUnique({ where: { id: req.params.competitorId } });
        await db_1.prisma.projectCompetitor.delete({ where: { id: req.params.competitorId } });
        if (before) {
            await db_1.prisma.intelligenceAudit.create({
                data: {
                    project_id: before.project_id,
                    section: 'competitor',
                    action: 'delete',
                    before_data: before,
                },
            });
        }
        res.json({ ok: true });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin] competitor delete', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// POST /projects/:id/units
// ---------------------------------------------------------------------------
router.post('/projects/:id/units', async (req, res) => {
    const parsed = UnitCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    const project = await db_1.prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    const unit = await db_1.prisma.unitType.create({
        data: { project_id: req.params.id, ...parsed.data },
    });
    res.status(201).json({ unit });
});
// ---------------------------------------------------------------------------
// PATCH /units/:unitId
// ---------------------------------------------------------------------------
router.patch('/units/:unitId', async (req, res) => {
    const parsed = UnitPatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    try {
        const unit = await db_1.prisma.unitType.update({
            where: { id: req.params.unitId },
            data: parsed.data,
        });
        res.json({ unit });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin] unit patch', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// DELETE /units/:unitId
// ---------------------------------------------------------------------------
router.delete('/units/:unitId', async (req, res) => {
    try {
        await db_1.prisma.unitType.delete({ where: { id: req.params.unitId } });
        res.json({ ok: true });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin] unit delete', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// Zod schemas — Amenity, Connectivity, Image, Document
// ---------------------------------------------------------------------------
const AmenityCreateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    category: zod_1.z.enum(['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking']),
});
const AmenityPatchSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    category: zod_1.z.enum(['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking']).optional(),
});
const ConnectivityCreateSchema = zod_1.z.object({
    type: zod_1.z.enum(['metro', 'road', 'school', 'hospital', 'mall', 'landmark', 'airport', 'university']),
    name: zod_1.z.string().min(1),
    distance_km: zod_1.z.number().nullable().optional(),
    data_source: zod_1.z.enum(['brochure', 'google', 'estimated', 'manual']).optional(),
    notes: zod_1.z.string().nullable().optional(),
});
const ConnectivityPatchSchema = zod_1.z.object({
    type: zod_1.z.enum(['metro', 'road', 'school', 'hospital', 'mall', 'landmark', 'airport', 'university']).optional(),
    name: zod_1.z.string().min(1).optional(),
    distance_km: zod_1.z.number().nullable().optional(),
    data_source: zod_1.z.enum(['brochure', 'google', 'estimated', 'manual']).optional(),
    notes: zod_1.z.string().nullable().optional(),
});
const ImagePatchSchema = zod_1.z.object({
    type: zod_1.z.enum(['hero', 'exterior', 'interior', 'floor_plan', 'amenity', 'master_plan', 'clubhouse', 'pool', 'location_map']).optional(),
    caption: zod_1.z.string().nullable().optional(),
    sort_order: zod_1.z.number().int().optional(),
});
const ImageCreateSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    type: zod_1.z.enum(['hero', 'exterior', 'interior', 'floor_plan', 'amenity', 'master_plan', 'clubhouse', 'pool', 'location_map']),
    caption: zod_1.z.string().nullable().optional(),
    sort_order: zod_1.z.number().int().optional(),
});
// ---------------------------------------------------------------------------
// POST /projects/:id/amenities
// ---------------------------------------------------------------------------
router.post('/projects/:id/amenities', async (req, res) => {
    const parsed = AmenityCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    const project = await db_1.prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    const amenity = await db_1.prisma.amenity.create({
        data: { project_id: req.params.id, ...parsed.data },
    });
    res.status(201).json({ amenity });
});
// ---------------------------------------------------------------------------
// PATCH /amenities/:amenityId
// ---------------------------------------------------------------------------
router.patch('/amenities/:amenityId', async (req, res) => {
    const parsed = AmenityPatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    try {
        const amenity = await db_1.prisma.amenity.update({ where: { id: req.params.amenityId }, data: parsed.data });
        res.json({ amenity });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// DELETE /amenities/:amenityId
// ---------------------------------------------------------------------------
router.delete('/amenities/:amenityId', async (req, res) => {
    try {
        await db_1.prisma.amenity.delete({ where: { id: req.params.amenityId } });
        res.json({ ok: true });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// POST /projects/:id/connectivity
// ---------------------------------------------------------------------------
router.post('/projects/:id/connectivity', async (req, res) => {
    const parsed = ConnectivityCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    const project = await db_1.prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    const entry = await db_1.prisma.connectivity.create({
        data: { project_id: req.params.id, ...parsed.data },
    });
    res.status(201).json({ entry });
});
// ---------------------------------------------------------------------------
// PATCH /connectivity/:connId
// ---------------------------------------------------------------------------
router.patch('/connectivity/:connId', async (req, res) => {
    const parsed = ConnectivityPatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    try {
        const entry = await db_1.prisma.connectivity.update({ where: { id: req.params.connId }, data: parsed.data });
        res.json({ entry });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// DELETE /connectivity/:connId
// ---------------------------------------------------------------------------
router.delete('/connectivity/:connId', async (req, res) => {
    try {
        await db_1.prisma.connectivity.delete({ where: { id: req.params.connId } });
        res.json({ ok: true });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// GET /projects/:id/images
// ---------------------------------------------------------------------------
router.get('/projects/:id/images', async (req, res) => {
    const images = await db_1.prisma.projectImage.findMany({
        where: { project_id: req.params.id },
        orderBy: { sort_order: 'asc' },
    });
    res.json({ images });
});
// ---------------------------------------------------------------------------
// POST /projects/:id/images  (attach an already-uploaded URL to the gallery)
// ---------------------------------------------------------------------------
router.post('/projects/:id/images', async (req, res) => {
    const parsed = ImageCreateSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    const project = await db_1.prisma.project.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    const image = await db_1.prisma.projectImage.create({
        data: { project_id: req.params.id, ...parsed.data },
    });
    res.status(201).json({ image });
});
// ---------------------------------------------------------------------------
// PATCH /images/:imageId
// ---------------------------------------------------------------------------
router.patch('/images/:imageId', async (req, res) => {
    const parsed = ImagePatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    try {
        const image = await db_1.prisma.projectImage.update({ where: { id: req.params.imageId }, data: parsed.data });
        res.json({ image });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// DELETE /images/:imageId
// ---------------------------------------------------------------------------
router.delete('/images/:imageId', async (req, res) => {
    try {
        await db_1.prisma.projectImage.delete({ where: { id: req.params.imageId } });
        res.json({ ok: true });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// GET /projects/:id/documents
// ---------------------------------------------------------------------------
router.get('/projects/:id/documents', async (req, res) => {
    const documents = await db_1.prisma.projectDocument.findMany({
        where: { project_id: req.params.id },
        orderBy: { created_at: 'desc' },
    });
    res.json({ documents });
});
// ---------------------------------------------------------------------------
// DELETE /documents/:docId
// ---------------------------------------------------------------------------
router.delete('/documents/:docId', async (req, res) => {
    try {
        const doc = await db_1.prisma.projectDocument.findUnique({ where: { id: req.params.docId } });
        if (!doc) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        // Delete from Supabase Storage if URL is a storage URL
        if (doc.storage_url) {
            const url = new URL(doc.storage_url);
            const pathParts = url.pathname.split('/storage/v1/object/public/');
            if (pathParts.length === 2) {
                const [bucket, ...rest] = pathParts[1].split('/');
                await supabase_1.supabaseAdmin.storage.from(bucket).remove([rest.join('/')]);
            }
        }
        await db_1.prisma.projectDocument.delete({ where: { id: req.params.docId } });
        res.json({ ok: true });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin] document delete', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// GET /builders
// ---------------------------------------------------------------------------
router.get('/builders', async (_req, res) => {
    const builders = await db_1.prisma.builder.findMany({
        include: { _count: { select: { projects: true } } },
        orderBy: { name: 'asc' },
    });
    res.json({ builders });
});
// ---------------------------------------------------------------------------
// POST /builders
// ---------------------------------------------------------------------------
router.post('/builders', async (req, res) => {
    const parsed = BuilderSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    const d = parsed.data;
    const builder = await db_1.prisma.builder.create({
        data: {
            ...d,
            delivered_projects: d.delivered_projects ?? [],
            ongoing_projects: d.ongoing_projects ?? [],
            awards: d.awards ?? [],
        },
    });
    res.status(201).json({ builder });
});
// ---------------------------------------------------------------------------
// PATCH /builders/:id
// ---------------------------------------------------------------------------
router.patch('/builders/:id', async (req, res) => {
    const parsed = BuilderPatchSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.issues[0].message });
        return;
    }
    try {
        const builder = await db_1.prisma.builder.update({
            where: { id: req.params.id },
            data: parsed.data,
        });
        res.json({ builder });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin]', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// DELETE /builders/:id
// ---------------------------------------------------------------------------
router.delete('/builders/:id', async (req, res) => {
    try {
        await db_1.prisma.builder.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (err) {
        if ((0, db_2.isPrismaNotFound)(err)) {
            res.status(404).json({ error: 'Not found' });
            return;
        }
        console.error('[admin]', err);
        res.status(500).json({ error: 'Internal error' });
    }
});
// ---------------------------------------------------------------------------
// POST /upload-image
// ---------------------------------------------------------------------------
const BUCKET = 'property-images';
router.post('/upload-image', upload.single('file'), async (req, res) => {
    const file = req.file;
    const slug = req.body?.slug ?? 'unnamed';
    if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
    }
    const ext = (file.originalname.split('.').pop()?.toLowerCase()) ?? 'jpg';
    const path = `projects/${slug}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase_1.supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (uploadErr) {
        res.status(500).json({ error: uploadErr.message });
        return;
    }
    const { data } = supabase_1.supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    res.json({ url: data.publicUrl });
});
exports.default = router;
