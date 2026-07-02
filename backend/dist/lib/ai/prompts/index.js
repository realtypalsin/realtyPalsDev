"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExpansionBlock = exports.buildMemorySummary = exports.buildIntentSummary = exports.buildSectorsOverviewBlock = exports.buildSectorBlock = exports.buildProjectsBlock = exports.BASE_SYSTEM_PROMPT = exports.INTENT_EXTRACTION_PROMPT = void 0;
exports.buildAdvisorSystemPrompt = buildAdvisorSystemPrompt;
const base_1 = require("./base");
const blocks_1 = require("./blocks");
var intent_extraction_1 = require("./intent-extraction");
Object.defineProperty(exports, "INTENT_EXTRACTION_PROMPT", { enumerable: true, get: function () { return intent_extraction_1.INTENT_EXTRACTION_PROMPT; } });
var base_2 = require("./base");
Object.defineProperty(exports, "BASE_SYSTEM_PROMPT", { enumerable: true, get: function () { return base_2.BASE_SYSTEM_PROMPT; } });
var blocks_2 = require("./blocks");
Object.defineProperty(exports, "buildProjectsBlock", { enumerable: true, get: function () { return blocks_2.buildProjectsBlock; } });
Object.defineProperty(exports, "buildSectorBlock", { enumerable: true, get: function () { return blocks_2.buildSectorBlock; } });
Object.defineProperty(exports, "buildSectorsOverviewBlock", { enumerable: true, get: function () { return blocks_2.buildSectorsOverviewBlock; } });
Object.defineProperty(exports, "buildIntentSummary", { enumerable: true, get: function () { return blocks_2.buildIntentSummary; } });
Object.defineProperty(exports, "buildMemorySummary", { enumerable: true, get: function () { return blocks_2.buildMemorySummary; } });
Object.defineProperty(exports, "buildExpansionBlock", { enumerable: true, get: function () { return blocks_2.buildExpansionBlock; } });
function buildAdvisorSystemPrompt(intent, exactResults, memory, sectorCtx, sectorsOverview, expansion, nearbyResults, notFoundNames) {
    const hasExactResults = exactResults.length > 0;
    const hasNearbyResults = (nearbyResults?.length ?? 0) > 0;
    const hasProperties = hasExactResults || hasNearbyResults;
    const hasSectorsOverview = (sectorsOverview?.length ?? 0) > 0;
    const isComparison = intent.is_comparison_query === true;
    // Inject format blocks only when the query type warrants them.
    // Saves ~770–1,200 tokens on cold, process, and builder queries.
    const propertyResultsFormat = hasProperties ? (0, blocks_1.buildPropertyResultsFormatBlock)() : '';
    const sectorAdvisoryFormat = hasSectorsOverview ? (0, blocks_1.buildSectorAdvisoryFormatBlock)() : '';
    const comparisonFormat = isComparison ? (0, blocks_1.buildComparisonFormatBlock)() : '';
    const intentSummary = (0, blocks_1.buildIntentSummary)(intent);
    const memorySummary = memory ? (0, blocks_1.buildMemorySummary)(memory) : '';
    const contextSuffix = intentSummary || memorySummary
        ? `\n\n## Current Session Context\n${intentSummary}${memorySummary}`
        : '';
    const sectorBlock = sectorCtx ? (0, blocks_1.buildSectorBlock)(sectorCtx, intent) : '';
    const sectorsOverviewBlock = hasSectorsOverview ? (0, blocks_1.buildSectorsOverviewBlock)(sectorsOverview, intent) : '';
    const expansionBlock = expansion ? (0, blocks_1.buildExpansionBlock)(expansion) : '';
    const projectsBlock = (0, blocks_1.buildProjectsBlock)(exactResults, sectorCtx, expansion, nearbyResults, notFoundNames);
    const finalPrompt = base_1.BASE_SYSTEM_PROMPT + propertyResultsFormat + sectorAdvisoryFormat + comparisonFormat + contextSuffix + sectorBlock + sectorsOverviewBlock + expansionBlock + projectsBlock;
    console.log('[PROMPT:CHECK]', {
        ivy_present: projectsBlock.includes('Ivy County'),
        rec_tier_present: projectsBlock.includes('recommendation_tier'),
        persona_present: projectsBlock.includes('primary_persona'),
        thesis_present: projectsBlock.includes('decision_thesis'),
        est_tokens: Math.round(finalPrompt.length / 4),
    });
    return finalPrompt;
}
