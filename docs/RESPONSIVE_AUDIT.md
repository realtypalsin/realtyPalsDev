# Responsive Audit — Project Detail, Chat, Admin

**Date:** 2026-08-14
**Scope:** all project-detail tabs, the detail shell, the chat project card, the chat interface, the admin panel
**Method:** seven parallel full-file reads; every CRITICAL claim re-verified against source before inclusion
**Constraint:** mobile (360–430px) is the primary target; desktop (1280px+) must not regress

> Supersedes `MOBILE_AUDIT.md` (commit `bc7b318`), which was written from file fragments and is wrong in its two headline claims. That file should be deleted — pending confirmation.

---

## Verification legend

- **[V]** — I read the exact line and confirmed the class string myself
- **[A]** — reported by a full-file audit pass, not individually re-verified

Everything marked P0 below is **[V]**.

---

## P0 — Structural. These break the product on a phone.

### P0.1 `/property/[slug]` never renders the mobile layout **[V]**

`ProjectDetailPanel.tsx` has three layouts:

| Layout | Branch | Hero | Tab chrome | CTA |
|---|---|---|---|---|
| `inline` | `:887–916` | `renderHero()` `:896` | `stickyHeader` `:899` | `ctaFooter` `:901` |
| desktop modal | `:942–1012` | `renderHero()` `:974` | `stickyHeader` `:977` | floating dock `:988` |
| mobile sheet | `:1015–1050` | `renderMobileHero()` `:1035` | `mobileTabBar` `:1038` | `mobileCtaFooter` `:1047` |

`renderMobileHero`, `mobileTabBar`, and `mobileCtaFooter` are each referenced exactly once — all inside the modal branch.

`/property/[slug]/page.tsx:93` passes `inline`. So the standalone page serves the desktop hero and the desktop tab strip at 390px.

**Why this is the top item:** that route is the shareable URL. It is what goes out over WhatsApp handoff — a core conversion path per `CLAUDE.md`. The mobile work is invisible on the route that matters most.

**Fix shape:** `{isMobile ? renderMobileHero() : renderHero()}` and `{isMobile ? mobileTabBar : stickyHeader}` inside the inline branch. Both already exist and are self-contained.

### P0.2 Every tab component mounts twice **[V]**

`tabBody` (defined `:295`) is rendered at:
- `:900` — inline branch (exclusive, early `return`, fine)
- `:982` — desktop modal
- `:1042` — mobile sheet

`:982` and `:1042` are in the same render pass. Both `AnimatePresence` blocks (`:942`, `:1015`) gate on `isOpen` only. `hidden md:flex` / `md:hidden` are CSS — both subtrees mount.

Result per open: two `OverviewTab`, two `LocationTab` (two Google Maps inits), two `IntelligenceTab` dynamic chunks, two `<Image priority>` heroes. Every child `useEffect` fetch fires twice. Duplicate DOM also means duplicate `id`s and two focus-trappable copies for screen readers.

`isMobile` state exists at `:83` and **is never read**. The gate was written and abandoned.

### P0.3 Mobile sheet leaves ~100px for content **[V]**

`h-[92vh]` on a 667px iPhone SE = 613px.

| Region | px |
|---|---|
| hero — `style={{ height: 380 }}` `:795` | 380 |
| `mobileTabBar` — `py-1` + `py-2` + 18px icon + 10px label | ~61 |
| `mobileCtaFooter` — `p-3` + `py-3.5` | ~72 |
| **remaining** | **~100** |

Plus `pb-20` (80px) on the scroll container `:1032`. The hero is a hard pixel value with no `vh`/`dvh` relation, so it does not adapt.

**Fix shape:** `h-[min(45vh,340px)]` or `aspect-[4/3] max-h-[45vh]`; `h-[92vh]` → `h-[92dvh]`.

### P0.4 Three tables silently amputate their right edge **[V]**

