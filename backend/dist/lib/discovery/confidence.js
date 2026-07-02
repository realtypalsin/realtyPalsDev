"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeConfidence = computeConfidence;
exports.buildClarificationOptions = buildClarificationOptions;
const intent_1 = require("./intent");
/** Sectors with live project data — used for clarification chip options. */
const COVERED_SECTORS = [
    'Sector 75', 'Sector 78', 'Sector 79', 'Sector 93', 'Sector 107',
    'Sector 108', 'Sector 120', 'Sector 128', 'Sector 131', 'Sector 137',
    'Sector 143', 'Sector 143B', 'Sector 144', 'Sector 150', 'Sector 151',
    'Sector 167',
];
/** Chips offered when only BHK is known. */
const SECTOR_CHIPS = [
    ...['Sector 150', 'Sector 75', 'Sector 78', 'Sector 107', 'Sector 128'].map(s => ({
        label: s,
        value: s,
    })),
    { label: 'Other sector', value: 'Tell me more about sectors in Noida' },
];
/** Chips offered when only sector is known — config options. */
const BHK_CHIPS = [
    { label: '2 BHK', value: '2 BHK' },
    { label: '3 BHK', value: '3 BHK' },
    { label: '4 BHK', value: '4 BHK' },
    { label: 'Any config', value: 'Show me 2, 3 and 4 BHK options' },
];
/** Chips offered when only budget is known. */
const BUDGET_SECTOR_CHIPS = [
    ...['Sector 150', 'Sector 75', 'Sector 107', 'Sector 128'].map(s => ({
        label: s,
        value: s,
    })),
];
const BUDGET_BHK_CHIPS = [
    { label: '2 BHK', value: '2 BHK' },
    { label: '3 BHK', value: '3 BHK' },
    { label: '4 BHK', value: '4 BHK' },
];
// ---------------------------------------------------------------------------
function computeConfidence(intent) {
    const hasProjectNames = (intent.projectNames?.length ?? 0) > 0;
    const hasBuilder = !!intent.builderName;
    const hasBhk = (intent.bhk?.length ?? 0) > 0;
    const hasBudget = !!intent.budgetMax;
    const hasSector = !!intent.sector && !(0, intent_1.isCityLevel)(intent.sector);
    const hasLifestyle = (intent.lifestyleKeywords?.length ?? 0) > 0;
    // ── HIGH: specific project or builder with name → answer immediately ──────
    if (hasProjectNames) {
        return { score: 0.95, level: 'HIGH', reason: 'Specific project name identified' };
    }
    if (hasBuilder) {
        return { score: 0.90, level: 'HIGH', reason: 'Builder name identified — can search directly' };
    }
    // ── HIGH: 3 strong signals ────────────────────────────────────────────────
    const strongSignals = [hasBhk, hasBudget, hasSector].filter(Boolean).length;
    if (strongSignals === 3) {
        return { score: 0.88, level: 'HIGH', reason: 'BHK, budget, and sector all known' };
    }
    // ── MEDIUM: 2 strong signals + optional lifestyle ─────────────────────────
    if (strongSignals === 2) {
        return { score: 0.72, level: 'MEDIUM', reason: 'Two key signals known — results shown, refinement possible' };
    }
    // ── MEDIUM: 1 strong signal + lifestyle ───────────────────────────────────
    if (strongSignals === 1 && hasLifestyle) {
        return { score: 0.60, level: 'MEDIUM', reason: 'Lifestyle preference + one key signal — showing results' };
    }
    // ── LOW: single signal, no lifestyle ─────────────────────────────────────
    return { score: 0.30, level: 'LOW', reason: 'Only one signal — need more context for a useful answer' };
}
// ---------------------------------------------------------------------------
// Clarification chips builder
// Returns the chips to show for LOW confidence only.
// ---------------------------------------------------------------------------
function buildClarificationOptions(intent) {
    const hasBhk = (intent.bhk?.length ?? 0) > 0;
    const hasBudget = !!intent.budgetMax;
    const hasSector = !!intent.sector && !(0, intent_1.isCityLevel)(intent.sector);
    const bhkLabel = hasBhk ? intent.bhk.map(b => `${b}BHK`).join('/') : null;
    const budgetLabel = hasBudget ? `₹${intent.budgetMax}Cr` : null;
    // Two knowns
    if (hasSector && hasBhk && !hasBudget) {
        return {
            question: `${intent.sector} and ${bhkLabel} noted. What is your maximum budget?`,
            options: [
                { label: 'Under 1.5 Cr', value: 'Budget under 1.5 Cr' },
                { label: 'Under 2.5 Cr', value: 'Budget under 2.5 Cr' },
                { label: 'Under 3.5 Cr', value: 'Budget under 3.5 Cr' },
            ],
        };
    }
    if (hasBhk && hasBudget && !hasSector) {
        return {
            question: `${bhkLabel} under ${budgetLabel} noted. Any preferred sector?`,
            options: SECTOR_CHIPS,
        };
    }
    if (hasSector && hasBudget && !hasBhk) {
        return {
            question: `${intent.sector} under ${budgetLabel} noted. What configuration are you looking for?`,
            options: BHK_CHIPS,
        };
    }
    // One known
    if (hasBhk && !hasSector && !hasBudget) {
        return {
            question: `${bhkLabel} noted. Which sector or area are you considering?`,
            options: SECTOR_CHIPS,
        };
    }
    if (hasBudget && !hasSector && !hasBhk) {
        return {
            question: `Budget under ${budgetLabel} noted. Which sector and configuration?`,
            options: [...BUDGET_SECTOR_CHIPS, ...BUDGET_BHK_CHIPS],
        };
    }
    if (hasSector && !hasBhk && !hasBudget) {
        return {
            question: `${intent.sector} noted. What configuration are you looking for?`,
            options: BHK_CHIPS,
        };
    }
    // Zero knowns
    return {
        question: 'What are you looking for? (area, configuration, or budget)',
        options: [
            ...BHK_CHIPS.slice(0, 3),
            { label: 'Tell me options', value: 'What options are available in Noida under 2 crore?' },
        ],
    };
}
