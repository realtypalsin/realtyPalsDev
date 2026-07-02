"use strict";
// Deterministic recommendation scoring engine.
// 8 dimensions × explicit weights = 0-100 score → tier.
// No LLM involved. Every output is traceable to DB fields.
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRecommendationScore = computeRecommendationScore;
const WEIGHTS = {
    builder: 0.20,
    value: 0.20,
    location: 0.15,
    risk: 0.15,
    lifestyle: 0.10,
    liquidity: 0.10,
    rental: 0.05,
    future_growth: 0.05,
};
const NEUTRAL = 50; // default when a DNA score is missing
function clamp(n) {
    return Math.max(0, Math.min(100, n));
}
function describe(raw) {
    if (raw >= 80)
        return 'Excellent';
    if (raw >= 65)
        return 'Strong';
    if (raw >= 50)
        return 'Good';
    if (raw >= 35)
        return 'Fair';
    return 'Weak';
}
function deriveLiquidity(status, possessionDate, locationRaw) {
    let base;
    if (status === 'ready_to_move') {
        base = 88;
    }
    else {
        const monthsAway = possessionDate
            ? (possessionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
            : null;
        if (monthsAway !== null && monthsAway <= 12)
            base = 65;
        else if (monthsAway !== null && monthsAway <= 24)
            base = 52;
        else if (status === 'new_launch')
            base = 35;
        else
            base = 44;
    }
    // Better location = marginally more liquid
    return clamp(base + locationRaw * 0.12);
}
function deriveFutureGrowth(status, locationRaw) {
    // UC/new launch in a good location has more upside; RTM is already priced in
    const base = locationRaw * 0.72;
    const bonus = status !== 'ready_to_move' ? 8 : 0;
    return clamp(base + bonus);
}
function deriveRisk(reraScore, possessionScore, riskFlag, legalFlag) {
    let base = (reraScore * 0.5 + possessionScore * 0.5);
    if (riskFlag)
        base = Math.min(base, 30);
    if (legalFlag)
        base = Math.min(base, 10);
    return clamp(base);
}
function tierFromScore(total, riskFlag, legalFlag) {
    if (legalFlag)
        return 'AVOID';
    if (riskFlag) {
        // riskFlag hard-caps at WATCH regardless of score
        if (total >= 63)
            return 'WATCH';
    }
    if (total >= 78)
        return 'STRONG_BUY';
    if (total >= 63)
        return 'BUY';
    if (total >= 48)
        return 'HOLD';
    if (total >= 33)
        return 'WATCH';
    return 'AVOID';
}
function computeRecommendationScore(input) {
    const d = input.dna;
    // ── Raw dimension scores (0–100) ──────────────────────────────────────────
    const builderRaw = d?.builder_track_record_score ?? NEUTRAL;
    const valueRaw = d?.price_position_score ?? NEUTRAL;
    const locationRaw = d?.locality_score ?? NEUTRAL;
    const reraRaw = d?.rera_compliance_score ?? NEUTRAL;
    const lifestyleRaw = d?.amenity_depth_score ?? NEUTRAL;
    const possRaw = d?.possession_certainty_score ?? NEUTRAL;
    const riskRaw = deriveRisk(reraRaw, possRaw, input.project_risk_flag, input.builder.legal_flag);
    const liquidityRaw = deriveLiquidity(input.status, input.possession_date, locationRaw);
    const rentalRaw = clamp(locationRaw * 0.60 + lifestyleRaw * 0.40);
    const growthRaw = deriveFutureGrowth(input.status, locationRaw);
    // ── Weighted total ────────────────────────────────────────────────────────
    const total = clamp(builderRaw * WEIGHTS.builder +
        valueRaw * WEIGHTS.value +
        locationRaw * WEIGHTS.location +
        riskRaw * WEIGHTS.risk +
        lifestyleRaw * WEIGHTS.lifestyle +
        liquidityRaw * WEIGHTS.liquidity +
        rentalRaw * WEIGHTS.rental +
        growthRaw * WEIGHTS.future_growth);
    const rounded = Math.round(total * 10) / 10;
    const tier = tierFromScore(rounded, input.project_risk_flag, input.builder.legal_flag);
    const dim = (key, label, weight, raw) => {
        const r = Math.round(raw);
        return {
            key,
            label,
            weight,
            raw: r,
            weighted: Math.round(r * weight * 10) / 10,
            description: describe(r),
        };
    };
    return {
        total: rounded,
        tier,
        dimensions: [
            dim('builder', 'Builder Confidence', WEIGHTS.builder, builderRaw),
            dim('value', 'Value', WEIGHTS.value, valueRaw),
            dim('location', 'Location', WEIGHTS.location, locationRaw),
            dim('risk', 'Risk', WEIGHTS.risk, riskRaw),
            dim('lifestyle', 'Lifestyle', WEIGHTS.lifestyle, lifestyleRaw),
            dim('liquidity', 'Liquidity', WEIGHTS.liquidity, liquidityRaw),
            dim('rental', 'Rental Potential', WEIGHTS.rental, rentalRaw),
            dim('future_growth', 'Future Growth', WEIGHTS.future_growth, growthRaw),
        ],
    };
}