| File | Line | Class |
|---|---|---|
| `ResidencesTab.tsx` | `:551` | `<table className="w-full text-left text-[12.5px] border-collapse">` |
| `ResidencesTab.tsx` | `:881` | same |
| `ProjectPricingTab.tsx` | `:833` | `<table className="w-full text-left text-[12.5px]">` |

All three sit inside an `overflow-x-auto` wrapper. **`w-full` means the table never exceeds the container, so the wrapper never scrolls** — the table compresses instead. The 7-column availability table carries 196px of cell padding alone inside ~326px of content width.

Compounding: `globals.css:389` and `:584` both declare `body { overflow-x: hidden }`. Overflow is not scrollable — it is clipped with no indication. Users lose the right edge of price and availability tables and never know it existed.

**Fix shape:** `min-w-[720px]` (Residences) / `min-w-[600px]` (Pricing) on the `<table>` so the existing wrapper engages. Better below `sm`: a card stack, one card per unit.

### P0.5 Analysis sub-tabs are six unlabeled glyphs on mobile **[V]**

`IntelligenceTabs.tsx:160` — `<span className="hidden sm:inline text-xs font-medium">{tab.label}</span>`

Below 640px all six tabs render as bare 14px lucide icons. The `<button>` `:153` has no `aria-label`; only the container `role="tablist"` is labelled. Financial / Market / Compare are visually indistinguishable and unreadable to assistive tech.

Tab grid is `grid grid-cols-3 lg:grid-cols-6` `:140`; buttons are `px-2 py-2` → ~30px tall.

### P0.6 Admin: invisible but tappable delete **[V]**

`app/admin/projects/page.tsx:764`
```
className="w-[60px] flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
```

No hover on touch, so it never becomes visible — **but `opacity-0` still hit-tests**. A 60px invisible delete control on the right edge of every row, with only `window.confirm` behind it.

Compounding: the row is a `<Link>` (`:687`) wrapping that `<button>` (`:765`). Nested interactive content inside an anchor is invalid HTML; `e.preventDefault()` at `:767` stops navigation on click, but a slightly-dragged tap can still resolve to the anchor.

### P0.7 `globals.css` — unterminated rule swallows ~190 lines **[V]**

`:226` opens `input[type="range"]::-moz-range-thumb {`, declarations run to `border: 2px solid white;` `:232`, then `@keyframes shimmer {` begins at `:233` **with no closing brace**. The parser consumes everything to the stray `}` at `:422`.

Nothing is visibly lost **only because the entire block is duplicated verbatim after `:422`**:
- `.touch-target-min` at `:331` and `:526`
- `body { overflow-x: hidden }` at `:389` and `:584`
- `@media (max-width: 767px)` at `:323`, `:518`, `:651`

Your mobile media block survives by accident. Also `.score-ring-animate` `:423` references `@keyframes score-ring`, which exists nowhere.

---

## Data integrity — violates `CLAUDE.md` outright

> "Never invent property listings, builder information, or RERA information. Never invent prices, inventory, or availability."

Arguably above the layout work in priority. Fabricated values render as verified fact, **including during the loading window** — so real projects briefly display another project's numbers.

### `ProjectDetailPanel.tsx` **[V]**
- `:568` `d?.possession_label || 'Dec 2028 (~3.3 Yrs)'`; `:786` `|| 'Dec 2028'`
- `:569` / `:787` `|| 86` — invented AI score, rendered `:827` with a `⚡ AI SCORE` badge
- `:570` / `:788` `|| 'Elite Group'`
- `:648` fallback builder blurb: *"A premier luxury developer in Noida known for high-end residential estates, zero-delay delivery track record, and flawless legal titles."*
- `:669–672` `'5'` towers, `'G+26'` floors, `'5.1 Ac'`, `'69%'` open space
- `:747` `'3 • 4 BHK'`; `:792` `perSqftRate` default `'15,942'`; `:859` `|| 'Uttar Pradesh'`
- **`:94` — RERA fallback URL points at Maharashtra RERA** (`maharerait.mahaonline.gov.in`) for a Noida/UP-only product. Every RERA click without `rera_url` lands on a registry that cannot resolve the ID.

