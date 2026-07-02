"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminSession = createAdminSession;
exports.validateAdminSession = validateAdminSession;
exports.destroyAdminSession = destroyAdminSession;
exports.requireAdmin = requireAdmin;
const crypto_1 = require("crypto");
const cache_1 = require("./cache");
const SESSION_TTL_SECS = 7 * 24 * 60 * 60; // 7 days
const SESSION_PREFIX = 'admin:session:';
const memSessions = new Map();
function memGet(token) {
    const entry = memSessions.get(token);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        memSessions.delete(token);
        return null;
    }
    return entry.session;
}
function memSet(token, session) {
    memSessions.set(token, { session, expiresAt: Date.now() + SESSION_TTL_SECS * 1000 });
}
function memDelete(token) {
    memSessions.delete(token);
}
async function createAdminSession(ip, userAgent) {
    const token = (0, crypto_1.randomUUID)();
    const now = new Date().toISOString();
    const session = { createdAt: now, lastSeen: now, ip, userAgent };
    const written = await (0, cache_1.setCached)(`${SESSION_PREFIX}${token}`, session, SESSION_TTL_SECS);
    if (!written) {
        // Redis unavailable — fall back to in-memory store.
        console.warn('[adminAuth] Redis unavailable — using in-memory session store (single-process only)');
        memSet(token, session);
    }
    return token;
}
async function validateAdminSession(token) {
    if (!token)
        return null;
    // Try Redis first; if Redis returns null, check in-memory fallback.
    const fromRedis = await (0, cache_1.getCached)(`${SESSION_PREFIX}${token}`);
    if (fromRedis)
        return fromRedis;
    return memGet(token);
}
async function destroyAdminSession(token) {
    await (0, cache_1.deleteCached)(`${SESSION_PREFIX}${token}`);
    memDelete(token); // always clean up both stores
}
async function requireAdmin(req, res, next) {
    const token = req.cookies?.admin_token;
    const session = await validateAdminSession(token);
    if (!session) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    next();
}
