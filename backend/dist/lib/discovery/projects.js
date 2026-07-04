"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchesProjectName = matchesProjectName;
exports.discoverProjects = discoverProjects;
const db_1 = require("../db");
const intelligence_1 = require("../ai/intelligence");
const constants_1 = require("./constants");
const scoring_1 = require("./scoring");
const sectors_1 = require("./sectors");
const intent_1 = require("./intent");
/** Bidirectional substring match — mirrors SQL ILIKE fallback used in discovery Branch 1. */
function matchesProjectName(term, projectName) {
    const t = term.toLowerCase();
    const n = projectName.toLowerCase();
    return n.includes(t) || t.includes(n);
}
// ─── Shared include ───────────────────────────────────────────────────────────
// Defined once so the main query and expansion query use identical shapes.
const PROJECT_INCLUDE = {
    builder: {
        select: {
            name: true,
            slug: true,
            credai_member: true,
            delivered_units: true,
            awards_count: true,
            legal_flag: true,
        },
    },
    unit_types: true,
    images: true,
    amenities: { take: 10 },
    connectivity: { take: 5, orderBy: { distance_km: 'asc' } },
    recommendation_profile: {
        select: {
            tier: true,
            primary_thesis: true,
            family_thesis: true,
            investment_thesis: true,
            luxury_thesis: true,
            walk_away_conditions: true,
            end_use_thesis: true,
            investor_thesis: true,
            risk_thesis: true,
            timeline_advice: true,
        },
    },
    decision_profile: {
        select: {
            decision_thesis: true,
            why_buy: true,
            why_avoid: true,
            best_for: true,
            confidence_sources: true,
            not_ideal_for: true,
        },
    },
    persona_profile: {
        select: {
            primary_persona: true,
            secondary_personas: true,
            income_range: true,
            family_stage: true,
            risk_appetite: true,
            timeline_horizon: true,
        },
    },
    competitors: {
        select: {
            competitor_name: true,
            this_project_advantage: true,
            competitor_advantage: true,
            verdict: true,
            sort_order: true,
        },
        orderBy: { sort_order: 'asc' },
    },
    dna: {
        select: {
            builder_track_record_score: true,
            builder_track_record_label: true,
            rera_compliance_score: true,
            rera_compliance_label: true,
            possession_certainty_score: true,
            possession_certainty_label: true,
            price_position_score: true,
            price_position_label: true,
            locality_score: true,
            locality_label: true,
            amenity_depth_score: true,
            amenity_depth_label: true,
        },
    },
};
// ─── Hard filter builder ──────────────────────────────────────────────────────
/**
 * Build Prisma WHERE conditions from hard-filter intent fields.
 * Sector, BHK, budget ceiling, and builder are mandatory — projects failing
 * any of these never enter the candidate pool.
 *
 * BHK and budget are combined into a single unit_types.some({ AND: [...] })
 * to ensure both constraints apply to the SAME unit type. Without this, a
 * project with "3BHK @ 2.5Cr + 1BHK @ 1.2Cr" would falsely match
 * "3BHK under 1.5Cr".
 */