### `BuilderTab.tsx` **[A]**
- `:262–266` hardcoded RERA `'UPRERAPRJ916631'` and GST `'27AABCE1234F1Z5'`; unconditional ISO 9001:2015 / CREDAI / IGBC tags each shipping an emerald "Certified" chip `:275`
- `:141`, `:233` — **Unsplash stock photos** with `alt="Builder Architecture"`, presented as the builder's work
- `:152–155`, `:291–295` — `|| 42` projects, `'22.4M+'` sq ft, `'18,000+'` families, `'4.7/5' (1200+ reviews)`
- `:29/:32/:114/:181` — `'Elite Group'`, founded `2006`, then prose: *"Founded in 2006, Elite Group has grown into one of India's most trusted real estate brands."*

### `LocationTab.tsx` **[A]**
- `:86` invents a full address including PIN code: `` `Sector ${d?.sector || '10'}, Greater Noida West, Uttar Pradesh 203207, India` ``
- `:298/:311/:324/:337` — safety `?? 92`, AQI `?? 155`, green cover `?? 75%`, noise `?? 45 dB`, each with a static caption regardless of value
- `:262/:264` — `|| '1.2 km'`, `|| '5 mins'`

### `ProjectPricingTab.tsx` **[A]**
- `:27–35/:46/:74–76` — `?? 2.01` Cr, `?? 1397` sqft, `|| 8.5`% rate, RERA `?? 'UPRERAPRJ916631/02/2024'`, `14388`/sqft, `?? 200000` club, `125000` other charges
- `:213` renders `RERA verified · {reraNum}` around the fabricated number
- `:445` hardcoded `₹1.6 - ₹2.0 Cr` "loan eligibility", paired with "Looks good!" — reads as a personalised pre-approval
- `:385` footnote hardcodes `@ 8.5% p.a.` while the EMI above uses `interestRatePct` — desyncs when the DB differs
- `:409–427` 15-bar "amortization" chart generated from `20 + i*4` / `60 - i*3`, with Year 1/5/10/15 axis labels
- `:832–873` 5-column plan comparison table, all 16 cells invented, not derived from `paymentPlanMilestones`
- `:759–762` hardcoded offers naming HDFC / ICICI

### `ResidencesTab.tsx` **[V]** (`:543`) / **[A]** (rest)
- `:543` `Only {activeUnit.inventory_left || mockAvailability.length || 8} units available` — with a pulsing "live inventory" dot `:542`. Fabricated scarcity is a regulatory risk in Indian real estate, not just a trust one.
- `:802–824` entire Vastu section hardcoded, identical for every project; `:797` `Vastu Compliant (94/100)`
- `:111–113` `carpet_area_sqft || Math.round(area * 0.65)`, balcony `* 0.08`, RERA carpet `* 0.94` — RERA-defined legal figures estimated from coefficients
- `:262` badges assigned by array index (`idx === 0 ? 'BEST VALUE'`), so they change when the BHK filter changes
- `:864–912` availability table has no `length > 0` guard (unlike `:564`), rendering a naked header row under "Only 8 units left"

### `PricingTab.tsx` **[A]**
- `:453–478` `'₹2.01 Cr'`, `'2,500 sqft'`, `'₹2.36 Cr+'`, `'₹3.40 – 4.50 Cr'` under headings "Lowest Entry Price" / "Premium Configuration"
- `:535/:548/:561/:574` use `!== false`, so a **missing** field renders as "Eligible & Approved" / "Permitted" / "FEMA Compliant" — absence of data reported as a positive legal determination
- `:618` "View All 40+ Amenities" while `:590` slices `.slice(0, 6)` from the real list

