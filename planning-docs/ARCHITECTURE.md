<!-- refreshed: 2026-06-12 -->
# Architecture

**Analysis Date:** 2026-06-12

## System Overview

CrowdStacks is a decentralized crowdfunding DApp built on the Stacks blockchain, combining a Next.js frontend with Clarity smart contracts. The system follows a **blockchain-anchored client architecture** where the frontend interacts directly with on-chain state through read-only and state-mutating contract calls.

```text
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (Next.js)                  │
│     `app/page.tsx`, `app/create/page.tsx`, `app/admin/page.tsx`
├──────────────────┬──────────────────┬───────────────────────┤
│  Home Page       │  Create Campaign │    Admin Dashboard    │
│  (Browse, Fund)  │  (Initialize)    │   (Manage, Close)     │
│  `app/page.tsx`  │ `app/create/`    │   `app/admin/`        │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         └──────────────────┼─────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│               Contract Integration Layer                     │
│              `lib/stacks.ts` - Wallet & RPC                 │
│         (Network config, UserSession, Contract helpers)     │
└───────────────────────────┬─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│         Stacks Network / Testnet (via Hiro API)             │
│         Connected to Clarity Smart Contract                 │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│   Clarity Smart Contract Layer (`contracts/crowdfunding.clar`)
│         Campaign state, contributions, refunds, withdrawals  │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Home Page | Display campaigns, contribute STX, view stats, real-time confetti on goal reach | `app/page.tsx` |
| Create Page | Form-driven campaign creation with validation, goal/deadline setup | `app/create/page.tsx` |
| Admin Dashboard | Manage user's campaigns, view global stats, close campaigns, track progress | `app/admin/page.tsx` |
| Stacks Integration | Wallet connection, network config, contract call wrappers, Clarity value parsing | `lib/stacks.ts` |
| Smart Contract | Campaign lifecycle, fund escrow, refund logic, state queries | `contracts/crowdfunding.clar` |
| Layout | Root metadata, global styling, gradient background | `app/layout.tsx` |

## Pattern Overview

**Overall:** Event-sourced blockchain state management with immediate UI feedback.

**Key Characteristics:**
- **Blockchainful**: All state lives on-chain (Stacks). Frontend is stateless except for UI state (selected campaign, input fields, wallet session).
- **Direct Contract Calls**: No backend API—pages call contract functions directly via `@stacks/connect` and `@stacks/transactions`.
- **Client-Side Rendering**: All pages marked `'use client'`; React hooks manage local state and contract queries.
- **Real-time Refresh**: Pages poll contract state every 30 seconds to stay in sync; wallet transactions trigger immediate re-fetch.

## Layers

**Frontend Pages:**
- Purpose: Display UI, manage user interactions, call contract functions
- Location: `app/page.tsx`, `app/create/page.tsx`, `app/admin/page.tsx`
- Contains: TSX components with React hooks, form handling, contract calls
- Depends on: `lib/stacks.ts` for network and contract helpers
- Used by: End users via browser

**Contract Integration (`lib/stacks.ts`):**
- Purpose: Centralize Stacks wallet config, network setup, and contract call wrappers
- Location: `lib/stacks.ts`
- Contains: `AppConfig`, `UserSession`, `contractHelpers` object with typed functions
- Depends on: `@stacks/connect`, `@stacks/transactions`, `@stacks/network`
- Used by: All frontend pages

**Smart Contract (`contracts/crowdfunding.clar`):**
- Purpose: Enforce campaign logic, hold escrowed funds, track contributions
- Location: `contracts/crowdfunding.clar`
- Contains: Campaign map, contributions map, public functions (create, contribute, withdraw, refund), read-only queries
- Depends on: Stacks blockchain for STX transfers and block-height checks
- Used by: Frontend via contract calls; test suite via Clarinet

## Data Flow

### Primary Request Path: Contribute to Campaign

1. User enters amount and clicks "Contribute" button (`app/page.tsx:330`)
2. Amount validated locally (min 1 STX)
3. `contribute()` function called → invokes `openContractCall()` from `@stacks/connect` (`app/page.tsx:179`)
4. Wallet modal opens (Leather or other Stacks wallet)
5. Post-condition added: `makeStandardSTXPostCondition()` limits sender's STX spend to exactly the amount specified
6. Contract `contribute` function executes (`contracts/crowdfunding.clar:101`)
   - Validates campaign exists and is active
   - Transfers STX from sender → contract (escrow)
   - Updates campaign `total` and `successful` flag if goal met
   - Records contribution in `contributions` map
   - Increments contributor count and global totals
7. Transaction confirmed on-chain
8. `onFinish` callback fires → `fetchAll()` polls all campaign data from contract
9. UI updates with new campaign state (progress bar moves, confetti triggers if goal reached)

### Secondary Flow: Withdraw Funds (Campaign Owner)

1. Owner clicks "Close" on their campaign card in admin dashboard (`app/admin/page.tsx:205`)
2. Client validates owner is campaign owner
3. `openContractCall()` invokes contract `withdraw-funds` with campaign ID
4. Contract ensures:
   - Caller is campaign owner
   - Campaign is active
   - Total raised ≥ goal
5. Contract transfers entire escrowed amount from contract to owner
6. Campaign marked `withdrawn: true`, `active: false`, `finalized: true`
7. Admin dashboard refreshes to show updated status

### Tertiary Flow: Claim Refund (Contributor)

1. Campaign deadline passes; goal not reached
2. Contributor navigates to home, sees campaign is closed
3. (Not yet implemented in UI, but contract supports) calls `claim-refund` with campaign ID
4. Contract verifies:
   - Deadline has passed
   - Total raised < goal
   - Caller has a contribution
5. Contract transfers contribution amount back to caller
6. Contribution zeroed in `contributions` map

**State Management:**
- **On-chain state**: Campaign records, contribution records, global counters (read-only queries via `callReadOnlyFunction`)
- **Local UI state**: Current user, selected campaign, form input, loading flags, confetti flag (React `useState`)
- **Session state**: Wallet session stored in `@stacks/connect` UserSession (in-memory, clears on page refresh)

## Key Abstractions

**Campaign:**
- Purpose: Core entity representing a fundraising goal with deadline, escrow, and ownership
- Examples: `app/page.tsx:24-34` (Campaign interface), `contracts/crowdfunding.clar:22-36` (campaign map)
- Pattern: Map-based storage (campaign ID → struct) with helper functions for parsing Clarity tuples

**Contribution:**
- Purpose: Track per-user pledges to specific campaigns for refund eligibility
- Examples: `contracts/crowdfunding.clar:39` (contributions map: campaign-id + principal → amount)
- Pattern: Nested map key `{ campaign-id, contributor }` with lazy initialization in contributor counter

**Contract Helpers:**
- Purpose: Typed, reusable wrappers for contract calls
- Examples: `lib/stacks.ts:69-124` (contractHelpers object: `contribute()`, `withdrawFunds()`, `setTitle()`, etc.)
- Pattern: Each helper validates inputs, constructs Clarity args, calls `callContract()` or `callContractReadOnly()`

**Clarity Value Parsing:**
- Purpose: Convert Clarity JSON responses into JavaScript/TypeScript objects
- Examples: `app/page.tsx:43-62` (jNum, jStr, jBool helpers, unwrapTuple, parseCampaign)
- Pattern: Defensive accessors with defaults to handle varying Clarity tuple structures

## Entry Points

**`/` (Home Page):**
- Location: `app/page.tsx`
- Triggers: User visits app or clicks "Home" in nav
- Responsibilities: Display all campaigns (filterable by selection), show current campaign detail + contribution form, display global stats, trigger confetti on goal reached, auto-refresh campaign state

**`/create` (Create Campaign Page):**
- Location: `app/create/page.tsx`
- Triggers: User clicks "+ Create" in nav
- Responsibilities: Provide form to set title, description, goal (STX), deadline; validate locally; call contract `create-campaign`; redirect to home on success

**`/admin` (Admin Dashboard):**
- Location: `app/admin/page.tsx`
- Triggers: User clicks "Admin" in nav
- Responsibilities: Show user's campaigns (editable/closeable) and other campaigns (read-only); display global stats; allow campaign closure if owner

## Architectural Constraints

- **Single contract instance**: All pages call the same deployed contract at hardcoded address `ST1AZ12XHH56X4XXXDYCY7ZJRWJTRK4BZ6AESMS3F` in `lib/stacks.ts`
- **No backend API**: All queries and mutations go directly to blockchain; no database or middleware
- **Client-side only**: No server-side rendering; all pages are `'use client'` (Next.js App Router)
- **Testnet only**: Network is hardcoded to `StacksTestnet()`; must be configured for mainnet if deployed
- **Manual polling**: No subscriptions/websockets; UI refreshes via 30-second polling interval or manual refetch after user action
- **No UI state persistence**: Selected campaign, form inputs lost on page reload (by design for hackathon)
- **Clarity value parsing fragility**: Multiple campaign pages define their own parsing logic (jNum, jStr, etc.) rather than centralizing—risk of inconsistency

## Anti-Patterns

### Hardcoded Contract Address in Multiple Files

**What happens:** Contract address `ST1AZ12XHH56X4XXXDYCY7ZJRWJTRK4BZ6AESMS3F` is duplicated in:
- `lib/stacks.ts:22` (primary)
- `app/create/page.tsx:12` (duplicate)
- `app/admin/page.tsx:29` (duplicate)

**Why it's wrong:** If contract address changes (e.g., redeployment), must update three files and risk missing one. Single source of truth violated.

**Do this instead:** Import from `lib/stacks.ts` in all pages:
```typescript
import { CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks'
```

### Parsing Logic Duplication

**What happens:** `jNum`, `jStr`, `jBool`, `unwrapTuple`, `parseCampaign` are redefined in:
- `app/page.tsx:43-62`
- `app/admin/page.tsx:57-73`

**Why it's wrong:** If Clarity response format changes (e.g., tuple nesting), must fix in multiple places. Higher maintenance burden and risk of inconsistency.

**Do this instead:** Export helpers from `lib/stacks.ts` or a new `lib/clarity-parsing.ts` module:
```typescript
// lib/clarity-parsing.ts
export const jNum = (cv: any) => Number(cv?.value ?? 0)
export const parseCampaign = (json: any, id: number): Campaign => { ... }

// app/page.tsx
import { jNum, parseCampaign } from '@/lib/clarity-parsing'
```

### Inline Config Duplication in Create/Admin Pages

**What happens:** AppConfig, UserSession, network, contract address/name initialized separately in `app/create/page.tsx:7-18` and `app/admin/page.tsx:28-35`.

**Why it's wrong:** Config drifts (e.g., one page uses `StacksTestnet`, another uses `StacksMainnet`). Difficult to globally change wallet behavior.

**Do this instead:** Already done in `lib/stacks.ts`—just import:
```typescript
import { network, userSession, CONTRACT_ADDRESS, CONTRACT_NAME } from '@/lib/stacks'
```

## Error Handling

**Strategy:** Try-catch with user-facing alerts; console.error for debugging.

**Patterns:**
- Contract calls wrapped in try-catch; errors logged to console and shown as `alert()` to user (`app/page.tsx:157-161`, `app/create/page.tsx:151-156`)
- Post-conditions prevent invalid transfers before sending (implicit error handling via wallet rejection)
- Contract enforces invariants with error codes (e.g., `err-not-owner`, `err-campaign-inactive`) returned as errors to UI
- No centralized error boundary; each page handles errors independently

**Gaps:**
- Wallet rejection errors not distinguished from network errors
- No retry logic for failed contract calls
- No error recovery (e.g., if `fetchAll` fails, data becomes stale)

## Cross-Cutting Concerns

**Logging:** No structured logging. Console-based (`console.error`, `console.log`) for debugging only. Not suitable for production.

**Validation:** 
- Frontend: Form validation in create/admin pages (e.g., goal ≥ 1 STX, deadline in future)
- Blockchain: Contract asserts enforce invariants (e.g., amount > 0, deadline > block-height)

**Authentication:** 
- Wallet-based via `@stacks/connect` showConnect flow
- User session loaded on page mount; wallet address extracted from `user?.profile?.stxAddress?.testnet`
- No server-side validation of wallet ownership; client-side only

**Authorization:**
- Campaign owner-only operations checked on-chain (contract asserts)
- Frontend mirrors checks (e.g., admin page checks `campaign.owner === user.address`)

---

*Architecture analysis: 2026-06-12*
