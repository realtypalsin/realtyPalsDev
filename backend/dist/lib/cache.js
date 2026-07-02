"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
exports.invalidateSessionList = invalidateSessionList;
exports.getCached = getCached;
exports.setCached = setCached;
exports.pingRedis = pingRedis;
exports.deleteCached = deleteCached;
// backend/src/lib/cache.ts
const redis_1 = require("@upstash/redis");
let _redis = null;
function getRedis() {
    if (_redis)
        return _redis;
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        _redis = new redis_1.Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    }
    return _redis;
}
// In-memory fallback limiter so we FAIL CLOSED when Redis is absent or erroring,
// instead of letting an attacker drain the AI budget unthrottled.
const memBuckets = new Map();
function memRateLimit(key, limit, windowSecs) {
    const now = Date.now();
    const b = memBuckets.get(key);
    if (!b || b.resetAt <= now) {
        memBuckets.set(key, { count: 1, resetAt: now + windowSecs * 1000 });
        return { allowed: true, remaining: limit - 1 };
    }
    b.count += 1;
    return { allowed: b.count <= limit, remaining: Math.max(0, limit - b.count) };
}
async function checkRateLimit(key, limit = 20, windowSecs = 60) {
    const redis = getRedis();
    // No Redis configured → enforce the in-memory limit (fail closed), don't wave everyone through.
    if (!redis)
        return memRateLimit(key, limit, windowSecs);
    const redisKey = `rl:${key}`;
    try {
        const count = await redis.incr(redisKey);
        if (count === 1)
            await redis.expire(redisKey, windowSecs);
        return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
    }
    catch {
        // Redis errored → degrade to the in-memory limiter rather than failing open.
        return memRateLimit(key, limit, windowSecs);
    }
}
async function invalidateSessionList(userId) {
    const redis = getRedis();
    if (!redis)
        return;
    try {
        await redis.del(`sessions:list:${userId}`);
    }
    catch {
        // non-fatal
    }
}
async function getCached(key) {
    const redis = getRedis();
    if (!redis)
        return null;
    try {
        return await redis.get(key);
    }
    catch {
        return null;
    }
}
// Returns true if the value was written, false if Redis is absent or errored.
// Callers that require the write to succeed (e.g. admin session store) must check
// the return value and handle false as an infrastructure failure.
async function setCached(key, value, ttlSecs = 3600) {
    const redis = getRedis();
    if (!redis)
        return false;
    try {
        await redis.set(key, value, { ex: ttlSecs });
        return true;
    }
    catch (e) {
        console.error('[cache] setCached failed:', e);
        return false;
    }
}
async function pingRedis() {
    const redis = getRedis();
    if (!redis)
        return false;
    try {
        await redis.ping();
        return true;
    }
    catch {
        return false;
    }
}
async function deleteCached(key) {
    const redis = getRedis();
    if (!redis)
        return;
    try {
        await redis.del(key);
    }
    catch (e) {
        console.error('[cache] deleteCached failed:', e);
    }
}