### `ConstructionTimeline.tsx` **[V]**
- `:41–141` — ~100 lines of fabricated milestones (invented dates, invented RERA compliance claims, invented OC issuance). **Verified unreferenced**: grep finds only the two declarations at `:41` and `:92`. Dead code one wire-up away from shipping. `:143–149` even comments *"Use only real milestones, no fabricated defaults"*.
- `:183/:208/:216` `list.length || 16` → "All 16 construction phases completed & verified by RERA" with zero milestones
- `:285` `|| 'Q4 2026'`; `:192` unconditional "On Track for On-Time Delivery" while `projectRiskFlag` is declared in props `:11` and never destructured

### `OverviewTab.tsx` **[A]**
- `:105–165` six USP chips pushed unconditionally: `'75%'` open green, `'3 mins'` metro, `'Aqua Line Metro'`, forced `'Gold Rated'` (`:131` comments *"Force premium look from reference"*), `'Low'` density, `'Corner'` smart units, and `d?.rera_number ? 'Registered' : 'Registered'`
- `:607` hardcoded `+15 More Nearby`
- `:633–636` four fixed document titles paired blindly to `documents[i]` — a brochure at index 0 renders as "RERA Certificate — Verified"
- `:226–229` fake channel-partner RERA strings, then `:473–475` asserts "All channel partners are RERA registered & verified"

---

## Touch parity — dead interactions on phones

| What | Where | Consequence |
|---|---|---|
| Document download icon | `DocumentsTab.tsx:123` **[V]** | `opacity-0 group-hover:opacity-100` — the tab's **only action**, invisible on every phone |
| Card carousel | `ProjectCard.tsx:246/253` **[V]** arrows hover-only; `:259–263` **[V]** dots have **no `onClick`**; no swipe handler | Multi-image projects can only ever display image 1 |
| Copy / edit / 👍 / 👎 | `MessageBubble.tsx:654/665/672/679` **[V]** | Only per-message controls in chat, permanently hidden — and 12×12px when revealed |
| Health-score breakdown | `admin/projects/page.tsx:749` **[A]** | Per-section scores exist only as a hover tooltip |
| Per-tab audit list | `admin/projects/[id]/page.tsx:595` **[A]** | `pointer-events-none` + hover. Mobile admins cannot see missing fields |
| EMI sliders | `ProjectPricingTab.tsx:321/365` **[V]** `h-1.5` | **6px hit area** on the calculator's primary control |
| Cost donut + rows | `ProjectPricingTab.tsx:688/719` **[A]** | `onMouseEnter` only — and `:631` instructs "Hover items to isolate" |
| Chart values | `PricingCharts.tsx:90/121/156` **[A]** | Tooltip-only, no `LabelList`. **No number is readable off any chart on a phone** |
| Appreciation chart | `IntelligenceTab.tsx:175` **[A]** | Copy says "Hover over any point"; `:109` dismisses only via `onMouseLeave`, so a tapped tooltip never clears |
| Builder popover | `ProjectDetailPanel.tsx:635` **[A]** | `onMouseEnter` only; the `˅` chevron `:854` has no handler at all |
| Mobile image carousel | `ProjectDetailPanel.tsx:919–937` **[V]** | `imageBadges` and `imageCarouselDots` are declared and **never rendered**. Mobile hero shows a `📷 N` count with no way to change the image |

### iOS-specific

- **`placeholders-and-vanish-input.tsx:243` [V]** — chat textarea is `text-sm sm:text-base` = 14px on mobile. iOS force-zooms the page on focus below 16px and does not zoom back on blur. Every tap on the chat input zooms the viewport, breaking the fixed input island and the `visualViewport` height math at `DiscoveryContent.tsx:457`.
- **`DiscoveryContent.tsx:1727` [V]** — safe-area applied only `${keyboardOpen ? 'pb-safe' : ''}`. Keyboard closed (the default browsing state) gives `pb-6` = 24px against a 34px home indicator. **The send button sits under the gesture bar.** `.pb-safe` is correctly defined at `globals.css:378` with a `max(…, 16px)` floor — it is simply gated on the wrong condition. The inline `style` fallback on `:1728` is *weaker* than the class it duplicates.
- **`app/layout.tsx:54` [V]** — `maximumScale: 1` blocks pinch-zoom. WCAG 1.4.4 failure.
- **~23 files use `vh` not `dvh` [V]** — mostly admin modals at `max-h-[65vh]` / `[68vh]`, plus `IntelligenceEditModal.tsx:76` `max-h-[90vh]`, where the sticky footer holding Save/Cancel is pushed below the fold when the URL bar is visible.
- **`DiscoveryContent.tsx:447` [A]** — `useState('100vh')` initial value; `app/discover/page.tsx:107` already correctly uses `h-[100dvh]` on the outer shell.

