import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '../components/layout/Navbar';

export const metadata: Metadata = {
  title: 'AI Travel Agent',
  description: 'Plan your perfect trip with the help of AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-light">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
} 