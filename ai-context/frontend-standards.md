# Frontend Standards

## Stack

* Next.js App Router
* React
* TypeScript
* Tailwind
* shadcn/ui

---

## Components

Components should:

* Have a single responsibility
* Be reusable when appropriate
* Avoid business logic

---

## State Management

Prefer:

* Server Components
* URL State
* Local Component State

Introduce global state only when justified.

---

## Forms

Use:

* React Hook Form
* Zod validation

Validation must exist both client and server side.

---

## Accessibility

Required:

* Semantic HTML
* Keyboard navigation
* Proper labels
* Accessible forms

---

## Loading States

Every async action must have:

* Loading state
* Error state
* Empty state

---

## Performance

Avoid:

* unnecessary client components
* unnecessary re-renders
* excessive useEffect usage

Prefer server rendering where possible.
