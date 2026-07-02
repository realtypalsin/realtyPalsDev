// Parses LLM structured responses into typed blocks for React rendering.
// Returns null for unstructured chat → falls back to ReactMarkdown.

export type BlockType =
  | 'our_pick'        // 🏆 Our Pick / 🏆 Verdict
  | 'quick_picks'     // 📊 Quick Picks table
  | 'single_project'  // 🔵🟢🟡🟠🔴 **LABEL** **Name**
  | 'why_wins'        // **Why X wins** comparison table
  | 'best_for'        // **Best For** bullet pairs
  | 'bottom_line'     // **Bottom Line** closing sentence
  | 'coverage_status' // 🏗️ **Coverage Status**
  | 'text'            // prose fallback

export interface ResponseBlock {
  type: BlockType
  headerLine: string  // raw header line (for extracting names/labels)
  body: string        // content after header, trimmed
}

function detectType(line: string): BlockType | null {
  if (/^🏆\s+\*\*(?:Our Pick|Verdict)\*\*/.test(line)) return 'our_pick'
  if (/^📊\s+\*\*Quick Picks\*\*/.test(line)) return 'quick_picks'
  if (/^🏗️\s+\*\*Coverage Status\*\*/.test(line)) return 'coverage_status'
  if (/^\*\*Why .+ wins\*\*/.test(line)) return 'why_wins'
  if (/^\*\*Best For\*\*/.test(line)) return 'best_for'
  if (/^\*\*Bottom Line\*\*/.test(line)) return 'bottom_line'
  if (/^[🔵🟢🟡🟠🔴]/.test(line) && line.includes('**')) return 'single_project'
  return null
}

export function parseResponseBlocks(content: string): ResponseBlock[] | null {
  if (!content.trim()) return null

  const lines = content.split('\n')
  const hasStructure = lines.some(l => detectType(l) !== null)
  if (!hasStructure) return null

  const blocks: ResponseBlock[] = []
  let currentType: BlockType = 'text'
  let currentHeader = ''
  let currentBody: string[] = []

  function flush() {
    const body = currentBody.join('\n').trim()
    if (currentType === 'text' && !body) return
    blocks.push({ type: currentType, headerLine: currentHeader, body })
    currentBody = []
  }

  for (const line of lines) {
    if (/^-{3,}$/.test(line.trim())) continue              // skip --- dividers
    if (/^\*[^*].*\*$/.test(line.trim())) continue         // strip italic CTA lines

    const t = detectType(line)
    if (t !== null) {
      flush()
      currentType = t
      currentHeader = line
      continue
    }

    if (currentBody.length === 0 && !line.trim()) continue // skip leading blank
    currentBody.push(line)
  }
  flush()

  const nonEmpty = blocks.filter(b => b.type !== 'text' || b.body)
  return nonEmpty.length > 0 ? nonEmpty : null
}

// ── Content extractors (consumed by card components) ─────────────────────────

export function extractNameReason(body: string): { name: string; reason: string } {
  const first = body.split('\n')[0].trim()
  const idx = first.indexOf(' — ')
  if (idx !== -1) return { name: first.slice(0, idx).trim(), reason: first.slice(idx + 3).trim() }
  const lines = body.split('\n').filter(l => l.trim())
  return { name: lines[0]?.trim() ?? '', reason: lines.slice(1).join(' ').trim() }
}

export function extractTable(body: string): { headers: string[]; rows: string[][] } | null {
  const tableLines = body.split('\n').map(l => l.trim()).filter(l => l.startsWith('|'))
  if (tableLines.length < 2) return null
  const cells = (l: string) => l.split('|').slice(1, -1).map(c => c.trim())
  const headers = cells(tableLines[0])
  const rows = tableLines.slice(1).filter(l => !/^\|[\s\-|:]+\|$/.test(l)).map(cells)
  return { headers, rows }
}

export function extractQuickPickRows(body: string): Array<{ category: string; text: string }> {
  const parsed = extractTable(body)
  if (!parsed) return []
  // Table may have empty header row (| | |) — data rows have category in col 0
  return parsed.rows
    .filter(r => r.length >= 2 && r[0])
    .map(r => ({ category: r[0], text: r[1] ?? '' }))
}

export function extractBestForPairs(body: string): Array<{ project: string; type: string }> {
  return body
    .split('\n')
    .filter(l => l.trim().startsWith('•'))
    .map(l => {
      const text = l.trim().slice(1).trim()
      const arrow = text.indexOf(' → ')
      if (arrow !== -1) return { project: text.slice(0, arrow).trim(), type: text.slice(arrow + 3).trim() }
      return { project: text, type: '' }
    })
    .filter(p => p.project)
}

export function extractSectorList(body: string): Array<{ name: string; reason: string }> {
  return body
    .split('\n')
    .filter(l => l.trim().startsWith('•'))
    .map(l => {
      const text = l.trim().slice(1).trim()
      const dash = text.indexOf(' — ')
      if (dash !== -1) return { name: text.slice(0, dash).trim(), reason: text.slice(dash + 3).trim() }
      return { name: text, reason: '' }
    })
    .filter(s => s.name)
}

export function extractCoverageIntro(body: string): string {
  return body.split('\n').find(l => {
    const t = l.trim()
    return t && !t.startsWith('•') && !t.startsWith('**') && !t.startsWith('Want')
  })?.trim() ?? ''
}

export function parseSingleProjectHeader(headerLine: string): {
  badge: string; label: string; name: string
} {
  const badge = headerLine[0] ?? '🟡'
  const bolds = [...headerLine.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1])
  return { badge, label: bolds[0] ?? 'CONSIDER', name: bolds[1] ?? bolds[0] ?? '' }
}

export function extractSingleProjectBullets(body: string): string[] {
  return body
    .split('\n')
    .filter(l => l.trim().startsWith('•'))
    .map(l => l.trim().slice(1).trim())
}
