# Marketplace, Restaurant, SSO and eight-service integration

> OAuth update — 2026-11-13: all confidential SSO token exchanges use fixed `client_secret_basic` in code; there is no auth-method environment selector. Business APIs keep `Bearer` tokens. Public PKCE clients keep `none`. A registered Post client needs a native Basic replacement and coordinated ID/secret/binding cutover.

Verification date: 2026-11-05. Scope is limited to the two applications, eight services and explicitly approved SSO APIs. Existing genericOAuth sign-in remains in place. Other applications and Restaurant legacy are outside this change.

## Ownership and authorization

| Owner                    | Responsibilities                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| SSO                      | Organization, member, team, teamMember, invitation, roles and OAuth identity                                                     |
| Commerce                 | SSO-linked merchant and branch profiles; catalog, customer, cart, order, stock, fulfillment, pricing and procurement             |
| Applications             | SSO user projection; nullable organizationId/teamId selection preferences; Restaurant-specific tables, kitchen, shifts and tasks |
| Remaining seven services | Notification, Resource interactions, Discovery, Payment, Billing, Media and Insight                                              |

Selection preferences never grant access. Backend authorization uses current SSO membership. Organization owner/admin can operate every branch without artificial team assignments. Regular users see assigned teams. A team manager may edit lower roles within their own team, but cannot promote themselves, assign manager, invite or remove organization members. Invitations default to member. Native Organization operations preserve last-owner checks; teamMember.role and Commerce business permissions are explicit application extensions.

A single organization may own retail stores and restaurants. Branch type is stored in store_profile.business_kind; the merchant-level value remains a backward-compatible default. Neither application nor Commerce recreates SSO organization/team/member tables.

## Request flow

Browser components use same-origin caller/TanStack Query. The backend forwards the server-held bearer directly to the owning service using fetcher. Storage credentials and access tokens are not exposed to browser JavaScript.

- GET/PUT /marketplace/context and /restaurant/context load/save the selected context.
- Application /organization/:operation routes forward a fixed operation allowlist to SSO.
- /external/organization/authorization supplies live organization/team grants.
- SSO /external/organization/:operation validates resource, client, scope, subject, a live issuing session and native UserInfo revocation before invoking Organization APIs.
- In-process AsyncLocalStorage delegation does not accept arbitrary session headers or change genericOAuth.
- Shared domain prefixes route directly to their service.
- POST /internal/storage/credential accepts only a machine bearer with the exact storage audience/scope and a maximum lifetime of 120 seconds; cookie/origin/browser requests are rejected.

## Screens

| Area                                | Marketplace                  | Restaurant                                               |
| ----------------------------------- | ---------------------------- | -------------------------------------------------------- |
| Account/context                     | /account and seller selector | Administration layout selector                           |
| Organization/team/member/invitation | /seller/organization         | Existing organization/member pages use the SSO workspace |
| Commerce workbench                  | /seller/workspace/[resource] | /administrator/commerce/[resource]                       |
| Seven platform panels               | /seller/service/[domain]     | /administrator/service/[domain]                          |

Typed forms cover merchant, branch, category, attribute, product, SKU, warehouse, stock adjustment/transfer, tax, promotion, supplier and purchase orders. Order/customer/fulfillment/return screens present business records; order detail exposes authorized lifecycle actions. There is no unrestricted customer or payment-state CRUD.

Forms support paginated/searchable references, nested options/items, state-change confirmation, versions and idempotency where required. Product images use Media after draft creation. Tables and forms consume public Primitive/Base UI components; layouts/providers remain at the root.

Catalog/SKU, suppliers and tax/promotion are organization-shared data. Their existing Commerce write permission remains organization-scoped; a team role does not implicitly authorize changes affecting the entire organization. UI write controls reflect this boundary. Warehouse/order/fulfillment operations retain branch-level checks.

Restaurant-specific floor, seating, kitchen and staff flows use SSO-derived organization/branch access. Selecting a branch filters records and totals; server-side object checks remain authoritative. Service panels expose notification actions/preferences, Resource bookmarks, Discovery search, Media assets, Payment history, Billing and personal Insight events. Client Insight events are telemetry rather than trusted financial audit records.

## Applied cloud changes

- Added nullable organization_id/team_id UUID columns and the team-requires-organization check in both application user tables. Existing users were preserved (Marketplace 3; Restaurant 0 at migration time).
- Added branch business_kind in Commerce.
- With explicit approval, removed 692 dependent rows belonging to unlinked merchants/stores: 16 merchants, 16 stores, 224 categories, 140 products, 140 variants, 16 warehouses and 140 balances. No orders were in that deletion set; protected-data fingerprints were preserved.
- Registered Commerce localhost:5059, Restaurant client gorth-restaurant-chain-management and all eight resource bindings for both clients.
- Scope revision 2 adds restaurant:read/write; revision 3 adds the two application storage-credential scopes. Previous revisions remain available.
- Registered a disabled confidential Media draft without generating or printing a secret.

