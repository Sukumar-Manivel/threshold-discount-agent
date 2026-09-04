import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Threshold-Discount Agent (Razorpay Ledger Prototype)',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,300..800&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className="bg-[#F7F5F0] text-[#1B1B18] font-sans antialiased selection:bg-[#24344D] selection:text-white">
        {children}
      </body>
    </html>
  );
}
