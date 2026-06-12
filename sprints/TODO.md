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
- [ ] **P1-4** [Tejash] Move network and contract address to environment variables: `NEXT_PUBLIC_STACKS_NETWORK` (`testnet|mainnet|devnet`) and `NEXT_PUBLIC_CONTRACT_ADDRESS`, initialized in `lib/stacks.ts`. Add both to `.env.example` and document in README.
- [ ] **P1-5** [Tejash] Replace `window.location.reload()` on wallet connect (in `app/page.tsx`, `app/create/page.tsx`, `app/admin/page.tsx` handleConnect functions) with a state update (`setUser(userSession.loadUserData())`) plus an error-handling callback.
- [ ] **P1-6** [Tejash] Add form validation limits in `app/create/page.tsx` (validateForm, lines 67-89): title max 80 chars and description max 256 chars to match the contract's `string-ascii` limits; reject empty description or document that it's allowed.

## P2 — Performance & Reliability

- [x] **P2-1** [Harish] Replace unbounded `Promise.all()` campaign fetching with batched fetching (10 at a time) and exponential backoff via `lib/fetch-utils.ts` (`mapInBatches`, `withBackoff`); applied to both fan-outs on home and the campaign loop on admin. (PR #5)
- [ ] **P2-2** [Harish] Introduce a shared campaign-state hook (SWR or React Query) so home and admin pages share one cache instead of independently polling — fixes cross-page data divergence. (Best after the P1 chain lands.)
- [ ] **P2-3** [Tejash] Split global stats refresh onto a slower interval (60-120s) than campaign refresh (30s) in `app/page.tsx` and `app/admin/page.tsx`.
- [ ] **P2-4** [Tejash] Add a React error boundary wrapping routes in `app/layout.tsx` with a fallback UI instead of a white screen.
- [ ] **P2-5** [Tejash] Replace `alert()` transaction notifications (`app/page.tsx`, `app/create/page.tsx`, `app/admin/page.tsx`) with toast notifications plus transaction-status tracking (admin already has `waitForTransaction` — reuse it).

## P3 — UX, Tests & Housekeeping

- [x] **P3-1** [Harish] Add unit tests for Clarity parsing helpers — vitest added (`npm test`), 6 tests in `lib/clarity-parsers.test.ts` covering unwrapping, microSTX conversion, fallback titles, and none-response defaults. (PR #5)
- [ ] **P3-2** [Tejash] Add tests for wallet connect/disconnect flow and session persistence.
- [ ] **P3-3** [Harish] Add contract integration tests for `create-campaign`, `contribute`, and `close-campaign` calls (`openContractCall` / `callReadOnlyFunction`).
- [ ] **P3-4** [Tejash] Add loading skeleton states for campaign cards instead of plain "Loading blockchain data..." text.
- [ ] **P3-5** [Tejash] Add offline/API-unavailable detection: network status indicator and disabled contribute/create buttons when offline.
- [ ] **P3-6** [Tejash] Plan campaign archival/cleanup strategy for `contracts/crowdfunding.clar` maps (no size limits or archival today) — design note before any contract change.
- [ ] **P3-7** [Harish] Dependency watch: track `@stacks/connect` v8 and Next.js 15 releases; test upgrades in an isolated branch.
