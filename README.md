# Threshold-Discount Agent

**An agent that turns individual retail checkouts into wholesale deals — automatically, on Razorpay.**

Built for Razorpay's **AI Growth & Agentic Commerce** hackathon track: *grow merchant revenue and make merchants transactable by AI buyers.*

🔗 **Live demo:** [threshold-discount-agent.vercel.app](https://threshold-discount-agent.vercel.app)
🎥 **Demo video:** _[add a 60–90s screen recording link here]_

---

## The elevator pitch

Ten different buyers can order the same product in the same week and each still pay full retail, one order at a time — even though wholesale pricing exists for exactly that volume. Nothing at checkout ever notices.

**Threshold-Discount Agent fixes that.** Buyer payments are authorized (not captured) at checkout. An agent holds a short aggregation window for that exact product. If demand falls short of a bulk-pricing tier, the agent nudges a small, targeted set of recent searchers or repeat buyers — never a broadcast. When the window closes, every pending buyer is captured at whichever discount tier the final quantity actually earned, and the merchant receives one consolidated wholesale-priced order.

Every money-moving action is **explainable, bounded, and gated** — the exact bar this track sets:
- A live, timestamped audit trail shows every decision and the reasoning behind it, not just the outcome
- Hard caps on hold duration, discount depth, minimum quantity per tier, and how many buyers can ever be nudged
- One handled failure, by design: if the window closes short of the top tier, the agent doesn't cancel or charge full retail — it captures every pending buyer at whatever tier the actual quantity earned

---

## What's real vs. what's scoped down for this hackathon

**Real:**
- Razorpay test-mode Orders API — order creation, delayed capture at the computed tier price, refund/adjustment calls
- The full authorize → hold → capture state machine driving every panel in the UI

**Scoped down for demo purposes:**
- Product catalog, search, and the "recent searchers" targeting pool (small in-memory dataset, not a production index)
- Seller-side order intake (represented on a dashboard, not wired to a real seller system)

The part the rubric actually asks for — explainable, bounded, gated money movement — is the part that's real.

---

## How it works

1. **Authorize, don't capture** — payment is authorized at checkout; funds are held, nothing is charged yet.
2. **Hold the window** — orders for the same product accumulate for a fixed window (compressed to seconds in the demo; ~48h would be the production equivalent).
3. **Check the threshold** — if quantity falls short, the agent nudges a capped, targeted set of recent searchers or frequent buyers of that exact product.
4. **Capture at the tier price** — every pending buyer is captured at whatever discount tier the final quantity reached. No refunds needed, no one pays more than they agreed to.

---

## Demo walkthrough (what you'll see live)

- **Manual Buyer** — traditional search → buy → pay, no agent involved (baseline, retail price)
- **Auto Agent** — natural-language purchase intent ("buy iPhone 17 Pro at 70k"), agent finds and recommends the product before paying
- **Standing-Order Agent** — told to buy only when the price drops; buys autonomously the instant a gap-closing coupon triggers, no manual approval step
- **Unrelated Shopper (control)** — browsing a different product entirely, receives no coupon or notification, proving targeting is bounded, not spam
- **Razorpay Agent Stack** (center panel) — live order counter, countdown timer, and a full audit-trail log of every threshold check, coupon trigger, tier decision, and capture
- **Seller Dashboard** — order count and final wholesale settlement once the window closes

---

## Tech stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS, Lucide React Icons
- **Payments:** Razorpay Orders API (test mode) — authorize, delayed capture, refunds

---

## Getting started

**Prerequisites:** Node.js 18+, npm or yarn

```bash
git clone https://github.com/Sukumar-Manivel/threshold-discount-agent.git
cd threshold-discount-agent
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Why it matters

- **For merchants:** higher basket volume per SKU and lower cost-to-acquire per unit sold, without running a single manual promotion
- **For buyers:** real, automatic savings from demand that was always there — no coupon hunting
- **For Razorpay:** a form of agentic commerce infrastructure no other PSP offers today — the middleman becomes the one creating value, not just moving it

---

## License

MIT
