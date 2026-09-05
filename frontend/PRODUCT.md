# Product

## Register

`product`

The default register is **product** — the app's centre of gravity is `/discover` (the conversational advisor), `/property/[slug]`, `/saved`, and the `/admin/*` workspace. Users arrive in a task, not in a browse.

**Brand-register overrides.** Three surfaces are brand, and design decisions there are judged by brand rules (design IS the product):

| Surface | File |
|---|---|
| Landing (unauthenticated) | `app/page.tsx` |
| Builder acquisition | `app/get-listed/page.tsx` |
| Builder registration | `app/builder-register/page.tsx` |

`/s/[id]` (public shared shortlist) is a **hybrid**: a cold-start surface seen by people who have never used PropFyndr, often a spouse or parent weighing a ₹2 crore decision. It must explain itself like brand and render data like product.

Everything else is product.

---

## Users

Four personas. Budget bands are the real Noida market, not invented.

### Priya — First-time buyer · ₹1–2 Cr

First purchase, no domain vocabulary. Can't yet tell a good deal from a bad one, and knows it. Reads on a phone, evenings, after work, interrupted.

Needs EMI translated into monthly rupees, "possession 2027" translated into "three more years of rent," and to be told which questions she should be asking. Abandons when the interface assumes she knows what carpet area or a super built-up loading factor is. Her real fear is being taken advantage of.

### Rahul — Family upgrade · ₹2–5 Cr

Already owns; moving for space and schools. Knows the basics, so hand-holding irritates him — he wants comparison and evidence. Decides on school proximity, metro access, builder delivery record, resale floor.

Laptop for serious sessions, phone to re-check on the move. Wants two or three projects side by side, not two brochures. Abandons when comparison forces him to hold facts in his head across screens.

### Aisha — NRI investor · ₹2–4 Cr

Buying remotely. Cannot walk the site, so every claim must be verifiable at a distance — RERA number, builder track record, document availability. Time-zone shifted, works asynchronously, expects state to survive between sessions.

Will escalate to a human, but only after the data has earned it. Abandons at anything resembling a lead-capture trap.

### Vikram — Builder · supply side

Wants qualified buyers, not volume. Needs to know what listing costs and what he gets. Judges the platform by whether the buyers who reach him are serious.

### Decision stakes

Every demand-side persona is making a ₹1–5 crore, once-a-decade, largely irreversible decision, usually with a 20-year loan attached. Sessions span days or weeks, not minutes.

Design for the anxiety that comes with that: reassurance at commitment points, honesty about unknowns, state that survives an interruption. **An interface that feels rushed or pushy at this price point reads as a scam.**

---

## Product Purpose

PropFyndr is an AI advisor that helps Noida home buyers reach a confident decision faster. It replaces hours of scrolling near-identical listings with a small number of reasoned recommendations, each carrying its reason and its primary trade-off.

The property database exists to serve the advisor. The advisor is the product.

**Success:** a buyer who understands *why* a project fits, knows its single biggest drawback, and trusts the recommendation enough to book a site visit — plus a qualified lead handed to sales.

**Failure:** a buyer who viewed forty projects, felt busy, and learned nothing. Listings-viewed is not a metric. If a feature raises engagement but not decision quality, it is the wrong feature.

---

## Brand Personality

**Trustworthy · expert · straightforward.**

An experienced advisor who has seen deals close and deals go wrong, whose incentive is the buyer's outcome — including telling them to walk away. Calm, specific, unhurried. Not a salesperson. Not a hype machine. Not a chirpy assistant.

### Voice rules

These are enforceable. Any copy change should be checked against them.

1. **Trade-off in the same breath as the recommendation.** "Fits your budget and is 10 minutes from Sector 62 metro. Possession is expected in 2027."
2. **Name uncertainty plainly.** "We don't have verified pricing for this tower yet" beats a confident guess, and beats silence.
3. **Plain rupees, plain language.** Lakh and crore as buyers say them. If a domain term is unavoidable — carpet area, super built-up, loading — define it inline on first use.
4. **No superlatives, no scarcity, no urgency.** Never "perfect," "must-see," "only 2 left," "prices rising fast," "guaranteed."
5. **Never fabricate a number.** No invented confidence score, match percentage, star rating, or verdict. Precision the data can't support destroys the only thing this product sells.
6. **Short sentences.** An anxious reader on a phone parses short sentences.
7. **No celebration on commitment.** "Visit requested," not "Visit Booked!" A ₹2 crore step is not a confetti moment.

