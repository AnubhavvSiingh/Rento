# Security Checklist

## Backend
- Keep secrets in server-side environment variables only; never commit .env files.
- Rotate admin and service credentials regularly, especially after sharing demo data.
- Enforce HTTPS in production and set secure proxy headers if behind a load balancer.
- Set CORS_ORIGINS to trusted domains and avoid wildcards.
- Tune rate limits per route based on traffic patterns.
- Monitor auth failures and lock out abusive IPs at the edge when needed.
- Use least-privilege database roles and enable regular backups.
- Keep dependencies updated and run vulnerability scans.

## Frontend
- Do not ship credentials, API keys, or private logic in the client bundle.
- Treat all client-side checks as UX only; enforce authorization on the API.
- Avoid long-lived tokens in the browser; prefer short sessions where possible.
- Keep the public product payload minimal and avoid exposing internal fields.

## Operations
- Enable application logging with redaction for PII and credentials.
- Use a WAF or CDN rules for common attack patterns.
- Periodically review access logs and audit trails.
