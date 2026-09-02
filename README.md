# Razorpay Demand Aggregation Agent — Threshold-Discount Commerce Engine

> **An explainable, bounded, and gated AI agent that aggregates buyer demand in real-time across Razorpay Escrow, autonomously negotiates wholesale-tier pricing, and executes equalized refund settlements — with full LLM-powered reasoning and transparent audit trails.**

> **Estimated Impact:** Modeled ~8–12% basket uplift per SKU based on typical bulk-discount elasticity curves and targeted nudge conversion rates — framed as a projection based on standard wholesale economics, not production data.

---

## 🎯 What This Is

A fully functional demand-aggregation agent built on **Razorpay's payment infrastructure** (Escrow, Route, Refunds) that:

1. **Aggregates buyer orders** into a time-bounded escrow window
2. **Uses real LLM reasoning** (via OpenRouter) to parse buyer intent and select coupon-targeting candidates
3. **Autonomously triggers group-discount nudges** to high-intent searchers when volume approaches wholesale thresholds
4. **Executes automated settlement** — capturing escrow holds at the negotiated wholesale rate and issuing equalized refunds to all participants
5. **Provides a seller onboarding flow** where merchants pre-commit to tiered pricing before the engine activates

Every decision is **explainable** (reasoning logged in the audit trail), **bounded** (hard caps on discount depth, nudge count, and window duration), and **gated** (seller must approve tier tables, buyers must authorize payments).

---

## 🧠 AI / Agentic Components

| Component | What It Does | How It's Agentic |
|-----------|-------------|-----------------|
| **Intent Parser** (`/api/parse-intent`) | Extracts structured purchase intent from natural language | Real LLM call via OpenRouter — parses "buy iPhone 17 Pro at 70k" into `{matchedSkuId, maxPrice, confidence, reasoning}` |
| **Coupon Targeting** (`/api/coupon-targeting`) | Selects which candidates to nudge from the candidate pool | LLM reasons over recency, frequency, and buyer context — explains *why* each candidate was selected |
| **Standing-Order Agent** (Phone D) | Autonomous buyer agent that watches for price drops | Auto-executes purchase when group threshold becomes reachable |
| **Threshold Decision Engine** | Determines when to trigger nudges and at what discount | Combines rule-based bounds with LLM-selected targeting |

All LLM outputs include the **model name** and **reasoning text** in the UI and audit log for full transparency.

---

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Phone A    │    │  Phone C    │    │  Phone D    │
│  Manual     │    │  AI Agent   │    │  Standing   │
│  Buyer #1   │    │  (LLM Parse)│    │  Order Agent│
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────┐
│          Razorpay Escrow & Decision Engine           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Volume       │  │ LLM Coupon   │  │ Safety     │ │
│  │ Accumulator  │  │ Targeting    │  │ Bounds     │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└──────────────────────────┬──────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Razorpay     │  │ Razorpay     │  │ Seller       │
│ Capture      │  │ Refund       │  │ Route        │
│ Engine       │  │ Engine       │  │ Transfer     │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **AI/LLM:** OpenRouter (free model auto-selection) for intent parsing & coupon targeting
- **Payments:** Razorpay Test-Mode APIs (Orders, Payments, Refunds, Route)
- **Styling:** Tailwind CSS, Lucide React Icons
- **State:** Server-side singleton with real-time polling

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- OpenRouter API key (free at [openrouter.ai/keys](https://openrouter.ai/keys))
- *(Optional)* Razorpay Test Mode keys

### Setup

```bash
git clone https://github.com/Sukumar-Manivel/threshold-discount-agent.git
cd threshold-discount-agent
npm install
```

Create `.env.local`:
```bash
OPENROUTER_API_KEY=your_openrouter_key_here
RAZORPAY_KEY_ID=           # optional — leave empty for sandbox mode
RAZORPAY_KEY_SECRET=       # optional — leave empty for sandbox mode
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📋 Demo Flow (60-Second Walkthrough)

1. **Seller configures tiers** (Panel 3) — sets quantity thresholds and max discount percentages
2. **Phone C parses intent** — type a natural-language prompt, click "Parse with AI" to see real LLM reasoning
3. **Phone A & B place orders** — manual buyers authorize escrow holds at retail price
4. **Decision Engine detects opportunity** — LLM-powered targeting selects candidates from the candidate pool
5. **Phone D auto-executes** — standing-order agent triggers when group threshold is reachable
6. **Window closes** — automated settlement captures at wholesale rate, issues equalized refunds
7. **Audit log** — filter by "AI" to see all LLM reasoning outputs with model attribution

---

## 📐 Safety Bounds & Guardrails

| Bound | Value | Purpose |
|-------|-------|---------|
| `MAX_WINDOW` | 60s (demo) / 48h (production) | Time limit on aggregation |
| `MAX_DISCOUNT_DEPTH` | 10% | Hard cap on discount percentage |
| `MIN_DISCOUNT_QTY` | 6 orders | Minimum volume for any discount |
| `MAX_NUDGES` | 3 candidates | Limit on targeted outreach |

---

## 🛡️ Rubric Alignment: Failure Recovery & Bounded Commerce

| Rubric Requirement | How We Solve It | Audit Trail Evidence |
|--------------------|-----------------|----------------------|
| **Failure Recovery #1: Partial Threshold Miss** | If the group misses the target tier (e.g., target 10 units for 10% off, but reaches 7 units), the agent does **not** cancel orders or dump buyers back to full retail. It automatically degrades to the **best available tier** (e.g., 4% or 6% off) and issues proportional Razorpay refunds. | `⚠️ Full wholesale threshold not reached... 🔄 RECOVERY: Dynamic Discount Activated — best available tier applied` |
| **Failure Recovery #2: Below-Minimum Volume** | If orders fail to reach even the minimum tier (<6 units), orders are preserved and captured at standard retail rather than stranding the merchant or cancelling orders. | `⚠️ Volume below minimum discount tier... 🔄 RECOVERY: All buyer orders preserved and fulfilled` |
| **Failure Recovery #3: LLM Provider Timeout** | If OpenRouter experiences an outage or missing API key, the agent gracefully falls back to deterministic candidate selection without breaking the aggregation window. | `🤖 LLM targeting unavailable, using deterministic fallback` |
| **Bounded & Gated Money Actions** | Escrow holds require explicit buyer checkout consent. Seller custom tier tables are gated by merchant approval. Hard bounds enforce maximum discount depth (`MAX_DISCOUNT_DEPTH = 10%`) and maximum targeted nudges (`MAX_NUDGES = 3`). | All state transitions reflected in real-time in the Live Audit Log with the `AI` and `Settlement` filter tabs. |

---

## 🔄 Multi-SKU Support

The platform operates independently across multiple SKUs with different tier tables:
- **iPhone 17 Pro 256GB** (₹79,900)
- **MacBook Pro 14" M3** (₹1,69,900)
- **Sony WH-1000XM5 ANC** (₹29,990)

Switch between products via the header SKU selector. Each SKU maintains independent aggregation state.

---

## 📄 License

MIT
