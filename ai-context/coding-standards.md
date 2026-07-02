# Coding Standards

## General Principles

* Simplicity over cleverness.
* Readability over brevity.
* Maintainability over optimization.

---

## TypeScript

Mandatory:

* strict mode
* explicit types
* typed API contracts

Avoid:

* any
* unsafe casting
* untyped responses

---

## Validation

All external input must be validated.

Examples:

* Forms
* API requests
* Query params
* AI responses

Use Zod.

---

## Error Handling

Never swallow errors.

Always:

* log errors
* provide user-safe messages
* return typed responses

---

## Naming

Use clear names.

Good:

* getPropertyRecommendations
* createCallbackRequest

Bad:

* processData
* handleStuff

---

## Reusability

Extract reusable logic only when:

* used multiple times
* genuinely improves maintainability

Avoid premature abstraction.
