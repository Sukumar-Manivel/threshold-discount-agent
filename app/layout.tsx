import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Threshold-Discount Agent Prototype (Razorpay)',
  description: 'Demand aggregation and threshold discount agent powered by Razorpay Test-Mode APIs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