## Deployment and configuration

1. Deploy the new SSO code with server NEXT_OAUTH_SCOPE_REVISION=3. Updating the cloud registry does not deploy new endpoints.
2. Set application NEXT_PUBLIC_AUTH_URL=https://gorth-auth.vercel.app and the eight server audience URLs: Notify 5052, Resource 5053, Discovery 5054, Payment 5055, Billing 5056, Media 5057, Insight 5058 and Commerce 5059. Restaurant uses client ID gorth-restaurant-chain-management. Register real HTTPS production identifiers, callbacks and client bindings before deploying outside localhost.
3. Set each service's NITRO_PUBLIC_AUTH_URL and NITRO_PUBLIC_SERVICE_URL, then restart. No legacy VITE fallback is introduced.
4. Sign in again after SSO deployment to obtain updated grants.
5. Open SSO /admin/oauth/client/edit/c92b041f-d48c-41c8-aac8-ba820e44e553 and use the native Generate/rotate secret action. Initial provisioning replaces the disabled draft with a native client and therefore changes its client ID. Copy the one-time returned ID/secret directly into Media server NITRO_OAUTH_CLIENT_ID / NITRO_OAUTH_CLIENT_SECRET (Basic is fixed in code), enable the new client and restart Media. Later rotations retain that ID.
6. Configure AWS_ENDPOINT_URL_S3, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION and AWS_BUCKET only in the owning application's server environment. Do not expose them through NEXT_PUBLIC_. Applications do not require AWS SDK.
7. An operator with the master role registers POST /media/storage-profile for the token's application, using HTTPS endpoint, bucketName, region and the application's fixed /internal/storage/credential credentialsUrl. Metadata contains no keys. Create a logical bucket through POST /media/bucket with bucketName matching AWS_BUCKET and allowedTypes including image. Development permits localhost credentials URLs; deployments require HTTPS. Configure object-storage CORS for signed browser PUT.
8. Media resolves the managed profile, obtains credentials over server-to-server OAuth, signs uploads, then the browser PUTs and completes through Media. Requests cannot inject arbitrary credential endpoints or keys.

Actual storage and Media client credentials were not supplied during verification. Real S3 upload remains an operator-configured acceptance step. No additional worker client or shared CRON/storage secret is required by this integration.

## Evidence limits

Unit/contract/server-render tests validate logic and compatibility with installed Primitive. Cloud tests use real databases with controlled external authority/provider boundaries. They do not prove browser multi-account journeys or real provider delivery.

| Project                                  |             Unit/contract Vitest |                                                Cloud Vitest |
| ---------------------------------------- | -------------------------------: | ----------------------------------------------------------: |
| Marketplace                              |                         133 pass |                                                      6 pass |
| Restaurant                               |                         332 pass |                                                     35 pass |
| Commerce                                 |                          64 pass |                                                     77 pass |
| Notify                                   |                          51 pass |                                       No separate cloud run |
| Resource                                 |                         123 pass |                                       No separate cloud run |
| Discovery                                |                          50 pass |                                       No separate cloud run |
| Payment                                  |                          53 pass |                              Provider sandbox not exercised |
| Billing                                  |                          40 pass |                                       No separate cloud run |
| Media                                    |                         103 pass |                           Real S3 configuration unavailable |
| Insight                                  |                          66 pass |                                       No separate cloud run |
| SSO bridge/verifier/team-role/credential | 43 pass across 6 targeted suites | Registry updated; no real-account Organization mutation run |

Both applications, all eight services and SSO pass TypeScript. All eight Nitro builds pass. Both applications build with `pnpm exec next build --webpack`; default Turbopack builds are blocked by the sandbox's CSS-worker port restriction, so default build success is not claimed.

The complete SSO suite was run before four additional manager cases: 348 passing / 8 failing. Failures are `tests/app-resource-contract.test.ts` (six binding fixtures), `tests/orbit-app-branding.test.ts` (one color), and `tests/storage-credential.test.ts` (one expected 403, received 401). Cloud registry bindings for both apps were checked separately; older bootstrap fixtures do not reflect the new registration scripts. Other applications' policies and Orbit styling were not changed outside scope.

Still unverified: interactive keyboard/mobile browser behavior, real email/push delivery, sandbox payments, authenticated S3 upload and the newly deployed SSO endpoints. Passing test counts alone are not a production-readiness claim.

Native references: [Organization](https://better-auth.com/docs/plugins/organization), [Generic OAuth](https://better-auth.com/docs/plugins/generic-oauth). The bearer bridge, team roles and Commerce object permissions are application extensions rather than automatically supplied Organization features.

Owner-specific details: [SSO bridge and credentials](../../single-sign-on/docs/commerce-organization-bridge.en.md), [Commerce and mixed branches](../../commerce-business/docs/commerce-app-integration.en.md).
