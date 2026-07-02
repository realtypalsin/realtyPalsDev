"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/registryPrices.ts
// GET /registry-prices?sector=&city=
// No auth required.
const express_1 = require("express");
const zod_1 = require("zod");
const tavily_1 = require("../lib/ai/tavily");
const groq_1 = require("../lib/ai/groq");
const cache_1 = require("../lib/cache");
const router = (0, express_1.Router)();
const Schema = zod_1.z.object({
    sector: zod_1.z.string().min(1),
    city: zod_1.z.string().default('Noida'),
});
router.get('/', async (req, res) => {
    const parsed = Schema.safeParse({
        sector: req.query['sector'],
        city: req.query['city'] ?? 'Noida',
    });
    if (!parsed.success) {
        res.status(400).json({ error: 'sector required' });
        return;
    }
    const { sector, city } = parsed.data;
    const cacheKey = `registry:${city}:${sector}`;
    const cached = await (0, cache_1.getCached)(cacheKey);
    if (cached) {
        res.json(cached);
        return;
    }
    const queries = [
        `${sector} ${city} circle rate 2024 2025 property registration`,
        `${sector} ${city} flat price per sqft recent registration data`,
    ];
    const searchResponses = await Promise.all(queries.map((q) => (0, tavily_1.tavilySearch)(q, 4)));
    const allResults = searchResponses.flatMap((r) => r.results);
    const context = allResults
        .slice(0, 6)
        .map((r, i) => `[Source ${i + 1}] ${r.title}\n${r.content.slice(0, 400)}`)
        .join('\n\n');
    const prompt = `Based on the following web search results, extract and summarize current property price data for ${sector}, ${city}.

${context}

Return a JSON object with these exact fields:
{
  "circle_rate_sqft": "₹X,XXX/sqft or 'Not found'",
  "market_rate_range": "₹X,XXX – ₹XX,XXX/sqft or 'Not found'",
  "recent_registrations": "Summary of recent registration activity or 'No data found'",
  "data_freshness": "2024 / 2025 / Unclear",
  "summary": "2-3 sentence plain English summary of pricing in this sector"
}

If data is unavailable, use appropriate placeholder text. Return only valid JSON.`;
    let extracted = {};
    try {
        const resp = await groq_1.groq.chat.completions.create({
            model: groq_1.GROQ_FAST,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 400,
            temperature: 0,
            response_format: { type: 'json_object' },
        });
        const text = resp.choices[0]?.message?.content ?? '{}';
        extracted = JSON.parse(text);
    }
    catch {
        extracted = {};
    }
    const result = {
        sector,
        city,
        circle_rate_sqft: extracted.circle_rate_sqft ?? 'Not available',
        market_rate_range: extracted.market_rate_range ?? 'Not available',
        recent_registrations: extracted.recent_registrations ?? 'No recent data found',
        data_freshness: extracted.data_freshness ?? 'Unknown',
        sources: allResults.slice(0, 3).map((r) => r.url),
        summary: extracted.summary ?? `Price data for ${sector} ${city} sourced from web.`,
    };
    await (0, cache_1.setCached)(cacheKey, result, 60 * 60 * 6);
    res.json(result);
});
exports.default = router;
