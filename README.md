# **CrowdStacks: The Story**

CrowdStacks was created to solve a major problem in indie game crowdfunding: a lack of trust. Many campaigns fail to deliver a finished game, leaving backers with nothing to show for their support. Our platform solves this by ensuring accountability through the use of smart contracts.

**How it Works:** Funds are held in escrow on the Stacks blockchain and are only released to developers when they hit pre-defined milestones.

**For Backers:** This model gives you more security. Your contribution is protected and won't be used until a developer shows concrete progress.

**For Developers:** This allows you to build trust with the community and demonstrate you are committed to the project.

## **The Platform**

CrowdStacks is built on the Stacks blockchain, providing a secure and transparent system.

## **Quick Start**

You'll need a few things to get started:

* Node.js 18+
* Docker Desktop
* Clarinet CLI (install with `npm install -g @hirosystems/clarinet`)

## **Installation**

**Install dependencies:**

```bash
npm install
```

**Start the local devnet:**

```bash
cd contracts && clarinet integrate
```

**Launch the frontend:**

```bash
npm run dev
```

Access the DApp at **[http://localhost:3000](http://localhost:3000)**.

## **Testing**

You can run automated tests or use the console to interact with the smart contracts.

**Run tests:**

```bash
npm test
```

**Use the console:**

```bash
cd contracts && clarinet console
```

**Call a function:**

```clarity
(contract-call? .crowdfunding contribute u5000000)
```

## Project Structure

- `/contracts/` : Clarity smart contracts and tests.  
- `/app/` : The Next.js frontend application.  
- `/components/` : Reusable UI components.  
- `/lib/` : Blockchain helpers and configuration.  
- `/public/` : Static assets.  

### File Tree
CROWD-STACKS/
├── app/
│   ├── admin/
│   │   └── page.tsx
│   ├── create/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── contracts/
│   ├── deployments/
│   │   └── default.testnet-plan.yaml
│   ├── settings/
│   │   ├── Devnet.toml
│   │   └── Testnet.toml
│   ├── tests/
│   │   └── crowdfunding_test.ts
│   ├── Clarinet.toml
│   ├── crowdfunding.clar
│   └── history.txt
│
├── lib/
│   └── stacks.ts


## **Demo Workflow**

1. Start the local blockchain with Clarinet.
2. Launch the frontend.
3. Create a new campaign.
4. Contribute STX to the campaign.
5. Wait for the milestone goal to be met.
6. Withdraw funds (if successful) or request a refund.


## **Demo Video**
https://www.youtube.com/watch?v=1X7qNoyYtn0

## **Documentation**

For technical architecture and implementation details, see **ABOUT.md**.
