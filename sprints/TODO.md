# CrowdStacks Sprint TODO

> Generated 2026-06-12 from `planning-docs/CONCERNS.md`.
> Priorities: P0 = correctness bugs, P1 = debt/security, P2 = performance/reliability, P3 = UX/tests/housekeeping.
> Workflow: see `sprint-agent.md`. One commit per item. Never skip a P0 for a lower priority.

## P0 — Bugs (correctness)

- [ ] **P0-1** Fix deadline block-height calculation in `app/create/page.tsx` (~line 118): deadline uses `Math.floor(Date.now() / 1000) + (daysUntilDeadline * 144)` — a Unix timestamp, not a Stacks block height. Use the current block height already fetched from the Hiro API (lines 107-109) as the base: `currentBlockHeight + daysUntilDeadline * 144`.
- [ ] **P0-2** Fix campaign parsing inconsistency between pages: `app/page.tsx` (lines 46-47) uses an `unwrapTuple` fallback chain while `app/admin/page.tsx` (line 62) accesses `json?.value?.value` directly, so the same campaign can render differently. Standardize on one unwrap approach (depends on P1-1 extraction).

## P1 — Tech Debt & Security

- [ ] **P1-1** Extract shared Clarity parsing helpers (`jNum`, `jStr`, `jBool`, `unwrapTuple`, `parseCampaign`) from `app/page.tsx` (lines 43-62) and `app/admin/page.tsx` (lines 57-73) into `lib/clarity-parsers.ts`; both pages import from there.
- [ ] **P1-2** Centralize contract config: `app/create/page.tsx` (lines 12-18) and `app/admin/page.tsx` (lines 29-35) redeclare `CONTRACT_ADDRESS`, `CONTRACT_NAME`, `network`, and `userSession`. Import everything from `lib/stacks.ts` instead (as `app/page.tsx` already does).
- [ ] **P1-3** Remove duplicate `UserSession`/`AppConfig` instances in `app/create/page.tsx` (lines 17-18) and `app/admin/page.tsx` (lines 34-35) — multiple sessions break wallet-state sharing across pages. Use the shared `userSession` export from `lib/stacks.ts`.
- [ ] **P1-4** Move network and contract address to environment variables: `NEXT_PUBLIC_STACKS_NETWORK` (`testnet|mainnet|devnet`) and `NEXT_PUBLIC_CONTRACT_ADDRESS`, initialized in `lib/stacks.ts`. Add both to `.env.example` and document in README.
- [ ] **P1-5** Replace `window.location.reload()` on wallet connect (in `app/page.tsx` lines 120-128, `app/create/page.tsx` lines 52-64, `app/admin/page.tsx` lines 102-114) with a state update (`setUser(userSession.loadUserData())`) plus an error-handling callback.
- [ ] **P1-6** Add form validation limits in `app/create/page.tsx` (lines 67-88): title max 80 chars and description max 256 chars to match the contract's `string-ascii` limits; reject empty description or document that it's allowed.

## P2 — Performance & Reliability

- [ ] **P2-1** Replace unbounded `Promise.all()` campaign fetching in `app/page.tsx` (lines 130-162) and `app/admin/page.tsx` (lines 117-202) with batched/paginated fetching (e.g., 10 at a time) and exponential backoff on Hiro API errors.
- [ ] **P2-2** Introduce a shared campaign-state hook (SWR or React Query) so home and admin pages share one cache instead of independently polling — fixes cross-page data divergence.
- [ ] **P2-3** Split global stats refresh onto a slower interval (60-120s) than campaign refresh (30s) in `app/page.tsx` (lines 133-144) and `app/admin/page.tsx` (lines 122-163).
- [ ] **P2-4** Add a React error boundary wrapping routes in `app/layout.tsx` with a fallback UI instead of a white screen.
- [ ] **P2-5** Replace `alert()` transaction notifications (`app/page.tsx` line 196, `app/create/page.tsx` lines 139/153, `app/admin/page.tsx` lines 241/253) with toast notifications plus transaction-status tracking.

## P3 — UX, Tests & Housekeeping

- [ ] **P3-1** Add unit tests for Clarity parsing helpers (after P1-1) — highest-risk untested path; the two existing implementations already disagree.
- [ ] **P3-2** Add tests for wallet connect/disconnect flow and session persistence.
- [ ] **P3-3** Add contract integration tests for `create-campaign`, `contribute`, and `close-campaign` calls (`openContractCall` / `callReadOnlyFunction`).
- [ ] **P3-4** Add loading skeleton states for campaign cards (`app/page.tsx` line 243, `app/admin/page.tsx` line 304) instead of plain "Loading blockchain data..." text.
- [ ] **P3-5** Add offline/API-unavailable detection: network status indicator and disabled contribute/create buttons when offline.
- [ ] **P3-6** Plan campaign archival/cleanup strategy for `contracts/crowdfunding.clar` maps (no size limits or archival today) — design note before any contract change.
- [ ] **P3-7** Dependency watch: track `@stacks/connect` v8 and Next.js 15 releases; test upgrades in an isolated branch.
