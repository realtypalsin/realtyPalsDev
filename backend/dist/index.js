"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./lib/db");
const cache_1 = require("./lib/cache");
const chat_1 = __importDefault(require("./routes/chat"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const projects_1 = __importDefault(require("./routes/projects"));
const saved_1 = __importDefault(require("./routes/saved"));
const leads_1 = __importDefault(require("./routes/leads"));
const admin_1 = __importDefault(require("./routes/admin"));
const builders_1 = __importDefault(require("./routes/builders"));
const marketComparison_1 = __importDefault(require("./routes/marketComparison"));
const priceAlerts_1 = __importDefault(require("./routes/priceAlerts"));
const aqi_1 = __importDefault(require("./routes/aqi"));
const commute_1 = __importDefault(require("./routes/commute"));
const builderReputation_1 = __importDefault(require("./routes/builderReputation"));
const transcribe_1 = __importDefault(require("./routes/transcribe"));
const documents_1 = __importDefault(require("./routes/documents"));
const registryPrices_1 = __importDefault(require("./routes/registryPrices"));
// Synchronous env assertions — must run before any async work or app setup.
for (const key of ['ADMIN_PASSWORD', 'DATABASE_URL']) {
    if (!process.env[key]) {
        console.error(`[startup] FATAL: ${key} env var is not set. Refusing to start.`);
        process.exit(1);
    }
}
// Require at least one AI provider for the core chat functionality.
// This allows fallback to Groq if OpenAI is missing, or vice versa.
if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) {
    console.error('[startup] FATAL: Neither OPENAI_API_KEY nor GROQ_API_KEY is configured. At least one AI provider is required. Refusing to start.');
    process.exit(1);
}
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const VERSION = process.env.npm_package_version ?? '1.0.0';
const startTime = Date.now();
const app = (0, express_1.default)();
// All deployments sit behind a proxy (Render, Railway, Fly, etc.).
// This makes req.ip trustworthy and fixes x-forwarded-for-based rate limiting.
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// Health endpoint — probes DB and Redis; only covers local infrastructure dependencies.
// Returns 200 when healthy, 503 when the database is unreachable.
app.get('/api/v1/health', async (_req, res) => {
    let db = 'ok';
    let redis = 'ok';
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
    }
    catch {
        db = 'error';
    }
    if (!(await (0, cache_1.pingRedis)()))
        redis = 'degraded';
    const status = db === 'error' ? 503 : 200;
    res.status(status).json({
        ok: db === 'ok',
        version: VERSION,
        uptime: Math.floor(process.uptime()),
        db,
        redis,
    });
});
app.use('/api/v1/chat', chat_1.default);
app.use('/api/v1/sessions', sessions_1.default);
app.use('/api/v1/projects', projects_1.default);
app.use('/api/v1/saved', saved_1.default);
app.use('/api/v1/leads', leads_1.default);
app.use('/api/v1/admin', admin_1.default);
app.use('/api/v1/builders', builders_1.default);
app.use('/api/v1/market-comparison', marketComparison_1.default);
app.use('/api/v1/price-alerts', priceAlerts_1.default);
app.use('/api/v1/aqi', aqi_1.default);
app.use('/api/v1/commute', commute_1.default);
app.use('/api/v1/builder-reputation', builderReputation_1.default);
app.use('/api/v1/transcribe', transcribe_1.default);
app.use('/api/v1/documents', documents_1.default);
app.use('/api/v1/registry-prices', registryPrices_1.default);
// Global error handler — catches any error passed to next(err) or thrown in an
// async route (via express-async-errors). Must be registered after all routes.
app.use((err, _req, res, _next) => {
    console.error('[internal]', err.message, err.stack);
    if (res.headersSent)
        return; // SSE / streaming — cannot send a second response
    res.status(err.status ?? 500).json({ error: 'Internal server error' });
});
async function startup() {
    // Probe the database before accepting traffic. A misconfigured DATABASE_URL
    // should fail at deploy time, not at the first user request.
    try {
        await db_1.prisma.$queryRaw `SELECT 1`;
        console.log('[startup] database: ok');
    }
    catch (err) {
        console.error('[startup] FATAL: database unreachable:', err.message);
        process.exit(1);
    }
    // Probe Redis if configured. Redis is a soft dependency for most features
    // (rate limiting falls back to in-memory) but a hard dependency for admin sessions.
    const redisOk = await (0, cache_1.pingRedis)();
    if (process.env.UPSTASH_REDIS_REST_URL && !redisOk) {
        console.error('[startup] WARNING: Redis configured but unreachable — admin sessions will fail at login');
    }
    else if (redisOk) {
        console.log('[startup] redis: ok');
    }
    else {
        console.log('[startup] redis: not configured (rate limiting uses in-memory fallback)');
    }
    const server = app.listen(PORT, () => {
        const elapsed = Date.now() - startTime;
        console.log(`[startup] listening on :${PORT} — ready in ${elapsed}ms`);
        const keys = {
            GROQ_API_KEY: !!process.env.GROQ_API_KEY,
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
            GOOGLE_MAPS_API_KEY: !!process.env.GOOGLE_MAPS_API_KEY,
            TAVILY_API_KEY: !!process.env.TAVILY_API_KEY,
            SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        };
        console.log('[startup] optional env:', keys);
    });
    async function shutdown(signal) {
        console.log(`[shutdown] ${signal} received — draining connections`);
        server.close(async () => {
            await db_1.prisma.$disconnect();
            console.log('[shutdown] clean exit');
            process.exit(0);
        });
        // Most platforms (Render, K8s) default to a 30s SIGTERM grace period.
        // We force-exit at 28s to ensure we cleanly log our own timeout before the platform sends SIGKILL.
        setTimeout(() => {
            console.error('[shutdown] forced exit after 28s timeout (aligned with standard 30s platform grace period)');
            process.exit(1);
        }, 28_000).unref();
    }
    process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
    process.on('SIGINT', () => { void shutdown('SIGINT'); });
}
startup().catch((err) => {
    console.error('[startup] unhandled error:', err);
    process.exit(1);
});
