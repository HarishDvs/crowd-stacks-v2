# Codebase Structure

**Analysis Date:** 2026-06-12

## Directory Layout

```
crowd-stacks-main-backup/
├── app/                           # Next.js App Router pages and layout
│   ├── layout.tsx                 # Root layout (metadata, global styles)
│   ├── page.tsx                   # Home page (browse & contribute campaigns)
│   ├── globals.css                # Global Tailwind CSS
│   ├── admin/
│   │   └── page.tsx               # Admin dashboard (manage campaigns)
│   └── create/
│       └── page.tsx               # Create campaign form
├── lib/
│   └── stacks.ts                  # Wallet config, contract helpers, RPC wrappers
├── contracts/
│   ├── crowdfunding.clar          # Main smart contract (Clarity)
│   ├── Clarinet.toml              # Clarinet project manifest
│   ├── tests/
│   │   └── crowdfunding_test.ts   # Contract test suite
│   ├── settings/
│   │   ├── Devnet.toml            # Local devnet config
│   │   └── Testnet.toml           # Stacks testnet config
│   ├── deployments/
│   │   └── default.testnet-plan.yaml  # Deployment plan
│   └── history.txt                # Contract history log
├── public/
│   └── favicon.ico                # App icon
├── package.json                   # Node dependencies, scripts
├── tsconfig.json                  # TypeScript config
├── .eslintrc.json                 # ESLint rules
├── README.md                       # User-facing quickstart
├── ABOUT.md                        # Project overview and rationale
└── .planning/
    └── codebase/                  # Architecture docs (this file)
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router pages and root layout
- Contains: TSX pages (client components), global CSS, metadata
- Key files: `page.tsx` (home), `layout.tsx` (root), `create/page.tsx`, `admin/page.tsx`

**`lib/`:**
- Purpose: Shared utilities and integration modules
- Contains: Stacks wallet/network config, contract call wrappers, Clarity parsing helpers
- Key files: `stacks.ts` (primary module)

**`contracts/`:**
- Purpose: Clarity smart contract source and tests
- Contains: Contract logic, deployment config, test suite
- Key files: `crowdfunding.clar` (contract), `crowdfunding_test.ts` (tests), `Clarinet.toml` (manifest)

**`public/`:**
- Purpose: Static assets served at root
- Contains: Favicon, manifest (if present)

## Key File Locations

**Entry Points:**
- `app/page.tsx`: Home page (default route `/`)
- `app/create/page.tsx`: Create campaign form (`/create`)
- `app/admin/page.tsx`: Admin dashboard (`/admin`)
- `app/layout.tsx`: Root layout wrapping all pages

**Configuration:**
- `package.json`: Node dependencies (Next.js, React, @stacks/*, Tailwind), build/dev scripts
- `tsconfig.json`: TypeScript compiler options (baseUrl, path aliases, Next.js plugins)
- `.eslintrc.json`: Linting rules
- `contracts/Clarinet.toml`: Clarinet project manifest (contract name, version, dependencies)

**Core Logic:**
- `lib/stacks.ts`: Wallet session, network config, contract address, contract call helpers
- `contracts/crowdfunding.clar`: Campaign CRUD, contribution escrow, withdrawal/refund logic

**Testing:**
- `contracts/tests/crowdfunding_test.ts`: Contract test suite (Clarinet TypeScript tests)

## Naming Conventions

**Files:**
- Pages: lowercase with hyphens if multi-word (e.g., `admin/page.tsx`)
- Components: CamelCase (no components directory; pages inline everything)
- Utilities: lowercase (e.g., `stacks.ts`)
- Contracts: kebab-case (e.g., `crowdfunding.clar`)

**Directories:**
- Feature routes: lowercase (e.g., `app/admin`, `app/create`)
- Reusable: `lib` (utilities), `public` (static), `contracts` (blockchain)

**TypeScript/Variables:**
- Type names: PascalCase (e.g., `Campaign`, `GlobalStats`)
- Functions: camelCase (e.g., `fetchAll()`, `contribute()`)
- Constants: SCREAMING_SNAKE_CASE for compile-time constants (e.g., `CONTRACT_ADDRESS` in lib/stacks.ts)
- React hooks: use prefix (e.g., `useState`, `useEffect`)

**Clarity:**
- Functions: kebab-case (e.g., `get-campaign`, `contribute`, `withdraw-funds`)
- Constants: kebab-case (e.g., `err-unknown-campaign`, `contract-version`)
- Maps: kebab-case plural (e.g., `campaigns`, `contributions`, `campaign-contributors`)

## Where to Add New Code

**New Feature (e.g., Campaign Search):**
- Primary code: `app/page.tsx` (add search input, filtering logic)
- Utility helpers: `lib/stacks.ts` (if needs contract query)
- Tests: `contracts/tests/crowdfunding_test.ts` (if contract changes needed)

**New Page (e.g., `/leaderboard`):**
- Create: `app/leaderboard/page.tsx` (export default component)
- Imports: Use `@/lib/stacks` for contract helpers, `@/app/layout` styles available globally
- Navigation: Update navbar in `app/layout.tsx` or individual page navs

**New Contract Function (e.g., `pause-campaign`):**
- Implementation: Add public or private function to `contracts/crowdfunding.clar`
- Tests: Add test case in `contracts/tests/crowdfunding_test.ts`
- Frontend wrapper: Add to `contractHelpers` object in `lib/stacks.ts` (e.g., `pauseCampaign: (id) => callContract(...)`)
- Usage: Call from page (e.g., `app/admin/page.tsx`)

**Shared Utilities (e.g., Clarity Parsing):**
- Location: `lib/` directory (e.g., `lib/clarity-parsing.ts`)
- Export: Named exports for reuse across pages
- Pattern: Defensive helpers with default values (e.g., `jNum = (cv) => Number(cv?.value ?? 0)`)

**Styling:**
- Global: `app/globals.css` (Tailwind directives)
- Component: Inline TailwindCSS classes (no separate CSS files; pages are large single components)

## Special Directories

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)
- Contains: Server output, static assets, type definitions

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)
- Contains: React, Next.js, @stacks packages, Tailwind, etc.

**`.planning/`:**
- Purpose: Architecture documentation and planning
- Generated: No (manually maintained)
- Committed: Yes
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md

**`contracts/tests/`:**
- Purpose: Clarity contract test suite
- Generated: No (manually written)
- Committed: Yes
- Contains: crowdfunding_test.ts (TypeScript tests run via Clarinet)

**`contracts/settings/`:**
- Purpose: Network-specific Clarinet configs
- Generated: No (manually configured)
- Committed: Yes
- Contains: Devnet.toml, Testnet.toml with chain details

## File Organization Patterns

**Pages are Monolithic:**
- Each page (`page.tsx`) contains all its component logic inline (no separate components directory)
- Reduces boilerplate but makes pages long (440 lines for home page, 350 for create, 473 for admin)

**Single Stacks Module:**
- All contract config, wallet session, and helpers centralized in `lib/stacks.ts` (125 lines)
- Imported and used by all pages; reduces duplication vs. Clarinet.toml-style distribution

**Contract Functions Follow Clarity Convention:**
- Read-only prefixed with `get-` (e.g., `get-campaign`, `get-total-contributors`)
- State-changing as verbs (e.g., `contribute`, `withdraw-funds`, `claim-refund`)

**Helpers Exported as Object:**
- `contractHelpers` object in `lib/stacks.ts` groups related functions (all reads under "Reads" comment, all writes under "Writes" comment)
- Easier to discover and reuse than separate function exports

---

*Structure analysis: 2026-06-12*