---

## Dark mode

`grep -c 'dark:'` across `components/property-detail/`:

| File | count |
|---|---|
| `ResidencesTab` | 252 |
| `IntelligenceTab` | 162 |
| `ProjectPricingTab` | 145 |
| `PricingTab` | 123 |
| `OverviewTab` | 109 |
| `LocationTab` | 85 |
| `BuilderTab` | 71 |
| `ConstructionTimeline` | 64 |
| `SocialProofAndTransparency` | 28 |
| `PartnersTab` | 28 |
| `CompetitorsTab` | 17 |
| `PricingCharts` | 16 |
| `Card` | 4 |
| **`DocumentsTab`** | **0** |
| **`SpecificationGrid`** | **0** |
| **`IntelligenceTabs`** | **0** |
| **`IntelligenceEditModal`** | **0** |

Plus:
- **The desktop modal shell itself** — `ProjectDetailPanel.tsx:963` `bg-gray-50`, `:981` `bg-white`, `:393` `ctaFooter` `bg-white`, none with a `dark:` variant, while every tab child inside uses `dark:text-white`. **Dark mode desktop modal = light-on-white body copy across all six tabs.**
- **`SpecEditor.tsx`** — zero dark mode. Mine, shipped this session.
- **`ProjectForm.tsx:122/156/203`** — `Input`, `Textarea`, `TagInput` have no dark variants while the sibling `Select` `:137` does. The containing card is `dark:bg-[#121214]`.
- **`IntelligenceWorkspace.tsx:583/615/852/1026/1197`** — cards are `bg-white border-gray-100`, no variant, while the inputs inside them are fully dark-aware.

`DocumentsTab` additionally has `whileHover={{ backgroundColor: 'rgba(250,250,250,1)' }}` at `:82` — an opaque near-white inline style that fires on tap on many mobile browsers **[A]**.

---

## Dead code and no-op classes

### Classes that compile to nothing **[V]**

`z-45`, `gray-450`, `gray-650`, `gray-850`, `py-4.5`, `w-4.5`, `h-4.5`, `py-0.2`, `animate-spin-slow`

None appear in `tailwind.config.ts` (which has no `zIndex` or `spacing` extension covering them) or in `globals.css`.

Most consequential: **`z-45` on the mobile tab bar** (`ProjectDetailPanel.tsx:512`). That bar currently has `z-index: auto`, so any `relative z-10`/`z-20` child inside `tabBody` paints over it during scroll.

`w-4.5 h-4.5` collapses the unchecked-state circle in `DocumentsTab.tsx:282` to zero size.

### Unreachable components **[V]**

| File | Size | Status |
|---|---|---|
| `components/PropertyCard.tsx` | 20.8K | Zero production imports |
| `components/chat/PropertyCardWithRecommendation.tsx` | 14.6K | Referenced only by a jest mock |

35.4K of dead card code. The second is a ~1050px card (`h-[440px]` hero `:112`, `text-[36px]` name `:202`, `text-[38px]` price `:255`) — far worse than the live card, sitting one import away from shipping.

