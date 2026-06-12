# Codebase Concerns

**Analysis Date:** 2026-06-12

## Tech Debt

### Hardcoded Contract Configuration Across Multiple Files

**Issue:** Contract address and network configuration (`CONTRACT_ADDRESS`, `CONTRACT_NAME`, `network`, `userSession`) are defined independently in three separate files instead of using a centralized shared source.

**Files:**
- `lib/stacks.ts` (authoritative source)
- `app/create/page.tsx` (lines 12-18, duplicate definitions)
- `app/admin/page.tsx` (lines 29-35, duplicate definitions)

**Impact:**
- When contract address or configuration changes (e.g., deploying to mainnet), all three files must be updated manually
- Risk of inconsistent configuration across pages if only some files are updated
- Maintenance burden increases with each new page that needs these constants
- The comment "Replace with your deployed address" appears redundantly in both page files

**Fix approach:**
Pages should import configuration from `lib/stacks.ts` instead of redeclaring them. Create a centralized configuration export that all pages consume:
```typescript
// lib/stacks.ts
export const CONTRACT_ADDRESS = 'ST1AZ12XHH56X4XXXDYCY7ZJRWJTRK4BZ6AESMS3F'
export const CONTRACT_NAME = 'crowdfunding'
export const network = new StacksTestnet()
export const userSession = new UserSession({ appConfig })

// app/create/page.tsx - update to import
import { CONTRACT_ADDRESS, CONTRACT_NAME, network, userSession } from '@/lib/stacks'
```

### Duplicate Wallet Session Creation

**Issue:** `UserSession` and `AppConfig` are instantiated independently in each page component (`app/create/page.tsx` lines 17-18, `app/admin/page.tsx` lines 34-35) instead of using the shared instance from `lib/stacks.ts`.

**Files:**
- `lib/stacks.ts` (exports `userSession`)
- `app/create/page.tsx` (creates separate instance)
- `app/admin/page.tsx` (creates separate instance)
- `app/page.tsx` (correctly imports from `lib/stacks.ts`)

**Impact:**
- Multiple wallet session instances mean user state is not properly shared across pages
- Session created in `/create` is different from session in `/admin`, breaking wallet persistence
- Debugging session/auth issues becomes harder with multiple instances
- Memory overhead from redundant object creation

**Fix approach:**
All pages should use the centralized `userSession` export from `lib/stacks.ts`, as `app/page.tsx` already does (line 21).

### Duplicate Campaign Parsing Logic

**Issue:** The helper functions for parsing Clarity JSON values are defined independently in multiple pages.

**Files:**
- `app/page.tsx` (lines 43-62: `jNum`, `jStr`, `jBool`, `unwrapTuple`, `parseCampaign`)
- `app/admin/page.tsx` (lines 57-73: `jNum`, `jStr`, `jBool`, `parseCampaign` with different implementation)
- `app/create/page.tsx` (no parsing logic, but could benefit from helpers)

**Impact:**
- Code duplication makes parsing logic harder to maintain
- If bug discovered in Clarity value parsing, must fix in multiple places
- Different implementations between pages (admin's `parseCampaign` unwraps differently: `json?.value?.value` vs home's `unwrapTuple`) suggests inconsistency
- Testing parsing logic requires testing in multiple locations

**Fix approach:**
Extract parsing helpers to `lib/stacks.ts` or a dedicated utility file:
```typescript
// lib/clarity-parsers.ts
export const jNum = (cv: any) => Number(cv?.value ?? 0)
export const jStr = (cv: any) => String(cv?.value ?? '')
export const jBool = (cv: any) => Boolean(cv?.value ?? false)
export const parseCampaign = (json: any, id: number): Campaign => { ... }
```

## Known Bugs

### Campaign Parsing Inconsistency Between Pages

**Symptoms:** Home page and admin page may display different campaign data for the same campaign due to different JSON unwrapping logic.

**Files:**
- `app/page.tsx` line 46-47: Uses `unwrapTuple` with fallback chain: `j?.value?.data || j?.value?.value?.data || j?.data`
- `app/admin/page.tsx` line 62: Directly accesses `json?.value?.value`

**Trigger:** Fetch same campaign ID and compare data between home page and admin dashboard.

