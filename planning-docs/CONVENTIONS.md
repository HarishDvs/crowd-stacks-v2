# Coding Conventions

**Analysis Date:** 2026-06-12

## Naming Patterns

**Files:**
- React components: `[page-name].tsx` for page routes (e.g., `app/page.tsx`, `app/admin/page.tsx`)
- TypeScript files: `.ts` extension for utilities (e.g., `lib/stacks.ts`)
- Test files: `[name]_test.ts` for contract tests (e.g., `contracts/tests/crowdfunding_test.ts`)

**Functions:**
- camelCase for functions and methods
- Event handlers prefixed with `handle` (e.g., `handleConnect`, `handleSubmit`, `handleChange`, `handleCloseCampaign`)
- Async operations: explicit `async` keyword, names clearly indicate async nature (e.g., `fetchAll`, `fetchAllData`)
- Helper functions for JSON/data parsing: short abbreviated names (e.g., `jNum`, `jStr`, `jBool`, `unwrapTuple`, `parseCampaign`)
- Contract interaction wrappers: descriptive names (e.g., `callContract`, `callContractReadOnly`, `contribute`, `claimRefund`)

**Variables:**
- camelCase for all variable names
- State variables use React hooks convention with paired getters/setters: `[state, setState]` (e.g., `[user, setUser]`, `[campaigns, setCampaigns]`)
- Boolean flags use `is`/`has` prefixes: `isCreating`, `isUserSignedIn`, `isClosing`
- Numeric suffixes for microSTX amounts: `amountµ` or `amountMicroSTX` (occasionally `µ` symbol used, e.g., line 82 in stacks.ts)
- Temporary/intermediate values use descriptive names: `micro`, `count`, `reads`, `results`, `campaignData`

**Types:**
- PascalCase for TypeScript interfaces (e.g., `Campaign`, `GlobalStats`, `FormData`, `FormErrors`)
- Type annotations on state variables and function parameters are explicit
- Tuple destructuring in React components (e.g., `const { title, description, goal, deadline } = formData`)
- Union types for results: `expectOk()`, `expectErr()`, `expectSome()`, `expectTuple()` patterns (Clarity test style)

## Code Style

**Formatting:**
- ESLint configuration: extends `next/core-web-vitals`
- No explicit Prettier configuration detected; follows Next.js defaults
- Indentation: 2 spaces (standard JavaScript/TypeScript)
- Line length: No strict limit enforced, but generally reasonable line lengths observed

**Linting:**
- Tool: ESLint v8.0.0
- Config: `.eslintrc.json` extends `next/core-web-vitals`
- Key rules enforced: Next.js built-in rules for performance and accessibility

## Import Organization

**Order:**
1. React imports (core React, hooks, Next.js utilities)
   ```typescript
   import { useEffect, useMemo, useState } from 'react'
   import Link from 'next/link'
   ```

2. External library imports (@stacks, lucide-react, etc.)
   ```typescript
   import { callReadOnlyFunction, cvToJSON, ... } from '@stacks/transactions'
   import { UserSession, AppConfig, showConnect } from '@stacks/connect'
   import { Wallet, Target, Users, ... } from 'lucide-react'
   ```

3. Local imports with alias (`@/`)
   ```typescript
   import { CONTRACT_ADDRESS, CONTRACT_NAME, network, userSession } from '@/lib/stacks'
   ```

**Path Aliases:**
- `@/*` maps to root directory (configured in `tsconfig.json`)
- Used for importing from `lib/` (e.g., `@/lib/stacks`)
- Centralized constants for contract configuration

## Error Handling

**Patterns:**
- Try/catch blocks for async operations (promise-based)
- User-facing errors via `alert()` for immediate feedback (e.g., "Connect your wallet first", "Contribution failed")
- Error logging to console with context: `console.error('[operation] failed', error)`
- Errors suppress detailed messages in alerts; users see friendly messages
- Form validation errors collected in state object before display (e.g., `FormErrors` type)
- Graceful degradation for missing/null values with defaults (e.g., `?? 0`, `?? ''`, `?? false`)

