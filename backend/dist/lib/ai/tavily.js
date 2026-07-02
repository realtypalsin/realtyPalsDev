"use strict";
// backend/src/lib/ai/tavily.ts
// Tavily — AI web search with content extraction (primary)
// Serper — Google Search API (fallback if Tavily fails/exhausted)
Object.defineProperty(exports, "__esModule", { value: true });
exports.tavilySearch = tavilySearch;
exports.formatTavilyContext = formatTavilyContext;
// ── Tavily ─────────────────────────────────────────────────────────────────
async function searchTavily(query, maxResults) {
    const key = process.env.TAVILY_API_KEY;
    if (!key)
        return { answer: '', results: [], source: 'none' };
    const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: key,
            query,
            search_depth: 'basic',
            max_results: maxResults,
            include_answer: true,
            include_domains: [
                'up-rera.in', 'credai.org', '99acres.com', 'magicbricks.com',
                'nobroker.in', 'housing.com', 'economictimes.com', 'hindustantimes.com',
                'thehindu.com', 'ndtv.com', 'moneycontrol.com',
            ],
        }),
        signal: AbortSignal.timeout(5000),
    });
    if (!res.ok)
        throw new Error(`Tavily ${res.status}`);
    const data = (await res.json());
    return {
        answer: data.answer ?? '',
        results: (data.results ?? []).slice(0, maxResults),
        source: 'tavily',
    };
}
// ── Serper (Google Search) ─────────────────────────────────────────────────
async function searchSerper(query, maxResults) {
    const key = process.env.SERPER_API_KEY;
    if (!key)
        return { answer: '', results: [], source: 'none' };
    const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
            'X-API-KEY': key,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query, num: maxResults }),
        signal: AbortSignal.timeout(5000),
    });
    if (!res.ok)
        throw new Error(`Serper ${res.status}`);
    const data = (await res.json());
    const answer = data.answerBox?.answer ??
        data.knowledgeGraph?.description ??
        '';
    const results = (data.organic ?? [])
        .slice(0, maxResults)
        .map((r) => ({
        title: r.title,
        url: r.link,
        content: r.snippet,
        score: 0.5,
    }));
    return { answer, results, source: 'serper' };
}
// ── Public API: Tavily first, Serper fallback ──────────────────────────────
async function tavilySearch(query, maxResults = 3) {
    try {
        const result = await searchTavily(query, maxResults);
        if (result.results.length > 0 || result.answer)
            return result;
        // Tavily returned empty — try Serper
        return await searchSerper(query, maxResults);
    }
    catch {
        // Tavily failed — try Serper
        try {
            return await searchSerper(query, maxResults);
        }
        catch {
            return { answer: '', results: [], source: 'none' };
        }
    }
}
/** Format web search results into a compact LLM context string. */
function formatTavilyContext(answer, results) {
    const lines = [];
    if (answer)
        lines.push(`Summary: ${answer}`);
    results.slice(0, 3).forEach((r, i) => {
        lines.push(`\n[Source ${i + 1}] ${r.title} — ${r.url}`);
        lines.push(r.content.slice(0, 400));
    });
    return lines.join('\n').trim();
}
