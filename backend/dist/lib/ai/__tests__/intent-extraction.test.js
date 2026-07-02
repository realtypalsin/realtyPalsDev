"use strict";
/**
 * Regression tests for intent extraction.
 *
 * Unit layer (always runs):
 *   - parseIntentJson: schema validation + merging
 *   - getIntentState: correct state transitions for RERA-style intents
 *   - Prompt content: RERA examples present in extraction prompt
 *
 * Integration layer (runs only when OPENAI_API_KEY or GROQ_API_KEY is set):
 *   - Full extractIntent round-trips for known-failing RERA patterns
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const intent_1 = require("../intent");
const intent_2 = require("../../discovery/intent");
const intent_extraction_1 = require("../prompts/intent-extraction");
// ─── Unit: parseIntentJson ────────────────────────────────────────────────────
(0, node_test_1.describe)('parseIntentJson — RERA query outputs', () => {
    (0, node_test_1.it)('extracts projectNames from RERA number query', () => {
        const result = (0, intent_1.parseIntentJson)('{"projectNames":["Godrej Meridien"]}', {});
        strict_1.default.deepEqual(result.projectNames, ['Godrej Meridien']);
    });
    (0, node_test_1.it)('extracts projectNames from UP RERA registration query', () => {
        const result = (0, intent_1.parseIntentJson)('{"projectNames":["Godrej Palm Retreat"]}', {});
        strict_1.default.deepEqual(result.projectNames, ['Godrej Palm Retreat']);
    });
    (0, node_test_1.it)('extracts projectNames from multi-word project name', () => {
        const result = (0, intent_1.parseIntentJson)('{"projectNames":["ATS Pious Hideaways"]}', {});
        strict_1.default.deepEqual(result.projectNames, ['ATS Pious Hideaways']);
    });
    (0, node_test_1.it)('extracts projectNames alongside other intent fields', () => {
        const result = (0, intent_1.parseIntentJson)('{"projectNames":["ACE Starlit"],"sector":"Sector 150"}', {});
        strict_1.default.deepEqual(result.projectNames, ['ACE Starlit']);
        strict_1.default.equal(result.sector, 'Sector 150');
    });
    (0, node_test_1.it)('merges projectNames with non-empty previous intent', () => {
        const previous = { bhk: [3], budgetMax: 2 };
        const result = (0, intent_1.parseIntentJson)('{"projectNames":["Mahagun Moderne"]}', previous);
        strict_1.default.deepEqual(result.projectNames, ['Mahagun Moderne']);
        strict_1.default.deepEqual(result.bhk, [3]);
        strict_1.default.equal(result.budgetMax, 2);
    });
    (0, node_test_1.it)('returns previous intent on invalid JSON', () => {
        const previous = { bhk: [2] };
        const result = (0, intent_1.parseIntentJson)('not json at all', previous);
        strict_1.default.deepEqual(result, { ...previous, projectNames: undefined, is_comparison_query: undefined });
    });
    (0, node_test_1.it)('returns previous intent on schema mismatch', () => {
        const previous = { bhk: [2] };
        // bhk must be number[] — string value should fail schema validation
        const result = (0, intent_1.parseIntentJson)('{"bhk":"3BHK"}', previous);
        strict_1.default.deepEqual(result, previous);
    });
    (0, node_test_1.it)('handles empty object — no-op on previous intent', () => {
        const previous = { bhk: [3], sector: 'Sector 150' };
        const result = (0, intent_1.parseIntentJson)('{}', previous);
        strict_1.default.deepEqual(result, { ...previous, projectNames: undefined, is_comparison_query: undefined });
    });
    (0, node_test_1.it)('extracts projectNames from comparison query', () => {
        const result = (0, intent_1.parseIntentJson)('{"projectNames":["Godrej Palm Retreat","ATS Pious Hideaways"]}', {});
        strict_1.default.deepEqual(result.projectNames, ['Godrej Palm Retreat', 'ATS Pious Hideaways']);
    });
});
// ─── Unit: getIntentState — RERA intents must trigger READY_TO_SEARCH ─────────
(0, node_test_1.describe)('getIntentState — project name intents', () => {
    (0, node_test_1.it)('single projectName → READY_TO_SEARCH', () => {
        strict_1.default.equal((0, intent_2.getIntentState)({ projectNames: ['Godrej Meridien'] }), 'READY_TO_SEARCH');
    });
    (0, node_test_1.it)('two projectNames → READY_TO_SEARCH', () => {
        strict_1.default.equal((0, intent_2.getIntentState)({ projectNames: ['Godrej Palm Retreat', 'ACE Starlit'] }), 'READY_TO_SEARCH');
    });
    (0, node_test_1.it)('projectNames with other fields → READY_TO_SEARCH', () => {
        strict_1.default.equal((0, intent_2.getIntentState)({ projectNames: ['Godrej Meridien'], bhk: [3] }), 'READY_TO_SEARCH');
    });
    (0, node_test_1.it)('empty projectNames array → COLD (not a search trigger)', () => {
        strict_1.default.equal((0, intent_2.getIntentState)({ projectNames: [] }), 'COLD');
    });
    (0, node_test_1.it)('no fields → COLD', () => {
        strict_1.default.equal((0, intent_2.getIntentState)({}), 'COLD');
    });
    (0, node_test_1.it)('BHK only → GATHERING (needs at least 2 signals)', () => {
        strict_1.default.equal((0, intent_2.getIntentState)({ bhk: [3] }), 'GATHERING');
    });
    (0, node_test_1.it)('BHK + budget → READY_TO_SEARCH', () => {
        strict_1.default.equal((0, intent_2.getIntentState)({ bhk: [3], budgetMax: 2 }), 'READY_TO_SEARCH');
    });
    (0, node_test_1.it)('builderName alone → READY_TO_SEARCH', () => {
        strict_1.default.equal((0, intent_2.getIntentState)({ builderName: 'Godrej' }), 'READY_TO_SEARCH');
    });
});
// ─── Unit: prompt content — RERA examples must be present ────────────────────
(0, node_test_1.describe)('INTENT_EXTRACTION_PROMPT content — RERA patterns', () => {
    (0, node_test_1.it)('contains RERA number example with projectNames', () => {
        strict_1.default.ok(intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('RERA number') || intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('RERA registration'), 'Prompt must include RERA number example');
    });
    (0, node_test_1.it)('projectNames description covers non-comparison queries', () => {
        // Must NOT say "for comparison queries only"
        const desc = intent_extraction_1.INTENT_EXTRACTION_PROMPT.match(/"projectNames":[^\n]+/)?.[0] ?? '';
        strict_1.default.ok(!desc.toLowerCase().includes('comparison queries only') &&
            !desc.toLowerCase().includes('for comparison queries:'), `projectNames description must not restrict to comparison queries. Got: ${desc}`);
    });
    (0, node_test_1.it)('contains PROJECTNAMES RULE section', () => {
        strict_1.default.ok(intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('PROJECTNAMES RULE'), 'Prompt must include PROJECTNAMES RULE section');
    });
    (0, node_test_1.it)('RERA few-shot example present for Godrej Meridien pattern', () => {
        strict_1.default.ok(intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('RERA number of Godrej Meridien') ||
            intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('Godrej Meridien'), 'Prompt must include Godrej Meridien RERA example');
    });
    (0, node_test_1.it)('contains Hindi RERA registration example', () => {
        strict_1.default.ok(intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('RERA registration number kya hai') ||
            intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('registration id chahiye'), 'Prompt must include at least one Hindi/Hinglish RERA example');
    });
    (0, node_test_1.it)('contains detail query example (tell me about X)', () => {
        strict_1.default.ok(intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('tell me about') || intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('baare mein'), 'Prompt must include a detail query example that populates projectNames');
    });
});
// ─── Unit: intent prompt counter-examples for generic adjectives ──────────────
(0, node_test_1.describe)('INTENT_EXTRACTION_PROMPT — generic adjective counter-examples', () => {
    (0, node_test_1.it)('prompt includes counter-example for "best project" pattern', () => {
        strict_1.default.ok(intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('best project under 3 crore') ||
            intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('best project under 3') ||
            intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('sabse acha'), 'Prompt must include counter-example for "best project" type queries');
    });
    (0, node_test_1.it)('PROJECTNAMES RULE explicitly forbids generic adjectives', () => {
        strict_1.default.ok(intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('best') && intent_extraction_1.INTENT_EXTRACTION_PROMPT.includes('NOT project names'), 'PROJECTNAMES RULE must explicitly state generic adjectives are not project names');
    });
});
// ─── Integration: full extractIntent round-trips ──────────────────────────────
// Skipped when no API keys are configured.
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasGroq = !!process.env.GROQ_API_KEY;
(0, node_test_1.describe)('extractIntent — RERA query round-trips', { skip: !hasOpenAI && !hasGroq }, () => {
    // Dynamic import to avoid module-level side effects when skipped
    (0, node_test_1.it)('English RERA number query → projectNames populated', async () => {
        const { extractIntent } = await Promise.resolve().then(() => __importStar(require('../intent')));
        const { intent: result } = await extractIntent('What is the RERA number of Godrej Meridien?', {});
        strict_1.default.ok((result.projectNames?.length ?? 0) > 0, `Expected projectNames to be populated, got: ${JSON.stringify(result)}`);
        const found = result.projectNames?.some((n) => n.toLowerCase().includes('godrej') || n.toLowerCase().includes('meridien'));
        strict_1.default.ok(found, `Expected 'Godrej Meridien' in projectNames, got: ${JSON.stringify(result.projectNames)}`);
    });
    (0, node_test_1.it)('Hindi RERA registration query → projectNames populated', async () => {
        const { extractIntent } = await Promise.resolve().then(() => __importStar(require('../intent')));
        const { intent: result } = await extractIntent('Godrej Palm Retreat ka RERA registration number kya hai', {});
        strict_1.default.ok((result.projectNames?.length ?? 0) > 0, `Expected projectNames populated, got: ${JSON.stringify(result)}`);
    });
    (0, node_test_1.it)('UP RERA registration id query → projectNames populated', async () => {
        const { extractIntent } = await Promise.resolve().then(() => __importStar(require('../intent')));
        const { intent: result } = await extractIntent('ATS Pious Hideaways ka UP RERA registration id chahiye', {});
        strict_1.default.ok((result.projectNames?.length ?? 0) > 0, `Expected projectNames populated, got: ${JSON.stringify(result)}`);
    });
    (0, node_test_1.it)('is X RERA registered → projectNames populated', async () => {
        const { extractIntent } = await Promise.resolve().then(() => __importStar(require('../intent')));
        const { intent: result } = await extractIntent('Is ACE Starlit RERA registered?', {});
        strict_1.default.ok((result.projectNames?.length ?? 0) > 0, `Expected projectNames populated, got: ${JSON.stringify(result)}`);
    });
    (0, node_test_1.it)('tell me about X → projectNames populated', async () => {
        const { extractIntent } = await Promise.resolve().then(() => __importStar(require('../intent')));
        const { intent: result } = await extractIntent('Tell me about Mahagun Moderne', {});
        strict_1.default.ok((result.projectNames?.length ?? 0) > 0, `Expected projectNames populated, got: ${JSON.stringify(result)}`);
    });
    (0, node_test_1.it)('RERA query does NOT populate bhk or budget', async () => {
        const { extractIntent } = await Promise.resolve().then(() => __importStar(require('../intent')));
        const { intent: result } = await extractIntent('What is the RERA number of Godrej Meridien?', {});
        strict_1.default.equal(result.budgetMax, undefined);
        strict_1.default.equal((result.bhk?.length ?? 0), 0);
    });
});
