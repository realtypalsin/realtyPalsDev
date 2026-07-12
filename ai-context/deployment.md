# Deployment Standards

## Environments

### Local

Developer environment.

### Staging

Pre-production validation.

### Production

Customer-facing environment.

---

## Release Process

1. Development
2. Review
3. Testing
4. Staging
5. Production

---

## Before Deployment

Verify:

* build passes
* tests pass
* database migrations reviewed
* environment variables configured

---

## Database Changes

Before migration:

* review impact
* review rollback plan
* verify compatibility

---

## Monitoring

Track:

* uptime
* errors
* response times
* AI failures

---

## Rollback

Every deployment should have a rollback strategy.

Production fixes should prioritize stability over speed.
