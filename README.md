# HedgeWise

HedgeWise is a DeFi-native prediction market protocol that routes user collateral into yield vaults while their prediction positions remain active. Built on Base. Powered by Li.Fi Earn.

## 🎯 The Problem
Prediction markets have a capital efficiency problem nobody talks about.
When you place a bet on a long-duration prediction market — “Will Trump buy Greenland by 2027?”, “Will AGI be achieved before 2028?” — your money disappears into a smart contract escrow and earns absolutely nothing for months, sometimes years, until the market resolves.
On platforms like Polymarket and Limitless Exchange, billions of dollars in user collateral sits completely idle:
	∙	Polymarket holds all user funds in smart contract escrow until resolution. Users can exit early by selling shares to another buyer, but the USDC never earns yield — it just transfers hands.
	∙	Limitless Exchange follows the same model. USDC goes into the contract, collateral sits dormant, market resolves, funds are released.
For short-duration markets (sports games, same-day events), this barely matters. But for long-duration markets — the ones that capture the most intellectually interesting predictions — the opportunity cost is enormous.

## The deeper problem: all-or-nothing kills participation
Long-duration prediction markets suffer from low participation not just because of capital lockup, but because the risk profile is brutal. You stake $100, wait 18 months, and either win or lose everything. There is no middle ground.
This binary, all-or-nothing structure disproportionately punishes informed participants who have genuine conviction on slow-moving events but can’t stomach locking capital for years with zero fallback.

## 💡 Our Solution
HedgeWise: One deposit. Your stake earns while it waits.
HedgeWise reimagines the collateral layer of prediction markets. Instead of locking user funds in idle escrow, every dollar deposited into a prediction position immediately begins earning yield through battle-tested DeFi vaults — without sacrificing the prediction position itself.
Your Hedge is the yield. Your upside is the prediction.

The Loss Cushion in Practice
For a $100 bet on a market resolving in 12 months at 5.2% APY:
```
Without HedgeWise:
  Win → +$X (variable)
  Lose → -$100 (total loss)

With HedgeWise:
  Win → +$X + $5.20 yield
  Lose → -$94.80 effective loss (kept $5.20 yield)
         ↑
         This is the Hedge. This is the point
```

## 🌟 How It Works
## 1. Browse Long-Duration Markets
HedgeWise surfaces prediction markets specifically filtered for long-resolution timelines — the category where idle capital cost is most significant. Every market card shows:
	∙	Current Yes/No prices and implied probabilities
	∙	Days until resolution
	∙	Projected yield earned if position held to resolution
	∙	Your effective downside after yield cushion
 
## 2. Place a Position
Select Yes or No, enter your USDC amount. Before confirming, web app surfaces:
	∙	Live vault APY fetched from Li.Fi Earn
	∙	Your exact loss cushion in dollar terms
	∙	Upside scenario breakdown
 
## 3. Collateral Goes to Work
On confirmation, a single transaction via Li.Fi Composer deposits your USDC into the optimal yield vault on Base. The protocol records your position on-chain — side, amount, entry price, vault receipt.

## 4. Watch It Earn
Your portfolio shows your prediction positions alongside a live yield counter. The yield accrues in real time. You can see exactly how much your cushion has grown at any moment.

## 5. Resolution
When a market resolves:
	∙	Winners receive their principal back + all yield earned + proportional share of the losing pool’s principal
	∙	Losers receive their yield earned during the period — a real, meaningful cushion that softens the loss

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
   Create a `.env` file in the `/backend/` directory mirroring this configuration and replacing the placeholders with your actual keys:
   ```env
   LIMITLESS_API_KEY=your_limitless_api_key
   PRIVATE_KEY=your_wallet_private_key
   
   # Partner/programmatic mode (HMAC)
   LMTS_TOKEN_ID=your_token_id
   LMTS_TOKEN_SECRET=your_base64_secret
   
   NEXT_PUBLIC_SUPABASE_URL=https://<your_subdomain>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   LIFI_API_KEY=your_lifi_api_key
   ```

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

Make sure your Supabase environment has a table named `orders` to enable full portfolio tracking. You can run the following SQL snippet in the Supabase SQL Editor to initialize the table:

```sql
CREATE TABLE orders (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  market_slug TEXT,
  token_type TEXT,
  price NUMERIC,
  size NUMERIC,
  order_id TEXT, -- used to log the Li.Fi Transaction Hash
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```
## Roadmap
v0.1 — Hackathon Prototype
	∙	Hardcoded long-duration markets
	∙	Li.Fi Composer integration for vault deposits
	∙	Loss cushion dashboard
	∙	Manual resolution (admin toggle)
 
## ⚠️ Known Issues
* On some cloud-deployed IDE environments, native \`pg\` or \`pg-pool\` postgres integrations might collapse due to IPv4/IPv6 resolver faults on Supabase (\`getaddrinfo ENOTFOUND\`). Always rely on the \`@supabase/supabase-js\` REST layer implemented within \`backend/index.ts\` to completely avoid this.
