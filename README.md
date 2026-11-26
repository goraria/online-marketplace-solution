# Gorth Marketplace

Root fullstack application: Next.js 16 (default Turbopack), Hono, Drizzle and Better Auth 1.7.7.
The original client/server source remains unchanged in `pkg/`; the active application does not import it.

## Run

```sh
pnpm dev
```

Marketplace runs on `http://localhost:3035` and the environment example uses Gorth SSO at `https://gorth-auth.vercel.app`. Generic OAuth requires verified discovery metadata from that issuer. There is no separate Marketplace server on port 5055; that port belongs to Payment.

Use [.env.example](.env.example) for root config. Only `utils/environment.ts` reads app environment values. The native Better Auth secret is supplied explicitly from server-only `NEXT_SESSION_SECRET`; obsolete `NEXT_AUTH_SECRET` and cookie/token aliases are not read.

For existing Marketplace features, configure service audiences at root:

- `NEXT_OAUTH_MEDIA_AUDIENCE`: image upload and product media, local 5057.
- `NEXT_OAUTH_PAYMENT_AUDIENCE`: payment intents, local 5055.
- `NEXT_OAUTH_BILLING_AUDIENCE`: subscription/invoices, local 5056.

Deployment uses the registered HTTPS service origins. Restart after changing env; sign in again to request the newly configured audiences. Missing private service config fails closed instead of using old URL fallbacks.

## Verify

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm exec prettier --check .
pnpm build
```

See [auth and fullstack architecture](docs/auth-structure.md) for the cloud migration, API paths, session policy and verification limits.
