"use strict";
// backend/src/lib/discovery/conversationEngine.ts
//
// Pure deterministic Conversation Engine.
// No React. No DB. No LLM.
//
// Input:  intent, discovery results, turn metadata
// Output: ConversationState (stage + chips + thinking + missingFields + confidence)
//
// This is the SINGLE place that decides conversation intelligence.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getThinkingMessage = getThinkingMessage;
exports.computeConversationState = computeConversationState;
// ─── Stage computation ────────────────────────────────────────────────────────
function computeStage(intent, intentState, results, isComparison) {
    if (isComparison)
        return 'COMPARING';
    if (results.length > 0 && intentState === 'SHORTLISTED')
        return 'DECIDING';
    if (results.length > 0)
        return 'RESEARCH';
    if (intentState === 'READY_TO_SEARCH')
        return 'SEARCHING';
    if (intentState === 'GATHERING')
        return 'CLARIFYING';
    return 'DISCOVERY';
}
// ─── Missing field computation ────────────────────────────────────────────────
function getMissingFields(intent, intentState) {
    if (intentState === 'COLD')
        return ['location', 'bhk', 'budget'];
    const missing = [];
    if (!intent.sector)
        missing.push('sector');
    if (!intent.bhk?.length)
        missing.push('bhk');
    if (!intent.budgetMax && !intent.budgetMin)
        missing.push('budget');
    if (!intent.purpose)
        missing.push('purpose');
    return missing;
}
// ─── Confidence ───────────────────────────────────────────────────────────────
function computeConfidenceLevel(intent) {
    const signals = [
        !!intent.sector, (intent.bhk?.length ?? 0) > 0,
        !!intent.budgetMax || !!intent.budgetMin, !!intent.purpose,
    ].filter(Boolean).length;
    if (signals >= 3)
        return 'HIGH';
    if (signals >= 1)
        return 'MEDIUM';
    return 'LOW';
}
// ─── Thinking message ─────────────────────────────────────────────────────────
function getThinkingMessage(stage, intent) {
    switch (stage) {
        case 'SEARCHING':
            return intent.sector
                ? `Searching projects in ${intent.sector}…`
                : 'Searching available projects…';
        case 'RESEARCH':
            return 'Ranking by fit and value…';
        case 'COMPARING':
            return 'Preparing detailed comparison…';
        case 'DECIDING':
            return 'Analysing your shortlist…';
        case 'CONVERTING':
            return 'Preparing next steps…';
        default:
            return 'Understanding your requirements…';
    }
}
// ─── Chip generation ──────────────────────────────────────────────────────────
const SECTOR_OPTIONS = [
    'Sector 150', 'Sector 137', 'Sector 75', 'Sector 128', 'Sector 93', 'Expressway',
];
const BUDGET_OPTIONS = [
    { label: 'Under ₹1.5 Cr', patch: { budgetMax: 1.5 } },
    { label: '₹1.5 – ₹2.5 Cr', patch: { budgetMin: 1.5, budgetMax: 2.5 } },
    { label: '₹2.5 – ₹4 Cr', patch: { budgetMin: 2.5, budgetMax: 4 } },
    { label: 'Luxury ₹4 Cr+', patch: { budgetMin: 4 } },
];
const BHK_OPTIONS = [2, 3, 4];
function chip(id, actionType, label, icon, payload, priority) {
    return { id, actionType, label, icon, analyticsId: id, priority, payload };
}
function getDiscoveryChips(intent) {
    return [
        chip('find_3bhk', 'TEXT_MESSAGE', 'Best 3 BHK', '🏠', { text: 'Show me the best 3 BHK apartments in Noida' }, 1),
        chip('luxury', 'TEXT_MESSAGE', 'Luxury homes', '✨', { text: 'Show luxury apartments on Noida Expressway' }, 2),
        chip('investment', 'TEXT_MESSAGE', 'Top investment', '📈', { text: 'Best areas for property investment in Noida right now' }, 3),
        chip('ready_move', 'TEXT_MESSAGE', 'Ready to move', '🔑', { text: 'Ready to move properties under 2 Cr in Noida' }, 4),
    ];
}
function getClarifyingChips(intent, missingFields, results, chatHistory) {
    const chips = [];
    let priority = 1;
    // Extract previously suggested or rejected text from history to avoid repeats
    const historyText = chatHistory.map(m => m.content.toLowerCase()).join(' ');
    // Missing sector — offer sectors based on actual returned projects (data-driven)
    if (missingFields.includes('sector') && !intent.sector) {
        const candidateSectors = Array.from(new Set(results.map(r => r.sector)))
            .filter(sector => sector && !historyText.includes(sector.toLowerCase()));
        // Take top 3 sectors from actual inventory matching the rest of the intent
        const sectors = candidateSectors.slice(0, 3);
        for (const sector of sectors) {
            chips.push(chip(`sector_${sector.replace(/\s/g, '_').toLowerCase()}`, 'INTENT_PATCH', sector, '📍', { patch: { sector }, label: sector }, priority++));
        }
        if (chips.length > 0)
            return chips;
    }
    // Missing BHK
    if (missingFields.includes('bhk') && !intent.bhk?.length) {
        for (const bhk of BHK_OPTIONS) {
            chips.push(chip(`bhk_${bhk}`, 'INTENT_PATCH', `${bhk} BHK`, '🏠', { patch: { bhk: [bhk] }, label: `${bhk} BHK` }, priority++));
        }
        return chips;
    }
    // Missing budget
    if (missingFields.includes('budget') && !intent.budgetMax && !intent.budgetMin) {
        for (const opt of BUDGET_OPTIONS) {
            chips.push(chip(`budget_${opt.label.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`, 'INTENT_PATCH', opt.label, '💰', { patch: opt.patch, label: opt.label }, priority++));
        }
        return chips;
    }
    return getDiscoveryChips(intent);
}
function getResearchChips(intent, results) {
    const chips = [];
    const hasMultiple = results.length >= 2;
    const hasUnderConstruction = results.some(r => r.status === 'under_construction' || r.status === 'new_launch');
    if (hasMultiple) {
        // Frictionless Comparison: Bypasses picker if exactly 2 or 3 projects.
        const directCompare = results.length <= 3;
        chips.push(chip('compare', 'COMPARE_PROPERTIES', 'Compare Top Picks', '⚖️', directCompare ? { mode: 'direct', selected: results.slice(0, 3).map(r => r.slug) } : { mode: 'multi' }, 1));
    }
    chips.push(chip('emi', 'CALCULATE_EMI', 'Calculate EMI', '📊', { mode: 'single' }, 2));
    if (hasUnderConstruction) {
        chips.push(chip('builder_risk', 'TEXT_MESSAGE', 'Builder delivery risk', '🏗️', { text: `What are the builder delivery risks for projects in ${intent.sector ?? 'my shortlist'}?` }, 3));
    }
    else {
        chips.push(chip('builder_track', 'TEXT_MESSAGE', 'Builder track record', '🏗️', { text: `Tell me about the builders in my shortlist — delivery history and reputation` }, 3));
    }
    if (intent.purpose === 'investment' || !intent.purpose) {
        chips.push(chip('roi', 'TEXT_MESSAGE', 'Investment ROI', '📈', { text: 'What is the rental yield and appreciation potential for these projects?' }, 4));
    }
    else {
        chips.push(chip('nearby', 'TEXT_MESSAGE', 'Nearby amenities', '🏫', { text: 'What schools, hospitals, and metro stations are near these properties?' }, 4));
    }
    return chips.slice(0, 4);
}
function getComparingChips(results) {
    return [
        chip('roi_compare', 'TEXT_MESSAGE', 'Which offers better ROI?', '📈', { text: 'Which of these properties offers better return on investment?' }, 1),
        chip('hidden_costs', 'TEXT_MESSAGE', 'Hidden costs', '💸', { text: 'What are the total hidden costs: maintenance, GST, stamp duty for each?' }, 2),
        chip('family_fit', 'TEXT_MESSAGE', 'Best for families', '👨‍👩‍👧', { text: 'Which project is better suited for a family with children?' }, 3),
        chip('payment_plan', 'TEXT_MESSAGE', 'Payment plans', '🗓️', { text: 'Compare the payment plans and construction-linked plans for these projects' }, 4),
    ];
}
function getDecidingChips(results) {
    const chips = [
        chip('emi_final', 'CALCULATE_EMI', 'Calculate EMI', '📊', { mode: 'single' }, 1),
        chip('payment_plan', 'TEXT_MESSAGE', 'View payment plan', '🗓️', { text: 'Show me the detailed payment plan and construction timeline' }, 2),
        chip('book_visit', 'BOOK_VISIT', 'Book site visit', '📅', { mode: 'single' }, 3),
    ];
    if (results.length >= 2) {
        chips.unshift(chip('final_compare', 'COMPARE_PROPERTIES', 'Final comparison', '⚖️', { mode: 'multi' }, 0));
    }
    return chips.slice(0, 4);
}
// ─── Main export ──────────────────────────────────────────────────────────────
function computeConversationState(intent, intentState, results, isComparison, chatHistory = []) {
    const stage = computeStage(intent, intentState, results, isComparison);
    const missingFields = getMissingFields(intent, intentState);
    const confidence = computeConfidenceLevel(intent);
    const thinking = getThinkingMessage(stage, intent);
    let chips = [];
    switch (stage) {
        case 'DISCOVERY':
            chips = getDiscoveryChips(intent);
            break;
        case 'CLARIFYING':
            chips = getClarifyingChips(intent, missingFields, results, chatHistory);
            break;
        case 'SEARCHING':
        case 'RESEARCH':
            chips = getResearchChips(intent, results);
            break;
        case 'COMPARING':
            chips = getComparingChips(results);
            break;
        case 'DECIDING':
            chips = getDecidingChips(results);
            break;
    }
    // Deduplicate by id (safety guard)
    const seen = new Set();
    chips = chips.filter(c => { if (seen.has(c.id))
        return false; seen.add(c.id); return true; });
    chips.sort((a, b) => a.priority - b.priority);
    return { stage, thinking, chips: chips.slice(0, 5), missingFields, confidence };
}