### Other dead code
- `ConstructionTimeline.tsx:41–141` — ~100 lines of fabricated milestones, unreferenced **[V]**
- `ProjectDetailPanel.tsx:83` `isMobile` never read; `:919`/`:930` `imageBadges`/`imageCarouselDots` never rendered **[V]**
- `ResidencesTab.tsx:975–996` `TrophyIcon` defined, never used; duplicate at `PricingTab.tsx:643` **[A]**
- `ResidencesTab.tsx:766–775` `md:col-span-4` on an element whose parent `:711` is not a grid — inert, meaning the desktop layout there is silently broken **[A]**
- `LocationTab.tsx:122` "Show Traffic" button has no `onClick`; `:73` "Get Commute" sets `''` so `:204` never renders — a prominent full-width CTA that does nothing **[A]**

---

## Project card — compaction spec

The chat card is `components/ProjectCard.tsx`, rendered from `MessageBubble.tsx:909/948/1007` and `PropertyCardsDisplay.tsx:59`.

### Current: ≈468px **[V]**

| Element | Line | Classes driving height | px |
|---|---|---|---|
| Hero image | `:196` | `h-[220px] flex-shrink-0` | 220 |
| Body padding | `:299` | `px-5 pt-4 pb-5` | 36 |
| Name + margin | `:302` | `text-[17px] leading-snug` + `mb-0.5` | 25 |
| Builder·Sector·Possession | `:315` | `text-[12px]` + `mb-3` | 30 |
| Price + margin | `:331` | `text-[24px] leading-none` + `mb-4` | 40 |
| Config rows ×2 | `:338` | `text-[13px]` ×2 + `gap-1.5` + `mb-5` | 65 |
| Action row | `:363` | `pt-2` + `h-11` | 52 |
| | | **total** | **≈468** |

`+18px` when a project has 3+ BHK groups (`+N more configurations`, `:352`).

Feed on 390×844 has ~588px usable after `pt-32 pb-32` (`DiscoveryContent.tsx:1603`). **One card fills 80% of the visible feed.** Six cards (`MAX_CARDS = 6`, `MessageBubble.tsx:777`) = **2,904px** of scroll before the "view remaining" button.

### Height contribution, ranked

| Rank | Element | px | % | Verdict |
|---|---|---|---|---|
| 1 | Hero `h-[220px]` | 220 | 47% | Decoration at this size. 112px conveys the same signal. |
| 2 | Config rows | 65 | 14% | Half-essential. BHK is a criterion; per-row sqft is not. |
| 3 | Action row | 52 | 11% | Decoration on mobile — the whole card already opens the detail panel (`:180`). |
| 4 | Price | 40 | 9% | **Essential.** |
| 5 | Body padding | 36 | 8% | `p-2.5` suffices. |
| 6 | Builder·Sector·Possession | 30 | 6% | Essential, but fits one 16px line. |
| 7 | Name | 25 | 5% | **Essential.** |

### Target: ~104px (+12 gap)

Horizontal row — `w-28 aspect-[4/3]` thumbnail (112×84) + content column.

```
flex flex-row items-stretch gap-3 p-2.5 rounded-2xl ring-1
├── thumbnail  w-28 aspect-[4/3] rounded-xl object-cover shrink-0
│     └── status dot overlay (no text pill)
└── content    flex-1 min-w-0 flex flex-col justify-between
      ├── h3 text-[15px] font-semibold truncate      + RERA chip (shrink-0)
      ├── p  text-[12px] text-gray-500 truncate      Builder · Sector
      ├── badges  [2/3 BHK]  [Ready] | [Poss. Dec '27]
      └── p  text-[15px] font-semibold tabular-nums  ₹1.4 – 2.1 Cr
```

Price sits on its own baseline row, not right-aligned in a side column — Indian ranges (`₹1.45 Cr – ₹2.10 Cr`) are too wide to sit beside a 112px thumbnail at 360px without truncating either the name or the price.

`max(84 thumbnail, 82 content) + 20 padding ≈ 104px`. Six cards: 2,904px → **792px**.

### Field disposition

