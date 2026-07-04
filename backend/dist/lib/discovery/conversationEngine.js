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
function chip(id, actionType, label, icon, payload, priority, group) {
    return { id, actionType, label, icon, analyticsId: id, priority, payload, group };
}
// ─── Homepage suggestion groups ────────────────────────────────────────────────
// The engine owns grouping entirely: which groups exist, their order, their
// visual weight, and how many chips land in each. The frontend just renders
// whatever groups arrive, in the order given — it has no opinion on counts.
const PRIMARY_GROUP = { id: 'primary_actions', label: 'What are you looking for?', order: 0, emphasis: 'primary' };
const JOURNEY_GROUP = { id: 'popular_journeys', label: 'Popular journeys', order: 1, emphasis: 'secondary' };
const FILTER_GROUP = { id: 'quick_filters', label: 'Quick filters', order: 2, emphasis: 'tertiary' };
function getDiscoveryChips(intent) {
    return [
        // Primary actions — the three top-level intents a buyer starts from.
        chip('buy_home', 'TEXT_MESSAGE', 'Buy a Home', '🏠', { text: "I'm looking to buy a home to live in" }, 1, PRIMARY_GROUP),
        chip('investment', 'TEXT_MESSAGE', 'Investment', '📈', { text: "I'm looking for investment properties" }, 2, PRIMARY_GROUP),
        chip('explore', 'TEXT_MESSAGE', 'Explore Projects', '🧭', { text: 'Show me projects available right now' }, 3, PRIMARY_GROUP),
        // Popular journeys — common, concrete starting queries.
        chip('find_3bhk', 'TEXT_MESSAGE', 'Best 3 BHK', '', { text: 'Show me the best 3 BHK apartments in Noida' }, 4, JOURNEY_GROUP),
        chip('ready_move', 'TEXT_MESSAGE', 'Ready to Move', '', { text: 'Ready to move properties under 2 Cr in Noida' }, 5, JOURNEY_GROUP),
        chip('luxury', 'TEXT_MESSAGE', 'Luxury Homes', '', { text: 'Show luxury apartments on Noida Expressway' }, 6, JOURNEY_GROUP),
        chip('new_launch', 'TEXT_MESSAGE', 'New Launches', '', { text: 'Show me newly launched projects in Noida' }, 7, JOURNEY_GROUP),
        chip('compare_builders', 'TEXT_MESSAGE', 'Compare Builders', '', { text: 'Which builders in Noida have the best track record?' }, 8, JOURNEY_GROUP),
        // Quick filters — bare dimensions; if still unresolved after extraction,
        // the existing GATHERING/CLARIFYING flow (getClarifyingChips) returns
        // concrete follow-up chips next turn. No new mechanics.
        chip('filter_budget', 'TEXT_MESSAGE', 'Budget', '', { text: "I'd like to set a budget range" }, 9, FILTER_GROUP),
        chip('filter_sector', 'TEXT_MESSAGE', 'Sector', '', { text: 'I want to search in a specific sector' }, 10, FILTER_GROUP),
        chip('filter_bhk', 'TEXT_MESSAGE', 'BHK', '', { text: "I'd like to choose a BHK configuration" }, 11, FILTER_GROUP),
        chip('filter_possession', 'TEXT_MESSAGE', 'Possession', '', { text: 'I want to filter by possession timeline' }, 12, FILTER_GROUP),
        chip('filter_metro', 'TEXT_MESSAGE', 'Metro', '', { text: 'I want a project near a metro station' }, 13, FILTER_GROUP),
        chip('filter_expressway', 'TEXT_MESSAGE', 'Expressway', '', { text: 'I want a project on the Noida Expressway' }, 14, FILTER_GROUP),
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
    chips.push(chip('price_trends', 'TEXT_MESSAGE', 'Price Trends', '📊', { text: `How have property prices trended in ${intent.sector ?? 'this area'} recently?` }, 2));
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
        chip('hidden_risks', 'TEXT_MESSAGE', 'What are the risks?', '⚠️', { text: 'Are there any hidden risks, legal issues, or downsides I should be aware of before deciding?' }, 1),
        chip('negotiation', 'TEXT_MESSAGE', 'Negotiation tips', '🤝', { text: 'What is a realistic negotiation margin for these properties?' }, 2),
        chip('legal_check', 'TEXT_MESSAGE', 'RERA & Legal', '🛡️', { text: 'Can you verify the RERA status and legal clearances for my shortlist?' }, 3),
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
    // Grouped chips sort by group order first, then priority within the group.
    // Ungrouped chips (every stage but DISCOVERY today) sort by priority alone.
    chips.sort((a, b) => {
        const groupOrderDiff = (a.group?.order ?? -1) - (b.group?.order ?? -1);
        return groupOrderDiff !== 0 ? groupOrderDiff : a.priority - b.priority;
    });
    // The 5-chip cap exists to keep a flat suggestion row from overwhelming the
    // UI. Grouped chips are rendered as separate sections instead, so the cap
    // doesn't apply — the engine already decides how many chips each group gets.
    const hasGroups = chips.some(c => c.group);
    return { stage, thinking, chips: hasGroups ? chips : chips.slice(0, 5), missingFields, confidence };
}