**Workaround:** Standardize to one parsing approach across all components.

### Deadline Block Height Calculation Inaccuracy

**Issue:** In `/create` page (line 118), deadline is calculated using `Date.now() / 1000` (milliseconds to seconds conversion is wrong) instead of properly calculating block height.

**Files:** `app/create/page.tsx` (lines 107-119)

**Code:** 
```typescript
deadlineBlock = Math.floor(Date.now() / 1000) + (daysUntilDeadline * 144)
```

**Problem:**
- `Date.now()` returns milliseconds since epoch
- Should be divided by 1000 to get seconds, then this represents Unix timestamp, not block height
- Block height should be calculated from current Stacks block height, not Unix time
- This creates a mismatch: deadline could be a very large number that doesn't correspond to actual Stacks blocks

**Trigger:** Create campaign with deadline date, then check deadline value in contract.

**Workaround:** Currently mitigated by fetching actual block height from Hiro API (line 107-109), but deadline calculation still doesn't use it properly.

## Security Considerations

### Wallet Session Exposed in Global Scope

**Issue:** `userSession` is exported from `lib/stacks.ts` and used directly in components for authentication state management. While `@stacks/connect` handles tokens securely via httpOnly cookies, direct access to the session object could expose user data if misused.

**Files:** `lib/stacks.ts` (lines 18-19), used in all page components

**Current mitigation:**
- The Stacks Connect library (`@stacks/connect`) properly stores authentication tokens in httpOnly cookies with `secure` and `sameSite` attributes
- User data is only loaded via `userSession.loadUserData()` which retrieves from secure storage

**Recommendations:**
- Add JSDoc comments warning against storing sensitive user data from session in localStorage/state
- Consider wrapping session usage in custom hook to control data exposure
- Document which session properties are safe to display vs. which are sensitive

### Contract Address in Client Code

**Issue:** Contract address is hardcoded in client-side code (`lib/stacks.ts`, `app/create/page.tsx`, `app/admin/page.tsx`) as an unencrypted string.

**Files:**
- `lib/stacks.ts` (line 22)
- `app/create/page.tsx` (line 12)
- `app/admin/page.tsx` (line 29)

**Current mitigation:**
- Contract address is public blockchain data — knowing the address doesn't compromise security
- Contract interaction requires user signature via wallet (Leather/Xverse)

**Recommendations:**
- Keep contract address as constant (no change needed)
- Document that this is intentional public data in README or comments
- Consider moving to environment variable (`NEXT_PUBLIC_CONTRACT_ADDRESS`) for production flexibility

### Input Validation Gaps in Form Handling

**Issue:** Form validation in `/create` (page.tsx lines 67-88) accepts empty description field without validation.

**Files:** `app/create/page.tsx` (lines 67-88, 238-247)

**Current validation:**
- Title: required (checked)
- Goal: minimum 1 STX (checked)
- Deadline: must be in future (checked)
- Description: no validation, accepts empty

**Risk:** Low — description is just display text, not cryptographic or sensitive data. However, inconsistent validation.

