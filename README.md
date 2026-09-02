# Threshold Discount Agent & Live Settlement Platform

An automated buyer/seller threshold discount and real-time payment settlement application built with Next.js, React, Tailwind CSS, TypeScript, and Razorpay integration.

## 🚀 Key Features

- **Interactive Buyer Experience**:
  - Dynamic product catalog with quantity selection.
  - Automatic progressive discount tier evaluation (5%, 10%, 15%, 20%).
  - Live threshold progress bar showing the exact amount needed for the next savings tier.
  - Integrated Razorpay checkout flow with instant transaction simulation.

- **Real-Time Seller Dashboard**:
  - Live revenue, active buyer session counters, and gross savings analytics.
  - Real-time event log tracking discount triggers, threshold updates, and completed settlements.
  - Dynamic rule management: configure minimum threshold limits, maximum discount caps, and automated settlement rules.

- **System Architecture & Flow Visualizer**:
  - Step-by-step interactive workflow diagram detailing buyer interactions, threshold engine evaluations, Razorpay gateway hooks, and automated settlement dispatch.

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Lucide React Icons
- **Payments**: Razorpay API Integration

## 📦 Getting Started

### Prerequisites

- Node.js 18+ installed on your machine
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Sukumar-Manivel/threshold-discount-agent.git
   cd threshold-discount-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📄 License

MIT
