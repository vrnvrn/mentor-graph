# Arkiv Runbook

## Phase 1: CRUD

Implemented:
- write an entity
- read an entity by key
- verify attributes + payload structure
- basic annotation setup
- basic query for entity type (profiles)

No major issues or points of friction yet. 

## Phase 2: Wallet-Centric Dashboard

Implemented:
- `/api/me` endpoint that aggregates Arkiv data for the current wallet:
  - `user_profile` (or `null` if none exists yet)
  - `ask` entities owned by this wallet
  - `offer` entities owned by this wallet
- `/me` dashboard page that:
  - shows the connected wallet address
  - displays the long-lived mentorship profile (or a create form)
  - lets the user create new asks (help requests)
  - lets the user create new offers (availability to help)
  - lists existing asks/offers pulled directly from Arkiv

## Phase 3: Network Queries

Implemented:
- Arkiv helpers for **global** asks and offers:
  - `listAsks({ skill?, spaceId? })`
  - `listOffers({ skill?, spaceId? })`
- `/api/network` endpoint that:
  - queries Arkiv for all open asks and active offers
  - accepts optional filters (`skill`, `spaceId`)
  - returns `{ asks, offers }` for use in UI
- `/network` page that:
  - shows a global view of open asks and active offers across wallets
  - includes a "Filter by skill" input, wired to `/api/network?skill=...`
  - displays wallet, skill, message, status, and spaceId 

## Phase 4: TTL-Aware UX

Implemented:
- Defined explicit TTL constants per entity type:
  - `ASK_TTL_SECONDS = 3600` (short-lived help requests)
  - `OFFER_TTL_SECONDS = 7200` (slightly longer availability windows)
- Surfaced TTL to the frontend as `ttlSeconds` on each `Ask` and `Offer`.
- On `/me` and `/network`:
  - compute `expiresAt = createdAt + ttlSeconds`
  - derive a live “expires in X min” label using a 10s interval
  - hide expired asks/offers from the global network view

## Phase ALWAYS: Value Infusion

In Progress:
- Verifiability
    - Display transaction hashes for all transactions
        Note: As entity does not store transaction hash, we need to make workarounds. First workaround is to display a copyable Tx immediately after creation (lost after page refresh).
- Transparency
    - Added warnings to make it clear to users that information stored on Arkiv is immutable and only editable on the front-end.
- Life is for learning
    - Starting to incorporate deeper philosophical design elements to visualize knowledge and network on the individual and network levels

## Phase 5: Analytics

In Progress:
- Live updates to network dashboard with Arkiv subscriptions
- Experiment with filtering & sorting algorithms

Note: Ran into rate limit errors when generating dummy data. Reached out on the Discord for more info, created doc with more information.

## Final Phase: Debugging

In Progress:
- Checking Arkiv functions and adding console logs to debug sudden TTL issue

Note: As we are starting to experiment with more complex UI/UX design, some Arkiv functions have started to have issues that worked previously. 