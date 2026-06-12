# Testing Patterns

**Analysis Date:** 2026-06-12

## Test Framework

**Runner:**
- Clarinet v1.0.0 (Deno-based testing for Clarity smart contracts)
- Config: None detected; tests use Clarinet's built-in test runner
- Location: `contracts/tests/crowdfunding_test.ts`

**Assertion Library:**
- Deno std library: `https://deno.land/std@0.90.0/testing/asserts.ts`
- Primary assertion: `assertEquals(actual, expected)` for value comparisons
- Clarity-specific assertion patterns: `.expectOk()`, `.expectErr()`, `.expectSome()`, `.expectTuple()`, `.expectBool()`

**Run Commands:**
```bash
cd contracts && clarinet test     # Run all Clarity tests
npm run lint                      # Run ESLint on TypeScript/React code
```

**Frontend Testing:**
- No Jest/Vitest configuration found
- No unit tests for React components
- No E2E test framework configured
- Testing relies on manual testing via browser for UI components

## Test File Organization

**Location:**
- Clarity tests: `contracts/tests/crowdfunding_test.ts` (single test file for all contract tests)
- React/UI: No test files present (manual testing only)
- Organization: All 9 test cases in one file

**Naming:**
- Test cases use `Clarinet.test({ name: "...", async fn(chain, accounts) { } })`
- Test names are descriptive: "Create multiple campaigns and verify campaign count", "Contributor count doesn't double-increment"
- No test file per function convention; monolithic test suite

**Structure:**
```
contracts/
└── tests/
    └── crowdfunding_test.ts       # All contract tests
```

## Test Structure

**Suite Organization:**
```typescript
Clarinet.test({
  name: "Test name describing scenario",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // Setup
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Mine initial block to get baseline
    let block = chain.mineBlock([]);
    const currentHeight = block.height;
    
    // Execute operations
    block = chain.mineBlock([
      Tx.contractCall(contractName, 'function-name', [args], deployer.address)
    ]);
    
    // Assert results
    assertEquals(block.receipts[0].result.expectOk(), types.uint(expectedValue));
  },
});
```

**Patterns:**
- **Setup:** Retrieve accounts from Clarinet's test environment via `accounts.get('wallet_N')`
- **Block mining:** Wrap contract calls in `chain.mineBlock([])` to execute and get results
- **Multiple operations:** Group related contract calls in a single `mineBlock()` for atomic execution
- **Assertions:** Chain `.expectOk()` or `.expectErr()` followed by type check (`.expectBool()`, `.expectTuple()`, etc.)
- **Teardown:** None required (Clarinet isolates state per test)

## Mocking

**Framework:** Clarinet provides built-in mocking via chain simulation

**Patterns:**
```typescript
// Mock user accounts
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;
const wallet2 = accounts.get('wallet_2')!;

// Simulate contract calls
Tx.contractCall(contractName, 'create-campaign', [
  types.uint(1000000000),
  types.uint(currentHeight + 100),
  types.ascii("Campaign Name")
], deployer.address)

// Mock blockchain state
const currentHeight = block.height;
const futureHeight = currentHeight + 100;
```

**What to Mock:**
- User wallets: Use test accounts (deployer, wallet_1, wallet_2, etc.)
- Block heights: Calculate relative to current height for deadline testing
- Clarity values: Use Clarinet's `types.*` constructors (`types.uint()`, `types.ascii()`, `types.bool()`)
- Tuple responses: Parse with `.expectTuple()` and access fields by key

**What NOT to Mock:**
- Contract state: Let Clarinet manage actual state transitions
- Block mining: Always mine blocks; don't simulate outcomes without execution
- Transaction results: Use actual result inspection (expectOk/expectErr) not stubbed values

## Fixtures and Factories

**Test Data:**
```typescript
// Inline constants for test scenarios
const campaignData = {
  goal: 1000000000,        // 1000 STX in microSTX
  deadline: currentHeight + 100,
  title: "Test Campaign",
  description: "Test description"
};

// Contract call construction (repeated pattern)
Tx.contractCall(contractName, 'create-campaign', [
  types.uint(campaignData.goal),
  types.uint(campaignData.deadline),
  types.ascii(campaignData.title)
], wallet.address)
```

