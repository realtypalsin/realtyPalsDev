"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContextMessages = buildContextMessages;
function buildContextMessages(currentMessage, chatHistory, summary, memory) {
    const parts = [];
    if (summary) {
        parts.push(`## Conversation Summary\n${summary}`);
    }
    if (memory && hasMemoryContent(memory)) {
        parts.push(`## User Memory\n${formatMemory(memory)}`);
    }
    const systemSuffix = parts.length ? '\n\n' + parts.join('\n\n') : '';
    // Filter bad messages
    const clean = chatHistory.filter((m) => m.content && m.content !== '[streamed]' && m.content.length > 0);
    // Normalize to alternating user/assistant (required by Claude)
    const normalized = [];
    let start = 0;
    while (start < clean.length && clean[start].role === 'assistant')
        start++;
    for (let i = start; i < clean.length; i++) {
        const msg = clean[i];
        const last = normalized[normalized.length - 1];
        if (last && last.role === msg.role) {
            last.content += '\n' + msg.content;
        }
        else {
            normalized.push({ role: msg.role, content: msg.content });
        }
    }
    return {
        systemSuffix,
        messages: [...normalized, { role: 'user', content: currentMessage }],
    };
}
function hasMemoryContent(m) {
    return !!(m.bhk_preference || m.budget_max_cr || m.sector_preference || m.viewed_slugs?.length);
}
function formatMemory(m) {
    const parts = [];
    if (m.bhk_preference)
        parts.push(`Prefers ${m.bhk_preference}BHK`);
    if (m.budget_max_cr)
        parts.push(`Budget up to ₹${m.budget_max_cr}Cr`);
    if (m.sector_preference)
        parts.push(`Interested in ${m.sector_preference}`);
    if (m.purpose)
        parts.push(`Purpose: ${m.purpose}`);
    if (m.viewed_slugs?.length)
        parts.push(`Seen: ${m.viewed_slugs.slice(0, 4).join(', ')}`);
    return parts.join(' · ') + '\nUse as defaults when not re-stated in this session.';
}
