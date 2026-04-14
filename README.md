# HedgeWise (AI x Li.Fi Earn)

HedgeWise is a modern, responsive web application that bridges prediction market opportunities with decentralized finance yield strategies. What started as an interface for Limitless Markets has evolved into a robust cross-chain yield aggregator that lets users immediately compound their idle capital via LI.FI's infrastructure while managing their prediction positions.

## 🌟 Key Features

### 1. **Dynamic Market Explorer**
* Deep integration with the Limitless Exchange SDK to fetch and render live, active prediction markets.
* High-performance gradient UI with real-time tracking of predictive market metrics, token share volumes, and conditional asset outcomes.

### 2. **Automated Yield Discovery**
* Built natively on top of the **LI.FI Earn Rest API** (\`earn.li.fi\`).
* Scans for the highest yield **USDC** vaults dynamically routing to networks like Base.
* Evaluates real-time protocol safety (e.g., Morpho), APY percentages mathematically stripped of fractional errors, and TVL sizes to guarantee maximum yield capture for idle capital.
* Automatically projects the mathematical Best-Case vs Worst-Case scenarios mapping standard APY gains onto user positions.

### 3. **Li.Fi Composer Execution Bypass**
* Seamlessly bypasses traditional Limitless order constraints to route orders directly into the native cross-chain **LI.FI Composer Quote API** (\`li.quest/v1/quote\`).
* Initiates and signs verified base-layer **Web3/Metamask transactions** for frictionless vault investments without needing centralized custodial wallets.

### 4. **Supabase Portfolio Tracker**
* Powerful backend integration driven by **Express.js** and the **@supabase/supabase-js** REST client.
* Records real-world execution hashes, deposit values, token parameters, and dates continuously into a serverless Postgres network table without triggering complex SQL/pg host connection conflicts.
* Features a one-click frontend overlay (**"Portfolio"**) that pulls historical transaction graphs based safely off the connected EVM Wallet Address.

## 💻 Tech Stack

* **Frontend:** Vanilla HTML/CSS/JavaScript injected with Ethers.js (v6).
* **Backend:** Node.js, Express.js, TypeScript.
* **Database:** Serverless PostgreSQL via Supabase.
* **Integrations:**
  * `@limitless-exchange/sdk` (Market Information)
  * `@supabase/supabase-js` (Tracking/Data Storage)
  * LI.FI Earn Vault APIs (Yield Identification)
  * LI.FI Composer Protocol (Automated Cross-Chain Contracts)

## 🚀 How to Run Locally

1. **Install Dependencies**
   Navigate to the backend directory and install everything:
   \`\`\`bash
   cd backend
   npm install
   \`\`\`

2. **Configure your Environment**
   Update your \`.env\` file in the \`/backend/\` directory with your actual Supabase tokens:
   \`\`\`env
   NEXT_PUBLIC_SUPABASE_URL=https://<your_subdomain>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   \`\`\`

3. **Start the Backend Node**
   Execute the typescript engine:
   \`\`\`bash
   npm run dev
   \`\`\`
   The API immediately boots up on \`:3001\`.

4. **Launch the Frontend**
   Run any simple static web server out of the \`frontend/public\` directory:
   \`\`\`bash
   # using python's built in server as an example
   cd ../frontend/public
   python3 -m http.server 3000
   \`\`\`
   Navigate to \`http://localhost:3000\` and click **Connect Wallet**!

## 💾 Database Schema

Make sure your Supabase environment has a table named \`orders\` equipped with exactly these columns to enable full portfolio tracking:
- \`id\` (int8/SERIAL PRIMARY KEY)
- \`wallet_address\` (text)
- \`market_slug\` (text)
- \`token_type\` (text)
- \`price\` (numeric)
- \`size\` (numeric)
- \`order_id\` (text) - used to log the Li.Fi Transaction Hash
- \`created_at\` (timestampz)

## ⚠️ Known Issues
* On some cloud-deployed IDE environments, native \`pg\` or \`pg-pool\` postgres integrations might collapse due to IPv4/IPv6 resolver faults on Supabase (\`getaddrinfo ENOTFOUND\`). Always rely on the \`@supabase/supabase-js\` REST layer implemented within \`backend/index.ts\` to completely avoid this.