**Examples:**
- `if (!user) return alert('Connect your wallet first')` - user feedback before action
- `console.error('fetchAll failed', e)` - error logged for debugging
- Promise rejections in contract calls caught and user alerted
- Parsing errors caught and logged with warning: `console.warn('Failed to parse campaign...')`

## Logging

**Framework:** console (browser console for frontend; Deno console for tests)

**Patterns:**
- Errors logged only on failures: `console.error()`
- Warnings for non-critical issues: `console.warn()`
- Info logs for transaction tracking: `console.log('Campaign creation transaction:', data)`
- Cancellation logged for debugging: `console.log('Campaign creation cancelled')`
- No debug or trace logging in production code
- Logs include context (operation name + details)

**Guidelines:**
- Error logs: Always include operation context and error object
- Avoid logging sensitive data (wallet addresses, transaction details logged at info level only)
- Console logs used for transaction confirmations and user-initiated actions

## Comments

**When to Comment:**
- Complex Clarity value parsing logic is explained inline (e.g., "microSTX -> STX" conversion)
- Blockchain API calls document expected return types
- Form validation logic is self-explanatory; no extensive comments
- Block comments separate logical sections (e.g., `/* ------ lifecycle ------ */`, `/* ------ actions ------ */`, `/* ------ render ------ */`)
- Descriptive variable names reduce need for comments

**JSDoc/TSDoc:**
- Not consistently used in codebase
- Type annotations on function signatures are preferred over JSDoc comments
- Interfaces document structure clearly without additional comments needed
- React component props documented through TypeScript interfaces

**Example style:**
```typescript
// Simple inline comments for non-obvious logic
const deadlineBlock = Math.floor(Date.now() / 1000) + (daysUntilDeadline * 144) // Approximate: 144 blocks per day

// No JSDoc; types are clear from TypeScript
const parseCampaign = (json: any, id: number): Campaign => { ... }
```

## Function Design

**Size:**
- Components in `app/` directory: 400-470 lines (HomePage, CreatePage, AdminPage)
- Average functional component: 300-400 lines
- Utility functions: 5-30 lines
- No hard limit enforced, but large functions contain clear logical sections marked with comments

**Parameters:**
- React components: destructured props with TypeScript interface
- Contract helpers: single options object for functions with multiple parameters
- Clarity value constructors: individual parameters (uintCV, stringAsciiCV, etc.)
- Event handlers: React SyntheticEvent parameter
- Async functions: consistent parameter names across similar operations

**Return Values:**
- React components: JSX element (required for rendering)
- Contract calls: Promise<any> for async operations
- Parsing functions: strongly typed objects (Campaign, GlobalStats, etc.)
- Helpers: void for state updates, typed returns for data transforms
- No implicit undefined returns; state updates return void

## Module Design

**Exports:**
- Default exports for React page components: `export default function HomePage()`
- Named exports for utilities: `export const contractHelpers = { ... }`
- Named exports for configuration: `export const CONTRACT_ADDRESS = '...'`
- All constants exported from `lib/stacks.ts` for centralized access

**Barrel Files:**
- Not used in this codebase
- Imports are direct from source files (e.g., `from '@/lib/stacks'`)
- Single utility file `lib/stacks.ts` consolidates contract configuration and helpers

**Module Patterns:**
- Configuration module: `lib/stacks.ts` exports contract address, network, userSession, and helper functions
- Each page component is self-contained (no shared component library yet)
- Contract helpers use object notation for organization (e.g., `contractHelpers.getCampaign()`)
- Read-only vs. state-changing contract calls have separate wrapper functions

## Contract Integration Patterns

**Clarity Value Handling:**
- Helper functions to extract values: `jNum()`, `jStr()`, `jBool()` for safe extraction
- Unwrapping nested tuple responses: `unwrapTuple()` handles variable Clarity JSON structures
- JSON parsing step: `cvToJSON(result)` converts Clarity values to JSON before processing
- Type checking before operations: `isCV(x)` validates Clarity values before sending to wallet

**Post-Conditions:**
- When needed: `makeStandardSTXPostCondition()` for STX transfers
- Deny mode used with explicit allowance: `PostConditionMode.Deny` for secure state changes
- Conditions passed as array to `openContractCall()`

---

*Convention analysis: 2026-06-12*
