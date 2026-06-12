# Technology Stack

**Analysis Date:** 2026-06-12

## Languages

**Primary:**
- TypeScript 5.0.0 - All application code, type safety for frontend and blockchain interactions
- JavaScript (ES6+) - Configuration files and build scripts

**Secondary:**
- Clarity 2.x - Smart contract language for Stacks blockchain (Epoch 2.4)
- CSS - Styling via Tailwind CSS

## Runtime

**Environment:**
- Node.js (version specified in package.json, likely 18.x or 20.x)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 14.0.0 - Full-stack React framework (SSR, SSG, API routes)
- React 18.2.0 - UI component library with hooks
- React DOM 18.2.0 - React rendering for web

**Styling:**
- Tailwind CSS 3.3.0 - Utility-first CSS framework for responsive design
- PostCSS 8.4.0 - CSS transformation pipeline
- Autoprefixer 10.4.0 - Vendor prefixing for CSS

**Blockchain:**
- @stacks/transactions 6.13.0 - Smart contract transaction creation and signing
- @stacks/connect 7.8.0 - Wallet connection and contract interaction middleware
- @stacks/network 6.13.0 - Network configuration for Stacks testnet/mainnet

**UI Components:**
- lucide-react 0.294.0 - SVG icon library (minimal/consistent icon set)
- react-confetti 6.1.0 - Celebration confetti animation effect
- react-use 17.4.0 - Collection of React hooks

**Smart Contract Framework:**
- Clarinet 1.x (via `clarinet test` command) - Clarity development environment and testing

## Key Dependencies

**Critical:**
- @stacks/transactions - Enables creation and signing of blockchain transactions
- @stacks/connect - Provides wallet integration (Leather wallet support)
- @stacks/network - Configures connection to Stacks Testnet

**Infrastructure:**
- Next.js - Full application framework (SSR, static generation, API handling)
- React - UI rendering and state management
- Tailwind CSS - Entire design system and responsive layout

## Configuration

**Environment:**
- No `.env` file detected — all configuration is hardcoded or derived from runtime environment
- Contract address hardcoded: `ST1AZ12XHH56X4XXXDYCY7ZJRWJTRK4BZ6AESMS3F` (appears in `app/page.tsx` and `app/create/page.tsx`)
- Network: StacksTestnet (hardcoded via `new StacksTestnet()` in `lib/stacks.ts` and page components)

**Build:**
- `next.config.js` - Minimal Next.js configuration (empty custom config)
- `tsconfig.json` - TypeScript compiler options with path alias `@/*` pointing to repo root
- `tailwind.config.js` - Tailwind CSS theme extensions (colors, fonts)
- `postcss.config.js` - PostCSS pipeline for CSS processing
- `.eslintrc.json` - ESLint configuration extending `next/core-web-vitals`

## Platform Requirements

**Development:**
- Node.js (version unspecified in package.json — infer from Next.js 14 requirements, likely 18.17+ or 20+)
- npm or yarn for package management
- Git for version control

**Production:**
- Deployment target: Node.js server (Next.js standalone or as serverless function)
- Requires environment to support WebSocket connections (for blockchain interactions)
- HTTPS required for secure wallet communication

## Development Tools

**Linting & Code Quality:**
- ESLint 8.0.0 - JavaScript/TypeScript linting
- next lint - Next.js-integrated linter

**TypeScript:**
- @types/node 20.0.0 - Node.js type definitions
- @types/react 18.2.0 - React type definitions
- @types/react-dom 18.2.0 - React DOM type definitions

**Build & Dev:**
- next dev - Development server with HMR
- next build - Production build
- next start - Production server

---

*Stack analysis: 2026-06-12*
