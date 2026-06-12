# External Integrations

**Analysis Date:** 2026-06-12

## APIs & External Services

**Stacks Blockchain:**
- Stacks Testnet API (Hiro endpoint) - Used for network information and block height queries
  - SDK/Client: `@stacks/network`, `@stacks/transactions`, `@stacks/connect`
  - Endpoint: `https://api.testnet.hiro.so/v2/info` (hardcoded in `app/create/page.tsx:107`)
  - Purpose: Fetch current block height for deadline block calculation

**Wallet Integration:**
- Leather Wallet - Browser-based STX wallet for transaction signing
  - SDK/Client: `@stacks/connect` (provides `showConnect()` and `openContractCall()`)
  - Auth method: Private key stored in browser wallet extension
  - Entry point: `app/page.tsx:120-126` (`connect` function), `app/create/page.tsx:52-64` (`handleConnect` function)

## Data Storage

**Smart Contract State:**
- Stacks blockchain - Immutable ledger for campaign data and contributions
  - Client: Clarity smart contract at `contracts/crowdfunding.clar`
  - Contract address: `ST1AZ12XHH56X4XXXDYCY7ZJRWJTRK4BZ6AESMS3F`
  - Contract name: `crowdfunding`
  - Data maps:
    - `campaigns` - Maps uint ID to campaign struct (title, goal, deadline, owner, etc.)
    - `contributions` - Maps {campaign-id, contributor} to {amount} in microSTX
    - `campaign-contributors` - Tracks unique contributor count per campaign
  - Global state:
    - `campaign-count` - Total campaigns created
    - `total-stx` - Total escrowed across all campaigns
    - `total-contributors` - Total unique contributors
    - `active-campaigns` - Currently active campaigns

**Frontend State:**
- In-memory React state (no persistent database)
  - State is fetched from blockchain on page load and refreshed every 30 seconds (`app/page.tsx:97-98`)
  - No centralized database — blockchain is source of truth

**File Storage:**
- Not applicable — DApp stores all data on-chain

**Caching:**
- Browser memory (React state)
- Blockchain indexing via Stacks API (implicit caching in `api.testnet.hiro.so`)

## Authentication & Identity

**Auth Provider:**
- Custom via Leather Wallet + Stacks Connect
  - Implementation: Wallet extension provides STX address and signs transactions
  - User session created in `lib/stacks.ts` using `UserSession` from `@stacks/connect`
  - Session stored in browser (`userSession.loadUserData()` in components)
  - User data includes: `profile.stxAddress.testnet` (principal address)

**Authorization:**
- Smart contract enforces owner checks (Clarity-based)
  - Admin functions (`set-title`, `set-description`, `set-goal`, `set-deadline`, `archive-campaign`, `delete-campaign`) require `tx-sender == owner` check
  - Contribution allowed by any address with sufficient STX
  - Withdraw/refund authorization checked at contract level

## Monitoring & Observability

**Error Tracking:**
- Client-side console logging only (`console.error()` used in error handlers)
- No centralized error tracking service

**Logs:**
- Browser console (dev/staging): `console.error()` and `console.log()` in:
  - `app/page.tsx:158` - fetchAll errors
  - `app/page.tsx:195` - contribute errors
  - `app/create/page.tsx:136` - campaign creation success
  - `app/create/page.tsx:147` - campaign creation cancellation
  - `app/create/page.tsx:152` - campaign creation failure
- No structured logging to external service

## CI/CD & Deployment

**Hosting:**
- Not specified — likely Vercel (Next.js native platform) or self-hosted Node.js
- Deployment environment must support WebSocket (for wallet communication)

**CI Pipeline:**
- Not detected — no GitHub Actions, GitLab CI, or similar found

**Smart Contract Deployment:**
- Clarinet (local testing framework)
  - Config: `contracts/Clarinet.toml`
  - Test command: `cd contracts && clarinet test` (from `package.json:10`)
  - Deployment history: `contracts/history.txt` and `contracts/deployments/` directory

## Environment Configuration

**Required env vars:**
- None currently enforced — all critical config is hardcoded:
  - Contract address: `ST1AZ12XHH56X4XXXDYCY7ZJRWJTRK4BZ6AESMS3F`
  - Network: `StacksTestnet` (hardcoded instantiation)
  - Hiro API endpoint: `https://api.testnet.hiro.so/v2/info`

**Secrets location:**
- No `.env` file present
- Wallet private keys stored in Leather wallet extension (not in application code)
- Recommended: Move contract address and network selection to `.env` for multi-environment support

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- Wallet callback: `onFinish` and `onCancel` handlers in `showConnect()` and `openContractCall()`:
  - `app/page.tsx:125` - `onFinish: () => window.location.reload()`
  - `app/create/page.tsx:60-62` - `onFinish: () => window.location.reload()`
  - `app/page.tsx:188-192` - `onFinish: () => fetchAll()` after contribution
  - `app/create/page.tsx:135-144` - `onFinish` handler with redirect to home

## Transaction Flow

**Contribution Flow:**
1. User connects wallet via Leather (generates session)
2. User selects campaign and enters STX amount
3. Frontend validates amount (minimum 1 STX)
4. Frontend calls `openContractCall()` with:
   - Contract: `crowdfunding` at address `ST1AZ12XHH56X4XXXDYCY7ZJRWJTRK4BZ6AESMS3F`
   - Function: `contribute` with args `[campaign-id, amount-in-microSTX]`
   - Post-condition: STX spend limit (DenyMode enforces spend compliance)
5. Leather wallet prompts user to sign
6. Transaction broadcast to Stacks blockchain
7. `onFinish` callback triggers `fetchAll()` after 2-second delay (indexer catch-up)

**Campaign Creation Flow:**
1. Creator connects wallet
2. Creator fills form (title, description, goal in STX, deadline date)
3. Frontend fetches current block height from `https://api.testnet.hiro.so/v2/info`
4. Frontend calculates deadline block: `currentBlock + (daysUntilDeadline * 144)`
5. Frontend calls `openContractCall()` with:
   - Contract: `crowdfunding`
   - Function: `create-campaign` with args `[title, description, goal-in-microSTX, deadline-block]`
6. Leather wallet prompts user to sign
7. Transaction broadcast to Stacks blockchain
8. Redirect to home page after success

---

*Integration audit: 2026-06-12*
