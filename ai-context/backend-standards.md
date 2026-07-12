# Backend Standards

## Principles

Backend is the source of truth.

Never trust the client.

---

## API Design

Requirements:

* Typed requests
* Typed responses
* Consistent error structure

---

## Validation

Validate:

* request body
* query parameters
* route parameters

Use Zod.

---

## Business Logic

Business logic belongs in services.

Avoid placing business logic inside:

* route handlers
* controllers
* UI

---

## Database Access

Use Prisma exclusively.

Never:

* bypass Prisma
* write raw SQL without justification

---

## Error Handling

Return meaningful errors.

Do not expose:

* stack traces
* secrets
* database details

---

## Logging

Log:

* failures
* important events
* critical workflows

Never log:

* passwords
* tokens
* sensitive user information
