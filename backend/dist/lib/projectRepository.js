"use strict";
// backend/src/lib/projectRepository.ts
// Port of frontend/lib/repositories/projectRepository.ts — toProjectCard only.
// No Prisma imports here — callers pass raw DB rows from their own queries.
Object.defineProperty(exports, "__esModule", { value: true });
exports.toProjectCard = toProjectCard;
const CATEGORY_ORDER = ['sports', 'lifestyle', 'wellness', 'kids', 'security', 'parking'];
const CONN_PRIORITY = ['metro', 'airport', 'road'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toProjectCard(p) {
    const allPrices = p.unit_types
        .flatMap((u) => [u.price_min_cr, u.price_max_cr])
        .filter((v) => v != null);
    const price_min_cr = allPrices.length ? Math.min(...allPrices) : null;
    const price_max_cr = allPrices.length ? Math.max(...allPrices) : null;
    const fmt = (n) => n.toFixed(2);
    const price_range_label = price_min_cr != null && price_max_cr != null
        ? price_min_cr === price_max_cr
            ? `₹${fmt(price_min_cr)} Cr`
            : `₹${fmt(price_min_cr)} – ${fmt(price_max_cr)} Cr`
        : 'Price on request';
    const sortedAmenities = [...p.amenities].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
    const top_amenities = sortedAmenities.slice(0, 6).map((a) => ({
        name: a.name,
        category: a.category,
    }));
    const top_connectivity = [];
    for (const type of CONN_PRIORITY) {
        const found = p.connectivity.find((c) => c.type === type);
        if (found)
            top_connectivity.push({ type: found.type, name: found.name, distance_km: found.distance_km });
    }
    return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        builder: p.builder,
        rera_number: p.rera_number,
        rera_url: p.rera_url ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        sector: p.sector,
        city: p.city,
        address: p.address,
        land_area_acres: p.land_area_acres,
        total_towers: p.total_towers,
        status: p.status,
        possession_label: p.possession_label,
        possession_date: p.possession_date?.toISOString() ?? null,
        architect: p.architect,
        interior_designer: p.interior_designer,
        design_theme: p.design_theme,
        marketing_claims: p.marketing_claims,
        hero_image_url: p.hero_image_url,
        price_min_cr,
        price_max_cr,
        price_range_label,
        unit_types: p.unit_types.map((u) => ({
            name: u.name,
            bhk: u.bhk,
            bathrooms: u.bathrooms ?? null,
            super_area_sqft: u.super_area_sqft,
            carpet_area_sqft: u.carpet_area_sqft,
            price_min_cr: u.price_min_cr,
            price_max_cr: u.price_max_cr,
            price_label: u.price_label,
        })),
        top_amenities,
        top_connectivity,
        images: p.images?.map((img) => ({
            id: img.id,
            url: img.url,
            type: img.type,
            caption: img.caption,
            sort_order: img.sort_order,
        })) ?? [],
    };
}