**Recommendation:**
- Add maximum length validation to description (e.g., 256 chars to match contract's string-ascii 256)
- Add max length validation to title (80 chars to match contract)
- Would prevent user confusion if contract rejects overly long strings

## Performance Bottlenecks

### Inefficient Campaign List Fetching

**Issue:** Campaign data fetching in `app/page.tsx` (lines 133-156) and `app/admin/page.tsx` (lines 122-195) uses `Promise.all()` to fetch all campaigns in parallel without pagination or limiting.

**Files:**
- `app/page.tsx` (fetchAll function, lines 130-162)
- `app/admin/page.tsx` (fetchAllData function, lines 117-202)

**Problem:**
- If there are 100+ campaigns, this creates 100+ simultaneous read-only function calls
- Network overhead increases linearly with campaign count
- All campaigns must complete before state updates (no progressive loading)
- Auto-refresh interval of 30 seconds (lines 97 `app/page.tsx`, lines 96 `app/admin/page.tsx`) means consistent hammering of blockchain API

**Current capacity:**
- Works fine for demo with <20 campaigns on testnet
- Will timeout or exceed rate limits with 100+ campaigns
- Hiro API has rate limits not documented in code

**Improvement path:**
- Implement pagination: fetch campaigns in batches (e.g., 10 at a time)
- Add lazy loading: load "viewed" campaigns first, others on-demand
- Use `getMany` if available in Stacks API instead of individual `uintCV(i)` reads
- Increase auto-refresh interval or make it configurable
- Add error handling for API rate limiting

### Redundant Global Stats Fetching

**Issue:** Global stats (total raised, contributors, active campaigns) are fetched on every call alongside campaign list, even when only campaign details need refresh.

**Files:**
- `app/page.tsx` (lines 133-144)
- `app/admin/page.tsx` (lines 122-163)

**Impact:**
- 4 additional read-only calls every 30 seconds just for stats
- Stats likely don't change as frequently as campaign totals
- Could separate stat refresh to longer interval

**Improvement:**
- Fetch stats every 60-120 seconds instead of 30
- Or fetch stats only when user navigates to page

## Fragile Areas

### Campaign State Synchronization

**Files:** `app/page.tsx` (entire component), `app/admin/page.tsx` (entire component)

**Why fragile:**
- Two independent components fetch campaign state from blockchain with no shared cache
- They can display different data if one refreshes between home and admin navigation
- Manual interval-based polling (30 seconds) means data can be stale
- No error boundaries or fallback UI if blockchain API fails during refresh

**Safe modification:**
- All changes to campaign display logic must be tested on both pages
- Add integration tests that verify consistency between page data after refresh
- Consider implementing shared SWR/React Query hook for campaign state

**Test coverage gaps:**
- No automated tests for campaign fetching/parsing
- No error scenario tests (what if blockchain API is down?)
- No tests verifying data consistency across pages

### Wallet Connection Flow

**Files:**
- `app/page.tsx` (lines 120-128)
- `app/create/page.tsx` (lines 52-64)
- `app/admin/page.tsx` (lines 102-114)

**Why fragile:**
- `window.location.reload()` called on wallet connection completion (all three pages do this)
- This is heavy-handed: resets entire app state instead of updating local user state
- If multiple wallet connections happen rapidly, race conditions possible
- No error handling if connection fails

**Safe modification:**
- Replace `window.location.reload()` with state update: `setUser(userSession.loadUserData())`
- Add proper error handling callback
- Test rapid connect/disconnect cycles

**Test coverage gaps:**
- No tests for wallet connection UI states
- No tests for disconnect + reconnect flow
- No tests verifying session persistence

### Hard-coded Network Configuration

**Files:** `lib/stacks.ts` (line 17), all page components

**Why fragile:**
- Network is hardcoded to `StacksTestnet()` with no environment variable override
- To deploy to mainnet, must change code (not just env vars)
- No way to run tests against different networks without code changes

**Safe modification:**
- Create environment variable `NEXT_PUBLIC_STACKS_NETWORK` with values `testnet|mainnet|devnet`
- Initialize network in `lib/stacks.ts` based on env var
- Document in README which network is configured

## Scaling Limits

### Blockchain API Rate Limiting

**Current capacity:**
- 30-second auto-refresh on both home and admin pages (2 API calls/min baseline)
- Each refresh makes 4 stats calls + N campaign calls (N = campaign count)
- Demo currently has <20 campaigns = ~8 calls/min per user per page

**Limit:**
- Hiro API limits not publicly specified but generally ~100 requests/min for free tier
- With 10 concurrent users, each on home + admin = 160 calls/min = rate limited
- No backoff logic or rate-limit handling in code

**Scaling path:**
- Implement exponential backoff for API errors
- Use React Query/SWR with built-in request deduplication
- Add caching layer (in-memory or localStorage) for recent campaign data
- Implement request queuing to avoid thundering herd on page load
- Move stats caching to server-side with Next.js API route

### Campaign Storage Limits in Smart Contract

**Issue:** Smart contract uses maps for campaigns and contributions with no documented size limits.

**Files:** `contracts/crowdfunding.clar` (lines 22-42)

**Current capacity:**
- Campaign count tracked but not enforced (line 45: `define-data-var campaign-count`)
- Each campaign stores fixed-size data (~500 bytes estimate)
- Contributions map has no practical limit
- No pagination or archival mechanism

**Scaling limit:**
- Stacks blockchain state size grows with each campaign/contribution
- Eventually network nodes will reject transactions if state gets too large
- No documented maximum, but likely millions of campaigns before issue

**Scaling path:**
- Implement campaign archival (move old campaigns off-chain after deadline)
- Add campaign deletion for campaign owners (cleanup after withdrawal)
- Consider off-chain indexing (Stacks Subnets or external database) for historical data

## Dependencies at Risk

### @stacks/connect Version Pinned to ^7.8.0

**Risk:** Version constraint allows minor/patch updates but major version upgrades will require code changes.

**Files:** `package.json` (line 20)

**Current version:** ^7.8.0 (allows 7.x.x)

**Potential risk:**
- Stacks ecosystem moves fast, major versions may have breaking changes
- No documented compatibility testing with other Stacks packages

**Migration plan:**
- Monitor Stacks organization releases for v8.0.0 announcements
- When available, test upgrade in isolated branch
- Review breaking changes in upgrade guide
- Update all pages if connect API changes

### Next.js ^14.0.0 with React ^18.2.0

**Risk:** Next.js 14 is relatively recent; Next.js 15 may release with breaking changes.

**Files:** `package.json` (lines 13-14)

**Current approach:** Pinned to modern versions (appropriate for new project).

**Recommendation:** Continue monitoring Next.js releases and update annually or when security patches required.

## Missing Critical Features

### No Error Boundary Component

**Issue:** App has no error boundary to catch React rendering errors.

**Problem:** If any page crashes due to JavaScript error, entire app becomes unusable with white screen.

**Blocks:** Improved reliability and user experience.

**Recommendation:** Add error boundary wrapping main routes in `app/layout.tsx` to show fallback UI instead of crashing.

### No Loading Skeleton States

**Issue:** When campaigns fetch, page shows "Loading blockchain data..." text but no skeleton screens for campaign cards.

**Files:** `app/page.tsx` (line 243), `app/admin/page.tsx` (line 304)

**Blocks:** Better perceived performance and user experience during slow networks.

### No Offline Detection

**Issue:** App doesn't detect network disconnection or blockchain API unavailability.

**Files:** All page components

**Blocks:** Graceful degradation when user loses internet or blockchain becomes unavailable.

**Recommendation:** Add network status indicator and disable contribute/create buttons when offline.

### No Transaction Status Notifications

**Issue:** After transaction submitted, users see alert dialog. No real transaction status tracking or toast notifications.

**Files:**
- `app/page.tsx` (line 196)
- `app/create/page.tsx` (line 139, 153)
- `app/admin/page.tsx` (line 241, 253)

**Blocks:** Users can't easily monitor transaction progress or receive status updates.

## Test Coverage Gaps

### No Automated Tests for Campaign Parsing

**Untested area:** Campaign data parsing from Clarity values (critical path for displaying campaigns)

**Files:**
- `app/page.tsx` (parseCampaign function, lines 49-62)
- `app/admin/page.tsx` (parseCampaign function, lines 61-73)

**Risk:** Bugs in parsing silently display wrong data or crash component. Already observed inconsistency between two implementations.

**Priority:** High — data parsing is critical and currently has inconsistent implementations.

### No Tests for Wallet Connection States

**Untested area:** User connection/disconnection flow and session persistence

**Files:** All page components (handleConnect, disconnect functions)

**Risk:** Wallet integration issues won't be caught until manual testing or user reports.

**Priority:** High — wallet connection is core functionality.

### No Integration Tests Between Pages

**Untested area:** Data consistency when navigating between home, create, and admin pages

**Files:** All pages as integrated system

**Risk:** State can diverge between pages causing confusing user experience.

**Priority:** Medium — affects user experience but less critical than individual page functionality.

### No Contract Integration Tests

**Untested area:** Contract function calls from frontend (contribute, create-campaign, close-campaign)

**Files:** All pages calling `openContractCall` and `callReadOnlyFunction`

**Risk:** Contract integration bugs only discovered during manual testing.

**Priority:** High — contract interaction is core functionality.

---

*Concerns audit: 2026-06-12*
