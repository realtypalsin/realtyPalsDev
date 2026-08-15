# Frontend Component Refactoring Plan

## Problem
- DiscoveryContent: 1,814 lines, cyclomatic complexity 228, CRAP 52,212, **0% test coverage**
- ProjectDetailPanel: 1,028 lines, complexity 85, **0% test coverage**
- MessageBubbleInner: 939 lines, complexity 87, **0% test coverage**

These are critical hub nodes with 487+ incoming dependencies. 1 bug = blast radius across entire app.

---

## Solution: Component Decomposition

### DiscoveryContent (1,814 lines) → 6 focused components (200-300 lines each)

#### 1. **DiscoveryFilters** (250 lines)
- Handles: BHK selection, budget sliders, sector filters
- Exports: `<DiscoveryFilters intent={} onChange={} />`
- Test: Unit test for filter value changes, validation

#### 2. **DiscoveryChips** (200 lines)
- Handles: Chip rendering, chip click handlers, chip state
- Exports: `<DiscoveryChips chips={} onChipClick={} />`
- Test: Unit test for chip rendering, click events

#### 3. **PropertyGrid** (250 lines)
- Handles: Property card grid, virtualization, infinite scroll
- Exports: `<PropertyGrid properties={} isLoading={} onPropertyClick={} />`
- Test: Unit test for grid rendering, lazy loading

#### 4. **DiscoveryEmpty** (100 lines)
- Handles: Empty state UI, "no results" messaging
- Exports: `<DiscoveryEmpty reason="NO_RESULTS" />`
- Test: Unit test for each empty state variant

#### 5. **DiscoveryLoading** (80 lines)
- Handles: Loading skeleton, progress indicators
- Exports: `<DiscoveryLoading stage="SEARCHING" />`
- Test: Unit test for each loading stage

#### 6. **DiscoveryController** (150 lines)
- Handles: Parent orchestration, state management
- Composes: DiscoveryFilters + DiscoveryChips + PropertyGrid + Empty + Loading
- Test: Integration test for full discovery flow

---

### ProjectDetailPanel (1,028 lines) → 4 focused components (200-250 lines each)

#### 1. **ProjectTabs** (150 lines)
- Overview, Specifications, Pricing, Residences tabs
- Test: Tab switching, content persistence

#### 2. **ProjectOverview** (250 lines)
- Summary, builder info, RERA, possession status
- Test: Data rendering, RERA link validation

#### 3. **ProjectComparison** (200 lines)
- Compare with similar projects
- Test: Comparison table rendering

#### 4. **ProjectActions** (100 lines)
- Save, call, visit buttons
- Test: Click handlers, analytics tracking

---

### MessageBubbleInner (939 lines) → 3 focused components (250-300 lines each)

#### 1. **MessageContent** (300 lines)
- Text rendering, markdown, code blocks
- Test: Markdown parsing, code block syntax highlighting

#### 2. **MessageChips** (250 lines)
- Chip rendering within messages
- Test: Chip click routing, analytics

#### 3. **MessageToolbar** (150 lines)
- Copy, like, dislike, feedback
- Test: Button clicks, feedback submission

---

## Execution Order

### Phase A: Quick wins (2-3 days)
1. Extract DiscoveryEmpty, DiscoveryLoading (trivial, immediate gains)
2. Unit tests for each (one test file per component)
3. Verify no regressions

### Phase B: Core refactors (1 week)
1. Extract DiscoveryChips, PropertyGrid
2. Extract ProjectTabs, ProjectOverview
3. Extract MessageContent
4. Integration tests for parent components

### Phase C: Final integration (3-4 days)
1. Extract remaining components
2. E2E test for full flows (user sends message → sees results → clicks chip → navigates)
3. Performance testing (virtualization, re-render count)

---

## Quality Gates

- ✅ All new components have unit tests (>=80% coverage)
- ✅ Parent components have integration tests
- ✅ TypeScript strict mode passes
- ✅ No performance regression (Lighthouse, Core Web Vitals)
- ✅ No visual regression (screenshot tests or manual QA)

---

## Token Reduction

- Phase A (Extract trivial): 5-10% fewer tokens (less code, simpler reasoning)
- Phase B+C (Full decomposition): 15-20% fewer tokens (each component is independently reasoned, easier to understand)

**Cumulative AI cost reduction: ~25% on frontend development** (fewer token-heavy full-file reads)

---

## Critical Path

Do NOT refactor:
- Without tests
- Without TypeScript strict mode
- Without E2E validation

The goal is safer, testable code — not just smaller files.