| Field | Mobile | Current line |
|---|---|---|
| Name | stays, `text-[15px] truncate` | `:303` |
| Price | stays, `text-[15px]` (from 24px) | `:332` |
| Builder · Sector | stays, merged one line | `:315–322` |
| BHK | → badge, sqft dropped | `:110–115` |
| Status | → badge or thumbnail dot | `:270–277` |
| Possession | → badge (replaces status when not RTM) | `:323–327` |
| RERA | stays, bare 11px chip, icon dropped | `:306–311` |
| Save | stays, grown to 40×40 | `:280–295` |
| Compare "Select" | stays (compare mode needs it) | `:197–215` |
| Per-BHK sqft | **removed** → detail panel | `:345–349` |
| `+N more configurations` | **removed** | `:352–359` |
| Ask AI dropdown | **removed** | `:364–430` |
| Call / Share | **removed** | `:436–454` |
| Carousel arrows + dots | **removed** (already non-functional on touch) | `:242–267` |

### Implementation — protecting desktop

**Recommended: two sibling markup blocks in one component.** Extract the shared derived values (`bhkGroups`, `statusLabel`, `handleSave`, `handleCardClick`, `isRTM`) once, then:

```tsx
<>
  <div className="sm:hidden">{/* new compact row */}</div>
  <div className="hidden sm:flex …">{/* :184–459, character-for-character unchanged */}</div>
</>
```

The desktop branch **cannot regress because not one class on it changes.** Cost: ~1.5KB gzipped per card; both `<Image>` elements exist but Next only fetches the painted one.

**Rejected: responsive utility classes on one tree.** The layouts are structurally different, not just differently sized — the image moves from a block above the body to a fixed column beside it, and the `flex-col` → `flex-row` flip changes how `flex-1`, `mt-auto` (`:363`), and `flex-shrink-0` (`:196`) resolve on desktop. That is ~25 breakpoint-prefixed classes across 10 sites, each a chance to shift desktop by a pixel.

**Rejected: `useMediaQuery` / `window.innerWidth` branching.** The chat is SSR'd through `DiscoveryContent` — a JS branch produces a hydration mismatch and a visible layout flash on first paint.

---

## Admin panel

### Beyond P0.6

- **Mobile admin sees name + builder + sector only.** Status `:719`, Pricing `:727`, Health `:734` are all `hidden sm:*`. The Price and Health **filters** at `:563–585` stay visible and functional — you can filter by values you cannot see. Rows compute to ~66px (`py-3.5` = 28px padding + 38px content), with room for one 16px line. A `sm:hidden` meta line restores status + price + health at ~84px, desktop untouched. **[V]** on `:764`, **[A]** on the arithmetic.
- **`ProjectForm.tsx:85/476/487/558/568` [V]** — five `col-span-2` with **no breakpoint prefix**, inside `grid grid-cols-1 sm:grid-cols-2` `:345`. Below 640px the explicit grid has one column, so a `span 2` item forces an implicit second column. Every single-column field then lays out into column 1 only — narrower than the container — while section headers and the two description textareas claim both. **Quietly broken on every phone.**
- **`IntelligenceWorkspace.tsx` [V]** — 12 unprefixed `grid-cols-2`. At 390px: 358 (page) − 48 (`px-6`) − 12 (gap) = 149px per column, minus 32px of `inputCls` padding = **117px of usable text width** for Why Buy / Why Avoid / Best For / the four thesis lenses / competitor name+slug.
- **`IntelligenceWorkspace.tsx:358` [A]** — the `FL` component: **every field label in the workspace** is `text-[10px] font-black text-slate-400 uppercase tracking-widest`. `slate-400` on white is ~2.8:1, below AA, and it is the only identification each input has. Single most-repeated a11y failure in the panel.
- **Nested scroll traps [A]** — `SpecEditor.tsx:120` `max-h-96 overflow-y-auto` and `admin/projects/[id]/page.tsx:692/757/786/813/838/860` `sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto` with the scrollbar explicitly hidden. All unprefixed, so they persist in the single-column mobile stack where `sticky` is meaningless. iOS does not scroll-chain out of them.
- **`admin/projects/[id]/page.tsx:532` [A]** — six tabs ≈950px of content in a 358px viewport. `overflow-x-auto` is present, but the inner wrapper is `min-w-full justify-between`, which can pin tab 1 left with the rest off-screen and no scroll cue.
- **Column misalignment [A]** — header Health is `w-[90px]` `:646`, body cell is `w-[100px]` `:734`. 10px permanent offset at ≥640px.