**Location:**
- No separate fixtures directory
- Test data defined inline within test cases
- Constants for repeated values (contract name, microSTX conversions)
- No shared test database or factory functions

**Reusable Patterns:**
- Campaign creation pattern repeated across tests with varying parameters
- Contribution pattern: `Tx.contractCall(contractName, 'contribute', [types.uint(campaignId), types.uint(amount)], wallet.address)`
- Error code assertions: `types.uint(101)` for "campaign not active", `types.uint(103)` for "not owner"

## Coverage

**Requirements:** None enforced

**View Coverage:** Not configured

**Manual Coverage Assessment:**
- **Create campaign:** Tests cover valid creation, invalid goal (zero), invalid deadline (past)
- **Contribute:** Tests cover success, inactive campaign rejection, zero amount rejection, duplicate contributor counting
- **Close campaign:** Tests cover owner-only restriction, active count reduction, prevents contributions after close
- **Query functions:** Tests verify get-campaign-count, get-active-campaigns, get-total-stx, get-total-contributors, get-campaigns-summary

**Gaps:**
- No tests for withdraw-funds or claim-refund functions (these exist in contract but no test coverage)
- No tests for admin functions: set-title, set-description, set-goal, set-deadline, archive, remove
- No boundary tests (very large amounts, extreme deadlines, max campaign count)
- No concurrent contribution scenarios (race conditions)
- No test data verification for individual campaign fields (title, description, owner address)

## Test Types

**Unit Tests:**
- **Scope:** Individual contract function behavior
- **Approach:** Call single contract function, assert return value
- **Example:** "Zero amount contribution rejected" - tests `contribute()` with zero amount, expects error code 106
- **Count:** 9 test cases covering core functionality

**Integration Tests:**
- **Scope:** Multiple contract operations in sequence affecting shared state
- **Approach:** Create campaign, contribute to it, query updated state, verify totals
- **Example:** "Multi-Campaign: Contribute to specific campaigns" - creates 2 campaigns, contributes to each, verifies campaign-specific and global totals
- **Count:** 5 test cases with multi-step scenarios

**E2E Tests:**
- **Framework:** Not used
- **Status:** Manual browser testing only for React UI
- **Gap:** No automated E2E tests for wallet integration, transaction flow, or UI interactions

## Common Patterns

**Async Testing:**
```typescript
Clarinet.test({
  name: "Test name",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    // Async test function
    let block = chain.mineBlock([...]) // Synchronous block mining
    // No async/await needed; Clarinet handles execution
  },
});
```

**Error Testing:**
```typescript
// Test error cases
block = chain.mineBlock([
  Tx.contractCall(contractName, 'close-campaign', [types.uint(0)], wallet1.address)
]);
block.receipts[0].result.expectErr(types.uint(103)); // Expect error code 103

// Test success after fixing error condition
block = chain.mineBlock([
  Tx.contractCall(contractName, 'close-campaign', [types.uint(0)], deployer.address)
]);
block.receipts[0].result.expectOk(); // Expect success
```

**State Verification:**
```typescript
// Query state after operation
block = chain.mineBlock([
  Tx.contractCall(contractName, 'get-campaign', [types.uint(0)], deployer.address)
]);
let campaignData = block.receipts[0].result.expectSome().expectTuple();
assertEquals(campaignData['total'], types.uint(100000000));
assertEquals(campaignData['active'], types.bool(true));
```

## Frontend Testing Notes

**Current State:**
- No automated tests for React components (`app/page.tsx`, `app/create/page.tsx`, `app/admin/page.tsx`)
- No Jest/Vitest configuration
- No mock for @stacks libraries in frontend tests
- No mock for localStorage/wallet state

**Manual Testing Approach:**
- Browser-based testing via Next.js dev server
- Leather wallet integration tested manually
- Form validation tested through UI interaction
- Contract integration tested against testnet

**Recommended Additions (if testing added):**
- Mock @stacks/connect for wallet connection in tests
- Mock @stacks/transactions for contract calls
- Test form validation logic (validateForm function in create/page.tsx)
- Test parsing functions (parseCampaign, jNum, jStr, jBool)
- Test state management with React Testing Library

---

*Testing analysis: 2026-06-12*
