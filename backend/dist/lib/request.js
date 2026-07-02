"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientIp = clientIp;
// Returns the real client IP. Requires app.set('trust proxy', 1) in index.ts.
// With trust proxy configured, Express populates req.ip from the
// X-Forwarded-For chain correctly instead of exposing the raw header.
function clientIp(req) {
    return req.ip ?? 'unknown';
}