### `SpecEditor.tsx` — mine, shipped this session

Zero dark mode; `grid-cols-2` unprefixed `:134` (~139px per select for values like `doors_windows`); inputs `px-2 py-1 text-xs` ≈ 24px tall across five fields per row; delete button `p-1` + `size={14}` = 22×22px with no confirm, directly above the category select. `SpecificationGrid.tsx` likewise has zero dark mode.

### Already correct — do not touch

`CustomSelect.tsx` — 48px trigger `:57`, `left-0 right-0` anchoring `:82` (cannot render off-screen), `max-h-60 overflow-y-auto`, full dark mode. The **local copy** in `admin/projects/page.tsx:16–84` should adopt this, not the reverse.

`ProjectPreview.tsx` — the sub-11px fonts (`text-[7.5px]` … `text-[10px]`) are inside a **simulated phone screen** at `max-w-[340px]`. Enlarging them would break the fidelity of the preview. Only the real controls outside the mockup need attention (`:123/:132/:145/:154` toggles ~22px; `:163–171` refresh 28×28; `:452–465` stat labels).

---

## Desktop-regression guard — currently absent

`components/property-detail/__tests__/` contains 8 test files:

```
BuilderTab  ConstructionTimeline  IntelligenceTab  LocationTab
OverviewTab  PartnersTab  PricingTab  ResidencesTab
```

**Zero contain `matchMedia`, `innerWidth`, `viewport`, or any breakpoint assertion.**

If "PC stays exactly as before" is a hard requirement, that gap needs closing *before* the mobile work lands, not after. Otherwise every change is verified by eye only.

---

## Suggested order

| # | Item | Why first |
|---|---|---|
| 1 | Route `inline` to mobile hero/tab bar (P0.1) | One conditional. Unlocks all existing mobile work on the WhatsApp path. |
| 2 | Gate both `AnimatePresence` on `isMobile` (P0.2) | Kills the double mount. State already exists. |
| 3 | Strip fabricated fallbacks + fix the Maharashtra RERA URL | Trust, and it is your own stated rule. Independent of layout. |
| 4 | Cap mobile hero — `min(45vh,340px)`, `dvh` (P0.3) | Makes the sheet usable. |
| 5 | `min-w-` on the three tables; `z-45`→`z-40`; close `globals.css:232` | Three one-line fixes, high impact. |
| 6 | Compact card, two-block approach | Your top ask. Zero desktop risk by construction. |
| 7 | Hover-only → touch parity sweep | Restores features that are currently dead on phones. |
| 8 | Dark mode on the four zero-coverage files + the modal shell | |
| 9 | Admin: `opacity-100 md:opacity-0`, `col-span-2` prefixes, the 12 `grid-cols-2` | Two of these are single find/replace passes. |
| 10 | Delete dead code (35.4K of cards, `ConstructionTimeline:41–141`, no-op classes) | **Requires explicit confirmation per `CLAUDE.md` deletion gates.** |

Items 1–5 are independent of each other and of the card work.

---

## Counts by area

| Area | CRITICAL | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| Detail shell (`ProjectDetailPanel` + `globals.css`) | 4 | 6 | 7 | 8 |
| Overview group | 4 | 8 | 9 | 3 |
| Analysis group | 4 | 10 | 12 | 4 |
| Location / Builder / Docs / Partners | 11 | 19 | 20 | 5 |
| Pricing / Residences | 8 | 14 | 18 | 8 |
| Chat + project card | 5 | 6 | 5 | 4 |
| Admin | 3 | 10 | 18 | 8 |

Nothing here required a code change to find. No files were modified producing this report.
