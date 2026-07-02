"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/commute.ts
// GET /commute?origin=&destination=&lat?=&lng?=
// No auth required.
const express_1 = require("express");
const zod_1 = require("zod");
const googleMaps_1 = require("../lib/googleMaps");
const cache_1 = require("../lib/cache");
const router = (0, express_1.Router)();
const Schema = zod_1.z.object({
    origin: zod_1.z.string().min(2),
    destination: zod_1.z.string().min(2),
    lat: zod_1.z.coerce.number().optional(),
    lng: zod_1.z.coerce.number().optional(),
});
router.get('/', async (req, res) => {
    const parsed = Schema.safeParse({
        origin: req.query['origin'],
        destination: req.query['destination'],
        lat: req.query['lat'],
        lng: req.query['lng'],
    });
    if (!parsed.success) {
        res.status(400).json({ error: 'origin and destination are required' });
        return;
    }
    const { origin, destination, lat, lng } = parsed.data;
    // Cache commute results for 6 hours — road distances don't change often
    const cacheKey = `commute:${origin.toLowerCase()}:${destination.toLowerCase()}`;
    const cached = await (0, cache_1.getCached)(cacheKey);
    if (cached) {
        res.json(cached);
        return;
    }
    const [commute, nearbyMetro] = await Promise.all([
        (0, googleMaps_1.getFullCommuteProfile)(origin, destination),
        lat !== undefined && lng !== undefined
            ? (0, googleMaps_1.getNearbyPlaces)(lat, lng, 'subway_station', 4000)
            : Promise.resolve([]),
    ]);
    const result = {
        origin,
        destination,
        drive: commute.drive,
        transit: commute.transit,
        nearby_metro: nearbyMetro,
    };
    await (0, cache_1.setCached)(cacheKey, result, 60 * 60 * 6);
    res.json(result);
});
exports.default = router;
