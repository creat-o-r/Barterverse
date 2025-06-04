
import type { Metadata } from 'next';
import './globals.css';
// Toaster will be handled by ClientLayoutWrapper
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ClientLayoutWrapper from '@/components/layout/ClientLayoutWrapper';

// Metadata can now be exported from here as it's a Server Component
export const metadata: Metadata = {
  title: 'BarterVerse - Trade Anything',
  description: 'A non-money marketplace with LLM chat for easy bartering.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Belleza&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <ClientLayoutWrapper>
          <Navbar />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
