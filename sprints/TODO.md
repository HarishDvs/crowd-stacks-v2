# CrowdStacks Sprint TODO

> Generated 2026-06-12 from `planning-docs/CONCERNS.md`.
> Priorities: P0 = correctness bugs, P1 = debt/security, P2 = performance/reliability, P3 = UX/tests/housekeeping.
> Workflow: see `sprint-agent.md`. One commit per item. Never skip a P0 for a lower priority.
> Each open item has an owner: **[Harish]** or **[Tejash]**. Reassign by editing this file — but ping the other person first.

## Ownership summary

| Owner | Items | Theme |
|-------|-------|-------|
| **Harish** | P1-1, P1-2, P1-3, P2-1, P2-2, P3-1, P3-3, P3-7 | Core consolidation (`lib/` extraction), data fetching/caching, and the tests that depend on them |
| **Tejash** | P1-4, P1-5, P1-6, P2-3, P2-4, P2-5, P3-2, P3-4, P3-5, P3-6 | Env/config, wallet UX, reliability polish, and the contract design note |

> Sequencing notes: P1-2 and P1-3 should land together or back-to-back (same files). P3-1 depends on P1-1. P2-2 ideally lands after the P1 chain. Tejash's items are all independent of Harish's — safe to work in parallel, but coordinate before both touching the same page file in the same window.

## P0 — Bugs (correctness)

- [x] **P0-1** Fix deadline block-height calculation in `app/create/page.tsx` (~line 117): deadline was set to `Math.floor(Date.now() / 1000)` — the current Unix time, so every campaign was already expired on-chain at creation. Fixed: blocks until the selected date (~10 min/block) added to the fetched `currentBlockHeight`. (PR #2)
- [x] **P0-2** Fix campaign parsing inconsistency between pages: in this repo the unwrap logic was already aligned (`json?.value?.value`), but `app/admin/page.tsx` used single-quoted `'Campaign ${id}'` fallbacks that rendered literally. Fixed with template literals matching `app/page.tsx`. (PR #2)

## P1 — Tech Debt & Security

- [x] **P1-1** [Harish] Extract shared Clarity parsing helpers (`jNum`, `jStr`, `jBool`, `parseCampaign`) into `lib/clarity-parsers.ts` with a shared `Campaign` type; home and admin import from there. (PR #4)
- [x] **P1-2** [Harish] Centralize contract config: all three pages (home included — it also redeclared in this repo) now import `CONTRACT_ADDRESS`, `CONTRACT_NAME`, `network` from `lib/stacks.ts`. (PR #4)
- [x] **P1-3** [Harish] Remove duplicate `UserSession`/`AppConfig` instances; all pages use the shared `userSession` export from `lib/stacks.ts`. (PR #4)
- [x] **P1-4** [Tejash] Network and contract address now read from `NEXT_PUBLIC_STACKS_NETWORK` (`testnet|mainnet|devnet`) and `NEXT_PUBLIC_CONTRACT_ADDRESS`, resolved in `lib/stacks.ts` with testnet defaults. Added `.env.example` and documented in README. (4cc6136)
- [x] **P1-5** [Tejash] `handleConnect` resolves via an `onConnect` state callback (`setUser(loadUserData())`) plus an `onError` handler instead of `window.location.reload()`; connect/disconnect/session logic extracted to `lib/wallet.ts`. (0c16705)
- [x] **P1-6** [Tejash] `validateForm` in `app/create/page.tsx` rejects titles over 80 and descriptions over 256 chars (matching the contract `string-ascii` limits); inputs cap via `maxLength` + live counter. Empty description remains allowed (documented in code). (8ed7530)

## P2 — Performance & Reliability

- [x] **P2-1** [Harish] Replace unbounded `Promise.all()` campaign fetching with batched fetching (10 at a time) and exponential backoff via `lib/fetch-utils.ts` (`mapInBatches`, `withBackoff`); applied to both fan-outs on home and the campaign loop on admin. (PR #5)
- [x] **P2-2** [Harish] Shared campaign-state hook via SWR (`lib/use-campaign-data.ts`, cache key `campaign-data`): home and admin now read one cache with a single 30s refresh instead of independently polling — fixes cross-page data divergence. (PR #6)
- [x] **P2-3** [Tejash] `lib/use-campaign-data.ts` now uses two SWR keys — `campaigns` (30s) and `global-stats` (90s) — so stats poll slower than the campaign list; both pages share both caches. (a16cb49)
- [x] **P2-4** [Tejash] Added a client `ErrorBoundary` (`components/error-boundary.tsx`) wrapping routes in `app/layout.tsx` with a recoverable fallback UI instead of a white screen. (dac6f3d)
- [x] **P2-5** [Tejash] In-house `ToastProvider`/`useToast` (`components/toast.tsx`) replaces all `alert()` calls; shared `lib/tx.ts` `waitForTransaction` (network-aware, extracted from admin) tracks contribute/create/finalize status. (262a805)

## P3 — UX, Tests & Housekeeping

- [x] **P3-1** [Harish] Add unit tests for Clarity parsing helpers — vitest added (`npm test`), 6 tests in `lib/clarity-parsers.test.ts` covering unwrapping, microSTX conversion, fallback titles, and none-response defaults. (PR #5)
- [x] **P3-2** [Tejash] `lib/wallet.test.ts` (6 tests): connect via showConnect + onConnect, error routing to onError, disconnect clearing the session, and session persistence for signed-in/out states. (a30a79e)
- [x] **P3-3** [Harish] Contract integration tests (`lib/contract-integration.test.ts`, 8 tests): create-campaign arg shapes, contribute microSTX conversion, withdraw-funds/finalize-failure close paths, and the shared-hook read flow with mocked chain responses. (PR #6)
- [x] **P3-4** [Tejash] `components/campaign-skeleton.tsx` renders skeleton cards on home and admin during the first load, replacing the plain "Loading..." text and the misleading admin empty-state. (4db22ff)
- [x] **P3-5** [Tejash] `lib/use-online-status.ts` + a global `OfflineBanner`; contribute (home) and create (create) buttons/inputs disable when offline and the handlers bail out with a toast. (dcb435f)
- [x] **P3-6** [Tejash] Design note `planning-docs/CAMPAIGN-ARCHIVAL.md` covering unbounded-map growth, four archival options, and a recommendation. No contract change. (4b574ec)
- [ ] **P3-7** [Harish] Dependency watch: track `@stacks/connect` v8 and Next.js 15 releases; test upgrades in an isolated branch.
