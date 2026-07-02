# Security Standards

## Principles

Security is a default requirement.

Not an optional enhancement.

---

## Authentication

Always verify:

* session
* user identity
* permissions

Never trust client claims.

---

## Authorization

Users may only access resources they own.

Verify ownership server-side.

---

## Input Validation

Validate all external input.

Never trust:

* forms
* API requests
* query parameters
* AI responses

---

## Secrets

Never expose:

* API keys
* database credentials
* access tokens
* internal prompts

Use environment variables.

---

## Data Protection

Protect:

* user information
* lead information
* conversation history

---

## AI Security

Never allow AI output to:

* execute code
* modify database directly
* bypass authorization

AI output is untrusted input.

Always validate before use.

---

## Security Review Checklist

Verify:

* authentication
* authorization
* validation
* rate limiting
* error handling
* secret management
