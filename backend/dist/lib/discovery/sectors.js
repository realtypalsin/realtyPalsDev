"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSectorContext = getSectorContext;
exports.getAllSectorsOverview = getAllSectorsOverview;
exports.getNearbySectors = getNearbySectors;
// backend/src/lib/discovery/sectors.ts
const db_1 = require("../db");
const constants_1 = require("./constants");
async function getSectorContext(sector) {
    // Exact match — `contains` would return "Sector 107" projects for a "Sector 10" query.
    const projects = await db_1.prisma.project.findMany({
        where: { sector: { equals: sector, mode: 'insensitive' } },
        include: {
            unit_types: { select: { price_min_cr: true, price_max_cr: true } },
            connectivity: { select: { type: true, name: true, distance_km: true } },
        },
    });
    if (projects.length === 0)
        return null;
    const allPrices = projects.flatMap((p) => p.unit_types.filter((u) => u.price_min_cr).map((u) => u.price_min_cr));
    const allMaxPrices = projects.flatMap((p) => p.unit_types.filter((u) => u.price_max_cr).map((u) => u.price_max_cr));
    const priceMinCr = allPrices.length ? Math.min(...allPrices) : null;
    const priceMaxCr = allMaxPrices.length ? Math.max(...allMaxPrices) : null;
    const rtmCount = projects.filter((p) => {
        const s = String(p.status);
        return s === 'ready_to_move';
    }).length;
    const ucCount = projects.filter((p) => {
        const s = String(p.status);
        return s === 'under_construction' || s === 'new_launch';
    }).length;
    const allConn = projects.flatMap((p) => p.connectivity);
    const metroStations = [
        ...new Set(allConn.filter((c) => String(c.type) === 'METRO').map((c) => c.name)),
    ].slice(0, 3);
    const keyRoads = [
        ...new Set(allConn
            .filter((c) => { const t = String(c.type); return t === 'HIGHWAY' || t === 'EXPRESSWAY'; })
            .map((c) => c.name)),
    ].slice(0, 3);
    const nearbyLandmarks = [
        ...new Set(allConn
            .filter((c) => { const t = String(c.type); return t === 'HOSPITAL' || t === 'SCHOOL' || t === 'MALL'; })
            .map((c) => c.name)),
    ].slice(0, 4);
    return {
        sector,
        projectCount: projects.length,
        priceMinCr,
        priceMaxCr,
        rtmCount,
        ucCount,
        metroStations,
        keyRoads,
        nearbyLandmarks,
    };
}
async function getAllSectorsOverview(lifestyleKeywords) {
    const projects = await db_1.prisma.project.findMany({
        include: {
            unit_types: { select: { price_min_cr: true, price_max_cr: true } },
            amenities: { select: { name: true, category: true } },
            connectivity: { select: { type: true, name: true } },
        },
    });
    const bySector = new Map();
    for (const p of projects) {
        const existing = bySector.get(p.sector) ?? [];
        existing.push(p);
        bySector.set(p.sector, existing);
    }
    const overviews = [];
    for (const [sector, sectorProjects] of bySector) {
        const allPrices = sectorProjects.flatMap((p) => p.unit_types.filter((u) => u.price_min_cr).map((u) => u.price_min_cr));
        const allMaxPrices = sectorProjects.flatMap((p) => p.unit_types.filter((u) => u.price_max_cr).map((u) => u.price_max_cr));
        // If lifestyle keywords given, score and filter sectors by amenity relevance
        const allAmenityNames = sectorProjects.flatMap((p) => p.amenities.map((a) => a.name.toLowerCase()));
        if (lifestyleKeywords?.length) {
            const matches = lifestyleKeywords.filter((kw) => allAmenityNames.some((a) => a.includes(kw.toLowerCase())));
            if (matches.length === 0)
                continue;
        }
        const topAmenities = [
            ...new Set(sectorProjects.flatMap((p) => p.amenities.map((a) => a.name))),
        ].slice(0, 5);
        const metroStations = [
            ...new Set(sectorProjects.flatMap((p) => p.connectivity.filter((c) => String(c.type) === 'METRO').map((c) => c.name))),
        ].slice(0, 2);
        overviews.push({
            sector,
            projectCount: sectorProjects.length,
            priceMinCr: allPrices.length ? Math.min(...allPrices) : null,
            priceMaxCr: allMaxPrices.length ? Math.max(...allMaxPrices) : null,
            rtmCount: sectorProjects.filter((p) => {
                const s = String(p.status);
                return s === 'ready_to_move';
            }).length,
            ucCount: sectorProjects.filter((p) => {
                const s = String(p.status);
                return s === 'under_construction' || s === 'new_launch';
            }).length,
            topAmenities,
            metroStations,
        });
    }
    // Sort by project count descending, return top N
    return overviews.sort((a, b) => b.projectCount - a.projectCount).slice(0, constants_1.SECTORS_OVERVIEW_MAX);
}
/**
 * Return adjacent sectors for a given sector name, ordered by proximity.
 * Falls back to numeric ±1/±2/±5 for sectors not in the adjacency map.
 */
function getNearbySectors(sector) {
    // Normalize to match map keys (trim, preserve case)
    const normalized = sector.trim();
    const known = constants_1.SECTOR_ADJACENCY[normalized];
    if (known)
        return known;
    // Fallback: numeric proximity for unmapped sectors like "Sector 42"
    const numMatch = normalized.match(/^Sector\s+(\d+)$/i);
    if (numMatch) {
        const n = parseInt(numMatch[1], 10);
        return [
            `Sector ${n - 1}`,
            `Sector ${n + 1}`,
            `Sector ${n - 2}`,
            `Sector ${n + 2}`,
            `Sector ${n - 5}`,
            `Sector ${n + 5}`,
        ].filter((s) => {
            const num = parseInt(s.replace(/\D/g, ''), 10);
            return num > 0;
        });
    }
    return [];
}