function buildHardFilters(intent) {
    const where = {};
    // Sector — exact match (case-insensitive). `contains` would match "Sector 10" inside "Sector 107".
    if (intent.sector && !(0, intent_1.isCityLevel)(intent.sector)) {
        where.sector = { equals: intent.sector, mode: 'insensitive' };
    }
    // BHK + budget — single AND condition on the same unit type
    const unitConditions = [];
    if (intent.bhk?.length) {
        unitConditions.push({ bhk: { in: intent.bhk } });
    }
    if (intent.budgetMax) {
        // price_min_cr comparisons automatically exclude NULL rows in Prisma
        unitConditions.push({
            price_min_cr: { lte: intent.budgetMax * constants_1.BUDGET_TOLERANCE_MAX },
        });
    }
    if (unitConditions.length === 1) {
        where.unit_types = { some: unitConditions[0] };
    }
    else if (unitConditions.length > 1) {
        where.unit_types = { some: { AND: unitConditions } };
    }
    // Builder
    if (intent.builderName) {
        where.builder = { name: { contains: intent.builderName, mode: 'insensitive' } };
    }
    // Possession — hard-filter status when buyer explicitly wants RTM.
    // Other possession values ('1year', '2year', '3year+') are soft signals only
    // (handled in scoring) because UC projects with distant possession still apply.
    if (intent.possession === 'immediate') {
        where.status = { in: ['ready_to_move'] };
    }
    return where;
}
// ─── Raw project → ScoredProject mapper ──────────────────────────────────────
function mapToScored(p, intent) {
    const allPrices = p.unit_types.filter((u) => u.price_min_cr != null).map((u) => u.price_min_cr);
    const allMaxPrices = p.unit_types.filter((u) => u.price_max_cr != null).map((u) => u.price_max_cr);
    const minP = allPrices.length ? Math.min(...allPrices) : null;
    const maxP = allMaxPrices.length ? Math.max(...allMaxPrices) : null;
    // For budget status: use only units matching the BHK filter (if set) to get
    // the most relevant price signal for the user's actual configuration.
    const relevantUnits = intent.bhk?.length
        ? p.unit_types.filter((u) => intent.bhk.includes(u.bhk))
        : p.unit_types;
    const budgetStatus = (0, scoring_1.computeBudgetStatus)(relevantUnits.length ? relevantUnits : p.unit_types, intent);
    const matchScore = Math.max((0, scoring_1.scoreProject)({
        unit_types: p.unit_types,
        possession_date: p.possession_date,
        amenities: p.amenities,
        ai_search_keywords: p.ai_search_keywords,
        builder: p.builder,
        hero_image_url: p.hero_image_url,
        images: p.images,
        rera_number: p.rera_number,
        recommendation_profile: p.recommendation_profile,
        project_risk_flag: p.project_risk_flag,
        persona_profile: p.persona_profile,
    }, intent, budgetStatus), 0);
    return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        tagline: p.tagline ?? null,
        builder: { name: p.builder.name, slug: p.builder.slug },
        rera_number: p.rera_number ?? null,
        rera_url: p.rera_url ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        sector: p.sector,
        city: p.city,
        address: p.address ?? null,
        land_area_acres: p.land_area_acres ?? null,
        total_towers: p.total_towers ?? null,
        status: String(p.status),
        launch_date: p.launch_date ? p.launch_date.toISOString() : null,
        possession_label: p.possession_label ?? null,
        possession_date: p.possession_date ? p.possession_date.toISOString() : null,
        architect: p.architect ?? null,
        interior_designer: p.interior_designer ?? null,
        design_theme: p.design_theme ?? null,
        project_risk_flag: p.project_risk_flag ?? null,
        marketing_claims: p.marketing_claims,
        hero_image_url: p.hero_image_url ?? null,
        price_min_cr: minP,
        price_max_cr: maxP,
        price_range_label: (0, scoring_1.buildPriceRangeLabel)(minP, maxP),
        unit_types: p.unit_types.map((u) => ({
            name: u.name,
            bhk: u.bhk,
            bathrooms: u.bathrooms ?? null,
            super_area_sqft: u.super_area_sqft ?? null,
            carpet_area_sqft: u.carpet_area_sqft ?? null,
            price_min_cr: u.price_min_cr ?? null,
            price_max_cr: u.price_max_cr ?? null,
            price_label: u.price_label ?? null,
        })),
        top_amenities: p.amenities.map((a) => ({
            name: a.name,
            category: String(a.category),
        })),
        top_connectivity: p.connectivity.map((c) => ({
            type: String(c.type),
            name: c.name,
            distance_km: c.distance_km ?? null,
        })),
        images: p.images.map((img) => ({
            id: img.id,
            url: img.url,
            type: String(img.type),
            caption: img.caption ?? null,
            bhk: img.bhk ?? null,
            size_sqft: img.size_sqft ?? null,
            sort_order: img.sort_order,
        })),
        matchScore,
        matchReason: (0, scoring_1.buildMatchReason)(p, intent, budgetStatus),
        ...(0, scoring_1.buildMatchSignals)({
            unit_types: p.unit_types,
            sector: p.sector,
            rera_number: p.rera_number,
            possession_date: p.possession_date,
            possession_label: p.possession_label,
            status: String(p.status),
            project_risk_flag: p.project_risk_flag ?? null,
            builder: p.builder,
            decision_profile: p.decision_profile,
            recommendation_profile: p.recommendation_profile,
            amenities: p.amenities,
            ai_search_keywords: p.ai_search_keywords,
        }, intent, budgetStatus),
        budgetStatus,
        best_for: p.decision_profile?.best_for ?? null,
        recommendation_profile: p.recommendation_profile ?? null,
        decision_profile: p.decision_profile ?? null,
        persona_profile: p.persona_profile ?? null,
        competitors: p.competitors ?? [],
        dna: p.dna ?? null,
        // Eager intelligence — pure sync, no DB cost
        decisionIntelligence: (0, intelligence_1.buildDecisionIntelligence)({
            dna: p.dna ?? null,
            project_risk_flag: p.project_risk_flag ?? null,
            rera_number: p.rera_number ?? null,
            status: String(p.status),
            possession_date: p.possession_date ? p.possession_date.toISOString() : null,
            builder: p.builder,
            decision_profile: p.decision_profile ?? null,
            recommendation_profile: p.recommendation_profile ?? null,
            persona_profile: p.persona_profile ?? null,
            sector: p.sector,
            amenities: p.amenities,
        }),
        intelligenceCompleteness: (0, intelligence_1.buildIntelligenceCompleteness)({
            dna: p.dna ?? null,
            rera_number: p.rera_number ?? null,
        }),
        buyerPersonas: (0, intelligence_1.buildBuyerPersonas)({
            dna: p.dna ?? null,
            status: String(p.status),
            project_risk_flag: p.project_risk_flag ?? null,
            persona_profile: p.persona_profile ?? null,
            amenities: p.amenities,
        }),
        dealBreakers: (0, intelligence_1.buildDealBreakers)({
            dna: p.dna ?? null,
            builder: p.builder,
            rera_number: p.rera_number ?? null,
            project_risk_flag: p.project_risk_flag ?? null,
            status: String(p.status),
        }),
        whyNot: null, // populated post-sort by scoreAndSort()
    };
}
function scoreAndSort(rawProjects, intent, threshold) {
    const scored = rawProjects.map((p) => mapToScored(p, intent));
    const passed = scored.filter((p) => p.matchScore >= threshold);
    const excluded = scored.filter((p) => p.matchScore < threshold);
    if (excluded.length > 0) {
        console.log('[DISCOVERY:EXCLUDED]', excluded.map((p) => ({
            name: p.name,
            score: p.matchScore,
            threshold,
        })));
    }
    const sorted = passed.sort((a, b) => b.matchScore - a.matchScore).slice(0, constants_1.MAX_RESULTS);
    // Populate whyNot for non-top results now that ranking is known
    if (sorted.length > 1) {
        const top = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
            sorted[i] = {
                ...sorted[i],
                whyNot: (0, intelligence_1.buildWhyNot)(sorted[i], top),
            };
        }
    }
    console.log('[DISCOVERY:SCORED]', {
        raw: rawProjects.length,
        passed: passed.length,
        excluded: excluded.length,
        threshold,
        results: sorted.map((p) => ({ name: p.name, score: p.matchScore })),
    });
    return sorted;
}
// ─── Main discovery function ──────────────────────────────────────────────────
// Generic descriptors that are NOT real project names. If the LLM
// incorrectly puts these into projectNames, we skip Branch 1 so the
// budget/sector hard-filter path (Branch 2) runs instead.
// Generic words that cannot be part of a real branded project name.
const GENERIC_NAME_WORDS = new Set([
    'best', 'good', 'top', 'affordable', 'cheap', 'budget', 'luxury',
    'premium', 'nice', 'great', 'better', 'worst', 'project', 'flat',
    'apartment', 'property', 'house', 'home', 'option', 'choice',
]);
// Markers that indicate the LLM dumped a search query into projectNames
// rather than extracting a real brand name.
const QUERY_MARKERS = /\b(under|above|below|crore|cr|lakh|bhk|sector|budget|under\s*\d|in\s+sector)\b/i;
function isGenericName(name) {
    // A name containing query-language markers is a search phrase, not a brand.
    if (QUERY_MARKERS.test(name))
        return true;
    const words = name.toLowerCase().split(/\s+/);
    return words.every((w) => GENERIC_NAME_WORDS.has(w));
}
async function discoverProjects(intent) {
    // ── Branch 1: explicit project names → direct fetch, skip all filters ──
    // Filter out generic descriptors that the LLM may have incorrectly placed
    // in projectNames (e.g. "Best project", "affordable flat").
    const realProjectNames = (intent.projectNames ?? []).filter((n) => !isGenericName(n));
    if (realProjectNames.length !== (intent.projectNames?.length ?? 0)) {
        console.log('[DISCOVERY:B1] filtered generic names:', JSON.stringify(intent.projectNames), '→', JSON.stringify(realProjectNames));
    }
    const effectiveIntent = realProjectNames.length !== (intent.projectNames?.length ?? 0)
        ? { ...intent, projectNames: realProjectNames.length > 0 ? realProjectNames : undefined }
        : intent;
    if ((effectiveIntent.projectNames?.length ?? 0) > 0) {
        console.log('[DISCOVERY:B1] requested:', JSON.stringify(effectiveIntent.projectNames));
        // Prisma `contains` = SQL ILIKE '%term%' — checks if DB name contains the search term.
        // Fails when the LLM appends extra words to the project name (e.g. "Godrej Palm Retreat Sector 150")
        // because the DB name "Godrej Palm Retreat" does NOT contain the longer string.
        for (const n of effectiveIntent.projectNames) {
            console.log(`[DISCOVERY:B1]   term="${n}"  SQL: name ILIKE '%${n}%'`);
        }
        const byName = await db_1.prisma.project.findMany({
            where: {
                OR: effectiveIntent.projectNames.map((n) => ({
                    name: { contains: n, mode: 'insensitive' },
                })),
            },
            include: PROJECT_INCLUDE,
        });
        const foundNames = byName.map((p) => p.name);
        console.log(`[DISCOVERY:B1] matched ${byName.length}/${effectiveIntent.projectNames.length}:`, JSON.stringify(foundNames));
        for (const n of effectiveIntent.projectNames) {
            const hit = byName.find((p) => matchesProjectName(n, p.name));
            if (!hit) {
                console.log(`[DISCOVERY:B1]   MISS: "${n}" — no DB project name satisfies ILIKE '%${n}%'`);
                if (byName.length === 0 && effectiveIntent.projectNames.length === 1) {
                    console.log(`[DISCOVERY:B1]   MISS REASON: project may not exist in database (check seed data)`);
                }
                else {
                    console.log(`[DISCOVERY:B1]   MISS REASON: likely intent extracted extra words (e.g. sector/city suffix) making search term longer than DB name`);
                }
            }
        }
        // Detect which requested names had no DB match — used to inject
        // PROJECT_NOT_FOUND signals into the system prompt so the AI cannot fabricate.
        // Single search term → multiple distinct projects: return disambiguation signal.
        // The chat route will short-circuit and ask "which one?" instead of silently picking.
        if (effectiveIntent.projectNames.length === 1 && byName.length > 1) {
            const query = effectiveIntent.projectNames[0];
            console.log(`[DISCOVERY:B1] MULTI-MATCH: "${query}" matched ${byName.length} projects — disambiguation required`);
            return {
                exactResults: [],
                nearbyResults: [],
                disambiguation: {
                    query,
                    candidates: byName.map((p) => ({ name: p.name, sector: p.sector, builder: p.builder.name })),
                },
            };
        }
        const notFoundNames = effectiveIntent.projectNames.filter((n) => !byName.some((p) => p.name.toLowerCase().includes(n.toLowerCase()) ||
            n.toLowerCase().includes(p.name.toLowerCase())));
        return {
            exactResults: byName.map((p) => ({
                ...mapToScored(p, {}),
                matchScore: 100,
                matchReason: 'Directly requested',
                matchReasons: ['Directly requested'],
                concerns: [],
                budgetStatus: undefined,
            })),
            nearbyResults: [],
            ...(notFoundNames.length > 0 ? { notFoundNames } : {}),
        };
    }
    // ── Branch 2: primary hard-filter query ────────────────────────────────
    // Use effectiveIntent so budget/sector signals still apply even when
    // generic names were stripped from projectNames above.
    const where = buildHardFilters(effectiveIntent);
    const rawProjects = await db_1.prisma.project.findMany({
        where,
        include: PROJECT_INCLUDE,
    });
    if (rawProjects.length > 0) {
        // Builder-only queries (no BHK/budget/sector) bypass score threshold
        // so every builder project surfaces regardless of soft-signal richness.
        const isBuilderOnly = !!effectiveIntent.builderName &&
            !effectiveIntent.bhk?.length &&
            !effectiveIntent.budgetMax &&
            (!effectiveIntent.sector || (0, intent_1.isCityLevel)(effectiveIntent.sector));
        const threshold = isBuilderOnly ? constants_1.BUILDER_ONLY_THRESHOLD : constants_1.SCORE_THRESHOLD;
        const scored = scoreAndSort(rawProjects, effectiveIntent, threshold);
        return { exactResults: scored, nearbyResults: [] };
    }
    // ── Branch 3: nearby sector expansion (parallel) ─────────────────────
    // Only fires when an explicit (non-city-level) sector was in the intent.
    // Queries all adjacent sectors in parallel → collects all candidates →
    // scores and returns the best across the entire neighbourhood.
    if (effectiveIntent.sector && !(0, intent_1.isCityLevel)(effectiveIntent.sector)) {
        const nearbySectors = (0, sectors_1.getNearbySectors)(effectiveIntent.sector);
        if (nearbySectors.length > 0) {
            const perSector = await Promise.all(nearbySectors.map((nearbySector) => db_1.prisma.project.findMany({
                where: buildHardFilters({ ...effectiveIntent, sector: nearbySector }),
                include: PROJECT_INCLUDE,
            })));
            const allExpandedRaw = perSector.flat();
            if (allExpandedRaw.length > 0) {
                const scored = scoreAndSort(allExpandedRaw, effectiveIntent, constants_1.SCORE_THRESHOLD);
                if (scored.length > 0) {
                    const searchedSectors = nearbySectors.filter((_, i) => perSector[i].length > 0);
                    return {
                        exactResults: [],
                        nearbyResults: scored,
                        expansion: {
                            requestedSector: effectiveIntent.sector,
                            searchedSectors,
                            reason: 'no_results_in_requested_sector',
                        },
                    };
                }
            }
        }
    }
    return { exactResults: [], nearbyResults: [] };
}