---

## Anti-references

**Indian listing portals** — 99acres, MagicBricks, Housing.com, OLX. Reject specifically: walls of near-identical listing cards with no reasoning; "Contact Owner" gates; interstitial lead-capture modals; sponsored results indistinguishable from real ones; broker phone-number farming; a filter sidebar as the primary interface.

**Urgency and scarcity theatre** — countdown timers, "3 people viewing," "prices increase next month," invented inventory counts. At ₹1–5 crore this doesn't create urgency; it creates suspicion.

**Generic B2B SaaS chrome** — gray-on-gray dashboards, the hero-metric template (big number, small label, gradient accent), KPI rows that mean nothing to the reader.

**Over-designed AI chat** — typewriter effects on every token, gradient shimmer, decorative motion the user waits through, an assistant personality that gets between the buyer and the answer.

**Fake-precision analytics** — a "94% match" the data cannot justify. Invented percentages read as expertise to a designer and as a lie to a buyer.

---

## Design Principles

Each one carries a test you can fail.

### 1. Trust beats conversion

Show the negatives. Name the trade-off. Say "we don't know" when we don't. Where a design choice pits credibility against a click, credibility wins.

> **Test:** can a skeptical NRI buyer verify this claim without phoning anyone?

### 2. Reasoning is the product, not the listing

Every recommendation carries a visible *why* and a visible *primary trade-off*. A card without a reason is a listing, and listings are what we're replacing.

> **Test:** strip the images — does the recommendation still say something?

### 3. Conversation is primary; filters are the fallback

`/discover` is the front door. Structured filters exist for users who want them, never as the default path. Do not rebuild the portal filter sidebar as the main interface.

> **Test:** can a buyer get a real answer by typing one plain sentence?

### 4. Carry the context; never make them re-hold it

Sessions span days across two devices. Shortlists, comparisons, and chat state must persist and be visible where the decision happens. Never require remembering a fact from a previous screen.

> **Test:** close the tab mid-flow, return tomorrow — is anything lost?

### 5. Density where it decides, calm everywhere else

Buyers comparing projects want real data at real density — tables, specs, delivery records. The moment of decision needs air and one clear next step. Earn the density; don't spend it on decoration.

> **Test:** on any screen, name the single most important element in under three seconds.

### 6. Familiar, not clever

Standard affordances. One component vocabulary across chat, property, saved, and admin. Someone who has used any competent modern tool should never have to learn a PropFyndr-specific idiom. Novelty is a cost the buyer pays — spend it only where it buys clarity.

> **Test:** does this control behave the way the same control behaves elsewhere in the app?

---

## Accessibility & Inclusion

**WCAG 2.1 AA is the floor, not the aspiration.**

| Area | Requirement |
|---|---|
| **Contrast** | 4.5:1 body text, 3:1 large text and non-text UI. Applies to placeholders, muted secondary text, disabled labels, chart axes, and text over photographs. |
| **Zoom** | Pinch-zoom never blocked. Buyers enlarge price figures. |
| **Keyboard** | Every primary flow completable keyboard-only: send a message, pick a chip, open a property, switch a tab, save, request a callback. Visible focus ring on every interactive element. Escape closes every modal. |
| **Screen readers** | Chat announces state changes without re-reading streamed text. Icon-only controls have accessible names. Property data uses real table semantics. Charts have a text or table equivalent. |
| **Never colour alone** | RERA status, delivery verdicts, price movement, and pass/fail all carry a label or icon. Red-green colour deficiency is common in this market. |
| **Reduced motion** | `prefers-reduced-motion` honoured globally. Every reveal, stream animation, and transition has a crossfade or instant alternative. Content is never gated behind an animation that may not fire. |
| **Mobile reality** | 44×44px minimum touch targets. Primary actions in the thumb zone. State survives an app switch. Patchy 4G assumed. |
| **Numbers** | Indian numbering — lakh, crore, `en-IN` digit grouping. Never a bare `15000000`. Never Western comma grouping. |
| **Language** | Plain English at a level Priya reads without a glossary. Hindi and regional support are roadmap, not V1 — but don't hard-code layout assumptions that make them expensive later. |

---

## Known Debt

A full audit of the 16 primary surfaces was completed on 2026-07-28. Findings and the ordered remediation plan live in [`REFINEMENT-PLAN.md`](./REFINEMENT-PLAN.md). Read that before starting UI work on any surface listed there — several items are systemic and cheaper to fix once at the foundation than per file.
