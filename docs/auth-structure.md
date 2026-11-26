# Marketplace fullstack/auth migration

## Application structure

Next.js App Router and Hono now share one root application/deployment. `app/(api)/[...route]/route.ts` is the thin `@hono/vercel` adapter for `app/api.ts`; route group `(api)` does not add an API URL prefix.

Backend stays at root: `routes/`, `controllers/`, `services/`, `middlewares/`, `schemas/`, `database/`. Client hooks/API services are in `queries/`; all business and frontend consumers were updated directly. No obsolete `lib/utils`, Express compatibility adapter or utility fallback was added. Original caller/fetcher remain byte-identical to their archived versions.

The storefront, cart/checkout/order, account/subscription, seller and admin UI source was retained. Native APIs use `/marketplace/catalog`, `/marketplace/cart`, `/marketplace/address`, `/marketplace/checkout`, `/marketplace/order`, `/marketplace/user`, `/marketplace/seller`, `/marketplace/admin`. This avoids collisions with their HTML page routes. The old backend on 5055 is not a runtime dependency.

Old source, data seeding utilities and migration history remain archived in `pkg/`. Historical Drizzle migrations were retained under `database/drizzle` for review, not blindly replayed over the already migrated cloud database.

## Official Better Auth auth/session lifecycle

The installed version is 1.7.7, matched against the official 1.7 documentation:

- Native `genericOAuth`, `signIn.social({provider:"gorth"})`, native callback `/auth/callback/gorth`.
- Native `useSession/getSession/getAccessToken/signOut`; no custom OAuth state/PKCE/nonce exchange, encrypted-cookie session store or signed HMAC BFF RPC.
- Gorth SSO is the central identity authority; Marketplace has no local email/password or competing signup flow.
- PKCE/state/nonce, discovery, signature/issuer/audience verification and refresh are owned by Better Auth. `requireIdTokenVerification: true` prevents unverified fallback after discovery failure.
- `prompt:"select_account"` always shows the account chooser.
- `disableProviderLogout:true` means logout only clears Marketplace's local native session, leaving SSO accounts logged in.
- Native provider access/refresh credentials are encrypted at rest and remain backend-only. Browser token retrieval/refresh/linking/user-management APIs are disabled.
- Native provider `accountId` and local `user.externalUserId` bind the immutable SSO `sub`. Matching by email was removed; local UUIDs and app roles remain local.
- Verified SSO `sid` binds native accounts/sessions, without trusting an unverified JWT decode.
- Cookie/profile caching uses 120 seconds where applicable. Mutations/admin reads request fresh identity; protected backend routes verify authoritative session storage and post-refresh logout/revocation fences.
- UI uses native background session reads, no periodic full-page auth reload, and private query keys are scoped to the SSO subject (cart/order/address, seller/admin, payments/subscriptions, Resource state and Media bucket).
- Authentication and private status checks are backend-enforced; Next proxy only checks cookie presence optimistically and does not fetch its own auth endpoints.

Official references: [Generic OAuth](https://better-auth.com/docs/plugins/generic-oauth), [sessions](https://better-auth.com/docs/concepts/session-management), [Next.js integration](https://better-auth.com/docs/integrations/next), [Hono integration](https://better-auth.com/docs/integrations/hono).

## App-specific authorization and services

Better Auth supplies protocol/session logic; Marketplace retains its business rules:

- API bearer verification uses SDK resource verification with its own audience, access-token type, scopes and verified subject.
- Local role/status/ban/delete checks are independent of SSO role claims. Admin middleware reads the verified local role, never the browser or an SSO app-role claim.
- Every protected route invokes `requireAuth()` explicitly. Cookie writes require the configured app origin. SDK auth routes keep SDK origin/CSRF checks; signed backchannel and bearer APIs authenticate separately.
- Cart, address and order services derive local ownership from the verified SSO subject. Order read/cancel queries include the verified local buyer UUID; request-supplied actor/price fields do not override checkout/cart schemas.
- Seller/store/catalog membership and inventory logic remain in Marketplace. Product image verification forwards the current backend access token to the configured Media service with redirects disabled and ownership/resource checks.
- Signed SSO backchannel events persist revocation and invalidate matching native sessions. DPoP proof reservations remain atomic where proof verification is required.
- Private platform proxies forward the backend bearer only, never the incoming arbitrary bearer or browser cookies. Upstream cookies/redirects cannot overwrite app sessions. Local logout blocks later app proxy calls; it does not claim to globally revoke an access token already issued by SSO.
- Existing public `GET /billing/catalog` and `GET/HEAD /media/public/*` remain anonymous, with no user cookie/token forwarding. Public media redirects are limited to credential-free HTTPS or development-local HTTP.
- Payment/billing/provider webhooks and background authentication remain owned by those services, not user cookies.

No real checkout, charge, upload or subscription transaction was initiated during verification.

## Cloud migration

The explicitly approved migration completed:

- Preserved both existing users' UUIDs and verified native provider bindings by SSO subject.
- Verified row counts unchanged for all 38 Marketplace domain tables plus `rate_limit` inside the migration transaction.
- Archived old auth tables as `legacy_session` and `legacy_verification`; native `session/account/verification` added. Legacy sessions are not converted into valid native sessions.
- Proof/revocation and domain data remain untouched. Source primary-key names match the reviewed SQL without colliding with archived tables.
- Updated only SSO client `gorth-online-marketplace-solution` callbacks to `/auth/callback/gorth`, and local resource audience 5055 -> 3035.
- SSO client secrets/scopes/other fields and the existing resource policy were verified preserved; maintained SSO seeds match.

`pnpm db:migrate-auth` is guarded/idempotent for another configured database. Future Drizzle migrations need a reviewed current-schema baseline; do not replay old archived history or reset cloud tables to resolve a diff.

## Verification and remaining environment checks

- TypeScript and ESLint pass for Marketplace.
- Native OAuth/session/backchannel/freshness regression suite plus Hono route/origin/role/proxy tests, local order ownership SQL checks, input validation, account-scoped cache tests and schema constraint checks.
- Standalone Tailwind/PostCSS test compiles library/app CSS and verifies that `pkg/.next` are not watched. Link-rendered Base UI buttons use non-native button semantics explicitly.
- SSO TypeScript and 57 regression tests passed after the targeted registration/seed changes.
- No secret file was manually read or modified; root config was checked through framework loading with boolean-only output.

`pnpm build` stays the default Turbopack build. An initial restricted build could not fetch Google fonts; the network-enabled retry reached CSS processing but failed because the managed runner disallows worker socket creation (`Operation not permitted`). A full Next production build was not completed. Run it on the local machine/CI before deployment; no Webpack fallback was introduced.

In-process runtime smoke checks return 200 for health/native auth health/metadata and 401 for anonymous private cart. SSO was not available at localhost:3000 during that check, so live real-account sign in was not verified. Start SSO first, then restart Marketplace. The user agreed to configure root Media/Payment/Billing audiences (5057/5055/5056) and restart; these service features cannot be verified live until configuration and services are available.
