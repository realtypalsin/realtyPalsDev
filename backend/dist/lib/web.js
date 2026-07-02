"use strict";
// backend/src/lib/web.ts
// External tool helpers used by the AI advisor: web search (Tavily→Serper),
// area background (Wikipedia), commute (Google Maps), and live page read (Jina).
// All are best-effort: they degrade to null/empty rather than throwing so a
// single tool failure never breaks a chat turn.
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSearch = webSearch;
exports.areaInfo = areaInfo;
exports.commute = commute;
exports.readPage = readPage;
async function searchTavily(query, maxResults) {
    const key = process.env.TAVILY_API_KEY;
    if (!key)
        return null;
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
    return { answer: data.answer ?? '', results: (data.results ?? []).slice(0, maxResults) };
}
async function searchSerper(query, maxResults) {
    const key = process.env.SERPER_API_KEY;
    if (!key)
        return null;
    const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, num: maxResults }),
        signal: AbortSignal.timeout(5000),
    });
    if (!res.ok)
        throw new Error(`Serper ${res.status}`);
    const data = (await res.json());
    const answer = data.answerBox?.answer ?? data.knowledgeGraph?.description ?? '';
    const results = (data.organic ?? []).slice(0, maxResults).map((r) => ({ title: r.title, url: r.link, content: r.snippet }));
    return { answer, results };
}
/** Returns a compact, source-attributed context string, or '' if nothing found. */
async function webSearch(query, maxResults = 3) {
    let data = null;
    try {
        data = await searchTavily(query, maxResults);
        if (!data || (!data.answer && data.results.length === 0))
            data = await searchSerper(query, maxResults);
    }
    catch {
        try {
            data = await searchSerper(query, maxResults);
        }
        catch {
            data = null;
        }
    }
    if (!data)
        return '';
    const lines = [];
    if (data.answer)
        lines.push(`Summary: ${data.answer}`);
    data.results.slice(0, 3).forEach((r, i) => {
        lines.push(`\n[Source ${i + 1}] ${r.title} — ${r.url}`);
        lines.push(r.content.slice(0, 400));
    });
    return lines.join('\n').trim();
}
// ── Area background: Wikipedia (free, no key) ──────────────────────────────
async function getWikiSummary(title) {
    const encoded = encodeURIComponent(title.replace(/\s+/g, '_'));
    try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`, {
            headers: { 'User-Agent': 'RealtyPals/1.0 (contact@realtypals.in)' },
            signal: AbortSignal.timeout(4000),
        });
        if (!res.ok)
            return null;
        const data = (await res.json());
        if (data.type === 'disambiguation' || !data.extract || data.extract.length < 50)
            return null;
        const url = data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encoded}`;
        return `${data.title}: ${data.extract.slice(0, 800)}\nSource: ${url}`;
    }
    catch {
        return null;
    }
}
async function areaInfo(sector, city) {
    return (await getWikiSummary(`${sector}, ${city}`)) ?? (await getWikiSummary(city));
}
// ── Commute: Google Maps Distance Matrix ───────────────────────────────────
async function commute(origin, destination) {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key)
        return null;
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', origin);
    url.searchParams.set('destinations', destination);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('units', 'metric');
    url.searchParams.set('region', 'in');
    url.searchParams.set('key', key);
    try {
        const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
        const data = (await res.json());
        const el = data.rows?.[0]?.elements?.[0];
        if (!el || el.status !== 'OK' || !el.duration || !el.distance)
            return null;
        return `Driving from ${origin} to ${destination}: ${el.duration.text} (${el.distance.text}).`;
    }
    catch {
        return null;
    }
}
// ── Live page read: Jina Reader (RERA / news / builder pages) ──────────────
async function readPage(url, maxChars = 2500) {
    const key = process.env.JINA_API_KEY;
    try {
        const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
            headers: {
                ...(key ? { Authorization: `Bearer ${key}` } : {}),
                Accept: 'text/markdown',
                'X-Return-Format': 'markdown',
            },
            signal: AbortSignal.timeout(12000),
        });
        if (!res.ok)
            return null;
        return (await res.text()).slice(0, maxChars);
    }
    catch {
        return null;
    }
}
